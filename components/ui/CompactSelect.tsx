import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CompactSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string; icon?: React.ReactNode }[];
    icon?: React.ReactNode;
    placeholder?: string;
    className?: string; // For wrapper adjustments
    zIndex?: number; // Explicit control over stacking context
}

export const CompactSelect: React.FC<CompactSelectProps> = ({
    value,
    onChange,
    options,
    icon,
    className = '',
    zIndex = 50 // Default high enough to beat sticky headers (z-30)
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} style={{ zIndex }} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-full bg-[var(--surface-deep)] text-[var(--text-main)] rounded-lg outline-none border border-[var(--border-glass)] px-2 flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-95 ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500/50' : 'hover:bg-[var(--surface-overlay)]'}`}
            >
                {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
                <span className="text-[10px] font-black uppercase tracking-widest truncate min-w-[30px] text-left">
                    {selectedOption ? selectedOption.label : 'Select'}
                </span>
                <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Styled Dropdown Menu */}
            <div
                className={`absolute top-full right-0 mt-2 min-w-[140px] bg-[var(--surface-floating)] border border-[var(--border-glass)] rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-200 origin-top
        ${isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
            >
                <div className="flex flex-col py-1 max-h-48 overflow-y-auto no-scrollbar">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--surface-overlay)] transition-colors group ${value === opt.value ? 'bg-blue-500/10' : ''}`}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                {opt.icon && <span className={`${value === opt.value ? 'text-blue-500' : 'text-[var(--text-muted)]'}`}>{opt.icon}</span>}
                                <span className={`text-[10px] font-black uppercase tracking-widest truncate ${value === opt.value ? 'text-blue-500' : 'text-[var(--text-main)]'}`}>
                                    {opt.label}
                                </span>
                            </div>
                            {value === opt.value && <Check size={12} className="text-blue-500 shrink-0" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
