
-- 1. Create User Sync Metadata table
CREATE TABLE IF NOT EXISTS public.user_sync_metadata (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_sync_token BIGINT NOT NULL DEFAULt 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_sync_metadata ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own metadata
CREATE POLICY "Users can view their own sync metadata" 
ON public.user_sync_metadata FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Create Trigger Function to increment token
CREATE OR REPLACE FUNCTION public.increment_user_sync_token()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_sync_metadata (user_id, last_sync_token, updated_at)
    VALUES (COALESCE(NEW.user_id, OLD.user_id), 1, now())
    ON CONFLICT (user_id) DO UPDATE 
    SET last_sync_token = user_sync_metadata.last_sync_token + 1,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply Triggers to all Dynamic Tables
-- Profiles
DROP TRIGGER IF EXISTS tr_sync_profiles ON public.profiles;
CREATE TRIGGER tr_sync_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.increment_user_sync_token();

-- Wallets
DROP TRIGGER IF EXISTS tr_sync_wallets ON public.wallets;
CREATE TRIGGER tr_sync_wallets AFTER INSERT OR UPDATE OR DELETE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.increment_user_sync_token();

-- Transactions
DROP TRIGGER IF EXISTS tr_sync_transactions ON public.transactions;
CREATE TRIGGER tr_sync_transactions AFTER INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.increment_user_sync_token();

-- Channels
DROP TRIGGER IF EXISTS tr_sync_channels ON public.channels;
CREATE TRIGGER tr_sync_channels AFTER INSERT OR UPDATE OR DELETE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.increment_user_sync_token();

-- Categories (User specific rows)
DROP TRIGGER IF EXISTS tr_sync_categories ON public.categories;

-- Split into two triggers for safety with WHEN conditions
CREATE TRIGGER tr_sync_categories_upsert AFTER INSERT OR UPDATE ON public.categories 
FOR EACH ROW WHEN (NEW.user_id IS NOT NULL)
EXECUTE FUNCTION public.increment_user_sync_token();

CREATE TRIGGER tr_sync_categories_delete AFTER DELETE ON public.categories 
FOR EACH ROW WHEN (OLD.user_id IS NOT NULL)
EXECUTE FUNCTION public.increment_user_sync_token();

-- Commitments
DROP TRIGGER IF EXISTS tr_sync_commitments ON public.commitments;
CREATE TRIGGER tr_sync_commitments AFTER INSERT OR UPDATE OR DELETE ON public.commitments FOR EACH ROW EXECUTE FUNCTION public.increment_user_sync_token();

-- Transfers
DROP TRIGGER IF EXISTS tr_sync_transfers ON public.transfers;
CREATE TRIGGER tr_sync_transfers AFTER INSERT OR UPDATE OR DELETE ON public.transfers FOR EACH ROW EXECUTE FUNCTION public.increment_user_sync_token();

-- Budgets
DROP TRIGGER IF EXISTS tr_sync_budgets ON public.budgets;
CREATE TRIGGER tr_sync_budgets AFTER INSERT OR UPDATE OR DELETE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.increment_user_sync_token();

-- Financial Plans
DROP TRIGGER IF EXISTS tr_sync_plans ON public.financial_plans;
CREATE TRIGGER tr_sync_plans AFTER INSERT OR UPDATE OR DELETE ON public.financial_plans FOR EACH ROW EXECUTE FUNCTION public.increment_user_sync_token();

-- 4. Initial migration for existing users (Optional but good)
INSERT INTO public.user_sync_metadata (user_id, last_sync_token)
SELECT id, 1 FROM auth.users
ON CONFLICT DO NOTHING;
