import { z } from "zod";
import { aiQuizBlockSchema } from "./quiz-output.schema";

/**
 * LLM-facing schema for quiz EDIT operations. The model receives the current
 * blocks (with their UUIDs) and returns a flat list of block-level changes
 * the instructor will accept or reject before they hit the database.
 *
 * Same flat-types philosophy as quiz-output.schema.ts — no refinements, no
 * nested objects beyond what the block schema already requires.
 */

const updateBlockChangeSchema = z.object({
  kind: z.literal("update_block"),
  // Must reference an id present in the input. Validated server-side.
  block_id: z.string(),
  // Full replacement block (not a partial diff — the model emits the
  // complete new shape, easier to reason about and to render).
  new_block: aiQuizBlockSchema,
  // 1-line French justification shown in the diff card.
  reason: z.string(),
});

const addBlockChangeSchema = z.object({
  kind: z.literal("add_block"),
  // null = insert at the very start of the quiz.
  after_block_id: z.string().nullable(),
  block: aiQuizBlockSchema,
  reason: z.string(),
});

const deleteBlockChangeSchema = z.object({
  kind: z.literal("delete_block"),
  block_id: z.string(),
  reason: z.string(),
});

export const quizChangeSchema = z.discriminatedUnion("kind", [
  updateBlockChangeSchema,
  addBlockChangeSchema,
  deleteBlockChangeSchema,
]);

export const aiQuizEditOutputSchema = z.object({
  // 1-2 sentence overview shown above the change list.
  summary: z.string(),
  changes: z.array(quizChangeSchema),
});

export type AIQuizChange = z.infer<typeof quizChangeSchema>;
export type AIQuizUpdateBlockChange = z.infer<typeof updateBlockChangeSchema>;
export type AIQuizAddBlockChange = z.infer<typeof addBlockChangeSchema>;
export type AIQuizDeleteBlockChange = z.infer<typeof deleteBlockChangeSchema>;
export type AIQuizEditOutput = z.infer<typeof aiQuizEditOutputSchema>;
