import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://liwnjbvintygnvhgbguw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpd25qYnZpbnR5Z252aGdiZ3V3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNzkyODMsImV4cCI6MjA4Mjg1NTI4M30.u0SqKwLgy3CW0r76nsR9XWUVQhZBDvSKYllDYci33SI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLES_TO_ENABLE = [
    'wallets',
    'transactions',
    'categories',
    'commitments',
    'channels',
    'budgets',
    'financial_plans',
    'financial_plan_components',
    'financial_plan_settlements',
    'notifications',
    'profiles',
    'currencies',
    'channel_types',
    'categories_global',
    'plan_suggestions',
    'ai_memories',
    'ai_usage_logs'
];

async function enableRealtimeForAllTables() {
    console.log('🚀 Starting Realtime enablement for all tables...\n');

    for (const table of TABLES_TO_ENABLE) {
        try {
            console.log(`📡 Enabling Realtime for: ${table}`);

            // Enable replication for the table
            const { error } = await supabase.rpc('enable_realtime_for_table', {
                table_name: table
            });

            if (error) {
                console.error(`❌ Failed to enable Realtime for ${table}:`, error.message);
            } else {
                console.log(`✅ Realtime enabled for: ${table}`);
            }
        } catch (err) {
            console.error(`❌ Error enabling Realtime for ${table}:`, err);
        }
    }

    console.log('\n✅ Realtime enablement process completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Go to Supabase Dashboard → Database → Replication');
    console.log('2. Verify that all tables show "Realtime" enabled');
    console.log('3. Restart your application');
}

enableRealtimeForAllTables();
