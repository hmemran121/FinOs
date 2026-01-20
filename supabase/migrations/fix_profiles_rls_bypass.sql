-- 1. Robust Super Admin check function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (is_super_admin = 1 OR is_super_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update profiles table policies
-- First, drop conflicting policies if they exist
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "admin_select_bypass_profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner and super admin" ON profiles;

-- Create the refined SELECT policy
-- Using auth.uid() = id since both are UUID
CREATE POLICY "Profiles are viewable by owner and super admin" ON profiles
FOR SELECT
USING (auth.uid() = id OR is_super_admin());

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
