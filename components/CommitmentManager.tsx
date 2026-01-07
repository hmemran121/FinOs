
import React, { useState } from 'react';
import { useFinance } from '../store/FinanceContext';
import { Commitment, CommitmentType, CommitmentFrequency, CertaintyLevel } from '../types';
import { GlassCard, NeumorphButton } from './ui/GlassCard';
import { CustomDropdown } from './ui/CustomDropdown';
import {
    X, Plus, Calendar, Shield, CreditCard, ShoppingBag,
    Trash2, Edit3, Check, AlertCircle, Info, ArrowRightCircle
} from 'lucide-react';
import { format } from 'date-fns';

const CommitmentManager: React.FC = () => {
    const { commitments, addCommitment, deleteCommitment, getCurrencySymbol, settings, availableAfterCommitments, totalBalance } = useFinance();
    const [showForm, setShowForm] = useState(false);

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
        <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Coverage Overview */}
            <GlassCard className="bg-gradient-to-br from-[var(--surface-overlay)] to-[var(--bg-color)] border-[var(--border-glass)] transition-colors">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1 transition-colors">Fiscal Safety</p>
                        <h2 className="text-2xl font-black tracking-tighter text-[var(--text-main)] transition-colors">Commitment Coverage</h2>
                    </div>
                    <div className="p-3 bg-[var(--input-bg)] rounded-2xl border border-[var(--border-glass)]">
                        <Shield size={20} className="text-blue-500" />
                    </div>
                </div>

                <div className="flex items-end gap-3 mb-6">
                    <span className="text-4xl font-black tracking-tighter text-[var(--text-main)] transition-colors">
                        {getCurrencySymbol(settings.currency)}{availableAfterCommitments.toLocaleString()}
                    </span>
                    <div className="pb-1.5 flex items-center gap-1.5">
                        <Info size={12} className="text-[var(--text-muted)]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] transition-colors">Free Capital</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest px-1">
                        <span className="text-[var(--text-muted)] transition-colors">Safety Buffer</span>
                        <span className={coverageRatio > 30 ? 'text-emerald-500' : 'text-rose-500'}>{Math.round(coverageRatio)}%</span>
                    </div>
                    <div className="h-2 w-full bg-[var(--surface-deep)] rounded-full overflow-hidden border border-[var(--border-glass)] transition-colors">
                        <div
                            className={`h-full transition-all duration-1000 ${coverageRatio > 30 ? 'bg-emerald-500' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]'}`}
                            style={{ width: `${Math.max(0, Math.min(100, coverageRatio))}%` }}
                        />
                    </div>
                </div>
            </GlassCard>

            <div className="flex justify-between items-center px-1">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">Obligation Ledger</h3>
                    <p className="text-[10px] font-bold text-[var(--text-dim)] mt-0.5 transition-colors">{commitments.length} Active Provisions</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-90 transition-all"
                >
                    <Plus size={20} strokeWidth={3} />
                </button>
            </div>

            <div className="grid gap-2">
                {commitments.length === 0 ? (
                    <GlassCard className="py-12 border-dashed border-[var(--border-glass)] flex flex-col items-center justify-center text-center transition-colors">
                        <div className="w-16 h-16 bg-[var(--surface-deep)] rounded-full flex items-center justify-center mb-4 transition-colors">
                            <Calendar size={28} className="text-[var(--text-dim)]" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">No Commitments Defined</p>
                        <p className="text-[10px] font-bold text-[var(--text-dim)] mt-1 max-w-[180px] transition-colors">Track fixed expenses to unlock precision forecasting</p>
                    </GlassCard>
                ) : (
                    commitments.map(cm => (
                        <div key={cm.id} className="relative group overflow-hidden rounded-3xl">
                            <GlassCard className="p-3.5 border-l-0 border-[var(--border-glass)] hover:border-blue-500/30 transition-all duration-500 relative">
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-deep)] flex items-center justify-center border border-[var(--border-glass)] shadow-inner transition-colors">
                                            {getCommitmentIcon(cm.type)}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm text-[var(--text-main)] tracking-tight transition-colors">{cm.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${getCertaintyColor(cm.certaintyLevel)}`}>
                                                    {cm.certaintyLevel}
                                                </span>
                                                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter transition-colors">• {cm.frequency}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right transition-transform duration-500 group-hover:-translate-x-12">
                                        <p className="font-black text-base text-[var(--text-main)] tracking-tighter transition-colors">
                                            {getCurrencySymbol(settings.currency)}{cm.amount.toLocaleString()}
                                        </p>
                                        <div className="mt-1 flex items-center justify-end gap-1.5 text-rose-500/50">
                                            {cm.certaintyLevel === CertaintyLevel.HARD ? (
                                                <>
                                                    <AlertCircle size={10} />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Hard</span>
                                                </>
                                            ) : (
                                                <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Flexible</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-[var(--border-glass)] flex items-center justify-between transition-colors relative z-10">
                                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                                        <Calendar size={12} />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Next: {format(new Date(cm.nextDate), 'MMM dd')}</span>
                                    </div>
                                </div>

                                {/* Slide-in Action Overlay */}
                                <div className="absolute top-0 right-0 h-full flex translate-x-[105%] group-hover:translate-x-0 transition-transform duration-500 ease-out z-20 rounded-l-3xl overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.1)]">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteCommitment(cm.id);
                                        }}
                                        className="h-full px-6 bg-rose-600 text-white flex items-center justify-center active:bg-rose-700 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </GlassCard>
                        </div>
                    ))
                )}
            </div>

            {showForm && (
                <CommitmentForm
                    onClose={() => setShowForm(false)}
                    onSubmit={addCommitment}
                    currency={getCurrencySymbol(settings.currency)}
                />
            )}
        </div>
    );
};

const CommitmentForm: React.FC<{ onClose: () => void, onSubmit: (c: any) => void, currency: string }> = ({ onClose, onSubmit, currency }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<CommitmentType>(CommitmentType.FIXED);
    const [frequency, setFrequency] = useState<CommitmentFrequency>(CommitmentFrequency.MONTHLY);
    const [certainty, setCertainty] = useState<CertaintyLevel>(CertaintyLevel.HARD);
    const [payoutDate, setPayoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));

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
                            autoFocus
                            placeholder="E.g. Adobe Subscription, Rent"
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 text-[var(--text-main)] transition-colors"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
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

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 transition-colors">Payout Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 text-[var(--text-secondary)] transition-colors"
                                value={payoutDate}
                                onChange={e => setPayoutDate(e.target.value)}
                            />
                            <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none transition-colors" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1 transition-colors">Taxonomy Type</label>
                        <div className="flex gap-2 p-1 bg-[var(--surface-deep)] border border-[var(--border-glass)] rounded-2xl transition-colors">
                            {Object.values(CommitmentType).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setType(t as any)}
                                    className={`flex-1 py-3 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all ${type === t ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                                >
                                    {t}
                                </button>
                            ))}
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
                            nextDate: new Date(payoutDate).toISOString()
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

export default CommitmentManager;
