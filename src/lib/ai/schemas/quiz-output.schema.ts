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
});

const aiFillBlankBlockSchema = z.object({
  type: z.literal("fill_blank"),
  // sentence MUST contain "___" as the blank marker (enforced in mapper)
  sentence: z.string(),
  options: z.array(z.string()),
  correct_index: z.number().int(),
  explanation: z.string().optional(),
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
 * A listening passage + its comprehension MCQs in one block. The route
 * handler runs TTS on `script`, then expands this into one audio block
 * followed by N MCQ blocks linked back to it. Keeping script and
 * questions together in the model output is what guarantees they stay
 * aligned.
 */
const aiAudioPassageBlockSchema = z.object({
  type: z.literal("audio_passage"),
  script: z.string(),
  voice_hint: z.enum(["neutral_female", "neutral_male", "slow_clear"]).optional(),
  caption: z.string().optional(),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correct_index: z.number().int(),
      explanation: z.string().optional(),
    }),
  ),
});

export const aiQuizBlockSchema = z.discriminatedUnion("type", [
  aiMcqBlockSchema,
  aiFillBlankBlockSchema,
  aiFreeTextBlockSchema,
  aiAudioPassageBlockSchema,
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
export type AIAudioPassageBlock = z.infer<typeof aiAudioPassageBlockSchema>;
export type AIQuizOutput = z.infer<typeof aiQuizOutputSchema>;
