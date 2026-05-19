-- ============================================================================
-- Migration: atomic, transactional save for quiz_blocks
--
-- Replaces the client-side 4-pass diff in src/lib/api/quizzes.api.ts:saveBlocks.
-- Today's path makes ~3N round-trips per save and offers no atomicity — a
-- partial failure can leave the DB half-written, and two concurrent saves
-- interleave unpredictably. This RPC does the same diff inside a single
-- transaction with one client call, so saves are fast (1 round-trip),
-- all-or-nothing, and serializable.
--
-- Inputs:
--   p_quiz_id  uuid       — the quiz being edited.
--   p_blocks   jsonb      — array of block objects in their final state.
--                           Each: { id, type, content, weight, order }.
--                           Client supplies the uuid (real, generated via
--                           crypto.randomUUID for newly-added blocks).
--
-- Behaviour:
--   - DELETE every existing quiz_blocks row whose id is NOT in p_blocks.
--   - UPSERT every row in p_blocks by id (INSERT new, UPDATE existing).
--   - Preserve `model_answer` and `grading_notes` when the client omits them
--     (COALESCE keeps the existing value).
--
-- Auth:
--   SECURITY DEFINER so the function bypasses RLS, but the caller MUST own
--   the course this quiz belongs to. We check ownership explicitly before
--   doing anything.
-- ============================================================================

CREATE OR REPLACE FUNCTION save_quiz_blocks(p_quiz_id UUID, p_blocks JSONB)
RETURNS SETOF quiz_blocks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_instructor_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_blocks) <> 'array' THEN
    RAISE EXCEPTION 'p_blocks doit être un tableau JSON' USING ERRCODE = '22023';
  END IF;

  SELECT c.instructor_id
    INTO v_instructor_id
  FROM quizzes q
  JOIN sections s ON s.id = q.section_id
  JOIN courses c ON c.id = s.course_id
  WHERE q.id = p_quiz_id;

  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'Quiz introuvable' USING ERRCODE = '42704';
  END IF;

  IF v_instructor_id <> v_user_id THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  DELETE FROM quiz_blocks
  WHERE quiz_id = p_quiz_id
    AND id NOT IN (
      SELECT (elem->>'id')::UUID
      FROM jsonb_array_elements(p_blocks) AS elem
      WHERE elem->>'id' IS NOT NULL
    );

  INSERT INTO quiz_blocks (id, quiz_id, type, content, weight, "order", model_answer, grading_notes)
  SELECT
    (elem->>'id')::UUID,
    p_quiz_id,
    elem->>'type',
    COALESCE(elem->'content', '{}'::jsonb),
    NULLIF(elem->>'weight', '')::NUMERIC,
    (elem->>'order')::INTEGER,
    elem->>'model_answer',
    elem->>'grading_notes'
  FROM jsonb_array_elements(p_blocks) AS elem
  ON CONFLICT (id) DO UPDATE SET
    type = EXCLUDED.type,
    content = EXCLUDED.content,
    weight = EXCLUDED.weight,
    "order" = EXCLUDED."order",
    -- Preserve existing values when client omits these.
    model_answer = COALESCE(EXCLUDED.model_answer, quiz_blocks.model_answer),
    grading_notes = COALESCE(EXCLUDED.grading_notes, quiz_blocks.grading_notes);

  RETURN QUERY
  SELECT *
  FROM quiz_blocks
  WHERE quiz_id = p_quiz_id
  ORDER BY "order" ASC;
END;
$$;

REVOKE ALL ON FUNCTION save_quiz_blocks(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_quiz_blocks(UUID, JSONB) TO authenticated;

COMMENT ON FUNCTION save_quiz_blocks IS
  'Atomic save of all quiz_blocks for a quiz. Owner-only via explicit check. Replaces the client-side 4-pass diff in quizzes.api.ts:saveBlocks.';
