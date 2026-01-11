
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';
import { supabase } from './supabase';
import { databaseKernel } from './database';
import {
    SyncQueueItem,
    SyncStatusUI,
    MetaSync
} from '../types';

/**
 * Hard Transaction Gate: Ensures single-writer deterministic access.
 */
class TransactionQueue {
    private queue: Promise<any> = Promise.resolve();
    async enqueue<T>(task: () => Promise<T>): Promise<T> {
        this.queue = this.queue.then(async () => {
            try { return await task(); } catch (e) {
                console.error("⛔ [TxQueue] Task Failed:", e);
                return null;
            }
        });
        return this.queue as any;
    }
}

const txQueue = new TransactionQueue();

// Tiered table groups to ensure Foreign Key integrity during parallel sync
const TIER_1_TABLES = ['profiles', 'currencies', 'categories_user', 'categories_global', 'channel_types', 'plan_suggestions', 'wallets', 'ai_memories', 'ai_usage_logs'];
const TIER_2_TABLES = ['channels', 'transactions', 'commitments', 'transfers', 'budgets', 'financial_plans'];
const TIER_3_TABLES = ['financial_plan_components', 'financial_plan_settlements'];

const DYNAMIC_TABLES = [
    'profiles', 'categories_user', 'currencies', 'wallets', 'channels',
    'transactions', 'commitments', 'transfers', 'budgets',
    'financial_plans', 'financial_plan_components', 'financial_plan_settlements', 'ai_memories', 'ai_usage_logs'
];
const STATIC_TABLES = [
    'categories_global', 'channel_types', 'plan_suggestions'
];

class OfflineSyncService {
    private isPushing = false;
    private isPulling = false;
    private isSyncing = false;
    private isInitialized = false;
    private statusLoaded = false;
    private realtimeChannel: any = null;
    private listeners: ((status: SyncStatusUI) => void)[] = [];
    private syncStatus: SyncStatusUI = {
        isOnline: true,
        isSyncing: false,
        progress: null,
        progressPercent: 0,
        pendingCount: 0,
        lastSyncAt: null,
        staticVersions: {},
        userSyncToken: 0,
        serverStaticVersions: {},
        serverUserSyncToken: 0,
        tableStatuses: {},
        error: null,
        isInitialized: false,
        isGlobalInitialized: false,
        userId: null
    };

    private bootstrapPromise: Promise<void> | null = null;
    private itemUpdateListeners: ((table: string, item: any, operation: 'INSERT' | 'UPDATE' | 'DELETE') => void)[] = [];
    private isInitializingRealtime = false;
    private reconnectAttempts = 0;
    private syncInterval: any = null;
    private lastPulseReceivedAt = 0;
    private lastGlobalVersionCheck = 0;
    private pullQueue: Promise<void> = Promise.resolve();

    private initTableStatuses() {
        const allTables = [...STATIC_TABLES, ...DYNAMIC_TABLES];
        allTables.forEach(t => {
            if (!this.syncStatus.tableStatuses[t]) {
                this.syncStatus.tableStatuses[t] = { status: 'idle', lastResult: '-', progress: 0 };
            }
        });
    }

    constructor() { }

    public getPrecisionTimestamp(): number { return Date.now(); }

    private initPromise: Promise<void> | null = null;

    public async initialize() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                console.log("🚀 [Sync] Initializing Background Sync Engine...");
                await databaseKernel.initialize();
                const status = await Network.getStatus();
                this.syncStatus.isOnline = status.connected;

                await this.loadStatus();

                App.addListener('appStateChange', ({ isActive }) => {
                    if (isActive && this.syncStatus.isOnline) {
                        this.pullRemoteChanges(true);
                        this.setupRealtime();
                    }
                });

