import { z } from "zod";
import { aiQuizBlockSchema } from "./quiz-output.schema";

/**
 * Output of the "update existing blocks" tool. Each item rewrites ONE
 * existing block. Single level of discriminated union (block type) — same
 * shape that already works in quiz_gen.
 */
export const aiQuizEditUpdateOutputSchema = z.object({
  updates: z.array(
    z.object({
      block_id: z.string(),
      new_block: aiQuizBlockSchema,
      reason: z.string(),
    }),
  ),
});

export type AIQuizEditUpdateOutput = z.infer<
  typeof aiQuizEditUpdateOutputSchema
>;
