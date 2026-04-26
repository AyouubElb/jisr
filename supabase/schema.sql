-- ============================================================================
-- English Teaching Platform — Database Schema
-- ============================================================================
-- Run this in the Supabase SQL Editor after creating your project.
-- Creates all tables, enables RLS, and defines all security policies.
-- See SECURITY.md for the full security model and policy rationale.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'instructor')),
  avatar_url TEXT,
  level TEXT CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  thumbnail_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('grammar', 'vocabulary', 'resource')),
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_link TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- last_active_at added by migration 003
  last_active_at TIMESTAMPTZ,
  -- Soft-remove: NULL = active, non-NULL = removed (data preserved, access denied via RLS)
  removed_at TIMESTAMPTZ,
  UNIQUE (student_id, course_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  time_limit_minutes INTEGER,
  max_attempts INTEGER, -- NULL = unlimited retakes
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'audio', 'image', 'mcq', 'fill_blank', 'free_text', 'voice', 'section')),
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

CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Private Q&A threads between a student and the course instructor.
-- Every thread is private by design (no visibility column).
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

-- Ownership link: which instructor created/owns which student.
-- Populated by create_student_profile_and_enroll RPC on student creation.
-- Used for filtering the instructor's student roster + scoping profiles SELECT.
CREATE TABLE IF NOT EXISTS instructor_students (
  instructor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (instructor_id, student_id)
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_sections_course ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section ON lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_section ON quizzes(section_id);
CREATE INDEX IF NOT EXISTS idx_quiz_blocks_quiz ON quiz_blocks(quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_quiz ON student_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON student_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_attempt ON student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_materials_lesson ON materials(lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_questions_course_activity ON course_questions(course_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_questions_student ON course_questions(student_id);
CREATE INDEX IF NOT EXISTS idx_course_question_replies_question ON course_question_replies(question_id, created_at);

-- ----------------------------------------------------------------------------
-- 3. AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Bump course_questions.last_activity_at when a reply is posted
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

-- ----------------------------------------------------------------------------
-- 4. ENABLE RLS — MUST be done on every table
-- ----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_question_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_students ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5. HELPER FUNCTIONS USED BY POLICIES
-- ----------------------------------------------------------------------------

-- Single source of truth for "is this student actively enrolled?".
-- Used by every enrollment-gated policy below. Soft-removed enrollments
-- (removed_at IS NOT NULL) return FALSE.
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

-- ----------------------------------------------------------------------------
-- 6. RLS POLICIES
-- ----------------------------------------------------------------------------

-- ==== PROFILES ==============================================================
-- Scoped SELECT — self, admins, instructors see their students (via
-- instructor_students), students see instructors of their enrolled courses.
CREATE POLICY "profiles_select_scoped"
  ON profiles FOR SELECT
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
        AND e.removed_at IS NULL
    )
  );

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile (fallback; trigger handles normal signup)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ==== INSTRUCTOR_STUDENTS ===================================================
-- Instructor sees own ownership rows; student sees rows where they are the student.
CREATE POLICY "instructor_students_select_own"
  ON instructor_students FOR SELECT
  TO authenticated
  USING (instructor_id = auth.uid() OR student_id = auth.uid());

-- Admin escape hatch.
CREATE POLICY "instructor_students_select_admin"
  ON instructor_students FOR SELECT
  TO authenticated
  USING (is_admin());

-- Only the owning instructor can remove a student from their roster.
CREATE POLICY "instructor_students_delete_own"
  ON instructor_students FOR DELETE
  TO authenticated
  USING (instructor_id = auth.uid());

-- No INSERT policy: all inserts go through the create_student_profile_and_enroll
-- RPC (service-role, bypasses RLS).

-- ==== COURSES ===============================================================
-- Students see only published courses they are enrolled in; instructors see their own (published or not)
CREATE POLICY "courses_select_enrolled_or_own"
  ON courses FOR SELECT
  TO authenticated
  USING (
    instructor_id = auth.uid()
    OR (
      is_published = TRUE
      AND is_actively_enrolled(auth.uid(), id)
    )
  );

-- Only instructors can create courses, and only as themselves
CREATE POLICY "courses_insert_own"
  ON courses FOR INSERT
  TO authenticated
  WITH CHECK (
    instructor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'instructor'
    )
  );

-- Instructors can update only their own courses
CREATE POLICY "courses_update_own"
  ON courses FOR UPDATE
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- Instructors can delete only their own courses
CREATE POLICY "courses_delete_own"
  ON courses FOR DELETE
  TO authenticated
  USING (instructor_id = auth.uid());

-- ==== SECTIONS ==============================================================
CREATE POLICY "sections_select_enrolled_or_owner"
  ON sections FOR SELECT
  TO authenticated
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

CREATE POLICY "sections_insert_owner"
  ON sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = sections.course_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "sections_update_owner"
  ON sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = sections.course_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "sections_delete_owner"
  ON sections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = sections.course_id AND c.instructor_id = auth.uid()
    )
  );

