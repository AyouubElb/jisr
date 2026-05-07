import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { generateQuiz } from "@/lib/ai/generators/quiz.generator";
import { generatePassageQuestions } from "@/lib/ai/generators/passage-questions.generator";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { synthesizeSpeech } from "@/lib/ai/tts/synthesize";
import { stripLessonHtml } from "@/lib/extensions/lesson-html";
import { AIGenerationError } from "@/lib/ai/types";
import { TTSError } from "@/lib/ai/tts/types";
import { DEFAULT_MODEL, MODELS, PROMPT_VERSIONS, VOICE_BY_HINT, DEFAULT_VOICE } from "@/lib/ai/constants";
import type { QuizGenPromptContext } from "@/lib/ai/prompts/quiz-generation";
import type { AIPassageQuestion } from "@/lib/ai/schemas/quiz-output.schema";
import type { CEFRLevel, QuizBlockInsert } from "@/lib/types";

// ── Service-layer errors ───────────────────────────────────────────────
export class SectionNotFoundError extends Error {
  readonly code = "SECTION_NOT_FOUND";
  constructor() {
    super("Section introuvable");
    this.name = "SectionNotFoundError";
  }
}

export class SectionForbiddenError extends Error {
  readonly code = "SECTION_FORBIDDEN";
  constructor() {
    super("Accès refusé");
    this.name = "SectionForbiddenError";
  }
}

// 400 — request body parsed cleanly but business rules say no.
export class QuizGenValidationError extends Error {
  readonly code = "QUIZ_GEN_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "QuizGenValidationError";
  }
}

// 502 / 504 — LLM call failed. `kind` lets the route pick 504 (timeout)
// vs 502 (everything else) and surface rawText when the model returned
// something that didn't fit the schema.
export type QuizGenFailureKind =
  | "timeout"
  | "overload"
  | "schema"
  | "rate_limit"
  | "auth"
  | "unknown";

export class QuizGenerationFailedError extends Error {
  readonly code = "QUIZ_GEN_FAILED";
  constructor(
    message: string,
    public readonly kind: QuizGenFailureKind,
    public readonly rawText?: string,
  ) {
    super(message);
    this.name = "QuizGenerationFailedError";
  }
}

// 502 — TTS provider failed mid-quiz. Quiz draft was rolled back.
export class QuizTTSError extends Error {
  readonly code = "QUIZ_TTS_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "QuizTTSError";
  }
}

// 500 — DB write failed mid-quiz. Quiz draft was rolled back when possible.
export class QuizPersistError extends Error {
  readonly code = "QUIZ_PERSIST_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "QuizPersistError";
  }
}

// ── Public input/output ────────────────────────────────────────────────
export interface QuizGenMix {
  mcq: number;
  fill_blank: number;
  free_text: number;
  voice_response: number;
  audio_passage: number;
  text_passage: number;
}

export interface PassageQuestionMix {
  mcq: number;
  fill_blank: number;
}

export interface GenerateQuizInput {
  sectionId: string;
  lessonIds: string[];
  numQuestions: number;
  mix: QuizGenMix;
  questionsPerTextPassage: PassageQuestionMix;
  questionsPerAudioPassage: PassageQuestionMix;
  focusTopic?: string;
}

export interface GenerateQuizResult {
  quizId: string;
  courseId: string;
  title: string;
  cefrTargeted: CEFRLevel;
  skillsCovered: string[];
}

// ── Constants ──────────────────────────────────────────────────────────
// Reject lessons whose content would balloon the prompt and risk a timeout.
const MAX_LESSON_CONTENT_CHARS = 12000;

// Bound the worst-case LLM hang. Two attempts at 30s = 60s, fits Vercel Hobby.
const MAIN_LLM_TIMEOUT_MS = 30000;
const MAX_MAIN_LLM_ATTEMPTS = 2;


// ── Private helpers ────────────────────────────────────────────────────
class LLMTimeoutError extends Error {
  constructor(public ms: number) {
    super(`LLM call exceeded ${ms}ms`);
    this.name = "LLMTimeoutError";
  }
}

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new LLMTimeoutError(ms)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
};

