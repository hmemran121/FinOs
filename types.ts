
export enum MasterCategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  SAVING = 'SAVING',
  INVESTMENT = 'INVESTMENT',
  TRANSFER = 'TRANSFER'
}

// Enum removed to support Dynamic Channel Types from DB
export type ChannelType = string;

export enum CommitmentType {
  FIXED = 'FIXED',
  VARIABLE = 'VARIABLE',
  OPTIONAL = 'OPTIONAL'
}

export enum CommitmentFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY'
}

export enum CertaintyLevel {
  HARD = 'HARD',
  SOFT = 'SOFT'
}

export interface SyncBase {
  updated_at: number;
  created_at?: number;
  server_updated_at?: number;
  version: number;
  device_id: string;
  user_id: string;
  is_deleted: number;
}

export interface Channel extends SyncBase {
  id: string;
  type: ChannelType;
  balance: number;
  wallet_id: string;
}

export interface Wallet extends SyncBase {
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
  channels: Channel[];
  color: string;
  icon: string;
  isVisible: boolean;
  isPrimary: boolean;
  usesPrimaryIncome: boolean;
  parentWalletId?: string;
}

export interface Category extends SyncBase {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: MasterCategoryType;
  isGlobal: boolean;
  parentId?: string;
  isDisabled: boolean;
  order: number;
  embedding?: number[];
}

export interface TransactionSplit extends SyncBase {
  id: string;
  transaction_id: string;
  walletId: string;
  categoryId: string;
  amount: number;
}

export interface Transaction extends SyncBase {
  id: string;
  amount: number;
  date: string;
  walletId: string;
  channelType: ChannelType;
  categoryId: string;
  note: string;
  type: MasterCategoryType;
  isSplit: boolean;
  splits: TransactionSplit[];
  toWalletId?: string;
  toChannelType?: ChannelType;
  linkedTransactionId?: string;
  isSubLedgerSync?: boolean;
  subLedgerId?: string;
  subLedgerName?: string;
  settlementGroupId?: string;
}

export interface Budget extends SyncBase {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  period: 'MONTHLY' | 'WEEKLY';
  spent?: number; // Runtime calculated
}

export interface CommitmentEvent {
  type: 'SETTLED' | 'POSTPONED' | 'MISSED' | 'CREATED';
  date: string;
  originalDate?: string;
  note?: string;
  amount?: number;
}

export interface Commitment extends SyncBase {
  id: string;
  name: string;
  amount: number;
  frequency: CommitmentFrequency;
  certaintyLevel: CertaintyLevel;
  type: CommitmentType;
  walletId?: string;
  nextDate: string;
  status: 'ACTIVE' | 'SETTLED' | 'CANCELLED';
  categoryId?: string;
  history?: CommitmentEvent[];
  isRecurring?: boolean;
}

export interface Transfer extends SyncBase {
  id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  from_channel: ChannelType;
  to_channel: ChannelType;
  amount: number;
  date: string;
  note: string;
}

export interface HealthScore {
  score: number;
  liquidity: number;
  stability: number;
  burnControl: number;
  commitmentCoverage: number;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // App Owner - Sees everything
  ADMIN = 'ADMIN',             // Org Admin - Manages members
  MEMBER = 'MEMBER'            // Regular User - Limited access
}

export interface UserProfile extends SyncBase {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isSuperAdmin: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  organizationId?: string;
  permissions?: Record<string, boolean>;
  version: number;
}

export type PlanStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED';
export type PlanType = 'SHOPPING' | 'TRAVEL' | 'EVENT' | 'CUSTOM';
export type ComponentType = 'QUANTIFIED' | 'ABSTRACT';

export interface FinancialPlan extends SyncBase {
  id: string;
  wallet_id?: string;
  plan_type: PlanType;
  title: string;
  status: PlanStatus;
  planned_date?: string;
  finalized_at?: string;
  total_amount: number;
  note?: string;
  components: PlanComponent[];
  settlements: PlanSettlement[];
}

export interface PlanComponent extends SyncBase {
  id: string;
  plan_id: string;
  name: string;
  component_type: ComponentType;
  quantity?: number;
  unit?: string;
  expected_cost?: number;
  final_cost?: number;
  category_id?: string;
  group_id?: string | null;
  group_parent_id?: string | null;
}

