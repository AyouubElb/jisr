-- ============================================================================
-- Migration: Waitlist for pre-launch
--
-- Pre-launch signup list for the Founder Program (10 spots at 99 DH/mo).
-- Anonymous public can INSERT one row; only admins can read.
--
-- Form collects 5 fields:
--   - full_name, email, phone (contact)
--   - current_situation (qualifier: which prof profile?)
--   - time_sink         (qualifier: which pain to lead with on the call?)
-- Plus an internal `source` tag so future entry points (e.g. blog, ads) are
-- distinguishable.
-- ============================================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  current_situation TEXT NOT NULL,
  time_sink TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist (created_at DESC);

-- Indexes on the two qualifier columns so the admin dashboard can filter and
-- count by profile / pain quickly when triaging the founder calls.
CREATE INDEX IF NOT EXISTS waitlist_current_situation_idx
  ON waitlist (current_situation);

CREATE INDEX IF NOT EXISTS waitlist_time_sink_idx
  ON waitlist (time_sink);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authed) can insert
DROP POLICY IF EXISTS "waitlist insert public" ON waitlist;
CREATE POLICY "waitlist insert public"
  ON waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read
DROP POLICY IF EXISTS "waitlist select admin" ON waitlist;
CREATE POLICY "waitlist select admin"
  ON waitlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
