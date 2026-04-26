-- Admin read-all policies for the admin dashboard.
-- The helper checks auth.uid() against profiles.role so it works with the
-- anon-key client used in the browser (no service-role key on the client).

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- profiles: admin can read all rows
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (is_admin());

-- enrollments: admin can read all rows
CREATE POLICY "enrollments_select_admin"
  ON enrollments FOR SELECT
  USING (is_admin());

-- courses: admin can read all rows
CREATE POLICY "courses_select_admin"
  ON courses FOR SELECT
  USING (is_admin());
