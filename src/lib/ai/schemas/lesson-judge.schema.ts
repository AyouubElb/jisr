import { z } from "zod";

// Evidence-required violation. The judge MUST quote text from the lesson;
// claims without quotes are filtered out by the consumer.
export const lessonJudgeViolationSchema = z.object({
  check_id: z.string().min(1),
  evidence: z.string().min(10),
  fix_hint: z.string().min(1),
});

// Single output: a flat violations list. No scores, no overall grade.
// Pass/fail is derived from the count + severity of each check_id.
export const lessonJudgeOutputSchema = z.object({
  violations: z.array(lessonJudgeViolationSchema).max(30),
});

export type LessonJudgeViolation = z.infer<typeof lessonJudgeViolationSchema>;
export type LessonJudgeOutput = z.infer<typeof lessonJudgeOutputSchema>;
