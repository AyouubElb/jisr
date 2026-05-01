import { z } from "zod";

/**
 * Output of the "delete blocks" tool. The simplest possible schema — no
 * unions at all. Will never fail structured output.
 */
export const aiQuizEditDeleteOutputSchema = z.object({
  deletions: z.array(
    z.object({
      block_id: z.string(),
      reason: z.string(),
    }),
  ),
});

export type AIQuizEditDeleteOutput = z.infer<
  typeof aiQuizEditDeleteOutputSchema
>;