-- ==== LESSONS ===============================================================
-- Lessons now belong to sections (section → course)
CREATE POLICY "lessons_select_enrolled_or_owner"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = lessons.section_id
      AND (
        c.instructor_id = auth.uid()
        OR is_actively_enrolled(auth.uid(), c.id)
      )
    )
  );

CREATE POLICY "lessons_insert_owner"
  ON lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = lessons.section_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "lessons_update_owner"
  ON lessons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = lessons.section_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "lessons_delete_owner"
  ON lessons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = lessons.section_id AND c.instructor_id = auth.uid()
    )
  );

-- ==== QUIZZES ===============================================================
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
        OR is_actively_enrolled(auth.uid(), c.id)
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

-- ==== QUIZ BLOCKS ===========================================================
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
        OR is_actively_enrolled(auth.uid(), c.id)
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

-- ==== STUDENT ATTEMPTS ======================================================
-- Students see their own attempts; instructors see attempts for their courses
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

-- Students can start an attempt if enrolled
CREATE POLICY "student_attempts_insert_enrolled"
  ON student_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM quizzes q
      JOIN sections s ON s.id = q.section_id
      WHERE q.id = student_attempts.quiz_id
        AND is_actively_enrolled(auth.uid(), s.course_id)
    )
  );

-- Students can update their own in-progress attempts (submit answers)
CREATE POLICY "student_attempts_update_own"
  ON student_attempts FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid());

-- Instructors can update attempts (grading)
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

-- ==== STUDENT ANSWERS =======================================================
-- Students see their own answers; instructors see answers for their courses
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

-- Students can insert answers for their own attempts
CREATE POLICY "student_answers_insert_own"
  ON student_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM student_attempts sa
      WHERE sa.id = student_answers.attempt_id AND sa.student_id = auth.uid()
    )
  );

-- Students can update their own answers (while attempt is in_progress)
CREATE POLICY "student_answers_update_own"
  ON student_answers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_attempts sa
      WHERE sa.id = student_answers.attempt_id AND sa.student_id = auth.uid()
    )
  );

-- Instructors can update answers (grading feedback)
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

-- ==== LIVE SESSIONS =========================================================
CREATE POLICY "sessions_select_enrolled_or_owner"
  ON live_sessions FOR SELECT
  TO authenticated
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

CREATE POLICY "sessions_insert_owner"
  ON live_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = live_sessions.course_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "sessions_update_owner"
  ON live_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = live_sessions.course_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "sessions_delete_owner"
  ON live_sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = live_sessions.course_id AND c.instructor_id = auth.uid()
    )
  );

-- ==== ENROLLMENTS ===========================================================
-- Students see only their own enrollments; instructors see enrollments for their courses
CREATE POLICY "enrollments_select_own_or_course_owner"
  ON enrollments FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = enrollments.course_id AND c.instructor_id = auth.uid()
    )
  );

-- Only the course instructor can enroll students
CREATE POLICY "enrollments_insert_instructor"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = enrollments.course_id AND c.instructor_id = auth.uid()
    )
  );

-- Only the course instructor can remove students
CREATE POLICY "enrollments_delete_instructor"
  ON enrollments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = enrollments.course_id AND c.instructor_id = auth.uid()
    )
  );

-- Required by soft-remove (sets/clears removed_at). Instructor can only
-- UPDATE enrollments belonging to their own courses.
CREATE POLICY "enrollments_update_instructor"
  ON enrollments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = enrollments.course_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = enrollments.course_id AND c.instructor_id = auth.uid()
    )
  );

-- ==== MATERIALS =============================================================
-- Materials belong to a lesson. Visibility flows through section → course.
CREATE POLICY "materials_select_enrolled_or_owner"
  ON materials FOR SELECT
  TO authenticated
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

CREATE POLICY "materials_insert_owner"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN courses  c ON c.id = s.course_id
      WHERE l.id = materials.lesson_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "materials_update_owner"
  ON materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN courses  c ON c.id = s.course_id
      WHERE l.id = materials.lesson_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "materials_delete_owner"
  ON materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN courses  c ON c.id = s.course_id
      WHERE l.id = materials.lesson_id AND c.instructor_id = auth.uid()
    )
  );

-- ==== COURSE QUESTIONS ======================================================
-- Private threads: visible only to the asker or the course instructor.

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

CREATE POLICY "course_questions_insert_enrolled_student"
  ON course_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND is_actively_enrolled(auth.uid(), course_questions.course_id)
  );

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

-- ==== COURSE QUESTION REPLIES ===============================================

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

CREATE POLICY "course_question_replies_delete_own"
  ON course_question_replies FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- ============================================================================
-- STORAGE BUCKET: create manually in Supabase Dashboard (Storage → New bucket)
--   Name: materials  |  Type: Private
-- Then run the policies below in the SQL Editor.
-- (Storage RLS is SEPARATE from table RLS — see SECURITY.md #7)
-- ============================================================================

-- Allow authenticated users to upload files
CREATE POLICY "materials_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'materials');

-- Allow authenticated users to read (required for createSignedUrl)
CREATE POLICY "materials_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'materials');

-- Allow authenticated users to delete their own files
CREATE POLICY "materials_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'materials');
