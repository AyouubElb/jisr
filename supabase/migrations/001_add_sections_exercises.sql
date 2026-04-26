-- ============================================================================
-- Migration: Add sections + exercises, restructure lessons + materials
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE NEW TABLES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. DROP OLD RLS POLICIES (they reference lessons.course_id — must drop before column)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "lessons_select_enrolled_or_owner" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_owner" ON lessons;
DROP POLICY IF EXISTS "lessons_update_owner" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_owner" ON lessons;

DROP POLICY IF EXISTS "materials_select_enrolled_or_owner" ON materials;
DROP POLICY IF EXISTS "materials_insert_owner" ON materials;
DROP POLICY IF EXISTS "materials_update_owner" ON materials;
DROP POLICY IF EXISTS "materials_delete_owner" ON materials;

-- ----------------------------------------------------------------------------
-- 3. MIGRATE LESSONS: course_id → section_id
-- ----------------------------------------------------------------------------

-- 3a. For each course that has lessons, create a default section
INSERT INTO sections (course_id, title, "order")
SELECT DISTINCT course_id, 'Section 1', 1
FROM lessons;

-- 3b. Add section_id column (nullable first)
ALTER TABLE lessons ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE CASCADE;

-- 3c. Populate section_id from the default sections we just created
UPDATE lessons
SET section_id = s.id
FROM sections s
WHERE s.course_id = lessons.course_id;

-- 3d. Make section_id NOT NULL and drop course_id
ALTER TABLE lessons ALTER COLUMN section_id SET NOT NULL;
ALTER TABLE lessons DROP COLUMN course_id;

-- 3e. Set default content for lessons that have empty content
ALTER TABLE lessons ALTER COLUMN content SET DEFAULT '';

-- ----------------------------------------------------------------------------
-- 4. MIGRATE MATERIALS: add exercise_id column
-- ----------------------------------------------------------------------------

-- Make lesson_id nullable (was NOT NULL)
ALTER TABLE materials ALTER COLUMN lesson_id DROP NOT NULL;

-- Add exercise_id column
ALTER TABLE materials ADD COLUMN exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE;

-- Add constraint: exactly one of lesson_id or exercise_id must be set
ALTER TABLE materials ADD CONSTRAINT materials_parent_check CHECK (
  (lesson_id IS NOT NULL AND exercise_id IS NULL) OR
  (lesson_id IS NULL AND exercise_id IS NOT NULL)
);

-- ----------------------------------------------------------------------------
-- 5. NEW INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_sections_course ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section ON lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_exercises_section ON exercises(section_id);
CREATE INDEX IF NOT EXISTS idx_materials_exercise ON materials(exercise_id);

-- Drop old index that referenced lessons.course_id
DROP INDEX IF EXISTS idx_lessons_course;

-- ----------------------------------------------------------------------------
-- 6. ENABLE RLS ON NEW TABLES
-- ----------------------------------------------------------------------------

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 7. RLS POLICIES — SECTIONS
--    Instructor: full CRUD on their own courses
--    Student: SELECT only if enrolled
-- ----------------------------------------------------------------------------

CREATE POLICY "sections_select_enrolled_or_owner"
  ON sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = sections.course_id
      AND (
        c.instructor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.course_id = c.id AND e.student_id = auth.uid()
        )
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

-- ----------------------------------------------------------------------------
-- 8. RLS POLICIES — EXERCISES
--    Instructor: full CRUD (via section → course ownership)
--    Student: SELECT only if enrolled
-- ----------------------------------------------------------------------------

CREATE POLICY "exercises_select_enrolled_or_owner"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = exercises.section_id
      AND (
        c.instructor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.course_id = c.id AND e.student_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "exercises_insert_owner"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = exercises.section_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "exercises_update_owner"
  ON exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = exercises.section_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "exercises_delete_owner"
  ON exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = exercises.section_id AND c.instructor_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 9. NEW LESSONS RLS — now goes through sections instead of courses
--    Instructor: full CRUD (via section → course ownership)
--    Student: SELECT only if enrolled
-- ----------------------------------------------------------------------------

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
        OR EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.course_id = c.id AND e.student_id = auth.uid()
        )
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

-- ----------------------------------------------------------------------------
-- 10. NEW MATERIALS RLS — now supports lesson_id OR exercise_id
--    Instructor: full CRUD (via section → course ownership)
--    Student: SELECT only if enrolled
-- ----------------------------------------------------------------------------

CREATE POLICY "materials_select_enrolled_or_owner"
  ON materials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE (
        (materials.lesson_id IS NOT NULL AND EXISTS (SELECT 1 FROM lessons l WHERE l.id = materials.lesson_id AND l.section_id = s.id))
        OR
        (materials.exercise_id IS NOT NULL AND EXISTS (SELECT 1 FROM exercises ex WHERE ex.id = materials.exercise_id AND ex.section_id = s.id))
      )
      AND (
        c.instructor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.course_id = c.id AND e.student_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "materials_insert_owner"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid()
      AND (
        (materials.lesson_id IS NOT NULL AND EXISTS (SELECT 1 FROM lessons l WHERE l.id = materials.lesson_id AND l.section_id = s.id))
        OR
        (materials.exercise_id IS NOT NULL AND EXISTS (SELECT 1 FROM exercises ex WHERE ex.id = materials.exercise_id AND ex.section_id = s.id))
      )
    )
  );

CREATE POLICY "materials_update_owner"
  ON materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid()
      AND (
        (materials.lesson_id IS NOT NULL AND EXISTS (SELECT 1 FROM lessons l WHERE l.id = materials.lesson_id AND l.section_id = s.id))
        OR
        (materials.exercise_id IS NOT NULL AND EXISTS (SELECT 1 FROM exercises ex WHERE ex.id = materials.exercise_id AND ex.section_id = s.id))
      )
    )
  );

CREATE POLICY "materials_delete_owner"
  ON materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE c.instructor_id = auth.uid()
      AND (
        (materials.lesson_id IS NOT NULL AND EXISTS (SELECT 1 FROM lessons l WHERE l.id = materials.lesson_id AND l.section_id = s.id))
        OR
        (materials.exercise_id IS NOT NULL AND EXISTS (SELECT 1 FROM exercises ex WHERE ex.id = materials.exercise_id AND ex.section_id = s.id))
      )
    )
  );
