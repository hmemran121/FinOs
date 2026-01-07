
-- 1. Currencies Table
CREATE TABLE IF NOT EXISTS public.currencies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    device_id TEXT DEFAULT 'unknown',
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 2. Channel Types Table
CREATE TABLE IF NOT EXISTS public.channel_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon_name TEXT NOT NULL, -- e.g. 'Landmark', 'Smartphone'
    color TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    device_id TEXT DEFAULT 'unknown',
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_types ENABLE ROW LEVEL SECURITY;

-- Policies (Public Read, Admin Write - simplified to User Write for now to allow dynamic additions)
CREATE POLICY "Everyone can read currencies" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "Everyone can read channel types" ON public.channel_types FOR SELECT USING (true);

-- Enable Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.currencies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_types;

ALTER TABLE public.currencies REPLICA IDENTITY FULL;
ALTER TABLE public.channel_types REPLICA IDENTITY FULL;
