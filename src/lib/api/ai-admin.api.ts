import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";

type AIGenerationRow = Database["public"]["Tables"]["ai_generations"]["Row"];
type AIEvaluationRow = Database["public"]["Tables"]["ai_evaluations"]["Row"];
type AIEvaluationInsert =
  Database["public"]["Tables"]["ai_evaluations"]["Insert"];

export interface AIGenerationListItem {
  id: AIGenerationRow["id"];
  created_at: AIGenerationRow["created_at"];
  feature: AIGenerationRow["feature"];
  model: AIGenerationRow["model"];
  provider: AIGenerationRow["provider"];
  schema_valid: AIGenerationRow["schema_valid"];
  cost_cents: AIGenerationRow["cost_cents"];
  latency_ms: AIGenerationRow["latency_ms"];
  instructor_accepted: AIGenerationRow["instructor_accepted"];
  instructor_edited: AIGenerationRow["instructor_edited"];
  instructor_rejected: AIGenerationRow["instructor_rejected"];
  output_quiz_id: AIGenerationRow["output_quiz_id"];
  error: AIGenerationRow["error"];
  has_evaluation: boolean;
  user_id: AIGenerationRow["user_id"];
  user_full_name: string | null;
  /**
   * Derived from output.model_output.title (quiz_gen) or
   * input_context.instruction (quiz_edit). Null for rows where neither
   * is present (errored generations).
   */
  title: string | null;
}

export interface AIGenerationListFilters {
  feature?: string;
  model?: string;
  onlyUnrated?: boolean;
  onlyErrors?: boolean;
  limit?: number;
}

export interface UpsertEvaluationInput {
  generationId: string;
  rubricKey: string;
  scores: Record<string, number | boolean>;
  notes?: string | null;
}

export const aiAdminApi = {
  listGenerations: async (
    filters: AIGenerationListFilters = {},
  ): Promise<AIGenerationListItem[]> => {
    const supabase = createClient();
    let q = supabase
      .from("ai_generations")
      .select(
        "id, created_at, feature, model, provider, schema_valid, cost_cents, latency_ms, instructor_accepted, instructor_edited, instructor_rejected, output_quiz_id, error, output, input_context, user_id, profiles:user_id(full_name), ai_evaluations(id)",
      )
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 100);

    if (filters.feature) q = q.eq("feature", filters.feature);
    if (filters.model) q = q.eq("model", filters.model);
    if (filters.onlyErrors) q = q.not("error", "is", null);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []).map((r) => {
      const evals = (r as unknown as { ai_evaluations: { id: string }[] })
        .ai_evaluations;

      // Derive a human-readable title for the list view. quiz_gen rows put
      // the AI-generated title at output.model_output.title. quiz_edit rows
      // put the user instruction at input_context.instruction.
      const out = r.output as Record<string, unknown> | null;
      const modelOutput = (out?.model_output ?? null) as
        | Record<string, unknown>
        | null;
      const inCtx = r.input_context as Record<string, unknown> | null;
      const title =
        (typeof modelOutput?.title === "string" ? modelOutput.title : null) ??
        (typeof inCtx?.instruction === "string" ? inCtx.instruction : null) ??
        null;

      const profile = (r as unknown as { profiles: { full_name: string | null } | null })
        .profiles;

      return {
        id: r.id,
        created_at: r.created_at,
        feature: r.feature,
        model: r.model,
        provider: r.provider,
        schema_valid: r.schema_valid,
        cost_cents: r.cost_cents,
        latency_ms: r.latency_ms,
        instructor_accepted: r.instructor_accepted,
        instructor_edited: r.instructor_edited,
        instructor_rejected: r.instructor_rejected,
        output_quiz_id: r.output_quiz_id,
        error: r.error,
        has_evaluation: Array.isArray(evals) && evals.length > 0,
        user_id: r.user_id,
        user_full_name: profile?.full_name ?? null,
        title,
      };
    });

    return filters.onlyUnrated ? rows.filter((r) => !r.has_evaluation) : rows;
  },

  getGeneration: async (id: string): Promise<AIGenerationRow> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_generations")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  // Returns both human and LLM rows; UI shows `human ?? llm`.
  getEvaluations: async (
    generationId: string,
    rubricKey: string,
  ): Promise<{ human: AIEvaluationRow | null; llm: AIEvaluationRow | null }> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ai_evaluations")
      .select("*")
      .eq("generation_id", generationId)
      .eq("rubric_key", rubricKey)
      .in("evaluator_type", ["human", "llm_judge"]);
    if (error) throw error;

    const rows = data ?? [];
    return {
      human: rows.find((r) => r.evaluator_type === "human") ?? null,
      llm: rows.find((r) => r.evaluator_type === "llm_judge") ?? null,
    };
  },

  upsertEvaluation: async (
    input: UpsertEvaluationInput,
  ): Promise<AIEvaluationRow> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const payload: AIEvaluationInsert = {
      generation_id: input.generationId,
      rubric_key: input.rubricKey,
      evaluator_id: user.id,
      evaluator_type: "human",
      scores: input.scores as Record<string, unknown>,
      notes: input.notes ?? null,
    };

    const { data, error } = await supabase
      .from("ai_evaluations")
      .upsert(payload, {
        onConflict: "generation_id,rubric_key,evaluator_id,evaluator_type",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
