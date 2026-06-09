-- Let the LLM judge insert ai_evaluations rows.
--
-- The fire-and-forget judge in src/lib/ai/generators/quiz-judge.generator.ts
-- runs server-side under the user's session. Users are instructors (not admins),
-- so the admin-only INSERT policy was blocking the write.
--
-- This adds a tightly scoped INSERT policy: only rows where
-- evaluator_type='llm_judge', evaluator_id IS NULL, and generation_id belongs
-- to a generation the caller owns. SELECT/UPDATE/DELETE remain admin-only.

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
