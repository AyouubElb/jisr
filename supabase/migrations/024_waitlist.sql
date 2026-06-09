-- Pre-launch waitlist for the Founder Program.
-- Public can INSERT, only admins can SELECT.
-- `current_situation` + `time_sink` are qualifiers used to triage founder calls.
-- `source` tags the entry point (homepage, future blog/ads, etc).

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

-- Filter + count by qualifier in the admin dashboard
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
