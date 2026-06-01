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
  "quiz_judge",
  "free_text_grade",
  "voice_grade",
  "intervention_suggest",
  "lesson_outline",
  "lesson_edit",
  "lesson_gen",
  "lesson_judge",
  "lesson_tts",
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

export class AICostBudgetExceededError extends Error {
  readonly code = "AI_COST_BUDGET_EXCEEDED";
  constructor(
    public usedCents: number,
    public budgetCents: number,
  ) {
    const usedDollars = (usedCents / 100).toFixed(2);
    const budgetDollars = (budgetCents / 100).toFixed(2);
    super(
      `Vous avez atteint votre budget mensuel IA ($${usedDollars}/$${budgetDollars}).`,
    );
    this.name = "AICostBudgetExceededError";
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
