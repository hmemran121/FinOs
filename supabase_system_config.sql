-- Create system_config table for Smart Sync
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access (Required for global version check)
CREATE POLICY "Public Read Access" ON system_config
    FOR SELECT USING (true);

-- Allow authenticated admins to update (Optional)
-- CREATE POLICY "Admin Update Access" ON system_config
--    FOR UPDATE WITH CHECK (auth.role() = 'service_role');

-- Insert initial global data version
INSERT INTO system_config (key, value)
VALUES ('global_data_version', '1')
ON CONFLICT (key) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
