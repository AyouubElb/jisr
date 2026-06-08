-- ============================================================================
-- English Teaching Platform — Database Schema (full, generated)
-- ============================================================================
-- Authoritative schema, generated from the live database via:
--   pg_dump --schema=public --schema-only --no-owner --no-privileges
-- then cleaned (psql meta-commands stripped, CREATE SCHEMA made idempotent),
-- with the storage section (buckets + storage.objects policies) appended since
-- pg_dump --schema=public does not capture them.
--
-- Rebuild a fresh project: run this whole file in the Supabase SQL Editor.
-- Do NOT hand-edit to track changes — add a numbered migration in
-- supabase/migrations/ and regenerate this file from the live DB.
-- See docs/PRE-LAUNCH.md and SECURITY.md.
-- ============================================================================


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--




--
-- Name: section_item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.section_item_type AS ENUM (
    'lesson',
    'quiz'
);


--
-- Name: bump_question_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bump_question_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE course_questions
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$;


--
-- Name: consume_invite_and_create_profile(text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_invite_and_create_profile(p_token text, p_email text, p_user_id uuid, p_full_name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_invite invites;
BEGIN
  -- Atomic consume: succeeds only if invite is valid AND email matches.
  -- The WHERE clause is the race-safety guarantee.
  UPDATE invites SET consumed_at = NOW()
  WHERE token = p_token
    AND email = p_email
    AND consumed_at IS NULL
    AND expires_at > NOW()
  RETURNING * INTO v_invite;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid, expired, or already-consumed invite';
  END IF;

  -- Upsert profile (handles the case where a profile row was created by an
  -- auth trigger before this call).
  INSERT INTO profiles (id, full_name, role, status, tier)
  VALUES (p_user_id, p_full_name, 'instructor', 'active', 'free')
  ON CONFLICT (id) DO UPDATE
    SET status    = 'active',
        full_name = EXCLUDED.full_name,
        role      = 'instructor',
        tier      = COALESCE(profiles.tier, 'free');
END $$;


--
-- Name: create_student_profile_and_enroll(uuid, text, text, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_student_profile_and_enroll(p_student_id uuid, p_full_name text, p_level text, p_instructor_id uuid, p_course_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- 1) Profile row (Supabase Auth trigger may have created an empty one already).
  INSERT INTO profiles (id, full_name, role, status, tier, level)
  VALUES (p_student_id, p_full_name, 'student', 'active', 'free', p_level)
  ON CONFLICT (id) DO UPDATE
    SET full_name = excluded.full_name,
        role      = 'student',
        status    = 'active',
        level     = COALESCE(excluded.level, profiles.level);

  -- 2) instructor_students link so the instructor can see this student.
  INSERT INTO instructor_students (instructor_id, student_id)
  VALUES (p_instructor_id, p_student_id)
  ON CONFLICT DO NOTHING;

  -- 3) Enroll in course if provided.
  IF p_course_id IS NOT NULL THEN
    INSERT INTO enrollments (student_id, course_id)
    VALUES (p_student_id, p_course_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;


--
-- Name: enforce_admin_profile_update_scope(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_admin_profile_update_scope() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only restrict admin-on-other-user updates. A user editing their own
  -- profile, or a non-admin update path (Supabase service-role, RPCs,
  -- the user's own self-update policy), is allowed to touch any column.
  IF is_admin() AND auth.uid() IS DISTINCT FROM NEW.id THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'admin cannot change profile id';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'admin cannot change role via profile update';
    END IF;
    IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
      RAISE EXCEPTION 'admin cannot change full_name';
    END IF;
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
      RAISE EXCEPTION 'admin cannot change avatar_url';
    END IF;
    IF NEW.level IS DISTINCT FROM OLD.level THEN
      RAISE EXCEPTION 'admin cannot change level';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'admin cannot change organization_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: generation_evaluations_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generation_evaluations_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: get_invite_by_token(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_invite_by_token(p_token text) RETURNS TABLE(email text, kind text, full_name text, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT i.email, i.kind, i.full_name, i.expires_at
  FROM invites i
  WHERE i.token = p_token
    AND i.consumed_at IS NULL
    AND i.expires_at > NOW();
END $$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: is_actively_enrolled(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_actively_enrolled(p_student_id uuid, p_course_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments
    WHERE student_id = p_student_id
      AND course_id = p_course_id
      AND removed_at IS NULL
  );
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;


--
-- Name: reorder_section_item(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reorder_section_item(p_section_item_id uuid, p_new_position integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION reorder_section_item(p_section_item_id uuid, p_new_position integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.reorder_section_item(p_section_item_id uuid, p_new_position integer) IS 'Move a section item to a new position. Atomically renumbers siblings so positions stay 1..N. Authorization: caller must own the parent course.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: quiz_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    type text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    weight numeric,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    model_answer text,
    grading_notes text,
    CONSTRAINT quiz_blocks_type_check CHECK ((type = ANY (ARRAY['text'::text, 'audio'::text, 'image'::text, 'mcq'::text, 'fill_blank'::text, 'free_text'::text, 'voice'::text, 'section'::text]))),
    CONSTRAINT quiz_blocks_weight_positive CHECK (((weight IS NULL) OR (weight > (0)::numeric)))
);


--
-- Name: save_quiz_blocks(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_quiz_blocks(p_quiz_id uuid, p_blocks jsonb) RETURNS SETOF public.quiz_blocks
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION save_quiz_blocks(p_quiz_id uuid, p_blocks jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.save_quiz_blocks(p_quiz_id uuid, p_blocks jsonb) IS 'Atomic save of all quiz_blocks for a quiz. Owner-only via explicit check. Replaces the client-side 4-pass diff in quizzes.api.ts:saveBlocks.';


--
-- Name: section_items_on_lesson_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.section_items_on_lesson_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: section_items_on_lesson_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.section_items_on_lesson_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: section_items_on_quiz_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.section_items_on_quiz_delete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: section_items_on_quiz_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.section_items_on_quiz_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: student_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    student_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    submitted_at timestamp with time zone,
    final_score numeric,
    status text DEFAULT 'in_progress'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    auto_score numeric,
    graded_at timestamp with time zone,
    graded_by uuid,
    CONSTRAINT student_attempts_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'submitted'::text, 'pending_review'::text, 'graded'::text])))
);


--
-- Name: start_quiz_attempt(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_quiz_attempt(p_quiz_id uuid) RETURNS public.student_attempts
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_max_attempts INT;
  v_used_count INT;
  v_course_id UUID;
  v_attempt student_attempts%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifie' USING ERRCODE = '42501';
  END IF;

  -- Resolve the course this quiz belongs to (quiz → section → course).
  SELECT s.course_id, q.max_attempts
    INTO v_course_id, v_max_attempts
  FROM quizzes q
  JOIN sections s ON s.id = q.section_id
  WHERE q.id = p_quiz_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Quiz introuvable' USING ERRCODE = '42704';
  END IF;

  -- Verify active enrollment (uses the existing helper).
  IF NOT is_actively_enrolled(v_user_id, v_course_id) THEN
    RAISE EXCEPTION 'Vous n''etes pas inscrit a ce cours' USING ERRCODE = '42501';
  END IF;

  -- Cap check (NULL max_attempts = unlimited).
  IF v_max_attempts IS NOT NULL THEN
    SELECT COUNT(*) INTO v_used_count
    FROM student_attempts
    WHERE quiz_id = p_quiz_id AND student_id = v_user_id;

    IF v_used_count >= v_max_attempts THEN
      RAISE EXCEPTION 'Vous avez atteint le nombre maximum de tentatives pour ce quiz.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Insert and return the new row.
  INSERT INTO student_attempts (quiz_id, student_id, started_at, status)
  VALUES (p_quiz_id, v_user_id, NOW(), 'in_progress')
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;


--
-- Name: FUNCTION start_quiz_attempt(p_quiz_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.start_quiz_attempt(p_quiz_id uuid) IS 'Atomically checks quizzes.max_attempts and creates an in_progress attempt. Replaces the client-side check in attemptsApi.start() so the cap cannot be bypassed via direct table inserts.';


--
-- Name: student_is_enrolled(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.student_is_enrolled(p_course_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments
    WHERE course_id = p_course_id
      AND student_id = auth.uid()
  );
$$;


--
-- Name: touch_enrollment_activity(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_enrollment_activity(p_course_id uuid) RETURNS void
    LANGUAGE sql
    AS $$
  UPDATE enrollments
  SET last_active_at = NOW()
  WHERE course_id = p_course_id AND student_id = auth.uid();
$$;


--
-- Name: update_enrollment_last_active(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_enrollment_last_active() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_course_id UUID;
BEGIN
  -- Resolve course_id from the affected row
  IF TG_TABLE_NAME = 'student_attempts' THEN
    SELECT s.course_id INTO v_course_id
    FROM quizzes q JOIN sections s ON s.id = q.section_id
    WHERE q.id = NEW.quiz_id;
  ELSIF TG_TABLE_NAME = 'lesson_completions' THEN
    SELECT s.course_id INTO v_course_id
    FROM lessons l JOIN sections s ON s.id = l.section_id
    WHERE l.id = NEW.lesson_id;
  END IF;

  IF v_course_id IS NOT NULL THEN
    UPDATE enrollments
    SET last_active_at = NOW()
    WHERE student_id = NEW.student_id AND course_id = v_course_id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: ai_audio_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_audio_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    script_hash text NOT NULL,
    voice_id text NOT NULL,
    speed numeric(3,2) DEFAULT 1.0 NOT NULL,
    audio_url text NOT NULL,
    storage_path text NOT NULL,
    char_count integer NOT NULL,
    duration_seconds numeric(6,2),
    provider text DEFAULT 'google'::text NOT NULL,
    model text
);


--
-- Name: ai_generations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_generations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    feature text NOT NULL,
    model text NOT NULL,
    provider text NOT NULL,
    prompt_version text NOT NULL,
    input_context jsonb,
    input_hash text,
    output jsonb,
    schema_valid boolean DEFAULT true NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    input_tokens integer,
    output_tokens integer,
    cache_read_tokens integer,
    latency_ms integer,
    cost_cents numeric(10,4),
    output_quiz_id uuid,
    instructor_accepted boolean,
    instructor_edited boolean,
    instructor_rejected boolean,
    instructor_rating smallint,
    error text
);


--
-- Name: course_question_replies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_question_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    author_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    student_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT course_questions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text])))
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instructor_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    level text NOT NULL,
    thumbnail_url text,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    CONSTRAINT courses_level_check CHECK ((level = ANY (ARRAY['A1'::text, 'A2'::text, 'B1'::text, 'B2'::text, 'C1'::text, 'C2'::text])))
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    course_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active_at timestamp with time zone,
    removed_at timestamp with time zone,
    organization_id uuid
);


--
-- Name: COLUMN enrollments.removed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.enrollments.removed_at IS 'NULL = active enrollment. NOT NULL = soft-removed (data preserved, access denied via RLS).';


--
-- Name: generation_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generation_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    generation_id uuid NOT NULL,
    evaluator_id uuid,
    evaluator_type text DEFAULT 'human'::text NOT NULL,
    rubric_key text NOT NULL,
    scores jsonb NOT NULL,
    notes text,
    CONSTRAINT ai_evaluations_evaluator_type_check CHECK ((evaluator_type = ANY (ARRAY['human'::text, 'llm_judge'::text])))
);


--
-- Name: generation_eval_agreement; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.generation_eval_agreement AS
 SELECT h.generation_id,
    h.rubric_key,
    h.scores AS human_scores,
    h.notes AS human_notes,
    h.evaluator_id AS human_evaluator_id,
    h.updated_at AS human_updated_at,
    j.scores AS judge_scores,
    j.notes AS judge_notes,
    j.updated_at AS judge_updated_at
   FROM (public.generation_evaluations h
     JOIN public.generation_evaluations j ON (((j.generation_id = h.generation_id) AND (j.rubric_key = h.rubric_key) AND (j.evaluator_type = 'llm_judge'::text))))
  WHERE (h.evaluator_type = 'human'::text);


--
-- Name: instructor_students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instructor_students (
    instructor_id uuid NOT NULL,
    student_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now()
);


--
-- Name: invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token text NOT NULL,
    email text NOT NULL,
    kind text NOT NULL,
    instructor_id uuid,
    full_name text,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invites_kind_check CHECK ((kind = ANY (ARRAY['student'::text, 'instructor'::text])))
);


