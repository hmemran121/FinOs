import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface DropdownOption {
    value: string;
    label: React.ReactNode;
    subtitle?: string;
    icon?: React.ReactNode;
    color?: string; // For visual indication like dots or borders
}

interface CustomDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
    label?: string; // Optional top label like in WalletForm
    icon?: React.ReactNode;
    className?: string;
    required?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    label,
    icon,
    className = '',
    required = false
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

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`space-y-2 ${className}`} ref={dropdownRef}>
            {label && (
                <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest pl-1">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] hover:border-blue-500/30 rounded-2xl px-4 py-4 flex items-center justify-between transition-all shadow-sm active:scale-[0.99] group"
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        {selectedOption ? (
                            <>
                                {selectedOption.icon && (
                                    <div className="p-2 rounded-lg bg-[var(--surface-deep)] text-[var(--text-main)]" style={{ backgroundColor: selectedOption.color ? `${selectedOption.color}20` : undefined, color: selectedOption.color }}>
                                        {selectedOption.icon}
                                    </div>
                                )}
                                {!selectedOption.icon && icon && (
                                    <div className="text-[var(--text-muted)] group-hover:text-blue-500 transition-colors">
                                        {icon}
                                    </div>
                                )}
                                <div className="text-left truncate">
                                    <p className="text-sm font-bold text-[var(--text-main)] truncate">
                                        {selectedOption.label}
                                    </p>
                                    {selectedOption.subtitle && (
                                        <p className="text-[10px] text-[var(--text-muted)] font-medium truncate">
                                            {selectedOption.subtitle}
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                {icon && <div className="text-[var(--text-muted)]">{icon}</div>}
                                <span className="text-sm font-bold text-[var(--text-muted)]">{placeholder}</span>
                            </>
                        )}
                    </div>
                    <ChevronDown size={18} className={`text-[var(--text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <div
                    className={`absolute top-full left-0 right-0 mt-2 bg-gradient-to-b from-[var(--surface-overlay)] to-[var(--surface-deep)] rounded-2xl shadow-xl border border-[var(--border-glass)] overflow-hidden z-50 transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) origin-top max-h-56 overflow-y-auto ${isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
                >
                    <div className="flex flex-col">
                        {/* Mobile/Touch friendly items */}
                        {options.map((opt, idx) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--surface-deep)] transition-colors ${idx !== options.length - 1 ? 'border-b border-[var(--border-glass)]' : ''}`}
                            >
                                {opt.icon && (
                                    <div className="p-2 rounded-lg shadow-sm bg-[var(--surface-deep)]" style={{ backgroundColor: opt.color ? `${opt.color}` : undefined }}>
                                        {/* Clone icon to enforce style */}
                                        {React.isValidElement(opt.icon) ? React.cloneElement(opt.icon as React.ReactElement<any>, { className: opt.color ? 'text-white' : 'text-[var(--text-main)]', size: 16 }) : opt.icon}
                                    </div>
                                )}
                                <div className="text-left flex-1 min-w-0">
                                    <p className="text-sm font-bold text-[var(--text-main)] truncate">{opt.label}</p>
                                    {opt.subtitle && <p className="text-[10px] text-[var(--text-muted)] truncate">{opt.subtitle}</p>}
                                </div>
                                {value === opt.value && <Check size={16} className="ml-auto text-blue-500 shrink-0" />}
                            </button>
                        ))}
                        {options.length === 0 && (
                            <div className="p-4 text-center text-xs text-[var(--text-muted)] font-medium italic">
                                No options available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
