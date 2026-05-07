-- Cheap insurance for future centers (multi-tenant) support.
-- Adds nullable organization_id to three tables. No behavior change while NULL.
-- Solo instructors and all existing data stay NULL indefinitely.
-- See docs/CENTERS.md for the full centers plan and when to build it.
--
-- organizations table does not exist yet — columns are plain UUIDs for now.
-- The FK constraint will be added in the Stage 3 migration that creates organizations.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Indexes so future center-scoped queries don't do full table scans.
-- Partial: only index rows that actually belong to an org (NULLs excluded).
CREATE INDEX IF NOT EXISTS idx_profiles_organization
  ON profiles(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_organization
  ON courses(organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_organization
  ON enrollments(organization_id) WHERE organization_id IS NOT NULL;