--
-- Name: lesson_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    student_id uuid NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    type text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    section_id uuid NOT NULL,
    CONSTRAINT lessons_type_check CHECK ((type = ANY (ARRAY['grammar'::text, 'vocabulary'::text, 'resource'::text])))
);


--
-- Name: live_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    meeting_link text NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lesson_id uuid NOT NULL,
    name text NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    read_at timestamp with time zone,
    emailed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    role text NOT NULL,
    avatar_url text,
    level text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text,
    tier text DEFAULT 'free'::text,
    organization_id uuid,
    CONSTRAINT profiles_level_check CHECK ((level = ANY (ARRAY['A1'::text, 'A2'::text, 'B1'::text, 'B2'::text, 'C1'::text, 'C2'::text]))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['student'::text, 'instructor'::text, 'admin'::text]))),
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text]))),
    CONSTRAINT profiles_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'pro'::text, 'studio'::text])))
);


--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    time_limit_minutes integer,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    passing_score integer DEFAULT 60 NOT NULL,
    max_attempts integer,
    CONSTRAINT quizzes_passing_score_check CHECK (((passing_score >= 0) AND (passing_score <= 100)))
);


--
-- Name: COLUMN quizzes.max_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quizzes.max_attempts IS 'NULL = unlimited retakes. Positive integer = cap on number of attempts per student.';


