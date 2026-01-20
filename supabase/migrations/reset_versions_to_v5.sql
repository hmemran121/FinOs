-- Reset Global Configuration Versions to 5
-- This script fixes the "Trillion-Version" issue caused by timestamp usage.

DO $$
DECLARE
    current_ai_config JSONB;
    current_versions JSONB;
BEGIN
    -- 1. Fix 'global_ai_key' internal version
    -- Fetch current value to preserve keys, just update version
    SELECT value::jsonb INTO current_ai_config FROM system_config WHERE key = 'global_ai_key';
    
    IF current_ai_config IS NOT NULL THEN
        -- Update version to 5
        current_ai_config := jsonb_set(current_ai_config, '{version}', '5'::jsonb);
        
        -- Save back
        UPDATE system_config 
        SET value = current_ai_config::TEXT 
        WHERE key = 'global_ai_key';
        
        RAISE NOTICE '✅ Fixed global_ai_key version to 5';
    END IF;

    -- 2. Fix 'static_data_versions' map
    SELECT value::jsonb INTO current_versions FROM system_config WHERE key = 'static_data_versions';
    
    IF current_versions IS NOT NULL THEN
        -- Update global_ai_key AND global_ai_keys (plural) version pointer to 5
        -- This covers both legacy and new key names just in case
        current_versions := jsonb_set(current_versions, '{global_ai_key}', '5'::jsonb);
        current_versions := jsonb_set(current_versions, '{global_ai_keys}', '5'::jsonb);
        
        -- Save back
        UPDATE system_config 
        SET value = current_versions::TEXT 
        WHERE key = 'static_data_versions';
        
        RAISE NOTICE '✅ Fixed static_data_versions (Targeted both singular and plural keys)';
    ELSE
        -- Create if missing
        INSERT INTO system_config (key, value)
        VALUES ('static_data_versions', '{"global_ai_key": 5, "global_ai_keys": 5}');
        RAISE NOTICE '✅ Created static_data_versions with version 5';
    END IF;

    RAISE NOTICE '🎉 Successfully reset Global Integrity System to Version 5.';
END $$;

-- Verify
SELECT key, value FROM system_config WHERE key IN ('global_ai_key', 'static_data_versions');
