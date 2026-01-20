/**
 * Global Sync Authority for Super Admins
 * 
 * This migration enables Super Admins to track changes across the entire database
 * by maintaining a global sync token.
 */

-- 1. Create a global sync tracker
CREATE TABLE IF NOT EXISTS public.global_sync_tracker (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_token BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Initialize if not exists
INSERT INTO public.global_sync_tracker (id, last_sync_token)
VALUES (1, 1)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to read the global tracker
ALTER TABLE public.global_sync_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view global sync token" ON public.global_sync_tracker FOR SELECT USING (true);

-- 2. Update the sync trigger to increment BOTH user and global tokens
CREATE OR REPLACE FUNCTION public.increment_user_sync_token()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Determine target user
    IF (TG_OP = 'DELETE') THEN
        target_user_id := OLD.user_id;
    ELSE
        target_user_id := NEW.user_id;
    END IF;

    -- Update User Token (if user_id exists)
    IF (target_user_id IS NOT NULL) THEN
        INSERT INTO public.user_sync_metadata (user_id, last_sync_token, updated_at)
        VALUES (target_user_id, 1, now())
        ON CONFLICT (user_id) DO UPDATE 
        SET last_sync_token = user_sync_metadata.last_sync_token + 1,
            updated_at = now();
    END IF;
        
    -- Increment Global Token (Always, for Super Admin tracking)
    UPDATE public.global_sync_tracker 
    SET last_sync_token = last_sync_token + 1,
        updated_at = now()
    WHERE id = 1;

    IF (TG_OP = 'DELETE') THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure triggers are correctly applied (Re-applying for safety)
-- ... (They are already applied in setup_user_sync_token.sql, and since we replaced the function, they use the new version)

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
