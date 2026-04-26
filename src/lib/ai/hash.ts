import { createHash } from "node:crypto";

/**
 * SHA-256 of the assembled prompt. Stored per generation so we can dedup
 * identical calls and measure cache hit rate over time.
 */
export const hashPromptInput = (input: string): string =>
  createHash("sha256").update(input).digest("hex");
