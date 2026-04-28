import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { editQuiz } from "@/lib/ai/generators/quiz-edit.generator";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { AIQuotaExceededError, AIGenerationError } from "@/lib/ai/types";
import { DEFAULT_MODEL, MODELS, PROMPT_VERSIONS } from "@/lib/ai/constants";
import {
  aiQuizEditOutputSchema,
  type AIQuizChange,
} from "@/lib/ai/schemas/quiz-edit.schema";
import type { QuizEditPromptContext } from "@/lib/ai/prompts/quiz-editing";
import type { AIQuizBlock } from "@/lib/ai/schemas/quiz-output.schema";
import type { QuizBlockInsert } from "@/lib/types";

// ── Body schemas ───────────────────────────────────────────────────────
const ProposeBody = z.object({
  action: z.literal("propose"),
  quizId: z.uuid(),
  instruction: z.string().min(3).max(1000),
});

const ApplyBody = z.object({
  action: z.literal("apply"),
  quizId: z.uuid(),
  generationId: z.uuid(),
  // Already filtered client-side to the changes the instructor accepted.
  changes: z.array(aiQuizEditOutputSchema.shape.changes.element).min(1),
});

const Body = z.discriminatedUnion("action", [ProposeBody, ApplyBody]);

// ── Shared: flat AI block → rich UI/DB shape ───────────────────────────
// Duplicated from /api/ai/generate-quiz/route.ts. Will be folded into a
// shared mapper at agent #3 — see "Reusable Agent Runner" in AI-AGENTS.md.
const toUiOptions = (
  labels: string[],
  correctIndex: number,
): { id: string; label: string; is_correct: boolean }[] =>
  labels.map((label, idx) => ({
    id: `opt_${String.fromCharCode(97 + idx)}`,
    label,
    is_correct: idx === correctIndex,
  }));

interface QuizBlockShape {
  type: QuizBlockInsert["type"];
  content: Record<string, unknown>;
  weight: number | null;
  model_answer?: string | null;
  grading_notes?: string | null;
}

const aiBlockToDbShape = (b: AIQuizBlock): QuizBlockShape => {
  if (b.type === "mcq") {
    return {
      type: "mcq",
      content: {
        prompt: b.question,
        allow_multiple: false,
        options: toUiOptions(b.options, b.correct_index),
      },
      weight: 1,
      grading_notes: b.explanation ?? null,
    };
  }
  if (b.type === "fill_blank") {
    return {
      type: "fill_blank",
      content: {
        sentence: b.sentence,
        options: toUiOptions(b.options, b.correct_index),
      },
      weight: 1,
      grading_notes: b.explanation ?? null,
    };
  }
  if (b.type === "free_text") {
    return {
      type: "free_text",
      content: {
        prompt: b.question,
        min_words: b.min_words,
        max_words: b.max_words,
      },
      weight: 1,
      model_answer: b.model_answer,
      grading_notes: b.rubric,
    };
  }
  if (b.type === "voice_response") {
    return {
      type: "voice",
      content: {
        prompt: b.question,
        max_seconds: b.max_seconds,
      },
      weight: 1,
      model_answer: b.model_answer,
      grading_notes: b.rubric,
    };
  }
  if (b.type === "text_passage") {
    // Stage 1: passage parents emitted from the editor become a single text
    // block; the LLM-supplied questions are dropped (no auto-MCQ expansion
    // here — that lives in quiz_gen). Instructor can re-run quiz_gen if they
    // need comprehension MCQs from this passage.
    return {
      type: "text",
      content: {
        passage: b.passage,
        caption: b.caption,
      },
      weight: null,
    };
  }
  // audio_passage — same restriction; emitting one from the editor would
  // require a TTS pipeline call here. Out of Stage 1 scope; reject upstream.
  throw new Error(`Block type "${b.type}" not yet supported by quiz_edit`);
};