--
-- Name: section_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    item_type public.section_item_type NOT NULL,
    item_id uuid NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT section_items_position_check CHECK (("position" > 0))
);


--
-- Name: TABLE section_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.section_items IS 'Shared ordering for lessons + quizzes within a section. One row per lesson or quiz; position is unique within a section. Maintained by triggers on lessons/quizzes — app code does not touch this table directly.';


--
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: session_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    attended boolean DEFAULT false NOT NULL,
    marked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    block_id uuid NOT NULL,
    is_correct boolean,
    earned_weight numeric,
    instructor_feedback text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    answer jsonb DEFAULT '{}'::jsonb NOT NULL,
    graded_at timestamp with time zone,
    ai_score numeric,
    ai_is_correct boolean,
    ai_rationale text,
    ai_errors jsonb,
    ai_graded_at timestamp with time zone,
    ai_model text,
    ai_prompt_version text,
    CONSTRAINT student_answers_ai_score_range CHECK (((ai_score IS NULL) OR ((ai_score >= (0)::numeric) AND (ai_score <= (10)::numeric)))),
    CONSTRAINT student_answers_earned_weight_nonneg CHECK (((earned_weight IS NULL) OR (earned_weight >= (0)::numeric)))
);


--
-- Name: waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    current_situation text NOT NULL,
    time_sink text NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_audio_cache ai_audio_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_audio_cache
    ADD CONSTRAINT ai_audio_cache_pkey PRIMARY KEY (id);


--
-- Name: ai_audio_cache ai_audio_cache_script_hash_voice_id_speed_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_audio_cache
    ADD CONSTRAINT ai_audio_cache_script_hash_voice_id_speed_key UNIQUE (script_hash, voice_id, speed);


--
-- Name: generation_evaluations ai_evaluations_generation_id_rubric_key_evaluator_id_evalua_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_evaluations
    ADD CONSTRAINT ai_evaluations_generation_id_rubric_key_evaluator_id_evalua_key UNIQUE (generation_id, rubric_key, evaluator_id, evaluator_type);


--
-- Name: generation_evaluations ai_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_evaluations
    ADD CONSTRAINT ai_evaluations_pkey PRIMARY KEY (id);


