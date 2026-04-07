import React, { useState } from 'react';
import { Calculator, TrendingUp, Shield, BarChart3, Target, Layers, ArrowRight, Info } from 'lucide-react';

interface CalcProps {
  block: {
    id: string;
    title: string;
  };
}

const CalcBlock: React.FC<CalcProps> = ({ block }) => {
  // Common states
  const [val1, setVal1] = useState(50000); // Income / Expense / Principal
  const [val2, setVal2] = useState(5000);  // Monthly contrib / Bond % / Rate
  const [val3, setVal3] = useState(15);    // Months / Age / Rate
  const [val4, setVal4] = useState(15);    // Years

  const fmt = (n: number) => Math.round(n).toLocaleString('uk-UA');

  // 1. Budget Calculator (50/30/20)
  const renderBudget = () => (
    <div className="space-y-5">
      <div className="inp-group">
        <div className="flex justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Місячний дохід: {fmt(val1)} грн</span>
        </div>
        <input 
            type="range" min="10000" max="500000" step="5000" 
            value={val1} onChange={(e) => setVal1(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" 
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="cres bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-center">
          <div className="text-sm font-black text-white">{fmt(val1 * 0.5)}</div>
          <div className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">🏠 Потреби 50%</div>
        </div>
        <div className="cres bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-center">
          <div className="text-sm font-black text-amber-500">{fmt(val1 * 0.3)}</div>
          <div className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">🎭 Бажання 30%</div>
        </div>
        <div className="cres bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-center">
          <div className="text-sm font-black text-emerald-500">{fmt(val1 * 0.2)}</div>
          <div className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">💎 Майбутнє 20%</div>
        </div>
      </div>
    </div>
  );

  // 2. Detector (Income vs Expenses)
  const renderDetector = () => {
    const inc = val1;
    const exp = val2;
    const left = inc - exp;
    const percent = inc > 0 ? Math.round((exp / inc) * 100) : 0;
    const isBad = percent > 70;

    return (
      <div className="space-y-5">
        <div className="inputs space-y-4">
          <div className="inp-group">
            <div className="flex justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Твій дохід: {fmt(inc)} грн</span>
            </div>
            <input 
                type="range" min="5000" max="200000" step="1000" 
                value={inc} onChange={(e) => setVal1(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" 
            />
          </div>
          <div className="inp-group">
            <div className="flex justify-between mb-2">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Обов'язкові витрати: {fmt(exp)} грн</span>
            </div>
            <input 
                type="range" min="1000" max="150000" step="500" 
                value={exp} onChange={(e) => setVal2(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
            />
          </div>
        </div>

        <div className={`res-box p-5 rounded-2xl border transition-all duration-500 ${isBad ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isBad ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${isBad ? 'text-red-500' : 'text-emerald-500'}`}>Вердикт детектора</span>
          </div>
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
            {isBad 
              ? `Ви витрачаєте ${percent}% доходу на базу. Це забагато! Твій вільний залишок: ${fmt(left)} грн. Потрібна оптимізація.`
              : `Чудово! Ти витрачаєш лише ${percent}%. У тебе залишається ${fmt(left)} грн для інвестицій! Починай формувати капітал уже сьогодні.`
            }
          </p>
        </div>
      </div>
    );
  };

  // 3. Cushion Calculator (3/6/9 months)
  const renderCushion = () => (
    <div className="space-y-6">
      <div className="inp-group">
        <div className="flex justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Витрати на місяць: {fmt(val1)} грн</span>
        </div>
        <input 
            type="range" min="5000" max="150000" step="1000" 
            value={val1} onChange={(e) => setVal1(Number(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500" 
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[3, 6, 9].map(m => (
          <div key={m} className={`cres border rounded-2xl p-4 text-center ${m===6?'bg-blue-500/10 border-blue-500/20':'bg-white/[0.03] border-white/5'}`}>
            <div className={`text-sm font-black mb-1 ${m===6?'text-blue-500':'text-white'}`}>{fmt(val1 * m)} грн</div>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{m} місяців ({m===3?'Мін':m===6?'Оптим':'Ідеал'})</div>
          </div>
        ))}
      </div>
    </div>
  );

  // 4. Compound Interest
  const renderCompound = () => {
    const pv = val1; // Principal
    const pm = val2; // Monthly
    const r = val3 / 100 / 12; // Rate
    const n = val4 * 12; // Months
    const fv = pv * Math.pow(1 + r, n) + (r > 0 ? pm * (Math.pow(1 + r, n) - 1) / r : pm * n);
    const totalInv = pv + pm * n;

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Старт: {fmt(val1)}</div>
            <input type="range" min="1000" max="1000000" step="1000" value={val1} onChange={e=>setVal1(Number(e.target.value))} className="w-full h-1 accent-blue-500" />
          </div>
          <div className="space-y-3">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Поповнення: {fmt(val2)}</div>
            <input type="range" min="0" max="100000" step="500" value={val2} onChange={e=>setVal2(Number(e.target.value))} className="w-full h-1 accent-purple-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ставка: {val3}%</div>
            <input type="range" min="5" max="35" step="1" value={val3} onChange={e=>setVal3(Number(e.target.value))} className="w-full h-1 accent-amber-500" />
          </div>
          <div className="space-y-3">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Термін: {val4} років</div>
            <input type="range" min="1" max="35" step="1" value={val4} onChange={e=>setVal4(Number(e.target.value))} className="w-full h-1 accent-indigo-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="cres bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
            <div className="text-sm font-black text-white">{fmt(totalInv)}</div>
            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Вкладено всього</div>
          </div>
          <div className="cres bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <div className="text-lg font-black text-emerald-500">{fmt(fv)}</div>
            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Капітал з %</div>
          </div>
        </div>
        <div className="text-center text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Чистий прибуток: +{fmt(fv - totalInv)} грн</div>
      </div>
    );
  };

  // 5. Debt Strategy (Snowball vs Avalanche)
  const renderDebt = () => (
    <div className="space-y-5">
      <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
        <div className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">Приклад твоїх боргів:</div>
        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <span>💳 Кредитна картка (25к, 48%)</span>
            <span className="text-red-400 font-black tracking-widest">🔥 48%</span>
          </div>
          <div className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
            <span>💻 Розстрочка (8к, 36%)</span>
            <span className="text-amber-400 font-black tracking-widest">⚡ 36%</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:border-blue-500/30 hover:bg-blue-500/10 transition-all text-left cursor-pointer group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center text-xs text-white">🏔️</div>
            <span className="text-[11px] font-black text-white uppercase">Лавина</span>
          </div>
          <p className="text-[9px] text-gray-400 leading-relaxed font-medium">Спершу гасимо борг з найвищою відсотковою ставкою.</p>
        </div>
        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:border-purple-500/30 hover:bg-purple-500/10 transition-all text-left cursor-pointer group">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-purple-500 flex items-center justify-center text-xs text-white">❄️</div>
            <span className="text-[11px] font-black text-white uppercase">Сніжна куля</span>
          </div>
          <p className="text-[9px] text-gray-400 leading-relaxed font-medium">Спершу гасимо борг з найменшим залишком суми.</p>
        </div>
      </div>
    </div>
  );

  // 6. Portfolio allocation
  const renderPortfolio = () => {
    const budget = val1;
    return (
      <div className="space-y-5">
        <div className="inp-group">
          <div className="flex justify-between mb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span>Інвест-бюджет/міс: {fmt(val1)} грн</span>
          </div>
          <input type="range" min="1000" max="200000" step="1000" value={val1} onChange={e=>setVal1(Number(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="cres bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-center">
            <div className="text-sm font-black text-white">{fmt(budget * 0.3)} грн</div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">🏛️ ОВДП 30%</div>
          </div>
          <div className="cres bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-center">
            <div className="text-sm font-black text-blue-400">{fmt(budget * 0.4)} грн</div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">📊 ETF 40%</div>
          </div>
          <div className="cres bg-amber-500/10 border border-amber-500/10 rounded-2xl p-3 text-center">
            <div className="text-sm font-black text-amber-500">{fmt(budget * 0.15)} грн</div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">🏠 REIT 15%</div>
          </div>
          <div className="cres bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3 text-center">
            <div className="text-sm font-black text-purple-400">{fmt(budget * 0.15)} грн</div>
            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">🔷 Bitbon 15%</div>
          </div>
        </div>
      </div>
    );
  };

  // 7. Financial Strategy
  const renderFinStrat = () => {
    const inc = val1;
    const svPct = val2;
    const age = val3;
    const gl = val4;
    const mo = (inc * svPct) / 100;
    const stocks = Math.max(20, 100 - age);
    const mr = 0.12 / 12, nm = gl * 12;
    const cap = mo * (Math.pow(1 + mr, nm) - 1) / mr;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Дохід: {fmt(inc)}</div>
            <input type="range" min="10000" max="1000000" step="5000" value={val1} onChange={e=>setVal1(Number(e.target.value))} className="w-full h-1 accent-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Заощадження: {svPct}%</div>
            <input type="range" min="0" max="60" step="1" value={val2} onChange={e=>setVal2(Number(e.target.value))} className="w-full h-1 accent-emerald-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ваш вік: {age}</div>
                <input type="range" min="18" max="65" step="1" value={val3} onChange={e=>setVal3(Number(e.target.value))} className="w-full h-1 accent-amber-500" />
            </div>
            <div className="space-y-2">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">До цілі: {gl} років</div>
                <input type="range" min="5" max="40" step="1" value={val4} onChange={e=>setVal4(Number(e.target.value))} className="w-full h-1 accent-purple-500" />
            </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="cres bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-center">
                <div className="text-[10px] font-black text-emerald-500">{fmt(mo)}</div>
                <div className="text-[7px] font-black text-gray-400 uppercase">Заощаджень/міс</div>
            </div>
            <div className="cres bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-center">
                <div className="text-[10px] font-black text-amber-500">{stocks}%</div>
                <div className="text-[7px] font-black text-gray-400 uppercase">Ризик-активи</div>
            </div>
            <div className="cres bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 text-center">
                <div className="text-[10px] font-black text-blue-500">{fmt(cap)}</div>
                <div className="text-[7px] font-black text-gray-400 uppercase">Капітал за ціль</div>
            </div>
        </div>
      </div>
    );
  };

  const getIcon = () => {
    switch (block.id) {
      case 'detector': return <Target size={18} className="text-blue-500" />;
      case 'budget': return <BarChart3 size={18} className="text-blue-500" />;
      case 'cushion': return <Shield size={18} className="text-emerald-500" />;
      case 'compound': return <TrendingUp size={18} className="text-amber-500" />;
      case 'portfolio': return <Layers size={18} className="text-purple-500" />;
      case 'fin-strat': return <Target size={18} className="text-indigo-500" />;
      case 'debt-calc': return <Target size={18} className="text-red-500" />;
      default: return <Calculator size={18} className="text-gray-500" />;
    }
  };

  return (
    <div className="calc-block bg-white/[0.03] border border-white/5 rounded-3xl p-6 mb-8 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl flex items-center justify-center">
          {getIcon()}
        </div>
        <div className="text-sm font-black text-white uppercase tracking-tight">{block.title}</div>
      </div>

      <div className="relative z-10">
        {block.id === 'budget' && renderBudget()}
        {block.id === 'detector' && renderDetector()}
        {block.id === 'cushion' && renderCushion()}
        {block.id === 'compound' && renderCompound()}
        {block.id === 'debt-calc' && renderDebt()}
        {block.id === 'portfolio' && renderPortfolio()}
        {block.id === 'fin-strat' && renderFinStrat()}
        
        {(!['budget', 'detector', 'cushion', 'compound', 'debt-calc', 'portfolio', 'fin-strat'].includes(block.id)) && (
          <div className="text-center py-6 text-gray-600 text-[10px] font-bold uppercase italic tracking-widest">
            Калькулятор {block.id} розробляється
          </div>
        )}
      </div>
    </div>
  );
};

export default CalcBlock;
