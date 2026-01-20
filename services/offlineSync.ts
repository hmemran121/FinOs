
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
        // Strict Serializer: Chain tasks so they NEVER run in parallel
        const result = this.queue.then(async () => {
            try {
                return await task();
            } catch (e) {
                console.error("⛔ [TxQueue] Task Failed:", e);
                throw e; // Propagate error to caller but keep queue alive
            }
        }).catch(err => {
            // Queue recovery: Ensure the queue promise itself doesn't reject permanently
            return null;
        });

        // Update the queue pointer to the latest task
        this.queue = result;
        return result as Promise<T>;
    }
}

const txQueue = new TransactionQueue();

// Tiered table groups to ensure Foreign Key integrity during parallel sync
const TIER_1_TABLES = ['profiles', 'currencies', 'categories_user', 'categories_global', 'channel_types', 'plan_suggestions', 'wallets', 'ai_memories', 'ai_usage_logs'];
const TIER_2_TABLES = ['channels', 'transactions', 'commitments', 'transfers', 'budgets', 'financial_plans'];
const TIER_3_TABLES = ['financial_plan_components', 'financial_plan_settlements'];

const DYNAMIC_TABLES = [
    'profiles', 'categories_user', 'wallets', 'channels',
    'transactions', 'commitments', 'transfers', 'budgets',
    'financial_plans', 'financial_plan_components', 'financial_plan_settlements', 'ai_memories', 'ai_usage_logs'
];
const STATIC_TABLES = [
    'categories_global', 'channel_types', 'plan_suggestions', 'currencies'
];

/**
 * --------------------------------------------------
 * SUPER ADMIN CONTRACT (HYBRID ARCHITECTURE)
 * --------------------------------------------------
 * 1. Global IDs (currencies, categories, etc.) MUST be immutable (UUIDs).
 *    - Never DELETE a row and re-insert with new ID.
 *    - Always UPDATE existing row if name/value changes.
 * 
 * 2. Version Authority:
 *    - Any change to STATIC_TABLES in Supabase MUST be accompanied by
 *      incrementing the version in `static_data_versions` table.
 *    - Failing to increment version means users will NOT receive updates.
 * 
 * 3. ID Stability:
 *    - Bundled seeds (v1) have hardcoded UUIDs.
 *    - The Server MUST respect these UUIDs.
 * --------------------------------------------------
 */

class OfflineSyncService {
    private isInitialized = false;
    private statusLoaded = false;
    private syncPromise: Promise<void> | null = null;
    private abortController: AbortController | null = null;
    private realtimeChannel: any = null;
    private isRealtimeSubscribed = false;
    private syncDebounceTimer: any = null;
    private listeners: ((status: SyncStatusUI) => void)[] = [];
    private lastFlagStep = Date.now();
    private watchdogThreshold = 300000; // 5 minute safety window to allow for background throttling
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
    private syncCompletionListeners: ((hadChanges: boolean) => void)[] = [];
    private isInitializingRealtime = false;
    private reconnectAttempts = 0;
    private syncInterval: any = null;
    private lastPulseReceivedAt = 0;
    private lastGlobalVersionCheck = 0;
    private pullQueue: Promise<void> = Promise.resolve();

    // Clock Skew Protection
    private clockOffset = 0;

    // v5 Hardening: Service-Level Resume Authority
    private lastResumeAt = 0;
    private resumeLock = false;
    private onBiometricRequest: (() => Promise<void>) | null = null;

    private getIsColdStart(): boolean {
        const val = localStorage.getItem('finos_cold_start_pending');
        return val === null || val === 'true';
    }

    private clearColdStart() {
        localStorage.setItem('finos_cold_start_pending', 'false');
    }

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



    // Safety Gate: Ensures DB is ready before any operation
    private async ensureKernelReady() {
        try {
            await databaseKernel.initialize();
        } catch (e) {
            console.error("🔥 [Sync] Kernel Wait Failed:", e);
            throw e;
        }
    }

