import { z } from "zod";
import { aiQuizBlockSchema } from "./quiz-output.schema";

/**
 * Wire schema for quiz-edit changes.
 *
 * The change list is built server-side by the propose route — each tool
 * (add / update / delete) returns its own clean schema, and the route wraps
 * each result into one of the three change kinds below before sending to the
 * client. The same schema validates the apply body (client → server).
 *
 * No LLM ever sees this discriminated union directly, so we get the strong
 * type narrowing without hitting Gemini's nested-union limitations.
 */
const updateBlockChangeWireSchema = z.object({
  kind: z.literal("update_block"),
  block_id: z.string(),
  new_block: aiQuizBlockSchema,
  reason: z.string(),
});

const addBlockChangeWireSchema = z.object({
  kind: z.literal("add_block"),
  after_block_id: z.string().nullable(),
  block: aiQuizBlockSchema,
  reason: z.string(),
});

const deleteBlockChangeWireSchema = z.object({
  kind: z.literal("delete_block"),
  block_id: z.string(),
  reason: z.string(),
});

export const aiQuizChangeWireSchema = z.discriminatedUnion("kind", [
  updateBlockChangeWireSchema,
  addBlockChangeWireSchema,
  deleteBlockChangeWireSchema,
]);

export type AIQuizUpdateBlockChange = z.infer<typeof updateBlockChangeWireSchema>;
export type AIQuizAddBlockChange = z.infer<typeof addBlockChangeWireSchema>;
export type AIQuizDeleteBlockChange = z.infer<typeof deleteBlockChangeWireSchema>;
export type AIQuizChange = z.infer<typeof aiQuizChangeWireSchema>;
