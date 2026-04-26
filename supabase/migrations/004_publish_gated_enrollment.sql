-- ============================================================================
-- Migration: Publish-gated enrollment
--   Instructors can only enroll students into a course that is already
--   published. Keeps the instructor and student dashboards in sync — a
--   student never sees a "ghost" draft course in their catalog they cannot
--   open from the browse page.
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================================

DROP POLICY IF EXISTS "enrollments_insert_instructor" ON enrollments;

CREATE POLICY "enrollments_insert_instructor"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = enrollments.course_id
        AND c.instructor_id = auth.uid()
        AND c.is_published = true
    )
  );
