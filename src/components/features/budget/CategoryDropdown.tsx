import React, { useState, useEffect, useRef } from 'react';
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

  const currentPlan = (monthlyPlans || []).find(mp => mp.id === month);
  const plannedIds = currentPlan?.plans ? Object.keys(currentPlan.plans) : [];

  const filteredCategories = categories
    .filter(c => c.type === type)
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const plannedCategories = filteredCategories.filter(c => plannedIds.includes(c.id));
  const otherCategories = filteredCategories.filter(c => !plannedIds.includes(c.id));

  const currentCat = categories.find(c => c.id === currentCategoryId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.left;
      
      // If less than 400px below and more space above, open up
      setOpenUp(spaceBelow < 400 && spaceAbove > spaceBelow);
      
      // If less than 300px to the right, align right-0 instead of left-0
      setOpenRight(spaceRight > 300);
    }
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} style={{ zIndex: isOpen ? 1000 : 1 }} ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-tight max-w-[140px] md:max-w-[180px] shadow-sm ${
          currentCat 
            ? `${currentCat.color} text-white ring-1 ring-white/20 hover:scale-[1.02] active:scale-[0.98]` 
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
        }`}
      >
        <div className="flex items-center gap-1.5 flex-1 truncate text-left">
          {currentCat && <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
          <span className="truncate">{currentCat ? currentCat.name : placeholder}</span>
        </div>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: openUp ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: openUp ? 10 : -10 }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute ${openRight ? 'left-0' : 'right-0'} ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'} w-64 md:w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[1000] overflow-hidden`}
          >
            {!isAdding ? (
              <div className="p-2">
                <div className="px-2 pb-2 pt-1 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                  <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-2 py-1.5 focus-within:ring-2 ring-blue-500/30 transition-all">
                    <Search className="w-3 h-3 text-zinc-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Пошук..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="bg-transparent border-none text-[11px] font-bold outline-none w-full dark:text-white"
                    />
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-1 custom-scrollbar space-y-1">
                  <button
                    onClick={() => { onSelect(''); setIsOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mb-2 border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-2 group"
                  >
                    <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    {placeholder}
                  </button>

                  {plannedCategories.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-1.5 text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                        <div className="w-1 h-3 bg-blue-500 rounded-full" />
                        У плані
                      </div>
                      {plannedCategories.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { onSelect(c.id); setIsOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 group transition-all mb-1 ${currentCategoryId === c.id ? 'bg-blue-50 dark:bg-blue-900/20 shadow-sm border border-blue-100 dark:border-blue-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-transparent'}`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full ${c.color} shadow-sm group-hover:scale-110 transition-transform`} />
                          <span className={`text-[10px] font-bold uppercase tracking-tight ${currentCategoryId === c.id ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {c.name}
                          </span>
                          {currentCategoryId === c.id && <Check className="w-3.5 h-3.5 ml-auto text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {otherCategories.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-1.5 text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                        <div className="w-1 h-3 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                        Інші категорії
                      </div>
                      {otherCategories.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { onSelect(c.id); setIsOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 group transition-all mb-1 ${currentCategoryId === c.id ? 'bg-zinc-100 dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-transparent'}`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full ${c.color} shadow-sm opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all`} />
                          <span className={`text-[10px] font-bold uppercase tracking-tight ${currentCategoryId === c.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {c.name}
                          </span>
                          {currentCategoryId === c.id && <Check className="w-3.5 h-3.5 ml-auto text-zinc-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
                  className="w-full mt-2 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors rounded-b-[20px]"
                >
                  <Plus className="w-3 h-3" />
                  Нова категорія
                </button>
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
        )}
      </AnimatePresence>
    </div>
  );
}
