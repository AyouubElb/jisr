-- Shared ordering for section content (lessons + quizzes).
--
-- Before this, lessons and quizzes each had their own `order` column, so a
-- section couldn't interleave them ("lesson 1 → quiz → lesson 2"). `section_items`
-- holds one shared `position` per section, maintained by triggers on lessons/quizzes
-- (INSERT appends, DELETE removes + compacts siblings to keep positions 1..N).
-- App code keeps using lessonsApi.create()/quizzesApi.create() — inserts unchanged.
--
-- Legacy lessons.order / quizzes.order stay populated (deprecated) for one release
-- as a safety net.
--
-- The UNIQUE (section_id, position) constraint is DEFERRABLE INITIALLY DEFERRED so
-- reorder can shift many rows in one statement without tripping the check mid-update.

-- 1. Type + table

CREATE TYPE section_item_type AS ENUM ('lesson', 'quiz');

CREATE TABLE IF NOT EXISTS section_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id  UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  item_type   section_item_type NOT NULL,
  item_id     UUID NOT NULL,
  position    INTEGER NOT NULL CHECK (position > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT section_items_position_unique
    UNIQUE (section_id, position) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT section_items_item_unique
    UNIQUE (item_type, item_id)
);

CREATE INDEX section_items_section_position_idx
  ON section_items (section_id, position);

CREATE INDEX section_items_lookup_idx
  ON section_items (item_type, item_id);

COMMENT ON TABLE section_items IS
  'Shared ordering for lessons + quizzes within a section. Maintained by triggers — app code does not touch this directly.';

-- 2. Backfill — order by created_at across both tables (preserves the order in
-- which the instructor actually built the section). The legacy `order` columns
-- were meaningless across tables, so we ignore them.

INSERT INTO section_items (section_id, item_type, item_id, position)
SELECT
  combined.section_id,
  combined.item_type,
  combined.item_id,
  ROW_NUMBER() OVER (
    PARTITION BY combined.section_id
    ORDER BY combined.created_at, combined.item_id
  ) AS position
FROM (
  SELECT section_id, 'lesson'::section_item_type AS item_type, id AS item_id, created_at FROM lessons
  UNION ALL
  SELECT section_id, 'quiz'::section_item_type   AS item_type, id AS item_id, created_at FROM quizzes
) AS combined
ON CONFLICT (item_type, item_id) DO NOTHING;

-- 3. Triggers — auto-maintain section_items on lesson/quiz INSERT/DELETE

