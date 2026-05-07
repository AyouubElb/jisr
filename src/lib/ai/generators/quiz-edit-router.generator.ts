import { generateObject, NoObjectGeneratedError } from "ai";
import { getModel, getProvider } from "../client";
import {
  DEFAULT_MODEL,
  MAX_OUTPUT_TOKENS,
  PROMPT_VERSIONS,
  type ModelKey,
} from "../constants";
import { hashPromptInput } from "../hash";
import { cheapRepair } from "../repair";
import { AIGenerationError } from "../types";
import type { AICallResult } from "../types";
import {
  QUIZ_EDIT_ROUTER_SYSTEM_PROMPT,
  buildQuizEditRouterUserPrompt,
  type QuizEditRouterContext,
} from "../prompts/quiz-edit-router";
import {
  quizEditRouterOutputSchema,
  type QuizEditRouterOutput,
} from "../schemas/quiz-edit-router.schema";

export interface RouteQuizEditArgs {
  context: QuizEditRouterContext;
  modelKey?: ModelKey;
}

/**
 * Picks which tool(s) (add / update / delete) handle a user edit instruction.
 * Output is a small enum + arrays — no nested unions, designed to never fail
 * structured output even on weak models.
 */
export const routeQuizEdit = async (
  args: RouteQuizEditArgs,
): Promise<AICallResult<QuizEditRouterOutput>> => {
  const modelKey = args.modelKey ?? DEFAULT_MODEL.quiz_edit;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.quiz_edit;

  const systemPrompt = QUIZ_EDIT_ROUTER_SYSTEM_PROMPT;
  const userPrompt = buildQuizEditRouterUserPrompt(args.context);
  const inputHash = hashPromptInput(
    `router\n${promptVersion}\n${systemPrompt}\n${userPrompt}`,
  );

  const startedAt = Date.now();

  try {
    const { object, usage } = await generateObject({
      model,
      schema: quizEditRouterOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS.quiz_edit,
      experimental_repairText: async ({ text }) => {
        const cheap = cheapRepair(text);
        return cheap !== text ? cheap : null;
      },
    });

    return {
      output: object,
      usage: {
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
        cacheReadTokens: usage.inputTokenDetails?.cacheReadTokens ?? null,
      },
      latencyMs: Date.now() - startedAt,
      model: modelKey,
      provider,
      promptVersion,
      retryCount: 0,
      schemaValid: true,
      inputHash,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const rawText = NoObjectGeneratedError.isInstance(err) ? err.text : undefined;
    throw new AIGenerationError(
      `Quiz edit routing failed: ${message}`,
      "quiz_edit",
      err,
      rawText,
    );
  }
};
