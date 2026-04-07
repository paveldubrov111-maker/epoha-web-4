import React from 'react';
import { Wallet, TrendingUp, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavProps {
  activeTab: 'investments' | 'budget' | 'academy';
  onTabChange: (tab: 'investments' | 'budget' | 'academy') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'budget', label: 'Бюджет', icon: Wallet, color: 'bg-blue-500' },
    { id: 'investments', label: 'Інвестиції', icon: TrendingUp, color: 'bg-emerald-500' },
    { id: 'academy', label: 'Навчання', icon: BookOpen, color: 'bg-indigo-500' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[var(--z-dock)] md:hidden">
      <div className="ios-dock safe-bottom px-4 pt-4 pb-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className="flex flex-col items-center gap-1 transition-all group relative"
            >
              <div className={`ios-icon-container w-16 h-16 shadow-2xl ${
                isActive ? `bg-gradient-to-br ${tab.id === 'budget' ? 'from-blue-400 to-indigo-600' : tab.id === 'investments' ? 'from-emerald-400 to-teal-600' : 'from-violet-400 to-purple-600'} scale-110 -translate-y-2` : 'bg-white/10 dark:bg-black/20'
              }`}>
                <div className={`absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity`} />
                <Icon className={`w-8 h-8 transition-all drop-shadow-lg ${
                  isActive ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'
                }`} />
              </div>
              <div className={`w-1 h-1 rounded-full bg-current transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-all ${
                isActive ? 'text-zinc-900 dark:text-white opacity-100' : 'text-zinc-500 opacity-40'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
