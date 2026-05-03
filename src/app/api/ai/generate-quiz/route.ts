import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateQuiz } from "@/lib/ai/generators/quiz.generator";
import { generatePassageQuestions } from "@/lib/ai/generators/passage-questions.generator";
import { judgeAndStoreQuizEval } from "@/lib/ai/generators/quiz-judge.generator";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { synthesizeSpeech } from "@/lib/ai/tts/synthesize";
import { stripLessonHtml } from "@/lib/extensions/lesson-html";
import { AIQuotaExceededError, AIGenerationError } from "@/lib/ai/types";
import { TTSError } from "@/lib/ai/tts/types";
import { DEFAULT_MODEL, MODELS, PROMPT_VERSIONS } from "@/lib/ai/constants";
import type { QuizGenPromptContext } from "@/lib/ai/prompts/quiz-generation";
import type { QuizBlockInsert } from "@/lib/types";

// Vercel Hobby caps function execution at 60s.
export const maxDuration = 60;

// Map the model's free-form voice hint to a concrete OpenAI TTS voice.
// Keeping the mapping in one place lets us swap providers later without
// touching the prompt or schema.
const VOICE_BY_HINT: Record<string, { voiceId: string; speed: number }> = {
  neutral_female: { voiceId: "nova", speed: 1.0 },
  neutral_male: { voiceId: "onyx", speed: 1.0 },
  slow_clear: { voiceId: "nova", speed: 0.85 },
};
const DEFAULT_VOICE = VOICE_BY_HINT.neutral_female;

// Stage 1 caps to keep generation under Vercel Hobby's 60s limit.
const MAX_LESSONS = 1;
const MAX_DIRECT_QUESTIONS = 8;
const MAX_PASSAGES_PER_TYPE = 1;
const MAX_LESSON_CONTENT_CHARS = 12000;

// Bound the worst-case LLM hang. Two attempts at 30s = 60s, fits Hobby.
const MAIN_LLM_TIMEOUT_MS = 30000;
const MAX_MAIN_LLM_ATTEMPTS = 2;

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