// ───────────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    const message =
      err instanceof z.ZodError ? err.issues[0]?.message : "Requête invalide";
    return NextResponse.json({ error: message ?? "Requête invalide" }, { status: 400 });
  }

  // Ownership check (instructor must own the course this quiz belongs to)
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select(
      "id, title, description, sections!inner(id, courses!inner(id, instructor_id, title, level))",
    )
    .eq("id", body.quizId)
    .single();

  if (quizError || !quiz) {
    return NextResponse.json({ error: "Quiz introuvable" }, { status: 404 });
  }
  const course = (quiz.sections as unknown as {
    courses: { id: string; instructor_id: string; title: string; level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" };
  }).courses;
  if (course.instructor_id !== user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (body.action === "propose") {
    return propose({
      supabase,
      userId: user.id,
      quizId: body.quizId,
      quizTitle: quiz.title,
      quizDescription: quiz.description,
      courseTitle: course.title,
      courseLevel: course.level,
      instruction: body.instruction,
    });
  }

  // ── apply ────────────────────────────────────────────────────────
  return apply({
    supabase,
    quizId: body.quizId,
    generationId: body.generationId,
    changes: body.changes,
  });
}

// ── PROPOSE ────────────────────────────────────────────────────────────
async function propose({
  supabase,
  userId,
  quizId,
  quizTitle,
  quizDescription,
  courseTitle,
  courseLevel,
  instruction,
}: {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  userId: string;
  quizId: string;
  quizTitle: string;
  quizDescription: string | null;
  courseTitle: string;
  courseLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  instruction: string;
}): Promise<Response> {
  // Quota
  try {
    await assertQuota(supabase, userId, "quiz_edit");
  } catch (err) {
    if (err instanceof AIQuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  // Snapshot current blocks → fed to model AND logged for eval context
  const { data: blocks, error: blocksError } = await supabase
    .from("quiz_blocks")
    .select("id, type, content, weight, order")
    .eq("quiz_id", quizId)
    .order("order", { ascending: true });
  if (blocksError) {
    return NextResponse.json({ error: blocksError.message }, { status: 500 });
  }

  const promptContext: QuizEditPromptContext = {
    courseTitle,
    courseLevel,
    quizTitle,
    quizDescription,
    blocks: (blocks ?? []).map((b) => ({
      id: b.id,
      type: b.type,
      weight: b.weight,
      order: b.order,
      content: b.content as Record<string, unknown> | null,
    })),
    instruction,
  };

  let result;
  try {
    result = await editQuiz({ context: promptContext });
  } catch (err) {
    const message =
      err instanceof AIGenerationError
        ? err.message
        : "L'édition IA a échoué, réessayez";
    const rawText =
      err instanceof AIGenerationError ? err.rawText : undefined;
    console.error("[ai/edit-quiz] propose failed:", message);

    const modelKey = DEFAULT_MODEL.quiz_edit;
    await logGeneration({
      supabase,
      userId,
      feature: "quiz_edit",
      inputContext: { quizId, instruction, blockCount: blocks?.length ?? 0 },
      result: {
        output: null as unknown as never,
        usage: { inputTokens: null, outputTokens: null, cacheReadTokens: null },
        latencyMs: 0,
        model: modelKey,
        provider: MODELS[modelKey].provider,
        promptVersion: PROMPT_VERSIONS.quiz_edit,
        retryCount: 0,
        schemaValid: false,
        inputHash: "",
        error: message,
      },
      costCents: 0,
      outputQuizId: quizId,
    });
    return NextResponse.json(
      { error: message, rawText: rawText ?? null },
      { status: 502 },
    );
  }

  // Validate every referenced block_id exists (defence against the model
  // hallucinating ids despite the prompt rule).
  const validIds = new Set((blocks ?? []).map((b) => b.id));
  const invalid = result.output.changes.filter((c) => {
    if (c.kind === "update_block" || c.kind === "delete_block") {
      return !validIds.has(c.block_id);
    }
    if (c.kind === "add_block" && c.after_block_id !== null) {
      return !validIds.has(c.after_block_id);
    }
    return false;
  });

  if (invalid.length > 0) {
    return NextResponse.json(
      {
        error:
          "L'IA a référencé des blocs inexistants. Réessayez ou reformulez.",
      },
      { status: 502 },
    );
  }

  const costCents = computeCostCents(DEFAULT_MODEL.quiz_edit, result.usage);
  const generationId = await logGeneration({
    supabase,
    userId,
    feature: "quiz_edit",
    inputContext: { quizId, instruction, blockCount: blocks?.length ?? 0 },
    result,
    outputQuizId: quizId,
    costCents,
    blocksSnapshot: (blocks ?? []).map((b) => ({
      id: b.id,
      type: b.type,
      content: b.content,
      weight: b.weight,
      order: b.order,
    })),
  });

  return NextResponse.json({
    generationId,
    summary: result.output.summary,
    changes: result.output.changes,
  });
}

// ── APPLY ──────────────────────────────────────────────────────────────
async function apply({
  supabase,
  quizId,
  generationId,
  changes,
}: {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  quizId: string;
  generationId: string;
  changes: AIQuizChange[];
}): Promise<Response> {
  // Re-validate ids server-side (client could have tampered)
  const { data: blocks, error: blocksError } = await supabase
    .from("quiz_blocks")
    .select("id, order")
    .eq("quiz_id", quizId)
    .order("order", { ascending: true });
  if (blocksError) {
    return NextResponse.json({ error: blocksError.message }, { status: 500 });
  }
  const orderById = new Map((blocks ?? []).map((b) => [b.id, b.order]));
  const maxOrder = (blocks ?? []).reduce((m, b) => Math.max(m, b.order), -1);

  // Sequential CRUD. Not atomic — if one step fails we surface the error
  // and stop; any already-applied changes stay. Document this limitation
  // in AI-AGENT-QUIZ-EDIT.md "Open questions".
  let applied = 0;
  let nextOrder = maxOrder + 1;

  for (const change of changes) {
    try {
      if (change.kind === "delete_block") {
        if (!orderById.has(change.block_id)) continue;
        const { error } = await supabase
          .from("quiz_blocks")
          .delete()
          .eq("id", change.block_id)
          .eq("quiz_id", quizId);
        if (error) throw error;
        applied += 1;
      } else if (change.kind === "update_block") {
        if (!orderById.has(change.block_id)) continue;
        const shape = aiBlockToDbShape(change.new_block);
        const { error } = await supabase
          .from("quiz_blocks")
          .update({
            type: shape.type,
            content: shape.content,
            weight: shape.weight,
            model_answer: shape.model_answer ?? null,
            grading_notes: shape.grading_notes ?? null,
          })
          .eq("id", change.block_id)
          .eq("quiz_id", quizId);
        if (error) throw error;
        applied += 1;
      } else {
        // add_block — Stage 1: append at the end. We deliberately ignore
        // after_block_id for now to avoid order-shift complexity. Reordering
        // moves to Stage 2.
        const shape = aiBlockToDbShape(change.block);
        const { error } = await supabase.from("quiz_blocks").insert({
          quiz_id: quizId,
          type: shape.type,
          content: shape.content,
          weight: shape.weight,
          model_answer: shape.model_answer ?? null,
          grading_notes: shape.grading_notes ?? null,
          order: nextOrder,
        });
        if (error) throw error;
        nextOrder += 1;
        applied += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Échec d'application";
      console.error("[ai/edit-quiz] apply failed at change", change, err);
      return NextResponse.json(
        { error: msg, applied, total: changes.length },
        { status: 500 },
      );
    }
  }

  // Mark the generation as instructor-accepted (sticky — first flag wins).
  // No-op if the generation row was already flagged or doesn't exist.
  const { data: gen } = await supabase
    .from("ai_generations")
    .select(
      "id, instructor_accepted, instructor_edited, instructor_rejected",
    )
    .eq("id", generationId)
    .maybeSingle();

  const alreadyResolved =
    gen?.instructor_accepted === true ||
    gen?.instructor_edited === true ||
    gen?.instructor_rejected === true;

  if (gen && !alreadyResolved) {
    await supabase
      .from("ai_generations")
      .update({
        instructor_accepted: true,
        instructor_edited: false,
        instructor_rejected: false,
      })
      .eq("id", gen.id);
  }

  return NextResponse.json({ applied });
}
