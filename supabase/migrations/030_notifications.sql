-- ============================================================================
-- Migration: Notifications
--
-- One row per "something user X should know about". Single source of truth that
-- every channel reads from: the in-app bell, email (now), push (future).
--
-- General by design — `type` is a free string and `payload` is JSONB, so a new
-- notification kind never needs a schema change. Whether a type emails inline,
-- in a daily digest, or not at all is a per-type decision in app code; the table
-- does not care. `emailed_at` is the hinge that lets sending move from inline to
-- a cron later without touching events or the bell.
--
-- Rows are INSERTED server-side only (service-role), because one user's action
-- often creates a notification for ANOTHER user (instructor grades -> student is
-- notified). A user must never be able to forge their own notifications, so
-- there is no INSERT policy for authenticated. Users can only read + mark their
-- own rows read.
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The bell's main query: this user's rows, newest first. Partial-friendly via
-- the read_at filter at query time.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- A user reads only their own notifications.
DROP POLICY IF EXISTS "notifications select own" ON notifications;
CREATE POLICY "notifications select own"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- A user can update only their own rows (used solely to set read_at). No INSERT
-- or DELETE policy — writes are server-side (service-role) only.
DROP POLICY IF EXISTS "notifications update own" ON notifications;
CREATE POLICY "notifications update own"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
