-- Drop `exercises` table + add `quizzes.max_attempts`.
--
-- `exercises` duplicated `lessons` (same fields, same RLS, same UI) with zero
-- behavioral difference, so it's merged in: instructors label practice content
-- in the lesson title instead. `quizzes.max_attempts` adds a retake cap:
-- NULL = unlimited; positive integer = max starts per student.

-- 1. Re-wire `materials` to be lesson-only
-- Drop old policies that reference materials.exercise_id so the column can go
DROP POLICY IF EXISTS materials_select_enrolled_or_owner ON materials;
DROP POLICY IF EXISTS materials_insert_owner ON materials;
DROP POLICY IF EXISTS materials_update_owner ON materials;
DROP POLICY IF EXISTS materials_delete_owner ON materials;

-- Delete orphan materials attached to exercises
DELETE FROM materials WHERE exercise_id IS NOT NULL;

-- Drop the column (Postgres auto-drops the CHECK constraint that references it)
ALTER TABLE materials DROP COLUMN exercise_id;

ALTER TABLE materials ALTER COLUMN lesson_id SET NOT NULL;

-- Re-create materials policies, simpler now (no XOR branching)
CREATE POLICY "materials_select_enrolled_or_owner" ON materials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN courses  c ON c.id = s.course_id
      WHERE l.id = materials.lesson_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = c.id AND e.student_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "materials_insert_owner" ON materials
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN courses  c ON c.id = s.course_id
      WHERE l.id = materials.lesson_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "materials_update_owner" ON materials
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN courses  c ON c.id = s.course_id
      WHERE l.id = materials.lesson_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "materials_delete_owner" ON materials
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN courses  c ON c.id = s.course_id
      WHERE l.id = materials.lesson_id AND c.instructor_id = auth.uid()
    )
  );

-- 2. Drop exercises (cascades to its indexes + policies)
DROP TABLE IF EXISTS exercises;

-- 3. quizzes.max_attempts
ALTER TABLE quizzes ADD COLUMN max_attempts INT;

COMMENT ON COLUMN quizzes.max_attempts IS
  'NULL = unlimited retakes. Positive integer = max attempts per student.';
