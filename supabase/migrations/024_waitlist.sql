-- ============================================================================
-- Migration: Waitlist for pre-launch
--
-- Pre-launch signup list for the Founder Program (10 spots at 99 DH/mo).
-- Anonymous public can INSERT one row; only admins can read.
-- ============================================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist (created_at DESC);

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
