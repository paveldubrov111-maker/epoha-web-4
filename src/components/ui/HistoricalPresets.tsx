import React from 'react';
import { motion } from 'motion/react';
import { Smartphone, Zap, Activity, Cpu, Package, Coins, Globe, Monitor, Play, Layers } from 'lucide-react';

export interface Milestone {
  year: number;
  price: number;
  labelKey: string;
}

export interface Preset {
  id: string;
  titleKey: string;
  descKey: string;
  cagr: number;
  years: number;
  icon: any;
  color: string;
  milestones?: Milestone[];
}

interface HistoricalPresetsProps {
  t: (key: string) => string;
  onSelect: (preset: Preset) => void;
}

export const PRESETS: Preset[] = [
  { 
    id: 'apple', 
    titleKey: 'presetAppleTitle', 
    descKey: 'presetAppleDesc', 
    cagr: 25, 
    years: 20, 
    icon: Smartphone, 
    color: 'text-zinc-400',
    milestones: [
      { year: 2002, price: 0.25, labelKey: 'eventAppleIpod' },
      { year: 2007, price: 3.00, labelKey: 'eventAppleIphone' },
      { year: 2012, price: 20, labelKey: 'eventAppleIpad' },
      { year: 2022, price: 150, labelKey: 'eventAppleLeader' },
    ]
  },
  { 
    id: 'btc', 
    titleKey: 'presetBtcTitle', 
    descKey: 'presetBtcDesc', 
    cagr: 150, 
    years: 10, 
    icon: Zap, 
    color: 'text-orange-500',
    milestones: [
      { year: 2011, price: 1, labelKey: 'eventBtcParity' },
      { year: 2013, price: 1000, labelKey: 'eventBtcPeak' },
      { year: 2017, price: 20000, labelKey: 'eventBtcBoom' },
      { year: 2021, price: 64000, labelKey: 'eventBtcAdopt' },
    ]
  },
  { 
    id: 'tesla', 
    titleKey: 'presetTeslaTitle', 
    descKey: 'presetTeslaDesc', 
    cagr: 50, 
    years: 14, 
    icon: Activity, 
    color: 'text-rose-500',
    milestones: [
      { year: 2010, price: 1.20, labelKey: 'eventTeslaIpo' },
      { year: 2013, price: 10, labelKey: 'eventTeslaSuccess' },
      { year: 2020, price: 235, labelKey: 'eventTeslaSp500' },
      { year: 2021, price: 400, labelKey: 'eventTeslaLeader' },
    ]
  },
  { 
    id: 'nvda', 
    titleKey: 'presetNvdaTitle', 
    descKey: 'presetNvdaDesc', 
    cagr: 60, 
    years: 10, 
    icon: Cpu, 
    color: 'text-emerald-500',
    milestones: [
      { year: 2015, price: 5, labelKey: 'eventNvdaDeep' },
      { year: 2018, price: 50, labelKey: 'eventNvdaCrypto' },
      { year: 2023, price: 450, labelKey: 'eventNvdaAi' },
      { year: 2024, price: 1000, labelKey: 'eventNvdaKing' },
    ]
  },
  { id: 'amzn', titleKey: 'presetAmznTitle', descKey: 'presetAmznDesc', cagr: 28, years: 24, icon: Package, color: 'text-amber-600' },
  { id: 'gold', titleKey: 'presetGoldTitle', descKey: 'presetGoldDesc', cagr: 9, years: 20, icon: Coins, color: 'text-yellow-500' },
  { id: 'spy', titleKey: 'presetSpyTitle', descKey: 'presetSpyDesc', cagr: 10, years: 24, icon: Globe, color: 'text-blue-500' },
  { id: 'msft', titleKey: 'presetMsftTitle', descKey: 'presetMsftDesc', cagr: 20, years: 24, icon: Monitor, color: 'text-blue-400' },
  { id: 'nflx', titleKey: 'presetNflxTitle', descKey: 'presetNflxDesc', cagr: 30, years: 22, icon: Play, color: 'text-red-500' },
  { id: 'eth', titleKey: 'presetEthTitle', descKey: 'presetEthDesc', cagr: 100, years: 9, icon: Layers, color: 'text-indigo-400' },
];

const HistoricalPresets: React.FC<HistoricalPresetsProps> = ({ t, onSelect }) => {
  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-2 px-1">
         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Historical Case Studies</span>
         <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/50"></div>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1">
        {PRESETS.map((p) => (
          <motion.button
            key={p.id}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(p)}
            className="flex-shrink-0 w-[240px] p-4 rounded-3xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 hover:border-indigo-500/30 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 group-hover:bg-indigo-500/10 transition-colors ${p.color}`}>
                <p.icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{t(p.titleKey)}</h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed font-medium">
                  {t(p.descKey)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">+{p.cagr}% CAGR</span>
                  <span className="text-[10px] font-black text-zinc-400 bg-zinc-400/10 px-2 py-0.5 rounded-full">{p.years}Y</span>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default HistoricalPresets;