--
-- Name: ai_generations ai_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generations
    ADD CONSTRAINT ai_generations_pkey PRIMARY KEY (id);


--
-- Name: course_question_replies course_question_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_question_replies
    ADD CONSTRAINT course_question_replies_pkey PRIMARY KEY (id);


--
-- Name: course_questions course_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_questions
    ADD CONSTRAINT course_questions_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_student_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_course_id_key UNIQUE (student_id, course_id);


--
-- Name: instructor_students instructor_students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructor_students
    ADD CONSTRAINT instructor_students_pkey PRIMARY KEY (instructor_id, student_id);


--
-- Name: invites invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_pkey PRIMARY KEY (id);


--
-- Name: invites invites_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_token_key UNIQUE (token);


--
-- Name: lesson_completions lesson_completions_lesson_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_completions
    ADD CONSTRAINT lesson_completions_lesson_id_student_id_key UNIQUE (lesson_id, student_id);


--
-- Name: lesson_completions lesson_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_completions
    ADD CONSTRAINT lesson_completions_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: live_sessions live_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: quiz_blocks quiz_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_blocks
    ADD CONSTRAINT quiz_blocks_pkey PRIMARY KEY (id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: section_items section_items_item_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_items
    ADD CONSTRAINT section_items_item_unique UNIQUE (item_type, item_id);


--
-- Name: section_items section_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_items
    ADD CONSTRAINT section_items_pkey PRIMARY KEY (id);


--
-- Name: section_items section_items_position_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_items
    ADD CONSTRAINT section_items_position_unique UNIQUE (section_id, "position") DEFERRABLE INITIALLY DEFERRED;


--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- Name: session_attendance session_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_pkey PRIMARY KEY (id);


--
-- Name: session_attendance session_attendance_session_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_session_id_student_id_key UNIQUE (session_id, student_id);


--
-- Name: student_answers student_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_pkey PRIMARY KEY (id);


--
-- Name: student_attempts student_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attempts
    ADD CONSTRAINT student_attempts_pkey PRIMARY KEY (id);


--
-- Name: waitlist waitlist_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_email_key UNIQUE (email);


--
-- Name: waitlist waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_audio_cache_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_audio_cache_lookup ON public.ai_audio_cache USING btree (script_hash, voice_id, speed);


--
-- Name: idx_ai_gen_feature_user_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_gen_feature_user_month ON public.ai_generations USING btree (feature, user_id, created_at DESC);


--
-- Name: idx_ai_gen_input_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_gen_input_hash ON public.ai_generations USING btree (input_hash) WHERE (input_hash IS NOT NULL);


--
-- Name: idx_ai_gen_output_quiz; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_gen_output_quiz ON public.ai_generations USING btree (output_quiz_id) WHERE (output_quiz_id IS NOT NULL);


--
-- Name: idx_ai_gen_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_gen_user_created ON public.ai_generations USING btree (user_id, created_at DESC);


--
-- Name: idx_course_question_replies_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_question_replies_question ON public.course_question_replies USING btree (question_id, created_at);


--
-- Name: idx_course_questions_course_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_questions_course_activity ON public.course_questions USING btree (course_id, last_activity_at DESC);


--
-- Name: idx_course_questions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_questions_student ON public.course_questions USING btree (student_id);


--
-- Name: idx_courses_instructor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_instructor ON public.courses USING btree (instructor_id);


--
-- Name: idx_courses_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_level ON public.courses USING btree (level) WHERE (is_published = true);


--
-- Name: idx_courses_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_organization ON public.courses USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_enrollments_active_student_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_active_student_course ON public.enrollments USING btree (student_id, course_id) WHERE (removed_at IS NULL);


--
-- Name: idx_enrollments_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_course ON public.enrollments USING btree (course_id);


--
-- Name: idx_enrollments_last_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_last_active ON public.enrollments USING btree (last_active_at DESC NULLS LAST);


--
-- Name: idx_enrollments_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_organization ON public.enrollments USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_enrollments_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_student ON public.enrollments USING btree (student_id);


--
-- Name: idx_generation_evaluations_generation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generation_evaluations_generation ON public.generation_evaluations USING btree (generation_id);


--
-- Name: idx_generation_evaluations_rubric_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generation_evaluations_rubric_created ON public.generation_evaluations USING btree (rubric_key, created_at DESC);


--
-- Name: idx_lesson_completions_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_completions_lesson ON public.lesson_completions USING btree (lesson_id);


--
-- Name: idx_lesson_completions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_completions_student ON public.lesson_completions USING btree (student_id);


--
-- Name: idx_lessons_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_section ON public.lessons USING btree (section_id);


--
-- Name: idx_materials_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_lesson ON public.materials USING btree (lesson_id);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_profiles_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_organization ON public.profiles USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_quiz_blocks_quiz; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_blocks_quiz ON public.quiz_blocks USING btree (quiz_id);


--
-- Name: idx_quizzes_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quizzes_section ON public.quizzes USING btree (section_id);


--
-- Name: idx_sections_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sections_course ON public.sections USING btree (course_id);


--
-- Name: idx_session_attendance_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_attendance_session ON public.session_attendance USING btree (session_id);


--
-- Name: idx_session_attendance_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_attendance_student ON public.session_attendance USING btree (student_id);


--
-- Name: idx_sessions_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_course ON public.live_sessions USING btree (course_id);


--
-- Name: idx_student_answers_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_answers_attempt ON public.student_answers USING btree (attempt_id);


--
-- Name: idx_student_answers_attempt_block; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_student_answers_attempt_block ON public.student_answers USING btree (attempt_id, block_id);


--
-- Name: idx_student_attempts_quiz; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_attempts_quiz ON public.student_attempts USING btree (quiz_id);


--
-- Name: idx_student_attempts_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_attempts_student ON public.student_attempts USING btree (student_id);


--
-- Name: invites_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invites_email_idx ON public.invites USING btree (email);


--
-- Name: invites_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invites_token_idx ON public.invites USING btree (token);


--
-- Name: section_items_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX section_items_lookup_idx ON public.section_items USING btree (item_type, item_id);


--
-- Name: section_items_section_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX section_items_section_position_idx ON public.section_items USING btree (section_id, "position");


--
-- Name: waitlist_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_created_at_idx ON public.waitlist USING btree (created_at DESC);


--
-- Name: waitlist_current_situation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_current_situation_idx ON public.waitlist USING btree (current_situation);


--
-- Name: waitlist_time_sink_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX waitlist_time_sink_idx ON public.waitlist USING btree (time_sink);


--
-- Name: profiles enforce_admin_profile_update_scope; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_admin_profile_update_scope BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_profile_update_scope();


--
-- Name: lessons lessons_after_delete_section_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lessons_after_delete_section_item AFTER DELETE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.section_items_on_lesson_delete();


--
-- Name: lessons lessons_after_insert_section_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lessons_after_insert_section_item AFTER INSERT ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.section_items_on_lesson_insert();


--
-- Name: course_question_replies on_reply_bump_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_reply_bump_activity AFTER INSERT ON public.course_question_replies FOR EACH ROW EXECUTE FUNCTION public.bump_question_activity();


--
-- Name: quizzes quizzes_after_delete_section_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quizzes_after_delete_section_item AFTER DELETE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.section_items_on_quiz_delete();


--
-- Name: quizzes quizzes_after_insert_section_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quizzes_after_insert_section_item AFTER INSERT ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.section_items_on_quiz_insert();


--
-- Name: student_attempts trg_attempt_touch_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_attempt_touch_activity AFTER INSERT ON public.student_attempts FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_last_active();


--
-- Name: lesson_completions trg_completion_touch_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_completion_touch_activity AFTER INSERT ON public.lesson_completions FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_last_active();


--
-- Name: generation_evaluations trg_generation_evaluations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generation_evaluations_updated_at BEFORE UPDATE ON public.generation_evaluations FOR EACH ROW EXECUTE FUNCTION public.generation_evaluations_set_updated_at();


--
-- Name: generation_evaluations ai_evaluations_evaluator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_evaluations
    ADD CONSTRAINT ai_evaluations_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: generation_evaluations ai_evaluations_generation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_evaluations
    ADD CONSTRAINT ai_evaluations_generation_id_fkey FOREIGN KEY (generation_id) REFERENCES public.ai_generations(id) ON DELETE CASCADE;


--
-- Name: ai_generations ai_generations_output_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generations
    ADD CONSTRAINT ai_generations_output_quiz_id_fkey FOREIGN KEY (output_quiz_id) REFERENCES public.quizzes(id) ON DELETE SET NULL;


--
-- Name: ai_generations ai_generations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generations
    ADD CONSTRAINT ai_generations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: course_question_replies course_question_replies_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_question_replies
    ADD CONSTRAINT course_question_replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: course_question_replies course_question_replies_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_question_replies
    ADD CONSTRAINT course_question_replies_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.course_questions(id) ON DELETE CASCADE;


--
-- Name: course_questions course_questions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_questions
    ADD CONSTRAINT course_questions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_questions course_questions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_questions
    ADD CONSTRAINT course_questions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: courses courses_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: instructor_students instructor_students_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructor_students
    ADD CONSTRAINT instructor_students_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: instructor_students instructor_students_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructor_students
    ADD CONSTRAINT instructor_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: invites invites_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invites
    ADD CONSTRAINT invites_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.profiles(id);


--
-- Name: lesson_completions lesson_completions_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_completions
    ADD CONSTRAINT lesson_completions_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_completions lesson_completions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_completions
    ADD CONSTRAINT lesson_completions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;


--
-- Name: live_sessions live_sessions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT live_sessions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: materials materials_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quiz_blocks quiz_blocks_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_blocks
    ADD CONSTRAINT quiz_blocks_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;


--
-- Name: section_items section_items_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_items
    ADD CONSTRAINT section_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;


--
-- Name: sections sections_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: session_attendance session_attendance_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.live_sessions(id) ON DELETE CASCADE;


--
-- Name: session_attendance session_attendance_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_attendance
    ADD CONSTRAINT session_attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: student_answers student_answers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.student_attempts(id) ON DELETE CASCADE;


--
-- Name: student_answers student_answers_block_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.quiz_blocks(id) ON DELETE CASCADE;


--
-- Name: student_attempts student_attempts_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attempts
    ADD CONSTRAINT student_attempts_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: student_attempts student_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attempts
    ADD CONSTRAINT student_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: student_attempts student_attempts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_attempts
    ADD CONSTRAINT student_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: invites admins manage invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins manage invites" ON public.invites TO authenticated USING ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text)) WITH CHECK ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text));


--
-- Name: ai_audio_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_audio_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_audio_cache ai_audio_cache_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_audio_cache_insert_authenticated ON public.ai_audio_cache FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: ai_audio_cache ai_audio_cache_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_audio_cache_select_authenticated ON public.ai_audio_cache FOR SELECT TO authenticated USING (true);


--
-- Name: ai_generations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_generations ai_generations_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_generations_insert_own ON public.ai_generations FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: ai_generations ai_generations_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_generations_select_admin ON public.ai_generations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: ai_generations ai_generations_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_generations_select_own ON public.ai_generations FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: ai_generations ai_generations_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_generations_update_own ON public.ai_generations FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: course_question_replies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_question_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: course_question_replies course_question_replies_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_question_replies_delete_own ON public.course_question_replies FOR DELETE TO authenticated USING ((author_id = auth.uid()));


--
-- Name: course_question_replies course_question_replies_insert_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_question_replies_insert_parties ON public.course_question_replies FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.course_questions q
  WHERE ((q.id = course_question_replies.question_id) AND ((q.student_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.courses c
          WHERE ((c.id = q.course_id) AND (c.instructor_id = auth.uid()))))))))));


