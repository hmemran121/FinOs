
import React, { useState, useMemo } from 'react';
import { WalletWithBalance } from '../store/FinanceContext';
import { useFinance } from '../store/FinanceContext';
import { MasterCategoryType, Transaction } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, addDays, subDays, addMonths, subMonths, isAfter, isToday, isYesterday, isSameDay, isSameMonth, isSameWeek } from 'date-fns';
import { ICON_MAP } from '../constants';
import { GlassCard } from './ui/GlassCard';
import TransactionForm from './TransactionForm';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  Calendar as CalendarIcon,
  PieChart as PieIcon,
  Clock,
  TrendingUp,
  Landmark,
  CreditCard,
  Smartphone,
  Coins,
  Wallet as WalletIcon,
  Plus,
  Link,
  ExternalLink,
  Filter,
  Search,
  Sparkles,
  ArrowDownWideNarrow,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Tag
} from 'lucide-react';
import TransactionDetailsModal from './TransactionDetailsModal';
import { CompactSelect } from './ui/CompactSelect';
import { PremiumCalendarPicker } from './ui/PremiumCalendarPicker';
import { StackedTransactionCard } from './StackedTransactionCard'; // Named import
import DynamicDeleteModal from './modals/DynamicDeleteModal';

interface Props {
  wallet: WalletWithBalance;
  onClose: () => void;
}

type Period = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

