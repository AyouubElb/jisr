-- Add 'section' as a valid quiz block type.
-- Section blocks are non-gradable positional markers that group the blocks
-- following them into a named part of the quiz (e.g. "Partie 1 — Vocabulaire").
ALTER TABLE quiz_blocks DROP CONSTRAINT quiz_blocks_type_check;
ALTER TABLE quiz_blocks ADD CONSTRAINT quiz_blocks_type_check
  CHECK (type IN ('text', 'audio', 'image', 'mcq', 'fill_blank', 'free_text', 'voice', 'section'));
