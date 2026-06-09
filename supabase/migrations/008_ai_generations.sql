-- AI generations telemetry table.
-- Every AI call (quiz gen, grader, etc.) writes one row.
-- Used for cost tracking, quota enforcement, acceptance metrics, and debugging.

CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,                    -- 'quiz_gen' | 'free_text_grade' | ...
  model TEXT NOT NULL,                      -- 'gemini-2.5-flash' | 'claude-sonnet-4-6'
  provider TEXT NOT NULL,                   -- 'google' | 'anthropic'
  prompt_version TEXT NOT NULL,             -- 'quiz_gen_v1'

  -- Inputs (replay + debugging)
  input_context JSONB,                      -- feature-specific (lesson_ids, level, ...)
  input_hash TEXT,                          -- sha256 of full prompt — dedup / cache analysis

  -- Outputs
  output JSONB,
  schema_valid BOOLEAN NOT NULL DEFAULT TRUE,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Cost + perf
  input_tokens INTEGER,
  output_tokens INTEGER,
  cache_read_tokens INTEGER,
  latency_ms INTEGER,
  cost_cents NUMERIC(10, 4),

  -- Link back to the resulting entity
  output_quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,

  -- Quality feedback (filled later from instructor actions)
  instructor_accepted BOOLEAN,              -- published without edit
  instructor_edited BOOLEAN,                -- published with edits
  instructor_rejected BOOLEAN,              -- deleted draft
  instructor_rating SMALLINT,               -- optional 1-5

  error TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_gen_user_created
  ON ai_generations (user_id, created_at DESC);

-- Quota enforcement: count per user per feature per month
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

-- RLS
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Users read their own logs (usage dashboard, debugging)
CREATE POLICY "ai_generations_select_own"
  ON ai_generations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Server-side route handlers insert with auth.uid() as user_id.
CREATE POLICY "ai_generations_insert_own"
  ON ai_generations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Owner updates: acceptance/edit/rating flags set by UI actions.
CREATE POLICY "ai_generations_update_own"
  ON ai_generations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
