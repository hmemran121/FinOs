import React, { useMemo } from 'react';
import { useFinance } from '../../store/FinanceContext';
import { Zap, Calendar, TrendingDown, PiggyBank, ArrowRight } from 'lucide-react';

const ActionDeck: React.FC = () => {
    const { commitments, categories, totalBalance, walletsWithBalances, settings } = useFinance();
    const isBN = settings.language === 'BN';

    // Smart Logic to derive actions
    const actions = useMemo(() => {
        const suggestions = [];
        const now = new Date();

        // 1. Bill Alert (Due within 3 days)
        const upcomingBills = commitments.filter(c => {
            const nextDue = new Date(c.nextDate);
            const diffTime = nextDue.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 3;
        });

        if (upcomingBills.length > 0) {
            suggestions.push({
                id: 'bill-due',
                text: isBN ? `${upcomingBills[0].name} পরিশোধ করুন` : `Pay ${upcomingBills[0].name}`,
                sub: isBN ? '৩ দিনের মধ্যে দেয়' : 'Due in < 3 days',
                icon: <Calendar size={14} />,
                color: 'bg-rose-500 text-white',
                action: () => console.log('Navigate to Commitments') // In real app, nav to commitment
            });
        }

        // 2. Weekend Spend Log (If Fri/Sat)
        const day = now.getDay();
        if (day === 5 || day === 6) {
            suggestions.push({
                id: 'weekend-log',
                text: isBN ? 'উইকেন্ড খরচ যোগ করুন' : 'Log Weekend Spend',
                sub: isBN ? 'দ্রুত রেকর্ড করুন' : 'Record transactions',
                icon: <Zap size={14} />,
                color: 'bg-blue-600 text-white',
                action: () => { }
            });
        }

        // 3. Wealth Surplus (If Cash is high)
        if (totalBalance > 50000) { // Arbitrary threshold
            suggestions.push({
                id: 'invest-surplus',
                text: isBN ? 'বিনিয়োগ করুন' : 'Invest Surplus',
                sub: isBN ? 'আপনার ব্যালেন্স স্বাস্থ্যকর' : 'Balance is healthy',
                icon: <PiggyBank size={14} />,
                color: 'bg-emerald-600 text-white',
                action: () => { }
            });
        }

        return suggestions;
    }, [commitments, totalBalance, isBN]);

    if (actions.length === 0) return null;

    return (
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {actions.map(action => (
                <button
                    key={action.id}
                    onClick={action.action}
                    className={`flex-shrink-0 relative overflow-hidden pl-4 pr-10 py-3 rounded-2xl shadow-lg transition-transform active:scale-95 ${action.color}`}
                >
                    <div className="absolute right-0 top-0 h-full w-12 bg-white/10 -skew-x-12 translate-x-4" />

                    <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                            {action.icon}
                        </div>
                        <div className="text-left">
                            <h4 className="text-xs font-black tracking-tight">{action.text}</h4>
                            <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{action.sub}</p>
                        </div>
                    </div>

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50">
                        <ArrowRight size={14} />
                    </div>
                </button>
            ))}
        </div>
    );
};

export default ActionDeck;
