import React, { useState } from 'react';
import { Sparkles, Edit2, Check, X } from 'lucide-react';
import { Currency } from '../../../../types';
import { fmt, fmtUsd } from '../../../../utils/format';

interface HeroCardProps {
  bCur: Currency;
  availableInvestmentUah: number;
  availableInvestmentUsd: number;
  onUpdateInvestmentPotential: (val: number) => void;
}

const HeroCard: React.FC<HeroCardProps> = ({ bCur, availableInvestmentUah, availableInvestmentUsd, onUpdateInvestmentPotential }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(availableInvestmentUah.toString());

  const handleSave = () => {
    onUpdateInvestmentPotential(parseFloat(editValue) || 0);
    setIsEditing(false);
  };

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 p-8 rounded-[40px] border border-zinc-200/50 dark:border-white/5 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Sparkles className="w-24 h-24 rotate-12" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Інвестиційний потенціал</h3>
        </div>

        <div className="flex items-center gap-4 mb-2">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="text-4xl font-black bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-2 w-48 outline-none focus:ring-2 ring-indigo-500/20"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button 
                onClick={handleSave}
                className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-colors"
              >
                <Check className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-2xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">
                {fmt(bCur === 'USD' ? availableInvestmentUsd : availableInvestmentUah, bCur)}
              </div>
              <button 
                onClick={() => {
                  setEditValue(availableInvestmentUah.toString());
                  setIsEditing(true);
                }}
                className="p-3 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        
        <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest italic">
          Доступно для реінвестування
        </p>
      </div>
    </div>
  );
};

export default HeroCard;
