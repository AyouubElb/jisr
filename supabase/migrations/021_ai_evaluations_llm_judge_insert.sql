-- ============================================================================
-- Migration: allow the LLM judge to insert ai_evaluations rows.
--
-- Context:
--   The fire-and-forget judge in src/lib/ai/generators/quiz-judge.generator.ts
--   runs server-side using the user's authenticated Supabase client. The user
--   is an instructor (not admin), so the existing admin-only INSERT policy
--   blocks the write with:
--     "new row violates row-level security policy for table ai_evaluations"
--
-- Fix:
--   Add a tightly scoped INSERT policy that allows the *owner of the related
--   generation* to insert rows where:
--     - evaluator_type = 'llm_judge'   (cannot fake human evals)
--     - evaluator_id IS NULL           (system-written, not impersonating a user)
--     - generation_id belongs to a generation the caller owns
--
--   SELECT/UPDATE/DELETE remain admin-only — instructors cannot read or modify
--   judge scores. Admin dashboard is the only consumer.
--
-- Run in Supabase Dashboard -> SQL Editor.
-- ============================================================================

CREATE POLICY "ai_evaluations_insert_llm_judge_owner"
  ON ai_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    evaluator_type = 'llm_judge'
    AND evaluator_id IS NULL
    AND EXISTS (
      SELECT 1 FROM ai_generations g
      WHERE g.id = ai_evaluations.generation_id
        AND g.user_id = auth.uid()
    )
  );
