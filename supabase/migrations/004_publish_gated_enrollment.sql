-- Publish-gated enrollment: instructors can only enroll students into a published course.
-- Prevents "ghost" draft courses showing up in student catalogs.

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
