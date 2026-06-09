-- Admin read-all on lessons.
--
-- The "Instructor request" panel on /admin/ai/generations/[id] resolves source
-- lesson titles from input_context.lessonIds. The existing lessons SELECT
-- policy only allows the course owner or enrolled students — so admins viewing
-- another instructor's generation saw "—" for source lessons.
-- Mirrors the admin read-all already in place for ai_generations + generation_evaluations.

CREATE POLICY "lessons_select_admin"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
