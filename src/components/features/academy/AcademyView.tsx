import React, { useEffect, useState } from 'react';
import './Academy.css';
import { useAcademy } from '../../../hooks/useAcademy';
import AcademyHeader from './components/AcademyHeader';
import AcademyStats from './components/AcademyStats';
import ModuleAccordion from './components/ModuleAccordion';
import CategoryGrid from './components/CategoryGrid';
import LessonRenderer from './components/LessonRenderer';
import BadgesList from './components/BadgesList';
import DailyReview from './components/DailyReview';
import OnboardingOverlay from './components/OnboardingOverlay';
import AcademyAdmin from './components/AcademyAdmin';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, LogOut, ChevronLeft, ArrowRight } from 'lucide-react';

interface AcademyViewProps {
  userId: string | null;
}

const AcademyView: React.FC<AcademyViewProps> = ({ userId }) => {
  const { 
    progress, 
    setProgress, 
    modules, 
    updateContent,
    addXP, 
    completeStep, 
    currentLevel, 
    resetProgress,
    badges
  } = useAcademy(userId);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passError, setPassError] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<'finance' | 'digital' | 'business' | null>(null);

  // Calculate stats for categories
  const getCategoryStats = () => {
    const stats = { finance: 0, digital: 0, business: 0 };
    const categories: ('finance' | 'digital' | 'business')[] = ['finance', 'digital', 'business'];

    categories.forEach(catId => {
      const catModules = modules.filter(m => m.categoryId === catId);
      if (catModules.length === 0) return;

      let totalSteps = 0;
      let completedSteps = 0;

      catModules.forEach(m => {
        const mi = modules.findIndex(orig => orig.id === m.id);
        totalSteps += m.steps.length;
        completedSteps += progress.completedSteps[mi]?.length || 0;
      });

      stats[catId] = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    });

    return stats;
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'A') {
        if (isAdmin) setIsAdmin(false);
        else setShowPasswordPrompt(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin]);

  const handleAdminAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (adminPassword === 'epoha2026') {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      setAdminPassword('');
      setPassError(false);
    } else {
      setPassError(true);
      setTimeout(() => setPassError(false), 2000);
    }
  };

  const handleOnboardComplete = (data: { name: string; track: 'full' | 'invest' | 'bitbon' }) => {
    setProgress(prev => ({ 
      ...prev, 
      userName: data.name, 
      track: data.track, 
      onboardDone: true 
    }));
  };

  const isStepCompleted = (mId: number, sId: number) => {
    return progress.completedSteps[mId]?.includes(sId) || false;
  };

  const handleToggleModule = (mId: number) => {
    setProgress(prev => ({
      ...prev,
      activeModule: prev.activeModule === mId ? -1 : mId
    }));
  };

  const handleGoStep = (mId: number, sIdx: number) => {
    setProgress(prev => ({
      ...prev,
      activeSteps: { ...prev.activeSteps, [mId]: sIdx }
    }));
  };

  if (!progress) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0b0f]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!progress.onboardDone) {
    return <OnboardingOverlay onComplete={handleOnboardComplete} />;
  }

  return (
    <div className="academy-view bg-[#0a0b0f] min-h-screen text-white/90 selection:bg-blue-500/30">
      <AnimatePresence>
        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110]"
          >
            <AcademyAdmin 
              modules={modules} 
              onUpdate={updateContent} 
              onClose={() => setIsAdmin(false)} 
            />
          </motion.div>
        )}

        {showPasswordPrompt && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[2rem] max-w-xs w-full shadow-2xl"
            >
              <h3 className="text-sm font-black uppercase tracking-widest text-center mb-6 text-blue-500">Admin Mode</h3>
              <form onSubmit={handleAdminAuth} className="space-y-4">
                <input 
                  type="password" 
                  autoFocus
                  placeholder="Введіть пароль..."
                  className={`w-full bg-black/40 border-2 rounded-xl py-3 px-4 text-center font-bold outline-none transition-all ${passError ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/5 focus:border-blue-500/50'}`}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => { setShowPasswordPrompt(false); setAdminPassword(''); }}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Скасувати
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                  >
                    Увійти
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <header className="flex justify-between items-center mb-4">
          <div className="text-[10px] font-black tracking-[0.2em] text-blue-500 uppercase">Освітня платформа</div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowPasswordPrompt(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-blue-500 transition-colors"
              title="Admin Mode (Shift + A)"
            >
              <Settings size={16} />
            </button>
            <button 
              onClick={() => { if(confirm('Скинути весь прогрес?')) resetProgress(); }}
              className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-500 hover:text-red-500 transition-colors"
              title="Reset All"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <AcademyHeader progress={progress} currentLevel={currentLevel} />
        
        <AcademyStats progress={progress} />

        <BadgesList badges={badges} earnedBadges={progress.earnedBadges} />

        <DailyReview 
          isDone={!!progress.dailyDone && progress.dailyDone === new Date().toDateString()} 
          onComplete={(xp) => {
            addXP(xp);
            setProgress(prev => ({ ...prev, dailyDone: new Date().toDateString() }));
          }}
        />

        <AnimatePresence mode="wait">
          {!selectedCategoryId ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Continue Learning Block */}
              {(() => {
                // Find most advanced in-progress module
                const activeModIdx = modules.findIndex(m => {
                  const completed = progress.completedSteps[m.id]?.length || 0;
                  return completed > 0 && completed < m.steps.length;
                });
                
                if (activeModIdx === -1) return null;
                const activeMod = modules[activeModIdx];
                const completedCount = progress.completedSteps[activeMod.id].length;
                const progressPct = Math.round((completedCount / activeMod.steps.length) * 100);
                const nextStepIdx = progress.activeSteps[activeMod.id] || 0;
                const nextStep = activeMod.steps[nextStepIdx];

                return (
                  <div 
                    onClick={() => setSelectedCategoryId(activeMod.categoryId as any)}
                    className="continue-block relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-indigo-900/40 border-2 border-blue-500/20 rounded-[2.5rem] p-6 cursor-pointer group hover:border-blue-500/40 transition-all duration-500 shadow-2xl shadow-blue-500/5"
                  >
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500 opacity-10 blur-[60px] group-hover:opacity-20 transition-opacity" />
                    <div className="relative z-10 flex items-center gap-5">
                      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                        {activeMod.emoji}
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">На чому ви зупинились</div>
                        <h3 className="text-lg font-black text-white leading-tight uppercase mb-2">{activeMod.title}</h3>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden p-[1px]">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-gray-500">{progressPct}%</span>
                        </div>
                      </div>
                      <button className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:translate-x-1 transition-all">
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </div>
                );
              })()}

              <CategoryGrid 
                onSelect={(id) => setSelectedCategoryId(id)} 
                stats={getCategoryStats()}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => setSelectedCategoryId(null)}
                  className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all group"
                >
                  <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-white">
                    {selectedCategoryId === 'finance' && 'Фінансова грамотність'}
                    {selectedCategoryId === 'digital' && 'Цифрова економіка'}
                    {selectedCategoryId === 'business' && 'Бізнес'}
                  </h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {modules.filter(m => m.categoryId === selectedCategoryId).length} модулів доступно
                  </p>
                </div>
              </div>

              <ModuleAccordion 
                modules={modules.filter(m => m.categoryId === selectedCategoryId)} 
                progress={progress} 
                onToggleModule={handleToggleModule}
                onGoStep={handleGoStep}
                renderLesson={(module, mi) => {
                  const currentStepIdx = progress.activeSteps[mi] || 0;
                  const currentStep = module.steps[currentStepIdx];
                  
                  if (!currentStep) return <div className="p-10 text-center text-xs text-gray-600 font-black uppercase tracking-widest">Уроків поки немає</div>;

                  return (
                    <LessonRenderer 
                      module={module}
                      step={currentStep}
                      onCompleteStep={completeStep}
                      isStepCompleted={isStepCompleted(mi, currentStep.id)}
                      isFirstStep={currentStepIdx === 0}
                      isLastStep={currentStepIdx === module.steps.length - 1}
                      hwAnswers={progress.hwAnswers}
                      onHwChange={(id, val) => setProgress(prev => ({ ...prev, hwAnswers: { ...prev.hwAnswers, [id]: val } }))}
                      onAddXP={addXP}
                      onPrev={() => handleGoStep(mi, currentStepIdx - 1)}
                      onNext={() => {
                        if (currentStepIdx < module.steps.length - 1) {
                          handleGoStep(mi, currentStepIdx + 1);
                        } else {
                          handleToggleModule(mi);
                        }
                      }}
                    />
                  );
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="mt-20 pt-10 pb-20 border-t border-white/5 text-center">
          <div className="logo-mark inline-flex items-center gap-2.5 mb-4 opacity-30 grayscale">
            <div className="logo-icon w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-[10px] font-black text-white">B</div>
            <div className="logo-text text-[10px] font-bold uppercase tracking-widest">Bitbon <span className="text-blue-500">Academy</span></div>
          </div>
          <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Зроблено з 🤍 для спільноти Epoha</div>
        </footer>
      </div>
    </div>
  );
};

export default AcademyView;
