import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { getModel, getProvider } from "../client";
import { DEFAULT_MODEL, PROMPT_VERSIONS, type ModelKey } from "../constants";
import { hashPromptInput } from "../hash";
import { AIGenerationError } from "../types";
import type { AICallResult } from "../types";
import {
  QUIZ_EDIT_SYSTEM_PROMPT,
  QUIZ_EDIT_RUBRIC_PROMPT,
  buildQuizEditUserPrompt,
  type QuizEditPromptContext,
} from "../prompts/quiz-editing";
import {
  aiQuizEditOutputSchema,
  type AIQuizEditOutput,
} from "../schemas/quiz-edit.schema";

export interface EditQuizArgs {
  context: QuizEditPromptContext;
  modelKey?: ModelKey;
}

/**
 * Single-call quiz editor. Receives current blocks + an instruction, returns
 * a Zod-validated change list. One repair retry on schema failure.
 *
 * Mirrors the shape of `generateQuiz` deliberately — once a third agent
 * lands, both should be folded into a generic runStructuredAgent helper
 * (see "Architecture: Reusable Agent Runner" in docs/AI-AGENTS.md).
 */
export const editQuiz = async (
  args: EditQuizArgs,
): Promise<AICallResult<AIQuizEditOutput>> => {
  const modelKey = args.modelKey ?? DEFAULT_MODEL.quiz_edit;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.quiz_edit;

  const systemPrompt = `${QUIZ_EDIT_SYSTEM_PROMPT}\n\n${QUIZ_EDIT_RUBRIC_PROMPT}`;
  const userPrompt = buildQuizEditUserPrompt(args.context);
  const inputHash = hashPromptInput(`${promptVersion}\n${systemPrompt}\n${userPrompt}`);

  const startedAt = Date.now();
  let repairAttempts = 0;

  try {
    const { object, usage } = await generateObject({
      model,
      schema: aiQuizEditOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
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
      `Quiz edit failed: ${message}`,
      "quiz_edit",
      err,
      rawText,
    );
  }
};
