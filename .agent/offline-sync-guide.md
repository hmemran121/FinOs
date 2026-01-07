# Offline Sync System Implementation Guide

## 🎯 Overview

The FinOS offline sync system enables seamless operation in offline mode with automatic cloud synchronization when connectivity is restored. This is critical for mobile APK users who may have intermittent internet access.

## 🏗️ Architecture

### Components

1. **OfflineSyncService** (`services/offlineSync.ts`)
   - Queue management for pending operations
   - Network status monitoring
   - Automatic retry logic
   - Periodic sync (every 5 minutes)

2. **SyncStatusIndicator** (`components/SyncStatusIndicator.tsx`)
   - Compact status badge for header
   - Detailed panel for Settings
   - Visual feedback for sync state

3. **FinanceContext Integration**
   - Sync status state management
   - Operation queueing on CRUD actions
   - Force sync capability

## 📋 Implementation Steps

### Step 1: Install Required Capacitor Plugins

```bash
npm install @capacitor/preferences @capacitor/network
npx cap sync
```

### Step 2: Update FinanceContext Methods

Modify all data mutation methods to queue operations when offline:

#### Example: addTransaction

```typescript
const addTransaction = async (t: Omit<Transaction, 'id'>) => {
  const newTransaction = {
    ...t,
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user_id: state.profile.email // Add user_id for cloud sync
  };

  // Update local state immediately
  setState(prev => ({
    ...prev,
    transactions: [newTransaction, ...prev.transactions]
  }));

  // Queue for cloud sync
  if (syncStatus.isOnline) {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([newTransaction]);
      
      if (error) throw error;
    } catch (error) {
      // If online but sync fails, queue it
      await offlineSyncService.queueOperation({
        type: 'CREATE',
        entity: 'transaction',
        data: newTransaction
      });
    }
  } else {
    // Offline - queue immediately
    await offlineSyncService.queueOperation({
      type: 'CREATE',
      entity: 'transaction',
      data: newTransaction
    });
  }
};
```

### Step 3: Subscribe to Sync Status

Add to FinanceProvider's useEffect:

```typescript
useEffect(() => {
  // Subscribe to sync status changes
  const unsubscribe = offlineSyncService.subscribe((status) => {
    setSyncStatus(status);
  });

  return () => {
    unsubscribe();
  };
}, []);
```

### Step 4: Add Sync Status to Context Value

```typescript
const value: FinanceContextType = {
  ...state,
  // ... other methods
  syncStatus,
  forceSyncNow: () => offlineSyncService.forceSyncNow(),
  // ... rest of context
};
```

### Step 5: Add Sync Indicator to App Header

In `App.tsx`:

```typescript
import { SyncStatusIndicator } from './components/SyncStatusIndicator';

// In the header section:
<div className="flex items-center gap-3">
  <SyncStatusIndicator />
  <button onClick={() => setActiveTab('settings')}>
    <Settings size={20} />
  </button>
</div>
```

### Step 6: Add Detailed Sync Panel to Settings

In `Settings.tsx`:

```typescript
import { SyncStatusPanel } from './components/SyncStatusIndicator';

// Add a new section:
<div className="space-y-4">
  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
    Cloud Sync
  </h2>
  <SyncStatusPanel />
</div>
```

## 🔄 Operation Flow

### Online Mode
1. User performs action (e.g., add transaction)
2. Update local state immediately (optimistic update)
3. Attempt direct cloud sync
4. If sync fails, queue operation
5. Retry on next sync cycle

### Offline Mode
1. User performs action
2. Update local state immediately
3. Queue operation for later sync
4. Show pending count in status indicator
5. Auto-sync when network restored

### Network Restoration
1. Network listener detects connection
2. Trigger immediate sync of all pending operations
3. Retry failed operations (max 3 attempts)
4. Update UI with sync status
5. Clear successfully synced operations from queue

## 📊 Data Persistence

### Local Storage (Capacitor Preferences)
- **Key**: `sync_queue`
- **Format**: JSON array of PendingOperation objects
- **Persistence**: Survives app restarts
- **Max Size**: ~2MB (platform dependent)

### Operation Structure
```typescript
{
  id: "1704278400000_abc123",
  type: "CREATE" | "UPDATE" | "DELETE",
  entity: "transaction" | "wallet" | "category" | "commitment",
  data: { /* entity data */ },
  timestamp: 1704278400000,
  retryCount: 0
}
```

## 🎨 UI States

### Status Indicator Colors
- 🟢 **Green**: Online, synced, no pending operations
- 🔵 **Blue**: Online, pending operations waiting
- 🟡 **Yellow**: Sync error, will retry
- 🔴 **Red**: Offline mode

### Status Messages
- "Synced" - All operations synced
- "X pending" - X operations waiting to sync
- "Syncing..." - Sync in progress
- "Offline" - No network connection
- "Sync Error" - Failed sync, will retry

