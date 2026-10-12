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

// OpenAI rejects a union at the schema root, so the model fills one flat
// object; the transform narrows it back to the reply | edit union.
export const aiLessonEditOutputSchema = z
  .object({
    kind: z.enum(["reply", "edit"]),
    summary: z.string().min(1).max(800),
    changes: z.array(lessonBlockChangeSchema).max(40).optional(),
  })
  .refine((o) => o.kind === "reply" || (o.changes?.length ?? 0) > 0, {
    message: 'kind "edit" needs at least one change',
    path: ["changes"],
  })
  .transform((o) =>
    o.kind === "edit"
      ? { kind: "edit" as const, summary: o.summary, changes: o.changes ?? [] }
      : { kind: "reply" as const, summary: o.summary },
  );

export type AILessonEditOutput = z.infer<typeof aiLessonEditOutputSchema>;
export type AILessonBlockChange = z.infer<typeof lessonBlockChangeSchema>;
