-- Create get_sync_metadata RPC function used by offlineSync.ts
-- This minimizes network roundtrips and provides Trusted Server Time for Clock Skew Protection

CREATE OR REPLACE FUNCTION public.get_sync_metadata(p_device_id TEXT, p_last_pulse BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_static_versions JSONB;
    v_user_token BIGINT;
    v_server_time BIGINT;
    v_is_super_admin BOOLEAN;
BEGIN
    -- Get Server Time (ms since epoch)
    v_server_time := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

    -- Get Static Versions
    SELECT value::JSONB INTO v_static_versions
    FROM system_config
    WHERE key = 'static_data_versions';
    
    IF v_static_versions IS NULL THEN
        v_static_versions := '{}'::JSONB;
    END IF;

    -- Check Admin Status using our fixed security-defined function
    v_is_super_admin := is_super_admin();

    -- Get Sync Token
    -- If Super Admin, get Global Tracker token
    -- If Regular User, get their personal sync token
    IF v_is_super_admin THEN
        SELECT last_sync_token INTO v_user_token
        FROM global_sync_tracker
        WHERE id = 1;
    ELSE
        SELECT last_sync_token INTO v_user_token
        FROM user_sync_metadata
        WHERE user_id = auth.uid();
    END IF;

    IF v_user_token IS NULL THEN
        v_user_token := 0;
    END IF;

    -- Return combined object
    RETURN jsonb_build_object(
        'server_time', v_server_time,
        'static_versions', v_static_versions,
        'user_sync_token', v_user_token
    );
END;
$$;
