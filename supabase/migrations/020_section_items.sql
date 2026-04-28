-- ============================================================================
-- Migration: shared ordering for section content (lessons + quizzes)
--
-- Rationale:
--   Lessons and quizzes each had their own `order` column, so a section
--   could not interleave them ("lesson 1 → quiz → lesson 2"). The UI had
--   to merge two arrays without a coherent sequence.
--
-- Design:
--   `section_items` is a small lookup table that holds ONE shared `position`
--   per section. Each row links to a lesson or a quiz (item_type + item_id).
--   Triggers maintain it automatically:
--     - INSERT lesson/quiz → AFTER trigger creates section_items row with
--       MAX(position)+1 in that section.
--     - DELETE lesson/quiz → AFTER trigger removes the section_items row
--       and compacts siblings (renumber so positions stay 1..N).
--   App code keeps using lessonsApi.create() / quizzesApi.create() — no
--   changes required for inserts. Reads gain a new `section.items[]` field
--   that returns the merged ordered list.
--
--   The legacy lessons.order / quizzes.order columns are NOT dropped here —
--   they stay populated (deprecated, ignored for ordering) for one release
--   as a safety net. A later migration can drop them once all UI consumers
--   have switched to section.items[].
--
-- Concurrency:
--   The UNIQUE (section_id, position) constraint is DEFERRABLE INITIALLY
--   DEFERRED so reorder/compact can shift many rows in one statement
--   without tripping the constraint mid-update.
-- ============================================================================

-- ─── 1. Type + table ────────────────────────────────────────────────────────

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
  'Shared ordering for lessons + quizzes within a section. One row per lesson or quiz; position is unique within a section. Maintained by triggers on lessons/quizzes — app code does not touch this table directly.';

-- ─── 2. Backfill from existing lessons + quizzes ────────────────────────────
-- Order strategy: by created_at across both tables (preserves the natural
-- chronological order in which the instructor built the section). Existing
-- order columns are not consulted because they were meaningless across
-- tables anyway.

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

-- ─── 3. Triggers — auto-maintain section_items on lesson/quiz changes ──────

-- INSERT lesson → create matching section_items row.
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

-- INSERT quiz → create matching section_items row.
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

-- DELETE lesson → remove its section_items row, then compact siblings.
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

  -- Compact: shift every higher position down by 1 so positions stay 1..N.
  UPDATE section_items
  SET position = position - 1
  WHERE section_id = v_section_id AND position > v_position;

  RETURN OLD;
END;
$$;

CREATE TRIGGER lessons_after_delete_section_item
  AFTER DELETE ON lessons
  FOR EACH ROW EXECUTE FUNCTION section_items_on_lesson_delete();

-- DELETE quiz → remove its section_items row, then compact siblings.
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

-- ─── 4. RLS — students read, instructors write (matches sections policy) ───

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

-- INSERT/UPDATE/DELETE happen through triggers (SECURITY DEFINER) and the
-- reorder RPC, so app users never write directly. We still grant the owner
-- explicit policies as a defense-in-depth and to allow manual fixes from
-- Supabase Studio if ever needed.

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

-- ─── 5. Reorder RPC — atomic move + sibling compaction ─────────────────────

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
  -- Authorize: only the course owner can reorder.
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

  -- Defer the unique constraint so we can shift many rows in one go without
  -- transient duplicates tripping the check.
  SET CONSTRAINTS section_items_position_unique DEFERRED;

  IF v_clamped > v_old_position THEN
    -- Moving down: shift items in (old, new] up by -1.
    UPDATE section_items
    SET position = position - 1
    WHERE section_id = v_section_id
      AND position > v_old_position
      AND position <= v_clamped;
  ELSE
    -- Moving up: shift items in [new, old) down by +1.
    UPDATE section_items
    SET position = position + 1
    WHERE section_id = v_section_id
      AND position >= v_clamped
      AND position < v_old_position;
  END IF;

  -- Place the moved item at its new position.
  UPDATE section_items
  SET position = v_clamped
  WHERE id = p_section_item_id;
END;
$$;

REVOKE ALL ON FUNCTION reorder_section_item(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_section_item(UUID, INT) TO authenticated;

COMMENT ON FUNCTION reorder_section_item IS
  'Move a section item to a new position. Atomically renumbers siblings so positions stay 1..N. Authorization: caller must own the parent course.';
