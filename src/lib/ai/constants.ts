import type { AIModelConfig, AIFeature } from "./types";

/**
 * Prompt versions. Bump whenever a prompt changes so telemetry can A/B.
 * Never edit an existing version in place — add a new one.
 */
export const PROMPT_VERSIONS = {
  quiz_gen: "quiz_gen_v3",
} as const;

/**
 * Model registry. Pricing in USD per 1M tokens (approximate — update when
 * providers change). `cacheReadCostPerMTokens` is what a cached token costs
 * when re-read; 0 for providers that give caching for free.
 */
export const MODELS = {
  "gemini-2.5-flash": {
    provider: "google",
    modelId: "gemini-2.5-flash",
    inputCostPerMTokens: 0.075,
    outputCostPerMTokens: 0.3,
    cacheReadCostPerMTokens: 0.01875,
    supportsCaching: true,
  },
  "gemini-2.5-flash-lite": {
    provider: "google",
    modelId: "gemini-2.5-flash-lite",
    inputCostPerMTokens: 0.0375,
    outputCostPerMTokens: 0.15,
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
  "claude-sonnet-4-6": {
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    inputCostPerMTokens: 3.0,
    outputCostPerMTokens: 15.0,
    cacheReadCostPerMTokens: 0.3,
    supportsCaching: true,
  },
} as const satisfies Record<string, AIModelConfig>;

export type ModelKey = keyof typeof MODELS;

/**
 * Default model per feature. Switch via DB/env later; hard-coded today.
 * Stage 1 runs on Gemini Flash free tier.
 */
export const DEFAULT_MODEL: Record<AIFeature, ModelKey> = {
  quiz_gen: "gemini-2.5-flash-lite",
  free_text_grade: "gemini-2.5-flash",
  voice_grade: "gemini-2.5-flash",
  intervention_suggest: "gemini-2.5-flash",
  lesson_outline: "gemini-2.5-flash",
};

/**
 * Monthly quotas per tier, per feature. MVP is permissive — sister is the
 * only user, no real quota enforcement needed yet. Values below are the
 * planned Stage 1 limits so the check is wired up end-to-end.
 */
export type Tier = "free" | "pro" | "studio";

export const TIER_QUOTAS: Record<Tier, Record<AIFeature, number>> = {
  free: {
    quiz_gen: 10,
    free_text_grade: 20,
    voice_grade: 5,
    intervention_suggest: 5,
    lesson_outline: 3,
  },
  pro: {
    quiz_gen: 200,
    free_text_grade: 500,
    voice_grade: 100,
    intervention_suggest: 100,
    lesson_outline: 50,
  },
  studio: {
    quiz_gen: 1000,
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
