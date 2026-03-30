import React from 'react';
import { Settings, TrendingUp, Calendar, Info, ArrowDownUp } from 'lucide-react';
import { motion } from 'motion/react';

export interface CushionContentProps {
  cushionLevelData: any;
  formatUah: (val: number) => string;
  cushionTotal: number;
  cushion: any;
  handleSaveCushion: (updates: any) => Promise<void>;
  analyticsStats: any;
  accounts: any[];
  monobankClientInfos: Record<string, any>;
  isCompact?: boolean;
  monthlyTarget?: number;
}

export const CushionContent = ({ 
  cushionLevelData, formatUah, cushionTotal, cushion, handleSaveCushion,
  analyticsStats, accounts, monobankClientInfos, isCompact = false,
  monthlyTarget
}: CushionContentProps) => {
  return (
    <div className={`space-y-8 ${isCompact ? 'px-1' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className={`${isCompact ? 'text-2xl' : 'text-4xl'} font-black text-zinc-900 dark:text-white tracking-tighter uppercase`}>Фінансова подушка</h2>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Ваша безпека та впевненість у майбутньому</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isCompact ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-8`}>
        <div className={`${isCompact ? '' : 'lg:col-span-2'} space-y-8`}>
          <div className="glass-card p-10 rounded-[40px] border border-orange-500/20 bg-orange-500/5 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row gap-10">
              <div className="flex-1 space-y-8">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-3xl ${cushionLevelData?.bg || 'bg-zinc-500'} flex items-center justify-center text-white shadow-xl shadow-${(cushionLevelData?.bg || 'bg-zinc-500').split('-')[1]}-500/30`}>
                    {cushionLevelData?.icon && <cushionLevelData.icon className="w-8 h-8" />}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1">Рівень безпеки: {cushionLevelData?.level ?? 0}</div>
                    <h3 className={`text-3xl font-black tracking-tighter leading-tight ${cushionLevelData?.color || 'text-zinc-500'}`}>
                      {cushionLevelData?.title || 'Завантаження...'}
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Прогрес рівня</div>
                    <div className="text-right">
                      <div className="text-sm font-black text-zinc-900 dark:text-white">
                        {formatUah(cushionTotal)} 
                        <span className="text-zinc-400 font-medium"> / {formatUah(cushionLevelData?.nextGoal ?? 0)}</span>
                      </div>
                      {monthlyTarget && monthlyTarget > 0 ? (
                        <div className="text-[10px] text-orange-500 font-black uppercase tracking-widest animate-pulse">
                          Ціль на місяць: {formatUah(monthlyTarget)}
                        </div>
                      ) : (
                        cushionLevelData?.nextLabel && !cushionLevelData?.isMax && (
                          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">До {cushionLevelData.nextLabel}</div>
                        )
                      )}
                    </div>
                  </div>
                  
                  <div className="relative h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${cushionLevelData?.progressToNext ?? 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`absolute top-0 left-0 h-full ${cushionLevelData?.bg || 'bg-zinc-500'}`}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center px-1 text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">
                    <div className={cushionLevelData?.level >= 1 ? 'text-amber-600' : ''}>1 міс.</div>
                    <div className={cushionLevelData?.level >= 2 ? 'text-slate-400' : ''}>3 міс.</div>
                    <div className={cushionLevelData?.level >= 3 ? 'text-yellow-500' : ''}>6 міс.</div>
                    <div className={cushionLevelData?.level >= 4 ? 'text-indigo-500' : ''}>12 міс.</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl bg-white/50 dark:bg-zinc-900/50 border border-white/20 dark:border-zinc-800/50">
                  <div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Накопичено</div>
                    <div className="text-xl font-black text-orange-500 tracking-tighter">
                      {formatUah(cushionTotal)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Глобальна ціль</div>
                    <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">
                      {formatUah(cushion?.targetAmount || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
          </div>

          <div className={`grid grid-cols-1 ${isCompact ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-8`}>
            <div className="glass-card p-8 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-sm space-y-6">
              <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                 <Settings className="w-4 h-4 text-orange-500" /> Налаштування цілі
              </h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Сума фінансової подушки (₴)</label>
                  <input 
                    type="number" 
                    value={cushion?.targetAmount || ''} 
                    onChange={e => handleSaveCushion({ targetAmount: Number(e.target.value) })}
                    className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-lg font-black text-zinc-900 dark:text-white outline-none focus:ring-2 ring-orange-500/50" 
                    placeholder="0.00"
                  />
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-2 ml-1">
                    Рекомендовано: {formatUah(analyticsStats.avgMonthlyExpense * 6)} (на 6 місяців)
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Щомісячне поповнення (₴)</label>
                  <input 
                    type="number" 
                    value={cushion?.monthlyContribution || ''} 
                    onChange={e => handleSaveCushion({ monthlyContribution: Number(e.target.value) })}
                    className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-lg font-black text-zinc-900 dark:text-white outline-none focus:ring-2 ring-orange-500/50" 
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="glass-card p-8 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-sm space-y-6">
              <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-emerald-500" /> Прогноз накопичення
              </h4>
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-5 rounded-[24px] bg-emerald-500/5 border border-emerald-500/10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">Час досягнення</div>
                    <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">
                      {cushion && cushion.targetAmount > 0 && cushion.monthlyContribution > 0 
                        ? `${Math.ceil(Math.max(0, cushion.targetAmount - cushionTotal) / cushion.monthlyContribution)} міс.`
                        : "—"
                      }
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-5 rounded-[24px] bg-blue-500/5 border border-blue-500/10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg">
                    <Info className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Запас міцності</div>
                    <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">
                      {cushionLevelData?.monthsSurviving > 0
                        ? `${cushionLevelData.monthsSurviving.toFixed(1)} міс. витрат`
                        : "0 місяців"
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-sm h-full">
            <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
              <ArrowDownUp className="w-4 h-4 text-blue-500" /> Підключені рахунки
            </h4>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Внутрішні рахунки</div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {accounts.map((acc: any) => {
                    const isLinked = cushion?.linkedAccountIds?.includes(acc.id);
                    return (
                      <button 
                        key={acc.id}
                        onClick={() => {
                          const newIds = isLinked 
                            ? cushion?.linkedAccountIds?.filter((id: string) => id !== acc.id) || []
                            : [...(cushion?.linkedAccountIds || []), acc.id];
                          handleSaveCushion({ linkedAccountIds: newIds });
                        }}
                        className={`w-full flex items-center justify-between p-4 rounded-[20px] border transition-all ${isLinked ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isLinked ? 'bg-blue-500' : 'bg-zinc-300'}`} />
                          <span className="text-xs font-black uppercase tracking-tight">{acc.name}</span>
                        </div>
                        <span className="text-xs font-black">{formatUah(acc.balance)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Банки Monobank</div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.values(monobankClientInfos || {}).flatMap((info: any) => info?.jars || []).map((jar: any) => {
                    const isLinked = cushion?.linkedJarIds?.includes(jar.id);
                    return (
                      <button 
                        key={jar.id}
                        onClick={() => {
                          const newIds = isLinked 
                            ? cushion?.linkedJarIds?.filter((id: string) => id !== jar.id) || []
                            : [...(cushion?.linkedJarIds || []), jar.id];
                          handleSaveCushion({ linkedJarIds: newIds });
                        }}
                        className={`w-full flex items-center justify-between p-4 rounded-[20px] border transition-all ${isLinked ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isLinked ? 'bg-orange-500' : 'bg-zinc-300'}`} />
                          <span className="text-xs font-black uppercase tracking-tight">{jar.title}</span>
                        </div>
                        <span className="text-xs font-black">{formatUah(jar.balance / 100)}</span>
                      </button>
                    );
                  })}
                  {Object.values(monobankClientInfos || {}).flatMap((info: any) => info?.jars || []).length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[32px]">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Немає доступних банок</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
