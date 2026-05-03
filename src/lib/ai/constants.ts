import type { AIModelConfig, AIFeature } from "./types";

/**
 * Prompt versions. Bump whenever a prompt changes so telemetry can A/B.
 * Never edit an existing version in place — add a new one.
 */
export const PROMPT_VERSIONS = {
  quiz_gen: "quiz_gen_v9",
  quiz_edit: "quiz_edit_v4",
  quiz_judge: "quiz_judge_v1",
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

/**
 * Default model per feature. Switch via DB/env later; hard-coded today.
 * Stage 1 runs on Gemini Flash free tier.
 */
export const DEFAULT_MODEL: Record<AIFeature, ModelKey> = {
  quiz_gen: isModelKey(envQuizModel) ? envQuizModel : "gemini-2.5-flash-lite-direct",
  quiz_edit: isModelKey(envQuizEditModel) ? envQuizEditModel : "claude-haiku-4-5",
  quiz_judge: "claude-haiku-4-5",
  free_text_grade: "gemini-2.5-flash-lite",
  voice_grade: "gemini-2.5-flash-lite",
  intervention_suggest: "gemini-2.5-flash-lite",
  lesson_outline: "gemini-2.5-flash-lite",
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
  },
  pro: {
    quiz_gen: 200,
    quiz_edit: 600,
    quiz_judge: 100000,
    free_text_grade: 500,
    voice_grade: 100,
    intervention_suggest: 100,
    lesson_outline: 50,
  },
  studio: {
    quiz_gen: 1000,
    quiz_edit: 3000,
    quiz_judge: 100000,
    free_text_grade: 5000,
    voice_grade: 500,
    intervention_suggest: 500,
    lesson_outline: 300,
  },
};

/**
 * MVP default. Tier column is not in `profiles` yet — everyone is treated
 * as `studio` for now so we don't block the founder's sister.
 * Replace with profile lookup when pricing ships.
 */
export const DEFAULT_TIER: Tier = "studio";