--
-- Name: course_question_replies course_question_replies_select_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_question_replies_select_parties ON public.course_question_replies FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.course_questions q
  WHERE ((q.id = course_question_replies.question_id) AND ((q.student_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.courses c
          WHERE ((c.id = q.course_id) AND (c.instructor_id = auth.uid())))))))));


--
-- Name: course_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: course_questions course_questions_delete_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_questions_delete_parties ON public.course_questions FOR DELETE TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_questions.course_id) AND (c.instructor_id = auth.uid()))))));


--
-- Name: course_questions course_questions_insert_enrolled_student; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_questions_insert_enrolled_student ON public.course_questions FOR INSERT TO authenticated WITH CHECK (((student_id = auth.uid()) AND public.is_actively_enrolled(auth.uid(), course_id)));


--
-- Name: course_questions course_questions_select_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_questions_select_parties ON public.course_questions FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_questions.course_id) AND (c.instructor_id = auth.uid()))))));


--
-- Name: course_questions course_questions_update_parties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_questions_update_parties ON public.course_questions FOR UPDATE TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = course_questions.course_id) AND (c.instructor_id = auth.uid()))))));


--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: courses courses_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_delete_own ON public.courses FOR DELETE TO authenticated USING ((instructor_id = auth.uid()));


--
-- Name: courses courses_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_insert_own ON public.courses FOR INSERT TO authenticated WITH CHECK (((instructor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'instructor'::text))))));


