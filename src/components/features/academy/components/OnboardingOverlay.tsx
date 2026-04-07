import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Target, Zap, Rocket, ChevronRight, User } from 'lucide-react';

interface OnboardingProps {
  onComplete: (data: { name: string; track: 'full' | 'invest' | 'bitbon' }) => void;
}

const OnboardingOverlay: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [track, setTrack] = useState<'full' | 'invest' | 'bitbon'>('full');

  const tracks = [
    { id: 'full', title: 'Повний курс', desc: 'Від азів до Bitbon-стратегій', icon: <Rocket size={20} />, color: 'blue' },
    { id: 'invest', title: 'Інвестор', desc: 'Тільки пасивний дохід та активи', icon: <Target size={20} />, color: 'emerald' },
    { id: 'bitbon', title: 'Bitbon Pro', desc: 'Глибоке занурення в екосистему', icon: <Zap size={20} />, color: 'purple' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0b0f]/90 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="onboarding-card max-w-md w-full bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Background blobs */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full" />

        <div className="onboard-progress flex gap-1.5 mb-8 justify-center">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'w-4 bg-white/10'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="s1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <div className="inline-flex p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-500 mb-4">
                  <Sparkles size={24} />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight mb-2">Привіт! Як тебе звати?</h2>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Персоналізуємо твоє навчання</p>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-gray-600 transition-colors group-focus-within:text-blue-500">
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Твоє ім'я..."
                  className="w-full bg-black/40 border-2 border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-gray-700 focus:outline-none focus:border-blue-500/50 transition-all shadow-inner"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(2)}
                />
              </div>
              <button 
                disabled={!name.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                onClick={() => setStep(2)}
              >
                Продовжити <ChevronRight size={18} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="s2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-black text-white tracking-tight leading-tight mb-2">Яка твоя мета, {name}?</h2>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Вибери свій навчальний шлях</p>
              </div>
              <div className="space-y-3">
                {tracks.map(t => (
                  <div 
                    key={t.id}
                    className={`p-4 rounded-[1.5rem] border-2 cursor-pointer transition-all duration-300 flex items-center gap-4 ${
                      track === t.id ? `bg-white/[0.04] border-blue-500 shadow-lg shadow-blue-500/5` : `bg-white/[0.02] border-white/5 opacity-60 hover:opacity-100`
                    }`}
                    onClick={() => setTrack(t.id as any)}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${track === t.id ? 'bg-blue-500 text-white shadow-xl' : 'bg-white/5 text-gray-500'}`}>
                      {t.icon}
                    </div>
                    <div className="flex-1">
                      <div className={`text-[15px] font-black tracking-tight ${track === t.id ? 'text-white' : 'text-gray-400'}`}>{t.title}</div>
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                onClick={() => onComplete({ name, track })}
              >
                Поїхали! <Rocket size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default OnboardingOverlay;
