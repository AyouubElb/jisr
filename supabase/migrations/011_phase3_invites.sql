-- ============================================================================
-- Migration: Phase 3 — invite-only instructor signup
--
-- Scope:
--   1. Extend `profiles` with status, tier, and add 'admin' role
--   2. Add `instructor_students` junction table (scaffolded for Phase 4+)
--   3. Add `invites` table with RLS — admins only, anon has NO direct access
--   4. Add `get_invite_by_token()` security-definer function (anon-callable
--      lookup that returns only the fields needed to render the signup page)
--   5. Add `consume_invite_and_create_profile()` atomic RPC that flips
--      consumed_at and creates/activates the profile in one transaction
--
-- See docs/AUTH.md (Phase 3 spec) for the full rationale and 5 adjustments.
--
-- Run this in Supabase Dashboard -> SQL Editor.
-- ============================================================================

-- ─── Profiles: add status, tier, and admin role ───────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT
  CHECK (status IN ('pending', 'active'))
  DEFAULT 'pending';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT
  CHECK (tier IN ('free', 'pro', 'studio'))
  DEFAULT 'free';

-- Add 'admin' role for Ayoub (used by the admin invites page)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'instructor', 'admin'));

-- Backfill existing profiles to 'active' so they are not locked out.
UPDATE profiles SET status = 'active' WHERE status = 'pending';

-- ─── Junction table for student–instructor membership (Phase 4+) ─────────────
CREATE TABLE IF NOT EXISTS instructor_students (
  instructor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (instructor_id, student_id)
);

ALTER TABLE instructor_students ENABLE ROW LEVEL SECURITY;

-- Phase 4 will add policies. Kept empty here so only service-role / SQL has
-- write access for now.

-- ─── Invites table (anon NEVER reads this directly) ──────────────────────────
CREATE TABLE IF NOT EXISTS invites (
  id            UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  token         TEXT UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  kind          TEXT CHECK (kind IN ('student', 'instructor')) NOT NULL,
  instructor_id UUID REFERENCES profiles(id),  -- null for kind='instructor'
  full_name     TEXT,                           -- captured at invite creation
  expires_at    TIMESTAMPTZ NOT NULL,
  consumed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invites_token_idx ON invites (token);
CREATE INDEX IF NOT EXISTS invites_email_idx ON invites (email);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invites (insert, select, delete from admin page).
DROP POLICY IF EXISTS "admins manage invites" ON invites;
CREATE POLICY "admins manage invites" ON invites FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- NO anon SELECT policy. Anon can ONLY call the get_invite_by_token() function.

-- ─── Anon-callable lookup: validate a token without exposing the table ───────
CREATE OR REPLACE FUNCTION get_invite_by_token(p_token TEXT)
RETURNS TABLE (email TEXT, kind TEXT, full_name TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT i.email, i.kind, i.full_name, i.expires_at
  FROM invites i
  WHERE i.token = p_token
    AND i.consumed_at IS NULL
    AND i.expires_at > NOW();
END $$;

GRANT EXECUTE ON FUNCTION get_invite_by_token(TEXT) TO anon, authenticated;

-- ─── Atomic consume + profile create (Adjustment 2) ──────────────────────────
-- Both succeed in one transaction or both roll back. Prevents the orphan
-- state where the invite is consumed but the profile insert failed.
CREATE OR REPLACE FUNCTION consume_invite_and_create_profile(
  p_token     TEXT,
  p_email     TEXT,
  p_user_id   UUID,
  p_full_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite invites;
BEGIN
  -- Atomic consume: succeeds only if invite is valid AND email matches.
  -- The WHERE clause is the race-safety guarantee.
  UPDATE invites SET consumed_at = NOW()
  WHERE token = p_token
    AND email = p_email
    AND consumed_at IS NULL
    AND expires_at > NOW()
  RETURNING * INTO v_invite;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid, expired, or already-consumed invite';
  END IF;

  -- Upsert profile (handles the case where a profile row was created by an
  -- auth trigger before this call).
  INSERT INTO profiles (id, full_name, role, status, tier)
  VALUES (p_user_id, p_full_name, 'instructor', 'active', 'free')
  ON CONFLICT (id) DO UPDATE
    SET status    = 'active',
        full_name = EXCLUDED.full_name,
        role      = 'instructor',
        tier      = COALESCE(profiles.tier, 'free');
END $$;

GRANT EXECUTE ON FUNCTION consume_invite_and_create_profile(TEXT, TEXT, UUID, TEXT)
  TO authenticated, service_role;
