import type { AIModelConfig, AIFeature } from "./types";

/**
 * Prompt versions. Bump whenever a prompt changes so telemetry can A/B.
 * Never edit an existing version in place — add a new one.
 */
export const PROMPT_VERSIONS = {
  quiz_gen: "quiz_gen_v11",
  quiz_edit: "quiz_edit_v8",
  quiz_judge: "quiz_judge_v1",
  lesson_edit: "lesson_edit_v9",
  lesson_gen: "lesson_gen_v4",
} as const;

/**
 * Model registry. Pricing in USD per 1M tokens (approximate — update when
 * providers change). `cacheReadCostPerMTokens` is what a cached token costs
 * when re-read; 0 for providers that give caching for free.
 */
export const MODELS = {
  "gemini-2.5-flash-lite": {
    provider: "vercel-gateway",
    modelId: "google/gemini-2.5-flash-lite",
    inputCostPerMTokens: 0.1,
    outputCostPerMTokens: 0.4,
    cacheReadCostPerMTokens: 0.01,
    supportsCaching: true,
  },
  "gemini-2.5-flash-lite-direct": {
    provider: "google",
    modelId: "gemini-2.5-flash-lite",
    inputCostPerMTokens: 0.1,
    outputCostPerMTokens: 0.4,
    cacheReadCostPerMTokens: 0.01,
    supportsCaching: true,
  },
  "gemini-2.5-pro": {
    provider: "google",
    modelId: "gemini-2.5-pro",
    inputCostPerMTokens: 1.25,
    outputCostPerMTokens: 10.0,
    cacheReadCostPerMTokens: 0.3125,
    supportsCaching: true,
  },
  "claude-haiku-4-5": {
    provider: "vercel-gateway",
    modelId: "anthropic/claude-haiku-4-5-20251001",
    inputCostPerMTokens: 1.0,
    outputCostPerMTokens: 5.0,
    cacheReadCostPerMTokens: 0.1,
    supportsCaching: true,
  },
  "gpt-5.4-nano": {
    provider: "vercel-gateway",
    modelId: "openai/gpt-5.4-nano",
    inputCostPerMTokens: 0.2,
    outputCostPerMTokens: 1.25,
    cacheReadCostPerMTokens: 0.02,
    supportsCaching: true,
  },
  "gpt-5.4-mini": {
    provider: "vercel-gateway",
    modelId: "openai/gpt-5.4-mini",
    inputCostPerMTokens: 0.75,
    outputCostPerMTokens: 4.5,
    cacheReadCostPerMTokens: 0.07,
    supportsCaching: true,
  },
  "claude-sonnet-4-6": {
    provider: "vercel-gateway",
    modelId: "anthropic/claude-sonnet-4-6",
    inputCostPerMTokens: 3.0,
    outputCostPerMTokens: 15.0,
    cacheReadCostPerMTokens: 0.3,
    supportsCaching: true,
  },
  "kimi-k2-6": {
    provider: "vercel-gateway",
    modelId: "moonshotai/kimi-k2.6",
    inputCostPerMTokens: 0.95,
    outputCostPerMTokens: 4.0,
    cacheReadCostPerMTokens: 0.16,
    supportsCaching: true,
  },
  "gemini-3-1-flash-lite": {
    provider: "vercel-gateway",
    modelId: "google/gemini-3.1-flash-lite-preview",
    inputCostPerMTokens: 0.25,
    outputCostPerMTokens: 1.5,
    cacheReadCostPerMTokens: 0.03,
    supportsCaching: true,
  },
} as const satisfies Record<string, AIModelConfig>;

export type ModelKey = keyof typeof MODELS;

const isModelKey = (v: string | undefined): v is ModelKey =>
  !!v && Object.prototype.hasOwnProperty.call(MODELS, v);

// Per-feature env overrides let us A/B a model without editing this file.
// Set e.g. AI_QUIZ_MODEL=kimi-k2-6 in .env.local to test.
const envQuizModel = process.env.AI_QUIZ_MODEL;
const envQuizEditModel = process.env.AI_QUIZ_EDIT_MODEL;
const envLessonEditModel = process.env.AI_LESSON_EDIT_MODEL;
const envLessonGenModel = process.env.AI_LESSON_GEN_MODEL;

