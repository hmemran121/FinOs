-- Add sync metadata columns to existing tables
DO $$ 
BEGIN 
    -- Wallets
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='device_id') THEN
        ALTER TABLE public.wallets ADD COLUMN device_id TEXT DEFAULT 'unknown';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='version') THEN
        ALTER TABLE public.wallets ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='updated_at') THEN
        ALTER TABLE public.wallets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='is_deleted') THEN
        ALTER TABLE public.wallets ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;

    -- Categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='device_id') THEN
        ALTER TABLE public.categories ADD COLUMN device_id TEXT DEFAULT 'unknown';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='version') THEN
        ALTER TABLE public.categories ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='updated_at') THEN
        ALTER TABLE public.categories ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='is_deleted') THEN
        ALTER TABLE public.categories ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;

    -- Transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='device_id') THEN
        ALTER TABLE public.transactions ADD COLUMN device_id TEXT DEFAULT 'unknown';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='version') THEN
        ALTER TABLE public.transactions ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='updated_at') THEN
        ALTER TABLE public.transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='is_deleted') THEN
        ALTER TABLE public.transactions ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;

    -- Commitments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='commitments' AND column_name='device_id') THEN
        ALTER TABLE public.commitments ADD COLUMN device_id TEXT DEFAULT 'unknown';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='commitments' AND column_name='version') THEN
        ALTER TABLE public.commitments ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='commitments' AND column_name='updated_at') THEN
        ALTER TABLE public.commitments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='commitments' AND column_name='is_deleted') THEN
        ALTER TABLE public.commitments ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
