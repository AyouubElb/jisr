-- ============================================================================
-- Migration: tighten ownership model — `instructor_students` + `profiles` SELECT
--
-- Context:
--   `instructor_students` exists (since 011) and is populated by the
--   create_student_profile_and_enroll RPC (013), but it has RLS ON with
--   ZERO policies — so clients can never read it. Meanwhile `profiles`
--   SELECT was open to every authenticated user, which meant any instructor
--   could see every other instructor's students in the "pick a student"
--   dropdown.
--
-- This migration:
--   1. Backfills instructor_students from historical enrollments
--   2. Adds SELECT + DELETE policies to instructor_students
--   3. Replaces profiles SELECT policies with a scoped version:
--        self + admins + my students (as instructor) + my instructors (as student)
-- ============================================================================

-- ─── 1. BACKFILL ─────────────────────────────────────────────────────────────
-- Every (instructor → student) pair implied by existing enrollments becomes
-- an ownership row. Safe because the RPC uses ON CONFLICT DO NOTHING.
INSERT INTO instructor_students (instructor_id, student_id)
SELECT DISTINCT c.instructor_id, e.student_id
FROM enrollments e
JOIN courses c ON c.id = e.course_id
ON CONFLICT DO NOTHING;

-- ─── 2. instructor_students policies ─────────────────────────────────────────
-- SELECT: instructor sees rows where they own the student; student sees
-- rows where they are the student (so a student can discover their teachers).
CREATE POLICY instructor_students_select_own ON instructor_students
  FOR SELECT
  TO authenticated
  USING (instructor_id = auth.uid() OR student_id = auth.uid());

-- DELETE: only the instructor can remove a student from their roster.
CREATE POLICY instructor_students_delete_own ON instructor_students
  FOR DELETE
  TO authenticated
  USING (instructor_id = auth.uid());

-- Admin escape hatch — read everything (matches profile/course admin policies).
CREATE POLICY instructor_students_select_admin ON instructor_students
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Note: no INSERT policy on purpose. All inserts go through the
-- create_student_profile_and_enroll RPC (service-role, bypasses RLS).

-- ─── 3. Tighten profiles SELECT ──────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_select_authenticated ON profiles;
DROP POLICY IF EXISTS profiles_select_admin ON profiles;

-- Single scoped SELECT policy:
--   - self                                      (always)
--   - admins                                    (is_admin())
--   - instructors → their students              (via instructor_students)
--   - students → their instructors              (via enrollments → courses)
CREATE POLICY profiles_select_scoped ON profiles
  FOR SELECT
  TO authenticated
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
    )
  );
