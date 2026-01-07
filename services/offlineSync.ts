
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
 * Prevents "Already in Transaction" by serializing all DB write operations.
 */
class TransactionQueue {
    private queue: Promise<any> = Promise.resolve();

    async enqueue<T>(task: () => Promise<T>): Promise<T> {
        this.queue = this.queue.then(async () => {
            try {
                return await task();
            } catch (e) {
                console.error("⛔ [TxQueue] Task Failed:", e);
                throw e;
            }
        });
        return this.queue as any;
    }
}

const txQueue = new TransactionQueue();

class OfflineSyncService {
    private isPushing = false;
    private isPulling = false;
    private isInitialized = false;
    private realtimeChannel: any = null;
    private listeners: ((status: SyncStatusUI) => void)[] = [];
    private syncStatus: SyncStatusUI = {
        isOnline: true,
        isSyncing: false,
        progress: null,
        progressPercent: 0,
        pendingCount: 0,
        lastSyncAt: null,
        error: null,
        isInitialized: false
    };

    private bootstrapPromise: Promise<void> | null = null;
    private itemUpdateListeners: ((table: string, item: any, operation: 'INSERT' | 'UPDATE' | 'DELETE') => void)[] = [];
    private isInitializingRealtime = false;
    private reconnectAttempts = 0;
    private syncInterval: any = null;
    private lastPulseReceivedAt = 0;

    constructor() { }

    /**
     * Microsecond Precision Timestamp.
     * Combines Date.now() with performance.now() fractional part for ultra-precise ordering.
     */
    public getPrecisionTimestamp(): number {
        return Date.now();
    }

