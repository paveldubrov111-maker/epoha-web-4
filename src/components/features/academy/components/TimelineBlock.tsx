import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface TimelineItem {
  year: string;
  title: string;
  desc: string;
}

interface TimelineBlockProps {
  block: {
    items: TimelineItem[];
  };
}

const TimelineBlock: React.FC<TimelineBlockProps> = ({ block }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="timeline flex flex-col gap-0 my-6 bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
      {block.items.map((item, idx) => (
        <div 
          key={idx}
          className="tl-item flex gap-4 p-4 border-b border-white/5 last:border-b-0 cursor-pointer hover:bg-white/[0.02] transition-colors"
          onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
        >
          <div className="tl-left flex flex-col items-center w-12 shrink-0">
            <div className="tl-year text-[10px] font-black text-blue-500 text-center leading-tight mb-2 uppercase tracking-tighter">
              {item.year.split('<br>').map((line, i) => <div key={i}>{line}</div>)}
            </div>
            <div className="tl-dot w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            {idx < block.items.length - 1 && (
              <div className="tl-line w-[1px] flex-1 bg-white/10 mt-2 min-h-[20px]" />
            )}
          </div>
          
          <div className="tl-body flex-1 pt-0.5">
            <div className="flex justify-between items-start gap-4">
              <div className="tl-title text-sm font-bold text-white mb-1 tracking-tight">
                {item.title}
              </div>
              <motion.div 
                animate={{ rotate: openIndex === idx ? 180 : 0 }}
                className="text-gray-600 shrink-0 mt-1"
              >
                <ChevronDown size={14} />
              </motion.div>
            </div>
            
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="tl-desc text-[12px] text-gray-400 leading-relaxed pt-1 pb-2">
                      {item.desc}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TimelineBlock;