    public async initialize() {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                if (this.isInitialized) return;
                console.log("🔄 [Sync] Initializing OfflineSyncService...");
                this.notify(); // Heartbeat
                await this.loadStatus();
                this.notify(); // Heartbeat
                this.isInitialized = true;
                const status = await Network.getStatus();
                this.syncStatus.isOnline = status.connected;

                // REMOVED: Redundant lifecycle listeners.
                // Single source of truth is now FinanceContext.tsx to prevent duplicate sync loops.

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
                    this.checkWatchdog();
                    if (this.syncStatus.isOnline) {
                        this.sync();
                    }
                }, 1 * 60 * 1000); // Check every minute

                // Authority Re-evaluation on Auth Change
                supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log(`🔑 [Sync] Auth Event: ${event} for ${session?.user?.id}`);
                    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') && session?.user) {
                        this.bootstrapPromise = null; // Reset for re-auth
                        await this.loadStatus();
                        if (!this.syncStatus.isInitialized && this.syncStatus.isOnline) {
                            console.log("🚦 [Sync] User needs initialization. Bootstrapping...");
                            this.bootstrap();
                        }
                    } else if (event === 'SIGNED_OUT') {
                        // Strict Logout - Only clear on explicit action
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
            await this.ensureKernelReady();
            const db = await databaseKernel.getDb();
            const entries = await db.query('SELECT * FROM meta_sync WHERE id = 1');
            this.notify(); // Heartbeat
            if (entries.values && entries.values.length > 0) {
                const meta = entries.values[0] as MetaSync;

                // User-Aware Initialization Check
                let user = null;
                try {
                    console.log("📡 [Sync] Fetching session for status re-eval...");
                    const sessionPromise = supabase.auth.getSession();
                    const sessionTimeout = new Promise((_, r) => setTimeout(() => r(new Error("Session Timeout")), 3000));
                    const { data } = await Promise.race([sessionPromise, sessionTimeout]) as any;
                    user = data?.session?.user;
                    console.log(`📡 [Sync] Session resolved: ${user?.id || 'No User'}`);
                } catch (e) {
                    console.warn("⚠️ [Sync] User fetch failed or timed out:", e);
                }

                // Use fetched user ID or preserve last known user ID from meta
                const effectiveUserId = user?.id || meta.last_user_id;
                this.syncStatus.userId = effectiveUserId;

                if (effectiveUserId === meta.last_user_id && effectiveUserId) {
                    this.syncStatus.isInitialized = !!meta.is_initialized;
                    this.syncStatus.userSyncToken = meta.last_user_sync_token || 0;
                } else if (!meta.last_user_id && effectiveUserId) {
                    // FRESH USER ADOPTION: Bind immediately to prevent re-init loops
                    console.log(`👤 [Sync] Fresh User Adoption detected: ${effectiveUserId}`);
                    // Save to meta_sync immediately to anchor the user (Optimistically Initialized)
                    this.syncStatus.isInitialized = true;
                    await databaseKernel.run(`INSERT OR REPLACE INTO meta_sync (id, last_user_id, is_initialized, last_user_sync_token) VALUES (1, ?, 1, 0)`, [effectiveUserId], false);
                } else {
                    console.log(`👤 [Sync] User mismatch or new login: [Local: ${meta.last_user_id}] -> [Current: ${effectiveUserId}]`);
                    this.syncStatus.isInitialized = false;
                    this.syncStatus.userSyncToken = 0;
                }

                this.syncStatus.lastSyncAt = meta.last_full_sync;
                // Allow Global Init if strictly static versions exist OR if we just adopted a fresh user (Optimistic)
                this.syncStatus.isGlobalInitialized = !!(meta.static_versions && meta.static_versions !== '{}') || (!meta.last_user_id && !!effectiveUserId);

                try {
                    this.syncStatus.staticVersions = JSON.parse(meta.static_versions || '{}');
                } catch (e) { this.syncStatus.staticVersions = {}; }

                // Notify UI immediately of status determination
                this.notify();
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

    private async setupRealtime(force = false) {
        if (!this.syncStatus.isOnline) return;

        // Strict connection check: flag + actual channel state
        const isConnected = this.realtimeChannel &&
            (this.realtimeChannel.state === 'joined' || this.realtimeChannel.state === 'joining');

        if (this.isRealtimeSubscribed && isConnected && !force) {
            console.log('⏸️ [Realtime] Already subscribed and connected, skipping redundant setup');
            return;
        }

        if (this.isInitializingRealtime) return;
        this.isInitializingRealtime = true;
        console.log('🔧 [Realtime] Starting channel setup...');

        // Properly cleanup old channel
        if (this.realtimeChannel) {
            const oldChannel = this.realtimeChannel;
            this.realtimeChannel = null;
            try {
                console.log('🧹 [Realtime] Cleaning up old channel...');
                // Safety: Unsubscribe with a timeout to prevent hanging the engine
                await Promise.race([
                    oldChannel.unsubscribe(),
                    new Promise(r => setTimeout(r, 5000))
                ]);
                await supabase.removeChannel(oldChannel);
                console.log('✅ [Realtime] Old channel cleaned');
            } catch (e) {
                console.warn('⚠️ [Realtime] Cleanup error (Expected if disconnected):', e);
            }
        }
        const myDeviceId = databaseKernel.getDeviceId();
        const channelName = `finos_hq_stream_${myDeviceId}_${Date.now()}`;
        console.log(`📡 [Realtime] Creating channel: ${channelName}`);
        const newChannel = supabase.channel(channelName);
        this.realtimeChannel = newChannel;

        // FIX 1: Explicit Subscriptions to avoid "Trigger Blind Spots"
        const tables = ['categories', 'wallets', 'channels', 'transactions', 'commitments', 'transfers', 'budgets', 'profiles'];

        tables.forEach(table => {
            newChannel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload: any) => {
                const myDeviceId = databaseKernel.getDeviceId();
                const remoteDeviceId = payload.new?.device_id || 'unknown';

                // Debug Log for Bi-Directional Sync
                console.log(`⚡ [Realtime] Event received for ${payload.table}:`, {
                    event: payload.eventType,
                    remoteDevice: remoteDeviceId,
                    myDevice: myDeviceId,
                    match: remoteDeviceId === myDeviceId ? 'IGNORED (Self)' : 'ACCEPTED'
                });

                if (remoteDeviceId !== myDeviceId || payload.eventType !== 'INSERT') {
                    this.scheduleSync(); // Debounced trigger
                }
            });
        });

        newChannel
            .on('broadcast', { event: 'sync_pulse' }, (payload: any) => {
                const myDeviceId = databaseKernel.getDeviceId();
                if (payload.payload.deviceId !== myDeviceId) {
                    const now = Date.now();
                    const entity = payload.payload.entity;

                    // SMART PULSE HANDLING
                    if (entity === 'system_config' || entity.startsWith('global_')) {
                        // Background silent update for config
                        this._executeSyncGlobalData();
                    } else if (now - this.lastPulseReceivedAt > 5000) {
                        // Only trigger data pull if it's a data table and we haven't pulled recently
                        this.lastPulseReceivedAt = now;
                        console.log(`📡 [Sync Pulse] Received update signal for ${entity}`);
                        // Use lightweight pull to just fetch latest deltas
                        this.pullRemoteChanges(true);
                    }
                }
            })
            .subscribe(async (status: string) => {
                console.log(`🔌 [Realtime] Status: ${status}`);

                if (this.realtimeChannel !== newChannel) {
                    console.warn('⚠️ [Realtime] Old channel event, ignoring');
                    return;
                }

                if (status === 'SUBSCRIBED') {
                    console.log('✅ [Realtime] Connected and ready');
                    this.isInitializingRealtime = false;
                    this.isRealtimeSubscribed = true;
                    this.reconnectAttempts = 0;
                    this.notify();
                    this.scheduleSync(); // Initial delta check
                }


                if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`❌ [Realtime] ${status}. Attempt: ${this.reconnectAttempts + 1}/5`);
                    this.isInitializingRealtime = false;

                    // Only reconnect if this is still the active channel
                    if (this.realtimeChannel === newChannel) {
                        this.isRealtimeSubscribed = false;
                        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                        if (this.syncStatus.isOnline && this.reconnectAttempts < 5) {
                            this.reconnectAttempts++;
                            console.log(`🔄 [Realtime] Retry in ${delay}ms...`);
                            setTimeout(() => this.setupRealtime(true), delay);
                        } else {
                            console.error('❌ [Realtime] Max attempts or offline');
                            this.realtimeChannel = null;
                        }
                    } else {
                        console.log('ℹ️ [Realtime] Ignoring old channel error');
                    }
                }

                // Log other statuses for debugging
                if (!['SUBSCRIBED', 'CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'].includes(status)) {
                    console.log(`ℹ️ [Realtime] Intermediate status: ${status}`);
                }
            });
    }

    private async getSyncMetadata(signal?: AbortSignal): Promise<{ staticVersions: Record<string, number>, userToken: number } | null> {
        if (!this.syncStatus.isOnline || signal?.aborted) return null;
        try {
            let userId = this.syncStatus.userId;
            const myDeviceId = databaseKernel.getDeviceId();
            const localTimeBeforeRpc = Date.now();

            // Re-fetch user if missing to prevent race condition during early sync
            if (!userId) {
                // Retry loop: Initial load might lag slightly
                for (let i = 0; i < 5; i++) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user?.id) {
                        userId = session.user.id;
                        this.syncStatus.userId = userId;
                        break;
                    }
                    await new Promise(r => setTimeout(r, 100)); // Wait 100ms
                }
            }

            if (!userId) {
                console.warn("⚠️ [Sync] No user ID found while fetching metadata. Aborting sync cycle.");
                return null;
            }

            // 1. Get Server State (Metadata + Time Check)
            const { data, error } = await supabase.rpc('get_sync_metadata', {
                p_device_id: myDeviceId,
                p_last_pulse: this.syncStatus.lastSyncAt || 0
            });

            if (error) throw error;

            // Clock Skew Check
            if (data && data.server_time) {
                this.updateClockOffset(data.server_time);
            }

            // Expose to UI for Debugging
            this.syncStatus.serverStaticVersions = data.static_versions || {};
            this.syncStatus.serverUserSyncToken = data.user_sync_token || 0;
            this.notify();

            return {
                staticVersions: data.static_versions || {},
                userToken: data.user_sync_token || 0
            };
        } catch (e: any) {
            console.error("❌ [Sync] getSyncMetadata Exception:", e);
            return null;
        }
    }

    /**
     * Phase 1 Sync: Global System Taxonomy (Categories, Currencies, etc.)
     * This is called pre-login to ensure the app has standard data.
     */
    public async syncGlobalData(signal?: AbortSignal) {
        return this.pullQueue = this.pullQueue.then(async () => {
            await this._executeSyncGlobalData(signal);
        });
    }

    public async incrementGlobalVersion(key: string) {
        try {
            // SECURITY GATE: Only Super Admins can write to global config
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).maybeSingle();

            if (!profile || profile.is_super_admin !== 1) {
                console.warn(`🛡️ [Security] Blocked unauthorized global version increment for ${key}`);
                return;
            }

            const res = await supabase.from('system_config').select('value').eq('key', 'static_data_versions').maybeSingle();
            const versions = res.data ? JSON.parse(res.data.value) : {};
            versions[key] = (versions[key] || 0) + 1;
            await supabase.from('system_config').upsert({ key: 'static_data_versions', value: JSON.stringify(versions) });
            console.log(`🌐 [Admin] Global version incremented for ${key}`);
        } catch (e) {
            console.error("❌ Failed to increment global version:", e);
        }
    }

    private async _executeSyncGlobalData(signal?: AbortSignal) {
        if (!this.syncStatus.isOnline || !!this.syncPromise || (signal && signal.aborted)) return;

        const now = Date.now();
        // Throttle global checks to once per 10 minutes unless forced
        if (now - this.lastGlobalVersionCheck < 10 * 60 * 1000 && this.syncStatus.isGlobalInitialized) return;

        this.notify(); // Heartbeat

        try {
            console.log("🌐 [Smart Sync] Phase 1: Checking Global Configuration...");

            // Pull multiple config keys in one go - READ ONLY for everyone
            const { data: globalConfigs } = await supabase.from('system_config').select('key, value');
            const configMap: Record<string, string> = {};
            globalConfigs?.forEach(c => configMap[c.key] = c.value);

            // 1. Sync AI Configuration (Global Management)
            if (configMap['global_ai_keys']) {
                const val = configMap['global_ai_keys'];
                const current = localStorage.getItem('finos_global_ai_keys');
                const newVal = typeof val === 'string' ? val : JSON.stringify(val);
                if (current !== newVal) {
                    console.log("🤖 [Sync] Applying Global AI Keys update (Background)");
                    localStorage.setItem('finos_global_ai_keys', newVal);
                }
            }
            if (configMap['global_ai_model']) {
                const val = configMap['global_ai_model'];
                const newVal = typeof val === 'string' ? val : String(val);
                if (localStorage.getItem('finos_global_ai_model') !== newVal) {
                    localStorage.setItem('finos_global_ai_model', newVal);
                }
            }
            if (configMap['global_custom_gemini_key']) {
                const val = configMap['global_custom_gemini_key'];
                localStorage.setItem('finos_global_custom_gemini_key', typeof val === 'string' ? val : String(val));
            }
            if (configMap['global_ai_insights']) {
                localStorage.setItem('finos_global_ai_insights', configMap['global_ai_insights']);
            }

            // 2. Sync Global Branding
            if (configMap['global_app_name']) {
                localStorage.setItem('finos_global_app_name', configMap['global_app_name']);
            }
            if (configMap['global_logo_url']) {
                localStorage.setItem('finos_global_logo_url', configMap['global_logo_url']);
            }

            // 3. Sync Global Supabase (MANAGEMENT ACCESS)
            if (configMap['global_supabase_url']) {
                const val = configMap['global_supabase_url'];
                localStorage.setItem('finos_global_supabase_url', typeof val === 'string' ? val : String(val));
            }
            if (configMap['global_supabase_key']) {
                const val = configMap['global_supabase_key'];
                localStorage.setItem('finos_global_supabase_key', typeof val === 'string' ? val : String(val));
            }

            const versionsRaw = configMap['static_data_versions'];
            const serverStaticVersions = typeof versionsRaw === 'string' ? JSON.parse(versionsRaw) : versionsRaw;
            const tablesToPull: string[] = [];
            const finalVersions = { ...this.syncStatus.staticVersions };

            for (const table of STATIC_TABLES) {
                const localVer = Number(this.syncStatus.staticVersions[table] || 0);
                const serverVer = Number(serverStaticVersions?.[table] || 0);
                if (serverVer > localVer) {
                    tablesToPull.push(table);
                    finalVersions[table] = serverVer;
                }
            }

            // FIX: Explicitly track versions for Config Keys (Non-Tables)
            // These are handled via specific conditionals above (localStorage), but we must track their versions
            const CONFIG_KEYS = ['global_ai_key', 'global_ai_keys', 'global_custom_gemini_key', 'global_ai_model', 'global_ai_insights', 'global_app_name', 'global_logo_url'];
            CONFIG_KEYS.forEach(key => {
                if (serverStaticVersions?.[key]) {
                    finalVersions[key] = Number(serverStaticVersions[key]);
                }
            });

            if (tablesToPull.length > 0) {
                this.notify(); // Heartbeat
                console.log(`🌐 [Smart Sync] Fetching ${tablesToPull.length} updated global tables...`);
                const db = await databaseKernel.getDb();
                for (const table of tablesToPull) {
                    if (signal && signal.aborted) break;
                    let e = table; let f = '*';
                    if (table === 'categories_global') { e = 'categories'; f = 'global'; }
                    await this.pullEntity(db, e, 0, f);
                    this.notify(); // Heartbeat
                }

                // ONLY UPDATE LOCAL META - DO NOT ATTEMPT TO WRITE TO SERVER
                // The server is the source of truth for versions, we just acknowledge we have it.
                await db.run('UPDATE meta_sync SET static_versions = ? WHERE id = 1', [JSON.stringify(finalVersions)]);
                this.syncStatus.staticVersions = finalVersions;
            }

            this.syncStatus.isGlobalInitialized = true;
            this.lastGlobalVersionCheck = now;
            // console.log("✅ [Smart Sync] Global Config Synced.");
        } catch (e) {
            console.error("❌ [Smart Sync] Global Pull Failed:", e);
        } finally {
            this.notify();
        }
    }

    private async handleRemoteChange(table: string, payload: any) {
        // Table Mapping for Local Schema
        let targetTable = table;
        if (table === 'categories') {
            // Logic to distinguish global vs user categories if needed, or default to user
            // For safety, we check the payload structure or ID prefix if available
            // But usually 'categories' maps to 'categories_user' for user updates
            targetTable = 'categories_user';
        }

        console.log(`⚡ [Sync] Processing remote change for ${table} -> ${targetTable}`);

        this.safeTransaction(async () => {
            const db = await databaseKernel.getDb();
            const operation = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            let processedItem = payload.new;
            if (operation === 'DELETE') {
                const pk = targetTable === 'currencies' ? 'code' : 'id';
                const pkValue = payload.old ? payload.old[pk] : null;
                if (pkValue) {
                    await db.run(`UPDATE ${targetTable} SET is_deleted = 1, updated_at = ? WHERE ${pk} = ?`, [this.getTrustedTime(), pkValue], false);
                    processedItem = { [pk]: pkValue, is_deleted: 1 };
                }
            } else if (payload.new) {
                await this.mapAndPersistRemoteItem(db, targetTable, payload.new);
                processedItem = payload.new;
            }
            this.syncStatus.lastSyncAt = this.getTrustedTime();
            this.notify();
            this.itemUpdateListeners.forEach(l => l(targetTable, processedItem, operation));
        });
    }

    onItemUpdate(listener: (table: string, item: any, operation: 'INSERT' | 'UPDATE' | 'DELETE') => void) {
        this.itemUpdateListeners.push(listener);
        return () => {
            this.itemUpdateListeners = this.itemUpdateListeners.filter(l => l !== listener);
        };
    }

    onSyncComplete(listener: (hadChanges: boolean) => void) {
        this.syncCompletionListeners.push(listener);
        return () => {
            this.syncCompletionListeners = this.syncCompletionListeners.filter(l => l !== listener);
        };
    }


    public get isSyncing() {
        return !!this.syncPromise;
    }

    /**
     * Authoritative Preemption: Force-kills any current sync and starts a fresh one.
     */
    private async syncPreempt(options: { forcePull?: boolean, lightweight?: boolean, mode?: 'full' | 'push_only' | 'pull_only' }) {
        if (this.abortController) {
            console.warn("🛡️ [Sync] Preempting: Aborting current flow.");
            this.abortController.abort();
            this.abortController = null;
        }

        // Wait for the aborted pulse to wind down to ensure mutex safety
        if (this.syncPromise) {
            console.log("🛡️ [Sync] Preempting: Waiting for active promise to clear...");
            try {
                await this.syncPromise;
            } catch (e) {
                // Ignore AbortError during cleanup
            }
            this.syncPromise = null;
        }

        return this.sync({ ...options, forcePull: true });
    }

    /**
     * Explicitly refreshes the internal online status from the OS.
     * Essential for waking up from background where listeners might have been paused.
     */
    private async refreshNetworkStatus() {
        try {
            const status = await Network.getStatus();
            const wasOffline = !this.syncStatus.isOnline;
            this.syncStatus.isOnline = status.connected;
            console.log(`📶 [Sync] Network Refresh: ${status.connected ? 'ONLINE' : 'OFFLINE'} (${status.connectionType})`);

            // If we just came back online, notify immediately
            if (this.syncStatus.isOnline && wasOffline) {
                this.notify();
            }
        } catch (e) {
            console.warn("⚠️ [Sync] Network Refresh Failed:", e);
        }
    }

    /**
     * v5 Authoritative Resume Handler: Orchestrates the entire app-reopen sequence.
     * This is the single source of truth for resume events.
     */
    public async handleAppResume(source: 'APP_STATE' | 'VISIBILITY', biometricTrigger?: () => Promise<void>) {
        const now = Date.now();

        // Pre-check: Force break lock if it's stale (> 5000ms)
        // This handles cases where app slept while lock was held, pausing the unlock timer
        if (this.resumeLock && (now - this.lastResumeAt > 5000)) {
            console.warn(`🔓 [Sync] Breaking stale Resume Lock (App slept? Delta: ${now - this.lastResumeAt}ms)`);
            this.resumeLock = false;
        }

        // 1. Service-Level Debounce (2000ms) - Aggressive Lock
        if (this.resumeLock || (now - this.lastResumeAt < 2000)) {
            console.log(`📱 [Sync] ${source} resume ignored (Service Lock: ${this.resumeLock}, Debounce: ${now - this.lastResumeAt}ms)`);
            return;
        }

        this.resumeLock = true;
        this.lastResumeAt = now;

        // Micro-debounce batches racing AppState + Visibility events
        setTimeout(async () => {
            try {
                const isCold = this.getIsColdStart();
                console.log(`🚀 [Sync] Processing ${source} resume | ColdStart: ${isCold}`);

                // 0. WAKE UP NETWORK (Crucial for "Push on Resume")
                await this.refreshNetworkStatus();

                // v5: AGGRESSIVE ABORT - Kill active pulse BEFORE metadata check
                if (this.abortController) {
                    console.warn("🛡️ [Sync] Resume: Killing active sync flow.");
                    this.abortController.abort();
                    this.abortController = null;
                }

                // 1. Trigger Lock Screen (Parallel - Do NOT Block Sync)
                if (biometricTrigger) {
                    console.log("🔐 [Sync] Invoking Biometric Trigger (Parallel)...");
                    // Fire and forget - let Sync proceed immediately
                    biometricTrigger().catch(err => console.error("🔐 [Sync] Biometric Trigger Error:", err));
                }

                if (isCold) {
                    // Authoritative Cold Start Flow
                    await this.repairAfterResume({ forcePull: true, lightweight: false });
                    this.clearColdStart(); // Persistence clear
                } else {
                    // Routine Resume Repair
                    await this.repairAfterResume({ forcePull: true, lightweight: true });
                }
            } catch (e) {
                console.error("❌ [Sync] Resume cycle failed:", e);
            } finally {
                // Keep the lock for another 2s to ensure the repair pulse is the winner
                setTimeout(() => {
                    this.resumeLock = false;
                    this.notify();
                }, 2000);
            }
        }, 50);
    }

    /**
     * Emergency Override: Resets internal "syncing" states.
     * Use this during app resume to clear "zombie" flags left by OS sleep.
     */
    public async repairAfterResume(options: { forcePull?: boolean, lightweight?: boolean } = {}) {
        const { forcePull = true, lightweight = false } = options;
        console.log(`🧯 [Sync] Internal Repair Initiated. Mode: ${lightweight ? 'Lightweight' : 'Authoritative'}`);

        // 1. Preempt ongoing sync if any
        if (this.isSyncing) {
            console.log('🛡️ [Sync] Preempting active pulse for repair...');
            await this.syncPreempt({ forcePull, lightweight });
            return;
        }

        // 2. Kill ghost controllers if preemption didn't catch them
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        this.lastFlagStep = this.getTrustedTime();
        this.notify();

        this.notify();

        // 4. WebSocket Idempotency - Check and Repair (FORCE RECONNECT on Resume)
        // Fire and forget - do not block the Sync/Push cycle on socket connection time
        this.setupRealtime(true).catch(e => console.warn("Socket Setup Warn:", e));

        // 6. Trigger Sync with the new AbortSignal
        if (this.syncStatus.isOnline) {
            try {
                await this.sync({
                    forcePull,
                    lightweight,
                    mode: 'full'
                });
            } catch (e: any) {
                if (e.name === 'AbortError') {
                    console.log('🛡️ [Sync] Repair cycle preempted by newer request.');
                } else {
                    throw e;
                }
            }
        }
    }

    public onPause() {
        console.log('📱 [Sync] App going inactive / background');
        // Kill any ongoing sync to prevent OS from freezing it in a weird state
        if (this.abortController) {
            console.warn('🛡️ [Sync] Aborting active sync due to app backgrounding.');
            this.abortController.abort();
            this.abortController = null;
        }
    }

    public forceResetFlags() {
        if (this.syncPromise || this.abortController) {
            console.warn("🛡️ [Sync] Watchdog: Forcing flag reset and aborting flows.");
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
            }
        }
        this.syncPromise = null;
        this.lastFlagStep = this.getTrustedTime();
        this.notify();
    }

    private checkWatchdog() {
        const now = Date.now();
        if (now - this.lastFlagStep > this.watchdogThreshold) {
            if (this.syncPromise) {
                console.error("🔥 [Sync] Watchdog triggered! Resetting stuck flags.");
                this.forceResetFlags();
            }
        }
    }

    private notify() {
        this.lastFlagStep = this.getTrustedTime(); // Heartbeat for watchdog
        this.syncStatus.isSyncing = !!this.syncPromise;
        this.listeners.forEach(l => l({ ...this.syncStatus }));
    }

    subscribe(listener: (status: SyncStatusUI) => void) {
        this.listeners.push(listener);
        listener({ ...this.syncStatus });
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }

    // Atomic Semaphore for Transaction Safety
    private _isTransactionRunning = false;

    async safeTransaction(work: () => Promise<void>) {
        // Serial Queue ensures only one operation enters this block at a time
        return txQueue.enqueue(async () => {
            const db = await databaseKernel.getDb();
            let iStartedIt = false;

            try {
                // "Ask Forgiveness" Pattern:
                // Instead of asking "isTransactionActive" (which lies/races),
                // we try to start one. If it fails, we assume one is running and piggyback.
                try {
                    await this.ensureKernelReady();
                    await db.beginTransaction();
                    iStartedIt = true;
                } catch (e) {
                    // Transaction likely active. We proceed as a guest.
                    // console.log("⚠️ [Sync] Piggybacking on active transaction");
                }

                // Execute the work in the (now guaranteed) transaction context
                await work();

                // Only commit if we started it
                if (iStartedIt) {
                    await db.commitTransaction();
                    // FORCE PERSISTENCE: Since we used raw db.run for speed, we must manually trigger save on Web
                    await databaseKernel.run('SELECT 1', [], false);
                }
            } catch (error) {
                console.error("🚀 [Sync] Tx Failed:", error);

                if (iStartedIt) {
                    // Only rollback if we started it
                    try {
                        const errStatus = await db.isTransactionActive();
                        if (errStatus.result) await db.rollbackTransaction();
                    } catch (e) { }
                }
                // Do not rethrow
            } finally {
                if (iStartedIt) this._isTransactionRunning = false; // Cleanup just in case
            }
        });
    }


    async bootstrap() {
        if (this.bootstrapPromise) return this.bootstrapPromise;
        this.bootstrapPromise = (async () => {
            try {
                console.log("🏁 [Smart Sync] Redirecting Bootstrap to Strict Authority Engine...");
                this.notify(); // Heartbeat
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

        // HYBRID SYNC: Fetch user to enforce "My Data Only" scope locally
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;

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

                // HYBRID SYNC AUTHORITY: Prevent Super Admin Bloat
                // Even if RLS allows reading all, we only sync OUR data locally for these tables.
                const GLOBAL_ENTITIES = ['profiles', 'currencies', 'channel_types', 'plan_suggestions'];
                const isGlobalCat = (entity === 'categories' && select === 'global');

                if (currentUserId && !GLOBAL_ENTITIES.includes(entity) && !isGlobalCat) {
                    query = query.eq('user_id', currentUserId);
                }

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
                    this.notify(); // Heartbeat for Watchdog
                    if (data.length < limit) hasMore = false;
                } else { hasMore = false; }
            }
        } catch (e: any) {
            console.error(`🚀 [Sync] Failed to pull ${entity}:`, e.message);
        }

        if (this.syncStatus.tableStatuses[tableId]) {
            this.syncStatus.tableStatuses[tableId].status = 'completed';
            this.syncStatus.tableStatuses[tableId].lastResult = totalReceived > 0 ? `Updated ${totalReceived}` : 'No changes';
            this.syncStatus.tableStatuses[tableId].lastSyncTime = this.getTrustedTime();
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
        const mergedItem = { ...item, updated_at: item.updated_at || this.getTrustedTime(), version: item.version || 1, is_deleted: item.is_deleted ? 1 : 0 };

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
            created_at: this.getTrustedTime(),
            retry_count: 0,
            status: 'pending'
        });
        await this.loadStatus();
        if (autoSync) this.scheduleSync();
    }

    private scheduleSync() {
        if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
        this.syncDebounceTimer = setTimeout(async () => {
            try {
                await this.sync({ lightweight: true });

                // Post-sync validity check: Did we miss anything? (Race Condition Protection)
                // If we attached to an active sync that had already finished uploading, 
                // new pending items might remain.
                const db = await databaseKernel.getDb();
                const res = await db.query("SELECT id FROM sync_queue WHERE status = 'pending' LIMIT 1");
                if (res.values && res.values.length > 0) {
                    console.log("🔄 [Sync] Pending items detected after pulse. Triggering follow-up push...");
                    this.scheduleSync();
                }
            } catch (e) {
                console.warn("⚠️ [Sync] Scheduled sync cycle failed:", e);
            }
        }, 1500);
    }

    async push() {
        if (!this.syncStatus.isOnline) return;
        return this.sync({ mode: 'push_only' });
    }

    async sync(options: { lightweight?: boolean, forcePull?: boolean, mode?: 'full' | 'push_only' | 'pull_only' } = {}): Promise<void> {
        const { lightweight = true, forcePull = false, mode = 'full' } = options;

        if (this.syncPromise) {
            if (!forcePull) {
                console.log("🔗 [Sync] Attaching to active sync promise...");
                return this.syncPromise;
            }
            return this.syncPreempt(options);
        }

        this.syncPromise = (async (): Promise<void> => {
            if (!this.abortController) this.abortController = new AbortController();
            const signal = this.abortController.signal;

            try {
                console.log(`🔄 [Sync] Starting flow [${mode}] | Lightweight: ${lightweight} | ForcePull: ${forcePull}`);

                if (!this.syncStatus.isOnline) {
                    console.warn("🚫 [Sync] Sync aborted: Device is Offline.");
                    return;
                }

                if (signal.aborted) throw new Error('AbortError');

                if (mode === 'full' || mode === 'push_only') {
                    await this.uploadLocalChanges(signal);
                }

                if (signal.aborted) throw new Error('AbortError');

                if (mode === 'full' || mode === 'pull_only') {
                    await this.pullRemoteChanges(lightweight, forcePull, signal);
                }

                if (signal.aborted) throw new Error('AbortError');

                console.log("✅ [Sync] Pulse Complete.");
            } catch (e: any) {
                if (e.message === 'AbortError' || e.name === 'AbortError') {
                    console.log("🛡️ [Sync] Cycle aborted/preempted.");
                } else {
                    console.error("❌ [Sync] Sync process failed:", e);
                    throw e;
                }
            } finally {
                this.syncPromise = null;
                this.abortController = null;
                this.notify();
            }
        })();

        return this.syncPromise;
    }

    private async uploadLocalChanges(signal?: AbortSignal) {
        await this.ensureKernelReady();
        const db = await databaseKernel.getDb();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const myDeviceId = databaseKernel.getDeviceId();
        let hasMore = true;
        while (hasMore) {
            // ISOLATION: Only process items belonging to the current user to prevent Head-of-Line blocking
            let res;
            try {
                res = await db.query(
                    "SELECT * FROM sync_queue WHERE status = 'pending' AND (json_extract(payload, '$.user_id') = ? OR json_extract(payload, '$.user_id') IS NULL) ORDER BY created_at ASC LIMIT 50",
                    [user.id]
                );
            } catch (e) {
                // Fallback: If JSON extraction fails, fetch batch and filter in memory
                res = await db.query("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100");
            }

            if (!res.values || res.values.length === 0) break;

            for (const op of res.values as SyncQueueItem[]) {
                let opPayload = null;
                try {
                    opPayload = JSON.parse(op.payload);

                    // MEMORY SAFETY: Double check ownership
                    if (opPayload.user_id && opPayload.user_id !== user.id) {
                        // Skip silently (It belongs to another user)
                        continue;
                    }

                    await db.run("UPDATE sync_queue SET status = 'syncing' WHERE id = ?", [op.id], false);
                    this.notify(); // Heartbeat for Watchdog
                    let remoteTable = op.entity.startsWith('categories_') ? 'categories' : op.entity;

                    // Authority Fetch: Standardize on full local record to avoid Postgres NOT NULL violations
                    const pkField = remoteTable === 'currencies' ? 'code' : 'id';
                    const localRes = await db.query(`SELECT * FROM ${op.entity} WHERE ${pkField} = ?`, [op.entity_id]);

                    if (!localRes.values || localRes.values.length === 0) {
                        // Phase 7: Hard Delete Sync - If local record is gone, ensure it's gone from remote too
                        console.warn(`🗑️ [Sync] Local record gone for ${op.entity}:${op.entity_id}. Executing Remote Delete.`);
                        const { error: delErr } = await supabase.from(remoteTable).delete().eq(pkField, op.entity_id);
                        if (delErr) {
                            console.error(`❌ [Sync] Failed to delete remote record ${op.entity}:${op.entity_id}:`, delErr.message);
                            // If it's already gone (PGRST116 means zero rows affected, often okay for delete)
                            if (delErr.code === 'PGRST116') {
                                await db.run("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [op.id], false);
                            }
                        } else {
                            await db.run("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [op.id], false);
                        }
                        continue;
                    }

                    const finalData = { ...localRes.values[0], user_id: user.id, device_id: myDeviceId };

                    // Authority Hardening: Strip RBAC fields from outgoing profile updates.
                    // Only the server (Supabase) should manage these for security and data integrity.
                    if (remoteTable === 'profiles') {
                        delete finalData.is_super_admin;
                        delete finalData.role;
                        delete finalData.organization_id;
                        delete finalData.permissions; // Usually server-managed
                    }

                    // Hardening: Remove deprecated AI key columns that have been dropped from Supabase
                    delete finalData.gemini_keys;
                    delete finalData.custom_gemini_key;

                    // Dynamic JSON Handling: Detect stringified JSON and parse for Supabase JSONB compliance
                    Object.keys(finalData).forEach(key => {
                        const val = finalData[key];
                        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
                            try {
                                const parsed = JSON.parse(val);
                                finalData[key] = parsed;
                                // console.log(`🧩 [Sync] Parsed JSON column for Supabase: ${key}`);
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

    private async pullRemoteChanges(lightweight = false, forcePull = false, signal?: AbortSignal) {
        // Queue pulls to avoid lock contention
        return this.pullQueue = this.pullQueue.then(async () => {
            const result = await this._executePullRemoteChanges(lightweight, forcePull, signal);
            return result;
        });
    }

    private async _executePullRemoteChanges(lightweight = false, forcePull = false, signal?: AbortSignal) {
        if (!this.statusLoaded) {
            console.log("⏳ [Smart Sync] Arbitration pending: Waiting for Service Init...");
            await this.initialize();
        }

        const db = await databaseKernel.getDb();
        const syncStartTime = Date.now();

        try {
            console.log(`📡 [Smart Sync] Requesting Global Authority... (Lightweight: ${lightweight})`);

            // 1. MANDATORY AUTHORITY ACQUISITION (Persistent Wait-Loop)
            let metadata = null;
            let retries = 0;
            const maxRetries = 3;

            while (retries < maxRetries && (!signal || !signal.aborted)) {
                this.syncStatus.progress = `Connecting to Authority (${retries + 1}/${maxRetries})...`;
                this.notify();

                // Safety: Internal timeout for metadata fetch
                metadata = await Promise.race([
                    this.getSyncMetadata(signal),
                    new Promise(r => setTimeout(r, 10000)) as any
                ]);

                if (metadata || (signal && signal.aborted)) break;

                retries++;
                console.warn(`🕒 [Smart Sync] Authority Unreachable. Waiting for Server Response (${retries}/${maxRetries})...`);
                await new Promise(r => {
                    const t = setTimeout(r, 2000);
                    if (signal) {
                        signal.addEventListener('abort', () => {
                            clearTimeout(t);
                            r(null);
                        });
                    }
                });
            }



            // Graceful exit if pre-empted
            if (signal?.aborted) {
                console.log("🛡️ [Smart Sync] Sync cycle preempted/aborted during authority check.");
                return;
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

            const dynamicMismatch = (serverToken > localToken) || forcePull;
            let tablesToPull: string[] = [];
            let newUserToken = Math.max(localToken, serverToken);
            let finalVersions = { ...this.syncStatus.staticVersions };

            // 3. STRICT DECISION GATING
            if (forcePull) {
                console.log(`🛠️ [Smart Sync] MANUAL FORCE: Pull requested explicitly. Updating all ${DYNAMIC_TABLES.length} tiers.`);
                tablesToPull = [...DYNAMIC_TABLES];
            } else if (dynamicMismatch) {
                console.log(`🔓 [Smart Sync] AUTHORITY GRANTED: Version Delta found (S:${serverToken} > L:${localToken}). Updating dynamic tiers.`);
                tablesToPull = [...DYNAMIC_TABLES];
            } else if (needsBootstrap) {
                console.log(`🏁 [Smart Sync] BOOTSTRAP AUTHORITY: Performing forced initial check.`);
                tablesToPull = [...DYNAMIC_TABLES];
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
                    this.notify(); // Heartbeat
                    console.log("🏁 [Sync] Bootstrap Sequence Finalized.");
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
            // Use getSession (local) instead of getUser (network) to ensure we always capture the ID
            const { data: sessionData } = await supabase.auth.getSession();
            const anchorUserId = sessionData.session?.user?.id || this.syncStatus.userId || null;

            await databaseKernel.run(
                'UPDATE meta_sync SET last_user_sync_token = ?, static_versions = ?, last_full_sync = ?, is_initialized = 1, last_user_id = ? WHERE id = 1',
                [newUserToken, JSON.stringify(finalVersions), syncStartTime, anchorUserId]
            );

            this.syncStatus.isInitialized = true;
            this.syncStatus.userSyncToken = newUserToken;
            this.syncStatus.staticVersions = finalVersions;
            this.syncStatus.lastSyncAt = syncStartTime;
            this.syncStatus.userId = anchorUserId; // Explicitly update local state source
            this.syncStatus.progress = null;
            this.syncStatus.progressPercent = 100;
            this.notify();
            console.log(`✅ [Smart Sync] Synchronization Successful. Global State anchored at Token ${newUserToken}.`);

            // Notify listeners if data was pulled
            const hadChanges = tablesToPull.length > 0;
            if (hadChanges) {
                console.log(`🔔 [Smart Sync] Notifying ${this.syncCompletionListeners.length} listeners about data changes...`);
                this.syncCompletionListeners.forEach(listener => {
                    try {
                        listener(true);
                    } catch (e) {
                        console.error('❌ [Smart Sync] Listener callback failed:', e);
                    }
                });
            }
        } catch (e) {
            console.error("🚀 [Smart Sync] Pull failed:", e);
        } finally {
            this.notify();

        }
    }

    getStatus() { return this.syncStatus; }

    // ========================================
    // CLOCK SKEW PROTECTION (Trusted Time)
    // ========================================

    private async initClockOffset() {
        try {
            const res = await databaseKernel.query('meta_sync', 'id = 1');
            if (res && res.length > 0) {
                this.clockOffset = res[0].clock_offset || 0;
                if (Math.abs(this.clockOffset) > 1000) {
                    console.log(`🕐 [Timeguard] Loaded persistent clock offset: ${this.clockOffset}ms`);
                }
            }
        } catch (e) {
            console.warn("🕐 [Timeguard] Failed to load clock offset:", e);
        }
    }

    public getTrustedTime(): number {
        return Date.now() + this.clockOffset;
    }

    private async updateClockOffset(serverTime: number) {
        if (!serverTime) return;
        const localTime = Date.now();
        const drift = serverTime - localTime;

        // Only update if drift is significant (> 5 seconds) to avoid jitter
        if (Math.abs(drift) > 5000) {
            // Also check if existing offset is vastly different to avoid flipping constantly
            if (Math.abs(this.clockOffset - drift) > 2000) {
                this.clockOffset = drift;
                console.warn(`🕐 [Timeguard] Clock Skew Detected! Drift: ${drift}ms. Adjusting Trusted Time.`);
                try {
                    await databaseKernel.run('UPDATE meta_sync SET clock_offset = ? WHERE id = 1', [drift], false);
                } catch (e) {
                    console.error("🕐 [Timeguard] Failed to persist offset:", e);
                }
            }
        }
    }
}
export const offlineSyncService = new OfflineSyncService();
