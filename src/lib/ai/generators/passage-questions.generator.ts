import { generateObject, NoObjectGeneratedError } from "ai";
import { getModel, getProvider } from "../client";
import { DEFAULT_MODEL, PROMPT_VERSIONS, type ModelKey } from "../constants";
import { hashPromptInput } from "../hash";
import { cheapRepair } from "../repair";
import { AIGenerationError } from "../types";
import type { AICallResult } from "../types";
import {
  PASSAGE_QUESTIONS_SYSTEM_PROMPT,
  buildPassageQuestionsUserPrompt,
  type PassageQuestionsContext,
} from "../prompts/passage-questions";
import {
  aiPassageQuestionsOutputSchema,
  type AIPassageQuestionsOutput,
} from "../schemas/passage-questions.schema";

export interface GeneratePassageQuestionsArgs {
  context: PassageQuestionsContext;
  modelKey?: ModelKey;
}

export const generatePassageQuestions = async (
  args: GeneratePassageQuestionsArgs,
): Promise<AICallResult<AIPassageQuestionsOutput>> => {
  const modelKey = args.modelKey ?? DEFAULT_MODEL.quiz_gen;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.quiz_gen;

  const systemPrompt = PASSAGE_QUESTIONS_SYSTEM_PROMPT;
  const userPrompt = buildPassageQuestionsUserPrompt(args.context);
  const inputHash = hashPromptInput(
    `passage-questions\n${promptVersion}\n${systemPrompt}\n${userPrompt}`,
  );

  console.log("[passage-questions] === MODEL INPUT ===");
  console.log("[passage-questions] model:", modelKey);
  console.log("[passage-questions] user prompt:\n" + userPrompt);

  const startedAt = Date.now();

  try {
    const { object, usage } = await generateObject({
      model,
      schema: aiPassageQuestionsOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
      experimental_repairText: async ({ text }) => {
        const cheap = cheapRepair(text);
        return cheap !== text ? cheap : null;
      },
    });

    console.log("[passage-questions] === MODEL OUTPUT (parsed) ===");
    console.log("[passage-questions] question count:", object.questions.length);
    console.log("[passage-questions] full object:\n" + JSON.stringify(object, null, 2));

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
    console.log("[passage-questions] === MODEL OUTPUT (raw, schema FAILED) ===");
    console.log("[passage-questions] error:", message);
    if (rawText) console.log("[passage-questions] raw text:\n" + rawText);
    throw new AIGenerationError(
      `Passage-questions repair failed: ${message}`,
      "quiz_gen",
      err,
      rawText,
    );
  }
};
