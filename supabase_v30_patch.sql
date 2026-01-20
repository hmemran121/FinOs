-- Add settlement_group_id to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS settlement_group_id TEXT;

-- Optional: Add an index for performance if we are grouping by it frequently
CREATE INDEX IF NOT EXISTS idx_transactions_settlement_group_id 
ON public.transactions(settlement_group_id);

-- Update the comments/documentation if needed
COMMENT ON COLUMN public.transactions.settlement_group_id IS 'Linking ID for Atomic Split transactions originating from a single plan settlement.';
