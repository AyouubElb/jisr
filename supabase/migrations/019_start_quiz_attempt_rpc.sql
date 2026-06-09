-- Server-side enforcement of quizzes.max_attempts.
--
-- The client-side check in attemptsApi.start() could be bypassed by inserting
-- into student_attempts directly from devtools (RLS allows students to insert
-- their own attempt row). This RPC moves the cap into a SECURITY DEFINER
-- function that validates + inserts atomically.
--
-- Counting policy: ALL statuses count (in_progress + submitted + pending_review
-- + graded). max_attempts=1 means "one chance, abandonment included". The
-- student UI warns about this.

CREATE OR REPLACE FUNCTION start_quiz_attempt(p_quiz_id UUID)
RETURNS student_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_max_attempts INT;
  v_used_count INT;
  v_course_id UUID;
  v_attempt student_attempts%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifie' USING ERRCODE = '42501';
  END IF;

  -- Resolve the course this quiz belongs to (quiz → section → course)
  SELECT s.course_id, q.max_attempts
    INTO v_course_id, v_max_attempts
  FROM quizzes q
  JOIN sections s ON s.id = q.section_id
  WHERE q.id = p_quiz_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Quiz introuvable' USING ERRCODE = '42704';
  END IF;

  -- Active-enrollment check
  IF NOT is_actively_enrolled(v_user_id, v_course_id) THEN
    RAISE EXCEPTION 'Vous n''etes pas inscrit a ce cours' USING ERRCODE = '42501';
  END IF;

  -- Cap check (NULL = unlimited)
  IF v_max_attempts IS NOT NULL THEN
    SELECT COUNT(*) INTO v_used_count
    FROM student_attempts
    WHERE quiz_id = p_quiz_id AND student_id = v_user_id;

    IF v_used_count >= v_max_attempts THEN
      RAISE EXCEPTION 'Vous avez atteint le nombre maximum de tentatives pour ce quiz.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Insert and return the new attempt
  INSERT INTO student_attempts (quiz_id, student_id, started_at, status)
  VALUES (p_quiz_id, v_user_id, NOW(), 'in_progress')
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;

REVOKE ALL ON FUNCTION start_quiz_attempt(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_quiz_attempt(UUID) TO authenticated;

COMMENT ON FUNCTION start_quiz_attempt IS
  'Atomically checks quizzes.max_attempts and inserts the new attempt. Replaces the client-side cap check so it cannot be bypassed via direct table inserts.';
