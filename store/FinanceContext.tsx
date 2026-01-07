
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppState,
  Wallet,
  Channel,
  Transaction,
  Category,
  Budget,
  Commitment,
  HealthScore,
  MasterCategoryType,
  ChannelType,
  CommitmentType,
  CommitmentFrequency,
  CertaintyLevel,
  UserProfile,
  AppSettings,
  SyncStatusUI,
  SyncBase,
  Transfer,
  FinancialPlan,
  PlanComponent,
  PlanSettlement,
  PlanStatus,
  PlanType,
  ComponentType
} from '../types';

export interface CurrencyConfig extends SyncBase {
  code: string;
  name: string;
  symbol: string;
}

export interface ChannelTypeConfig extends SyncBase {
  id: string; // e.g. 'CASH', 'BANK'
  name: string;
  iconName: string;
  color: string;
  isDefault: boolean;
}

import { supabase } from '../services/supabase';
import { offlineSyncService } from '../services/offlineSync';
import { databaseKernel } from '../services/database';
import { biometricService } from '../services/biometric';
import { CURRENCY_MAP } from '../constants';
import { addDays, isSameDay, startOfDay, parseISO } from 'date-fns';

export interface WalletWithBalance extends Wallet {
  currentBalance: number;
  totalExpenses: number;
  totalIncome: number;
  computedChannels: { type: ChannelType, balance: number }[];
}

