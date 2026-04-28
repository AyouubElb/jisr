import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { gateway } from "@ai-sdk/gateway";
import { MODELS, type ModelKey } from "./constants";
import type { AIProvider } from "./types";

/**
 * Resolve a model key into a Vercel AI SDK `LanguageModel`. All generators
 * go through this helper so swapping providers (or A/B testing) is one
 * change in one place.
 */
export const getModel = (key: ModelKey) => {
  const config = MODELS[key];
  if (config.provider === "google") return google(config.modelId);
  if (config.provider === "anthropic") return anthropic(config.modelId);
  if (config.provider === "vercel-gateway") return gateway(config.modelId);
  throw new Error(`Unsupported AI provider: ${String(key)}`);
};

export const getProvider = (key: ModelKey): AIProvider => MODELS[key].provider;