--
-- Name: courses courses_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_select_admin ON public.courses FOR SELECT USING (public.is_admin());


--
-- Name: courses courses_select_enrolled_or_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_select_enrolled_or_own ON public.courses FOR SELECT TO authenticated USING (((instructor_id = auth.uid()) OR ((is_published = true) AND public.is_actively_enrolled(auth.uid(), id))));


--
-- Name: courses courses_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_update_own ON public.courses FOR UPDATE TO authenticated USING ((instructor_id = auth.uid())) WITH CHECK ((instructor_id = auth.uid()));


--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments enrollments_delete_instructor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_delete_instructor ON public.enrollments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = enrollments.course_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: enrollments enrollments_insert_instructor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_insert_instructor ON public.enrollments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = enrollments.course_id) AND (c.instructor_id = auth.uid()) AND (c.is_published = true)))));


--
-- Name: enrollments enrollments_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_select_admin ON public.enrollments FOR SELECT USING (public.is_admin());


--
-- Name: enrollments enrollments_select_own_or_course_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_select_own_or_course_owner ON public.enrollments FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = enrollments.course_id) AND (c.instructor_id = auth.uid()))))));


--
-- Name: enrollments enrollments_update_instructor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_update_instructor ON public.enrollments FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = enrollments.course_id) AND (c.instructor_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = enrollments.course_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: generation_evaluations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generation_evaluations ENABLE ROW LEVEL SECURITY;

--
-- Name: generation_evaluations generation_evaluations_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY generation_evaluations_delete_admin ON public.generation_evaluations FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: generation_evaluations generation_evaluations_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY generation_evaluations_insert_admin ON public.generation_evaluations FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: generation_evaluations generation_evaluations_insert_llm_judge_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY generation_evaluations_insert_llm_judge_owner ON public.generation_evaluations FOR INSERT TO authenticated WITH CHECK (((evaluator_type = 'llm_judge'::text) AND (evaluator_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.ai_generations g
  WHERE ((g.id = generation_evaluations.generation_id) AND (g.user_id = auth.uid()))))));


--
-- Name: generation_evaluations generation_evaluations_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY generation_evaluations_select_admin ON public.generation_evaluations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: generation_evaluations generation_evaluations_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY generation_evaluations_update_admin ON public.generation_evaluations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: instructor_students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.instructor_students ENABLE ROW LEVEL SECURITY;

--
-- Name: instructor_students instructor_students_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY instructor_students_delete_own ON public.instructor_students FOR DELETE TO authenticated USING ((instructor_id = auth.uid()));


--
-- Name: instructor_students instructor_students_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY instructor_students_select_admin ON public.instructor_students FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: instructor_students instructor_students_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY instructor_students_select_own ON public.instructor_students FOR SELECT TO authenticated USING (((instructor_id = auth.uid()) OR (student_id = auth.uid())));


