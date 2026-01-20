import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Database, Sparkles, RefreshCw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { GlassCard } from './GlassCard';

export interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
    tooltip?: string;
}

interface ModernTableProps<T> {
    data: T[];
    columns: Column<T>[];
    title?: string;
    icon?: React.ReactNode;
    pageSize?: number;
    enableSearch?: boolean;
    className?: string;
    emptyMessage?: string;
    accentColor?: 'emerald' | 'cyan' | 'purple' | 'rose' | 'amber';
    zebraStripes?: boolean;
    onRefresh?: () => void;
    expandable?: boolean;
    updateSignal?: boolean;
}

export function ModernTable<T extends Record<string, any>>({
    data,
    columns,
    title,
    icon,
    pageSize = 10,
    enableSearch = true,
    className = "",
    emptyMessage = "No Data Found",
    accentColor = 'emerald',
    zebraStripes = true,
    onRefresh,
    expandable = true,
    updateSignal = false
}: ModernTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    // Enhanced Color mappings with better contrast
    const colorMap = {
        emerald: {
            bg: 'bg-emerald-500/20',
            text: 'text-emerald-300',
            textBright: 'text-emerald-100',
            textPrimary: 'text-emerald-400',
            textMuted: 'text-emerald-500/60',
            border: 'border-emerald-500/30',
            hover: 'hover:border-emerald-400/60',
            focus: 'focus:border-emerald-400/60',
            shadow: 'shadow-emerald-500/30',
            gradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
            rowHover: 'from-emerald-500/15 to-emerald-500/5'
        },
        cyan: {
            bg: 'bg-cyan-500/20',
            text: 'text-cyan-300',
            textBright: 'text-cyan-100',
            textPrimary: 'text-cyan-400',
            textMuted: 'text-cyan-500/60',
            border: 'border-cyan-500/30',
            hover: 'hover:border-cyan-400/60',
            focus: 'focus:border-cyan-400/60',
            shadow: 'shadow-cyan-500/30',
            gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
            rowHover: 'from-cyan-500/15 to-cyan-500/5'
        },
        purple: {
            bg: 'bg-purple-500/20',
            text: 'text-purple-300',
            textBright: 'text-purple-100',
            textPrimary: 'text-purple-400',
            textMuted: 'text-purple-500/60',
            border: 'border-purple-500/30',
            hover: 'hover:border-purple-400/60',
            focus: 'focus:border-purple-400/60',
            shadow: 'shadow-purple-500/30',
            gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
            rowHover: 'from-purple-500/15 to-purple-500/5'
        },
        rose: {
            bg: 'bg-rose-500/20',
            text: 'text-rose-300',
            textBright: 'text-rose-100',
            textPrimary: 'text-rose-400',
            textMuted: 'text-rose-500/60',
            border: 'border-rose-500/30',
            hover: 'hover:border-rose-400/60',
            focus: 'focus:border-rose-400/60',
            shadow: 'shadow-rose-500/30',
            gradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
            rowHover: 'from-rose-500/15 to-rose-500/5'
        },
        amber: {
            bg: 'bg-amber-500/20',
            text: 'text-amber-300',
            textBright: 'text-amber-100',
            textPrimary: 'text-amber-400',
            textMuted: 'text-amber-500/60',
            border: 'border-amber-500/30',
            hover: 'hover:border-amber-400/60',
            focus: 'focus:border-amber-400/60',
            shadow: 'shadow-amber-500/30',
            gradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
            rowHover: 'from-amber-500/15 to-amber-500/5'
        }
    };

    const colors = colorMap[accentColor];

    // 1. Search Logic
    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        const lowerTerm = searchTerm.toLowerCase();
        return data.filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(lowerTerm)
            )
        );
    }, [data, searchTerm]);

    // 2. Sort Logic
    const sortedData = useMemo(() => {
        if (!sortConfig) return filteredData;
        return [...filteredData].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    // 3. Pagination Logic
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return sortedData.slice(startIndex, startIndex + pageSize);
    }, [sortedData, currentPage, pageSize]);

    // Handlers
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const toggleRow = (idx: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(idx)) newExpanded.delete(idx);
        else newExpanded.add(idx);
        setExpandedRows(newExpanded);
    };

    const visibleRangeStart = (currentPage - 1) * pageSize + 1;
    const visibleRangeEnd = Math.min(currentPage * pageSize, sortedData.length);

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {title && (
                    <div className="flex items-center gap-4">
                        <div className={`p-3 ${colors.bg} rounded-2xl ${colors.text} ${colors.border} border-2 shadow-xl ${colors.shadow} relative overflow-hidden group`}>
                            <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-20 group-hover:opacity-100 transition-opacity`} />
                            <div className="relative z-10 scale-110">
                                {icon || <Database size={20} />}
                            </div>
                        </div>
                        <div>
                            <h3 className={`text-2xl font-black ${colors.textBright} tracking-tight flex items-center gap-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]`}>
                                {title}
                                <Sparkles size={20} className={`${colors.text} animate-pulse`} />
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className={`text-[12px] font-black text-zinc-400 uppercase tracking-[0.15em]`}>
                                    System Intelligence: <span className={colors.textBright}>{sortedData.length} Nodes</span>
                                </p>
                                {onRefresh && (
                                    <button
                                        onClick={onRefresh}
                                        className={`p-1 hover:${colors.bg} rounded-md transition-colors ${colors.text}`}
                                        title="Refresh Dataset"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {updateSignal && (
                            <div className={`ml-4 px-3 py-1 rounded-full ${colors.bg} ${colors.text} text-[10px] font-black uppercase tracking-widest border ${colors.border} animate-bounce shadow-lg`}>
                                ✨ New Update Available
                            </div>
                        )}
                    </div>
                )}

                {/* Search Input */}
                {enableSearch && (
                    <div className="relative group w-full lg:w-96">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:${colors.text} transition-colors`} size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            placeholder="Universal search through nodes..."
                            aria-label="Search through table records"
                            className={`w-full bg-black/60 border-2 border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-white placeholder-zinc-500 ${colors.focus} focus:bg-black/80 focus:ring-4 focus:ring-${accentColor}-500/20 outline-none transition-all shadow-2xl`}
                        />
                    </div>
                )}
            </div>

            {/* Table Container */}
            <GlassCard className={`overflow-hidden border-2 ${colors.border} shadow-2xl ${colors.shadow} p-0 bg-black/40 backdrop-blur-3xl relative group rounded-[2.5rem]`}>
                {/* Scroll Indicator (Shadows) */}
                <div className="overflow-x-auto relative z-10 custom-scrollbar max-h-[600px]">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20">
                            <tr className={`bg-black/80 border-b-2 ${colors.border} text-left backdrop-blur-xl shadow-lg`}>
                                {expandable && <th className="px-4 py-6 w-12" />}
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className={`px-6 py-6 text-sm font-black uppercase tracking-[0.2em] text-white ${col.sortable ? `cursor-pointer hover:bg-white/5 transition-all select-none relative group/header` : ''}`}
                                        onClick={() => col.sortable && handleSort(col.key as string)}
                                        style={{ width: col.width }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${colors.text}`}>{col.header}</span>
                                            {col.tooltip && (
                                                <Info size={12} className="text-zinc-500 cursor-help" title={col.tooltip} />
                                            )}
                                            {col.sortable && (
                                                <div className={`${colors.text} opacity-40 group-hover/header:opacity-100 transition-opacity`}>
                                                    {sortConfig?.key === col.key ? (
                                                        sortConfig.direction === 'asc' ? <ArrowUp size={14} className="drop-shadow-lg" /> : <ArrowDown size={14} className="drop-shadow-lg" />
                                                    ) : (
                                                        <ArrowUpDown size={14} />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {col.sortable && <div className={`absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r ${colors.gradient} opacity-0 group-hover/header:opacity-100 transition-opacity`} />}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className={`divide-y-0`}>
                            {paginatedData.length > 0 ? (
                                paginatedData.map((row, rowIdx) => {
                                    const isExpanded = expandedRows.has(rowIdx);
                                    return (
                                        <React.Fragment key={rowIdx}>
                                            <tr
                                                onClick={() => expandable && toggleRow(rowIdx)}
                                                onKeyDown={(e) => {
                                                    if (expandable && (e.key === 'Enter' || e.key === ' ')) {
                                                        e.preventDefault();
                                                        toggleRow(rowIdx);
                                                    }
                                                }}
                                                tabIndex={expandable ? 0 : undefined}
                                                role={expandable ? "button" : undefined}
                                                aria-expanded={isExpanded}
                                                className={`
                                                    ${zebraStripes && rowIdx % 2 !== 0 ? 'bg-white/[0.04]' : 'bg-transparent'}
                                                    hover:bg-gradient-to-r ${colors.gradient} hover:bg-black/60
                                                    transition-all duration-300 group/row border-l-4 border-transparent 
                                                    hover:border-l-8 hover:${colors.border} hover:shadow-2xl cursor-pointer
                                                    border-b border-white/10 relative transition-colors
                                                `}
                                            >
                                                {/* Reflective Top Edge */}
                                                <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-${accentColor}-400/10 to-transparent opacity-50 group-hover/row:opacity-100 transition-opacity`} />
                                                {expandable && (
                                                    <td className="px-4 text-center">
                                                        {isExpanded ? <ChevronUp size={16} className={colors.text} /> : <ChevronDown size={16} className="text-zinc-600" />}
                                                    </td>
                                                )}
                                                {columns.map((col, colIdx) => (
                                                    <td key={colIdx} className={`px-6 py-5 text-[14px] font-bold ${colors.textPrimary} group-hover/row:${colors.textBright} transition-all tracking-wide drop-shadow-sm`}>
                                                        {col.render ? col.render(row) : (
                                                            <span className={String(row[col.key as keyof T]).length > 50 ? `block max-w-[300px] truncate font-mono text-[12px] opacity-80 group-hover/row:opacity-100` : ""}>
                                                                {row[col.key as keyof T]}
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                            {/* Expanded Metadata View */}
                                            {isExpanded && (
                                                <tr className="bg-black/60 border-l-8 border-emerald-500/50">
                                                    <td colSpan={columns.length + (expandable ? 1 : 0)} className="px-12 py-8">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                            {Object.entries(row).map(([k, v]) => (
                                                                <div key={k} className="space-y-1 group/item">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover/item:text-emerald-400 transition-colors">
                                                                        {k.replace(/_/g, ' ')}
                                                                    </p>
                                                                    <p className="text-xs font-mono text-zinc-300 break-all bg-white/5 p-2 rounded border border-white/5">
                                                                        {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={columns.length + (expandable ? 1 : 0)} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-6 bg-white/5 rounded-full animate-pulse">
                                                <Database size={48} className="text-zinc-700" />
                                            </div>
                                            <p className="text-zinc-500 text-sm uppercase font-black tracking-[0.2em]">{emptyMessage}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className={`bg-black/80 border-t-2 ${colors.border} px-8 py-5 flex items-center justify-between backdrop-blur-md`}>
                        <div className="text-[12px] font-black text-zinc-400 uppercase tracking-[0.15em]">
                            Records <span className={`${colors.textBright} font-black drop-shadow-md`}>{visibleRangeStart} - {visibleRangeEnd}</span> of <span className="text-white font-black">{sortedData.length}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                aria-label="Previous Page"
                                className={`p-2.5 rounded-xl border-2 ${colors.border} text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all shadow-lg shadow-black/40`}
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="flex items-center gap-2">
                                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                    let page;
                                    if (totalPages <= 7) page = i + 1;
                                    else if (currentPage <= 4) page = i + 1;
                                    else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                                    else page = currentPage - 3 + i;

                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            aria-label={`Go to page ${page}`}
                                            aria-current={currentPage === page ? 'page' : undefined}
                                            className={`min-w-[36px] h-9 px-3 rounded-xl text-xs font-black tracking-wider transition-all duration-300 ${currentPage === page
                                                ? `${colors.bg} ${colors.text} shadow-xl ${colors.shadow} border-2 ${colors.border} scale-110 drop-shadow-lg`
                                                : 'text-zinc-500 hover:bg-white/10 hover:text-white hover:scale-105'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                aria-label="Next Page"
                                className={`p-2.5 rounded-xl border-2 ${colors.border} text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all shadow-lg shadow-black/40`}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
