-- Profiles Table Migration (v18 & v19 Premium Controls)
-- Run this in Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'EN',
ADD COLUMN IF NOT EXISTS privacy_mode INTEGER DEFAULT 1, -- In local it's 0/1, in postgres it can be INTEGER
ADD COLUMN IF NOT EXISTS glass_intensity INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS budget_start_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS haptic_enabled INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS animation_speed TEXT DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS default_wallet_id TEXT,
ADD COLUMN IF NOT EXISTS auto_sync INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS show_health_score INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS compact_mode INTEGER DEFAULT 0;

-- Ensure RLS allows these columns (usually it does for entire row, but just in case)
-- If you have specific policies, make sure they allow these new fields.
