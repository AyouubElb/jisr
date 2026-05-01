import { generateObject } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getModel } from "../client";
import { cheapRepair } from "../repair";
import { quizJudgeOutputSchema } from "../schemas/quiz-judge.schema";
import {
  QUIZ_JUDGE_SYSTEM_PROMPT,
  buildQuizJudgeUserPrompt,
  type QuizJudgeContext,
} from "../prompts/quiz-judge";
import type { Database } from "@/lib/types/database";

const JUDGE_MODEL_KEY = "claude-haiku-4-5" as const;
const RUBRIC_KEY = "quiz_gen_v2";

/**
 * Runs the LLM judge on a completed quiz generation and stores the result
 * in ai_evaluations with evaluator_type = "llm_judge".
 *
 * Never throws — caller uses fire-and-forget. All errors are logged only.
 */
export const judgeAndStoreQuizEval = async ({
  supabase,
  generationId,
  context,
}: {
  supabase: SupabaseClient<Database>;
  generationId: string;
  context: QuizJudgeContext;
}): Promise<void> => {
  let scores;

  try {
    const { object } = await generateObject({
      model: getModel(JUDGE_MODEL_KEY),
      schema: quizJudgeOutputSchema,
      system: QUIZ_JUDGE_SYSTEM_PROMPT,
      prompt: buildQuizJudgeUserPrompt(context),
      temperature: 0,
      experimental_repairText: async ({ text }) => {
        const cheap = cheapRepair(text);
        return cheap !== text ? cheap : null;
      },
    });
    scores = object;
  } catch (err) {
    console.error("[quiz-judge] LLM call failed:", err);
    return;
  }

  const { notes, ...scoreFields } = scores;

  // Drop null values (nullable criteria with nothing to evaluate) so the
  // scores blob stays Record<string, number | boolean>.
  const cleanScores = Object.fromEntries(
    Object.entries(scoreFields).filter(([, v]) => v !== null),
  );

  const { error } = await supabase.from("ai_evaluations").insert({
    generation_id: generationId,
    evaluator_id: null,
    evaluator_type: "llm_judge",
    rubric_key: RUBRIC_KEY,
    scores: cleanScores,
    notes,
  });

  if (error) {
    console.error("[quiz-judge] failed to store eval:", error.message);
  }
};
