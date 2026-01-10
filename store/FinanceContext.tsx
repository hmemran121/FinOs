
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  SyncStatusUI,
  SyncBase,
  Transfer,
  FinancialPlan,
  PlanComponent,
  PlanSettlement,
  PlanStatus,
  PlanType,
  ComponentType,
  AppNotification
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
  isBooting: boolean;
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
  healthScore: { score: 0, liquidity: 0, stability: 0, burnControl: 0, commitmentCoverage: 0 },
  isLocked: false,
  userPin: null,
  isLoggedIn: false,
  financialPlans: [],
  profile: { name: 'Premium User', email: '' },
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
    customLogoUrl: undefined
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
  }
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [isKernelReady, setIsKernelReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTabState] = useState('dashboard');

  const setActiveTab = useCallback((tab: string) => {
    console.log("🛠️ [FinanceContext] Changing Tab to:", tab);
    setActiveTabState(tab.toLowerCase());
  }, []);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusUI>(offlineSyncService.getStatus());

  const walletsWithBalances = useMemo(() => {
    const computed = state.wallets.map(w => {
      const channelBalances: Record<string, number> = {};
      w.channels.forEach(ch => { channelBalances[ch.type] = Number(ch.balance); });
      return { ...w, currentBalance: Number(w.initialBalance), totalExpenses: 0, totalIncome: 0, channelBalances };
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

  const prevBalances = React.useRef<Record<string, number>>({});

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
  useEffect(() => {
    if (syncStatus.isInitialized && isKernelReady) {
      console.log("🎊 [FinanceContext] System Initialized. Performing Final Data Load...");
      loadAppData();
    }
  }, [syncStatus.isInitialized, isKernelReady]);

  const loadAppData = useCallback(async (shouldTriggerSync: boolean = false) => {
    try {
      const wallets = await databaseKernel.query('wallets');
      const transactions = await databaseKernel.query('transactions');
      let categoriesUser = await databaseKernel.query('categories_user');
      let categoriesGlobal = await databaseKernel.query('categories_global');

      const hasModern = categoriesGlobal.some((c: any) => c.id === 'cat_life_essentials');
      const hasLegacy = categoriesGlobal.some((c: any) => !c.id.startsWith('cat_') || ['cat_food', 'cat_miscellaneous', 'cat_shopping'].includes(c.id));

      if (!hasModern && (hasLegacy || categoriesGlobal.length > 5)) {
        await databaseKernel.execute("DELETE FROM categories_global");
        await databaseKernel.execute("DELETE FROM categories_user");
        await databaseKernel.run('UPDATE meta_sync SET last_full_sync = 0 WHERE id = 1');
        categoriesUser = [];
        categoriesGlobal = [];
        setTimeout(() => offlineSyncService.sync(), 1000);
      }

      const commitments = await databaseKernel.query('commitments');
      const channels = await databaseKernel.query('channels');
      const budgets = await databaseKernel.query('budgets');
      const profiles = await databaseKernel.query('profiles', '1=1');
      const notifications = await databaseKernel.query('notifications');
      const currencies = await databaseKernel.query('currencies', '1=1');
      const channelTypes = await databaseKernel.query('channel_types', '1=1');
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
        isSubLedgerSync: !!t.is_sub_ledger_sync,
        subLedgerId: t.sub_ledger_id,
        subLedgerName: t.sub_ledger_name,
        splits: []
      }));

      const mappedCategories: Category[] = [
        ...categoriesGlobal.map((c: any) => ({ ...c, isGlobal: true, parentId: c.parent_id, isDisabled: !!c.is_disabled })),
        ...categoriesUser.map((c: any) => ({ ...c, isGlobal: false, parentId: c.parent_id, isDisabled: !!c.is_disabled }))
      ];

      const mappedBudgets: Budget[] = budgets.map((b: any) => ({ ...b, categoryId: b.category_id }));
      const mappedNotifications: AppNotification[] = notifications.map((n: any) => {
        let parsedData = n.data;
        if (typeof n.data === 'string' && n.data.startsWith('{')) {
          try { parsedData = JSON.parse(n.data); } catch (e) { console.error("Parse failed", e); }
        }
        return { ...n, isRead: !!n.is_read, data: parsedData };
      });

      setState((prev: AppState) => {
        let profile = prev.profile;
        let settings = prev.settings;
        if (profiles && profiles.length > 0) {
          const p = profiles[0] as any;
          profile = { id: p.id, name: p.name || profile.name, email: p.email || profile.email };
          const newSettings = {
            currency: p.currency || settings.currency,
            theme: (p.theme || settings.theme) as 'DARK' | 'LIGHT' | 'AMOLED',
            aiEnabled: p.ai_enabled === 1,
            biometricEnabled: p.biometric_enabled === 1,
            accentColor: p.accent_color || settings.accentColor,
            language: (p.language || settings.language) as 'EN' | 'BN',
            privacyMode: p.privacy_mode === 1,
            glassIntensity: p.glass_intensity !== undefined ? p.glass_intensity : settings.glassIntensity,
            budgetStartDay: p.budget_start_day !== undefined ? p.budget_start_day : settings.budgetStartDay,
            hapticEnabled: p.haptic_enabled !== 0,
            animationSpeed: (p.animation_speed || settings.animationSpeed) as any,
            defaultWalletId: p.default_wallet_id,
            autoSync: p.auto_sync !== 0,
            decimalPlaces: p.decimal_places !== undefined ? p.decimal_places : settings.decimalPlaces,
            showHealthScore: p.show_health_score !== 0,
            compactMode: p.compact_mode === 1,
            lowBalanceThreshold: p.low_balance_threshold !== undefined ? p.low_balance_threshold : settings.lowBalanceThreshold,
            fontFamily: (p.font_family || settings.fontFamily) as any,
            animationIntensity: (p.animation_intensity || settings.animationIntensity) as any,
            biometricLockTimeout: p.biometric_lock_timeout !== undefined ? p.biometric_lock_timeout : settings.biometricLockTimeout,
            soundEffectsEnabled: p.sound_effects_enabled !== 0,
            isAdminEnabled: p.is_admin_enabled === 1,
            customGeminiKey: p.custom_gemini_key,
            customSupabaseUrl: p.custom_supabase_url,
            isReadOnly: p.is_read_only === 1,
            maintenanceMode: p.maintenance_mode === 1,
            customAppName: p.custom_app_name || 'FinOS',
            glassEffectsEnabled: p.glass_effects_enabled !== 0,
            customLogoUrl: p.custom_logo_url || localStorage.getItem('finos_custom_logo_url') || undefined
          };
          console.log('📊 Loaded settings, customLogoUrl:', newSettings.customLogoUrl);
          settings = newSettings;
        }
        return {
          ...prev,
          wallets: mappedWallets,
          transactions: mappedTransactions,
          categories: mappedCategories,
          budgets: mappedBudgets,
          commitments: commitments.map((c: any) => {
            let parsedHistory: any[] = [];
            try {
              const raw = c.history;
              if (raw) {
                if (Array.isArray(raw)) {
                  parsedHistory = raw;
                } else if (typeof raw === 'string' && raw.trim() !== '') {
                  try {
                    parsedHistory = JSON.parse(raw);
                  } catch (e) {
                    // Fallback for partial data
                    if (raw.includes('{') || raw.includes('[')) {
                      const match = raw.match(/\[.*\]|\{.*\}/s);
                      if (match) parsedHistory = JSON.parse(match[0]);
                    }
                  }
                } else if (raw instanceof Uint8Array || (typeof raw === 'object' && raw !== null && 'buffer' in raw)) {
                  const decoded = new TextDecoder().decode(raw as any).trim();
                  if (decoded !== '') parsedHistory = JSON.parse(decoded);
                }
              }
              // Ensure it's always an array
              if (!Array.isArray(parsedHistory)) parsedHistory = [];

              // Repair: If history is empty, add a default CREATED event
              if (!Array.isArray(parsedHistory) || parsedHistory.length === 0) {
                parsedHistory = [{
                  type: 'CREATED',
                  date: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
                  note: 'Audit trace initialized'
                }];
              }
            } catch (e) {
              console.warn(`🧩 [History] Recovery failed for ${c.id}:`, e);
            }

            return {
              ...c,
              walletId: c.wallet_id,
              nextDate: c.next_date,
              certaintyLevel: c.certainty_level as CertaintyLevel,
              isRecurring: !!c.is_recurring,
              history: parsedHistory
            };
          }),
          notifications: mappedNotifications,
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

      if (shouldTriggerSync) {
        const status = offlineSyncService.getStatus();
        const { data: { session } } = await supabase.auth.getSession();
        if (status.isOnline && session && !status.isSyncing) {
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
        await databaseKernel.initialize((pct, msg) => {
          setSyncStatus(prev => ({ ...prev, progressPercent: pct, progress: msg }));
        });
        setIsKernelReady(true);
        await loadAppData(false); // Initial load (might be empty)

        // Initialize Sync Service (Status Load + Event Listeners)
        await offlineSyncService.initialize();

        // Phase 1: Force Global Sync before checking auth-based user sync
        await offlineSyncService.syncGlobalData();

        const bioResult = await biometricService.checkAvailability();
        const settings = (await databaseKernel.query('profiles'))?.[0] || DEFAULT_STATE.settings;
        const shouldLock = settings.biometric_enabled === 1 && bioResult.isAvailable;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setState((prev: AppState) => ({
            ...prev,
            isLoggedIn: true,
            isLocked: shouldLock,
            profile: { ...prev.profile, email: session.user.email || '', name: session.user.user_metadata?.name || 'FinOS User' }
          }));
          const db = await databaseKernel.getDb();
          const syncInfo = await db.query('SELECT is_initialized FROM meta_sync WHERE id = 1');
          const isInitialized = syncInfo.values?.[0]?.is_initialized === 1;
          const currentSync = offlineSyncService.getStatus();
          const walletsCount = await databaseKernel.query('wallets');
          if (currentSync.isOnline && (!isInitialized || walletsCount.length === 0)) {
            offlineSyncService.bootstrap();
          }
        }
      } catch (err) {
        console.error("🏁 [Startup] FATAL SEQUENCE ERROR:", err);
      } finally {
        setLoading(false);
      }
    };
    startSequence();
    const unsubscribeSync = offlineSyncService.subscribe((status) => setSyncStatus(status));
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setState((prev: AppState) => ({
          ...prev,
          isLoggedIn: true,
          profile: { ...prev.profile, email: session.user.email || '', name: session.user.user_metadata?.name || 'FinOS User' }
        }));
        const status = offlineSyncService.getStatus();
        if (!status.isInitialized && status.isOnline) offlineSyncService.bootstrap();
      } else {
        setState((prev: AppState) => ({ ...prev, isLoggedIn: false }));
      }
    });
    return () => {
      unsubscribeSync();
      authListener.subscription.unsubscribe();
    };
  }, [loadAppData]);

  // Realtime nano-pulse updates from sync engine
  useEffect(() => {
    const unsubscribe = offlineSyncService.onItemUpdate(async (table, item, action) => {
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

  const getSyncMetadata = useCallback((isDeleted = false) => {
    return {
      updated_at: offlineSyncService.getPrecisionTimestamp(),
      server_updated_at: 0,
      version: 1,
      device_id: databaseKernel.getDeviceId(),
      user_id: state.profile.id || 'unknown',
      is_deleted: isDeleted ? 1 : 0
    };
  }, [state.profile.id]);

  const addTransaction = useCallback(async (t: Omit<Transaction, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 System is in Read-Only mode. Entry blocked.");
      return;
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const newTxn: Transaction = { ...t, id, ...meta };
    setState((prev: AppState) => ({ ...prev, transactions: [newTxn, ...prev.transactions] }));
    const dbData = { id, amount: t.amount, date: t.date, wallet_id: t.walletId, channel_type: t.channelType, category_id: t.categoryId, note: t.note, type: t.type, is_split: t.isSplit ? 1 : 0, to_wallet_id: t.toWalletId, to_channel_type: t.toChannelType, linked_transaction_id: t.linkedTransactionId, ...meta };
    await databaseKernel.insert('transactions', dbData);
    await offlineSyncService.enqueue('transactions', id, 'INSERT', dbData);

    const wallet = state.wallets.find(w => w.id === t.walletId);
    if (wallet?.parentWalletId) {
      const parentWallet = state.wallets.find(pw => pw.id === wallet.parentWalletId);
      if (parentWallet) {
        const parentChannel = parentWallet.channels.find(pc => pc.type === t.channelType) || parentWallet.channels[0];
        if (parentChannel) {
          const refId = await databaseKernel.generateId();
          const refTxn: Transaction = { ...t, id: refId, walletId: parentWallet.id, channelType: parentChannel.type, note: `[Ref] ${t.note || 'Transaction'} (via ${wallet.name})`, linkedTransactionId: id, isSubLedgerSync: true, subLedgerId: wallet.id, subLedgerName: wallet.name, ...getSyncMetadata() };
          setState((prev: AppState) => ({ ...prev, transactions: [refTxn, ...prev.transactions] }));
          const refDbData = {
            ...refTxn,
            wallet_id: parentWallet.id,
            channel_type: parentChannel.type,
            category_id: t.categoryId,
            is_split: t.isSplit ? 1 : 0,
            to_wallet_id: t.toWalletId,
            to_channel_type: t.toChannelType,
            linked_transaction_id: id,
            is_sub_ledger_sync: 1,
            sub_ledger_id: wallet.id,
            sub_ledger_name: wallet.name
          };
          delete (refDbData as any).walletId;
          delete (refDbData as any).channelType;
          delete (refDbData as any).isSplit;
          delete (refDbData as any).toWalletId;
          delete (refDbData as any).toChannelType;
          delete (refDbData as any).isSubLedgerSync;

          await databaseKernel.insert('transactions', refDbData);
          await offlineSyncService.enqueue('transactions', refId, 'INSERT', refDbData);
        }
      }
    }
  }, [state.wallets, getSyncMetadata]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
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
  }, [state.transactions, getSyncMetadata]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
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
    setState((prev: AppState) => ({ ...prev, transactions: prev.transactions.filter((t: Transaction) => !relatedIdArray.includes(t.id)) }));
    for (const dId of relatedIdArray) {
      const meta = getSyncMetadata(true);
      await databaseKernel.delete('transactions', dId);
      await offlineSyncService.enqueue('transactions', dId, 'DELETE', { id: dId, ...meta });
    }
  }, [state.transactions, getSyncMetadata]);

  const addWallet = useCallback(async (w: Omit<Wallet, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: Blocked.");
      return;
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const dbData = { id, name: w.name, currency: w.currency, initial_balance: w.initialBalance, color: w.color, icon: w.icon, is_visible: w.isVisible ? 1 : 0, is_primary: w.isPrimary ? 1 : 0, uses_primary_income: w.usesPrimaryIncome ? 1 : 0, parent_wallet_id: w.parentWalletId || null, ...meta };
    await databaseKernel.insert('wallets', dbData);
    const channelsWithIds: Channel[] = [];
    for (const ch of w.channels) {
      const chId = await databaseKernel.generateId();
      const chData = { id: chId, wallet_id: id, type: ch.type, balance: ch.balance, ...meta };
      await databaseKernel.insert('channels', chData);
      channelsWithIds.push({ ...ch, id: chId });
    }
    await offlineSyncService.enqueue('wallets', id, 'INSERT', dbData);
    const newWallet: Wallet = { ...w, id, channels: channelsWithIds, ...meta };
    setState((prev: AppState) => ({ ...prev, wallets: [...prev.wallets, newWallet] }));
    await loadAppData(true);
  }, [getSyncMetadata, loadAppData]);

  const updateWallet = useCallback(async (id: string, updates: Partial<Wallet>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: Selection blocked.");
      return;
    }
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
    if (updates.channels) {
      const existingRaw = await databaseKernel.query('channels', 'wallet_id = ? AND is_deleted = 0', [id]);
      const existingIds = existingRaw.map((r: any) => r.id);
      const newIds = updates.channels.map(c => c.id);
      const toDeleteIds = existingIds.filter((eid: string) => !newIds.includes(eid));
      for (const delId of toDeleteIds) {
        await databaseKernel.delete('channels', delId);
        await offlineSyncService.enqueue('channels', delId, 'DELETE', { id: delId });
      }
      for (const ch of updates.channels) {
        const chId = ch.id || await databaseKernel.generateId();
        const chData = { id: chId, wallet_id: id, type: ch.type, balance: ch.balance, ...getSyncMetadata() };
        await databaseKernel.insert('channels', chData, true);
        await offlineSyncService.enqueue('channels', chId, 'INSERT', chData);
      }
    }
    await offlineSyncService.enqueue('wallets', id, 'UPDATE', { id, ...dbUpdates });
  }, [state.wallets, getSyncMetadata]);

  const deleteWallet = useCallback(async (id: string, cascade: boolean = false) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: Deletion blocked.");
      return;
    }
    const meta = getSyncMetadata(true);
    if (cascade) {
      const relatedTxns = state.transactions.filter(t => t.walletId === id);
      for (const t of relatedTxns) {
        await databaseKernel.delete('transactions', t.id);
        await offlineSyncService.enqueue('transactions', t.id, 'DELETE', { id: t.id, ...meta });
      }
      const relatedChannels = await databaseKernel.query('channels', 'wallet_id = ?', [id]);
      for (const ch of (relatedChannels as any[])) {
        await databaseKernel.delete('channels', ch.id);
        await offlineSyncService.enqueue('channels', ch.id, 'DELETE', { id: ch.id, ...meta });
      }
    }
    setState((prev: AppState) => ({ ...prev, wallets: prev.wallets.filter((w: Wallet) => w.id !== id) }));
    await databaseKernel.delete('wallets', id);
    await offlineSyncService.enqueue('wallets', id, 'DELETE', { id, ...meta });
  }, [state.transactions, getSyncMetadata]);

  const setPrimaryWallet = useCallback((id: string) => {
    setState((prev: AppState) => ({ ...prev, wallets: prev.wallets.map((w: Wallet) => ({ ...w, isPrimary: w.id === id })) }));
    updateWallet(id, { isPrimary: true });
    state.wallets.filter(w => w.id !== id && w.isPrimary).forEach(w => updateWallet(w.id, { isPrimary: false }));
  }, [state.wallets, updateWallet]);

  const addCategory = useCallback(async (c: Omit<Category, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: Categories locked.");
      return;
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const category: Category = { ...c, id, ...meta };
    setState((prev: AppState) => ({ ...prev, categories: [...prev.categories, category] }));
    const dbData = { id, name: c.name, icon: c.icon, color: c.color, type: c.type, parent_id: c.parentId || null, "order": c.order, ...meta };
    await databaseKernel.insert('categories_user', dbData);
    await offlineSyncService.enqueue('categories_user', id, 'INSERT', dbData);
  }, [getSyncMetadata]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
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

    await databaseKernel.update('categories_user', id, dbUpdates);
    await offlineSyncService.enqueue('categories_user', id, 'UPDATE', { id, ...dbUpdates });
    await loadAppData(false);
  }, [state.categories, getSyncMetadata, loadAppData]);

  const toggleCategoryStatus = useCallback(async (id: string) => {
    const cat = state.categories.find(c => c.id === id);
    if (cat) await updateCategory(id, { isDisabled: !cat.isDisabled });
  }, [state.categories, updateCategory]);

  const deleteCategory = useCallback(async (id: string) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: System locked.");
      return;
    }
    const meta = getSyncMetadata(true);
    setState((prev: AppState) => ({ ...prev, categories: prev.categories.filter((c: Category) => c.id !== id) }));
    await databaseKernel.delete('categories_user', id);
    await offlineSyncService.enqueue('categories_user', id, 'DELETE', { id, ...meta });
  }, [getSyncMetadata]);

  const addCommitment = useCallback(async (c: Omit<Commitment, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
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
      type: c.type, wallet_id: c.walletId, next_date: c.nextDate, status: 'ACTIVE',
      is_recurring: c.isRecurring ? 1 : 0,
      history: JSON.stringify(history),
      ...meta
    };
    await databaseKernel.insert('commitments', dbData);
    await offlineSyncService.enqueue('commitments', id, 'INSERT', dbData);
  }, [getSyncMetadata]);

  const updateCommitment = useCallback(async (id: string, updates: Partial<Commitment>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
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
    const sourceTx = {
      id: sourceTxId,
      amount: commitment.amount,
      date: new Date().toISOString(),
      wallet_id: walletId,
      channel_type: channelType,
      note: `Settlement: ${commitment.name}`,
      type: MasterCategoryType.EXPENSE,
      sub_ledger_id: commitment.id,
      sub_ledger_name: commitment.name,
      ...meta
    };
    await databaseKernel.insert('transactions', sourceTx);
    await offlineSyncService.enqueue('transactions', sourceTxId, 'INSERT', sourceTx);

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
  }, [state.commitments, updateCommitment, getSyncMetadata, loadAppData]);

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
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: Deletion blocked.");
      return;
    }
    const meta = getSyncMetadata(true);
    setState((prev: AppState) => ({ ...prev, commitments: prev.commitments.filter((c: Commitment) => c.id !== id) }));
    await databaseKernel.delete('commitments', id);
    await offlineSyncService.enqueue('commitments', id, 'DELETE', { id, ...meta });
  }, [getSyncMetadata]);

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
      const dbUpdates = { id: user.id, email: user.email, name: profileUpdates.name || state.profile.name, ...getSyncMetadata() };
      await databaseKernel.insert('profiles', dbUpdates, true);
      await offlineSyncService.enqueue('profiles', user.id, 'UPDATE', dbUpdates);
    }
  }, [state.profile, getSyncMetadata]);

  const updateSettings = useCallback(async (settingsUpdates: Partial<AppSettings>) => {
    console.log('⚙️ updateSettings called with:', settingsUpdates);

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

    // Update state immediately and get the new merged settings
    let mergedSettings: AppSettings | null = null;
    setState((prev: AppState) => {
      mergedSettings = { ...prev.settings, ...settingsUpdates };
      console.log('📝 New settings state:', mergedSettings);
      return { ...prev, settings: mergedSettings };
    });

    // Persist to database using the merged settings
    const { data: { user } } = await supabase.auth.getUser();
    if (user && mergedSettings) {
      const s = mergedSettings; // Use the merged settings, not stale state
      const dbUpdates = {
        id: user.id, email: user.email, name: state.profile.name,
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
        ...getSyncMetadata()
      };

      console.log('💾 Saving to database, custom_logo_url:', dbUpdates.custom_logo_url);
      await databaseKernel.insert('profiles', dbUpdates, true);
      await offlineSyncService.enqueue('profiles', user.id, 'UPDATE', dbUpdates);
      console.log('✅ Settings saved to database successfully');

      // Force re-render by updating state again
      console.log('🔄 Forcing context re-render');
      setState((prev: AppState) => ({
        ...prev,
        settings: { ...prev.settings, ...settingsUpdates }
      }));
      console.log('✅ Context updated');
    }
  }, [state.profile, getSyncMetadata]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState(DEFAULT_STATE);
  }, []);

  const clearAllData = useCallback(async () => {
    if (confirm('CRITICAL: Clear all records?')) setState(DEFAULT_STATE);
  }, []);

  const addPlan = async (p: Omit<FinancialPlan, keyof SyncBase | 'id' | 'components' | 'settlements'>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: Planning blocked.");
      return;
    }
    const id = await databaseKernel.generateId();
    const meta = getSyncMetadata();
    const plan = { ...p, id, components: [], settlements: [], ...meta };
    setState((prev: AppState) => ({ ...prev, financialPlans: [plan, ...prev.financialPlans] }));
    const dbData = { ...p, id, ...meta };
    await databaseKernel.insert('financial_plans', dbData);
    await offlineSyncService.enqueue('financial_plans', id, 'INSERT', dbData);
    await loadAppData(false);
    return id;
  };

  const updatePlan = async (id: string, updates: Partial<FinancialPlan>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: Blocked.");
      return;
    }
    const meta = { ...getSyncMetadata(), version: 2 };
    const dbUpdates = { ...updates, ...meta };
    delete (dbUpdates as any).components;
    delete (dbUpdates as any).settlements;
    await databaseKernel.update('financial_plans', id, dbUpdates);
    await offlineSyncService.enqueue('financial_plans', id, 'UPDATE', { id, ...dbUpdates });
    await loadAppData(false);
  };

  const deletePlan = async (id: string, cascade: boolean = false) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: Deletion blocked.");
      return;
    }
    const meta = getSyncMetadata(true);
    if (cascade) {
      const plan = state.financialPlans.find(p => p.id === id);
      if (plan) {
        for (const c of plan.components) {
          await databaseKernel.delete('financial_plan_components', c.id);
          await offlineSyncService.enqueue('financial_plan_components', c.id, 'DELETE', { id: c.id, ...meta });
        }
        for (const s of plan.settlements) {
          await databaseKernel.delete('financial_plan_settlements', s.id);
          await offlineSyncService.enqueue('financial_plan_settlements', s.id, 'DELETE', { id: s.id, ...meta });
        }
      }
    }
    await databaseKernel.delete('financial_plans', id);
    await offlineSyncService.enqueue('financial_plans', id, 'DELETE', { id, ...meta });
    await loadAppData(false);
  };

  const addComponent = async (c: Omit<PlanComponent, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
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
    await offlineSyncService.enqueue('financial_plan_components', id, 'INSERT', component);
    await loadAppData(false);
  };

  const updateComponent = async (id: string, updates: Partial<PlanComponent>, skipReload = false) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: Blocked.");
      return;
    }
    const meta = { ...getSyncMetadata(), version: 2 };
    const dbUpdates = { ...updates, ...meta };
    await databaseKernel.update('financial_plan_components', id, dbUpdates);
    await offlineSyncService.enqueue('financial_plan_components', id, 'UPDATE', { id, ...dbUpdates });
    if (!skipReload) await loadAppData(false);
  };

  const deleteComponent = async (id: string) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
      alert("🔒 Read-Only Mode: Blocked.");
      return;
    }
    const meta = getSyncMetadata(true);
    await databaseKernel.delete('financial_plan_components', id);
    await offlineSyncService.enqueue('financial_plan_components', id, 'DELETE', { id, ...meta });
    await loadAppData(false);
  };

  const addSettlement = async (s: Omit<PlanSettlement, keyof SyncBase | 'id'>) => {
    if (state.settings.isReadOnly && !state.settings.isAdminEnabled) {
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
    const meta = getSyncMetadata(true);
    await databaseKernel.delete('financial_plan_settlements', id);
    await offlineSyncService.enqueue('financial_plan_settlements', id, 'DELETE', { id, ...meta });
    await loadAppData(false);
  };

  const finalizePlan = async (id: string) => {
    const plan = state.financialPlans.find(p => p.id === id);
    if (!plan || plan.status === 'FINALIZED') return;
    await offlineSyncService.safeTransaction(async () => {
      for (const s of plan.settlements) {
        const channel = state.wallets.flatMap(w => w.channels).find(ch => ch.id === s.channel_id);
        const wallet = state.wallets.find(w => w.id === channel?.wallet_id);
        if (!channel || !wallet) continue;
        const txId = await databaseKernel.generateId();
        const meta = getSyncMetadata();
        const tx = { id: txId, amount: s.amount, date: new Date().toISOString(), wallet_id: wallet.id, category_id: plan.components[0]?.category_id, note: `[Plan: ${plan.title}]`, type: 'expense', channel_type: channel.type, ...meta };
        await databaseKernel.insert('transactions', tx);
        await offlineSyncService.enqueue('transactions', txId, 'INSERT', tx, false);
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
    const meta = getSyncMetadata(true);
    await databaseKernel.delete('budgets', id);
    await offlineSyncService.enqueue('budgets', id, 'DELETE', { id, ...meta });
    setState(prev => ({ ...prev, budgets: prev.budgets.filter(b => b.id !== id) }));
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

  return (
    <FinanceContext.Provider value={{
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
      isBooting: loading
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
