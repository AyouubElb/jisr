import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { AIFeature, AICallResult } from "./types";

/**
 * Write one row to `ai_generations` per LLM call. Called from every
 * generator (quiz_gen today, grader / intervention next). Never throws —
 * telemetry failure must not break the user-facing action.
 */
export interface LogGenerationArgs<TOutput> {
  supabase: SupabaseClient<Database>;
  userId: string;
  feature: AIFeature;
  inputContext: Record<string, unknown>;
  result: AICallResult<TOutput>;
  outputQuizId?: string | null;
  costCents: number;
  blocksSnapshot?: unknown[];
}

export const logGeneration = async <TOutput>(
  args: LogGenerationArgs<TOutput>,
): Promise<string | null> => {
  const {
    supabase,
    userId,
    feature,
    inputContext,
    result,
    outputQuizId,
    costCents,
    blocksSnapshot,
  } = args;

  const outputPayload: Record<string, unknown> = {
    model_output: result.output as unknown,
  };
  if (blocksSnapshot) outputPayload.blocks_snapshot = blocksSnapshot;

  try {
    const { data, error } = await supabase
      .from("ai_generations")
      .insert({
        user_id: userId,
        feature,
        model: result.model,
        provider: result.provider,
        prompt_version: result.promptVersion,
        input_context: inputContext,
        input_hash: result.inputHash,
        output: outputPayload,
        schema_valid: result.schemaValid,
        retry_count: result.retryCount,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        cache_read_tokens: result.usage.cacheReadTokens,
        latency_ms: result.latencyMs,
        cost_cents: costCents,
        output_quiz_id: outputQuizId ?? null,
        error: result.error,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ai.telemetry] insert failed:", error.message);
      return null;
    }
    return data.id;
  } catch (err) {
    console.error("[ai.telemetry] unexpected error:", err);
    return null;
  }
};

/**
 * Count this user's generations for a feature in the current calendar
 * month. Used by the quota check before calling the LLM.
 */
export const countGenerationsThisMonth = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  feature: AIFeature,
): Promise<number> => {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", start.toISOString());

  if (error) {
    console.error("[ai.telemetry] count failed:", error.message);
    return 0;
  }
  return count ?? 0;
};