                if (typeof window !== 'undefined') {
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible' && this.syncStatus.isOnline) {
                            this.pullRemoteChanges(true);
                            this.setupRealtime();
                        }
                    });
                }

                Network.addListener('networkStatusChange', async (status) => {
                    const wasOffline = !this.syncStatus.isOnline;
                    this.syncStatus.isOnline = status.connected;
                    this.notify();
                    if (status.connected && wasOffline) {
                        this.push();
                        this.pullRemoteChanges(true);
                    }
                });

                this.syncInterval = setInterval(() => {
                    if (this.syncStatus.isOnline && !this.isPulling && !this.isPushing) {
                        this.sync(true);
                    }
                }, 5 * 60 * 1000);

                // Authority Re-evaluation on Auth Change
                supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log(`🔑 [Sync] Auth Event: ${event} for ${session?.user?.id}`);
                    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
                        this.bootstrapPromise = null; // Reset for re-auth
                        await this.loadStatus();
                        if (!this.syncStatus.isInitialized && this.syncStatus.isOnline) {
                            console.log("🚦 [Sync] User needs initialization. Bootstrapping...");
                            this.bootstrap();
                        }
                    } else if (event === 'SIGNED_OUT') {
                        this.bootstrapPromise = null;
                        this.syncStatus.isInitialized = false;
                        this.syncStatus.userSyncToken = 0;
                        this.notify();
                    }
                });

                // Global Readiness is handled by startSequence or queue, not awaited inside init
                this.setupRealtime();
                this.isInitialized = true;
                this.notify();
            } catch (error) {
                console.error("🚀 [Sync] Engine failed to start:", error);
                this.initPromise = null; // Allow retry on failure
            }
        })();

        return this.initPromise;
    }

    private async loadStatus() {
        try {
            const db = await databaseKernel.getDb();
            const res = await db.query('SELECT * FROM meta_sync WHERE id = 1');
            if (res.values && res.values.length > 0) {
                const meta = res.values[0] as MetaSync;

                // User-Aware Initialization Check
                const { data: { user } } = await supabase.auth.getUser();
                this.syncStatus.userId = user?.id || null;

                if (user && meta.last_user_id === user.id) {
                    this.syncStatus.isInitialized = !!meta.is_initialized;
                    this.syncStatus.userSyncToken = meta.last_user_sync_token || 0;
                } else {
                    console.log(`👤 [Sync] User changed or mismatch [Local: ${meta.last_user_id}] vs [Current: ${user?.id}]. Forcing re-init.`);
                    this.syncStatus.isInitialized = false;
                    this.syncStatus.userSyncToken = 0;
                }

                this.syncStatus.lastSyncAt = meta.last_full_sync;
                this.syncStatus.isGlobalInitialized = !!(meta.static_versions && meta.static_versions !== '{}');
                try {
                    this.syncStatus.staticVersions = JSON.parse(meta.static_versions || '{}');
                } catch (e) { this.syncStatus.staticVersions = {}; }
            }
            const queueRes = await db.query("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC");
            this.syncStatus.pendingCount = queueRes.values?.length || 0;
            this.initTableStatuses();
            this.statusLoaded = true;
            this.notify();
        } catch (e) {
            this.statusLoaded = true;
            console.warn("🚀 [Sync] Status loading failed:", e);
        }
    }

    private async setupRealtime() {
        if (this.isInitializingRealtime || !this.syncStatus.isOnline) return;
        this.isInitializingRealtime = true;
        if (this.realtimeChannel) {
            const oldChannel = this.realtimeChannel;
            this.realtimeChannel = null;
            await supabase.removeChannel(oldChannel);
        }
        const myDeviceId = databaseKernel.getDeviceId();
        const newChannel = supabase.channel(`finos_hq_stream_${myDeviceId}`);
        this.realtimeChannel = newChannel;

        this.realtimeChannel
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
                if (payload.new?.device_id !== myDeviceId) this.handleRemoteChange(payload.table, payload);
            })
            .on('broadcast', { event: 'sync_pulse' }, (payload: any) => {
                if (payload.payload.deviceId !== myDeviceId) {
                    const now = Date.now();
                    if (now - this.lastPulseReceivedAt > 3000) {
                        this.lastPulseReceivedAt = now;
                        this.pullRemoteChanges(true);
                    }
                }
            })
            .subscribe(async (status: string) => {
                if (this.realtimeChannel !== newChannel) return;
                if (status === 'SUBSCRIBED') {
                    this.isInitializingRealtime = false;
                    this.reconnectAttempts = 0;
                    this.notify();
                    this.pullRemoteChanges(true);
                }
                if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    this.isInitializingRealtime = false;
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                    if (this.syncStatus.isOnline && this.reconnectAttempts < 5) {
                        this.reconnectAttempts++;
                        setTimeout(() => this.setupRealtime(), delay);
                    }
                }
            });
    }

    private async getSyncMetadata(): Promise<{ staticVersions: Record<string, number>, userToken: number } | null> {
        if (!this.syncStatus.isOnline) return null;
        try {
            const [globalRes, userRes] = await Promise.all([
                supabase.from('system_config').select('value').eq('key', 'static_data_versions').maybeSingle(),
                supabase.from('user_sync_metadata').select('last_sync_token').maybeSingle()
            ]);

            const metadata = {
                staticVersions: globalRes.data ? JSON.parse(globalRes.data.value) : {},
                userToken: userRes.data ? Number(userRes.data.last_sync_token) : 0
            };

            // Expose to UI for Debugging
            this.syncStatus.serverStaticVersions = metadata.staticVersions;
            this.syncStatus.serverUserSyncToken = metadata.userToken;
            this.notify();

            return metadata;
        } catch (e) { return null; }
    }

    /**
     * Phase 1 Sync: Global System Taxonomy (Categories, Currencies, etc.)
     * This is called pre-login to ensure the app has standard data.
     */
    public async syncGlobalData() {
        return this.pullQueue = this.pullQueue.then(async () => {
            await this._executeSyncGlobalData();
        });
    }

    private async _executeSyncGlobalData() {
        if (!this.syncStatus.isOnline || this.isPulling) return;

        const now = Date.now();
        // Throttle global checks to once per 10 minutes unless forced
        if (now - this.lastGlobalVersionCheck < 10 * 60 * 1000 && this.syncStatus.isGlobalInitialized) return;

        this.isPulling = true;
        this.notify();

        try {
            console.log("🌐 [Smart Sync] Phase 1: Initializing Global Taxonomy...");
            const res = await supabase.from('system_config').select('value').eq('key', 'static_data_versions').maybeSingle();
            if (!res.data) return;

            const serverStaticVersions = JSON.parse(res.data.value);
            const tablesToPull: string[] = [];
            const finalVersions = { ...this.syncStatus.staticVersions };

            for (const table of STATIC_TABLES) {
                const localVer = Number(this.syncStatus.staticVersions[table] || 0);
                const serverVer = Number(serverStaticVersions[table] || 0);
                if (serverVer > localVer) {
                    tablesToPull.push(table);
                    finalVersions[table] = serverVer;
                }
            }

            if (tablesToPull.length > 0) {
                const db = await databaseKernel.getDb();
                for (const table of tablesToPull) {
                    let e = table; let f = '*';
                    if (table === 'categories_global') { e = 'categories'; f = 'global'; }
                    await this.pullEntity(db, e, 0, f);
                }

                await db.run('UPDATE meta_sync SET static_versions = ? WHERE id = 1', [JSON.stringify(finalVersions)]);
                this.syncStatus.staticVersions = finalVersions;
            }

            this.syncStatus.isGlobalInitialized = true;
            this.lastGlobalVersionCheck = now;
            console.log("✅ [Smart Sync] Phase 1: Global Taxonomy Ready.");
        } catch (e) {
            console.error("❌ [Smart Sync] Global Pull Failed:", e);
        } finally {
            this.isPulling = false;
            this.notify();
        }
    }

    private async handleRemoteChange(table: string, payload: any) {
        this.safeTransaction(async () => {
            const db = await databaseKernel.getDb();
            const operation = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            let processedItem = payload.new;
            if (operation === 'DELETE') {
                const pk = table === 'currencies' ? 'code' : 'id';
                const pkValue = payload.old ? payload.old[pk] : null;
                if (pkValue) {
                    await db.run(`UPDATE ${table} SET is_deleted = 1, updated_at = ? WHERE ${pk} = ?`, [Date.now(), pkValue], false);
                    processedItem = { [pk]: pkValue, is_deleted: 1 };
                }
            } else if (payload.new) {
                await this.mapAndPersistRemoteItem(db, table, payload.new);
                processedItem = payload.new;
            }
            this.syncStatus.lastSyncAt = Date.now();
            this.notify();
            this.itemUpdateListeners.forEach(l => l(table, processedItem, operation));
        });
    }

    onItemUpdate(listener: (table: string, item: any, operation: 'INSERT' | 'UPDATE' | 'DELETE') => void) {
        this.itemUpdateListeners.push(listener);
        return () => {
            this.itemUpdateListeners = this.itemUpdateListeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.syncStatus.isSyncing = this.isPushing || this.isPulling || this.isSyncing;
        this.listeners.forEach(l => l({ ...this.syncStatus }));
    }

    subscribe(listener: (status: SyncStatusUI) => void) {
        this.listeners.push(listener);
        listener({ ...this.syncStatus });
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    async safeTransaction(work: () => Promise<void>) {
        return txQueue.enqueue(async () => {
            const db = await databaseKernel.getDb();
            try {
                const status = await db.isTransactionActive();
                if (!status.result) await db.beginTransaction();
                await work();
                const finalStatus = await db.isTransactionActive();
                if (finalStatus.result) await db.commitTransaction();
            } catch (error) {
                console.error("🚀 [Sync] Tx Failed, Rolling back...", error);
                try {
                    const errStatus = await db.isTransactionActive();
                    if (errStatus.result) await db.rollbackTransaction();
                } catch (e) { }
            }
        });
    }

    async bootstrap() {
        if (this.bootstrapPromise) return this.bootstrapPromise;
        this.bootstrapPromise = (async () => {
            try {
                console.log("🏁 [Smart Sync] Redirecting Bootstrap to Strict Authority Engine...");
                await this.pullRemoteChanges(false);
                if (!this.syncStatus.isInitialized) {
                    // If it failed silently or didn't finish, clear for retry
                    this.bootstrapPromise = null;
                }
            } catch (e) {
                this.bootstrapPromise = null;
                throw e;
            }
        })();
        return this.bootstrapPromise;
    }

    private async pullEntity(db: any, entity: string, since?: number, select: string = '*') {
        const tableId = (entity === 'categories' && select === 'global') ? 'categories_global' :
            (entity === 'categories' && select === 'user') ? 'categories_user' : entity;

        if (this.syncStatus.tableStatuses[tableId]) {
            this.syncStatus.tableStatuses[tableId].status = 'syncing';
            this.notify();
        }

        let hasMore = true;
        let totalReceived = 0;
        let offset = 0;
        const limit = 100;
        const sinceTs = since || 0;

        try {
            while (hasMore) {
                let actualSelect = select;
                let filterGlobal: boolean | null = null;
                if (entity === 'categories') {
                    actualSelect = '*';
                    if (select === 'global') filterGlobal = true;
                    else if (select === 'user') filterGlobal = false;
                }
                let query = supabase.from(entity).select(actualSelect).range(offset, offset + limit - 1);
                if (filterGlobal !== null) query = query.eq('is_global', filterGlobal);
                if (sinceTs > 0) query = query.gt('updated_at', sinceTs);
                query = query.order('updated_at', { ascending: true });
                const { data, error } = await query;
                if (error) throw error;
                if (data && data.length > 0) {
                    console.log(`⬇️ [Sync] ${tableId}: Received ${data.length} items (Total: ${totalReceived + data.length})`);
                    await this.safeTransaction(async () => {
                        for (const item of data) await this.mapAndPersistRemoteItem(db, entity, item);
                    });
                    offset += data.length;
                    totalReceived += data.length;
                    if (data.length < limit) hasMore = false;
                } else { hasMore = false; }
            }
        } catch (e: any) {
            console.error(`🚀 [Sync] Failed to pull ${entity}:`, e.message);
        }

        if (this.syncStatus.tableStatuses[tableId]) {
            this.syncStatus.tableStatuses[tableId].status = 'completed';
            this.syncStatus.tableStatuses[tableId].lastResult = totalReceived > 0 ? `Updated ${totalReceived}` : 'No changes';
            this.syncStatus.tableStatuses[tableId].lastSyncTime = Date.now();
            this.notify();
        }
    }

    private columnCache: Record<string, string[]> = {};
    private async getTableColumns(db: any, table: string): Promise<string[]> {
        if (this.columnCache[table]) return this.columnCache[table];
        try {
            const res = await db.query(`PRAGMA table_info(${table})`);
            const cols = res.values ? res.values.map((c: any) => c.name) : [];
            this.columnCache[table] = cols;
            return cols;
        } catch (e) { return []; }
    }

    private async mapAndPersistRemoteItem(db: any, remoteEntity: string, item: any) {
        let localTable = remoteEntity;
        if (remoteEntity === 'categories') localTable = item.is_global ? 'categories_global' : 'categories_user';
        const localColumns = await this.getTableColumns(db, localTable);
        if (localColumns.length === 0) return;
        let pkField = localColumns.includes('id') ? 'id' : (localColumns.includes('code') ? 'code' : null);
        if (!pkField) return;
        let pkValue = item[pkField];
        const local = await db.query(`SELECT version, updated_at FROM ${localTable} WHERE ${pkField} = ?`, [pkValue]);
        if (local.values && local.values.length > 0) {
            const localVer = Number(local.values[0].version || 0);
            const remoteVer = Number(item.version || 0);
            if (remoteVer < localVer) return;
            if (remoteVer === localVer && Number(item.updated_at || 0) <= Number(local.values[0].updated_at || 0)) return;
        }
        const mergedItem = { ...item, updated_at: item.updated_at || Date.now(), version: item.version || 1, is_deleted: item.is_deleted ? 1 : 0 };

        // Dynamic Serialization: Ensure complex fields (objects/arrays) are stringified for SQLite
        Object.keys(mergedItem).forEach(k => {
            if (typeof mergedItem[k] === 'boolean') {
                mergedItem[k] = mergedItem[k] ? 1 : 0;
            } else if (mergedItem[k] !== null && typeof mergedItem[k] === 'object') {
                try {
                    mergedItem[k] = JSON.stringify(mergedItem[k]);
                } catch (e) {
                    console.warn(`🧩 [Sync] Failed to stringify field ${k} for ${localTable}`);
                }
            }
        });

        const dataKeys = localColumns.filter(c => mergedItem[c] !== undefined);
        const query = `INSERT OR REPLACE INTO ${localTable} (${dataKeys.map(k => k === 'order' ? '"order"' : k).join(',')}) VALUES (${dataKeys.map(() => '?').join(',')})`;

        try {
            await db.run(query, dataKeys.map(k => mergedItem[k]), false);
        } catch (e: any) {
            // If FK fails, we might be pulling in a race condition. 
            // We don't crash the whole sync, we just log it. The next cycle will fix it once the parent is here.
            console.warn(`⚠️ [Sync] Persistence deferred for ${localTable}:${pkValue} (Dependency issue)`);
        }
    }

    async enqueue(entity: string, entity_id: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: any, autoSync = true) {
        const id = await databaseKernel.generateId();
        await databaseKernel.insert('sync_queue', {
            id, entity, entity_id, operation,
            payload: JSON.stringify(payload),
            created_at: Date.now(),
            retry_count: 0,
            status: 'pending'
        });
        await this.loadStatus();
        if (autoSync && this.syncStatus.isOnline && !this.isSyncing) this.push();
    }

    async push() {
        if (this.isSyncing || !this.syncStatus.isOnline) return;
        this.isSyncing = true;
        this.notify();
        try { await this.uploadLocalChanges(); } finally { this.isSyncing = false; this.notify(); }
    }

    async sync(lightweight = true) {
        if (this.isSyncing || !this.syncStatus.isOnline || !this.syncStatus.isInitialized) return;
        this.isPulling = true;
        this.notify();
        try {
            await this.uploadLocalChanges();
            await this.pullRemoteChanges(lightweight);
        } finally { this.isPulling = false; this.notify(); }
    }

    private async uploadLocalChanges() {
        const db = await databaseKernel.getDb();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const myDeviceId = databaseKernel.getDeviceId();
        let hasMore = true;
        while (hasMore) {
            const res = await db.query("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50");
            if (!res.values || res.values.length === 0) break;
            for (const op of res.values as SyncQueueItem[]) {
                let opPayload = null;
                try {
                    opPayload = JSON.parse(op.payload);
                    await db.run("UPDATE sync_queue SET status = 'syncing' WHERE id = ?", [op.id], false);
                    let remoteTable = op.entity.startsWith('categories_') ? 'categories' : op.entity;

                    // Authority Fetch: Standardize on full local record to avoid Postgres NOT NULL violations
                    const pkField = remoteTable === 'currencies' ? 'code' : 'id';
                    const localRes = await db.query(`SELECT * FROM ${op.entity} WHERE ${pkField} = ?`, [op.entity_id]);

                    if (!localRes.values || localRes.values.length === 0) {
                        console.warn(`⚠️ [Sync] Local record lost for ${op.entity}:${op.entity_id}. Skipping sync.`);
                        await db.run("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [op.id], false);
                        continue;
                    }

                    const finalData = { ...localRes.values[0], user_id: user.id, device_id: myDeviceId };

                    // Dynamic JSON Handling: Detect stringified JSON and parse for Supabase JSONB compliance
                    Object.keys(finalData).forEach(key => {
                        const val = finalData[key];
                        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
                            try {
                                const parsed = JSON.parse(val);
                                finalData[key] = parsed;
                                console.log(`🧩 [Sync] Parsed JSON column for Supabase: ${key}`);
                            } catch (e) {
                                // Not actual JSON or malformed, keep as string
                            }
                        }
                    });
                    const { data: remoteItem } = await supabase.from(remoteTable).select('version').eq(pkField, op.entity_id).maybeSingle();
                    if (remoteItem && Number(remoteItem.version) > Number(finalData.version || 0)) {
                        await db.run("UPDATE sync_queue SET status = 'failed' WHERE id = ?", [op.id], false);
                        continue;
                    }
                    let { data: syncedData, error: syncErr } = await supabase.from(remoteTable).upsert([finalData], { onConflict: pkField }).select('server_updated_at, version').single();

                    if (syncErr) {
                        // Phase 6: Sync Hardening - Auto-Heal Foreign Key Violations (Category/Wallet)
                        if (syncErr.code === '23503' && op.entity === 'transactions') {
                            console.warn(`⚠️ [Sync] FK Violation detected for ${op.entity}:${op.entity_id}. Retrying without category_id...`);
                            const healedData = { ...finalData, category_id: null };
                            const retry = await supabase.from(remoteTable).upsert([healedData], { onConflict: pkField }).select('server_updated_at, version').single();
                            syncedData = retry.data;
                            syncErr = retry.error;
                        }

                        if (syncErr) throw syncErr;
                    }

                    if (this.realtimeChannel) this.realtimeChannel.send({ type: 'broadcast', event: 'sync_pulse', payload: { entity: op.entity, deviceId: myDeviceId } });
                    if (syncedData) await db.run(`UPDATE ${op.entity} SET server_updated_at = ?, version = ? WHERE ${pkField} = ?`, [syncedData.server_updated_at, syncedData.version, op.entity_id], false);
                    await db.run("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [op.id], false);
                } catch (e: any) {
                    console.error(`❌ [Sync] Failed to push ${op.entity}:${op.entity_id}. Status: ${e.status}, Msg: ${e.message}`, opPayload);
                    await db.run("UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1 WHERE id = ?", [op.id], false);
                    hasMore = false; break;
                }
            }
        }
        await db.run("DELETE FROM sync_queue WHERE status = 'synced' AND created_at < ?", [Date.now() - (172800000)], false);
        await this.loadStatus();
    }

    private async pullRemoteChanges(lightweight = false) {
        // Queue pulls to avoid lock contention
        return this.pullQueue = this.pullQueue.then(async () => {
            const result = await this._executePullRemoteChanges(lightweight);
            return result;
        });
    }

    private async _executePullRemoteChanges(lightweight = false) {
        // AUTH AUTHORITY: Ensure service is initialized before arbitration
        if (!this.statusLoaded) {
            console.log("⏳ [Smart Sync] Arbitration pending: Waiting for Service Init...");
            await this.initialize();
        }

        if (this.isPulling) return; // Should not happen with pullQueue, but for safety

        this.isPulling = true;
        this.notify();
        const db = await databaseKernel.getDb();
        const syncStartTime = Date.now();

        try {
            console.log(`📡 [Smart Sync] Requesting Global Authority... (Lightweight: ${lightweight})`);

            // 1. MANDATORY AUTHORITY ACQUISITION (Persistent Wait-Loop)
            let metadata = null;
            let retries = 0;
            const maxRetries = 10;

            while (retries < maxRetries) {
                this.syncStatus.progress = `Connecting to Authority (${retries + 1}/10)...`;
                this.notify();
                metadata = await this.getSyncMetadata();
                if (metadata) break;

                retries++;
                console.warn(`🕒 [Smart Sync] Authority Unreachable. Waiting for Server Response (${retries}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, 2000 * Math.min(retries, 5))); // Exponential-ish backoff
            }

            if (!metadata) {
                console.error("❌ [Smart Sync] ABSOLUTE GATE KEEPER: Authority request timed out. Aborting all data queries.");
                this.syncStatus.progress = "Sync Failed: Server Unreachable";
                this.notify();
                return;
            }

            // 2. EXTRACTION & ARBITRATION
            const localToken = Number(this.syncStatus.userSyncToken || 0);
            const serverToken = Number(metadata.userToken || 0);
            const needsBootstrap = !this.syncStatus.isInitialized;

            console.log(`⚖️ [Smart Sync] ARBITRATION: [Local: ${localToken}] vs [Cloud: ${serverToken}] | Bootstrap: ${needsBootstrap}`);

            const dynamicMismatch = serverToken > localToken;
            let tablesToPull: string[] = [];
            let newUserToken = localToken;
            let finalVersions = { ...this.syncStatus.staticVersions };

            // 3. STRICT DECISION GATING
            if (dynamicMismatch) {
                console.log(`🔓 [Smart Sync] AUTHORITY GRANTED: Version Delta found. Updating dynamic tiers.`);
                tablesToPull = [...DYNAMIC_TABLES];
                newUserToken = serverToken;
            } else if (needsBootstrap) {
                console.log(`🏁 [Smart Sync] BOOTSTRAP AUTHORITY: Performing forced initial check.`);
                tablesToPull = [...DYNAMIC_TABLES];
                newUserToken = serverToken;
            } else {
                console.log(`💎 [Smart Sync] AUTHORITY MATCHED (V${localToken}). Skipping all ${DYNAMIC_TABLES.length} dynamic tables.`);
            }

            // Static Data Logic
            for (const table of STATIC_TABLES) {
                const localVer = Number(this.syncStatus.staticVersions[table] || 0);
                const serverVer = Number(metadata.staticVersions[table] || 0);
                if (serverVer > localVer) {
                    console.log(`📦 [Smart Sync] Static Update: ${table} [V${localVer} -> SV${serverVer}]`);
                    if (!tablesToPull.includes(table)) tablesToPull.push(table);
                    finalVersions[table] = serverVer;
                }
            }

            // 4. FINAL NULL-SYMMETRY CHECK
            if (tablesToPull.length === 0) {
                console.log("🎯 [Smart Sync] SYSTEM CURRENT: 0 Network Queries issued to data tables.");
                if (needsBootstrap) {
                    const { data: { user } } = await supabase.auth.getUser();
                    await db.run('UPDATE meta_sync SET is_initialized = 1, last_user_sync_token = ?, static_versions = ?, last_user_id = ? WHERE id = 1',
                        [newUserToken, JSON.stringify(finalVersions), user?.id || null]);
                    this.syncStatus.isInitialized = true;
                    this.notify();
                }
                return;
            }

            // 5. DATA PULL EXECUTION (With Progress Tracking)
            console.log(`🚀 [Smart Sync] Commencing data pull for ${tablesToPull.length} tables...`);
            let processedTables = 0;
            const totalTables = tablesToPull.length;
            const lastTs = (lightweight && dynamicMismatch) ? Math.max(0, Number(this.syncStatus.lastSyncAt || 0) - 5000) : 0;
            const tiers = [TIER_1_TABLES, TIER_2_TABLES, TIER_3_TABLES];

            for (const tier of tiers) {
                const chunk = tier.filter(t => tablesToPull.includes(t));
                if (chunk.length === 0) continue;

                for (let i = 0; i < chunk.length; i += 3) {
                    const batch = chunk.slice(i, i + 3);
                    await Promise.all(batch.map(async (table) => {
                        let e = table; let f = '*';
                        if (table === 'categories_global') { e = 'categories'; f = 'global'; }
                        else if (table === 'categories_user') { e = 'categories'; f = 'user'; }

                        await this.pullEntity(db, e, lastTs, f);
                        processedTables++;
                        this.syncStatus.progressPercent = Math.floor((processedTables / totalTables) * 100);
                        this.syncStatus.progress = `Syncing ${e}...`;
                        this.notify();
                    }));
                }
            }

            // 6. ANCHOR COMMIT
            const { data: { user } } = await supabase.auth.getUser();
            await db.run('UPDATE meta_sync SET last_user_sync_token = ?, static_versions = ?, last_full_sync = ?, is_initialized = 1, last_user_id = ? WHERE id = 1',
                [newUserToken, JSON.stringify(finalVersions), syncStartTime, user?.id || null]);

            this.syncStatus.isInitialized = true;
            this.syncStatus.userSyncToken = newUserToken;
            this.syncStatus.staticVersions = finalVersions;
            this.syncStatus.lastSyncAt = syncStartTime;
            this.syncStatus.progress = null;
            this.syncStatus.progressPercent = 100;
            this.notify();
            console.log(`✅ [Smart Sync] Synchronization Successful. Global State anchored at Token ${newUserToken}.`);
        } catch (e) {
            console.error("🚀 [Smart Sync] Pull failed:", e);
        } finally {
            this.isPulling = false;
            this.notify();
        }
    }

    getStatus() { return this.syncStatus; }
}
export const offlineSyncService = new OfflineSyncService();
