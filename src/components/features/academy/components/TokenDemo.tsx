import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, ChevronDown, CheckCircle2 } from 'lucide-react';

interface TokenDemoProps {
  asset: { name: string; value: string };
  shares: number;
  onAddXP?: (amt: number) => void;
}

const TokenDemo: React.FC<TokenDemoProps> = ({ asset, shares, onAddXP }) => {
  const [ownedShares, setOwnedShares] = useState<Set<number>>(new Set());

  const toggleShare = (idx: number) => {
    const newOwned = new Set(ownedShares);
    if (newOwned.has(idx)) {
      newOwned.delete(idx);
    } else {
      newOwned.add(idx);
      if (onAddXP) onAddXP(5);
    }
    setOwnedShares(newOwned);
  };

  const shareValue = (parseInt(asset.value.replace(/[^0-9]/g, '')) / shares).toLocaleString('uk-UA');

  return (
    <div className="token-demo bg-black/20 border border-white/5 rounded-[2.5rem] p-6 my-6 shadow-2xl relative overflow-hidden group">
      <div className="token-title text-[10px] font-black text-purple-500 uppercase tracking-widest mb-6 flex items-center gap-2">
        <Coins size={14} />
        Інтерактивна демонстрація токенізації
      </div>
      
      <div className="token-asset p-6 bg-white/[0.03] border border-white/10 rounded-2xl mb-6 text-center group-hover:scale-[1.02] transition-transform duration-700">
        <div className="token-asset-name text-sm font-black text-white uppercase tracking-tight mb-2">{asset.name}</div>
        <div className="token-asset-val text-lg font-black text-amber-500 shadow-amber-500/20 drop-shadow-lg">{asset.value} грн</div>
      </div>

      <div className="token-arrow flex flex-col items-center gap-1 mb-6 text-indigo-500">
        <ChevronDown size={20} className="animate-bounce" />
        <span className="text-[10px] font-black uppercase tracking-widest">Токенізація на {shares} частин</span>
      </div>

      <div className="token-grid grid grid-cols-5 gap-2 px-1">
        {Array.from({ length: shares }).map((_, i) => (
          <motion.div 
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleShare(i)}
            className={`token-piece p-3 border rounded-xl cursor-pointer text-center transition-all duration-300 relative overflow-hidden ${
              ownedShares.has(i) 
                ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                : 'bg-white/[0.02] border-white/5 hover:border-purple-500/40 hover:bg-white/[0.05]'
            }`}
          >
            <div className={`token-piece-val text-[10px] font-black transition-colors ${ownedShares.has(i) ? 'text-blue-500' : 'text-purple-500'}`}>
              {shareValue}
              <div className="text-[8px] font-bold text-gray-500 leading-none mt-1">грн</div>
            </div>
            {ownedShares.has(i) && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 text-blue-500"
              >
                <CheckCircle2 size={8} />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="token-info mt-8 p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-center">
        <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tight">Ваша частка: </span>
        <span className="token-owned-count text-blue-500 font-black px-2">{ownedShares.size} / {shares}</span>
        <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tight">частин</span>
      </div>
    </div>
  );
};

export default TokenDemo;
