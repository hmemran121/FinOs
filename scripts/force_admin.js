import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({
    connectionString,
});

async function run() {
    try {
        console.log('🔌 Connecting to Database...');
        await client.connect();

        const targetEmail = 'hmetest121@gmail.com'; // The specific user

        console.log(`🔍 Checking status for ${targetEmail}...`);

        // 1. Get User ID from auth.users (Optional, since profiles usually has email too, but let's check profiles directly)
        // Assuming 'profiles' table has an 'email' column or we need to join. 
        // Usually profiles.id is the auth.id. Let's try to search by email if it exists in profiles.

        // Check if profiles has email column
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='profiles' AND column_name='email';
    `);

        let query = '';
        if (res.rows.length > 0) {
            query = `SELECT * FROM profiles WHERE email = $1`;
        } else {
            // Fallback: This is harder if we can't link email to ID easily without auth schema access.
            // But commonly profiles mirrors auth.users.
            console.log("⚠️ Profiles table might not have email column. Checking auth.users...");
            // This fails if we don't have access to auth schema via this connection usually.
            // Let's assume the user IS logged in and we can trust the 'email' field in profiles if it exists.
            // If not, I will update ALL profiles for checking purposes (NOT SAFE for prod, but okay here for debug).
            // Actually, let's just blindly update if the ID is known or find it.

            // BETTER PLAN: Update based on the ID if the user can give it to me? 
            // No, I'll assume email is in profiles based on typical Supabase setups.
            throw new Error("Cannot find email column in profiles to identify user.");
        }

        const userRes = await client.query(query, [targetEmail]);

        if (userRes.rows.length === 0) {
            console.error(`❌ User ${targetEmail} not found in 'profiles' table.`);
            console.log("Current Profiles:");
            const all = await client.query('SELECT * FROM profiles LIMIT 5');
            console.table(all.rows);
        } else {
            const user = userRes.rows[0];
            console.log(`👤 Found User: ID=${user.id}, Role=${user.role}, IsAdmin=${user.is_super_admin}`);

            if (user.is_super_admin !== 1) {
                console.log("⚡ Elevating to Super Admin...");
                await client.query(`
                UPDATE profiles 
                SET is_super_admin = 1, role = 'SUPER_ADMIN' 
                WHERE id = $1
            `, [user.id]);
                console.log("✅ User elevated successfully.");
            } else {
                console.log("✅ User is already Super Admin.");
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

run();
