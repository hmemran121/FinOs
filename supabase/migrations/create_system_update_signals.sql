-- Create table for admin update signals
CREATE TABLE IF NOT EXISTS public.system_update_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    triggered_by UUID REFERENCES auth.users(id),
    update_type TEXT NOT NULL CHECK (update_type IN ('global_data', 'ai', 'system')),
    message TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_update_signals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to READ active signals
DROP POLICY IF EXISTS "Authenticated can read active signals" ON public.system_update_signals;
CREATE POLICY "Authenticated can read active signals" ON public.system_update_signals
FOR SELECT TO authenticated
USING (is_active = true);

-- Allow Super Admins to INSERT/UPDATE
DROP POLICY IF EXISTS "Admins can manage signals" ON public.system_update_signals;
CREATE POLICY "Admins can manage signals" ON public.system_update_signals
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Force schema reload
NOTIFY pgrst, 'reload schema';
