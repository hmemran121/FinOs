import pg from 'pg';
const { Client } = pg;

// Use the connection string relative to project (or hardcoded as verified previously)
const CONNECTION_STRING = 'postgresql://postgres:howladerFinos@db.liwnjbvintygnvhgbguw.supabase.co:5432/postgres';

const SQL = `
-- 1. Add user_id column if not exists
ALTER TABLE public.plan_suggestions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Drop the existing UNIQUE constraint on 'name' to allow duplicates for different users (or user vs global)
-- First, find the constraint name if not known, often plan_suggestions_name_key
ALTER TABLE public.plan_suggestions DROP CONSTRAINT IF EXISTS plan_suggestions_name_key;

-- 3. Add a new Composite Unique Constraint (name + user_id coalesce)
-- Since user_id can be null (global), we need a unique index that handles nulls effectively for uniqueness logic.
-- However, standard unique index with null allows multiple nulls. We want:
--  - One 'Global' entry (user_id IS NULL) for 'Rice'
--  - One 'User' entry (user_id = X) for 'Rice'
-- This allows a user to "override" or have their own version, though in this simple string case, duplicate strings are fine.
-- Let's just create an index to speed up lookups.
CREATE INDEX IF NOT EXISTS idx_plan_suggestions_name_user ON public.plan_suggestions(name, user_id);

-- 4. Update RLS Policies

-- Drop old policies to be clean
DROP POLICY IF EXISTS "Enable all for users" ON public.plan_suggestions;
DROP POLICY IF EXISTS "Enable read for anon" ON public.plan_suggestions;

-- Policy: INSERT - Users can insert rows where user_id matches their own ID
CREATE POLICY "Users can insert own suggestions" 
ON public.plan_suggestions 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Policy: SELECT - Users can see Global (user_id is NULL) OR their Own (user_id = auth.uid())
CREATE POLICY "Users can view global and own suggestions" 
ON public.plan_suggestions 
FOR SELECT 
USING (user_id IS NULL OR user_id = auth.uid());

-- Policy: UPDATE/DELETE - Users can manage ONLY their own rows
CREATE POLICY "Users can update own suggestions" 
ON public.plan_suggestions 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own suggestions" 
ON public.plan_suggestions 
FOR DELETE 
USING (user_id = auth.uid());

-- ANON POLICY (For public read if app allows, otherwise restrict to authenticated)
-- Assuming we want basic global suggestions to be readable by anon if needed (e.g. login screen demo), but usually auth is required.
-- Let's keep anon read for Global items only.
CREATE POLICY "Anon can view global suggestions" 
ON public.plan_suggestions 
FOR SELECT 
TO anon 
USING (user_id IS NULL);
`;

async function runMigration() {
    console.log("🚀 Connecting to Supabase for v10 Migration...");
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected.");

        console.log("📦 Applying Schema & RLS Updates...");
        await client.query(SQL);
        console.log("✅ Migration v10 Applied Successfully!");

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
