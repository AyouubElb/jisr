import { MODELS, type ModelKey } from "./constants";
import type { AIUsage } from "./types";

/**
 * Compute cost in US cents for a single generation. Uses provider pricing
 * from `MODELS`. Cache-read tokens are billed at the cached rate; the rest
 * of the input uses the standard input rate.
 */
export const computeCostCents = (modelKey: ModelKey, usage: AIUsage): number => {
  const config = MODELS[modelKey];
  const inputTokens = usage.inputTokens ?? 0;
  const cacheReadTokens = usage.cacheReadTokens ?? 0;
  const uncachedInput = Math.max(inputTokens - cacheReadTokens, 0);
  const outputTokens = usage.outputTokens ?? 0;

  const inputDollars = (uncachedInput / 1_000_000) * config.inputCostPerMTokens;
  const cacheDollars =
    (cacheReadTokens / 1_000_000) * config.cacheReadCostPerMTokens;
  const outputDollars = (outputTokens / 1_000_000) * config.outputCostPerMTokens;

  return Number(((inputDollars + cacheDollars + outputDollars) * 100).toFixed(4));
};
