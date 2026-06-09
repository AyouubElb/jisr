-- Quizzes, quiz_blocks, student_attempts, student_answers.

-- Tables

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  time_limit_minutes INTEGER,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'audio', 'image', 'mcq', 'fill_blank', 'free_text')),
  content JSONB NOT NULL DEFAULT '{}',
  points INTEGER,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score INTEGER,
  max_score INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES student_attempts(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES quiz_blocks(id) ON DELETE CASCADE,
  selected_option_id TEXT,
  text_answer TEXT,
  is_correct BOOLEAN,
  points_awarded INTEGER,
  instructor_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes

CREATE INDEX IF NOT EXISTS idx_quizzes_section ON quizzes(section_id);
CREATE INDEX IF NOT EXISTS idx_quiz_blocks_quiz ON quiz_blocks(quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_quiz ON student_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON student_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_attempt ON student_answers(attempt_id);

-- RLS

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- Quizzes: instructor full CRUD (via section → course); students SELECT if enrolled

CREATE POLICY "quizzes_select_enrolled_or_owner"
  ON quizzes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = quizzes.section_id
      AND (
        c.instructor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.course_id = c.id AND e.student_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "quizzes_insert_owner"
  ON quizzes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = quizzes.section_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "quizzes_update_owner"
  ON quizzes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = quizzes.section_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "quizzes_delete_owner"
  ON quizzes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = quizzes.section_id AND c.instructor_id = auth.uid()
    )
  );

-- Quiz blocks: instructor full CRUD (via quiz → section → course); students SELECT if enrolled

CREATE POLICY "quiz_blocks_select_enrolled_or_owner"
  ON quiz_blocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN sections s ON s.id = q.section_id
      JOIN courses c ON c.id = s.course_id
      WHERE q.id = quiz_blocks.quiz_id
      AND (
        c.instructor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.course_id = c.id AND e.student_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "quiz_blocks_insert_owner"
  ON quiz_blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN sections s ON s.id = q.section_id
      JOIN courses c ON c.id = s.course_id
      WHERE q.id = quiz_blocks.quiz_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "quiz_blocks_update_owner"
  ON quiz_blocks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN sections s ON s.id = q.section_id
      JOIN courses c ON c.id = s.course_id
      WHERE q.id = quiz_blocks.quiz_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "quiz_blocks_delete_owner"
  ON quiz_blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN sections s ON s.id = q.section_id
      JOIN courses c ON c.id = s.course_id
      WHERE q.id = quiz_blocks.quiz_id AND c.instructor_id = auth.uid()
    )
  );

-- Student attempts: students see/start/update own (if enrolled); instructor sees + grades

CREATE POLICY "student_attempts_select_own_or_owner"
  ON student_attempts FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN sections s ON s.id = q.section_id
      JOIN courses c ON c.id = s.course_id
      WHERE q.id = student_attempts.quiz_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "student_attempts_insert_enrolled"
  ON student_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM quizzes q
      JOIN sections s ON s.id = q.section_id
      JOIN enrollments e ON e.course_id = s.course_id
      WHERE q.id = student_attempts.quiz_id AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "student_attempts_update_own"
  ON student_attempts FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "student_attempts_update_instructor"
  ON student_attempts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN sections s ON s.id = q.section_id
      JOIN courses c ON c.id = s.course_id
      WHERE q.id = student_attempts.quiz_id AND c.instructor_id = auth.uid()
    )
  );

-- Student answers: students CRUD own; instructor sees + grades

CREATE POLICY "student_answers_select_own_or_owner"
  ON student_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_attempts sa
      WHERE sa.id = student_answers.attempt_id
      AND (
        sa.student_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM quizzes q
          JOIN sections s ON s.id = q.section_id
          JOIN courses c ON c.id = s.course_id
          WHERE q.id = sa.quiz_id AND c.instructor_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "student_answers_insert_own"
  ON student_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_attempts sa
      WHERE sa.id = student_answers.attempt_id AND sa.student_id = auth.uid()
    )
  );

CREATE POLICY "student_answers_update_own"
  ON student_answers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_attempts sa
      WHERE sa.id = student_answers.attempt_id AND sa.student_id = auth.uid()
    )
  );

CREATE POLICY "student_answers_update_instructor"
  ON student_answers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_attempts sa
      JOIN quizzes q ON q.id = sa.quiz_id
      JOIN sections s ON s.id = q.section_id
      JOIN courses c ON c.id = s.course_id
      WHERE sa.id = student_answers.attempt_id AND c.instructor_id = auth.uid()
    )
  );
