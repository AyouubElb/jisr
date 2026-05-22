import { generateObject } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getModel, getProvider } from "../client";
import { cheapRepair } from "../repair";
import { quizJudgeOutputSchema } from "../schemas/quiz-judge.schema";
import {
  QUIZ_JUDGE_SYSTEM_PROMPT,
  buildQuizJudgeUserPrompt,
  type QuizJudgeContext,
} from "../prompts/quiz-judge";
import { MAX_OUTPUT_TOKENS, PROMPT_VERSIONS } from "../constants";
import { hashPromptInput } from "../hash";
import { computeCostCents } from "../cost";
import { logGeneration } from "../telemetry";
import type { Database } from "@/lib/types/database";

// Cross-model judging: generator is Claude, judge is OpenAI.
const JUDGE_MODEL_KEY = "gpt-5.4-mini" as const;
const RUBRIC_KEY = "quiz_gen_v2";

/**
 * Runs the LLM judge on a completed quiz generation and stores the result
 * in generation_evaluations with evaluator_type = "llm_judge".
 *
 * Never throws — caller uses fire-and-forget. All errors are logged only.
 */
export const judgeAndStoreQuizEval = async ({
  supabase,
  generationId,
  userId,
  context,
}: {
  supabase: SupabaseClient<Database>;
  generationId: string;
  userId: string;
  context: QuizJudgeContext;
}): Promise<void> => {
  const model = getModel(JUDGE_MODEL_KEY);
  const provider = getProvider(JUDGE_MODEL_KEY);
  const promptVersion = PROMPT_VERSIONS.quiz_judge;
  const systemPrompt = QUIZ_JUDGE_SYSTEM_PROMPT;
  const userPrompt = buildQuizJudgeUserPrompt(context);
  const inputHash = hashPromptInput(
    `quiz-judge\n${promptVersion}\n${systemPrompt}\n${userPrompt}`,
  );

  const startedAt = Date.now();
  let scores;
  let usage = {
    inputTokens: null as number | null,
    outputTokens: null as number | null,
    cacheReadTokens: null as number | null,
  };
  let latencyMs = 0;
  let schemaValid = false;
  let errorMessage: string | null = null;

  console.log(
    `[quiz-judge] === INPUT === model: ${JUDGE_MODEL_KEY} (${provider}) | prompt: ${promptVersion} | rubric: ${RUBRIC_KEY} | level: ${context.courseLevel} | evaluating gen: ${generationId}`,
  );

  try {
    const result = await generateObject({
      model,
      schema: quizJudgeOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS.quiz_judge,
      experimental_repairText: async ({ text }) => {
        const cheap = cheapRepair(text);
        return cheap !== text ? cheap : null;
      },
    });
    latencyMs = Date.now() - startedAt;
    scores = result.object;
    schemaValid = true;
    usage = {
      inputTokens: result.usage.inputTokens ?? null,
      outputTokens: result.usage.outputTokens ?? null,
      cacheReadTokens: result.usage.inputTokenDetails?.cacheReadTokens ?? null,
    };
    console.log(
      `[quiz-judge] === OUTPUT === model: ${JUDGE_MODEL_KEY} | latency: ${latencyMs}ms | schema_valid: ${schemaValid} | input: ${usage.inputTokens} | output: ${usage.outputTokens} | cache_read: ${usage.cacheReadTokens}`,
    );
    console.log(`[quiz-judge] scores:\n${JSON.stringify(scores, null, 2)}`);
  } catch (err) {
    latencyMs = Date.now() - startedAt;
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[quiz-judge] LLM call failed:", err);
  }

  const costCents = computeCostCents(JUDGE_MODEL_KEY, usage);
  const judgeGenerationId = await logGeneration({
    supabase,
    userId,
    feature: "quiz_judge",
    inputContext: {
      evaluatedGenerationId: generationId,
      rubricKey: RUBRIC_KEY,
      courseLevel: context.courseLevel,
    },
    result: {
      output: scores ?? (null as unknown as never),
      usage,
      latencyMs,
      model: JUDGE_MODEL_KEY,
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
    `[quiz-judge] cost: ${costCents}¢ | telemetry row: ${judgeGenerationId ?? "FAILED"}`,
  );

  if (!scores) return;

  const { notes, observed_blocks, mix_check, ...scoreFields } = scores;
  const cleanScores = Object.fromEntries(
    Object.entries(scoreFields).filter(([, v]) => v !== null),
  );

  // Prefix observed_blocks + mix_check into notes so the admin panel renders
  // them inline. Keeps `scores` purely numeric/boolean for the eval form.
  const composedNotes = [
    `OBSERVED BLOCKS:\n${observed_blocks}`,
    `MIX CHECK:\n${mix_check}`,
    notes ? `NOTES:\n${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const { error } = await supabase.from("generation_evaluations").insert({
    generation_id: generationId,
    evaluator_id: null,
    evaluator_type: "llm_judge",
    rubric_key: RUBRIC_KEY,
    scores: cleanScores,
    notes: composedNotes,
  });

  if (error) {
    console.error("[quiz-judge] failed to store eval:", error.message);
  }
};