--
-- Name: invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_completions lesson_completions_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_completions_delete_own ON public.lesson_completions FOR DELETE TO authenticated USING ((student_id = auth.uid()));


--
-- Name: lesson_completions lesson_completions_insert_own_if_enrolled; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_completions_insert_own_if_enrolled ON public.lesson_completions FOR INSERT TO authenticated WITH CHECK (((student_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.lessons l
     JOIN public.sections s ON ((s.id = l.section_id)))
  WHERE ((l.id = lesson_completions.lesson_id) AND public.is_actively_enrolled(auth.uid(), s.course_id))))));


--
-- Name: lesson_completions lesson_completions_select_own_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lesson_completions_select_own_or_owner ON public.lesson_completions FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM ((public.lessons l
     JOIN public.sections s ON ((s.id = l.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((l.id = lesson_completions.lesson_id) AND (c.instructor_id = auth.uid()))))));


--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons lessons_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_delete_owner ON public.lessons FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = lessons.section_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: lessons lessons_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_insert_owner ON public.lessons FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = lessons.section_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: lessons lessons_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_select_admin ON public.lessons FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- Name: lessons lessons_select_enrolled_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_select_enrolled_or_owner ON public.lessons FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = lessons.section_id) AND ((c.instructor_id = auth.uid()) OR public.is_actively_enrolled(auth.uid(), c.id))))));


--
-- Name: lessons lessons_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lessons_update_owner ON public.lessons FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = lessons.section_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: live_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

--
-- Name: materials materials_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY materials_delete_owner ON public.materials FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.lessons l
     JOIN public.sections s ON ((s.id = l.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((l.id = materials.lesson_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: materials materials_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY materials_insert_owner ON public.materials FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.lessons l
     JOIN public.sections s ON ((s.id = l.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((l.id = materials.lesson_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: materials materials_select_enrolled_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY materials_select_enrolled_or_owner ON public.materials FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.lessons l
     JOIN public.sections s ON ((s.id = l.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((l.id = materials.lesson_id) AND ((c.instructor_id = auth.uid()) OR public.is_actively_enrolled(auth.uid(), c.id))))));


--
-- Name: materials materials_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY materials_update_owner ON public.materials FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.lessons l
     JOIN public.sections s ON ((s.id = l.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((l.id = materials.lesson_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications select own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications select own" ON public.notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: notifications notifications update own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));


--
-- Name: profiles profiles_select_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_scoped ON public.profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.instructor_students ins
  WHERE ((ins.instructor_id = auth.uid()) AND (ins.student_id = profiles.id)))) OR (EXISTS ( SELECT 1
   FROM (public.enrollments e
     JOIN public.courses c ON ((c.id = e.course_id)))
  WHERE ((e.student_id = auth.uid()) AND (c.instructor_id = profiles.id) AND (e.removed_at IS NULL))))));


--
-- Name: profiles profiles_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: quiz_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_blocks quiz_blocks_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_blocks_delete_owner ON public.quiz_blocks FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.quizzes q
     JOIN public.sections s ON ((s.id = q.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((q.id = quiz_blocks.quiz_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: quiz_blocks quiz_blocks_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_blocks_insert_owner ON public.quiz_blocks FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.quizzes q
     JOIN public.sections s ON ((s.id = q.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((q.id = quiz_blocks.quiz_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: quiz_blocks quiz_blocks_select_enrolled_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_blocks_select_enrolled_or_owner ON public.quiz_blocks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.quizzes q
     JOIN public.sections s ON ((s.id = q.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((q.id = quiz_blocks.quiz_id) AND ((c.instructor_id = auth.uid()) OR public.is_actively_enrolled(auth.uid(), c.id))))));


--
-- Name: quiz_blocks quiz_blocks_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quiz_blocks_update_owner ON public.quiz_blocks FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.quizzes q
     JOIN public.sections s ON ((s.id = q.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((q.id = quiz_blocks.quiz_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: quizzes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

--
-- Name: quizzes quizzes_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quizzes_delete_owner ON public.quizzes FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = quizzes.section_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: quizzes quizzes_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quizzes_insert_owner ON public.quizzes FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = quizzes.section_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: quizzes quizzes_select_enrolled_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quizzes_select_enrolled_or_owner ON public.quizzes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = quizzes.section_id) AND ((c.instructor_id = auth.uid()) OR public.is_actively_enrolled(auth.uid(), c.id))))));


--
-- Name: quizzes quizzes_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quizzes_update_owner ON public.quizzes FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = quizzes.section_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: section_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.section_items ENABLE ROW LEVEL SECURITY;

--
-- Name: section_items section_items_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY section_items_delete_owner ON public.section_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = section_items.section_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: section_items section_items_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY section_items_insert_owner ON public.section_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = section_items.section_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: section_items section_items_select_enrolled_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY section_items_select_enrolled_or_owner ON public.section_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = section_items.section_id) AND ((c.instructor_id = auth.uid()) OR public.is_actively_enrolled(auth.uid(), c.id))))));


--
-- Name: section_items section_items_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY section_items_update_owner ON public.section_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.sections s
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((s.id = section_items.section_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

--
-- Name: sections sections_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sections_delete_owner ON public.sections FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = sections.course_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: sections sections_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sections_insert_owner ON public.sections FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = sections.course_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: sections sections_select_enrolled_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sections_select_enrolled_or_owner ON public.sections FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = sections.course_id) AND ((c.instructor_id = auth.uid()) OR public.is_actively_enrolled(auth.uid(), c.id))))));


--
-- Name: sections sections_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sections_update_owner ON public.sections FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = sections.course_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: session_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: session_attendance session_attendance_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_attendance_delete_owner ON public.session_attendance FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.live_sessions ls
     JOIN public.courses c ON ((c.id = ls.course_id)))
  WHERE ((ls.id = session_attendance.session_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: session_attendance session_attendance_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_attendance_insert_owner ON public.session_attendance FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.live_sessions ls
     JOIN public.courses c ON ((c.id = ls.course_id)))
  WHERE ((ls.id = session_attendance.session_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: session_attendance session_attendance_select_own_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_attendance_select_own_or_owner ON public.session_attendance FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.live_sessions ls
     JOIN public.courses c ON ((c.id = ls.course_id)))
  WHERE ((ls.id = session_attendance.session_id) AND (c.instructor_id = auth.uid()))))));


--
-- Name: session_attendance session_attendance_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_attendance_update_owner ON public.session_attendance FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.live_sessions ls
     JOIN public.courses c ON ((c.id = ls.course_id)))
  WHERE ((ls.id = session_attendance.session_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: live_sessions sessions_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_delete_owner ON public.live_sessions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = live_sessions.course_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: live_sessions sessions_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_insert_owner ON public.live_sessions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = live_sessions.course_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: live_sessions sessions_select_enrolled_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_select_enrolled_or_owner ON public.live_sessions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = live_sessions.course_id) AND ((c.instructor_id = auth.uid()) OR public.is_actively_enrolled(auth.uid(), c.id))))));


