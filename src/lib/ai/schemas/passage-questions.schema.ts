import { z } from "zod";

/** Output of the passage-questions repair tool. Flat, no unions. */
export const aiPassageQuestionsOutputSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correct_index: z.number().int(),
      explanation: z.string().optional(),
    }),
  ),
});

export type AIPassageQuestionsOutput = z.infer<
  typeof aiPassageQuestionsOutputSchema
>;
