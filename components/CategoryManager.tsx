
import React, { useState, useMemo } from 'react';
import { useFeedback } from '../store/FeedbackContext';
import { useFinance } from '../store/FinanceContext';
import { MasterCategoryType, Category } from '../types';
import { ICON_MAP, COLORS } from '../constants';
import { GlassCard } from './ui/GlassCard';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Edit2,
  Shield,
  Sparkles,
  Search,
  Check,
  Trash2,
  Grid
} from 'lucide-react';
import DynamicDeleteModal from './modals/DynamicDeleteModal';

import { generateEmbedding } from '../services/gemini';

const CategoryManager: React.FC = () => {
  const { categories, addCategory, deleteCategory, toggleCategoryStatus, updateCategory } = useFinance();
  const { showFeedback } = useFeedback();
  const [activeTab, setActiveTab] = useState<MasterCategoryType>(MasterCategoryType.EXPENSE);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const filteredCategories = useMemo(() => {
    return categories
      .filter(c =>
        c.type === activeTab &&
        !c.parentId &&
        c.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, activeTab, search]);

  const getChildren = (parentId: string) => {
    return categories.filter(c => c.parentId === parentId);
  };


  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [parentForNew, setParentForNew] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAdd = async () => {
    if (!newCatName) return;
    setIsGenerating(true);

    // Auto-generate embedding
    const embedding = await generateEmbedding(newCatName);

    await addCategory({
      name: newCatName,
      icon: 'Sparkles',
      color: COLORS.accent,
      type: activeTab,
      parentId: parentForNew,
      isDisabled: false,
      isGlobal: false,
      order: 10,
      embedding: embedding || undefined
    });

    setNewCatName('');
    setIsAdding(false);
    setIsGenerating(false);
    showFeedback('Category classification created.', 'success');
  };

  return (
    <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="px-2 flex justify-between items-center bg-[var(--surface-deep)]/50 p-2 rounded-2xl border border-[var(--border-glass)] mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface-deep)] flex items-center justify-center border border-[var(--border-glass)]">
            <Grid size={16} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-[var(--text-main)] transition-colors">Taxonomy</h1>
            <p className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em] transition-colors">System Segments</p>
          </div>
        </div>
        <button
          onClick={() => { setIsAdding(true); setParentForNew(undefined); }}
          className="bg-[var(--text-main)] w-8 h-8 rounded-lg flex items-center justify-center shadow-lg active:scale-95 transition-all text-[var(--bg-color)]"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>

      <div className="flex bg-[var(--surface-deep)] p-1.5 rounded-2xl border border-[var(--border-glass)] transition-colors">
        {[MasterCategoryType.EXPENSE, MasterCategoryType.INCOME, MasterCategoryType.SAVING, MasterCategoryType.INVESTMENT].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-xl' : 'text-[var(--text-muted)] hover:bg-[var(--surface-glass)]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
        <input
          type="text"
          placeholder="Filter categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold focus:border-blue-500/50 outline-none text-[var(--text-main)] transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filteredCategories.map(cat => {
          const children = getChildren(cat.id);
          const isSel = expanded.has(cat.id);
          return (
            <div key={cat.id} className="relative">
              <button
                onClick={() => toggleExpand(cat.id)}
                className={`w-full group rounded-[32px] p-2.5 border transition-all duration-500 flex flex-col items-center text-center gap-4 relative overflow-hidden ${isSel ? 'bg-blue-600 border-blue-400 text-white shadow-2xl' : 'bg-[var(--surface-deep)] border-[var(--border-glass)] text-[var(--text-muted)] hover:border-blue-500/50'}`}
              >
                {isSel && <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-20 animate-pulse" />}
                <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center transition-all duration-700 group-hover:rotate-12 group-hover:scale-110 ${isSel ? 'bg-white/20' : 'bg-[var(--input-bg)] border border-[var(--border-glass)]'}`} style={{ color: isSel ? 'white' : cat.color }}>
                  {ICON_MAP[cat.icon] || <Sparkles size={24} />}
                </div>
                <div className="relative z-10">
                  <h3 className={`text-xs font-black tracking-tight ${isSel ? 'text-white' : 'text-[var(--text-main)]'}`}>{cat.name}</h3>
                  <p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${isSel ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>{children.length} VERTICALS</p>
                </div>

                {/* Status Indicator */}
                {!isSel && cat.isDisabled && (
                  <div className="absolute top-3 right-3 text-rose-500 opacity-60">
                    <EyeOff size={12} />
                  </div>
                )}
              </button>

              {/* Action FABs when selected */}
              {isSel && (
                <div className="absolute top-2 right-2 flex flex-col gap-1 z-20 animate-in zoom-in duration-300">
                  <button onClick={() => { setParentForNew(cat.id); setIsAdding(true); }} className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/30 transition-all"><Plus size={12} /></button>
                  <button onClick={() => toggleCategoryStatus(cat.id)} className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/30 transition-all">{cat.isDisabled ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                  {!cat.isGlobal && <button onClick={() => setDeleteId(cat.id)} className="p-2 bg-rose-500/40 backdrop-blur-md rounded-lg text-white hover:bg-rose-500/60 transition-all"><Trash2 size={12} /></button>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail Panel for Selected Category */}
      {Array.from(expanded).map(id => {
        const cat = categories.find(c => c.id === id);
        if (!cat || cat.type !== activeTab) return null;
        const children = getChildren(id);
        if (children.length === 0) return null;

        return (
          <div key={`detail-${id}`} className="space-y-4 animate-in slide-in-from-top-4 duration-500 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3B82F6]" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">{cat.name} Portfolio</h4>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-blue-500/20 to-transparent" />
            </div>
            <div className="grid grid-cols-1 gap-0">
              {children.map(child => (
                <div key={child.id} className="relative group overflow-hidden rounded-2xl">
                  <div className={`p-1.5 bg-transparent border-b border-white/5 last:border-0 flex items-center justify-between transition-all hover:bg-white/5 ${child.isDisabled ? 'opacity-40' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-dim)]" style={{ color: child.color }}>
                        {ICON_MAP[child.icon]}
                      </div>
                      <span className="text-sm font-bold text-[var(--text-main)]">{child.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setParentForNew(child.id); setIsAdding(true); }} className="p-2 text-[var(--text-muted)] hover:text-blue-500 transition-colors"><Plus size={14} /></button>
                      <button onClick={() => toggleCategoryStatus(child.id)} className="p-2 text-[var(--text-muted)] hover:text-blue-500 transition-colors">{child.isDisabled ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      {!child.isGlobal && <button onClick={() => setDeleteId(child.id)} className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {isAdding && (
        <div className="fixed inset-0 w-screen h-screen z-[500] bg-black/75 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <GlassCard className="w-full max-w-sm p-8 space-y-6">
            <h2 className="text-lg font-bold text-[var(--text-main)] transition-colors">New Category</h2>
            {parentForNew && (
              <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest transition-colors">
                Under: {categories.find(c => c.id === parentForNew)?.name}
              </p>
            )}
            <input
              className="w-full bg-[var(--input-bg)] border border-[var(--border-glass)] rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-500 text-[var(--text-main)] transition-colors"
              placeholder="Category Name"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-4 rounded-xl font-bold bg-[var(--input-bg)] text-[var(--text-muted)] hover:bg-[var(--surface-glass)] transition-colors">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-4 rounded-xl font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/20">Create</button>
            </div>
          </GlassCard>
        </div>
      )}

      <DynamicDeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteCategory(deleteId);
            showFeedback('Category removed from taxonomy.', 'success');
          }
        }}
        title="Delete Category"
        itemName={categories.find(c => c.id === deleteId)?.name || 'this category'}
        itemType="category"
        hasDependencies={true}
        dependencyText="Deleting this category will mark any associated transactions as 'Uncategorized'."
      />
    </div>
  );
};

export default CategoryManager;
