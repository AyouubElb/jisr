import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { runLessonGen } from "@/lib/ai/generators/lesson-gen.generator";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { DEFAULT_MODEL } from "@/lib/ai/constants";
import type { CEFRLevel } from "@/lib/types";
import type { LessonDepth } from "@/lib/ai/prompts/lesson-generation";
import {
  LessonForbiddenError,
  LessonNotFoundError,
} from "./lesson-edit.service";

export interface ProposeLessonGenInput {
  lessonId: string;
  scope: string;
  depth: LessonDepth;
  includeExercises: boolean;
  includeFrenchSupport: boolean;
  theme?: string;
  extraNotes?: string;
}

export interface ProposeLessonGenResult {
  generationId: string | null;
  summary: string;
  newContent: string;
}

/**
 * Generate a fresh lesson from a structured form. Validates ownership,
 * enforces quotas, runs the LLM, logs telemetry, and returns the new
 * lesson HTML. The instructor reviews + accepts in the editor.
 *
 * Throws:
 * - LessonNotFoundError → route returns 404
 * - LessonForbiddenError → route returns 403
 * - AIQuotaExceededError / AICostBudgetExceededError → route returns 429
 * - AIGenerationError → route returns 502
 */
export const proposeLessonGen = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  input: ProposeLessonGenInput,
): Promise<ProposeLessonGenResult> => {
  // ── Ownership ──────────────────────────────────────────────────────
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select(
      "id, title, type, sections!inner(id, courses!inner(id, instructor_id, title, level))",
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

  // ── Quota ──────────────────────────────────────────────────────────
  await assertQuota(supabase, userId, "lesson_gen");

  const requestStartedAt = Date.now();
  console.log(
    `[ai/generate-lesson] → request | lesson="${lesson.title}" (${course.level}) | type=${lesson.type} | depth=${input.depth} | exercises=${input.includeExercises} | french=${input.includeFrenchSupport} | scope="${input.scope}"`,
  );

  // ── LLM call ───────────────────────────────────────────────────────
  const result = await runLessonGen({
    context: {
      courseTitle: course.title,
      courseLevel: course.level,
      lessonTitle: lesson.title,
      lessonType: lesson.type as "grammar" | "vocabulary" | "resource",
      scope: input.scope,
      depth: input.depth,
      includeExercises: input.includeExercises,
      includeFrenchSupport: input.includeFrenchSupport,
      theme: input.theme,
      extraNotes: input.extraNotes,
    },
  });

  const totalMs = Date.now() - requestStartedAt;
  const tokens = result.usage;
  console.log(
    `[ai/generate-lesson] ← ok | latency=${totalMs}ms (llm=${result.latencyMs}ms) | tokens in=${tokens.inputTokens ?? "?"} out=${tokens.outputTokens ?? "?"} | newContent=${result.output.new_content.length} chars`,
  );

  // ── Telemetry ──────────────────────────────────────────────────────
  const costCents = computeCostCents(DEFAULT_MODEL.lesson_gen, result.usage);
  const generationId = await logGeneration({
    supabase,
    userId,
    feature: "lesson_gen",
    inputContext: {
      lessonId: input.lessonId,
      scope: input.scope,
      depth: input.depth,
      includeExercises: input.includeExercises,
      includeFrenchSupport: input.includeFrenchSupport,
      theme: input.theme ?? null,
    },
    result,
    costCents,
  });

  return {
    generationId,
    summary: result.output.summary,
    newContent: result.output.new_content,
  };
};
