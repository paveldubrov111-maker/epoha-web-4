import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Cpu, Rocket, ArrowRight } from 'lucide-react';

interface CategoryGridProps {
  onSelect: (id: 'finance' | 'digital' | 'business') => void;
  stats: {
    finance: number; // completed/total
    digital: number;
    business: number;
  };
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ onSelect, stats }) => {
  const categories = [
    {
      id: 'finance' as const,
      title: 'Фінансова грамотність',
      desc: 'Психологія, облік, борги та інвестування',
      icon: <ShieldCheck size={32} className="text-blue-400" />,
      color: 'from-blue-600/20 to-blue-900/40',
      borderColor: 'border-blue-500/20',
      hoverBorder: 'hover:border-blue-500/50',
      accent: 'bg-blue-500',
      progress: stats.finance
    },
    {
      id: 'digital' as const,
      title: 'Цифрова економіка',
      desc: 'Система Bitbon та блокчейн-технології',
      icon: <Cpu size={32} className="text-indigo-400" />,
      color: 'from-indigo-600/20 to-indigo-900/40',
      borderColor: 'border-indigo-500/20',
      hoverBorder: 'hover:border-indigo-500/50',
      accent: 'bg-indigo-500',
      progress: stats.digital
    },
    {
      id: 'business' as const,
      title: 'Бізнес',
      desc: 'Мислення підприємця та стратегія життя',
      icon: <Rocket size={32} className="text-emerald-400" />,
      color: 'from-emerald-600/20 to-emerald-900/40',
      borderColor: 'border-emerald-500/20',
      hoverBorder: 'hover:border-emerald-500/50',
      accent: 'bg-emerald-500',
      progress: stats.business
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {categories.map((cat, idx) => (
        <motion.div
          key={cat.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`group relative overflow-hidden bg-gradient-to-br ${cat.color} border-2 ${cat.borderColor} ${cat.hoverBorder} rounded-[2.5rem] p-8 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-${cat.accent.split('-')[1]}-500/10`}
          onClick={() => onSelect(cat.id)}
        >
          {/* Background Decorative Blur */}
          <div className={`absolute -right-10 -bottom-10 w-40 h-40 ${cat.accent} opacity-10 blur-[60px] group-hover:opacity-20 transition-opacity`} />
          
          <div className="relative z-10 flex flex-col h-full min-h-[180px]">
            <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
              {cat.icon}
            </div>
            
            <h3 className="text-xl font-black text-white mb-2 leading-tight uppercase tracking-tight">{cat.title}</h3>
            <p className="text-xs text-gray-400 font-medium mb-8 leading-relaxed">{cat.desc}</p>
            
            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                <span>Прогрес: {cat.progress}%</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <ArrowRight size={14} className="text-white opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default CategoryGrid;
