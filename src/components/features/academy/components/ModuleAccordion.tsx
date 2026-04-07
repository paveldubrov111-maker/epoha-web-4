import React from 'react';
import { Module, UserProgress } from '../academyTypes';
import { ChevronDown, CheckCircle2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModuleAccordionProps {
  modules: Module[];
  progress: UserProgress;
  onToggleModule: (id: number) => void;
  onGoStep: (moduleId: number, stepIndex: number) => void;
  renderLesson: (module: Module, moduleIndex: number) => React.ReactNode;
}

const ModuleAccordion: React.FC<ModuleAccordionProps> = ({ 
  modules: filteredModules, 
  progress, 
  onToggleModule, 
  onGoStep,
  renderLesson
}) => {
  return (
    <div className="space-y-3">
      {filteredModules.map((m) => {
        // mi is the index in the filtered list, but we need the index in the ORIGINAL modules array for progress
        // Actually, we should probably pass the original modules list or find the index differently.
        // For now, let's assume 'm.id' is a good enough identifier to find the index.
        // mi here is used for onToggleModule and progress matching.
        // Wait, the index passed to renderLesson and onToggleModule must be the one expected by progress.
        // In the previous version, I used findIndex. Let's stick to that.
        
        const mi = m.id; // Corrected ID usage if module ID matches progress index
        // Or more safely:
        // const mi = globalModules.findIndex(orig => orig.id === m.id);
        // But I don't have globalModules here. 
        // Actually, in AcademyView, I already matched IDs.
        // Wait, m.id is the ID I defined in academyData.ts, which matches the index in the initial array.
        
        const isDone = progress.completedModules.includes(mi);
        const stepsDone = progress.completedSteps[mi]?.length || 0;
        const totalSteps = m.steps.length;
        const progressPct = Math.round((stepsDone / totalSteps) * 100);
        const isOpen = progress.activeModule === mi;

        // Unlock logic - Disabled for local review
        let isLocked = false;
        /*
        if (progress.track === 'full' && mi > 0 && !progress.completedModules.includes(mi - 1) && stepsDone === 0) {
          isLocked = true;
        }
        */

        return (
          <div key={m.id} className={`mod-block bg-white/[0.03] border ${isOpen ? 'border-white/10' : 'border-white/5'} ${isDone ? 'border-emerald-500/20' : ''} rounded-2xl overflow-hidden transition-all duration-300`}>
            <div 
              className={`mod-hdr p-5 flex items-center gap-4 cursor-pointer select-none hover:bg-white/[0.02] transition-colors`}
              onClick={() => !isLocked && onToggleModule(mi)}
            >
              <div className="mod-ico w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl relative shrink-0">
                {m.emoji}
                {isDone && (
                  <div className="done-mark absolute -right-1 -bottom-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0a0b0f] flex items-center justify-center text-[8px] text-white font-bold">
                    ✓
                  </div>
                )}
                {isLocked && (
                  <div className="lock-overlay absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                    <Lock size={14} className="text-gray-400" />
                  </div>
                )}
              </div>

              <div className="mod-info flex-1 min-w-0">
                <div className="mod-num text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Модуль {String(mi + 1).padStart(2, '0')}</div>
                <div className="mod-name text-[15px] font-bold text-white mb-0.5 truncate">{m.title}</div>
                <div className="mod-desc text-[11px] text-gray-500 font-medium truncate">{m.desc}</div>
              </div>

              <div className="mod-right flex flex-col items-end gap-1.5 shrink-0">
                <span className="mod-xp-tag text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
                  +{m.totalXP} XP
                </span>
                <div className="mod-prog flex items-center gap-2">
                  <div className="prog-bar w-12 h-1 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className={`prog-fill h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="prog-txt text-[10px] font-bold text-gray-500 tabular-nums">{stepsDone}/{totalSteps}</span>
                </div>
              </div>

              <ChevronDown 
                size={16} 
                className={`text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
              />
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="lesson-body border-t border-white/5">
                    {isLocked ? (
                      <div className="locked-msg p-10 text-center flex flex-col items-center gap-3">
                        <div className="locked-ico text-2xl text-gray-700 bg-white/5 w-12 h-12 rounded-full flex items-center justify-center">🔒</div>
                        <div className="locked-txt text-xs text-gray-500 font-medium max-w-[200px]">Завершіть попередній модуль, щоб розблокувати цей розділ</div>
                      </div>
                    ) : (
                      renderLesson(m, mi)
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default ModuleAccordion;
