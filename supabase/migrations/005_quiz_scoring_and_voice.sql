-- Quiz scoring system + voice answer block.
-- Switches from point-based to weight-based scoring:
--   final_score = (SUM(earned_weight) / SUM(weight)) * 100
-- Students see only final_score (when status = 'graded'); auto_score is instructor-facing.
-- Adds `voice` block type, polymorphic `answer JSONB`, and grader audit fields.

-- Quizzes: passing_score

ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS passing_score INTEGER NOT NULL DEFAULT 60
    CHECK (passing_score BETWEEN 0 AND 100);

-- Quiz blocks: add 'voice' type, rename points → weight, manual-grading fields

ALTER TABLE quiz_blocks DROP CONSTRAINT IF EXISTS quiz_blocks_type_check;
ALTER TABLE quiz_blocks ADD CONSTRAINT quiz_blocks_type_check
  CHECK (type IN ('text', 'audio', 'image', 'mcq', 'fill_blank', 'free_text', 'voice'));

ALTER TABLE quiz_blocks RENAME COLUMN points TO weight;

-- NUMERIC so instructors can use fractional weights (1.5, 2.5, ...)
ALTER TABLE quiz_blocks ALTER COLUMN weight TYPE NUMERIC USING weight::NUMERIC;
ALTER TABLE quiz_blocks ADD CONSTRAINT quiz_blocks_weight_positive
  CHECK (weight IS NULL OR weight > 0);

-- Manual-grading fields, only filled for writing/voice blocks
ALTER TABLE quiz_blocks
  ADD COLUMN IF NOT EXISTS model_answer TEXT,
  ADD COLUMN IF NOT EXISTS grading_notes TEXT;

-- Student attempts: split score, add pending_review + grader audit

ALTER TABLE student_attempts DROP CONSTRAINT IF EXISTS student_attempts_status_check;
ALTER TABLE student_attempts ADD CONSTRAINT student_attempts_status_check
  CHECK (status IN ('in_progress', 'submitted', 'pending_review', 'graded'));

ALTER TABLE student_attempts RENAME COLUMN score TO final_score;

-- auto_score = percentage from auto-graded blocks only (instructor-facing)
ALTER TABLE student_attempts
  ADD COLUMN IF NOT EXISTS auto_score NUMERIC,
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE student_attempts
  ALTER COLUMN final_score TYPE NUMERIC USING final_score::NUMERIC;

-- max_score is obsolete under the weight model (total always = 100%)
ALTER TABLE student_attempts DROP COLUMN IF EXISTS max_score;

-- Student answers: polymorphic JSONB answer, rename points_awarded

ALTER TABLE student_answers
  ADD COLUMN IF NOT EXISTS answer JSONB;

-- Backfill existing rows into the new `answer` column
UPDATE student_answers
SET answer = jsonb_build_object('selected', selected_option_id)
WHERE selected_option_id IS NOT NULL AND answer IS NULL;

UPDATE student_answers
SET answer = jsonb_build_object('text', text_answer)
WHERE text_answer IS NOT NULL AND answer IS NULL;

UPDATE student_answers SET answer = '{}'::jsonb WHERE answer IS NULL;

ALTER TABLE student_answers ALTER COLUMN answer SET NOT NULL;
ALTER TABLE student_answers ALTER COLUMN answer SET DEFAULT '{}'::jsonb;

-- Drop replaced columns
ALTER TABLE student_answers
  DROP COLUMN IF EXISTS selected_option_id,
  DROP COLUMN IF EXISTS text_answer;

ALTER TABLE student_answers RENAME COLUMN points_awarded TO earned_weight;
ALTER TABLE student_answers
  ALTER COLUMN earned_weight TYPE NUMERIC USING earned_weight::NUMERIC;
ALTER TABLE student_answers ADD CONSTRAINT student_answers_earned_weight_nonneg
  CHECK (earned_weight IS NULL OR earned_weight >= 0);

ALTER TABLE student_answers
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

-- One answer per (attempt, block)
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_answers_attempt_block
  ON student_answers(attempt_id, block_id);
