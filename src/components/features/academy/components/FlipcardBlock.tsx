import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FlipcardProps {
  block: {
    cards: { front: string; back: string; icon?: string }[];
  };
}

const FlipcardBlock: React.FC<FlipcardProps> = ({ block }) => {
  return (
    <div className="flipcards-container mb-8">
      <div className="flip-hint text-[10px] font-black text-gray-600 uppercase tracking-widest text-center mb-3">
        👆 Тап по картці, щоб розкрити
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {block.cards.map((card, idx) => (
          <FlipCard key={idx} card={card} />
        ))}
      </div>
    </div>
  );
};

const FlipCard = ({ card }: { card: any }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="flipcard h-32 cursor-pointer perspective-1000 group"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div 
        className="relative w-full h-full text-center transition-all duration-700 preserves-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col items-center justify-center p-4 transition-colors group-hover:bg-white/[0.05] group-hover:border-white/10">
          {card.icon && <div className="fc-icon text-2xl mb-2 grayscale transition-all group-hover:grayscale-0">{card.icon}</div>}
          <div className="fc-title text-sm font-bold text-white tracking-tight leading-tight">{card.front}</div>
          <div className="fc-sub text-[9px] font-black text-gray-500 uppercase tracking-widest mt-2">Тисніть щоб дізнатись</div>
        </div>
        
        {/* Back */}
        <div className="absolute inset-0 backface-hidden bg-blue-500/10 border border-blue-500/40 rounded-2xl flex flex-col items-center justify-center p-4 rotate-x-180" style={{ transform: 'rotateY(180deg)' }}>
          <div className="fc-answer text-xs font-semibold text-blue-300 leading-relaxed text-center italic">
            {card.back}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FlipcardBlock;
