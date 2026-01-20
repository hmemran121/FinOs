import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../store/FinanceContext';
import { useFeedback } from '../store/FeedbackContext';
import { FALLBACK_MODELS, generateEmbedding, getRecentLogs, runAiHealthCheck, getKeyUsageLogs, getFinancialInsights } from '../services/gemini';
import { supabase } from '../services/supabase';
import { offlineSyncService } from '../services/offlineSync';
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
    BrainCircuit,
    Users,
    Layers,
    Sparkles
} from 'lucide-react';
import { memoryService, AIMemory } from '../services/memory';
import { ConfirmModal } from './ConfirmModal';
import { UserList } from './admin/UserList';
import { UserDetailView } from './admin/UserDetailView';
import { LocalDataInspector } from './admin/LocalDataInspector';
import { ModernTable } from './ui/ModernTable';


// Helper function to extract keys array from globalGeminiKeys (handles both formats)
const getKeysArray = (globalGeminiKeys: any): any[] => {
    if (!globalGeminiKeys) return [];
    if (Array.isArray(globalGeminiKeys)) return globalGeminiKeys;
    if (globalGeminiKeys.keys && Array.isArray(globalGeminiKeys.keys)) return globalGeminiKeys.keys;
    return [];
};

const AdminPanel: React.FC = () => {
    const { state, settings, updateSettings, transactions, wallets, financialPlans, commitments } = useFinance();
    const { showFeedback } = useFeedback();
    const [geminiKey, setGeminiKey] = useState(settings.customGeminiKey || '');
    const [isSaved, setIsSaved] = useState(false);
    const [confirmRegen, setConfirmRegen] = useState(false); // New state for 2-step confirmation
    const [diagLog, setDiagLog] = useState<string>(''); // For Diagnostic UI feedback
    const [selectedLogo, setSelectedLogo] = useState<string | undefined>(settings.customLogoUrl);
    const [isRepairing, setIsRepairing] = useState(false);
    const [isConfigSyncing, setIsConfigSyncing] = useState(false);
    const [showRepairConfirm, setShowRepairConfirm] = useState(false);
    const [adminView, setAdminView] = useState<'SYSTEM' | 'USERS'>('SYSTEM');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkJsonInput, setBulkJsonInput] = useState('');
    const [bulkImportError, setBulkImportError] = useState<string | null>(null);

    const handleBulkImport = async () => {
        try {
            setBulkImportError(null);
            const parsed = JSON.parse(bulkJsonInput);

            if (!Array.isArray(parsed)) {
                throw new Error('Input must be a JSON array of key objects.');
            }

            const currentKeys = getKeysArray(state.globalGeminiKeys);
            const importedKeys = parsed.map((item: any) => {
                if (!item.key) throw new Error('Each object must have a "key" property.');
                return {
                    id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    key: item.key,
                    label: item.label || `Node ${currentKeys.length + Math.random().toString(36).substr(2, 3)}`,
                    status: item.status || 'ACTIVE'
                };
            });

            // Merge keys
            const mergedKeys = [...currentKeys];
            let addedCount = 0;

            importedKeys.forEach(newK => {
                const exists = mergedKeys.find(k => k.key === newK.key);
                if (!exists) {
                    mergedKeys.push(newK);
                    addedCount++;
                }
            });

            if (addedCount === 0) {
                showFeedback("No new keys were added (duplicates detected).", 'info');
            } else {
                await updateSettings({ geminiKeys: mergedKeys } as any);
                showFeedback(`Successfully added ${addedCount} new nodes!`, 'success');
                setIsBulkModalOpen(false);
                setBulkJsonInput('');
            }
        } catch (e: any) {
            setBulkImportError(e.message || 'Invalid JSON format');
        }
    };

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

    // RBAC Protection: Super Admin Only
    if (!state.profile?.isSuperAdmin) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-[var(--bg-color)]">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 animate-pulse">
                    <ShieldAlert size={40} className="text-rose-500" />
                </div>
                <h2 className="text-xl font-black text-[var(--text-main)] mb-2 uppercase tracking-titest">Access Denied</h2>
                <p className="text-[var(--text-muted)] text-sm max-w-xs leading-relaxed mb-6 font-medium">
                    This restricted terminal requires <span className="text-rose-500 font-bold">SUPER_ADMIN</span> clearance.
                </p>
                <div className="text-[10px] font-mono text-[var(--text-muted)] opacity-50">
                    ID: {state.profile?.id || 'UNKNOWN'} <br />
                    ROLE: {state.profile?.role || 'GUEST'}
                </div>
            </div>
        );
    }

    // Handler for Global Data Repair
    const handleGlobalRepair = async () => {
        try {
            setIsRepairing(true);
            console.log("🛠️ [Admin] Initiating Global Data Repair...");
            await offlineSyncService.sync({ forcePull: true });
            console.log('✅ [Admin] Global Data Repair completed successfully');
            showFeedback('Global Data Repair completed successfully', 'success');
        } catch (e: any) {
            console.error("❌ [Admin] Global Repair Failed:", e);
            showFeedback(`Repair failed: ${e.message || 'Check console'}`, 'error');
        } finally {
            setIsRepairing(false);
        }
    };

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
            showFeedback('❌ Please select an image file', 'error');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            showFeedback('❌ Image size must be less than 2MB', 'error');
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
        showFeedback('AI Cache Cleared', 'success');
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
            showFeedback("✅ System Auto-Healed! Champion models activated.", 'success');
        } else {
            showFeedback("❌ All models failed across all keys. Please check your API keys.", 'error');
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

            {/* Admin Navigation */}
            <div className="flex items-center justify-center p-1 bg-white/5 border border-white/10 rounded-2xl mx-auto w-fit mb-4">
                <button
                    onClick={() => setAdminView('SYSTEM')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminView === 'SYSTEM'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-zinc-500 hover:text-white'
                        }`}
                >
                    <SettingsIcon size={14} />
                    Configuration
                </button>
                <button
                    onClick={() => {
                        setAdminView('USERS');
                        setSelectedUserId(null);
                    }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminView === 'USERS'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-zinc-500 hover:text-white'
                        }`}
                >
                    <Users size={14} />
                    User Registry
                </button>
            </div>

            {adminView === 'USERS' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {selectedUserId ? (
                        <UserDetailView
                            userId={selectedUserId}
                            onBack={() => setSelectedUserId(null)}
                        />
                    ) : (
                        <UserList onSelectUser={setSelectedUserId} />
                    )}
                </div>
            ) : (
                <>
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
                                            onClick={() => showFeedback('Saved Automagically', 'success')}
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
                                                showFeedback(`Selected (local): ${selectedLogo || 'None'} / Current (ref): ${currentLogoRef.current || 'None'} / Saved (settings): ${settings.customLogoUrl || 'None'}`, 'info');
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
                                                    showFeedback("✅ Re-indexing Complete!", 'success');
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

                    {/* Local Static Data Inspector */}
                    <section className="mb-6">
                        <LocalDataInspector />
                    </section>

                    {/* API Configuration */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                                <Cpu size={16} />
                            </div>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">Global Intelligence Governance</h2>
                        </div>

                        <GlassCard className="p-5 border-rose-500/20">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                                        <Key size={12} /> Managed API Keys
                                    </label>
                                    <span className="text-[8px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full uppercase tracking-tighter">
                                        {getKeysArray(state.globalGeminiKeys).length} Slots Active
                                    </span>
                                </div>

                                {/* Keys List (Modern Table) */}
                                <div className="space-y-3">
                                    <ModernTable
                                        data={getKeysArray(state.globalGeminiKeys)}
                                        enableSearch={true}
                                        pageSize={5}
                                        accentColor="rose"
                                        zebraStripes={true}
                                        expandable={true}
                                        emptyMessage="No AI Nodes Configured"
                                        columns={[
                                            {
                                                key: 'label',
                                                header: 'NODE LABEL',
                                                sortable: true,
                                                tooltip: 'Human-readable identifier for this AI Node',
                                                render: (item) => {
                                                    const isActive = state.activeGeminiKeyId === item.id;
                                                    const isChampion = settings.preferredGeminiKeyID === item.id;
                                                    return (
                                                        <div className={`flex items-center gap-3 p-1 rounded-xl transition-all ${isChampion ? 'bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : ''}`}>
                                                            <div className={`w-3 h-3 rounded-full shadow-lg ${isActive ? 'bg-rose-500 animate-pulse shadow-rose-500/50' : 'bg-zinc-700 shadow-black'}`} />
                                                            <span className={`font-black tracking-tight ${isChampion ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'text-rose-300'}`}>
                                                                {item.label}
                                                            </span>
                                                            {isChampion && (
                                                                <span className="flex items-center gap-1 text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                                                                    <Sparkles size={8} /> CHAMPION
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                            },
                                            {
                                                key: 'priority',
                                                header: 'PRIORITY',
                                                sortable: true,
                                                width: '100px',
                                                tooltip: 'Routing priority (Lower is Higher)',
                                                render: (item) => (
                                                    <div className="flex justify-center">
                                                        <span className="w-8 h-8 rounded-full bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center text-[11px] font-black text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.1)] transition-transform group-hover/row:scale-110">
                                                            {item.priority || 1}
                                                        </span>
                                                    </div>
                                                )
                                            },
                                            {
                                                key: 'status',
                                                header: 'HEALTH',
                                                sortable: true,
                                                tooltip: 'Real-time node availability status',
                                                render: (item) => {
                                                    const isLimited = item.status === 'LIMITED';
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${isLimited ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${isLimited
                                                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                }`}>
                                                                {item.status || 'OPTIMAL'}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                            },
                                            {
                                                key: 'actions',
                                                header: 'GOVERNANCE',
                                                width: '120px',
                                                render: (item) => (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedKeyId(item.id); }}
                                                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl border border-blue-500/20 transition-all shadow-lg"
                                                            title="Inspect AI Telemetry"
                                                        >
                                                            <Activity size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newKeys = getKeysArray(state.globalGeminiKeys).filter(k => k.id !== item.id);
                                                                updateSettings({ geminiKeys: newKeys } as any);
                                                            }}
                                                            className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl border border-rose-500/20 transition-all shadow-lg"
                                                            title="Decommission Node"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )
                                            }
                                        ]}
                                    />
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
                                                showFeedback("Please enter an API Key", 'error');
                                                return;
                                            }

                                            const newKey = {
                                                id: Date.now().toString(),
                                                key: keyInput.value,
                                                label: labelInput.value || `Key ${getKeysArray(state.globalGeminiKeys).length + 1}`,
                                                status: 'ACTIVE' as const
                                            };

                                            const newKeys = [...getKeysArray(state.globalGeminiKeys), newKey];
                                            updateSettings({ geminiKeys: newKeys } as any);

                                            labelInput.value = '';
                                            keyInput.value = '';
                                        }}
                                        className="w-full h-12 bg-gradient-to-r from-rose-600 to-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all"
                                    >
                                        Integrate New Global Intelligence Node
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
                                        onClick={() => setIsBulkModalOpen(true)}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/20 active:scale-95 transition-all hover:bg-indigo-500 hover:text-white"
                                    >
                                        <Layers size={14} /> Bulk Import JSON
                                    </button>
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

                        <GlassCard className="p-5 space-y-4 border-sky-500/20">
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Global Supabase URL</label>
                                    <input
                                        type="text"
                                        value={settings.customSupabaseUrl || ''}
                                        onChange={(e) => updateSettings({ customSupabaseUrl: e.target.value })}
                                        placeholder="https://xxx.supabase.co"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-main)] focus:border-sky-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Global Anon Key</label>
                                    <input
                                        type="password"
                                        value={settings.customSupabaseKey || ''}
                                        onChange={(e) => updateSettings({ customSupabaseKey: e.target.value })}
                                        placeholder="Supabase Anon Key..."
                                        className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-xl px-4 py-3 text-xs font-bold text-[var(--text-main)] focus:border-sky-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Globe size={18} className="text-emerald-500" />
                                    <div>
                                        <p className="text-[10px] font-bold text-[var(--text-main)]">Current Connection</p>
                                        <p className="text-[8px] text-[var(--text-muted)] font-mono truncate max-w-[150px]">
                                            {settings.customSupabaseUrl || 'System Default (ENV)'}
                                        </p>
                                    </div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </div>

                            <button
                                onClick={() => {
                                    if (confirm("Reset connection to system defaults?")) {
                                        updateSettings({ customSupabaseUrl: undefined, customSupabaseKey: undefined });
                                    }
                                }}
                                className="w-full py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-rose-500 transition-colors"
                            >
                                Reset to Environment Defaults
                            </button>

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
                                                // GLOBAL SYNC: Push to all users
                                                updateSettings({ globalAiInsights: newInsights });
                                                showFeedback(`Insights regenerated! (${newInsights.length} suggestions) pushed to all users.`, 'success');
                                            })
                                            .catch(err => {
                                                console.error("❌ [AdminPanel] Refresh Failed:", err);
                                                showFeedback("Failed to regenerate insights. Check console.", 'error');
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

                    {/* Enterprise Support & Recovery */}
                    <section className="pt-4">
                        <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest mb-3 px-1">Enterprise Support & Recovery</p>
                        <div className="space-y-2">
                            <button
                                disabled={isRepairing}
                                onClick={() => setShowRepairConfirm(true)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${isRepairing ? 'bg-sky-500/5 border-sky-500/10 text-sky-500/50 cursor-not-allowed' : 'bg-sky-500/10 border-sky-500/20 text-sky-400 active:scale-95'}`}
                            >
                                <div className="flex items-center gap-3">
                                    {isRepairing ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest">{isRepairing ? "Repairing Data..." : "Global Data Repair"}</p>
                                        <p className="text-[8px] text-sky-400/60 font-mono italic">Tenant Isolation Bypass & Sync</p>
                                    </div>
                                </div>
                                {isRepairing ? <Loader2 size={14} className="animate-spin opacity-50" /> : <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                            </button>

                            <button
                                disabled={isConfigSyncing}
                                onClick={async () => {
                                    if (confirm("Sync Global System Config?")) {
                                        try {
                                            setIsConfigSyncing(true);
                                            await offlineSyncService.syncGlobalData();
                                            showFeedback("Global Configuration Refreshed.", 'success');
                                        } catch (e: any) {
                                            showFeedback(`Config sync failed: ${e.message || 'Check console'}`, 'error');
                                        } finally {
                                            setIsConfigSyncing(false);
                                        }
                                    }
                                }}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${isConfigSyncing ? 'bg-indigo-500/5 border-indigo-500/10 text-indigo-500/50 cursor-not-allowed' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 active:scale-95'}`}
                            >
                                <div className="flex items-center gap-3">
                                    {isConfigSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-widest">{isConfigSyncing ? "Syncing..." : "Sync Authority Config"}</p>
                                        <p className="text-[8px] text-indigo-400/60 font-mono italic">Hierarchy & Schema Metadata</p>
                                    </div>
                                </div>
                                {isConfigSyncing ? <Loader2 size={14} className="animate-spin opacity-50" /> : <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />}
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
                            </div>
                        )
                    }
                </>
            )}

            {/* Confirmation Modal for Global Data Repair */}
            <ConfirmModal
                isOpen={showRepairConfirm}
                title="Global Data Repair"
                message="This will pull all records from the cloud including all tenants. This operation may take a few moments."
                confirmText="Proceed"
                cancelText="Cancel"
                onConfirm={handleGlobalRepair}
                onCancel={() => setShowRepairConfirm(false)}
                variant="warning"
            />
            {/* Bulk Import Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                                    <Layers size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tighter">Bulk Intelligence Import</h3>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">JSON Ledger Integration</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBulkModalOpen(false)}
                                className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">JSON Key Manifest</label>
                                <textarea
                                    value={bulkJsonInput}
                                    onChange={(e) => setBulkJsonInput(e.target.value)}
                                    placeholder='[{"key": "sk-...", "label": "Node 1"}]'
                                    className="w-full h-48 bg-black/50 border border-white/10 rounded-2xl p-4 font-mono text-[10px] text-emerald-400 focus:border-indigo-500 outline-none transition-all resize-none scrollbar-none"
                                />
                                {bulkImportError && (
                                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-[10px] text-rose-500 font-bold">
                                        <AlertTriangle size={14} />
                                        {bulkImportError}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => setIsBulkModalOpen(false)}
                                    className="h-12 bg-zinc-900 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 hover:bg-zinc-800 transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleBulkImport}
                                    className="h-12 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 active:scale-95 transition-all"
                                >
                                    Save & Sync Nodes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
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
