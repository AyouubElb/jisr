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
  LESSON_GEN_SYSTEM_PROMPT,
  buildLessonGenUserPrompt,
  type LessonGenContext,
} from "../prompts/lesson-generation";
import {
  aiLessonGenOutputSchema,
  type AILessonGenOutput,
} from "../schemas/lesson-gen.schema";

export interface RunLessonGenArgs {
  context: LessonGenContext;
  modelKey?: ModelKey;
}

/**
 * Single-call lesson generator. Pre-assembled context → one LLM →
 * Zod-validated structured output. One repair retry on schema failure.
 *
 * Generation always returns an "edit" shape (summary + new_content).
 * No "reply" branch — the editor chat handles conversation.
 */
export const runLessonGen = async (
  args: RunLessonGenArgs,
): Promise<AICallResult<AILessonGenOutput>> => {
  const modelKey = args.modelKey ?? DEFAULT_MODEL.lesson_gen;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.lesson_gen;

  const systemPrompt = LESSON_GEN_SYSTEM_PROMPT;
  const userPrompt = buildLessonGenUserPrompt(args.context);
  const inputHash = hashPromptInput(
    `lesson_gen\n${promptVersion}\n${systemPrompt}\n${userPrompt}`,
  );

  const startedAt = Date.now();
  let repairAttempts = 0;

  try {
    const { object, usage } = await generateObject({
      model,
      schema: aiLessonGenOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.4,
      maxOutputTokens: MAX_OUTPUT_TOKENS.lesson_gen,
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
          maxOutputTokens: MAX_OUTPUT_TOKENS.lesson_gen,
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
      `Lesson generation failed: ${message}`,
      "lesson_gen",
      err,
      rawText,
    );
  }
};
