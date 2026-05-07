import { generateObject, generateText, NoObjectGeneratedError } from "ai";
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
  LESSON_EDIT_SYSTEM_PROMPT,
  buildLessonEditUserPrompt,
  type LessonEditContext,
} from "../prompts/lesson-edit";
import {
  aiLessonEditOutputSchema,
  type AILessonEditOutput,
} from "../schemas/lesson-edit.schema";

export interface RunLessonEditArgs {
  context: LessonEditContext;
  modelKey?: ModelKey;
}

export const runLessonEdit = async (
  args: RunLessonEditArgs,
): Promise<AICallResult<AILessonEditOutput>> => {
  const modelKey = args.modelKey ?? DEFAULT_MODEL.lesson_edit;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.lesson_edit;

  const systemPrompt = LESSON_EDIT_SYSTEM_PROMPT;
  const userPrompt = buildLessonEditUserPrompt(args.context);
  const inputHash = hashPromptInput(
    `lesson_edit\n${promptVersion}\n${systemPrompt}\n${userPrompt}`,
  );

  const startedAt = Date.now();
  let repairAttempts = 0;

  try {
    const { object, usage } = await generateObject({
      model,
      schema: aiLessonEditOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
      maxOutputTokens: MAX_OUTPUT_TOKENS.lesson_edit,
      experimental_repairText: async ({ text, error }) => {
        repairAttempts += 1;
        if (repairAttempts > 2) return null;
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
          maxOutputTokens: MAX_OUTPUT_TOKENS.lesson_edit,
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
      `Lesson edit failed: ${message}`,
      "lesson_edit",
      err,
      rawText,
    );
  }
};
