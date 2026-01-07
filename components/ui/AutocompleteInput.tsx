import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from './GlassCard';
import { Search, Loader2, Plane, ShoppingCart, Activity, PiggyBank, Home, Car, GraduationCap, Briefcase, Sparkles, Check, ArrowRight, Zap } from 'lucide-react';

interface AutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    fetchSuggestions: (query: string) => Promise<string[]>;
    placeholder?: string;
    className?: string;
    onSelect?: (value: string) => void;
}

// Dynamic Icon Generator based on keywords
const getSuggestionIcon = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('trip') || t.includes('travel') || t.includes('vacation') || t.includes('tour')) return <Plane size={14} />;
    if (t.includes('grocery') || t.includes('market') || t.includes('bazar') || t.includes('shop')) return <ShoppingCart size={14} />;
    if (t.includes('medical') || t.includes('health') || t.includes('hospital') || t.includes('checkup')) return <Activity size={14} />;
    if (t.includes('saving') || t.includes('fund') || t.includes('investment') || t.includes('bank')) return <PiggyBank size={14} />;
    if (t.includes('home') || t.includes('house') || t.includes('rent') || t.includes('renov')) return <Home size={14} />;
    if (t.includes('car') || t.includes('vehicle') || t.includes('bike') || t.includes('service')) return <Car size={14} />;
    if (t.includes('edu') || t.includes('school') || t.includes('college') || t.includes('course')) return <GraduationCap size={14} />;
    if (t.includes('business') || t.includes('office') || t.includes('work') || t.includes('salary')) return <Briefcase size={14} />;
    if (t.includes('new') || t.includes('plan')) return <Sparkles size={14} />;
    return <Zap size={14} />;
};

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
    value,
    onChange,
    fetchSuggestions,
    placeholder,
    className,
    onSelect
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (showSuggestions) {
                setIsLoading(true);
                try {
                    const results = await fetchSuggestions(value);
                    setSuggestions(results);
                } catch (e) {
                    console.error("Failed to fetch suggestions", e);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setSuggestions([]);
            }
        }, 120);

        return () => clearTimeout(timer);
    }, [value, showSuggestions, fetchSuggestions]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (suggestion: string) => {
        onChange(suggestion);
        if (onSelect) onSelect(suggestion);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    // Helper to highlight match
    const renderHighlightedText = (text: string, query: string) => {
        if (!query.trim()) return <span>{text}</span>;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase() ? (
                        <span key={i} className="text-blue-400 font-black decoration-blue-500/30 underline underline-offset-4 decoration-2">{part}</span>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                )}
            </span>
        );
    };

    return (
        <div ref={wrapperRef} className="relative w-full z-[1000]">
            <div className="relative group/autocomplete">
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => {
                        setShowSuggestions(true);
                    }}
                    placeholder={placeholder}
                    className={`w-full bg-[var(--surface-deep)]/40 backdrop-blur-md border border-[var(--border-glass)] hover:border-blue-500/30 rounded-[28px] p-5 pl-14 text-[var(--text-main)] outline-none focus:border-blue-500/50 focus:bg-[var(--surface-deep)]/80 transition-all font-black text-sm placeholder:opacity-10 shadow-lg ${className}`}
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within/autocomplete:text-blue-500 group-focus-within/autocomplete:scale-110 transition-all duration-300">
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                </div>

                {/* Subtle Glow Effect on focus */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/0 via-blue-500/0 to-indigo-600/0 rounded-[32px] blur-xl opacity-0 group-focus-within/autocomplete:opacity-20 group-focus-within/autocomplete:from-blue-600 group-focus-within/autocomplete:to-indigo-600 transition-all duration-700 -z-10" />
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-4 z-[1001] animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-500 origin-top">
                    <GlassCard className="bg-[var(--surface-overlay)]/90 backdrop-blur-3xl border-white/5 shadow-[0_30px_90px_rgba(0,0,0,0.6)] max-h-80 overflow-y-auto no-scrollbar rounded-[32px] overflow-hidden p-2 border border-blue-500/10">
                        <div className="pb-2 pt-1 px-4 flex items-center justify-between border-b border-white/5 mb-2">
                            <div className="flex items-center gap-2">
                                <Sparkles size={10} className="text-blue-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/80">Strategy Library</span>
                            </div>
                            <span className="text-[8px] font-black font-mono text-white/20 italic">AI-Engine v2.0</span>
                        </div>

                        <div className="space-y-1">
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleSelect(suggestion)}
                                    className="w-full text-left px-5 py-4 rounded-[22px] hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-indigo-500/10 hover:text-white transition-all duration-300 text-sm font-bold text-[var(--text-main)] flex items-center gap-4 group/item relative overflow-hidden"
                                >
                                    {/* Hover Shine */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover/item:translate-x-full transition-transform duration-1000" />

                                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--text-muted)] group-hover/item:scale-110 group-hover/item:bg-blue-500 group-hover/item:text-white group-hover/item:border-blue-400/30 transition-all duration-500 shadow-inner">
                                        {getSuggestionIcon(suggestion)}
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        <div className="text-[var(--text-main)] group-hover/item:text-white transition-colors">
                                            {renderHighlightedText(suggestion, value)}
                                        </div>
                                        <div className="text-[8px] font-black uppercase tracking-widest text-white/20 group-hover/item:text-blue-400/60 transition-colors mt-0.5">
                                            Authorized Pattern
                                        </div>
                                    </div>

                                    <div className="opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0 -translate-x-2 transition-all duration-500">
                                        {suggestion.toLowerCase() === value.toLowerCase() ? (
                                            <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
                                                <Check size={14} className="text-blue-500" />
                                            </div>
                                        ) : (
                                            <ArrowRight size={14} className="text-blue-500" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer Indicator */}
                        <div className="mt-2 text-center py-2 px-4 border-t border-white/5">
                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-30">Press Enter to Commit Intent</p>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
