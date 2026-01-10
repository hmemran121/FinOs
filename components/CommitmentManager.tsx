
import React, { useState, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { Commitment, CommitmentType, CommitmentFrequency, CertaintyLevel } from '../types';
import { GlassCard, NeumorphButton } from './ui/GlassCard';
import { CustomDropdown } from './ui/CustomDropdown';
import {
    X, Plus, Calendar, Shield, CreditCard, ShoppingBag,
    Trash2, Edit3, Check, AlertCircle, Info, ArrowRightCircle,
    Zap, Wallet, Clock, ArrowUpRight, History, ShieldCheck,
    ChevronDown, Layers, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
    format, isSameDay, startOfMonth, endOfMonth, isWithinInterval,
    parseISO, formatDistanceToNow, eachDayOfInterval, startOfWeek,
    endOfWeek, isToday, isSameMonth, addMonths, subMonths
} from 'date-fns';
import DynamicDeleteModal from './modals/DynamicDeleteModal';
import { PremiumCalendarPicker } from './ui/PremiumCalendarPicker';


const CommitmentManager: React.FC = () => {
    const {
        commitments, addCommitment, deleteCommitment, getCurrencySymbol,
        settings, availableAfterCommitments, totalBalance, totalMonthlyCommitments,
        settleCommitment, extendCommitmentDate, postponeCommitment,
        suggestedObligationNames, wallets
    } = useFinance();
    const [showForm, setShowForm] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(null);
    const selectedCommitment = commitments.find(c => c.id === selectedCommitmentId);
    const [showDetails, setShowDetails] = useState(false);
    const [showSettled, setShowSettled] = useState(false);
    const [historyMonth, setHistoryMonth] = useState(new Date());

    const getCommitmentIcon = (type: CommitmentType) => {
        switch (type) {
            case CommitmentType.FIXED: return <Shield size={18} className="text-blue-400" />;
            case CommitmentType.VARIABLE: return <ShoppingBag size={18} className="text-purple-400" />;
            case CommitmentType.OPTIONAL: return <CreditCard size={18} className="text-zinc-500" />;
        }
    };

    const getCertaintyColor = (level: CertaintyLevel) => {
        return level === CertaintyLevel.HARD ? 'text-rose-500 bg-rose-500/10' : 'text-amber-500 bg-amber-500/10';
    };

    const coverageRatio = totalBalance > 0 ? (availableAfterCommitments / totalBalance) * 100 : 0;

    return (
        <div className="space-y-4 pt-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Premium Coverage Dashboard */}
            <GlassCard className="bg-gradient-to-br from-blue-600/10 via-[var(--surface-overlay)] to-[var(--bg-color)] border-blue-500/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[80px] rounded-full translate-x-12 -translate-y-12" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    {/* Fiscal Safety Gauge */}
                    <div className="flex flex-col items-center justify-center p-2">
                        <div className="relative w-48 h-28 overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 100 55">
                                <path
                                    d="M10,50 A40,40 0 0,1 90,50"
                                    fill="none"
                                    stroke="var(--border-glass)"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M10,50 A40,40 0 0,1 90,50"
                                    fill="none"
                                    stroke={coverageRatio > 60 ? '#10b981' : coverageRatio > 30 ? '#f59e0b' : '#f43f5e'}
                                    strokeWidth="8"
                                    strokeDasharray="125.6"
                                    strokeDashoffset={125.6 - (Math.min(100, coverageRatio) / 100) * 125.6}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out shadow-lg"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                                <span className="text-3xl font-black text-[var(--text-main)] tracking-tighter">
                                    {Math.round(coverageRatio)}%
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Safety Buffer</span>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-4 w-full">
                            <div className="flex-1 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Liquidity</p>
                                <p className="text-sm font-black text-[var(--text-main)] tracking-tight">
                                    {getCurrencySymbol(settings.currency)}{availableAfterCommitments.toLocaleString()}
                                </p>
                            </div>
                            <div className="w-px h-8 bg-[var(--border-glass)]" />
                            <div className="flex-1 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Risk Profile</p>
                                <p className={`text-sm font-black tracking-tight ${coverageRatio > 60 ? 'text-emerald-500' : coverageRatio > 30 ? 'text-amber-500' : 'text-rose-500'}`}>
                                    {coverageRatio > 60 ? 'Secured' : coverageRatio > 30 ? 'Caution' : 'Critical'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Solvency Analytics */}
                    <div className="flex flex-col justify-center space-y-4 border-l border-[var(--border-glass)]/50 md:pl-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar size={14} className="text-blue-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Solvency Duration</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-gradient">
                                    {Math.floor(availableAfterCommitments / ((totalMonthlyCommitments / 30) || 1))}
                                </span>
                                <span className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tighter">Survival Days</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                                <span className="text-[var(--text-muted)]">Reserves Breakdown</span>
                                <span className="text-[var(--text-main)]">100% Capital</span>
                            </div>
                            <div className="h-3 w-full bg-[var(--surface-deep)] rounded-xl flex overflow-hidden border border-[var(--border-glass)]">
                                <div
                                    className="h-full bg-rose-500 transition-all duration-1000"
                                    style={{ width: `${(commitments.filter(c => c.certaintyLevel === CertaintyLevel.HARD).reduce((a, b) => a + b.amount, 0) / (totalBalance || 1)) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-amber-500 transition-all duration-1000"
                                    style={{ width: `${(commitments.filter(c => c.certaintyLevel === CertaintyLevel.SOFT).reduce((a, b) => a + b.amount, 0) / (totalBalance || 1)) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-1000"
                                    style={{ width: `${(availableAfterCommitments / (totalBalance || 1)) * 100}%` }}
                                />
                            </div>
                            <div className="flex gap-4 mt-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span className="text-[7px] font-black uppercase text-[var(--text-muted)]">Hard</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span className="text-[7px] font-black uppercase text-[var(--text-muted)]">Soft</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[7px] font-black uppercase text-[var(--text-muted)]">Free</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <div className="flex justify-between items-center px-1">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">Obligation Ledger</h3>
                    <div className="flex items-center gap-4 mt-1">
                        <button
                            onClick={() => setShowSettled(false)}
                            className={`text-[10px] font-bold transition-colors ${!showSettled ? 'text-blue-500' : 'text-[var(--text-dim)]'}`}
                        >
                            {commitments.filter(c => c.status !== 'SETTLED').length} Active
                        </button>
                        <button
                            onClick={() => setShowSettled(true)}
                            className={`text-[10px] font-bold transition-colors ${showSettled ? 'text-emerald-500' : 'text-[var(--text-dim)]'}`}
                        >
                            {commitments.filter(c => c.status === 'SETTLED').length} Completed
                        </button>
                    </div>
                </div>

                {showSettled && (
                    <div className="flex items-center gap-2 bg-[var(--surface-deep)] px-3 py-1.5 rounded-xl border border-[var(--border-glass)]">
                        <button onClick={() => setHistoryMonth(new Date(historyMonth.setMonth(historyMonth.getMonth() - 1)))} className="text-[var(--text-muted)] hover:text-blue-500 transition-colors"><X size={10} className="rotate-45" /></button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] w-20 text-center">{format(historyMonth, 'MMM yyyy')}</span>
                        <button onClick={() => setHistoryMonth(new Date(historyMonth.setMonth(historyMonth.getMonth() + 1)))} className="text-[var(--text-muted)] hover:text-blue-500 transition-colors"><Plus size={10} /></button>
                    </div>
                )}
                <button
                    onClick={() => setShowForm(true)}
                    className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-90 transition-all"
                >
                    <Plus size={20} strokeWidth={3} />
                </button>
            </div>

            <div className="grid gap-2">
                {commitments.filter(c => showSettled ? c.status === 'SETTLED' : c.status !== 'SETTLED').length === 0 ? (
                    <GlassCard className="py-12 border-dashed border-[var(--border-glass)] flex flex-col items-center justify-center text-center transition-colors">
                        <div className="w-16 h-16 bg-[var(--surface-deep)] rounded-full flex items-center justify-center mb-4 transition-colors">
                            <Calendar size={28} className="text-[var(--text-dim)]" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">
                            {showSettled ? 'No Settled Obligations' : 'No Active Commitments'}
                        </p>
                    </GlassCard>
                ) : (
                    commitments
                        .filter(c => {
                            if (showSettled) {
                                if (c.status !== 'SETTLED') return false;
                                const settledDate = new Date(c.updated_at || Date.now());
                                return isWithinInterval(settledDate, {
                                    start: startOfMonth(historyMonth),
                                    end: endOfMonth(historyMonth)
                                });
                            }
                            return c.status !== 'SETTLED';
                        })
                        .map(cm => {
                            const isUrgent = cm.status !== 'SETTLED' && (isSameDay(new Date(cm.nextDate), new Date()) ||
                                (new Date(cm.nextDate).getTime() - new Date().getTime() < 86400000 * 2));

                            return (
                                <div
                                    key={cm.id}
                                    className="relative group overflow-hidden rounded-3xl staggered-fade-in cursor-pointer"
                                    onClick={() => {
                                        setSelectedCommitmentId(cm.id);
                                        setShowDetails(true);
                                    }}
                                >
                                    <GlassCard className={`p-3.5 border-l-0 border-[var(--border-glass)] hover:border-blue-500/30 transition-all duration-500 relative ${isUrgent ? 'shadow-[0_0_20px_rgba(244,63,94,0.05)] border-rose-500/10' : ''}`}>
                                        {isUrgent && (
                                            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/30 animate-pulse" />
                                        )}
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="flex gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-[var(--border-glass)] shadow-inner transition-colors ${cm.status === 'SETTLED' ? 'bg-emerald-500/10' : 'bg-[var(--surface-deep)]'}`}>
                                                    {cm.status === 'SETTLED' ? <Check size={18} className="text-emerald-500" /> : getCommitmentIcon(cm.type)}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-sm text-[var(--text-main)] tracking-tight transition-colors">{cm.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${cm.status === 'SETTLED' ? 'bg-emerald-500/10 text-emerald-500' : getCertaintyColor(cm.certaintyLevel)}`}>
                                                            {cm.status === 'SETTLED' ? 'Completed' : cm.certaintyLevel}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter transition-colors">• {cm.frequency}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right transition-transform duration-500 group-hover:-translate-x-12">
                                                <p className="font-black text-base text-[var(--text-main)] tracking-tighter transition-colors">
                                                    {getCurrencySymbol(settings.currency)}{cm.amount.toLocaleString()}
                                                </p>
                                                <div className="mt-1 flex items-center justify-end gap-1.5">
                                                    {cm.status === 'SETTLED' ? (
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Authorized</span>
                                                    ) : isUrgent ? (
                                                        <div className="flex items-center gap-1 text-rose-500 animate-pulse">
                                                            <AlertCircle size={10} />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">Urgent</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40">{cm.type}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-[var(--border-glass)] flex items-center justify-between transition-colors relative z-10">
                                            <div className="flex items-center gap-2 text-[var(--text-muted)]">
                                                <Calendar size={12} className={isUrgent ? 'text-rose-500' : ''} />
                                                <span className={`text-[9px] font-bold uppercase tracking-widest ${isUrgent ? 'text-rose-500' : ''}`}>
                                                    {cm.status === 'SETTLED' ? 'Settled on: ' : 'Next: '} {format(new Date(cm.status === 'SETTLED' ? cm.updated_at || Date.now() : cm.nextDate), 'MMM dd')}
                                                </span>
                                            </div>
                                            {isUrgent && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-ping" />}
                                        </div>

                                        {/* Slide-in Action Overlay */}
                                        <div className="absolute top-0 right-0 h-full flex translate-x-[105%] group-hover:translate-x-0 transition-transform duration-500 ease-out z-20 rounded-l-3xl overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.1)]">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteId(cm.id);
                                                }}
                                                className="h-full px-6 bg-rose-600 text-white flex items-center justify-center active:bg-rose-700 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </GlassCard>
                                </div>
                            );
                        })
                )}
            </div>

            {showForm && (
                <CommitmentForm
                    onClose={() => setShowForm(false)}
                    onSubmit={addCommitment}
                    currency={getCurrencySymbol(settings.currency)}
                    suggestions={suggestedObligationNames}
                />
            )}

            <DynamicDeleteModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => {
                    if (deleteId) {
                        deleteCommitment(deleteId);
                        setDeleteId(null);
                    }
                }}
                title="Delete Commitment"
                itemName={commitments.find(c => c.id === deleteId)?.name || 'this commitment'}
                itemType="commitment"
                hasDependencies={false}
            />

            {showDetails && selectedCommitment && (
                <CommitmentDetailsModal
                    commitment={selectedCommitment}
                    onClose={() => {
                        setShowDetails(false);
                        setSelectedCommitmentId(null);
                    }}
                    onSettle={settleCommitment}
                    onExtend={extendCommitmentDate}
                    onPostpone={postponeCommitment as (id: string, days: number | 'EOM') => void}
                    wallets={wallets}
                    currency={getCurrencySymbol(settings.currency)}
                />
            )}
        </div>
    );
};

const CommitmentForm: React.FC<{ onClose: () => void, onSubmit: (c: any) => void, currency: string, suggestions: string[] }> = ({ onClose, onSubmit, currency, suggestions }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<CommitmentType>(CommitmentType.FIXED);
    const [frequency, setFrequency] = useState<CommitmentFrequency>(CommitmentFrequency.MONTHLY);
    const [certainty, setCertainty] = useState<CertaintyLevel>(CertaintyLevel.HARD);
    const [payoutDate, setPayoutDate] = useState(new Date());
    const [isRecurring, setIsRecurring] = useState(true);
    const [showDatePicker, setShowDatePicker] = useState(false);

    return (
        <div className="fixed inset-0 w-screen h-screen z-[500] bg-black/75 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <GlassCard className="w-full max-w-sm p-8 border-[var(--border-glass)] space-y-6 bg-[var(--surface-overlay)] transition-colors">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-black tracking-tighter text-[var(--text-main)] transition-colors">New Commitment</h2>
                    <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 transition-colors">Identity</label>
                        <input
                            list="commitment-suggestions"
                            placeholder="E.g. Adobe Subscription, Rent"
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 text-[var(--text-main)] transition-colors"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                        <datalist id="commitment-suggestions">
                            {suggestions.map(s => <option key={s} value={s} />)}
                        </datalist>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 transition-colors">Asset Value</label>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 text-[var(--text-main)] transition-colors"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--text-dim)]">{currency}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <CustomDropdown
                                label="Flow Frequency"
                                value={frequency}
                                onChange={(val) => setFrequency(val as CommitmentFrequency)}
                                options={Object.values(CommitmentFrequency).map(f => ({ value: f, label: f }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <CustomDropdown
                                label="Criticality"
                                value={certainty}
                                onChange={(val) => setCertainty(val as CertaintyLevel)}
                                options={Object.values(CertaintyLevel).map(l => ({ value: l, label: l }))}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-[var(--surface-deep)] rounded-2xl border border-[var(--border-glass)]">
                        <div>
                            <p className="text-[10px] font-black uppercase text-[var(--text-main)]">Recursive Asset</p>
                            <p className="text-[8px] font-bold text-[var(--text-muted)]">Auto-renew for next cycle</p>
                        </div>
                        <button
                            onClick={() => setIsRecurring(!isRecurring)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${isRecurring ? 'bg-blue-600' : 'bg-[var(--bg-color)] border border-[var(--border-glass)]'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 transition-colors">Payout Date</label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl p-4 flex items-center justify-between text-sm font-bold text-[var(--text-secondary)] transition-colors active:scale-[0.98]"
                            >
                                <span>{format(payoutDate, 'MMMM dd, yyyy')}</span>
                                <Calendar size={18} className="text-[var(--text-dim)]" />
                            </button>

                            {showDatePicker && (
                                <div className="absolute bottom-full left-0 right-0 z-50 mb-2">
                                    <PremiumCalendarPicker
                                        selectedDate={payoutDate}
                                        onChange={(date) => {
                                            setPayoutDate(date);
                                            setShowDatePicker(false);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => {
                        if (!name || !amount) return;
                        onSubmit({
                            name,
                            amount: parseFloat(amount),
                            type,
                            frequency,
                            certaintyLevel: certainty,
                            isRecurring,
                            nextDate: payoutDate.toISOString()
                        });
                        onClose();
                    }}
                    className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    <ArrowRightCircle size={18} />
                    <span>Commit Provision</span>
                </button>
            </GlassCard>
        </div>
    );
};


const CommitmentDetailsModal: React.FC<{
    commitment: Commitment,
    onClose: () => void,
    onSettle: (id: string, w: string, c: string, r: boolean) => void,
    onExtend: (id: string, d: string) => void,
    onPostpone: (id: string, days: number | 'EOM') => void,
    wallets: any[],
    currency: string
}> = ({ commitment, onClose, onSettle, onExtend, onPostpone, wallets, currency }) => {
    const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?.id || '');
    const [selectedChannel, setSelectedChannel] = useState(wallets[0]?.channels[0]?.type || '');
    const [isSettling, setIsSettling] = useState(false);
    const [isPostponing, setIsPostponing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [keepRecurring, setKeepRecurring] = useState(commitment.isRecurring || false);
    const [activeTab, setActiveTab] = useState<'settle' | 'postpone' | 'history'>('settle');
    const [showCustomDate, setShowCustomDate] = useState(false);
    const [customDate, setCustomDate] = useState(format(new Date(commitment.nextDate), 'yyyy-MM-dd'));
    const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false);

    useEffect(() => {
        setCustomDate(format(new Date(commitment.nextDate), 'yyyy-MM-dd'));
    }, [commitment.nextDate]);

    const selectedWallet = wallets.find(w => w.id === selectedWalletId);
    const selectedChannelData = selectedWallet?.channels.find((c: any) => c.type === selectedChannel);
    const currentBalance = selectedChannelData?.balance || 0;
    const projectedBalance = currentBalance - commitment.amount;

    return (
        <div className="fixed inset-0 w-screen h-screen z-[550] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />

            <GlassCard className="w-full max-w-lg p-0 border-[var(--border-glass)] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[var(--bg-color)] flex flex-col max-h-[90vh]">
                {/* Header Section */}
                <div className="p-5 sm:p-6 pb-4 border-b border-[var(--border-glass)] relative shrink-0">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full -translate-x-6 -translate-y-6" />
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-[0.2em] border ${commitment.status === 'SETTLED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                    {commitment.status === 'SETTLED' ? 'Synchronized' : 'Operational Provision'}
                                </span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-main)] truncate uppercase italic leading-tight">{commitment.name}</h2>
                            <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-0.5 opacity-60">
                                {format(new Date(commitment.nextDate), 'EEEE, MMMM dd')}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-[var(--surface-deep)] rounded-xl text-[var(--text-muted)] hover:text-rose-500 transition-all active:scale-90"><X size={18} /></button>
                    </div>

                    <div className="mt-4 flex flex-row items-end gap-1.5">
                        <span className="text-xs font-black text-blue-500 mb-1">{currency}</span>
                        <span className="text-3xl sm:text-4xl font-black tracking-tighter text-gradient leading-none">
                            {commitment.amount.toLocaleString()}
                        </span>
                    </div>

                    {/* Segmented Navigation */}
                    <div className="mt-5 flex bg-[var(--surface-deep)]/50 p-1 rounded-2xl border border-[var(--border-glass)]">
                        {(['settle', 'postpone', 'history'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-5 sm:p-6 overflow-y-auto no-scrollbar bg-[var(--bg-color)]/30 backdrop-blur-sm">
                    {activeTab === 'history' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5"><History size={11} /> Activity Timeline</h4>
                                <div className="flex gap-2">
                                    <div className="bg-[var(--surface-deep)] border border-[var(--border-glass)] px-2.5 py-1 rounded-lg">
                                        <span className="text-[7px] font-black text-[var(--text-muted)] uppercase mr-1.5">Events</span>
                                        <span className="text-[9px] font-black text-blue-500">{commitment.history?.length || 0}</span>
                                    </div>
                                    <div className="bg-[var(--surface-deep)] border border-[var(--border-glass)] px-2.5 py-1 rounded-lg">
                                        <span className="text-[7px] font-black text-[var(--text-muted)] uppercase mr-1.5">Cleared</span>
                                        <span className="text-[9px] font-black text-emerald-500">{currency}{commitment.history?.filter(e => e.type === 'SETTLED').reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {(!commitment.history || commitment.history.length === 0) ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-30 group">
                                        <div className="w-14 h-14 bg-[var(--surface-deep)] rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                                            <History size={28} className="text-[var(--text-muted)]" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]">Ledger Vault Empty</p>
                                    </div>
                                ) : (
                                    commitment.history.slice().reverse().map((event, idx) => (
                                        <div key={idx} className="flex gap-4 relative group/item">
                                            {idx !== (commitment.history?.length || 0) - 1 && <div className="absolute left-4 top-8 bottom-0 w-px bg-[var(--border-glass)]" />}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-[var(--border-glass)] shadow-sm transition-all group-hover/item:scale-110 ${event.type === 'SETTLED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                event.type === 'POSTPONED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                }`}>
                                                {event.type === 'SETTLED' ? <Check size={14} /> : event.type === 'POSTPONED' ? <Clock size={14} /> : <Plus size={14} />}
                                            </div>
                                            <div className="pt-1 flex-1 pb-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-main)]">
                                                            {event.type === 'SETTLED' ? 'Authorized Payment' : event.type === 'POSTPONED' ? 'Postponed Due Date' : 'Provision Created'}
                                                        </p>
                                                        {event.note && <p className="text-[8px] font-bold text-blue-400 mt-0.5 uppercase tracking-tight">{event.note}</p>}
                                                        <p className="text-[7px] font-bold text-[var(--text-muted)] mt-1 opacity-60">
                                                            {event.date && format(new Date(event.date), 'MMM dd, yyyy • HH:mm')}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[6px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--surface-deep)] px-1.5 py-0.5 rounded-full border border-[var(--border-glass)]">
                                                            {formatDistanceToNow(new Date(event.date))} ago
                                                        </span>
                                                        {event.amount && (
                                                            <p className="text-[10px] font-black text-emerald-500 mt-1">{currency}{event.amount.toLocaleString()}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'postpone' ? (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-amber-500/5 p-5 rounded-[28px] border border-amber-500/20 relative overflow-hidden">
                                {showSuccess && (
                                    <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-sm z-30 flex items-center justify-center animate-in fade-in duration-300">
                                        <div className="bg-amber-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-xl scale-110">
                                            <Check size={18} strokeWidth={3} />
                                            <span className="font-black uppercase tracking-widest text-[9px]">Date Re-Indexed</span>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 blur-2xl rounded-full" />
                                <div className="flex justify-between items-center mb-5">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                                        <Clock size={10} /> Data Postponement
                                    </h4>
                                    <div className="bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/10">
                                        <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest">Due: {format(new Date(commitment.nextDate), 'MMM dd')}</span>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: '+2D', val: 2 },
                                            { label: '+1W', val: 7 },
                                        ].map(chip => (
                                            <button
                                                key={chip.label}
                                                disabled={isPostponing}
                                                onClick={async () => {
                                                    setIsPostponing(true);
                                                    await onPostpone(commitment.id, chip.val);
                                                    setIsPostponing(false);
                                                    setShowSuccess(true);
                                                    setTimeout(() => setShowSuccess(false), 2000);
                                                }}
                                                className="grow bg-[var(--surface-deep)] hover:bg-amber-500/10 border border-[var(--border-glass)] hover:border-amber-500/50 p-3 rounded-2xl flex flex-col items-center gap-1 transition-all group disabled:opacity-50"
                                            >
                                                <ArrowUpRight size={12} className="text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                <span className="text-[9px] font-black uppercase tracking-tighter text-[var(--text-main)]">{chip.label}</span>
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setShowCustomDate(!showCustomDate)}
                                            className={`grow p-3 rounded-2xl flex flex-col items-center gap-1 transition-all group ${showCustomDate ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-[var(--surface-deep)] border border-[var(--border-glass)]'}`}
                                        >
                                            <Calendar size={12} className={showCustomDate ? 'text-white' : 'text-amber-500'} />
                                            <span className="text-[9px] font-black uppercase tracking-tighter transition-colors">Custom</span>
                                        </button>
                                    </div>
                                    {showCustomDate && (
                                        <div className="space-y-4">
                                            <PremiumCalendarPicker
                                                selectedDate={parseISO(customDate)}
                                                onChange={(date) => setCustomDate(format(date, 'yyyy-MM-dd'))}
                                            />
                                            <button
                                                disabled={isPostponing}
                                                onClick={async () => {
                                                    setIsPostponing(true);
                                                    await onExtend(commitment.id, new Date(customDate).toISOString());
                                                    setIsPostponing(false);
                                                    setShowSuccess(true);
                                                    setShowCustomDate(false);
                                                    setTimeout(() => setShowSuccess(false), 2000);
                                                }}
                                                className="w-full py-4 bg-amber-600 text-white rounded-[22px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 group overflow-hidden relative"
                                            >
                                                <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                                <Shield size={16} className="relative z-10" />
                                                <span className="relative z-10">{isPostponing ? 'Re-Indexing Archive...' : 'Apply Date Shift'}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : commitment.status !== 'SETTLED' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-2">
                            {/* Wallet Selection - Premium Select Box */}
                            <div className="space-y-2.5 relative">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Authorized Funding Source</label>
                                    <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest opacity-60">Priority Queue</span>
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={() => setIsWalletSelectorOpen(!isWalletSelectorOpen)}
                                        className={`w-full bg-[var(--surface-deep)]/50 border border-[var(--border-glass)] backdrop-blur-md rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-[var(--surface-deep)] active:scale-[0.99] ${isWalletSelectorOpen ? 'ring-2 ring-blue-500/20 border-blue-500/50' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-color)] border border-[var(--border-glass)] shadow-inner">
                                                <Wallet size={16} style={{ color: selectedWallet?.color || 'var(--text-muted)' }} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-tight leading-none mb-1">
                                                    {selectedWallet?.name || 'Select Asset Source'}
                                                </p>
                                                <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-70">
                                                    Liquidity: {currency}{selectedWallet?.channels.reduce((sum: number, c: any) => sum + (c.balance || 0), 0).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronDown size={18} className={`text-[var(--text-muted)] transition-transform duration-300 ${isWalletSelectorOpen ? 'rotate-180 text-blue-500' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isWalletSelectorOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setIsWalletSelectorOpen(false)}
                                            />
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-color)] border border-[var(--border-glass)] rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.3)] z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="max-h-[220px] overflow-y-auto no-scrollbar p-1.5">
                                                    {wallets.map(w => (
                                                        <button
                                                            key={w.id}
                                                            onClick={() => {
                                                                setSelectedWalletId(w.id);
                                                                if (w.channels.length) setSelectedChannel(w.channels[0].type);
                                                                setIsWalletSelectorOpen(false);
                                                            }}
                                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group mb-0.5 last:mb-0 ${selectedWalletId === w.id
                                                                ? 'bg-blue-600/10 border border-blue-500/30'
                                                                : 'hover:bg-[var(--surface-deep)] border border-transparent hover:border-[var(--border-glass)]'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--surface-deep)] border border-[var(--border-glass)] group-hover:scale-110 transition-transform">
                                                                    <Wallet size={14} style={{ color: w.color }} />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-tight">{w.name}</p>
                                                                    <p className="text-[7px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">
                                                                        {w.channels.length} {w.channels.length === 1 ? 'Channel' : 'Channels'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`text-[9px] font-black ${selectedWalletId === w.id ? 'text-blue-500' : 'text-[var(--text-main)]'}`}>
                                                                    {currency}{w.channels.reduce((sum: number, c: any) => sum + (c.balance || 0), 0).toLocaleString()}
                                                                </p>
                                                                {selectedWalletId === w.id && (
                                                                    <div className="flex justify-end mt-0.5">
                                                                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Impact Preview */}
                            <div className="bg-[var(--surface-deep)]/30 p-5 rounded-[28px] border border-[var(--border-glass)] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-2xl rounded-full" />
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                                        <Zap size={10} className="text-amber-500" /> Impact Delta
                                    </h4>
                                    <button
                                        onClick={() => setKeepRecurring(!keepRecurring)}
                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${keepRecurring ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'border-[var(--border-glass)] text-[var(--text-muted)]'}`}
                                    >
                                        <span className="text-[6px] font-black uppercase">{keepRecurring ? 'Recursive' : 'One-time'}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ${keepRecurring ? 'bg-blue-500 animate-pulse' : 'bg-zinc-600'}`} />
                                    </button>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Liquidity</span>
                                        <span className="text-xs font-black text-[var(--text-main)]">{currency}{currentBalance.toLocaleString()}</span>
                                    </div>
                                    <div className="space-y-1.5 px-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-rose-500 italic uppercase">Settlement</span>
                                            <span className="text-xs font-black text-rose-500">-{currency}{commitment.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[var(--bg-color)] rounded-full overflow-hidden border border-[var(--border-glass)] relative">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-700"
                                                style={{ width: `${Math.max(0, (projectedBalance / (currentBalance || 1)) * 100)}%` }}
                                            />
                                            <div
                                                className="h-full bg-rose-500/30 absolute top-0 right-0 transition-all duration-700"
                                                style={{ width: `${Math.min(100, (commitment.amount / (currentBalance || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-[var(--border-glass)] px-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-blue-400">Post-Provision Balance</span>
                                        <span className={`text-lg font-black tracking-tighter ${projectedBalance < 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                                            {currency}{projectedBalance.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={isSettling}
                                onClick={() => {
                                    setIsSettling(true);
                                    onSettle(commitment.id, selectedWalletId, selectedChannel, keepRecurring);
                                    setTimeout(() => {
                                        setIsSettling(false);
                                        onClose();
                                    }, 1000);
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative group overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <ShieldCheck size={18} className="relative z-10" />
                                <span className="relative z-10">{isSettling ? 'Synchronizing Archive...' : 'Authorize & Clear Obligation'}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="bg-emerald-500/5 p-12 rounded-[40px] border border-emerald-500/20 text-center space-y-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent)] animate-pulse" />
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto relative group">
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-20" />
                                <Check size={48} className="text-emerald-500 relative z-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-emerald-500 uppercase tracking-tighter italic">Ledger Synchronized</h3>
                                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2 max-w-[200px] mx-auto opacity-70">This provision has been fully authorized and settled.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-[var(--bg-color)] border border-[var(--border-glass)] rounded-2xl text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-[var(--surface-deep)] transition-all"
                            >
                                Re-Index Ledger
                            </button>
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
};

export default CommitmentManager;
