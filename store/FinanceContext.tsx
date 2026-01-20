
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AppState,
  Wallet,
  Channel,
  Transaction,
  Category,
  Budget,
  Commitment,
  CommitmentEvent, // Added
  HealthScore,
  MasterCategoryType,
  ChannelType,
  CommitmentType,
  CommitmentFrequency,
  CertaintyLevel,
  UserProfile,
  AppSettings,
  GeminiKeyConfig,
  SyncStatusUI,
  SyncBase,
  Transfer,
  FinancialPlan,
  PlanComponent,
  PlanSettlement,
  PlanStatus,
  PlanType,
  ComponentType,
  AppNotification,
  UserRole,
  UndoItem,
  DeleteProgress
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { NotificationEngine } from '../services/notificationEngine';

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
import { addDays, parseISO, startOfMonth, endOfMonth, isWithinInterval, lastDayOfMonth, startOfDay, isSameDay, format, addMonths } from 'date-fns';

// MIGRATION_KEYS removed for security - all keys must come from Supabase
const MIGRATION_KEYS: GeminiKeyConfig[] = [];

export interface WalletWithBalance extends Wallet {
  currentBalance: number;
  totalExpenses: number;
  totalIncome: number;
  channelBalances: Record<string, number>;
  computedChannels: { type: ChannelType, balance: number, id?: string }[];
  principalBalance: number; // Funds directly owned by this wallet
  aggregateBalance: number; // Funds owned + funds in children
  aggregateChannels: { type: ChannelType, balance: number }[]; // Channel sums including children
}

interface FinanceContextType extends AppState {
  currencies: CurrencyConfig[];
  channelTypes: ChannelTypeConfig[];
  unlockApp: () => Promise<boolean>;
  logout: () => void;
  addTransaction: (t: Omit<Transaction, keyof SyncBase | 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  addWallet: (w: Omit<Wallet, keyof SyncBase | 'id'>) => Promise<void>;
  updateWallet: (id: string, w: Partial<Wallet>) => Promise<void>;
  deleteWallet: (id: string, cascade?: boolean) => Promise<void>;
  setPrimaryWallet: (id: string) => void;
  addBudget: (b: Omit<Budget, keyof SyncBase | 'id' | 'spent'>) => Promise<void>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addCategory: (c: Omit<Category, keyof SyncBase | 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
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
  deletePlan: (id: string, cascade?: boolean) => Promise<void>;
  addComponent: (c: Omit<PlanComponent, keyof SyncBase | 'id'>) => Promise<void>;
  updateComponent: (id: string, updates: Partial<PlanComponent>, skipReload?: boolean) => Promise<void>;
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
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, keyof SyncBase | 'id'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  totalMonthlyCommitments: number;
  settleCommitment: (commitmentId: string, walletId: string, channelType: string, keepRecurring?: boolean) => Promise<void>;
  extendCommitmentDate: (commitmentId: string, newDate: string) => Promise<void>;
  postponeCommitment: (commitmentId: string, days: number | 'EOM') => Promise<void>;
  suggestedObligationNames: string[];
  formatCurrency: (amount: number, currencyCode?: string) => string;
  undoDeletion: () => Promise<void>;
  undoStack: UndoItem[];
  isBooting: boolean;
  state: AppState; // Exposed for advanced usage (AdminPanel)
  setState: React.Dispatch<React.SetStateAction<AppState>>; // Exposed for App.tsx (Undo Stack Management)

  isSuperAdmin: boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const DEFAULT_STATE: AppState = {
  wallets: [],
  categories: [],
  transactions: [],
  budgets: [],
  commitments: [],
  notifications: [],
  currencies: [],
  channelTypes: [],
  globalGeminiKeys: [],
  healthScore: { score: 0, liquidity: 0, stability: 0, burnControl: 0, commitmentCoverage: 0 },
  isLocked: false,
  userPin: null,
  isLoggedIn: false,
  financialPlans: [],
  profile: {
    id: 'guest',
    name: 'Premium User',
    email: '',
    role: UserRole.MEMBER,
    isSuperAdmin: false,
    version: 1,
    updated_at: Date.now(),
    device_id: 'browser',
    user_id: 'guest',
    is_deleted: 0
  },
  settings: {
    currency: 'USD',
    theme: 'LIGHT',
    aiEnabled: true,
    biometricEnabled: true,
    accentColor: '#3b82f6',
    language: 'EN',
    privacyMode: false,
    glassIntensity: 20,
    budgetStartDay: 1,
    hapticEnabled: true,
    animationSpeed: 'NORMAL',
    autoSync: true,
    decimalPlaces: 2,
    showHealthScore: true,
    compactMode: false,
    lowBalanceThreshold: 100,
    fontFamily: 'PLUS_JAKARTA',
    animationIntensity: 'MEDIUM',
    biometricLockTimeout: 0,
    soundEffectsEnabled: true,
    isAdminEnabled: false,
    isReadOnly: false,
    maintenanceMode: false,
    customAppName: 'FinOS',
    glassEffectsEnabled: true,
    customLogoUrl: localStorage.getItem('finos_custom_logo_url') || undefined,
    preferredGeminiKeyID: localStorage.getItem('finos_preferred_key_id') || undefined,
    preferredGeminiModel: localStorage.getItem('finos_preferred_model') || undefined,
  },
  sync_status: {
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
  },
  activeGeminiKeyId: localStorage.getItem('finos_preferred_key_id') || null,
  deleteProgress: {
    total: 0,
    current: 0,
    itemName: '',
    isDeleting: false,
    status: '',
    auditLog: []
  },
  undoStack: []
};

export const FinanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const isSuperAdmin = !!state.profile.isSuperAdmin; // Derived State for quick access
  const [isKernelReady, setIsKernelReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTabState] = useState('dashboard');

  const setActiveTab = useCallback((tab: string) => {
    console.log("🛠️ [FinanceContext] Changing Tab to:", tab);
    setActiveTabState(tab.toLowerCase());
  }, []);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusUI>(offlineSyncService.getStatus());

  const isDataLoadingRef = useRef(false);
  const prevBalances = useRef<Record<string, number>>({});

  // Ref to prevent infinite loops (Prompt itself causes Pause -> Resume)
  // Moved to top level to fix Invalid Hook Call error
  const isColdStartRef = useRef(true);

  // v4 Hardening: Stable Biometric Trigger
  // This function is stable and can be passed to the service without causing re-renders
  const triggerBiometricAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const profiles = await databaseKernel.query('profiles', `id = '${session.user.id}'`);
    const currentProfile = profiles?.[0];
    if (currentProfile && currentProfile.biometric_enabled === 1) {
      const bio = await biometricService.checkAvailability();
      if (bio.isAvailable) {
        console.log("🔐 [Resume] Triggering Biometric Prompt");
        setState(prev => ({ ...prev, isLocked: true }));
      }
    }
  }, []);

  // ========================================
  // ONE-TIME CLEANUP... (existing code)
  // ...

  // (Scroll down to useEffect logic)


  // ONE-TIME CLEANUP: Remove ALL user data on app start if duplicates found
  // Prevents data mixing between users
  // ========================================
  useEffect(() => {
    const cleanupDuplicateProfiles = async () => {
      try {
        const profiles = await databaseKernel.query('profiles', '1=1');
        const profileCount = profiles.values?.length || 0;

        if (profileCount > 1) {
          console.warn(`🧹 [Init] Found ${profileCount} profiles on startup. Cleaning ALL USER DATA...`);

          // NUCLEAR OPTION: Delete all user-scoped data
          // IMPORTANT: Delete in correct order to respect foreign key constraints
          const userTables = [
            'financial_plan_settlements',
            'financial_plan_components',
            'financial_plans',
            'channels',
            'transactions',
            'wallets',
            'budgets',
            'commitments',
            'notifications',
            'categories_user',
            'ai_usage_logs',
            'sync_queue',
            'profiles'
          ];

          for (const table of userTables) {
            try {
              await databaseKernel.execute(`DELETE FROM ${table}`);
              console.log(`   ✅ Cleared ${table}`);
            } catch (e) {
              console.warn(`   ⚠️ Failed to clear ${table}:`, e);
            }
          }

          console.log('✅ [Init] All user data cleaned (will recreate on login)');
        }
      } catch (e) {
        console.error('❌ [Init] Cleanup failed:', e);
      }
    };

    if (isKernelReady) {
      cleanupDuplicateProfiles();
    }
  }, [isKernelReady]); // Run once when kernel is ready

