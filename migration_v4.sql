
-- Phase 3B: Enhanced Sub-Ledger Metadata
ALTER TABLE transactions 
ADD COLUMN sub_ledger_id TEXT,
ADD COLUMN sub_ledger_name TEXT;
