import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateQuiz } from "@/lib/ai/generators/quiz.generator";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { synthesizeSpeech } from "@/lib/ai/tts/synthesize";
import { AIQuotaExceededError, AIGenerationError } from "@/lib/ai/types";
import { TTSError } from "@/lib/ai/tts/types";
import { DEFAULT_MODEL, MODELS, PROMPT_VERSIONS } from "@/lib/ai/constants";
import type { QuizGenPromptContext } from "@/lib/ai/prompts/quiz-generation";
import type { QuizBlockInsert } from "@/lib/types";

// Map the model's free-form voice hint to a concrete Google Chirp 3 HD
// voice. Keeping the mapping in one place lets us swap providers later
// without touching the prompt or schema.
const VOICE_BY_HINT: Record<string, { voiceId: string; speed: number }> = {
  neutral_female: { voiceId: "en-US-Chirp3-HD-Aoede", speed: 1.0 },
  neutral_male: { voiceId: "en-US-Chirp3-HD-Charon", speed: 1.0 },
  slow_clear: { voiceId: "en-US-Chirp3-HD-Aoede", speed: 0.85 },
};
const DEFAULT_VOICE = VOICE_BY_HINT.neutral_female;

const BodySchema = z.object({
  sectionId: z.uuid(),
  lessonIds: z.array(z.uuid()).min(1).max(5),
  numQuestions: z.number().int().min(3).max(15),
  mix: z.object({
    mcq: z.number().int().min(0),
    fill_blank: z.number().int().min(0),
    free_text: z.number().int().min(0),
    voice_response: z.number().int().min(0),
    audio_passage: z.number().int().min(0).max(3),
    text_passage: z.number().int().min(0).max(3),
  }),
  questionsPerPassage: z.number().int().min(1).max(5),
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
      content: l.content ?? "",
    })),
    focusTopic: body.focusTopic,
    numQuestions: body.numQuestions,
    mix: body.mix,
    questionsPerPassage: body.questionsPerPassage,
  };

  let result;
  try {
    result = await generateQuiz({ context: promptContext });
  } catch (err) {
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
    let kind: "overload" | "schema" | "rate_limit" | "auth" | "unknown" =
      "unknown";
    if (rawText) kind = "schema";
    else if (
      statusCode === 429 ||
      /quota|rate limit|exceeded your current quota/i.test(causeMessage)
    )
      kind = "rate_limit";
    else if (statusCode === 401 || statusCode === 403) kind = "auth";
    else if (statusCode === 503 || /high demand|overload/i.test(causeMessage))
      kind = "overload";

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
        retryCount: 0,
        schemaValid: false,
        inputHash: "",
        error: message,
      },
      costCents: 0,
    });

    return NextResponse.json(
      { error: message, rawText: rawText ?? null },
      { status: 502 },
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

  const plannedBlocks: PlannedBlock[] = [];
  let cursor = 0;

  for (const b of result.output.blocks) {
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
        questions: b.questions,
      });
      cursor += b.questions.length;
    } else if (b.type === "text_passage") {
      const passageOrder = cursor++;
      plannedBlocks.push({
        kind: "passage",
        childKey: "passage_block_id",
        parentInsert: {
          quiz_id: quiz.id,
          type: "text",
          content: {
            passage: b.passage,
            caption: b.caption,
          },
          weight: null,
          order: passageOrder,
        },
        questions: b.questions,
      });
      cursor += b.questions.length;
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
  await logGeneration({
    supabase,
    userId: user.id,
    feature: "quiz_gen",
    inputContext: { ...body, courseId: course.id },
    result,
    outputQuizId: quiz.id,
    costCents,
    blocksSnapshot,
  });

  return NextResponse.json({
    quizId: quiz.id,
    courseId: course.id,
    title: result.output.title,
    cefrTargeted: result.output.cefr_targeted,
    skillsCovered: result.output.skills_covered,
  });
}
