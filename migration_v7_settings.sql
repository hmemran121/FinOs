-- Phase 4: Settings Persistence
-- Adds missing columns to profiles to enable settings synchronization

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS currency TEXT,
ADD COLUMN IF NOT EXISTS theme TEXT,
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT true;

-- Ensure RLS allows users to update their own profile settings (already covered by existing policies, but good to double check)
-- Existing policy: "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
