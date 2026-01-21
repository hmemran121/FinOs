import React, { useMemo } from 'react';
import { useFinance } from '../../store/FinanceContext';
import { Sun, Moon, CloudSun, Sunrise, CloudRain, Wind } from 'lucide-react';

const SmartHeader: React.FC = () => {
    const { profile, availableAfterCommitments, settings, healthScore } = useFinance();
    const isBN = settings.language === 'BN';

    // 1. Time-Based Greeting Logic
    const timeContext = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return {
            text: isBN ? 'শুভ সকাল' : 'Good Morning',
            icon: <Sunrise size={18} className="text-orange-400" />
        };
        if (hour >= 12 && hour < 17) return {
            text: isBN ? 'শুভ দুপুর' : 'Good Afternoon',
            icon: <Sun size={18} className="text-yellow-400" />
        };
        if (hour >= 17 && hour < 22) return {
            text: isBN ? 'শুভ সন্ধ্যা' : 'Good Evening',
            icon: <CloudSun size={18} className="text-indigo-400" />
        };
        return {
            text: isBN ? 'শুভ রাত্রি' : 'Good Night',
            icon: <Moon size={18} className="text-purple-400" />
        };
    }, [isBN]);

    // 2. Financial Weather Logic (Background Gradient)
    const weather = useMemo(() => {
        const score = healthScore?.score || 0;

        // Critical Status (Stormy)
        if (score < 40) return {
            gradient: "from-rose-500/20 via-orange-500/10 to-[var(--bg-color)]",
            message: isBN ? "আর্থিক অবস্থা সংকটপূর্ণ" : "Financial Turbulence Detected",
            icon: <CloudRain size={14} className="text-rose-400" />
        };

        // Warning Status (Cloudy)
        if (score < 70) return {
            gradient: "from-amber-400/15 via-blue-500/5 to-[var(--bg-color)]",
            message: isBN ? "বাজেট নিয়ন্ত্রণে রাখুন" : "Cloudy Forecast - Watch Spending",
            icon: <Wind size={14} className="text-amber-400" />
        };

        // Healthy Status (Clear Sky)
        return {
            gradient: "from-emerald-400/15 via-cyan-500/5 to-[var(--bg-color)]",
            message: isBN ? "চমৎকার আর্থিক স্বাস্থ্য" : "Clear Skies & Healthy Growth",
            icon: <Sun size={14} className="text-emerald-400" />
        };
    }, [healthScore, isBN]);

    return (
        <div className={`relative overflow-hidden rounded-[24px] p-6 mb-2 border border-white/5 shadow-2xl transition-all duration-1000 bg-gradient-to-br ${weather.gradient}`}>

            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full bg-white/5" />

            <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-700">
                        <div className="p-1.5 bg-white/10 rounded-full backdrop-blur-md">
                            {timeContext.icon}
                        </div>
                        <h2 className="text-lg font-bold text-[var(--text-main)] opacity-90 tracking-tight">
                            {timeContext.text}, <span className="text-blue-400">{profile.name.split(' ')[0]}</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 pl-1 animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-100">
                        {weather.icon}
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-70">
                            {weather.message}
                        </p>
                    </div>
                </div>

                {/* Optional: Micro-Insight or Quick Stat can go here later */}
            </div>
        </div>
    );
};

export default SmartHeader;
