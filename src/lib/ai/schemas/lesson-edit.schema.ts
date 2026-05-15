import { z } from "zod";

// Block-edit lesson agent. Either a chat reply, or a list of block ops the
// server applies to the numbered lesson — never a full-lesson rewrite.

const replaceChange = z.object({
  op: z.literal("replace"),
  block: z.number().int().min(0),
  html: z.string().min(1).max(8_000),
});

const insertAfterChange = z.object({
  op: z.literal("insert_after"),
  // -1 = insert at the very start of the lesson.
  block: z.number().int().min(-1),
  html: z.string().min(1).max(8_000),
});

const deleteChange = z.object({
  op: z.literal("delete"),
  block: z.number().int().min(0),
});

export const lessonBlockChangeSchema = z.discriminatedUnion("op", [
  replaceChange,
  insertAfterChange,
  deleteChange,
]);

export const aiLessonEditOutputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("reply"),
    summary: z.string().min(1).max(800),
  }),
  z.object({
    kind: z.literal("edit"),
    summary: z.string().min(1).max(800),
    changes: z.array(lessonBlockChangeSchema).min(1).max(40),
  }),
]);

export type AILessonEditOutput = z.infer<typeof aiLessonEditOutputSchema>;
export type AILessonBlockChange = z.infer<typeof lessonBlockChangeSchema>;
