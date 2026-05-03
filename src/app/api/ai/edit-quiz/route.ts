import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { routeQuizEdit } from "@/lib/ai/generators/quiz-edit-router.generator";
import { addQuizBlocks } from "@/lib/ai/generators/quiz-edit-add.generator";
import { updateQuizBlocks } from "@/lib/ai/generators/quiz-edit-update.generator";
import { deleteQuizBlocks } from "@/lib/ai/generators/quiz-edit-delete.generator";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { AIQuotaExceededError, AIGenerationError } from "@/lib/ai/types";
import { synthesizeSpeech } from "@/lib/ai/tts/synthesize";
import { TTSError } from "@/lib/ai/tts/types";
import { DEFAULT_MODEL } from "@/lib/ai/constants";
import {
  aiQuizChangeWireSchema,
  type AIQuizChange,
} from "@/lib/ai/schemas/quiz-edit.schema";
import type { AIQuizBlock } from "@/lib/ai/schemas/quiz-output.schema";
import type { QuizEditRouterStep } from "@/lib/ai/schemas/quiz-edit-router.schema";
import type { AICallResult } from "@/lib/ai/types";
import type { QuizBlockInsert } from "@/lib/types";

// ── Body schemas ───────────────────────────────────────────────────────
const ProposeBody = z.object({
  action: z.literal("propose"),
  quizId: z.uuid(),
  instruction: z.string().min(3).max(1000),
  // Pre-formatted in-session history. Empty/missing = first turn.
  chatHistory: z.string().max(4000).optional(),
});

const ApplyBody = z.object({
  action: z.literal("apply"),
  quizId: z.uuid(),
  generationId: z.uuid(),
  // Already filtered client-side to the changes the instructor accepted.
  // Wire schema uses a discriminated union (no LLM involved here).
  changes: z.array(aiQuizChangeWireSchema).min(1),
});

const Body = z.discriminatedUnion("action", [ProposeBody, ApplyBody]);

