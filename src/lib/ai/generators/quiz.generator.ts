import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { getModel, getProvider } from "../client";
import { DEFAULT_MODEL, PROMPT_VERSIONS, type ModelKey } from "../constants";
import { hashPromptInput } from "../hash";
import { AIGenerationError } from "../types";
import type { AICallResult } from "../types";
import {
  QUIZ_GEN_SYSTEM_PROMPT,
  QUIZ_GEN_RUBRIC_PROMPT,
  buildQuizGenUserPrompt,
  type QuizGenPromptContext,
} from "../prompts/quiz-generation";
import {
  aiQuizOutputSchema,
  type AIQuizOutput,
} from "../schemas/quiz-output.schema";

export interface GenerateQuizArgs {
  context: QuizGenPromptContext;
  modelKey?: ModelKey;
}

/**
 * Single-call quiz generator. Pre-assembled context → one LLM → Zod-
 * validated structured output. One repair retry on schema failure: we
 * hand the broken JSON + validation error back to the model so it can
 * patch the shape without regenerating the quiz from scratch.
 *
 * Upgrade path (tools, critic) is documented in docs/AI-AGENT-QUIZ-GEN.md §10.
 */
export const generateQuiz = async (
  args: GenerateQuizArgs,
): Promise<AICallResult<AIQuizOutput>> => {
  const modelKey = args.modelKey ?? DEFAULT_MODEL.quiz_gen;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.quiz_gen;

  const systemPrompt = `${QUIZ_GEN_SYSTEM_PROMPT}\n\n${QUIZ_GEN_RUBRIC_PROMPT}`;
  const userPrompt = buildQuizGenUserPrompt(args.context);
  const inputHash = hashPromptInput(`${promptVersion}\n${systemPrompt}\n${userPrompt}`);

  const startedAt = Date.now();
  let repairAttempts = 0;

  try {
    const { object, usage } = await generateObject({
      model,
      schema: aiQuizOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.4,
      experimental_repairText: async ({ text, error }) => {
        repairAttempts += 1;
        if (repairAttempts > 1) return null;

        const { text: repaired } = await generateText({
          model,
          system:
            "You fix JSON so it matches a provided schema. Output ONLY the corrected JSON, no prose, no markdown fences.",
          prompt: `The following JSON failed schema validation.

Validation error:
${error.message}

Original JSON:
${text}

Return the corrected JSON only. Keep as much of the original content as possible — fix only what the error requires. Do not invent new fields.`,
          temperature: 0,
        });

        return repaired.trim();
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
      `Quiz generation failed: ${message}`,
      "quiz_gen",
      err,
      rawText,
    );
  }
};
