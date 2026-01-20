-- Update Global AI Keys in Supabase (Direct Array Format)
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    keys_array JSONB;
BEGIN
    -- Prepare keys array (direct format for compatibility)
    keys_array := jsonb_build_array(
        jsonb_build_object('id', '1768245969699', 'key', 'AIzaSyA2lKzeLqnolGDCpL7GbqCoJSMHupLQzMM', 'label', 'Main-FinOs-1', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246070435', 'key', 'AIzaSyDJSJZm2xu6DPkLseucwlMKBohYZYuNqu4', 'label', 'can-FinOS--8', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246096531', 'key', 'AIzaSyBE4Z-IZEQVv8FSKgOjpisTPmddsb3079Y', 'label', 'can-FinOS--7', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246118561', 'key', 'AIzaSyCp6UqzoGVelsWydyyxXnD35sdnMOVSPvM', 'label', 'Can-FinOS--6', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246139928', 'key', 'AIzaSyBOOnloDlbQPD-3NQ3KBSiL6HsYKaOhYaU', 'label', 'can-FinOS--5', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246169081', 'key', 'AIzaSyDK9glueWM06rQ6hdgXiA6jVGX6NIDIQpI', 'label', 'can-FinOS--4', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246188505', 'key', 'AIzaSyA_-wlwLENtEBRy-0SCjuQ2MhdiQ8e1NqY', 'label', 'can-FinOS--3', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246205713', 'key', 'AIzaSyAC_vyj88_BjaoDu0OIcfe1IuIl5YWZZAs', 'label', 'can-FinOs--2', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246224994', 'key', 'AIzaSyDc43t8AcONtLU4s4TJAioKvacZD7c2VJ8', 'label', 'can-os7', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246258787', 'key', 'AIzaSyCXjPCjMUbAyIfs9QcwicD4Y1Gkp56SrdQ', 'label', 'finos-6', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246283561', 'key', 'AIzaSyBvdQKg5eIubu10kmag31mTPMfqHFsroUU', 'label', 'can-FinOs-5', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246310416', 'key', 'AIzaSyDKrHseSoaMozrhHp1orhBG6xjcicgjpPI', 'label', 'can-FinOs-4', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246337568', 'key', 'AIzaSyAeYHBfcmEW-OoT9AlWW13amlNruWUOsno', 'label', 'can-finos-3', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246358594', 'key', 'AIzaSyBnr0wOZMNJv8ymth_Fsi-BB07ZPkYfB5I', 'label', 'can-Finos-2', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246384144', 'key', 'AIzaSyCA9hf29cHTvASE5yQgY7ZmN0EYlWpT6GI', 'label', 'can-finos-1', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246404418', 'key', 'AIzaSyDh3ZTmtGOqbIKJ4mqRAAf7czek1vVe42s', 'label', 'can-os-9', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246426810', 'key', 'AIzaSyDLI5GGizlL1BH6Yx9bBZgD46Z2aBxHIFc', 'label', 'can-FinOs-8', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246448232', 'key', 'AIzaSyAdhJOIXJtUoMtMy6xCu14yCCDs6rp7csw', 'label', 'can-dueTracVoice', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246463911', 'key', 'AIzaSyBV-Q1aZpGukZE_e5aJyrI_nkfDrpoBIgY', 'label', 'FinOS-10', 'status', 'ACTIVE'),
        jsonb_build_object('id', '1768246481783', 'key', 'AIzaSyAK6H5Yf_iW6SoLDxgepQSjnWkEPI7Y38w', 'label', 'can-travel planner', 'status', 'ACTIVE')
    );
    
    -- Update or insert into system_config (DIRECT ARRAY FORMAT)
    INSERT INTO system_config (key, value)
    VALUES ('global_ai_key', keys_array::TEXT)
    ON CONFLICT (key) 
    DO UPDATE SET value = EXCLUDED.value;
    
    -- Update static_data_versions to trigger sync
    -- FIX: Using integer version 5 as requested
    UPDATE system_config
    SET value = jsonb_set(
        value::jsonb,
        '{global_ai_key}',
        '5'::jsonb
    )::TEXT
    WHERE key = 'static_data_versions';
    
    -- If static_data_versions doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO system_config (key, value)
        VALUES ('static_data_versions', jsonb_build_object('global_ai_key', 5)::TEXT);
    END IF;
    
    RAISE NOTICE '✅ Successfully updated global_ai_key with 20 keys (DIRECT ARRAY FORMAT)';
    RAISE NOTICE '🔄 Sync version updated - clients will auto-sync on next refresh';
END $$;

-- Verify the update
SELECT 
    key,
    jsonb_array_length(value::jsonb) as total_keys,
    value::jsonb->0->>'label' as first_key_label
FROM system_config
WHERE key = 'global_ai_key';
