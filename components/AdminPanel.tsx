import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../store/FinanceContext';
import { FALLBACK_MODELS, generateEmbedding, getRecentLogs, runAiHealthCheck, getKeyUsageLogs, getFinancialInsights } from '../services/gemini';
import { supabase } from '../services/supabase';
import { GlassCard } from './ui/GlassCard';
import {
    ShieldAlert,
    Terminal,
    Settings as SettingsIcon,
    Database,
    Cpu,
    Cloud,
    Trash2,
    RefreshCcw,
    Code,
    Key,
    Globe,
    Activity,
    ChevronRight,
    ExternalLink,
    Save,
    Lock as LockIcon,
    Zap as ZapIcon,
    Brain,
    Loader2,
    X,
    CheckCircle,
    Info,
    AlertTriangle,
    Clock,
    RefreshCw,
    ArrowDownRight,
    ArrowUpRight,
    BrainCircuit
} from 'lucide-react';
import { memoryService, AIMemory } from '../services/memory';

const AdminPanel: React.FC = () => {
    const { state, settings, updateSettings, transactions, wallets, financialPlans, commitments } = useFinance();
    const [geminiKey, setGeminiKey] = useState(settings.customGeminiKey || '');
    const [isSaved, setIsSaved] = useState(false);
    const [confirmRegen, setConfirmRegen] = useState(false); // New state for 2-step confirmation
    const [diagLog, setDiagLog] = useState<string>(''); // For Diagnostic UI feedback
    const [selectedLogo, setSelectedLogo] = useState<string | undefined>(settings.customLogoUrl);

    // Prepare data for insights (mirroring Dashboard logic)
    const walletsWithBalances = wallets.map(w => ({
        ...w,
        currentBalance: (transactions.filter(t => t.walletId === w.id && t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0)) -
            (transactions.filter(t => t.walletId === w.id && t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0))
    }));

    const [aiLogs, setAiLogs] = useState<string[]>(getRecentLogs());
    const [memories, setMemories] = useState<AIMemory[]>([]);
    const [currentTrial, setCurrentTrial] = useState<{ keyId: string, model: string, status: string } | null>(null);
    const [isHealing, setIsHealing] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const [, forceUpdate] = useState({});

    // Advanced Key Management
    const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
    const [keyLogs, setKeyLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Auto-fetch logs when modal opens
    useEffect(() => {
        if (selectedKeyId) {
            setLoadingLogs(true);
            getKeyUsageLogs(selectedKeyId).then(logs => {
                console.log(`📊 [UI-AUTO] Logs fetched for ${selectedKeyId}:`, logs);
                setKeyLogs(logs);
                setLoadingLogs(false);
            }).catch(err => {
                console.error("❌ [UI-AUTO] Failed to fetch logs:", err);
                setLoadingLogs(false);
            });
        } else {
            setKeyLogs([]);
        }
    }, [selectedKeyId]);


    useEffect(() => {
        if (selectedKeyId) {
            setLoadingLogs(true);
            getKeyUsageLogs(selectedKeyId).then(logs => {
                setKeyLogs(logs);
                setLoadingLogs(false);
            });
        }
    }, [selectedKeyId]);

    useEffect(() => {
        if (state.sync_status.userId) {
            memoryService.recall(state.sync_status.userId).then(setMemories);
        }
    }, [state.sync_status.userId]);

    const handleDeleteMemory = async (id: string) => {
        if (!state.sync_status.userId) return;
        await memoryService.forget(id);
        const updated = await memoryService.recall(state.sync_status.userId);
        setMemories(updated);
    };

    // Use ref to track the actual current value
    const currentLogoRef = useRef<string | undefined>(settings.customLogoUrl);

    // Sync selectedLogo with settings.customLogoUrl when it changes
    useEffect(() => {
        console.log('🔄 Settings changed, customLogoUrl:', settings.customLogoUrl);
        setSelectedLogo(settings.customLogoUrl);
        currentLogoRef.current = settings.customLogoUrl;
    }, [settings.customLogoUrl]);

    // Debug: Log on mount & Listen for updates
    useEffect(() => {
        console.log('🚀 AdminPanel mounted, initial customLogoUrl:', settings.customLogoUrl);
        currentLogoRef.current = settings.customLogoUrl;

        // Listen for AI Preference updates
        // Debug: Log updates
        const handleUpdate = ((e: CustomEvent) => {
            console.log('☁️ Settings updated via event:', e.detail);
        }) as EventListener;

        // Listen for AI Real-time Logs
        const handleAiLog = ((e: CustomEvent) => {
            setAiLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${e.detail.message}`]);
            // Auto scroll
            if (logContainerRef.current) {
                logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
            }
        }) as EventListener;

        // Listen for AI Trial updates (Real-time Scanning)
        const handleAiTrial = ((e: CustomEvent) => {
            if (e.detail.status === 'FINISHED') {
                setCurrentTrial(null);
            } else {
                setCurrentTrial(e.detail);
            }
        }) as EventListener;

        // Listen for real-time Usage Logs (Database sync)
        const handleUsageUpdate = ((e: CustomEvent) => {
            const newLog = e.detail;
            console.log('⚡ Real-time Usage Update:', newLog);
            if (selectedKeyId && newLog.key_id === selectedKeyId) {
                setKeyLogs(prev => [newLog, ...prev]);
            }
        }) as EventListener;

        window.addEventListener('FINOS_SETTINGS_UPDATE', handleUpdate);
        window.addEventListener('FINOS_AI_LOG', handleAiLog);
        window.addEventListener('FINOS_AI_TRIAL', handleAiTrial);
        window.addEventListener('FINOS_AI_USAGE_UPDATE', handleUsageUpdate);

        return () => {
            window.removeEventListener('FINOS_SETTINGS_UPDATE', handleUpdate);
            window.removeEventListener('FINOS_AI_LOG', handleAiLog);
            window.removeEventListener('FINOS_AI_TRIAL', handleAiTrial);
            window.removeEventListener('FINOS_AI_USAGE_UPDATE', handleUsageUpdate);
        };
    }, [selectedKeyId]); // Re-bind when selectedKeyId changes to ensure closure has latest ID

    // Debug Stats
    const stats = {
        totalTransactions: transactions.length,
        totalWallets: wallets.length,
        totalPlans: financialPlans.length,
        totalCommitments: commitments.length,
        dbVersion: 28, // Synced with database.ts migrations
        storageUsage: `${Math.round((JSON.stringify(localStorage).length / 1024)).toFixed(0)}KB`
    };

    const saveAdminSettings = async () => {
        await updateSettings({
            customGeminiKey: geminiKey,
            customAppName: settings.customAppName
        });
        // Also set in localStorage for immediate service update
        if (geminiKey) {
            localStorage.setItem('finos_custom_gemini_key', geminiKey);
        } else {
            localStorage.removeItem('finos_custom_gemini_key');
        }
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleLogoSelect = async (logoPath: string) => {
        console.log('🎨 handleLogoSelect called with:', logoPath);
        console.log('📍 Before update - selectedLogo:', selectedLogo, 'settings.customLogoUrl:', settings.customLogoUrl);

        // Update local state and ref immediately
        setSelectedLogo(logoPath);
        currentLogoRef.current = logoPath;

        // Update global settings
        console.log('⚙️ Calling updateSettings with:', { customLogoUrl: logoPath });
        await updateSettings({ customLogoUrl: logoPath });

        // Force re-render to get fresh settings
        forceUpdate({});

        // Small delay to let state propagate
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('📍 After update - selectedLogo:', selectedLogo, 'currentLogoRef:', currentLogoRef.current, 'settings.customLogoUrl:', settings.customLogoUrl);
        console.log('✅ Logo selection complete');
    };

    const handleLogoReset = async () => {
        console.log('🔄 handleLogoReset called');
        console.log('📍 Before reset - selectedLogo:', selectedLogo, 'settings.customLogoUrl:', settings.customLogoUrl);

        setSelectedLogo(undefined);
        currentLogoRef.current = undefined;

        console.log('⚙️ Calling updateSettings with:', { customLogoUrl: undefined });
        await updateSettings({ customLogoUrl: undefined });

        // Force re-render
        forceUpdate({});

        console.log('✅ Logo reset complete');
    };

    const handleCustomLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('❌ Please select an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('❌ Image size must be less than 2MB');
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            console.log('📤 Uploading custom logo, size:', (base64.length / 1024).toFixed(2), 'KB');
            setSelectedLogo(base64);
            await updateSettings({ customLogoUrl: base64 });
            console.log('✅ Custom logo uploaded and saved');
        };
        reader.readAsDataURL(file);
    };

    const clearAlLCache = () => {
        localStorage.removeItem('finos_ai_insights_cache');
        alert('AI Cache Cleared');
        setAiLogs([]);
    };

    const handleAutoHeal = async () => {
        if (isHealing) return;
        setIsHealing(true);
        const success = await runAiHealthCheck((msg) => {
            setAiLogs(prev => [...prev, `[HEALER] ${msg}`]);
            if (logContainerRef.current) {
                logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
            }
        });
        setIsHealing(false);
        if (success) {
            alert("✅ System Auto-Healed! Champion models activated.");
        } else {
            alert("❌ All models failed across all keys. Please check your API keys.");
        }
    };

    return (
        <div className="space-y-6 pb-12">
            <div className="text-center space-y-2 pt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-full">
                    <ShieldAlert size={14} className="text-rose-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">Root Access</span>
                </div>
                <h1 className="text-2xl font-black tracking-tighter text-[var(--text-main)] transition-colors">
                    SYSTEM OVERRIDE
                </h1>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] transition-colors">
                    Enterprise Governance & Terminal Diagnostics
                </p>
            </div>

            {/* Branding & Identity */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Code size={16} />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">Enterprise Branding</h2>
                </div>
                <GlassCard className="p-5 border-emerald-500/20">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Application Title</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={settings.customAppName || ''}
                                    onChange={(e) => updateSettings({ customAppName: e.target.value })}
                                    placeholder="Enter Custom App Name..."
                                    className="flex-1 bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-main)] focus:border-emerald-500 outline-none transition-all"
                                />
                                <button
                                    onClick={() => alert('Saved Automagically')}
                                    className="px-4 bg-emerald-600 text-white rounded-xl active:scale-95 transition-all"
                                >
                                    <Save size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </section>

            {/* Visual Identity - Logo Selection */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                        <Globe size={16} />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Visual Identity</h2>
                </div>

                <GlassCard className="p-5 border-purple-500/20">
                    <div className="space-y-4">
                        {/* Custom Upload */}
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                                Upload Custom Logo
                            </label>
                            <label className="flex items-center justify-center gap-2 p-4 bg-zinc-900/50 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500/60 transition-all active:scale-95">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCustomLogoUpload}
                                    className="hidden"
                                />
                                <Globe size={18} className="text-purple-500" />
                                <span className="text-xs font-bold text-[var(--text-main)]">
                                    Click to Upload (PNG, JPG, SVG - Max 2MB)
                                </span>
                            </label>
                        </div>

                        {/* Preset Logos */}
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 block">
                                Or Select Preset Logo
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                                    const logoPath = `/logos/ai-logo-${num}.png`;
                                    const isSelected = selectedLogo === logoPath;
                                    return (
                                        <button
                                            key={num}
                                            onClick={() => handleLogoSelect(logoPath)}
                                            className={`relative p-3 rounded-xl border-2 transition-all active:scale-95 ${isSelected
                                                ? 'border-purple-500 bg-purple-500/10'
                                                : 'border-white/10 bg-zinc-900/50 hover:border-purple-500/50'
                                                }`}
                                        >
                                            <img
                                                src={logoPath}
                                                alt={`Logo ${num}`}
                                                className="w-full h-auto"
                                                onError={(e) => {
                                                    console.error('❌ Failed to load logo:', logoPath);
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            {isSelected && (
                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                                    <Activity size={12} className="text-white" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={handleLogoReset}
                                    className="flex-1 py-2.5 bg-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-white border border-white/5 active:scale-95 transition-all"
                                >
                                    Reset to Default
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('📊 Current state:', {
                                            selectedLogo,
                                            'currentLogoRef.current': currentLogoRef.current,
                                            'settings.customLogoUrl': settings.customLogoUrl
                                        });
                                        alert(`Selected (local): ${selectedLogo || 'None'}\nCurrent (ref): ${currentLogoRef.current || 'None'}\nSaved (settings): ${settings.customLogoUrl || 'None'}`);
                                    }}
                                    className="px-4 py-2.5 bg-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-white active:scale-95 transition-all"
                                >
                                    Debug
                                </button>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </section>

            {/* System Diagnostics & Health */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Activity size={16} />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">System Diagnostics</h2>
                </div>

                <GlassCard className="p-5 border-indigo-500/20">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-bold text-[var(--text-main)]">RAG Vector Health</h3>
                                <p className="text-[9px] text-[var(--text-muted)]">Check if categories have valid embeddings</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        setDiagLog("🔍 Running Diagnostic...");
                                        try {
                                            const module = await import('../services/supabase');
                                            if (!module.supabase) throw new Error("Supabase client not found");

                                            const { data, error } = await module.supabase
                                                .from('categories')
                                                .select('name, embedding')
                                                .limit(10);

                                            if (error) throw error;

                                            const logs = data.map(c =>
                                                `${c.name}: ${c.embedding ? `✅ Dims: ${c.embedding.length}` : '❌ No Vector'}`
                                            ).join('\n');

                                            setDiagLog(`Checked ${data.length} categories:\n${logs}`);
                                        } catch (e) {
                                            setDiagLog("❌ Error: " + (e as any).message);
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-500 hover:text-white transition-all"
                                >
                                    Check Health
                                </button>
                                <button
                                    onClick={async () => {
                                        console.log("🔥 Regenerate Index Clicked");
                                        setDiagLog("🔵 Button Clicked. Initializing...");

                                        setDiagLog("🚀 Starting Re-index Process (Auto-Confirmed)...");
                                        try {
                                            // Check Supabase Connection
                                            const { data: cats, error } = await supabase.from('categories').select('id, name');

                                            if (error) throw error;
                                            if (!cats?.length) {
                                                setDiagLog("⚠️ No categories found in database.");
                                                return;
                                            }

                                            setDiagLog(`✅ Found ${cats.length} categories.\n🚀 Starting Batch Processing...`);
                                            let processed = 0;

                                            // Process 3 at a time
                                            for (let i = 0; i < cats.length; i += 3) {
                                                const chunk = cats.slice(i, i + 3);
                                                setDiagLog(`Processing batch ${Math.floor(i / 3) + 1} of ${Math.ceil(cats.length / 3)}... (${processed}/${cats.length})\nTargets: ${chunk.map(c => c.name).join(', ')}`);

                                                await Promise.all(chunk.map(async (c) => {
                                                    console.log("Generating for:", c.name);
                                                    const embedding = await generateEmbedding(c.name);
                                                    if (embedding && embedding.length > 0) {
                                                        await supabase.from('categories').update({ embedding }).eq('id', c.id);
                                                    } else {
                                                        console.warn("Failed embedding for", c.name);
                                                    }
                                                }));
                                                processed += chunk.length;
                                                await new Promise(r => setTimeout(r, 1000)); // Delay
                                            }

                                            setDiagLog(`🎉 COMPLETED! Successfully re-indexed ${processed} categories.`);
                                            alert("✅ Re-indexing Complete!");
                                        } catch (e) {
                                            console.error("Re-index Error:", e);
                                            setDiagLog("❌ Fatal Error: " + (e as any).message);
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    Regenerate Index
                                </button>
                            </div>
                        </div>

                        {/* Live AI Terminal */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Live AI Inference Terminal</label>
                                <button onClick={() => setAiLogs([])} className="text-[8px] text-zinc-500 hover:text-white transition-colors">CLEAR</button>
                            </div>

                            <div
                                ref={logContainerRef}
                                className="h-32 p-3 bg-black/80 rounded-lg border border-white/10 font-mono text-[9px] text-emerald-400 whitespace-pre-wrap overflow-y-auto scrollbar-none"
                            >
                                {aiLogs.length === 0 ? (
                                    <span className="text-zinc-600 italic">Waiting for AI activity... (Ask the Assistant something)</span>
                                ) : (
                                    aiLogs.map((log, i) => (
                                        <div key={i} className="mb-0.5 border-b border-white/5 pb-0.5 last:border-0">{log}</div>
                                    ))
                                )}
                            </div>
                        </div>

                        {diagLog && (
                            <div className="mt-3 p-3 bg-black/50 rounded-lg border border-white/10 font-mono text-[9px] text-zinc-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                <span className="text-indigo-400 font-bold block mb-1">RAG Diagnostics:</span>
                                {diagLog}
                            </div>
                        )}
                    </div>
                </GlassCard>
            </section>

            {/* AI Memory Bank */}
            <section className="mb-6">
                <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Brain size={16} />
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Deep Memory Bank</h2>
                        <span className="text-[9px] font-bold text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full">{memories.length} PATTERNS</span>
                    </div>
                </div>
                <GlassCard className="p-0 overflow-hidden">
                    {memories.length === 0 ? (
                        <div className="text-center py-8 opacity-40 text-xs text-zinc-400 font-medium">
                            <Brain size={24} className="mx-auto mb-2 opacity-50" />
                            No patterns learned yet.<br />Confirm AI suggestions to train.
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                            {memories.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors group">
                                    <div className="min-w-0 flex-1 pr-4">
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider truncate">{m.memory_key.replace('cat_', 'CATEGORY: ').replace('wallet_', 'WALLET: ')}</span>
                                            <span className="text-[9px] font-mono text-zinc-600">{Math.round(m.confidence * 100)}% CONFIDENCE</span>
                                        </div>
                                        <div className="text-xs font-medium text-zinc-300 truncate">{m.memory_value}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteMemory(m.id)}
                                        className="p-2 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>
            </section>

            {/* System States */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                        <Terminal size={16} />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">Global System States</h2>
                </div>
                <div className="space-y-3">
                    <AdminToggle
                        icon={<LockIcon size={16} />}
                        label="Read-Only Mode"
                        sub="Block all database mutations"
                        value={settings.isReadOnly}
                        onToggle={() => updateSettings({ isReadOnly: !settings.isReadOnly })}
                        color="rose"
                    />
                    <AdminToggle
                        icon={<Activity size={16} />}
                        label="Maintenance Mode"
                        sub="Show maintenance overlay to users"
                        value={settings.maintenanceMode}
                        onToggle={() => updateSettings({ maintenanceMode: !settings.maintenanceMode })}
                        color="amber"
                    />
                    <AdminToggle
                        icon={<ZapIcon size={16} />}
                        label="Performance Glass"
                        sub="Disable heavy blur effects"
                        value={!settings.glassEffectsEnabled}
                        onToggle={() => updateSettings({ glassEffectsEnabled: !settings.glassEffectsEnabled })}
                        color="blue"
                    />
                </div>
            </section>

            {/* System Stats Dashboard */}
            {/* System Stats Dashboard */}
            <section className="grid grid-cols-2 gap-3">
                {
                    [
                        { label: 'DB Version', value: `v${stats.dbVersion}`, icon: <Database size={14} />, color: 'blue' },
                        { label: 'Ledger Entries', value: stats.totalTransactions, icon: <Activity size={14} />, color: 'emerald' },
                        { label: 'LS Payload', value: stats.storageUsage, icon: <Terminal size={14} />, color: 'amber' },
                        { label: 'System Nodes', value: stats.totalWallets + stats.totalPlans, icon: <Code size={14} />, color: 'purple' }
                    ].map((stat, i) => (
                        <GlassCard key={i} className="p-3 border-rose-500/10">
                            <div className={`text-${stat.color}-500 mb-1`}>{stat.icon}</div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">{stat.label}</p>
                            <p className="text-sm font-bold text-[var(--text-main)] mt-0.5">{stat.value}</p>
                        </GlassCard>
                    ))
                }
            </section>

            {/* API Configuration */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                        <Cpu size={16} />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">AI Intelligence Override</h2>
                </div>

                <GlassCard className="p-5 border-rose-500/20">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                                <Key size={12} /> Managed API Keys
                            </label>
                            <span className="text-[8px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full uppercase tracking-tighter">
                                {settings.geminiKeys?.length || 0} Slots Active
                            </span>
                        </div>

                        {/* Keys List */}
                        <div className="space-y-3">
                            {(settings.geminiKeys || []).map((keyConfig, idx) => {
                                const isActive = state.activeGeminiKeyId
                                    ? state.activeGeminiKeyId === keyConfig.id
                                    : (settings.preferredGeminiKeyID ? settings.preferredGeminiKeyID === keyConfig.id : idx === 0);
                                const isChampion = settings.preferredGeminiKeyID === keyConfig.id;
                                const isScanning = currentTrial?.keyId === keyConfig.id;
                                return (
                                    <div
                                        key={keyConfig.id}
                                        onClick={() => setSelectedKeyId(keyConfig.id)}
                                        className={`group relative flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer ${isActive
                                            ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/50'
                                            : 'bg-zinc-900/50 border-white/5 hover:border-rose-500/30'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${keyConfig.status === 'LIMITED' ? 'bg-amber-500' :
                                                (currentTrial?.keyId === keyConfig.id ? 'bg-blue-400 animate-pulse' :
                                                    (isActive ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-emerald-500')
                                                )} ${isActive ? 'animate-pulse' : ''}`} />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-[10px] font-black leading-none ${isChampion ? 'text-rose-400' : 'text-white'}`}>{keyConfig.label}</p>
                                                    {isChampion && (
                                                        <span className="text-[8px] font-black uppercase bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-sm shadow-rose-500/30">
                                                            CHAMPION KEY
                                                        </span>
                                                    )}
                                                    {isScanning && (
                                                        <span className="text-[8px] font-bold uppercase bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 animate-pulse">
                                                            SCANNING...
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] font-mono text-zinc-500 mt-1">••••{keyConfig.key.slice(-4)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {keyConfig.status === 'LIMITED' && (
                                                <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[8px] font-black text-rose-500 uppercase tracking-wider animate-pulse">
                                                    Rate Limited (0 Quota)
                                                </span>
                                            )}
                                            <button
                                                onClick={() => {
                                                    const newKeys = (settings.geminiKeys || []).filter(k => k.id !== keyConfig.id);
                                                    updateSettings({ geminiKeys: newKeys });
                                                }}
                                                className="p-2 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {(!settings.geminiKeys || settings.geminiKeys.length === 0) && (
                                <div className="text-center py-6 border-2 border-dashed border-white/5 rounded-xl">
                                    <p className="text-[10px] font-bold text-zinc-600 uppercase">No active nodes detected</p>
                                </div>
                            )}
                        </div>

                        {/* Add New Key */}
                        <div className="pt-4 border-t border-white/5 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    id="new-key-label"
                                    type="text"
                                    placeholder="Label (e.g. Primary)"
                                    className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-white outline-none focus:border-rose-500/50 transition-all"
                                />
                                <input
                                    id="new-key-value"
                                    type="password"
                                    placeholder="Gemini API Key..."
                                    className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-white outline-none focus:border-rose-500/50 transition-all"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    const labelInput = document.getElementById('new-key-label') as HTMLInputElement;
                                    const keyInput = document.getElementById('new-key-value') as HTMLInputElement;

                                    if (!keyInput.value) {
                                        alert("Please enter an API Key");
                                        return;
                                    }

                                    const newKey = {
                                        id: Date.now().toString(),
                                        key: keyInput.value,
                                        label: labelInput.value || `Key ${(settings.geminiKeys?.length || 0) + 1}`,
                                        status: 'ACTIVE' as const
                                    };

                                    const newKeys = [...(settings.geminiKeys || []), newKey];
                                    updateSettings({ geminiKeys: newKeys });

                                    labelInput.value = '';
                                    keyInput.value = '';
                                }}
                                className="w-full h-12 bg-gradient-to-r from-rose-600 to-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"
                            >
                                Integrate New Intelligence Node
                            </button>

                            <button
                                onClick={handleAutoHeal}
                                disabled={isHealing}
                                className={`w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isHealing
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 border border-indigo-500/30'
                                    }`}
                            >
                                {isHealing ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Sequential Auto-Healing In Progress...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <ZapIcon size={16} />
                                        <span>Auto-Heal AI Nodes</span>
                                    </div>
                                )}
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={clearAlLCache}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-white border border-white/5 active:scale-95 transition-all"
                            >
                                <RefreshCcw size={14} /> Clear AI Cache
                            </button>
                            <button
                                onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-black active:scale-95 transition-all"
                            >
                                <ExternalLink size={14} /> Get API Keys
                            </button>
                        </div>

                        {/* Model Strategy Visualization */}
                        <div className="pt-4 border-t border-white/5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 block">
                                Active Model Failover Strategy (2026)
                            </label>
                            <div className="space-y-2">
                                <div className="space-y-2">
                                    {FALLBACK_MODELS.map((model, idx) => {
                                        const isPreferred = settings.preferredGeminiModel === model;
                                        const isScanning = currentTrial?.model === model;
                                        // If no preference yet, default first one is visually highlighted as primary
                                        const isPrimary = isPreferred || (!settings.preferredGeminiModel && idx === 0);

                                        return (
                                            <div key={model} className={`flex items-center justify-between p-2 rounded-lg border transition-all ${isPrimary
                                                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                                                : (isScanning ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-900/50 border-white/5')}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold ${isPrimary ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-[10px] font-bold ${isPrimary ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                                                {model}
                                                            </p>
                                                            {isPrimary && (
                                                                <span className="text-[8px] font-black uppercase bg-emerald-500 text-black px-1.5 py-0.5 rounded shadow-sm shadow-emerald-500/30">
                                                                    CHAMPION
                                                                </span>
                                                            )}
                                                            {currentTrial?.model === model && (
                                                                <span className="text-[8px] font-bold uppercase bg-blue-500 text-white px-1.5 py-0.5 rounded animate-pulse">
                                                                    WAITING RESPONSE...
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[8px] text-[var(--text-muted)]">
                                                            {isPrimary ? 'Currently Active Intelligence Layer' : 'Standby Failover Layer'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isPrimary && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </section >

            {/* Cloud Governance */}
            < section >
                <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                        <Cloud size={16} />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Cloud & Environment</h2>
                </div>

                <GlassCard className="p-4 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-zinc-500/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <Globe size={18} className="text-sky-500" />
                            <div>
                                <p className="text-xs font-bold text-[var(--text-main)]">Production Supabase</p>
                                <p className="text-[9px] text-[var(--text-muted)] font-mono">https://liwnjbvintygnvhgbguw.supabase.co</p>
                            </div>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    <button
                        onClick={() => updateSettings({ isAdminEnabled: false })}
                        className="w-full py-4 text-center text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] bg-rose-500/5 rounded-2xl border border-rose-500/10 active:scale-95 transition-all"
                    >
                        Disable Admin Mode (Lock Terminal)
                    </button>
                </GlassCard>
            </section >

            {/* AI Utilities */}
            < section className="pt-4" >
                <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-3 px-1">AI Neural Tools</p>
                <div className="space-y-2">
                    <button
                        onClick={() => {
                            if (confirmRegen) {
                                console.log("🚀 [AdminPanel] Force-Refresing Insights via Direct Call");
                                setConfirmRegen(false);

                                // Direct Call to Service (Bypasses Dashboard mount requirement)
                                getFinancialInsights(transactions, walletsWithBalances, true)
                                    .then(newInsights => {
                                        console.log("✅ [AdminPanel] Insights Refreshed:", newInsights.length);
                                        alert(`Insights regenerated! (${newInsights.length} suggestions)`);
                                    })
                                    .catch(err => {
                                        console.error("❌ [AdminPanel] Refresh Failed:", err);
                                        alert("Failed to regenerate insights. Check console.");
                                    });

                            } else {
                                console.log("⚠️ [AdminPanel] Arming regeneration confirmation");
                                setConfirmRegen(true);
                                setTimeout(() => setConfirmRegen(false), 4000); // Reset after 4s
                            }
                        }}
                        className={`w-full flex items-center justify-between p-4 border rounded-2xl active:scale-[0.98] transition-all group ${confirmRegen
                            ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            : "bg-gradient-to-br from-violet-600/20 to-indigo-900/40 border-violet-500/30 hover:border-violet-400/50 shadow-[0_4px_12px_rgba(124,58,237,0.1)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.2)]"
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ring-1 transition-colors ${confirmRegen
                                ? "bg-amber-500/20 text-amber-500 ring-amber-500/30 animate-pulse"
                                : "bg-violet-500/20 text-violet-300 ring-violet-500/30 group-hover:bg-violet-500/30"
                                }`}>
                                <BrainCircuit size={20} className={confirmRegen ? "" : "group-hover:rotate-180 transition-transform duration-700"} />
                            </div>
                            <div className="text-left">
                                <p className={`text-[11px] font-black uppercase tracking-widest transition-colors ${confirmRegen ? "text-amber-400" : "text-violet-100 group-hover:text-white"}`}>
                                    {confirmRegen ? "Confirm Regeneration?" : "Regenerate Insights"}
                                </p>
                                <p className={`text-[9px] font-mono transition-colors ${confirmRegen ? "text-amber-500/80" : "text-violet-300/70 group-hover:text-violet-200"}`}>
                                    {confirmRegen ? "Click again to consume tokens" : "Force refresh dashboard intelligence"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!confirmRegen && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
                            <ChevronRight size={16} className={`transition-transform ${confirmRegen ? "text-amber-500 rotate-90" : "text-violet-500 group-hover:translate-x-1"}`} />
                        </div>
                    </button>
                </div>
            </section>

            {/* Danger Zone */}
            < section className="pt-4" >
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-3 px-1">Danger Zone</p>
                <div className="space-y-2">
                    <button
                        className="w-full flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 active:scale-95 transition-all"
                        onClick={() => {
                            if (confirm("DANGER: This will wipe all local data. Continue?")) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <Trash2 size={18} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Hard Reset Wipe</p>
                        </div>
                        <ChevronRight size={14} />
                    </button>
                </div>
            </section >

            {/* API Key Details Modal */}
            {
                selectedKeyId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedKeyId(null)}>
                        <GlassCard className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border-rose-500/20 shadow-2xl shadow-rose-900/40" onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 text-white shadow-lg shadow-rose-900/20 ring-1 ring-white/10">
                                        <Key size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-wide uppercase">API Key Intelligence</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                            <p className="text-[10px] font-mono tracking-wider shadow-black drop-shadow-sm">
                                                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400">ID:</span> <span className="text-zinc-300">{selectedKeyId}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={async () => {
                                            console.log('🖱️ [UI] Refresh button clicked');
                                            try {
                                                setLoadingLogs(true);
                                                const logs = await getKeyUsageLogs(selectedKeyId);
                                                console.log(`📊 [UI-DEBUG] Logs fetched for ${selectedKeyId}:`, logs);
                                                setKeyLogs(logs);
                                            } catch (err) {
                                                console.error("❌ [UI] Failed to refresh logs:", err);
                                            } finally {
                                                setLoadingLogs(false);
                                            }
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
                                        title="Refresh Logs"
                                    >
                                        <RefreshCw size={14} className={loadingLogs ? "animate-spin" : ""} />
                                    </button>
                                    <button onClick={() => setSelectedKeyId(null)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 backdrop-blur-md">
                                {[
                                    { label: 'Total Requests', value: keyLogs.length, icon: <Activity size={12} />, color: 'blue', bg: 'from-blue-500/10 to-blue-900/5' },
                                    { label: 'Success Rate', value: keyLogs.length ? `${Math.round((keyLogs.filter(l => l.status === 'SUCCESS').length / keyLogs.length) * 100)}%` : 'N/A', icon: <CheckCircle size={12} />, color: 'rose', bg: 'from-rose-500/10 to-rose-900/5' },
                                    { label: 'Total Usage', value: keyLogs.reduce((a, b) => a + (b.total_tokens || 0), 0).toLocaleString(), icon: <Database size={12} />, color: 'emerald', bg: 'from-emerald-500/10 to-emerald-900/5' },
                                    { label: 'Total Input', value: keyLogs.reduce((a, b) => a + (b.input_tokens || 0), 0).toLocaleString(), icon: <ArrowDownRight size={12} />, color: 'cyan', bg: 'from-cyan-500/10 to-cyan-900/5' },
                                    { label: 'Total Output', value: keyLogs.reduce((a, b) => a + (b.output_tokens || 0), 0).toLocaleString(), icon: <ArrowUpRight size={12} />, color: 'purple', bg: 'from-purple-500/10 to-purple-900/5' },
                                    { label: 'InOut Traffic', value: keyLogs.reduce((a, b) => a + ((b.input_tokens || 0) + (b.output_tokens || 0)), 0).toLocaleString(), icon: <ZapIcon size={12} />, color: 'amber', bg: 'from-amber-500/10 to-amber-900/5' },
                                ].map((s, i) => (
                                    <div key={i} className={`p-3 flex items-center gap-3 bg-gradient-to-br ${s.bg} border border-white/5`}>
                                        <div className={`p-2 rounded-lg bg-${s.color}-500/20 text-${s.color}-400 shadow-[0_0_10px_rgba(0,0,0,0.2)]`}>{s.icon}</div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest mb-0.5">{s.label}</p>
                                            <p className="text-sm font-bold text-white tracking-tight tabular-nums">{s.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Controls */}
                            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-zinc-900/30">
                                <div className="flex items-center gap-2">
                                    {settings.preferredGeminiKeyID === selectedKeyId ? (
                                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                            <CheckCircle size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wide">Primary Key Active</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => updateSettings({ preferredGeminiKeyID: selectedKeyId })}
                                            className="flex items-center gap-2 text-zinc-300 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 hover:border-amber-500/30 transition-all group"
                                        >
                                            <ZapIcon size={14} className="text-zinc-500 group-hover:text-amber-400 transition-colors" />
                                            <span className="text-[10px] font-bold uppercase tracking-wide group-hover:text-white transition-colors">Make Primary</span>
                                        </button>
                                    )}
                                </div>

                                {/* Quota Warning */}
                                {keyLogs.some(l => l.status !== 'SUCCESS') && (
                                    <div className="flex items-center gap-2 text-rose-400 text-[10px] font-bold bg-rose-500/10 px-3 py-1 rounded-lg animate-pulse border border-rose-500/20">
                                        <AlertTriangle size={12} /> Errors Detected
                                    </div>
                                )}
                            </div>

                            {/* Logs Table */}
                            <div className="flex-1 overflow-y-auto p-0 min-h-[300px] bg-black/40">
                                {loadingLogs ? (
                                    <div className="p-12 text-center text-zinc-500 text-xs font-mono flex flex-col items-center justify-center gap-3">
                                        <Loader2 size={24} className="animate-spin text-emerald-500" />
                                        <span className="text-zinc-400">Fetching telemetry data...</span>
                                    </div>
                                ) : keyLogs.length === 0 ? (
                                    <div className="p-12 text-center text-zinc-600 text-xs font-mono">No telemetry data available for this node.</div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="border-b border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-lg">
                                                <th className="py-3 px-4 text-left text-[9px] font-black uppercase tracking-widest text-zinc-500">Time</th>
                                                <th className="py-3 px-4 text-left text-[9px] font-black uppercase tracking-widest text-zinc-500">Activity</th>
                                                <th className="py-3 px-4 text-left text-[9px] font-black uppercase tracking-widest text-zinc-500">Model</th>
                                                <th className="py-3 px-4 text-right text-[9px] font-black uppercase tracking-widest text-zinc-500">In</th>
                                                <th className="py-3 px-4 text-right text-[9px] font-black uppercase tracking-widest text-zinc-500">Out</th>
                                                <th className="py-3 px-4 text-right text-[9px] font-black uppercase tracking-widest text-emerald-500/80">Total</th>
                                                <th className="py-3 px-4 text-right text-[9px] font-black uppercase tracking-widest text-zinc-500">State</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {keyLogs.map((log) => (
                                                <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="p-3 text-[10px] font-medium text-white/80 tabular-nums whitespace-nowrap">
                                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </td>
                                                    <td className="p-3 text-[10px] font-bold text-white truncate max-w-[120px]">{log.activity_type}</td>
                                                    <td className="p-3 text-[9px] font-mono text-blue-200 shadow-teal-900/40">{log.model.replace('models/', '').replace('gemini-', '')}</td>
                                                    <td className="p-3 text-[10px] text-right font-mono text-zinc-400 tabular-nums">{log.input_tokens}</td>
                                                    <td className="p-3 text-[10px] text-right font-mono text-zinc-400 tabular-nums">{log.output_tokens}</td>
                                                    <td className="p-3 text-[10px] text-right font-mono font-bold text-emerald-400 tabular-nums">{log.total_tokens}</td>
                                                    <td className="p-3 text-right">
                                                        {log.status === 'SUCCESS' ? (
                                                            <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded shadow-sm shadow-emerald-900/20">OK</span>
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded shadow-sm shadow-rose-900/20">ERR</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </GlassCard>
                    </div >
                )
            }

        </div >
    );
};

const AdminToggle: React.FC<{ icon: any, label: string, sub: string, value: boolean | undefined, onToggle: () => void, color: string }> = ({ icon, label, sub, value, onToggle, color }) => (
    <GlassCard
        onClick={onToggle}
        className={`p-4 border-white/5 cursor-pointer active:scale-[0.98] transition-all ${value ? `border-${color}-500/30 bg-${color}-500/5` : ''}`}
    >
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl bg-zinc-900 text-${value ? color : 'zinc'}-500 shadow-inner`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-bold text-[var(--text-main)] italic">{label}</p>
                    <p className="text-[9px] font-medium text-[var(--text-muted)]">{sub}</p>
                </div>
            </div>
            <div className={`w-10 h-5 rounded-full p-0.5 transition-all ${value ? `bg-${color}-500` : 'bg-zinc-800'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-all ${value ? 'translate-x-5' : ''} shadow-md`} />
            </div>
        </div>
    </GlassCard>
);

export default AdminPanel;
