import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Square } from 'lucide-react';

interface ChecklistProps {
  block: {
    id: string;
    tasks: { text: string; xp: number }[];
  };
  onTaskComplete: (xp: number) => void;
  savedTasks?: number[]; // Array of completed task indices
}

const ChecklistBlock: React.FC<ChecklistProps> = ({ block, onTaskComplete, savedTasks = [] }) => {
  const [completed, setCompleted] = useState<Set<number>>(new Set(savedTasks));

  useEffect(() => {
    setCompleted(new Set(savedTasks));
  }, [savedTasks]);

  const toggleTask = (idx: number, xp: number) => {
    if (completed.has(idx)) return;
    
    setCompleted(new Set([...Array.from(completed), idx]));
    onTaskComplete(xp);
  };

  return (
    <div className="task-list-container bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-8">
      <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <CheckSquare size={14} /> Чек-лист дій
      </div>
      <div className="space-y-1">
        {block.tasks.map((task, idx) => {
          const isDone = completed.has(idx);
          
          return (
            <div 
              key={idx} 
              className={`task-item flex items-start gap-4 p-3 rounded-xl transition-all duration-300 ${isDone ? 'opacity-50 grayscale bg-emerald-500/5' : 'hover:bg-white/[0.03] cursor-pointer'}`}
              onClick={() => toggleTask(idx, task.xp)}
            >
              <div className={`task-chk w-6 h-6 border-2 rounded-lg flex items-center justify-center transition-all duration-500 ${isDone ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-lg shadow-emerald-500/20' : 'border-white/10 text-transparent'}`}>
                {isDone ? <span className="text-white text-[10px] font-black select-none">✓</span> : <Square size={16} className="text-white/5" />}
              </div>
              <div className="task-content">
                <div className={`task-txt text-[13px] font-medium leading-relaxed transition-all duration-500 ${isDone ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                  {task.text}
                </div>
                {!isDone && <div className="text-[9px] font-black text-amber-500 mt-1 uppercase tracking-tighter">+{task.xp} XP</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChecklistBlock;
