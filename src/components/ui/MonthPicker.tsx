import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../../types';

export const getLocalizedMonths = (lang: Language) => {
  const locale = lang === 'uk' ? 'uk-UA' : lang === 'ru' ? 'ru-RU' : 'en-US';
  const months = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(2024, i, 1);
    months.push(date.toLocaleString(locale, { month: 'long' }));
  }
  return months;
};

interface MonthPickerProps {
  value: string;
  onChange: (val: string) => void;
  language: Language;
}

export const MonthPicker = ({ 
  value, 
  onChange, 
  language 
}: MonthPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const parseValue = (val: string) => {
    const parts = (val || '').split('-');
    let y = parseInt(parts[0]);
    let m = parseInt(parts[1]) - 1;
    if (isNaN(y)) y = new Date().getFullYear();
    if (isNaN(m)) m = new Date().getMonth();
    return { y, m };
  };

  const { y: currentYear, m: currentMonth } = useMemo(() => parseValue(value), [value]);
  
  const months = useMemo(() => getLocalizedMonths(language), [language]);
  const locale = language === 'uk' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-US';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={pickerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 px-3 py-1.5 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 capitalize shadow-sm"
      >
        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
        {new Date(currentYear, currentMonth, 1).toLocaleString(locale, { month: 'long', year: 'numeric' })}
        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute left-0 mt-2 p-4 bg-white dark:bg-zinc-900 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[1001] w-[280px]"
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <button 
                onClick={() => {
                  onChange(`${currentYear - 1}-${(currentMonth + 1).toString().padStart(2, '0')}`);
                }}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-500" />
              </button>
              <span className="text-sm font-black text-zinc-900 dark:text-white">{currentYear}</span>
              <button 
                onClick={() => {
                  onChange(`${currentYear + 1}-${(currentMonth + 1).toString().padStart(2, '0')}`);
                }}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {months.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => {
                    onChange(`${currentYear}-${(idx + 1).toString().padStart(2, '0')}`);
                    setIsOpen(false);
                  }}
                  className={`py-2 text-[10px] font-black uppercase tracking-tight rounded-xl transition-all ${
                    idx === currentMonth 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
              <button 
                onClick={() => {
                  onChange(new Date().toISOString().slice(0, 7));
                  setIsOpen(false);
                }}
                className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-colors"
              >
                {language === 'uk' ? 'Сьогодні' : language === 'ru' ? 'Сегодня' : 'Today'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
