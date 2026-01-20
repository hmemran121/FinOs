-- Add missing columns to profiles table for Super Admin User Management
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at BIGINT DEFAULT (extract(epoch from now()) * 1000);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- Update existing records if they have null created_at
UPDATE profiles SET created_at = (extract(epoch from now()) * 1000) WHERE created_at IS NULL;
UPDATE profiles SET status = 'ACTIVE' WHERE status IS NULL;