const WalletDetail: React.FC<Props> = ({ wallet, onClose }) => {
  const { transactions, categories, getCurrencySymbol, setActiveTab, setSelectedWalletId, deleteTransaction, wallets, settings } = useFinance(); // added settings
  // MODERNIZED STATE
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const [sortOrder, setSortOrder] = useState<'DATE_DESC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');
  const [showFilters, setShowFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | MasterCategoryType>('ALL');

  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showPrincipalOnly, setShowPrincipalOnly] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null); // Added for delete modal

  const dateInputRef = React.useRef<HTMLInputElement>(null); // Added ref for compat if needed

  const isBN = settings?.language === 'BN';

  // Determine which data to show based on toggle
  const displayBalance = showPrincipalOnly ? wallet.principalBalance : wallet.aggregateBalance;
  const displayChannels = showPrincipalOnly ? wallet.computedChannels : (wallet.aggregateChannels?.length > 0 ? wallet.aggregateChannels : wallet.computedChannels);
  const hasSubWallets = wallet.aggregateBalance !== wallet.principalBalance;

  // PRE-CALCULATE VISIBLE IDs
  const visibleWalletIds = useMemo(() => {
    const ids = new Set<string>();
    ids.add(wallet.id);

    // Only include children if NOT in "Principal Only" mode
    if (!showPrincipalOnly) {
      wallets.forEach(w => {
        if (w.parentWalletId === wallet.id) ids.add(w.id);
      });
    }
    return ids;
  }, [wallet.id, wallets, showPrincipalOnly]);

  // 1. GET RELEVANT TRANSACTIONS (Wallet + Children)
  const relevantTransactions = useMemo(() => {
    return transactions.filter(t => visibleWalletIds.has(t.walletId));
  }, [transactions, visibleWalletIds]);

  // 2. APPLY FILTERS (Date, Type, Search)
  const filteredTransactions = useMemo(() => {
    return relevantTransactions.filter(t => {
      const tDate = new Date(t.date);

      // DATE FILTER
      let isDateMatch = false;
      if (viewMode === 'DAY') isDateMatch = isSameDay(tDate, currentDate);
      else if (viewMode === 'WEEK') isDateMatch = isSameWeek(tDate, currentDate, { weekStartsOn: 6 });
      else if (viewMode === 'MONTH') isDateMatch = isSameMonth(tDate, currentDate);
      else if (viewMode === 'YEAR') isDateMatch = tDate.getFullYear() === currentDate.getFullYear();

      if (!isDateMatch) return false;

      // TYPE FILTER
      if (filterType !== 'ALL' && t.type !== filterType) return false;

      // SEARCH FILTER
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const cat = categories.find(c => c.id === t.categoryId);
        const matchesNote = t.note?.toLowerCase().includes(query) || false;
        const matchesCategory = cat?.name.toLowerCase().includes(query) || false;
        const matchesAmount = t.amount.toString().includes(query);
        return matchesNote || matchesCategory || matchesAmount;
      }

      return true;
    }).sort((a, b) => {
      // SORT ORDER
      if (sortOrder === 'AMOUNT_DESC') return b.amount - a.amount;
      if (sortOrder === 'AMOUNT_ASC') return a.amount - b.amount;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [relevantTransactions, currentDate, viewMode, filterType, searchQuery, categories, sortOrder]);

  // 3. GROUP BY DATE (For Sticky Headers)
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, { items: Transaction[], summary: { income: number, expense: number } }> = {};

    filteredTransactions.forEach(t => {
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = { items: [], summary: { income: 0, expense: 0 } };
      }
      groups[dateKey].items.push(t);

      if (t.type === MasterCategoryType.INCOME) groups[dateKey].summary.income += t.amount;
      else if (t.type === MasterCategoryType.EXPENSE) groups[dateKey].summary.expense += t.amount;
    });

    return groups;
  }, [filteredTransactions]);

  // DERIVED DATA FOR UI
  const activeCategories = useMemo(() => {
    const uniqueIds = new Set(filteredTransactions.map(t => t.categoryId));
    return categories.filter(c => uniqueIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTransactions, categories]);

  const periodStats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === MasterCategoryType.INCOME)
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === MasterCategoryType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);
    return { income, expense };
  }, [filteredTransactions]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return isBN ? 'আজ' : 'Today';
    if (isYesterday(date)) return isBN ? 'গতকাল' : 'Yesterday';
    return format(date, isBN ? 'EEEE, MMM dd' : 'EEEE, MMM dd');
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'BANK': return <Landmark size={14} />;
      case 'CARD': return <CreditCard size={14} />;
      case 'MOBILE': return <Smartphone size={14} />;
      default: return <Coins size={14} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-color)] flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden transition-colors">
      {/* Header - Ultra Compact Premium Design */}
      <div className="px-5 py-3 flex justify-between items-center bg-[var(--nav-bg)]/80 border-b border-[var(--border-glass)] backdrop-blur-2xl transition-colors shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-[var(--text-main)]/5 text-[var(--text-main)] active:scale-90 transition-all">
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--surface-deep)] border border-[var(--border-glass)] shadow-sm" style={{ color: wallet.color }}>
              {React.cloneElement((ICON_MAP[wallet.icon] || <Coins size={16} />) as React.ReactElement<any>, { size: 16 })}
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-black text-[var(--text-main)] leading-none tracking-tight">{wallet.name}</h2>
              <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-[0.15em] mt-0.5 opacity-60">{wallet.currency}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-[var(--surface-glass)] rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--text-muted)] active:scale-90 border border-transparent hover:border-red-500/20">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 space-y-4 pb-40">
        {/* Balance Card */}
        <GlassCard className="mt-4 bg-[var(--surface-deep)] border-[var(--border-glass)] p-6 relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 w-48 h-48 blur-[80px] -z-10 opacity-30" style={{ backgroundColor: wallet.color }} />
          <div className="flex justify-between items-start">
            <p className="text-[var(--text-muted)] text-sm font-medium transition-colors">
              {showPrincipalOnly ? 'Principal Balance (Own Funds)' : 'Total Aggregated Balance'}
            </p>
            {hasSubWallets && (
              <button
                onClick={() => setShowPrincipalOnly(!showPrincipalOnly)}
                className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border transition-all ${showPrincipalOnly ? 'bg-[var(--text-main)] text-[var(--bg-color)] border-transparent' : 'bg-transparent text-[var(--text-muted)] border-[var(--border-glass)]'}`}
              >
                {showPrincipalOnly ? 'Show All' : 'Show Principal'}
              </button>
            )}
          </div>
          <h1 className="text-4xl font-black tracking-tighter mt-1 text-[var(--text-main)] transition-colors">{getCurrencySymbol(wallet.currency)}{displayBalance.toLocaleString()}</h1>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-[var(--surface-glass)] p-4 rounded-2xl border border-[var(--border-glass)] transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <ArrowUpRight size={14} />
                <span className="text-[10px] font-black uppercase">Inflow</span>
              </div>
              <p className="font-bold text-[var(--text-main)] transition-colors">+{getCurrencySymbol(wallet.currency)}{periodStats.income.toLocaleString()}</p>
            </div>
            <div className="bg-[var(--surface-glass)] p-4 rounded-2xl border border-[var(--border-glass)] transition-colors">
              <div className="flex items-center gap-2 text-rose-400 mb-1">
                <ArrowDownLeft size={14} />
                <span className="text-[10px] font-black uppercase">Outflow</span>
              </div>
              <p className="font-bold text-[var(--text-main)] transition-colors">-{getCurrencySymbol(wallet.currency)}{periodStats.expense.toLocaleString()}</p>
            </div>
          </div>
        </GlassCard>

        {/* Channels Section */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1 transition-colors opacity-60">
            <Layers size={14} className="text-[var(--text-muted)]" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Linked Channels</h3>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {displayChannels.map(ch => (
              <div key={ch.type} className="bg-[var(--surface-deep)] border border-[var(--border-glass)] p-3 rounded-xl flex flex-col gap-2 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)] opacity-80">{React.cloneElement(getChannelIcon(ch.type) as React.ReactElement<any>, { size: 14 })}</span>
                  <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">{ch.type}</span>
                </div>
                <p className="text-xs font-bold text-[var(--text-main)] transition-colors">{getCurrencySymbol(wallet.currency)}{ch.balance.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TIME NAVIGATOR - SUPER COMPACT PREMIUM REDESIGN */}
        <div className="flex flex-col gap-1 bg-[var(--surface-deep)] rounded-xl p-1 border border-[var(--border-glass)] shadow-sm">
          {/* ROW 1: Date Navigation (Compact) */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => {
                if (viewMode === 'DAY') setCurrentDate(prev => subDays(prev, 1));
                if (viewMode === 'WEEK') setCurrentDate(prev => subDays(prev, 7));
                if (viewMode === 'MONTH') setCurrentDate(prev => subMonths(prev, 1));
                if (viewMode === 'YEAR') setCurrentDate(prev => subMonths(prev, 12));
              }}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-main)] transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-main)] text-center">
                {viewMode === 'DAY' && format(currentDate, 'dd MMM yyyy')}
                {viewMode === 'WEEK' && `${format(startOfWeek(currentDate, { weekStartsOn: 6 }), 'dd MMM')} - ${format(endOfWeek(currentDate, { weekStartsOn: 6 }), 'dd MMM')}`}
                {viewMode === 'MONTH' && format(currentDate, 'MMMM yyyy')}
                {viewMode === 'YEAR' && format(currentDate, 'yyyy')}
              </span>
            </div>

            <button
              onClick={() => {
                if (viewMode === 'DAY') setCurrentDate(prev => addDays(prev, 1));
                if (viewMode === 'WEEK') setCurrentDate(prev => addDays(prev, 7));
                if (viewMode === 'MONTH') setCurrentDate(prev => addMonths(prev, 1));
                if (viewMode === 'YEAR') setCurrentDate(prev => addMonths(prev, 12));
              }}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-main)] transition-all active:scale-95"
              disabled={isAfter(currentDate, new Date()) && viewMode !== 'YEAR'}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* ROW 2: Controls (Ultra Compact) */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <CompactSelect
                value={sortOrder}
                onChange={(val) => setSortOrder(val as any)}
                options={[
                  { value: 'DATE_DESC', label: isBN ? 'নতুন' : 'Newest', icon: <ArrowDownWideNarrow size={12} /> },
                  { value: 'AMOUNT_DESC', label: isBN ? 'বেশি' : 'High Amt', icon: <ArrowUpRight size={12} /> },
                  { value: 'AMOUNT_ASC', label: isBN ? 'কম' : 'Low Amt', icon: <ArrowDownLeft size={12} /> },
                ]}
                zIndex={60}
                className="w-full h-7 text-xs"
              />
            </div>

            <div className="flex-1 min-w-0">
              <CompactSelect
                value={viewMode}
                onChange={(val) => setViewMode(val as any)}
                options={[
                  { value: 'DAY', label: 'Day' },
                  { value: 'WEEK', label: 'Week' },
                  { value: 'MONTH', label: 'Month' },
                  { value: 'YEAR', label: 'Year' }
                ]}
                zIndex={60}
                className="w-full h-7 text-xs"
              />
            </div>

            {/* Calendar Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className={`h-7 w-7 flex items-center justify-center rounded-lg border transition-all active:scale-95 ${showCalendar ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30' : 'bg-[var(--surface-deep)] text-[var(--text-muted)] border-[var(--border-glass)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-main)]'}`}
              >
                <CalendarIcon size={14} />
              </button>

              {/* Premium Calendar Popover */}
              {showCalendar && (
                <div className="absolute right-0 top-full mt-2 z-[70]">
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowCalendar(false)} />
                  <div className="relative z-[70]">
                    <PremiumCalendarPicker
                      selectedDate={currentDate}
                      onChange={(date) => {
                        setCurrentDate(date);
                        setShowCalendar(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filter Toggle Trigger */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-7 w-7 flex items-center justify-center rounded-lg border transition-all active:scale-95 ${showFilters ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[var(--surface-deep)] border-[var(--border-glass)] text-[var(--text-muted)] hover:bg-[var(--surface-overlay)]'}`}
            >
              <Filter size={14} />
            </button>
          </div>
        </div>

        {/* FILTER PANEL */}
        {showFilters && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-300 bg-[var(--surface-overlay)]/30 p-3 rounded-2xl border border-[var(--border-glass)]">
            {/* TYPE FILTERS */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['ALL', MasterCategoryType.EXPENSE, MasterCategoryType.INCOME, MasterCategoryType.TRANSFER].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t as any)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterType === t ? 'bg-blue-600 text-white shadow-lg' : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-glass)]'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="h-[1px] bg-[var(--border-glass)] w-full opacity-50" />

            {/* CATEGORY FILTERS */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              <button
                onClick={() => setSearchQuery('')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 whitespace-nowrap group ${!searchQuery
                  ? 'bg-[var(--text-main)] border-[var(--text-main)] text-[var(--bg-color)] shadow-lg'
                  : 'bg-[var(--surface-deep)] border-[var(--border-glass)] text-[var(--text-muted)] hover:border-blue-500/30'
                  }`}
              >
                <span className="text-[9px] font-black uppercase tracking-widest">{isBN ? 'সবগুলো' : 'ALL'}</span>
              </button>

              {activeCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (searchQuery === cat.name) setSearchQuery('');
                    else setSearchQuery(cat.name);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 whitespace-nowrap group ${searchQuery.toLowerCase() === cat.name.toLowerCase()
                    ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-[var(--surface-deep)] border-[var(--border-glass)] text-[var(--text-muted)] hover:border-blue-500/30'
                    }`}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${searchQuery.toLowerCase() === cat.name.toLowerCase() ? 'bg-white/20' : 'bg-[var(--input-bg)]'}`}
                    style={{ color: searchQuery.toLowerCase() === cat.name.toLowerCase() ? '#fff' : cat.color }}
                  >
                    {ICON_MAP[cat.icon || 'Tag'] || <Tag size={10} />}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main List Area (Modern Sticky List) */}
        <div className="space-y-4">
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="text-center py-20 text-[var(--text-muted)] flex flex-col items-center gap-4 transition-colors">
              <div className="p-8 bg-[var(--input-bg)] rounded-full border border-dashed border-[var(--border-glass)]">
                <Search size={48} className="opacity-20 text-[var(--text-muted)]" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-lg text-[var(--text-muted)]">{isBN ? 'কোন রেকর্ড নেই' : 'Clear Skies'}</p>
                <p className="text-sm max-w-[200px] mx-auto opacity-50 font-medium leading-relaxed">{isBN ? 'এই ওয়ালেটে এই সময়ে কোন ট্রানজেকশন নেই' : 'No transactions found for this period.'}</p>
              </div>
            </div>
          ) : (
            (Object.entries(groupedTransactions) as [string, { items: Transaction[], summary: { income: number, expense: number } }][])
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, group]) => (
                <div key={date} className="relative mb-5">
                  {/* Sticky Header - Ultra Compact */}
                  <div className="sticky top-0 z-30 pt-1 pb-3 bg-transparent pointer-events-none">
                    <div className="bg-[var(--surface-overlay)]/60 backdrop-blur-2xl border border-[var(--border-glass)] rounded-xl px-3 py-2 mx-1 flex items-center justify-between shadow-lg pointer-events-auto">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner">
                          <CalendarIcon size={12} />
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-main)] transition-colors block leading-none">{getDateLabel(date)}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-70">{group.items.length} {isBN ? 'টি' : 'ITEMS'}</span>
                          </div>
                        </div>
                      </div>

                      {(group.summary.income > 0 || group.summary.expense > 0) && (
                        <div className="flex flex-col items-end leading-none">
                          <span className={`text-[9px] font-black tracking-tighter ${group.summary.income >= group.summary.expense ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {group.summary.income >= group.summary.expense ? '+' : ''}{getCurrencySymbol(wallet.currency)}{Math.abs(group.summary.income - group.summary.expense).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ATOMIC STACKS LOGIC */}
                  {(() => {
                    const renderedItems: (Transaction | Transaction[])[] = [];
                    const stackMap = new Map<string, Transaction[]>();

                    group.items.forEach(t => {
                      if (t.settlementGroupId) {
                        if (!stackMap.has(t.settlementGroupId)) stackMap.set(t.settlementGroupId, []);
                        stackMap.get(t.settlementGroupId)?.push(t);
                      }
                    });

                    const processedStackIds = new Set<string>();
                    group.items.forEach(t => {
                      if (t.settlementGroupId) {
                        if (!processedStackIds.has(t.settlementGroupId)) {
                          renderedItems.push(stackMap.get(t.settlementGroupId)!);
                          processedStackIds.add(t.settlementGroupId);
                        }
                      } else {
                        renderedItems.push(t);
                      }
                    });

                    return (
                      <div className="space-y-3 relative px-1 mt-2">
                        <div className="absolute left-[23px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--border-glass)] via-[var(--border-glass)] to-transparent opacity-30 z-0" />

                        {renderedItems.map((item, idx) => {
                          if (Array.isArray(item)) {
                            return (
                              <StackedTransactionCard
                                key={`stack-${item[0].settlementGroupId}`}
                                transactions={item}
                                onSelect={(t) => setSelectedTransaction(t)}
                                onDelete={(id) => setDeleteId(id)}
                              />
                            );
                          } else {
                            const t = item;
                            const cat = categories.find(c => c.id === t.categoryId);
                            const isInc = t.type === MasterCategoryType.INCOME;

                            return (
                              <div className="relative pl-10 mb-2 group/item">
                                {/* Timeline Node */}
                                <div className={`absolute left-[18px] top-5 w-[12px] h-[12px] rounded-full bg-[var(--surface-overlay)] border-2 z-10 shadow-xl ${isInc ? 'border-emerald-500' : 'border-rose-500'}`}>
                                  <div className={`absolute inset-0.5 rounded-full animate-pulse opacity-40 ${isInc ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                </div>

                                {/* Connector Line */}
                                <div className={`absolute left-[23px] top-8 bottom-[-16px] w-[2px] z-0 ${isInc ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`} />

                                <GlassCard
                                  key={t.id}
                                  className={`relative z-10 p-3 border-[var(--border-glass)] active:bg-[var(--surface-glass)] cursor-pointer transition-all ${t.linkedTransactionId ? 'hover:border-blue-500/30' : ''}`}
                                  onClick={() => setSelectedTransaction(t)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-deep)] border border-[var(--border-glass)] shrink-0 transition-colors" style={{ color: cat?.color }}>
                                        {ICON_MAP[cat?.icon || ''] || <TrendingUp size={18} />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-bold truncate text-[var(--text-main)] transition-colors">{cat?.name || 'Uncategorized'}</p>
                                          {t.linkedTransactionId && (
                                            <div className="flex items-center gap-1 bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/20 shrink-0">
                                              {t.isSubLedgerSync ? <Link size={8} className="text-blue-400" /> : <ExternalLink size={8} className="text-blue-400" />}
                                              <span className="text-[6px] font-black uppercase text-blue-400 tracking-tighter">{t.isSubLedgerSync ? 'REF' : 'SRC'}</span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                          {t.isSubLedgerSync && t.subLedgerName && (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-md border border-blue-500/20">
                                              <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter italic">via {t.subLedgerName}</span>
                                            </div>
                                          )}
                                          <span className="text-[9px] px-1.5 py-0.5 bg-[var(--surface-glass)] rounded-md border border-[var(--border-glass)] text-[var(--text-muted)] font-bold uppercase tracking-tighter transition-colors">
                                            {t.channelType}
                                          </span>
                                        </div>
                                        {t.note && <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1.5 line-clamp-1">{t.note}</p>}
                                      </div>
                                    </div>
                                    <p className={`font-black text-sm shrink-0 ml-2 transition-colors ${isInc ? 'text-emerald-400' : 'text-[var(--text-main)]'}`}>
                                      {isInc ? '+' : '-'}{getCurrencySymbol(wallet.currency)}{t.amount.toLocaleString()}
                                    </p>
                                  </div>
                                </GlassCard>
                              </div>
                            );
                          }
                        })}
                      </div>
                    );
                  })()}
                </div>
              ))
          )}
        </div>

        {/* Dynamic Delete Modal */}
        <DynamicDeleteModal
          isOpen={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={(cascade) => {
            if (deleteId) {
              deleteTransaction(deleteId);
              setDeleteId(null);
              if (selectedTransaction?.id === deleteId) setSelectedTransaction(null);
            }
          }}
          title={isBN ? 'ট্রানজেকশন ডিলিট করুন' : 'Delete Transaction'}
          itemName={isBN ? 'এই ট্রানজেকশন' : 'this transaction'}
          itemType="transaction"
          hasDependencies={false}
        />
      </div>

      {/* Floating Action Button for New Transaction */}
      <div className="fixed bottom-10 right-8 z-[100]">
        <button
          onClick={() => setShowAddTransaction(true)}
          className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-blue-600/40 hover:scale-105 active:scale-90 transition-all ring-4 ring-[var(--bg-color)] transition-all duration-300"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      </div>

      {showAddTransaction && (
        <TransactionForm
          onClose={() => setShowAddTransaction(false)}
          initialWalletId={wallet.id}
        />
      )}

      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDelete={(id) => {
          setSelectedTransaction(null);
          deleteTransaction(id);
        }}
      />
    </div>
  );
};

export default WalletDetail;