-- INSERT lesson → append section_items row
CREATE OR REPLACE FUNCTION section_items_on_lesson_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO section_items (section_id, item_type, item_id, position)
  VALUES (
    NEW.section_id,
    'lesson',
    NEW.id,
    COALESCE(
      (SELECT MAX(position) + 1 FROM section_items WHERE section_id = NEW.section_id),
      1
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER lessons_after_insert_section_item
  AFTER INSERT ON lessons
  FOR EACH ROW EXECUTE FUNCTION section_items_on_lesson_insert();

-- INSERT quiz → append section_items row
CREATE OR REPLACE FUNCTION section_items_on_quiz_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO section_items (section_id, item_type, item_id, position)
  VALUES (
    NEW.section_id,
    'quiz',
    NEW.id,
    COALESCE(
      (SELECT MAX(position) + 1 FROM section_items WHERE section_id = NEW.section_id),
      1
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER quizzes_after_insert_section_item
  AFTER INSERT ON quizzes
  FOR EACH ROW EXECUTE FUNCTION section_items_on_quiz_insert();

-- DELETE lesson → remove its row, then compact siblings (positions stay 1..N)
CREATE OR REPLACE FUNCTION section_items_on_lesson_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_section_id UUID;
  v_position   INT;
BEGIN
  SELECT section_id, position INTO v_section_id, v_position
  FROM section_items
  WHERE item_type = 'lesson' AND item_id = OLD.id;

  IF v_section_id IS NULL THEN
    RETURN OLD;
  END IF;

  DELETE FROM section_items
  WHERE item_type = 'lesson' AND item_id = OLD.id;

  -- Shift higher positions down by 1
  UPDATE section_items
  SET position = position - 1
  WHERE section_id = v_section_id AND position > v_position;

  RETURN OLD;
END;
$$;

CREATE TRIGGER lessons_after_delete_section_item
  AFTER DELETE ON lessons
  FOR EACH ROW EXECUTE FUNCTION section_items_on_lesson_delete();

-- DELETE quiz → remove its row, then compact siblings
CREATE OR REPLACE FUNCTION section_items_on_quiz_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_section_id UUID;
  v_position   INT;
BEGIN
  SELECT section_id, position INTO v_section_id, v_position
  FROM section_items
  WHERE item_type = 'quiz' AND item_id = OLD.id;

  IF v_section_id IS NULL THEN
    RETURN OLD;
  END IF;

  DELETE FROM section_items
  WHERE item_type = 'quiz' AND item_id = OLD.id;

  UPDATE section_items
  SET position = position - 1
  WHERE section_id = v_section_id AND position > v_position;

  RETURN OLD;
END;
$$;

CREATE TRIGGER quizzes_after_delete_section_item
  AFTER DELETE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION section_items_on_quiz_delete();

-- 4. RLS — students read, instructors write (matches sections policy)

ALTER TABLE section_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "section_items_select_enrolled_or_owner" ON section_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = section_items.section_id
        AND (
          c.instructor_id = auth.uid()
          OR is_actively_enrolled(auth.uid(), c.id)
        )
    )
  );

-- Writes go through triggers and the reorder RPC (both SECURITY DEFINER).
-- Owner policies below are defense-in-depth + escape hatch for Supabase Studio.

CREATE POLICY "section_items_insert_owner" ON section_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = section_items.section_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "section_items_update_owner" ON section_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = section_items.section_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "section_items_delete_owner" ON section_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = section_items.section_id AND c.instructor_id = auth.uid()
    )
  );

-- 5. Reorder RPC — atomic move + sibling compaction

CREATE OR REPLACE FUNCTION reorder_section_item(
  p_section_item_id UUID,
  p_new_position    INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_section_id   UUID;
  v_old_position INT;
  v_max_position INT;
  v_clamped      INT;
BEGIN
  -- Authorization: only the course owner can reorder
  SELECT si.section_id, si.position INTO v_section_id, v_old_position
  FROM section_items si
  JOIN sections s ON s.id = si.section_id
  JOIN courses  c ON c.id = s.course_id
  WHERE si.id = p_section_item_id AND c.instructor_id = auth.uid();

  IF v_section_id IS NULL THEN
    RAISE EXCEPTION 'Permission refusee ou element introuvable' USING ERRCODE = '42501';
  END IF;

  SELECT MAX(position) INTO v_max_position
  FROM section_items
  WHERE section_id = v_section_id;

  v_clamped := GREATEST(1, LEAST(p_new_position, v_max_position));

  IF v_clamped = v_old_position THEN
    RETURN;
  END IF;

  -- Defer the unique constraint so transient duplicates during the shift don't trip it
  SET CONSTRAINTS section_items_position_unique DEFERRED;

  IF v_clamped > v_old_position THEN
    -- Moving down: shift (old, new] up by -1
    UPDATE section_items
    SET position = position - 1
    WHERE section_id = v_section_id
      AND position > v_old_position
      AND position <= v_clamped;
  ELSE
    -- Moving up: shift [new, old) down by +1
    UPDATE section_items
    SET position = position + 1
    WHERE section_id = v_section_id
      AND position >= v_clamped
      AND position < v_old_position;
  END IF;

  -- Drop the moved item at its new position
  UPDATE section_items
  SET position = v_clamped
  WHERE id = p_section_item_id;
END;
$$;

REVOKE ALL ON FUNCTION reorder_section_item(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_section_item(UUID, INT) TO authenticated;

COMMENT ON FUNCTION reorder_section_item IS
  'Move a section item, renumbering siblings to keep positions 1..N. Caller must own the parent course.';
