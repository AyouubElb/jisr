import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { runLessonGen } from "@/lib/ai/generators/lesson-gen.generator";
import { judgeAndStoreLessonEval } from "@/lib/ai/generators/lesson-judge.generator";
import { runDeterministicChecks } from "@/lib/ai/lesson-checks";
import { pickPattern } from "@/lib/ai/pedagogy/loader";
import { assertQuota } from "@/lib/ai/quotas";
import { logGeneration } from "@/lib/ai/telemetry";
import { computeCostCents } from "@/lib/ai/cost";
import { DEFAULT_MODEL } from "@/lib/ai/constants";
import { withTimeout, LLM_TIMEOUT_MS } from "@/lib/ai/timeout";
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
  theme?: string;
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
    `[ai/generate-lesson] → request | lesson="${lesson.title}" (${course.level}) | type=${lesson.type} | depth=${input.depth} | exercises=${input.includeExercises} | scope="${input.scope}"`,
  );

  // ── LLM call (one attempt, 45s hard cap) ───────────────────────────
  const result = await withTimeout(
    runLessonGen({
      context: {
        courseTitle: course.title,
        courseLevel: course.level,
        lessonTitle: lesson.title,
        lessonType: lesson.type as "grammar" | "vocabulary" | "resource",
        scope: input.scope,
        depth: input.depth,
        includeExercises: input.includeExercises,
        theme: input.theme,
      },
    }),
    LLM_TIMEOUT_MS,
  );

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
      lessonTitle: lesson.title,
      lessonType: lesson.type,
      courseLevel: course.level,
      scope: input.scope,
      depth: input.depth,
      includeExercises: input.includeExercises,
      theme: input.theme ?? null,
    },
    result,
    costCents,
  });

  // ── Judge (fire-and-forget, mirrors quiz-gen pattern) ─────────────
  // gen → deterministic checks (JS) → LLM judge (soft checks only).
  // Writes ai_generations(feature=lesson_judge) + generation_evaluations.
  // Repair on violations is deferred — log first.
  if (generationId) {
    const pattern = pickPattern({
      style: "documentary",
      level: course.level,
      lessonType: lesson.type as "grammar" | "vocabulary" | "resource",
    });
    const det = runDeterministicChecks({
      html: result.output.new_content,
      level: course.level,
      pattern,
    });
    console.log(
      `[ai/generate-lesson] judge: gen=${generationId} pattern=${pattern.id} det_violations=${det.violations.length}`,
    );
    void judgeAndStoreLessonEval({
      supabase,
      generationId,
      userId,
      pattern,
      context: {
        courseTitle: course.title,
        courseLevel: course.level,
        lessonTitle: lesson.title,
        lessonType: lesson.type as "grammar" | "vocabulary" | "resource",
        lessonHtml: result.output.new_content,
        facts: det.facts,
      },
      deterministicViolations: det.violations,
    }).catch((err) => {
      console.error("[ai/generate-lesson] judge failed (non-blocking):", err);
    });
  }

  return {
    generationId,
    summary: result.output.summary,
    newContent: result.output.new_content,
  };
};
