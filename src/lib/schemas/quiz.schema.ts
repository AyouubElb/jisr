import { z } from "zod";

// ── Block content schemas (one per block type) ────────────────────────

const mcqOptionSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "L'option ne peut pas etre vide"),
  is_correct: z.boolean(),
});

export type McqOption = z.infer<typeof mcqOptionSchema>;

const textBlockContentSchema = z.object({
  html: z.string(),
});

const audioBlockContentSchema = z.object({
  audio_url: z.string().url("URL audio invalide"),
  caption: z.string().optional(),
});

const imageBlockContentSchema = z.object({
  image_url: z.string().url("URL image invalide"),
  alt: z.string().optional(),
});

const mcqBlockContentSchema = z.object({
  prompt: z.string().min(1, "La question est requise"),
  options: z
    .array(mcqOptionSchema)
    .min(2, "Au moins 2 options sont requises")
    .refine((opts) => opts.some((o) => o.is_correct), {
      message: "Au moins une option doit etre correcte",
    }),
});

const fillBlankBlockContentSchema = z.object({
  sentence: z.string().min(1, "La phrase est requise"),
  accepted_answers: z
    .array(z.string().min(1))
    .min(1, "Au moins une reponse acceptee est requise"),
});

const freeTextBlockContentSchema = z.object({
  prompt: z.string().min(1, "La consigne est requise"),
  min_words: z.number().min(0).optional(),
});

// Map type → content schema for validation
export const blockContentSchemas = {
  text: textBlockContentSchema,
  audio: audioBlockContentSchema,
  image: imageBlockContentSchema,
  mcq: mcqBlockContentSchema,
  fill_blank: fillBlankBlockContentSchema,
  free_text: freeTextBlockContentSchema,
} as const;

export type BlockType = keyof typeof blockContentSchemas;

export type TextBlockContent = z.infer<typeof textBlockContentSchema>;
export type AudioBlockContent = z.infer<typeof audioBlockContentSchema>;
export type ImageBlockContent = z.infer<typeof imageBlockContentSchema>;
export type McqBlockContent = z.infer<typeof mcqBlockContentSchema>;
export type FillBlankBlockContent = z.infer<typeof fillBlankBlockContentSchema>;
export type FreeTextBlockContent = z.infer<typeof freeTextBlockContentSchema>;

export type BlockContent =
  | TextBlockContent
  | AudioBlockContent
  | ImageBlockContent
  | McqBlockContent
  | FillBlankBlockContent
  | FreeTextBlockContent;

// ── Quiz-level schemas ────────────────────────────────────────────────

export const BLOCK_TYPES = [
  "text",
  "audio",
  "image",
  "mcq",
  "fill_blank",
  "free_text",
] as const;

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  text: "Texte / Passage",
  audio: "Audio",
  image: "Image",
  mcq: "QCM",
  fill_blank: "Texte a trous",
  free_text: "Reponse libre",
};

export const createQuizSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caracteres"),
  description: z.string().optional(),
  time_limit_minutes: z.union([
    z.number().min(1).max(180),
    z.null(),
  ]).optional(),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

