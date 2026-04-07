import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Milestone, Preset } from './HistoricalPresets';
import { Calendar, Star, TrendingUp, Info } from 'lucide-react';

interface HistoricalTimelineProps {
  preset: Preset;
  t: (key: string) => string;
  principal: number;
  monthly: number;
  currency: string;
}

const HistoricalTimeline: React.FC<HistoricalTimelineProps> = ({ preset, t, principal, monthly, currency }) => {
  const milestones = preset.milestones || [];
  
  const calculatedMilestones = useMemo(() => {
    if (!milestones.length) return [];
    
    // Simple simulation logic for milestones
    // We assume the user starts investing at the first year of the preset
    const startYear = milestones[0].year;
    
    return milestones.map((m, idx) => {
      const yearsPassed = m.year - startYear;
      const monthlyRate = Math.pow(1 + preset.cagr / 100, 1 / 12) - 1;
      
      let currentVal = principal;
      const totalMonths = yearsPassed * 12;
      
      for (let i = 0; i < totalMonths; i++) {
        currentVal *= (1 + monthlyRate);
        currentVal += monthly;
      }
      
      return {
        ...m,
        portfolioValue: Math.round(currentVal),
        isStart: idx === 0
      };
    });
  }, [preset, milestones, principal, monthly]);

  if (milestones.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative space-y-6"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
            {t('historicalTimeline')}
          </h3>
          <p className="text-xs text-zinc-500 font-medium">
            {t('preset' + preset.id.charAt(0).toUpperCase() + preset.id.slice(1) + 'Title')} • {preset.years}Y {t('history')}
          </p>
        </div>
      </div>

      <div className="relative pl-8 space-y-12 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-emerald-500 before:to-zinc-200 dark:before:to-zinc-800">
        {calculatedMilestones.map((m, idx) => (
          <motion.div 
            key={m.year}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="relative group"
          >
            {/* Timeline Dot */}
            <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-zinc-900 shadow-sm transition-transform group-hover:scale-125 z-10 ${
              m.isStart ? 'bg-indigo-500' : 'bg-emerald-500'
            }`} />

            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 p-5 rounded-3xl group-hover:border-indigo-500/30 transition-all">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 px-2 py-0.5 rounded-lg">
                    {m.year}
                  </span>
                  <span className="text-sm font-bold text-zinc-800 dark:text-white">
                    {t(m.labelKey)}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-500" />
                    <span>Price: ${m.price}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>{m.isStart ? t('eventStart') : `${m.year - milestones[0].year}Y Later`}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter mb-1">
                  Estimated Portfolio
                </span>
                <span className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {currency === 'USD' ? '$' : '₴'}{m.portfolioValue.toLocaleString()}
                </span>
                {idx > 0 && (
                  <span className="text-[10px] font-bold text-emerald-500 mt-1">
                    +{Math.round((m.portfolioValue / calculatedMilestones[idx-1].portfolioValue - 1) * 100)}% Growth
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        
        {/* Risk Disclaimer */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3 items-start">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
            Цей таймлайн базується на історичних даних {preset.id && preset.id.toUpperCase()}. Реальний ріст був нелінійним, з періодами значних спадів. Розрахунки капіталу є оціночними.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default HistoricalTimeline;
