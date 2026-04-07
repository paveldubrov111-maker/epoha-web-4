import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ShieldAlert, RotateCcw, CheckCircle2, Link as LinkIcon } from 'lucide-react';

interface Block {
  num: number;
  data: string;
  prev: string;
  hash: string;
  tampered?: boolean;
}

const hashFn = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').repeat(2).slice(0, 12);
};

const txs = [
  'Аліса → Боб: 500 BTB',
  'Боб → Марія: 200 BTB',
  'Simcord → Contributing: 10000 BTB',
  'Іван → Assetbox: 1000 BTB',
  'Token Transfer: #A7F2'
];

const BlockchainDemo: React.FC<{ onAddXP?: (amt: number) => void }> = ({ onAddXP }) => {
  const [blocks, setBlocks] = useState<Block[]>([
    { num: 1, data: 'Genesis Block', prev: '0000000000', hash: 'a3f8d2e1b7c9' }
  ]);
  const [explain, setExplain] = useState('Натисніть "Додати транзакцію", щоб побачити, як формується блок.');
  const [isTampered, setIsTampered] = useState(false);

  const addBlock = () => {
    const tx = txs[Math.floor(Math.random() * txs.length)];
    const prev = blocks[blocks.length - 1].hash;
    const h = hashFn(tx + prev + Date.now());

    setBlocks([...blocks, { num: blocks.length + 1, data: tx, prev, hash: h }]);
    setExplain(`✅ Новий блок #${blocks.length + 1} додано. Його хеш залежить від хешу попереднього блоку.`);
    if (onAddXP) onAddXP(5);
  };

  const tryHack = () => {
    if (blocks.length < 2) {
      setExplain('Спочатку додайте хоча б одну транзакцію!');
      return;
    }
    
    const newBlocks = [...blocks];
    newBlocks[1] = { ...newBlocks[1], data: 'ПІДРОБЛЕНО!', tampered: true };
    setBlocks(newBlocks);
    setIsTampered(true);
    setExplain('🚨 🚨 🚨 Спроба підробки виявлена! Всі вузли відхилять цю версію.');
  };

  const reset = () => {
    setBlocks([{ num: 1, data: 'Genesis Block', prev: '0000000000', hash: 'a3f8d2e1b7c9' }]);
    setExplain('Ланцюг скинуто. Почнемо знову.');
    setIsTampered(false);
  };

  return (
    <div className="blockchain-demo bg-black/20 border border-white/5 rounded-[2.5rem] p-6 my-6 shadow-2xl relative overflow-hidden group">
      <div className="bc-title text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6 flex items-center gap-2">
        <LinkIcon size={14} />
        Інтерактивна демонстрація блокчейну
      </div>
      
      <div className="bc-chain flex items-center gap-4 overflow-x-auto pb-6 scrollbar-none px-2">
        <AnimatePresence>
          {blocks.map((b, i) => (
            <React.Fragment key={i}>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`bc-block min-w-[160px] p-4 bg-white/5 border rounded-2xl transition-all duration-500 ${
                  b.tampered ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/10 group-hover:border-blue-500/30'
                }`}
              >
                <div className="bc-block-num text-[10px] font-black text-blue-500 uppercase mb-2 leading-none">Блок #{b.num}</div>
                <div className="bc-block-hash text-[9px] text-gray-600 font-mono mb-2 truncate">prev: {b.prev}</div>
                <div className="bc-block-data text-[11px] font-bold text-gray-300 mb-3 h-8 line-clamp-2">{b.data}</div>
                <div className="bc-block-hash text-[9px] text-blue-400 font-mono truncate">hash: {b.hash}</div>
              </motion.div>
              {i < blocks.length - 1 && (
                <div className="bc-arrow text-blue-500 shrink-0 text-xl font-black">→</div>
              )}
            </React.Fragment>
          ))}
        </AnimatePresence>
      </div>

      <div className="bc-controls flex flex-wrap gap-3 mt-4">
        <button 
          onClick={addBlock}
          className="bc-btn flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-xs font-black text-blue-500 hover:bg-blue-600/20 active:scale-95 transition-all"
        >
          <Plus size={14} />
          Додати транзакцію
        </button>
        <button 
          onClick={tryHack}
          className="bc-btn flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-500/20 rounded-xl text-xs font-black text-red-500 hover:bg-red-600/20 active:scale-95 transition-all"
        >
          <ShieldAlert size={14} />
          Спробувати підробити
        </button>
        <button 
          onClick={reset}
          className="bc-btn flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-gray-400 hover:bg-white/10 active:scale-95 transition-all"
        >
          <RotateCcw size={14} />
          Скинути
        </button>
      </div>

      <motion.div 
        key={explain}
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`bc-explain mt-6 p-4 rounded-2xl text-[12px] leading-relaxed font-bold tracking-tight shadow-xl ${
          isTampered ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-white/5 text-gray-400 border border-white/5'
        }`}
      >
        {explain}
      </motion.div>
    </div>
  );
};

export default BlockchainDemo;
