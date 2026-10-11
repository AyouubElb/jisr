import { defaultSettingsMiddleware, wrapLanguageModel } from "ai";
import { google } from "@ai-sdk/google";
import { gateway } from "@ai-sdk/gateway";
import { openai } from "@ai-sdk/openai";
import { MODELS, type ModelKey } from "./constants";
import type { AIProvider } from "./types";

// TODO: enable Anthropic prompt caching on iterative flows when monthly
// Claude spend exceeds $20 OR a single user makes 10+ edits per session.
// Pass providerOptions.anthropic.cacheControl on quiz_edit + lesson_edit
// generateObject calls. Skip for one-shot flows (quiz_gen, quiz_judge):
// cache write fee outweighs savings when prefix is rarely reused.

// No reasoning (keeps per-call temperature); non-strict JSON fits our zod schemas.
const openaiDefaults = defaultSettingsMiddleware({
  settings: {
    providerOptions: { openai: { reasoningEffort: "none", strictJsonSchema: false } },
  },
});

// Resolves a model key into a Vercel AI SDK `LanguageModel`.
export const getModel = (key: ModelKey) => {
  const config = MODELS[key];
  if (config.provider === "google") return google(config.modelId);
  if (config.provider === "openai") {
    return wrapLanguageModel({ model: openai(config.modelId), middleware: openaiDefaults });
  }
  if (config.provider === "vercel-gateway") return gateway(config.modelId);
  throw new Error(`Unsupported AI provider: ${String(key)}`);
};

export const getProvider = (key: ModelKey): AIProvider => MODELS[key].provider;
