import { z } from "zod";

/**
 * Output of the `student_grade` agent. One whole-attempt call grades all
 * free-text and voice answers in one shot — the response is an array of
 * per-answer grades keyed by the block_id we passed in.
 *
 * Kept flat (no discriminated unions) so Gemini and Claude both accept the
 * schema reliably.
 */

export const STUDENT_GRADE_ERROR_KINDS = [
  "grammar",
  "vocab",
  "spelling",
  "l1_calque",
  "register",
  "off_topic",
] as const;

export const studentGradeErrorSchema = z.object({
  span: z.string(),
  kind: z.enum(STUDENT_GRADE_ERROR_KINDS),
  fix: z.string(),
});

export const studentGradePerBlockSchema = z.object({
  block_id: z.string(),
  score: z.number().min(0).max(10),
  is_correct: z.boolean(),
  rationale: z.string(),
  instructor_note: z.string().optional(),
  errors: z.array(studentGradeErrorSchema).default([]),
});

export const studentGradeOutputSchema = z.object({
  grades: z.array(studentGradePerBlockSchema),
});

export type StudentGradeError = z.infer<typeof studentGradeErrorSchema>;
export type StudentGradePerBlock = z.infer<typeof studentGradePerBlockSchema>;
export type StudentGradeOutput = z.infer<typeof studentGradeOutputSchema>;
