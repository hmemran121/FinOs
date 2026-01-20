-- Allow Super Admins to INSERT and UPDATE any profile

-- 1. Update INSERT policy
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own_or_admin" ON profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id OR is_super_admin()
);

-- 2. Update UPDATE policy
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own_or_admin" ON profiles
FOR UPDATE
USING (
  auth.uid() = id OR is_super_admin()
)
WITH CHECK (
  auth.uid() = id OR is_super_admin()
);

-- 3. Update DELETE policy (just in case)
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own_or_admin" ON profiles
FOR DELETE
USING (
  auth.uid() = id OR is_super_admin()
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
