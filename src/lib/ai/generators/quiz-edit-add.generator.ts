import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { getModel, getProvider } from "../client";
import { DEFAULT_MODEL, PROMPT_VERSIONS, type ModelKey } from "../constants";
import { hashPromptInput } from "../hash";
import { cheapRepair } from "../repair";
import { AIGenerationError } from "../types";
import type { AICallResult } from "../types";
import {
  QUIZ_EDIT_ADD_SYSTEM_PROMPT,
  QUIZ_EDIT_ADD_RUBRIC_PROMPT,
  buildQuizEditAddUserPrompt,
  type QuizEditAddContext,
} from "../prompts/quiz-edit-add";
import {
  aiQuizEditAddOutputSchema,
  type AIQuizEditAddOutput,
} from "../schemas/quiz-edit-add.schema";

export interface AddQuizBlocksArgs {
  context: QuizEditAddContext;
  modelKey?: ModelKey;
}

export const addQuizBlocks = async (
  args: AddQuizBlocksArgs,
): Promise<AICallResult<AIQuizEditAddOutput>> => {
  const modelKey = args.modelKey ?? DEFAULT_MODEL.quiz_edit;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.quiz_edit;

  const systemPrompt = `${QUIZ_EDIT_ADD_SYSTEM_PROMPT}\n\n${QUIZ_EDIT_ADD_RUBRIC_PROMPT}`;
  const userPrompt = buildQuizEditAddUserPrompt(args.context);
  const inputHash = hashPromptInput(
    `add\n${promptVersion}\n${systemPrompt}\n${userPrompt}`,
  );

  const startedAt = Date.now();
  let repairAttempts = 0;

  try {
    const { object, usage } = await generateObject({
      model,
      schema: aiQuizEditAddOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.4,
      experimental_repairText: async ({ text, error }) => {
        repairAttempts += 1;
        if (repairAttempts > 2) return null;
        // Cheap fix first; LLM repair only if it didn't help.
        const cheap = cheapRepair(text);
        if (repairAttempts === 1 && cheap !== text) return cheap;
        const { text: repaired } = await generateText({
          model,
          system:
            "You fix JSON so it matches a provided schema. Output ONLY the corrected JSON, no prose, no markdown fences.",
          prompt: `The following JSON failed schema validation.

Validation error:
${error.message}

Original JSON:
${text}

Return the corrected JSON only. Keep as much of the original content as possible — fix only what the error requires.`,
          temperature: 0,
        });
        return cheapRepair(repaired.trim());
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
      retryCount: repairAttempts,
      schemaValid: true,
      inputHash,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const rawText = NoObjectGeneratedError.isInstance(err) ? err.text : undefined;
    throw new AIGenerationError(
      `Quiz edit (add) failed: ${message}`,
      "quiz_edit",
      err,
      rawText,
    );
  }
};
