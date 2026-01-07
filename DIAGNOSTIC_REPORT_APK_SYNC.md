# Developer Diagnostic Report – APK Sync Issue

## 1️⃣ Current Sync Engine Implementation

b
**Core Service:** `services/offlineSync.ts` uses a `TransactionQueue` to serialize all writes to the local SQLite database.

**Sync Logic:**
- **Push:** `uploadLocalChanges()` reads `sync_queue` (pending items) and upserts them to Supabase.
- **Pull:** `pullRemoteChanges()` fetches data from Supabase tables (`wallets`, `transactions`, etc.) modified after `lastSyncAt`.
- **Trigger:**
  - `sync()` is called on app startup (`initialize`).
  - `sync()` is called on `AppState` change (Resume/Foreground).
  - `sync()` is called via `setupRealtime` when a remote change is detected.

**Mutex/Locking:**
- A `isSyncing` boolean flag prevents concurrent sync cycles.
- A `TransactionQueue` (`txQueue`) ensures local DB writes are serial/atomic.

**Debounce:**
- Realtime events trigger a `setTimeout(..., 1000)` debounce to prevent flooding sync calls during bursts of updates.

## 2️⃣ Database Layer Details

| Entity | Local SQLite Table | Supabase Table | Primary Key |
| :--- | :--- | :--- | :--- |
| **Wallets** | `wallets` | `wallets` | `id` (UUID) |
| **Channels** | `channels` | `channels` | `id` (String: `walletId_type`) |
| **Transactions** | `transactions` | `transactions` | `id` (UUID) |
| **Ledger** | `commitments` | `commitments` | `id` (UUID) |
| **Categories** | `categories_user` / `_global` | `categories` | `id` (UUID) |

**Schema Notes:**
- Both local and remote tables use `updated_at` (timestamp) and `device_id` (string) for conflict resolution and syncing logic.
- **Crucial Mapping:** The `wallets` table has a one-to-many relationship with `channels`.

## 3️⃣ App Lifecycle & State Management

**Initialization (`store/FinanceContext.tsx`):**
1.  **Phase 1:** `databaseKernel.initialize()` - Sets up SQLite.
2.  **Phase 2:** `loadAppData(true)` - Loads local data into React State (`setState`).
3.  **Phase 3:** `offlineSyncService.initialize()` - Sets up listeners and realtime.
4.  **Phase 4:** `Auth` - Verifies user.

**Online/Offline Detection:**
- Uses `@capacitor/network`.
- `Network.addListener` updates internal `syncStatus.isOnline`.

**Force Close vs. Background:**
- **Force Close -> Open:** Triggers the full `startSequence` (Phases 1-4), ensuring a fresh `bootstrap()` or `sync()` run. This explains why data appears after restart.
- **Foregrounding:** Triggers `App.addListener('appStateChange')` which calls `sync()`.

## 4️⃣ Realtime / Polling Mechanism

**Implementation:** `OfflineSyncService.ts` -> `setupRealtime()`

**Code:**
```typescript
const tables = ['categories', 'wallets', 'transactions', 'commitments', 'transfers', 'budgets', 'profiles'];
this.realtimeChannel = supabase.channel('finos_realtime_v7');

tables.forEach(table => {
    this.realtimeChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        (payload) => { ... }
    );
});
```

**Conflict Handling:**
- Checks `payload.new.device_id`. If it matches `local_device_id`, the event is ignored (echo prevention).
- If it's a remote device, it triggers `sync()`.

## 5️⃣ Logs & Errors (Derived from Analysis)

**Potential Anomalies:**
1.  **Missing `channels` Subscription:**
    - The `tables` array in `setupRealtime` includes `wallets` but **EXCLUDES** `channels`.
    - **Outcome:** If a transaction in the browser updates a balance in the `channels` table but doesn't explicitly touch the `wallets` row's `updated_at`, the APK **will not receive a Realtime trigger**. It won't know it needs to sync until a force-sync or app restart.

2.  **Transactions Listener:**
    - `transactions` IS in the list. Creating a transaction *should* trigger an event.
    - However, if the UI relies on valid `channel` balances to show the "Total Balance", and those updates are missed, the dashboard numbers might remain stale even if the transaction list updates.

3.  **Device ID Mismatch:**
    - If `databaseKernel.getDeviceId()` returns a different ID than what is stored in the cloud for that device's previous sessions, it might incorrectly filter or process events.

## 6️⃣ Configuration & Dependencies

- **Capacitor:** v7.0.0 (inferred from package.json `^7.0.2` sqlite)
- **Supabase Client:** `^2.45.1`
- **React:** `^18.3.1`
- **SQLite Plugin:** `@capacitor-community/sqlite`
- **OS:** Android (APK)

## 7️⃣ Repro Steps & Behavior

**Reproduction:**
1. Open APK (Device A) and Browser (Device B).
2. On Browser, add a Transaction (`- $50` Expense).
3. Browser updates: `transactions` table (INSERT) + `channels` table (UPDATE balance).
4. **Observe APK:**
   - **Expected:** APK receives Realtime signal -> Syncs -> Updates UI `currentBalance`.
   - **Actual:** APK shows nothing.
5. **Force Close APK -> Reopen:**
   - App boots -> Runs `sync()` -> Fetches new data -> Balances update.

**Root Cause Suspect:**
The `OfflineSyncService` is **not listening to the `channels` table**. Realtime events for balance updates are being ignored by the mobile client.
