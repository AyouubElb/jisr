-- ============================================================================
-- Migration: Quiz scoring system + voice answer block
--
-- Goals:
--   1. Add `voice` block type (student records an audio response)
--   2. Rename `quiz_blocks.points` → `weight` (weight-based scoring, not points)
--   3. Add `model_answer` / `grading_notes` to quiz_blocks (for manual grading)
--   4. Add `passing_score` to quizzes (default 60%)
--   5. Split `student_attempts.score` → `auto_score` + `final_score`
--      Add `pending_review` status, `graded_at`, `graded_by`
--   6. Replace `student_answers.selected_option_id` + `text_answer` with a
--      single `answer JSONB` column (polymorphic per block type)
--   7. Rename `student_answers.points_awarded` → `earned_weight`
--
-- Scoring model: final_score = (SUM(earned_weight) / SUM(weight)) * 100
-- Students never see auto_score — only final_score when status = 'graded'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. QUIZZES — add passing_score
-- ----------------------------------------------------------------------------

ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS passing_score INTEGER NOT NULL DEFAULT 60
    CHECK (passing_score BETWEEN 0 AND 100);

-- ----------------------------------------------------------------------------
-- 2. QUIZ_BLOCKS — add `voice` type, rename points → weight, add manual fields
-- ----------------------------------------------------------------------------

-- Extend the type CHECK to allow 'voice'
ALTER TABLE quiz_blocks DROP CONSTRAINT IF EXISTS quiz_blocks_type_check;
ALTER TABLE quiz_blocks ADD CONSTRAINT quiz_blocks_type_check
  CHECK (type IN ('text', 'audio', 'image', 'mcq', 'fill_blank', 'free_text', 'voice'));

-- Rename points → weight (same semantics, clearer name in weight-based model)
ALTER TABLE quiz_blocks RENAME COLUMN points TO weight;

-- Allow fractional weights (instructor might want 1.5, 2.5, etc.)
ALTER TABLE quiz_blocks ALTER COLUMN weight TYPE NUMERIC USING weight::NUMERIC;
ALTER TABLE quiz_blocks ADD CONSTRAINT quiz_blocks_weight_positive
  CHECK (weight IS NULL OR weight > 0);

-- Manual-grading fields (writing/voice only — nullable for other types)
ALTER TABLE quiz_blocks
  ADD COLUMN IF NOT EXISTS model_answer TEXT,
  ADD COLUMN IF NOT EXISTS grading_notes TEXT;

-- ----------------------------------------------------------------------------
-- 3. STUDENT_ATTEMPTS — split score, add pending_review status + grader audit
-- ----------------------------------------------------------------------------

-- Extend status CHECK to include 'pending_review'
ALTER TABLE student_attempts DROP CONSTRAINT IF EXISTS student_attempts_status_check;
ALTER TABLE student_attempts ADD CONSTRAINT student_attempts_status_check
  CHECK (status IN ('in_progress', 'submitted', 'pending_review', 'graded'));

-- Rename existing score → final_score (the real score shown to student)
ALTER TABLE student_attempts RENAME COLUMN score TO final_score;

-- auto_score: percentage from auto-graded blocks only (instructor-facing)
ALTER TABLE student_attempts
  ADD COLUMN IF NOT EXISTS auto_score NUMERIC,
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Allow numeric scores (not just integer) for weight-based math
ALTER TABLE student_attempts
  ALTER COLUMN final_score TYPE NUMERIC USING final_score::NUMERIC;

-- max_score is obsolete under the weight model (total is always 100%)
ALTER TABLE student_attempts DROP COLUMN IF EXISTS max_score;

-- ----------------------------------------------------------------------------
-- 4. STUDENT_ANSWERS — polymorphic JSONB answer, rename points_awarded
-- ----------------------------------------------------------------------------

ALTER TABLE student_answers
  ADD COLUMN IF NOT EXISTS answer JSONB;

-- Backfill existing rows into the new `answer` column
UPDATE student_answers
SET answer = jsonb_build_object('selected', selected_option_id)
WHERE selected_option_id IS NOT NULL AND answer IS NULL;

UPDATE student_answers
SET answer = jsonb_build_object('text', text_answer)
WHERE text_answer IS NOT NULL AND answer IS NULL;

-- Any leftover null answers become empty objects (so NOT NULL can be enforced)
UPDATE student_answers SET answer = '{}'::jsonb WHERE answer IS NULL;

ALTER TABLE student_answers ALTER COLUMN answer SET NOT NULL;
ALTER TABLE student_answers ALTER COLUMN answer SET DEFAULT '{}'::jsonb;

-- Drop the old columns — they're fully replaced by `answer`
ALTER TABLE student_answers
  DROP COLUMN IF EXISTS selected_option_id,
  DROP COLUMN IF EXISTS text_answer;

-- Rename points_awarded → earned_weight (weight actually credited to this answer)
ALTER TABLE student_answers RENAME COLUMN points_awarded TO earned_weight;
ALTER TABLE student_answers
  ALTER COLUMN earned_weight TYPE NUMERIC USING earned_weight::NUMERIC;
ALTER TABLE student_answers ADD CONSTRAINT student_answers_earned_weight_nonneg
  CHECK (earned_weight IS NULL OR earned_weight >= 0);

-- Graded-at per answer (for audit — when did an auto/manual grade get set)
ALTER TABLE student_answers
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

-- Unique constraint — one answer per (attempt, block)
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_answers_attempt_block
  ON student_answers(attempt_id, block_id);
