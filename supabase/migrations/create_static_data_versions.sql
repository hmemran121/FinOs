-- Create table for tracking global data versions
CREATE TABLE IF NOT EXISTS public.static_data_versions (
    id INTEGER PRIMARY KEY, -- Singleton row ID = 1
    global_ai_keys INTEGER DEFAULT 0,
    categories_global INTEGER DEFAULT 0,
    updated_at BIGINT DEFAULT (extract(epoch from now()) * 1000)
);

-- Insert the singleton row if it doesn't exist
INSERT INTO public.static_data_versions (id, global_ai_keys, categories_global)
SELECT 1, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM public.static_data_versions WHERE id = 1);

-- Enable RLS
ALTER TABLE public.static_data_versions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to READ versions
DROP POLICY IF EXISTS "Authenticated can read versions" ON public.static_data_versions;
CREATE POLICY "Authenticated can read versions" ON public.static_data_versions
FOR SELECT TO authenticated USING (true);

-- Allow Super Admins to UPDATE versions
DROP POLICY IF EXISTS "Admins can update versions" ON public.static_data_versions;
CREATE POLICY "Admins can update versions" ON public.static_data_versions
FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Force schema reload
NOTIFY pgrst, 'reload schema';
