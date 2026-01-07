-- Create the plan_suggestions table
CREATE TABLE IF NOT EXISTS public.plan_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
    version INTEGER NOT NULL DEFAULT 1,
    device_id TEXT NOT NULL DEFAULT 'unknown',
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.plan_suggestions ENABLE ROW LEVEL SECURITY;

-- Create Policy: Allow all operations for authenticated users
CREATE POLICY "Enable all for users" ON public.plan_suggestions
    FOR ALL USING (true) WITH CHECK (true);

-- Create Policy: Allow read access for public/anon
CREATE POLICY "Enable read for anon" ON public.plan_suggestions
    FOR SELECT USING (true);
