-- Lets admins update other instructors' tier and status (used by the
-- admin dashboard). The policy itself grants UPDATE access broadly — a
-- BEFORE UPDATE trigger then restricts which columns admins may change
-- on someone else's row, so this can't be abused for privilege escalation.

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION enforce_admin_profile_update_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only restrict admin-on-other-user updates. A user editing their own
  -- profile, or a non-admin update path (Supabase service-role, RPCs,
  -- the user's own self-update policy), is allowed to touch any column.
  IF is_admin() AND auth.uid() IS DISTINCT FROM NEW.id THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'admin cannot change profile id';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'admin cannot change role via profile update';
    END IF;
    IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
      RAISE EXCEPTION 'admin cannot change full_name';
    END IF;
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
      RAISE EXCEPTION 'admin cannot change avatar_url';
    END IF;
    IF NEW.level IS DISTINCT FROM OLD.level THEN
      RAISE EXCEPTION 'admin cannot change level';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'admin cannot change organization_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_profile_update_scope ON profiles;
CREATE TRIGGER enforce_admin_profile_update_scope
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_profile_update_scope();
