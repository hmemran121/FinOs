-- Fix RLS Infinite Recursion by using SECURITY DEFINER
-- This ensures the check runs in a privileged context, avoiding the loop of checking permissions to check permissions.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER allows this query to bypass the RLS on 'profiles'
  -- This prevents the "Infinite Recursion" (Check Admin -> Check Profile -> Check Admin...)
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (is_super_admin::int = 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
