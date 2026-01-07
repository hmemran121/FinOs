# IMPLEMENTATION DOCUMENTATION: Fix APK Cloud → Mobile Sync

## 1. Overview
This document details the implementation of the fix for the issue where cloud updates (specifically balance changes) were not reflecting instantly on the mobile app. The root cause was identified as the `OfflineSyncService` not subscribing to or pulling the `channels` table separately.

## 2. Changes Made in `services/offlineSync.ts`
### A. Realtime Subscription
- **Logic:** Calls `supabase.channel(...).on(...)`.
- **Change:** Added `'channels'` to the `tables` array.
- **Why:** Ensures that when a transaction in the browser updates a channel balance, the APK receives a realtime "postgres_changes" event.

### B. Pull Logic
- **Logic:** `pullRemoteChanges()` fetches data modified after `lastSyncAt`.
- **Change:** Added `await this.pullEntity(db, 'channels', lastIso);`.
- **Why:** Previously, channels were only pulled as a nested relation of wallets (`wallets(*, channels(*))`). If a transaction updated a channel's balance but NOT the wallet's `updated_at` (common in high-performance SQL triggers), the APK would miss the update. Explicitly pulling channels solves this.

### C. Persistence Logic
- **Logic:** `mapAndPersistRemoteItem` writes fetched data to SQLite.
- **Change:** Added a handler for `remoteEntity === 'channels'`.
- **Why:** Necessary to handle the data returned by the new explicit channel pull. It performs an `INSERT OR REPLACE` into the local `channels` table.

## 3. Data Flow Diagram (Updated)

```mermaid
graph TD
    Browser[Browser / Web Client] -->|Insert Tx| SupabaseDB[(Supabase PostgreSQL)]
    SupabaseDB -->|Trigger| ChannelsTable[Channels Table (Balance Update)]
    ChannelsTable -->|Realtime Event| MobileAPK[Mobile Client (OfflineSyncService)]
    
    MobileAPK -- Detects Event --> SyncLogic{Is Remote Device?}
    SyncLogic -- Yes --> TriggerSync[Trigger Sync Cycle]
    TriggerSync --> PullRemote[Pull Remote Changes]
    
    PullRemote --> GetWallets[Fetch Wallets]
    PullRemote --> GetChannels[Fetch Channels (Explicit)]
    
    GetChannels --> SQLite[(Local SQLite DB)]
    SQLite --> UI[React UI / Dashboard]
```

## 4. Test Plan (Verification)

### Scenario A: Browser → Mobile Sync
1.  **Setup:**
    - Open APK on Android Emulator/Device.
    - Open Web App in Browser.
    - Log in to the same account.
2.  **Action:**
    - In Browser, add a NEW EXPENSE of `$50` via CASH channel.
3.  **Expectation (Mobile):**
    - `console.log` shows `📡 [Realtime] Event on "channels"`.
    - `console.log` shows `🔄 [Sync] Cycle Start...`.
    - Dashboard decreases `Total Net Worth` by $50 automatically within 2-3 seconds.
    - **No usage of force-close or manual refresh required.**

### Scenario B: Offline -> Online
1.  **Setup:**
    - Turn Airplane Mode ON for Mobile.
2.  **Action:**
    - In Browser, add `$100` Income.
    - In Mobile, add `$20` Expense (queued).
3.  **Action:**
    - Turn Airplane Mode OFF.
4.  **Expectation:**
    - Mobile detects network -> uploads `$20` expense.
    - Mobile pulls `$100` income.
    - Final balance reflects both changes.

## 5. Potential Edge Cases Handled

-   **Duplicate Pulls:** If `wallets` pull also returns updated channels, the `INSERT OR REPLACE` logic in SQLite safely handles redundancy (idempotent).
-   **Race Conditions:** The `TransactionQueue` (`safeTransaction`) ensures that we don't try to write to SQLite from multiple threads simultaneously.
-   **Echo Prevention:** `device_id` check in `setupRealtime` prevents the device from re-syncing its own changes if it receives a reflection.

## 6. Next Steps
-   Deploy `services/offlineSync.ts` to the codebase.
-   Verify by running the test plan.
-   Run `npm run build` and `npx cap sync` to propagate changes to Android layer.
