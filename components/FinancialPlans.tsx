
import React, { useState, useMemo, useEffect } from 'react';
import { useFeedback } from '../store/FeedbackContext';
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
    Search, ChevronRight, Tag, X, Check, Archive, AlertTriangle
} from 'lucide-react';
import DynamicDeleteModal from './modals/DynamicDeleteModal';
import { ICON_MAP } from '../constants';
import { FinancialPlan, PlanComponent, PlanSettlement, PlanStatus, PlanType, ComponentType } from '../types';
import { format } from 'date-fns';

const INTERNATIONAL_UNITS = [
    { group: 'Quantity', units: ['pcs', 'units', 'sets', 'pairs', 'dozens', 'gross', 'box', 'pack', 'bundle', 'roll', 'cartons', 'pallets'] },
    { group: 'Mass/Weight', units: ['kg', 'g', 'mg', 'lb', 'oz', 'ton', 'metric ton'] },
    { group: 'Volume', units: ['L', 'ml', 'm³', 'gal', 'qt', 'pt', 'fl oz', 'cup', 'tsp', 'tbsp'] },
    { group: 'Length/Distance', units: ['m', 'km', 'cm', 'mm', 'in', 'ft', 'yd', 'mi'] },
    { group: 'Area', units: ['m²', 'km²', 'ft²', 'ac', 'ha'] },
    { group: 'Time/Duration', units: ['sec', 'min', 'hr', 'day', 'week', 'month', 'year'] },
    { group: 'Digital/Data', units: ['B', 'KB', 'MB', 'GB', 'TB'] },
    { group: 'Energy/Power', units: ['Wh', 'kWh', 'W', 'kW', 'MW', 'hp', 'cal', 'kcal', 'BTU'] },
    { group: 'Other', units: ['service', 'session', 'trip', 'night', 'person', 'ticket'] }
];

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
    const { showFeedback } = useFeedback();

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

    // Grouping State
    const [groupingMemberIds, setGroupingMemberIds] = useState<string[]>([]);
    const [groupTag, setGroupTag] = useState('');
    const [showGroupSelector, setShowGroupSelector] = useState(false);
    const [highlightedComponentId, setHighlightedComponentId] = useState<string | null>(null);

    // Taxonomy Picker State
    const [showCatPicker, setShowCatPicker] = useState(false);
    const [searchCat, setSearchCat] = useState('');

    // Unit Picker State
    const [showUnitPicker, setShowUnitPicker] = useState(false);
    const [searchUnit, setSearchUnit] = useState('');

    // Deletion Modal State
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteType, setDeleteType] = useState<'plan' | 'component' | 'settlement' | null>(null);

    // Taxonomy Index Search Logic - Hierarchical
    const groupedCategories = useMemo(() => {
        const query = searchCat.toLowerCase().trim();
        const roots = categories.filter(c => !c.parentId && !c.isDisabled);

        return roots.map(root => {
            const children = categories.filter(c => c.parentId === root.id && !c.isDisabled);
            const rootMatches = root.name.toLowerCase().includes(query);
            const matchingChildren = children.filter(child => child.name.toLowerCase().includes(query));

            if (!query || rootMatches || matchingChildren.length > 0) {
                return {
                    root,
                    children: query && !rootMatches ? matchingChildren : children
                };
            }
            return null;
        }).filter((group) => group !== null);
    }, [categories, searchCat]);

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
        showFeedback('Financial plan created successfully.', 'success');
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
        showFeedback('Component added to plan.', 'success');
    };

    const handleAddSettlement = async () => {
        const amountNum = parseFloat(newSettlementData.amount) || 0;
        if (!selectedPlanId || !amountNum) return;

        // STRICT LIQUIDITY CHECK
        const wallet = walletsWithBalances.find(w => w.id === newSettlementData.wallet_id);
        if (wallet) {
            const channel = wallet.channels.find(c => c.id === newSettlementData.channel_id);
            // Fallback: If channel object missing (shouldn't happen), check map
            const channelBalance = wallet.channelBalances[channel?.type || ''] || 0;

            if (amountNum > channelBalance) {
                showFeedback(`Insufficient funds in ${channel?.type}. Available: ${getCurrencySymbol(wallet.currency)}${channelBalance.toLocaleString()}`, 'error');
                return;
            }
        }

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
        setHighlightedComponentId(null);

        // Resolve structural membership
        const parentId = component.group_parent_id || component.id;
        const members = selectedPlan?.components.filter(c =>
            c.id === parentId || c.group_parent_id === parentId
        ) || [];

        if (members.length > 1 || component.group_id) {
            setGroupingMemberIds(members.map(m => m.id));
            setGroupTag(members.find(m => m.group_id)?.group_id || '');
        } else {
            setGroupingMemberIds([component.id]);
            setGroupTag('');
        }

        setPickupData({
            final_cost: component.final_cost != null ? component.final_cost.toString() : (component.expected_cost || '').toString(),
            quantity: component.quantity != null ? component.quantity.toString() : ''
        });
    };

    const handleRedirectToParent = (parentId: string, sourceId: string) => {
        const parent = selectedPlan?.components.find(c => c.id === parentId);
        if (parent) {
            setEditingComponent(parent);
            setHighlightedComponentId(sourceId);

            // Strictly load members belonging to THIS parent
            const members = selectedPlan?.components.filter(c =>
                c.id === parentId || c.group_parent_id === parentId
            ) || [];

            setGroupingMemberIds(members.map(m => m.id));
            setGroupTag(parent.group_id || '');
            setPickupData({
                final_cost: parent.final_cost != null ? parent.final_cost.toString() : (parent.expected_cost || '').toString(),
                quantity: parent.quantity != null ? parent.quantity.toString() : ''
            });
        }
    };

    const handleSavePickup = async () => {
        if (!editingComponent) return;

        const totalCost = parseFloat(pickupData.final_cost) || 0;

        // Only apply grouping if we have multiple members or a specific tag
        const isActuallyGrouped = groupingMemberIds.length > 1 || groupTag.trim() !== '';
        // If it's grouped but has no tag, use the parent's ID as a hidden group_id to ensure persistence
        const finalGroupTag = isActuallyGrouped ? (groupTag.trim() || `group_${editingComponent.id}`) : undefined;

        // Update all members of the group
        for (let i = 0; i < groupingMemberIds.length; i++) {
            const id = groupingMemberIds[i];
            const comp = selectedPlan?.components.find(c => c.id === id);
            if (!comp) continue;

            const isParent = id === editingComponent.id;
            const costToAssign = isParent ? totalCost : 0;
            const isLast = i === groupingMemberIds.length - 1;

            await updateComponent(id, {
                final_cost: costToAssign,
                quantity: comp.component_type === 'QUANTIFIED' ? (parseFloat(pickupData.quantity) || 0) : comp.quantity,
                group_id: finalGroupTag || null,
                group_parent_id: (isActuallyGrouped && !isParent) ? editingComponent.id : null
            }, !isLast); // Only reload on the last item
        }

        setEditingComponent(null);
        setGroupingMemberIds([]);
        setGroupTag('');
        setHighlightedComponentId(null);
        showFeedback('Component cost verified.', 'success');
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

    return (
        <div className="flex flex-col gap-4 pt-4 animate-in fade-in duration-500 pb-20">
            {selectedPlan ? (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
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

                    {/* Tactical Overview Dashboard */}
                    <GlassCard className="bg-gradient-to-br from-blue-600/10 to-purple-600/5 border-blue-500/20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full translate-x-16 -translate-y-16" />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                            {/* Budget Utilization Ring */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative w-24 h-24">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="42" fill="transparent" stroke="var(--border-glass)" strokeWidth="8" />
                                        <circle
                                            cx="50" cy="50" r="42" fill="transparent" stroke="url(#blueGradient)" strokeWidth="8"
                                            strokeDasharray={263.89}
                                            strokeDashoffset={263.89 - (Math.min(100, (calculateTotalPicked(selectedPlan) / (calculateTotalCost(selectedPlan) || 1)) * 100) / 100) * 263.89}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                        <defs>
                                            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#8b5cf6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-sm font-black text-gradient">
                                            {Math.round((calculateTotalPicked(selectedPlan) / (calculateTotalCost(selectedPlan) || 1)) * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Utilization</span>
                                    <p className="text-[10px] font-bold text-blue-500">Resource Commit</p>
                                </div>
                            </div>

                            {/* Center Summary */}
                            <div className="flex flex-col justify-center items-center py-2 px-6 border-x border-[var(--border-glass)]">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Global Net Budget</span>
                                    <span className="text-3xl font-black text-gradient tracking-tighter">
                                        {getCurrencySymbol(settings.currency)}{calculateTotalCost(selectedPlan).toLocaleString()}
                                    </span>
                                </div>

                                <div className="mt-4 flex items-center gap-3">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${calculateTotalPicked(selectedPlan) > calculateTotalCost(selectedPlan)
                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                        : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                        }`}>
                                        {calculateTotalPicked(selectedPlan) > calculateTotalCost(selectedPlan) ? 'Alert: Variance' : 'Tactical: Safe'}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/10 text-emerald-500`}>
                                        {selectedPlan.status}
                                    </div>
                                </div>
                            </div>

                            {/* Funding Coverage Ring */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative w-24 h-24">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="42" fill="transparent" stroke="var(--border-glass)" strokeWidth="8" />
                                        <circle
                                            cx="50" cy="50" r="42" fill="transparent" stroke="#10b981" strokeWidth="8"
                                            strokeDasharray={263.89}
                                            strokeDashoffset={263.89 - (Math.min(100, (calculateTotalSettled(selectedPlan) / (calculateTotalPicked(selectedPlan) || 1)) * 100) / 100) * 263.89}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-sm font-black text-emerald-500">
                                            {Math.round((calculateTotalSettled(selectedPlan) / (calculateTotalPicked(selectedPlan) || 1)) * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Coverage</span>
                                    <p className="text-[10px] font-bold text-emerald-500">Cash Settlement</p>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Stats Grid */}
                        <div className="mt-8 pt-6 border-t border-[var(--border-glass)] grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Settled</span>
                                <span className="text-sm font-black text-emerald-500">{getCurrencySymbol(settings.currency)}{calculateTotalSettled(selectedPlan).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Picked</span>
                                <span className="text-sm font-black text-[var(--text-main)] italic">{getCurrencySymbol(settings.currency)}{calculateTotalPicked(selectedPlan).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Remaining Gap</span>
                                <span className="text-sm font-black text-amber-500">{getCurrencySymbol(settings.currency)}{(calculateTotalPicked(selectedPlan) - calculateTotalSettled(selectedPlan)).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                                <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Timeline</span>
                                <span className="text-[10px] font-bold text-[var(--text-main)]">{format(safeDate(selectedPlan.updated_at), 'MMM dd, yyyy')}</span>
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

                        <div className="flex flex-col gap-1.5 animate-in fade-in transition-all duration-700">
                            {(selectedPlan.components || []).length === 0 ? (
                                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-glass)] rounded-3xl opacity-40">
                                    <Layers size={32} className="mb-2" />
                                    <p className="text-xs font-medium">No components added yet</p>
                                </div>
                            ) : (
                                (() => {
                                    // Group components by group_id if it exists
                                    const groups: Record<string, PlanComponent[]> = {};
                                    const ungrouped: PlanComponent[] = [];

                                    (selectedPlan.components || []).forEach(c => {
                                        const rootId = c.group_parent_id || c.id;
                                        // Check if this item is part of a group (either it has children or it is a child)
                                        const isPartOfGroup = c.group_parent_id || selectedPlan.components.some(other => other.group_parent_id === c.id);

                                        if (isPartOfGroup) {
                                            if (!groups[rootId]) groups[rootId] = [];
                                            groups[rootId].push(c);
                                        } else {
                                            ungrouped.push(c);
                                        }
                                    });

                                    const renderComponent = (component: PlanComponent, isFirstInGroup = false, isLastInGroup = false, hasGroup = false) => (
                                        <div key={component.id} className={`relative group overflow-hidden ${hasGroup ? (isFirstInGroup ? 'rounded-t-3xl' : isLastInGroup ? 'rounded-b-3xl' : 'rounded-none') : 'rounded-3xl'}`}>
                                            <GlassCard
                                                onClick={() => handlePickItem(component)}
                                                className={`p-3 border-l-0 hover:border-blue-500/40 hover:bg-blue-500/[0.04] transition-all duration-500 relative ${selectedPlan.status !== 'FINALIZED' ? 'cursor-pointer active:scale-[0.98]' : ''} ${hasGroup ? 'border-t-0 bg-blue-500/[0.01]' : 'shadow-lg shadow-black/5'} ${isFirstInGroup ? 'border-t-[var(--border-glass)]' : ''}`}
                                            >
                                                {hasGroup && isFirstInGroup && (
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30" />
                                                )}
                                                {hasGroup && !isFirstInGroup && (
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/30" />
                                                )}
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-2xl rounded-full" />
                                                <div className="flex items-start justify-between relative z-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-500 ${component.final_cost != null ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                                            {component.final_cost != null ? <CheckCircle2 size={20} className="animate-in zoom-in duration-500" /> : <Target size={20} />}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-[var(--text-main)] text-sm leading-tight">{component.name}</h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[9px] font-black text-blue-500/80 uppercase tracking-widest bg-blue-500/5 px-1.5 py-0.5 rounded-lg border border-blue-500/10">{component.component_type}</span>
                                                                {component.component_type === 'QUANTIFIED' && component.quantity && (
                                                                    <span className="text-[9px] font-black text-[var(--text-muted)] bg-[var(--surface-deep)] px-1.5 py-0.5 rounded-lg border border-[var(--border-glass)] uppercase tracking-tighter">
                                                                        {component.quantity} {component.unit}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end transition-transform duration-500 group-hover:-translate-x-14">
                                                        <div className="flex items-center gap-2">
                                                            {component.final_cost != null && component.expected_cost != null && component.expected_cost > 0 && (
                                                                <div className={`px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border ${component.final_cost <= component.expected_cost
                                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                                                    }`}>
                                                                    {component.final_cost <= component.expected_cost ? '-' : '+'}
                                                                    {Math.abs(Math.round(((component.final_cost - (component.expected_cost || 0)) / (component.expected_cost || 1)) * 100))}%
                                                                </div>
                                                            )}
                                                            <span className={`font-black tracking-tight transition-colors ${component.final_cost != null ? 'text-emerald-500' : 'text-[var(--text-main)] group-hover:text-blue-500'}`}>
                                                                {hasGroup && component.final_cost === 0
                                                                    ? <span className="text-[10px] uppercase tracking-tighter opacity-70">Group Reference</span>
                                                                    : `${getCurrencySymbol(settings.currency)}${(component.final_cost != null ? component.final_cost : component.expected_cost || 0).toLocaleString()}`
                                                                }
                                                            </span>
                                                        </div>
                                                        {component.final_cost == null ? (
                                                            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40 mt-0.5 italic">Estimated</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-emerald-500/60 mt-0.5">
                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em]">
                                                                    {hasGroup && component.final_cost === 0 ? 'Linked Node' : 'Secured'}
                                                                </span>
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
                                                                setDeleteType('component');
                                                                setDeleteId(component.id);
                                                            }}
                                                            className="h-full px-6 bg-gradient-to-b from-rose-500 to-rose-600 text-white flex items-center justify-center active:scale-95 transition-transform"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </GlassCard>
                                        </div>
                                    );

                                    return (
                                        <div className="space-y-4">
                                            {/* Render Groups */}
                                            {Object.entries(groups).map(([rootId, members]) => {
                                                const isTrulyAGroup = members.length > 1;
                                                if (!isTrulyAGroup) return null;

                                                // Get the tag from the group members (prefer parent's tag or any member's tag)
                                                const tag = members.find(m => m.id === rootId)?.group_id || members.find(m => m.group_id)?.group_id || 'Group';

                                                return (
                                                    <div key={rootId} className="space-y-1">
                                                        <div className="flex items-center gap-2 px-2">
                                                            <Layers size={12} className="text-blue-500/50" />
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500/60">
                                                                {tag.startsWith('group_') ? 'Group' : tag}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            {/* Sort members: Parent first, then others alphabetically */}
                                                            {[...members].sort((a, b) => (a.id === rootId ? -1 : b.id === rootId ? 1 : 0)).map((c, idx) =>
                                                                renderComponent(c, idx === 0, idx === members.length - 1, true)
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Render Ungrouped and Items that failed the "Truly a Group" test */}
                                            <div className="flex flex-col gap-1.5">
                                                {ungrouped.map(c => renderComponent(c))}
                                                {Object.entries(groups).map(([rootId, members]) => {
                                                    if (members.length <= 1) {
                                                        return members.map(c => renderComponent(c));
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()
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
                                        const gap = calculateTotalPicked(selectedPlan) - calculateTotalSettled(selectedPlan);
                                        setNewSettlementData({
                                            amount: gap > 0 ? gap.toString() : '',
                                            wallet_id: '',
                                            channel_id: ''
                                        });
                                        setEditingSettlement(null);
                                        setIsAddingSettlement(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/20 transition-all"
                                >
                                    <Plus size={14} /> Smart Authorize
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
                                                            onClick={() => {
                                                                setDeleteType('settlement');
                                                                setDeleteId(s.id);
                                                            }}
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
                                onClick={() => {
                                    if (allPicked) {
                                        finalizePlan(selectedPlan.id);
                                        showFeedback('Plan finalized and executed!', 'success');
                                    }
                                }}
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

                    {/* Main Plan Actions (Deletion) */}
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={() => {
                                setDeleteType('plan');
                                setDeleteId(selectedPlan.id);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                        >
                            <Trash2 size={14} /> Abandon Plan
                        </button>
                    </div>

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
                                        {!showCatPicker && (
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-blue-500">Resource Descriptor</label>
                                                <AutocompleteInput
                                                    value={newCompData.name}
                                                    onChange={(val) => setNewCompData({ ...newCompData, name: val })}
                                                    fetchSuggestions={searchPlanSuggestions}
                                                    placeholder="e.g. Master Bedroom Painting"
                                                />
                                            </div>
                                        )}

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
                                                <div className="absolute inset-0 z-[1100] bg-[var(--surface-overlay)] flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500 rounded-[40px] transition-colors overflow-hidden">
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

                                                                    <div className="grid grid-cols-1 gap-0">
                                                                        {/* The Parent itself as an option */}
                                                                        <button
                                                                            onClick={() => {
                                                                                setNewCompData({ ...newCompData, category_id: group.root.id });
                                                                                setShowCatPicker(false);
                                                                                setSearchCat('');
                                                                            }}
                                                                            className={`group relative w-full flex items-center gap-3 p-1.5 rounded-xl border-b border-white/5 last:border-0 transition-all duration-300 ${newCompData.category_id === group.root.id ? 'bg-blue-600 border-blue-400 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] z-10' : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-deep)]/80'}`}
                                                                        >
                                                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${newCompData.category_id === group.root.id ? 'bg-white/20' : 'bg-[var(--surface-deep)] shadow-inner'}`}>
                                                                                {ICON_MAP[group.root.icon || 'Package'] || <Layers size={20} />}
                                                                            </div>
                                                                            <span className={`text-sm font-bold ${newCompData.category_id === group.root.id ? 'text-white' : 'text-[var(--text-main)] transition-colors'}`}>General {group.root.name}</span>
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
                                                                                className={`group relative w-full flex items-center gap-3 p-1 rounded-xl border-b border-white/5 last:border-0 transition-all duration-300 ${newCompData.category_id === child.id ? 'bg-blue-600 border-blue-400 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] z-10' : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-deep)]/40'}`}
                                                                            >
                                                                                <div className="w-10 h-10 flex items-center justify-center">
                                                                                    <div className={`w-1.5 h-1.5 rounded-full ${newCompData.category_id === child.id ? 'bg-white' : 'bg-[var(--border-glass)] group-hover:bg-blue-500 transition-colors'}`} />
                                                                                </div>
                                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${newCompData.category_id === child.id ? 'bg-white/10' : 'bg-[var(--surface-deep)] border border-[var(--border-glass)]'}`}>
                                                                                    {ICON_MAP[child.icon || 'Tag'] || <Tag size={18} />}
                                                                                </div>
                                                                                <span className={`text-sm font-medium ${newCompData.category_id === child.id ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-main)] transition-colors'}`}>{child.name}</span>
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
                                                    <button
                                                        onClick={() => setShowUnitPicker(true)}
                                                        className="w-full bg-[var(--surface-deep)] border border-[var(--border-glass)] rounded-2xl p-4 flex items-center justify-between group hover:border-blue-500/30 transition-all text-left"
                                                    >
                                                        {newCompData.unit ? (
                                                            <span className="font-bold text-[var(--text-main)] uppercase">{newCompData.unit}</span>
                                                        ) : (
                                                            <span className="text-[var(--text-muted)] font-bold">Select Unit</span>
                                                        )}
                                                        <ChevronRight size={18} className="text-[var(--text-muted)] group-hover:text-blue-500 transition-colors rotate-90" />
                                                    </button>
                                                </div>

                                                {/* PREMIUM UNIT PICKER OVERLAY */}
                                                {showUnitPicker && (
                                                    <div className="absolute inset-0 z-[1200] bg-[var(--surface-overlay)] flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500 rounded-[40px] overflow-hidden">
                                                        <div className="px-8 py-5 flex items-center justify-between border-b border-[var(--border-glass)] bg-[var(--surface-overlay)] backdrop-blur-2xl z-30 shrink-0">
                                                            <div>
                                                                <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">Units of Measure</h2>
                                                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Inter-System Standards</p>
                                                            </div>
                                                            <button
                                                                onClick={() => { setShowUnitPicker(false); setSearchUnit(''); }}
                                                                className="p-4 rounded-2xl bg-[var(--surface-deep)] border border-[var(--border-glass)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all shadow-lg active:scale-95"
                                                            >
                                                                <X size={20} />
                                                            </button>
                                                        </div>

                                                        <div className="px-8 pb-4 pt-8 bg-[var(--surface-overlay)]/50 backdrop-blur-md z-20 shrink-0">
                                                            <div className="relative group">
                                                                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-500 transition-colors" />
                                                                <input
                                                                    placeholder="Search international units..."
                                                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-[24px] py-5 pl-14 pr-6 text-xs font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-[var(--text-dim)] text-[var(--text-main)] shadow-inner"
                                                                    value={searchUnit}
                                                                    onChange={(e) => setSearchUnit(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 overflow-y-auto px-8 pb-20 no-scrollbar space-y-6">
                                                            {INTERNATIONAL_UNITS.map(group => {
                                                                const filteredUnits = group.units.filter(u => u.toLowerCase().includes(searchUnit.toLowerCase()));
                                                                if (filteredUnits.length === 0) return null;

                                                                return (
                                                                    <div key={group.group} className="space-y-3">
                                                                        <div className="flex items-center gap-3 sticky top-0 bg-[var(--surface-overlay)] py-2 z-10 transition-colors">
                                                                            <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">{group.group}</h5>
                                                                            <div className="flex-1 h-[1px] bg-gradient-to-r from-blue-500/20 to-transparent" />
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {filteredUnits.map(unit => (
                                                                                <button
                                                                                    key={unit}
                                                                                    onClick={() => {
                                                                                        setNewCompData({ ...newCompData, unit });
                                                                                        setShowUnitPicker(false);
                                                                                        setSearchUnit('');
                                                                                    }}
                                                                                    className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group/unit ${newCompData.unit === unit
                                                                                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                                                                        : 'bg-[var(--surface-deep)] border-[var(--border-glass)] text-[var(--text-main)] hover:border-blue-500/30'}`}
                                                                                >
                                                                                    <span className="text-xs font-black uppercase italic tracking-tighter">{unit}</span>
                                                                                    {newCompData.unit === unit && <Check size={14} />}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
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
                        <div className="fixed inset-0 w-screen h-screen z-[510] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
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
                                                    readOnly={!isDesktop}
                                                    inputMode={isDesktop ? "decimal" : "none"}
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
                                            <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${showCalculator && calcTarget === 'SETTLEMENT' ? 'max-h-[600px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0 pt-0'}`}>
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
                                                    <div className="flex bg-[var(--surface-deep)]/50 p-2 rounded-2xl border border-[var(--border-glass)] ring-1 ring-[var(--border-subtle)] overflow-x-auto no-scrollbar gap-2">
                                                        {(() => {
                                                            const wallet = walletsWithBalances.find(w => w.id === newSettlementData.wallet_id);
                                                            return (wallet?.computedChannels || []).map((ch: any) => {
                                                                const isDisabled = ch.balance <= 0;
                                                                const isSelected = newSettlementData.channel_id === ch.id;
                                                                return (
                                                                    <button
                                                                        key={ch.id}
                                                                        disabled={isDisabled}
                                                                        onClick={() => !isDisabled && setNewSettlementData({ ...newSettlementData, channel_id: ch.id })}
                                                                        className={`flex-none py-3 px-4 min-w-[80px] rounded-xl transition-all flex flex-col items-center gap-1.5 ${isSelected
                                                                            ? 'bg-[var(--surface-overlay)] text-emerald-500 shadow-lg shadow-emerald-500/10 border border-emerald-500/30'
                                                                            : isDisabled
                                                                                ? 'opacity-30 cursor-not-allowed grayscale text-[var(--text-muted)] border border-transparent'
                                                                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-card)] border border-transparent'
                                                                            }`}
                                                                    >
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">{ch.type}</span>
                                                                        <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-500' : 'text-[var(--text-main)]'}`}>
                                                                            {getCurrencySymbol(wallet?.currency || settings.currency)}{ch.balance.toLocaleString()}
                                                                        </span>
                                                                        {isDisabled && <span className="text-[6px] font-black text-rose-500 uppercase tracking-widest leading-none">Low Funds</span>}
                                                                    </button>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
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
                                            {(() => {
                                                const wallet = walletsWithBalances.find(w => w.id === newSettlementData.wallet_id);
                                                return wallet?.computedChannels.map(ch => {
                                                    const balance = ch.balance;
                                                    const isDisabled = balance <= 0;
                                                    return (
                                                        <button
                                                            key={ch.id}
                                                            disabled={isDisabled}
                                                            onClick={() => {
                                                                setNewSettlementData({ ...newSettlementData, channel_id: ch.id });
                                                                setShowChannelPickerSettlement(false);
                                                            }}
                                                            className={`w-full flex items-center gap-4 p-4 rounded-[28px] border transition-all duration-300 ${newSettlementData.channel_id === ch.id
                                                                ? 'bg-emerald-600 border-emerald-400 shadow-xl shadow-emerald-500/20'
                                                                : isDisabled
                                                                    ? 'opacity-40 cursor-not-allowed grayscale bg-[var(--surface-deep)]/50 border-[var(--border-glass)]'
                                                                    : 'bg-[var(--surface-deep)] border border-[var(--border-glass)] hover:border-emerald-500/30'
                                                                }`}
                                                        >
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${newSettlementData.channel_id === ch.id ? 'bg-white/20 text-white' : isDisabled ? 'bg-[var(--surface-overlay)] text-[var(--text-muted)] border border-[var(--border-glass)]' : 'bg-[var(--surface-overlay)] text-emerald-500 border border-[var(--border-glass)]'}`}>
                                                                <CreditCard size={20} />
                                                            </div>
                                                            <div className="flex-1 text-left">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className={`text-sm font-black uppercase tracking-widest ${newSettlementData.channel_id === ch.id ? 'text-white' : isDisabled ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>{ch.type}</h4>
                                                                    <span className={`text-[10px] font-mono font-bold ${newSettlementData.channel_id === ch.id ? 'text-white/80' : isDisabled ? 'text-rose-500/50' : 'text-emerald-500/80'}`}>
                                                                        {getCurrencySymbol(settings.currency)}{balance.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <p className={`text-[9px] font-black uppercase ${newSettlementData.channel_id === ch.id ? 'text-white/60' : isDisabled ? 'text-rose-500/60' : 'text-[var(--text-muted)]'}`}>
                                                                    {isDisabled ? 'Insufficient Liquidity' : 'Authorized Connection'}
                                                                </p>
                                                            </div>
                                                            {newSettlementData.channel_id === ch.id && <Check size={20} className="text-white" />}
                                                        </button>
                                                    );
                                                });
                                            })()}
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
                                        {/* Group Management Section - Only for parents or ungrouped items */}
                                        {!editingComponent.group_parent_id ? (
                                            <div className="p-4 bg-[var(--surface-deep)]/40 border border-[var(--border-glass)] rounded-2xl space-y-4 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Layers size={16} className="text-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Group Management</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowGroupSelector(!showGroupSelector)}
                                                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showGroupSelector ? 'bg-blue-600 text-white' : 'bg-white/5 text-[var(--text-muted)] hover:text-white'}`}
                                                    >
                                                        {showGroupSelector ? 'Close Selector' : 'Add Members'}
                                                    </button>
                                                </div>

                                                {/* Member List */}
                                                <div className="flex flex-wrap gap-2">
                                                    {groupingMemberIds.map(id => {
                                                        const comp = selectedPlan?.components.find(c => c.id === id);
                                                        const isHighlighted = id === highlightedComponentId;
                                                        return (
                                                            <div key={id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500 ${isHighlighted ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse' : 'border-blue-500/20 bg-blue-500/10'} text-xs font-bold ${isHighlighted ? 'text-rose-400' : 'text-blue-400'} group/member ${id === editingComponent.id ? 'opacity-100' : ''}`}>
                                                                <span>{comp?.name || 'Unknown'}</span>
                                                                {id !== editingComponent.id && !editingComponent.group_parent_id && (
                                                                    <button onClick={() => setGroupingMemberIds(prev => prev.filter(mid => mid !== id))} className="hover:text-rose-500 transition-colors">
                                                                        <X size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Group Tag Input */}
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Group Reference Tag</label>
                                                    <input
                                                        value={groupTag.startsWith('group_') ? '' : groupTag}
                                                        onChange={(e) => setGroupTag(e.target.value)}
                                                        placeholder="e.g. Phase 1, Bathroom Set, etc."
                                                        className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs font-bold text-[var(--text-main)] outline-none focus:border-blue-500/30 transition-all"
                                                    />
                                                </div>

                                                {/* Selector List */}
                                                {showGroupSelector && (
                                                    <div className="pt-2 border-t border-white/5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Available for Grouping</p>
                                                        <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1">
                                                            {selectedPlan?.components
                                                                .filter(c => {
                                                                    // Must NOT be in the current selection
                                                                    if (groupingMemberIds.includes(c.id)) return false;
                                                                    // Must NOT have a group tag
                                                                    if (c.group_id) return false;
                                                                    // Must NOT be a child of another group
                                                                    if (c.group_parent_id) return false;
                                                                    // Must NOT be a parent of another group
                                                                    const isParentOfOthers = selectedPlan.components.some(other => other.group_parent_id === c.id);
                                                                    if (isParentOfOthers) return false;

                                                                    return true;
                                                                })
                                                                .map(c => (
                                                                    <button
                                                                        key={c.id}
                                                                        onClick={() => setGroupingMemberIds(prev => [...prev, c.id])}
                                                                        className="w-full text-left p-3 rounded-xl bg-white/5 border border-transparent hover:border-blue-500/20 hover:bg-blue-500/5 transition-all flex items-center justify-between group"
                                                                    >
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-main)]">{c.name}</span>
                                                                            <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-60">{c.component_type}</span>
                                                                        </div>
                                                                        <Plus size={14} className="text-[var(--text-muted)] group-hover:text-blue-400" />
                                                                    </button>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Group Restricted Banner for References */
                                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col gap-3 animate-in slide-in-from-top-2 duration-500">
                                                <div className="flex items-center gap-2 text-rose-500">
                                                    <AlertTriangle size={16} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Group Restricted</span>
                                                </div>
                                                <p className="text-xs font-bold text-[var(--text-main)] leading-relaxed">
                                                    This item is currently locked because it is a **Reference Only** member of a Group-By.
                                                </p>
                                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                                    <Layers size={14} className="text-blue-400" />
                                                    <span className="text-[10px] font-bold text-blue-300">Linked to Group: <span className="text-white uppercase italic">{editingComponent.group_id?.startsWith('group_') ? 'Unnamed Group' : (editingComponent.group_id || 'Unnamed Group')}</span></span>
                                                </div>
                                                <button
                                                    onClick={() => handleRedirectToParent(editingComponent.group_parent_id!, editingComponent.id)}
                                                    className="w-full py-3 bg-[var(--surface-deep)] border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                                                >
                                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /> Go to Group Parent
                                                </button>
                                            </div>
                                        )}


                                        <div className={`flex flex-col gap-2 transition-opacity duration-300 ${editingComponent.group_parent_id ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                                                {groupingMemberIds.length > 1 ? 'Total Group Cost' : 'Pickup Amount (Actual Cost)'}
                                            </label>
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
            ) : (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                                <div key={plan.id} className="relative group/plan overflow-hidden rounded-[2.5rem]">
                                    <GlassCard
                                        onClick={() => setSelectedPlanId(plan.id)}
                                        className="p-4 flex flex-col gap-3 group hover:border-blue-500/40 cursor-pointer transition-all active:scale-[0.98] relative z-10"
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
                                            <div className="flex flex-col items-end transition-transform duration-500 group-hover/plan:-translate-x-16">
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

                                    {/* Plan Delete Action */}
                                    <div className="absolute top-0 right-0 h-full flex translate-x-[102%] group-hover/plan:translate-x-0 transition-transform duration-500 ease-out z-20 rounded-l-[2rem] overflow-hidden">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteType('plan');
                                                setDeleteId(plan.id);
                                            }}
                                            className="h-full px-6 bg-gradient-to-b from-rose-500 to-rose-600 text-white flex items-center justify-center active:scale-95 transition-transform"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    </div>
                                </div>
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
            )}

            <DynamicDeleteModal
                isOpen={!!deleteId}
                onClose={() => { setDeleteId(null); setDeleteType(null); }}
                onConfirm={async (cascade) => {
                    if (deleteId && deleteType) {
                        if (deleteType === 'plan') {
                            await deletePlan(deleteId, cascade);
                            setSelectedPlanId(null);
                        }
                        else if (deleteType === 'component') await deleteComponent(deleteId);
                        else if (deleteType === 'settlement') await deleteSettlement(deleteId);

                        setDeleteId(null);
                        setDeleteType(null);
                    }
                }}
                onGroupConfirm={async (mode) => {
                    if (!deleteId || deleteType !== 'component' || !selectedPlan) return;

                    const component = selectedPlan.components.find(c => c.id === deleteId);
                    if (!component) return;

                    const siblings = selectedPlan.components.filter(c => c.group_parent_id === deleteId);

                    if (mode === 'PURGE') {
                        // Delete parent and all siblings
                        await deleteComponent(deleteId);
                        for (const s of siblings) {
                            await deleteComponent(s.id);
                        }
                    } else if (mode === 'PROMOTE' && siblings.length > 0) {
                        // Promote the first sibling to parent status
                        const firstSibling = siblings[0];
                        const others = siblings.slice(1);

                        // 1. Make the first sibling independent and give it the parent's cost
                        await updateComponent(firstSibling.id, {
                            group_parent_id: null,
                            final_cost: component.final_cost,
                            group_id: component.group_id
                        }, others.length > 0); // Skip reload if we have others to update

                        // 2. Link all other siblings to the new parent
                        for (let i = 0; i < others.length; i++) {
                            const isLast = i === others.length - 1;
                            await updateComponent(others[i].id, {
                                group_parent_id: firstSibling.id
                            }, !isLast);
                        }

                        // 3. Delete the old parent
                        await deleteComponent(deleteId);
                    } else if (mode === 'UNLINK') {
                        // Delete parent, make siblings independent
                        for (let i = 0; i < siblings.length; i++) {
                            const isLast = i === siblings.length - 1;
                            await updateComponent(siblings[i].id, {
                                group_parent_id: null,
                                group_id: null
                            }, !isLast);
                        }
                        await deleteComponent(deleteId);
                    } else {
                        // Fallback or Child deletion (just unlink if it was a child)
                        await deleteComponent(deleteId);
                    }
                }}
                title={`Delete ${deleteType === 'plan' ? 'Financial Plan' : deleteType === 'component' ? 'Resource' : 'Settlement'}`}
                itemName={
                    deleteType === 'plan' ? (financialPlans.find(p => p.id === deleteId)?.title || 'this plan') :
                        deleteType === 'component' ? (selectedPlan?.components?.find(c => c.id === deleteId)?.name || 'this resource') :
                            'this settlement amount'
                }
                itemType={deleteType || 'plan'}
                isGroupParent={deleteType === 'component' && !!selectedPlan?.components.some(c => c.group_parent_id === deleteId)}
                isGroupChild={deleteType === 'component' && !!selectedPlan?.components.find(c => c.id === deleteId)?.group_parent_id}
                groupMemberCount={deleteType === 'component' ? selectedPlan?.components.filter(c => c.group_parent_id === deleteId).length : 0}
                hasDependencies={deleteType === 'plan' && ((selectedPlan?.components?.length || 0) > 0 || (selectedPlan?.settlements?.length || 0) > 0)}
                dependencyText={
                    deleteType === 'plan'
                        ? "Abandoning this plan will also remove all associated resources and settlement authorizations. 'Just De-link' will keep the plan's components as orphaned records (advanced view only)."
                        : undefined
                }
            />
        </div>
    );
};

export default FinancialPlans;
