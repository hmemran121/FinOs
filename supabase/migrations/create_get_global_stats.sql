CREATE OR REPLACE FUNCTION public.get_global_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_users BIGINT;
    v_active_users BIGINT;
    v_total_wallets BIGINT;
    v_total_plans BIGINT;
    v_total_transactions BIGINT;
    v_total_volume NUMERIC;
    v_total_tokens BIGINT;
    v_total_net_balance NUMERIC;
    v_total_inflow NUMERIC;
    v_total_outflow NUMERIC;
    v_is_super_admin BOOLEAN;
BEGIN
    -- Security Check: Only Super Admins can access this
    v_is_super_admin := is_super_admin();
    
    IF NOT v_is_super_admin THEN
        RAISE EXCEPTION 'Access Denied: Super Admin Authority Required';
    END IF;

    -- 1. User Stats
    SELECT count(*) INTO v_total_users FROM profiles;
    SELECT count(*) INTO v_active_users FROM profiles WHERE status = 'ACTIVE';

    -- 2. Infrastructure Stats
    SELECT count(*) INTO v_total_wallets FROM wallets WHERE is_deleted::int = 0;
    SELECT COALESCE(SUM(balance), 0) INTO v_total_net_balance FROM channels WHERE is_deleted::int = 0;
    
    -- 3. Financial Stats (Transactions)
    SELECT count(*) INTO v_total_transactions FROM transactions WHERE is_deleted::int = 0;
    
    -- Global Volume (Gross)
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_volume FROM transactions WHERE is_deleted::int = 0;
    
    -- Cash Flow Metrics
    -- Note: We include transfers in volume but separate flow by sign for clarity
    SELECT COALESCE(SUM(amount), 0) INTO v_total_inflow FROM transactions WHERE is_deleted::int = 0 AND amount > 0;
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_outflow FROM transactions WHERE is_deleted::int = 0 AND amount < 0;

    -- 4. Strategic Stats
    SELECT count(*) INTO v_total_plans FROM financial_plans WHERE is_deleted::int = 0;

    -- 5. AI Intelligence Stats
    SELECT COALESCE(SUM(total_tokens), 0) INTO v_total_tokens FROM ai_usage_logs;

    -- Return Consolidated Stats Object
    RETURN jsonb_build_object(
        'total_users', v_total_users,
        'active_users', v_active_users,
        'total_wallets', v_total_wallets,
        'total_net_balance', v_total_net_balance,
        'total_transactions', v_total_transactions,
        'total_volume', v_total_volume,
        'total_inflow', v_total_inflow,
        'total_outflow', v_total_outflow,
        'total_plans', v_total_plans,
        'total_tokens', v_total_tokens,
        'timestamp', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    );
END;
$$;
