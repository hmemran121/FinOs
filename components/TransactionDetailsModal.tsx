import React from 'react';
import { useFeedback } from '../store/FeedbackContext';
import { Transaction, MasterCategoryType } from '../types';
import { useFinance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import {
    X,
    Calendar,
    Clock,
    Wallet,
    Tag,
    Share2,
    Trash2,
    ArrowRight,
    ArrowRightLeft,
    Banknote,
    FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ICON_MAP } from '../constants';

interface TransactionDetailsModalProps {
    transaction: Transaction | null;
    isOpen: boolean;
    onClose: () => void;
    onDelete: (id: string) => void;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
    transaction,
    isOpen,
    onClose,
    onDelete
}) => {
    const { categories, wallets, getCurrencySymbol, setActiveTab, setSelectedWalletId } = useFinance();
    const { showFeedback } = useFeedback();

    if (!isOpen || !transaction) return null;

    const category = categories.find(c => c.id === transaction.categoryId);
    const wallet = wallets.find(w => w.id === transaction.walletId);
    const toWallet = transaction.toWalletId ? wallets.find(w => w.id === transaction.toWalletId) : null;

    const isIncome = transaction.type === MasterCategoryType.INCOME;
    const isTransfer = transaction.type === MasterCategoryType.TRANSFER;
    const isExpense = transaction.type === MasterCategoryType.EXPENSE;

    const currencySymbol = getCurrencySymbol(wallet?.currency);

    const handleNavigateToWallet = () => {
        if (wallet) {
            setTimeout(() => {
                setSelectedWalletId(wallet.id);
                setActiveTab('wallets');
            }, 150); // Small delay for smooth modal close
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 w-screen h-screen z-[500] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-transparent transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-[var(--surface-color)] sm:rounded-3xl rounded-t-3xl border border-[var(--border-glass)] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 sm:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

                {/* Header Gradient */}
                <div className={`h-32 w-full absolute top-0 left-0 bg-gradient-to-b ${isIncome ? 'from-emerald-500/20' :
                    isTransfer ? 'from-blue-500/20' :
                        'from-rose-500/20'
                    } to-transparent pointer-events-none`} />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-md transition-colors z-10 text-[var(--text-main)]"
                >
                    <X size={20} />
                </button>

                <div className="p-6 relative z-0 overflow-y-auto no-scrollbar">
                    {/* Main Icon & Amount */}
                    <div className="flex flex-col items-center justify-center pt-8 pb-8 space-y-4">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${isIncome ? 'bg-emerald-500/20 text-emerald-500' :
                            isTransfer ? 'bg-blue-500/20 text-blue-500' :
                                'bg-rose-500/20 text-rose-500'
                            }`}>
                            {isTransfer ? <ArrowRightLeft size={36} /> : (ICON_MAP[category?.icon || ''] || <Tag size={36} />)}
                        </div>

                        <div className="text-center">
                            <p className="text-sm font-bold uppercase tracking-widest opacity-50 mb-1">
                                {isTransfer ? 'Transfer Amount' : category?.name || 'Transaction'}
                            </p>
                            <h2 className={`text-4xl font-black ${isIncome ? 'text-emerald-500' :
                                isTransfer ? 'text-blue-500' :
                                    'text-[var(--text-main)]'
                                }`}>
                                {isExpense && '-'}{isIncome && '+'}{currencySymbol}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <GlassCard className="p-3 bg-[var(--surface-deep)] border-[var(--border-glass)] min-h-[80px] flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-1 opacity-50">
                                <Calendar size={14} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Date</span>
                            </div>
                            <p className="font-semibold text-sm">{format(new Date(transaction.date), 'MMM dd, yyyy')}</p>
                        </GlassCard>

                        <GlassCard className="p-3 bg-[var(--surface-deep)] border-[var(--border-glass)] min-h-[80px] flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-1 opacity-50">
                                <Clock size={14} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Time</span>
                            </div>
                            <p className="font-semibold text-sm">{format(new Date(transaction.date), 'h:mm a')}</p>
                        </GlassCard>

                        <GlassCard
                            className="p-3 bg-[var(--surface-deep)] border-[var(--border-glass)] min-h-[80px] flex flex-col justify-center col-span-2 active:scale-[0.98] transition-all cursor-pointer hover:bg-[var(--surface-glass)]"
                            onClick={handleNavigateToWallet}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1 opacity-50">
                                        <Wallet size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Source Wallet</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: wallet?.color || '#ccc' }} />
                                        <p className="font-bold text-sm text-[var(--text-main)]">{wallet?.name}</p>
                                    </div>
                                    <p className="text-[10px] opacity-40 mt-0.5 font-medium ml-4">{transaction.channelType}</p>
                                </div>
                                <ArrowRight size={16} className="opacity-30" />
                            </div>
                        </GlassCard>

                        {isTransfer && toWallet && (
                            <GlassCard className="p-3 bg-[var(--surface-deep)] border-[var(--border-glass)] min-h-[80px] flex flex-col justify-center col-span-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 opacity-50">
                                            <Wallet size={14} />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Destination Wallet</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: toWallet?.color || '#ccc' }} />
                                            <p className="font-bold text-sm text-[var(--text-main)]">{toWallet?.name}</p>
                                        </div>
                                        <p className="text-[10px] opacity-40 mt-0.5 font-medium ml-4">{transaction.toChannelType}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        <GlassCard className="p-4 bg-[var(--surface-deep)] border-[var(--border-glass)] col-span-2">
                            <div className="flex items-start gap-2 mb-2 opacity-50">
                                <FileText size={14} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Note</span>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium text-[var(--text-muted)]">
                                {transaction.note || 'No description provided for this transaction.'}
                            </p>
                        </GlassCard>
                    </div>

                    {/* Sub Ledger Info */}
                    {(transaction.isSubLedgerSync || transaction.subLedgerId) && (
                        <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 active:bg-blue-500/20 transition-all cursor-pointer group"
                            onClick={() => {
                                setTimeout(() => setActiveTab('commitments'), 150);
                                onClose();
                            }}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                                    {transaction.isSubLedgerSync ? 'Synced Record' : 'Obligation Settlement'}
                                </p>
                                <ArrowRight size={12} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-xs text-blue-300">
                                {transaction.isSubLedgerSync
                                    ? `This transaction was synced from ${transaction.subLedgerName || 'a Sub-Ledger'}.`
                                    : `This transaction settled the obligation: ${transaction.subLedgerName || 'Unnamed'}.`
                                }
                                <span className="block mt-1 font-bold">Click to view Obligation Ledger</span>
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <button
                            className="py-4 rounded-2xl bg-[var(--surface-deep)] border border-[var(--border-glass)] text-[var(--text-main)] font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                            onClick={() => {
                                // Future: Share receipt feature
                                showFeedback('Receipt sharing coming soon!', 'info');
                            }}
                        >
                            <Share2 size={18} />
                            Share Receipt
                        </button>
                        <button
                            className="py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-rose-500 hover:text-white"
                            onClick={() => {
                                onDelete(transaction.id);
                                onClose();
                                showFeedback('Transaction deleted.', 'success');
                            }}
                        >
                            <Trash2 size={18} />
                            Delete
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TransactionDetailsModal;
