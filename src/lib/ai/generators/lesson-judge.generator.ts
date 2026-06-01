import { generateObject } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getModel, getProvider } from "../client";
import { cheapRepair } from "../repair";
import { lessonJudgeOutputSchema } from "../schemas/lesson-judge.schema";
import {
  LESSON_JUDGE_SYSTEM_PROMPT,
  buildLessonJudgeUserPrompt,
  type LessonJudgeContext,
} from "../prompts/lesson-judge";
import { DEFAULT_MODEL, MAX_OUTPUT_TOKENS, PROMPT_VERSIONS } from "../constants";
import { hashPromptInput } from "../hash";
import { computeCostCents } from "../cost";
import { logGeneration } from "../telemetry";
import { rubricFor } from "../pedagogy/loader";
import { getLessonRubricKeyForPattern } from "../eval/rubrics";
import type { LessonPattern } from "../pedagogy/styles";
import type { CheckViolation } from "../lesson-checks";
import type { Database } from "@/lib/types/database";

export interface JudgeAndStoreLessonEvalArgs {
  supabase: SupabaseClient<Database>;
  generationId: string;
  userId: string;
  pattern: LessonPattern;
  context: Omit<
    LessonJudgeContext,
    "softChecks" | "patternId" | "patternWhenToUse" | "alreadyFailed"
  >;
  deterministicViolations: CheckViolation[];
}

export interface LessonJudgeRunResult {
  /** All violations (deterministic + LLM). */
  allViolations: CheckViolation[];
  /** Only the violations the LLM judge produced (with evidence quotes). */
  llmViolations: CheckViolation[];
}

/**
 * Run the LLM judge over a generated lesson. The judge sees:
 *  - the lesson HTML
 *  - the pattern's SOFT checks (hard checks are already done in JS)
 *  - pre-computed facts (counts, lengths)
 *  - already-failed deterministic checks (so it doesn't re-report)
 *
 * Stores one generation_evaluations row keyed to the gen's id. Never throws.
 */
export const judgeAndStoreLessonEval = async (
  args: JudgeAndStoreLessonEvalArgs,
): Promise<LessonJudgeRunResult> => {
  const { supabase, generationId, userId, pattern, context, deterministicViolations } = args;

  // The judge only evaluates SOFT checks. Hard checks already ran in JS.
  const fullRubric = rubricFor(pattern);
  const softChecks = [...pattern.styleChecks]
    .concat(fullRubric.filter((c) => !pattern.styleChecks.some((sc) => sc.id === c.id)))
    .filter((c) => c.kind === "soft");

  const modelKey = DEFAULT_MODEL.lesson_judge;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.lesson_judge;
  const rubricKey = getLessonRubricKeyForPattern(pattern.id);

  const systemPrompt = LESSON_JUDGE_SYSTEM_PROMPT;
  const userPrompt = buildLessonJudgeUserPrompt({
    ...context,
    patternId: pattern.id,
    patternWhenToUse: pattern.whenToUse,
    softChecks,
    alreadyFailed: deterministicViolations,
  });
  const inputHash = hashPromptInput(
    `lesson-judge\n${promptVersion}\n${systemPrompt}\n${userPrompt}`,
  );

  console.log(
    `[lesson-judge] === INPUT === model: ${modelKey} (${provider}) | prompt: ${promptVersion} | rubric: ${rubricKey} | pattern: ${pattern.id} | level: ${context.courseLevel} | soft_checks: ${softChecks.length} | det_violations: ${deterministicViolations.length} | evaluating gen: ${generationId}`,
  );

  const startedAt = Date.now();
  let llmViolations: CheckViolation[] = [];
  let usage = {
    inputTokens: null as number | null,
    outputTokens: null as number | null,
    cacheReadTokens: null as number | null,
  };
  let latencyMs = 0;
  let schemaValid = false;
  let errorMessage: string | null = null;

  try {
    const result = await generateObject({
      model,
      schema: lessonJudgeOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS.lesson_judge,
      experimental_repairText: async ({ text }) => {
        const cheap = cheapRepair(text);
        return cheap !== text ? cheap : null;
      },
    });
    latencyMs = Date.now() - startedAt;
    schemaValid = true;
    usage = {
      inputTokens: result.usage.inputTokens ?? null,
      outputTokens: result.usage.outputTokens ?? null,
      cacheReadTokens: result.usage.inputTokenDetails?.cacheReadTokens ?? null,
    };

    // Filter: drop violations the judge invented (check_id not in the soft list)
    // and ones it duplicates from the already-failed list.
    const softIds = new Set(softChecks.map((c) => c.id));
    const detIds = new Set(deterministicViolations.map((v) => v.check_id));
    llmViolations = result.object.violations
      .filter((v) => softIds.has(v.check_id))
      .filter((v) => !detIds.has(v.check_id));

    console.log(
      `[lesson-judge] === OUTPUT === latency: ${latencyMs}ms | tokens in=${usage.inputTokens} out=${usage.outputTokens} | raw violations: ${result.object.violations.length} | accepted: ${llmViolations.length}`,
    );
    if (llmViolations.length) {
      console.log(
        `[lesson-judge] violations:\n${JSON.stringify(llmViolations, null, 2)}`,
      );
    }
  } catch (err) {
    latencyMs = Date.now() - startedAt;
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[lesson-judge] LLM call failed:", err);
  }

  const costCents = computeCostCents(modelKey, usage);
  const judgeGenerationId = await logGeneration({
    supabase,
    userId,
    feature: "lesson_judge",
    inputContext: {
      evaluatedGenerationId: generationId,
      rubricKey,
      courseLevel: context.courseLevel,
      patternId: pattern.id,
      lessonType: context.lessonType,
      deterministicViolationCount: deterministicViolations.length,
    },
    result: {
      output: { violations: llmViolations },
      usage,
      latencyMs,
      model: modelKey,
      provider,
      promptVersion,
      retryCount: 0,
      schemaValid,
      inputHash,
      error: errorMessage,
    },
    costCents,
  });
  console.log(
    `[lesson-judge] cost: ${costCents}¢ | telemetry row: ${judgeGenerationId ?? "FAILED"}`,
  );

  const allViolations: CheckViolation[] = [
    ...deterministicViolations,
    ...llmViolations,
  ];

  // Persist the combined result to generation_evaluations against the lesson
  // generation's id (NOT the judge's own id) — that's what the admin UI shows.
  // Scores map: { check_id → boolean (true = pass) }.
  const allCheckIds = new Set([
    ...fullRubric.map((c) => c.id),
    ...allViolations.map((v) => v.check_id),
  ]);
  const failedSet = new Set(allViolations.map((v) => v.check_id));
  const scores: Record<string, boolean> = {};
  for (const id of allCheckIds) {
    scores[id] = !failedSet.has(id);
  }
  const notes = allViolations.length
    ? allViolations
        .map(
          (v) =>
            `[${v.check_id}] ${v.evidence}\n  → ${v.fix_hint}`,
        )
        .join("\n\n")
    : "All checks passed.";

  const { error } = await supabase.from("generation_evaluations").insert({
    generation_id: generationId,
    evaluator_id: null,
    evaluator_type: "llm_judge",
    rubric_key: rubricKey,
    scores,
    notes,
  });
  if (error) {
    console.error("[lesson-judge] failed to store eval:", error.message);
  }

  return { allViolations, llmViolations };
};
