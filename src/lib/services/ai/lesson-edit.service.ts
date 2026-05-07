import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { runLessonEdit } from "@/lib/ai/generators/lesson-edit.generator";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { DEFAULT_MODEL } from "@/lib/ai/constants";
import { buildDiffHtml } from "@/lib/ai/lesson-diff";
import type { CEFRLevel } from "@/lib/types";

// Service-layer errors. Route handlers map these to HTTP status codes.
export class LessonNotFoundError extends Error {
  readonly code = "LESSON_NOT_FOUND";
  constructor() {
    super("Leçon introuvable");
    this.name = "LessonNotFoundError";
  }
}

export class LessonForbiddenError extends Error {
  readonly code = "LESSON_FORBIDDEN";
  constructor() {
    super("Accès refusé");
    this.name = "LessonForbiddenError";
  }
}

export interface ProposeLessonEditInput {
  lessonId: string;
  instruction: string;
  chatHistory?: string;
  /** Client's freshest unsaved content. Falls back to DB if absent. */
  currentContent?: string;
}

export type ProposeLessonEditResult =
  | {
      kind: "reply";
      generationId: string | null;
      summary: string;
    }
  | {
      kind: "edit";
      generationId: string | null;
      summary: string;
      newContent: string;
      diffHtml: string;
    };

/**
 * Propose an AI edit to a lesson. Validates ownership, enforces quotas,
 * runs the LLM, logs telemetry, and returns either a reply or an edit
 * payload (with diff HTML pre-computed).
 *
 * Throws:
 * - LessonNotFoundError → route returns 404
 * - LessonForbiddenError → route returns 403
 * - AIQuotaExceededError / AICostBudgetExceededError → route returns 429
 * - AIGenerationError → route returns 502
 */
export const proposeLessonEdit = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  input: ProposeLessonEditInput,
): Promise<ProposeLessonEditResult> => {
  // ── Ownership: instructor must own the course this lesson belongs to ──
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select(
      "id, title, type, content, sections!inner(id, courses!inner(id, instructor_id, title, level))",
    )
    .eq("id", input.lessonId)
    .single();

  if (lessonError || !lesson) {
    throw new LessonNotFoundError();
  }

  const course = (
    lesson.sections as unknown as {
      courses: {
        id: string;
        instructor_id: string;
        title: string;
        level: CEFRLevel;
      };
    }
  ).courses;

  if (course.instructor_id !== userId) {
    throw new LessonForbiddenError();
  }

  // ── Quota (count + monthly $-budget) ────────────────────────────────
  // Throws AIQuotaExceededError or AICostBudgetExceededError on overage.
  await assertQuota(supabase, userId, "lesson_edit");

  // ── Current content: client's unsaved buffer wins, else DB ─────────
  const currentContent =
    input.currentContent ?? (lesson.content as string | null) ?? "";

  const requestStartedAt = Date.now();
  console.log(
    `[ai/edit-lesson] → request | lesson="${lesson.title}" (${course.level}) | instruction="${input.instruction}" | currentContent=${currentContent.length} chars | history=${(input.chatHistory ?? "").length} chars`,
  );

  // ── LLM call (throws AIGenerationError on failure) ─────────────────
  const result = await runLessonEdit({
    context: {
      courseTitle: course.title,
      courseLevel: course.level,
      lessonTitle: lesson.title,
      lessonType: lesson.type as "grammar" | "vocabulary" | "resource",
      currentContent,
      chatHistory: input.chatHistory ?? "",
      instruction: input.instruction,
    },
  });

  const totalMs = Date.now() - requestStartedAt;
  const tokens = result.usage;
  if (result.output.kind === "reply") {
    console.log(
      `[ai/edit-lesson] ← reply | latency=${totalMs}ms (llm=${result.latencyMs}ms) | tokens in=${tokens.inputTokens ?? "?"} out=${tokens.outputTokens ?? "?"} | summary="${result.output.summary}"`,
    );
  } else {
    console.log(
      `[ai/edit-lesson] ← edit | latency=${totalMs}ms (llm=${result.latencyMs}ms) | tokens in=${tokens.inputTokens ?? "?"} out=${tokens.outputTokens ?? "?"} | newContent=${result.output.new_content.length} chars | summary="${result.output.summary}"`,
    );
  }

  // ── Telemetry ───────────────────────────────────────────────────────
  const costCents = computeCostCents(DEFAULT_MODEL.lesson_edit, result.usage);
  const generationId = await logGeneration({
    supabase,
    userId,
    feature: "lesson_edit",
    inputContext: {
      lessonId: input.lessonId,
      instruction: input.instruction,
      contentLength: currentContent.length,
      replyOnly: result.output.kind === "reply",
    },
    result,
    costCents,
  });

  if (result.output.kind === "reply") {
    return {
      kind: "reply",
      generationId,
      summary: result.output.summary,
    };
  }

  const newContent = result.output.new_content;
  return {
    kind: "edit",
    generationId,
    summary: result.output.summary,
    newContent,
    diffHtml: buildDiffHtml(currentContent, newContent),
  };
};
