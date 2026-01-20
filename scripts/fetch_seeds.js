
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = [
    'currencies',
    'channel_types',
    'categories_global',
    'plan_suggestions'
];

async function fetchAndSave() {
    console.log('📦 Fetching Global Data Seeds...');

    // Ensure dir exists
    const seedDir = path.resolve(__dirname, '../src/data/seeds');
    if (!fs.existsSync(seedDir)) {
        fs.mkdirSync(seedDir, { recursive: true });
    }

    for (const table of TABLES) {
        console.log(`   - Downloading ${table}...`);
        const { data, error } = await supabase.from(table).select('*');

        if (error) {
            console.error(`❌ Failed to fetch ${table}:`, error.message);
            continue;
        }

        const filePath = path.join(seedDir, `${table}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`     ✅ Saved ${data.length} rows to ${table}.json`);
    }

    console.log('\n🏁 Seed Data Download Complete.');
}

fetchAndSave();
