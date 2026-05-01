import { z } from "zod";
import { aiQuizBlockSchema } from "./quiz-output.schema";

/**
 * Output of the "add new blocks" tool. Mirrors quiz_gen's shape exactly:
 * one top-level object with a string array and a block-union array. No
 * `nullable` fields — Gemini's schema translator has known issues with them.
 *
 * Insert position is decided server-side (Stage 1 = append at the end), so
 * we don't ask the model for it. The route wraps each block as a
 * `{kind: "add_block", ...}` change card on the way back to the UI.
 */
export const aiQuizEditAddOutputSchema = z.object({
  /**
   * One reason per block, same length as `blocks`. Shown in the diff card.
   * 1 short French sentence each.
   */
  reasons: z.array(z.string()),
  blocks: z.array(aiQuizBlockSchema),
});

export type AIQuizEditAddOutput = z.infer<typeof aiQuizEditAddOutputSchema>;
