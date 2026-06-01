import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";

type AIGenerationRow = Database["public"]["Tables"]["ai_generations"]["Row"];
type AIEvaluationRow =
  Database["public"]["Tables"]["generation_evaluations"]["Row"];
type AIEvaluationInsert =
  Database["public"]["Tables"]["generation_evaluations"]["Insert"];

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
   * Derived per-feature:
   *  · quiz_gen   → output.model_output.title (or output.title for legacy rows)
   *  · lesson_gen → input_context.lessonTitle, falling back to scope summary
   *  · quiz_edit  → input_context.instruction
   * Null when nothing usable is present (errored generations).
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

export interface AgreementRow {
  generation_id: string;
  rubric_key: string;
  human_scores: Record<string, unknown>;
  judge_scores: Record<string, unknown>;
  human_notes: string | null;
  judge_notes: string | null;
}

export interface CalibrationSummary {
  pairCount: number;
  // Per-criterion agreement %: of pairs where both scored a criterion, share
  // that "match" (scale: within 1 point; boolean: identical).
  perCriterion: Record<string, { agree: number; total: number }>;
  // Overall agreement = mean of per-criterion agreement, weighted by total.
  overallPct: number | null;
  rows: AgreementRow[];
}

// A scale_1_5 pair "agrees" within 1 point; a boolean pair must be identical.
const scoresAgree = (h: unknown, j: unknown): boolean | null => {
  if (typeof h === "boolean" && typeof j === "boolean") return h === j;
  if (typeof h === "number" && typeof j === "number") {
    return Math.abs(h - j) <= 1;
  }
  return null;
};

export const aiAdminApi = {
  listGenerations: async (
    filters: AIGenerationListFilters = {},
  ): Promise<AIGenerationListItem[]> => {
    const supabase = createClient();
    let q = supabase
      .from("ai_generations")
      .select(
        "id, created_at, feature, model, provider, schema_valid, cost_cents, latency_ms, instructor_accepted, instructor_edited, instructor_rejected, output_quiz_id, error, output, input_context, user_id, profiles:user_id(full_name), generation_evaluations(id)",
      )
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 100);

    // Scope at the Supabase query: only fetch generation agents the admin
    // list cares about. Judges, TTS, grading rows stay out of the DB result.
    const LISTED_FEATURES = ["quiz_gen", "lesson_gen"] as const;
    if (filters.feature) {
      q = q.eq("feature", filters.feature);
    } else {
      q = q.in("feature", LISTED_FEATURES as unknown as string[]);
    }
    if (filters.model) q = q.eq("model", filters.model);
    if (filters.onlyErrors) q = q.not("error", "is", null);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []).map((r) => {
      const evals = (
        r as unknown as { generation_evaluations: { id: string }[] }
      ).generation_evaluations;

      // Derive a human-readable title for the list view.
      //   quiz_gen   → output.model_output.title (current) or output.title (legacy)
      //   lesson_gen → input_context.lessonTitle (current) or input_context.scope (legacy)
      //   quiz_edit  → input_context.instruction
      const out = r.output as Record<string, unknown> | null;
      const modelOutput = (out?.model_output ?? out ?? null) as
        | Record<string, unknown>
        | null;
      const inCtx = (r.input_context ?? {}) as Record<string, unknown>;
      const title =
        (r.feature === "lesson_gen"
          ? (typeof inCtx.lessonTitle === "string" ? inCtx.lessonTitle : null) ??
            (typeof inCtx.scope === "string" ? inCtx.scope : null)
          : null) ??
        (typeof modelOutput?.title === "string" ? modelOutput.title : null) ??
        (typeof inCtx.instruction === "string" ? inCtx.instruction : null) ??
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
      .from("generation_evaluations")
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

  /**
   * Calibration summary for a rubric: every generation that has BOTH a human
   * and a judge eval, plus per-criterion agreement %. This is the number that
   * tells us whether the judge is trustworthy enough to gate on (>80%).
   */
  getCalibration: async (rubricKey: string): Promise<CalibrationSummary> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("generation_eval_agreement")
      .select(
        "generation_id, rubric_key, human_scores, judge_scores, human_notes, judge_notes",
      )
      .eq("rubric_key", rubricKey);
    if (error) throw error;

    const rows = (data ?? []) as AgreementRow[];
    const perCriterion: Record<string, { agree: number; total: number }> = {};

    for (const row of rows) {
      const keys = new Set([
        ...Object.keys(row.human_scores ?? {}),
        ...Object.keys(row.judge_scores ?? {}),
      ]);
      for (const k of keys) {
        const verdict = scoresAgree(
          (row.human_scores as Record<string, unknown>)?.[k],
          (row.judge_scores as Record<string, unknown>)?.[k],
        );
        if (verdict === null) continue; // one side didn't score it (e.g. nullable)
        perCriterion[k] ??= { agree: 0, total: 0 };
        perCriterion[k].total += 1;
        if (verdict) perCriterion[k].agree += 1;
      }
    }

    let agreeSum = 0;
    let totalSum = 0;
    for (const c of Object.values(perCriterion)) {
      agreeSum += c.agree;
      totalSum += c.total;
    }
    const overallPct =
      totalSum > 0 ? Math.round((agreeSum / totalSum) * 100) : null;

    return { pairCount: rows.length, perCriterion, overallPct, rows };
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
      .from("generation_evaluations")
      .upsert(payload, {
        onConflict: "generation_id,rubric_key,evaluator_id,evaluator_type",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
