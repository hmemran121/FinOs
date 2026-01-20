import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import {
    User,
    Settings as SettingsIcon,
    LogOut,
    Shield,
    UserCircle
} from 'lucide-react';
import { GlassCard } from './ui/GlassCard';

export const ProfileDropdown: React.FC = () => {
    const { profile, logout, setActiveTab, settings } = useFinance();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
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

    const handleAction = (tab?: string) => {
        if (tab) setActiveTab(tab);
        setIsOpen(false);
    };

    const handleLogout = () => {
        setIsOpen(false);
        logout();
    };

    const isBN = settings.language === 'BN';

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Profile Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1 rounded-full bg-[var(--input-bg)] border border-[var(--border-glass)] hover:border-blue-500/50 transition-all duration-300 active:scale-95 group focus:outline-none"
            >
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-blue-500/30 transition-all">
                    {profile.avatar ? (
                        <img
                            src={profile.avatar}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=3b82f6&color=fff`;
                            }}
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center text-xs font-black text-white"
                            style={{ background: `linear-gradient(135deg, ${settings.accentColor}, #000)` }}
                        >
                            {profile.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <GlassCard className="p-2 border-white/5 shadow-2xl overflow-hidden ring-1 ring-black/20">
                        {/* User Info Header */}
                        <div className="p-4 border-b border-white/5 bg-white/5 rounded-t-2xl mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                                    {profile.avatar ? (
                                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center text-lg font-black text-white"
                                            style={{ background: `linear-gradient(135deg, ${settings.accentColor}, #000)` }}
                                        >
                                            {profile.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-[var(--text-main)] truncate">{profile.name}</p>
                                    <p className="text-[10px] font-bold text-[var(--text-muted)] truncate">{profile.email}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${profile.isSuperAdmin ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-zinc-800 text-zinc-400'}`}>
                                    {profile.isSuperAdmin ? 'SUPER ADMIN' : profile.role}
                                </span>
                                {profile.isSuperAdmin && (
                                    <div className="p-1 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                                        <Shield size={10} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="space-y-1">
                            <button
                                onClick={() => handleAction('settings')}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-[var(--text-main)] transition-all group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    <UserCircle size={18} />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest">{isBN ? 'প্রোফাইল দেখুন' : 'View Profile'}</span>
                            </button>

                            <button
                                onClick={() => handleAction('settings')}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-[var(--text-main)] transition-all group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-zinc-500/10 text-zinc-500 flex items-center justify-center group-hover:bg-zinc-800 group-hover:text-white transition-all">
                                    <SettingsIcon size={18} />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest">{isBN ? 'সেটিংস' : 'Settings'}</span>
                            </button>

                            <div className="h-px bg-white/5 mx-2 my-1" />

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-all group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all">
                                    <LogOut size={18} />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest">{isBN ? 'লগআউট' : 'Logout'}</span>
                            </button>
                        </div>

                        <div className="p-2 pt-0 mt-1">
                            <p className="text-[8px] font-black uppercase text-center text-zinc-600 tracking-[0.3em]">FinOS Cloud • Secure</p>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
