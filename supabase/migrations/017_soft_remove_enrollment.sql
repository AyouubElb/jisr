-- ============================================================================
-- Migration: soft-remove model for enrollments + backfill last_active_at
--
-- Why:
--   "Removing a student" used to DELETE the enrollment row, which wiped
--   `last_active_at` (and broke any future "active 3 days ago" badge after
--   re-enroll). Meanwhile attempts/completions/attendance survive — they FK
--   to profiles + content tables, not to enrollments. Result: a re-enrolled
--   student showed "Jamais actif" while their detail page showed years of
--   history. Contradictory.
--
-- Fix: soft-remove. `enrollments.removed_at` set to NOW() instead of DELETE.
-- All access RLS routes through `is_actively_enrolled()` which requires
-- removed_at IS NULL. Re-enroll = clear removed_at; old activity preserved.
--
-- This migration:
--   1. Adds enrollments.removed_at + partial index
--   2. Adds is_actively_enrolled() helper function (single source of truth)
--   3. Updates all enrollment-gated RLS policies to use the helper
--   4. Backfills last_active_at for current NULL rows from historical activity
-- ============================================================================

-- ─── 1. Schema change ──────────────────────────────────────────────────────
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

-- Most queries care about active enrollments only — partial index keeps
-- lookups cheap regardless of historical removal volume.
CREATE INDEX IF NOT EXISTS idx_enrollments_active_student_course
  ON enrollments(student_id, course_id)
  WHERE removed_at IS NULL;

-- ─── 2. Helper function ────────────────────────────────────────────────────
-- One function, one definition of "actively enrolled". Future changes to the
-- soft-remove model only need to update this one place.
CREATE OR REPLACE FUNCTION is_actively_enrolled(p_student_id UUID, p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments
    WHERE student_id = p_student_id
      AND course_id = p_course_id
      AND removed_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION is_actively_enrolled(UUID, UUID) TO authenticated;

-- ─── 3. Update all enrollment-gated policies ───────────────────────────────
-- Using DROP+CREATE instead of ALTER POLICY because some live policies may
-- reference student_is_enrolled() (manual prod change pre-dating this repo)
-- whose definition we don't have. DROP+CREATE is idempotent.

-- profiles: students see instructors of courses they are *actively* enrolled in
DROP POLICY IF EXISTS profiles_select_scoped ON profiles;
CREATE POLICY profiles_select_scoped ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM instructor_students ins
      WHERE ins.instructor_id = auth.uid()
        AND ins.student_id = profiles.id
    )
    OR EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = auth.uid()
        AND c.instructor_id = profiles.id
        AND e.removed_at IS NULL
    )
  );

-- courses
DROP POLICY IF EXISTS courses_select_enrolled_or_own ON courses;
CREATE POLICY courses_select_enrolled_or_own ON courses
  FOR SELECT TO authenticated
  USING (
    instructor_id = auth.uid()
    OR (is_published = TRUE AND is_actively_enrolled(auth.uid(), id))
  );

-- sections
DROP POLICY IF EXISTS sections_select_enrolled_or_owner ON sections;
CREATE POLICY sections_select_enrolled_or_owner ON sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = sections.course_id
        AND (
          c.instructor_id = auth.uid()
          OR is_actively_enrolled(auth.uid(), c.id)
        )
    )
  );

-- lessons
DROP POLICY IF EXISTS lessons_select_enrolled_or_owner ON lessons;
CREATE POLICY lessons_select_enrolled_or_owner ON lessons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses  c ON c.id = s.course_id
      WHERE s.id = lessons.section_id
        AND (
          c.instructor_id = auth.uid()
          OR is_actively_enrolled(auth.uid(), c.id)
        )
    )
  );

-- materials
DROP POLICY IF EXISTS materials_select_enrolled_or_owner ON materials;
CREATE POLICY materials_select_enrolled_or_owner ON materials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN courses  c ON c.id = s.course_id
      WHERE l.id = materials.lesson_id
        AND (
          c.instructor_id = auth.uid()
          OR is_actively_enrolled(auth.uid(), c.id)
        )
    )
  );

