-- ============================================================================
-- Migration: drop `exercises` table + add `quizzes.max_attempts`
--
-- Rationale:
--   `exercises` was a duplicate of `lessons` — same content model (title + body),
--   same RLS shape, same UI treatment. Zero behavioral differentiation, 2x the
--   code to maintain. Merged into `lessons` by deletion: instructors label their
--   practice content in the title instead ("Exercice: fill-in-the-blanks").
--
--   `quizzes.max_attempts` adds the first retake-control knob. NULL = unlimited
--   (default). A positive integer caps how many times a student can start an
--   attempt. Enforced client-side in attemptsApi.start() — not a security
--   boundary, just product behavior.
-- ============================================================================

-- ─── 1. Re-wire `materials` to be lesson-only ────────────────────────────────
-- Drop the old policies that reference materials.exercise_id so we can drop
-- the column cleanly.
DROP POLICY IF EXISTS materials_select_enrolled_or_owner ON materials;
DROP POLICY IF EXISTS materials_insert_owner ON materials;
DROP POLICY IF EXISTS materials_update_owner ON materials;
DROP POLICY IF EXISTS materials_delete_owner ON materials;

-- Remove any orphan materials attached to exercises (they'd be meaningless
-- after the exercises table is gone).
DELETE FROM materials WHERE exercise_id IS NOT NULL;

-- Drop the column. Postgres auto-drops the CHECK constraint that references it.
ALTER TABLE materials DROP COLUMN exercise_id;

-- lesson_id is now mandatory.
ALTER TABLE materials ALTER COLUMN lesson_id SET NOT NULL;

-- Re-create materials policies — simpler now (no lesson/exercise branch).
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

-- ─── 2. Drop exercises ───────────────────────────────────────────────────────
-- DROP TABLE cascades to: indexes, RLS policies.
DROP TABLE IF EXISTS exercises;

-- ─── 3. Add quizzes.max_attempts ─────────────────────────────────────────────
ALTER TABLE quizzes ADD COLUMN max_attempts INT;

COMMENT ON COLUMN quizzes.max_attempts IS
  'NULL = unlimited retakes. Positive integer = cap on number of attempts per student.';
