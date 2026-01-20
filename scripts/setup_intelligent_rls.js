/**
 * Setup Intelligent Auto-RLS System
 */

import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

const DATABASE_URL = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function setupIntelligentRLS() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected!\n');

        console.log('📋 Reading intelligent RLS SQL...');
        const sql = fs.readFileSync('supabase/migrations/intelligent_auto_rls.sql', 'utf8');

        console.log('🚀 Executing intelligent RLS setup...\n');
        await client.query(sql);

        console.log('✅ Intelligent RLS system installed!\n');

        // Apply to all existing tables
        console.log('🔄 Applying smart RLS to all existing tables...\n');
        const result = await client.query('SELECT * FROM apply_smart_rls_to_all()');

        console.log('📊 Results:');
        result.rows.forEach(row => {
            const icon = row.status.startsWith('✅') ? '✅' : '⚠️';
            console.log(`   ${icon} ${row.table_name} (${row.table_type})`);
        });

        console.log('\n🎉 Setup Complete!\n');
        console.log('📖 Features Enabled:\n');
        console.log('   ✅ Auto-detection of table types');
        console.log('   ✅ Convention-based RLS policies');
        console.log('   ✅ Super Admin bypass');
        console.log('   ✅ Auto-trigger for new tables');
        console.log('   ✅ Support for: User-scoped, Global, Mixed\n');

        console.log('🔮 From now on:\n');
        console.log('   - Create any new table with user_id column');
        console.log('   - RLS will be applied AUTOMATICALLY');
        console.log('   - No manual intervention needed!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await client.end();
        console.log('🔌 Disconnected from Supabase');
    }
}

setupIntelligentRLS()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Failed:', error.message);
        process.exit(1);
    });
