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
  audio_url: z.string().min(1, "Fichier audio requis"),
  caption: z.string().optional(),
});

const imageBlockContentSchema = z.object({
  image_url: z.string().min(1, "Image requise"),
  alt: z.string().optional(),
});

const mcqBlockContentSchema = z
  .object({
    prompt: z.string().min(1, "La question est requise"),
    allow_multiple: z.boolean().default(false),
    options: z
      .array(mcqOptionSchema)
      .min(2, "Au moins 2 options sont requises"),
  })
  .refine((data) => data.options.some((o) => o.is_correct), {
    message: "Au moins une option doit etre correcte",
    path: ["options"],
  })
  .refine(
    (data) =>
      data.allow_multiple || data.options.filter((o) => o.is_correct).length === 1,
    {
      message: "Exactement une option doit etre correcte (choix unique)",
      path: ["options"],
    },
  );

const fillBlankBlockContentSchema = z
  .object({
    sentence: z.string().min(1, "La phrase est requise"),
    options: z
      .array(mcqOptionSchema)
      .min(2, "Au moins 2 choix sont requis"),
  })
  .refine((data) => data.options.filter((o) => o.is_correct).length === 1, {
    message: "Exactement un choix doit etre correct",
    path: ["options"],
  });

const freeTextBlockContentSchema = z
  .object({
    prompt: z.string().min(1, "La consigne est requise"),
    min_words: z.number().min(0).optional(),
    max_words: z.number().min(1).optional(),
  })
  .refine(
    (data) =>
      data.min_words === undefined ||
      data.max_words === undefined ||
      data.max_words >= data.min_words,
    {
      message: "Le nombre maximum de mots doit etre superieur ou egal au minimum",
      path: ["max_words"],
    },
  );

const voiceBlockContentSchema = z.object({
  prompt: z.string().min(1, "La consigne est requise"),
  max_duration_seconds: z
    .number()
    .min(10, "Duree minimum: 10 secondes")
    .max(600, "Duree maximum: 10 minutes")
    .default(120),
});

// Map type → content schema for validation
export const blockContentSchemas = {
  text: textBlockContentSchema,
  audio: audioBlockContentSchema,
  image: imageBlockContentSchema,
  mcq: mcqBlockContentSchema,
  fill_blank: fillBlankBlockContentSchema,
  free_text: freeTextBlockContentSchema,
  voice: voiceBlockContentSchema,
} as const;

export type BlockType = keyof typeof blockContentSchemas;

export type TextBlockContent = z.infer<typeof textBlockContentSchema>;
export type AudioBlockContent = z.infer<typeof audioBlockContentSchema>;
export type ImageBlockContent = z.infer<typeof imageBlockContentSchema>;
export type McqBlockContent = z.infer<typeof mcqBlockContentSchema>;
export type FillBlankBlockContent = z.infer<typeof fillBlankBlockContentSchema>;
export type FreeTextBlockContent = z.infer<typeof freeTextBlockContentSchema>;
export type VoiceBlockContent = z.infer<typeof voiceBlockContentSchema>;

export type BlockContent =
  | TextBlockContent
  | AudioBlockContent
  | ImageBlockContent
  | McqBlockContent
  | FillBlankBlockContent
  | FreeTextBlockContent
  | VoiceBlockContent;

// Gradable block types — only these contribute to scoring and generate answers
export const GRADABLE_BLOCK_TYPES = ["mcq", "fill_blank", "free_text", "voice"] as const;
export type GradableBlockType = (typeof GRADABLE_BLOCK_TYPES)[number];

// Manually-graded block types — instructor must review before final_score is set
export const MANUAL_BLOCK_TYPES = ["free_text", "voice"] as const;
export type ManualBlockType = (typeof MANUAL_BLOCK_TYPES)[number];

export const isGradableBlock = (type: BlockType): type is GradableBlockType =>
  (GRADABLE_BLOCK_TYPES as readonly string[]).includes(type);

export const isManualBlock = (type: BlockType): type is ManualBlockType =>
  (MANUAL_BLOCK_TYPES as readonly string[]).includes(type);

// ── Quiz-level schemas ────────────────────────────────────────────────

export const BLOCK_TYPES = [
  "text",
  "audio",
  "image",
  "mcq",
  "fill_blank",
  "free_text",
  "voice",
] as const;

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  text: "Texte / Passage",
  audio: "Audio",
  image: "Image",
  mcq: "QCM",
  fill_blank: "Texte a trous",
  free_text: "Reponse ecrite",
  voice: "Reponse vocale",
};

export const createQuizSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caracteres"),
  description: z.string().optional(),
  time_limit_minutes: z.union([
    z.number().min(1).max(180),
    z.null(),
  ]).optional(),
  passing_score: z
    .number()
    .min(0, "Minimum 0%")
    .max(100, "Maximum 100%")
    .default(60),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

// ── Student answer schemas (what gets stored in student_answers.answer jsonb) ──

export const mcqAnswerSchema = z.object({
  selected: z.union([z.string(), z.array(z.string())]),
});

export const fillBlankAnswerSchema = z.object({
  selected: z.string(),
});

export const freeTextAnswerSchema = z.object({
  text: z.string(),
});

export const voiceAnswerSchema = z.object({
  audio_url: z.string(),
  duration_seconds: z.number().min(0),
});

export type McqAnswer = z.infer<typeof mcqAnswerSchema>;
export type FillBlankAnswer = z.infer<typeof fillBlankAnswerSchema>;
export type FreeTextAnswer = z.infer<typeof freeTextAnswerSchema>;
export type VoiceAnswer = z.infer<typeof voiceAnswerSchema>;

export type StudentAnswer =
  | McqAnswer
  | FillBlankAnswer
  | FreeTextAnswer
  | VoiceAnswer;

