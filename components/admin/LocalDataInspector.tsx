import React, { useState, useEffect, useMemo } from 'react';
import { databaseKernel } from '../../services/database';
import { Database, RefreshCw, Landmark, CreditCard, Tag, TrendingDown, TrendingUp, Sparkles, Box, DollarSign } from 'lucide-react';
import { ModernTable, Column } from '../ui/ModernTable';

type TableName = 'currencies' | 'channel_types' | 'categories_global' | 'plan_suggestions';

export const LocalDataInspector: React.FC = () => {
    const [activeTable, setActiveTable] = useState<TableName>('currencies');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<number>(Date.now()); // Force refresh

    const TABLES: TableName[] = ['currencies', 'channel_types', 'categories_global', 'plan_suggestions'];

    const loadData = async () => {
        setLoading(true);
        try {
            console.log(`🔍 [Inspector] Querying local SQLite: ${activeTable}`);
            // Query local SQLite directly
            const result = await databaseKernel.query(activeTable, '1=1');
            setData(result || []);
            setLastRefresh(Date.now());
        } catch (err) {
            console.error(`Failed to load ${activeTable}:`, err);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTable]);

    // Dynamically generate columns based on the first data row
    const columns = useMemo<Column<any>[]>(() => {
        if (data.length === 0) return [];

        // Get visible keys (filtering out some internal IDs if needed, but keeping raw for now)
        const keys = Object.keys(data[0]);

        return keys.map(key => ({
            key,
            header: key.replace(/_/g, ' '),
            sortable: true,
            tooltip: `Field: ${key}`,
            render: (item: any) => {
                const val = item[key];

                // Special Decoration for Categories
                if (activeTable === 'categories_global') {
                    if (key === 'name') {
                        const iconName = item.icon || 'Tag';
                        return (
                            <div className="flex items-center gap-2 group/cat">
                                <div className={`p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover/cat:bg-emerald-500/20 transition-colors shadow-inner`}>
                                    <Tag size={12} />
                                </div>
                                <span className="font-black text-emerald-400 drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]">{String(val)}</span>
                            </div>
                        );
                    }
                    if (key === 'type') {
                        const isExpense = String(val).toLowerCase() === 'expense';
                        return (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter shadow-sm border ${isExpense ? 'bg-rose-500/20 text-rose-300 border-rose-500/20' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/20'
                                }`}>
                                {isExpense ? <TrendingDown size={10} className="inline mr-1" /> : <TrendingUp size={10} className="inline mr-1" />}
                                {String(val)}
                            </span>
                        );
                    }
                }

                // Special Decoration for Currencies
                if (activeTable === 'currencies' && key === 'code') {
                    return (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-emerald-500 text-black px-1.5 py-0.5 rounded-md font-black shadow-lg shadow-emerald-500/20">{String(val)}</span>
                            <span className="text-emerald-300/80 font-mono tracking-tighter">{item.symbol}</span>
                        </div>
                    );
                }

                if (typeof val === 'object') return <span className="font-mono text-[9px] opacity-70 bg-black/40 px-2 py-1 rounded">{JSON.stringify(val)}</span>;
                if (key.includes('created_at') || key.includes('updated_at') || key.includes('timestamp')) {
                    if (!val) return '-';
                    return (
                        <span className="text-zinc-300 flex items-center gap-1">
                            <Box size={10} className="text-zinc-600" />
                            {new Date(val).toLocaleDateString()}
                        </span>
                    );
                }
                return String(val);
            }
        }));
    }, [data]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Database className="text-emerald-400" /> Local Static Inspector
                    </h2>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                        Direct Read-Only Access to SQLite Bundled Tables
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Table Selector */}
            <div className="flex flex-wrap gap-2">
                {TABLES.map(table => (
                    <button
                        key={table}
                        onClick={() => setActiveTable(table)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTable === table
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                            : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        {table.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Modern Table Integration */}
            {loading ? (
                <div className="h-64 flex items-center justify-center border border-white/5 rounded-2xl bg-black/20">
                    <div className="text-emerald-500 animate-pulse font-mono text-xs uppercase tracking-widest font-bold">Reading from Disk...</div>
                </div>
            ) : (
                <ModernTable
                    data={data}
                    columns={columns}
                    enableSearch={true}
                    pageSize={10}
                    accentColor="emerald"
                    zebraStripes={true}
                    expandable={true}
                    onRefresh={loadData}
                    emptyMessage={`No records found in local '${activeTable}' table.`}
                />
            )}
        </div>
    );
};
