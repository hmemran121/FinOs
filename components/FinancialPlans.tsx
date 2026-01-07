
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../store/FinanceContext';
import { GlassCard } from './ui/GlassCard';
import { AutocompleteInput } from './ui/AutocompleteInput';
import { CustomDropdown } from './ui/CustomDropdown';
import {
    ChevronLeft, Plus, Trash2, CheckCircle2,
    Package, Wallet, CreditCard, ArrowRight,
    Calendar, Layers, Filter, MoreVertical,
    Target, Info, AlertCircle, Sparkles, ShieldCheck,
    Smartphone, Landmark, Banknote, Calculator,
    Search, ChevronRight, Tag, X, Check
} from 'lucide-react';
import { ICON_MAP } from '../constants';
import { FinancialPlan, PlanComponent, PlanSettlement, PlanStatus, PlanType, ComponentType } from '../types';
import { format } from 'date-fns';

const FinancialPlans: React.FC = () => {
    const {
        financialPlans,
        addPlan,
        updatePlan,
        deletePlan,
        addComponent,
        updateComponent,
        deleteComponent,
        addSettlement,
        deleteSettlement,
        finalizePlan,
        walletsWithBalances,
        settings,
        getCurrencySymbol,
        setActiveTab,
        categories,
        searchPlanSuggestions
    } = useFinance();

    const [activeTab, setActiveTabLocal] = useState<'DRAFT' | 'FINALIZED'>('DRAFT');
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    // Modals
    const [isAddingPlan, setIsAddingPlan] = useState(false);
    const [isAddingComponent, setIsAddingComponent] = useState(false);
    const [isAddingSettlement, setIsAddingSettlement] = useState(false);

    // Form State
    const [newPlanData, setNewPlanData] = useState({ title: '', plan_type: 'CUSTOM' as PlanType });
    const [newCompData, setNewCompData] = useState<any>({ name: '', component_type: 'ABSTRACT' as ComponentType, expected_cost: '', category_id: '', quantity: '', unit: '' });
    const [newSettlementData, setNewSettlementData] = useState<any>({ amount: '', wallet_id: '', channel_id: '' });

    // Pick-up / Detail State
    const [editingComponent, setEditingComponent] = useState<PlanComponent | null>(null);
    const [pickupData, setPickupData] = useState<any>({ final_cost: '', quantity: '' });

    // Settlement Edit State
    const [editingSettlement, setEditingSettlement] = useState<PlanSettlement | null>(null);

    // Calculator State (for Pickup Modal)
    const [showCalculator, setShowCalculator] = useState(false);
    const [calcTarget, setCalcTarget] = useState<'PICKUP' | 'SETTLEMENT'>('PICKUP');
    const [isDesktop, setIsDesktop] = useState(false);

    // Settlement Pickers
    const [showWalletPickerSettlement, setShowWalletPickerSettlement] = useState(false);
    const [showChannelPickerSettlement, setShowChannelPickerSettlement] = useState(false);
    const [searchWallet, setSearchWallet] = useState('');

    // Taxonomy Picker State
    const [showCatPicker, setShowCatPicker] = useState(false);
    const [searchCat, setSearchCat] = useState('');

    const filteredCategories = useMemo(() => {
        const list = categories.filter(c => !c.isDisabled);
        if (!searchCat) return list;
        return list.filter(c => c.name.toLowerCase().includes(searchCat.toLowerCase()));
    }, [categories, searchCat]);

    const groupedCategories = useMemo(() => {
        const roots = filteredCategories.filter(c => !c.parentId);
        return roots.map(root => ({
            root,
            children: filteredCategories.filter(c => c.parentId === root.id)
        })).filter(group => group.root || group.children.length > 0);
    }, [filteredCategories]);

    useEffect(() => {
        const checkDesktop = () => setIsDesktop(window.innerWidth > 640);
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    // Pure logic helper for evaluation using 'amount' state only
    const safeEvaluate = (expr: string): string | null => {
        try {
            const sanitized = expr.replace(/[^-+/*0-9.]/g, '');
            if (!sanitized) return null;
            // Check for trailing operators
            if (/[+\-*/.]$/.test(sanitized)) return null;
            const result = new Function(`return ${sanitized}`)();
            return isNaN(result) ? null : result.toString();
        } catch (e) {
            return null;
        }
    };

    // Filter plans based on status
    const filteredPlans = useMemo(() => {
        return (financialPlans || []).filter((p: FinancialPlan) => (p.status || 'DRAFT') === activeTab);
    }, [financialPlans, activeTab]);

    const selectedPlan = useMemo(() => {
        return (financialPlans || []).find((p: FinancialPlan) => p.id === selectedPlanId);
    }, [financialPlans, selectedPlanId]);

    // Helper to safely parse dates that might be in microseconds (legacy) or milliseconds
    const safeDate = (ts: any) => {
        if (!ts) return new Date();
        const n = Number(ts);
        if (isNaN(n)) return new Date(ts);
        // If > year 3000 in ms, it's likely microseconds
        if (n > 32503680000000) return new Date(Math.floor(n / 1000));
        return new Date(n);
    };

    const handleBack = () => {
        if (selectedPlanId) {
            setSelectedPlanId(null);
        } else {
            setActiveTab('dashboard');
        }
    };

    const calculateTotalCost = (plan: FinancialPlan) => {
        return (plan.components || []).reduce((acc, c) => acc + (c.final_cost || c.expected_cost || 0), 0);
    };

    const calculateTotalSettled = (plan: FinancialPlan) => {
        return (plan.settlements || []).reduce((acc, s) => acc + s.amount, 0);
    };

    const calculateTotalPicked = (plan: FinancialPlan) => {
        return (plan.components || []).reduce((acc, c) => acc + (c.final_cost || 0), 0);
    };

    const allPicked = useMemo(() => {
        if (!selectedPlan || (selectedPlan.components || []).length === 0) return false;
        return selectedPlan.components.every(c => c.final_cost != null);
    }, [selectedPlan]);

    const handleCreatePlan = async () => {
        if (!newPlanData.title) return;
        const id = await addPlan({
            title: newPlanData.title,
            plan_type: newPlanData.plan_type,
            status: 'DRAFT',
            total_amount: 0
        });
        setNewPlanData({ title: '', plan_type: 'CUSTOM' });
        setIsAddingPlan(false);
        setSelectedPlanId(id);
    };

    const handleAddComponent = async () => {
        if (!selectedPlanId || !newCompData.name) return;
        await addComponent({
            plan_id: selectedPlanId,
            name: newCompData.name,
            component_type: newCompData.component_type,
            expected_cost: parseFloat(newCompData.expected_cost) || 0,
            category_id: newCompData.category_id,
            quantity: newCompData.component_type === 'QUANTIFIED' ? (parseFloat(newCompData.quantity) || 0) : undefined,
            unit: newCompData.component_type === 'QUANTIFIED' ? newCompData.unit : undefined
        });
        setNewCompData({ name: '', component_type: 'ABSTRACT', expected_cost: '', category_id: '', quantity: '', unit: '' });
        setIsAddingComponent(false);
    };

    const handleAddSettlement = async () => {
        const amountNum = parseFloat(newSettlementData.amount) || 0;
        if (!selectedPlanId || !amountNum) return;
        await addSettlement({
            plan_id: selectedPlanId,
            channel_id: newSettlementData.channel_id,
            amount: amountNum
        });
        setNewSettlementData({ amount: '', wallet_id: '', channel_id: '' });
        setIsAddingSettlement(false);
    };

    const handleUpdateSettlement = async () => {
        if (!editingSettlement) return;
        const amountNum = parseFloat(newSettlementData.amount) || 0;
        await updatePlan(selectedPlanId!, {}); // Trigger reload
        // Logic should really be in context, but for now we follow the pattern
        // add more specific update functions if needed.
        // Wait, updateSettlement is needed in context. Let's check.
    };

    const handlePickItem = (component: PlanComponent) => {
        if (selectedPlan?.status === 'FINALIZED') return;
        setEditingComponent(component);
        setPickupData({
            final_cost: component.final_cost != null ? component.final_cost.toString() : (component.expected_cost || '').toString(),
            quantity: component.quantity != null ? component.quantity.toString() : ''
        });
    };

    const handleSavePickup = async () => {
        if (!editingComponent) return;
        await updateComponent(editingComponent.id, {
            final_cost: parseFloat(pickupData.final_cost) || 0,
            quantity: editingComponent.component_type === 'QUANTIFIED' ? (parseFloat(pickupData.quantity) || 0) : editingComponent.quantity
        });
        setEditingComponent(null);
    };

    const handleEditSettlement = (s: PlanSettlement) => {
        const channel = walletsWithBalances.flatMap(w => w.channels).find(ch => ch.id === s.channel_id);
        const wallet = walletsWithBalances.find(w => w.id === channel?.wallet_id);

        setEditingSettlement(s);
        setNewSettlementData({
            amount: s.amount.toString(),
            wallet_id: wallet?.id || '',
            channel_id: s.channel_id
        });
        setIsAddingSettlement(true);
    };

    if (selectedPlan) {
        return (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button onClick={handleBack} className="p-3 bg-[var(--surface-deep)] rounded-2xl border border-[var(--border-glass)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-95">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex flex-col items-center">
                        <h2 className="text-xl font-black tracking-tighter text-gradient">{selectedPlan.title}</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/80">{selectedPlan.plan_type} PLAN</span>
                    </div>
                    <button className="p-3 bg-[var(--surface-deep)] rounded-2xl border border-[var(--border-glass)] text-[var(--text-muted)] transition-all opacity-0 pointer-events-none">
                        <MoreVertical size={20} />
                    </button>
                </div>

                {/* Plan Summary Card */}
                <GlassCard className="bg-gradient-to-br from-blue-600/10 to-purple-600/5 border-blue-500/20">
                    <div className="grid grid-cols-2 gap-y-6 gap-x-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Total Budget</span>
                            <span className="text-2xl font-black text-gradient">
                                {getCurrencySymbol(settings.currency)}{calculateTotalCost(selectedPlan).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Settled Cash</span>
                            <span className="text-2xl font-black text-emerald-500">
                                {getCurrencySymbol(settings.currency)}{calculateTotalSettled(selectedPlan).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 pt-4 border-t border-[var(--border-glass)]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/80">Total Picked</span>
                            <span className="text-xl font-black text-[var(--text-main)] italic">
                                {getCurrencySymbol(settings.currency)}{calculateTotalPicked(selectedPlan).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 items-end pt-4 border-t border-[var(--border-glass)]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Remaining Gap</span>
                            <span className="text-xl font-black text-amber-500/80">
                                {getCurrencySymbol(settings.currency)}{(calculateTotalPicked(selectedPlan) - calculateTotalSettled(selectedPlan)).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--border-glass)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-blue-500" />
                            <span className="text-xs text-[var(--text-muted)] font-medium">Created {format(safeDate(selectedPlan.updated_at), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${selectedPlan.status === 'FINALIZED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                                {selectedPlan.status}
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Components Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Package size={18} className="text-blue-500" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Plan Components</h3>
                        </div>
                        {selectedPlan.status !== 'FINALIZED' && (
                            <button
                                onClick={() => setIsAddingComponent(true)}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
                            >
                                <Plus size={14} /> Add item
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        {(selectedPlan.components || []).length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-glass)] rounded-3xl opacity-40">
                                <Layers size={32} className="mb-2" />
                                <p className="text-xs font-medium">No components added yet</p>
                            </div>
                        ) : (
                            selectedPlan.components.map((component: PlanComponent) => (
                                <div key={component.id} className="relative group overflow-hidden rounded-3xl">
                                    <GlassCard
                                        onClick={() => handlePickItem(component)}
                                        className={`p-3 border-l-0 hover:border-blue-500/30 transition-all duration-500 relative ${selectedPlan.status !== 'FINALIZED' ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                                    >
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-2xl rounded-full" />
                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                                    <Target size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-[var(--text-main)] text-sm">{component.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest">{component.component_type}</span>
                                                        {component.component_type === 'QUANTIFIED' && component.quantity && (
                                                            <span className="text-[9px] font-black text-[var(--text-muted)] bg-[var(--surface-deep)] px-1.5 py-0.5 rounded-lg border border-[var(--border-glass)] uppercase tracking-tighter">
                                                                {component.quantity} {component.unit}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end transition-transform duration-500 group-hover:-translate-x-14">
                                                <span className={`font-black transition-colors ${component.final_cost != null ? 'text-emerald-500' : 'text-[var(--text-main)] group-hover:text-blue-500'}`}>
                                                    {getCurrencySymbol(settings.currency)}{(component.final_cost != null ? component.final_cost : component.expected_cost || 0).toLocaleString()}
                                                </span>
                                                {component.final_cost == null ? (
                                                    <span className="text-[10px] font-medium text-[var(--text-muted)] italic">Estimated</span>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-emerald-500">
                                                        <CheckCircle2 size={10} />
                                                        <span className="text-[10px] font-black uppercase tracking-tighter">Picked</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Dynamic Action Overlay - Slide from Right */}
                                        {selectedPlan.status !== 'FINALIZED' && (
                                            <div className="absolute top-0 right-0 h-full flex translate-x-[102%] group-hover:translate-x-0 transition-transform duration-500 ease-out z-20 rounded-l-3xl overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.2)]">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteComponent(component.id);
                                                    }}
                                                    className="h-full px-6 bg-gradient-to-b from-rose-500 to-rose-600 text-white flex items-center justify-center active:scale-95 transition-transform"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </GlassCard>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Settlement Section */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Wallet size={18} className="text-emerald-500" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Settlements</h3>
                        </div>
                        {selectedPlan.status !== 'FINALIZED' && (
                            <button
                                onClick={() => {
                                    setNewSettlementData({ amount: '', wallet_id: '', channel_id: '' });
                                    setEditingSettlement(null);
                                    setIsAddingSettlement(true);
                                }}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                            >
                                <Plus size={14} /> Add split
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        {(selectedPlan.settlements || []).length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-glass)] rounded-3xl opacity-40">
                                <CreditCard size={32} className="mb-2" />
                                <p className="text-xs font-medium">No settlements added yet</p>
                            </div>
                        ) : (
                            selectedPlan.settlements.map((s: PlanSettlement) => {
                                const channel = walletsWithBalances.flatMap(w => w.channels).find(ch => ch.id === s.channel_id);
                                const wallet = walletsWithBalances.find(w => w.id === channel?.wallet_id);

                                let Icon = CreditCard;
                                if (channel?.type === 'CASH') Icon = Banknote;
                                else if (channel?.type === 'BANK') Icon = Landmark;
                                else if (channel?.type === 'MOBILE_MONEY') Icon = Smartphone;

                                return (
                                    <div key={s.id} className="relative group/settle overflow-hidden rounded-3xl">
                                        <GlassCard className="p-2.5 border-l-0 border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-500 group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform shadow-emerald-500/10 shadow-lg">
                                                        <Icon size={20} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest leading-none mb-1">
                                                            {wallet?.name || 'Unknown Wallet'}
                                                        </span>
                                                        <span className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5">
                                                            {channel?.type || 'Unknown Channel'}
                                                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right transition-transform duration-500 group-hover/settle:-translate-x-28">
                                                    <span className="block font-black text-emerald-500 text-lg tracking-tight">
                                                        {getCurrencySymbol(settings.currency)}{s.amount.toLocaleString()}
                                                    </span>
                                                    <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-60">Allocated</span>
                                                </div>
                                            </div>

                                            {/* Slide-in Actions for Settlement */}
                                            {selectedPlan.status !== 'FINALIZED' && (
                                                <div className="absolute top-0 right-0 h-full flex translate-x-[102%] group-hover/settle:translate-x-0 transition-transform duration-500 ease-out z-20 rounded-l-3xl overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.2)]">
                                                    <button
                                                        onClick={() => handleEditSettlement(s)}
                                                        className="h-full px-5 bg-gradient-to-b from-blue-500 to-blue-600 text-white flex items-center justify-center active:bg-blue-700"
                                                    >
                                                        <Target size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteSettlement(s.id)}
                                                        className="h-full px-5 bg-gradient-to-b from-rose-500 to-rose-600 text-white flex items-center justify-center active:bg-rose-700"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </GlassCard>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Finalization Button */}
                {selectedPlan.status !== 'FINALIZED' && (
                    <div className="mt-4 px-2">
                        <button
                            onClick={() => allPicked && finalizePlan(selectedPlan.id)}
                            disabled={!allPicked}
                            className={`w-full py-4 text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl border-t border-white/20 flex items-center justify-center gap-2 transition-all group ${allPicked ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20 active:scale-95' : 'bg-gray-500/20 text-gray-500 cursor-not-allowed opacity-50'}`}
                        >
                            {allPicked ? <Sparkles size={20} className="group-hover:animate-spin-slow" /> : <AlertCircle size={20} />}
                            {allPicked ? 'Finalize Intent' : 'Complete Pickup First'}
                        </button>
                        <p className={`text-[10px] text-center mt-3 font-medium flex items-center justify-center gap-1 ${allPicked ? 'text-[var(--text-muted)]' : 'text-amber-500'}`}>
                            {allPicked ? (
                                <><ShieldCheck size={10} className="text-blue-500" /> This will generate transactions and update balances atomically.</>
                            ) : (
                                <><AlertCircle size={10} /> All plan items must be "Picked" before finalization.</>
                            )}
                        </p>
                    </div>
                )}

                {/* Modal Overlays for details view */}
                {isAddingComponent && (
                    <div className="fixed inset-0 w-screen h-screen z-[500] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
                        <GlassCard className={`w-full max-w-lg bg-[var(--surface-overlay)] border border-[var(--border-glass)] shadow-2xl relative overflow-hidden transition-all duration-500 ease-in-out ${showCatPicker ? 'h-[96vh]' : 'max-h-[96vh]'}`}>
                            <div className="flex flex-col gap-6 p-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black tracking-tight text-gradient uppercase italic">Add Resource</h3>
                                    <button onClick={() => setIsAddingComponent(false)} className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
                                        <Plus className="rotate-45" size={24} />
                                    </button>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-500">Resource Descriptor</label>
                                        <AutocompleteInput
                                            value={newCompData.name}
                                            onChange={(val) => setNewCompData({ ...newCompData, name: val })}
                                            fetchSuggestions={searchPlanSuggestions}
                                            placeholder="e.g. Master Bedroom Painting"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <div className="w-full">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 block">Est. Cost</label>
                                            <input
                                                type="number"
                                                value={newCompData.expected_cost}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCompData({ ...newCompData, expected_cost: e.target.value })}
                                                placeholder="0.00"
                                                className="w-full bg-[var(--surface-deep)] border border-[var(--border-glass)] rounded-2xl p-4 text-[var(--text-main)] font-black"
                                            />
                                        </div>

                                        <div className="w-full">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 block">Category</label>
                                            <button
                                                onClick={() => setShowCatPicker(true)}
                                                className="w-full bg-[var(--surface-deep)] border border-[var(--border-glass)] rounded-2xl p-4 flex items-center justify-between group hover:border-blue-500/30 transition-all text-left"
                                            >
                                                {newCompData.category_id ? (
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg"
                                                            style={{ backgroundColor: categories.find(c => c.id === newCompData.category_id)?.color }}
                                                        >
                                                            {(() => {
                                                                const iconName = categories.find(c => c.id === newCompData.category_id)?.icon;
                                                                const Icon = ICON_MAP[iconName || 'Package'] || ICON_MAP['Package'];
                                                                // @ts-ignore
                                                                return React.isValidElement(Icon) ? React.cloneElement(Icon, { size: 16, className: 'text-white' }) : Icon;
                                                            })()}
                                                        </div>
                                                        <span className="font-bold text-[var(--text-main)]">
                                                            {categories.find(c => c.id === newCompData.category_id)?.name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[var(--text-muted)] font-bold">Select Category</span>
                                                )}
                                                <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-blue-500 transition-colors rotate-90" />
                                            </button>
                                        </div>

                                        {/* HIGH-FIDELITY OVERLAY PICKER */}
                                        {showCatPicker && (
                                            <div className="absolute inset-0 z-50 bg-[var(--surface-overlay)] flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500 rounded-[40px] transition-colors overflow-hidden">
                                                {/* Picker Header - Fixed Height & High Z-Index */}
                                                <div className="px-8 py-5 flex items-center justify-between border-b border-[var(--border-glass)] bg-[var(--surface-overlay)] backdrop-blur-2xl z-30 transition-colors shrink-0">
                                                    <div>
                                                        <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter transition-colors">Taxonomy Index</h2>
                                                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1 transition-colors">Deep Classification</p>
                                                    </div>
                                                    <button
                                                        onClick={() => { setShowCatPicker(false); setSearchCat(''); }}
                                                        className="p-4 rounded-2xl bg-[var(--surface-deep)] border border-[var(--border-glass)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all shadow-lg active:scale-95"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                {/* Search Control - Static Area */}
                                                <div className="px-8 pb-4 pt-8 bg-[var(--surface-overlay)]/50 backdrop-blur-md z-20 shrink-0">
                                                    <div className="relative group">
                                                        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" />
                                                        <input
                                                            autoFocus
                                                            placeholder="Search system segments..."
                                                            className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-[24px] py-5 pl-14 pr-6 text-xs font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-[var(--text-dim)] text-[var(--text-main)] shadow-inner"
                                                            value={searchCat}
                                                            onChange={(e) => setSearchCat(e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Unified Hierarchy List - The Only Scrollable Part */}
                                                <div className="flex-1 overflow-y-auto px-8 pb-20 no-scrollbar space-y-6">
                                                    {groupedCategories.length === 0 ? (
                                                        <div className="py-20 text-center space-y-4">
                                                            <div className="w-20 h-20 bg-[var(--input-bg)] rounded-full flex items-center justify-center mx-auto border border-dashed border-[var(--border-glass)] opacity-40">
                                                                <Search size={32} className="text-[var(--text-muted)]" />
                                                            </div>
                                                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest transition-colors">No matching segments found</p>
                                                        </div>
                                                    ) : (
                                                        groupedCategories.map(group => (
                                                            <div key={group.root.id} className="space-y-2">
                                                                {/* Parent Section Header - Sticky WITHIN the scrollable area */}
                                                                <div className="flex items-center gap-3 sticky top-0 bg-[var(--surface-overlay)] py-2 z-10 transition-colors">
                                                                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/10 shadow-sm">
                                                                        {ICON_MAP[group.root.icon || 'Package'] || <Layers size={18} />}
                                                                    </div>
                                                                    <h5 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] transition-colors">{group.root.name}</h5>
                                                                    <div className="flex-1 h-[1px] bg-gradient-to-r from-[var(--border-glass)] to-transparent" />
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-1">
                                                                    {/* The Parent itself as an option */}
                                                                    <button
                                                                        onClick={() => {
                                                                            setNewCompData({ ...newCompData, category_id: group.root.id });
                                                                            setShowCatPicker(false);
                                                                            setSearchCat('');
                                                                        }}
                                                                        className={`group relative w-full flex items-center gap-3 p-3 rounded-[24px] border transition-all duration-300 ${newCompData.category_id === group.root.id ? 'bg-blue-600 border-blue-400 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)]' : 'bg-[var(--surface-deep)]/40 border-[var(--border-glass)] text-[var(--text-muted)] hover:bg-[var(--surface-deep)]/80 hover:border-blue-500/30'}`}
                                                                    >
                                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${newCompData.category_id === group.root.id ? 'bg-white/20' : 'bg-[var(--surface-deep)] shadow-inner'}`}>
                                                                            {ICON_MAP[group.root.icon || 'Package'] || <Layers size={20} />}
                                                                        </div>
                                                                        <span className={`text-base font-bold ${newCompData.category_id === group.root.id ? 'text-white' : 'text-[var(--text-main)] transition-colors'}`}>General {group.root.name}</span>
                                                                        {newCompData.category_id === group.root.id && <Check size={20} className="ml-auto" />}
                                                                    </button>

                                                                    {/* Sub-categories */}
                                                                    {group.children.map(child => (
                                                                        <button
                                                                            key={child.id}
                                                                            onClick={() => {
                                                                                setNewCompData({ ...newCompData, category_id: child.id });
                                                                                setShowCatPicker(false);
                                                                                setSearchCat('');
                                                                            }}
                                                                            className={`group relative w-full flex items-center gap-3 p-3 rounded-[24px] border transition-all duration-300 ${newCompData.category_id === child.id ? 'bg-blue-600 border-blue-400 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)]' : 'bg-transparent border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-deep)]/40 hover:border-[var(--border-glass)]'}`}
                                                                        >
                                                                            <div className="w-12 h-12 flex items-center justify-center">
                                                                                <div className={`w-1.5 h-1.5 rounded-full ${newCompData.category_id === child.id ? 'bg-white' : 'bg-[var(--border-glass)] group-hover:bg-blue-500 transition-colors'}`} />
                                                                            </div>
                                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${newCompData.category_id === child.id ? 'bg-white/10' : 'bg-[var(--surface-deep)] border border-[var(--border-glass)]'}`}>
                                                                                {ICON_MAP[child.icon || 'Tag'] || <Tag size={18} />}
                                                                            </div>
                                                                            <span className={`text-base font-medium ${newCompData.category_id === child.id ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors'}`}>{child.name}</span>
                                                                            {newCompData.category_id === child.id && <Check size={20} className="ml-auto" />}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {(['QUANTIFIED', 'ABSTRACT'] as ComponentType[]).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setNewCompData({ ...newCompData, component_type: t })}
                                                className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${newCompData.component_type === t ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[var(--surface-deep)] border-[var(--border-glass)] text-[var(--text-muted)]'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>

                                    {newCompData.component_type === 'QUANTIFIED' && (
                                        <div className="flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 block">QTY</label>
                                                <input
                                                    type="number"
                                                    value={newCompData.quantity}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCompData({ ...newCompData, quantity: e.target.value })}
                                                    placeholder="0"
                                                    className="w-full bg-[var(--surface-deep)] border border-[var(--border-glass)] rounded-2xl p-4 text-[var(--text-main)] font-black"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 block">Unit</label>
                                                <input
                                                    value={newCompData.unit}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCompData({ ...newCompData, unit: e.target.value })}
                                                    placeholder="e.g. kg, pcs"
                                                    className="w-full bg-[var(--surface-deep)] border border-[var(--border-glass)] rounded-2xl p-4 text-[var(--text-main)] font-bold outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleAddComponent}
                                    disabled={!newCompData.name || !newCompData.category_id}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-30 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/10 transition-all"
                                >
                                    Commit Component
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {isAddingSettlement && (
                    <div className="fixed inset-0 w-screen h-screen z-[510] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
                        <GlassCard className={`w-full max-w-lg bg-[var(--surface-overlay)] border-[var(--border-glass)] shadow-2xl relative overflow-hidden transition-all duration-500 ease-in-out ${showWalletPickerSettlement || showChannelPickerSettlement ? 'h-[96vh]' : 'h-auto'}`}>
                            <div className="flex flex-col gap-6 p-2 h-full">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black tracking-tight text-gradient uppercase italic">{editingSettlement ? 'Edit Authorization' : 'Authorize Settlement'}</h3>
                                    <button onClick={() => { setIsAddingSettlement(false); setEditingSettlement(null); setShowWalletPickerSettlement(false); setShowChannelPickerSettlement(false); setShowCalculator(false); }} className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
                                        <Plus className="rotate-45" size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                                    {/* Premium Summary Cards */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[var(--surface-deep)]/40 border border-[var(--border-glass)] rounded-[24px] p-5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <Wallet size={24} className="text-[var(--text-main)]" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] block mb-2">Total Pickup</span>
                                            <span className="text-xl font-black text-[var(--text-main)] tracking-tighter">
                                                {getCurrencySymbol(settings.currency)}{selectedPlan ? calculateTotalPicked(selectedPlan).toLocaleString() : 0}
                                            </span>
                                        </div>
                                        <div className="bg-[var(--surface-deep)]/40 border border-[var(--border-glass)] rounded-[24px] p-5 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <Target size={24} className="text-emerald-500" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-2 block">Outstanding</span>
                                            <span className={`text-xl font-black tracking-tighter transition-colors ${(selectedPlan ? (calculateTotalPicked(selectedPlan) - calculateTotalSettled(selectedPlan) - (parseFloat(newSettlementData.amount) || 0)) : 0) < 0
                                                ? 'text-rose-500'
                                                : 'text-emerald-500'
                                                }`}>
                                                {getCurrencySymbol(settings.currency)}{selectedPlan ? Math.max(0, (calculateTotalPicked(selectedPlan) - calculateTotalSettled(selectedPlan) - (parseFloat(newSettlementData.amount) || 0))).toLocaleString() : 0}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Amount Allocation Section */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 px-1">Authorization Amount</label>
                                        <div className="relative group/input">
                                            <input
                                                type="number"
                                                value={newSettlementData.amount}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSettlementData({ ...newSettlementData, amount: e.target.value })}
                                                placeholder="0.00"
                                                onClick={() => {
                                                    if (!isDesktop) {
                                                        setCalcTarget('SETTLEMENT');
                                                        setShowCalculator(true);
                                                    }
                                                }}
                                                className="w-full bg-[var(--surface-deep)]/60 border border-[var(--border-glass)] rounded-[28px] p-6 text-[var(--text-main)] font-black text-4xl outline-none focus:border-emerald-500/30 transition-all text-center placeholder:opacity-5"
                                            />
                                            <button
                                                onClick={() => {
                                                    setCalcTarget('SETTLEMENT');
                                                    setShowCalculator(!showCalculator);
                                                }}
                                                className={`absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-2xl border transition-all ${showCalculator && calcTarget === 'SETTLEMENT' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-[var(--surface-overlay)] border-[var(--border-glass)] text-emerald-500 hover:text-white hover:bg-emerald-600'}`}
                                            >
                                                <Calculator size={20} />
                                            </button>
                                        </div>

                                        {/* Inline Calculator for Settlement */}
                                        {showCalculator && calcTarget === 'SETTLEMENT' && (
                                            <div className="animate-in slide-in-from-top-4 duration-500">
                                                <div className="relative overflow-hidden rounded-[32px] p-1.5 shadow-[0_30px_60px_rgba(0,0,0,0.4)] transition-all">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/95 via-black/95 to-[#1a1a1a]/95 backdrop-blur-[50px] border border-white/10 rounded-[32px] z-0" />
                                                    <div className="grid grid-cols-4 gap-2 relative z-10 p-3">
                                                        {[
                                                            { label: 'C', key: 'C', type: 'danger' },
                                                            { label: '÷', key: '/', type: 'operator' },
                                                            { label: '×', key: '*', type: 'operator' },
                                                            { label: '⌫', key: 'Backspace', type: 'tool' },
                                                            { label: '7', key: '7' }, { label: '8', key: '8' }, { label: '9', key: '9' }, { label: '-', key: '-', type: 'operator' },
                                                            { label: '4', key: '4' }, { label: '5', key: '5' }, { label: '6', key: '6' }, { label: '+', key: '+', type: 'operator' },
                                                            { label: '1', key: '1' }, { label: '2', key: '2' }, { label: '3', key: '3' }, { label: 'EXE', key: 'Enter', type: 'action' },
                                                            { label: '0', key: '0', span: 2 }, { label: '.', key: '.' },
                                                        ].map((btn, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    const currentAmt = newSettlementData.amount || '';
                                                                    if (btn.key === 'Enter') {
                                                                        const res = safeEvaluate(currentAmt);
                                                                        if (res) setNewSettlementData({ ...newSettlementData, amount: res });
                                                                        setShowCalculator(false);
                                                                    } else if (btn.key === 'C') {
                                                                        setNewSettlementData({ ...newSettlementData, amount: '' });
                                                                    } else if (btn.key === 'Backspace') {
                                                                        setNewSettlementData({ ...newSettlementData, amount: currentAmt.slice(0, -1) });
                                                                    } else {
                                                                        setNewSettlementData({ ...newSettlementData, amount: currentAmt + btn.key });
                                                                    }
                                                                }}
                                                                className={`h-12 rounded-2xl font-black text-base transition-all active:scale-95 border ${btn.span === 2 ? 'col-span-2' : ''} ${btn.type === 'action' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-white'}`}
                                                            >
                                                                {btn.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* High-Fidelity Picker Triggers */}
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 px-1">Source Account</label>
                                            <button
                                                onClick={() => setShowWalletPickerSettlement(true)}
                                                className="w-full flex items-center gap-4 p-5 rounded-[28px] bg-[var(--surface-deep)]/60 border border-[var(--border-glass)] hover:border-emerald-500/30 transition-all text-left group"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-overlay)] flex items-center justify-center border border-[var(--border-glass)] text-emerald-500 group-hover:scale-110 transition-transform">
                                                    {newSettlementData.wallet_id ? (
                                                        ICON_MAP[walletsWithBalances.find(w => w.id === newSettlementData.wallet_id)?.icon || 'Wallet'] || <Wallet size={20} />
                                                    ) : (
                                                        <Wallet size={20} />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Active Wallet</p>
                                                    <h4 className="text-sm font-black text-[var(--text-main)] transition-colors">
                                                        {newSettlementData.wallet_id ? walletsWithBalances.find(w => w.id === newSettlementData.wallet_id)?.name : 'Select Exit Point'}
                                                    </h4>
                                                </div>
                                                <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-emerald-500 transition-colors" />
                                            </button>
                                        </div>

                                        {newSettlementData.wallet_id && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-500">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 px-1">Settlement Channel</label>
                                                <button
                                                    onClick={() => setShowChannelPickerSettlement(true)}
                                                    className="w-full flex items-center gap-4 p-5 rounded-[28px] bg-[var(--surface-deep)]/60 border border-[var(--border-glass)] hover:border-emerald-500/30 transition-all text-left group"
                                                >
                                                    <div className="w-12 h-12 rounded-2xl bg-[var(--surface-overlay)] flex items-center justify-center border border-[var(--border-glass)] text-emerald-500 group-hover:scale-110 transition-transform">
                                                        <CreditCard size={20} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Execution Path</p>
                                                        <h4 className="text-sm font-black text-[var(--text-main)] transition-colors">
                                                            {newSettlementData.channel_id ? walletsWithBalances.find(w => w.id === newSettlementData.wallet_id)?.channels.find(ch => ch.id === newSettlementData.channel_id)?.type : 'Select Path'}
                                                        </h4>
                                                    </div>
                                                    <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-emerald-500 transition-colors" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-[var(--border-glass)]">
                                    <button
                                        onClick={editingSettlement ? async () => {
                                            const amountNum = parseFloat(newSettlementData.amount) || 0;
                                            if (!amountNum) return;
                                            await deleteSettlement(editingSettlement.id);
                                            await addSettlement({
                                                plan_id: selectedPlanId!,
                                                channel_id: newSettlementData.channel_id,
                                                amount: amountNum
                                            });
                                            setIsAddingSettlement(false);
                                            setEditingSettlement(null);
                                            setNewSettlementData({ amount: '', wallet_id: '', channel_id: '' });
                                        } : handleAddSettlement}
                                        disabled={!newSettlementData.amount || !newSettlementData.wallet_id || !newSettlementData.channel_id}
                                        className={`w-full py-5 rounded-[32px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl transition-all flex items-center justify-center gap-3 ${editingSettlement ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20'} disabled:opacity-30 active:scale-95`}
                                    >
                                        {editingSettlement ? <Check size={20} /> : <ShieldCheck size={20} />}
                                        <span>{editingSettlement ? 'Finalize Edit' : 'Authorize Intent'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* HIGH-FIDELITY WALLET PICKER OVERLAY */}
                            {showWalletPickerSettlement && (
                                <div className="absolute inset-0 z-50 bg-[var(--surface-overlay)] flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500 transition-colors">
                                    <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-glass)] bg-[var(--surface-overlay)]/80 backdrop-blur-xl sticky top-0 z-10">
                                        <div>
                                            <h2 className="text-xl font-black text-[var(--text-main)] tracking-tighter">Exit Points</h2>
                                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Select Source Account</p>
                                        </div>
                                        <button onClick={() => setShowWalletPickerSettlement(false)} className="p-3 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-glass)] text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="px-6 py-8 flex-1 overflow-y-auto no-scrollbar space-y-3">
                                        {walletsWithBalances.map(w => (
                                            <button
                                                key={w.id}
                                                onClick={() => {
                                                    setNewSettlementData({ ...newSettlementData, wallet_id: w.id, channel_id: '' });
                                                    setShowWalletPickerSettlement(false);
                                                }}
                                                className={`w-full flex items-center gap-4 p-4 rounded-[28px] border transition-all duration-300 ${newSettlementData.wallet_id === w.id ? 'bg-emerald-600 border-emerald-400 shadow-xl shadow-emerald-500/20' : 'bg-[var(--surface-deep)] border-[var(--border-glass)] hover:border-emerald-500/30'}`}
                                            >
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${newSettlementData.wallet_id === w.id ? 'bg-white/20 text-white' : 'bg-[var(--surface-overlay)] text-emerald-500 border border-[var(--border-glass)]'}`}>
                                                    {ICON_MAP[w.icon] || <Landmark size={20} />}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <h4 className={`text-sm font-black ${newSettlementData.wallet_id === w.id ? 'text-white' : 'text-[var(--text-main)]'}`}>{w.name}</h4>
                                                    <p className={`text-[10px] font-black uppercase ${newSettlementData.wallet_id === w.id ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
                                                        {getCurrencySymbol(w.currency)}{w.currentBalance.toLocaleString()}
                                                    </p>
                                                </div>
                                                {newSettlementData.wallet_id === w.id && <Check size={20} className="text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* HIGH-FIDELITY CHANNEL PICKER OVERLAY */}
                            {showChannelPickerSettlement && (
                                <div className="absolute inset-0 z-50 bg-[var(--surface-overlay)] flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500 transition-colors">
                                    <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-glass)] bg-[var(--surface-overlay)]/80 backdrop-blur-xl sticky top-0 z-10">
                                        <div>
                                            <h2 className="text-xl font-black text-[var(--text-main)] tracking-tighter">Execution Paths</h2>
                                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Select Settlement Method</p>
                                        </div>
                                        <button onClick={() => setShowChannelPickerSettlement(false)} className="p-3 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-glass)] text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="px-6 py-8 flex-1 overflow-y-auto no-scrollbar space-y-3">
                                        {walletsWithBalances.find(w => w.id === newSettlementData.wallet_id)?.channels.map(ch => (
                                            <button
                                                key={ch.id}
                                                onClick={() => {
                                                    setNewSettlementData({ ...newSettlementData, channel_id: ch.id });
                                                    setShowChannelPickerSettlement(false);
                                                }}
                                                className={`w-full flex items-center gap-4 p-4 rounded-[28px] border transition-all duration-300 ${newSettlementData.channel_id === ch.id ? 'bg-emerald-600 border-emerald-400 shadow-xl shadow-emerald-500/20' : 'bg-[var(--surface-deep)] border-[var(--border-glass)] hover:border-emerald-500/30'}`}
                                            >
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${newSettlementData.channel_id === ch.id ? 'bg-white/20 text-white' : 'bg-[var(--surface-overlay)] text-emerald-500 border border-[var(--border-glass)]'}`}>
                                                    <CreditCard size={20} />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <h4 className={`text-sm font-black uppercase tracking-widest ${newSettlementData.channel_id === ch.id ? 'text-white' : 'text-[var(--text-main)]'}`}>{ch.type}</h4>
                                                    <p className={`text-[9px] font-black uppercase ${newSettlementData.channel_id === ch.id ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>Authorized Connection</p>
                                                </div>
                                                {newSettlementData.channel_id === ch.id && <Check size={20} className="text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </GlassCard>
                    </div>
                )}

                {editingComponent && (
                    <div className="fixed inset-0 w-screen h-screen z-[510] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
                        <GlassCard className="w-full max-w-lg bg-[var(--surface-overlay)] border-[var(--border-glass)] shadow-2xl">
                            <div className="flex flex-col gap-6 p-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black tracking-tight text-gradient uppercase italic">Update Resource</h3>
                                    <button onClick={() => setEditingComponent(null)} className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
                                        <Plus className="rotate-45" size={24} />
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{editingComponent.component_type} RESOURCE</span>
                                    <h4 className="text-2xl font-black text-[var(--text-main)] italic">{editingComponent.name}</h4>
                                    <span className="text-xs font-bold text-[var(--text-muted)] tracking-tighter uppercase">Initial Est: {getCurrencySymbol(settings.currency)}{editingComponent.expected_cost?.toLocaleString()}</span>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-500">Pickup Amount (Actual Cost)</label>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-xl z-10">{getCurrencySymbol(settings.currency)}</span>

                                            {/* Calculator Toggle for Desktop */}
                                            {isDesktop && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCalculator(!showCalculator)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/5 border border-white/10 rounded-xl text-cyan-500 hover:text-white hover:bg-cyan-600 transition-all z-20"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <Calculator size={18} className="relative z-10" />
                                                </button>
                                            )}

                                            <input
                                                autoFocus={isDesktop}
                                                inputMode={isDesktop ? "decimal" : "none"}
                                                readOnly={!isDesktop}
                                                type="text"
                                                value={pickupData.final_cost}
                                                onChange={(e) => {
                                                    if (!isDesktop) return;
                                                    const val = e.target.value.replace(/[^0-9.+\-*/]/g, '');
                                                    setPickupData({ ...pickupData, final_cost: val });
                                                }}
                                                onClick={() => {
                                                    if (!isDesktop) {
                                                        // Ensure value is string
                                                        setPickupData((prev: any) => ({ ...prev, final_cost: prev.final_cost || '' }));
                                                        setShowCalculator(true);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (isDesktop && /[+\-*/]/.test(pickupData.final_cost)) {
                                                        const res = safeEvaluate(pickupData.final_cost);
                                                        if (res) setPickupData({ ...pickupData, final_cost: res });
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        if (/[+\-*/]/.test(pickupData.final_cost)) {
                                                            e.preventDefault();
                                                            const res = safeEvaluate(pickupData.final_cost);
                                                            if (res) setPickupData({ ...pickupData, final_cost: res });
                                                        }
                                                    } else if (e.key === ' ' && !pickupData.final_cost && isDesktop) {
                                                        e.preventDefault();
                                                        setShowCalculator(true);
                                                    }
                                                }}
                                                placeholder="0.00"
                                                className="w-full bg-[var(--surface-deep)] border border-[var(--border-glass)] rounded-2xl p-4 pl-10 text-[var(--text-main)] font-black text-2xl outline-none focus:border-blue-500/50 transition-all"
                                            />
                                        </div>

                                        {/* Inline Expandable Premium Glass Keypad for Pickup */}
                                        <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${showCalculator ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0 pt-0'}`}>
                                            <div className="relative overflow-hidden rounded-[32px] p-1.5 shadow-[0_30px_60px_rgba(0,0,0,0.4)] transition-all">
                                                {/* Master Glass Board Background */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/95 via-black/95 to-[#1a1a1a]/95 backdrop-blur-[50px] border border-white/10 rounded-[32px] z-0" />
                                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent mix-blend-overlay z-0 pointer-events-none" />

                                                {/* Advanced Grid Overlay */}
                                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

                                                <div className="grid grid-cols-4 gap-2 relative z-10 p-3">
                                                    {[
                                                        { label: 'C', key: 'C', type: 'danger' },
                                                        { label: '÷', key: '/', type: 'operator' },
                                                        { label: '×', key: '*', type: 'operator' },
                                                        { label: '⌫', key: 'Backspace', type: 'tool' },
                                                        { label: '7', key: '7' }, { label: '8', key: '8' }, { label: '9', key: '9' }, { label: '-', key: '-', type: 'operator' },
                                                        { label: '4', key: '4' }, { label: '5', key: '5' }, { label: '6', key: '6' }, { label: '+', key: '+', type: 'operator' },
                                                        { label: '1', key: '1' }, { label: '2', key: '2' }, { label: '3', key: '3' }, { label: 'EXE', key: 'Enter', type: 'action' },
                                                        { label: '0', key: '0', span: 2 }, { label: '.', key: '.' },
                                                    ].map((btn, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                const currentAmt = pickupData.final_cost || '';
                                                                if (btn.key === 'Enter') {
                                                                    if (!currentAmt || currentAmt === '0') {
                                                                        setShowCalculator(false);
                                                                        return;
                                                                    }
                                                                    const res = safeEvaluate(currentAmt);
                                                                    if (res) setPickupData({ ...pickupData, final_cost: res });
                                                                    setShowCalculator(false);
                                                                } else if (btn.key === 'C') {
                                                                    setPickupData({ ...pickupData, final_cost: '' });
                                                                } else if (btn.key === 'Backspace') {
                                                                    setPickupData({ ...pickupData, final_cost: currentAmt.slice(0, -1) });
                                                                } else {
                                                                    setPickupData({ ...pickupData, final_cost: currentAmt + btn.key });
                                                                }
                                                            }}
                                                            className={`
                        h-14 rounded-[18px] font-black text-lg transition-all active:scale-95 relative overflow-hidden group/btn font-mono touch-manipulation select-none
                        ${btn.span === 2 ? 'col-span-2' : ''}
                        
                        /* Base Glass Style */
                        backdrop-blur-md shadow-lg border
                        
                        ${btn.type === 'operator'
                                                                    ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-200/20 text-indigo-300 shadow-[0_4px_16px_rgba(99,102,241,0.1)] hover:bg-white/10 hover:border-white/30 hover:text-white'
                                                                    : btn.type === 'danger'
                                                                        ? 'bg-gradient-to-br from-rose-500/10 to-red-500/10 border-rose-200/20 text-rose-300 shadow-[0_4px_16px_rgba(244,63,94,0.1)] hover:bg-red-500/20 hover:border-red-500/40 hover:text-white'
                                                                        : btn.type === 'action'
                                                                            ? 'bg-gradient-to-tr from-blue-600 to-violet-600 text-white border-white/20 shadow-[0_8px_30px_rgba(79,70,229,0.4)] hover:shadow-[0_12px_40px_rgba(79,70,229,0.6)] hover:brightness-110'
                                                                            : btn.type === 'tool'
                                                                                ? 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20 hover:text-white'
                                                                                : 'bg-gradient-to-br from-white/5 to-white/0 border-white/10 text-white hover:bg-white/10 hover:border-white/25 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                                                                }
                      `}
                                                        >
                                                            {/* Shine Effect */}
                                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                            {/* Ripple Effect */}
                                                            <div className="absolute inset-0 bg-white/20 scale-0 group-active/btn:scale-[2.0] rounded-full transition-transform duration-300" />

                                                            <span className="relative z-10 drop-shadow-md">{btn.label}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Footer Signature */}
                                                <div className="pb-3 pt-1 flex items-center justify-between relative z-10 opacity-40 pointer-events-none px-6">
                                                    <span className="text-[7px] font-mono tracking-[0.3em] font-black text-white/60">FISCAL AI</span>
                                                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3B82F6]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {editingComponent.component_type === 'QUANTIFIED' && (
                                        <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-blue-500">Real Quantity ({editingComponent.unit})</label>
                                            <input
                                                type="number"
                                                value={pickupData.quantity}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPickupData({ ...pickupData, quantity: e.target.value })}
                                                placeholder="0"
                                                className="w-full bg-[var(--surface-deep)] border border-[var(--border-glass)] rounded-2xl p-4 text-[var(--text-main)] font-black text-xl outline-none focus:border-blue-500/50"
                                            />
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleSavePickup}
                                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.25em] shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                                >
                                    <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" />
                                    Picked Item
                                </button>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={handleBack} className="p-3 bg-[var(--surface-deep)] rounded-2xl border border-[var(--border-glass)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-95">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-2xl font-black tracking-tighter text-gradient">Financial Plans</h1>
                <button
                    onClick={() => setIsAddingPlan(true)}
                    className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20 border-t border-white/20 hover:bg-blue-500 transition-all active:scale-95"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-[var(--surface-deep)] rounded-2xl border border-[var(--border-glass)] shadow-inner">
                <button
                    onClick={() => setActiveTabLocal('DRAFT')}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'DRAFT' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    Active Drafts
                </button>
                <button
                    onClick={() => setActiveTabLocal('FINALIZED')}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'FINALIZED' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                    Finalized
                </button>
            </div>

            {/* Plans List */}
            <div className="flex flex-col gap-2">
                {filteredPlans.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center opacity-40">
                        <Sparkles size={48} className="mb-4 text-blue-500" />
                        <p className="text-sm font-black uppercase tracking-widest">No {activeTab.toLowerCase()} plans</p>
                        <p className="text-xs mt-2 font-medium">Create a plan to track intent-based spending</p>
                    </div>
                ) : (
                    filteredPlans.map(plan => (
                        <GlassCard
                            key={plan.id}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className="p-4 flex flex-col gap-3 group hover:border-blue-500/40 cursor-pointer transition-all active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-lg font-black tracking-tight text-[var(--text-main)] group-hover:text-blue-500 transition-colors uppercase italic">{plan.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[8px] font-black uppercase tracking-widest text-blue-500">
                                            {plan.plan_type}
                                        </span>
                                        <span className="text-[10px] text-[var(--text-muted)] font-bold">{(plan.components || []).length} items</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xl font-black text-gradient">
                                        {getCurrencySymbol(settings.currency)}{calculateTotalCost(plan).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">
                                        Est. Total
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[var(--border-glass)] flex items-center justify-between text-[var(--text-muted)]">
                                <div className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    <span className="text-[10px] font-bold tracking-tight">{format(safeDate(plan.updated_at), 'MMM dd')}</span>
                                </div>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform text-blue-500" />
                            </div>
                        </GlassCard>
                    ))
                )}
            </div>

            {/* Modal Overlay for Add Plan */}
            {isAddingPlan && (
                <div className="fixed inset-0 w-screen h-screen z-[500] bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
                    <GlassCard className="w-full max-w-lg bg-[var(--surface-overlay)] border-[var(--border-glass)] shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex flex-col gap-6 p-2">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black tracking-tight text-gradient uppercase italic">New Strategy</h3>
                                <button onClick={() => setIsAddingPlan(false)} className="p-2 text-[var(--text-muted)] hover:text-white transition-colors">
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-500">Plan Authority Name</label>
                                    <AutocompleteInput
                                        value={newPlanData.title}
                                        onChange={(val) => setNewPlanData({ ...newPlanData, title: val })}
                                        fetchSuggestions={searchPlanSuggestions}
                                        placeholder="e.g. Q1 Expansion Plan"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-500">Plan Architecture</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['SHOPPING', 'TRAVEL', 'EVENT', 'CUSTOM'] as PlanType[]).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setNewPlanData({ ...newPlanData, plan_type: t })}
                                                className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${newPlanData.plan_type === t ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--surface-deep)] border-[var(--border-glass)] text-[var(--text-muted)] hover:text-white'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleCreatePlan}
                                disabled={!newPlanData.title}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-30 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                            >
                                Establish Intent
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

export default FinancialPlans;
