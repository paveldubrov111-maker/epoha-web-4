import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, CheckCircle2, AlertCircle } from 'lucide-react';

interface ScenarioProps {
  block: {
    id: string;
    story: string;
    q: string;
    opts: { text: string; isGood: boolean; fb: string }[];
  };
  onGood: () => void;
}

const ScenarioBlock: React.FC<ScenarioProps> = ({ block, onGood }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <div className="scenario bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-6">
      <div className="sc-story text-[13px] text-gray-400 leading-relaxed mb-4 p-4 bg-white/[0.03] rounded-xl border border-white/5 italic">
        <Lightbulb size={16} className="text-blue-500 mb-2" />
        {block.story}
      </div>
      <div className="sc-q text-sm font-bold text-white mb-4 leading-relaxed tracking-tight">
        {block.q}
      </div>
      <div className="sc-opts space-y-2">
        {block.opts.map((opt, idx) => {
          let stateClass = "border-white/5 text-gray-400 hover:bg-white/[0.03]";
          if (isSubmitted) {
            if (opt.isGood) stateClass = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 scale-[1.02] z-10 shadow-[0_0_20px_rgba(16,185,129,0.1)]";
            else if (selected === idx) stateClass = "border-red-500/50 bg-red-500/10 text-red-500";
            else stateClass = "border-white/5 opacity-30 blur-[0.5px] scale-95";
          } else if (selected === idx) {
            stateClass = "border-blue-500/50 bg-blue-500/10 text-blue-300";
          }

          return (
            <button
              key={idx}
              disabled={isSubmitted}
              className={`sc-opt w-full text-left p-3.5 rounded-xl border text-[13px] font-medium leading-relaxed transition-all duration-500 ${stateClass}`}
              onClick={() => {
                setSelected(idx);
                setIsSubmitted(true);
                if (opt.isGood) onGood();
              }}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {isSubmitted && (
          <motion.div 
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            className={`sc-res mt-4 p-4 rounded-xl text-xs leading-relaxed font-bold flex gap-3 ${
              block.opts[selected!].isGood 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}
          >
            {block.opts[selected!].isGood ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            {block.opts[selected!].fb}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScenarioBlock;