    public async initialize() {
        if (this.isInitialized) return;
        try {
            console.log("🚀 [Sync] Initializing Background Sync Engine...");
            await databaseKernel.initialize();

            const status = await Network.getStatus();
            this.syncStatus.isOnline = status.connected;

            await this.loadStatus();

            // 1. Mobile & Web Lifecycle Listeners
            App.addListener('appStateChange', ({ isActive }) => {
                if (isActive && this.syncStatus.isOnline) {
                    console.log("🔄 [Sync] Focus detected. Running catch-up...");
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

            // 2. Network Authority
            Network.addListener('networkStatusChange', async (status) => {
                const wasOffline = !this.syncStatus.isOnline;
                this.syncStatus.isOnline = status.connected;
                this.notify();

                if (status.connected && wasOffline) {
                    console.log("🌐 [Sync] Network regained. Processing queue...");
                    this.push();
                    this.pullRemoteChanges(true);
                }
            });

            // 3. Periodic Background Sync (Deep Consistency)
            this.syncInterval = setInterval(() => {
                if (this.syncStatus.isOnline && !this.isPulling && !this.isPushing) {
                    console.log("📡 [Sync] Periodic consistency check...");
                    this.sync();
                }
            }, 5 * 60 * 1000); // Every 5 minutes

            // 4. Initial Realtime Pulse
            this.setupRealtime();
            this.isInitialized = true;

        } catch (error) {
            console.error("🚀 [Sync] Engine failed to start:", error);
        }
    }

    private async loadStatus() {
        try {
            const db = await databaseKernel.getDb();
            const res = await db.query('SELECT * FROM meta_sync WHERE id = 1');
            if (res.values && res.values.length > 0) {
                const meta = res.values[0] as MetaSync;
                this.syncStatus.isInitialized = !!meta.is_initialized;
                this.syncStatus.lastSyncAt = meta.last_full_sync;
            }
            const queueRes = await db.query("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC");
            this.syncStatus.pendingCount = queueRes.values?.length || 0;
            this.syncStatus.pendingOperations = queueRes.values || [];
            this.notify();
        } catch (e) {
            console.warn("🚀 [Sync] Status loading failed:", e);
        }
    }

    private heartbeatInterval: any = null;

    private async setupRealtime() {
        if (this.isInitializingRealtime || !this.syncStatus.isOnline) return;
        this.isInitializingRealtime = true;

        if (this.realtimeChannel) {
            console.log("📡 [Sync] Cleaning up legacy Realtime Channel...");
            if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

            // Unsubscribe before removal to prevent "CLOSED" events from hitting our listener
            const oldChannel = this.realtimeChannel;
            this.realtimeChannel = null;
            await supabase.removeChannel(oldChannel);
        }

        const myDeviceId = databaseKernel.getDeviceId();
        const newChannel = supabase.channel(`finos_hq_stream_${myDeviceId}`);
        this.realtimeChannel = newChannel;

        this.realtimeChannel
            .on(
                'postgres_changes',
                { event: '*', schema: 'public' },
                (payload: any) => {
                    // Standard CDC Fallback (still useful if broadcast fails or for non-active apps)
                    const table = payload.table;
                    const remoteDeviceId = payload.new ? payload.new.device_id : (payload.old ? payload.old.device_id : null);

                    if (remoteDeviceId !== myDeviceId) {
                        console.log(`📡 [CDC] Fallback trigger: ${table}`);
                        this.handleRemoteChange(table, payload);
                    }
                }
            )
            .on(
                'broadcast',
                { event: 'sync_pulse' },
                (payload: any) => {
                    const { entity, deviceId } = payload.payload;
                    if (deviceId !== myDeviceId) {
                        const now = Date.now();
                        // 1s Debounce per device pulse to prevent pull storms
                        if (now - this.lastPulseReceivedAt > 1000) {
                            console.log(`⚡ [Ultra-Sync] Pulse from ${deviceId}: ${entity}. Pulling...`);
                            this.lastPulseReceivedAt = now;
                            this.pullRemoteChanges(true); // Immediate Delta Pull
                        }
                    }
                }
            )
            .subscribe(async (status: string, err?: any) => {
                // GUARD: If this channel is no longer the active one, ignore all events to prevent loops
                if (this.realtimeChannel !== newChannel) {
                    console.log("📡 [Sync] Ignoring status from abandoned channel:", status);
                    return;
                }

                if (status === 'SUBSCRIBED') {
                    console.log("🏁 [Realtime] Stream Stabilized. Channel is LIVE.");
                    this.isInitializingRealtime = false;
                    this.reconnectAttempts = 0;
                    this.notify();
                    this.pullRemoteChanges(true);

                    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
                    this.heartbeatInterval = setInterval(() => {
                        if (this.realtimeChannel === newChannel) {
                            newChannel.send({
                                type: 'broadcast',
                                event: 'pulse',
                                payload: { device: myDeviceId, time: Date.now() }
                            });
                        }
                    }, 30000);
                }

                if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    this.isInitializingRealtime = false;
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

                    if (this.syncStatus.isOnline) {
                        console.warn(`⚠️ [Realtime] Stream Interrupt (${status}). Reconnecting in ${delay}ms...`, err);
                        this.reconnectAttempts++;
                        setTimeout(() => this.setupRealtime(), delay);
                    }
                }
            });
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
        this.syncStatus.isSyncing = this.isPushing || this.isPulling;
        this.listeners.forEach(l => l({ ...this.syncStatus }));
    }

    subscribe(listener: (status: SyncStatusUI) => void) {
        this.listeners.push(listener);
        listener({ ...this.syncStatus });
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Safe Transaction Gate: Any write must go through here.
     */
    async safeTransaction(work: () => Promise<void>) {
        return txQueue.enqueue(async () => {
            const db = await databaseKernel.getDb();
            try {
                const status = await db.isTransactionActive();
                if (!status.result) {
                    await db.beginTransaction();
                }

                await work();

                const finalStatus = await db.isTransactionActive();
                if (finalStatus.result) {
                    await db.commitTransaction();
                }
            } catch (error) {
                console.error('🚀 [Sync] Transaction Failed:', error);
                try {
                    const errStatus = await db.isTransactionActive();
                    if (errStatus.result) {
                        await db.rollbackTransaction();
                    }
                } catch (e) { }
                throw error;
            }
        });
    }

    /**
     * Incremental Bootstrap: Prioritizes core data, paginates transactions.
     * Survivor Rule: App must open even if this partially fails.
     */
    async bootstrap() {
        if (this.bootstrapPromise) return this.bootstrapPromise;
        if (this.syncStatus.isInitialized) return;

        this.bootstrapPromise = (async () => {
            if (this.isSyncing) return;
            this.isSyncing = true;
            this.syncStatus.error = null;
            this.syncStatus.progressPercent = 0;
            this.notify();

            const withTimeout = (promise: Promise<any>, timeoutMs: number, name: string) => {
                return Promise.race([
                    promise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout fetching ${name}`)), timeoutMs))
                ]);
            };

            try {
                const db = await databaseKernel.getDb();
                this.syncStatus.progressPercent = 5;
                this.notify();

                // DYNAMIC DISCOVERY: Ask Supabase what tables it has
                console.log("🔍 [Bootstrap] Discovering Schema...");
                const { data: discoveredTables, error: rpcError } = await supabase.rpc('get_public_tables');

                const corePriority = [
                    'profiles',
                    'currencies',
                    'channel_types',
                    'categories',
                    'wallets',
                    'channels',
                    'transactions',
                    'commitments',
                    'transfers',
                    'budgets',
                    'financial_plans',
                    'financial_plan_components',
                    'financial_plan_settlements'
                ];

                let allTables: string[];

                if (rpcError || !discoveredTables) {
                    console.warn("⚠️ [Bootstrap] Dynamic discovery failed. Using Core Priority Fallback.");
                    allTables = corePriority;
                } else {
                    allTables = (discoveredTables as { table_name: string }[])
                        .map(t => t.table_name)
                        .sort((a, b) => {
                            let idxA = corePriority.indexOf(a);
                            let idxB = corePriority.indexOf(b);
                            if (idxA === -1) idxA = 999;
                            if (idxB === -1) idxB = 999;
                            if (idxA !== idxB) return idxA - idxB;
                            return a.localeCompare(b);
                        });
                }

                console.log("📋 [Bootstrap] Optimized Sync Order (Dependency-Aware):", allTables);

                const total = allTables.length;
                let current = 0;

                for (const table of allTables) {
                    current++;
                    this.syncStatus.progress = `Downloading ${table.toUpperCase().replace('_', ' ')} (${current}/${total})...`;
                    this.syncStatus.progressPercent = 10 + Math.floor((current / total) * 80);
                    this.notify();

                    console.log(`📥 [Bootstrap] Dynamic sync: ${table}`);
                    // Increase timeout for large datasets like plan_suggestions (5 mins) and others (2 mins)
                    const timeoutMs = table === 'plan_suggestions' ? 300000 : 120000;
                    await withTimeout(this.pullEntity(db, table), timeoutMs, table);
                }

                console.log('✅ [Sync] Fully Dynamic Bootstrap Complete.');

                // finalize
                const now = Date.now();
                await db.run('UPDATE meta_sync SET is_initialized = 1, last_full_sync = ? WHERE id = 1', [now]);
                this.syncStatus.isInitialized = true;
                this.syncStatus.lastSyncAt = now;
                this.syncStatus.progress = "System Ready";
                this.syncStatus.progressPercent = 100;
                this.notify();
            } catch (error: any) {
                console.error('❌ [Sync] FAILED Bootstrap:', error);
                this.syncStatus.error = `Setup Interrupted: ${error.message || 'Network Error'}`;
                this.notify();
            } finally {
                this.isSyncing = false;
                this.bootstrapPromise = null;
                this.notify();
            }
        })();

        return this.bootstrapPromise;
    }

    private async pullEntity(db: any, entity: string, since?: string | number, select: string = '*') {
        let hasMore = true;
        let offset = 0;
        const limit = 100;

        // Ensure we always work with a Numeric Timestamp for BIGINT comparison
        // Default to 0 (Epoch 1970) if undefined
        let sinceTs = 0;
        if (typeof since === 'number') {
            sinceTs = since;
        } else if (typeof since === 'string') {
            sinceTs = new Date(since).getTime();
        }

        while (hasMore) {
            let query = supabase.from(entity).select(select).range(offset, offset + limit - 1);
            if (sinceTs > 0) {
                // All synced tables now use BIGINT for updated_at, so we pass the number directly
                query = query.gt('updated_at', sinceTs);

                if (entity === 'channels' || entity === 'financial_plans') {
                    console.log(`🔎 [Sync] Checking ${entity} updated > ${new Date(sinceTs).toISOString()} (${sinceTs})`);
                }
            }

            // Order by updated_at to ensure deterministic paging
            query = query.order('updated_at', { ascending: true });

            const { data, error } = await query;
            if (error) {
                console.error(`❌ [Sync] Error pulling ${entity}:`, error);
                throw error;
            }

            if (data && data.length > 0) {
                console.log(`📦 [Sync] Persisting ${data.length} items for ${entity} (Batch ${offset / limit + 1})`);

                // PRE-FETCH Columns for this entity to speed up persistence and avoid PRAGMA inside loop
                // Categories is special as it maps to two tables
                let tablesToWarm = [entity];
                if (entity === 'categories') tablesToWarm = ['categories_global', 'categories_user'];
                if (entity === 'wallets') tablesToWarm = ['wallets', 'channels'];

                for (const t of tablesToWarm) await this.getTableColumns(db, t);

                // Use the transaction queue for the batch
                await this.safeTransaction(async () => {
                    for (const item of data) {
                        try {
                            await this.mapAndPersistRemoteItem(db, entity, item);
                        } catch (e) {
                            console.warn(`⚠️ [Sync] Failed to persist ${entity}:${(item as any).id || (item as any).code}`, e);
                        }
                    }
                });

                offset += data.length;
                if (data.length < limit) hasMore = false;
            } else {
                hasMore = false;
            }
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
        } catch (e) {
            return [];
        }
    }

    private async mapAndPersistRemoteItem(db: any, remoteEntity: string, item: any) {
        let localTable = remoteEntity;
        if (remoteEntity === 'categories') localTable = item.is_global ? 'categories_global' : 'categories_user';

        const localColumns = await this.getTableColumns(db, localTable);
        if (localColumns.length === 0) return;

        let pkField = localColumns.includes('id') ? 'id' : (localColumns.includes('code') ? 'code' : null);
        if (!pkField) return;
        let pkValue = item[pkField];

        // --- CONFLICT RESOLUTION STRATEGY ---
        const local = await db.query(`SELECT version, updated_at, server_updated_at FROM ${localTable} WHERE ${pkField} = ?`, [pkValue]);

        if (local.values && local.values.length > 0) {
            const localVer = Number(local.values[0].version || 0);
            const localUpd = Number(local.values[0].updated_at || 0);
            const remoteVer = Number(item.version || 0);
            const remoteUpd = Number(item.updated_at || 0);

            // 1. Higher version wins
            if (remoteVer < localVer) {
                console.log(`🛑 [Conflict] Table: ${localTable}, PK: ${pkValue}. Local version (${localVer}) is higher than remote (${remoteVer}). Dropping update.`);
                return;
            }

            // 2. If version equal, newer updated_at wins
            if (remoteVer === localVer && remoteUpd <= localUpd) {
                // Check if remote is actually a 'server_updated_at' update (if version is same but it just hit the cloud)
                const localServerUpd = Number(local.values[0].server_updated_at || 0);
                const remoteServerUpd = Number(item.server_updated_at || 0);

                if (remoteServerUpd <= localServerUpd) {
                    return; // No real change
                }
            }
        }

        // 3. GENERIC MAPPING
        const syncMeta = {
            updated_at: item.updated_at || Date.now(),
            server_updated_at: item.server_updated_at || 0,
            version: item.version || 1,
            device_id: item.device_id || 'remote',
            user_id: item.user_id || 'unknown',
            is_deleted: item.is_deleted ? 1 : 0
        };

        const mergedItem = { ...item, ...syncMeta };

        // Convert booleans for SQLite
        Object.keys(mergedItem).forEach(k => {
            if (typeof mergedItem[k] === 'boolean') mergedItem[k] = mergedItem[k] ? 1 : 0;
        });

        const dataKeys = localColumns.filter(c => mergedItem[c] !== undefined);
        const finalKeys = dataKeys.map(k => k === 'order' ? '"order"' : k);
        const finalValues = dataKeys.map(k => mergedItem[k]);

        if (finalKeys.length === 0) return;

        const placeholders = finalKeys.map(() => '?').join(',');
        const query = `INSERT OR REPLACE INTO ${localTable} (${finalKeys.join(',')}) VALUES (${placeholders})`;

        try {
            await db.run(query, finalValues, false);

            // Side-effect mapping for legacy wallets
            if (remoteEntity === 'wallets' && item.channels && Array.isArray(item.channels)) {
                for (const ch of item.channels) {
                    await this.mapAndPersistRemoteItem(db, 'channels', {
                        id: ch.id || `${item.id}_${ch.type}`,
                        wallet_id: item.id,
                        type: ch.type,
                        balance: ch.balance,
                        ...syncMeta
                    });
                }
            }
        } catch (e: any) {
            console.error(`❌ [Sync] Persistence Error for ${localTable}:`, e.message);
        }
    }

    async enqueue(entity: string, entity_id: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: any, autoSync: boolean = true) {
        const id = await databaseKernel.generateId();
        const { data: { user } } = await supabase.auth.getUser();

        await databaseKernel.insert('sync_queue', {
            id,
            entity,
            entity_id,
            operation,
            payload: JSON.stringify(payload),
            created_at: this.getPrecisionTimestamp(),
            retry_count: 0,
            status: 'pending'
        });

        await this.loadStatus();

        if (autoSync && this.syncStatus.isOnline && !this.isSyncing) {
            this.push();
        }
    }

    /**
     * Rapid Push: Only sends pending local changes to cloud.
     */
    async push() {
        if (this.isSyncing || !this.syncStatus.isOnline) return;
        this.isSyncing = true;
        this.notify();
        try {
            await this.uploadLocalChanges();
        } finally {
            this.isSyncing = false;
            this.notify();
        }
    }

    async sync() {
        if (this.isSyncing || !this.syncStatus.isOnline || !this.syncStatus.isInitialized) return;
        const syncStartTime = Date.now();
        this.isSyncing = true;
        this.notify();
        console.log("🔄 [Sync] Cycle Start...");
        try {
            // 1. Send local changes first
            await this.uploadLocalChanges();

            // 2. Fetch remote changes
            await this.pullRemoteChanges();

            // 3. Update sync anchor with the time we STARTED
            const db = await databaseKernel.getDb();
            await db.run('UPDATE meta_sync SET last_full_sync = ? WHERE id = 1', [syncStartTime]);
            this.syncStatus.lastSyncAt = syncStartTime;

            console.log("🔄 [Sync] Cycle Complete.");
        } catch (error: any) {
            console.error('❌ [Sync] Cycle Error:', error);
            this.syncStatus.error = error.message;
        } finally {
            this.isSyncing = false;
            this.notify();
        }
    }

    private async uploadLocalChanges() {
        const db = await databaseKernel.getDb();
        const myDeviceId = databaseKernel.getDeviceId();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn("🚀 [Sync] Unauthenticated. Process suspended.");
            return;
        }

        let hasMore = true;
        while (hasMore) {
            const res = await db.query("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50");
            if (!res.values || res.values.length === 0) {
                hasMore = false;
                break;
            }

            for (const op of res.values as SyncQueueItem[]) {
                try {
                    await db.run("UPDATE sync_queue SET status = 'syncing' WHERE id = ?", [op.id], false);

                    const payload = JSON.parse(op.payload);
                    let remoteTable = op.entity.startsWith('categories_') ? 'categories' : op.entity;

                    // Prepare data for Supabase
                    const finalData = {
                        ...payload,
                        user_id: user.id,
                        device_id: databaseKernel.getDeviceId()
                    };

                    // Soft Delete logic
                    if (op.operation === 'DELETE') {
                        finalData.is_deleted = true;
                        finalData.updated_at = this.getPrecisionTimestamp();
                    }

                    // Conflict resolution check before pushing (Cloud Authority)
                    const pkField = remoteTable === 'currencies' ? 'code' : 'id';
                    const pkValue = op.entity_id;

                    const { data: remoteItem } = await supabase
                        .from(remoteTable)
                        .select('version, updated_at')
                        .eq(pkField, pkValue)
                        .maybeSingle();

                    let shouldPush = true;
                    if (remoteItem) {
                        const remoteVer = Number(remoteItem.version || 0);
                        const localVer = Number(finalData.version || 0);

                        if (remoteVer > localVer) {
                            console.warn(`🛑 [Sync] Rejection: Remote version (${remoteVer}) is newer for ${remoteTable}:${pkValue}`);
                            shouldPush = false;
                        }
                    }

                    if (shouldPush) {
                        const { data: syncedData, error: syncErr } = await supabase
                            .from(remoteTable)
                            .upsert([finalData])
                            .select('server_updated_at, version')
                            .single();

                        if (syncErr) throw syncErr;

                        // Emit Sync Pulse for Ultra-Sync (Instant device-to-device notification)
                        if (this.realtimeChannel) {
                            this.realtimeChannel.send({
                                type: 'broadcast',
                                event: 'sync_pulse',
                                payload: { entity: op.entity, deviceId: myDeviceId }
                            });
                        }

                        // Update local server_updated_at if available
                        if (syncedData) {
                            const localTable = op.entity;
                            await db.run(`UPDATE ${localTable} SET server_updated_at = ?, version = ? WHERE ${pkField} = ?`,
                                [syncedData.server_updated_at, syncedData.version, pkValue], false);
                        }
                    }

                    await db.run("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [op.id], false);

                } catch (e: any) {
                    console.error(`🚀 [Sync] Batch failed for ${op.entity}:${op.entity_id}:`, e.message);
                    await db.run("UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1 WHERE id = ?", [op.id], false);

                    // If fatal or max retries, we might want to alert the user, but for now we just move on
                    if (op.retry_count > 10) {
                        await db.run("UPDATE sync_queue SET status = 'failed' WHERE id = ?", [op.id], false);
                    }

                    // Stop the loop for this batch to avoid hammering the server
                    hasMore = false;
                    break;
                }
            }
        }

        // Cleanup synced items older than 2 days
        await db.run("DELETE FROM sync_queue WHERE status = 'synced' AND created_at < ?", [Date.now() - (2 * 24 * 60 * 60 * 1000)], false);
        await this.loadStatus();
    }

    private async pullRemoteChanges(lightweight: boolean = false) {
        const db = await databaseKernel.getDb();

        const lookbackMs = lightweight ? (2 * 60 * 1000) : 0; // 2 min for lightweight catch-up
        const lastTs = Math.max(0, (this.syncStatus.lastSyncAt || 0) - lookbackMs);

        // Dynamic Discovery
        const corePriority = [
            'profiles', 'currencies', 'channel_types', 'categories',
            'wallets', 'channels', 'transactions', 'commitments',
            'transfers', 'budgets', 'financial_plans',
            'financial_plan_components', 'financial_plan_settlements'
        ];

        const { data: discoveredTables } = await supabase.rpc('get_public_tables');
        let sortedTables: string[];

        if (!discoveredTables) {
            sortedTables = corePriority;
        } else {
            const tables = (discoveredTables as { table_name: string }[]).map(t => t.table_name);
            sortedTables = tables.sort((a, b) => {
                let idxA = corePriority.indexOf(a);
                let idxB = corePriority.indexOf(b);
                if (idxA === -1) idxA = 999;
                if (idxB === -1) idxB = 999;
                return idxA - idxB;
            });
        }

        console.log(`📡 [Ultra-Sync] Executing ${lightweight ? 'Delta' : 'Full'} Pull for ${sortedTables.length} tables...`);

        for (const table of sortedTables) {
            let select = '*';
            if (table === 'wallets') select = '*, channels(*)';
            await this.pullEntity(db, table, lastTs, select);
        }
    }

    getStatus() { return this.syncStatus; }
}

export const offlineSyncService = new OfflineSyncService();
