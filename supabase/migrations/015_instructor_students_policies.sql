-- Tighten the ownership model — `instructor_students` policies + scoped `profiles` SELECT.
--
-- `instructor_students` existed (since 011) and was populated by the RPC in 013,
-- but had RLS ON with zero policies — clients could never read it. Meanwhile
-- profiles.SELECT was open to all authenticated users, which leaked every
-- instructor's students into other instructors' "pick a student" dropdowns.
--
-- 1) Backfill instructor_students from enrollments
-- 2) Add SELECT + DELETE policies to instructor_students
-- 3) Replace profiles SELECT with a scoped policy (self + admins + my students + my instructors)

-- 1. Backfill from enrollments. Safe — the RPC uses ON CONFLICT DO NOTHING.
INSERT INTO instructor_students (instructor_id, student_id)
SELECT DISTINCT c.instructor_id, e.student_id
FROM enrollments e
JOIN courses c ON c.id = e.course_id
ON CONFLICT DO NOTHING;

-- 2. instructor_students policies
-- SELECT: instructor sees their students; student sees their instructors.
CREATE POLICY instructor_students_select_own ON instructor_students
  FOR SELECT
  TO authenticated
  USING (instructor_id = auth.uid() OR student_id = auth.uid());

-- DELETE: only the instructor can remove a student from their roster
CREATE POLICY instructor_students_delete_own ON instructor_students
  FOR DELETE
  TO authenticated
  USING (instructor_id = auth.uid());

-- Admin read-all (matches profiles/courses admin policies)
CREATE POLICY instructor_students_select_admin ON instructor_students
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- No INSERT policy on purpose. Inserts go through the RPC in 013 (service-role).

-- 3. Scoped profiles.SELECT
DROP POLICY IF EXISTS profiles_select_authenticated ON profiles;
DROP POLICY IF EXISTS profiles_select_admin ON profiles;

-- Self + admins + instructors→their students + students→their instructors
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
