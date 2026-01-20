-- Fix AI Key Access & Standardize Naming
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    singular_keys TEXT;
    plural_keys TEXT;
    versions_json JSONB;
BEGIN
    -- 1. Standardize system_config keys
    -- Check for 'global_ai_key' (singular)
    SELECT value INTO singular_keys FROM system_config WHERE key = 'global_ai_key';
    -- Check for 'global_ai_keys' (plural)
    SELECT value INTO plural_keys FROM system_config WHERE key = 'global_ai_keys';

    -- If singular exists but plural doesn't, copy singular to plural
    IF singular_keys IS NOT NULL AND plural_keys IS NULL THEN
        INSERT INTO system_config (key, value)
        VALUES ('global_ai_keys', singular_keys)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        RAISE NOTICE '✅ Standardized: Copied singular global_ai_key to plural global_ai_keys';
    END IF;

    -- 2. Update static_data_versions singleton table if it exists
    -- Migration 'create_static_data_versions.sql' created this table with 'global_ai_keys' column.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'static_data_versions' AND table_schema = 'public') THEN
        UPDATE public.static_data_versions 
        SET global_ai_keys = COALESCE(global_ai_keys, 0) + 1 
        WHERE id = 1;
        RAISE NOTICE '✅ Incremented version in static_data_versions table';
    END IF;

    -- 3. Update static_data_versions entry in system_config (Sync Token)
    SELECT value::jsonb INTO versions_json FROM system_config WHERE key = 'static_data_versions';
    IF versions_json IS NOT NULL THEN
        -- Ensure both singular and plural pointers exist for compatibility
        versions_json := jsonb_set(versions_json, '{global_ai_keys}', '10'::jsonb);
        versions_json := jsonb_set(versions_json, '{global_ai_key}', '10'::jsonb);
        
        UPDATE system_config SET value = versions_json::TEXT WHERE key = 'static_data_versions';
        RAISE NOTICE '✅ Unified sync pointers in system_config.static_data_versions';
    END IF;

END $$;

-- 4. Enable Read Access for regular users on config tables
-- This is critical! Regular users couldn't read the keys before.

-- system_config RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read for system_config" ON public.system_config;
CREATE POLICY "Allow authenticated read for system_config" ON public.system_config
FOR SELECT TO authenticated USING (true);

-- static_data_versions RLS (just in case)
ALTER TABLE public.static_data_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read versions" ON public.static_data_versions;
CREATE POLICY "Authenticated can read versions" ON public.static_data_versions
FOR SELECT TO authenticated USING (true);
