import { google } from "@ai-sdk/google";
import { gateway } from "@ai-sdk/gateway";
import { MODELS, type ModelKey } from "./constants";
import type { AIProvider } from "./types";

// Resolves a model key into a Vercel AI SDK `LanguageModel`.
export const getModel = (key: ModelKey) => {
  const config = MODELS[key];
  if (config.provider === "google") return google(config.modelId);
  if (config.provider === "vercel-gateway") return gateway(config.modelId);
  throw new Error(`Unsupported AI provider: ${String(key)}`);
};

export const getProvider = (key: ModelKey): AIProvider => MODELS[key].provider;
