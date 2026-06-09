-- Atomic, transactional save for quiz_blocks.
--
-- Replaces the client-side 4-pass diff in quizzes.api.ts:saveBlocks, which
-- made ~3N round-trips per save with no atomicity (partial failures left the
-- DB half-written, concurrent saves interleaved). This RPC does the diff in
-- one transaction: 1 round-trip, all-or-nothing, serializable.
--
-- Inputs: p_quiz_id and p_blocks (jsonb array of { id, type, content, weight, order }).
-- Client supplies the UUIDs (crypto.randomUUID for new blocks).
--
-- Behavior: DELETE rows not in p_blocks; UPSERT every row by id.
-- model_answer and grading_notes are preserved when the client omits them.
--
-- SECURITY DEFINER bypasses RLS; ownership is checked explicitly up front.

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
    -- Preserve existing values when the client omits them
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
  'Atomic save of all quiz_blocks for a quiz. Owner-only. Replaces the client-side 4-pass diff in quizzes.api.ts:saveBlocks.';
