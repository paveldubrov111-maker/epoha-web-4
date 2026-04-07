import React from 'react';
import { Badge, UserProgress } from '../academyTypes';

interface BadgesListProps {
  badges: Badge[];
  earnedBadges: string[];
}

const BadgesList: React.FC<BadgesListProps> = ({ badges, earnedBadges }) => {
  return (
    <div className="badges-row bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 mb-8">
      <div className="badges-title text-[10px] font-black text-blue-500/50 uppercase tracking-[0.2em] mb-5">
        Ваші досягнення
      </div>
      <div className="badges-grid flex gap-5 overflow-x-auto pb-4 scrollbar-none">
        {badges.map((badge, idx) => {
          const isEarned = earnedBadges.includes(badge.id);
          
          return (
            <div 
              key={idx} 
              className="badge-item flex flex-col items-center gap-3 shrink-0 group" 
              title={badge.desc}
            >
              <div className={`badge-ico w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all duration-500 ${
                isEarned 
                  ? 'border-amber-400 bg-amber-400/10 shadow-[0_4px_20px_rgba(251,191,36,0.15)] group-hover:scale-110' 
                  : 'border-white/5 bg-white/[0.02] grayscale opacity-40'
              }`}>
                {badge.icon}
              </div>
              <div className={`badge-lbl text-[10px] font-bold text-center max-w-[64px] leading-tight transition-colors ${
                isEarned ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {badge.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgesList;
