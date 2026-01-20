
const { Client } = require('pg');

const connectionString = 'postgresql://postgres.liwnjbvintygnvhgbguw:howladerFinos@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function fixSchema() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected to Supabase.");

        console.log("🛠️ Adding 'category_id' column to 'commitments' table...");
        await client.query(`
            ALTER TABLE public.commitments 
            ADD COLUMN IF NOT EXISTS category_id TEXT;
        `);
        console.log("✅ Column 'category_id' added successfully.");

        // Optional: Adding a foreign key for better data integrity
        console.log("🛠️ Adding foreign key constraint (optional but recommended)...");
        try {
            await client.query(`
                ALTER TABLE public.commitments 
                ADD CONSTRAINT fk_commitments_category 
                FOREIGN KEY (category_id) REFERENCES public.categories(id) 
                ON DELETE SET NULL;
            `);
            console.log("✅ Foreign key constraint added.");
        } catch (fkErr) {
            console.warn("⚠️ Foreign key constraint skipped (it might already exist or table 'categories' is missing it):", fkErr.message);
        }

        console.log("🚀 Schema update complete. Sync should now resume automatically.");

    } catch (err) {
        console.error("❌ Error updating schema:", err.message);
    } finally {
        await client.end();
    }
}

fixSchema();
