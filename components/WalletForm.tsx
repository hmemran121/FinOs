import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../store/FinanceContext';
import { Wallet, ChannelType } from '../types';
import { X, Check, Palette, Layers, ChevronDown, Wallet as WalletIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { CustomDropdown } from './ui/CustomDropdown';
import { CurrencyPickerOverlay } from './ui/CurrencyPickerOverlay';

interface WalletFormProps {
    onClose: () => void;
    editWallet?: Wallet;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

import { useFeedback } from '../store/FeedbackContext';

const WalletForm: React.FC<WalletFormProps> = ({ onClose, editWallet }) => {
    const { addWallet, updateWallet, wallets, channelTypes, currencies, settings } = useFinance();
    const { showFeedback } = useFeedback();

    const [name, setName] = useState(editWallet?.name || '');
    const [currency, setCurrency] = useState(editWallet?.currency || settings.currency || 'USD');
    const [color, setColor] = useState(editWallet?.color || COLORS[0]);
    const [isPrimary, setIsPrimary] = useState(editWallet?.isPrimary || false);
    const [usesPrimaryIncome, setUsesPrimaryIncome] = useState(editWallet?.usesPrimaryIncome || false);
    const [parentWalletId, setParentWalletId] = useState(editWallet?.parentWalletId || '');
    const [isParentSelectOpen, setIsParentSelectOpen] = useState(false);
    const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);

    // Map of channel type ID -> balance string. If not present in map, it's not selected.
    const [allocation, setAllocation] = useState<Record<string, string>>({});
    const [totalTreasury, setTotalTreasury] = useState('0');

    // Initialize state
    useEffect(() => {
        if (editWallet) {
            const alloc: Record<string, string> = {};
            let total = 0;
            editWallet.channels.forEach(c => {
                alloc[c.type] = c.balance.toString();
                total += c.balance;
            });
            setAllocation(alloc);
            setTotalTreasury(total.toString());
        } else {
            // Default to first channel type (usually CASH) if available, or just empty
            const defaultType = channelTypes.find(c => c.name === 'CASH')?.id || channelTypes[0]?.id;
            if (defaultType) {
                setAllocation({ [defaultType]: '0' });
            }
        }
    }, [editWallet, channelTypes]);

    // Update total when allocation changes
    useEffect(() => {
        const sum = Object.values(allocation).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        setTotalTreasury(sum.toString());
    }, [allocation]);

    const handleChannelToggle = (typeId: string) => {
        setAllocation(prev => {
            const next = { ...prev };
            if (next[typeId] !== undefined) {
                // Deselect
                delete next[typeId];
            } else {
                // Select
                next[typeId] = '0';
            }
            return next;
        });
    };

    const handleAllocationChange = (typeId: string, value: string) => {
        setAllocation(prev => ({
            ...prev,
            [typeId]: value
        }));
    };

    const handleEvenSplit = () => {
        const total = parseFloat(totalTreasury) || 0;
        const keys = Object.keys(allocation);
        if (keys.length === 0) return;

        const splitAmount = (total / keys.length).toFixed(2);
        const nextAlloc: Record<string, string> = {};
        keys.forEach(k => nextAlloc[k] = splitAmount);

        // Adjust last one for rounding errors
        const used = parseFloat(splitAmount) * (keys.length - 1);
        const lastKey = keys[keys.length - 1];
        nextAlloc[lastKey] = (total - used).toFixed(2);

        setAllocation(nextAlloc);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            return; // Block submission if name is empty
        }

        // Validate that at least one channel is selected
        if (Object.keys(allocation).length === 0) {
            showFeedback('At least one settlement channel is required.', 'error');
            return;
        }

        const validChannels = Object.entries(allocation).map(([type, bal]) => ({
            id: editWallet?.channels.find(c => c.type === type)?.id || '', // Maintain ID if editing
            type,
            balance: parseFloat(bal) || 0,
            wallet_id: editWallet?.id || '',
            updated_at: Date.now(),
            version: 1,
            device_id: 'local',
            user_id: 'local',
            is_deleted: 0
        }));

        const finalTotal = validChannels.reduce((sum, c) => sum + c.balance, 0);

        const walletData = {
            name,
            currency,
            initialBalance: finalTotal,
            color,
            icon: 'Wallet', // Default icon
            isPrimary,
            usesPrimaryIncome,
            parentWalletId: usesPrimaryIncome ? parentWalletId : undefined,
            isVisible: true,
            channels: validChannels
        };

        try {
            if (editWallet) {
                await updateWallet(editWallet.id, walletData);
                showFeedback('Wallet details updated successfully.', 'success');
            } else {
                await addWallet(walletData);
                showFeedback('New wallet created successfully!', 'success');
            }
            onClose();
        } catch (err) {
            showFeedback('Failed to save wallet. Please try again.', 'error');
            console.error(err);
        }
    };

    // Helper to get icon component dynamically
    const getIcon = (iconName: string) => {
        // @ts-ignore
        const IconComp = Icons[iconName] || Icons.HelpCircle;
        return <IconComp size={24} className="text-[var(--text-muted)]" />;
    };

    const linkableWallets = wallets.filter(w => w.id !== editWallet?.id && w.isPrimary);
    const selectedParentWallet = linkableWallets.find(w => w.id === parentWalletId);

    return (
        <div className="fixed inset-0 w-screen h-screen z-[500] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
            <div className="w-full max-w-md bg-[#F8F9FA] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative transition-all">

                {/* Header */}
                <div className="px-8 pt-6 pb-2 flex justify-between items-center bg-transparent z-10 shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">
                        {editWallet ? 'Edit Wallet' : 'New Wallet'}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-rose-50 transition-colors shadow-sm">
                        <X size={20} className="text-slate-400 hover:text-rose-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">

                    {/* Identity */}
                    <div className="space-y-2 mt-2">
                        <label className="text-[11px] font-bold uppercase text-slate-400 tracking-widest pl-1">
                            Wallet Identity <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="E.g. Business, Savings, Family"
                            className={`w-full bg-white border-2 ${!name.trim() ? 'border-red-100 focus:border-red-200' : 'border-transparent focus:border-blue-500'} rounded-2xl px-5 py-4 text-slate-700 placeholder:text-slate-300 outline-none text-lg font-medium transition-all shadow-sm`}
                        />
                    </div>

                    {/* Liquid Distribution */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end px-1">
                            <label className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Liquid Distribution</label>
                            <button
                                type="button"
                                onClick={handleEvenSplit}
                                className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider hover:bg-blue-100 transition-colors"
                            >
                                Even Split
                            </button>
                        </div>
                        <div className="bg-white p-5 rounded-[1.5rem] shadow-sm space-y-4">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-slate-800">
                                    {currencies.find(c => c.code === currency)?.symbol}
                                    {Math.round(parseFloat(totalTreasury) || 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                {Object.entries(allocation).filter(([_, v]) => parseFloat(v) > 0).length > 0 ? (
                                    Object.entries(allocation).filter(([_, v]) => parseFloat(v) > 0).map(([type, bal]) => (
                                        <div
                                            key={type}
                                            style={{
                                                width: `${((parseFloat(bal) || 0) / (parseFloat(totalTreasury) || 1)) * 100}%`,
                                                backgroundColor: channelTypes.find(c => c.id === type)?.color || '#3B82F6'
                                            }}
                                        />
                                    ))
                                ) : (
                                    <div className="w-full bg-slate-200" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Treasury & Currency */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest pl-1">Total Treasury</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={totalTreasury}
                                    onChange={e => setTotalTreasury(e.target.value)}
                                    className="w-full bg-white rounded-2xl px-4 py-3.5 text-slate-700 font-bold outline-none shadow-sm"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currency}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Currency</label>
                            <button
                                type="button"
                                onClick={() => setIsCurrencyPickerOpen(true)}
                                className="w-full bg-white border border-blue-100 hover:border-blue-300 rounded-xl px-4 py-4 flex items-center justify-between transition-all shadow-sm active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 font-bold">
                                        {currencies.find(c => c.code === currency)?.symbol}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-slate-800">{currency}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{currencies.find(c => c.code === currency)?.name}</p>
                                    </div>
                                </div>
                                <ChevronDown size={18} className="text-slate-400" />
                            </button>
                        </div>
                    </div>

                    <CurrencyPickerOverlay
                        isOpen={isCurrencyPickerOpen}
                        onClose={() => setIsCurrencyPickerOpen(false)}
                        selectedCurrency={currency}
                        onSelect={setCurrency}
                        title="Wallet Currency"
                    />

                    {/* Visual Style */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase text-slate-400 tracking-widest pl-1">Visual Style</label>
                        <div className="flex flex-wrap gap-2.5">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-10 h-10 rounded-xl transition-all shadow-sm flex items-center justify-center ${color === c ? 'ring-2 ring-offset-2 ring-blue-500/20 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                                    style={{ backgroundColor: c }}
                                >
                                    {color === c && <Check size={16} className="text-white drop-shadow-md" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Settlement Channels */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-bold uppercase text-slate-400 tracking-widest pl-1 block">Settlement Channels</label>

                        <div className="space-y-2">
                            {channelTypes.slice().sort((a, b) => {
                                const aSel = allocation[a.id] !== undefined ? 1 : 0;
                                const bSel = allocation[b.id] !== undefined ? 1 : 0;
                                return bSel - aSel;
                            }).map(type => {
                                const isSelected = allocation[type.id] !== undefined;
                                return (
                                    <div
                                        key={type.id}
                                        onClick={() => handleChannelToggle(type.id)}
                                        className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${isSelected ? 'bg-white shadow-md z-10' : 'bg-slate-100 opacity-70 hover:opacity-100 cursor-pointer'}`}
                                    >
                                        <div className="p-4 flex items-center gap-4">
                                            <div className={`p-2.5 rounded-xl transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-400'}`}>
                                                {/* @ts-ignore */}
                                                {getIcon(type.iconName || 'Wallet')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h3 className={`text-sm font-bold tracking-wide uppercase ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{type.name}</h3>
                                                        <p className="text-[10px] text-slate-400 font-medium">Operational Node</p>
                                                    </div>

                                                    {isSelected ? (
                                                        <div className="bg-blue-50 p-1 rounded-full">
                                                            <Check size={14} className="text-blue-600" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-slate-400 transition-colors" />
                                                    )}
                                                </div>

                                                {isSelected && (
                                                    <div className="mt-3 animate-in slide-in-from-top-1 duration-200">
                                                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated</span>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={allocation[type.id]}
                                                                    onChange={e => handleAllocationChange(type.id, e.target.value)}
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="w-20 bg-transparent text-right font-bold text-slate-800 outline-none text-sm"
                                                                    placeholder="0.00"
                                                                />
                                                                <span className="text-[10px] font-bold text-slate-400">{currency}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => setIsPrimary(!isPrimary)}>
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Mark as Primary Wallet</h3>
                                <p className="text-[11px] text-slate-400">Main source for general transactions</p>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-colors relative ${isPrimary ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isPrimary ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => setUsesPrimaryIncome(!usesPrimaryIncome)}>
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Use Primary Wallet Income</h3>
                                <p className="text-[11px] text-slate-400">Option A: Link income flow to Primary</p>
                            </div>
                            <div className={`w-11 h-6 rounded-full transition-colors relative ${usesPrimaryIncome ? 'bg-purple-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${usesPrimaryIncome ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>

                        {/* Linked Primary Wallet Selection (Custom Design) */}
                        {usesPrimaryIncome && linkableWallets.length > 0 && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 pt-2 relative z-20">
                                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest pl-1">Linked Primary Wallet <span className="text-rose-500">*</span></label>

                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsParentSelectOpen(!isParentSelectOpen)}
                                        className="w-full bg-white border border-blue-100 hover:border-blue-300 rounded-xl px-4 py-4 flex items-center justify-between transition-all shadow-sm active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${selectedParentWallet ? '' : 'bg-slate-100'}`} style={{ backgroundColor: selectedParentWallet ? selectedParentWallet.color : undefined }}>
                                                <Layers size={18} className={selectedParentWallet ? 'text-white' : 'text-slate-400'} />
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-sm font-bold ${selectedParentWallet ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {selectedParentWallet ? selectedParentWallet.name : 'Select Primary Wallet'}
                                                </p>
                                                {selectedParentWallet && <p className="text-[10px] text-slate-400 font-medium">Balance: {selectedParentWallet.currency} {selectedParentWallet.initialBalance.toLocaleString()}</p>}
                                            </div>
                                        </div>
                                        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isParentSelectOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {/* Dropdown Menu */}
                                    <div className={`absolute top-full left-0 right-0 mt-2 bg-gradient-to-b from-white to-slate-50 rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden z-50 transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) origin-top max-h-56 overflow-y-auto ${isParentSelectOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                                        <div className="flex flex-col">
                                            <button
                                                type="button"
                                                onClick={() => { setParentWalletId(''); setIsParentSelectOpen(false); }}
                                                className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
                                            >
                                                <div className="p-2 rounded-lg bg-slate-100">
                                                    <X size={16} className="text-slate-400" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-400">No Link</span>
                                            </button>
                                            {linkableWallets.map((w, idx) => (
                                                <button
                                                    key={w.id}
                                                    type="button"
                                                    onClick={() => { setParentWalletId(w.id); setIsParentSelectOpen(false); }}
                                                    className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors ${idx !== linkableWallets.length - 1 ? 'border-b border-slate-100' : ''}`}
                                                >
                                                    <div className="p-2 rounded-lg shadow-sm" style={{ backgroundColor: w.color }}>
                                                        <WalletIcon size={16} className="text-white" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-slate-700">{w.name}</p>
                                                        <p className="text-[10px] text-slate-400">{w.currency}</p>
                                                    </div>
                                                    {parentWalletId === w.id && <Check size={16} className="ml-auto text-blue-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[10px] text-slate-400 italic pl-1">
                                    Transactions in this wallet will auto-deduct from the linked primary wallet.
                                </p>
                            </div>
                        )}

                        {/* Fallback msg if no primary wallets exist */}
                        {usesPrimaryIncome && linkableWallets.length === 0 && (
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 items-center">
                                <Icons.AlertTriangle size={18} className="text-amber-500 shrink-0" />
                                <p className="text-xs text-amber-600 font-medium">
                                    No primary wallets found. Please create a primary wallet first to use this feature.
                                </p>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer Action */}
                <div className="p-6 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA]/95 to-transparent z-10 shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 transition-all ${!name.trim()
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-[#0066FF] hover:bg-blue-600 active:scale-[0.98] text-white shadow-blue-500/30'
                            }`}
                    >
                        <Check size={24} strokeWidth={3} />
                        {editWallet ? 'Save Changes' : 'Create Wallet'}
                    </button>
                </div>

                {/* Backdrop for dropdown */}
                {isParentSelectOpen && (
                    <div className="fixed inset-0 z-10" onClick={() => setIsParentSelectOpen(false)} />
                )}

            </div>
        </div>
    );
};

export default WalletForm;
