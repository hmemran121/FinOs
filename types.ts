
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
}

export interface Budget extends SyncBase {
  id: string;
  targetId: string;
  limit: number;
  spent: number;
  type: 'SOFT' | 'HARD';
  period: 'MONTHLY' | 'WEEKLY';
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

export interface UserProfile {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
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
}

export interface PlanSettlement extends SyncBase {
  id: string;
  plan_id: string;
  channel_id: string;
  amount: number;
}

export interface AppSettings {
  currency: string;
  theme: 'DARK' | 'LIGHT' | 'AMOLED';
  aiEnabled: boolean;
  biometricEnabled: boolean;
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

export interface AppState {
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  commitments: Commitment[];
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
}

export interface SyncStatusUI {
  isOnline: boolean;
  isSyncing: boolean;
  progress: string | null;
  progressPercent: number;
  pendingCount: number;
  pendingOperations?: SyncQueueItem[];
  lastSyncAt: number | null;
  error: string | null;
  isInitialized: boolean;
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
}