// Voice hint → OpenAI TTS voice. Mirrors VOICE_BY_HINT in generate-quiz/route.
const VOICE_BY_HINT: Record<string, { voiceId: string; speed: number }> = {
  neutral_female: { voiceId: "nova", speed: 1.0 },
  neutral_male: { voiceId: "onyx", speed: 1.0 },
  slow_clear: { voiceId: "nova", speed: 0.85 },
};
const DEFAULT_VOICE = VOICE_BY_HINT.neutral_female;

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
    // LLM emits {passage, caption}; the editor/viewer reads {html}.
    return {
      type: "text",
      content: { html: b.passage },
      weight: null,
    };
  }
  if (b.type === "section") {
    return {
      type: "section",
      content: { title: b.title, description: b.description },
      weight: null,
    };
  }
  // audio_passage — emitting one from the editor would require a TTS
  // pipeline call here. Out of Stage 1 scope; reject upstream.
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
      chatHistory: body.chatHistory ?? "",
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
//
// Orchestration: router LLM picks tool(s) → run each tool in parallel →
// merge results into a single change list. Each LLM call uses a flat or
// single-union schema (no nested discriminated unions), which is the only
// shape Gemini's structured-output translator handles reliably.
async function propose({
  supabase,
  userId,
  quizId,
  quizTitle,
  quizDescription,
  courseTitle,
  courseLevel,
  instruction,
  chatHistory,
}: {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  userId: string;
  quizId: string;
  quizTitle: string;
  quizDescription: string | null;
  courseTitle: string;
  courseLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  instruction: string;
  chatHistory: string;
}): Promise<Response> {
  // Quota — one charge per propose, regardless of how many sub-tools run.
  try {
    await assertQuota(supabase, userId, "quiz_edit");
  } catch (err) {
    if (err instanceof AIQuotaExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  // Snapshot current blocks → fed to router AND logged for eval context.
  const { data: blocks, error: blocksError } = await supabase
    .from("quiz_blocks")
    .select("id, type, content, weight, order")
    .eq("quiz_id", quizId)
    .order("order", { ascending: true });
  if (blocksError) {
    return NextResponse.json({ error: blocksError.message }, { status: 500 });
  }

  const allBlocks = blocks ?? [];
  const validIds = new Set(allBlocks.map((b) => b.id));
  const blockById = new Map(
    allBlocks.map((b) => [
      b.id,
      {
        id: b.id,
        type: b.type,
        order: b.order,
        content: b.content as Record<string, unknown> | null,
      },
    ]),
  );

  // ── Step 1: router ─────────────────────────────────────────────────
  let routerResult;
  try {
    routerResult = await routeQuizEdit({
      context: {
        courseTitle,
        courseLevel,
        quizTitle,
        quizDescription,
        instruction,
        chatHistory,
        blocks: allBlocks.map((b) => ({
          id: b.id,
          type: b.type,
          order: b.order,
          content: b.content as Record<string, unknown> | null,
        })),
      },
    });
  } catch (err) {
    const message =
      err instanceof AIGenerationError
        ? err.message
        : "Le routeur IA a échoué, réessayez";
    const rawText =
      err instanceof AIGenerationError ? err.rawText : undefined;
    console.error("[ai/edit-quiz] router failed:", message);
    return NextResponse.json(
      { error: message, rawText: rawText ?? null },
      { status: 502 },
    );
  }

  // Filter steps to those whose target ids are valid (drop hallucinations).
  const steps: QuizEditRouterStep[] = routerResult.output.steps
    .map((s) => ({
      ...s,
      target_block_ids: s.target_block_ids.filter((id) => validIds.has(id)),
    }))
    .filter(
      (s) => s.tool === "add" || s.target_block_ids.length > 0,
    );

  // Empty steps = router chose to reply conversationally (greeting, info,
  // suggestion, clarification). Return summary as a text-only response.
  if (steps.length === 0) {
    const generationId = await logGeneration({
      supabase,
      userId,
      feature: "quiz_edit",
      inputContext: {
        quizId,
        instruction,
        blockCount: allBlocks.length,
        replyOnly: true,
      },
      result: {
        output: { summary: routerResult.output.summary, changes: [] },
        usage: routerResult.usage,
        latencyMs: routerResult.latencyMs,
        model: routerResult.model,
        provider: routerResult.provider,
        promptVersion: routerResult.promptVersion,
        retryCount: routerResult.retryCount,
        schemaValid: true,
        inputHash: routerResult.inputHash,
        error: null,
      },
      outputQuizId: quizId,
      costCents: computeCostCents(DEFAULT_MODEL.quiz_edit, routerResult.usage),
    });
    return NextResponse.json({
      generationId,
      summary: routerResult.output.summary,
      changes: [],
    });
  }

  // ── Step 2: run tools in parallel ──────────────────────────────────
  type ToolResultUnknown = AICallResult<unknown>;
  const toolPromises: Promise<{
    step: QuizEditRouterStep;
    changes: AIQuizChange[];
    result: ToolResultUnknown;
  }>[] = steps.map(async (step) => {
    if (step.tool === "add") {
      const out = await addQuizBlocks({
        context: {
          courseTitle,
          courseLevel,
          quizTitle,
          quizDescription,
          existingBlocks: allBlocks.map((b) => ({
            id: b.id,
            type: b.type,
            order: b.order,
            contentPreview: previewContent(b.content, b.type),
          })),
          subInstruction: step.sub_instruction,
        },
      });
      const len = Math.min(
        out.output.blocks.length,
        out.output.reasons.length,
      );
      // Stage 1: always append at the end (apply path ignores after_block_id
      // anyway). Reordering is a Stage 2 concern.
      const changes: AIQuizChange[] = out.output.blocks.slice(0, len).map(
        (block, i) => ({
          kind: "add_block" as const,
          after_block_id: null,
          block,
          reason: out.output.reasons[i] ?? "Bloc ajouté.",
        }),
      );
      return { step, changes, result: out };
    }

    if (step.tool === "update") {
      // Transform DB shape → LLM-flat shape so the model sees the SAME shape
      // it must emit. Otherwise it tends to mirror the DB field names back.
      const blocksToUpdate = step.target_block_ids
        .map((id) => blockById.get(id))
        .filter((b): b is NonNullable<typeof b> => b !== undefined)
        .map((b) => ({
          id: b.id,
          type: b.type,
          order: b.order,
          content: dbContentToFlatShape(b.type, b.content),
        }));
      const out = await updateQuizBlocks({
        context: {
          courseTitle,
          courseLevel,
          quizTitle,
          quizDescription,
          blocksToUpdate,
          subInstruction: step.sub_instruction,
        },
      });
      const changes: AIQuizChange[] = out.output.updates
        .filter((u) => validIds.has(u.block_id))
        .map((u) => ({
          kind: "update_block" as const,
          block_id: u.block_id,
          new_block: u.new_block,
          reason: u.reason,
        }));
      return { step, changes, result: out };
    }

    // delete
    const candidateBlocks = step.target_block_ids
      .map((id) => blockById.get(id))
      .filter((b): b is NonNullable<typeof b> => b !== undefined)
      .map((b) => ({
        id: b.id,
        type: b.type,
        order: b.order,
        contentPreview: previewContent(b.content, b.type),
      }));
    const out = await deleteQuizBlocks({
      context: {
        courseTitle,
        courseLevel,
        quizTitle,
        candidateBlocks,
        subInstruction: step.sub_instruction,
      },
    });
    const changes: AIQuizChange[] = out.output.deletions
      .filter((d) => validIds.has(d.block_id))
      .map((d) => ({
        kind: "delete_block" as const,
        block_id: d.block_id,
        reason: d.reason,
      }));
    return { step, changes, result: out };
  });

  let toolResults: Awaited<(typeof toolPromises)[number]>[];
  try {
    toolResults = await Promise.all(toolPromises);
  } catch (err) {
    const message =
      err instanceof AIGenerationError
        ? err.message
        : "Un outil IA a échoué, réessayez";
    const rawText =
      err instanceof AIGenerationError ? err.rawText : undefined;
    console.error("[ai/edit-quiz] tool failed:", message);
    return NextResponse.json(
      { error: message, rawText: rawText ?? null },
      { status: 502 },
    );
  }

  const mergedChanges: AIQuizChange[] = toolResults.flatMap(
    (t) => t.changes,
  );

  // ── Step 3: telemetry — sum usage + cost across router + tools ──────
  const allCalls: AICallResult<unknown>[] = [
    routerResult,
    ...toolResults.map((t) => t.result),
  ];
  const totalUsage = {
    inputTokens: sumNullable(allCalls.map((c) => c.usage.inputTokens)),
    outputTokens: sumNullable(allCalls.map((c) => c.usage.outputTokens)),
    cacheReadTokens: sumNullable(
      allCalls.map((c) => c.usage.cacheReadTokens),
    ),
  };
  const totalLatency = allCalls.reduce((s, c) => s + c.latencyMs, 0);
  const costCents = computeCostCents(DEFAULT_MODEL.quiz_edit, totalUsage);

  const generationId = await logGeneration({
    supabase,
    userId,
    feature: "quiz_edit",
    inputContext: {
      quizId,
      instruction,
      blockCount: allBlocks.length,
      routerSteps: steps.map((s) => ({
        tool: s.tool,
        target_block_ids: s.target_block_ids,
        sub_instruction: s.sub_instruction,
      })),
    },
    result: {
      output: {
        summary: routerResult.output.summary,
        changes: mergedChanges,
      },
      usage: totalUsage,
      latencyMs: totalLatency,
      model: routerResult.model,
      provider: routerResult.provider,
      promptVersion: routerResult.promptVersion,
      retryCount: allCalls.reduce((s, c) => s + c.retryCount, 0),
      schemaValid: true,
      inputHash: routerResult.inputHash,
      error: null,
    },
    outputQuizId: quizId,
    costCents,
    blocksSnapshot: allBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      content: b.content,
      weight: b.weight,
      order: b.order,
    })),
  });

  return NextResponse.json({
    generationId,
    summary: routerResult.output.summary,
    changes: mergedChanges,
  });
}