// Hard output-token cap per feature. Prevents one runaway response from
// blowing the per-call budget. Tune up only if real outputs hit the ceiling.
export const MAX_OUTPUT_TOKENS: Record<AIFeature, number> = {
  quiz_gen: 4096,
  quiz_edit: 2048,
  quiz_judge: 1024,
  free_text_grade: 1024,
  voice_grade: 1024,
  intervention_suggest: 1024,
  lesson_outline: 2048,
  lesson_edit: 4096,
  lesson_gen: 6144,
};

// Default model per feature. Claude Haiku 4.5 across the board for
// consistency; env overrides let us A/B without editing this file.
export const DEFAULT_MODEL: Record<AIFeature, ModelKey> = {
  quiz_gen: isModelKey(envQuizModel) ? envQuizModel : "claude-haiku-4-5",
  quiz_edit: isModelKey(envQuizEditModel)
    ? envQuizEditModel
    : "claude-haiku-4-5",
  quiz_judge: "claude-haiku-4-5",
  free_text_grade: "claude-haiku-4-5",
  voice_grade: "claude-haiku-4-5",
  intervention_suggest: "claude-haiku-4-5",
  lesson_outline: "claude-haiku-4-5",
  lesson_edit: isModelKey(envLessonEditModel)
    ? envLessonEditModel
    : "claude-haiku-4-5",
  lesson_gen: isModelKey(envLessonGenModel)
    ? envLessonGenModel
    : "claude-haiku-4-5",
};

/**
 * Monthly quotas per tier, per feature. MVP is permissive — sister is the
 * only user, no real quota enforcement needed yet. Values below are the
 * planned Stage 1 limits so the check is wired up end-to-end.
 */
export type Tier = "free" | "pro" | "studio";

// quiz_judge is system-internal — not user-quota-bound.
export const TIER_QUOTAS: Record<Tier, Record<AIFeature, number>> = {
  free: {
    quiz_gen: 10,
    quiz_edit: 30,
    quiz_judge: 100000,
    free_text_grade: 20,
    voice_grade: 5,
    intervention_suggest: 5,
    lesson_outline: 3,
    lesson_edit: 30,
    lesson_gen: 5,
  },
  pro: {
    quiz_gen: 200,
    quiz_edit: 600,
    quiz_judge: 100000,
    free_text_grade: 500,
    voice_grade: 100,
    intervention_suggest: 100,
    lesson_outline: 50,
    lesson_edit: 600,
    lesson_gen: 100,
  },
  studio: {
    quiz_gen: 1000,
    quiz_edit: 3000,
    quiz_judge: 100000,
    free_text_grade: 5000,
    voice_grade: 500,
    intervention_suggest: 500,
    lesson_outline: 300,
    lesson_edit: 3000,
    lesson_gen: 500,
  },
};

// Fallback tier when profiles.tier is null or missing. "free" = $0 budget,
// so a misconfigured account fails closed (no AI) instead of silently
// granting paid quotas. Real tier comes from profiles.tier via getUserTier().
export const DEFAULT_TIER: Tier = "free";

// ── Quiz generation caps (enforced server-side in route; mirrored in dialog for UX) ──
export const QUIZ_GEN_MAX_LESSONS = 1;
export const QUIZ_GEN_MAX_DIRECT_QUESTIONS = 8;
export const QUIZ_GEN_MAX_PASSAGES_PER_TYPE = 1;

// ── TTS voice mapping ─────────────────────────────────────────────────────────────────
export const VOICE_BY_HINT: Record<string, { voiceId: string; speed: number }> =
  {
    neutral_female: { voiceId: "nova", speed: 1.0 },
    neutral_male: { voiceId: "onyx", speed: 1.0 },
    slow_clear: { voiceId: "nova", speed: 0.85 },
  };
export const DEFAULT_VOICE = VOICE_BY_HINT.neutral_female;

// Hard monthly $-budget per tier in cents. Catches per-call cost spikes
// that the per-feature counts above can't (e.g. one runaway long output).
export const TIER_COST_BUDGET_CENTS: Record<Tier, number> = {
  free: 0,
  pro: 300,
  studio: 1000,
};
