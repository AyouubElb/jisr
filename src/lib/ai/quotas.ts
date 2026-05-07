import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  DEFAULT_TIER,
  TIER_COST_BUDGET_CENTS,
  TIER_QUOTAS,
  type Tier,
} from "./constants";
import {
  AICostBudgetExceededError,
  AIQuotaExceededError,
  type AIFeature,
} from "./types";
import {
  countGenerationsThisMonth,
  sumCostCentsThisMonth,
} from "./telemetry";

// TODO: relocate to lib/services/billing/ during the next AI route refactor.
// See docs/ARCHITECTURE.md — this enforces tier rules and belongs under services.

/**
 * Resolve the user's tier. Today there is no `tier` column on `profiles` —
 * everyone falls back to DEFAULT_TIER (studio). When pricing ships, read
 * from profiles.tier or subscriptions and adjust here only.
 */
export const getUserTier = async (
  _supabase: SupabaseClient<Database>,
  _userId: string,
): Promise<Tier> => {
  return DEFAULT_TIER;
};

/**
 * Throws if the user is over their per-feature count limit OR over their
 * monthly $-budget. Both checks run before every LLM call. Cost-budget
 * protects against per-call spikes that count limits don't catch.
 */
export const assertQuota = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: AIFeature,
): Promise<{
  used: number;
  limit: number;
  tier: Tier;
  usedCents: number;
  budgetCents: number;
}> => {
  const tier = await getUserTier(supabase, userId);
  const limit = TIER_QUOTAS[tier][feature];
  const budgetCents = TIER_COST_BUDGET_CENTS[tier];

  const [used, usedCents] = await Promise.all([
    countGenerationsThisMonth(supabase, userId, feature),
    sumCostCentsThisMonth(supabase, userId),
  ]);

  if (used >= limit) {
    throw new AIQuotaExceededError(feature, used, limit);
  }
  if (usedCents >= budgetCents) {
    throw new AICostBudgetExceededError(usedCents, budgetCents);
  }

  return { used, limit, tier, usedCents, budgetCents };
};

export type FeatureUsage = { used: number; limit: number };

export interface MonthlyUsageSummary {
  tier: Tier;
  usedCents: number;
  budgetCents: number;
  percent: number; // 0–100, capped
  byFeature: Record<AIFeature, FeatureUsage>;
}

// Read-only summary for the settings UI. Never throws on quota — just reports.
export const getMonthlyUsage = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<MonthlyUsageSummary> => {
  const tier = await getUserTier(supabase, userId);
  const budgetCents = TIER_COST_BUDGET_CENTS[tier];

  const features = Object.keys(TIER_QUOTAS[tier]) as AIFeature[];
  const [usedCents, ...counts] = await Promise.all([
    sumCostCentsThisMonth(supabase, userId),
    ...features.map((f) => countGenerationsThisMonth(supabase, userId, f)),
  ]);

  const byFeature = features.reduce<Record<AIFeature, FeatureUsage>>(
    (acc, feature, i) => {
      acc[feature] = { used: counts[i] ?? 0, limit: TIER_QUOTAS[tier][feature] };
      return acc;
    },
    {} as Record<AIFeature, FeatureUsage>,
  );

  const percent =
    budgetCents > 0
      ? Math.min(100, Math.round((usedCents / budgetCents) * 100))
      : 0;

  return { tier, usedCents, budgetCents, percent, byFeature };
};