// Compact one-line preview of a block's content blob, for prompts that only
// need to recognise/route blocks without seeing the full JSON.
function previewContent(content: unknown, type?: string): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  // Send full stripped text for passages so the model can ground MCQs on it.
  if (type === "text" && typeof c.html === "string") {
    return stripHtml(c.html).slice(0, 1500);
  }
  if (type === "section" && typeof c.title === "string") {
    return c.title;
  }
  return JSON.stringify(content).slice(0, 200);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function sumNullable(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => typeof v === "number");
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0);
}

/**
 * Convert a DB-shape block content blob to the LLM-flat shape, so the update
 * tool sees the SAME field names it must emit. Reverse of `aiBlockToDbShape`
 * (which maps LLM-flat → DB on the way in).
 *
 * Best-effort: we keep going on missing/oddly shaped fields rather than
 * throwing. If the block type isn't recognised, we return the raw content.
 */
function dbContentToFlatShape(
  type: string,
  content: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!content) return null;
  const c = content as Record<string, unknown>;

  const flatOptions = (): { options: string[]; correct_index: number } => {
    const raw = Array.isArray(c.options) ? c.options : [];
    const labels: string[] = [];
    let correctIndex = 0;
    raw.forEach((opt, i) => {
      if (opt && typeof opt === "object") {
        const o = opt as { label?: unknown; is_correct?: unknown };
        if (typeof o.label === "string") labels.push(o.label);
        else labels.push(String(o.label ?? ""));
        if (o.is_correct === true) correctIndex = i;
      } else if (typeof opt === "string") {
        labels.push(opt);
      }
    });
    return { options: labels, correct_index: correctIndex };
  };

  if (type === "mcq") {
    const { options, correct_index } = flatOptions();
    return {
      type: "mcq",
      question: typeof c.prompt === "string" ? c.prompt : "",
      options,
      correct_index,
      ...(typeof c.explanation === "string" ? { explanation: c.explanation } : {}),
    };
  }
  if (type === "fill_blank") {
    const { options, correct_index } = flatOptions();
    return {
      type: "fill_blank",
      sentence: typeof c.sentence === "string" ? c.sentence : "",
      options,
      correct_index,
      ...(typeof c.explanation === "string" ? { explanation: c.explanation } : {}),
    };
  }
  if (type === "free_text") {
    return {
      type: "free_text",
      question: typeof c.prompt === "string" ? c.prompt : "",
      rubric: typeof c.rubric === "string" ? c.rubric : "",
      model_answer: typeof c.model_answer === "string" ? c.model_answer : "",
      ...(typeof c.min_words === "number" ? { min_words: c.min_words } : {}),
      ...(typeof c.max_words === "number" ? { max_words: c.max_words } : {}),
    };
  }
  if (type === "voice") {
    return {
      type: "voice_response",
      question: typeof c.prompt === "string" ? c.prompt : "",
      rubric: typeof c.rubric === "string" ? c.rubric : "",
      model_answer: typeof c.model_answer === "string" ? c.model_answer : "",
      ...(typeof c.max_seconds === "number" ? { max_seconds: c.max_seconds } : {}),
    };
  }
  if (type === "text") {
    return {
      type: "text_passage",
      passage: typeof c.html === "string" ? c.html : "",
    };
  }
  if (type === "section") {
    return {
      type: "section",
      title: typeof c.title === "string" ? c.title : "",
      ...(typeof c.description === "string" ? { description: c.description } : {}),
    };
  }
  return content;
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

        // audio_passage expands to 1 audio parent + N child mcqs (linked via
        // audio_block_id). TTS runs at apply-time so cost is only paid when
        // the instructor accepts the change.
        if (change.block.type === "audio_passage") {
          const b = change.block;
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
            const msg =
              err instanceof TTSError
                ? `Synthèse audio échouée : ${err.message}`
                : "Synthèse audio échouée";
            console.error("[ai/edit-quiz] TTS failed:", err);
            return NextResponse.json(
              { error: msg, applied, total: changes.length },
              { status: 502 },
            );
          }

          const audioOrder = nextOrder;
          const { data: parentRow, error: parentErr } = await supabase
            .from("quiz_blocks")
            .insert({
              quiz_id: quizId,
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
              weight: null,
              order: audioOrder,
            })
            .select("id")
            .single();
          if (parentErr || !parentRow) throw parentErr ?? new Error("Audio insert failed");

          const questions = b.questions ?? [];
          const childInserts = questions.map((q, qIdx) => ({
            quiz_id: quizId,
            type: "mcq" as const,
            content: {
              prompt: q.question,
              allow_multiple: false,
              options: toUiOptions(q.options, q.correct_index),
              audio_block_id: parentRow.id,
            },
            weight: 1,
            grading_notes: q.explanation ?? null,
            order: audioOrder + 1 + qIdx,
          }));
          if (childInserts.length > 0) {
            const { error: childErr } = await supabase
              .from("quiz_blocks")
              .insert(childInserts);
            if (childErr) throw childErr;
          }

          nextOrder = audioOrder + 1 + questions.length;
          applied += 1;
          continue;
        }

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
