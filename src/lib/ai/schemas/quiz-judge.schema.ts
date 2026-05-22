import { z } from "zod";

export const quizJudgeOutputSchema = z.object({
  // Pre-scoring enumeration — forces the judge to read before it scores.
  observed_blocks: z.string(),
  mix_check: z.string(),

  cefr_alignment: z.number().int().min(1).max(5),
  /** Block count + types match the requested mix (passage questions counted separately). */
  instruction_following: z.number().int().min(1).max(5),
  content_grounding: z.number().int().min(1).max(5),
  distractor_quality: z.number().int().min(1).max(5),
  question_clarity: z.number().int().min(1).max(5),
  /** Null when the quiz contains no free_text or voice_response blocks. */
  rubric_quality: z.number().int().min(1).max(5).nullable(),
  language_correctness: z.boolean(),
  focus_topic_present: z.boolean(),
  /** 1-3 sentences naming the specific issue and what would fix it. */
  notes: z.string(),
});

export type QuizJudgeOutput = z.infer<typeof quizJudgeOutputSchema>;
