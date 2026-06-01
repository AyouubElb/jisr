import { z } from "zod";

/**
 * Output of the audio voice-grade agent. Called once per voice answer
 * (audio input → grade out). Shape mirrors studentGradePerBlockSchema but
 * adds pronunciation_errors and fluency_note since those concepts only
 * apply to spoken answers.
 */

export const STUDENT_GRADE_AUDIO_ERROR_KINDS = [
  "grammar",
  "vocab",
  "l1_calque",
  "register",
  "off_topic",
] as const;

export const studentGradeAudioErrorSchema = z.object({
  span: z.string(),
  kind: z.enum(STUDENT_GRADE_AUDIO_ERROR_KINDS),
  fix: z.string(),
});

export const studentGradeAudioPronunciationErrorSchema = z.object({
  word: z.string(),
  issue: z.string(),
});

export const studentGradeAudioOutputSchema = z.object({
  block_id: z.string(),
  score: z.number().min(0).max(10),
  is_correct: z.boolean(),
  rationale: z.string().max(600),
  instructor_note: z.string().max(800).nullable(),
  errors: z.array(studentGradeAudioErrorSchema),
  pronunciation_errors: z.array(studentGradeAudioPronunciationErrorSchema),
  fluency_note: z.string().max(300).nullable(),
});

export type StudentGradeAudioError = z.infer<typeof studentGradeAudioErrorSchema>;
export type StudentGradeAudioPronunciationError = z.infer<
  typeof studentGradeAudioPronunciationErrorSchema
>;
export type StudentGradeAudioOutput = z.infer<typeof studentGradeAudioOutputSchema>;
