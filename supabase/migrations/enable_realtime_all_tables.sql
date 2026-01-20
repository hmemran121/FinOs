-- Enable Realtime for all required tables
-- Run this in Supabase SQL Editor

-- Enable publication for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE commitments;
ALTER PUBLICATION supabase_realtime ADD TABLE channels;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_plan_components;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_plan_settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE currencies;
ALTER PUBLICATION supabase_realtime ADD TABLE channel_types;
ALTER PUBLICATION supabase_realtime ADD TABLE categories_global;
ALTER PUBLICATION supabase_realtime ADD TABLE plan_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_memories;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_usage_logs;

-- Set replica identity to FULL for better change tracking
ALTER TABLE wallets REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE categories REPLICA IDENTITY FULL;
ALTER TABLE commitments REPLICA IDENTITY FULL;
ALTER TABLE channels REPLICA IDENTITY FULL;
ALTER TABLE budgets REPLICA IDENTITY FULL;
ALTER TABLE financial_plans REPLICA IDENTITY FULL;
ALTER TABLE financial_plan_components REPLICA IDENTITY FULL;
ALTER TABLE financial_plan_settlements REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE currencies REPLICA IDENTITY FULL;
ALTER TABLE channel_types REPLICA IDENTITY FULL;
ALTER TABLE categories_global REPLICA IDENTITY FULL;
ALTER TABLE plan_suggestions REPLICA IDENTITY FULL;
ALTER TABLE ai_memories REPLICA IDENTITY FULL;
ALTER TABLE ai_usage_logs REPLICA IDENTITY FULL;