// Flat AI option list → rich UI/DB shape. Duplicated in quiz-edit.service.
// Both will fold into a shared mapper at agent #3 — see AI-AGENTS.md.
const toUiOptions = (
  labels: string[],
  correctIndex: number,
): { id: string; label: string; is_correct: boolean }[] =>
  labels.map((label, idx) => ({
    id: `opt_${String.fromCharCode(97 + idx)}`,
    label,
    is_correct: idx === correctIndex,
  }));

// ── Main entry ─────────────────────────────────────────────────────────
/**
 * Generate a quiz draft from a set of lessons. Validates ownership,
 * enforces quotas, calls the LLM (with retry + timeout), repairs missing
 * passage MCQs, runs TTS for audio passages, persists everything as a
 * draft quiz, and logs telemetry.
 *
 * Throws — route handler maps to status codes:
 * - QuizGenValidationError → 400
 * - SectionNotFoundError → 404
 * - SectionForbiddenError → 403
 * - AIQuotaExceededError / AICostBudgetExceededError → 429
 * - QuizGenerationFailedError (kind=timeout) → 504
 * - QuizGenerationFailedError (any other kind) → 502
 * - QuizTTSError → 502
 * - QuizPersistError → 500
 */
export const generateQuizForSection = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  input: GenerateQuizInput,
): Promise<GenerateQuizResult> => {
  // ── Business validation: mix vs total + at-least-one-block ─────────
  const totalDirect =
    input.mix.mcq +
    input.mix.fill_blank +
    input.mix.free_text +
    input.mix.voice_response;
  if (totalDirect !== input.numQuestions) {
    throw new QuizGenValidationError(
      "La répartition des types ne correspond pas au nombre de questions",
    );
  }
  const totalBlocks =
    totalDirect + input.mix.audio_passage + input.mix.text_passage;
  if (totalBlocks < 1) {
    throw new QuizGenValidationError("Le quiz doit contenir au moins un bloc");
  }

  // ── Ownership: load section + course, verify instructor owns it ────
  const { data: section, error: sectionError } = await supabase
    .from("sections")
    .select("id, course_id, courses(id, instructor_id, title, level)")
    .eq("id", input.sectionId)
    .single();

  if (sectionError || !section) throw new SectionNotFoundError();

  const course = section.courses as unknown as {
    id: string;
    instructor_id: string;
    title: string;
    level: CEFRLevel;
  } | null;

  if (!course || course.instructor_id !== userId) {
    throw new SectionForbiddenError();
  }

  // ── Load lessons (must all belong to this section) ────────────────
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, type, content")
    .in("id", input.lessonIds)
    .eq("section_id", input.sectionId);

  if (lessonsError) throw new QuizPersistError(lessonsError.message);
  if (!lessons || lessons.length !== input.lessonIds.length) {
    throw new QuizGenValidationError(
      "Certaines leçons sélectionnées sont invalides",
    );
  }

  const oversizedLesson = lessons.find(
    (l) => (l.content?.length ?? 0) > MAX_LESSON_CONTENT_CHARS,
  );
  if (oversizedLesson) {
    throw new QuizGenValidationError(
      `La leçon « ${oversizedLesson.title} » est trop longue (max ${MAX_LESSON_CONTENT_CHARS} caractères). Raccourcissez-la ou divisez-la avant de générer un quiz.`,
    );
  }

  // ── Quota (count + monthly $-budget) ──────────────────────────────
  // Throws AIQuotaExceededError / AICostBudgetExceededError on overage.
  await assertQuota(supabase, userId, "quiz_gen");

  // ── Build prompt context + call LLM with retry/timeout ────────────
  const promptContext: QuizGenPromptContext = {
    courseTitle: course.title,
    courseLevel: course.level,
    lessons: lessons.map((l) => ({
      title: l.title,
      type: l.type,
      content: stripLessonHtml(l.content ?? ""),
    })),
    focusTopic: input.focusTopic,
    numQuestions: input.numQuestions,
    mix: input.mix,
    questionsPerTextPassage: input.questionsPerTextPassage,
    questionsPerAudioPassage: input.questionsPerAudioPassage,
  };

  let result: Awaited<ReturnType<typeof generateQuiz>> | undefined;
  let attempts = 0;
  let lastErr: unknown;
  while (attempts < MAX_MAIN_LLM_ATTEMPTS) {
    attempts++;
    const attemptStart = Date.now();
    try {
      result = await withTimeout(
        generateQuiz({ context: promptContext }),
        MAIN_LLM_TIMEOUT_MS,
      );
      console.log(
        `[ai/generate-quiz] main LLM call latency: ${result.latencyMs}ms (attempt ${attempts}/${MAX_MAIN_LLM_ATTEMPTS})`,
      );
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      const elapsed = Date.now() - attemptStart;
      const isTimeout = err instanceof LLMTimeoutError;
      console.warn(
        `[ai/generate-quiz] attempt ${attempts}/${MAX_MAIN_LLM_ATTEMPTS} failed after ${elapsed}ms` +
          (isTimeout ? " [timeout]" : ""),
      );
      if (attempts < MAX_MAIN_LLM_ATTEMPTS) {
        console.warn("[ai/generate-quiz] retrying...");
      }
    }
  }

  if (!result) {
    await logFailedGenerationAndThrow({
      supabase,
      userId,
      input,
      courseId: course.id,
      attempts,
      err: lastErr,
    });
  }

  // After logFailedGenerationAndThrow — `result` is non-null on this path.
  const llmResult = result!;

  // ── Persist as draft quiz row ──────────────────────────────────────
  const { data: existing } = await supabase
    .from("quizzes")
    .select("order")
    .eq("section_id", input.sectionId)
    .order("order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.order ?? 0) + 1;

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      section_id: input.sectionId,
      title: llmResult.output.title,
      description: llmResult.output.description,
      passing_score: 60,
      order: nextOrder,
    })
    .select("id")
    .single();

  if (quizError || !quiz) {
    throw new QuizPersistError(
      quizError?.message ?? "Échec de création du quiz",
    );
  }

  // ── Plan blocks: enforce per-type caps + run TTS + repair passages ─
  type PlannedBlock =
    | { kind: "direct"; insert: QuizBlockInsert }
    | {
        kind: "passage";
        parentInsert: QuizBlockInsert;
        childKey: "audio_block_id" | "passage_block_id";
        questions: AIPassageQuestion[];
      };

  // Defensive: enforce per-type caps from the user's mix. The model
  // sometimes emits extras even when told to emit one. Drop the surplus.
  const caps = { ...input.mix };
  const seen = {
    mcq: 0,
    fill_blank: 0,
    free_text: 0,
    voice_response: 0,
    audio_passage: 0,
    text_passage: 0,
  };
  const trimmedBlocks = llmResult.output.blocks.filter((b) => {
    const t = b.type as keyof typeof caps;
    if (caps[t] === undefined) return true;
    if (seen[t] >= caps[t]) {
      console.warn(
        `[ai/generate-quiz] dropping extra ${t} block (model emitted ${seen[t] + 1}, cap is ${caps[t]})`,
      );
      return false;
    }
    seen[t] += 1;
    return true;
  });

  // Critic + repair: passages missing comprehension MCQs get a focused
  // second LLM call. Repairs run in parallel — they're independent.
  const totalPassageQs = (mix: PassageQuestionMix): number =>
    mix.mcq + mix.fill_blank;

  const needsRepair = (b: (typeof trimmedBlocks)[number]): boolean => {
    if (b.type === "text_passage")
      return totalPassageQs(input.questionsPerTextPassage) > 0 &&
        (b.questions?.length ?? 0) < totalPassageQs(input.questionsPerTextPassage);
    if (b.type === "audio_passage")
      return totalPassageQs(input.questionsPerAudioPassage) > 0 &&
        (b.questions?.length ?? 0) < totalPassageQs(input.questionsPerAudioPassage);
    return false;
  };

  const anyPassageQs =
    totalPassageQs(input.questionsPerTextPassage) > 0 ||
    totalPassageQs(input.questionsPerAudioPassage) > 0;

  if (anyPassageQs) {
    const passagesNeedingRepair = trimmedBlocks.filter(needsRepair);

    if (passagesNeedingRepair.length > 0) {
      const repairBatchStart = Date.now();
      await Promise.all(
        passagesNeedingRepair.map(async (b) => {
          if (b.type !== "text_passage" && b.type !== "audio_passage") return;
          const targetCount =
            b.type === "text_passage"
              ? totalPassageQs(input.questionsPerTextPassage)
              : totalPassageQs(input.questionsPerAudioPassage);
          const have = b.questions?.length ?? 0;
          const sourceText = b.type === "text_passage" ? b.passage : b.script;
          try {
            console.warn(
              `[ai/generate-quiz] ${b.type} missing ${targetCount - have} comprehension question(s) — repairing`,
            );
            const repair = await generatePassageQuestions({
              context: {
                cefrLevel: course.level,
                sourceLabel: b.type === "text_passage" ? "passage" : "script",
                sourceText,
                count: targetCount,
              },
            });
            console.log(
              `[ai/generate-quiz] repair (${b.type}) latency: ${repair.latencyMs}ms`,
            );
            // Repair only produces MCQs — cast is safe; type field added below.
            b.questions = repair.output.questions
              .slice(0, targetCount)
              .map((q) => ({ ...q, type: "mcq" as const }));
          } catch (err) {
            console.error(
              "[ai/generate-quiz] passage-questions repair failed:",
              err,
            );
          }
        }),
      );
      console.log(
        `[ai/generate-quiz] repair batch (${passagesNeedingRepair.length} passage(s)) total: ${Date.now() - repairBatchStart}ms`,
      );
    }
  }

  const plannedBlocks: PlannedBlock[] = [];
  let cursor = 0;

  for (const b of trimmedBlocks) {
    if (b.type === "mcq") {
      plannedBlocks.push({
        kind: "direct",
        insert: {
          quiz_id: quiz.id,
          type: "mcq",
          content: {
            prompt: b.question,
            allow_multiple: false,
            options: toUiOptions(b.options, b.correct_index),
          },
          weight: 1,
          grading_notes: b.explanation ?? null,
          order: cursor++,
        },
      });
    } else if (b.type === "fill_blank") {
      plannedBlocks.push({
        kind: "direct",
        insert: {
          quiz_id: quiz.id,
          type: "fill_blank",
          content: {
            sentence: b.sentence,
            options: toUiOptions(b.options, b.correct_index),
          },
          weight: 1,
          grading_notes: b.explanation ?? null,
          order: cursor++,
        },
      });
    } else if (b.type === "free_text") {
      plannedBlocks.push({
        kind: "direct",
        insert: {
          quiz_id: quiz.id,
          type: "free_text",
          content: {
            prompt: b.question,
            min_words: b.min_words,
            max_words: b.max_words,
          },
          weight: 1,
          model_answer: b.model_answer,
          grading_notes: b.rubric,
          order: cursor++,
        },
      });
    } else if (b.type === "voice_response") {
      plannedBlocks.push({
        kind: "direct",
        insert: {
          quiz_id: quiz.id,
          type: "voice",
          content: { prompt: b.question, max_seconds: b.max_seconds },
          weight: 1,
          model_answer: b.model_answer,
          grading_notes: b.rubric,
          order: cursor++,
        },
      });
    } else if (b.type === "audio_passage") {
      // Run TTS now — failure aborts the whole quiz so we don't persist
      // a broken listening exercise. The TTS layer handles caching.
      const voice =
        (b.voice_hint && VOICE_BY_HINT[b.voice_hint]) ?? DEFAULT_VOICE;
      let tts;
      try {
        tts = await synthesizeSpeech({
          supabase,
          script: b.script,
          voiceId: voice.voiceId,
          speed: voice.speed,
        });
      } catch (err) {
        await supabase.from("quizzes").delete().eq("id", quiz.id);
        const msg =
          err instanceof TTSError
            ? `Synthèse audio échouée : ${err.message}`
            : "Synthèse audio échouée";
        console.error("[ai/generate-quiz] TTS failed:", err);
        throw new QuizTTSError(msg);
      }

      const audioOrder = cursor++;
      const audioQuestions = b.questions ?? [];
      plannedBlocks.push({
        kind: "passage",
        childKey: "audio_block_id",
        parentInsert: {
          quiz_id: quiz.id,
          type: "audio",
          content: {
            audio_url: tts.audioUrl,
            caption: b.caption,
            script: b.script,
            voice_id: tts.voiceId,
            speed: tts.speed,
            duration_seconds: tts.durationSeconds ?? undefined,
            transcript_visible: false,
          },
          weight: null, // ungraded parent; child MCQs carry the weight
          order: audioOrder,
        },
        questions: audioQuestions,
      });
      cursor += audioQuestions.length;
    } else if (b.type === "text_passage") {
      const passageOrder = cursor++;
      const questions = b.questions ?? [];
      plannedBlocks.push({
        kind: "passage",
        childKey: "passage_block_id",
        parentInsert: {
          quiz_id: quiz.id,
          type: "text",
          content: { html: b.passage },
          weight: null,
          order: passageOrder,
        },
        questions,
      });
      cursor += questions.length;
    }
  }

  // ── Pass 1: insert passage parents (audio + text) so we get their ids ─
  const passagePlanned = plannedBlocks.filter(
    (p): p is Extract<PlannedBlock, { kind: "passage" }> =>
      p.kind === "passage",
  );

  const parentIdsByOrder = new Map<number, string>();
  if (passagePlanned.length > 0) {
    const { data: parentRows, error: parentErr } = await supabase
      .from("quiz_blocks")
      .insert(passagePlanned.map((p) => p.parentInsert))
      .select("id, order");

    if (parentErr || !parentRows) {
      await supabase.from("quizzes").delete().eq("id", quiz.id);
      throw new QuizPersistError(
        parentErr?.message ?? "Échec d'insertion des blocs de passage",
      );
    }
    for (const row of parentRows) {
      parentIdsByOrder.set(row.order, row.id);
    }
  }

  // ── Pass 2: direct blocks + passage comprehension questions ──────
  const remainingInserts: QuizBlockInsert[] = [];
  for (const p of plannedBlocks) {
    if (p.kind === "direct") {
      remainingInserts.push(p.insert);
    } else {
      const parentId = parentIdsByOrder.get(p.parentInsert.order);
      p.questions.forEach((q, qIdx) => {
        let insert: QuizBlockInsert;
        if (q.type === "fill_blank") {
          insert = {
            quiz_id: quiz.id,
            type: "fill_blank",
            content: {
              sentence: q.sentence,
              options: toUiOptions(q.options, q.correct_index),
              [p.childKey]: parentId,
            },
            weight: 1,
            grading_notes: q.explanation ?? null,
            order: p.parentInsert.order + 1 + qIdx,
          };
        } else {
          insert = {
            quiz_id: quiz.id,
            type: "mcq",
            content: {
              prompt: q.question,
              allow_multiple: false,
              options: toUiOptions(q.options, q.correct_index),
              [p.childKey]: parentId,
            },
            weight: 1,
            grading_notes: q.explanation ?? null,
            order: p.parentInsert.order + 1 + qIdx,
          };
        }
        remainingInserts.push(insert);
      });
    }
  }

  if (remainingInserts.length > 0) {
    const { error: blocksError } = await supabase
      .from("quiz_blocks")
      .insert(remainingInserts);
    if (blocksError) {
      await supabase.from("quizzes").delete().eq("id", quiz.id);
      throw new QuizPersistError(blocksError.message);
    }
  }

  // ── Telemetry ──────────────────────────────────────────────────────
  const allInserts: QuizBlockInsert[] = [
    ...passagePlanned.map((p) => p.parentInsert),
    ...remainingInserts,
  ];
  const blocksSnapshot = allInserts
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((b) => ({
      type: b.type,
      content: b.content,
      weight: b.weight,
      order: b.order,
    }));

  const costCents = computeCostCents(DEFAULT_MODEL.quiz_gen, llmResult.usage);
  await logGeneration({
    supabase,
    userId,
    feature: "quiz_gen",
    inputContext: { ...input, courseId: course.id },
    result: llmResult,
    outputQuizId: quiz.id,
    costCents,
    blocksSnapshot,
  });

  // LLM judge currently disabled during model bake-off (see prior code).

  return {
    quizId: quiz.id,
    courseId: course.id,
    title: llmResult.output.title,
    cefrTargeted: llmResult.output.cefr_targeted as CEFRLevel,
    skillsCovered: llmResult.output.skills_covered,
  };
};