## 🔒 Conflict Resolution

### Strategy: Last-Write-Wins
- Timestamp-based conflict resolution
- Server timestamp takes precedence
- Local changes with newer timestamps override server

### Future Enhancement: Smart Merge
- Detect concurrent modifications
- Prompt user for conflict resolution
- Merge non-conflicting fields automatically

## 🧪 Testing Scenarios

### Test 1: Basic Offline Operation
1. Disable network
2. Add transaction
3. Verify local state updated
4. Check pending operations count
5. Enable network
6. Verify auto-sync

### Test 2: Multiple Offline Operations
1. Disable network
2. Add 5 transactions
3. Update 2 wallets
4. Delete 1 category
5. Verify all queued
6. Enable network
7. Verify all synced

### Test 3: Sync Failure Recovery
1. Simulate network error
2. Verify operation queued
3. Wait for retry
4. Verify eventual sync

### Test 4: App Restart Persistence
1. Queue operations
2. Close app
3. Reopen app
4. Verify queue restored
5. Verify auto-sync

## 📱 Android-Specific Considerations

### Network Permissions
Ensure `AndroidManifest.xml` includes:
```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

### Background Sync
- Sync runs in foreground only
- Consider WorkManager for background sync (future enhancement)
- Battery optimization may affect periodic sync

### Storage Limits
- Preferences API has ~2MB limit
- Consider IndexedDB for larger queues
- Implement queue size monitoring

## 🚀 Performance Optimization

### Batching
- Group multiple operations into single request
- Reduce network overhead
- Implement in future version

### Debouncing
- Delay sync trigger by 2 seconds
- Prevent excessive sync calls
- Batch rapid consecutive changes

### Compression
- Compress large payloads
- Reduce bandwidth usage
- Implement for media/attachments

## 📈 Monitoring & Analytics

### Metrics to Track
- Average sync latency
- Sync success rate
- Queue size distribution
- Network uptime percentage
- Failed operation types

### Logging
- All sync operations logged to console
- Error tracking for debugging
- Performance metrics collection

## 🔮 Future Enhancements

1. **Differential Sync**
   - Only sync changed fields
   - Reduce payload size
   - Faster sync times

2. **Background Sync**
   - Use WorkManager (Android)
   - Sync even when app closed
   - Scheduled periodic sync

3. **Conflict Resolution UI**
   - Visual diff viewer
   - User-driven merge decisions
   - Conflict history

4. **Sync Analytics Dashboard**
   - Real-time sync status
   - Historical sync performance
   - Error rate trends

5. **Selective Sync**
   - User chooses what to sync
   - Reduce data usage
   - Privacy controls

## 🐛 Troubleshooting

### Issue: Operations Not Syncing
- Check network status
- Verify Supabase connection
- Check console for errors
- Inspect sync queue

### Issue: Duplicate Entries
- Ensure unique ID generation
- Check for race conditions
- Verify operation deduplication

### Issue: Sync Loop
- Check for circular dependencies
- Verify operation completion
- Inspect retry logic

## 📚 API Reference

### offlineSyncService

```typescript
// Queue an operation
await offlineSyncService.queueOperation({
  type: 'CREATE',
  entity: 'transaction',
  data: transactionData
});

// Force sync now
await offlineSyncService.forceSyncNow();

// Get current status
const status = offlineSyncService.getStatus();

// Subscribe to status changes
const unsubscribe = offlineSyncService.subscribe((status) => {
  console.log('Sync status:', status);
});

// Clear queue (use with caution!)
await offlineSyncService.clearQueue();
```

### SyncStatus Interface

```typescript
interface SyncStatus {
  isOnline: boolean;           // Network connectivity
  lastSyncTime: number | null; // Timestamp of last successful sync
  pendingOperations: number;   // Count of queued operations
  isSyncing: boolean;          // Currently syncing
  syncError: string | null;    // Last error message
}
```

## ✅ Checklist

- [ ] Install Capacitor plugins
- [ ] Implement offlineSyncService
- [ ] Update FinanceContext methods
- [ ] Add sync status state
- [ ] Create SyncStatusIndicator component
- [ ] Add indicator to App header
- [ ] Add panel to Settings
- [ ] Test offline scenarios
- [ ] Test sync recovery
- [ ] Test app restart persistence
- [ ] Build and test APK
- [ ] Monitor sync performance

## 🎓 Best Practices

1. **Always Update Local State First**
   - Optimistic updates for better UX
   - Queue sync as secondary operation

2. **Handle Errors Gracefully**
   - Don't block user on sync failure
   - Queue and retry automatically

3. **Provide Clear Feedback**
   - Show sync status prominently
   - Indicate pending operations count

4. **Test Thoroughly**
   - Test all offline scenarios
   - Verify data integrity
   - Check edge cases

5. **Monitor Performance**
   - Track sync latency
   - Monitor queue size
   - Optimize as needed