--
-- Name: live_sessions sessions_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_update_owner ON public.live_sessions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.courses c
  WHERE ((c.id = live_sessions.course_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: student_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: student_answers student_answers_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_answers_insert_own ON public.student_answers FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.student_attempts sa
  WHERE ((sa.id = student_answers.attempt_id) AND (sa.student_id = auth.uid())))));


--
-- Name: student_answers student_answers_select_own_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_answers_select_own_or_owner ON public.student_answers FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.student_attempts sa
  WHERE ((sa.id = student_answers.attempt_id) AND ((sa.student_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM ((public.quizzes q
             JOIN public.sections s ON ((s.id = q.section_id)))
             JOIN public.courses c ON ((c.id = s.course_id)))
          WHERE ((q.id = sa.quiz_id) AND (c.instructor_id = auth.uid())))))))));


--
-- Name: student_answers student_answers_update_instructor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_answers_update_instructor ON public.student_answers FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (((public.student_attempts sa
     JOIN public.quizzes q ON ((q.id = sa.quiz_id)))
     JOIN public.sections s ON ((s.id = q.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((sa.id = student_answers.attempt_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: student_answers student_answers_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_answers_update_own ON public.student_answers FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.student_attempts sa
  WHERE ((sa.id = student_answers.attempt_id) AND (sa.student_id = auth.uid())))));


--
-- Name: student_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: student_attempts student_attempts_insert_enrolled; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_attempts_insert_enrolled ON public.student_attempts FOR INSERT TO authenticated WITH CHECK (((student_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.quizzes q
     JOIN public.sections s ON ((s.id = q.section_id)))
  WHERE ((q.id = student_attempts.quiz_id) AND public.is_actively_enrolled(auth.uid(), s.course_id))))));


--
-- Name: student_attempts student_attempts_select_own_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_attempts_select_own_or_owner ON public.student_attempts FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM ((public.quizzes q
     JOIN public.sections s ON ((s.id = q.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((q.id = student_attempts.quiz_id) AND (c.instructor_id = auth.uid()))))));


--
-- Name: student_attempts student_attempts_update_instructor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_attempts_update_instructor ON public.student_attempts FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((public.quizzes q
     JOIN public.sections s ON ((s.id = q.section_id)))
     JOIN public.courses c ON ((c.id = s.course_id)))
  WHERE ((q.id = student_attempts.quiz_id) AND (c.instructor_id = auth.uid())))));


--
-- Name: student_attempts student_attempts_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_attempts_update_own ON public.student_attempts FOR UPDATE TO authenticated USING ((student_id = auth.uid()));


--
-- Name: waitlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

--
-- Name: waitlist waitlist insert public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "waitlist insert public" ON public.waitlist FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: waitlist waitlist select admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "waitlist select admin" ON public.waitlist FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- PostgreSQL database dump complete
--



-- ============================================================================
-- STORAGE — buckets + policies (not captured by pg_dump --schema=public)
-- ============================================================================


-- --- Buckets -----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('lesson-images', 'lesson-images', true),
  ('materials',     'materials',     false),
  ('quiz-audio',    'quiz-audio',    true)
ON CONFLICT (id) DO NOTHING;

-- --- lesson-images (public images embedded in lesson HTML) -------------------
CREATE POLICY "lesson_images_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lesson-images');

CREATE POLICY "lesson_images_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'lesson-images');

CREATE POLICY "lesson_images_delete_authenticated"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-images');

-- --- materials (private downloadable course files, signed URLs) --------------
CREATE POLICY "materials_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials');

CREATE POLICY "materials_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'materials');

CREATE POLICY "materials_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'materials');

-- --- quiz-audio (public AI-generated audio) ---------------------------------
CREATE POLICY "quiz_audio_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quiz-audio');

CREATE POLICY "quiz_audio_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'quiz-audio');
