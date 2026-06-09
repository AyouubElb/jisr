-- Phase 1 engagement tracking.
-- enrollments.last_active_at: rolling timestamp touched on student actions.
-- lesson_completions: student self-marks a lesson as done.
-- session_attendance: instructor marks who attended a live session.

-- Enrollments: last_active_at

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_enrollments_last_active
  ON enrollments(last_active_at DESC NULLS LAST);

-- Lesson completions

CREATE TABLE IF NOT EXISTS lesson_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_student ON lesson_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson ON lesson_completions(lesson_id);

ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;

-- Students: CRUD own (if enrolled). Instructors: read-only for their courses.

CREATE POLICY "lesson_completions_select_own_or_owner"
  ON lesson_completions FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN courses c ON c.id = s.course_id
      WHERE l.id = lesson_completions.lesson_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "lesson_completions_insert_own_if_enrolled"
  ON lesson_completions FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN enrollments e ON e.course_id = s.course_id
      WHERE l.id = lesson_completions.lesson_id AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "lesson_completions_delete_own"
  ON lesson_completions FOR DELETE
  TO authenticated
  USING (student_id = auth.uid());

-- Session attendance

CREATE TABLE IF NOT EXISTS session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_student ON session_attendance(student_id);

ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;

-- Students: read own. Instructor is source of truth (full CRUD on their sessions).

CREATE POLICY "session_attendance_select_own_or_owner"
  ON session_attendance FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM live_sessions ls
      JOIN courses c ON c.id = ls.course_id
      WHERE ls.id = session_attendance.session_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "session_attendance_insert_owner"
  ON session_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM live_sessions ls
      JOIN courses c ON c.id = ls.course_id
      WHERE ls.id = session_attendance.session_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "session_attendance_update_owner"
  ON session_attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM live_sessions ls
      JOIN courses c ON c.id = ls.course_id
      WHERE ls.id = session_attendance.session_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "session_attendance_delete_owner"
  ON session_attendance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM live_sessions ls
      JOIN courses c ON c.id = ls.course_id
      WHERE ls.id = session_attendance.session_id AND c.instructor_id = auth.uid()
    )
  );

-- Optional convenience RPC for bumping last_active_at.
-- Regular UPDATE works too — this just keeps the client side clean.

CREATE OR REPLACE FUNCTION touch_enrollment_activity(p_course_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
AS $$
  UPDATE enrollments
  SET last_active_at = NOW()
  WHERE course_id = p_course_id AND student_id = auth.uid();
$$;
