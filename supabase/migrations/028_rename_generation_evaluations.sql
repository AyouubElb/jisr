-- ============================================================================
-- Migration 028: rename ai_evaluations -> generation_evaluations + agreement view.
--
-- Why the rename: the table now holds BOTH human and llm_judge rows. "ai_"
-- implied the AI was the evaluator. The table is about evaluations of a
-- generation, by any evaluator. Tall shape (one row per evaluator) is kept.
--
-- The new view generation_eval_agreement joins the human row and the llm_judge
-- row per (generation, rubric) so the admin can see them side by side and read
-- a derived agreement signal. Agreement is computed, never stored.
--
-- Run in Supabase Dashboard -> SQL Editor.
-- ============================================================================

-- 1. Rename the table. Postgres rewires the FKs and the PK automatically; only
--    explicitly-named constraints/indexes/triggers/policies need renaming.
ALTER TABLE IF EXISTS ai_evaluations RENAME TO generation_evaluations;

-- 2. Rename indexes.
ALTER INDEX IF EXISTS idx_ai_evaluations_generation
  RENAME TO idx_generation_evaluations_generation;
ALTER INDEX IF EXISTS idx_ai_evaluations_rubric_created
  RENAME TO idx_generation_evaluations_rubric_created;

-- 3. Rename the updated_at trigger function + trigger.
--    ALTER FUNCTION has no IF EXISTS — guard with a DO block instead.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'ai_evaluations_set_updated_at'
  ) THEN
    ALTER FUNCTION ai_evaluations_set_updated_at()
      RENAME TO generation_evaluations_set_updated_at;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_ai_evaluations_updated_at ON generation_evaluations;
CREATE TRIGGER trg_generation_evaluations_updated_at
  BEFORE UPDATE ON generation_evaluations
  FOR EACH ROW EXECUTE FUNCTION generation_evaluations_set_updated_at();

-- 4. Recreate policies under the new name (policy names don't auto-follow a
--    table rename in a readable way — drop + recreate keeps them legible).
DROP POLICY IF EXISTS "ai_evaluations_select_admin" ON generation_evaluations;
DROP POLICY IF EXISTS "ai_evaluations_insert_admin" ON generation_evaluations;
DROP POLICY IF EXISTS "ai_evaluations_update_admin" ON generation_evaluations;
DROP POLICY IF EXISTS "ai_evaluations_delete_admin" ON generation_evaluations;
DROP POLICY IF EXISTS "ai_evaluations_insert_llm_judge_owner" ON generation_evaluations;

CREATE POLICY "generation_evaluations_select_admin"
  ON generation_evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "generation_evaluations_insert_admin"
  ON generation_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "generation_evaluations_update_admin"
  ON generation_evaluations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "generation_evaluations_delete_admin"
  ON generation_evaluations FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- The fire-and-forget judge runs as the generation owner (an instructor), so it
-- needs a scoped INSERT path for llm_judge rows only.
CREATE POLICY "generation_evaluations_insert_llm_judge_owner"
  ON generation_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    evaluator_type = 'llm_judge'
    AND evaluator_id IS NULL
    AND EXISTS (
      SELECT 1 FROM ai_generations g
      WHERE g.id = generation_evaluations.generation_id
        AND g.user_id = auth.uid()
    )
  );

-- 5. Agreement view. One row per (generation, rubric) that has BOTH a human and
--    an llm_judge evaluation. The view exposes both score blobs and notes so the
--    admin UI can render them side by side and compute per-criterion agreement
--    client-side (agreement is rubric-shaped, so we keep it out of SQL).
CREATE OR REPLACE VIEW generation_eval_agreement AS
SELECT
  h.generation_id,
  h.rubric_key,
  h.scores      AS human_scores,
  h.notes       AS human_notes,
  h.evaluator_id AS human_evaluator_id,
  h.updated_at  AS human_updated_at,
  j.scores      AS judge_scores,
  j.notes       AS judge_notes,
  j.updated_at  AS judge_updated_at
FROM generation_evaluations h
JOIN generation_evaluations j
  ON j.generation_id = h.generation_id
 AND j.rubric_key = h.rubric_key
 AND j.evaluator_type = 'llm_judge'
WHERE h.evaluator_type = 'human';

-- Views run with the querying user's RLS, so the admin-only SELECT policy on
-- the base table already gates this view. No extra policy needed.
