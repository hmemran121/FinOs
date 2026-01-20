import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { v4 as uuidv4 } from 'uuid';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { Preferences } from '@capacitor/preferences';
import { PLAN_SUGGESTIONS_SEED } from '../data/planSuggestionsData';

// Bundled Static Data Seeds (v1)
import currenciesSeed from '../src/data/seeds/currencies.json';
import channelTypesSeed from '../src/data/seeds/channel_types.json';
import categoriesGlobalSeed from '../src/data/seeds/categories_global.json';
import planSuggestionsSeed from '../src/data/seeds/plan_suggestions.json';
import staticVersionsSeed from '../src/data/seeds/static_versions.json';

// Initialize the jeep-sqlite element immediately
if (Capacitor.getPlatform() === 'web') {
    jeepSqlite(window);
}

class DatabaseKernel {
    private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
    private db: SQLiteDBConnection | null = null;
    private deviceId: string = 'unknown';
    private initPromise: Promise<void> | null = null;
    private isReady: boolean = false;
    private tableMetadata: Record<string, string[]> = {};

    public get ready(): boolean {
        return this.isReady;
    }

    public isInitialized(): boolean {
        return !!this.initPromise;
    }

    public getSqlite() {
        return this.sqlite;
    }

    private onProgressCallbacks: ((progress: number, status: string) => void)[] = [];

    async initialize(onProgress?: (progress: number, status: string) => void): Promise<void> {
        if (onProgress) this.onProgressCallbacks.push(onProgress);

        if (this.initPromise) return this.initPromise;

        const report = (pct: number, msg: string) => {
            console.log(`🚀 [Kernel] ${pct}% - ${msg}`);
            this.onProgressCallbacks.forEach(cb => {
                try { cb(pct, msg); } catch (e) { }
            });
        };

        this.initPromise = (async () => {
            try {
                report(10, 'Establishing ID Authority...');

                // 1. Device Identifier (Persistent)
                try {
                    const { value } = await Preferences.get({ key: 'finos_device_id' });
                    if (value) {
                        this.deviceId = value;
                    } else {
                        const info = await Device.getId();
                        this.deviceId = (info as any).identifier || 'finos-session-' + Math.random().toString(36).substring(2, 9);
                        await Preferences.set({ key: 'finos_device_id', value: this.deviceId });
                    }
                    console.log(`🆔 [Kernel] Device Authority: ${this.deviceId}`);
                } catch (e) {
                    this.deviceId = 'finos-emergency-' + Math.random().toString(36).substring(2, 9);
                }

                // 2. Web Bridge Setup
                report(20, 'Configuring Capacitor Bridge...');
                if (Capacitor.getPlatform() === 'web') {
                    let jeepEl = document.querySelector('jeep-sqlite');
                    if (!jeepEl) {
                        jeepEl = document.createElement('jeep-sqlite');
                        document.body.appendChild(jeepEl);
                    }
                    await customElements.whenDefined('jeep-sqlite');
                    await this.sqlite.initWebStore();
                    await this.sqlite.checkConnectionsConsistency();
                }

                // 3. Connection Management
                report(40, 'Mounting SQLite Engine...');
                const isConn = await this.sqlite.isConnection('finos_db', false) as any;
                if (isConn && isConn.result) {
                    this.db = await this.sqlite.retrieveConnection('finos_db', false);
                } else {
                    this.db = await this.sqlite.createConnection('finos_db', false, 'no-encryption', 1, false);
                }

                // 4. Atomic Open
                report(60, 'Opening Encrypted Vault...');
                await this.db.open();

                // 5. Emergency Cleanup (Bridge Hardening)
                report(80, 'Clearing Bridge Anomalies...');
                const txStatus = await this.db.isTransactionActive();
                if (txStatus.result) {
                    console.warn(' ⚠️ [Kernel] Clearing dangling transaction...');
                    await this.db.rollbackTransaction();
                }

                // 6. Performance & Reliability PRAGMAs
                report(85, 'Optimizing SQLite Performance...');
                try {
                    const txState = await this.db.isTransactionActive();
                    if (!txState.result) {
                        try {
                            await this.db.run('PRAGMA journal_mode = WAL;', [], false);
                            await this.db.run('PRAGMA synchronous = NORMAL;', [], false);
                            await this.db.run('PRAGMA foreign_keys = ON;', [], false);
                        } catch (pragmaErr) {
                            console.warn(' ⚠️ [Kernel] PRAGMA failed:', pragmaErr);
                        }
                    } else {
                        console.warn(' ⚠️ [Kernel] Skipping PRAGMAs due to active transaction.');
                    }
                } catch (e) {
                    console.warn(' ⚠️ [Kernel] Optimization setup failed:', e);
                }

                // 7. Schema & Migrations
                report(90, 'Running System Migrations...');
                await this.applySchema();

                // 8. Explicit Persistence (Web Only)
                if (Capacitor.getPlatform() === 'web') {
                    await this.sqlite.saveToStore('finos_db');
                }

                this.isReady = true;
                report(100, 'Secure Kernel Verified.');
            } catch (error: any) {
                console.error('🔑 [Kernel] FATAL ERROR:', error);
                this.initPromise = null;
                this.isReady = false;
                throw error;
            }
        })();

        return this.initPromise;
    }

