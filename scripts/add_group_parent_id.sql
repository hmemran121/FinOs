-- Migration: Add group_id and group_parent_id to financial_plan_components
-- This adds support for dynamic group-by and member management

ALTER TABLE financial_plan_components
ADD COLUMN IF NOT EXISTS group_id TEXT,
ADD COLUMN IF NOT EXISTS group_parent_id TEXT;

-- Verify the columns exist (redundant but safe)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='financial_plan_components' AND column_name='group_id') THEN
        ALTER TABLE financial_plan_components ADD COLUMN group_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='financial_plan_components' AND column_name='group_parent_id') THEN
        ALTER TABLE financial_plan_components ADD COLUMN group_parent_id TEXT;
    END IF;
END $$;
