import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, X, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BudgetCategory, MonthlyPlan } from '../../../types';
import { CATEGORY_COLORS } from '../../../constants/colors';

interface CategoryDropdownProps {
  currentCategoryId: string;
  categories: BudgetCategory[];
  type: BudgetCategory['type'];
  onSelect: (id: string) => void;
  onAdd: (name: string, type: BudgetCategory['type'], color: string) => Promise<string | undefined>;
  monthlyPlans?: MonthlyPlan[];
  month?: string;
  placeholder?: string;
  className?: string;
}

export function CategoryDropdown({
  currentCategoryId,
  categories,
  type,
  onSelect,
  onAdd,
  monthlyPlans = [],
  month = '',
  placeholder = 'Без категорії',
  className = ''
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [openUp, setOpenUp] = useState(false);
  const [openRight, setOpenRight] = useState(true);
  const [activeTab, setActiveTab] = useState<'plan' | 'accounts' | 'goals' | 'recent'>('plan');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, right: 0, bottom: 0 });
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`recent_cats_${type}`);
    return saved ? JSON.parse(saved) : [];
  });

  const currentPlan = (monthlyPlans || []).find(mp => mp.id === month);
  const plannedIds = currentPlan?.plans ? Object.keys(currentPlan.plans) : [];

  const filteredCategories = categories
    .filter(c => c.type === type)
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const plannedCategories = filteredCategories.filter(c => plannedIds.includes(c.id));
  const goalCategories = filteredCategories.filter(c => c.type === 'goal');
  const otherCategories = filteredCategories.filter(c => !plannedIds.includes(c.id) && c.type !== 'goal');
  const recentCategories = categories.filter(c => recentIds.includes(c.id) && c.type === type);

  const currentCat = categories.find(c => c.id === currentCategoryId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Only close if it's not a click inside the portal
        const portalMenu = document.getElementById('category-dropdown-portal');
        if (portalMenu && portalMenu.contains(event.target as Node)) return;
        
        setIsOpen(false);
        setIsAdding(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateCoords = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.left;
      
      setOpenUp(spaceBelow < 400 && spaceAbove > spaceBelow);
      setOpenRight(spaceRight > 300);
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        right: rect.right,
        bottom: rect.bottom
      });
    }
  };

  const handleSelect = (id: string) => {
    if (id) {
      setRecentIds(prev => {
        const next = [id, ...prev.filter(i => i !== id)].slice(0, 5);
        localStorage.setItem(`recent_cats_${type}`, JSON.stringify(next));
        return next;
      });
    }
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} style={{ zIndex: isOpen ? 'var(--z-dropdown)' : 50 }} ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-tight min-w-[120px] max-w-[200px] shadow-sm border ${
          currentCat 
            ? `${currentCat.color} text-white border-white/20 hover:brightness-110 active:scale-[0.98]` 
            : 'bg-zinc-100 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/5 hover:bg-zinc-200 dark:hover:bg-white/10'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 truncate text-left">
          {currentCat ? (
            <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0" />
          )}
          <span className="truncate">{currentCat ? currentCat.name : placeholder}</span>
        </div>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-500 ${isOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div id="category-dropdown-portal" className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 md:p-6">
              {/* Backdrop with Deep Blur */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[32px] border border-white/20 dark:border-white/10 shadow-2xl pointer-events-auto w-full max-w-sm overflow-hidden"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Оберіть категорію</span>
                  <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors">
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>

                {!isAdding ? (
                  <div className="p-4 space-y-4">
                    {/* Search & Tabs Section */}
                    <div className="space-y-4">
                      {/* Search Bar */}
                      <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl px-3 py-2.5 focus-within:ring-2 ring-blue-500/50 transition-all border border-transparent dark:border-white/5">
                        <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Пошук категорії..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="bg-transparent border-none text-[12px] font-bold outline-none w-full text-zinc-900 dark:text-zinc-100"
                        />
                      </div>

                      {/* Glassmorphism Sub-tabs */}
                      <div className="flex bg-zinc-100/50 dark:bg-zinc-950/40 p-1 rounded-[18px] border border-zinc-200/50 dark:border-white/5 shadow-inner">
                        {[
                          { id: 'plan', label: 'План' },
                          { id: 'recent', label: 'Недавні' },
                          { id: 'accounts', label: 'Всі' },
                          { id: 'goals', label: 'Цілі' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-2 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                              activeTab === tab.id
                                ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-md ring-1 ring-zinc-200/50 dark:ring-white/10'
                                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar -mx-1 px-1">
                      <div className="p-1 space-y-1">
                        <button
                          onClick={() => handleSelect('')}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors mb-2 border border-dashed border-zinc-200 dark:border-zinc-600 flex items-center justify-center gap-2 group"
                        >
                          <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
                          {placeholder}
                        </button>

                        {activeTab === 'recent' && (
                          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                            {recentCategories.length > 0 ? (
                              <div className="premium-select-grid overflow-y-auto max-h-[40vh] p-4">
                                {recentCategories.map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => handleSelect(c.id)}
                                    className={`category-chip ${currentCategoryId === c.id ? 'active' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                                  >
                                    <div className={`w-3 h-3 rounded-full ${c.color} shadow-sm group-hover:scale-110 transition-transform`} />
                                    <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">
                                      {c.name}
                                    </span>
                                    {currentCategoryId === c.id && <Check className="w-3 h-3 absolute top-2 right-2 text-white" />}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="py-10 text-center bg-zinc-50/50 dark:bg-zinc-900/20 rounded-2xl mx-1 mb-2 border border-zinc-100 dark:border-white/5 border-dashed">
                                <div className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-[0.2em] mb-1">Порожньо</div>
                                <div className="text-[8px] font-bold text-zinc-400/60 uppercase tracking-tight">Тут будуть ваші недавні категорії</div>
                              </div>
                            )}
                          </div>
                        )}

                        {activeTab === 'plan' && (
                          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                            {plannedCategories.length > 0 ? (
                              <div className="premium-select-grid overflow-y-auto max-h-[40vh] p-4">
                                {plannedCategories.map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => handleSelect(c.id)}
                                    className={`category-chip ${currentCategoryId === c.id ? 'active' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                                  >
                                    <div className={`w-3 h-3 rounded-full ${c.color} shadow-sm group-hover:scale-110 transition-transform`} />
                                    <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">
                                      {c.name}
                                    </span>
                                    {currentCategoryId === c.id && <Check className="w-3 h-3 absolute top-2 right-2 text-white" />}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="py-10 text-center bg-zinc-50/50 dark:bg-zinc-900/20 rounded-2xl mx-1 mb-2 border border-zinc-100 dark:border-white/5 border-dashed">
                                <div className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-[0.2em] mb-1">Порожньо</div>
                                <div className="text-[8px] font-bold text-zinc-400/60 uppercase tracking-tight">Категорій у плані немає</div>
                              </div>
                            )}
                          </div>
                        )}

                        {activeTab === 'accounts' && (
                          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                            {otherCategories.length > 0 ? (
                              <div className="premium-select-grid overflow-y-auto max-h-[40vh] p-4">
                                {otherCategories.map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => handleSelect(c.id)}
                                    className={`category-chip ${currentCategoryId === c.id ? 'active' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                                  >
                                    <div className={`w-3 h-3 rounded-full ${c.color} shadow-sm group-hover:scale-110 transition-transform`} />
                                    <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">
                                      {c.name}
                                    </span>
                                    {currentCategoryId === c.id && <Check className="w-3 h-3 absolute top-2 right-2 text-white" />}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="py-10 text-center bg-zinc-50/50 dark:bg-zinc-900/20 rounded-2xl mx-1 mb-2 border border-zinc-100 dark:border-white/5 border-dashed">
                                <div className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-[0.2em] mb-1">Порожньо</div>
                                <div className="text-[8px] font-bold text-zinc-400/60 uppercase tracking-tight">Інших категорій не знайдено</div>
                              </div>
                            )}
                          </div>
                        )}

                        {activeTab === 'goals' && (
                          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                            {goalCategories.length > 0 ? (
                              <div className="premium-select-grid overflow-y-auto max-h-[40vh] p-4">
                                {goalCategories.map(c => (
                                  <button
                                    key={c.id}
                                    onClick={() => handleSelect(c.id)}
                                    className={`category-chip ${currentCategoryId === c.id ? 'active' : 'bg-zinc-100 dark:bg-zinc-800'}`}
                                  >
                                    <div className={`w-3 h-3 rounded-full ${c.color} shadow-sm group-hover:scale-110 transition-transform`} />
                                    <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">
                                      {c.name}
                                    </span>
                                    {currentCategoryId === c.id && <Check className="w-3 h-3 absolute top-2 right-2 text-white" />}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="py-10 text-center bg-zinc-50/50 dark:bg-zinc-900/20 rounded-2xl mx-1 mb-2 border border-zinc-100 dark:border-white/5 border-dashed">
                                <div className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-[0.2em] mb-1">Порожньо</div>
                                <div className="text-[8px] font-bold text-zinc-400/60 uppercase tracking-tight">Цілей не знайдено</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-2 pt-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
                        className="w-full py-3 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all rounded-b-[20px]"
                      >
                        <Plus className="w-3 h-3" />
                        {activeTab === 'goals' ? 'Нова ціль' : 'Нова категорія'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Нова категорія</span>
                      <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-3.5 h-3.5 text-zinc-400" /></button>
                    </div>
                    
                    <input
                      autoFocus
                      type="text"
                      placeholder="Назва..."
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newName) {
                          onAdd(newName, type, newColor).then(id => { if (id) onSelect(id); setIsOpen(false); });
                        }
                      }}
                      className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-blue-500/50 transition-all dark:text-white"
                    />

                    <div className="grid grid-cols-6 gap-2">
                      {CATEGORY_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setNewColor(color)}
                          className={`w-full aspect-square rounded-lg ${color} transition-all duration-300 ${newColor === color ? 'ring-2 ring-offset-2 ring-blue-500 ring-offset-white dark:ring-offset-zinc-900 scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'}`}
                        />
                      ))}
                    </div>

                    <button
                      disabled={!newName}
                      onClick={() => onAdd(newName, type, newColor).then(id => { if (id) onSelect(id); setIsOpen(false); })}
                      className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none mt-2"
                    >
                      Створити категорію
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