    private currentSchemaVersion: number = 30;

    private async applySchema() {
        if (!this.db) throw new Error('DB handle lost during schema application');

        // 0. Startup Pruning: Skip Heavy Checks if Version Matches
        await this.db.execute(`CREATE TABLE IF NOT EXISTS meta_schema (version INTEGER PRIMARY KEY)`);
        const verRes = await this.db.query('SELECT version FROM meta_schema');
        let oldVersion = verRes.values && verRes.values.length > 0 ? verRes.values[0].version : 0;

        if (oldVersion === this.currentSchemaVersion) {
            // Already optimized?
            const tableCheck = await this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='meta_sync'");
            if (tableCheck.values && tableCheck.values.length > 0) {
                console.log(`⏩ [Kernel] Schema v${oldVersion} matches. Skipping Heavy Migrations.`);
                return;
            }
        }

        console.log(`📡 [Kernel] Database Version Check: Current=${oldVersion}, Target=${this.currentSchemaVersion}`);

        // 1. Meta Tables (Always ensures base meta)
        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS meta_sync (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                is_initialized INTEGER DEFAULT 0,
                last_full_sync INTEGER DEFAULT 0,
                static_versions TEXT DEFAULT '{}',
                last_user_sync_token INTEGER DEFAULT 0,
                last_user_id TEXT
            );
        `);

        // Hardening: Ensure static_versions column exists for existing users BEFORE we try to use it
        try {
            await this.db.execute(`ALTER TABLE meta_sync ADD COLUMN static_versions TEXT DEFAULT '{}'`);
        } catch (e) { }

        try {
            await this.db.execute(`ALTER TABLE meta_sync ADD COLUMN last_user_sync_token INTEGER DEFAULT 0`);
        } catch (e) { }

        try {
            await this.db.execute(`ALTER TABLE meta_sync ADD COLUMN last_user_id TEXT`);
        } catch (e) { }

        try {
            await this.db.execute(`ALTER TABLE meta_sync ADD COLUMN clock_offset INTEGER DEFAULT 0`);
        } catch (e) { }

        // Cleanup: Remove old columns is not supported in SQLite easily, so we just ignore them.

        // Now safe to insert/ignore with the full column set
        await this.db.execute(`
            INSERT OR IGNORE INTO meta_sync (id, is_initialized, last_full_sync, static_versions, last_user_sync_token, last_user_id) 
            VALUES (1, 0, 0, '{}', 0, NULL);
        `);

        const syncFields = `
            updated_at INTEGER NOT NULL DEFAULT 0,
            server_updated_at INTEGER DEFAULT 0,
            version INTEGER NOT NULL DEFAULT 1,
            device_id TEXT NOT NULL DEFAULT 'unknown',
            user_id TEXT NOT NULL DEFAULT 'unknown',
            is_deleted INTEGER NOT NULL DEFAULT 0
        `;

        // 2. Comprehensive Table Structure
        const tables = {
            categories_global: `id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT, type TEXT, parent_id TEXT, "order" INTEGER, embedding TEXT, ${syncFields}`,
            categories_user: `id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT, type TEXT, parent_id TEXT, "order" INTEGER, embedding TEXT, ${syncFields}`,
            wallets: `id TEXT PRIMARY KEY, name TEXT NOT NULL, currency TEXT NOT NULL, initial_balance REAL, color TEXT, icon TEXT, is_visible INTEGER DEFAULT 1, is_primary INTEGER DEFAULT 0, uses_primary_income INTEGER DEFAULT 0, parent_wallet_id TEXT, ${syncFields}`,
            channels: `id TEXT PRIMARY KEY, wallet_id TEXT NOT NULL, type TEXT NOT NULL, balance REAL DEFAULT 0, ${syncFields}, FOREIGN KEY(wallet_id) REFERENCES wallets(id)`,
            transactions: `id TEXT PRIMARY KEY, amount REAL NOT NULL, date TEXT NOT NULL, wallet_id TEXT, channel_type TEXT, category_id TEXT, note TEXT, type TEXT, is_split INTEGER DEFAULT 0, to_wallet_id TEXT, to_channel_type TEXT, linked_transaction_id TEXT, is_sub_ledger_sync INTEGER DEFAULT 0, sub_ledger_id TEXT, sub_ledger_name TEXT, settlement_group_id TEXT, ${syncFields}`,
            transfers: `id TEXT PRIMARY KEY, from_wallet_id TEXT NOT NULL, to_wallet_id TEXT NOT NULL, from_channel TEXT NOT NULL, to_channel TEXT NOT NULL, amount REAL NOT NULL, date TEXT NOT NULL, note TEXT, ${syncFields}`,
            commitments: `id TEXT PRIMARY KEY, name TEXT NOT NULL, amount REAL NOT NULL, frequency TEXT NOT NULL, certainty_level TEXT NOT NULL, type TEXT NOT NULL, wallet_id TEXT, category_id TEXT, next_date TEXT NOT NULL, status TEXT DEFAULT 'ACTIVE', history TEXT DEFAULT '[]', is_recurring INTEGER DEFAULT 0, ${syncFields}`,
            budgets: `id TEXT PRIMARY KEY, name TEXT NOT NULL, amount REAL NOT NULL, category_id TEXT, period TEXT, ${syncFields}`,
            profiles: `id TEXT PRIMARY KEY, email TEXT, name TEXT, currency TEXT, theme TEXT, ai_enabled INTEGER DEFAULT 1, biometric_enabled INTEGER DEFAULT 1, accent_color TEXT DEFAULT '#3b82f6', language TEXT DEFAULT 'EN', privacy_mode INTEGER DEFAULT 0, glass_intensity INTEGER DEFAULT 20, budget_start_day INTEGER DEFAULT 1, haptic_enabled INTEGER DEFAULT 1, animation_speed TEXT DEFAULT 'NORMAL', default_wallet_id TEXT, auto_sync INTEGER DEFAULT 1, decimal_places INTEGER DEFAULT 2, show_health_score INTEGER DEFAULT 1, compact_mode INTEGER DEFAULT 0, low_balance_threshold REAL DEFAULT 100, font_family TEXT DEFAULT 'PLUS_JAKARTA', animation_intensity TEXT DEFAULT 'MEDIUM', biometric_lock_timeout INTEGER DEFAULT 0, sound_effects_enabled INTEGER DEFAULT 1, is_admin_enabled INTEGER DEFAULT 0, custom_gemini_key TEXT, preferred_gemini_key_id TEXT, preferred_gemini_model TEXT, custom_supabase_url TEXT, is_read_only INTEGER DEFAULT 0, maintenance_mode INTEGER DEFAULT 0, custom_app_name TEXT, glass_effects_enabled INTEGER DEFAULT 1, custom_logo_url TEXT, role TEXT DEFAULT 'MEMBER', organization_id TEXT, permissions TEXT DEFAULT '{}', is_super_admin INTEGER DEFAULT 0, ${syncFields}`,
            currencies: `code TEXT PRIMARY KEY, name TEXT NOT NULL, symbol TEXT NOT NULL, ${syncFields}`,
            channel_types: `id TEXT PRIMARY KEY, name TEXT NOT NULL, icon_name TEXT NOT NULL, color TEXT NOT NULL, is_default INTEGER DEFAULT 0, ${syncFields}`,
            financial_plans: `id TEXT PRIMARY KEY, wallet_id TEXT, plan_type TEXT, title TEXT, status TEXT, planned_date TEXT, finalized_at TEXT, total_amount REAL, note TEXT, ${syncFields}`,
            financial_plan_components: `id TEXT PRIMARY KEY, plan_id TEXT, name TEXT, component_type TEXT, quantity REAL, unit TEXT, expected_cost REAL, final_cost REAL, category_id TEXT, group_id TEXT, group_parent_id TEXT, ${syncFields}`,
            financial_plan_settlements: `id TEXT PRIMARY KEY, plan_id TEXT, channel_id TEXT, amount REAL, ${syncFields}`,
            plan_suggestions: `id TEXT PRIMARY KEY, name TEXT NOT NULL, usage_count INTEGER DEFAULT 0, ${syncFields}`,
            notifications: `id TEXT PRIMARY KEY, type TEXT, priority TEXT, title TEXT, message TEXT, is_read INTEGER DEFAULT 0, action_url TEXT, data TEXT, created_at INTEGER, ${syncFields}`,
            ai_memories: `id TEXT PRIMARY KEY, memory_key TEXT, memory_value TEXT, memory_type TEXT, confidence REAL, last_used_at INTEGER, created_at INTEGER, ${syncFields}`,
            ai_usage_logs: `id TEXT PRIMARY KEY, key_id TEXT, activity_type TEXT, model TEXT, input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0, total_tokens INTEGER DEFAULT 0, timestamp INTEGER, status TEXT, error_msg TEXT, ${syncFields}`
        };

        for (const [name, schema] of Object.entries(tables)) {
            await this.db.execute(`CREATE TABLE IF NOT EXISTS ${name} (${schema})`);

            // Hardening: Ensure sync columns exist even if table was created in an older version
            try {
                await this.db.execute(`ALTER TABLE ${name} ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`);
            } catch (e) { }
            try {
                await this.db.execute(`ALTER TABLE ${name} ADD COLUMN server_updated_at INTEGER DEFAULT 0`);
            } catch (e) { }
            try {
                await this.db.execute(`ALTER TABLE ${name} ADD COLUMN version INTEGER NOT NULL DEFAULT 1`);
            } catch (e) { }
            try {
                await this.db.execute(`ALTER TABLE ${name} ADD COLUMN device_id TEXT NOT NULL DEFAULT 'unknown'`);
            } catch (e) { }
            try {
                await this.db.execute(`ALTER TABLE ${name} ADD COLUMN user_id TEXT NOT NULL DEFAULT 'unknown'`);
            } catch (e) { }
            try {
                await this.db.execute(`ALTER TABLE ${name} ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0`);
            } catch (e) { }
        }

        // Sub-Ledger Migration (v8)
        try {
            await this.db.execute(`ALTER TABLE wallets ADD COLUMN parent_wallet_id TEXT`);
        } catch (e) { }

        // Sub-Ledger Sync Flag (v8)
        try {
            await this.db.execute(`ALTER TABLE transactions ADD COLUMN is_sub_ledger_sync INTEGER DEFAULT 0`);
            await this.db.execute(`ALTER TABLE transactions ADD COLUMN sub_ledger_id TEXT`);
            await this.db.execute(`ALTER TABLE transactions ADD COLUMN sub_ledger_name TEXT`);
        } catch (e) { }

        // Atomic Settlement Group Migration (v30)
        if (oldVersion < 30) {
            console.log("🛠️ [Database] Migrating to v30 (Atomic Settlements)...");
            try { await this.db.execute(`ALTER TABLE transactions ADD COLUMN settlement_group_id TEXT`); } catch (e) { }
        }

        // Category Parent Migration (v11)
        try {
            await this.db.execute(`ALTER TABLE categories_global ADD COLUMN parent_id TEXT`);
        } catch (e) { }

        // RBAC Migration (v16) - Role & Permissions
        try {
            await this.db.execute(`ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'MEMBER'`);
            await this.db.execute(`ALTER TABLE profiles ADD COLUMN organization_id TEXT`);
            await this.db.execute(`ALTER TABLE profiles ADD COLUMN permissions TEXT DEFAULT '{}'`);
            await this.db.execute(`ALTER TABLE profiles ADD COLUMN is_super_admin INTEGER DEFAULT 0`);

            // Auto-promote first/existing user to SUPER_ADMIN to ensure owner has access
            await this.db.execute(`UPDATE profiles SET role = 'SUPER_ADMIN', is_super_admin = 1 WHERE is_super_admin = 0`);
        } catch (e) { }

        // v15: Group Pickup & Structural Hierarchy
        if (oldVersion < 15) {
            console.log("🛠️ [Database] Migrating to v15 (Grouping Support)...");
            try {
                await this.db.execute(`ALTER TABLE financial_plan_components ADD COLUMN group_id TEXT`);
                console.log("✅ Column group_id added.");
            } catch (e) { }
            try {
                await this.db.execute(`ALTER TABLE financial_plan_components ADD COLUMN group_parent_id TEXT`);
                console.log("✅ Column group_parent_id added.");
            } catch (e) { }
        }

        // Commitment Status Migration (v16)
        try {
            await this.db.execute(`ALTER TABLE commitments ADD COLUMN status TEXT DEFAULT 'ACTIVE'`);
        } catch (e) { }

        // Commitment History & Recurrence Migration (v17)
        if (oldVersion < 17) {
            console.log("🛠️ [Database] Migrating to v17 (Commitment History & Recurrence)...");
            try {
                await this.db.execute(`ALTER TABLE commitments ADD COLUMN history TEXT DEFAULT '[]'`);
            } catch (e) { }
            try {
                await this.db.execute(`ALTER TABLE commitments ADD COLUMN is_recurring INTEGER DEFAULT 0`);
            } catch (e) { }
        }

        // v19: Premium App Controls Migration
        if (oldVersion < 19) {
            console.log("🛠️ [Database] Migrating to v19 (Premium Controls)...");
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN haptic_enabled INTEGER DEFAULT 1`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN animation_speed TEXT DEFAULT 'NORMAL'`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN default_wallet_id TEXT`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN auto_sync INTEGER DEFAULT 1`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN decimal_places INTEGER DEFAULT 2`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN show_health_score INTEGER DEFAULT 1`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN compact_mode INTEGER DEFAULT 0`); } catch (e) { }
        }

        // v20: Ultra-Pro Settings Migration
        if (oldVersion < 20) {
            console.log("🛠️ [Database] Migrating to v20 (Ultra-Pro Settings)...");
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN low_balance_threshold REAL DEFAULT 100`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN font_family TEXT DEFAULT 'PLUS_JAKARTA'`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN animation_intensity TEXT DEFAULT 'MEDIUM'`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN biometric_lock_timeout INTEGER DEFAULT 0`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN sound_effects_enabled INTEGER DEFAULT 1`); } catch (e) { }
        }

        // v21: Administrative Governance Migration
        if (oldVersion < 21) {
            console.log("🛠️ [Database] Migrating to v21 (Admin Controls)...");
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN is_admin_enabled INTEGER DEFAULT 0`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN custom_gemini_key TEXT`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN custom_supabase_url TEXT`); } catch (e) { }
        }
        if (oldVersion < 22) {
            console.log("🛠️ [Database] Migrating to v22 (System Overrides)...");
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN is_read_only INTEGER DEFAULT 0`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN maintenance_mode INTEGER DEFAULT 0`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN custom_app_name TEXT`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN glass_effects_enabled INTEGER DEFAULT 1`); } catch (e) { }
        }
        if (oldVersion < 23) {
            console.log("🛠️ [Database] Migrating to v23 (Custom Logo Support)...");
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN custom_logo_url TEXT`); } catch (e) { }
        }
        if (oldVersion < 24) {
            console.log("🛠️ [Database] Migrating to v24 (Multi-API Support)...");

        }
        if (oldVersion < 25) {
            console.log("🛠️ [Database] Migrating to v25 (Vector Embeddings)...");
            try { await this.db.execute(`ALTER TABLE categories_global ADD COLUMN embedding TEXT`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE categories_user ADD COLUMN embedding TEXT`); } catch (e) { }
        }

        if (oldVersion < 26) {
            console.log("🛠️ [Database] Migrating to v26 (AI Deep Memory)...");
            try { await this.db.execute(`ALTER TABLE ai_memories ADD COLUMN confidence REAL DEFAULT 0.0`); } catch (e) { }
            // Note: The table creation loop above handles the main table creation.
            // This block is for any specific alterations or data migrations if needed.
            // Since it's a new table, the main loop covers it, but we log it here for clarity.
            // (v26 handled in the tables map)
        }

        if (oldVersion < 27) {
            console.log("🛠️ [Database] Migrating to v27 (AI Health Check Persistence)...");
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN preferred_gemini_key_id TEXT`); } catch (e) { }
            try { await this.db.execute(`ALTER TABLE profiles ADD COLUMN preferred_gemini_model TEXT`); } catch (e) { }
        }

        if (oldVersion < 28) {
            console.log("🛠️ [Database] Migrating to v28 (AI Analytics)...");
            // ai_usage_logs created by generic loop
        }

        if (oldVersion < 29) {
            console.log("🛠️ [Database] Migrating to v29 (Ledger Categorization)...");
            try { await this.db.execute(`ALTER TABLE commitments ADD COLUMN category_id TEXT`); } catch (e) { }
        }

        // Taxonomy Modernization (v14) - One-time hard reset for the new hierarchical system
        try {
            const { value: taxonomyV2 } = await Preferences.get({ key: 'taxonomy_modern_v2' });
            if (taxonomyV2 !== 'true') {
                console.log("🛠️ [Database] Hard-resetting taxonomy for Modern Index...");

                // Clear all category tables
                await this.db.execute("DELETE FROM categories_global");
                await this.db.execute("DELETE FROM categories_user");

                // Reset sync timestamp to force immediate full redownload of the new categories
                await this.db.execute("UPDATE meta_sync SET last_full_sync = 0 WHERE id = 1");

                await Preferences.set({ key: 'taxonomy_modern_v2', value: 'true' });
                console.log("✅ [Database] Taxonomy reset complete. Ready for new categories.");
            }
        } catch (e) {
            console.error("❌ [Database] Taxonomy migration failed:", e);
        }

        // Plan Suggestions Migration (v10) - Add user_id and remove unique constraint
        try {
            const cols = await this.db.query("PRAGMA table_info(plan_suggestions)");
            const hasUserId = cols.values && cols.values.some(c => c.name === 'user_id');
            if (!hasUserId) {
                await this.db.execute("BEGIN TRANSACTION");
                await this.db.execute("ALTER TABLE plan_suggestions RENAME TO plan_suggestions_old");
                await this.db.execute(`CREATE TABLE plan_suggestions (${tables.plan_suggestions})`);
                await this.db.execute("INSERT INTO plan_suggestions (id, name, usage_count, updated_at, version, device_id, is_deleted) SELECT id, name, usage_count, updated_at, version, device_id, is_deleted FROM plan_suggestions_old");
                await this.db.execute("DROP TABLE plan_suggestions_old");
                await this.db.execute("COMMIT");
            }
        } catch (e) {
            console.error("Migration v10 failed", e);
            try { await this.db.execute("ROLLBACK"); } catch (e2) { }
        }
        // Seeding Logic (Smart Update)
        try {
            const countRes = await this.db.query('SELECT COUNT(*) as count FROM plan_suggestions');
            const currentCount = countRes.values ? countRes.values[0].count : 0;

            if (currentCount < PLAN_SUGGESTIONS_SEED.length) {
                console.log(`🌱 [Kernel] Seeding plan suggestions (Found ${currentCount}, Target ${PLAN_SUGGESTIONS_SEED.length})...`);
                const batchSize = 50;
                for (let i = 0; i < PLAN_SUGGESTIONS_SEED.length; i += batchSize) {
                    const batch = PLAN_SUGGESTIONS_SEED.slice(i, i + batchSize);
                    let placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(',');
                    let values: any[] = [];
                    batch.forEach(name => {
                        values.push(uuidv4(), name, 0, Date.now(), 1);
                    });
                    await this.db.run(`INSERT OR IGNORE INTO plan_suggestions (id, name, usage_count, updated_at, version) VALUES ${placeholders}`, values);
                }
            }
        } catch (e) {
            console.error('🌱 [Kernel] Seed Failed', e);
        }

        // Schema Migration v10: User Specific Suggestions
        try {
            await this.db.execute(`ALTER TABLE plan_suggestions ADD COLUMN user_id TEXT`);
            // Drop unique name constraint if it exists locally to allow same name by diff users / global
            // SQLite doesn't support DROP CONSTRAINT easily in ALTER TABLE, so we typically recreate or ignore.
            // For now, let's just make sure user_id is there.
        } catch (e) { }

        // 3. System Tables
        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS sync_queue (
                id TEXT PRIMARY KEY, 
                entity TEXT NOT NULL, 
                entity_id TEXT NOT NULL, 
                operation TEXT NOT NULL, 
                payload TEXT NOT NULL, 
                created_at INTEGER NOT NULL, 
                retry_count INTEGER DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending'
            );
        `);

        // Hardening sync_queue: Ensure columns exist
        // Note: Using try/catch for column addition is standard for cross-version SQLite compatibility
        const safeAddColumn = async (table: string, colDef: string) => {
            try {
                await this.db.execute(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
            } catch (e: any) {
                // Ignore "duplicate column" errors silently to reduce log noise
                if (!e.message?.includes('duplicate column')) {
                    console.warn(`⚠️ [Kernel] Column add warning for ${table}:`, e.message);
                }
            }
        };

        try { await this.db.execute(`ALTER TABLE plan_suggestions ADD COLUMN user_id TEXT`); } catch (e) { }

        await safeAddColumn('sync_queue', "operation TEXT NOT NULL DEFAULT 'INSERT'");
        await safeAddColumn('sync_queue', "retry_count INTEGER DEFAULT 0");
        await safeAddColumn('sync_queue', "status TEXT NOT NULL DEFAULT 'pending'");

        await this.db.execute(`
            INSERT OR IGNORE INTO meta_sync (id, is_initialized, last_full_sync) VALUES (1, 0, 0);
        `);

        // 4. Version Tracking
        // Finalize
        // 5. Performance Indexes (Production Level)
        try {
            console.log("⚡ [Kernel] Verifying High-Speed Indexes...");
            await this.db.execute(`
                CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
                CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
                CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
                CREATE INDEX IF NOT EXISTS idx_plans_components ON financial_plan_components(plan_id);
                CREATE INDEX IF NOT EXISTS idx_plans_settlements ON financial_plan_settlements(plan_id);
            `);
        } catch (e) {
            console.warn("⚠️ [Kernel] Index creation warning:", e);
        }

        await this.db.query(`DELETE FROM meta_schema`);
        await this.db.query(`INSERT INTO meta_schema (version) VALUES (?)`, [this.currentSchemaVersion]);
        console.log(`📡 [Kernel] Saving Schema Version: ${this.currentSchemaVersion}`);
        // --------------------------------------------------
        // HYBRID ARCHITECTURE: STATIC DATA SEEDING (v1)
        // --------------------------------------------------
        await this.seedStaticDataIfEmpty();

        if (Capacitor.getPlatform() === 'web') {
            try {
                await this.sqlite.saveToStore('finos_db');
                const verifyRes = await this.db.query('SELECT version FROM meta_schema');
                console.log(`📡 [Kernel] Persistence Verify: ${verifyRes.values?.[0]?.version}`);
            } catch (saveErr) {
                console.error("❌ [Kernel] SaveToStore Failed:", saveErr);
            }
        }
    }

    /**
     * @throws if database is not ready or fails to initialize
     */
    async getDb(): Promise<SQLiteDBConnection> {
        // If not ready but initializing, wait for it
        if (!this.isReady && this.initPromise) {
            await this.initPromise;
        }

        if (!this.isReady || !this.db) {
            throw new Error('🚫 Database Kernel NOT READY. Illegal access attempt.');
        }
        return this.db;
    }

    getDeviceId() {
        return this.deviceId;
    }

    async generateId() {
        return uuidv4();
    }

    async run(query: string, params: any[] = [], transaction: boolean = true) {
        const db = await this.getDb();
        const res = await db.run(query, params, transaction);
        if (Capacitor.getPlatform() === 'web') {
            await this.sqlite.saveToStore('finos_db');
        }
        return res;
    }

    async execute(statements: string, transaction: boolean = true) {
        const db = await this.getDb();
        const res = await db.execute(statements, transaction);
        if (Capacitor.getPlatform() === 'web') {
            await this.sqlite.saveToStore('finos_db');
        }
        return res;
    }

    private writeQueue: Promise<any> = Promise.resolve();

    private async enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
        this.writeQueue = this.writeQueue.then(async () => {
            try {
                const res = await task();
                if (Capacitor.getPlatform() === 'web') {
                    // Optimization & Safety: Only save to store if we are NOT in a transaction.
                    // Saving mid-transaction can cause state corruption or implicit commits in jeep-sqlite.
                    const db = await this.getDb();
                    const status = await db.isTransactionActive();
                    if (!status.result) {
                        await this.sqlite.saveToStore('finos_db');
                    }
                }
                return res;
            } catch (e) {
                console.error("⛔ [Kernel] Write operation failed:", e);
                return null;
            }
        });
        return this.writeQueue as any;
    }

    private async getTableColumns(table: string): Promise<string[]> {
        if (this.tableMetadata[table]) return this.tableMetadata[table];

        try {
            const db = await this.getDb();
            const res = await db.query(`PRAGMA table_info(${table})`);
            const columns = (res.values || []).map((v: any) => v.name);
            if (columns.length > 0) {
                this.tableMetadata[table] = columns;
            }
            return columns;
        } catch (e) {
            console.error(`⚠️ [Kernel] Failed to fetch metadata for ${table}:`, e);
            return [];
        }
    }

    private async filterToTableSchema(table: string, data: any): Promise<any> {
        const columns = await this.getTableColumns(table);
        if (columns.length === 0) return data; // Fallback if meta fails

        const filtered: any = {};
        const rejected: string[] = [];

        Object.keys(data).forEach(key => {
            if (columns.includes(key)) {
                let val = data[key];
                // Serialization Hardening: Ensure objects/arrays are stringified for SQLite
                if (val !== null && typeof val === 'object') {
                    try {
                        val = JSON.stringify(val);
                    } catch (e) {
                        console.warn(`🛡️ [Kernel] Failed to stringify field ${key} for ${table}`);
                    }
                }
                filtered[key] = val;
            } else {
                rejected.push(key);
            }
        });

        if (rejected.length > 0) {
            console.warn(`🛡️ [Kernel] Hardening Blocked invalid columns for ${table}:`, rejected);
        }

        return filtered;
    }

    // High-level safe wrappers
    async insert(table: string, rawData: any, overwrite: boolean = false) {
        return this.enqueueWrite(async () => {
            const data = await this.filterToTableSchema(table, rawData);
            const db = await this.getDb();
            const keys = Object.keys(data);
            const values = Object.values(data).map(v => v === undefined ? null : v);
            const placeholders = keys.map(() => '?').join(',');
            const cmd = overwrite ? 'INSERT OR REPLACE' : 'INSERT';
            const query = `${cmd} INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

            const status = await db.isTransactionActive();
            await db.run(query, values, !status.result);
        });
    }

    async update(table: string, id: string, rawData: any) {
        return this.enqueueWrite(async () => {
            const data = await this.filterToTableSchema(table, rawData);
            const db = await this.getDb();
            const keys = Object.keys(data);
            const values = Object.values(data).map(v => v === undefined ? null : v);
            const sets = keys.map(k => `${k} = ?`).join(',');
            const query = `UPDATE ${table} SET ${sets} WHERE id = ?`;

            const status = await db.isTransactionActive();
            await db.run(query, [...values, id], !status.result);
        });
    }

    async delete(table: string, id: string, version?: number) {
        return this.enqueueWrite(async () => {
            const db = await this.getDb();
            const now = Date.now();
            let nextVer = version;
            if (nextVer === undefined) {
                const res = await db.query(`SELECT version FROM ${table} WHERE id = ?`, [id]);
                nextVer = (res.values?.[0]?.version || 1) + 1;
            }
            const status = await db.isTransactionActive();
            await db.run(`UPDATE ${table} SET is_deleted = 1, updated_at = ?, version = ? WHERE id = ?`, [now, nextVer, id], !status.result);
        });
    }

    async query(table: string, where: string | null = null, params: any[] = []) {
        const db = await this.getDb();
        // Smart Default: is_deleted = 0, but NOT for meta tables
        let filter = where;
        if (!filter) {
            filter = (table.startsWith('meta_')) ? '1=1' : 'is_deleted = 0';
        }
        console.log(`📡 [Kernel] Beginning query for ${table}...`);
        const res = await db.query(`SELECT * FROM ${table} WHERE ${filter}`, params);
        console.log(`📡 [Kernel] Query for ${table} returned ${res.values?.length || 0} rows.`);
        return res.values || [];
    }

    async searchPlanSuggestions(query: string, userId?: string) {
        try {
            const db = await this.getDb();
            const trimmedQuery = (query || '').trim();
            const searchTerm = `%${trimmedQuery}%`;

            // Case-insensitive search with high tolerance
            let sql = `SELECT DISTINCT name FROM plan_suggestions WHERE LOWER(name) LIKE LOWER(?)`;
            const params: any[] = [searchTerm];

            if (userId) {
                sql += ` AND (user_id IS NULL OR user_id = ?)`;
                params.push(userId);
            }

            sql += ` ORDER BY usage_count DESC, name ASC LIMIT 15`;

            const res = await db.query(sql, params);
            let results = (res.values || []).map(v => v.name);

            console.log(`🔍 [Kernel Search] Query: "${trimmedQuery}", Found: ${results.length}`);

            // EMERGENCY FALLBACK: If DB returns nothing, we use the local SEED to ensure UX is never broken
            if (results.length === 0) {
                if (trimmedQuery.length === 0) {
                    return ["Emergency Savings", "Europe Vacation", "Home Renovation", "New Car Fund"];
                }
                // Memory match from locally available seed data
                const memoryMatch = PLAN_SUGGESTIONS_SEED
                    .filter(name => name.toLowerCase().includes(trimmedQuery.toLowerCase()))
                    .slice(0, 10);

                if (memoryMatch.length > 0) return memoryMatch;
            }

            return results;
        } catch (e) {
            console.error("🚫 [Kernel Search] Fatal Error:", e);
            // Absolute fallback for crash safety
            return ["Strategy Alpha", "Core Objective", "Fiscal Plan"];
        }
    }

    async getPlanHistory(planId: string) {
        return this.query('financial_plans_history', 'plan_id = ?', [planId]);
    }

    async ensurePlanSuggestion(name: string, userId: string): Promise<void> {
        if (!name) return;
        try {
            const db = await this.getDb();
            // Check if global suggestion exists
            const globalCheck = await db.query(`SELECT id FROM plan_suggestions WHERE name = ? AND user_id IS NULL`, [name]);
            if (globalCheck?.values && globalCheck.values.length > 0) return; // Already exists globally

            // Check if user suggestion exists
            const userCheck = await db.query(`SELECT id FROM plan_suggestions WHERE name = ? AND user_id = ?`, [name, userId]);
            if (userCheck?.values && userCheck.values.length > 0) return; // Already exists for user

            // Insert new user-specific suggestion
            const id = await this.generateId();
            const now = Date.now();
            await this.insert('plan_suggestions', {
                id,
                name,
                user_id: userId,
                usage_count: 1,
                updated_at: now,
                version: 1,
                device_id: 'device_' + now,
                is_deleted: 0
            });
            // Note: We don't need to manually enqueue here if we use the Context wrapper which handles sync,
            // but this method is low-level. The caller (FinanceContext) should handle sync.
        } catch (e) {
            console.error('Error ensuring plan suggestion:', e);
        }
    }

    private async seedStaticDataIfEmpty() {
        if (!this.db) return;
        console.log("🌱 [Kernel] Checkpoint: Verifying Static Data Bundle...");

        // Helper for safe batch insertion
        const seedTable = async (tableName: string, data: any[]) => {
            if (!data || data.length === 0) return;

            try {
                // 1. Check if empty
                const res = await this.db!.query(`SELECT count(*) as count FROM ${tableName}`);
                const count = res.values && res.values.length > 0 ? res.values[0].count : 0;

                if (count === 0) {
                    console.log(`🌱 [Kernel] Seeding ${data.length} rows into ${tableName}...`);

                    // 2. Generate Bulk Insert
                    // Note: We use INSERT OR IGNORE to be safe.
                    const columns = Object.keys(data[0]).join(',');
                    // Create (?,?,?) string
                    const rowPlaceholder = `(${Object.keys(data[0]).map(() => '?').join(',')})`;

                    // Process in chunks to avoid SQLite limit
                    const CHUNK_SIZE = 50;
                    const chunks = [];
                    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                        chunks.push(data.slice(i, i + CHUNK_SIZE));
                    }

                    for (const chunk of chunks) {
                        const placeholders = chunk.map(() => rowPlaceholder).join(',');
                        const values: any[] = [];
                        chunk.forEach((row: any) => {
                            Object.keys(data[0]).forEach(k => values.push(row[k]));
                        });

                        await this.db!.run(`INSERT OR IGNORE INTO ${tableName} (${columns}) VALUES ${placeholders}`, values);
                    }

                    console.log(`✅ [Kernel] Seeded ${tableName} successfully.`);
                } else {
                    console.log(`⏭️ [Kernel] ${tableName} has data (${count} rows). Skipping seed.`);
                }
            } catch (e) {
                console.error(`❌ [Kernel] Failed to seed ${tableName}:`, e);
            }
        };

        // Execution Order
        await seedTable('currencies', currenciesSeed);
        await seedTable('channel_types', channelTypesSeed);
        await seedTable('categories_global', categoriesGlobalSeed);

        // plan_suggestions usually large, executeSet handles it well
        await seedTable('plan_suggestions', planSuggestionsSeed);

        // 3. Set Base Version (Hybrid Authority)
        // If we seeded data, we must tell existing sync engine that we are at "vX"
        // so it doesn't overwrite us unless server is "vX+1".

        // Note: staticVersionsSeed is { keys: val }. meta_sync.static_versions is stringified JSON.
        try {
            if (staticVersionsSeed && Object.keys(staticVersionsSeed).length > 0) {
                await this.db!.run('UPDATE meta_sync SET static_versions = ? WHERE id = 1',
                    [JSON.stringify(staticVersionsSeed)]
                );
                console.log("✅ [Kernel] Hybrid Version Authority anchored.", staticVersionsSeed);
            }
        } catch (e) {
            console.warn("⚠️ [Kernel] Failed to anchor version:", e);
        }
    }
}

export const databaseKernel = new DatabaseKernel();
