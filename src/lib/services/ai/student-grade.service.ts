import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { gradeStudentAnswers } from "@/lib/ai/generators/student-grade.generator";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { AIGenerationError } from "@/lib/ai/types";
import { DEFAULT_MODEL } from "@/lib/ai/constants";
import {
  transcribeAnswer,
  TranscriptionError,
} from "@/lib/services/transcribe.service";
import type {
  StudentGradeAnswer,
  StudentGradeContext,
} from "@/lib/ai/prompts/student-grade";
import type { StudentGradePerBlock } from "@/lib/ai/schemas/student-grade.schema";
import type { CEFRLevel } from "@/lib/types";

// ── Service-layer errors ───────────────────────────────────────────────
export class AttemptNotFoundError extends Error {
  readonly code = "ATTEMPT_NOT_FOUND";
  constructor() {
    super("Tentative introuvable");
    this.name = "AttemptNotFoundError";
  }
}

export class AttemptForbiddenError extends Error {
  readonly code = "ATTEMPT_FORBIDDEN";
  constructor() {
    super("Accès refusé");
    this.name = "AttemptForbiddenError";
  }
}

export class AttemptNotSubmittedError extends Error {
  readonly code = "ATTEMPT_NOT_SUBMITTED";
  constructor() {
    super("La tentative doit être soumise avant la correction");
    this.name = "AttemptNotSubmittedError";
  }
}

export class GradingFailedError extends Error {
  readonly code = "STUDENT_GRADE_FAILED";
  constructor(message: string, public rawText?: string) {
    super(message);
    this.name = "GradingFailedError";
  }
}

// ── Public input/output ────────────────────────────────────────────────
export interface GradeAttemptResult {
  attemptId: string;
  gradedBlockIds: string[];
  skipped: { blockId: string; reason: string }[];
}

// ── Constants ──────────────────────────────────────────────────────────
const MAX_ANSWER_CHARS = 4000;

// ── Helpers ────────────────────────────────────────────────────────────
const isFreeTextAnswer = (
  answer: Record<string, unknown>,
): string | null => {
  const v = answer["text"];
  return typeof v === "string" ? v : null;
};

const isVoiceTranscript = (
  answer: Record<string, unknown>,
): { transcript: string; confidence?: number } | null => {
  const transcript = answer["transcript"];
  if (typeof transcript !== "string" || transcript.length === 0) return null;
  const conf = answer["transcript_confidence"];
  return {
    transcript,
    confidence: typeof conf === "number" ? conf : undefined,
  };
};

const voiceAudioPath = (answer: Record<string, unknown>): string | null => {
  const v = answer["audio_url"];
  return typeof v === "string" && v.length > 0 ? v : null;
};

const freeTextHint = (content: Record<string, unknown>): string | null => {
  const min = content["min_words"];
  const max = content["max_words"];
  if (typeof min === "number" && typeof max === "number") {
    return `Target length: ${min}-${max} words.`;
  }
  return null;
};

const voiceHint = (content: Record<string, unknown>): string | null => {
  const max = content["max_seconds"];
  return typeof max === "number" ? `Max length: ${max} seconds.` : null;
};

const freeTextPrompt = (content: Record<string, unknown>): string =>
  typeof content["prompt"] === "string" ? (content["prompt"] as string) : "";

// ── Main entry ─────────────────────────────────────────────────────────
/**
 * Grade every free_text and voice answer in a submitted attempt in one
 * whole-attempt LLM call. Writes ai_* columns on student_answers; never
 * touches earned_weight or is_correct — those stay instructor-owned until
 * the instructor accepts or overrides each suggestion.
 *
 * Throws — route handler maps:
 * - AttemptNotFoundError → 404
 * - AttemptForbiddenError → 403
 * - AttemptNotSubmittedError → 409
 * - AIQuotaExceededError / AICostBudgetExceededError → 429
 * - GradingFailedError → 502
 */
