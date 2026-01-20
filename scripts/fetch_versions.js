
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load Env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchVersions() {
    console.log('📦 Fetching Static Versions...');
    const seedDir = path.resolve(__dirname, '../src/data/seeds');

    const { data: rows, error } = await supabase.from('static_data_versions').select('*').limit(1);
    const data = rows && rows.length > 0 ? rows[0] : null;

    if (error) {
        console.error('❌ Failed to fetch versions:', error.message);
        return;
    }

    // We only care about the columns that match our static tables
    // static_data_versions has: id, global_ai_keys, categories_global, updated_at
    // But we are also bundling currencies, channel_types, plan_suggestions
    // These might not be in static_data_versions yet!
    // If they aren't, we should default them to something, or key them by updated_at?
    // Step 0 said: Remote Auth Only = static_data_versions.
    // The audit said: "static_data_versions (The source of truth for updates)".

    // For now, let's just save what we have.
    // If the table doesn't have a column for 'currencies', etc., we can't key it versioned.
    // But `offlineSync.ts` checks `metadata.staticVersions[table]`.
    // Let's assume the server logic for metadata returns something.
    // If I bundle it, I should set the local version to matching server version.

    // Actually, `offlineSync` logic iterates STATIC_TABLES.
    // metadata.staticVersions comes from `get_sync_authority` RPC.
    // Check `get_sync_authority` return?

    // If I can't check RPC, I'll rely on `static_data_versions` table.

    const filePath = path.join(seedDir, 'static_versions.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved versions to static_versions.json:`, data);
}

fetchVersions();
