import React, { useState, useMemo } from 'react';
import { X, Search, Globe, Check, ChevronRight, Zap } from 'lucide-react';
import { useFinance } from '../../store/FinanceContext';

interface CurrencyPickerOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (currencyCode: string) => void;
    selectedCurrency?: string;
    title?: string;
}

export const CurrencyPickerOverlay: React.FC<CurrencyPickerOverlayProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedCurrency,
    title = "Currency Vault"
}) => {
    const { currencies } = useFinance();
    const [searchCurrency, setSearchCurrency] = useState('');

    const filteredCurrencies = useMemo(() => {
        if (!searchCurrency) return currencies;
        const lowSearch = searchCurrency.toLowerCase();
        return currencies.filter(c =>
            c.code.toLowerCase().includes(lowSearch) ||
            c.name.toLowerCase().includes(lowSearch)
        );
    }, [currencies, searchCurrency]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 w-screen h-screen z-[600] bg-black/80 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300 p-4">
            <div className="w-full max-w-md h-[80vh] bg-[var(--surface-overlay)] rounded-[40px] border border-[var(--border-glass)] shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 overflow-hidden">
                {/* Picker Header */}
                <div className="px-8 py-6 flex items-center justify-between bg-[var(--surface-overlay)]/80 border-b border-[var(--border-glass)] sticky top-0 z-[210] backdrop-blur-xl">
                    <div>
                        <h2 className="text-2xl font-black tracking-tighter text-[var(--text-main)] transition-colors">{title}</h2>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1 transition-colors">Global Exchange Standards</p>
                    </div>
                    <button
                        onClick={() => { onClose(); setSearchCurrency(''); }}
                        className="p-4 bg-[var(--input-bg)] rounded-2xl border border-[var(--border-glass)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-90"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search & Intelligence */}
                <div className="px-8 pt-10 pb-6">
                    <div className="relative group">
                        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" />
                        <input
                            autoFocus
                            placeholder="Search system currencies..."
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-[24px] py-5 pl-14 pr-6 text-xs font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-[var(--text-dim)] text-[var(--text-main)] shadow-inner"
                            value={searchCurrency}
                            onChange={(e) => setSearchCurrency(e.target.value)}
                        />
                    </div>
                </div>

                {/* Scrollable Territory */}
                <div className="flex-1 overflow-y-auto px-8 pb-32 space-y-3 no-scrollbar">
                    <div className="px-2 mb-4">
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--text-muted)] italic">Primary Reservoirs</span>
                    </div>

                    {filteredCurrencies.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center opacity-20">
                            <Globe size={64} className="mb-4 animate-pulse text-[var(--text-muted)]" />
                            <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">No matching currency found</p>
                        </div>
                    ) : (
                        filteredCurrencies.map((currency) => {
                            const isActive = selectedCurrency === currency.code;
                            return (
                                <button
                                    key={currency.code}
                                    onClick={() => {
                                        onSelect(currency.code);
                                        onClose();
                                        setSearchCurrency('');
                                    }}
                                    className={`w-full flex items-center justify-between p-4 rounded-[24px] border transition-all duration-300 group/item ${isActive ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[var(--input-bg)] border-[var(--border-glass)] text-[var(--text-secondary)] hover:bg-[var(--surface-card)]'}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black transition-all ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--surface-deep)] border border-[var(--border-glass)] text-blue-500 group-hover/item:scale-110'}`}>
                                            {currency.symbol}
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-[var(--text-main)]'}`}>{currency.name}</p>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-0.5 ${isActive ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>{currency.code}</p>
                                        </div>
                                    </div>
                                    <div className={`transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50 group-hover/item:opacity-40 animate-in fade-in slide-in-from-right-2'}`}>
                                        {isActive ? (
                                            <Check size={20} className="text-white" strokeWidth={4} />
                                        ) : (
                                            <ChevronRight size={20} />
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Intelligence Footer */}
                <div className="p-8 pt-4 bg-gradient-to-t from-[var(--surface-overlay)] via-[var(--surface-overlay)]/90 to-transparent pointer-events-none mt-auto">
                    <div className="w-full py-4 bg-[var(--surface-deep)] rounded-[24px] border border-[var(--border-glass)] flex items-center justify-center gap-3 opacity-40">
                        <Zap size={12} className="text-blue-500" />
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-[var(--text-main)]">Real-time Exchange Integration enabled</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
