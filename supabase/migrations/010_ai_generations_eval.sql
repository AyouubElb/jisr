-- ============================================================================
-- Migration: AI generations evaluation columns
--
-- Adds per-criterion eval scores + free-form notes to ai_generations so the
-- (future) admin dashboard can rate generations against a fixed rubric and
-- track quality over time as we change prompts/models.
--
-- Rubric (4 criteria) is documented in docs/AI-EVAL-CRITERIA.md. Keep that
-- file and these columns in sync.
--
-- Read access is admin-only (handled via a separate admin role check in the
-- Route handler — RLS here just gates writes to the owning user OR an admin).
--
-- Run this in Supabase Dashboard -> SQL Editor.
-- ============================================================================

ALTER TABLE ai_generations
  ADD COLUMN IF NOT EXISTS eval_cefr_alignment SMALLINT
    CHECK (eval_cefr_alignment IS NULL OR eval_cefr_alignment BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS eval_instruction_following SMALLINT
    CHECK (eval_instruction_following IS NULL OR eval_instruction_following BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS eval_pedagogical_quality SMALLINT
    CHECK (eval_pedagogical_quality IS NULL OR eval_pedagogical_quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS eval_language_correctness BOOLEAN,
  ADD COLUMN IF NOT EXISTS eval_notes TEXT,
  ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evaluated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

-- Admin dashboard: list rated generations newest first
CREATE INDEX IF NOT EXISTS idx_ai_gen_evaluated_at
  ON ai_generations (evaluated_at DESC)
  WHERE evaluated_at IS NOT NULL;

-- Admin dashboard: surface lowest-quality generations per criterion
CREATE INDEX IF NOT EXISTS idx_ai_gen_eval_pedagogy
  ON ai_generations (eval_pedagogical_quality, created_at DESC)
  WHERE eval_pedagogical_quality IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_gen_eval_cefr
  ON ai_generations (eval_cefr_alignment, created_at DESC)
  WHERE eval_cefr_alignment IS NOT NULL;