// ── Failure path ───────────────────────────────────────────────────────
// Classify the LLM error, log a failure-row to ai_generations (best-effort),
// then throw QuizGenerationFailedError so the route returns 504/502.
async function logFailedGenerationAndThrow({
  supabase,
  userId,
  input,
  courseId,
  attempts,
  err,
}: {
  supabase: SupabaseClient<Database>;
  userId: string;
  input: GenerateQuizInput;
  courseId: string;
  attempts: number;
  err: unknown;
}): Promise<never> {
  const message =
    err instanceof AIGenerationError
      ? err.message
      : "La génération a échoué, réessayez";
  const rawText = err instanceof AIGenerationError ? err.rawText : undefined;
  const cause = err instanceof AIGenerationError ? err.cause : err;
  const causeName = cause instanceof Error ? cause.name : typeof cause;
  const causeMessage = cause instanceof Error ? cause.message : String(cause);
  const statusCode =
    cause && typeof cause === "object" && "statusCode" in cause
      ? (cause as { statusCode?: number }).statusCode
      : undefined;

  let kind: QuizGenFailureKind = "unknown";
  if (err instanceof LLMTimeoutError) kind = "timeout";
  else if (rawText) kind = "schema";
  else if (
    statusCode === 429 ||
    /quota|rate limit|exceeded your current quota/i.test(causeMessage)
  )
    kind = "rate_limit";
  else if (statusCode === 401 || statusCode === 403) kind = "auth";
  else if (statusCode === 503 || /high demand|overload/i.test(causeMessage))
    kind = "overload";

  const userMessage =
    kind === "timeout"
      ? "La génération a pris trop de temps. Réessayez dans un instant ou réduisez le nombre de blocs."
      : message;

  console.error(
    `[ai/generate-quiz] generation failed [kind=${kind}] [cause=${causeName}]` +
      (statusCode !== undefined ? ` [status=${statusCode}]` : ""),
  );
  console.error("[ai/generate-quiz] message:", message);
  console.error("[ai/generate-quiz] cause message:", causeMessage);
  if (cause instanceof Error && cause.stack) {
    console.error("[ai/generate-quiz] cause stack:\n" + cause.stack);
  }
  if (rawText) {
    console.error(
      "[ai/generate-quiz] raw model output (truncated 4000 chars):\n" +
        rawText.slice(0, 4000),
    );
  }

  const modelKey = DEFAULT_MODEL.quiz_gen;
  await logGeneration({
    supabase,
    userId,
    feature: "quiz_gen",
    inputContext: { ...input, courseId },
    result: {
      output: null as unknown as never,
      usage: { inputTokens: null, outputTokens: null, cacheReadTokens: null },
      latencyMs: 0,
      model: modelKey,
      provider: MODELS[modelKey].provider,
      promptVersion: PROMPT_VERSIONS.quiz_gen,
      retryCount: attempts - 1,
      schemaValid: false,
      inputHash: "",
      error: `[${kind}] ${message}`,
    },
    costCents: 0,
  });

  throw new QuizGenerationFailedError(userMessage, kind, rawText);
}
