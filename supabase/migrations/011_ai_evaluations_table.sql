-- ============================================================================
-- Migration: switch eval storage from columns on ai_generations to a separate
-- ai_evaluations table.
--
-- Why:
--   - Each AI agent (quiz_gen, free_text_grade, lesson_outline...) needs its
--     own rubric. Hardcoding criterion columns on ai_generations doesn't scale.
--   - Multiple raters per generation later (you, an instructor, an LLM-judge)
--     each need their own row.
--   - Versioned rubrics (rubric_key e.g. 'quiz_gen_v1') let us evolve criteria
--     without invalidating prior evals.
--
-- Shape:
--   - One row per (generation, rubric, evaluator). Upsert on those.
--   - `scores` is JSONB so adding/removing criteria is a code change, not a
--     migration.
--   - Rubric definitions live in src/lib/ai/eval/rubrics.ts. The DB stores
--     only a key + the scores; the app validates against the rubric on write.
--
-- Run in Supabase Dashboard -> SQL Editor.
-- ============================================================================

-- 1. Drop the old eval columns (no rated rows yet — safe).
ALTER TABLE ai_generations
  DROP COLUMN IF EXISTS eval_cefr_alignment,
  DROP COLUMN IF EXISTS eval_instruction_following,
  DROP COLUMN IF EXISTS eval_pedagogical_quality,
  DROP COLUMN IF EXISTS eval_language_correctness,
  DROP COLUMN IF EXISTS eval_notes,
  DROP COLUMN IF EXISTS evaluated_at,
  DROP COLUMN IF EXISTS evaluated_by;

DROP INDEX IF EXISTS idx_ai_gen_evaluated_at;
DROP INDEX IF EXISTS idx_ai_gen_eval_pedagogy;
DROP INDEX IF EXISTS idx_ai_gen_eval_cefr;

-- 2. The new table.
CREATE TABLE IF NOT EXISTS ai_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  generation_id UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,

  evaluator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  evaluator_type TEXT NOT NULL DEFAULT 'human'
    CHECK (evaluator_type IN ('human', 'llm_judge')),

  -- Versioned rubric identifier (e.g. 'quiz_gen_v1'). Source of truth for the
  -- shape of `scores` lives in src/lib/ai/eval/rubrics.ts.
  rubric_key TEXT NOT NULL,

  -- Per-criterion scores. Shape depends on rubric_key.
  -- Example for quiz_gen_v1:
  --   { "cefr_alignment": 4, "instruction_following": 5,
  --     "pedagogical_quality": 3, "language_correctness": true }
  scores JSONB NOT NULL,

  notes TEXT,

  -- One human evaluation per (generation, rubric). LLM-judge can have many
  -- (different judge prompt versions), so we include evaluator_type in the key.
  UNIQUE (generation_id, rubric_key, evaluator_id, evaluator_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_evaluations_generation
  ON ai_evaluations (generation_id);

CREATE INDEX IF NOT EXISTS idx_ai_evaluations_rubric_created
  ON ai_evaluations (rubric_key, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION ai_evaluations_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_evaluations_updated_at ON ai_evaluations;
CREATE TRIGGER trg_ai_evaluations_updated_at
  BEFORE UPDATE ON ai_evaluations
  FOR EACH ROW EXECUTE FUNCTION ai_evaluations_set_updated_at();

-- 3. RLS — admin-only. Reuses profiles.role check.
ALTER TABLE ai_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_evaluations_select_admin"
  ON ai_evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "ai_evaluations_insert_admin"
  ON ai_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "ai_evaluations_update_admin"
  ON ai_evaluations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "ai_evaluations_delete_admin"
  ON ai_evaluations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 4. Admins also need to read every ai_generations row for the dashboard.
-- Existing policy is owner-only; add a read-all for admins.
CREATE POLICY "ai_generations_select_admin"
  ON ai_generations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
