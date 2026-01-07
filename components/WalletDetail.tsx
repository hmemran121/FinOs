
import React, { useState, useMemo } from 'react';
import { WalletWithBalance } from '../store/FinanceContext';
import { useFinance } from '../store/FinanceContext';
import { MasterCategoryType, Transaction } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { ICON_MAP } from '../constants';
import { GlassCard } from './ui/GlassCard';
import TransactionForm from './TransactionForm';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  Calendar,
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
  ExternalLink
} from 'lucide-react';
import TransactionDetailsModal from './TransactionDetailsModal';

interface Props {
  wallet: WalletWithBalance;
  onClose: () => void;
}

type Period = 'WEEK' | 'MONTH' | 'YEAR' | 'ALL';

const WalletDetail: React.FC<Props> = ({ wallet, onClose }) => {
  const { transactions, categories, getCurrencySymbol, setActiveTab, setSelectedWalletId, deleteTransaction } = useFinance();
  const [period, setPeriod] = useState<Period>('MONTH');
  const [viewMode, setViewMode] = useState<'HISTORY' | 'CATEGORIES'>('HISTORY');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const walletTransactions = useMemo(() => {
    const now = new Date();
    let interval: { start: Date; end: Date } | null = null;

    if (period === 'WEEK') interval = { start: startOfWeek(now), end: endOfWeek(now) };
    else if (period === 'MONTH') interval = { start: startOfMonth(now), end: endOfMonth(now) };
    else if (period === 'YEAR') interval = { start: startOfYear(now), end: endOfYear(now) };

    return transactions.filter(t => {
      const isCorrectWallet = t.walletId === wallet.id;
      if (!isCorrectWallet) return false;
      if (!interval) return true;
      return isWithinInterval(new Date(t.date), interval);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, wallet.id, period]);

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, { amount: number; count: number; category: any }> = {};
    walletTransactions.forEach(t => {
      if (!breakdown[t.categoryId]) {
        breakdown[t.categoryId] = { amount: 0, count: 0, category: categories.find(c => c.id === t.categoryId) };
      }
      breakdown[t.categoryId].amount += t.amount;
      breakdown[t.categoryId].count += 1;
    });
    return Object.values(breakdown).sort((a, b) => b.amount - a.amount);
  }, [walletTransactions, categories]);

  const periodStats = useMemo(() => {
    const income = walletTransactions
      .filter(t => t.type === MasterCategoryType.INCOME)
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = walletTransactions
      .filter(t => t.type === MasterCategoryType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);
    return { income, expense };
  }, [walletTransactions]);

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
      {/* Header */}
      <div className="px-6 py-8 flex justify-between items-center bg-[var(--nav-bg)] border-b border-[var(--border-glass)] backdrop-blur-xl transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--surface-deep)] border border-[var(--border-glass)] transition-colors" style={{ color: wallet.color }}>
            {ICON_MAP[wallet.icon] || <Coins size={24} />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)] transition-colors">{wallet.name}</h2>
            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-widest transition-colors">{wallet.currency} Account</p>
          </div>
        </div>
        <button onClick={onClose} className="p-3 bg-[var(--surface-glass)] rounded-2xl hover:bg-blue-500/10 transition-colors text-[var(--text-main)]">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-4 pb-40">
        {/* Balance Card */}
        <GlassCard className="bg-[var(--surface-deep)] border-[var(--border-glass)] p-6 relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 w-48 h-48 blur-[80px] -z-10 opacity-30" style={{ backgroundColor: wallet.color }} />
          <p className="text-[var(--text-muted)] text-sm font-medium transition-colors">Available Balance</p>
          <h1 className="text-4xl font-black tracking-tighter mt-1 text-[var(--text-main)] transition-colors">{getCurrencySymbol(wallet.currency)}{wallet.currentBalance.toLocaleString()}</h1>

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
          <div className="flex items-center gap-2 mb-4 px-1 transition-colors">
            <Layers size={18} className="text-[var(--text-muted)]" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Linked Channels</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {wallet.computedChannels.map(ch => (
              <div key={ch.type} className="bg-[var(--surface-deep)] border border-[var(--border-glass)] p-4 rounded-2xl flex flex-col gap-2 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">{getChannelIcon(ch.type)}</span>
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase">{ch.type}</span>
                </div>
                <p className="text-sm font-bold text-[var(--text-main)] transition-colors">{getCurrencySymbol(wallet.currency)}{ch.balance.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Filter & View Toggles */}
        <section className="space-y-2">
          <div className="flex bg-[var(--surface-deep)] p-1.5 rounded-2xl border border-[var(--border-glass)] transition-colors">
            {['WEEK', 'MONTH', 'YEAR', 'ALL'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p as Period)}
                className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${period === p ? 'bg-blue-600 text-white shadow-xl' : 'text-[var(--text-muted)] hover:bg-[var(--surface-glass)]'}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('HISTORY')}
              className={`flex-1 py-4 px-4 rounded-2xl border flex items-center justify-center gap-2 transition-all ${viewMode === 'HISTORY' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[var(--input-bg)] border-[var(--border-glass)] text-[var(--text-muted)]'}`}
            >
              <Clock size={16} />
              <span className="text-xs font-bold">History</span>
            </button>
            <button
              onClick={() => setViewMode('CATEGORIES')}
              className={`flex-1 py-4 px-4 rounded-2xl border flex items-center justify-center gap-2 transition-all ${viewMode === 'CATEGORIES' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-[var(--input-bg)] border-[var(--border-glass)] text-[var(--text-muted)]'}`}
            >
              <PieIcon size={16} />
              <span className="text-xs font-bold">Categories</span>
            </button>
          </div>
        </section>

        {/* Main List Area */}
        <section className="space-y-2">
          {viewMode === 'HISTORY' ? (
            <div className="space-y-1.5">
              {walletTransactions.length > 0 ? walletTransactions.map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const isInc = t.type === MasterCategoryType.INCOME;
                return (
                  <GlassCard
                    key={t.id}
                    className={`p-3 border-[var(--border-glass)] active:bg-[var(--surface-glass)] cursor-pointer transition-all ${t.linkedTransactionId ? 'hover:border-blue-500/30' : ''}`}
                    onClick={() => {
                      setSelectedTransaction(t);
                    }}
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
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--surface-glass)] rounded-md border border-[var(--border-glass)] transition-colors">
                              <WalletIcon size={8} style={{ color: wallet.color }} />
                              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter truncate max-w-[60px] transition-colors">{wallet.name}</span>
                            </div>
                            {t.isSubLedgerSync && t.subLedgerName && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-md border border-blue-500/20">
                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter italic">via {t.subLedgerName}</span>
                              </div>
                            )}
                            <span className="text-[9px] px-1.5 py-0.5 bg-[var(--surface-glass)] rounded-md border border-[var(--border-glass)] text-[var(--text-muted)] font-bold uppercase tracking-tighter transition-colors">
                              {t.channelType}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase mt-1.5 transition-colors">{format(new Date(t.date), 'MMM dd, p')}</p>
                        </div>
                      </div>
                      <p className={`font-black text-sm shrink-0 ml-2 transition-colors ${isInc ? 'text-emerald-400' : 'text-[var(--text-main)]'}`}>
                        {isInc ? '+' : '-'}{getCurrencySymbol(wallet.currency)}{t.amount.toLocaleString()}
                      </p>
                    </div>
                  </GlassCard>
                );
              }) : (
                <div className="text-center py-12 opacity-30 italic text-sm">No transactions in this period</div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {categoryBreakdown.length > 0 ? categoryBreakdown.map(({ amount, count, category }) => (
                <GlassCard key={category?.id} className="p-4 border-[var(--border-glass)] transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--surface-deep)] border border-[var(--border-glass)] transition-colors" style={{ color: category?.color }}>
                        {ICON_MAP[category?.icon || ''] || <TrendingUp size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-main)] transition-colors">{category?.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase transition-colors">{count} Transactions</p>
                      </div>
                    </div>
                    <p className="font-black text-sm text-[var(--text-main)] transition-colors">{getCurrencySymbol(wallet.currency)}{amount.toLocaleString()}</p>
                  </div>
                </GlassCard>
              )) : (
                <div className="text-center py-12 opacity-30 italic text-sm">No category data available</div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Floating Action Button for New Transaction */}
      <div className="fixed bottom-10 right-8 z-[55]">
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
