-- Per-criterion eval scores + notes on ai_generations.
-- Lets the admin dashboard rate generations against a fixed rubric and track
-- quality over time as prompts/models change.
-- NOTE: superseded by migration 011 (moved to a separate ai_evaluations table).

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

-- Indexes

-- List rated generations newest first
CREATE INDEX IF NOT EXISTS idx_ai_gen_evaluated_at
  ON ai_generations (evaluated_at DESC)
  WHERE evaluated_at IS NOT NULL;

-- Surface lowest-quality generations per criterion
CREATE INDEX IF NOT EXISTS idx_ai_gen_eval_pedagogy
  ON ai_generations (eval_pedagogical_quality, created_at DESC)
  WHERE eval_pedagogical_quality IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_gen_eval_cefr
  ON ai_generations (eval_cefr_alignment, created_at DESC)
  WHERE eval_cefr_alignment IS NOT NULL;
