-- ============================================================================
-- Migration: add missing UPDATE policy on enrollments
--
-- Bug: migration 017 introduced soft-remove via `removed_at`, but the
-- enrollments table never had an UPDATE policy. With RLS enabled and no
-- UPDATE policy, the UPDATE call silently affects 0 rows (no error).
-- Result: removeStudent does nothing; addStudent's reactivate path does
-- nothing; the student stays in whatever state they were in.
--
-- Fix: allow the course's instructor to UPDATE rows in their own enrollments.
-- Both USING (which row can be targeted) and WITH CHECK (what the new row
-- must look like) are gated by course ownership — so an instructor cannot
-- move an enrollment between courses or change its student_id.
-- ============================================================================

DROP POLICY IF EXISTS enrollments_update_instructor ON enrollments;

CREATE POLICY enrollments_update_instructor ON enrollments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = enrollments.course_id
        AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = enrollments.course_id
        AND c.instructor_id = auth.uid()
    )
  );
