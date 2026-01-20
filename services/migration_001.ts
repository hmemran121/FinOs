import { databaseKernel } from '../services/database';
import { offlineSyncService } from '../services/offlineSync';

export const runShadowMigration = async () => {
    console.log("🚀 [Migration] Starting Shadow Transaction Cleanup...");

    try {
        // 1. Identify Shadow Transactions
        const shadowTxns = await databaseKernel.query('transactions', 'is_sub_ledger_sync = 1');
        console.log(`🔍 [Migration] Found ${shadowTxns.length} shadow transactions.`);

        if (shadowTxns.length === 0) {
            console.log("✅ [Migration] No cleanup needed.");
            return;
        }

        // 2. Delete from Database
        // We use a safe batch delete
        for (const txn of shadowTxns) {
            await databaseKernel.delete('transactions', txn.id, txn.version);

            // 3. Queue Delete for Sync (To clean up server)
            // We pretend it's a normal delete so server removes it too
            await offlineSyncService.enqueue('transactions', txn.id, 'DELETE', {
                id: txn.id,
                version: txn.version,
                updated_at: Date.now(),
                is_deleted: 1
            });
        }

        console.log("✅ [Migration] Cleanup complete. Shadow transactions purged.");
        window.location.reload(); // Force reload to refresh context
    } catch (e) {
        console.error("❌ [Migration] Failed:", e);
    }
};
