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
  // AI-generated audio carries its source script so instructors can edit
  // the text and regenerate the audio without losing the transcript.
  script: z.string().optional(),
  voice_id: z.string().optional(),
  speed: z.number().min(0.5).max(2).optional(),
  duration_seconds: z.number().min(0).optional(),
  transcript_visible: z.boolean().optional(),
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
    // Set when this MCQ is a listening-comprehension question tied to a
    // preceding audio block. The player uses it to render the audio
    // alongside the question.
    audio_block_id: z.string().uuid().optional(),
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

// Pure marker block — positional divider that groups the following blocks
// into a named part of the quiz (e.g. "Partie 1: Vocabulaire"). Non-gradable.
const sectionBlockContentSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
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
  section: sectionBlockContentSchema,
} as const;

export type BlockType = keyof typeof blockContentSchemas;

export type TextBlockContent = z.infer<typeof textBlockContentSchema>;
export type AudioBlockContent = z.infer<typeof audioBlockContentSchema>;
export type ImageBlockContent = z.infer<typeof imageBlockContentSchema>;
export type McqBlockContent = z.infer<typeof mcqBlockContentSchema>;
export type FillBlankBlockContent = z.infer<typeof fillBlankBlockContentSchema>;
export type FreeTextBlockContent = z.infer<typeof freeTextBlockContentSchema>;
export type VoiceBlockContent = z.infer<typeof voiceBlockContentSchema>;
export type SectionBlockContent = z.infer<typeof sectionBlockContentSchema>;

export type BlockContent =
  | TextBlockContent
  | AudioBlockContent
  | ImageBlockContent
  | McqBlockContent
  | FillBlankBlockContent
  | FreeTextBlockContent
  | VoiceBlockContent
  | SectionBlockContent;

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
  "section",
  "text",
  "audio",
  "image",
  "mcq",
  "fill_blank",
  "free_text",
  "voice",
] as const;

export const BLOCK_TYPE_LABELS_FR: Record<BlockType, string> = {
  section: "Section",
  text: "Texte / Passage",
  audio: "Audio",
  image: "Image",
  mcq: "QCM",
  fill_blank: "Texte a trous",
  free_text: "Reponse ecrite",
  voice: "Reponse vocale",
};

export const BLOCK_TYPE_LABELS_EN: Record<BlockType, string> = {
  section: "Section",
  text: "Text / Passage",
  audio: "Audio",
  image: "Image",
  mcq: "MCQ",
  fill_blank: "Fill-in-the-blank",
  free_text: "Written response",
  voice: "Voice response",
};

export const BLOCK_TYPE_LABELS = BLOCK_TYPE_LABELS_FR;

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
  // null = unlimited retakes; 1-5 caps the number of attempts per student.
  // Cap chosen at 5 because anything higher should be unlimited (leave empty).
  max_attempts: z.union([
    z.number().int().min(1, "Minimum 1").max(5, "Maximum 5. Pour plus de tentatives, laissez le champ vide (illimité)."),
    z.null(),
  ]).optional(),
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