export const gradeAttempt = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  attemptId: string,
): Promise<GradeAttemptResult> => {
  // ── Load attempt + ownership chain (instructor of the course) ──────
  const { data: attempt, error: attemptError } = await supabase
    .from("student_attempts")
    .select(
      "id, quiz_id, student_id, status, submitted_at, quizzes!inner(id, title, sections!inner(id, courses!inner(id, instructor_id, level)))",
    )
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) throw new AttemptNotFoundError();

  const quiz = attempt.quizzes as unknown as {
    id: string;
    title: string;
    sections: {
      courses: { id: string; instructor_id: string; level: CEFRLevel };
    };
  };
  const course = quiz.sections.courses;
  if (course.instructor_id !== userId) throw new AttemptForbiddenError();

  if (attempt.status === "in_progress" || !attempt.submitted_at) {
    throw new AttemptNotSubmittedError();
  }

  // ── Load answers + their blocks ───────────────────────────────────
  const { data: answerRows, error: answersError } = await supabase
    .from("student_answers")
    .select(
      "id, block_id, answer, quiz_blocks!inner(id, type, content, model_answer, grading_notes)",
    )
    .eq("attempt_id", attemptId);

  if (answersError) {
    throw new GradingFailedError(answersError.message);
  }
  if (!answerRows || answerRows.length === 0) {
    return { attemptId, gradedBlockIds: [], skipped: [] };
  }

  type BlockJoin = {
    id: string;
    type: Database["public"]["Tables"]["quiz_blocks"]["Row"]["type"];
    content: Record<string, unknown>;
    model_answer: string | null;
    grading_notes: string | null;
  };

  // ── Pre-pass: transcribe voice answers that don't have a transcript yet ──
  const skipped: GradeAttemptResult["skipped"] = [];
  const voiceToTranscribe = answerRows
    .filter((row) => {
      const block = row.quiz_blocks as unknown as BlockJoin;
      if (block.type !== "voice") return false;
      if (isVoiceTranscript(row.answer)) return false;
      return voiceAudioPath(row.answer) !== null;
    })
    .map((row) => ({
      answerRowId: row.id,
      blockId: (row.quiz_blocks as unknown as BlockJoin).id,
      audioPath: voiceAudioPath(row.answer) as string,
      original: row.answer,
    }));

  if (voiceToTranscribe.length > 0) {
    const results = await Promise.allSettled(
      voiceToTranscribe.map((v) => transcribeAnswer(supabase, v.audioPath)),
    );

    const persistUpdates: Promise<unknown>[] = [];
    results.forEach((r, idx) => {
      const v = voiceToTranscribe[idx];
      if (r.status === "rejected") {
        const msg =
          r.reason instanceof TranscriptionError
            ? r.reason.message
            : "transcription failed";
        skipped.push({ blockId: v.blockId, reason: `whisper: ${msg}` });
        return;
      }
      console.log(
        `[student-grade] whisper block=${v.blockId} confidence=${r.value.confidence} transcript:\n${r.value.transcript}`,
      );
      const merged: Record<string, unknown> = {
        ...v.original,
        transcript: r.value.transcript,
        transcript_confidence: r.value.confidence,
        transcript_language: r.value.language,
      };
      // Mutate the in-memory row so the filter loop below picks it up
      // without re-fetching from the DB.
      const row = answerRows.find((x) => x.id === v.answerRowId);
      if (row) row.answer = merged;
      persistUpdates.push(
        (async () => {
          await supabase
            .from("student_answers")
            .update({ answer: merged })
            .eq("id", v.answerRowId);
        })(),
      );
    });
    // Persist transcripts in parallel; failure here doesn't block grading.
    await Promise.allSettled(persistUpdates);
  }

  // ── Filter to free_text + voice; build grader input ───────────────
  const gradableInputs: StudentGradeAnswer[] = [];

  for (const row of answerRows) {
    const block = row.quiz_blocks as unknown as BlockJoin;
    if (block.type !== "free_text" && block.type !== "voice") continue;

    if (block.type === "free_text") {
      const text = isFreeTextAnswer(row.answer);
      if (text == null) {
        skipped.push({ blockId: block.id, reason: "no free-text answer recorded" });
        continue;
      }
      gradableInputs.push({
        blockId: block.id,
        blockType: "free_text",
        prompt: freeTextPrompt(block.content),
        modelAnswer: block.model_answer,
        gradingNotes: block.grading_notes,
        taskHint: freeTextHint(block.content),
        studentAnswer: text.slice(0, MAX_ANSWER_CHARS),
      });
      continue;
    }

    const voice = isVoiceTranscript(row.answer);
    if (!voice) {
      const audioPath = voiceAudioPath(row.answer);
      skipped.push({
        blockId: block.id,
        reason: audioPath
          ? "voice transcription failed"
          : "voice answer has no audio file recorded",
      });
      continue;
    }
    gradableInputs.push({
      blockId: block.id,
      blockType: "voice",
      prompt: freeTextPrompt(block.content),
      modelAnswer: block.model_answer,
      gradingNotes: block.grading_notes,
      taskHint: voiceHint(block.content),
      studentAnswer: voice.transcript.slice(0, MAX_ANSWER_CHARS),
      wasTranscribed: true,
      transcriptConfidence: voice.confidence,
    });
  }

  if (gradableInputs.length === 0) {
    return { attemptId, gradedBlockIds: [], skipped };
  }

  // ── Quota (count + monthly $-budget) ──────────────────────────────
  await assertQuota(supabase, userId, "free_text_grade");

  // ── LLM call ──────────────────────────────────────────────────────
  const context: StudentGradeContext = {
    cefrLevel: course.level,
    quizTitle: quiz.title,
    answers: gradableInputs,
  };

  let result;
  try {
    result = await gradeStudentAnswers({ context });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      throw new GradingFailedError(err.message, err.rawText);
    }
    throw new GradingFailedError(
      err instanceof Error ? err.message : "Échec de la correction",
    );
  }

  // ── Persist ai_* columns; join grade ↔ answer row by block_id ─────
  const gradesByBlock = new Map<string, StudentGradePerBlock>();
  for (const g of result.output.grades) gradesByBlock.set(g.block_id, g);

  const rowByBlock = new Map<string, { id: string }>();
  for (const r of answerRows) rowByBlock.set(r.block_id, { id: r.id });

  const updates = gradableInputs
    .map((input) => {
      const g = gradesByBlock.get(input.blockId);
      const row = rowByBlock.get(input.blockId);
      if (!g || !row) return null;
      return { answerRowId: row.id, blockId: input.blockId, grade: g };
    })
    .filter((v): v is { answerRowId: string; blockId: string; grade: StudentGradePerBlock } => v !== null);

  const nowIso = new Date().toISOString();
  await Promise.all(
    updates.map((u) =>
      supabase
        .from("student_answers")
        .update({
          ai_score: u.grade.score,
          ai_is_correct: u.grade.is_correct,
          ai_rationale: u.grade.rationale,
          ai_errors: { items: u.grade.errors, instructor_note: u.grade.instructor_note ?? null },
          ai_graded_at: nowIso,
          ai_model: result.model,
          ai_prompt_version: result.promptVersion,
        })
        .eq("id", u.answerRowId),
    ),
  );

  // Mark the attempt as pending_review so the instructor knows AI has
  // produced suggestions and a human still needs to accept/override.
  await supabase
    .from("student_attempts")
    .update({ status: "pending_review" })
    .eq("id", attemptId);

  // ── Telemetry ─────────────────────────────────────────────────────
  const costCents = computeCostCents(DEFAULT_MODEL.free_text_grade, result.usage);
  await logGeneration({
    supabase,
    userId,
    feature: "free_text_grade",
    inputContext: {
      attemptId,
      quizId: quiz.id,
      courseId: course.id,
      gradedCount: updates.length,
      skippedCount: skipped.length,
    },
    result,
    costCents,
  });

  return {
    attemptId,
    gradedBlockIds: updates.map((u) => u.blockId),
    skipped,
  };
};