  const walletsWithBalances = useMemo(() => {
    // 1. Calculate Principal Balances (Direct Ownership Only)
    const principalMap = state.wallets.map(w => {
      const channelBalances: Record<string, number> = {};
      const channelIds: Record<string, string> = {};
      w.channels.forEach(ch => {
        channelBalances[ch.type] = Number(ch.balance);
        // FIX: Attribute initial wallet balance to CASH channel (or default) if it exists
        // Current logic assumes 'initialBalance' is CASH unless specified otherwise
        if (ch.type === 'CASH') {
          // In this system, 'balance' in channels table usually tracks strict channel funds.
          // 'initial_balance' on wallet table acts as an offset.
          // We need to decide: does 'initial_balance' belong to CASH? Yes, typically.
          // However, let's verify if 'channel.balance' already includes it.
          // Looking at addWallet, we insert channels with 'balance: w.channels[i].balance'.
          // So if initialBalance is separate, it needs to be added.
        }
        channelIds[ch.type] = ch.id;
      });
      // Correct Logic: 
      // The `channels` array from DB comes with balances. `initial_balance` on wallet is often just for reference or legacy.
      // BUT, if the user said "CASH is selected but has 0 balance", maybe the initial balance wasn't created as a channel entry?
      // Wait, let's look at line 336: `currentBalance: Number(w.initialBalance)`.
      // If we use `w.initialBalance` as the seed, we MUST add it to a channel.

      // better approach:
      // If `w.initialBalance` > 0, we should add it to the 'CASH' channel balance in our in-memory map.
      if (w.initialBalance > 0) {
        if (channelBalances['CASH'] !== undefined) {
          channelBalances['CASH'] += Number(w.initialBalance);
        } else {
          // Fallback if no CASH channel (unlikely for primary)
          // But actually, usually `channels` table has the breakdown. 
          // If `initialBalance` is used as the starting point, then we must be consistent.
          // Let's assume `initialBalance` belongs to CASH.
          channelBalances['CASH'] = (channelBalances['CASH'] || 0) + Number(w.initialBalance);
        }
      }
      return {
        ...w,
        currentBalance: Number(w.initialBalance), // This is now Principal Balance
        totalExpenses: 0,
        totalIncome: 0,
        channelBalances,
        channelIds,
        principalBalance: 0,
        aggregateBalance: 0,
        tempChannelSums: { ...channelBalances } // For aggregation
      };
    });

    // 2. Apply Transactions to Principal Balances
    state.transactions.forEach(t => {
      const sourceWallet = principalMap.find(w => w.id === t.walletId);
      if (!sourceWallet) return;

      // Ignore shadow transactions if any remain (migration safety)
      if (t.isSubLedgerSync) return;

      const amt = Number(t.amount);
      if (t.type === MasterCategoryType.TRANSFER && t.toWalletId && t.toChannelType) {
        const destWallet = principalMap.find(w => w.id === t.toWalletId);
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

    // 3. Finalize Principal & Initialize Aggregation
    const finalizedPrincipal = principalMap.map(w => ({
      ...w,
      principalBalance: w.currentBalance,
      aggregateBalance: w.currentBalance, // Start with self
      aggregateChannels: { ...w.channelBalances } // Start with self
    }));

    // 4. Perform Aggregation (Children -> Parents)
    // We iterate to find children and add their stats to parents
    finalizedPrincipal.forEach(child => {
      if (child.parentWalletId) {
        const parent = finalizedPrincipal.find(p => p.id === child.parentWalletId);
        if (parent) {
          parent.aggregateBalance += child.principalBalance;

          // Aggregate Channel Balances
          Object.entries(child.channelBalances).forEach(([type, balance]) => {
            if (parent.aggregateChannels[type] === undefined) parent.aggregateChannels[type] = 0;
            parent.aggregateChannels[type] += balance;
          });
        }
      }
    });

    // 5. Format Output
    return finalizedPrincipal.map(w => {
      return {
        ...w,
        currentBalance: w.aggregateBalance, // Default view is now Aggregate
        principalBalance: w.principalBalance,
        aggregateBalance: w.aggregateBalance,
        aggregateChannels: Object.entries(w.aggregateChannels).map(([type, balance]) => ({
          type: type as ChannelType,
          balance
        })),
        computedChannels: Object.entries(w.channelBalances).map(([type, balance]) => ({
          type: type as ChannelType,
          balance,
          id: w.channelIds[type]
        }))
      };
    });
  }, [state.wallets, state.transactions]);

  const totalBalance = useMemo(() => walletsWithBalances.filter(w => !w.usesPrimaryIncome || w.isPrimary).reduce((acc, w) => acc + w.currentBalance, 0), [walletsWithBalances]);
  const totalMonthlyCommitments = useMemo(() => state.commitments.reduce((acc, c) => {
    let monthlyAmount = c.amount;
    if (c.frequency === CommitmentFrequency.DAILY) monthlyAmount *= 30;
    if (c.frequency === CommitmentFrequency.WEEKLY) monthlyAmount *= 4.34;
    return acc + monthlyAmount;
  }, 0), [state.commitments]);
  const projectedBalances = useMemo(() => {
    const projections: { date: string, balance: number, stress: 'NONE' | 'LOW' | 'HIGH' }[] = [];
    let runningBalance = totalBalance;
    const today = startOfDay(new Date());
    for (let i = 0; i < 90; i++) {
      const date = addDays(today, i);
      state.commitments.forEach(c => {
        if (isSameDay(date, startOfDay(parseISO(c.nextDate)))) runningBalance -= c.amount;
      });
      projections.push({ date: date.toISOString(), balance: runningBalance, stress: runningBalance < 0 ? 'HIGH' : runningBalance < totalMonthlyCommitments ? 'LOW' : 'NONE' });
    }
    return projections;
  }, [totalBalance, state.commitments, totalMonthlyCommitments]);

  // Moved refs to top level for consistency
  // const prevBalances = useRef... (declared above)
  // const isDataLoadingRef = useRef... (declared above)

  // Helper for creating system notifications
  const addNotification = useCallback(async (n: any) => {
    const id = uuidv4();
    const fullNotification: AppNotification = {
      ...n,
      id,
      isRead: false,
      created_at: Date.now(),
      updated_at: Date.now(),
      version: 1,
      device_id: 'system',
      user_id: state.profile.id || 'system',
      is_deleted: 0
    };

    // Map camelCase to snake_case for DB
    const { isRead, actionUrl, ...rest } = fullNotification;
    const dbData = {
      ...rest,
      is_read: 0,
      action_url: actionUrl || null,
      data: n.data && typeof n.data === 'object' ? JSON.stringify(n.data) : (n.data || null)
    };

    await databaseKernel.insert('notifications', dbData);
    setState(prev => ({
      ...prev,
      notifications: [fullNotification, ...prev.notifications]
    }));
  }, [state.profile.id]);

  // Real-time Notification Engine triggers
  useEffect(() => {
    if (!isKernelReady || !state.wallets.length) return;

    // Plan alerts (Milestones)
    const processPlanAlerts = async () => {
      const planAlerts = NotificationEngine.generatePlanAlerts(state.financialPlans);
      for (const alert of planAlerts) {
        const exists = state.notifications.some(existing =>
          existing.type === 'PLAN_MILESTONE' && existing.data?.planId === alert.data?.planId
        );
        if (!exists) await addNotification(alert);
      }
    };
    processPlanAlerts();

    // Commitment alerts
    const processCommitmentAlerts = async () => {
      const commitmentAlerts = NotificationEngine.generateCommitmentAlerts(state.commitments, state.transactions);
      for (const alert of commitmentAlerts) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const exists = state.notifications.some(existing =>
          existing.type === 'COMMITMENT_DUE' &&
          existing.data?.commitmentId === alert.data?.commitmentId &&
          format(new Date(existing.created_at), 'yyyy-MM-dd') === todayStr
        );
        if (!exists) await addNotification(alert);
      }
    };
    processCommitmentAlerts();

  }, [state.financialPlans, state.commitments, state.transactions, isKernelReady]);

  // Wallet balance alerts (pulsed check)
  useEffect(() => {
    if (!isKernelReady || !walletsWithBalances.length) return;

    // Create "next" wallets structure for engine
    const nextWallets = walletsWithBalances.map(w => ({
      ...w,
      channels: w.computedChannels.map(cc => ({ type: cc.type, balance: cc.balance }))
    }));

    // Create "prev" wallets from ref
    const prevWallets = walletsWithBalances.map(w => ({
      ...w,
      channels: [{ type: 'CASH' as ChannelType, balance: prevBalances.current[w.id] ?? w.currentBalance }]
    }));

    const balanceAlerts = NotificationEngine.generateBalanceAlerts(prevWallets as any, nextWallets as any);

    const processBalanceAlerts = async () => {
      for (const alert of balanceAlerts) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const exists = state.notifications.some(existing =>
          existing.type === 'BALANCE_ALERT' &&
          existing.data?.walletId === alert.data?.walletId &&
          format(new Date(existing.created_at), 'yyyy-MM-dd') === todayStr
        );
        if (!exists) await addNotification(alert);
      }
    };
    processBalanceAlerts();

    // Update ref for next cycle
    walletsWithBalances.forEach(w => {
      prevBalances.current[w.id] = w.currentBalance;
    });
  }, [walletsWithBalances, isKernelReady]);

  // Reload data when initialization completes
  // Reload data when initialization completes
  // OPTIMIZE: Prevent Double Load if data already loaded
  useEffect(() => {
    if (syncStatus.isInitialized && isKernelReady) {
      if (state.wallets.length === 0) { // Only load if state is empty (Cold Start)
        console.log("🎊 [FinanceContext] System Initialized. Performing Final Data Load...");
        loadAppData();
      } else {
        console.log("✅ [FinanceContext] System Initialized. Data already hot, skipping redundant load.");
      }
    }
  }, [syncStatus.isInitialized, isKernelReady]);

  const lastLoadTimeRef = useRef<number>(0);

  const loadAppData = useCallback(async (shouldTriggerSync: boolean = false, providedSession?: any, forceReload: boolean = false) => {
    const now = Date.now();
    // Debounce: Prevent loading more than once every 500ms unless forced
    if (!forceReload && (now - lastLoadTimeRef.current < 500) && isDataLoadingRef.current) {
      console.log("📂 [DataLoad] Debounced: Load requested too recently, skipping...");
      return;
    }

    if (isDataLoadingRef.current && !forceReload) {
      console.log("📂 [DataLoad] Load already in progress, skipping...");
      return;
    }

    // Force reload: Reset the ref to allow reload even if loading is in progress
    if (forceReload) {
      console.log("🔄 [DataLoad] Force reload requested, resetting loading ref...");
      isDataLoadingRef.current = false;
    }

    try {
      isDataLoadingRef.current = true;
      lastLoadTimeRef.current = now;
      console.log(`📂 [DataLoad] Starting Data Load${forceReload ? ' (Force Reload)' : ''}...`);

      // ISOLATION: Resolve session immediately to filter queries
      const currentSession = providedSession || (await supabase.auth.getSession()).data.session;
      const currentUserId = currentSession?.user?.id;

      const [
        wallets,
        transactions,
        categoriesUserRes,
        categoriesGlobalRes,
        commitments,
        channels,
        budgets,
        profilesRes
      ] = await Promise.all([
        // ISOLATION: Filter all queries by current user_id to prevent data leakage across sessions
        databaseKernel.query('wallets', 'user_id = ? AND is_deleted = 0', [currentUserId]),
        databaseKernel.query('transactions', 'user_id = ? AND is_deleted = 0 ORDER BY date DESC LIMIT 500', [currentUserId]),
        databaseKernel.query('categories_user', 'user_id = ? AND is_deleted = 0', [currentUserId]),
        databaseKernel.query('categories_global', 'is_deleted = 0'), // Globals are shared/system-wide
        databaseKernel.query('commitments', 'user_id = ? AND is_deleted = 0', [currentUserId]),
        databaseKernel.query('channels', 'user_id = ? AND is_deleted = 0', [currentUserId]),
        databaseKernel.query('budgets', 'user_id = ? AND is_deleted = 0', [currentUserId]),
        databaseKernel.query('profiles', '1=1') // We load all profiles to detect mismatch, but filter later
      ]);

      let categoriesUser = categoriesUserRes;
      let categoriesGlobal = categoriesGlobalRes;
      let profiles = profilesRes;

      const hasModern = categoriesGlobal.some((c: any) => c.id === 'cat_life_essentials');
      const hasLegacy = categoriesGlobal.some((c: any) => !c.id.startsWith('cat_') || ['cat_food', 'cat_miscellaneous', 'cat_shopping'].includes(c.id));

      if (!hasModern && (hasLegacy || categoriesGlobal.length > 5)) {
        console.warn("🧼 [Kernel] Legacy categories detected. Purging and re-syncing...");
        await databaseKernel.execute("DELETE FROM categories_global");
        await databaseKernel.execute("DELETE FROM categories_user");
        await databaseKernel.run('UPDATE meta_sync SET last_full_sync = 0 WHERE id = 1');
        categoriesUser = [];
        categoriesGlobal = [];
        setTimeout(() => offlineSyncService.sync({ lightweight: false }), 1000);
      }
      console.log("📂 [DataLoad] Profiles loaded. Checking Session...");

      // ========================================
      // OPTIMIZATION: Non-Blocking Session Check
      // ========================================
      let session = currentSession;
      let localUser = null;

      // 1. Try to find local user immediately
      if (profiles.length > 0) {
        localUser = profiles[0]; // Default assumption for single-user offline app
        // If we have meta_sync.last_user_id, use that? For now, profiles[0] is robust enough for 99% cases.
        console.log(`🚀 [DataLoad] Optimistic Load: Using local profile for ${localUser.email}`);
      }

      // 2. Session Integrity Resolution
      const fetchSessionPromise = (async () => {
        if (session) return session;
        try {
          const { data } = await supabase.auth.getSession();
          return data?.session;
        } catch (e) {
          console.error("📂 [DataLoad] Session fetch error:", e);
          return null;
        }
      })();

      if (!localUser) {
        // Cold Start / No Data: We MUST wait for session
        console.log("⏳ [DataLoad] No local data. Blocking for network session...");
        session = await fetchSessionPromise;
      } else {
        // Hot Start Logic:
        // We only "Hot Start" if we are reasonably sure this session belongs to the same user.
        // If we don't have a session yet, we probe meta_sync to see who we were.
        const metaRes = await databaseKernel.query('meta_sync', 'id = 1');
        const lastUserId = metaRes?.[0]?.last_user_id;

        if (lastUserId && localUser.id === lastUserId) {
          // SAME USER: We can safely render optimistically
          console.log("🚀 [DataLoad] Hot Start: User matched last session. Continuing...");
          if (!session) session = { user: localUser }; // Mock for synchronous flow
        } else {
          // NEW USER OR UNKNOWN: We MUST wait for network session to avoid data leakage/loop
          console.log("⏳ [DataLoad] Potential User Switch: Awaiting authoritative session...");
          session = await fetchSessionPromise;
        }
      }

      console.log("📂 [DataLoad] Session check complete:", session ? "YES" : "NO");

      // ========================================
      // FIXED: Profile Mismatch & User Switch Handling
      // ========================================

      if (session && profiles.length > 0) {
        // Find the profile that matches the current session
        const matchingProfile = profiles.find((p: any) => p.id === session.user.id);

        if (matchingProfile) {
          // We found the correct user. Ensure it is at the "top" if we are relying on profiles[0] downstream, 
          // but better yet, we just filters `profiles` in memory to be `[matchingProfile]` for the context state.
          // However, to avoid breaking downstream logic that assumes profiles[0] is the user, let's keep it simple.
          // We do NOT wipe data if the user exists.
          console.log(`✅ [DataLoad] Found matching profile for ${session.user.email}`);

          // If there are OTHER profiles (Super Admin case), we shouldn't treat it as a mismatch.
          // We just need to make sure we use 'matchingProfile' as the active one.

          // We re-sort profiles so matchingProfile is [0] to satisfy legacy assumptions if any.
          profiles = [matchingProfile, ...profiles.filter((p: any) => p.id !== session.user.id)];
        } else {
          // If we are in "Optimistic Mode" (localUser exists), maybe session.user.id is undefined because session is mocked?
          // No, limits logic handles that.
          if (session.user.id !== localUser?.id) {
            console.warn("👤 [DataLoad] User Mismatch / Missing Profile Detected!");

            // SAFE HARBOR CHECK: Do we have unsynced data?
            const pendingChanges = await databaseKernel.query('sync_queue', '1=1');

            if (pendingChanges && pendingChanges.length > 0) {
              console.log(`🔒 [DataLoad] Isolation Mode: Found ${pendingChanges.length} unsynced items. Preserving them.`);
              // We do NOT return. We proceed to Wipe Logic below, but the logic is now "Selective".
            }

            console.log("🧹 [DataLoad] Performing Selective Isolation Wipe...");

            // 3. SELECTIVE ISOLATION: Delete data that belongs to OTHER users, 
            //    BUT preserve data that is in the Sync Queue (Unsynced Defaults).
            //    This effectively "Hides" the old user's synced data (deleted) but keeps their drafts.

            const userTables = [
              'financial_plan_settlements', 'financial_plan_components', 'financial_plans',
              'channels', 'transactions', 'wallets', 'budgets', 'commitments',
              'notifications', 'categories_user', 'ai_usage_logs', 'ai_memories', 'sync_queue', 'profiles'
            ];

            for (const table of userTables) {
              try {
                // DELETE rows where:
                // 1. user_id is NOT current user (Foreign Data)
                // 2. AND the row ID is NOT referenced in sync_queue as an entity_id (Not a Draft)
                // Note: We use subquery for preservation.
                // "profiles" table handling is special: we handle it via profiles array logic, so we can clean it here too.

                await databaseKernel.run(
                  `DELETE FROM ${table} WHERE user_id != ? AND id NOT IN (SELECT entity_id FROM sync_queue WHERE entity = ?)`,
                  [session.user.id, table],
                  false
                );
              } catch (e) { }
            }
            console.log('✅ [DataLoad] Isolation Wipe complete. Foreign Synced Data removed. Drafts preserved.');

            // Re-fetch profiles to ensure we only have the current one or created one
            profiles = []; // Force refresh downstream logic
          }
        }
      }
      // Removed the 'else if (profiles.length > 1)' block because multiple profiles are invalid only for standard users, not Super Admins.
      // With the logic above, we handle the mismatch correctly.

      // 4. Auto-Create Profile for New Users (if missing locally but logged in)
      if (!profiles || profiles.length === 0) {
        if (session) {
          console.log("👤 [DataLoad] New User / Empty Profile. Creating local record...");
          const newProfileId = session.user.id;
          await databaseKernel.run(`
            INSERT INTO profiles (id, email, name, role, is_super_admin, version, organization_id, permissions, updated_at, server_updated_at) 
            VALUES (?, ?, ?, 'MEMBER', 0, 1, ?, '{}', (strftime('%s', 'now') * 1000), 0)
          `, [newProfileId, session.user.email, session.user.user_metadata?.name || 'New Member', newProfileId]);

          await offlineSyncService.enqueue('profiles', newProfileId, 'INSERT', {
            id: newProfileId, email: session.user.email, name: session.user.user_metadata?.name || 'New Member',
            role: 'MEMBER', organization_id: newProfileId, permissions: '{}'
          }, false);

          await offlineSyncService.sync({ lightweight: false, forcePull: true });

          // Restore backup if exists
          try {
            const backupExists = await databaseKernel.query('sqlite_master', "type='table' AND name='sync_queue_backup'");
            if (backupExists && backupExists.length > 0) {
              const backedUpChanges = await databaseKernel.query('sync_queue_backup', `user_id = '${newProfileId}'`);
              if (backedUpChanges && backedUpChanges.length > 0) {
                for (const item of backedUpChanges) {
                  await databaseKernel.run(`
                    INSERT OR REPLACE INTO sync_queue (id, entity, entity_id, action, payload, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                  `, [item.id, item.entity, item.entity_id, item.action, item.payload, item.created_at]);
                  await databaseKernel.execute(`DELETE FROM sync_queue_backup WHERE id = '${item.id}'`);
                }
                console.log(`✅ [DataLoad] Restored ${backedUpChanges.length} changes to sync queue`);
              }
            }
          } catch (e) {
            console.warn("⚠️ [DataLoad] Migration restore failed", e);
          }

          profiles = await databaseKernel.query('profiles', '1=1');
        }
      }

      if (!profiles || profiles.length === 0) {
        console.warn("⚠️ [DataLoad] No profile found.");
        return;
      }

      const p = profiles[0] as any;

      // --- Enterprise Migration (REMOVED: Causing Sync Loops) ---
      // Admin status is now consistently managed via Supabase and Admin Panel.
      // This hardcoded check was forcing local DB updates and triggering infinite sync retries.

      /* 
      if (session?.user.email === 'hmetest121@gmail.com') {
         ...
      } else if (p.is_super_admin === 1) {
         ...
      }
      */

      if (p.server_updated_at === 0 || p.server_updated_at === null) {
        if (session) offlineSyncService.sync({ lightweight: false });
      }

      // 5. Fetch Global AI Keys (System Config) - PREVENT DATA LOSS ON LOGOUT
      if (session) {
        console.log("📂 [DataLoad] AI Keys Block: Checking for updates...");
        try {
          // A. Check Local Version
          const localKeysRaw = localStorage.getItem('finos_global_ai_keys');
          const localVersionStr = localStorage.getItem('finos_global_ai_keys_version');
          const localVersion = parseInt(localVersionStr || '0');
          const hasKeys = localKeysRaw && localKeysRaw !== '[]' && localKeysRaw.length > 5;

          // B. Fetch Server Version (Lightweight Probe)
          const versionFetchPromise = supabase
            .from('static_data_versions')
            .select('global_ai_keys')
            .single();

          const probeTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Probe Timeout')), 2500);
          });

          console.log("📡 [DataLoad] Probing static_data_versions...");
          let serverVersion = 0;
          try {
            const { data: versionData } = await Promise.race([versionFetchPromise, probeTimeout]) as any;
            serverVersion = versionData?.global_ai_keys || 0;
            console.log(`📡 [DataLoad] Server Version resolved: V${serverVersion}`);
          } catch (probeError) {
            console.warn("⚠️ [DataLoad] Version Probe Skipped or Timed Out (using V0)");
          }

          const needsUpdate = !hasKeys || serverVersion > localVersion;

          if (needsUpdate) {
            console.log(`⏳ [DataLoad] Global Key Update Required (Local V${localVersion} -> Server V${serverVersion}). Fetching...`);

            const fetchPromise = supabase
              .from('system_config')
              .select('key, value')
              .in('key', ['global_ai_keys', 'global_ai_key']);

            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Global Key Fetch Timed Out')), 5000);
            });

            const { data: configRows } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (configRows && configRows.length > 0) {
              const pluralRow = configRows.find((r: any) => r.key === 'global_ai_keys');
              const singularRow = configRows.find((r: any) => r.key === 'global_ai_key');
              const targetRow = pluralRow || singularRow;

              if (targetRow?.value) {
                const keys = typeof targetRow.value === 'string' ? JSON.parse(targetRow.value) : targetRow.value;
                localStorage.setItem('finos_global_ai_keys', JSON.stringify(keys));
                localStorage.setItem('finos_global_ai_keys_version', serverVersion.toString());
                console.log(`🔑 [DataLoad] Updated Global AI Keys (Source: ${targetRow.key}, V${serverVersion}). Count: ${keys.length}`);
                window.dispatchEvent(new CustomEvent('FINOS_AI_KEYS_UPDATED'));
              }
            } else {
              console.log("📡 [DataLoad] No Global Keys found on server.");
            }
          } else {
            console.log(`✅ [DataLoad] Global Keys up-to-date (V${localVersion}).`);
          }
        } catch (err) {
          console.warn("⚠️ [DataLoad] Global Key Auto-Update Failed:", err);
        }
      }

