import React from 'react';
import { UserProgress } from '../academyTypes';

interface AcademyStatsProps {
  progress: UserProgress;
}

const AcademyStats: React.FC<AcademyStatsProps> = ({ progress }) => {
  const stats = [
    { label: 'Модулів', value: `${progress.completedModules.length}/7`, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'XP зароблено', value: progress.xp.toLocaleString('uk-UA'), color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Завдань', value: progress.completedTasks, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Днів навчання', value: progress.streak, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="stats-row grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {stats.map((stat, idx) => (
        <div key={idx} className="stat bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10">
          <div className={`stat-v text-xl font-black mb-1 ${stat.color} tracking-tight`}>
            {stat.value}
          </div>
          <div className="stat-l text-[10px] uppercase font-bold text-gray-500 tracking-widest whitespace-nowrap">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AcademyStats;
