
import React, { useState, useMemo, useRef } from 'react';
import { useFinance } from '../store/FinanceContext';
import { ICON_MAP } from '../constants';
import { MasterCategoryType, Transaction } from '../types';

import { GlassCard } from './ui/GlassCard';
import { CompactSelect } from './ui/CompactSelect';
import {
  Trash2,
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet as WalletIcon,
  Tag,
  ArrowRightLeft,
  MoveRight,
  ExternalLink,
  Link,
  Unlink,
  Sparkles,
  ArrowDownWideNarrow,
  CalendarRange,
  Layers,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { PremiumCalendarPicker } from './ui/PremiumCalendarPicker';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, subMonths, isAfter, startOfMonth, endOfMonth, addMonths, isSameMonth, isSameDay, startOfWeek, endOfWeek, addDays, subDays, isSameWeek } from 'date-fns';
import DynamicDeleteModal from './modals/DynamicDeleteModal';
import TransactionDetailsModal from './TransactionDetailsModal';
import { StackedTransactionCard } from './StackedTransactionCard';

const TransactionList: React.FC = () => {
  const { transactions, categories, wallets, deleteTransaction, formatCurrency, settings, selectedWalletId, setActiveTab, setSelectedWalletId } = useFinance();
  const isBN = settings.language === 'BN';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<MasterCategoryType | 'ALL'>('ALL');
  const [sortOrder, setSortOrder] = useState<'DATE_DESC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStart = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 60;

  const getCategory = (id: string) => categories.find(c => c.id === id);
  const getWallet = (id: string) => wallets.find(w => w.id === id);

  const usedCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    transactions.forEach(t => ids.add(t.categoryId));
    return ids;
  }, [transactions]);

  const activeCategories = useMemo(() => {
    return categories
      .filter(c => usedCategoryIds.has(c.id))
      .filter(c => filterType === 'ALL' || c.type === filterType)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, usedCategoryIds, filterType]);

  // Optimize: Pre-calculate visible wallet IDs for the selected view
  const visibleWalletIds = useMemo(() => {
    if (!selectedWalletId) return null;
    const ids = new Set<string>();
    ids.add(selectedWalletId);
    // Add all children (sub-wallets) of the selected wallet
    wallets.forEach(w => {
      if (w.parentWalletId === selectedWalletId) {
        ids.add(w.id);
      }
    });
    return ids;
  }, [selectedWalletId, wallets]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const wallet = getWallet(t.walletId);
      const category = getCategory(t.categoryId);

      // Dynamic Wallet Architecture Filter Logic:
      // 1. If a specific wallet is selected in the global context (selectedWalletId):
      //    a. If it's a Primary Wallet, show its own transactions AND transactions from all its sub-wallets (children).
      //    b. If it's a Sub-Wallet, show ONLY its own transactions.
      // 2. If no wallet is selected (Global Timeline), show everything.

      // Dynamic Wallet Architecture Filter Logic
      // Optimized: Check against pre-calculated set of visible wallet IDs
      if (selectedWalletId && visibleWalletIds) {
        if (!visibleWalletIds.has(t.walletId)) return false;
      }

      // Match found in visible set or no wallet selected

      const matchesSearch =
        (t.note || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (wallet?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'ALL' || t.type === filterType;

      // Time Navigator Logic: Dynamic Period Matching
      const tDate = new Date(t.date);
      let matchesDate = false;

      if (viewMode === 'DAY') matchesDate = isSameDay(tDate, currentDate);
      if (viewMode === 'WEEK') matchesDate = isSameWeek(tDate, currentDate, { weekStartsOn: 6 }); // Week starts Saturday
      if (viewMode === 'MONTH') matchesDate = isSameMonth(tDate, currentDate) && tDate.getFullYear() === currentDate.getFullYear();
      if (viewMode === 'YEAR') matchesDate = tDate.getFullYear() === currentDate.getFullYear();

      return matchesSearch && matchesType && matchesDate;


    }).sort((a, b) => {
      // Smart Filter: Sort Logic
      if (sortOrder === 'AMOUNT_DESC') return b.amount - a.amount;
      if (sortOrder === 'AMOUNT_ASC') return a.amount - b.amount;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions, searchQuery, filterType, categories, wallets, selectedWalletId, sortOrder, currentDate]);

  const groupedTransactions = useMemo((): Record<string, { items: Transaction[], summary: { income: number, expense: number } }> => {
    const groups: Record<string, { items: Transaction[], summary: { income: number, expense: number } }> = {};
    filteredTransactions.forEach(t => {
      const date = format(new Date(t.date), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = { items: [], summary: { income: 0, expense: 0 } };
      }
      groups[date].items.push(t);
      if (t.type === MasterCategoryType.INCOME) groups[date].summary.income += t.amount;
      if (t.type === MasterCategoryType.EXPENSE) groups[date].summary.expense += t.amount;
    });
    return groups;
  }, [filteredTransactions]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return isBN ? 'আজ' : 'Today';
    if (isYesterday(date)) return isBN ? 'গতকাল' : 'Yesterday';
    return format(date, isBN ? 'EEEE, MMM dd' : 'EEEE, MMM dd'); // format handles locale if configured, but keeping it simple
  };

  return (
    <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="space-y-2 px-1">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)] transition-colors">
            {isBN ? 'টাইমলাইন' : 'Timeline'}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl border transition-all ${showFilters ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[var(--input-bg)] border-[var(--border-glass)] text-[var(--text-muted)]'}`}
              style={showFilters ? { backgroundColor: settings.accentColor, borderColor: settings.accentColor } : {}}
            >
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder={isBN ? 'সার্চ করুন...' : 'Search notes, wallets, or categories...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-[var(--text-muted)] font-medium text-[var(--text-main)] shadow-inner"
          />
        </div>

        {/* TIME NAVIGATOR - SUPER COMPACT PREMIUM REDESIGN */}
        <div className="flex flex-col gap-1 bg-[var(--surface-deep)] rounded-xl p-1.5 border border-[var(--border-glass)] shadow-sm">

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
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-main)] text-center">
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
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setShowCalendar(false)}
                  />
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
          </div>
        </div>

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
      </div>

      <div className="space-y-4">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)] flex flex-col items-center gap-4 transition-colors">
            <div className="p-8 bg-[var(--input-bg)] rounded-full border border-dashed border-[var(--border-glass)]">
              <Search size={48} className="opacity-20 text-[var(--text-muted)]" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-lg text-[var(--text-muted)]">{isBN ? 'কোন রেকর্ড নেই' : 'Clear Skies'}</p>
              <p className="text-sm max-w-[200px] mx-auto opacity-50 font-medium leading-relaxed">{isBN ? 'আপনি এখনও কোন ট্রানজেকশন করেননি' : 'No transactions found.'}</p>
            </div>
          </div>
        ) : (
          (Object.entries(groupedTransactions) as [string, { items: Transaction[], summary: { income: number, expense: number } }][])
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, group], groupIdx, allGroups) => {
              const prevGroup = groupIdx > 0 ? allGroups[groupIdx - 1][1] : null;
              const expenseDiff = prevGroup ? group.summary.expense - prevGroup.summary.expense : 0;
              const isSpike = prevGroup && group.summary.expense > prevGroup.summary.expense * 1.3 && group.summary.expense > 1000;

              return (
                <React.Fragment key={date}>
                  {/* CONTEXTUAL BRIEFING - POINT 7 */}
                  {isSpike && (
                    <div className="mx-2 mb-8 animate-in slide-in-from-left-5 duration-700">
                      <div className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/20 rounded-3xl p-4 flex items-center gap-4 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                          <Sparkles size={40} className="text-amber-500" />
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-lg">
                          <Sparkles size={20} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-1">Financial Pulse</h4>
                          <p className="text-xs font-bold text-[var(--text-main)] italic">
                            {isBN
                              ? `পূর্ববর্তী দিনের তুলনায় আজ আপনার ব্যয় ${prevGroup.summary.expense > 0 ? Math.round((expenseDiff / prevGroup.summary.expense) * 100) : 100}% বেড়ে গেছে।`
                              : `Today's outflow is ${prevGroup.summary.expense > 0 ? Math.round((expenseDiff / prevGroup.summary.expense) * 100) : 100}% higher than the previous period.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative mb-5">
                    {/* Sticky Header with Daily Pulse */}
                    <div className="sticky top-[80px] z-30 pt-2 pb-4 bg-transparent pointer-events-none">
                      <div className="bg-[var(--surface-overlay)]/40 backdrop-blur-2xl border border-[var(--border-glass)] rounded-2xl px-4 py-3 mx-1 flex items-center justify-between shadow-lg pointer-events-auto transform translate-y-0 active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner">
                            <Calendar size={14} />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-main)] transition-colors">{getDateLabel(date)}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-1 h-1 rounded-full bg-blue-500/40" />
                              <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">{group.items.length} {isBN ? 'টি রেকর্ড' : 'ENTRIES'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          {(group.summary.income > 0 || group.summary.expense > 0) && (
                            <div className="flex flex-col items-end">
                              <span className={`text-[10px] font-black tracking-tighter ${group.summary.income >= group.summary.expense ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {group.summary.income >= group.summary.expense ? '+' : ''}{formatCurrency(group.summary.income - group.summary.expense)}
                              </span>
                              <span className="text-[7px] font-black uppercase text-[var(--text-muted)] tracking-widest opacity-50">{isBN ? 'দিনভিত্তিক নেট' : 'DAILY NET'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* The logic for renderedItems needs to be hoisted outside the JSX return of the map, but inside the React.Fragment */}
                    {(() => {
                      // Advanced Grouping Logic for "Atomic Stacks"
                      const renderedItems: (Transaction | Transaction[])[] = [];
                      const stackMap = new Map<string, Transaction[]>();

                      // First pass: Collect all stacks
                      group.items.forEach(t => {
                        if (t.settlementGroupId) {
                          if (!stackMap.has(t.settlementGroupId)) {
                            stackMap.set(t.settlementGroupId, []);
                          }
                          stackMap.get(t.settlementGroupId)?.push(t);
                        }
                      });

                      // Second pass: Build display list (Singles + Stacks in order)
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
                              // Render Stack
                              return (
                                <StackedTransactionCard
                                  key={`stack-${item[0].settlementGroupId}`}
                                  transactions={item}
                                  onSelect={(t) => setSelectedTransaction(t)}
                                  onDelete={(id) => setDeleteId(id)}
                                />
                              );
                            } else {
                              // Render Single Transaction (Original Logic)
                              const t = item;
                              const cat = getCategory(t.categoryId);
                              const wallet = getWallet(t.walletId);
                              const destWallet = t.toWalletId ? getWallet(t.toWalletId) : null;
                              const isIncome = t.type === MasterCategoryType.INCOME;
                              const isTransfer = t.type === MasterCategoryType.TRANSFER;

                              return (
                                <div key={t.id} className="relative group/card pl-10">

                                  {/* Interactive Node Path */}
                                  <div className="absolute left-[18px] top-5 w-[12px] h-[12px] rounded-full bg-[var(--surface-overlay)] border-2 border-[var(--border-glass)] z-10 transition-all group-hover/card:scale-150 group-hover/card:border-blue-500 shadow-xl"
                                    style={{ borderColor: isIncome ? '#10b981' : isTransfer ? '#3b82f6' : '#f43f5e' }}>
                                    <div className={`absolute inset-0.5 rounded-full animate-pulse opacity-40 ${isIncome ? 'bg-emerald-500' : isTransfer ? 'bg-blue-500' : 'bg-rose-500'}`} />
                                  </div>

                                  {/* Type Path Link */}
                                  {idx < renderedItems.length - 1 && (
                                    <div className={`absolute left-[23px] top-8 bottom-[-16px] w-[2px] z-0 transition-opacity duration-500 ${isIncome ? 'bg-emerald-500/20' : isTransfer ? 'bg-blue-500/20' : 'bg-rose-500/20'}`} />
                                  )}

                                  <GlassCard
                                    className={`p-2 border-l-0 overflow-hidden active:scale-[0.98] transition-all duration-500 cursor-pointer hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:border-blue-500/30 group/inner ${highlightedId === t.id ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''}`}
                                    onClick={() => {
                                      if (Math.abs(swipeOffset) < 10) setSelectedTransaction(t);
                                    }}
                                    id={`txn-${t.id}`}
                                    style={{
                                      transform: swipeId === t.id ? `translate3d(${swipeOffset}px, 0, 0)` : '',
                                      transition: swipeId === t.id ? 'none' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                    }}
                                    onTouchStart={(e) => {
                                      touchStart.current = e.touches[0].clientX;
                                      setSwipeId(t.id);
                                    }}
                                    onTouchMove={(e) => {
                                      if (touchStart.current === null) return;
                                      const currentX = e.touches[0].clientX;
                                      const diff = currentX - touchStart.current;
                                      if (diff < 0) { // Only swipe left
                                        setSwipeOffset(Math.max(diff, -100));
                                      }
                                    }}
                                    onTouchEnd={() => {
                                      if (swipeOffset < -SWIPE_THRESHOLD) {
                                        setSwipeOffset(-80);
                                      } else {
                                        setSwipeOffset(0);
                                        setSwipeId(null);
                                      }
                                      touchStart.current = null;
                                    }}
                                  >
                                    <div className="flex justify-between items-center gap-2 relative z-10">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div
                                          className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border-glass)] relative shrink-0 transition-all duration-500 group-hover/inner:scale-110 shadow-lg"
                                          style={{ backgroundColor: isTransfer ? `${settings.accentColor}15` : `${cat?.color}15`, color: isTransfer ? settings.accentColor : cat?.color }}
                                        >
                                          {isTransfer ? <ArrowRightLeft size={13} /> : (ICON_MAP[cat?.icon || ''] || <Tag size={13} />)}
                                          {!isTransfer && (
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded border border-[var(--bg-color)] flex items-center justify-center ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'} transition-colors shadow-lg`}>
                                              {isIncome ? <ArrowUpRight size={5} className="text-white" /> : <ArrowDownLeft size={5} className="text-white" />}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                              <p className="font-black text-[11px] truncate text-[var(--text-main)] group-hover/inner:text-blue-500 transition-colors uppercase italic tracking-tight leading-tight">
                                                {isTransfer ? (isBN ? 'অভ্যন্তরীণ স্থানান্তর' : 'Internal Transfer') : (cat?.name || 'Uncategorized')}
                                              </p>
                                              {t.linkedTransactionId && (
                                                <div className="flex items-center gap-0.5 bg-blue-500/10 px-1 py-px rounded border border-blue-500/20">
                                                  {t.isSubLedgerSync ? <Link size={8} className="text-blue-400" /> : <ExternalLink size={8} className="text-blue-400" />}
                                                  <span className="text-[6px] font-black uppercase text-blue-400 tracking-widest">{t.isSubLedgerSync ? 'Ref' : 'Src'}</span>
                                                </div>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1 flex-wrap mt-0">
                                              {isTransfer ? (
                                                <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter text-blue-400">
                                                  <span>{wallet?.name.split(' ')[0]}</span>
                                                  <MoveRight size={8} className="opacity-50" />
                                                  <span>{destWallet?.name.split(' ')[0]}</span>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-1">
                                                  <span className={`text-[8px] font-black uppercase tracking-widest ${wallet?.isPrimary ? 'text-blue-500' : 'text-[var(--text-muted)] opacity-60'}`}>
                                                    {wallet?.name.split(' ')[0]}
                                                  </span>
                                                  <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40">
                                                    [{t.channelType}]
                                                  </span>
                                                </div>
                                              )}
                                            </div>

                                            <p className="text-[8px] text-[var(--text-muted)] mt-0.5 truncate italic font-bold tracking-tight opacity-70 transition-colors group-hover/inner:opacity-100 leading-tight">
                                              {t.note || (isBN ? 'কোন বর্ণনা নেই' : 'No description added')}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className={`font-black text-xs tracking-tight transition-all duration-500 group-hover/inner:scale-110 ${isTransfer ? 'text-blue-400' : (isIncome ? 'text-emerald-500' : 'text-[var(--text-main)]')}`}>
                                          {isTransfer ? '' : (isIncome ? '+' : '-')}{formatCurrency(t.amount, wallet?.currency)}
                                        </p>
                                        <p className="text-[7px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] mt-0 transition-colors opacity-40">
                                          {format(new Date(t.date), 'h:mm a')}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Decorative Corner Shimmer */}
                                    <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full opacity-0 group-hover/inner:opacity-50 transition-opacity" />

                                    <div
                                      className={`absolute top-0 right-0 h-full flex transition-all duration-500 ease-out z-20 rounded-l-3xl overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.2)] ${swipeId === t.id && swipeOffset <= -SWIPE_THRESHOLD ? 'translate-x-0' : 'translate-x-[105%] group-hover/card:translate-x-0'}`}
                                      style={{
                                        transform: (swipeId === t.id && swipeOffset < 0) ? `translate3d(${Math.max(0, 100 + swipeOffset)}%, 0, 0)` : undefined
                                      }}
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteId(t.id);
                                        }}
                                        className="h-full px-7 bg-gradient-to-b from-rose-500 to-rose-600 text-white flex items-center justify-center active:brightness-90 transition-all border-l border-white/10"
                                      >
                                        <Trash2 size={20} />
                                      </button>
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
                </React.Fragment>
              );
            })
        )}
      </div>

      {
        filteredTransactions.length > 0 && (
          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[85%] max-w-xs animate-in slide-in-from-bottom-10 duration-500 z-50">
            <div className="bg-[var(--nav-bg)] backdrop-blur-xl border border-[var(--border-glass)] p-3 rounded-2xl flex justify-around items-center shadow-2xl transition-colors">
              <div className="text-center">
                <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest transition-colors">{isBN ? 'আয়' : 'Inflow'}</p>
                <p className="text-xs font-bold text-emerald-400">
                  +{formatCurrency(filteredTransactions.filter(t => t.type === MasterCategoryType.INCOME).reduce((acc, t) => acc + t.amount, 0))}
                </p>
              </div>
              <div className="w-[1px] h-6 bg-[var(--border-glass)]" />
              <div className="text-center">
                <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest transition-colors">{isBN ? 'ব্যয়' : 'Outflow'}</p>
                <p className="text-xs font-bold text-rose-400">
                  -{formatCurrency(filteredTransactions.filter(t => t.type === MasterCategoryType.EXPENSE).reduce((acc, t) => acc + t.amount, 0))}
                </p>
              </div>
            </div>
          </div>
        )
      }

      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDelete={(id) => setDeleteId(id)}
      />

      <DynamicDeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={(cascade) => {
          if (deleteId) {
            deleteTransaction(deleteId); // Scale cascade logic if needed for transactions
          }
        }}
        title="Delete Transaction"
        itemName="this transaction"
        itemType="transaction"
        hasDependencies={false}
      />
    </div >
  );
};

export default TransactionList;
