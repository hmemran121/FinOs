import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../store/FinanceContext';
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
    Zap as ZapIcon
} from 'lucide-react';

const AdminPanel: React.FC = () => {
    const { settings, updateSettings, transactions, wallets, financialPlans, commitments } = useFinance();
    const [geminiKey, setGeminiKey] = useState(settings.customGeminiKey || '');
    const [isSaved, setIsSaved] = useState(false);
    const [selectedLogo, setSelectedLogo] = useState<string | undefined>(settings.customLogoUrl);
    const [, forceUpdate] = useState({});

    // Use ref to track the actual current value
    const currentLogoRef = useRef<string | undefined>(settings.customLogoUrl);

    // Sync selectedLogo with settings.customLogoUrl when it changes
    useEffect(() => {
        console.log('🔄 Settings changed, customLogoUrl:', settings.customLogoUrl);
        setSelectedLogo(settings.customLogoUrl);
        currentLogoRef.current = settings.customLogoUrl;
    }, [settings.customLogoUrl]);

    // Debug: Log on mount
    useEffect(() => {
        console.log('🚀 AdminPanel mounted, initial customLogoUrl:', settings.customLogoUrl);
        currentLogoRef.current = settings.customLogoUrl;
    }, []);

    // Debug Stats
    const stats = {
        totalTransactions: transactions.length,
        totalWallets: wallets.length,
        totalPlans: financialPlans.length,
        totalCommitments: commitments.length,
        dbVersion: 23,
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
        localStorage.removeItem('ai_insights_cache');
        alert('AI Cache Cleared');
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
            <section className="grid grid-cols-2 gap-3">
                {[
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
                ))}
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
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2 mb-2">
                                <Key size={12} /> Gemini API Key
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                    placeholder="Paste new API key here..."
                                    className="flex-1 bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-main)] focus:border-rose-500 outline-none transition-all"
                                />
                                <button
                                    onClick={saveAdminSettings}
                                    className={`px-4 rounded-xl transition-all active:scale-95 ${isSaved ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'}`}
                                >
                                    <Save size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
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
                                <ExternalLink size={14} /> Get API Key
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </section>

            {/* Cloud Governance */}
            <section>
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
            </section>

            {/* Danger Zone */}
            <section className="pt-4">
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
            </section>
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
