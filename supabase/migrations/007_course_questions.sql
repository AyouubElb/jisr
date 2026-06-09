-- Course Q&A: private threaded questions between a student and the course instructor.
-- Visibility is always private — no third party can see threads.
-- `status` toggles open/resolved; `last_activity_at` drives sort order without
-- subqueries on replies. RLS restricts everything to the asker or the instructor.

-- Tables

CREATE TABLE IF NOT EXISTS course_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS course_question_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES course_questions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes

-- Course questions list, newest activity first
CREATE INDEX IF NOT EXISTS idx_course_questions_course_activity
  ON course_questions(course_id, last_activity_at DESC);

-- Student-side "my questions"
CREATE INDEX IF NOT EXISTS idx_course_questions_student
  ON course_questions(student_id);

-- Reply thread fetch
CREATE INDEX IF NOT EXISTS idx_course_question_replies_question
  ON course_question_replies(question_id, created_at);

-- Trigger: bump last_activity_at on new reply

CREATE OR REPLACE FUNCTION bump_question_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE course_questions
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reply_bump_activity ON course_question_replies;
CREATE TRIGGER on_reply_bump_activity
  AFTER INSERT ON course_question_replies
  FOR EACH ROW EXECUTE FUNCTION bump_question_activity();

-- RLS

ALTER TABLE course_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_question_replies ENABLE ROW LEVEL SECURITY;

-- course_questions: visible only to the asker or the course instructor
CREATE POLICY "course_questions_select_parties"
  ON course_questions FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_questions.course_id AND c.instructor_id = auth.uid()
    )
  );

-- Students can post only if enrolled, and only as themselves
CREATE POLICY "course_questions_insert_enrolled_student"
  ON course_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = course_questions.course_id AND e.student_id = auth.uid()
    )
  );

-- Either party can update (toggle resolved, bump last_activity_at via trigger)
CREATE POLICY "course_questions_update_parties"
  ON course_questions FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_questions.course_id AND c.instructor_id = auth.uid()
    )
  );

-- Either party can delete the thread
CREATE POLICY "course_questions_delete_parties"
  ON course_questions FOR DELETE
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_questions.course_id AND c.instructor_id = auth.uid()
    )
  );

-- course_question_replies: inherit question visibility (asker or instructor)
CREATE POLICY "course_question_replies_select_parties"
  ON course_question_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_questions q
      WHERE q.id = course_question_replies.question_id
      AND (
        q.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM courses c
          WHERE c.id = q.course_id AND c.instructor_id = auth.uid()
        )
      )
    )
  );

-- Either party can reply; author must equal auth.uid()
CREATE POLICY "course_question_replies_insert_parties"
  ON course_question_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM course_questions q
      WHERE q.id = course_question_replies.question_id
      AND (
        q.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM courses c
          WHERE c.id = q.course_id AND c.instructor_id = auth.uid()
        )
      )
    )
  );

-- Authors can delete their own replies
CREATE POLICY "course_question_replies_delete_own"
  ON course_question_replies FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());
