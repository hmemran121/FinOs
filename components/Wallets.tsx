
import React, { useState } from 'react';
import { useFinance, WalletWithBalance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { ICON_MAP } from '../constants';
import { Plus, CreditCard, Landmark, Smartphone, Coins, Edit3, Trash2, ArrowLeftRight, Link2, TrendingDown, ChevronRight } from 'lucide-react';
import WalletForm from './WalletForm';
import WalletDetail from './WalletDetail';
import { Wallet } from '../types';

const Wallets: React.FC = () => {
  const { walletsWithBalances, deleteWallet, getCurrencySymbol, selectedWalletId, setSelectedWalletId, channelTypes } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | undefined>(undefined);
  const [selectedWallet, setSelectedWallet] = useState<WalletWithBalance | null>(null);

  // Sync internal selection with context
  React.useEffect(() => {
    if (selectedWalletId) {
      const wallet = walletsWithBalances.find(w => w.id === selectedWalletId);
      if (wallet) setSelectedWallet(wallet);
    } else {
      setSelectedWallet(null);
    }
  }, [selectedWalletId, walletsWithBalances]);

  const handleWalletSelect = (wallet: WalletWithBalance) => {
    setSelectedWalletId(wallet.id);
  };

  const handleCloseDetail = () => {
    setSelectedWalletId(null);
  };

  const getChannelIcon = (type: string) => {
    const config = channelTypes.find(c => c.id === type);
    if (!config) return <Coins size={16} />;

    // Map specific icons based on the config name
    switch (config.iconName) {
      case 'Landmark': return <Landmark size={16} />;
      case 'CreditCard': return <CreditCard size={16} />;
      case 'Smartphone': return <Smartphone size={16} />;
      default: return <Coins size={16} />;
    }
  };

  const handleEdit = (w: Wallet, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWallet(w);
    setShowForm(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this wallet? This will also remove associated transactions.')) {
      deleteWallet(id);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)] transition-colors">Accounts</h1>
        <button
          onClick={() => { setEditingWallet(undefined); setShowForm(true); }}
          className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="grid gap-3">
        {walletsWithBalances.map(wallet => (
          <GlassCard
            key={wallet.id}
            onClick={() => handleWalletSelect(wallet)}
            className={`relative overflow-hidden group border cursor-pointer hover:border-blue-500/20 transition-all ${wallet.usesPrimaryIncome ? 'border-purple-500/10 bg-purple-500/5' : 'border-[var(--border-glass)]'} bg-[var(--surface-glass)]`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 blur-3xl -z-10 opacity-20" style={{ backgroundColor: wallet.color }} />

            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--surface-deep)] text-[var(--text-muted)] border border-[var(--border-glass)] shadow-xl transition-colors" style={{ borderColor: `${wallet.color}40` }}>
                  {ICON_MAP[wallet.icon] || <Coins size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--text-main)] transition-colors">
                    {wallet.name}
                    <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-blue-500 transition-colors" />
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap max-w-[200px]">
                    {wallet.isPrimary && <span className="bg-blue-600/20 text-blue-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">Primary</span>}
                    {wallet.usesPrimaryIncome && (
                      <span className="bg-purple-600/20 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                        <Link2 size={10} /> Sub-Ledger
                      </span>
                    )}
                    <span className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-tighter transition-colors">{wallet.currency}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold tracking-tighter transition-all duration-500 ${wallet.usesPrimaryIncome ? 'text-purple-300' : 'text-[var(--text-main)]'}`}>
                  {getCurrencySymbol(wallet.currency)}{wallet.currentBalance.toLocaleString()}
                </p>
                {wallet.usesPrimaryIncome && <p className="text-[10px] text-[var(--text-muted)] font-medium italic transition-colors">Virtual View</p>}
                <div className="flex gap-2 justify-end mt-1">
                  <button onClick={(e) => handleEdit(wallet, e)} className="text-[var(--text-muted)] hover:text-blue-500 transition-colors p-1"><Edit3 size={14} /></button>
                  {!wallet.isPrimary && <button onClick={(e) => handleDelete(wallet.id, e)} className="text-rose-500/50 hover:text-rose-500 transition-colors p-1"><Trash2 size={14} /></button>}
                </div>
              </div>
            </div>

            {/* Wallet Expense Summary */}
            <div className="mb-3 flex items-center justify-between bg-[var(--surface-deep)] p-2.5 rounded-2xl border border-[var(--border-glass)] transition-colors">
              <div className="flex items-center gap-2 text-rose-400">
                <TrendingDown size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Total Expenses</span>
              </div>
              <span className="text-sm font-black text-rose-500">-{getCurrencySymbol(wallet.currency)}{wallet.totalExpenses.toLocaleString()}</span>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest transition-colors">
                {wallet.usesPrimaryIncome ? 'Sub-ledger Reference' : 'Channel Balances'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {wallet.computedChannels.map(channel => (
                  <div key={channel.type} className="bg-[var(--surface-deep)] border border-[var(--border-glass)] p-3 rounded-2xl flex flex-col gap-1 transition-colors">
                    <div className="flex items-center justify-between text-[var(--text-muted)] mb-1">
                      {getChannelIcon(channel.type)}
                      <span className="text-[10px] font-bold">{channel.type}</span>
                    </div>
                    <span className={`text-sm font-bold ${channel.balance < 0 ? 'text-rose-400' : ''}`}>
                      {getCurrencySymbol(wallet.currency)}{channel.balance.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button className="flex-1 py-3 text-xs font-bold rounded-2xl border border-[var(--border-glass)] hover:bg-[var(--input-bg)] transition-all flex items-center justify-center gap-2 text-[var(--text-main)]">
                <ArrowLeftRight size={14} className="text-blue-500" />
                Flow Details
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard
        onClick={() => { setEditingWallet(undefined); setShowForm(true); }}
        className="border-dashed border-[var(--border-glass)] flex flex-col items-center justify-center py-12 gap-4 text-[var(--text-muted)] cursor-pointer hover:bg-[var(--surface-glass)] transition-colors"
      >
        <div className="p-4 bg-[var(--surface-deep)] rounded-full border border-[var(--border-glass)]">
          <Plus size={32} />
        </div>
        <p className="font-bold text-sm">Add New Wallet</p>
      </GlassCard>

      {showForm && <WalletForm onClose={() => setShowForm(false)} editWallet={editingWallet} />}
      {selectedWallet && <WalletDetail wallet={selectedWallet} onClose={handleCloseDetail} />}
      <div className="h-20" />
    </div>
  );
};

export default Wallets;
