-- Add sections + exercises, restructure lessons + materials.
-- Lessons now hang off sections instead of courses.
-- Materials can attach to either a lesson or an exercise (XOR via CHECK).

-- 1. New tables

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

-- 2. Drop old RLS policies (reference lessons.course_id — must go before the column does)

DROP POLICY IF EXISTS "lessons_select_enrolled_or_owner" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_owner" ON lessons;
DROP POLICY IF EXISTS "lessons_update_owner" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_owner" ON lessons;

DROP POLICY IF EXISTS "materials_select_enrolled_or_owner" ON materials;
DROP POLICY IF EXISTS "materials_insert_owner" ON materials;
DROP POLICY IF EXISTS "materials_update_owner" ON materials;
DROP POLICY IF EXISTS "materials_delete_owner" ON materials;

-- 3. Migrate lessons: course_id → section_id

-- Create a default "Section 1" for each course that has lessons
INSERT INTO sections (course_id, title, "order")
SELECT DISTINCT course_id, 'Section 1', 1
FROM lessons;

ALTER TABLE lessons ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE CASCADE;

-- Backfill section_id from the default sections
UPDATE lessons
SET section_id = s.id
FROM sections s
WHERE s.course_id = lessons.course_id;

ALTER TABLE lessons ALTER COLUMN section_id SET NOT NULL;
ALTER TABLE lessons DROP COLUMN course_id;
ALTER TABLE lessons ALTER COLUMN content SET DEFAULT '';

-- 4. Materials: add exercise_id, allow lesson_id OR exercise_id (XOR)

ALTER TABLE materials ALTER COLUMN lesson_id DROP NOT NULL;
ALTER TABLE materials ADD COLUMN exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE materials ADD CONSTRAINT materials_parent_check CHECK (
  (lesson_id IS NOT NULL AND exercise_id IS NULL) OR
  (lesson_id IS NULL AND exercise_id IS NOT NULL)
);

-- 5. Indexes

CREATE INDEX IF NOT EXISTS idx_sections_course ON sections(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_section ON lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_exercises_section ON exercises(section_id);
CREATE INDEX IF NOT EXISTS idx_materials_exercise ON materials(exercise_id);

DROP INDEX IF EXISTS idx_lessons_course;

-- 6. RLS

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Sections: instructor full CRUD on their courses; students SELECT if enrolled

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

-- Exercises: instructor full CRUD (via section → course); students SELECT if enrolled

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

-- Lessons (new): goes through sections instead of courses

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

-- Materials (new): supports lesson_id OR exercise_id parent

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
