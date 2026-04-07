import React from 'react';
import { UserProgress } from '../academyTypes';

interface AcademyHeaderProps {
  progress: UserProgress;
  currentLevel: {
    name: string;
    index: number;
    nextMin: number;
    progressToNext: number;
  };
}

const AcademyHeader: React.FC<AcademyHeaderProps> = ({ progress, currentLevel }) => {
  return (
    <div className="course-header pb-6 border-b border-white/5 mb-7">
      <div className="hdr-top flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="logo-mark flex items-center gap-2.5">
          <div className="logo-icon w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-sm font-black text-white">B</div>
          <div className="logo-text text-sm font-bold">Bitbon <span className="text-blue-500">Academy</span></div>
        </div>
        <div className="hdr-pills flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
          <div className="pill bg-white/5 border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
            🔥 <span id="streak-v">{progress.streak}</span> днів
          </div>
          <div className="pill bg-white/5 border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 text-amber-400">
            ⚡ <span>{progress.xp.toLocaleString('uk-UA')}</span> XP
          </div>
          <div className="pill bg-white/5 border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 text-emerald-400">
            {progress.track === 'full' ? 'Повний курс' : progress.track === 'invest' ? 'Трек — Інвестиції' : 'Bitbon-трек'}
          </div>
        </div>
      </div>
      
      <div className="hdr-welcome mb-4">
        <div className="hdr-eyebrow text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">Фінансова стратегія на все життя</div>
        <h1 className="hdr-title text-3xl font-black text-white mb-2 tracking-tight">
          Вітаємо, <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">{progress.userName || 'друже'}</span> 👋
        </h1>
        <p className="hdr-sub text-sm text-gray-400/80 leading-relaxed font-medium">
          7 модулів · Відео від ментора · Живі практики · Спільнота Bitbon-інвесторів
        </p>
      </div>

      <div className="xp-section bg-white/[0.03] border border-white/5 rounded-2xl p-4 shadow-2xl">
        <div className="xp-meta flex justify-between mb-2 items-end">
          <span className="xp-level-name text-xs font-bold text-white tracking-wide">Рівень {currentLevel.index} — {currentLevel.name}</span>
          <span className="xp-count text-[11px] font-bold text-gray-400 tabular-nums">
            {progress.xp.toLocaleString('uk-UA')} / {currentLevel.nextMin.toLocaleString('uk-UA')} XP
          </span>
        </div>
        <div className="xp-track h-2 bg-black/40 rounded-full overflow-hidden mb-1.5 p-[2px]">
          <div 
            className="xp-fill h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-700 ease-out" 
            style={{ width: `${currentLevel.progressToNext}%` }}
          />
        </div>
        <div className="xp-mile flex justify-between px-1">
          <span className="xp-m text-[9px] font-bold text-gray-500 uppercase">Початок</span>
          <span className="xp-m text-[9px] font-bold text-gray-500 uppercase">Майстер</span>
        </div>
      </div>
    </div>
  );
};

export default AcademyHeader;
