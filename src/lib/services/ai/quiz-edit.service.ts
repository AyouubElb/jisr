import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { routeQuizEdit } from "@/lib/ai/generators/quiz-edit-router.generator";
import { addQuizBlocks } from "@/lib/ai/generators/quiz-edit-add.generator";
import { updateQuizBlocks } from "@/lib/ai/generators/quiz-edit-update.generator";
import { deleteQuizBlocks } from "@/lib/ai/generators/quiz-edit-delete.generator";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { synthesizeSpeech } from "@/lib/ai/tts/synthesize";
import { TTSError } from "@/lib/ai/tts/types";
import { DEFAULT_MODEL, VOICE_BY_HINT, DEFAULT_VOICE } from "@/lib/ai/constants";
import type { AIQuizChange } from "@/lib/ai/schemas/quiz-edit.schema";
import type { AIQuizBlock } from "@/lib/ai/schemas/quiz-output.schema";
import type { QuizEditRouterStep } from "@/lib/ai/schemas/quiz-edit-router.schema";
import type { AICallResult } from "@/lib/ai/types";
import type { CEFRLevel, QuizBlockInsert } from "@/lib/types";

// ── Service-layer errors ───────────────────────────────────────────────
export class QuizNotFoundError extends Error {
  readonly code = "QUIZ_NOT_FOUND";
  constructor() {
    super("Quiz introuvable");
    this.name = "QuizNotFoundError";
  }
}

export class QuizForbiddenError extends Error {
  readonly code = "QUIZ_FORBIDDEN";
  constructor() {
    super("Accès refusé");
    this.name = "QuizForbiddenError";
  }
}

// Partial failure during apply: route maps cause→status (tts=502, db=500)
// and surfaces { applied, total } so the client can show "X / Y appliqués".
export class QuizApplyError extends Error {
  readonly code = "QUIZ_APPLY_FAILED";
  constructor(
    message: string,
    public readonly applied: number,
    public readonly total: number,
    public readonly cause: "tts" | "db",
  ) {
    super(message);
    this.name = "QuizApplyError";
  }
}

// ── Public input/output shapes ─────────────────────────────────────────
export interface ProposeQuizEditInput {
  quizId: string;
  instruction: string;
  /** Pre-formatted in-session history. Empty/missing = first turn. */
  chatHistory?: string;
}

export interface ProposeQuizEditResult {
  generationId: string | null;
  summary: string;
  changes: AIQuizChange[];
}

export interface ApplyQuizEditInput {
  quizId: string;
  generationId: string;
  changes: AIQuizChange[];
}

export interface ApplyQuizEditResult {
  applied: number;
}

// ───────────────────────────────────────────────────────────────────────
// Ownership: instructor must own the course this quiz belongs to.
// Returns the loaded quiz + course tuple, or throws.
async function loadQuizForInstructor(
  supabase: SupabaseClient<Database>,
  quizId: string,
  userId: string,
): Promise<{
  quiz: { id: string; title: string; description: string | null };
  course: {
    id: string;
    instructor_id: string;
    title: string;
    level: CEFRLevel;
  };
}> {
  const { data, error } = await supabase
    .from("quizzes")
    .select(
      "id, title, description, sections!inner(id, courses!inner(id, instructor_id, title, level))",
    )
    .eq("id", quizId)
    .single();

  if (error || !data) throw new QuizNotFoundError();

  const course = (
    data.sections as unknown as {
      courses: {
        id: string;
        instructor_id: string;
        title: string;
        level: CEFRLevel;
      };
    }
  ).courses;

  if (course.instructor_id !== userId) throw new QuizForbiddenError();

  return {
    quiz: { id: data.id, title: data.title, description: data.description },
    course,
  };
}

