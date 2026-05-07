import { z } from "zod";

// Single-call lesson generation. The model returns a 1-line summary +
// the full lesson HTML built from a documentation template (grammar or
// vocabulary). No "reply" branch — generation is always an edit.
export const aiLessonGenOutputSchema = z.object({
  summary: z.string().min(1).max(800),
  new_content: z.string().min(1).max(60_000),
});

export type AILessonGenOutput = z.infer<typeof aiLessonGenOutputSchema>;
