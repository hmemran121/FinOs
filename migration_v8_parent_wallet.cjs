const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    console.log("🚀 Starting Migration: Add 'parent_wallet_id' to wallets...");

    db.run("ALTER TABLE wallets ADD COLUMN parent_wallet_id TEXT", (err) => {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log("✅ Column 'parent_wallet_id' already exists.");
            } else {
                console.error("❌ Error adding column:", err.message);
            }
        } else {
            console.log("✅ Column 'parent_wallet_id' added successfully.");
        }
    });

    // Also add to sync_queue if needed for new field? No, sync handles generic JSON.
    // Sync table structure update not needed for dynamic fields, but `database.ts` needs update.
});

db.close();
