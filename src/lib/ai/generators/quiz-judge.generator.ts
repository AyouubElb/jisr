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

const JUDGE_MODEL_KEY = "claude-haiku-4-5" as const;
const RUBRIC_KEY = "quiz_gen_v2";

/**
 * Runs the LLM judge on a completed quiz generation and stores the result
 * in ai_evaluations with evaluator_type = "llm_judge".
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
      `[quiz-judge] latency: ${latencyMs}ms | input: ${usage.inputTokens} | output: ${usage.outputTokens} | cache_read: ${usage.cacheReadTokens}`,
    );
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

  const { notes, ...scoreFields } = scores;
  const cleanScores = Object.fromEntries(
    Object.entries(scoreFields).filter(([, v]) => v !== null),
  );

  const { error } = await supabase.from("ai_evaluations").insert({
    generation_id: generationId,
    evaluator_id: null,
    evaluator_type: "llm_judge",
    rubric_key: RUBRIC_KEY,
    scores: cleanScores,
    notes,
  });

  if (error) {
    console.error("[quiz-judge] failed to store eval:", error.message);
  }
};
