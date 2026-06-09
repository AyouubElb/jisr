-- AI audio cache table + storage bucket.
-- TTS is the slowest and most expensive part of audio quiz generation, so we
-- cache generated MP3s by sha256(script + voice + speed). Re-generating a
-- quiz with an unchanged script is free; identical scripts share an MP3.

CREATE TABLE IF NOT EXISTS ai_audio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Cache key
  script_hash TEXT NOT NULL,                -- sha256 of script + voice + speed
  voice_id TEXT NOT NULL,                   -- e.g. 'en-US-Chirp3-HD-Aoede'
  speed NUMERIC(3, 2) NOT NULL DEFAULT 1.0, -- 0.80 .. 1.20

  -- Result
  audio_url TEXT NOT NULL,                  -- public URL in quiz-audio bucket
  storage_path TEXT NOT NULL,               -- bucket-relative path for cleanup
  char_count INTEGER NOT NULL,              -- billed unit, useful for cost rollups
  duration_seconds NUMERIC(6, 2),           -- best-effort, may be NULL

  -- Provenance
  provider TEXT NOT NULL DEFAULT 'google',  -- 'google' | 'openai' | 'elevenlabs'
  model TEXT,                               -- e.g. 'chirp3-hd'

  UNIQUE (script_hash, voice_id, speed)
);

-- Cache lookup is the hot path
CREATE INDEX IF NOT EXISTS idx_ai_audio_cache_lookup
  ON ai_audio_cache (script_hash, voice_id, speed);

-- RLS — cache is global (no user_id), so any authenticated user can read/insert.
-- Writes happen server-side via route handlers using the user's session.

ALTER TABLE ai_audio_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_audio_cache_select_authenticated"
  ON ai_audio_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ai_audio_cache_insert_authenticated"
  ON ai_audio_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Storage bucket: public read, authenticated write.
-- Files are immutable (keyed by hash) so public read is safe.

INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-audio', 'quiz-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated upload (instructors via route handler)
CREATE POLICY "quiz_audio_insert_authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quiz-audio');

-- Anyone can read (public bucket)
CREATE POLICY "quiz_audio_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'quiz-audio');
