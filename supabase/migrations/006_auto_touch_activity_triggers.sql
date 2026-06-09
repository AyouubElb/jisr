-- Auto-touch enrollment.last_active_at via triggers.
--
-- The previous touch_enrollment_activity() RPC used SECURITY INVOKER, but
-- there's no RLS UPDATE policy on enrollments for students — so it silently
-- updated 0 rows. Triggers below run SECURITY DEFINER, scoped to the student's
-- own enrollment via the WHERE clause (no privilege escalation).

-- Trigger function
CREATE OR REPLACE FUNCTION update_enrollment_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'student_attempts' THEN
    SELECT s.course_id INTO v_course_id
    FROM quizzes q JOIN sections s ON s.id = q.section_id
    WHERE q.id = NEW.quiz_id;
  ELSIF TG_TABLE_NAME = 'lesson_completions' THEN
    SELECT s.course_id INTO v_course_id
    FROM lessons l JOIN sections s ON s.id = l.section_id
    WHERE l.id = NEW.lesson_id;
  END IF;

  IF v_course_id IS NOT NULL THEN
    UPDATE enrollments
    SET last_active_at = NOW()
    WHERE student_id = NEW.student_id AND course_id = v_course_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on quiz submissions
CREATE OR REPLACE TRIGGER trg_attempt_touch_activity
AFTER INSERT ON student_attempts
FOR EACH ROW EXECUTE FUNCTION update_enrollment_last_active();

-- Trigger on lesson completions
CREATE OR REPLACE TRIGGER trg_completion_touch_activity
AFTER INSERT ON lesson_completions
FOR EACH ROW EXECUTE FUNCTION update_enrollment_last_active();

-- Belt-and-suspenders: switch the RPC to SECURITY DEFINER too
CREATE OR REPLACE FUNCTION touch_enrollment_activity(p_course_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE enrollments
  SET last_active_at = NOW()
  WHERE course_id = p_course_id AND student_id = auth.uid();
$$;
