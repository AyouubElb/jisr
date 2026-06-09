-- Missing UPDATE policy on enrollments.
--
-- Migration 017 introduced soft-remove via `removed_at`, but enrollments had
-- no UPDATE policy. With RLS on and no UPDATE policy, the UPDATE silently
-- affected 0 rows — removeStudent and the reactivate path both no-op'd.
--
-- Fix: instructor of the course can UPDATE rows in their own enrollments.
-- Both USING and WITH CHECK gate on course ownership, so an instructor cannot
-- move an enrollment between courses or change student_id.

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
