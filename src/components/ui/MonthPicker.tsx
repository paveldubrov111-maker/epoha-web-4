import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
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
  small?: boolean;
  className?: string;
}

export const MonthPicker = ({ 
  value, 
  onChange, 
  language,
  small,
  className
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

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateCoords = () => {
    if (pickerRef.current) {
      const rect = pickerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className || ''}`} ref={pickerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ${small ? 'px-3 py-1.5 rounded-xl' : 'px-4 py-2 rounded-2xl'} bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer group`}
      >
        <Calendar className={`${small ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-400 group-hover:scale-110 transition-transform`} />
        <span className={`${small ? 'text-[9px]' : 'text-[11px]'} font-black text-zinc-900 dark:text-white uppercase tracking-widest whitespace-nowrap`}>
          {new Date(currentYear, currentMonth, 1).toLocaleString(locale, { month: 'long', year: 'numeric' })}
        </span>
        <ChevronDown className={`${small ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed p-6 bg-zinc-950/90 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.5)] w-[300px] overflow-hidden"
              style={{
                position: 'absolute',
                zIndex: 'var(--z-dropdown)',
                top: coords.top + 8,
                left: Math.max(10, Math.min(window.innerWidth - 310, coords.left + (coords.width / 2) - 150))
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6 px-1">
                  <button 
                    onClick={() => onChange(`${currentYear - 1}-${(currentMonth + 1).toString().padStart(2, '0')}`)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/10"
                  >
                    <ChevronLeft className="w-5 h-5 text-zinc-400" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">Рік</span>
                    <span className="text-xl font-black text-white tracking-tighter">{currentYear}</span>
                  </div>
                  <button 
                    onClick={() => onChange(`${currentYear + 1}-${(currentMonth + 1).toString().padStart(2, '0')}`)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/10"
                  >
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {months.map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => {
                        onChange(`${currentYear}-${(idx + 1).toString().padStart(2, '0')}`);
                        setIsOpen(false);
                      }}
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all relative overflow-hidden group/btn ${
                        idx === currentMonth 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                          : 'hover:bg-white/5 text-zinc-400 hover:text-white border border-transparent hover:border-white/5'
                      }`}
                    >
                      <span className="relative z-10">{m.slice(0, 3)}</span>
                      {idx === currentMonth && (
                        <motion.div layoutId="active-month" className="absolute inset-0 bg-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="mt-8 pt-5 border-t border-white/5 flex gap-3">
                  <button 
                    onClick={() => {
                      onChange(new Date().toISOString().slice(0, 7));
                      setIsOpen(false);
                    }}
                    className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all text-center"
                  >
                    {language === 'uk' ? 'Сьогодні' : language === 'ru' ? 'Сегодня' : 'Today'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
