
-- Phase 3: Sub-Ledger Intelligence
-- Add columns to link transactions and identify shadow entries

ALTER TABLE transactions 
ADD COLUMN linked_transaction_id TEXT,
ADD COLUMN is_sub_ledger_sync BOOLEAN DEFAULT false;

-- Index for faster lookup of linked transactions
CREATE INDEX idx_transactions_linked_id ON transactions(linked_transaction_id);
