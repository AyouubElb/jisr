import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { DEFAULT_TIER, TIER_QUOTAS, type Tier } from "./constants";
import { AIQuotaExceededError, type AIFeature } from "./types";
import { countGenerationsThisMonth } from "./telemetry";

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
 * Throws AIQuotaExceededError if the user is over limit this month.
 * Safe to call before every LLM invocation — one COUNT query is cheap.
 */
export const assertQuota = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: AIFeature,
): Promise<{ used: number; limit: number; tier: Tier }> => {
  const tier = await getUserTier(supabase, userId);
  const limit = TIER_QUOTAS[tier][feature];
  const used = await countGenerationsThisMonth(supabase, userId, feature);

  if (used >= limit) {
    throw new AIQuotaExceededError(feature, used, limit);
  }
  return { used, limit, tier };
};