      console.log("📂 [DataLoad] Loading Notifications...");
      const notifications = await databaseKernel.query('notifications');
      const currencies = await databaseKernel.query('currencies', '1=1');
      const channelTypes = await databaseKernel.query('channel_types', '1=1');
      const plans = await databaseKernel.query('financial_plans');
      const components = await databaseKernel.query('financial_plan_components');
      const settlements = await databaseKernel.query('financial_plan_settlements');

      const mappedWallets: Wallet[] = wallets.map((w: any) => ({
        ...w, initialBalance: w.initial_balance, isVisible: !!w.is_visible, isPrimary: !!w.is_primary,
        usesPrimaryIncome: !!w.uses_primary_income, parentWalletId: w.parent_wallet_id,
        channels: channels.filter((c: any) => c.wallet_id === w.id).map((c: any) => ({ ...c }))
      }));

      const mappedTransactions: Transaction[] = transactions.map((t: any) => ({
        ...t, walletId: t.wallet_id, channelType: t.channel_type as ChannelType, categoryId: t.category_id,
        isSplit: !!t.is_split, toWalletId: t.to_wallet_id, toChannelType: t.to_channel_type as ChannelType,
        linkedTransactionId: t.linked_transaction_id, isSubLedgerSync: !!t.is_sub_ledger_sync,
        subLedgerId: t.sub_ledger_id, subLedgerName: t.sub_ledger_name, settlementGroupId: t.settlement_group_id, splits: []
      }));

      const mappedCategories: Category[] = [
        ...categoriesGlobal.map((c: any) => ({ ...c, isGlobal: true, parentId: c.parent_id, isDisabled: !!c.is_disabled })),
        ...categoriesUser.map((c: any) => ({ ...c, isGlobal: false, parentId: c.parent_id, isDisabled: !!c.is_disabled }))
      ];

      const mappedBudgets: Budget[] = budgets.map((b: any) => ({ ...b, categoryId: b.category_id }));
      const mappedNotifications: AppNotification[] = notifications.map((n: any) => {
        let parsedData = n.data;
        if (typeof n.data === 'string' && n.data.startsWith('{')) {
          try { parsedData = JSON.parse(n.data); } catch (e) { }
        }
        return { ...n, isRead: !!n.is_read, data: parsedData };
      });

      setState((prev: AppState) => {
        let profile = prev.profile;
        let settings = prev.settings;
        let activeKeyFromDB = prev.activeGeminiKeyId;
        if (profiles && profiles.length > 0) {
          const prof = (session?.user?.id ? profiles.find((prof: any) => prof.id === session.user.id) : profiles[0]) as any;
          if (!prof) return prev;

          const dbVersion = prof.version || 1;
          const localVersion = profile.version || 1;
          const isStaleDB = dbVersion < localVersion;

          if (isStaleDB) {
            databaseKernel.run('UPDATE profiles SET version = ?, updated_at = ? WHERE id = ?', [localVersion, Date.now(), prof.id]).catch(() => { });
          }

          profile = {
            id: prof.id, name: prof.name || profile.name, email: prof.email || profile.email,
            role: prof.role as UserRole || UserRole.MEMBER, isSuperAdmin: !!prof.is_super_admin,
            organizationId: prof.organization_id, permissions: (() => {
              try {
                if (typeof prof.permissions === 'object' && prof.permissions !== null) return prof.permissions;
                if (typeof prof.permissions === 'string' && prof.permissions.trim() !== '' && prof.permissions !== '[object Object]') {
                  return JSON.parse(prof.permissions);
                }
              } catch (e) { } return {};
            })(),
            version: Math.max(dbVersion, localVersion), updated_at: prof.updated_at || Date.now(),
            server_updated_at: prof.server_updated_at, device_id: prof.device_id || 'unknown',
            user_id: prof.user_id || 'unknown', is_deleted: prof.is_deleted || 0
          };

          const newSettings = {
            ...settings,
            currency: prof.currency || settings.currency, theme: (prof.theme || settings.theme) as any,
            aiEnabled: prof.ai_enabled === 1, biometricEnabled: prof.biometric_enabled === 1,
            accentColor: prof.accent_color || settings.accentColor, language: (prof.language || settings.language) as any,
            privacyMode: prof.privacy_mode === 1, glassIntensity: prof.glass_intensity ?? settings.glassIntensity,
            budgetStartDay: prof.budget_start_day ?? settings.budgetStartDay, hapticEnabled: prof.haptic_enabled === 1,
            animationSpeed: (prof.animation_speed || settings.animationSpeed) as any, defaultWalletId: prof.default_wallet_id || settings.defaultWalletId,
            autoSync: prof.auto_sync === 1, decimalPlaces: prof.decimal_places ?? settings.decimalPlaces,
            showHealthScore: prof.show_health_score === 1, compactMode: prof.compact_mode === 1,
            lowBalanceThreshold: prof.low_balance_threshold ?? settings.lowBalanceThreshold,
            fontFamily: (prof.font_family || settings.fontFamily) as any, animationIntensity: (prof.animation_intensity || settings.animationIntensity) as any,
            biometricLockTimeout: prof.biometric_lock_timeout ?? settings.biometricLockTimeout,
            soundEffectsEnabled: prof.sound_effects_enabled === 1, isAdminEnabled: prof.is_admin_enabled === 1,
            customGeminiKey: prof.custom_gemini_key || settings.customGeminiKey, customSupabaseUrl: prof.custom_supabase_url || settings.customSupabaseUrl,
            isReadOnly: prof.is_read_only === 1, maintenanceMode: prof.maintenance_mode === 1,
            customAppName: prof.custom_app_name || settings.customAppName, glassEffectsEnabled: prof.glass_effects_enabled === 1,
            customLogoUrl: prof.custom_logo_url || settings.customLogoUrl, preferredGeminiKeyID: prof.preferred_gemini_key_id || settings.preferredGeminiKeyID,
            preferredGeminiModel: prof.preferred_gemini_model || settings.preferredGeminiModel,
          };
          activeKeyFromDB = prof.preferred_gemini_key_id || activeKeyFromDB;
          settings = newSettings;
        }

        const globalKeysJSON = localStorage.getItem('finos_global_ai_keys');
        const globalGeminiKeys = (() => { try { return globalKeysJSON ? JSON.parse(globalKeysJSON) : []; } catch (e) { return []; } })();

        // Pre-compute maps for O(N) lookup
        const componentsMap = new Map<string, any[]>();
        components.forEach((c: any) => {
          const list = componentsMap.get(c.plan_id) || [];
          list.push(c);
          componentsMap.set(c.plan_id, list);
        });

        const settlementsMap = new Map<string, any[]>();
        settlements.forEach((s: any) => {
          const list = settlementsMap.get(s.plan_id) || [];
          list.push(s);
          settlementsMap.set(s.plan_id, list);
        });

        return {
          ...prev, wallets: mappedWallets, transactions: mappedTransactions, categories: mappedCategories,
          budgets: mappedBudgets, activeGeminiKeyId: activeKeyFromDB, globalGeminiKeys,
          commitments: commitments.map((c: any) => ({
            ...c, walletId: c.wallet_id, nextDate: c.next_date, certaintyLevel: c.certainty_level as CertaintyLevel,
            isRecurring: !!c.is_recurring, categoryId: c.category_id, history: JSON.parse(c.history || '[]')
          })),
          notifications: mappedNotifications,
          currencies: currencies.map((c: any) => ({ ...c, code: c.code, name: c.name, symbol: c.symbol })),
          channelTypes: channelTypes.map((c: any) => ({ ...c, id: c.id, name: c.name, iconName: c.icon_name, color: c.color, isDefault: !!c.is_default })),
          financialPlans: plans.map((pl: any) => ({
            ...pl,
            components: componentsMap.get(pl.id) || [],
            settlements: settlementsMap.get(pl.id) || []
          })),
          profile, settings,
          deleteProgress: prev.deleteProgress || DEFAULT_STATE.deleteProgress,
          undoStack: prev.undoStack || DEFAULT_STATE.undoStack
        };
      });

