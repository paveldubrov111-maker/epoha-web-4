import React from 'react';
import { Building2, Home, Car, Gem, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface PropertyCardProps {
  totalValue: number;
  assetsCount: number;
  formatValue: (val: number) => string;
  onClick: () => void;
  language: 'uk' | 'ru' | 'en';
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  totalValue, 
  assetsCount, 
  formatValue, 
  onClick,
  language 
}) => {
  const t = {
    uk: { title: 'Майно', subtitle: 'Фізичні активи', details: 'Детальніше' },
    ru: { title: 'Имущество', subtitle: 'Физические активы', details: 'Подробнее' },
    en: { title: 'Property', subtitle: 'Physical Assets', details: 'Details' }
  }[language];

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative overflow-hidden p-6 rounded-[32px] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 shadow-sm transition-all cursor-pointer group"
    >
      {/* Decorative Background Icon */}
      <div className="absolute -right-8 -bottom-8 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
        <Building2 size={160} />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-amber-500/10 rounded-2xl">
            <Home className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-800 rounded-full border border-zinc-100 dark:border-zinc-700">
             <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{assetsCount} од.</span>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">{t.subtitle}</div>
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">{t.title}</h3>
              <div className="text-3xl font-black text-amber-500 tracking-tighter mt-1">
                {formatValue(totalValue)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center -mb-1 shadow-lg transform group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
