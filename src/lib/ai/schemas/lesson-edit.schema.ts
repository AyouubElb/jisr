import { z } from "zod";

// Single-call lesson edit. Either a chat reply, or a full new lesson HTML.
export const aiLessonEditOutputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("reply"),
    summary: z.string().min(1).max(800),
  }),
  z.object({
    kind: z.literal("edit"),
    summary: z.string().min(1).max(800),
    new_content: z.string().min(1).max(60_000),
  }),
]);

export type AILessonEditOutput = z.infer<typeof aiLessonEditOutputSchema>;
