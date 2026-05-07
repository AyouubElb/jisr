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

  // Debug: log what we send to the model.
  console.log("[quiz-gen] === MODEL INPUT ===");
  console.log("[quiz-gen] model:", modelKey, "/ promptVersion:", promptVersion);
  console.log("[quiz-gen] user prompt:\n" + userPrompt);

  const startedAt = Date.now();
  let repairAttempts = 0;

  try {
    const { object, usage } = await generateObject({
      model,
      schema: aiQuizOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.4,
      maxOutputTokens: MAX_OUTPUT_TOKENS.quiz_gen,
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

Return the corrected JSON only. Keep as much of the original content as possible — fix only what the error requires. Do not invent new fields.`,
          temperature: 0,
          maxOutputTokens: MAX_OUTPUT_TOKENS.quiz_gen,
        });

        return cheapRepair(repaired.trim());
      },
    });

    console.log("[quiz-gen] === MODEL OUTPUT (parsed) ===");
    console.log("[quiz-gen] block count:", object.blocks.length);
    console.log("[quiz-gen] full object:\n" + JSON.stringify(object, null, 2));

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
    console.log("[quiz-gen] === MODEL OUTPUT (raw, schema FAILED) ===");
    console.log("[quiz-gen] error:", message);
    if (rawText) console.log("[quiz-gen] raw text:\n" + rawText);
    throw new AIGenerationError(
      `Quiz generation failed: ${message}`,
      "quiz_gen",
      err,
      rawText,
    );
  }
};