interface FinanceContextType extends AppState {
  currencies: CurrencyConfig[];
  channelTypes: ChannelTypeConfig[];
  unlockApp: () => Promise<boolean>;
  logout: () => void;
  addTransaction: (t: Omit<Transaction, keyof SyncBase | 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addWallet: (w: Omit<Wallet, keyof SyncBase | 'id'>) => Promise<void>;
  updateWallet: (id: string, w: Partial<Wallet>) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;
  setPrimaryWallet: (id: string) => void;
  addBudget: (b: Omit<Budget, keyof SyncBase | 'id'>) => void;
  addCategory: (c: Omit<Category, keyof SyncBase | 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  toggleCategoryStatus: (id: string) => Promise<void>;
  addCommitment: (c: Omit<Commitment, keyof SyncBase | 'id'>) => Promise<void>;
  updateCommitment: (id: string, updates: Partial<Commitment>) => Promise<void>;
  deleteCommitment: (id: string) => Promise<void>;
  addTransfer: (t: Omit<Transfer, keyof SyncBase | 'id'>) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  clearAllData: () => void;
  totalBalance: number;
  availableAfterCommitments: number;
  walletsWithBalances: WalletWithBalance[];
  projectedBalances: { date: string, balance: number, stress: 'NONE' | 'LOW' | 'HIGH' }[];
  isCloudLoading: boolean;
  getCurrencySymbol: (code?: string) => string;
  financialPlans: FinancialPlan[];
  addPlan: (p: Omit<FinancialPlan, keyof SyncBase | 'id' | 'components' | 'settlements'>) => Promise<string>;
  updatePlan: (id: string, updates: Partial<FinancialPlan>) => Promise<void>;
  deletePlan: (id: string, soft?: boolean) => Promise<void>;
  addComponent: (c: Omit<PlanComponent, keyof SyncBase | 'id'>) => Promise<void>;
  updateComponent: (id: string, updates: Partial<PlanComponent>) => Promise<void>;
  deleteComponent: (id: string) => Promise<void>;
  addSettlement: (s: Omit<PlanSettlement, keyof SyncBase | 'id'>) => Promise<void>;
  deleteSettlement: (id: string) => Promise<void>;
  finalizePlan: (id: string) => Promise<void>;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  selectedWalletId: string | null;
  setSelectedWalletId: (id: string | null) => void;
  syncStatus: SyncStatusUI;
  forceSyncNow: () => Promise<void>;
  searchPlanSuggestions: (query: string) => Promise<string[]>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const DEFAULT_STATE: AppState = {
  wallets: [],
  categories: [],
  transactions: [],
  budgets: [],
  commitments: [],
  currencies: [],
  channelTypes: [],
  healthScore: { score: 0, liquidity: 0, stability: 0, burnControl: 0, commitmentCoverage: 0 },
  isLocked: false,
  userPin: null,
  isLoggedIn: false,
  financialPlans: [],
  profile: { name: 'Premium User', email: '' },
  settings: { currency: 'USD', theme: 'DARK', aiEnabled: true, biometricEnabled: true },
  sync_status: {
    isOnline: true,
    isSyncing: false,
    progress: null,
    progressPercent: 0,
    pendingCount: 0,
    lastSyncAt: null,
    error: null,
    isInitialized: false
  }
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isKernelReady, setIsKernelReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusUI>(offlineSyncService.getStatus());

  const loadAppData = useCallback(async (shouldTriggerSync: boolean = false) => {
    // 1. Instant Local Load (SURVIVOR RULE)
    try {
      const wallets = await databaseKernel.query('wallets');
      const transactions = await databaseKernel.query('transactions');
      let categoriesUser = await databaseKernel.query('categories_user');
      let categoriesGlobal = await databaseKernel.query('categories_global');

      // Taxonomy V2 Force Purge Logic
      const hasModern = categoriesGlobal.some((c: any) => c.id === 'cat_life_essentials');
      const hasLegacy = categoriesGlobal.some((c: any) => !c.id.startsWith('cat_') || ['cat_food', 'cat_miscellaneous', 'cat_shopping'].includes(c.id));

      if (!hasModern && (hasLegacy || categoriesGlobal.length > 5)) {
        console.log("🧹 [FinanceContext] Legacy Taxonomy Detected. Performing Force Purge...");
        await databaseKernel.execute("DELETE FROM categories_global");
        await databaseKernel.execute("DELETE FROM categories_user");
        const db = await databaseKernel.getDb();
        await db.run('UPDATE meta_sync SET last_full_sync = 0 WHERE id = 1');

        // Re-fetch empty sets
        categoriesUser = [];
        categoriesGlobal = [];

        // Trigger immediate sync pulse
        setTimeout(() => offlineSyncService.sync(), 1000);
      }

      const commitments = await databaseKernel.query('commitments');
      const channels = await databaseKernel.query('channels');
      const budgets = await databaseKernel.query('budgets');
      const profiles = await databaseKernel.query('profiles', '1=1');
      const syncStatusResult = await databaseKernel.query('meta_sync', '1=1');
      let currencies = await databaseKernel.query('currencies', '1=1');
      let channelTypes = await databaseKernel.query('channel_types', '1=1');
      const plans = await databaseKernel.query('financial_plans');
      const components = await databaseKernel.query('financial_plan_components');
      const settlements = await databaseKernel.query('financial_plan_settlements');


      const mappedWallets: Wallet[] = wallets.map((w: any) => ({
        ...w,
        initialBalance: w.initial_balance,
        isVisible: !!w.is_visible,
        isPrimary: !!w.is_primary,
        usesPrimaryIncome: !!w.uses_primary_income,
        parentWalletId: w.parent_wallet_id,
        channels: channels.filter((c: any) => c.wallet_id === w.id).map((c: any) => ({ ...c }))
      }));

      const mappedTransactions: Transaction[] = transactions.map((t: any) => ({
        ...t,
        walletId: t.wallet_id,
        channelType: t.channel_type as ChannelType,
        categoryId: t.category_id,
        isSplit: !!t.is_split,
        toWalletId: t.to_wallet_id,
        toChannelType: t.to_channel_type as ChannelType,
        linkedTransactionId: t.linked_transaction_id,
        splits: []
      }));

      const mappedCategories: Category[] = [
        ...categoriesGlobal.map((c: any) => ({
          ...c,
          isGlobal: true,
          parentId: c.parent_id,
          isDisabled: !!c.is_disabled
        })),
        ...categoriesUser.map((c: any) => ({
          ...c,
          isGlobal: false,
          parentId: c.parent_id,
          isDisabled: !!c.is_disabled
        }))
      ];

      const mappedBudgets: Budget[] = budgets.map((b: any) => ({
        ...b,
        categoryId: b.category_id
      }));

      setState((prev: AppState) => {
        let profile = prev.profile;
        let settings = prev.settings;

        if (profiles && profiles.length > 0) {
          const p = profiles[0] as any;
          profile = { id: p.id, name: p.name || profile.name, email: p.email || profile.email };
          settings = {
            currency: p.currency || settings.currency,
            theme: (p.theme || settings.theme) as 'DARK' | 'LIGHT',
            aiEnabled: p.ai_enabled === 1,
            biometricEnabled: p.biometric_enabled === 1
          };
        }

        return {
          ...prev,
          wallets: mappedWallets,
          transactions: mappedTransactions,
          categories: mappedCategories,
          budgets: mappedBudgets,
          commitments: commitments.map((c: any) => ({ ...c, walletId: c.wallet_id, nextDate: c.next_date })),
          currencies: currencies.map((c: any) => ({ ...c, code: c.code, name: c.name, symbol: c.symbol })),
          channelTypes: channelTypes.map((c: any) => ({ ...c, id: c.id, name: c.name, iconName: c.icon_name, color: c.color, isDefault: !!c.is_default })),
          financialPlans: plans.map((p: any) => ({
            ...p,
            components: components.filter((c: any) => c.plan_id === p.id),
            settlements: settlements.filter((s: any) => s.plan_id === p.id)
          })),
          profile,
          settings
        };
      });

      // 2. Conditional Sync (Avoid Loops)
      if (shouldTriggerSync) {
        const status = offlineSyncService.getStatus();
        const { data: { session } } = await supabase.auth.getSession();
        if (status.isOnline && session && !status.isSyncing) {
          console.log("📡 [Live] Refreshing state from Cloud Authority...");
          offlineSyncService.sync();
        }
      }
    } catch (e) {
      console.error('🔑 [Kernel] Critical data loading failed:', e);
    }
  }, []);

  useEffect(() => {
    const startSequence = async () => {
      try {
        console.log("🏁 [Startup] PHASE 1: DB_KERNEL Initialization...");
        await databaseKernel.initialize((pct, msg) => {
          setSyncStatus(prev => ({ ...prev, progressPercent: pct, progress: msg }));
        });
        // DEBUG HOOK: Expose DB to Console
        (window as any).db = databaseKernel;
        setIsKernelReady(true);

        console.log("🏁 [Startup] PHASE 2: DATA_LOAD (Bootstrap Local)...");
        await loadAppData(true); // Initial sync trigger

        console.log("🏁 [Startup] PHASE 3: SYNC_AUTHORITY Initialization...");
        await offlineSyncService.initialize();

        console.log("🏁 [Startup] PHASE 4: BIOMETRIC_CHECK...");
        const bioResult = await biometricService.checkAvailability();
        const settings = (await databaseKernel.query('profiles'))?.[0] || DEFAULT_STATE.settings; // Safe-ish fetch

        const shouldLock = settings.biometric_enabled === 1 && bioResult.isAvailable;
        console.log("🔐 [Startup] Biometric Lock Status:", shouldLock);

        console.log("🏁 [Startup] PHASE 5: AUTH_VERIFICATION...");
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setState((prev: AppState) => ({
            ...prev,
            isLoggedIn: true,
            isLocked: shouldLock,
            profile: { ...prev.profile, email: session.user.email || '', name: session.user.user_metadata?.name || 'FinOS User' }
          }));

          // Re-check Sync Initialization state from DB
          const db = await databaseKernel.getDb();
          const syncInfo = await db.query('SELECT is_initialized FROM meta_sync WHERE id = 1');
          const isInitialized = syncInfo.values?.[0]?.is_initialized === 1;

          // Trigger Bootstrap IF NOT INITIALIZED and ONLINE
          const currentSync = offlineSyncService.getStatus();
          const walletsCount = await databaseKernel.query('wallets');

          if (currentSync.isOnline && (!isInitialized || walletsCount.length === 0)) {
            console.log("🏁 [Startup] Zero Data or Not Initialized. Triggering background bootstrap...");
            offlineSyncService.bootstrap();
          }
        }
      } catch (err) {
        console.error("🏁 [Startup] FATAL SEQUENCE ERROR:", err);
      } finally {
        setLoading(false);
        console.log("🏁 [Startup] Sequence Complete. UI Unlocked.");
      }
    };

    startSequence();

    const unsubscribeSync = offlineSyncService.subscribe((status) => {
      setSyncStatus(status);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setState((prev: AppState) => ({
          ...prev,
          isLoggedIn: true,
          profile: { ...prev.profile, email: session.user.email || '', name: session.user.user_metadata?.name || 'FinOS User' }
        }));
        const status = offlineSyncService.getStatus();
        if (!status.isInitialized && status.isOnline) {
          offlineSyncService.bootstrap();
        }
      } else {
        setState((prev: AppState) => ({ ...prev, isLoggedIn: false }));
      }
    });

    return () => {
      unsubscribeSync();
      authListener.subscription.unsubscribe();
    };
  }, [loadAppData]);

  // Ultra-Realtime Nano-Speed Point-Updates
  useEffect(() => {
    const unsubscribe = offlineSyncService.onItemUpdate(async (table, item, action) => {
      console.log(`⚡ [Nano-Pulse] ${table} ${action}`);

      setState((prev: AppState) => {
        let nextState = { ...prev };

        switch (table) {
          case 'transactions':
            const mappedTx: Transaction = {
              ...item,
              walletId: item.wallet_id,
              channelType: item.channel_type as ChannelType,
              categoryId: item.category_id,
              isSplit: !!item.is_split,
              toWalletId: item.to_wallet_id,
              toChannelType: item.to_channel_type as ChannelType,
              linkedTransactionId: item.linked_transaction_id,
              splits: []
            };
            if (action === 'DELETE') {
              nextState.transactions = prev.transactions.filter(t => t.id !== item.id);
            } else {
              const filtered = prev.transactions.filter(t => t.id !== item.id);
              nextState.transactions = [mappedTx, ...filtered];
            }
            break;

          case 'wallets':
            if (action === 'DELETE') {
              nextState.wallets = prev.wallets.filter(w => w.id !== item.id);
            } else {
              const mappedW: Wallet = {
                ...item,
                initialBalance: item.initial_balance,
                isVisible: !!item.is_visible,
                isPrimary: !!item.is_primary,
                usesPrimaryIncome: !!item.uses_primary_income,
                parentWalletId: item.parent_wallet_id,
                channels: prev.wallets.find(w => w.id === item.id)?.channels || []
              };
              const filtered = prev.wallets.filter(w => w.id !== item.id);
              nextState.wallets = [...filtered, mappedW];
            }
            break;

          case 'channels':
            nextState.wallets = prev.wallets.map(w => {
              if (w.id === item.wallet_id) {
                const filtered = w.channels.filter(c => c.id !== item.id);
                return { ...w, channels: action === 'DELETE' ? filtered : [...filtered, { ...item }] };
              }
              return w;
            });
            break;

          case 'financial_plans':
            if (action === 'DELETE') {
              nextState.financialPlans = prev.financialPlans.filter(p => p.id !== item.id);
            } else {
              const existing = prev.financialPlans.find(p => p.id === item.id);
              const mappedP: FinancialPlan = {
                ...item,
                components: existing?.components || [],
                settlements: existing?.settlements || []
              };
              const filtered = prev.financialPlans.filter(p => p.id !== item.id);
              nextState.financialPlans = [...filtered, mappedP];
            }
            break;

          case 'financial_plan_components':
            nextState.financialPlans = prev.financialPlans.map(p => {
              if (p.id === item.plan_id) {
                const filtered = p.components.filter(c => c.id !== item.id);
                return { ...p, components: action === 'DELETE' ? filtered : [...filtered, { ...item }] };
              }
              return p;
            });
            break;

          case 'financial_plan_settlements':
            nextState.financialPlans = prev.financialPlans.map(p => {
              if (p.id === item.plan_id) {
                const filtered = p.settlements.filter(s => s.id !== item.id);
                return { ...p, settlements: action === 'DELETE' ? filtered : [...filtered, { ...item }] };
              }
              return p;
            });
            break;

          case 'categories_global':
          case 'categories_user':
            const isGlobal = table === 'categories_global';
            const mappedCat: Category = {
              ...item,
              isGlobal,
              parentId: item.parent_id
            };
            if (action === 'DELETE') {
              nextState.categories = prev.categories.filter(c => c.id !== item.id);
            } else {
              const filtered = prev.categories.filter(c => c.id !== item.id);
              nextState.categories = [...filtered, mappedCat];
            }
            break;

          default:
            // For simpler tables, we can just reload or do nothing if not critical
            break;
        }

        return nextState;
      });
    });
    return unsubscribe;
  }, []);

  const unlockApp = useCallback(async () => {
    try {
      console.log("🔐 [FinanceContext] unlocking...");
      const verified = await biometricService.verifyIdentity();
      console.log("🔐 [FinanceContext] verification result:", verified);
      if (verified) {
        setState(prev => ({ ...prev, isLocked: false }));
        return true;
      }
      return false;
    } catch (e) {
      console.error("🔐 [FinanceContext] unlockApp Critical Failure:", e);
      return false;
    }
  }, []);

  useEffect(() => {
    if (syncStatus.lastSyncAt) {
      console.log("🔄 [Context] Sync Completed at", new Date(syncStatus.lastSyncAt).toLocaleTimeString(), "- Reloading Data");
      loadAppData(false);
    }
  }, [syncStatus.lastSyncAt]);

  useEffect(() => {
    setState((prev: AppState) => ({ ...prev, sync_status: syncStatus }));
  }, [syncStatus]);

  const getSyncMetadata = useCallback(() => {
    const user = state.profile.email; // Use email or ID if stored in state
    return {
      updated_at: offlineSyncService.getPrecisionTimestamp(),
      server_updated_at: 0,
      version: 1,
      device_id: databaseKernel.getDeviceId(),
      user_id: state.profile.id || 'unknown',
      is_deleted: 0
    };
  }, [state.profile.id]);

  const addTransaction = useCallback(async (t: Omit<Transaction, keyof SyncBase | 'id'>) => {
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const newTxn: Transaction = { ...t, id, ...meta };

    // 1. Initial State Update
    setState((prev: AppState) => ({ ...prev, transactions: [newTxn, ...prev.transactions] }));

    // 2. Main DB & Sync Persistence
    const dbData = {
      id,
      amount: t.amount,
      date: t.date,
      wallet_id: t.walletId,
      channel_type: t.channelType,
      category_id: t.categoryId,
      note: t.note,
      type: t.type,
      is_split: t.isSplit ? 1 : 0,
      to_wallet_id: t.toWalletId,
      to_channel_type: t.toChannelType,
      linked_transaction_id: t.linkedTransactionId,
      ...meta
    };
    await databaseKernel.insert('transactions', dbData);
    await offlineSyncService.enqueue('transactions', id, 'INSERT', dbData);

    // 3. Dynamic Sub-Ledger Sync Logic
    const wallet = state.wallets.find(w => w.id === t.walletId);
    if (wallet?.parentWalletId) {
      const parentWallet = state.wallets.find(pw => pw.id === wallet.parentWalletId);
      if (parentWallet) {
        // Determine suitable channel on parent
        const parentChannel = parentWallet.channels.find(pc => pc.type === t.channelType) || parentWallet.channels[0];

        if (parentChannel) {
          const refId = await databaseKernel.generateId();
          const refMeta = getSyncMetadata();

          const refTxn: Transaction = {
            ...t,
            id: refId,
            walletId: parentWallet.id,
            channelType: parentChannel.type,
            note: `[Ref] ${t.note || 'Transaction'} (via ${wallet.name})`,
            linkedTransactionId: id,
            isSubLedgerSync: true,
            subLedgerId: wallet.id,
            subLedgerName: wallet.name,
            ...refMeta
          };

          // Update State with Reference
          setState((prev: AppState) => ({ ...prev, transactions: [refTxn, ...prev.transactions] }));

          const refDbData = {
            id: refId,
            amount: t.amount,
            date: t.date,
            wallet_id: parentWallet.id,
            channel_type: parentChannel.type,
            category_id: t.categoryId,
            note: refTxn.note,
            type: t.type,
            is_split: t.isSplit ? 1 : 0,
            to_wallet_id: t.toWalletId,
            to_channel_type: t.toChannelType,
            linked_transaction_id: id,
            is_sub_ledger_sync: 1,
            sub_ledger_id: wallet.id,
            sub_ledger_name: wallet.name,
            ...refMeta
          };

          await databaseKernel.insert('transactions', refDbData);
          await offlineSyncService.enqueue('transactions', refId, 'INSERT', refDbData);
        }
      }
    }
  }, [state.wallets, getSyncMetadata]);

  const deleteTransaction = useCallback(async (id: string) => {
    // 1. Identify all related transactions (self + any linked references)
    const transactionToDelete = state.transactions.find(t => t.id === id);
    if (!transactionToDelete) return;

    const relatedIds = new Set<string>();
    relatedIds.add(id);

    // Find transactions linked to this one (e.g., splits, or the reference in parent)
    state.transactions.filter(t => t.linkedTransactionId === id).forEach(t => relatedIds.add(t.id));

    // If this transaction is itself a linked transaction, find its original
    if (transactionToDelete.linkedTransactionId) {
      relatedIds.add(transactionToDelete.linkedTransactionId);
      // Also find any other transactions linked to the original
      state.transactions.filter(t => t.linkedTransactionId === transactionToDelete.linkedTransactionId).forEach(t => relatedIds.add(t.id));
    }

    const relatedIdArray = Array.from(relatedIds);

    // 2. Optimistic UI Update
    setState((prev: AppState) => ({
      ...prev,
      transactions: prev.transactions.filter((t: Transaction) => !relatedIdArray.includes(t.id))
    }));

    // 3. Persistent Deletion for all related records
    for (const dId of relatedIdArray) {
      await databaseKernel.delete('transactions', dId);
      await offlineSyncService.enqueue('transactions', dId, 'DELETE', { id: dId, ...getSyncMetadata() });
    }
  }, [state.transactions, getSyncMetadata]);

  const addWallet = useCallback(async (w: Omit<Wallet, keyof SyncBase | 'id'>) => {
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();

    // 1. Prepare Wallet DB Data
    const dbData = {
      id,
      name: w.name,
      currency: w.currency,
      initial_balance: w.initialBalance,
      color: w.color,
      icon: w.icon,
      is_visible: w.isVisible ? 1 : 0,
      is_primary: w.isPrimary ? 1 : 0,
      uses_primary_income: w.usesPrimaryIncome ? 1 : 0,
      parent_wallet_id: w.parentWalletId || null,
      ...meta
    };

    try {
      console.log(`🏦 [AddWallet] Persisting Wallet: ${w.name} (${id})`);

      // 2. Persist Wallet (Critical Step)
      await databaseKernel.insert('wallets', dbData);

      // 3. Persist Channels
      const channelsWithIds: Channel[] = [];
      for (const ch of w.channels) {
        const chId = await databaseKernel.generateId();
        const chData = {
          id: chId,
          wallet_id: id,
          type: ch.type,
          balance: ch.balance,
          ...meta
        };
        await databaseKernel.insert('channels', chData);
        channelsWithIds.push({ ...ch, id: chId });
      }

      // 4. Queue for Sync (Full payload for reference, but sync engine pulls channels from DB)
      await offlineSyncService.enqueue('wallets', id, 'INSERT', dbData);

      // 5. Update State (ONLY after successful persistence)
      const newWallet: Wallet = { ...w, id, channels: channelsWithIds, ...meta };
      setState((prev: AppState) => ({ ...prev, wallets: [...prev.wallets, newWallet] }));

      console.log(`✅ [AddWallet] Success. Reloading app data to confirm...`);
      // 6. Force reload to ensure consistency
      await loadAppData(true);

    } catch (e) {
      console.error("❌ [AddWallet] Failed to persist wallet:", e);
      // Add user-facing notification logic here if available
    }
  }, []);

  const updateWallet = useCallback(async (id: string, updates: Partial<Wallet>) => {
    setState((prev: AppState) => ({ ...prev, wallets: prev.wallets.map((w: Wallet) => w.id === id ? { ...w, ...updates } : w) }));
    const meta = { ...getSyncMetadata(), version: (state.wallets.find(w => w.id === id)?.version || 0) + 1 };
    const dbUpdates: any = { ...meta };
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.currency) dbUpdates.currency = updates.currency;
    if (updates.initialBalance !== undefined) dbUpdates.initial_balance = updates.initialBalance;
    if (updates.color) dbUpdates.color = updates.color;
    if (updates.isVisible !== undefined) dbUpdates.is_visible = updates.isVisible ? 1 : 0;
    if (updates.isPrimary !== undefined) dbUpdates.is_primary = updates.isPrimary ? 1 : 0;
    if (updates.usesPrimaryIncome !== undefined) dbUpdates.uses_primary_income = updates.usesPrimaryIncome ? 1 : 0;
    if (updates.parentWalletId !== undefined) dbUpdates.parent_wallet_id = updates.parentWalletId;
    await databaseKernel.update('wallets', id, dbUpdates);

    // Handle Channels Update (Critical for Sync)
    if (updates.channels) {
      // 1. Identify Deletions
      const existingRaw = await databaseKernel.query('channels', 'wallet_id = ? AND is_deleted = 0', [id]);
      const existingIds = existingRaw.map((r: any) => r.id);
      const newIds = updates.channels.map(c => c.id);

      const toDeleteIds = existingIds.filter((eid: string) => !newIds.includes(eid));
      for (const delId of toDeleteIds) {
        await databaseKernel.delete('channels', delId);
        await offlineSyncService.enqueue('channels', delId, 'DELETE', { id: delId });
      }

      // 2. Persist Upserts
      for (const ch of updates.channels) {
        const chMeta = getSyncMetadata();
        const chData = {
          id: ch.id,
          wallet_id: id,
          type: ch.type,
          balance: ch.balance,
          ...chMeta
        };
        await databaseKernel.insert('channels', chData, true);
        await offlineSyncService.enqueue('channels', ch.id, 'INSERT', chData);
      }
    }

    // Queue Wallet Update (will carry active channels)
    await offlineSyncService.enqueue('wallets', id, 'UPDATE', { id, ...dbUpdates });
  }, [state.wallets]);