-- quizzes
DROP POLICY IF EXISTS quizzes_select_enrolled_or_owner ON quizzes;
CREATE POLICY quizzes_select_enrolled_or_owner ON quizzes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses  c ON c.id = s.course_id
      WHERE s.id = quizzes.section_id
        AND (
          c.instructor_id = auth.uid()
          OR is_actively_enrolled(auth.uid(), c.id)
        )
    )
  );

-- quiz_blocks
DROP POLICY IF EXISTS quiz_blocks_select_enrolled_or_owner ON quiz_blocks;
CREATE POLICY quiz_blocks_select_enrolled_or_owner ON quiz_blocks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes  q
      JOIN sections s ON s.id = q.section_id
      JOIN courses  c ON c.id = s.course_id
      WHERE q.id = quiz_blocks.quiz_id
        AND (
          c.instructor_id = auth.uid()
          OR is_actively_enrolled(auth.uid(), c.id)
        )
    )
  );

-- live_sessions
DROP POLICY IF EXISTS sessions_select_enrolled_or_owner ON live_sessions;
CREATE POLICY sessions_select_enrolled_or_owner ON live_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = live_sessions.course_id
        AND (
          c.instructor_id = auth.uid()
          OR is_actively_enrolled(auth.uid(), c.id)
        )
    )
  );

-- student_attempts: cannot start a new attempt if removed
DROP POLICY IF EXISTS student_attempts_insert_enrolled ON student_attempts;
CREATE POLICY student_attempts_insert_enrolled ON student_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM quizzes  q
      JOIN sections s ON s.id = q.section_id
      WHERE q.id = student_attempts.quiz_id
        AND is_actively_enrolled(auth.uid(), s.course_id)
    )
  );

-- lesson_completions: cannot mark complete if removed
DROP POLICY IF EXISTS lesson_completions_insert_own_if_enrolled ON lesson_completions;
CREATE POLICY lesson_completions_insert_own_if_enrolled ON lesson_completions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      WHERE l.id = lesson_completions.lesson_id
        AND is_actively_enrolled(auth.uid(), s.course_id)
    )
  );

-- course_questions: cannot ask if removed
DROP POLICY IF EXISTS course_questions_insert_enrolled_student ON course_questions;
CREATE POLICY course_questions_insert_enrolled_student ON course_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND is_actively_enrolled(auth.uid(), course_questions.course_id)
  );

-- enrollments_insert_instructor: instructor must own the published course.
-- Reactivation is handled in the API (UPDATE removed_at = NULL on existing
-- soft-removed row), not via INSERT — UNIQUE(student_id, course_id) prevents
-- duplicate INSERT anyway.

-- ─── 4. Backfill last_active_at for current NULL rows ──────────────────────
-- Pulls latest of (quiz submitted, lesson completed, attended session) per
-- (student, course) so the "Actif il y a X jours" badge is accurate after
-- this migration runs — including for the user's existing remove/re-add case.
UPDATE enrollments e
SET last_active_at = sub.activity
FROM (
  SELECT
    e2.id AS enrollment_id,
    GREATEST(
      (SELECT MAX(sa.submitted_at)
       FROM student_attempts sa
       JOIN quizzes  q ON q.id = sa.quiz_id
       JOIN sections s ON s.id = q.section_id
       WHERE sa.student_id = e2.student_id
         AND s.course_id   = e2.course_id
         AND sa.submitted_at IS NOT NULL),
      (SELECT MAX(lc.completed_at)
       FROM lesson_completions lc
       JOIN lessons  l ON l.id = lc.lesson_id
       JOIN sections s ON s.id = l.section_id
       WHERE lc.student_id = e2.student_id
         AND s.course_id   = e2.course_id),
      (SELECT MAX(sa.marked_at)
       FROM session_attendance sa
       JOIN live_sessions ls ON ls.id = sa.session_id
       WHERE sa.student_id = e2.student_id
         AND ls.course_id  = e2.course_id
         AND sa.attended   = TRUE)
    ) AS activity
  FROM enrollments e2
  WHERE e2.last_active_at IS NULL
) sub
WHERE e.id = sub.enrollment_id
  AND sub.activity IS NOT NULL;

COMMENT ON COLUMN enrollments.removed_at IS
  'NULL = active enrollment. NOT NULL = soft-removed (data preserved, access denied via RLS).';