// ── PROPOSE ────────────────────────────────────────────────────────────
//
// Orchestration: router LLM picks tool(s) → run each tool in parallel →
// merge results into a single change list. Each LLM call uses a flat or
// single-union schema (no nested discriminated unions), which is the only
// shape Gemini's structured-output translator handles reliably.
export const proposeQuizEdit = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  input: ProposeQuizEditInput,
): Promise<ProposeQuizEditResult> => {
  const { quiz, course } = await loadQuizForInstructor(
    supabase,
    input.quizId,
    userId,
  );

  // Quota — one charge per propose, regardless of how many sub-tools run.
  await assertQuota(supabase, userId, "quiz_edit");

  const chatHistory = input.chatHistory ?? "";

  // Snapshot current blocks → fed to router AND logged for eval context.
  const { data: blocks, error: blocksError } = await supabase
    .from("quiz_blocks")
    .select("id, type, content, weight, order")
    .eq("quiz_id", input.quizId)
    .order("order", { ascending: true });
  if (blocksError) throw new Error(blocksError.message);

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

  // ── Step 1: router (throws AIGenerationError on failure) ───────────
  const routerResult = await routeQuizEdit({
    context: {
      courseTitle: course.title,
      courseLevel: course.level,
      quizTitle: quiz.title,
      quizDescription: quiz.description,
      instruction: input.instruction,
      chatHistory,
      blocks: allBlocks.map((b) => ({
        id: b.id,
        type: b.type,
        order: b.order,
        content: b.content as Record<string, unknown> | null,
      })),
    },
  });

  // Filter steps to those whose target ids are valid (drop hallucinations).
  const steps: QuizEditRouterStep[] = routerResult.output.steps
    .map((s) => ({
      ...s,
      target_block_ids: s.target_block_ids.filter((id) => validIds.has(id)),
    }))
    .filter((s) => s.tool === "add" || s.target_block_ids.length > 0);

  // Empty steps = router chose to reply conversationally. Return summary
  // as a text-only response (no DB-affecting changes).
  if (steps.length === 0) {
    const generationId = await logGeneration({
      supabase,
      userId,
      feature: "quiz_edit",
      inputContext: {
        quizId: input.quizId,
        instruction: input.instruction,
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
      outputQuizId: input.quizId,
      costCents: computeCostCents(DEFAULT_MODEL.quiz_edit, routerResult.usage),
    });
    return {
      generationId,
      summary: routerResult.output.summary,
      changes: [],
    };
  }

  // ── Step 2: run tools in parallel (any throw bubbles up) ───────────
  type ToolResultUnknown = AICallResult<unknown>;
  const toolPromises: Promise<{
    step: QuizEditRouterStep;
    changes: AIQuizChange[];
    result: ToolResultUnknown;
  }>[] = steps.map(async (step) => {
    if (step.tool === "add") {
      const out = await addQuizBlocks({
        context: {
          courseTitle: course.title,
          courseLevel: course.level,
          quizTitle: quiz.title,
          quizDescription: quiz.description,
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
      const changes: AIQuizChange[] = out.output.blocks
        .slice(0, len)
        .map((block, i) => ({
          kind: "add_block" as const,
          after_block_id: null,
          block,
          reason: out.output.reasons[i] ?? "Bloc ajouté.",
        }));
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
          courseTitle: course.title,
          courseLevel: course.level,
          quizTitle: quiz.title,
          quizDescription: quiz.description,
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
        courseTitle: course.title,
        courseLevel: course.level,
        quizTitle: quiz.title,
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

  const toolResults = await Promise.all(toolPromises);
  const mergedChanges: AIQuizChange[] = toolResults.flatMap((t) => t.changes);

  // ── Step 3: telemetry — sum usage + cost across router + tools ─────
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
      quizId: input.quizId,
      instruction: input.instruction,
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
    outputQuizId: input.quizId,
    costCents,
    blocksSnapshot: allBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      content: b.content,
      weight: b.weight,
      order: b.order,
    })),
  });

  return {
    generationId,
    summary: routerResult.output.summary,
    changes: mergedChanges,
  };
};

// ── APPLY ──────────────────────────────────────────────────────────────
// Sequential CRUD. Not atomic — if one step fails we surface the error
// (with applied count) and stop; any already-applied changes stay.
// Documented in AI-AGENT-QUIZ-EDIT.md "Open questions".
export const applyQuizEdit = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  input: ApplyQuizEditInput,
): Promise<ApplyQuizEditResult> => {
  await loadQuizForInstructor(supabase, input.quizId, userId);

  // Re-validate ids server-side (client could have tampered).
  const { data: blocks, error: blocksError } = await supabase
    .from("quiz_blocks")
    .select("id, type, order, content")
    .eq("quiz_id", input.quizId)
    .order("order", { ascending: true });
  if (blocksError) throw new Error(blocksError.message);

  const orderById = new Map((blocks ?? []).map((b) => [b.id, b.order]));
  const typeById = new Map((blocks ?? []).map((b) => [b.id, b.type]));
  let maxOrder = (blocks ?? []).reduce((m, b) => Math.max(m, b.order), -1);

  // For each parent passage/audio, the highest `order` of any block already
  // linked to it. Used to slot a newly added child right after the parent's
  // existing children instead of dumping it at the bottom of the quiz.
  const lastChildOrderByParent = new Map<string, number>();
  for (const b of blocks ?? []) {
    const c = (b.content ?? {}) as Record<string, unknown>;
    const parentId =
      typeof c.passage_block_id === "string"
        ? c.passage_block_id
        : typeof c.audio_block_id === "string"
          ? c.audio_block_id
          : null;
    if (parentId) {
      const prev = lastChildOrderByParent.get(parentId) ?? -1;
      if (b.order > prev) lastChildOrderByParent.set(parentId, b.order);
    }
  }

  // Resolve an LLM-supplied links_to_block_id into the DB column it maps to.
  // Returns the field-name + parent-id, or null if the id is missing /
  // unknown / points at a block that isn't a passage or audio.
  const resolveLink = (
    id: string | undefined,
  ): { field: "passage_block_id" | "audio_block_id"; parentId: string } | null => {
    if (!id) return null;
    const t = typeById.get(id);
    if (t === "text") return { field: "passage_block_id", parentId: id };
    if (t === "audio") return { field: "audio_block_id", parentId: id };
    return null;
  };

  // Shift every block at or after `fromOrder` down by 1 to make room for an
  // insert at that order. Sequential UPDATEs from the highest order down so
  // we never collide with a UNIQUE(quiz_id, order) constraint mid-shift.
  // PostgREST treats `order` as the URL sort keyword, so combining
  // .gte("order", ...) + .order("order", ...) builds a malformed query.
  // We already have all blocks in memory via `orderById` — filter + sort
  // client-side and only UPDATE the rows that need it.
  const shiftOrdersDown = async (fromOrder: number): Promise<void> => {
    const toShift = Array.from(orderById.entries())
      .filter(([, ord]) => ord >= fromOrder)
      .sort((a, b) => b[1] - a[1]);
    for (const [id, ord] of toShift) {
      const { error: updErr } = await supabase
        .from("quiz_blocks")
        .update({ order: ord + 1 })
        .eq("id", id);
      if (updErr) throw updErr;
    }
  };

  let applied = 0;
  let nextOrder = maxOrder + 1;
  const total = input.changes.length;

  for (const change of input.changes) {
    try {
      if (change.kind === "delete_block") {
        if (!orderById.has(change.block_id)) continue;
        const { error } = await supabase
          .from("quiz_blocks")
          .delete()
          .eq("id", change.block_id)
          .eq("quiz_id", input.quizId);
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
          .eq("quiz_id", input.quizId);
        if (error) throw error;
        applied += 1;
      } else {
        // add_block — Stage 1: append at the end. We deliberately ignore
        // after_block_id for now to avoid order-shift complexity.

        // audio_passage expands to 1 audio parent + N child mcqs (linked
        // via audio_block_id). TTS runs at apply-time so cost is only
        // paid when the instructor accepts the change.
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
            throw new QuizApplyError(msg, applied, total, "tts");
          }

          const audioOrder = nextOrder;
          const { data: parentRow, error: parentErr } = await supabase
            .from("quiz_blocks")
            .insert({
              quiz_id: input.quizId,
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
          if (parentErr || !parentRow)
            throw parentErr ?? new Error("Audio insert failed");

          const questions = b.questions ?? [];
          const childInserts = questions.map((q, qIdx) =>
            q.type === "fill_blank"
              ? {
                  quiz_id: input.quizId,
                  type: "fill_blank" as const,
                  content: {
                    sentence: q.sentence,
                    options: toUiOptions(q.options, q.correct_index),
                    audio_block_id: parentRow.id,
                  },
                  weight: 1,
                  grading_notes: q.explanation ?? null,
                  order: audioOrder + 1 + qIdx,
                }
              : {
                  quiz_id: input.quizId,
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
                },
          );
          if (childInserts.length > 0) {
            const { error: childErr } = await supabase
              .from("quiz_blocks")
              .insert(childInserts);
            if (childErr) throw childErr;
          }

          nextOrder = audioOrder + 1 + questions.length;
          maxOrder = nextOrder - 1;
          // Register the new audio parent + any children in the local maps so
          // a later linked-add in the same batch can target this audio.
          orderById.set(parentRow.id, audioOrder);
          typeById.set(parentRow.id, "audio");
          if (questions.length > 0) {
            lastChildOrderByParent.set(
              parentRow.id,
              audioOrder + questions.length,
            );
          }
          applied += 1;
          continue;
        }

        const shape = aiBlockToDbShape(change.block);
        // Resolve link to existing passage / audio so the new mcq / fill_blank
        // stays grouped under its parent.
        let content = shape.content;
        let link: ReturnType<typeof resolveLink> = null;
        if (change.block.type === "mcq" || change.block.type === "fill_blank") {
          link = resolveLink(change.block.links_to_block_id);
          if (link) {
            content = { ...content, [link.field]: link.parentId };
          }
        }

        // Linked → slot right after the parent's last existing child, then
        // shift everything after that position down by one. Unlinked → keep
        // the legacy append behavior.
        let insertOrder: number;
        if (link) {
          const parentOrder = orderById.get(link.parentId) ?? 0;
          const lastChildOrder = lastChildOrderByParent.get(link.parentId);
          insertOrder =
            (lastChildOrder !== undefined ? lastChildOrder : parentOrder) + 1;
          if (insertOrder <= maxOrder) {
            await shiftOrdersDown(insertOrder);
            // Reflect the shift in the in-memory map so later iterations
            // computing positions see the updated state.
            for (const [id, ord] of orderById.entries()) {
              if (ord >= insertOrder) orderById.set(id, ord + 1);
            }
            for (const [pid, ord] of lastChildOrderByParent.entries()) {
              if (ord >= insertOrder) lastChildOrderByParent.set(pid, ord + 1);
            }
            maxOrder += 1;
            nextOrder += 1;
          }
          lastChildOrderByParent.set(link.parentId, insertOrder);
        } else {
          insertOrder = nextOrder;
          nextOrder += 1;
        }

        const { data: insertedRow, error } = await supabase
          .from("quiz_blocks")
          .insert({
            quiz_id: input.quizId,
            type: shape.type,
            content,
            weight: shape.weight,
            model_answer: shape.model_answer ?? null,
            grading_notes: shape.grading_notes ?? null,
            order: insertOrder,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (insertedRow) {
          orderById.set(insertedRow.id, insertOrder);
          typeById.set(insertedRow.id, shape.type);
        }
        if (insertOrder > maxOrder) maxOrder = insertOrder;
        applied += 1;
      }
    } catch (err) {
      // QuizApplyError already carries applied/total/cause — let it through.
      if (err instanceof QuizApplyError) throw err;
      const msg = err instanceof Error ? err.message : "Échec d'application";
      console.error("[ai/edit-quiz] apply failed at change", change, err);
      throw new QuizApplyError(msg, applied, total, "db");
    }
  }

  // Mark the generation as instructor-accepted (sticky — first flag wins).
  // No-op if the generation row was already flagged or doesn't exist.
  const { data: gen } = await supabase
    .from("ai_generations")
    .select("id, instructor_accepted, instructor_edited, instructor_rejected")
    .eq("id", input.generationId)
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

  return { applied };
};

// ── Helpers (private to this service) ──────────────────────────────────

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

// Flat AI block → rich UI/DB shape. Duplicated from generate-quiz route;
// will fold into a shared mapper at agent #3 — see AI-AGENTS.md.
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
      content: { prompt: b.question, max_seconds: b.max_seconds },
      weight: 1,
      model_answer: b.model_answer,
      grading_notes: b.rubric,
    };
  }
  if (b.type === "text_passage") {
    // LLM emits {passage, caption}; the editor/viewer reads {html}.
    return { type: "text", content: { html: b.passage }, weight: null };
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

// Compact one-line preview of a block's content blob, for prompts that
// only need to recognise/route blocks without seeing the full JSON.
function previewContent(content: unknown, type?: string): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  if (type === "text" && typeof c.html === "string") {
    return stripHtml(c.html).slice(0, 1500);
  }
  if (type === "section" && typeof c.title === "string") return c.title;
  // Prefix the parent link so it survives the 200-char truncation below.
  const linkedTo =
    typeof c.passage_block_id === "string"
      ? c.passage_block_id
      : typeof c.audio_block_id === "string"
        ? c.audio_block_id
        : null;
  const json = JSON.stringify(content).slice(0, 200);
  return linkedTo ? `linked_to=${linkedTo} ${json}` : json;
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
 * Convert a DB-shape block content blob to the LLM-flat shape, so the
 * update tool sees the SAME field names it must emit. Reverse of
 * aiBlockToDbShape (which maps LLM-flat → DB on the way in).
 *
 * Best-effort: keep going on missing/oddly shaped fields rather than
 * throwing. If the block type isn't recognised, return raw content.
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
      ...(typeof c.explanation === "string"
        ? { explanation: c.explanation }
        : {}),
    };
  }
  if (type === "fill_blank") {
    const { options, correct_index } = flatOptions();
    return {
      type: "fill_blank",
      sentence: typeof c.sentence === "string" ? c.sentence : "",
      options,
      correct_index,
      ...(typeof c.explanation === "string"
        ? { explanation: c.explanation }
        : {}),
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
      ...(typeof c.max_seconds === "number"
        ? { max_seconds: c.max_seconds }
        : {}),
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
      ...(typeof c.description === "string"
        ? { description: c.description }
        : {}),
    };
  }
  return content;
}
