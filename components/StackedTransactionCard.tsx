import React, { useState } from 'react';
import { Transaction } from '../types';
import { GlassCard } from './ui/GlassCard';
import { Layers, ChevronDown, ChevronUp, Tag, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useFinance } from '../store/FinanceContext';
import { ICON_MAP } from '../constants';
import { format } from 'date-fns';

interface StackedTransactionCardProps {
    transactions: Transaction[];
    onSelect: (t: Transaction) => void;
    onDelete?: (id: string) => void;
}

export const StackedTransactionCard: React.FC<StackedTransactionCardProps> = ({ transactions, onSelect, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { categories, wallets, formatCurrency, settings } = useFinance();
    const isBN = settings.language === 'BN';

    // Derived Data
    const mainTx = transactions[0];
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const categoryNames = [...new Set(transactions.map(t => categories.find(c => c.id === t.categoryId)?.name || 'Unknown'))];
    const wallet = wallets.find(w => w.id === mainTx.walletId);
    const isIncome = mainTx.type === 'INCOME';

    // Parse the Plan Title from the Note (format: "[Plan: Plan Title] - Component Name")
    const planTitleMatch = mainTx.note?.match(/\[Plan: (.*?)\]/);
    const planTitle = planTitleMatch ? planTitleMatch[1] : 'Combined Plan';

    return (
        <div className="relative group/stack pl-10 mb-4">
            {/* Timeline Node */}
            <div className="absolute left-[18px] top-5 w-[12px] h-[12px] rounded-full bg-[var(--surface-overlay)] border-2 border-indigo-500 z-10 shadow-xl">
                <div className="absolute inset-0.5 rounded-full bg-indigo-500 animate-pulse opacity-40" />
            </div>

            {/* Connector Line */}
            <div className="absolute left-[23px] top-8 bottom-[-16px] w-[2px] z-0 bg-indigo-500/20" />

            <div className="relative">
                {/* Stack Effect Layers (Visual Depth) */}
                {!isExpanded && (
                    <>
                        <div className="absolute top-2 left-2 right-2 h-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-glass)] opacity-40 scale-[0.96] z-0" />
                        <div className="absolute top-1 left-1 right-1 h-full bg-[var(--surface-card)] rounded-2xl border border-[var(--border-glass)] opacity-70 scale-[0.98] z-10" />
                    </>
                )}

                <GlassCard
                    className={`relative z-20 p-0 overflow-hidden transition-all duration-500 border-indigo-500/30 ${isExpanded ? 'shadow-2xl ring-1 ring-indigo-500/50' : 'hover:shadow-xl active:scale-[0.99] cursor-pointer'}`}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {/* Header / Summary Card - Compact Mobile Layout */}
                    <div className="p-2 bg-gradient-to-r from-indigo-500/5 to-transparent">
                        <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-inner shrink-0">
                                    <Layers size={13} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-tight flex items-center gap-1.5 truncate leading-tight">
                                        <span className="truncate">{planTitle}</span>
                                        <span className="text-[8px] px-1 py-px rounded bg-indigo-500 text-white font-bold tracking-widest shrink-0">{transactions.length}</span>
                                    </h4>
                                    <p className="text-[8px] text-[var(--text-muted)] font-bold italic truncate leading-tight">
                                        {categoryNames.slice(0, 2).join(', ')}{categoryNames.length > 2 ? '...' : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="font-black text-base text-[var(--text-main)] tracking-tight">
                                    -{formatCurrency(totalAmount, wallet?.currency)}
                                </p>
                                <div className="flex items-center justify-end gap-1 text-[var(--text-muted)] opacity-60">
                                    <span className="text-[8px] font-black uppercase tracking-widest">{wallet?.name}</span>
                                    {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Checkered/Weave Effect for Expanded Items - Tighter Spacing */}
                    {isExpanded && (
                        <div className="divide-y divide-[var(--border-glass)] bg-[var(--surface-deep)]/30 animate-in slide-in-from-top-2 duration-300">
                            {transactions.map((t, idx) => {
                                const cat = categories.find(c => c.id === t.categoryId);
                                // Extract Component Name from Note
                                const componentName = t.note?.split(' - ')[1]?.split(' (')[0] || t.note;

                                return (
                                    <div
                                        key={t.id}
                                        className="p-2.5 flex items-center gap-2.5 hover:bg-[var(--surface-overlay)] transition-colors cursor-pointer group/item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelect(t);
                                        }}
                                    >
                                        <div
                                            className="w-7 h-7 rounded-md flex items-center justify-center border border-[var(--border-glass)] bg-[var(--input-bg)] text-[var(--text-muted)] group-hover/item:scale-110 transition-transform shrink-0"
                                            style={{ color: cat?.color }}
                                        >
                                            {ICON_MAP[cat?.icon || 'Tag'] || <Tag size={13} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-[var(--text-main)] truncate">{componentName}</p>
                                            <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">{cat?.name}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold text-[var(--text-main)]">
                                                {formatCurrency(t.amount, wallet?.currency)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
};
