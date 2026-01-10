
import React, { useState, useMemo } from 'react';
import { useFinance } from '../store/FinanceContext';
import { ICON_MAP } from '../constants';
import { MasterCategoryType, Transaction } from '../types';
import { format, isToday, isYesterday } from 'date-fns';
import { GlassCard } from './ui/GlassCard';
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
  Unlink
} from 'lucide-react';
import DynamicDeleteModal from './modals/DynamicDeleteModal';
import TransactionDetailsModal from './TransactionDetailsModal';

const TransactionList: React.FC = () => {
  const { transactions, categories, wallets, deleteTransaction, formatCurrency, settings, setActiveTab, setSelectedWalletId } = useFinance();
  const isBN = settings.language === 'BN';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<MasterCategoryType | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getCategory = (id: string) => categories.find(c => c.id === id);
  const getWallet = (id: string) => wallets.find(w => w.id === id);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const wallet = getWallet(t.walletId);
      const category = getCategory(t.categoryId);

      // Sub-Ledger Filter Logic:
      // 1. Never show transactions from a Sub-Ledger wallet in the main timeline
      // 2. Only show transactions that are either in a Primary wallet OR are NOT a reference/sync transaction
      const isSubLedgerWallet = !!wallet?.parentWalletId;
      const isPrimary = !!wallet?.isPrimary;
      const isSyncRef = !!t.isSubLedgerSync;

      // Logic: If it's a sub-ledger wallet, don't show it here.
      // If it's a primary wallet, show it (even if it's a sync ref).
      // If it's a regular wallet, show it ONLY if it's NOT a sync ref (unlikely but safe).
      const shouldShow = !isSubLedgerWallet && (isPrimary || !isSyncRef);

      if (!shouldShow) return false;

      const matchesSearch =
        t.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wallet?.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'ALL' || t.type === filterType;
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, filterType, categories, wallets]);

  const groupedTransactions = useMemo((): Record<string, Transaction[]> => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      const date = format(new Date(t.date), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(t);
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
    <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="space-y-4 px-1">
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input
            type="text"
            placeholder={isBN ? 'সার্চ করুন...' : 'Search notes, wallets, or categories...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none transition-all placeholder:text-[var(--text-muted)] font-medium text-[var(--text-main)]"
            style={{ borderColor: searchQuery ? settings.accentColor + '50' : '' }}
          />
        </div>

        {showFilters && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 animate-in slide-in-from-top-2 duration-300">
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
        )}
      </div>

      <div className="space-y-8">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)] flex flex-col items-center gap-4 transition-colors">
            <div className="p-8 bg-[var(--input-bg)] rounded-full border border-dashed border-[var(--border-glass)]">
              <Calendar size={48} className="opacity-20 text-[var(--text-muted)]" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-lg text-[var(--text-muted)]">{isBN ? 'কোন রেকর্ড নেই' : 'Clear Skies'}</p>
              <p className="text-sm max-w-[200px] mx-auto opacity-50 font-medium leading-relaxed">{isBN ? 'আপনি এখনও কোন ট্রানজেকশন করেননি' : 'No transactions found.'}</p>
            </div>
          </div>
        ) : (
          /* Cast Object.entries to ensure 'items' is typed as Transaction[] to resolve line 122 error potential */
          (Object.entries(groupedTransactions) as [string, Transaction[]][])
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, items]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">{getDateLabel(date)}</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--border-glass)] to-transparent" />
                </div>

                <div className="space-y-3">
                  {items.map((t) => {
                    const cat = getCategory(t.categoryId);
                    const wallet = getWallet(t.walletId);
                    const destWallet = t.toWalletId ? getWallet(t.toWalletId) : null;
                    const isIncome = t.type === MasterCategoryType.INCOME;
                    const isTransfer = t.type === MasterCategoryType.TRANSFER;

                    return (
                      <div key={t.id} className="relative group">
                        <GlassCard
                          className={`p-4 border-l-0 overflow-hidden active:bg-[var(--surface-glass)] transition-all duration-500 cursor-pointer ${isTransfer ? 'border-blue-500/20 bg-blue-500/5' : 'border-[var(--border-glass)]'} ${highlightedId === t.id ? 'ring-2 ring-blue-500 bg-blue-500/10 scale-[1.02]' : ''}`}
                          onClick={() => {
                            setSelectedTransaction(t);
                          }}
                          id={`txn-${t.id}`}
                        >
                          <div className="flex justify-between items-start gap-4 relative z-10">
                            <div className="flex items-start gap-4 flex-1">
                              {/* ... Icon ... */}
                              <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center border border-[var(--border-glass)] relative shrink-0 transition-colors"
                                style={{ backgroundColor: isTransfer ? `${settings.accentColor}15` : `${cat?.color}15`, color: isTransfer ? settings.accentColor : cat?.color }}
                              >
                                {isTransfer ? <ArrowRightLeft size={20} /> : (ICON_MAP[cat?.icon || ''] || <Tag size={20} />)}
                                {!isTransfer && (
                                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-lg border-2 border-[var(--bg-color)] flex items-center justify-center ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'} transition-colors`}>
                                    {isIncome ? <ArrowUpRight size={10} className="text-white" /> : <ArrowDownLeft size={10} className="text-white" />}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm truncate text-[var(--text-main)] transition-colors">
                                      {isTransfer ? 'Internal Transfer' : (cat?.name || 'Uncategorized')}
                                    </p>
                                    {t.linkedTransactionId && (
                                      <div className="flex items-center gap-1 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                        {t.isSubLedgerSync ? <Link size={8} className="text-blue-400" /> : <ExternalLink size={8} className="text-blue-400" />}
                                        <span className="text-[7px] font-black uppercase text-blue-400 tracking-widest">{t.isSubLedgerSync ? 'Ref' : 'Src'}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isTransfer ? (
                                      <div className="flex items-center gap-2 bg-[var(--surface-deep)] px-2 py-1 rounded-lg border border-[var(--border-glass)] transition-colors">
                                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-tighter transition-colors">{wallet?.name}</span>
                                        <MoveRight size={10} className="text-[var(--text-muted)] opacity-50" />
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">{destWallet?.name}</span>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--surface-deep)] rounded-md border border-[var(--border-glass)] transition-colors">
                                          <WalletIcon size={10} style={{ color: wallet?.color || '#94a3b8' }} />
                                          <span className={`text-[10px] font-bold truncate max-w-[80px] transition-colors ${wallet?.isPrimary ? 'text-blue-500' : 'text-[var(--text-muted)]'}`}>
                                            {wallet?.name || 'Unknown Wallet'}
                                          </span>
                                          {!wallet && (
                                            <div className="flex items-center gap-1 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 ml-1">
                                              <Unlink size={8} className="text-amber-500" />
                                              <span className="text-[7px] font-black uppercase text-amber-500 tracking-widest">Orphan</span>
                                            </div>
                                          )}
                                        </div>
                                        {t.isSubLedgerSync && t.subLedgerName && (
                                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-md border border-blue-500/20">
                                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter italic">via {t.subLedgerName}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--surface-deep)] rounded-md border border-[var(--border-glass)] transition-colors">
                                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase transition-colors">
                                            {t.channelType}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-[var(--text-muted)] mt-1 truncate italic font-medium transition-colors">
                                    {t.note || 'No description added'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 transition-transform duration-500 group-hover:-translate-x-12">
                              <p className={`font-black text-base tracking-tight transition-colors ${isTransfer ? 'text-blue-400' : (isIncome ? 'text-emerald-500' : 'text-[var(--text-main)]')}`}>
                                {isTransfer ? '' : (isIncome ? '+' : '-')}{formatCurrency(t.amount, wallet?.currency)}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tighter mt-1 transition-colors">
                                {format(new Date(t.date), 'h:mm a')}
                              </p>
                            </div>
                          </div>

                          <div className="absolute top-0 right-0 h-full flex translate-x-[105%] group-hover:translate-x-0 transition-transform duration-500 ease-out z-20 rounded-l-3xl overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.1)]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(t.id);
                              }}
                              className="h-full px-6 bg-rose-600 text-white flex items-center justify-center active:bg-rose-700 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </GlassCard>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>

      {filteredTransactions.length > 0 && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[85%] max-w-xs animate-in slide-in-from-bottom-10 duration-500">
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
      )}

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
            setDeleteId(null);
          }
        }}
        title="Delete Transaction"
        itemName="this transaction"
        itemType="transaction"
        hasDependencies={false}
      />
    </div>
  );
};

export default TransactionList;