      if (shouldTriggerSync) {
        const syncStatus = offlineSyncService.getStatus();
        if (syncStatus.isOnline && session && !syncStatus.isSyncing) {
          offlineSyncService.sync();
        }
      }
    } catch (e) {
      console.error('🔑 [Kernel] Critical data loading failed:', e);
    } finally {
      isDataLoadingRef.current = false;
      console.log("✅ [DataLoad] Data load process finished.");
    }
  }, [isKernelReady]);

  const isAppStartedRef = useRef(false);

  // 1. Initial Data & Kernel Boot Effect
  useEffect(() => {
    const startSequence = async () => {
      if (isAppStartedRef.current) return;
      isAppStartedRef.current = true;

      try {
        await databaseKernel.initialize((pct, msg) => {
          setSyncStatus(prev => ({ ...prev, progressPercent: pct, progress: msg }));
        });
        setIsKernelReady(true);

        // OPTIMIZATION: Non-blocking Session Check & Instant Load
        // Load data immediately after Kernel is ready. Do NOT wait for Sync Engine.
        await loadAppData(false, undefined);
        setLoading(false); // <--- UI UNBLOCK: Reveal Dashboard immediately

        await offlineSyncService.initialize();
        localStorage.setItem('finos_cold_start_pending', 'true'); // Prime for v5 authoritative resume

        const isInitialized = (await databaseKernel.query('meta_sync', 'id = 1'))?.[0]?.is_initialized === 1;
        const currentSync = offlineSyncService.getStatus();
        const walletsCount = await databaseKernel.query('wallets');

        if (currentSync.isOnline && (!isInitialized || walletsCount.length === 0)) {
          offlineSyncService.bootstrap();
        }

        // IMPORTANT: Once startSequence is done, we are no longer in "Cold Start"
        // Any subsequent foregrounding is a "Resume"
        isColdStartRef.current = false;
      } catch (err) {
        console.error("🏁 [Startup] FATAL SEQUENCE ERROR:", err);
      } finally {
        setLoading(false);
      }
    };
    startSequence();
  }, []); // Strictly once

  // 2. Lifecycle & Auth Listeners Effect
  useEffect(() => {
    // App State Listener (Resume only - no pause on minimize)
    let appListener: any;

    import('@capacitor/app').then(({ App }) => {
      appListener = App.addListener('appStateChange', async (appState) => {
        if (appState.isActive) {
          console.log('📱 [FinanceContext] App resumed (active)');
          offlineSyncService.handleAppResume('APP_STATE', triggerBiometricAuth);
        } else {
          // App minimized or backgrounded - keep running, don't pause
          console.log('📱 [FinanceContext] App minimized (keeping sync active)');
        }
      });
    });

    // Web visibility fallback (Resume only - no pause on tab switch)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('🌐 [FinanceContext] Tab visible (resuming)');
        offlineSyncService.handleAppResume('VISIBILITY', triggerBiometricAuth);
      } else {
        // Tab hidden or minimized - keep running, don't pause
        console.log('🌐 [FinanceContext] Tab hidden (keeping sync active)');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const unsubscribeSync = offlineSyncService.subscribe((status) => setSyncStatus(status));

    // Subscribe to sync completion events to reload data when changes are pulled
    const unsubscribeSyncComplete = offlineSyncService.onSyncComplete((hadChanges) => {
      if (hadChanges) {
        console.log("🔔 [FinanceContext] Sync completed with changes, forcing data reload...");
        loadAppData(false, undefined, true); // Force reload
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setState((prev: AppState) => ({
          ...prev,
          isLoggedIn: true,
          profile: {
            ...prev.profile,
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'FinOS User'
          }
        }));
        await loadAppData(false, session);
        const status = offlineSyncService.getStatus();
        if (!status.isInitialized && status.isOnline) offlineSyncService.bootstrap();
      } else {
        setState((prev: AppState) => ({ ...prev, isLoggedIn: false }));
      }
    });

    return () => {
      unsubscribeSync();
      unsubscribeSyncComplete();
      authListener.subscription.unsubscribe();
      if (appListener) appListener.then((l: any) => l.remove());
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [triggerBiometricAuth, loadAppData]); // Stability check: triggerBiometricAuth is stable

  // Sync geminiKeys and logo to localStorage whenever they change in state
  useEffect(() => {
    if (state.sync_status.isInitialized) {
      if (state.settings.customLogoUrl) {
        localStorage.setItem('finos_custom_logo_url', state.settings.customLogoUrl);
      } else {
        localStorage.removeItem('finos_custom_logo_url');
      }

      if (state.settings.preferredGeminiKeyID) {
        localStorage.setItem('finos_preferred_key_id', state.settings.preferredGeminiKeyID);
      }
      if (state.settings.preferredGeminiModel) {
        localStorage.setItem('finos_preferred_model', state.settings.preferredGeminiModel);
      }
    }
  }, [state.settings.customLogoUrl, state.settings.preferredGeminiKeyID, state.settings.preferredGeminiModel, state.sync_status.isInitialized]);

  // Realtime nano-pulse updates from sync engine
  useEffect(() => {
    const unsubscribe = offlineSyncService.onItemUpdate(async (table, item, action) => {
      console.log(`⚡ [UI] Realtime Update Received: Table=${table}, Action=${action}, ID=${item.id}`);
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
              isSubLedgerSync: !!item.is_sub_ledger_sync,
              subLedgerId: item.sub_ledger_id,
              subLedgerName: item.sub_ledger_name,
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
          case 'notifications':
            const mappedN: AppNotification = { ...item, isRead: !!item.is_read };
            if (action === 'DELETE') {
              nextState.notifications = prev.notifications.filter(n => n.id !== item.id);
            } else {
              const filtered = prev.notifications.filter(n => n.id !== item.id);
              nextState.notifications = [mappedN, ...filtered];
            }
            break;
          case 'profiles':
            const p = item;
            // CRITICAL SECURITY FIX: Ignore updates for other users
            if (p.id !== prev.profile.id) return prev;

            const syncedSettings = {
              ...prev.settings,
              currency: p.currency || prev.settings.currency,
              theme: p.theme || prev.settings.theme,
              aiEnabled: p.ai_enabled === 1,
              biometricEnabled: p.biometric_enabled === 1,
              accentColor: p.accent_color || prev.settings.accentColor,
              language: p.language || prev.settings.language,
              privacyMode: p.privacy_mode === 1,
              glassIntensity: p.glass_intensity ?? prev.settings.glassIntensity,
              budgetStartDay: p.budget_start_day ?? prev.settings.budgetStartDay,
              hapticEnabled: p.haptic_enabled === 1,
              animationSpeed: p.animation_speed || prev.settings.animationSpeed,
              defaultWalletId: p.default_wallet_id || prev.settings.defaultWalletId,
              autoSync: p.auto_sync === 1,
              decimalPlaces: p.decimal_places ?? prev.settings.decimalPlaces,
              showHealthScore: p.show_health_score === 1,
              compactMode: p.compact_mode === 1,
              lowBalanceThreshold: p.low_balance_threshold ?? prev.settings.lowBalanceThreshold,
              fontFamily: p.font_family || prev.settings.fontFamily,
              animationIntensity: p.animation_intensity || prev.settings.animationIntensity,
              biometricLockTimeout: p.biometric_lock_timeout ?? prev.settings.biometricLockTimeout,
              soundEffectsEnabled: p.sound_effects_enabled === 1,
              isAdminEnabled: p.is_admin_enabled === 1,
              customGeminiKey: p.custom_gemini_key || prev.settings.customGeminiKey,
              customSupabaseUrl: p.custom_supabase_url || prev.settings.customSupabaseUrl,
              isReadOnly: p.is_read_only === 1,
              maintenanceMode: p.maintenance_mode === 1,
              customAppName: p.custom_app_name || prev.settings.customAppName,
              glassEffectsEnabled: p.glass_effects_enabled === 1,
              customLogoUrl: p.custom_logo_url || prev.settings.customLogoUrl
            };
            nextState.settings = syncedSettings;
            nextState.profile = { ...prev.profile, id: p.id, email: p.email, name: p.name, version: p.version };
            break;
          case 'categories_user':
            const mappedCat: Category = {
              ...item,
              parentId: item.parent_id,
              isDisabled: !!item.is_disabled,
              embedding: item.embedding ? JSON.parse(item.embedding) : undefined
            };
            if (action === 'DELETE') {
              nextState.categories = prev.categories.filter(c => c.id !== item.id);
            } else {
              const filtered = prev.categories.filter(c => c.id !== item.id);
              nextState.categories = [...filtered, mappedCat];
            }
            break;

          case 'channels':
            // Update wallet channels
            const targetWalletId = item.wallet_id;
            const walletIndex = prev.wallets.findIndex(w => w.id === targetWalletId);
            if (walletIndex !== -1) {
              const wallet = prev.wallets[walletIndex];
              let newChannels = [...wallet.channels];
              if (action === 'DELETE') {
                newChannels = newChannels.filter(c => c.id !== item.id);
              } else {
                newChannels = [...newChannels.filter(c => c.id !== item.id), item];
              }
              const newWallet = { ...wallet, channels: newChannels };
              nextState.wallets = [...prev.wallets];
              nextState.wallets[walletIndex] = newWallet;
            }
            break;

          case 'financial_plans':
            // For plans, we might just trigger a reload or update if we have a state for plans
            // Currently FinanceContext stores 'plans' inside 'financial_plans'? No, checking state def...
            // It seems plans are fetched on demand in components or via specific hooks?
            // Let's check DEFAULT_STATE. If not in state, we don't need to update it here.
            // But if we want the dashboard to update, we might need to trigger loadAppData()
            // Actually, lines 1351 'useEffect(() => { if (syncStatus.lastSyncAt) loadAppData(false); ...' 
            // handles general reloads when sync finishes.
            // But Realtime 'onItemUpdate' is for INSTANT modification.
            break;

          default: break;
        }
        return nextState;
      });
    });
    return unsubscribe;
  }, []);

  const unlockApp = useCallback(async () => {
    try {
      const verified = await biometricService.verifyIdentity();
      if (verified) {
        setState(prev => ({ ...prev, isLocked: false }));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, []);

  useEffect(() => {
    if (syncStatus.lastSyncAt) loadAppData(false);
  }, [syncStatus.lastSyncAt]);

  useEffect(() => {
    setState((prev: AppState) => ({ ...prev, sync_status: syncStatus }));
  }, [syncStatus]);

  const getSyncMetadata = useCallback((isDeleted = false, currentVersion?: number) => {
    return {
      updated_at: offlineSyncService.getPrecisionTimestamp(),
      server_updated_at: 0,
      version: (currentVersion || 0) + 1,
      device_id: databaseKernel.getDeviceId(),
      user_id: state.profile.id || 'unknown',
      is_deleted: isDeleted ? 1 : 0
    };
  }, [state.profile.id]);

  const addTransaction = useCallback(async (t: Omit<Transaction, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 System is in Read-Only mode. Entry blocked.");
      return;
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    // Auto-inject time if date is missing or matches today (AI default)
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const transactionDate = (!t.date || t.date === todayISO) ? now.toISOString() : t.date;
    const newTxn: Transaction = { ...t, date: transactionDate, id, ...meta };
    setState((prev: AppState) => ({ ...prev, transactions: [newTxn, ...prev.transactions] }));
    const dbData = {
      id,
      amount: t.amount,
      date: transactionDate,
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
    await databaseKernel.insert('transactions', dbData, true);
    await offlineSyncService.enqueue('transactions', id, 'INSERT', dbData);

    await offlineSyncService.enqueue('transactions', id, 'INSERT', dbData);

    // REMOVED: Shadow Transaction Mirroring
    // Dynamic Wallet Architecture calculates primary balances on the fly.
    // No sub-ledger sync entries are created in the database.
  }, [state, getSyncMetadata]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 System is in Read-Only mode. Edit blocked.");
      return;
    }
    const currentTx = state.transactions.find(t => t.id === id);
    if (!currentTx) return;

    const meta = { ...getSyncMetadata(), version: (currentTx.version || 0) + 1 };
    const updatedTx = { ...currentTx, ...updates, ...meta };

    // Update state
    setState((prev: AppState) => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? updatedTx : t)
    }));

    // Update DB & Sync
    const dbData = {
      amount: updatedTx.amount,
      date: updatedTx.date,
      wallet_id: updatedTx.walletId,
      channel_type: updatedTx.channelType,
      category_id: updatedTx.categoryId,
      note: updatedTx.note,
      type: updatedTx.type,
      is_split: updatedTx.isSplit ? 1 : 0,
      to_wallet_id: updatedTx.toWalletId,
      to_channel_type: updatedTx.toChannelType,
      linked_transaction_id: updatedTx.linkedTransactionId,
      ...meta
    };
    await databaseKernel.update('transactions', id, dbData);
    await offlineSyncService.enqueue('transactions', id, 'UPDATE', { id, ...dbData });

    // Handle Linked Reference Transactions (Sub-ledger)
    const linkedTx = state.transactions.find(t => t.linkedTransactionId === id && t.isSubLedgerSync);
    if (linkedTx) {
      const refUpdates: Partial<Transaction> = {
        amount: updatedTx.amount,
        date: updatedTx.date,
        categoryId: updatedTx.categoryId,
        note: `[Ref] ${updatedTx.note || 'Transaction'} (via ${linkedTx.subLedgerName})`
      };
      await updateTransaction(linkedTx.id, refUpdates);
    }
  }, [state, getSyncMetadata]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 System is in Read-Only mode. Deletion blocked.");
      return;
    }
    const transactionToDelete = state.transactions.find(t => t.id === id);
    if (!transactionToDelete) return;
    const relatedIds = new Set<string>();
    relatedIds.add(id);
    state.transactions.filter(t => t.linkedTransactionId === id).forEach(t => relatedIds.add(t.id));
    if (transactionToDelete.linkedTransactionId) relatedIds.add(transactionToDelete.linkedTransactionId);
    const relatedIdArray = Array.from(relatedIds);
    const relatedTransactions = state.transactions.filter(t => relatedIdArray.includes(t.id));

    setState((prev: AppState) => ({
      ...prev,
      transactions: prev.transactions.filter((t: Transaction) => !relatedIdArray.includes(t.id)),
      deleteProgress: { ...prev.deleteProgress, auditLog: [] },
      undoStack: [...prev.undoStack, {
        type: 'transaction' as 'transaction',
        data: relatedTransactions.length === 1 ? relatedTransactions[0] : { id: transactionToDelete.id, name: transactionToDelete.note || 'Transaction', isGroup: true, items: relatedTransactions },
        timestamp: Date.now()
      } as UndoItem].slice(-5)
    }));

    // INITIALIZE PROGRESS
    const total = relatedIdArray.length;
    setState(prev => ({
      ...prev,
      deleteProgress: { total, current: 0, itemName: transactionToDelete.note || 'Transaction', isDeleting: true, status: 'Removing records...', auditLog: [`[SYSTEM] Starting wipe for transaction: ${id}`] }
    }));

    // BACKGROUND TASKS
    (async () => {
      try {
        let current = 0;
        for (const dId of relatedIdArray) {
          current++;
          const itemToDelete = state.transactions.find(t => t.id === dId);
          setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, current, status: `Removing: ${itemToDelete?.note || 'Linked Record'}`, auditLog: [...prev.deleteProgress.auditLog, `[CLEANUP] Deleted record: ${dId.slice(0, 8)}`] } }));

          const meta = getSyncMetadata(true, itemToDelete?.version);
          await databaseKernel.delete('transactions', dId, meta.version);
          await offlineSyncService.enqueue('transactions', dId, 'DELETE', { id: dId, ...meta });
        }
        await loadAppData(false);
        setTimeout(() => {
          setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, isDeleting: false } }));
        }, 800);
      } catch (e) {
        console.error("❌ [Background] Transaction deletion failed:", e);
        setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, isDeleting: false } }));
      }
    })();
  }, [state, getSyncMetadata]);

  const addWallet = useCallback(async (w: Omit<Wallet, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Blocked.");
      return;
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const dbData = { id, name: w.name, currency: w.currency, initial_balance: w.initialBalance, color: w.color, icon: w.icon, is_visible: w.isVisible ? 1 : 0, is_primary: w.isPrimary ? 1 : 0, uses_primary_income: w.usesPrimaryIncome ? 1 : 0, parent_wallet_id: w.parentWalletId || null, ...meta };
    await databaseKernel.insert('wallets', dbData);
    const channelsWithIds: Channel[] = [];
    const newWallet: Wallet = { ...w, id, channels: channelsWithIds, ...meta };
    setState((prev: AppState) => ({ ...prev, wallets: [...prev.wallets, newWallet] }));

    (async () => {
      try {
        for (const ch of w.channels) {
          const chId = await databaseKernel.generateId();
          await databaseKernel.insert('channels', { id: chId, wallet_id: id, type: ch.type, balance: ch.balance, ...meta });
          channelsWithIds.push({ ...ch, id: chId });
        }

        // DYNAMIC WALLET LOGIC: Auto-Create Channel for Parent
        if (w.parentWalletId) {
          const parent = state.wallets.find(p => p.id === w.parentWalletId);
          if (parent) {
            for (const ch of w.channels) {
              const parentHasChannel = parent.channels.some(pc => pc.type === ch.type);
              if (!parentHasChannel) {
                console.log(`⚡ [Auto-Channel] Adding missing channel '${ch.type}' to Parent '${parent.name}'`);
                const newChId = await databaseKernel.generateId();
                const newChData = { id: newChId, wallet_id: parent.id, type: ch.type, balance: 0, ...meta }; // 0 balance principal
                await databaseKernel.insert('channels', newChData);
                await offlineSyncService.enqueue('channels', newChId, 'INSERT', newChData);
              }
            }
          }
        }

        setState((prev: AppState) => ({
          ...prev,
          wallets: prev.wallets.map(w => w.id === id ? { ...newWallet, channels: channelsWithIds } : w)
        }));
        await offlineSyncService.enqueue('wallets', id, 'INSERT', dbData);
        await loadAppData(true);
      } catch (e) { console.error(e); }
    })();
  }, [state, getSyncMetadata, loadAppData]);

  const updateWallet = useCallback(async (id: string, updates: Partial<Wallet>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Selection blocked.");
      return;
    }
    const wallet = state.wallets.find(w => w.id === id);
    if (!wallet) return;

    const meta = { ...getSyncMetadata(), version: (wallet.version || 0) + 1 };
    const dbUpdates: any = { ...meta };
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.currency) dbUpdates.currency = updates.currency;
    if (updates.initialBalance !== undefined) dbUpdates.initial_balance = updates.initialBalance;
    if (updates.color) dbUpdates.color = updates.color;
    if (updates.isVisible !== undefined) dbUpdates.is_visible = updates.isVisible ? 1 : 0;
    if (updates.isPrimary !== undefined) dbUpdates.is_primary = updates.isPrimary ? 1 : 0;
    if (updates.usesPrimaryIncome !== undefined) dbUpdates.uses_primary_income = updates.usesPrimaryIncome ? 1 : 0;
    if (updates.parentWalletId !== undefined) dbUpdates.parent_wallet_id = updates.parentWalletId;

    // 1. OPTIMISTIC UI: Instant visual update
    const updatedWallet: Wallet = {
      ...wallet,
      ...updates,
      version: meta.version,
      updated_at: meta.updated_at
    };

    setState((prev: AppState) => ({
      ...prev,
      wallets: prev.wallets.map(w => w.id === id ? updatedWallet : w)
    }));

    // 2. PRIMARY PERSISTENCE: Save the core wallet record
    await databaseKernel.update('wallets', id, dbUpdates);

    // 3. BACKGROUND TASKS: Resolve this function early to close the modal, 
    // but continue secondary updates in the background.
    (async () => {
      try {
        let updatedChannels = [...(wallet.channels || [])];
        if (updates.channels) {
          const existingRaw = await databaseKernel.query('channels', 'wallet_id = ? AND is_deleted = 0', [id]);
          const existingIds = existingRaw.map((r: any) => r.id);
          const newIds = updates.channels.map(c => c.id);
          const toDeleteIds = existingIds.filter((eid: string) => !newIds.includes(eid));

          for (const delId of toDeleteIds) {
            const chItem = (existingRaw as any[]).find(r => r.id === delId);
            const chMeta = getSyncMetadata(true, chItem?.version);
            await databaseKernel.delete('channels', delId, chMeta.version);
            await offlineSyncService.enqueue('channels', delId, 'DELETE', { id: delId, ...chMeta });
            updatedChannels = updatedChannels.filter(c => c.id !== delId);
          }

          const finalChannels: Channel[] = [];
          for (const ch of updates.channels) {
            const chId = ch.id || await databaseKernel.generateId();
            const chData = { id: chId, wallet_id: id, type: ch.type, balance: ch.balance, ...getSyncMetadata(false, ch.version) };
            await databaseKernel.insert('channels', chData, true);
            await offlineSyncService.enqueue('channels', chId, 'INSERT', chData);
            finalChannels.push({ ...ch, id: chId, wallet_id: id, ...getSyncMetadata(false, ch.version) });
          }
          updatedChannels = finalChannels;

          // Background state sync for channels
          setState((prev: AppState) => ({
            ...prev,
            wallets: prev.wallets.map(w => w.id === id ? { ...updatedWallet, channels: updatedChannels } : w)
          }));
        }

        // Pushing to sync queue
        await offlineSyncService.enqueue('wallets', id, 'UPDATE', { id, ...dbUpdates });

        // Background reload for derived state
        await loadAppData(false);
        console.log("✅ [Background] Wallet persistence complete.");
      } catch (e) {
        console.error("❌ [Background] Wallet persistence failed:", e);
      }
    })();

    return; // Resolve immediately!
  }, [state, getSyncMetadata, loadAppData]);

  const deleteWallet = useCallback(async (id: string, cascade: boolean = false) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Deletion blocked.");
      return;
    }
    const walletToDelete = state.wallets.find(w => w.id === id);
    if (!walletToDelete) return;

    const meta = getSyncMetadata(true, walletToDelete?.version);

    // 1. Calculate items for progress
    const relatedTxns = cascade ? state.transactions.filter(t => t.walletId === id) : [];
    const relatedChannelsRaw = cascade ? await databaseKernel.query('channels', 'wallet_id = ? AND is_deleted = 0', [id]) : [];
    const total = (cascade ? (relatedTxns.length + (relatedChannelsRaw as any[]).length) : 0) + 1;

    // 2. Initialize progress
    setState(prev => ({
      ...prev,
      deleteProgress: {
        total,
        current: 0,
        itemName: walletToDelete.name,
        isDeleting: true,
        status: 'Initializing high-speed sweep...',
        auditLog: [`[SYSTEM] Starting recursive wipe for wallet: ${walletToDelete.name}`]
      }
    }));

    let current = 0;

    const updateProgress = (log: string) => {
      current++;
      setState(prev => ({
        ...prev,
        deleteProgress: {
          ...prev.deleteProgress,
          current,
          status: log,
          auditLog: [...prev.deleteProgress.auditLog, `[CLEANUP] ${log}`].slice(-50) // Keep last 50
        }
      }));
    };

    if (cascade) {
      // Parallel Chunking for Transactions (groups of 5)
      const txnChunks = [];
      for (let i = 0; i < relatedTxns.length; i += 5) {
        txnChunks.push(relatedTxns.slice(i, i + 5));
      }

      for (const chunk of txnChunks) {
        await Promise.all(chunk.map(async (t) => {
          const txMeta = getSyncMetadata(true, t.version);
          await databaseKernel.delete('transactions', t.id, txMeta.version);
          await offlineSyncService.enqueue('transactions', t.id, 'DELETE', { id: t.id, ...txMeta });
          updateProgress(`Wiped Transaction: ${t.note || t.id.slice(0, 8)}`);
        }));
      }

      // Parallel Chunking for Channels
      const channelChunks = [];
      const channels = relatedChannelsRaw as any[];
      for (let i = 0; i < channels.length; i += 5) {
        channelChunks.push(channels.slice(i, i + 5));
      }

      for (const chunk of channelChunks) {
        await Promise.all(chunk.map(async (ch) => {
          const chMeta = getSyncMetadata(true, ch.version);
          await databaseKernel.delete('channels', ch.id, chMeta.version);
          await offlineSyncService.enqueue('channels', ch.id, 'DELETE', { id: ch.id, ...chMeta });
          updateProgress(`Closing Channel: ${ch.type}`);
        }));
      }
    }

    // 3. Delete Wallet
    updateProgress(`Finalizing wallet: ${walletToDelete.name}`);

    // Push to undo stack before state wipe
    const undoItem: UndoItem = {
      type: 'wallet',
      data: { ...walletToDelete, channels: relatedChannelsRaw, transactions: relatedTxns },
      timestamp: Date.now()
    };

    setState((prev: AppState) => ({
      ...prev,
      wallets: prev.wallets.filter((w: Wallet) => w.id !== id),
      undoStack: [...prev.undoStack, undoItem].slice(-5) // Keep last 5 actions
    }));

    await databaseKernel.delete('wallets', id, meta.version);
    await offlineSyncService.enqueue('wallets', id, 'DELETE', { id, ...meta });

    // 4. Reset progress with a small delay for feedback visibility
    setTimeout(() => {
      setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, isDeleting: false, current: 0, total: 0 } }));
    }, 1500); // 1.5s for "Operations Complete" visibility

  }, [state, getSyncMetadata]);

  const undoDeletion = useCallback(async () => {
    const item = state.undoStack[state.undoStack.length - 1];
    if (!item) return;

    console.log("⏪ [Premium] Restoring record:", item.type, item.data.id);

    try {
      const now = Date.now();
      const meta = getSyncMetadata();

      const undeleteRow = async (table: string, id: string, version: number) => {
        const nextVer = version + 1;
        await databaseKernel.run(
          `UPDATE ${table} SET is_deleted = 0, updated_at = ?, version = ? WHERE id = ?`,
          [now, nextVer, id]
        );
        // Important: Enqueue an UPDATE to sync the "undelete" status Upwards
        await offlineSyncService.enqueue(table, id, 'UPDATE', { id, is_deleted: 0, updated_at: now, version: nextVer });
      };

      if (item.type === 'wallet') {
        const wallet = item.data;
        // 1. Restore Wallet
        await undeleteRow('wallets', wallet.id, wallet.version || 1);

        // 2. Restore Channels
        if (wallet.channels) {
          for (const ch of wallet.channels) {
            await undeleteRow('channels', ch.id, ch.version || 1);
          }
        }

        // 3. Restore Transactions
        if (wallet.transactions) {
          for (const tx of wallet.transactions) {
            await undeleteRow('transactions', tx.id, tx.version || 1);
          }
        }
      } else if (item.data && item.data.isGroup && item.data.items) {
        // Group Restoration (e.g. Linked Transactions)
        for (const subItem of item.data.items) {
          const tableName = item.type === 'transaction' ? 'transactions' : '';
          if (tableName) {
            await undeleteRow(tableName, subItem.id, subItem.version || 1);
          }
        }
      } else {
        // Generic restoration for other types
        const tableMap: Record<string, string> = {
          'transaction': 'transactions',
          'category': 'categories_user',
          'budget': 'budgets',
          'commitment': 'commitments',
          'plan': 'financial_plans',
          'component': 'financial_plan_components',
          'settlement': 'financial_plan_settlements'
        };
        const tableName = tableMap[item.type];
        if (tableName) {
          await undeleteRow(tableName, item.data.id, item.data.version || 1);
        }
      }

      // Cleanup stack and reload view
      setState(prev => ({ ...prev, undoStack: prev.undoStack.slice(0, -1) }));
      await loadAppData(false);

      console.log("✅ [Premium] Restoration successful.");
    } catch (error) {
      console.error("❌ [Undo] Restoration failed:", error);
    }
  }, [state.undoStack, getSyncMetadata, loadAppData]);

  const setPrimaryWallet = useCallback((id: string) => {
    setState((prev: AppState) => ({ ...prev, wallets: prev.wallets.map((w: Wallet) => ({ ...w, isPrimary: w.id === id })) }));
    updateWallet(id, { isPrimary: true });
    state.wallets.filter(w => w.id !== id && w.isPrimary).forEach(w => updateWallet(w.id, { isPrimary: false }));
  }, [state.wallets, updateWallet]);

  const addCategory = useCallback(async (c: Omit<Category, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Categories locked.");
      return;
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const category: Category = { ...c, id, ...meta };
    setState((prev: AppState) => ({ ...prev, categories: [...prev.categories, category] }));
    const dbData = {
      id, name: c.name, icon: c.icon, color: c.color, type: c.type,
      parent_id: c.parentId || null, "order": c.order,
      embedding: c.embedding ? JSON.stringify(c.embedding) : null,
      ...meta
    };
    await databaseKernel.insert('categories_user', dbData);
    await offlineSyncService.enqueue('categories_user', id, 'INSERT', dbData);
  }, [state, getSyncMetadata]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Update blocked.");
      return;
    }
    const category = state.categories.find(c => c.id === id);
    const nextVer = (category?.version || 1) + 1;

    setState((prev: AppState) => ({ ...prev, categories: prev.categories.map((c: Category) => c.id === id ? { ...c, ...updates, version: nextVer } : c) }));
    const dbUpdates: any = { ...getSyncMetadata(), version: nextVer };
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.icon) dbUpdates.icon = updates.icon;
    if (updates.color) dbUpdates.color = updates.color;
    if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId;
    if (updates.order !== undefined) dbUpdates["order"] = updates.order;
    if (updates.isDisabled !== undefined) dbUpdates.is_disabled = updates.isDisabled ? 1 : 0;
    if (updates.embedding) dbUpdates.embedding = JSON.stringify(updates.embedding);

    await databaseKernel.update('categories_user', id, dbUpdates);
    await offlineSyncService.enqueue('categories_user', id, 'UPDATE', { id, ...dbUpdates });
    await loadAppData(false);
  }, [state, getSyncMetadata, loadAppData]);

  const toggleCategoryStatus = useCallback(async (id: string) => {
    const cat = state.categories.find(c => c.id === id);
    if (cat) await updateCategory(id, { isDisabled: !cat.isDisabled });
  }, [state.categories, updateCategory]);

  const deleteCategory = useCallback(async (id: string) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: System locked.");
      return;
    }
    const category = state.categories.find(c => c.id === id);
    if (!category) return;

    setState(prev => ({
      ...prev,
      deleteProgress: { total: 1, current: 0, itemName: category.name, isDeleting: true, status: 'Removing category...', auditLog: [`[SYSTEM] Removing category: ${category.name}`] }
    }));

    const meta = getSyncMetadata(true, category?.version);
    setState((prev: AppState) => ({
      ...prev,
      categories: prev.categories.filter((c: Category) => c.id !== id),
      undoStack: [...prev.undoStack, { type: 'category' as 'category', data: category, timestamp: Date.now() } as UndoItem].slice(-5)
    }));
    await databaseKernel.delete('categories_user', id, meta.version);
    await offlineSyncService.enqueue('categories_user', id, 'DELETE', { id, ...meta });

    setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, current: 1, status: 'Removed' } }));
    setTimeout(() => {
      setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, isDeleting: false, auditLog: [] } }));
    }, 800);
  }, [state.categories, getSyncMetadata]);

  const addCommitment = useCallback(async (c: Omit<Commitment, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Commitments locked.");
      return;
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const history: CommitmentEvent[] = [{ type: 'CREATED', date: new Date().toISOString() }];
    const commitment: Commitment = { ...c, id, status: 'ACTIVE', history, ...meta };
    setState((prev: AppState) => ({ ...prev, commitments: [...prev.commitments, commitment] }));
    const dbData = {
      id, name: c.name, amount: c.amount, frequency: c.frequency, certainty_level: c.certaintyLevel,
      type: c.type, wallet_id: c.walletId, category_id: c.categoryId, next_date: c.nextDate, status: 'ACTIVE',
      is_recurring: c.isRecurring ? 1 : 0,
      history: JSON.stringify(history),
      ...meta
    };
    await databaseKernel.insert('commitments', dbData);
    await offlineSyncService.enqueue('commitments', id, 'INSERT', dbData);
  }, [getSyncMetadata]);

  const updateCommitment = useCallback(async (id: string, updates: Partial<Commitment>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Blocked.");
      return;
    }
    const commitment = state.commitments.find(c => c.id === id);
    const nextVer = (commitment?.version || 1) + 1;

    setState((prev: AppState) => ({ ...prev, commitments: prev.commitments.map((c: Commitment) => c.id === id ? { ...c, ...updates, version: nextVer } : c) }));
    const dbUpdates: any = { ...getSyncMetadata(), version: nextVer };
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.frequency) dbUpdates.frequency = updates.frequency;
    if (updates.certaintyLevel) dbUpdates.certainty_level = updates.certaintyLevel;
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.walletId !== undefined) dbUpdates.wallet_id = updates.walletId;
    if (updates.nextDate) dbUpdates.next_date = updates.nextDate;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring ? 1 : 0;
    if (updates.history) dbUpdates.history = JSON.stringify(updates.history);

    await databaseKernel.update('commitments', id, dbUpdates);
    await offlineSyncService.enqueue('commitments', id, 'UPDATE', { id, ...dbUpdates });
    await loadAppData(false);
  }, [state.commitments, getSyncMetadata, loadAppData]);

  const settleCommitment = useCallback(async (commitmentId: string, walletId: string, channelType: string, keepRecurring = false) => {
    const commitment = state.commitments.find(c => c.id === commitmentId);
    if (!commitment) return;

    const sourceTxId = await databaseKernel.generateId();
    const meta = getSyncMetadata();

    // Auto-inject time if date is missing or matches today (AI default) - Consistent with addTransaction
    const now = new Date();
    const transactionDate = now.toISOString();

    const sourceTx: Transaction = {
      id: sourceTxId,
      amount: commitment.amount,
      date: transactionDate,
      walletId: walletId,
      channelType: channelType,
      note: `Settlement: ${commitment.name}`,
      type: MasterCategoryType.EXPENSE,
      categoryId: commitment.categoryId || '',
      subLedgerId: commitment.id,
      subLedgerName: commitment.name,
      isSplit: false,
      splits: [],
      ...meta
    };

    // DB Data (snake_case)
    const sourceDbData = {
      id: sourceTxId,
      amount: commitment.amount,
      date: transactionDate,
      wallet_id: walletId,
      channel_type: channelType,
      note: `Settlement: ${commitment.name}`,
      type: MasterCategoryType.EXPENSE,
      category_id: commitment.categoryId || null,
      sub_ledger_id: commitment.id,
      sub_ledger_name: commitment.name,
      ...meta
    };

    // 1. Insert Main Transaction
    setState((prev: AppState) => ({ ...prev, transactions: [sourceTx, ...prev.transactions] }));
    await databaseKernel.insert('transactions', sourceDbData);
    await offlineSyncService.enqueue('transactions', sourceTxId, 'INSERT', sourceDbData);

    // 2. Handle Sub-Wallet / Parent Wallet Logic (Fix for Missing Parent Transaction)
    const wallet = state.wallets.find(w => w.id === walletId);
    console.log(`[Settlement] Processing wallet: ${wallet?.name} (${wallet?.id})`);

    if (wallet?.parentWalletId) {
      console.log(`[Settlement] Sub-wallet detected. Parent ID: ${wallet.parentWalletId}`);
      const parentWallet = state.wallets.find(pw => pw.id === wallet.parentWalletId);

      if (parentWallet) {
        console.log(`[Settlement] Parent wallet found: ${parentWallet.name}`);
        // Find matching channel in parent or default to first
        // Strict matching first, then fallback
        // DYNAMIC WALLET UPDATE:
        // We no longer create shadow transactions for settlements either.
        // The sub-wallet transaction is sufficient.
        // The RefTxn block has been removed.
      } else {
        console.warn(`[Settlement] Parent wallet not found in state.`);
      }
    } else {
      console.log(`[Settlement] No parent wallet ID found on source wallet.`);
    }

    const walletName = state.wallets.find(w => w.id === walletId)?.name || 'Unknown Wallet';
    const newHistory: CommitmentEvent[] = [...(commitment.history || []), {
      type: 'SETTLED',
      date: new Date().toISOString(),
      amount: commitment.amount,
      note: `Settled via ${walletName} (${channelType})`
    }];

    if (keepRecurring || commitment.isRecurring) {
      // Calculate next month same day accurately
      const nextMonthDate = addMonths(parseISO(commitment.nextDate), 1);
      await updateCommitment(commitmentId, {
        nextDate: nextMonthDate.toISOString(),
        status: 'ACTIVE',
        isRecurring: true,
        history: newHistory
      });
    } else {
      await updateCommitment(commitmentId, { status: 'SETTLED', history: newHistory });
    }
    await loadAppData(false);
  }, [state.commitments, state.wallets, updateCommitment, getSyncMetadata, loadAppData]);

  const extendCommitmentDate = useCallback(async (commitmentId: string, newDate: string) => {
    const commitment = state.commitments.find(c => c.id === commitmentId);
    if (!commitment) return;
    const newHistory: CommitmentEvent[] = [...(commitment.history || []), {
      type: 'POSTPONED',
      date: new Date().toISOString(),
      originalDate: commitment.nextDate,
      note: `Shifted to ${format(parseISO(newDate), 'MMM dd, yyyy')}`
    }];
    await updateCommitment(commitmentId, { nextDate: newDate, history: newHistory });
  }, [state.commitments, updateCommitment]);

  const postponeCommitment = useCallback(async (commitmentId: string, days: number | 'EOM') => {
    const commitment = state.commitments.find(c => c.id === commitmentId);
    if (!commitment) return;
    let newDate: string;
    if (days === 'EOM') {
      newDate = lastDayOfMonth(parseISO(commitment.nextDate)).toISOString();
    } else {
      newDate = addDays(parseISO(commitment.nextDate), days).toISOString();
    }
    await extendCommitmentDate(commitmentId, newDate);
  }, [state.commitments, extendCommitmentDate]);

  const suggestedObligationNames = useMemo(() => {
    const names = state.commitments.map(c => c.name);
    return Array.from(new Set(names));
  }, [state.commitments]);

  const deleteCommitment = useCallback(async (id: string) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Deletion blocked.");
      return;
    }
    const cm = state.commitments.find(c => c.id === id);
    if (!cm) return;

    setState(prev => ({
      ...prev,
      deleteProgress: { total: 1, current: 0, itemName: cm.name, isDeleting: true, status: 'Removing commitment...', auditLog: [`[SYSTEM] Terminating obligation: ${cm.name}`] }
    }));

    const meta = getSyncMetadata(true, cm?.version);
    setState((prev: AppState) => ({
      ...prev,
      commitments: prev.commitments.filter((c: Commitment) => c.id !== id),
      undoStack: [...prev.undoStack, { type: 'commitment' as 'commitment', data: cm, timestamp: Date.now() } as UndoItem].slice(-5)
    }));
    await databaseKernel.delete('commitments', id, meta.version);
    await offlineSyncService.enqueue('commitments', id, 'DELETE', { id, ...meta });

    setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, current: 1, status: 'Removed' } }));
    setTimeout(() => {
      setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, isDeleting: false, auditLog: [] } }));
    }, 800);
  }, [getSyncMetadata, state.commitments]);

  const addTransfer = useCallback(async (t: Omit<Transfer, keyof SyncBase | 'id'>) => {
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const dbData = { id, from_wallet_id: t.from_wallet_id, to_wallet_id: t.to_wallet_id, from_channel: t.from_channel, to_channel: t.to_channel, amount: t.amount, date: t.date, note: t.note, ...meta };
    await databaseKernel.insert('transfers', dbData);
    await offlineSyncService.enqueue('transfers', id, 'INSERT', dbData);
    const sourceTxId = await databaseKernel.generateId();
    const sourceTx = { id: sourceTxId, amount: t.amount, date: t.date, wallet_id: t.from_wallet_id, channel_type: t.from_channel, note: t.note || 'Transfer', type: MasterCategoryType.TRANSFER, to_wallet_id: t.to_wallet_id, to_channel_type: t.to_channel, linked_transaction_id: id, ...meta };
    await databaseKernel.insert('transactions', sourceTx);
    await offlineSyncService.enqueue('transactions', sourceTxId, 'INSERT', sourceTx);
    await loadAppData(false);
  }, [getSyncMetadata, loadAppData]);

  const updateProfile = useCallback(async (profileUpdates: Partial<UserProfile>) => {
    setState((prev: AppState) => ({ ...prev, profile: { ...prev.profile, ...profileUpdates } }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const dbUpdates = {
        id: user.id,
        email: user.email,
        name: profileUpdates.name || state.profile.name,
        role: state.profile.role,
        is_super_admin: state.profile.isSuperAdmin ? 1 : 0,
        organization_id: state.profile.organizationId,
        ...getSyncMetadata()
      };
      await databaseKernel.insert('profiles', dbUpdates, true);
      await offlineSyncService.enqueue('profiles', user.id, 'UPDATE', dbUpdates);
    }
  }, [state.profile, getSyncMetadata]);

  const updateSettings = useCallback(async (settingsUpdates: Partial<AppSettings>) => {
    console.log('⚙️ updateSettings called with:', settingsUpdates);

    // If updating geminiKeys, save to localStorage for AI service (GLOBAL ONLY)
    if ('geminiKeys' in settingsUpdates) {
      const gKeys = settingsUpdates.geminiKeys as GeminiKeyConfig[];
      const currentKeys = JSON.stringify(state.globalGeminiKeys || []);
      const newKeysJSON = JSON.stringify(gKeys);

      if (currentKeys !== newKeysJSON) {
        localStorage.setItem('finos_global_ai_keys', newKeysJSON);
        setState(prev => ({ ...prev, globalGeminiKeys: gKeys }));

        if (state.profile.isSuperAdmin) {
          console.log('🌐 [Admin] Pushing Global AI Keys to Supabase (Dual-Key Sync)...');
          Promise.all([
            supabase.from('system_config').upsert({ key: 'global_ai_keys', value: gKeys }, { onConflict: 'key' }),
            supabase.from('system_config').upsert({ key: 'global_ai_key', value: gKeys }, { onConflict: 'key' })
          ]).then((results) => {
            const errors = results.filter(r => r.error);
            if (errors.length > 0) {
              console.error("❌ [Admin] Global Key Sync FAILED:", errors[0].error);
            } else {
              console.log("✅ [Admin] Global Key Sync SUCCESS (Dual-Key).");
              offlineSyncService.incrementGlobalVersion('global_ai_keys');
              offlineSyncService.incrementGlobalVersion('global_ai_key');
            }
          });
        }
      }
    }

    // Handle Preferred Model
    if ('preferredGeminiModel' in settingsUpdates && state.profile.isSuperAdmin) {
      if (settingsUpdates.preferredGeminiModel !== state.settings.preferredGeminiModel) {
        console.log('🌐 [Admin] Pushing Global AI Model to Supabase...');
        supabase.from('system_config')
          .upsert({ key: 'global_ai_model', value: settingsUpdates.preferredGeminiModel }, { onConflict: 'key' })
          .then(({ error }) => {
            if (error) console.error("❌ [Admin] Global Model Sync FAILED:", error);
            else offlineSyncService.incrementGlobalVersion('global_ai_model');
          });
      }
    }

    // Handle Legacy Custom Key (Global Sync)
    if ('customGeminiKey' in settingsUpdates && state.profile.isSuperAdmin) {
      supabase.from('system_config')
        .upsert({ key: 'global_custom_gemini_key', value: settingsUpdates.customGeminiKey }, { onConflict: 'key' })
        .then(({ error }) => {
          if (error) console.error("❌ [Admin] Global Custom Key Sync FAILED:", error);
          else offlineSyncService.incrementGlobalVersion('global_custom_gemini_key');
        });
    }

    // Handle Branding (App Name & Logo) - Global Sync
    if ('customAppName' in settingsUpdates && state.profile.isSuperAdmin) {
      supabase.from('system_config')
        .upsert({ key: 'global_app_name', value: settingsUpdates.customAppName }, { onConflict: 'key' })
        .then(({ error }) => {
          if (error) console.error("❌ [Admin] Global App Name Sync FAILED:", error);
          else offlineSyncService.incrementGlobalVersion('global_app_name');
        });
    }
    if ('customLogoUrl' in settingsUpdates && state.profile.isSuperAdmin) {
      supabase.from('system_config')
        .upsert({ key: 'global_logo_url', value: settingsUpdates.customLogoUrl }, { onConflict: 'key' })
        .then(({ error }) => {
          if (error) console.error("❌ [Admin] Global Logo Sync FAILED:", error);
          else offlineSyncService.incrementGlobalVersion('global_logo_url');
        });
    }

    // Handle AI Insights - Global Sync
    if ('globalAiInsights' in settingsUpdates && settingsUpdates.globalAiInsights) {
      localStorage.setItem('finos_global_ai_insights', JSON.stringify(settingsUpdates.globalAiInsights));
      if (state.profile.isSuperAdmin) {
        supabase.from('system_config')
          .upsert({ key: 'global_ai_insights', value: JSON.stringify(settingsUpdates.globalAiInsights) }, { onConflict: 'key' })
          .then(({ error }) => {
            if (error) console.error("❌ [Admin] Global AI Insights Sync FAILED:", error);
            else offlineSyncService.incrementGlobalVersion('global_ai_insights');
          });
      }
    }

    // Handle Supabase Configuration - Global Sync (MANAGEMENT ACCESS)
    if ('customSupabaseUrl' in settingsUpdates && state.profile.isSuperAdmin) {
      console.log('🌐 [Admin] Pushing Global Supabase URL...');
      supabase.from('system_config')
        .upsert({ key: 'global_supabase_url', value: settingsUpdates.customSupabaseUrl }, { onConflict: 'key' })
        .then(({ error }) => {
          if (error) console.error("❌ [Admin] Global Supabase URL Sync FAILED:", error);
          else offlineSyncService.incrementGlobalVersion('global_supabase_url');
        });
    }
    if ('customSupabaseKey' in settingsUpdates && state.profile.isSuperAdmin) {
      console.log('🌐 [Admin] Pushing Global Supabase Key...');
      supabase.from('system_config')
        .upsert({ key: 'global_supabase_key', value: settingsUpdates.customSupabaseKey }, { onConflict: 'key' })
        .then(({ error }) => {
          if (error) console.error("❌ [Admin] Global Supabase Key Sync FAILED:", error);
          else offlineSyncService.incrementGlobalVersion('global_supabase_key');
        });
    }

    // Remove personal overrides for non-admins to ensure centralized control
    if (!state.profile.isSuperAdmin && ('customSupabaseUrl' in settingsUpdates || 'customSupabaseKey' in settingsUpdates)) {
      console.warn("🔒 Non-admin attempted to override Supabase config. Blocked.");
      delete settingsUpdates.customSupabaseUrl;
      delete settingsUpdates.customSupabaseKey;
    }

    // If updating logo, save to localStorage immediately for persistence
    if ('customLogoUrl' in settingsUpdates) {
      if (settingsUpdates.customLogoUrl) {
        localStorage.setItem('finos_custom_logo_url', settingsUpdates.customLogoUrl);
        console.log('💾 Saved logo to localStorage:', settingsUpdates.customLogoUrl);
      } else {
        localStorage.removeItem('finos_custom_logo_url');
        console.log('🗑️ Removed logo from localStorage');
      }
    }

    // Use functional state updates to avoid stale closures
    let currentSettings: AppSettings;
    let currentProfile: UserProfile;

    setState(prev => {
      const nextSettings = { ...prev.settings, ...settingsUpdates };
      currentSettings = nextSettings;
      currentProfile = prev.profile;
      return { ...prev, settings: nextSettings };
    });

    // Persist to database using the fresh settings
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Functional update pattern ensures we always have the latest profile version
      setState(prev => {
        const nextVer = (prev.profile.version || 1) + 1;
        const s = { ...prev.settings, ...settingsUpdates }; // Final confirmation of settings

        const dbUpdates: any = {
          id: user.id, email: user.email, name: prev.profile.name,
          role: prev.profile.role,
          is_super_admin: prev.profile.isSuperAdmin ? 1 : 0,
          organization_id: prev.profile.organizationId,
          currency: s.currency,
          theme: s.theme,
          ai_enabled: s.aiEnabled ? 1 : 0,
          biometric_enabled: s.biometricEnabled ? 1 : 0,
          accent_color: s.accentColor,
          language: s.language,
          privacy_mode: s.privacyMode ? 1 : 0,
          glass_intensity: s.glassIntensity,
          budget_start_day: s.budgetStartDay,
          haptic_enabled: s.hapticEnabled ? 1 : 0,
          animation_speed: s.animationSpeed,
          default_wallet_id: s.defaultWalletId,
          auto_sync: s.autoSync ? 1 : 0,
          decimal_places: s.decimalPlaces,
          show_health_score: s.showHealthScore ? 1 : 0,
          compact_mode: s.compactMode ? 1 : 0,
          low_balance_threshold: s.lowBalanceThreshold,
          font_family: s.fontFamily,
          animation_intensity: s.animationIntensity,
          biometric_lock_timeout: s.biometricLockTimeout,
          sound_effects_enabled: s.soundEffectsEnabled ? 1 : 0,
          is_admin_enabled: s.isAdminEnabled ? 1 : 0,
          custom_gemini_key: s.customGeminiKey,
          custom_supabase_url: s.customSupabaseUrl,
          is_read_only: s.isReadOnly ? 1 : 0,
          maintenance_mode: s.maintenanceMode ? 1 : 0,
          custom_app_name: s.customAppName,
          glass_effects_enabled: s.glassEffectsEnabled ? 1 : 0,
          custom_logo_url: s.customLogoUrl,
          preferred_gemini_key_id: s.preferredGeminiKeyID,
          preferred_gemini_model: s.preferredGeminiModel,
          ...getSyncMetadata(),
          user_id: user.id, // Explicitly set user_id for profiles table
          version: nextVer
        };

        // Perform side-effects outside of the return, or better, use a microtask
        (async () => {
          console.log('💾 Saving to database (System Config Sync enabled)');
          await databaseKernel.insert('profiles', dbUpdates, true);
          await offlineSyncService.enqueue('profiles', user.id, 'UPDATE', dbUpdates);
        })();

        return { ...prev, settings: s, profile: { ...prev.profile, version: nextVer } };
      });
    }
  }, [state, getSyncMetadata]);

  // Listen for Gemini Service updates (Cloud Sync Bridge)
  // MOVED HERE to avoid ReferenceError (updateSettings was not defined yet)
  useEffect(() => {
    const handleSettingsUpdate = ((e: CustomEvent) => {
      console.log('☁️ [FinanceContext] Syncing AI Preference to Cloud:', e.detail);
      updateSettings(e.detail);
    }) as EventListener;

    if (typeof window !== 'undefined') {
      window.addEventListener('FINOS_SETTINGS_UPDATE', handleSettingsUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('FINOS_SETTINGS_UPDATE', handleSettingsUpdate);
      }
    };
  }, [updateSettings]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState(DEFAULT_STATE);
  }, []);

  const clearAllData = useCallback(async () => {
    if (confirm('CRITICAL: Clear all records?')) setState(DEFAULT_STATE);
  }, []);

  const addPlan = async (p: Omit<FinancialPlan, keyof SyncBase | 'id' | 'components' | 'settlements'>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Planning blocked.");
      throw new Error("Read-Only Mode active");
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const plan = { ...p, id, components: [], settlements: [], ...meta };
    setState((prev: AppState) => ({ ...prev, financialPlans: [plan, ...prev.financialPlans] }));
    const dbData = { ...p, id, ...meta };
    await databaseKernel.insert('financial_plans', dbData);
    (async () => {
      try {
        await offlineSyncService.enqueue('financial_plans', id, 'INSERT', dbData);
        await loadAppData(false);
      } catch (e) {
        console.error("❌ [Background] Plan creation failed:", e);
      }
    })();
    return id;
  };

  const updatePlan = async (id: string, updates: Partial<FinancialPlan>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Blocked.");
      return;
    }
    const current = state.financialPlans.find(p => p.id === id);
    const meta = { ...getSyncMetadata(), version: (current?.version || 1) + 1 };

    // 1. OPTIMISTIC UI
    setState((prev: AppState) => ({
      ...prev,
      financialPlans: prev.financialPlans.map(p => p.id === id ? { ...p, ...updates, ...meta } : p)
    }));

    const dbUpdates = { ...updates, ...meta };
    delete (dbUpdates as any).components;
    delete (dbUpdates as any).settlements;

    // 2. PRIMARY PERSISTENCE
    await databaseKernel.update('financial_plans', id, dbUpdates);

    // 3. BACKGROUND TASKS
    (async () => {
      try {
        await offlineSyncService.enqueue('financial_plans', id, 'UPDATE', { id, ...dbUpdates });
        await loadAppData(false);
      } catch (e) {
        console.error("❌ [Background] Plan update failed:", e);
      }
    })();

    return; // Resolve immediately
  };

  const deletePlan = async (id: string, cascade: boolean = false) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Deletion blocked.");
      return;
    }
    const plan = state.financialPlans.find(p => p.id === id);
    if (!plan) return;

    const meta = getSyncMetadata(true, plan?.version);

    // 1. OPTIMISTIC UI & UNDO REGISTRATION
    setState((prev: AppState) => ({
      ...prev,
      financialPlans: prev.financialPlans.filter(p => p.id !== id),
      undoStack: [...prev.undoStack, { type: 'plan' as 'plan', data: plan, timestamp: Date.now() } as UndoItem].slice(-5),
      deleteProgress: { total: (cascade ? plan.components.length + plan.settlements.length : 0) + 1, current: 0, itemName: plan?.title || 'Plan', isDeleting: true, status: 'Initializing plan deletion...', auditLog: [`[SYSTEM] Starting recursive wipe for plan: ${plan?.title}`] }
    }));

    // BACKGROUND TASKS
    (async () => {
      try {
        let current = 0;
        if (cascade) {
          for (const c of plan.components) {
            current++;
            setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, current, status: `Removing component: ${c.name}`, auditLog: [...prev.deleteProgress.auditLog, `[CLEANUP] Deleted component: ${c.name}`] } }));
            const cMeta = getSyncMetadata(true, c.version);
            await databaseKernel.delete('financial_plan_components', c.id, cMeta.version);
            await offlineSyncService.enqueue('financial_plan_components', c.id, 'DELETE', { id: c.id, ...cMeta });
          }
          for (const s of plan.settlements) {
            current++;
            setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, current, status: 'Removing settlement...', auditLog: [...prev.deleteProgress.auditLog, `[CLEANUP] Settlement record purged.`] } }));
            const sMeta = getSyncMetadata(true, s.version);
            await databaseKernel.delete('financial_plan_settlements', s.id, sMeta.version);
            await offlineSyncService.enqueue('financial_plan_settlements', s.id, 'DELETE', { id: s.id, ...sMeta });
          }
        }
        current++;
        setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, current, status: 'Finalizing plan deletion...', auditLog: [...prev.deleteProgress.auditLog, '[CLEANUP] Integrity check passed.'] } }));
        await databaseKernel.delete('financial_plans', id, meta.version);
        await offlineSyncService.enqueue('financial_plans', id, 'DELETE', { id, ...meta });
        await loadAppData(false);

        setTimeout(() => {
          setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, isDeleting: false, auditLog: [] } }));
        }, 800);
      } catch (e) {
        console.error("❌ [DeletePlan] Backup restoration would go here if needed", e);
      }
    })();
  };

  const addComponent = async (c: Omit<PlanComponent, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Blocked.");
      return;
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const component = { ...c, id, ...meta };
    setState((prev: AppState) => ({
      ...prev,
      financialPlans: prev.financialPlans.map(p => p.id === c.plan_id ? { ...p, components: [...p.components, component] } : p)
    }));
    await databaseKernel.insert('financial_plan_components', component);
    (async () => {
      try {
        await offlineSyncService.enqueue('financial_plan_components', id, 'INSERT', component);
        await loadAppData(false);
      } catch (e) {
        console.error("❌ [Background] Component addition failed:", e);
      }
    })();
  };

  const updateComponent = async (id: string, updates: Partial<PlanComponent>, skipReload = false) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Blocked.");
      return;
    }
    const current = state.financialPlans.flatMap(p => p.components).find(c => c.id === id);
    const meta = { ...getSyncMetadata(), version: (current?.version || 1) + 1 };

    // 1. OPTIMISTIC UI
    setState((prev: AppState) => ({
      ...prev,
      financialPlans: prev.financialPlans.map(p => ({
        ...p,
        components: p.components.map(c => c.id === id ? { ...c, ...updates, ...meta } : c)
      }))
    }));

    const dbUpdates = { ...updates, ...meta };

    // 2. PRIMARY PERSISTENCE
    await databaseKernel.update('financial_plan_components', id, dbUpdates);

    // 3. BACKGROUND TASKS
    (async () => {
      try {
        await offlineSyncService.enqueue('financial_plan_components', id, 'UPDATE', { id, ...dbUpdates });
        if (!skipReload) await loadAppData(false);
      } catch (e) {
        console.error("❌ [Background] Component update failed:", e);
      }
    })();

    return; // Resolve immediately
  };

  const deleteComponent = async (id: string) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Blocked.");
      return;
    }
    const component = state.financialPlans.flatMap(p => p.components).find(c => c.id === id);
    if (!component) return;

    setState(prev => ({
      ...prev,
      deleteProgress: { total: 1, current: 0, itemName: component.name, isDeleting: true, status: 'Removing component...', auditLog: [`[SYSTEM] Removing isolated component: ${component.name}`] }
    }));

    const meta = getSyncMetadata(true, component?.version);
    await databaseKernel.delete('financial_plan_components', id, meta.version);
    await offlineSyncService.enqueue('financial_plan_components', id, 'DELETE', { id, ...meta });
    await loadAppData(false);

    setState((prev: AppState) => ({
      ...prev,
      financialPlans: prev.financialPlans.map(p => ({
        ...p,
        components: p.components.filter(c => c.id !== id)
      })),
      undoStack: [...prev.undoStack, { type: 'component' as 'component', data: component, timestamp: Date.now() } as UndoItem].slice(-5),
      deleteProgress: { ...prev.deleteProgress, current: 1, status: 'Deleted successfully', auditLog: [...prev.deleteProgress.auditLog, '[CLEANUP] Success.'] }
    }));
    setTimeout(() => {
      setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, isDeleting: false, auditLog: [] } }));
    }, 800);
  };

  const addSettlement = async (s: Omit<PlanSettlement, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !isSuperAdmin) {
      alert("🔒 Read-Only Mode: Ledger locked.");
      return;
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const settlement = { ...s, id, ...meta };
    setState((prev: AppState) => ({
      ...prev,
      financialPlans: prev.financialPlans.map(p => p.id === s.plan_id ? { ...p, settlements: [...p.settlements, settlement] } : p)
    }));
    await databaseKernel.insert('financial_plan_settlements', settlement);
    await offlineSyncService.enqueue('financial_plan_settlements', id, 'INSERT', settlement);
    await loadAppData(false);
  };

  const deleteSettlement = async (id: string) => {
    const settlement = state.financialPlans.flatMap(p => p.settlements).find(s => s.id === id);
    if (!settlement) return;

    setState(prev => ({
      ...prev,
      deleteProgress: { total: 1, current: 0, itemName: 'Settlement Record', isDeleting: true, status: 'Removing settlement...', auditLog: ['[SYSTEM] Removing settlement ledger...'] }
    }));

    const meta = getSyncMetadata(true, settlement?.version);
    await databaseKernel.delete('financial_plan_settlements', id, meta.version);
    await offlineSyncService.enqueue('financial_plan_settlements', id, 'DELETE', { id, ...meta });
    await loadAppData(false);

    setState((prev: AppState) => ({
      ...prev,
      financialPlans: prev.financialPlans.map(p => ({
        ...p,
        settlements: p.settlements.filter(s => s.id !== id)
      })),
      undoStack: [...prev.undoStack, { type: 'settlement' as 'settlement', data: settlement, timestamp: Date.now() } as UndoItem].slice(-5),
      deleteProgress: { ...prev.deleteProgress, current: 1, status: 'Deleted', auditLog: [...prev.deleteProgress.auditLog, '[CLEANUP] Purge verified.'] }
    }));
    setTimeout(() => {
      setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, isDeleting: false, auditLog: [] } }));
    }, 800);
  };

  const finalizePlan = async (id: string) => {
    const plan = state.financialPlans.find(p => p.id === id);
    if (!plan || plan.status === 'FINALIZED') return;

    await offlineSyncService.safeTransaction(async () => {
      // 1. Calculate Plan Totals for Proportional Logic
      const totalComponentCost = plan.components.reduce((sum, c) => sum + (c.final_cost || c.expected_cost || 0), 0);
      const safeTotalCost = totalComponentCost || 1; // Prevent division by zero

      for (const s of plan.settlements) {
        const channel = state.wallets.flatMap(w => w.channels).find(ch => ch.id === s.channel_id);
        const wallet = state.wallets.find(w => w.id === channel?.wallet_id);

        if (!channel || !wallet) continue;

        // Generate a Settlement Group ID for this batch (Visual Stacking)
        const settlementGroupId = await databaseKernel.generateId();

        // Calculate Proportional Ratio (How much of the plan is covered by this settlement?)
        const settlementRatio = s.amount / safeTotalCost;

        // ATOMIC SPLIT LOOP: Create 1 Transaction per Component
        console.log(`💰 [FinalizePlan] Processing Batch: ${plan.components.length} components. Ratio: ${settlementRatio}`);

        for (const [index, component] of plan.components.entries()) {
          const componentCost = component.final_cost || component.expected_cost || 0;
          const splitAmount = componentCost * settlementRatio;

          console.log(`   🔸 Item ${index + 1}/${plan.components.length}: ${component.name} | Cost: ${componentCost} | Split: ${splitAmount.toFixed(2)}`);

          if (splitAmount <= 0) {
            console.warn(`      ⚠️ Skipping item ${component.name} due to zero/negative split amount.`);
            continue; // Skip zero-cost items
          }

          const txId = await databaseKernel.generateId();
          const meta = getSyncMetadata();

          // Safety: Ensure Category ID exists, fallback to Uncategorized if vital
          const safeCategoryId = component.category_id || plan.components[0]?.category_id || 'uncategorized';

          const tx = {
            id: txId,
            amount: parseFloat(splitAmount.toFixed(2)), // Round to 2 decimals
            date: new Date().toISOString(),
            wallet_id: wallet.id,
            category_id: safeCategoryId,
            note: `[Plan: ${plan.title}] - ${component.name} (Paid: ${splitAmount.toFixed(2)} | Total: ${componentCost.toFixed(2)})`,
            type: MasterCategoryType.EXPENSE,
            channel_type: channel.type,
            settlement_group_id: settlementGroupId, // The Glue for Stacking
            ...meta
          };

          try {
            await databaseKernel.insert('transactions', tx);
            await offlineSyncService.enqueue('transactions', txId, 'INSERT', tx, false);
            console.log(`      ✅ Inserted TX: ${txId} for ${component.name}`);
          } catch (insertError) {
            console.error(`      ❌ Insert Failed for ${component.name}:`, insertError);
            throw insertError; // Re-throw to trigger transaction rollback
          }

          // Sub-wallet Logic (Atomic Reflection)
          if (wallet.parentWalletId) {
            const parentWallet = state.wallets.find(pw => pw.id === wallet.parentWalletId);
            if (parentWallet) {
              // Start of Selection
              const parentChannel = parentWallet.channels.find(pc => pc.type === channel.type) || parentWallet.channels[0];
              if (parentChannel) {
                // Dynamic Wallet Architecture: We do NOT create shadow transactions anymore.
                // The single atomic transaction in the sub-wallet is sufficient.
                // The parent wallet will aggregate this via the new View Logic.
              }
            }
          }
        }
      }

      const planUpdates = { status: 'FINALIZED', finalized_at: new Date().toISOString(), ...getSyncMetadata() };
      await databaseKernel.update('financial_plans', id, planUpdates);
      await offlineSyncService.enqueue('financial_plans', id, 'UPDATE', { id, ...planUpdates }, false);
    });

    await loadAppData(false);
    offlineSyncService.sync();
  };

  const addBudget = async (b: Omit<Budget, keyof SyncBase | 'id' | 'spent'>) => {
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const budget = { ...b, id, ...meta };
    setState(prev => ({ ...prev, budgets: [...prev.budgets, budget] }));
    const dbData = { id, name: b.name, amount: b.amount, category_id: b.categoryId, period: b.period, ...meta };
    await databaseKernel.insert('budgets', dbData);
    await offlineSyncService.enqueue('budgets', id, 'INSERT', dbData);
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    const current = state.budgets.find(b => b.id === id);
    if (!current) return;
    const meta = { ...getSyncMetadata(), version: (current.version || 0) + 1 };
    const updated = { ...current, ...updates, ...meta };
    setState(prev => ({ ...prev, budgets: prev.budgets.map(b => b.id === id ? updated : b) }));
    const dbData = { name: updated.name, amount: updated.amount, category_id: updated.categoryId, period: updated.period, ...meta };
    await databaseKernel.update('budgets', id, dbData);
    await offlineSyncService.enqueue('budgets', id, 'UPDATE', { id, ...dbData });
  };

  const deleteBudget = async (id: string) => {
    const budget = state.budgets.find(b => b.id === id);
    if (!budget) return;

    setState(prev => ({
      ...prev,
      deleteProgress: { total: 1, current: 0, itemName: budget.name, isDeleting: true, status: 'Removing budget...', auditLog: [`[SYSTEM] Removing budget: ${budget.name}`] }
    }));

    const meta = getSyncMetadata(true, budget?.version);
    await databaseKernel.delete('budgets', id, meta.version);
    await offlineSyncService.enqueue('budgets', id, 'DELETE', { id, ...meta });
    setState(prev => ({
      ...prev,
      budgets: prev.budgets.filter(b => b.id !== id),
      deleteProgress: { ...prev.deleteProgress, current: 1, status: 'Budget Removed', auditLog: [...prev.deleteProgress.auditLog, '[CLEANUP] Success.'] },
      undoStack: [...prev.undoStack, { type: 'budget' as 'budget', data: budget, timestamp: Date.now() } as UndoItem].slice(-5)
    }));

    setTimeout(() => {
      setState(prev => ({ ...prev, deleteProgress: { ...prev.deleteProgress, isDeleting: false, auditLog: [] } }));
    }, 800);
  };

  const searchPlanSuggestions = useCallback(async (query: string) => databaseKernel.searchPlanSuggestions(query, state.profile?.id), [state.profile?.id]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    await databaseKernel.update('notifications', id, { is_read: 1 });
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
    }));
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    await databaseKernel.delete('notifications', id);
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
  }, []);



  const getCurrencySymbol = useCallback((code?: string) => CURRENCY_MAP[code || state.settings.currency]?.symbol || code || '$', [state.settings.currency]);

  const formatCurrency = useCallback((amount: number, currencyCode?: string) => {
    if (state.settings.privacyMode) return '••••••';
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: state.settings.decimalPlaces, maximumFractionDigits: state.settings.decimalPlaces })}`;
  }, [state.settings.privacyMode, state.settings.decimalPlaces, getCurrencySymbol]);

  const value: FinanceContextType = {
    ...state,
    unlockApp, logout, addTransaction, deleteTransaction, updateTransaction, addWallet, updateWallet, deleteWallet, setPrimaryWallet,
    addBudget, updateBudget, deleteBudget,
    addCategory, updateCategory, deleteCategory, toggleCategoryStatus, addCommitment, updateCommitment, deleteCommitment, addTransfer, updateProfile, updateSettings, clearAllData,
    totalBalance, availableAfterCommitments: totalBalance - totalMonthlyCommitments, walletsWithBalances, projectedBalances, isCloudLoading: false, getCurrencySymbol,
    financialPlans: state.financialPlans, addPlan, updatePlan, deletePlan, addComponent, updateComponent, deleteComponent,
    addSettlement, deleteSettlement, finalizePlan, searchPlanSuggestions,
    activeTab, setActiveTab, selectedWalletId, setSelectedWalletId, syncStatus, forceSyncNow: () => offlineSyncService.sync(),
    notifications: state.notifications, markNotificationAsRead, deleteNotification, addNotification,
    totalMonthlyCommitments, settleCommitment, extendCommitmentDate, postponeCommitment, suggestedObligationNames,
    formatCurrency,
    undoDeletion,
    undoStack: state.undoStack,
    isBooting: loading,
    state, // Exposed for advanced admin usage
    setState, // Exposed for App.tsx
    isSuperAdmin
  };

  // --- Enterprise Security & Migration Enforcement ---
  // --- Enterprise Security & Migration Enforcement (REMOVED: Causing Sync Loops) ---
  // Security is now enforced via RLS policies and server-side checks.
  // Client-side enforcement was causing infinite reload loops by conflicting with synced data.

  /*
  useEffect(() => {
    if (!state.profile.email) return;

    if (state.profile.email === 'hmetest121@gmail.com') {
      ...
    }
  }, [...]);
  */

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
};