  const deleteWallet = useCallback(async (id: string) => {
    setState((prev: AppState) => ({ ...prev, wallets: prev.wallets.filter((w: Wallet) => w.id !== id) }));
    await databaseKernel.delete('wallets', id);
    await offlineSyncService.enqueue('wallets', id, 'DELETE', { id });
  }, []);

  const setPrimaryWallet = useCallback((id: string) => {
    setState((prev: AppState) => ({ ...prev, wallets: prev.wallets.map((w: Wallet) => ({ ...w, isPrimary: w.id === id })) }));
    updateWallet(id, { isPrimary: true });
    state.wallets.filter(w => w.id !== id && w.isPrimary).forEach(w => updateWallet(w.id, { isPrimary: false }));
  }, [state.wallets, updateWallet]);

  const addCategory = useCallback(async (c: Omit<Category, keyof SyncBase | 'id'>) => {
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const category: Category = { ...c, id, ...meta };
    setState((prev: AppState) => ({ ...prev, categories: [...prev.categories, category] }));
    const dbData = { id, name: c.name, icon: c.icon, color: c.color, type: c.type, parent_id: c.parentId || null, "order": c.order, ...meta };
    await databaseKernel.insert('categories_user', dbData);
    await offlineSyncService.enqueue('categories_user', id, 'INSERT', dbData);
  }, []);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    setState((prev: AppState) => ({ ...prev, categories: prev.categories.map((c: Category) => c.id === id ? { ...c, ...updates } : c) }));
    const meta = getSyncMetadata();
    const dbUpdates: any = { ...meta };
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.icon) dbUpdates.icon = updates.icon;
    if (updates.color) dbUpdates.color = updates.color;
    if (updates.order !== undefined) dbUpdates["order"] = updates.order;
    await databaseKernel.update('categories_user', id, dbUpdates);
    await offlineSyncService.enqueue('categories_user', id, 'UPDATE', { id, ...dbUpdates });
  }, []);

  const toggleCategoryStatus = useCallback(async (id: string) => {
    const cat = state.categories.find(c => c.id === id);
    if (!cat) return;
    await updateCategory(id, { isDisabled: !cat.isDisabled });
  }, [state.categories, updateCategory]);

  const addCommitment = useCallback(async (c: Omit<Commitment, keyof SyncBase | 'id'>) => {
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const commitment: Commitment = { ...c, id, ...meta };
    setState((prev: AppState) => ({ ...prev, commitments: [...prev.commitments, commitment] }));
    const dbData = { id, name: c.name, amount: c.amount, frequency: c.frequency, certainty_level: c.certaintyLevel, type: c.type, wallet_id: c.walletId, next_date: c.nextDate, ...meta };
    await databaseKernel.insert('commitments', dbData);
    await offlineSyncService.enqueue('commitments', id, 'INSERT', dbData);
  }, []);

  const updateCommitment = useCallback(async (id: string, updates: Partial<Commitment>) => {
    setState((prev: AppState) => ({ ...prev, commitments: prev.commitments.map((c: Commitment) => c.id === id ? { ...c, ...updates } : c) }));
    const meta = getSyncMetadata();
    const dbUpdates: any = { ...meta };
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.frequency) dbUpdates.frequency = updates.frequency;
    if (updates.certaintyLevel) dbUpdates.certainty_level = updates.certaintyLevel;
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.walletId !== undefined) dbUpdates.wallet_id = updates.walletId;
    if (updates.nextDate) dbUpdates.next_date = updates.nextDate;
    await databaseKernel.update('commitments', id, dbUpdates);
    await offlineSyncService.enqueue('commitments', id, 'UPDATE', { id, ...dbUpdates });
  }, []);

  const deleteCommitment = useCallback(async (id: string) => {
    setState((prev: AppState) => ({ ...prev, commitments: prev.commitments.filter((c: Commitment) => c.id !== id) }));
    await databaseKernel.delete('commitments', id);
    await offlineSyncService.enqueue('commitments', id, 'DELETE', { id });
  }, []);

  const addTransfer = useCallback(async (t: Omit<Transfer, keyof SyncBase | 'id'>) => {
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();

    // 1. Create the main Transfer record
    const dbData = {
      id,
      from_wallet_id: t.from_wallet_id,
      to_wallet_id: t.to_wallet_id,
      from_channel: t.from_channel,
      to_channel: t.to_channel,
      amount: t.amount,
      date: t.date,
      note: t.note,
      ...meta
    };

    await databaseKernel.insert('transfers', dbData);
    await offlineSyncService.enqueue('transfers', id, 'INSERT', dbData);

    // 2. Create the Transaction representation (Source side)
    const sourceTxId = await databaseKernel.generateId();
    const sourceTx = {
      id: sourceTxId,
      amount: t.amount,
      date: t.date,
      wallet_id: t.from_wallet_id,
      channel_type: t.from_channel,
      note: t.note || 'Transfer',
      type: MasterCategoryType.TRANSFER,
      to_wallet_id: t.to_wallet_id,
      to_channel_type: t.to_channel,
      linked_transaction_id: id,
      ...meta
    };
    await databaseKernel.insert('transactions', sourceTx);
    await offlineSyncService.enqueue('transactions', sourceTxId, 'INSERT', sourceTx);

    // 3. Sub-Ledger Sync for Source
    const sourceWallet = state.wallets.find(w => w.id === t.from_wallet_id);
    if (sourceWallet?.parentWalletId) {
      const parentWallet = state.wallets.find(pw => pw.id === sourceWallet.parentWalletId);
      if (parentWallet) {
        const parentChannel = parentWallet.channels.find(pc => pc.type === t.from_channel) || parentWallet.channels[0];
        if (parentChannel) {
          const refId = await databaseKernel.generateId();
          const refTx = {
            id: refId,
            amount: t.amount,
            date: t.date,
            wallet_id: parentWallet.id,
            channel_type: parentChannel.type,
            note: `[Ref] ${t.note || 'Transfer'} (out via ${sourceWallet.name})`,
            type: MasterCategoryType.TRANSFER,
            is_sub_ledger_sync: 1,
            sub_ledger_id: sourceWallet.id,
            sub_ledger_name: sourceWallet.name,
            linked_transaction_id: sourceTxId,
            ...getSyncMetadata()
          };
          await databaseKernel.insert('transactions', refTx);
          await offlineSyncService.enqueue('transactions', refId, 'INSERT', refTx);
        }
      }
    }

    // 4. Sub-Ledger Sync for Destination
    const destWallet = state.wallets.find(w => w.id === t.to_wallet_id);
    if (destWallet?.parentWalletId) {
      const parentWallet = state.wallets.find(pw => pw.id === destWallet.parentWalletId);
      if (parentWallet) {
        const parentChannel = parentWallet.channels.find(pc => pc.type === t.to_channel) || parentWallet.channels[0];
        if (parentChannel) {
          const refId = await databaseKernel.generateId();
          const refTx = {
            id: refId,
            amount: t.amount,
            date: t.date,
            wallet_id: parentWallet.id,
            channel_type: parentChannel.type,
            note: `[Ref] ${t.note || 'Transfer'} (in via ${destWallet.name})`,
            type: MasterCategoryType.TRANSFER, // It will be picked up as income to this parent
            is_sub_ledger_sync: 1,
            sub_ledger_id: destWallet.id,
            sub_ledger_name: destWallet.name,
            linked_transaction_id: sourceTxId,
            ...getSyncMetadata()
          };
          await databaseKernel.insert('transactions', refTx);
          await offlineSyncService.enqueue('transactions', refId, 'INSERT', refTx);
        }
      }
    }

    await loadAppData(false);
  }, [state.wallets, loadAppData, getSyncMetadata]);

  const updateProfile = useCallback(async (profileUpdates: Partial<UserProfile>) => {
    setState((prev: AppState) => ({ ...prev, profile: { ...prev.profile, ...profileUpdates } }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const meta = getSyncMetadata();
      const dbUpdates = { id: user.id, email: user.email, name: profileUpdates.name || state.profile.name, ...meta };
      await databaseKernel.insert('profiles', dbUpdates, true); // Overwrite if exists
      await offlineSyncService.enqueue('profiles', user.id, 'UPDATE', dbUpdates);
    }
  }, [state.profile, getSyncMetadata]);

  const updateSettings = useCallback(async (settingsUpdates: Partial<AppSettings>) => {
    setState((prev: AppState) => ({ ...prev, settings: { ...prev.settings, ...settingsUpdates } }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const meta = getSyncMetadata();
      const p = state.profile;
      const s = { ...state.settings, ...settingsUpdates };
      const dbUpdates = {
        id: user.id,
        email: user.email,
        name: p.name,
        currency: s.currency,
        theme: s.theme,
        ai_enabled: s.aiEnabled ? 1 : 0,
        biometric_enabled: s.biometricEnabled ? 1 : 0,
        ...meta
      };
      await databaseKernel.insert('profiles', dbUpdates, true); // Overwrite if exists
      await offlineSyncService.enqueue('profiles', user.id, 'UPDATE', dbUpdates);
    }
  }, [state.profile, state.settings, getSyncMetadata]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState(DEFAULT_STATE);
  }, []);

  const clearAllData = useCallback(async () => {
    if (confirm('CRITICAL: Clear all records?')) {
      setState(DEFAULT_STATE);
    }
  }, []);

  // COMPUTED
  const addPlan = async (p: Omit<FinancialPlan, keyof SyncBase | 'id' | 'components' | 'settlements'>) => {
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const plan = { ...p, id, components: [], settlements: [], ...meta };

    // 1. Optimistic UI Update
    setState((prev: AppState) => ({
      ...prev,
      financialPlans: [plan, ...prev.financialPlans]
    }));

    // 2. Persistent Save
    const dbData = { ...p, id, ...meta };
    await databaseKernel.insert('financial_plans', dbData);
    await offlineSyncService.enqueue('financial_plans', id, 'INSERT', dbData);

    // Auto-save suggestion
    if (state.profile?.id && p.title) {
      await databaseKernel.ensurePlanSuggestion(p.title, state.profile.id);
    }

    // 3. Background reload
    loadAppData(false);
    return id;
  };

  const updatePlan = async (id: string, updates: Partial<FinancialPlan>) => {
    const meta = getSyncMetadata();
    const dbUpdates = { ...updates, ...meta };
    delete (dbUpdates as any).components;
    delete (dbUpdates as any).settlements;
    await databaseKernel.update('financial_plans', id, dbUpdates);
    await offlineSyncService.enqueue('financial_plans', id, 'UPDATE', { id, ...dbUpdates });
    // Auto-save suggestion
    if (state.profile?.id && updates.title) {
      await databaseKernel.ensurePlanSuggestion(updates.title, state.profile.id);
    }
    await loadAppData(false);
  };
  const deletePlan = async (id: string, soft: boolean = true) => {
    if (soft) {
      const meta = getSyncMetadata();
      await databaseKernel.delete('financial_plans', id);
      await offlineSyncService.enqueue('financial_plans', id, 'DELETE', { id, ...meta, is_deleted: 1 });
    } else {
      const plan = state.financialPlans.find(p => p.id === id);
      if (plan) {
        for (const c of plan.components) await deleteComponent(c.id);
        for (const s of plan.settlements) await deleteSettlement(s.id);
      }
      const db = await databaseKernel.getDb();
      await db.run('DELETE FROM financial_plans WHERE id = ?', [id]);
      await offlineSyncService.enqueue('financial_plans', id, 'DELETE', { id });
    }
    await loadAppData(false);
  };

  const addComponent = async (c: Omit<PlanComponent, keyof SyncBase | 'id'>) => {
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const component = { ...c, id, ...meta };

    // 1. Optimistic UI Update
    setState((prev: AppState) => ({
      ...prev,
      financialPlans: prev.financialPlans.map(p => {
        if (p.id === c.plan_id) {
          return { ...p, components: [...p.components, component] };
        }
        return p;
      })
    }));

    // 2. Persistent Save
    await databaseKernel.insert('financial_plan_components', component);
    await offlineSyncService.enqueue('financial_plan_components', id, 'INSERT', component);

    // Auto-save suggestion
    if (state.profile?.id && c.name) {
      await databaseKernel.ensurePlanSuggestion(c.name, state.profile.id);
    }

    // 3. Background reload
    loadAppData(false);
  };

  const updateComponent = async (id: string, updates: Partial<PlanComponent>) => {
    const meta = getSyncMetadata();
    const dbUpdates = { ...updates, ...meta };
    await databaseKernel.update('financial_plan_components', id, dbUpdates);
    await offlineSyncService.enqueue('financial_plan_components', id, 'UPDATE', { id, ...dbUpdates });

    // Auto-save suggestion
    if (state.profile?.id && updates.name) {
      await databaseKernel.ensurePlanSuggestion(updates.name, state.profile.id);
    }

    await loadAppData(false);
  };

  const deleteComponent = async (id: string) => {
    const meta = getSyncMetadata();
    await databaseKernel.delete('financial_plan_components', id);
    await offlineSyncService.enqueue('financial_plan_components', id, 'DELETE', { id, ...meta, is_deleted: 1 });
    await loadAppData(false);
  };

  const addSettlement = async (s: Omit<PlanSettlement, keyof SyncBase | 'id'>) => {
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const settlement = { ...s, id, ...meta };

    // 1. Optimistic UI Update
    setState((prev: AppState) => ({
      ...prev,
      financialPlans: prev.financialPlans.map(p => {
        if (p.id === s.plan_id) {
          return { ...p, settlements: [...p.settlements, settlement] };
        }
        return p;
      })
    }));

    // 2. Persistent Save
    await databaseKernel.insert('financial_plan_settlements', settlement);
    await offlineSyncService.enqueue('financial_plan_settlements', id, 'INSERT', settlement);

    // 3. Background reload
    loadAppData(false);
  };

  const deleteSettlement = async (id: string) => {
    const meta = getSyncMetadata();
    await databaseKernel.delete('financial_plan_settlements', id);
    await offlineSyncService.enqueue('financial_plan_settlements', id, 'DELETE', { id, ...meta, is_deleted: 1 });
    await loadAppData(false);
  };
  const finalizePlan = async (id: string) => {
    const plan = state.financialPlans.find(p => p.id === id);
    if (!plan) throw new Error("Plan not found");
    if (plan.status === 'FINALIZED') throw new Error("Plan already finalized");

    const allCosted = plan.components.every(c => c.final_cost !== undefined && c.final_cost !== null);
    if (!allCosted) throw new Error("All components must have a final cost before finalization.");

    const totalCost = plan.components.reduce((sum: number, c: PlanComponent) => sum + (c.final_cost || 0), 0);
    const totalSettled = plan.settlements.reduce((sum: number, s: PlanSettlement) => sum + s.amount, 0);

    if (Math.abs(totalCost - totalSettled) > 0.01) {
      throw new Error(`Cost mismatch: Components total ${totalCost}, but settlements total ${totalSettled}.`);
    }

    await offlineSyncService.safeTransaction(async () => {
      // 1. Build a consolidated item list for the transaction note
      // Format: "Item 1 (qty) @ $price, Item 2 @ $price"
      const itemDescriptions = plan.components.map(c => {
        let desc = c.name || 'Untitled Item';
        if (c.component_type === 'QUANTIFIED' && c.quantity) {
          desc += ` (${c.quantity}${c.unit ? ' ' + c.unit : ''})`;
        }
        desc += ` @ ${getCurrencySymbol(state.settings.currency)}${(c.final_cost || 0).toLocaleString()}`;
        return desc;
      });

      // Also identify unique categories involved
      const categoryIds = Array.from(new Set(plan.components.map(c => c.category_id).filter(Boolean)));
      const primaryCategoryId = categoryIds.length === 1 ? categoryIds[0] : null;

      // 2. Generate Transactions per Settlement
      // This ensures each wallet's balance is updated according to the specific amount taken from it.
      for (const s of plan.settlements) {
        const channel = state.wallets.flatMap(w => w.channels).find(ch => ch.id === s.channel_id);
        const wallet = state.wallets.find(w => w.id === channel?.wallet_id);

        if (!channel || !wallet) continue;

        const txId = await databaseKernel.generateId();
        const meta = getSyncMetadata();

        // Base transaction for the actual payment source
        const tx = {
          id: txId,
          amount: s.amount,
          date: new Date().toISOString(),
          wallet_id: wallet.id,
          category_id: primaryCategoryId, // Use primary if unique, else null (Mixed)
          note: `[Plan: ${plan.title}] - ${itemDescriptions.join(', ')}`,
          type: 'expense',
          channel_type: channel.type,
          ...meta
        };

        await databaseKernel.insert('transactions', tx);
        await offlineSyncService.enqueue('transactions', txId, 'INSERT', tx, false);

        // 3. Sub-Ledger / Parent Sync Logic
        // If this is a sub-ledger wallet, we push a reference to the parent.
        if (wallet.parentWalletId) {
          const parentWallet = state.wallets.find(pw => pw.id === wallet.parentWalletId);
          if (parentWallet) {
            // Find suitable channel on parent (Same type or First)
            const parentChannel = parentWallet.channels.find(pc => pc.type === channel.type) || parentWallet.channels[0];

            if (parentChannel) {
              const refTxId = await databaseKernel.generateId();
              const refTx = {
                id: refTxId,
                amount: s.amount,
                date: new Date().toISOString(),
                wallet_id: parentWallet.id,
                category_id: primaryCategoryId,
                note: `[Ref] ${plan.title} (via ${wallet.name})`,
                type: 'expense',
                channel_type: parentChannel.type,
                is_sub_ledger_sync: 1,
                sub_ledger_id: wallet.id,
                sub_ledger_name: wallet.name,
                ...getSyncMetadata()
              };
              await databaseKernel.insert('transactions', refTx);
              await offlineSyncService.enqueue('transactions', refTxId, 'INSERT', refTx, false);
            }
          }
        }
      }

      // 4. Mark Plan as Finalized
      const finalMeta = getSyncMetadata();
      const planUpdates: any = {
        status: 'FINALIZED',
        finalized_at: new Date().toISOString(),
        total_amount: totalCost,
        ...finalMeta
      };
      await databaseKernel.update('financial_plans', id, planUpdates);
      await offlineSyncService.enqueue('financial_plans', id, 'UPDATE', { id, ...planUpdates }, false);
    });

    await loadAppData(false);
    // Trigger sync now that the transaction is safely committed
    offlineSyncService.sync();
  };

  const searchPlanSuggestions = useCallback(async (query: string) => {
    return await databaseKernel.searchPlanSuggestions(query, state.profile?.id);
  }, [state.profile?.id]);

  const walletsWithBalances = useMemo(() => {
    const computed = state.wallets.map(w => {
      let walletBalance = Number(w.initialBalance);
      let walletExpenses = 0;
      let walletIncome = 0;
      const channelBalances: Record<string, number> = {};
      w.channels.forEach(ch => { channelBalances[ch.type] = Number(ch.balance); });
      return { ...w, currentBalance: walletBalance, totalExpenses: walletExpenses, totalIncome: walletIncome, channelBalances };
    });
    state.transactions.forEach(t => {
      const sourceWallet = computed.find(w => w.id === t.walletId);
      if (!sourceWallet) return;
      const amt = Number(t.amount);
      if (t.type === MasterCategoryType.TRANSFER && t.toWalletId && t.toChannelType) {
        const destWallet = computed.find(w => w.id === t.toWalletId);
        sourceWallet.currentBalance -= amt;
        if (sourceWallet.channelBalances[t.channelType] !== undefined) sourceWallet.channelBalances[t.channelType] -= amt;
        if (destWallet) {
          destWallet.currentBalance += amt;
          if (destWallet.channelBalances[t.toChannelType] !== undefined) destWallet.channelBalances[t.toChannelType] += amt;
        }
      } else {
        if (t.type === MasterCategoryType.INCOME) {
          sourceWallet.currentBalance += amt; sourceWallet.totalIncome += amt;
          if (sourceWallet.channelBalances[t.channelType] !== undefined) sourceWallet.channelBalances[t.channelType] += amt;
        } else {
          sourceWallet.currentBalance -= amt; sourceWallet.totalExpenses += amt;
          if (sourceWallet.channelBalances[t.channelType] !== undefined) sourceWallet.channelBalances[t.channelType] -= amt;
        }
      }
    });
    return computed.map(w => ({ ...w, computedChannels: Object.entries(w.channelBalances).map(([type, balance]) => ({ type: type as ChannelType, balance })) }));
  }, [state.wallets, state.transactions]);

  const totalBalance = useMemo(() => walletsWithBalances.filter(w => !w.usesPrimaryIncome || w.isPrimary).reduce((acc, w) => acc + w.currentBalance, 0), [walletsWithBalances]);
  const totalMonthlyCommitments = useMemo(() => state.commitments.reduce((acc, c) => {
    let monthlyAmount = c.amount;
    if (c.frequency === CommitmentFrequency.DAILY) monthlyAmount *= 30;
    if (c.frequency === CommitmentFrequency.WEEKLY) monthlyAmount *= 4.34;
    return acc + monthlyAmount;
  }, 0), [state.commitments]);
  const availableAfterCommitments = useMemo(() => totalBalance - totalMonthlyCommitments, [totalBalance, totalMonthlyCommitments]);
  const projectedBalances = useMemo(() => {
    const projections: { date: string, balance: number, stress: 'NONE' | 'LOW' | 'HIGH' }[] = [];
    let runningBalance = totalBalance;
    const today = startOfDay(new Date());
    for (let i = 0; i < 90; i++) {
      const date = addDays(today, i);
      state.commitments.forEach(c => {
        const nextDate = startOfDay(parseISO(c.nextDate));
        if (isSameDay(date, nextDate)) runningBalance -= c.amount;
      });
      projections.push({ date: date.toISOString(), balance: runningBalance, stress: runningBalance < 0 ? 'HIGH' : runningBalance < totalMonthlyCommitments ? 'LOW' : 'NONE' });
    }
    return projections;
  }, [totalBalance, state.commitments, totalMonthlyCommitments]);

  const getCurrencySymbol = useCallback((code?: string) => {
    const targetCode = code || state.settings.currency;
    return CURRENCY_MAP[targetCode]?.symbol || targetCode || '$';
  }, [state.settings.currency]);

  if (loading || !isKernelReady) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0c] flex items-center justify-center p-8">
        <div className="max-w-md w-full flex flex-col items-center gap-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full" />
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center relative">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Initializing Secure Kernel</h2>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">{syncStatus.progress || "Establishing Environment..."}</p>
          </div>

          <div className="w-full bg-zinc-900/50 h-1.5 rounded-full overflow-hidden border border-white/5 relative">
            <div
              className="h-full bg-blue-600 transition-all duration-700 ease-out"
              style={{ width: `${syncStatus.progressPercent}%` }}
            />
          </div>

          <span className="text-[10px] font-black tabular-nums text-zinc-700 tracking-widest">{syncStatus.progressPercent}% COMPLETE</span>
        </div>
      </div>
    );
  }

  // Survivor Rule: If logged in, and we have ANY local data (wallets, transactions, or categories), 
  // we can skip the mandatory bootstrap screen and sync in background.
  const hasLocalData = state.wallets.length > 0 || state.transactions.length > 0 || state.categories.length > 0;
  const showBootstrap = !syncStatus.isInitialized && state.isLoggedIn && syncStatus.isOnline && !hasLocalData;

  const handleManualBypass = () => {
    // Force set initialized locally so UI opens, background sync will eventually catch up
    setSyncStatus(prev => ({ ...prev, isInitialized: true }));
  };

  const handleFullReset = async () => {
    try {
      const db = await databaseKernel.getDb();
      await db.run('UPDATE meta_sync SET is_initialized = 0 WHERE id = 1');
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  if (showBootstrap) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0c] flex items-center justify-center p-8">
        <div className="max-w-md w-full flex flex-col items-center gap-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full" />
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center relative">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">System Bootstrap</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Establishing your offline-first financial environment. This may take a moment depending on your history.
            </p>
          </div>
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out" style={{ width: `${syncStatus.progressPercent}%` }} />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{syncStatus.progress || "Initializing..."}</p>

            {syncStatus.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mt-2">
                <p className="text-red-500 text-[10px] font-bold">{syncStatus.error}</p>
                <div className="flex gap-2 justify-center mt-3">
                  <button onClick={() => offlineSyncService.bootstrap()} className="text-[9px] font-black uppercase bg-red-600 text-white px-4 py-2 rounded-lg">Retry Sync</button>
                  <button onClick={handleManualBypass} className="text-[9px] font-black uppercase bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg border border-white/5">Skip & Open</button>
                </div>
              </div>
            )}

            {!syncStatus.error && syncStatus.progressPercent > 50 && (
              <button onClick={handleManualBypass} className="mt-4 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400">Continue Offline</button>
            )}

            <button onClick={handleFullReset} className="mt-8 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-800 hover:text-zinc-600">Restart Session</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FinanceContext.Provider value={{
      ...state, currencies: state.currencies, channelTypes: state.channelTypes,
      unlockApp, logout, addTransaction, deleteTransaction, addWallet, updateWallet, deleteWallet, setPrimaryWallet, addBudget: (b) => { },
      addCategory, updateCategory, toggleCategoryStatus, addCommitment, updateCommitment, deleteCommitment, addTransfer, updateProfile, updateSettings, clearAllData,
      totalBalance, availableAfterCommitments, walletsWithBalances, projectedBalances, isCloudLoading: false, getCurrencySymbol,
      activeTab, setActiveTab, selectedWalletId, setSelectedWalletId,
      financialPlans: state.financialPlans, addPlan, updatePlan, deletePlan, addComponent, updateComponent, deleteComponent,
      addSettlement, deleteSettlement, finalizePlan, searchPlanSuggestions,
      syncStatus, forceSyncNow: () => offlineSyncService.sync()
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
};
