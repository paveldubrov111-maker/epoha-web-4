import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { DAILY_QUESTIONS } from '../academyData';

interface DailyReviewProps {
  onComplete: (xp: number) => void;
  isDone: boolean;
}

const DailyReview: React.FC<DailyReviewProps> = ({ onComplete, isDone }) => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const question = DAILY_QUESTIONS[currentQ % DAILY_QUESTIONS.length];

  const handleFinish = () => {
    onComplete(50); // XP reward for daily review
    setIsFinished(true);
  };

  if (isDone || isFinished) return null;

  if (!showQuiz) {
    return (
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="daily-card bg-gradient-to-br from-blue-600/20 to-purple-600/10 border border-blue-500/20 rounded-3xl p-6 mb-8 flex items-center justify-between gap-4 shadow-2xl relative overflow-hidden group cursor-pointer"
        onClick={() => setShowQuiz(true)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
            <Zap size={24} fill="currentColor" />
          </div>
          <div>
            <div className="text-sm font-black text-white uppercase tracking-tight">Щоденне повторення</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Отримай +50 XP та зміцни знання</div>
          </div>
        </div>
        <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl border border-white/5 transition-all">
          <RefreshCw size={18} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="daily-quiz bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 mb-8 shadow-2xl relative overflow-hidden"
    >
      <div className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest mb-6">
        <Sparkles size={14} /> Щоденна розминка
      </div>
      
      <div className="text-lg font-bold text-white mb-6 leading-tight tracking-tight">
        {question.q}
      </div>

      <div className="space-y-3">
        {question.opts.map((opt, idx) => {
          let stateClass = "border-white/5 text-gray-400 hover:bg-white/[0.03]";
          if (isSubmitted) {
            if (idx === question.a) stateClass = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400";
            else if (selected === idx) stateClass = "border-red-500/50 bg-red-500/10 text-red-500";
            else stateClass = "border-white/5 opacity-20 grayscale scale-95";
          } else if (selected === idx) {
            stateClass = "border-blue-500/50 bg-blue-500/10 text-blue-300";
          }

          return (
            <button
              key={idx}
              disabled={isSubmitted}
              className={`w-full text-left p-4 rounded-2xl border text-[13px] font-bold leading-relaxed transition-all duration-500 ${stateClass}`}
              onClick={() => {
                setSelected(idx);
                setIsSubmitted(true);
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {isSubmitted && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-6 space-y-4"
          >
            <div className={`p-4 rounded-xl text-[11px] font-black uppercase tracking-tight flex gap-3 ${selected === question.a ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
              {selected === question.a ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {question.fb}
            </div>
            <button 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 uppercase text-xs tracking-widest"
              onClick={handleFinish}
            >
              Завершити розминку ✓
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DailyReview;
