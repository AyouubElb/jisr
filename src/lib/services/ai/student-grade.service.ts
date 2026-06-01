import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { gradeStudentAnswers } from "@/lib/ai/generators/student-grade.generator";
import { gradeStudentAudio } from "@/lib/ai/generators/student-grade-audio.generator";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { AIGenerationError } from "@/lib/ai/types";
import { DEFAULT_MODEL } from "@/lib/ai/constants";
import type {
  StudentGradeAnswer,
  StudentGradeContext,
} from "@/lib/ai/prompts/student-grade";
import type { StudentGradePerBlock } from "@/lib/ai/schemas/student-grade.schema";
import type { StudentGradeAudioOutput } from "@/lib/ai/schemas/student-grade-audio.schema";
import type { CEFRLevel } from "@/lib/types";

const AUDIO_BUCKET = "materials";

const audioMimeForPath = (audioPath: string): string => {
  const dot = audioPath.lastIndexOf(".");
  const ext = dot === -1 ? "webm" : audioPath.slice(dot + 1).toLowerCase();
  if (ext === "webm") return "audio/webm";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "m4a" || ext === "mp4") return "audio/mp4";
  return "audio/webm";
};

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

  // ── Build separate input lists for the two graders ───────────────
  const skipped: GradeAttemptResult["skipped"] = [];
  const textInputs: StudentGradeAnswer[] = [];
  const voiceInputs: {
    answerRowId: string;
    blockId: string;
    audioPath: string;
    prompt: string;
    modelAnswer: string | null;
    gradingNotes: string | null;
    taskHint: string | null;
  }[] = [];

  for (const row of answerRows) {
    const block = row.quiz_blocks as unknown as BlockJoin;
    if (block.type !== "free_text" && block.type !== "voice") continue;

    if (block.type === "free_text") {
      const text = isFreeTextAnswer(row.answer);
      if (text == null) {
        skipped.push({ blockId: block.id, reason: "no free-text answer recorded" });
        continue;
      }
      textInputs.push({
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

    const audioPath = voiceAudioPath(row.answer);
    if (!audioPath) {
      skipped.push({
        blockId: block.id,
        reason: "voice answer has no audio file recorded",
      });
      continue;
    }
    voiceInputs.push({
      answerRowId: row.id,
      blockId: block.id,
      audioPath,
      prompt: freeTextPrompt(block.content),
      modelAnswer: block.model_answer,
      gradingNotes: block.grading_notes,
      taskHint: voiceHint(block.content),
    });
  }

  if (textInputs.length === 0 && voiceInputs.length === 0) {
    return { attemptId, gradedBlockIds: [], skipped };
  }

  // ── Quotas: text + voice are separate features ────────────────────
  if (textInputs.length > 0) {
    await assertQuota(supabase, userId, "free_text_grade");
  }
  if (voiceInputs.length > 0) {
    await assertQuota(supabase, userId, "voice_grade");
  }

  // ── Text bundle: one call grades all free_text answers together ──
  const textPromise: Promise<{
    grades: Map<string, StudentGradePerBlock>;
    model: string;
    promptVersion: string;
    usage: { inputTokens: number | null; outputTokens: number | null; cacheReadTokens: number | null };
  } | null> = textInputs.length === 0
    ? Promise.resolve(null)
    : (async () => {
        const context: StudentGradeContext = {
          cefrLevel: course.level,
          quizTitle: quiz.title,
          answers: textInputs,
        };
        const result = await gradeStudentAnswers({ context });
        const map = new Map<string, StudentGradePerBlock>();
        for (const g of result.output.grades) map.set(g.block_id, g);
        return {
          grades: map,
          model: result.model,
          promptVersion: result.promptVersion,
          usage: result.usage,
        };
      })();

  // ── Voice: one call per audio, in parallel ───────────────────────
  const voicePromises = voiceInputs.map(async (v) => {
    const { data: blob, error: dlError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .download(v.audioPath);
    if (dlError || !blob) {
      return {
        blockId: v.blockId,
        answerRowId: v.answerRowId,
        error: `audio download failed: ${dlError?.message ?? "unknown"}`,
      } as const;
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    const result = await gradeStudentAudio({
      modelKey: DEFAULT_MODEL.voice_grade,
      audioBase64: buf.toString("base64"),
      audioMimeType: audioMimeForPath(v.audioPath),
      context: {
        blockId: v.blockId,
        cefrLevel: course.level,
        quizTitle: quiz.title,
        prompt: v.prompt,
        modelAnswer: v.modelAnswer,
        gradingNotes: v.gradingNotes,
        taskHint: v.taskHint,
      },
    });
    return {
      blockId: v.blockId,
      answerRowId: v.answerRowId,
      output: result.output,
      model: result.model,
      promptVersion: result.promptVersion,
      usage: result.usage,
    } as const;
  });

  let textResult: Awaited<typeof textPromise>;
  let voiceResults: PromiseSettledResult<Awaited<(typeof voicePromises)[number]>>[];
  try {
    [textResult, voiceResults] = await Promise.all([
      textPromise,
      Promise.allSettled(voicePromises),
    ]);
  } catch (err) {
    if (err instanceof AIGenerationError) {
      throw new GradingFailedError(err.message, err.rawText);
    }
    throw new GradingFailedError(
      err instanceof Error ? err.message : "Échec de la correction",
    );
  }

  // ── Persist text grades ──────────────────────────────────────────
  const rowByBlock = new Map<string, { id: string }>();
  for (const r of answerRows) rowByBlock.set(r.block_id, { id: r.id });

  const nowIso = new Date().toISOString();
  const gradedBlockIds: string[] = [];
  const persistOps: PromiseLike<unknown>[] = [];

  if (textResult) {
    for (const input of textInputs) {
      const g = textResult.grades.get(input.blockId);
      const row = rowByBlock.get(input.blockId);
      if (!g || !row) {
        skipped.push({ blockId: input.blockId, reason: "no grade returned" });
        continue;
      }
      gradedBlockIds.push(input.blockId);
      persistOps.push(
        supabase
          .from("student_answers")
          .update({
            ai_score: g.score,
            ai_is_correct: g.is_correct,
            ai_rationale: g.rationale,
            ai_errors: { items: g.errors, instructor_note: g.instructor_note ?? null },
            ai_graded_at: nowIso,
            ai_model: textResult.model,
            ai_prompt_version: textResult.promptVersion,
          })
          .eq("id", row.id),
      );
    }
  }

  // ── Persist voice grades ─────────────────────────────────────────
  const voiceTelemetry: {
    model: string;
    promptVersion: string;
    usage: { inputTokens: number | null; outputTokens: number | null; cacheReadTokens: number | null };
  }[] = [];

  voiceResults.forEach((r, idx) => {
    const v = voiceInputs[idx];
    if (r.status === "rejected") {
      const msg =
        r.reason instanceof AIGenerationError
          ? r.reason.message
          : r.reason instanceof Error
            ? r.reason.message
            : "voice grading failed";
      skipped.push({ blockId: v.blockId, reason: msg });
      return;
    }
    const val = r.value;
    if ("error" in val && typeof val.error === "string") {
      skipped.push({ blockId: v.blockId, reason: val.error });
      return;
    }
    if (!("output" in val)) {
      skipped.push({ blockId: v.blockId, reason: "voice grading returned no output" });
      return;
    }
    gradedBlockIds.push(val.blockId);
    voiceTelemetry.push({
      model: val.model,
      promptVersion: val.promptVersion,
      usage: val.usage,
    });
    const g: StudentGradeAudioOutput = val.output;
    persistOps.push(
      supabase
        .from("student_answers")
        .update({
          ai_score: g.score,
          ai_is_correct: g.is_correct,
          ai_rationale: g.rationale,
          ai_errors: {
            items: g.errors,
            instructor_note: g.instructor_note ?? null,
            pronunciation_errors: g.pronunciation_errors,
            fluency_note: g.fluency_note ?? null,
          },
          ai_graded_at: nowIso,
          ai_model: val.model,
          ai_prompt_version: val.promptVersion,
        })
        .eq("id", val.answerRowId),
    );
  });

  await Promise.all(persistOps);

  // Mark the attempt as pending_review so the instructor knows AI has
  // produced suggestions and a human still needs to accept/override.
  await supabase
    .from("student_attempts")
    .update({ status: "pending_review" })
    .eq("id", attemptId);

  // ── Telemetry: one row per feature ────────────────────────────────
  if (textResult) {
    const costCents = computeCostCents(DEFAULT_MODEL.free_text_grade, textResult.usage);
    await logGeneration({
      supabase,
      userId,
      feature: "free_text_grade",
      inputContext: {
        attemptId,
        quizId: quiz.id,
        courseId: course.id,
        gradedCount: textInputs.length,
        skippedCount: skipped.length,
      },
      result: {
        output: null,
        usage: textResult.usage,
        latencyMs: 0,
        model: textResult.model,
        provider: "vercel-gateway",
        promptVersion: textResult.promptVersion,
        retryCount: 0,
        schemaValid: true,
        inputHash: "",
        error: null,
      },
      costCents,
    });
  }
  for (const t of voiceTelemetry) {
    const costCents = computeCostCents(DEFAULT_MODEL.voice_grade, t.usage);
    await logGeneration({
      supabase,
      userId,
      feature: "voice_grade",
      inputContext: {
        attemptId,
        quizId: quiz.id,
        courseId: course.id,
      },
      result: {
        output: null,
        usage: t.usage,
        latencyMs: 0,
        model: t.model,
        provider: "google",
        promptVersion: t.promptVersion,
        retryCount: 0,
        schemaValid: true,
        inputHash: "",
        error: null,
      },
      costCents,
    });
  }

  return {
    attemptId,
    gradedBlockIds,
    skipped,
  };
};
