-- ============================================================================
-- Migration 029: let admins read every lesson (for the AI generation detail
-- page).
--
-- Context:
--   The "Instructor request" panel on /admin/ai/generations/[id] resolves the
--   source lesson titles from input_context.lessonIds. The existing lessons
--   SELECT policy only allows the course owner or enrolled students, so an
--   admin viewing another instructor's generation gets an empty result and the
--   "Source lessons" row shows "—".
--
-- Fix:
--   Add an admin-only SELECT-all policy on lessons, mirroring the
--   ai_generations_select_admin policy added in migration 011. Admins already
--   have read-all on ai_generations + generation_evaluations; this completes
--   the picture so the detail page can render the lesson context.
--
-- Run in Supabase Dashboard -> SQL Editor.
-- ============================================================================

CREATE POLICY "lessons_select_admin"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
