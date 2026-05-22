-- Migration 027: AI grading suggestions on student_answers
-- Adds columns the `student_grade` agent writes to. The agent only suggests —
-- the instructor confirms before the value flows into `earned_weight` and
-- `is_correct`. Keeping AI fields separate means we never overwrite a graded
-- attempt with a re-run, and we can show "AI suggested X / instructor set Y".

ALTER TABLE student_answers
  ADD COLUMN IF NOT EXISTS ai_score NUMERIC,           -- 0-10 per block, agent output
  ADD COLUMN IF NOT EXISTS ai_is_correct BOOLEAN,      -- shortcut flag for UI
  ADD COLUMN IF NOT EXISTS ai_rationale TEXT,          -- 1-3 sentences, instructor-visible
  ADD COLUMN IF NOT EXISTS ai_errors JSONB,            -- structured: [{ span, kind, fix }]
  ADD COLUMN IF NOT EXISTS ai_graded_at TIMESTAMPTZ,   -- when the agent ran
  ADD COLUMN IF NOT EXISTS ai_model TEXT,              -- which model key produced it
  ADD COLUMN IF NOT EXISTS ai_prompt_version TEXT;     -- for telemetry / regression checks

-- 0-10 range. NULL = not yet graded by AI.
ALTER TABLE student_answers
  DROP CONSTRAINT IF EXISTS student_answers_ai_score_range;
ALTER TABLE student_answers
  ADD CONSTRAINT student_answers_ai_score_range
  CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 10));