const BodySchema = z.object({
  sectionId: z.uuid(),
  lessonIds: z.array(z.uuid()).min(1).max(MAX_LESSONS),
  numQuestions: z.number().int().min(0).max(MAX_DIRECT_QUESTIONS),
  mix: z.object({
    mcq: z.number().int().min(0),
    fill_blank: z.number().int().min(0),
    free_text: z.number().int().min(0),
    voice_response: z.number().int().min(0),
    audio_passage: z.number().int().min(0).max(MAX_PASSAGES_PER_TYPE),
    text_passage: z.number().int().min(0).max(MAX_PASSAGES_PER_TYPE),
  }),
  questionsPerPassage: z.number().int().min(0).max(5),
  focusTopic: z.string().max(500).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const supabase = await createServerSupabase();

  // ── Auth ────────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // ── Parse body ──────────────────────────────────────────────────────
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    const message =
      err instanceof z.ZodError ? err.issues[0]?.message : "Requête invalide";
    return NextResponse.json({ error: message ?? "Requête invalide" }, { status: 400 });
  }

  // Direct gradable questions only — passage-derived MCQs are added on top
  // (audio_passage + text_passage) × questionsPerPassage.
  const totalMix =
    body.mix.mcq +
    body.mix.fill_blank +
    body.mix.free_text +
    body.mix.voice_response;
  if (totalMix !== body.numQuestions) {
    return NextResponse.json(
      { error: "La répartition des types ne correspond pas au nombre de questions" },
      { status: 400 },
    );
  }

  // A quiz must have at least one block (direct question OR passage).
  const totalBlocks = totalMix + body.mix.audio_passage + body.mix.text_passage;
  if (totalBlocks < 1) {
    return NextResponse.json(
      { error: "Le quiz doit contenir au moins un bloc" },
      { status: 400 },
    );
  }

  // ── Load section → course (ownership check via RLS + explicit check) ─
  const { data: section, error: sectionError } = await supabase
    .from("sections")
    .select("id, course_id, courses(id, instructor_id, title, level)")
    .eq("id", body.sectionId)
    .single();

  if (sectionError || !section) {
    return NextResponse.json({ error: "Section introuvable" }, { status: 404 });
  }

  const course = section.courses as unknown as {
    id: string;
    instructor_id: string;
    title: string;
    level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  } | null;

  if (!course || course.instructor_id !== user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // ── Load lessons (must all belong to this section) ──────────────────
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, type, content")
    .in("id", body.lessonIds)
    .eq("section_id", body.sectionId);

  if (lessonsError) {
    return NextResponse.json({ error: lessonsError.message }, { status: 500 });
  }
  if (!lessons || lessons.length !== body.lessonIds.length) {
    return NextResponse.json(
      { error: "Certaines leçons sélectionnées sont invalides" },
      { status: 400 },
    );
  }

  // Reject lessons whose content would balloon the prompt and risk a timeout.
  const oversizedLesson = lessons.find(
    (l) => (l.content?.length ?? 0) > MAX_LESSON_CONTENT_CHARS,
  );
  if (oversizedLesson) {
    return NextResponse.json(
      {
        error: `La leçon « ${oversizedLesson.title} » est trop longue (max ${MAX_LESSON_CONTENT_CHARS} caractères). Raccourcissez-la ou divisez-la avant de générer un quiz.`,
      },
      { status: 400 },
    );
  }

  // ── Quota check (MVP is permissive; still wired end-to-end) ────────
  try {
    await assertQuota(supabase, user.id, "quiz_gen");
  } catch (err) {
    if (err instanceof AIQuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  // ── Build prompt context + call the generator ──────────────────────
  const promptContext: QuizGenPromptContext = {
    courseTitle: course.title,
    courseLevel: course.level,
    lessons: lessons.map((l) => ({
      title: l.title,
      type: l.type,
      content: stripLessonHtml(l.content ?? ""),
    })),
    focusTopic: body.focusTopic,
    numQuestions: body.numQuestions,
    mix: body.mix,
    questionsPerPassage: body.questionsPerPassage,
  };

  let result;
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
    const err = lastErr;
    const message =
      err instanceof AIGenerationError
        ? err.message
        : "La génération a échoué, réessayez";
    const rawText =
      err instanceof AIGenerationError ? err.rawText : undefined;
    const cause =
      err instanceof AIGenerationError ? err.cause : err;
    const causeName =
      cause instanceof Error ? cause.name : typeof cause;
    const causeMessage =
      cause instanceof Error ? cause.message : String(cause);
    const statusCode =
      cause && typeof cause === "object" && "statusCode" in cause
        ? (cause as { statusCode?: number }).statusCode
        : undefined;

    // Classify so we can tell overload vs schema vs auth vs unknown at a glance.
    let kind:
      | "timeout"
      | "overload"
      | "schema"
      | "rate_limit"
      | "auth"
      | "unknown" = "unknown";
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

    // User-facing message — friendlier when we know it timed out.
    const userMessage =
      kind === "timeout"
        ? "La génération a pris trop de temps. Réessayez dans un instant ou réduisez le nombre de blocs."
        : message;

    // Server-side log — visible in the `next dev` terminal
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
      userId: user.id,
      feature: "quiz_gen",
      inputContext: { ...body, courseId: course.id },
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

    return NextResponse.json(
      { error: userMessage, rawText: rawText ?? null },
      { status: kind === "timeout" ? 504 : 502 },
    );
  }

  // ── Persist as draft quiz + blocks ──────────────────────────────────
  // Next order = current max(order) + 1 in this section
  const { data: existing } = await supabase
    .from("quizzes")
    .select("order")
    .eq("section_id", body.sectionId)
    .order("order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.order ?? 0) + 1;

  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      section_id: body.sectionId,
      title: result.output.title,
      description: result.output.description,
      passing_score: 60,
      order: nextOrder,
    })
    .select("id")
    .single();

  if (quizError || !quiz) {
    return NextResponse.json(
      { error: quizError?.message ?? "Échec de création du quiz" },
      { status: 500 },
    );
  }

  // Map the flat LLM output to the rich UI/DB shape.
  // Flat: options is string[] + correct_index. UI: options is [{id, label, is_correct}].
  const toUiOptions = (
    labels: string[],
    correctIndex: number,
  ): { id: string; label: string; is_correct: boolean }[] =>
    labels.map((label, idx) => ({
      id: `opt_${String.fromCharCode(97 + idx)}`,
      label,
      is_correct: idx === correctIndex,
    }));

  // Passage blocks (audio + text) need a two-pass insert: parent row first
  // to get its id, then comprehension MCQs that reference it via
  // content.audio_block_id / content.passage_block_id. We pre-build a plan
  // describing the final row sequence, run it, then walk it twice.
  type PassageQuestion = {
    question: string;
    options: string[];
    correct_index: number;
    explanation?: string;
  };

  type PlannedBlock =
    | { kind: "direct"; insert: QuizBlockInsert }
    | {
        kind: "passage";
        parentInsert: QuizBlockInsert;
        childKey: "audio_block_id" | "passage_block_id";
        questions: PassageQuestion[];
      };

  // Defensive: enforce per-type caps from the user's mix. The model sometimes
  // emits an extra passage even when told to emit one. Drop the surplus.
  const caps = {
    mcq: body.mix.mcq,
    fill_blank: body.mix.fill_blank,
    free_text: body.mix.free_text,
    voice_response: body.mix.voice_response,
    audio_passage: body.mix.audio_passage,
    text_passage: body.mix.text_passage,
  };
  const seen = {
    mcq: 0,
    fill_blank: 0,
    free_text: 0,
    voice_response: 0,
    audio_passage: 0,
    text_passage: 0,
  };
  const trimmedBlocks = result.output.blocks.filter((b) => {
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
  if (body.questionsPerPassage > 0) {
    const passagesNeedingRepair = trimmedBlocks.filter(
      (b) =>
        (b.type === "text_passage" || b.type === "audio_passage") &&
        (b.questions?.length ?? 0) < body.questionsPerPassage,
    );

    if (passagesNeedingRepair.length > 0) {
      const repairBatchStart = Date.now();
      await Promise.all(
        passagesNeedingRepair.map(async (b) => {
          if (b.type !== "text_passage" && b.type !== "audio_passage") return;
          const have = b.questions?.length ?? 0;
          const sourceText = b.type === "text_passage" ? b.passage : b.script;
          try {
            console.warn(
              `[ai/generate-quiz] ${b.type} missing ${body.questionsPerPassage - have} comprehension question(s) — repairing`,
            );
            const repair = await generatePassageQuestions({
              context: {
                cefrLevel: course.level,
                sourceLabel: b.type === "text_passage" ? "passage" : "script",
                sourceText,
                count: body.questionsPerPassage,
              },
            });
            console.log(
              `[ai/generate-quiz] repair (${b.type}) latency: ${repair.latencyMs}ms`,
            );
            b.questions = repair.output.questions.slice(
              0,
              body.questionsPerPassage,
            );
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
          content: {
            prompt: b.question,
            max_seconds: b.max_seconds,
          },
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
        return NextResponse.json({ error: msg }, { status: 502 });
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
      return NextResponse.json(
        { error: parentErr?.message ?? "Échec d'insertion des blocs de passage" },
        { status: 500 },
      );
    }
    for (const row of parentRows) {
      parentIdsByOrder.set(row.order, row.id);
    }
  }

  // ── Pass 2: direct blocks + passage comprehension MCQs ──────────────
  const remainingInserts: QuizBlockInsert[] = [];
  for (const p of plannedBlocks) {
    if (p.kind === "direct") {
      remainingInserts.push(p.insert);
    } else {
      const parentId = parentIdsByOrder.get(p.parentInsert.order);
      p.questions.forEach((q, qIdx) => {
        remainingInserts.push({
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
        });
      });
    }
  }

  if (remainingInserts.length > 0) {
    const { error: blocksError } = await supabase
      .from("quiz_blocks")
      .insert(remainingInserts);

    if (blocksError) {
      await supabase.from("quizzes").delete().eq("id", quiz.id);
      return NextResponse.json({ error: blocksError.message }, { status: 500 });
    }
  }

  // ── Telemetry ───────────────────────────────────────────────────────
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

  const costCents = computeCostCents(DEFAULT_MODEL.quiz_gen, result.usage);
  const generationId = await logGeneration({
    supabase,
    userId: user.id,
    feature: "quiz_gen",
    inputContext: { ...body, courseId: course.id },
    result,
    outputQuizId: quiz.id,
    costCents,
    blocksSnapshot,
  });

  // Fire LLM judge after telemetry — never awaited so it never delays the response.
  // Disabled during model bake-off to save tokens.
  // if (generationId) {
  //   void judgeAndStoreQuizEval({
  //     supabase,
  //     generationId,
  //     userId: user.id,
  //     context: {
  //       courseTitle: promptContext.courseTitle,
  //       courseLevel: promptContext.courseLevel,
  //       lessons: promptContext.lessons,
  //       focusTopic: body.focusTopic,
  //       quizOutput: {
  //         title: result.output.title,
  //         description: result.output.description ?? null,
  //         cefr_targeted: result.output.cefr_targeted,
  //         blocks: result.output.blocks,
  //       },
  //     },
  //   }).catch((err) => console.error("[quiz-judge] unexpected:", err));
  // }

  return NextResponse.json({
    quizId: quiz.id,
    courseId: course.id,
    title: result.output.title,
    cefrTargeted: result.output.cefr_targeted,
    skillsCovered: result.output.skills_covered,
  });
}
