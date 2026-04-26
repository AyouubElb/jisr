-- ============================================================================
-- Migration: AI generations telemetry table
--
-- Central log for every AI call made on the platform. Every agent (quiz gen,
-- auto-grader, intervention assistant, etc.) writes one row per generation.
--
-- Used for: cost tracking, quota enforcement, quality measurement (acceptance
-- rate), A/B testing prompts, debugging failures.
--
-- Run this in Supabase Dashboard -> SQL Editor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Who + what
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,                    -- 'quiz_gen' | 'free_text_grade' | etc.
  model TEXT NOT NULL,                      -- 'gemini-2.5-flash' | 'claude-sonnet-4-6'
  provider TEXT NOT NULL,                   -- 'google' | 'anthropic'
  prompt_version TEXT NOT NULL,             -- 'quiz_gen_v1'

  -- Inputs (for replay + debugging)
  input_context JSONB,                      -- feature-specific input (lesson_ids, level, ...)
  input_hash TEXT,                          -- sha256 of full prompt (dedup / cache analysis)

  -- Outputs
  output JSONB,                             -- the structured result
  schema_valid BOOLEAN NOT NULL DEFAULT TRUE,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Cost + perf
  input_tokens INTEGER,
  output_tokens INTEGER,
  cache_read_tokens INTEGER,
  latency_ms INTEGER,
  cost_cents NUMERIC(10, 4),

  -- Linkage to resulting entity (feature-specific)
  output_quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,

  -- Quality feedback (filled later via instructor actions or UI)
  instructor_accepted BOOLEAN,              -- published without edit
  instructor_edited BOOLEAN,                -- published with edits
  instructor_rejected BOOLEAN,              -- deleted draft
  instructor_rating SMALLINT,               -- optional 1-5 thumbs

  error TEXT
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

-- List a user's generations by date
CREATE INDEX IF NOT EXISTS idx_ai_gen_user_created
  ON ai_generations (user_id, created_at DESC);

-- Quota enforcement: count generations per user per feature per month
CREATE INDEX IF NOT EXISTS idx_ai_gen_feature_user_month
  ON ai_generations (feature, user_id, created_at DESC);

-- Dedup / cache hit analysis
CREATE INDEX IF NOT EXISTS idx_ai_gen_input_hash
  ON ai_generations (input_hash)
  WHERE input_hash IS NOT NULL;

-- Reverse lookup: which generation produced this quiz?
CREATE INDEX IF NOT EXISTS idx_ai_gen_output_quiz
  ON ai_generations (output_quiz_id)
  WHERE output_quiz_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Users read their own generation logs (for usage dashboard + debugging)
CREATE POLICY "ai_generations_select_own"
  ON ai_generations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT from server-side Route handler using the user's session. The route
-- must stamp user_id = auth.uid() on every row. This matches the pattern used
-- by every other user-owned table on the platform.
CREATE POLICY "ai_generations_insert_own"
  ON ai_generations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE allowed for the owning user, for acceptance/edit/rating flags set by
-- downstream UI actions (publish quiz, rate generation, etc.).
CREATE POLICY "ai_generations_update_own"
  ON ai_generations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
