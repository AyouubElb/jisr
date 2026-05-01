import { generateObject, NoObjectGeneratedError } from "ai";
import { getModel, getProvider } from "../client";
import { DEFAULT_MODEL, PROMPT_VERSIONS, type ModelKey } from "../constants";
import { hashPromptInput } from "../hash";
import { cheapRepair } from "../repair";
import { AIGenerationError } from "../types";
import type { AICallResult } from "../types";
import {
  QUIZ_EDIT_DELETE_SYSTEM_PROMPT,
  buildQuizEditDeleteUserPrompt,
  type QuizEditDeleteContext,
} from "../prompts/quiz-edit-delete";
import {
  aiQuizEditDeleteOutputSchema,
  type AIQuizEditDeleteOutput,
} from "../schemas/quiz-edit-delete.schema";

export interface DeleteQuizBlocksArgs {
  context: QuizEditDeleteContext;
  modelKey?: ModelKey;
}

export const deleteQuizBlocks = async (
  args: DeleteQuizBlocksArgs,
): Promise<AICallResult<AIQuizEditDeleteOutput>> => {
  const modelKey = args.modelKey ?? DEFAULT_MODEL.quiz_edit;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.quiz_edit;

  const systemPrompt = QUIZ_EDIT_DELETE_SYSTEM_PROMPT;
  const userPrompt = buildQuizEditDeleteUserPrompt(args.context);
  const inputHash = hashPromptInput(
    `delete\n${promptVersion}\n${systemPrompt}\n${userPrompt}`,
  );

  const startedAt = Date.now();

  try {
    const { object, usage } = await generateObject({
      model,
      schema: aiQuizEditDeleteOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
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
      `Quiz edit (delete) failed: ${message}`,
      "quiz_edit",
      err,
      rawText,
    );
  }
};
