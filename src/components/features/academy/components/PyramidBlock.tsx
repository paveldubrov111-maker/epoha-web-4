import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Info } from 'lucide-react';

interface PyramidProps {
  block: {
    items: { title: string; body: string; icon: string }[];
  };
}

const PyramidBlock: React.FC<PyramidProps> = ({ block }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="pyramid-container space-y-2 mb-8">
      {block.items.map((item, idx) => {
        const isOpen = openIdx === idx;
        
        return (
          <div 
            key={idx} 
            className={`pyr-item bg-white/[0.02] border transition-all duration-300 rounded-2xl overflow-hidden ${isOpen ? 'border-white/10 shadow-lg' : 'border-white/5 shadow-none'}`}
          >
            <div 
              className="pyr-hd p-4 flex items-center gap-3 cursor-pointer select-none hover:bg-white/[0.03]"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
            >
              <div className="pyr-ico text-lg w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg border border-white/5">{item.icon}</div>
              <div className="pyr-t text-[13px] font-bold text-white flex-1">{item.title}</div>
              <ChevronDown 
                size={14} 
                className={`text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} 
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
                  <div className="pyr-bd px-4 pb-4 pt-1 ml-11 text-xs text-gray-400 leading-relaxed font-medium">
                    {item.body}
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

export default PyramidBlock;
