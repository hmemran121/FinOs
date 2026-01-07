import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { v4 as uuidv4 } from 'uuid';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { Preferences } from '@capacitor/preferences';
import { PLAN_SUGGESTIONS_SEED } from '../data/planSuggestionsData';

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

                // 5. Performance & Reliability PRAGMAs
                // These MUST be set outside of a transaction and ideally immediately after opening.
                report(70, 'Optimizing SQLite Performance...');
                try {
                    // Try setting WAL mode. Note: This may fail if already in a transaction or if not supported.
                    await this.db.execute('PRAGMA journal_mode = WAL;');
                    await this.db.execute('PRAGMA synchronous = NORMAL;');
                    await this.db.execute('PRAGMA foreign_keys = ON;');
                } catch (e) {
                    console.warn(' ⚠️ [Kernel] Optional optimizations failed or not supported:', e);
                }

                // 6. Emergency Cleanup (Bridge Hardening)
                report(80, 'Clearing Bridge Anomalies...');
                const txStatus = await this.db.isTransactionActive();
                if (txStatus.result) {
                    console.warn(' ⚠️ [Kernel] Clearing dangling transaction...');
                    await this.db.rollbackTransaction();
                }

                // 7. Schema & Migrations
                report(90, 'Running System Migrations...');
                await this.applySchema();

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

    private currentSchemaVersion: number = 3;

    private async applySchema() {
        if (!this.db) throw new Error('DB handle lost during schema application');

        // 1. Meta Tables
        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS meta_schema (version INTEGER PRIMARY KEY);
            CREATE TABLE IF NOT EXISTS meta_sync (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                is_initialized INTEGER DEFAULT 0,
                last_full_sync INTEGER DEFAULT 0
            );
            INSERT OR IGNORE INTO meta_sync (id, is_initialized, last_full_sync) VALUES (1, 0, 0);
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
            categories_global: `id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT, type TEXT, parent_id TEXT, "order" INTEGER, ${syncFields}`,
            categories_user: `id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT, color TEXT, type TEXT, parent_id TEXT, "order" INTEGER, ${syncFields}`,
            wallets: `id TEXT PRIMARY KEY, name TEXT NOT NULL, currency TEXT NOT NULL, initial_balance REAL, color TEXT, icon TEXT, is_visible INTEGER DEFAULT 1, is_primary INTEGER DEFAULT 0, uses_primary_income INTEGER DEFAULT 0, parent_wallet_id TEXT, ${syncFields}`,
            channels: `id TEXT PRIMARY KEY, wallet_id TEXT NOT NULL, type TEXT NOT NULL, balance REAL DEFAULT 0, ${syncFields}, FOREIGN KEY(wallet_id) REFERENCES wallets(id)`,
            transactions: `id TEXT PRIMARY KEY, amount REAL NOT NULL, date TEXT NOT NULL, wallet_id TEXT, channel_type TEXT, category_id TEXT, note TEXT, type TEXT, is_split INTEGER DEFAULT 0, to_wallet_id TEXT, to_channel_type TEXT, linked_transaction_id TEXT, is_sub_ledger_sync INTEGER DEFAULT 0, sub_ledger_id TEXT, sub_ledger_name TEXT, ${syncFields}`,
            transfers: `id TEXT PRIMARY KEY, from_wallet_id TEXT NOT NULL, to_wallet_id TEXT NOT NULL, from_channel TEXT NOT NULL, to_channel TEXT NOT NULL, amount REAL NOT NULL, date TEXT NOT NULL, note TEXT, ${syncFields}`,
            commitments: `id TEXT PRIMARY KEY, name TEXT NOT NULL, amount REAL NOT NULL, frequency TEXT NOT NULL, certainty_level TEXT NOT NULL, type TEXT NOT NULL, wallet_id TEXT, next_date TEXT NOT NULL, ${syncFields}`,
            budgets: `id TEXT PRIMARY KEY, name TEXT NOT NULL, amount REAL NOT NULL, category_id TEXT, period TEXT, ${syncFields}`,
            profiles: `id TEXT PRIMARY KEY, email TEXT, name TEXT, currency TEXT, theme TEXT, ai_enabled INTEGER DEFAULT 1, biometric_enabled INTEGER DEFAULT 1, ${syncFields}`,
            currencies: `code TEXT PRIMARY KEY, name TEXT NOT NULL, symbol TEXT NOT NULL, ${syncFields}`,
            channel_types: `id TEXT PRIMARY KEY, name TEXT NOT NULL, icon_name TEXT NOT NULL, color TEXT NOT NULL, is_default INTEGER DEFAULT 0, ${syncFields}`,
            financial_plans: `id TEXT PRIMARY KEY, wallet_id TEXT, plan_type TEXT, title TEXT, status TEXT, planned_date TEXT, finalized_at TEXT, total_amount REAL, note TEXT, ${syncFields}`,
            financial_plan_components: `id TEXT PRIMARY KEY, plan_id TEXT, name TEXT, component_type TEXT, quantity REAL, unit TEXT, expected_cost REAL, final_cost REAL, category_id TEXT, group_id TEXT, ${syncFields}`,
            financial_plan_settlements: `id TEXT PRIMARY KEY, plan_id TEXT, channel_id TEXT, amount REAL, ${syncFields}`,
            plan_suggestions: `id TEXT PRIMARY KEY, name TEXT NOT NULL, usage_count INTEGER DEFAULT 0, ${syncFields}`
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

        // Category Parent Migration (v11)
        try {
            await this.db.execute(`ALTER TABLE categories_global ADD COLUMN parent_id TEXT`);
        } catch (e) { }

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

        // Hardening sync_queue: Ensure columns exist even if table was created in an older version
        try {
            await this.db.execute(`ALTER TABLE sync_queue ADD COLUMN operation TEXT NOT NULL DEFAULT 'INSERT'`);
        } catch (e) { }
        try {
            await this.db.execute(`ALTER TABLE sync_queue ADD COLUMN retry_count INTEGER DEFAULT 0`);
        } catch (e) { }
        try {
            await this.db.execute(`ALTER TABLE sync_queue ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`);
        } catch (e) { }

        await this.db.execute(`
            INSERT OR IGNORE INTO meta_sync (id, is_initialized, last_full_sync) VALUES (1, 0, 0);
        `);

        // 4. Version Tracking
        await this.db.execute(`INSERT OR REPLACE INTO meta_schema (version) VALUES (${this.currentSchemaVersion})`);
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

    // High-level safe wrappers
    async insert(table: string, data: any, overwrite: boolean = false) {
        const db = await this.getDb();
        const keys = Object.keys(data);
        const values = Object.values(data).map(v => v === undefined ? null : v);
        const placeholders = keys.map(() => '?').join(',');
        const cmd = overwrite ? 'INSERT OR REPLACE' : 'INSERT';
        const query = `${cmd} INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
        await db.run(query, values);
    }

    async update(table: string, id: string, data: any) {
        const db = await this.getDb();
        const keys = Object.keys(data);
        const values = Object.values(data).map(v => v === undefined ? null : v);
        const sets = keys.map(k => `${k} = ?`).join(',');
        const query = `UPDATE ${table} SET ${sets} WHERE id = ?`;
        await db.run(query, [...values, id]);
    }

    async delete(table: string, id: string) {
        const db = await this.getDb();
        const now = Date.now();
        await db.run(`UPDATE ${table} SET is_deleted = 1, updated_at = ? WHERE id = ?`, [now, id]);
    }

    async query(table: string, where: string | null = null, params: any[] = []) {
        const db = await this.getDb();
        // Smart Default: is_deleted = 0, but NOT for meta tables
        let filter = where;
        if (!filter) {
            filter = (table.startsWith('meta_')) ? '1=1' : 'is_deleted = 0';
        }
        const res = await db.query(`SELECT * FROM ${table} WHERE ${filter}`, params);
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
}

export const databaseKernel = new DatabaseKernel();
