import { z } from "zod";

/**
 * Router output. Picks which tool(s) to run and rewrites the user instruction
 * into a focused sub-instruction per tool. No discriminated unions — just a
 * small enum + arrays. Designed to be the simplest possible schema so even
 * weak structured-output models can produce it reliably.
 */
export const quizEditRouterStepSchema = z.object({
  tool: z.enum(["add", "update", "delete"]),
  /** Existing block IDs the tool will touch. Empty for "add". */
  target_block_ids: z.array(z.string()),
  /** One-line restatement of the user instruction scoped to this tool. */
  sub_instruction: z.string(),
});

export const quizEditRouterOutputSchema = z.object({
  /** 1-line French summary of how the router interpreted the instruction. */
  summary: z.string(),
  steps: z.array(quizEditRouterStepSchema),
});

export type QuizEditRouterStep = z.infer<typeof quizEditRouterStepSchema>;
export type QuizEditRouterOutput = z.infer<typeof quizEditRouterOutputSchema>;
