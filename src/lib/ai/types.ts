/**
 * Shared types for the AI layer. Every agent (quiz gen, auto-grader,
 * intervention assistant, etc.) uses these shapes so telemetry and
 * orchestration stay uniform as we add more agents.
 */

export const AI_PROVIDERS = ["google", "anthropic", "vercel-gateway"] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];

export const AI_FEATURES = [
  "quiz_gen",
  "quiz_edit",
  "free_text_grade",
  "voice_grade",
  "intervention_suggest",
  "lesson_outline",
] as const;
export type AIFeature = (typeof AI_FEATURES)[number];

export interface AIModelConfig {
  provider: AIProvider;
  modelId: string;
  inputCostPerMTokens: number;
  outputCostPerMTokens: number;
  cacheReadCostPerMTokens: number;
  supportsCaching: boolean;
}

export interface AIUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
}

export interface AICallResult<TOutput> {
  output: TOutput;
  usage: AIUsage;
  latencyMs: number;
  model: string;
  provider: AIProvider;
  promptVersion: string;
  retryCount: number;
  schemaValid: boolean;
  inputHash: string;
  error: string | null;
}

export class AIQuotaExceededError extends Error {
  readonly code = "AI_QUOTA_EXCEEDED";
  constructor(
    public feature: AIFeature,
    public usedCount: number,
    public limit: number,
  ) {
    super(
      `Vous avez atteint votre limite mensuelle de générations IA (${usedCount}/${limit}).`,
    );
    this.name = "AIQuotaExceededError";
  }
}

export class AIGenerationError extends Error {
  readonly code = "AI_GENERATION_FAILED";
  constructor(
    message: string,
    public feature: AIFeature,
    public cause?: unknown,
    public rawText?: string,
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}
