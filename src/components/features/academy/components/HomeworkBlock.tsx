import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface HomeworkProps {
  block: {
    id: string;
    task: string;
    placeholder?: string;
  };
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
}

const HomeworkBlock: React.FC<HomeworkProps> = ({ block, value, onChange, onSave }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (value.trim().length < 10) {
      setError('Будь ласка, напишіть відповідь більш детально...');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setIsSaved(true);
    onSave();
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="hw bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-purple-500/20 rounded-3xl p-6 mb-8 shadow-xl">
      <div className="hw-hd flex items-center gap-3 mb-4">
        <div className="hw-icon w-10 h-10 bg-purple-500/15 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
          <FileText size={20} />
        </div>
        <div>
          <div className="hw-title text-sm font-black text-white uppercase tracking-tight">Домашнє завдання</div>
          <div className="hw-sub text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Відправте на перевірку ментору</div>
        </div>
      </div>

      <div className="hw-task text-[13.5px] font-medium text-gray-300 leading-relaxed mb-5 p-4 bg-black/20 rounded-2xl border border-white/5 shadow-inner">
        {block.task}
      </div>

      <textarea 
        className="hw-ta w-full bg-black/40 border-2 border-white/5 rounded-2xl p-5 text-sm text-white font-medium min-h-[120px] focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-gray-700 leading-relaxed shadow-lg"
        placeholder={block.placeholder || "Моя відповідь: ...\nЯкі дії я планую зробити: ..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="hw-actions flex items-center justify-between mt-4">
        <button 
          className={`hw-btn px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl ${
            isSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-purple-500 text-white shadow-purple-500/20 hover:scale-105 active:scale-95'
          }`}
          onClick={handleSave}
          disabled={isSaved}
        >
          {isSaved ? <><CheckCircle2 size={14} /> Збережено! </> : <><Send size={14} /> Здати ДЗ ✓ </>}
        </button>

        <div className="text-[10px] font-bold text-gray-600 flex items-center gap-1.5 border-b border-white/5 pb-1">
          або надіслати в <a href="#" className="text-blue-500 hover:text-blue-400 transition-colors">Telegram-бот</a>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-[10px] font-bold text-red-500 mt-3 text-center tracking-tight"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomeworkBlock;
