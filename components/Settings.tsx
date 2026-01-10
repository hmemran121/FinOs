
import React, { useState } from 'react';
import { CurrencyPickerOverlay } from './ui/CurrencyPickerOverlay';
import { useFinance } from '../store/FinanceContext';
import { biometricService } from '../services/biometric';
import { GlassCard } from './ui/GlassCard';
import { SyncStatusPanel } from './SyncStatusIndicator';
import {
  X,
  User,
  Shield,
  Database,
  Cpu,
  LogOut,
  ChevronRight,
  Globe,
  Download,
  Trash2,
  Check,
  Edit2,
  Lock,
  Smartphone,
  Power,
  Moon,
  Sun,
  Zap,
  Cloud,
  Palette,
  EyeOff,
  Languages,
  Calendar,
  Layers,
  Info,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  MousePointer2,
  Activity,
  Wifi,
  History,
  Layout,
  Music,
  BellRing,
  Type as FontIcon,
  Timer
} from 'lucide-react';

const ACCENT_COLORS = [
  { name: 'Classic Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#fbbf24' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
];

const Settings: React.FC = () => {
  const { profile, settings, updateProfile, updateSettings, clearAllData, logout, transactions, categories, wallets, currencies, setActiveTab } = useFinance();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(profile.name);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const handlePinSubmit = () => {
    if (pinInput === '0000') {
      updateSettings({ isAdminEnabled: true });
      setActiveTab('admin');
      setShowAdminPinModal(false);
      setPinInput('');
    } else {
      alert(isBN ? "ভুল পিন!" : "Incorrect PIN!");
      setPinInput('');
    }
  };

  const handleAdminAccess = () => {
    console.log("🛠️ Attempting Admin Console Access...");
    const pin = prompt(isBN ? "অ্যাডমিন পিন দিন (Default: 0000):" : "Enter Admin PIN (Default: 0000):");

    if (pin === '0000') {
      console.log("✅ PIN Correct. Redirecting...");
      updateSettings({ isAdminEnabled: true });
      setActiveTab('admin');
    } else if (pin !== null) {
      alert(isBN ? "ভুল পিন!" : "Incorrect PIN!");
    }
  };

  const handleSaveName = () => {
    updateProfile({ name: tempName });
    setIsEditingName(false);
  };

  const exportData = () => {
    const data = transactions.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const wal = wallets.find(w => w.id === t.walletId);
      return {
        date: t.date,
        type: t.type,
        amount: t.amount,
        note: t.note,
        category: cat?.name || 'Unknown',
        wallet: wal?.name || 'Unknown'
      };
    });

    const csvRows = [
      ['Date', 'Type', 'Amount', 'Note', 'Category', 'Wallet'],
      ...data.map(row => [row.date, row.type, row.amount, `"${row.note}"`, row.category, row.wallet])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FinOS_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isBN = settings.language === 'BN';

  return (
    <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <div className="px-1">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--text-main)] to-zinc-500 bg-clip-text text-transparent">
          {isBN ? 'সেটিংস' : 'Settings'}
        </h1>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">
          {isBN ? 'সিস্টেম কোর কনফিগারেশন' : 'System Core Configuration'}
        </p>
      </div>

      {/* User Identity */}
      <section>
        <SectionHeader icon={<User size={16} />} title={isBN ? 'পরিচয়' : 'Identity'} color="blue" />
        <GlassCard className="p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <User size={80} />
          </div>
          <div className="flex items-center gap-6 relative z-10">
            <div
              className={`w-20 h-20 rounded-[30px] flex items-center justify-center text-3xl font-black shadow-2xl transition-all group-hover:scale-105 duration-500 ${settings.isAdminEnabled ? 'ring-4 ring-rose-500 ring-offset-4 ring-offset-black' : ''}`}
              style={{ background: `linear-gradient(135deg, ${settings.accentColor}, #000)`, boxShadow: `0 20px 40px ${settings.accentColor}33` }}
            >
              <span className="text-white drop-shadow-md">{profile.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    className="bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-xl px-3 py-2 text-sm font-bold w-full outline-none focus:border-blue-500 text-[var(--text-main)] transition-colors"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="p-2 text-emerald-500"><Check size={18} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name cursor-pointer" onClick={() => setIsEditingName(true)}>
                  <h3 className="text-xl font-bold truncate text-[var(--text-main)] transition-colors">{profile.name}</h3>
                  <Edit2 size={14} className="text-[var(--text-muted)] group-hover/name:text-blue-500 transition-colors" />
                </div>
              )}
              <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1 truncate transition-colors">
                {profile.email || (isBN ? 'ক্লাউড লিঙ্কড আইডি' : 'Cloud Linked Identity')}
              </p>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Aesthetics & Customization */}
      <section>
        <SectionHeader icon={<Palette size={16} />} title={isBN ? 'নান্দনিকতা' : 'Aesthetics'} color="purple" />
        <div className="space-y-3">
          {/* Theme Switcher */}
          <GlassCard className="p-4 border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">{isBN ? 'সিস্টেম থিম' : 'System Theme'}</p>
            <div className="flex bg-[var(--input-bg)] p-1.5 rounded-2xl border border-[var(--border-glass)]">
              {[
                { id: 'DARK', label: isBN ? 'ডার্ক' : 'Dark', icon: <Moon size={14} /> },
                { id: 'LIGHT', label: isBN ? 'লাইট' : 'Light', icon: <Sun size={14} /> },
                { id: 'AMOLED', label: 'OLED', icon: <Zap size={14} /> }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateSettings({ theme: t.id as any })}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settings.theme === t.id ? 'bg-zinc-100 text-black shadow-lg dark:bg-white dark:text-black' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Accent Color */}
          <GlassCard className="p-4 border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">{isBN ? 'অ্যাকসেন্ট কালার' : 'Accent Color'}</p>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => updateSettings({ accentColor: color.value })}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${settings.accentColor === color.value ? 'scale-110 ring-4 ring-offset-2 ring-offset-black ring-blue-500/50' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color.value }}
                >
                  {settings.accentColor === color.value && <Check size={16} className="text-white" />}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Glass Intensity */}
          <SettingsRow
            icon={<Layers size={18} />}
            label={isBN ? 'গ্লাস ইফেক্ট তীব্রতা' : 'Glass Intensity'}
            value={`${settings.glassIntensity}%`}
          >
            <input
              type="range"
              min="0"
              max="100"
              value={settings.glassIntensity}
              onChange={(e) => updateSettings({ glassIntensity: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-[var(--input-bg)] rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
            />
          </SettingsRow>

          {/* Compact Mode */}
          <SettingsRow
            icon={<Layout size={18} />}
            label={isBN ? 'কম্প্যাক্ট মোড' : 'Compact Mode'}
            toggle={settings.compactMode}
            onClick={() => updateSettings({ compactMode: !settings.compactMode })}
            subText={isBN ? 'কন্টেন্ট আরও ঘন করে দেখাবে' : 'Reduces padding for data density'}
          />
        </div>
      </section>

      {/* Localization */}
      <section>
        <SectionHeader icon={<Languages size={16} />} title={isBN ? 'আঞ্চলিকতা' : 'Localization'} color="emerald" />
        <div className="space-y-3">
          <SettingsRow
            icon={<Languages size={18} />}
            label={isBN ? 'অ্যাপ ল্যাঙ্গুয়েজ' : 'App Language'}
            value={settings.language === 'EN' ? 'English' : 'বাংলা'}
            onClick={() => updateSettings({ language: settings.language === 'EN' ? 'BN' : 'EN' })}
          />
          <SettingsRow
            icon={<Globe size={18} />}
            label={isBN ? 'সিস্টেম কারেন্সি' : 'System Currency'}
            value={`${settings.currency} (${currencies.find(c => c.code === settings.currency)?.symbol || '$'})`}
            onClick={() => setShowCurrencyPicker(true)}
          />
        </div>
      </section>

      {/* Security & Privacy */}
      <section>
        <SectionHeader icon={<ShieldCheck size={16} />} title={isBN ? 'নিরাপত্তা ও গোপনীয়তা' : 'Security & Privacy'} color="rose" />
        <div className="space-y-3">
          <SettingsRow
            icon={<Smartphone size={18} />}
            label={isBN ? 'বায়োমেট্রিক অথরাইজেশন' : 'Biometric Auth'}
            value={settings.biometricEnabled ? (isBN ? 'চালু' : 'Active') : (isBN ? 'বন্ধ' : 'Disabled')}
            toggle={settings.biometricEnabled}
            onClick={async () => {
              const available = await biometricService.checkAvailability();
              if (!available.isAvailable) {
                alert(isBN ? "এই ডিভাইসে বায়োমেট্রিক হার্ডওয়্যার নেই।" : "Biometric hardware not available on this device.");
                return;
              }
              const verified = await biometricService.verifyIdentity();
              if (verified) {
                updateSettings({ biometricEnabled: !settings.biometricEnabled });
              }
            }}
          />
          <SettingsRow
            icon={<EyeOff size={18} />}
            label={isBN ? 'প্রাইভেসি মোড' : 'Privacy Mode'}
            value={settings.privacyMode ? (isBN ? 'ব্যক্তিগত' : 'Private') : (isBN ? 'পাবলিক' : 'Public')}
            toggle={settings.privacyMode}
            onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
            subText={isBN ? 'ব্যালেন্স এবং ট্রানজেকশন ব্লার করবে' : 'Blurs balances and sensitive values'}
          />
          <SettingsRow
            icon={<Timer size={18} />}
            label={isBN ? 'অটো-লক টাইমআউট' : 'Auto-lock Timeout'}
            value={settings.biometricLockTimeout === 0 ? (isBN ? 'তাৎক্ষণিক' : 'Immediate') : (isBN ? `${settings.biometricLockTimeout} সে.` : `${settings.biometricLockTimeout}s`)}
            onClick={() => {
              const val = prompt(isBN ? "টাইমআউট দিন (সেকেন্ডে, ০ = তৎক্ষণাৎ):" : "Enter timeout (seconds, 0 = immediate):", settings.biometricLockTimeout.toString());
              if (val !== null) updateSettings({ biometricLockTimeout: parseInt(val) || 0 });
            }}
          />
          <SettingsRow
            icon={<Lock size={18} />}
            label={isBN ? 'সিস্টেম পিন রিসেট' : 'Reset System PIN'}
            value="****"
            onClick={() => alert('PIN reset sequence initiated. (Simulation)')}
          />
        </div>
      </section>

      {/* Advanced Intelligence */}
      <section>
        <SectionHeader icon={<Cpu size={16} />} title={isBN ? 'উন্নত প্রযুক্তি' : 'Advanced Intelligence'} color="amber" />
        <div className="space-y-3">
          <SettingsRow
            icon={<Cpu size={18} />}
            label={isBN ? 'এআই প্রেডিক্টিভ ইঞ্জিন' : 'AI Predictive Engine'}
            value={settings.aiEnabled ? (isBN ? 'সক্রিয়' : 'Active') : (isBN ? 'নিষ্ক্রিয়' : 'Standby')}
            toggle={settings.aiEnabled}
            onClick={() => updateSettings({ aiEnabled: !settings.aiEnabled })}
            subText={isBN ? 'ভবিষ্যতের ব্যালেন্স প্রেডিকশন করবে' : 'Enables future balance projections'}
          />
          <SettingsRow
            icon={<Calendar size={18} />}
            label={isBN ? 'বাজেট সাইকেল শুরু' : 'Budget Cycle Start'}
            value={`${settings.budgetStartDay}${getOrdinal(settings.budgetStartDay)}`}
            onClick={() => {
              const day = prompt(isBN ? "বাজেট শুরুর দিন দিন (১-৩১):" : "Enter budget start day (1-31):", settings.budgetStartDay.toString());
              if (day) {
                const dayNum = parseInt(day);
                if (dayNum >= 1 && dayNum <= 31) updateSettings({ budgetStartDay: dayNum });
              }
            }}
          />

          <SettingsRow
            icon={<Activity size={18} />}
            label={isBN ? 'হেলথ স্কোর ডিসপ্লে' : 'Health Score Display'}
            toggle={settings.showHealthScore}
            onClick={() => updateSettings({ showHealthScore: !settings.showHealthScore })}
          />

          <SettingsRow
            icon={<BellRing size={18} />}
            label={isBN ? 'লো ব্যালেন্স অ্যালার্ট' : 'Low Balance Alert'}
            value={settings.lowBalanceThreshold.toString()}
            onClick={() => {
              const val = prompt(isBN ? "অ্যালার্ট থ্রেশহোল্ড দিন:" : "Enter alert threshold:", settings.lowBalanceThreshold.toString());
              if (val !== null) updateSettings({ lowBalanceThreshold: parseFloat(val) || 0 });
            }}
            subText={isBN ? 'ব্যালেন্স এর নিচে নামলে সতর্ক করবে' : 'Notifies when balance drops below this'}
          />
        </div>
      </section>

      {/* Typography & Design DNA */}
      <section>
        <SectionHeader icon={<FontIcon size={16} />} title={isBN ? 'ডিজাইন এবং টাইপোগ্রাফি' : 'Design DNA'} color="pink" />
        <div className="space-y-3">
          <GlassCard className="p-4 border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">{isBN ? 'ফন্ট ফ্যামিলি' : 'Font Family'}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'PLUS_JAKARTA', label: 'Jakarta' },
                { id: 'INTER', label: 'Inter' },
                { id: 'ROBOTO', label: 'Roboto' },
                { id: 'OUTFIT', label: 'Outfit' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => updateSettings({ fontFamily: f.id as any })}
                  className={`py-3 rounded-xl text-[10px] font-bold transition-all ${settings.fontFamily === f.id ? 'bg-zinc-100 text-black dark:bg-white' : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-glass)]'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4 border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">{isBN ? 'মোশন ইনটেনসিটি' : 'Motion Intensity'}</p>
            <div className="flex bg-[var(--input-bg)] p-1.5 rounded-2xl border border-[var(--border-glass)]">
              {['LOW', 'MEDIUM', 'HIGH'].map((v) => (
                <button
                  key={v}
                  onClick={() => updateSettings({ animationIntensity: v as any })}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black tracking-widest transition-all ${settings.animationIntensity === v ? 'bg-zinc-100 text-black dark:bg-white' : 'text-[var(--text-muted)]'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Advanced Experience */}
      <section>
        <SectionHeader icon={<MousePointer2 size={16} />} title={isBN ? 'সিস্টেম এক্সপেরিয়েন্স' : 'System Experience'} color="indigo" />
        <div className="space-y-3">
          <SettingsRow
            icon={<Activity size={18} />}
            label={isBN ? 'হ্যাপটিক ভাইব্রেশন' : 'Haptic Feedback'}
            toggle={settings.hapticEnabled}
            onClick={() => updateSettings({ hapticEnabled: !settings.hapticEnabled })}
            subText={isBN ? 'টাচ করার সময় হালকা ভাইব্রেশন হবে' : 'Subtle vibration on interactions'}
          />

          <GlassCard className="p-4 border-white/5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-glass)]">
                <Zap size={18} />
              </div>
              <p className="text-sm font-bold text-[var(--text-main)] italic">{isBN ? 'অ্যানিমেশন গতি' : 'Animation Speed'}</p>
            </div>
            <div className="flex gap-2">
              {['FAST', 'NORMAL', 'RELAXED'].map(v => (
                <button
                  key={v}
                  onClick={() => updateSettings({ animationSpeed: v as any })}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${settings.animationSpeed === v ? 'bg-blue-600 text-white' : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-glass)]'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </GlassCard>

          <SettingsRow
            icon={<Database size={18} />}
            label={isBN ? 'ডেসিমাল প্লেসেস' : 'Decimal Places'}
            value={settings.decimalPlaces.toString()}
            onClick={() => {
              const val = prompt(isBN ? "ডেসিমাল প্লেস সংখ্যা (০-৪):" : "Enter decimal places (0-4):", settings.decimalPlaces.toString());
              if (val) {
                const n = parseInt(val);
                if (n >= 0 && n <= 4) updateSettings({ decimalPlaces: n });
              }
            }}
          />
        </div>
      </section>

      {/* Connectivity & Audio */}
      <section>
        <SectionHeader icon={<Music size={16} />} title={isBN ? 'অডিও এবং কানেক্টিভিটি' : 'Audio & Connectivity'} color="orange" />
        <div className="space-y-3">
          <SettingsRow
            icon={<Music size={18} />}
            label={isBN ? 'সাউন্ড ইফেক্টস' : 'Sound Effects'}
            toggle={settings.soundEffectsEnabled}
            onClick={() => updateSettings({ soundEffectsEnabled: !settings.soundEffectsEnabled })}
            subText={isBN ? 'লেনদেন ও ক্লিকের সময় শব্দ হবে' : 'Interactive UI sounds'}
          />
          <SettingsRow
            icon={<Wifi size={18} />}
            label={isBN ? 'অটো সিনক্রোনাইজেশন' : 'Automated Cloud Sync'}
            toggle={settings.autoSync}
            onClick={() => updateSettings({ autoSync: !settings.autoSync })}
            subText={isBN ? 'স্বয়ংক্রিয়ভাবে ডাটা সেভ করবে' : 'Automatically sync changes to cloud'}
          />
        </div>
      </section>

      {/* Cloud Status */}
      <section>
        <SectionHeader icon={<Cloud size={16} />} title={isBN ? 'ক্লাউড স্থিতি' : 'Cloud Status'} color="sky" />
        <SyncStatusPanel />
      </section>

      {/* Session Management */}
      <section>
        <SectionHeader icon={<Power size={16} />} title={isBN ? 'সেশন কন্ট্রোল' : 'Session'} color="red" />
        <button
          onClick={logout}
          className="w-full flex items-center justify-between p-5 bg-rose-500/10 border border-rose-500/20 rounded-[28px] text-rose-500 group active:scale-95 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/20 rounded-xl">
              <LogOut size={20} />
            </div>
            <div className="text-left">
              <p className="text-sm font-black uppercase tracking-widest">{isBN ? 'সেশন শেষ করুন' : 'Terminate Session'}</p>
              <p className="text-[10px] font-bold opacity-60">{isBN ? 'এই ডিভাইস থেকে লগ আউট করবেন' : 'Sign out from this device'}</p>
            </div>
          </div>
          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </section>

      {/* Data Management */}
      <section>
        <SectionHeader icon={<Database size={16} />} title={isBN ? 'ডেটা ম্যানেজমেন্ট' : 'Data & Portability'} color="zinc" />
        <div className="space-y-3">
          <button
            onClick={() => {
              console.log("🖱️ Opening PIN Modal...");
              setShowAdminPinModal(true);
            }}
            className="w-full p-5 bg-rose-500/10 border border-rose-500/20 rounded-[28px] text-rose-500 group active:scale-95 transition-all text-left mb-3"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/20 rounded-xl">
                <ShieldAlert size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black uppercase tracking-widest">{isBN ? 'অ্যাডমিন কনসোল' : 'Admin Console'}</p>
                <p className="text-[10px] font-bold opacity-60">{isBN ? 'সিস্টেম পিন দিয়ে রুট এক্সেস পান' : 'Elevate to Root Access with PIN'}</p>
              </div>
            </div>
          </button>
          <SettingsRow
            icon={<Download size={18} />}
            label={isBN ? 'ডেটা এক্সপোর্ট (CSV)' : 'Export Ledger (CSV)'}
            onClick={exportData}
          />
          <SettingsRow
            icon={<Trash2 size={18} />}
            label={isBN ? 'ফ্যাক্টরি রিসেট' : 'Factory Reset'}
            className="text-rose-500"
            onClick={clearAllData}
          />
        </div>
      </section>

      {/* About & Credits */}
      <section className="pt-8 border-t border-[var(--border-glass)]">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center p-3 shadow-xl">
            {settings.customLogoUrl ? (
              <img
                src={settings.customLogoUrl}
                alt="FinOS"
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error('Logo load error, falling back to default');
                  (e.target as HTMLImageElement).src = 'https://img.icons8.com/isometric/512/financial-growth-analysis.png';
                }}
              />
            ) : (
              <img src="/logo.svg" alt="FinOS" className="w-full h-full object-contain" onError={(e) => (e.target as any).src = 'https://img.icons8.com/isometric/512/financial-growth-analysis.png'} />
            )}
          </div>
          <div>
            <p className="text-xs font-black tracking-[0.3em] uppercase text-[var(--text-main)] transition-colors">FinOS Premium Build</p>
            <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1">v3.8.0-Stable PRO</p>
          </div>
          <div className="flex gap-4">
            <button className="text-[10px] font-bold uppercase tracking-widest text-blue-500 flex items-center gap-1">
              <Info size={12} /> {isBN ? 'সম্পর্কে' : 'About'}
            </button>
            <button className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1">
              <ExternalLink size={12} /> Website
            </button>
          </div>
          <p className="text-[8px] font-medium opacity-30 max-w-[200px] leading-relaxed">
            {isBN ? 'নিরাপদ ক্লাউড আইডেন্টিটি এবং রিয়েল-টাইম সিনক্রোনাইজেশন সক্রিয়।' : 'Secure Cloud Identity | Real-time Synchronization Enabled'}
          </p>
        </div>
      </section>

      {/* REUSABLE CURRENCY PICKER OVERLAY */}
      <CurrencyPickerOverlay
        isOpen={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        selectedCurrency={settings.currency}
        onSelect={(code) => updateSettings({ currency: code })}
      />
      {/* ADMIN PIN MODAL */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <GlassCard className="w-full max-w-sm p-8 border-rose-500/20">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3 text-rose-500">
                <ShieldAlert size={24} />
                <h3 className="text-xl font-black uppercase tracking-tight">{isBN ? 'অ্যাডমিন পিন' : 'Admin Access'}</h3>
              </div>
              <button onClick={() => setShowAdminPinModal(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
                {isBN ? 'চালিয়ে যেতে ৪ সংখ্যার পিন দিন' : 'Enter 4-digit PIN to elevate'}
              </p>

              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-center text-3xl font-black text-rose-500 tracking-[0.5em] focus:border-rose-500 outline-none transition-all shadow-inner"
                placeholder="****"
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              />

              <button
                onClick={handlePinSubmit}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-600/20 transition-all active:scale-95"
              >
                {isBN ? 'ভেরিফাই করুন' : 'Verify Access'}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  color: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, color }) => (
  <div className="flex items-center gap-2 mb-4 px-1">
    <div className={`p-1.5 rounded-lg bg-${color}-500/10 text-${color}-500`}>
      {icon}
    </div>
    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors">{title}</h2>
  </div>
);

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  toggle?: boolean;
  className?: string;
  subText?: string;
  children?: React.ReactNode;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ icon, label, value, onClick, toggle, className = '', subText, children }) => {
  const { settings } = useFinance();
  return (
    <GlassCard
      className={`p-4 border-white/5 active:bg-white/5 cursor-pointer transition-all duration-300 ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-glass)] shadow-sm">
            {icon}
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-bold text-[var(--text-main)] transition-colors truncate">{label}</p>
            {subText && <p className="text-[9px] font-medium text-[var(--text-muted)] mt-0.5">{subText}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {value && !children && <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter transition-colors">{value}</span>}
          {toggle !== undefined && (
            <div className={`w-10 h-5 rounded-full p-0.5 transition-all ${toggle ? 'bg-blue-600' : 'bg-[var(--surface-deep)] border border-[var(--border-glass)]'}`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-all ${toggle ? 'translate-x-5' : ''} shadow-md`} />
            </div>
          )}
          {onClick && toggle === undefined && <ChevronRight size={14} className="text-[var(--text-muted)]" />}
        </div>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </GlassCard>
  );
};

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

export default Settings;
