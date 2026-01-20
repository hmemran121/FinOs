import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const TABLES = [
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

async function enableRealtime() {
    const client = new Client({ connectionString });

    try {
        console.log('🔌 Connecting to Supabase database...');
        await client.connect();
        console.log('✅ Connected successfully!\n');

        console.log('📡 Enabling Realtime for all tables...\n');

        for (const table of TABLES) {
            try {
                // Add table to realtime publication
                console.log(`📡 Adding ${table} to realtime publication...`);
                await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE ${table};`);
                console.log(`✅ ${table} added to publication`);

                // Set replica identity to FULL
                console.log(`🔧 Setting replica identity for ${table}...`);
                await client.query(`ALTER TABLE ${table} REPLICA IDENTITY FULL;`);
                console.log(`✅ ${table} replica identity set\n`);
            } catch (error) {
                if (error.message.includes('already exists') || error.message.includes('already a member')) {
                    console.log(`ℹ️  ${table} already in publication, skipping...\n`);
                } else {
                    console.error(`❌ Error with ${table}:`, error.message, '\n');
                }
            }
        }

        console.log('\n✅ Realtime enablement completed!');
        console.log('\n📋 Next Steps:');
        console.log('1. Restart your application (npm run dev)');
        console.log('2. Check browser console for: "✅ [Realtime] Successfully connected"');
        console.log('3. Test by creating/updating data and watching for realtime updates');

    } catch (error) {
        console.error('❌ Connection error:', error.message);
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed.');
    }
}

enableRealtime();
