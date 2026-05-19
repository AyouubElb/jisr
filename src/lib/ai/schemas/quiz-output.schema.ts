import { z } from "zod";

/**
 * LLM-facing quiz schema — deliberately FLAT.
 *
 * Models (all of them, not just Gemini) emit simple types reliably and
 * mangle nested object arrays. We accept flat primitives here and let the
 * route handler map to the rich UI/DB shape (`{id, label, is_correct}[]`).
 *
 * Rules:
 * - No `.refine()` — refinements aren't part of JSON Schema; they cause
 *   `NoObjectGeneratedError` instead of nudging the model.
 * - No `.regex()` — same story.
 * - No deep nesting. Option labels go in `options: string[]` and the
 *   correct answer is identified by `correct_index`.
 * - Field names chosen to match what models naturally emit (`question`
 *   not `prompt`).
 */

const aiMcqBlockSchema = z.object({
  type: z.literal("mcq"),
  question: z.string(),
  options: z.array(z.string()),
  correct_index: z.number().int(),
  explanation: z.string().optional(),
  // Id of an existing text_passage / audio_passage this question is about.
  links_to_block_id: z.string().optional(),
});

const aiFillBlankBlockSchema = z.object({
  type: z.literal("fill_blank"),
  // sentence MUST contain "___" as the blank marker (enforced in mapper)
  sentence: z.string(),
  options: z.array(z.string()),
  correct_index: z.number().int(),
  explanation: z.string().optional(),
  links_to_block_id: z.string().optional(),
});

const aiFreeTextBlockSchema = z.object({
  type: z.literal("free_text"),
  question: z.string(),
  rubric: z.string(),
  model_answer: z.string(),
  min_words: z.number().int().optional(),
  max_words: z.number().int().optional(),
});

/**
 * Speaking practice — student records audio. Output shape mirrors free_text
 * (prompt + rubric + model answer), the route handler maps it to a `voice`
 * quiz_block. No TTS for the prompt itself; the prompt is shown as text.
 */
const aiVoiceResponseBlockSchema = z.object({
  type: z.literal("voice_response"),
  question: z.string(),
  rubric: z.string(),
  model_answer: z.string(),
  max_seconds: z.number().int().optional(),
});

/** Comprehension MCQ nested inside a passage block. */
const aiPassageQuestionMcqSchema = z.object({
  type: z.literal("mcq"),
  question: z.string(),
  options: z.array(z.string()),
  correct_index: z.number().int(),
  explanation: z.string().optional(),
});

/** Comprehension fill-blank nested inside a passage block. */
const aiPassageQuestionFillBlankSchema = z.object({
  type: z.literal("fill_blank"),
  sentence: z.string(),
  options: z.array(z.string()),
  correct_index: z.number().int(),
  explanation: z.string().optional(),
});

const aiPassageQuestionSchema = z.discriminatedUnion("type", [
  aiPassageQuestionMcqSchema,
  aiPassageQuestionFillBlankSchema,
]);

export type AIPassageQuestion = z.infer<typeof aiPassageQuestionSchema>;

/**
 * A listening passage + its comprehension questions in one block. The route
 * handler runs TTS on `script`, then expands this into one audio block
 * followed by N child blocks linked back to it.
 */
const aiAudioPassageBlockSchema = z.object({
  type: z.literal("audio_passage"),
  script: z.string(),
  voice_hint: z.enum(["neutral_female", "neutral_male", "slow_clear"]).optional(),
  caption: z.string().optional(),
  questions: z.array(aiPassageQuestionSchema).optional(),
});

/**
 * Reading comprehension — text passage + comprehension questions in one block.
 * The route handler stores the passage as a `text` quiz_block followed by N
 * child blocks linked via `passage_block_id`.
 */
const aiTextPassageBlockSchema = z.object({
  type: z.literal("text_passage"),
  passage: z.string(),
  caption: z.string().optional(),
  questions: z.array(aiPassageQuestionSchema).optional(),
});

/** Section header — purely structural, no scoring. */
const aiSectionBlockSchema = z.object({
  type: z.literal("section"),
  title: z.string(),
  description: z.string().optional(),
});

export const aiQuizBlockSchema = z.discriminatedUnion("type", [
  aiMcqBlockSchema,
  aiFillBlankBlockSchema,
  aiFreeTextBlockSchema,
  aiVoiceResponseBlockSchema,
  aiAudioPassageBlockSchema,
  aiTextPassageBlockSchema,
  aiSectionBlockSchema,
]);

export const aiQuizOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  cefr_targeted: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  skills_covered: z.array(z.string()),
  blocks: z.array(aiQuizBlockSchema),
});

export type AIQuizBlock = z.infer<typeof aiQuizBlockSchema>;
export type AIMcqBlock = z.infer<typeof aiMcqBlockSchema>;
export type AIFillBlankBlock = z.infer<typeof aiFillBlankBlockSchema>;
export type AIFreeTextBlock = z.infer<typeof aiFreeTextBlockSchema>;
export type AIVoiceResponseBlock = z.infer<typeof aiVoiceResponseBlockSchema>;
export type AIAudioPassageBlock = z.infer<typeof aiAudioPassageBlockSchema>;
export type AITextPassageBlock = z.infer<typeof aiTextPassageBlockSchema>;
export type AISectionBlock = z.infer<typeof aiSectionBlockSchema>;
export type AIQuizOutput = z.infer<typeof aiQuizOutputSchema>;
