-- Atomic: upsert student profile + instructor_students link + optional enrollment.
-- Called by the /api/students/create route (service-role context) after auth.admin.createUser.

CREATE OR REPLACE FUNCTION create_student_profile_and_enroll(
  p_student_id   uuid,
  p_full_name    text,
  p_level        text,
  p_instructor_id uuid,
  p_course_id    uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1) Profile row (Supabase Auth trigger may have created an empty one already).
  INSERT INTO profiles (id, full_name, role, status, tier, level)
  VALUES (p_student_id, p_full_name, 'student', 'active', 'free', p_level)
  ON CONFLICT (id) DO UPDATE
    SET full_name = excluded.full_name,
        role      = 'student',
        status    = 'active',
        level     = COALESCE(excluded.level, profiles.level);

  -- 2) instructor_students link so the instructor can see this student.
  INSERT INTO instructor_students (instructor_id, student_id)
  VALUES (p_instructor_id, p_student_id)
  ON CONFLICT DO NOTHING;

  -- 3) Enroll in course if provided.
  IF p_course_id IS NOT NULL THEN
    INSERT INTO enrollments (student_id, course_id)
    VALUES (p_student_id, p_course_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION create_student_profile_and_enroll(uuid, text, text, uuid, uuid)
  TO service_role;