export interface PlanSettlement extends SyncBase {
  id: string;
  plan_id: string;
  channel_id: string;
  amount: number;
}

export interface GeminiKeyConfig {
  id: string;
  key: string;
  label: string;
  status: 'ACTIVE' | 'LIMITED' | 'INVALID';
  lastUsed?: number;
  limitedAt?: number;
}

export interface AppSettings {
  currency: string;
  theme: 'DARK' | 'LIGHT' | 'AMOLED';
  aiEnabled: boolean;
  biometricEnabled: boolean;
  accentColor: string;
  language: 'EN' | 'BN';
  privacyMode: boolean;
  glassIntensity: number;
  budgetStartDay: number;
  hapticEnabled: boolean;
  animationSpeed: 'FAST' | 'NORMAL' | 'RELAXED';
  defaultWalletId?: string;
  autoSync: boolean;
  decimalPlaces: number;
  showHealthScore: boolean;
  compactMode: boolean;
  lowBalanceThreshold: number;
  fontFamily: 'PLUS_JAKARTA' | 'INTER' | 'ROBOTO' | 'OUTFIT';
  animationIntensity: 'LOW' | 'MEDIUM' | 'HIGH';
  biometricLockTimeout: number; // in seconds
  soundEffectsEnabled: boolean;
  isAdminEnabled: boolean;
  customGeminiKey?: string;
  customSupabaseUrl?: string;
  customSupabaseKey?: string;
  isReadOnly?: boolean;
  maintenanceMode?: boolean;
  customAppName?: string;
  glassEffectsEnabled?: boolean;
  customLogoUrl?: string;
  preferredGeminiKeyID?: string;
  preferredGeminiModel?: string;
  globalAiInsights?: any[];
}

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

export interface AppNotification extends SyncBase {
  id: string;
  type: 'BALANCE_ALERT' | 'COMMITMENT_DUE' | 'PLAN_MILESTONE' | 'SYSTEM_ALERT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  data?: any; // JSON payload or object meta
  created_at: number;
}

export interface DeleteProgress {
  total: number;
  current: number;
  itemName: string;
  isDeleting: boolean;
  status: string;
  auditLog: string[]; // For premium live feed
}

export interface UndoItem {
  type: 'wallet' | 'transaction' | 'commitment' | 'budget' | 'category' | 'plan' | 'component' | 'settlement';
  data: any;
  timestamp: number;
}

export interface AppState {
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  commitments: Commitment[];
  notifications: AppNotification[];
  currencies: CurrencyConfig[];
  channelTypes: ChannelTypeConfig[];
  financialPlans: FinancialPlan[];
  healthScore: HealthScore;
  isLocked: boolean;
  userPin: string | null;
  profile: UserProfile;
  settings: AppSettings;
  isLoggedIn: boolean;
  sync_status: SyncStatusUI;
  activeGeminiKeyId?: string | null;
  globalGeminiKeys: GeminiKeyConfig[];
  deleteProgress: DeleteProgress;
  undoStack: UndoItem[]; // For premium smart undo
}

export interface SyncStatusUI {
  isOnline: boolean;
  isSyncing: boolean;
  progress: string | null;
  progressPercent: number;
  pendingCount: number;
  pendingOperations?: SyncQueueItem[];
  lastSyncAt: number | null;
  staticVersions: Record<string, number>;
  userSyncToken: number;
  serverStaticVersions?: Record<string, number>;
  serverUserSyncToken?: number;
  tableStatuses: Record<string, {
    status: 'idle' | 'syncing' | 'completed' | 'error';
    lastResult: string;
    progress: number;
    lastSyncTime?: number;
  }>;
  error: string | null;
  isInitialized: boolean;
  isGlobalInitialized: boolean;
  userId?: string | null;
}

export interface SyncQueueItem {
  id: string;
  entity: string;
  entity_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: string; // JSON
  created_at: number;
  retry_count: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}

export interface MetaSync {
  is_initialized: boolean;
  last_full_sync: number;
  static_versions?: string; // JSON
  last_user_sync_token: number;
  last_user_id?: string;
}
