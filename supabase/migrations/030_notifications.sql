-- Notifications: one row per "something user X should know about".
-- Single source of truth for the in-app bell, email (now), push (future).
--
-- Generic by design — `type` is a free string and `payload` is JSONB, so new
-- notification kinds never need a schema change. `emailed_at` lets sending
-- move from inline to a cron later without touching producers or the bell.
--
-- INSERTs are server-side only (service-role): one user's action often creates
-- a notification for ANOTHER user (instructor grades → student is notified),
-- and users must never forge their own. Users can only SELECT + mark read.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bell query: this user's rows, newest first
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users read only their own
DROP POLICY IF EXISTS "notifications select own" ON notifications;
CREATE POLICY "notifications select own"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users update their own rows (only to set read_at).
-- No INSERT or DELETE policy — those go through service-role.
DROP POLICY IF EXISTS "notifications update own" ON notifications;
CREATE POLICY "notifications update own"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
