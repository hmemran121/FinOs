-- Enable FULL Replica Identity
-- This ensures that UPDATE events contain the FULL row data (payload.new)
-- Critical for client-side filtering logic like 'device_id != myDeviceId'

ALTER TABLE wallets REPLICA IDENTITY FULL;
ALTER TABLE channels REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE categories_user REPLICA IDENTITY FULL;
ALTER TABLE categories_global REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE commitments REPLICA IDENTITY FULL;
ALTER TABLE financial_plans REPLICA IDENTITY FULL;
ALTER TABLE financial_plan_components REPLICA IDENTITY FULL;
ALTER TABLE financial_plan_settlements REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE ai_usage_logs REPLICA IDENTITY FULL;
