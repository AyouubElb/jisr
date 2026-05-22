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
  STUDENT_GRADE_SYSTEM_PROMPT,
  buildStudentGradeUserPrompt,
  type StudentGradeContext,
} from "../prompts/student-grade";
import {
  studentGradeOutputSchema,
  type StudentGradeOutput,
} from "../schemas/student-grade.schema";

export interface GradeStudentAnswersArgs {
  context: StudentGradeContext;
  modelKey?: ModelKey;
}

export const gradeStudentAnswers = async (
  args: GradeStudentAnswersArgs,
): Promise<AICallResult<StudentGradeOutput>> => {
  const modelKey = args.modelKey ?? DEFAULT_MODEL.free_text_grade;
  const model = getModel(modelKey);
  const provider = getProvider(modelKey);
  const promptVersion = PROMPT_VERSIONS.student_grade;

  const systemPrompt = STUDENT_GRADE_SYSTEM_PROMPT;
  const userPrompt = buildStudentGradeUserPrompt(args.context);
  const inputHash = hashPromptInput(
    `student-grade\n${promptVersion}\n${systemPrompt}\n${userPrompt}`,
  );

  console.log("[student-grade] === MODEL INPUT ===");
  console.log("[student-grade] model:", modelKey);
  console.log("[student-grade] answer count:", args.context.answers.length);

  const startedAt = Date.now();

  try {
    const { object, usage } = await generateObject({
      model,
      schema: studentGradeOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.2,
      maxOutputTokens: MAX_OUTPUT_TOKENS.free_text_grade,
      experimental_repairText: async ({ text }) => {
        const cheap = cheapRepair(text);
        return cheap !== text ? cheap : null;
      },
    });

    console.log("[student-grade] === MODEL OUTPUT (parsed) ===");
    console.log("[student-grade] grades returned:", object.grades.length);

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
    console.log("[student-grade] === MODEL OUTPUT (raw, schema FAILED) ===");
    console.log("[student-grade] error:", message);
    if (rawText) console.log("[student-grade] raw text:\n" + rawText);
    throw new AIGenerationError(
      `Student-grade failed: ${message}`,
      "free_text_grade",
      err,
      rawText,
    );
  }
};
