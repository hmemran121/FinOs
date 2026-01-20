import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { useFeedback } from '../store/FeedbackContext';
import { MasterCategoryType, ChannelType, Category, Wallet, ChannelTypeConfig } from '../types';
import {
  X,
  Check,
  Brain,
  ArrowRightLeft,
  ChevronRight,
  Sparkles,
  Search,
  Wallet as WalletIcon,
  Layers,
  Zap,
  Tag,
  History,
  Calculator,
  Delete,
  Plus
} from 'lucide-react';
import { suggestCategory } from '../services/gemini';
import { ICON_MAP } from '../constants';
import { format } from 'date-fns';
import { PremiumCalendarPicker } from './ui/PremiumCalendarPicker';

interface Props {
  onClose: () => void;
  initialWalletId?: string;
}

const TransactionForm: React.FC<Props> = ({ onClose, initialWalletId }) => {
  const { walletsWithBalances, categories, addTransaction, getCurrencySymbol, channelTypes, formatCurrency } = useFinance();
  const { showFeedback } = useFeedback();
  const [type, setType] = useState<MasterCategoryType>(MasterCategoryType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [searchCat, setSearchCat] = useState('');

  const [walletId, setWalletId] = useState(initialWalletId || walletsWithBalances.find(w => w.isPrimary)?.id || walletsWithBalances[0]?.id || '');
  const [channelType, setChannelType] = useState<ChannelType>('CASH');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showCalculator, setShowCalculator] = useState(true);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Removed calcExpr state to prevent logic desync. "amount" is the single source of truth.

  const [toWalletId, setToWalletId] = useState(walletsWithBalances.find(w => w.id !== walletId)?.id || walletsWithBalances[0]?.id || '');
  const [toChannel, setToChannel] = useState<ChannelType>('BANK');

  const [categoryId, setCategoryId] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const calcInputRef = useRef<HTMLInputElement>(null);

  const isTransfer = type === MasterCategoryType.TRANSFER;
  const isIncome = type === MasterCategoryType.INCOME;

  // Auto-switch channel if current one is disabled for selected wallet
  useEffect(() => {
    if (isIncome) return; // No restrictions for income
    const wallet = walletsWithBalances.find(w => w.id === walletId);
    if (!wallet) return;

    // RESTRICTION: Use Principal Balance (Correct Ownership) instead of Aggregate Balance
    // Filter computedChannels based on Principal channel balances
    const principalChannels = Object.entries(wallet.channelBalances).map(([type, balance]) => ({ type, balance }));

    const currentChannelDisabled = principalChannels.some(cc => cc.type === channelType && cc.balance <= 0);

    // Check if channel even exists in principal map
    const channelExists = principalChannels.some(cc => cc.type === channelType);

    if (currentChannelDisabled || !channelExists) {
      const firstAvailable = principalChannels.find(cc => cc.balance > 0);
      if (firstAvailable) setChannelType(firstAvailable.type as ChannelType);
    }
  }, [walletId, type, walletsWithBalances, channelType, isIncome]);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth > 640);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (showCalculator && calcInputRef.current) {
      calcInputRef.current.focus();
    }
  }, [showCalculator]);

  // Auto-scroll to selected item when picker opens
  useEffect(() => {
    if (showCatPicker && categoryId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showCatPicker, categoryId]);

  // Filter categories based on type and search
  const filteredCategories = useMemo(() => {
    const list = categories.filter(c => c.type === type && !c.isDisabled);
    if (!searchCat) return list;
    return list.filter(c => c.name.toLowerCase().includes(searchCat.toLowerCase()));
  }, [categories, type, searchCat]);

  // Hierarchical grouping with integrated search logic
  const groupedCategories = useMemo(() => {
    const query = searchCat.toLowerCase().trim();
    const roots = categories.filter(c => c.type === type && !c.parentId && !c.isDisabled);

    return roots.map(root => {
      const children = categories.filter(c => c.parentId === root.id && !c.isDisabled);
      const rootMatches = root.name.toLowerCase().includes(query);
      const matchingChildren = children.filter(child => child.name.toLowerCase().includes(query));

      if (!query || rootMatches || matchingChildren.length > 0) {
        return {
          root,
          children: query && !rootMatches ? matchingChildren : children
        };
      }
      return null;
    }).filter((group): group is { root: Category; children: any[] } => group !== null);
  }, [categories, type, searchCat]);

  const handleSuggest = async () => {
    if (!note || !amount || isTransfer) return;
    setIsSuggesting(true);
    try {
      const suggestion = await suggestCategory(note, parseFloat(amount));
      if (suggestion.categoryName) {
        const match = categories.find(c => c.name.toLowerCase().includes(suggestion.categoryName.toLowerCase()) && c.type === type);
        if (match) setCategoryId(match.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalAmount = amount;
    if (/[+\-*/]/.test(amount)) {
      const evaluated = safeEvaluate(amount);
      if (evaluated) finalAmount = evaluated;
    }

    // Dynamic Validation Logic
    const missingFields: string[] = [];

    if (!finalAmount || parseFloat(finalAmount) <= 0) {
      showFeedback('Please enter a valid amount.', 'error');
      return;
    }

    if (!walletId) missingFields.push('Source Account');

    if (isTransfer) {
      if (!toWalletId) missingFields.push('Destination Account');
      if (walletId && toWalletId && walletId === toWalletId) {
        showFeedback('Source and destination accounts cannot be the same.', 'error');
        return;
      }
    } else {
      if (!categoryId) missingFields.push('System Taxonomy');
    }

    // STRICT BALANCE CHECK (For Expenses & Transfers)
    if (type === MasterCategoryType.EXPENSE || type === MasterCategoryType.TRANSFER) {
      const sourceWallet = walletsWithBalances.find(w => w.id === walletId);
      if (sourceWallet) {
        // Use Principal Channel Balance Only
        const channelBalance = sourceWallet.channelBalances[channelType] || 0;
        if (parseFloat(finalAmount) > channelBalance) {
          showFeedback(`Insufficient funds in ${channelType}. Available: ${formatCurrency(channelBalance, sourceWallet.currency)}`, 'error');
          return;
        }
      }
    }

    if (missingFields.length > 0) {
      const message = `Please select ${missingFields.join(' and ')}.`;
      console.log('Validation Error:', message);
      showFeedback(message, 'error', { persistent: false, position: 'center' });
      return;
    }

    // Optimistic UI: Close modal immediately
    onClose();
    showFeedback(`${isTransfer ? 'Transfer' : type} recorded!`, 'success', { persistent: true, position: 'center' });

    try {
      // Execute in background
      await addTransaction({
        amount: parseFloat(finalAmount),
        date: transactionDate.toISOString(),
        walletId,
        channelType: channelType,
        categoryId: isTransfer ? 'internal-transfer' : categoryId,
        note,
        type,
        isSplit: false,
        splits: [],
        toWalletId: isTransfer ? toWalletId : undefined,
        toChannelType: isTransfer ? toChannel : undefined
      });
    } catch (err) {
      console.error("Transaction Error:", err);
      // Fallback feedback if persistence fails
      showFeedback('Failed to save transaction to database.', 'error');
    }
  };

  // Pure logic helper for evaluation using 'amount' state only
  const safeEvaluate = (expr: string): string | null => {
    try {
      const sanitized = expr.replace(/[^-+/*0-9.]/g, '');
      if (!sanitized) return null;
      // Check for trailing operators
      if (/[+\-*/.]$/.test(sanitized)) return null;
      const result = new Function(`return ${sanitized}`)();
      return isNaN(result) ? null : result.toString();
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[500] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
      <div className={`w-full max-w-lg bg-[var(--bg-color)] rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden flex flex-col relative border border-[var(--border-glass)] transition-all ease-in-out ${showCatPicker ? 'h-[96vh]' : 'max-h-[96vh]'}`}>

        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex justify-between items-center bg-[var(--bg-color)] transition-colors">
          <div className="flex bg-[var(--surface-deep)] p-1.5 rounded-2xl border border-[var(--border-glass)] transition-colors">
            {[MasterCategoryType.EXPENSE, MasterCategoryType.INCOME, MasterCategoryType.TRANSFER].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setType(t); setCategoryId(''); }}
                className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === t ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-[var(--text-muted)] hover:text-blue-500'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-3 bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl text-[var(--text-muted)] hover:text-rose-500 transition-all active:scale-90">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 space-y-6">

          {/* Amount Display */}
          <div className="text-center py-6 relative">
            {/* Dynamic Mesh Gradient */}
            <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full -z-10 animate-pulse" />
            <div className="flex items-center justify-center gap-4 relative">
              {/* Mesh Gradient Background for Amount */}
              <div className="absolute inset-x-0 -inset-y-12 bg-gradient-to-r from-cyan-500/10 via-blue-600/10 to-purple-600/10 blur-[60px] animate-pulse pointer-events-none" />

              <span className="text-3xl font-black bg-gradient-to-br from-cyan-400 to-blue-600 bg-clip-text text-transparent mt-1 transition-all duration-500 font-mono drop-shadow-sm">
                {getCurrencySymbol(walletsWithBalances.find(w => w.id === walletId)?.currency)}
              </span>
              <div className="flex flex-col items-center flex-1 relative group">
                <div className="absolute inset-x-0 -bottom-2 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/80 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-1000" />
                {/[+\-*/]/.test(amount) && (
                  <div className="bg-white/5 backdrop-blur-xl text-cyan-400 border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black mb-3 animate-in zoom-in slide-in-from-top-2 duration-500 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                    <span className="opacity-40 mr-2 tracking-widest">OPS:</span>
                    <span className="font-mono text-cyan-200">{(() => {
                      const res = safeEvaluate(amount);
                      return res ? parseFloat(res).toLocaleString() : '...';
                    })()}</span>
                  </div>
                )}
                <input
                  autoFocus={isDesktop}
                  inputMode={isDesktop ? "decimal" : "none"}
                  readOnly={!isDesktop}
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    if (!isDesktop) return;
                    const val = e.target.value.replace(/[^0-9.+\-*/]/g, '');
                    setAmount(val);
                  }}
                  onClick={() => {
                    if (!isDesktop) {
                      setAmount(amount || '');
                      setShowCalculator(true);
                    }
                  }}
                  onBlur={() => {
                    if (isDesktop && /[+\-*/]/.test(amount)) {
                      const res = safeEvaluate(amount);
                      if (res) setAmount(res);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (/[+\-*/]/.test(amount)) {
                        e.preventDefault();
                        const res = safeEvaluate(amount);
                        if (res) setAmount(res);
                      }
                    } else if (e.key === ' ' && !amount && isDesktop) {
                      e.preventDefault();
                      setShowCalculator(true);
                    }
                  }}
                  className={`w-full bg-transparent text-6xl font-black text-[var(--text-main)] text-center outline-none placeholder:text-[var(--text-muted)] placeholder:opacity-5 tracking-tighter transition-all duration-700 font-mono ${!isDesktop ? 'cursor-pointer active:scale-95' : 'focus:scale-110'}`}
                />
              </div>
              {isDesktop && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(amount);
                    setShowCalculator(true);
                  }}
                  className="p-4 bg-white/5 border border-white/10 rounded-[24px] text-cyan-500 hover:text-white hover:bg-cyan-600 transition-all active:scale-90 shadow-2xl group flex items-center justify-center relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Calculator size={22} className="relative z-10 group-hover:rotate-12 transition-transform" />
                </button>
              )}
            </div>

            {/* Inline Expandable Premium Glass Keypad */}
            {/* Redesigned to be "Glassy, Transparent, Gradient" */}
            {/* Inline Expandable Premium Glass Keypad - Holographic Redesign */}
            <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${showCalculator ? 'max-h-[600px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0 pt-0'}`}>
              <div className="relative overflow-hidden rounded-[32px] p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transition-all transform perspective-1000">
                {/* Holographic Container Depth Layers */}
                <div className="absolute inset-0 bg-[#0c0c0e]/90 backdrop-blur-[60px] rounded-[32px] z-0" />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 z-0 pointer-events-none mix-blend-overlay" />
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />

                {/* Animated Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,black,transparent)] z-0 pointer-events-none" />

                <div className="grid grid-cols-4 gap-3 relative z-10 p-4">
                  {[
                    { label: 'C', key: 'C', type: 'danger' },
                    { label: '÷', key: '/', type: 'operator' },
                    { label: '×', key: '*', type: 'operator' },
                    { label: '⌫', key: 'Backspace', type: 'tool' },
                    { label: '7', key: '7' }, { label: '8', key: '8' }, { label: '9', key: '9' }, { label: '-', key: '-', type: 'operator' },
                    { label: '4', key: '4' }, { label: '5', key: '5' }, { label: '6', key: '6' }, { label: '+', key: '+', type: 'operator' },
                    { label: '1', key: '1' }, { label: '2', key: '2' }, { label: '3', key: '3' }, { label: 'EXE', key: 'Enter', type: 'action' },
                    { label: '0', key: '0', span: 2 }, { label: '.', key: '.' },
                  ].map((btn, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // DIRECT MANIPULATION
                        if (btn.key === 'Enter') {
                          if (!amount || amount === '0') {
                            setShowCalculator(false);
                            return;
                          }
                          const res = safeEvaluate(amount);
                          if (res) setAmount(res);
                          setShowCalculator(false);
                        } else if (btn.key === 'C') {
                          setAmount('');
                        } else if (btn.key === 'Backspace') {
                          setAmount(s => s.slice(0, -1));
                        } else {
                          setAmount(s => s + btn.key);
                        }
                      }}
                      className={`
                        h-16 rounded-[20px] font-black text-xl transition-all relative overflow-hidden group/btn font-mono touch-manipulation select-none
                        active:scale-[0.92] active:brightness-125
                        ${btn.span === 2 ? 'col-span-2' : ''}
                        
                        /* Glass Button Base */
                        backdrop-blur-xl border border-white/5
                        shadow-[0_4px_12px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
                        
                        ${btn.type === 'operator'
                          ? 'bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400/30'
                          : btn.type === 'danger'
                            ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:border-rose-400/30'
                            : btn.type === 'action'
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_8px_20px_-4px_rgba(79,70,229,0.5)] border-t-white/20'
                              : btn.type === 'tool'
                                ? 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                                : 'bg-[#1a1a1c]/80 text-white hover:bg-[#252528] active:bg-[#2a2a2d]'
                        }
                      `}
                    >
                      {/* Internal Glow for depth */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />

                      {/* Text Glow for Operators */}
                      <span className={`relative z-10 drop-shadow-sm ${btn.type === 'action' ? 'tracking-widest text-sm' : ''}`}>
                        {btn.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Cyber Footer */}
                <div className="pb-3 pt-1 flex items-center justify-between relative z-10 px-6 opacity-30 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    <span className="text-[7px] font-mono tracking-[0.3em] font-black text-white">READY</span>
                  </div>
                  <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
                </div>
              </div>
            </div>
          </div>

          {isTransfer ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-1 transition-colors">Exit Point</p>
                  <WalletPicker wallets={walletsWithBalances} selectedId={walletId} onSelect={setWalletId} formatCurrency={formatCurrency} />
                  <ChannelPicker
                    selected={channelType}
                    onSelect={setChannelType}
                    options={(() => {
                      const wallet = walletsWithBalances.find(w => w.id === walletId);
                      return channelTypes.filter(ct => (wallet?.computedChannels || []).some(cc => cc.type === ct.id));
                    })()}
                    disabledChannels={(() => {
                      const wallet = walletsWithBalances.find(w => w.id === walletId);
                      return (wallet?.computedChannels || []).filter(cc => cc.balance <= 0).map(cc => cc.type);
                    })()}
                  />
                </div>

                <div className="flex justify-center py-4">
                  <div className="bg-[var(--surface-deep)] p-4 rounded-3xl shadow-xl border border-[var(--border-glass)] ring-8 ring-[var(--bg-color)] transition-all">
                    <ArrowRightLeft size={24} className="rotate-90 text-blue-500" />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1">Entry Point</p>
                  <WalletPicker wallets={walletsWithBalances} selectedId={toWalletId} onSelect={setToWalletId} activeColor="#3B82F6" formatCurrency={formatCurrency} />
                  <ChannelPicker
                    selected={toChannel}
                    onSelect={setToChannel}
                    options={(() => {
                      const wallet = walletsWithBalances.find(w => w.id === toWalletId);
                      return channelTypes.filter(ct => (wallet?.computedChannels || []).some(cc => cc.type === ct.id));
                    })()}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-10">

              {/* Taxonomy Selector Trigger */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] transition-colors">Classification</p>
                    <h3 className="text-sm font-bold text-[var(--text-secondary)] transition-colors">System Taxonomy</h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCatPicker(true)}
                  className="w-full group relative flex items-center gap-3 p-3 rounded-[24px] bg-[var(--surface-deep)] border border-[var(--border-glass)] hover:border-blue-500/50 hover:bg-[var(--surface-card)] transition-all duration-500"
                >
                  <div className="w-11 h-11 rounded-[16px] bg-[var(--input-bg)] flex items-center justify-center border border-[var(--border-glass)] shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 text-blue-500">
                    {categoryId ? ICON_MAP[categories.find(c => c.id === categoryId)?.icon || 'Tag'] : <Layers size={20} />}
                  </div>

                  <div className="flex-1 text-left">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5 transition-colors">Active Segment</p>
                    <h4 className="text-sm font-black text-[var(--text-main)] tracking-tight transition-colors">
                      {categoryId ? categories.find(c => c.id === categoryId)?.name : 'Select Taxonomy'}
                    </h4>
                  </div>

                  <div className="w-9 h-9 rounded-xl bg-[var(--surface-glass)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <ChevronRight size={16} />
                  </div>
                </button>
              </div>

              {/* HIGH-FIDELITY OVERLAY PICKER */}
              {showCatPicker && (
                <div className="absolute inset-0 z-[100] bg-[var(--surface-overlay)] flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500 rounded-[40px] transition-colors overflow-hidden">
                  {/* Picker Header */}
                  <div className="px-8 py-5 flex items-center justify-between border-b border-[var(--border-glass)] bg-[var(--surface-overlay)] backdrop-blur-2xl z-30 transition-colors shrink-0">
                    <div>
                      <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter transition-colors">Taxonomy Index</h2>
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1 transition-colors">Deep Classification System</p>
                    </div>
                    <button
                      onClick={() => { setShowCatPicker(false); setSearchCat(''); }}
                      className="p-4 rounded-2xl bg-[var(--surface-deep)] border border-[var(--border-glass)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all shadow-lg active:scale-95"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Search Control */}
                  <div className="px-8 pb-4 pt-8 bg-[var(--surface-overlay)]/50 backdrop-blur-md z-20 shrink-0">
                    <div className="relative group">
                      <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" />
                      <input
                        placeholder="Search system segments..."
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-[24px] py-5 pl-14 pr-6 text-xs font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-[var(--text-dim)] text-[var(--text-main)] shadow-inner"
                        value={searchCat}
                        onChange={(e) => setSearchCat(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Unified Hierarchy List (Unified with FinancialPlans design) */}
                  <div className="flex-1 overflow-y-auto px-8 pb-20 no-scrollbar space-y-6">
                    {groupedCategories.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-20 h-20 bg-[var(--input-bg)] rounded-full flex items-center justify-center mx-auto border border-dashed border-[var(--border-glass)] opacity-40">
                          <Search size={32} className="text-[var(--text-muted)]" />
                        </div>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest transition-colors">No matching segments found</p>
                      </div>
                    ) : (
                      groupedCategories.map(group => (
                        <div key={group.root.id} className="space-y-2">
                          {/* Parent Section Header - Sticky within list */}
                          <div className="flex items-center gap-3 sticky top-0 bg-[var(--surface-overlay)] py-2 z-10 transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/10 shadow-sm">
                              {ICON_MAP[group.root.icon || 'Tag'] || <Layers size={18} />}
                            </div>
                            <h5 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] transition-colors">{group.root.name}</h5>
                            <div className="flex-1 h-[1px] bg-gradient-to-r from-[var(--border-glass)] to-transparent" />
                          </div>

                          <div className="grid grid-cols-1 gap-0">
                            {/* The Parent itself as an option */}
                            <button
                              onClick={() => {
                                setCategoryId(group.root.id);
                                setShowCatPicker(false);
                                setSearchCat('');
                              }}
                              className={`group relative w-full flex items-center gap-3 p-1.5 rounded-xl border-b border-white/5 last:border-0 transition-all duration-300 ${categoryId === group.root.id ? 'bg-blue-600 border-blue-400 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] z-10' : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-deep)]/80'}`}
                            >
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${categoryId === group.root.id ? 'bg-white/20' : 'bg-[var(--surface-deep)] shadow-inner'}`}>
                                {ICON_MAP[group.root.icon || 'Tag'] || <Layers size={20} />}
                              </div>
                              <span className={`text-sm font-bold ${categoryId === group.root.id ? 'text-white' : 'text-[var(--text-main)] transition-colors'}`}>General {group.root.name}</span>
                              {categoryId === group.root.id && <Check size={20} className="ml-auto" />}
                            </button>

                            {/* Sub-categories */}
                            {group.children.map(child => (
                              <button
                                key={child.id}
                                onClick={() => {
                                  setCategoryId(child.id);
                                  setShowCatPicker(false);
                                  setSearchCat('');
                                }}
                                className={`group relative w-full flex items-center gap-3 p-1 rounded-xl border-b border-white/5 last:border-0 transition-all duration-300 ${categoryId === child.id ? 'bg-blue-600 border-blue-400 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] z-10' : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-deep)]/40'}`}
                              >
                                <div className="w-10 h-10 flex items-center justify-center">
                                  <div className={`w-1.5 h-1.5 rounded-full ${categoryId === child.id ? 'bg-white' : 'bg-[var(--border-glass)] group-hover:bg-blue-500 transition-colors'}`} />
                                </div>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${categoryId === child.id ? 'bg-white/10' : 'bg-[var(--surface-deep)] border border-[var(--border-glass)]'}`}>
                                  {ICON_MAP[child.icon || 'Tag'] || <Tag size={18} />}
                                </div>
                                <span className={`text-sm font-medium ${categoryId === child.id ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors'}`}>{child.name}</span>
                                {categoryId === child.id && <Check size={20} className="ml-auto" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Asset Configuration */}
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-1 transition-colors">Source Account</p>
                  <WalletPicker wallets={walletsWithBalances} selectedId={walletId} onSelect={setWalletId} formatCurrency={formatCurrency} />
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-1 transition-colors">Settlement Method</p>
                  <ChannelPicker
                    selected={channelType}
                    onSelect={setChannelType}
                    options={(() => {
                      const wallet = walletsWithBalances.find(w => w.id === walletId);
                      return channelTypes.filter(ct => (wallet?.computedChannels || []).some(cc => cc.type === ct.id));
                    })()}
                    disabledChannels={type !== MasterCategoryType.INCOME ? (() => {
                      const wallet = walletsWithBalances.find(w => w.id === walletId);
                      return (wallet?.computedChannels || []).filter(cc => cc.balance <= 0).map(cc => cc.type);
                    })() : []}
                  />
                </div>
              </div>

              {/* Transaction Metadata */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-1 transition-colors">Contextual Metadata</p>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-[var(--text-dim)] group-focus-within:text-blue-500 transition-colors">
                    <History size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter transaction narrative..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-[28px] py-6 pl-14 pr-16 text-sm font-bold focus:border-blue-500 focus:outline-none transition-all placeholder:text-[var(--text-dim)] text-[var(--text-main)]"
                  />
                  <button
                    type="button"
                    onClick={handleSuggest}
                    disabled={isSuggesting || !note}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-3.5 rounded-2xl transition-all ${isSuggesting ? 'bg-blue-500 text-white animate-pulse' : 'bg-[var(--surface-deep)] text-[var(--text-muted)] hover:text-blue-500 border border-[var(--border-glass)]'}`}
                  >
                    {isSuggesting ? <Zap size={20} className="animate-spin" /> : <Brain size={20} />}
                  </button>
                </div>
              </div>

              {/* Transaction Date Picker */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-1 transition-colors">Temporal Placement</p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="w-full bg-[var(--surface-deep)] border border-[var(--border-glass)] rounded-[28px] p-5 flex items-center justify-between text-sm font-bold text-[var(--text-secondary)] transition-all active:scale-[0.98] hover:bg-[var(--surface-card)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--input-bg)] flex items-center justify-center text-blue-500 border border-[var(--border-glass)]">
                        <History size={18} />
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Execution Day</p>
                        <span className="text-[var(--text-main)]">{format(transactionDate, 'EEEE, MMMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <Plus className={`transition-transform duration-300 ${showDatePicker ? 'rotate-45 text-rose-500' : 'text-blue-500'}`} size={20} />
                  </button>

                  {showDatePicker && (
                    <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      <PremiumCalendarPicker
                        selectedDate={transactionDate}
                        onChange={(date) => {
                          setTransactionDate(date);
                          setShowDatePicker(false);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Commit */}
        <div className="p-8 pt-4 bg-[var(--surface-overlay)] border-t border-[var(--border-glass)] transition-colors">
          <button
            type="submit"
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-sm shadow-[0_20px_50px_rgba(59,130,246,0.3)] active:scale-[0.97] transition-all flex items-center justify-center gap-4 group"
          >
            {isTransfer ? <ArrowRightLeft size={22} /> : <Sparkles size={22} className="group-hover:rotate-12 transition-transform" />}
            <span>{isTransfer ? 'Execute Transfer' : `Commit ${type}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Internal components for clean structure

const WalletPicker: React.FC<{ wallets: any[], selectedId: string, onSelect: (id: string) => void, activeColor?: string, formatCurrency: any }> = ({ wallets, selectedId, onSelect, activeColor = '#3B82F6', formatCurrency }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedWallet = wallets.find(w => w.id === selectedId) || wallets[0];

  return (
    <div className="relative z-20">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full group relative flex items-center gap-3 p-2 pr-4 rounded-[24px] bg-[var(--surface-deep)] border border-[var(--border-glass)] hover:border-blue-500/50 hover:bg-[var(--surface-card)] transition-all duration-300 active:scale-[0.98]"
        style={{ borderColor: isOpen ? selectedWallet?.color || activeColor : undefined }}
      >
        <div className="w-12 h-12 rounded-[18px] bg-[var(--input-bg)] flex items-center justify-center border border-[var(--border-glass)] shadow-inner transition-colors" style={{ color: selectedWallet?.color || activeColor }}>
          {ICON_MAP[selectedWallet?.icon || 'Wallet'] || <WalletIcon size={20} />}
        </div>

        <div className="flex-1 text-left min-w-0">
          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5 transition-colors">Source Account</p>
          <h4 className="text-sm font-black text-[var(--text-main)] tracking-tight truncate transition-colors">
            {selectedWallet?.name || 'Select Wallet'}
          </h4>
        </div>

        <div className={`w-8 h-8 rounded-full bg-[var(--surface-glass)] flex items-center justify-center text-[var(--text-muted)] transition-all duration-300 ${isOpen ? 'rotate-180 bg-blue-500/10 text-blue-500' : ''}`}>
          <ChevronRight size={16} className="rotate-90" />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-[var(--surface-overlay)] border border-[var(--border-glass)] rounded-[24px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 flex flex-col max-h-[300px]">
            <div className="overflow-y-auto no-scrollbar pt-2">
              {wallets.map((w, index) => (
                <React.Fragment key={w.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(w.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 transition-all duration-200 group/item relative ${selectedId === w.id ? 'bg-blue-600/10' : 'hover:bg-[var(--surface-card)]'}`}
                  >
                    {/* Active Indicator Stripe */}
                    {selectedId === w.id && <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-blue-500" />}

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${selectedId === w.id ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-[var(--input-bg)] text-[var(--text-muted)] group-hover/item:text-[var(--text-main)] group-hover/item:bg-white/5'}`}>
                      {ICON_MAP[w.icon] || <WalletIcon size={18} />}
                    </div>

                    <div className="flex-1 text-left min-w-0 py-0.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-bold leading-tight truncate ${selectedId === w.id ? 'text-blue-400' : 'text-[var(--text-main)]'}`}>{w.name}</span>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5">
                          {w.isPrimary && (
                            <span className="text-[7px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md border border-amber-500/20">Primary</span>
                          )}
                          {w.parentWalletId ? (
                            <span className="text-[7px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded-md border border-purple-500/20">Linked</span>
                          ) : !w.isPrimary && (
                            <span className="text-[7px] font-black uppercase tracking-wider bg-[var(--surface-glass)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-md border border-[var(--border-subtle)]">Individual</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${selectedId === w.id ? 'text-blue-300/80' : 'text-[var(--text-muted)]'}`}>{w.currency}</span>
                        <p className={`text-2xl font-bold tracking-tighter transition-all duration-500 ${w.usesPrimaryIncome ? 'text-purple-300' : 'text-[var(--text-main)]'}`}>
                          {formatCurrency(w.aggregateBalance, w.currency)}
                        </p>
                        {/* Principal Breakdown for Parents */}
                        {(w.aggregateBalance !== w.principalBalance) && (
                          <p className="text-[10px] text-[var(--text-muted)] font-medium italic transition-colors text-right mt-0.5">
                            Principal: <span className="text-[var(--text-main)] opacity-70">{formatCurrency(w.principalBalance, w.currency)}</span>
                          </p>
                        )}
                        {w.usesPrimaryIncome && <p className="text-[10px] text-[var(--text-muted)] font-medium italic transition-colors">Virtual View</p>}
                      </div>
                    </div>
                  </button>
                  {/* Silent Divider Line */}
                  {index < wallets.length - 1 && (
                    <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-[var(--border-subtle)] to-transparent opacity-50" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ChannelPicker: React.FC<{
  selected: ChannelType,
  onSelect: (ch: ChannelType) => void,
  options: ChannelTypeConfig[],
  disabledChannels?: ChannelType[]
}> = ({ selected, onSelect, options, disabledChannels = [] }) => (
  <div className="flex bg-[var(--input-bg)] p-1 rounded-2xl border border-[var(--border-glass)] ring-1 ring-[var(--border-subtle)] overflow-x-auto no-scrollbar transition-colors">
    {options.map(ch => {
      const isDisabled = disabledChannels.includes(ch.id);
      return (
        <button
          key={ch.id}
          type="button"
          disabled={isDisabled}
          onClick={() => !isDisabled && onSelect(ch.id)}
          className={`flex-1 py-2 px-3 min-w-[70px] text-[8px] font-black uppercase tracking-[0.1em] rounded-xl transition-all ${selected === ch.id
            ? 'bg-[var(--surface-deep)] text-blue-400 shadow-2xl border border-[var(--border-glass)]'
            : isDisabled
              ? 'opacity-30 cursor-not-allowed grayscale text-[var(--text-muted)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
        >
          {ch.name}
          {isDisabled && <span className="block text-[6px] opacity-40 leading-none mt-0.5">No Balance</span>}
        </button>
      );
    })}
  </div>
);

export default TransactionForm;
