import React, { useState, useMemo } from 'react';
import { 
  Settings, TrendingUp, Calendar, Info, ArrowDownUp, 
  Plus, Trash2, Edit2, Coins, Briefcase, Shield, 
  ShieldCheck, Star, Crown, Landmark, Receipt, Sparkles,
  ChevronRight, Laptop, PiggyBank, GraduationCap, Plane, Home,
  ArrowUpRight, AlertCircle, CheckCircle2, MoreHorizontal, X, PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Cushion, CushionAsset } from '../../../types';

export interface CushionContentProps {
  cushionLevelData: any;
  formatUah: (val: number) => string;
  cushionTotal: number;
  cushion: Cushion | null;
  cushionAssets: CushionAsset[];
  onSaveCushionAsset: (asset: Partial<CushionAsset>) => Promise<void>;
  onDeleteCushionAsset: (id: string) => Promise<void>;
  handleSaveCushion: (updates: Partial<Cushion>) => Promise<void>;
  analyticsStats: any;
  accounts: any[];
  monobankClientInfos: Record<string, any>;
  isCompact?: boolean;
}

export const CushionContent = ({ 
  cushionLevelData, formatUah, cushionTotal, cushion, cushionAssets = [],
  onSaveCushionAsset, onDeleteCushionAsset, handleSaveCushion,
  analyticsStats, accounts, monobankClientInfos, isCompact = false
}: CushionContentProps) => {
  const [showAssetModal, setShowAssetModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingAsset, setEditingAsset] = useState<CushionAsset | null>(null);

  const [assetForm, setAssetForm] = useState<Partial<CushionAsset>>({
    name: '',
    type: 'deposit',
    amount: 0,
    targetAmount: 0,
    interestRate: 0,
    color: 'bg-blue-500'
  });

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setAssetForm({
      name: '',
      type: 'deposit',
      amount: 0,
      targetAmount: 0,
      interestRate: 0,
      color: 'bg-blue-500'
    });
    setShowAssetModal(true);
  };

  const handleOpenEdit = (asset: CushionAsset) => {
    setEditingAsset(asset);
    setAssetForm(asset);
    setShowAssetModal(true);
  };

  const handleSaveAsset = async () => {
    if (!assetForm.name || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveCushionAsset(assetForm);
      setShowAssetModal(false);
    } catch (err: any) {
      console.error("Failed to save asset:", err);
      const errorMsg = err?.message || err?.details || "Невідома помилка";
      alert(`Не вдалося зберегти актив: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цей актив?')) return;
    try {
      await onDeleteCushionAsset(id);
    } catch (err: any) {
      console.error("Failed to delete asset:", err);
      alert(`Не вдалося видалити актив: ${err?.message || "Невідома помилка"}`);
    }
  };

  const aiAdvice = useMemo(() => {
    const advices = [];
    
    if (!cushionLevelData) {
      advices.push({
        type: 'info',
        icon: Sparkles,
        title: "Підготовка даних",
        text: "Додайте ваш перший актив, щоб ШІ міг проаналізувати вашу безпеку та дохідність."
      });
      return advices;
    }

    const { monthsSurviving, yieldPercentage, inflationRate, totalYieldMonthly } = cushionLevelData;
    const expense = analyticsStats.avgMonthlyExpense || 10000;
    
    // 1. Safety & Levels
    if (monthsSurviving < 3) {
      advices.push({
        type: 'warning',
        icon: AlertCircle,
        title: "Пріоритет: Безпека",
        text: `Ваш запас (${monthsSurviving.toFixed(1)} міс) нижче рекомендованого мінімуму (3 міс). Зосередьтесь на накопиченні.`
      });
    } else if (monthsSurviving >= 6) {
      advices.push({
        type: 'success',
        icon: ShieldCheck,
        title: "Надійний фундамент",
        text: "Ваша подушка покриває понад 6 місяців. Ви за межею фінансового ризику."
      });
    }

    // 2. Inflation protection
    if (yieldPercentage < inflationRate) {
      advices.push({
        type: 'warning',
        icon: TrendingUp,
        title: "Інфляційний ризик",
        text: `Дохідність (${yieldPercentage.toFixed(1)}%) нижча за інфляцію (${inflationRate}%). Капітал втрачає вартість.`
      });
    }

    // 3. Efficiency
    const lowYieldCount = cushionAssets.filter(a => a.interestRate <= 0).length;
    if (lowYieldCount > 0) {
      advices.push({
        type: 'tip',
        icon: Coins,
        title: "Оптимізація доходу",
        text: `${lowYieldCount} активів не приносять доходу. Розгляньте можливість переведення частини коштів у ОВДБ або депозити.`
      });
    }

    // 4. Achievement
    const laggingAsset = [...cushionAssets]
      .filter(a => a.targetAmount > a.amount)
      .sort((a, b) => (b.targetAmount - b.amount) - (a.targetAmount - a.amount))[0];
    
    if (laggingAsset) {
      advices.push({
        type: 'info',
        icon: Landmark,
        title: `Ціль: ${laggingAsset.name}`,
        text: `До завершення плану по цьому активу лишилось ${formatUah(laggingAsset.targetAmount - laggingAsset.amount)}.`
      });
    }

    // Global Tip
    if (advices.length < 2) {
      advices.push({
        type: 'info',
        icon: Info,
        title: "Золоте правило",
        text: "Фінансова подушка — це не інвестиція, а страховка. Її головна мета — ліквідність та доступність."
      });
    }

    return advices;
  }, [cushionLevelData, analyticsStats, cushionAssets]);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'deposit': return Landmark;
      case 'bond': return Receipt;
      case 'cash': return Coins;
      default: return Briefcase;
    }
  };

  const assetTypes = [
    { id: 'cash', label: 'Готівка', icon: Coins },
    { id: 'deposit', label: 'Депозит', icon: Landmark },
    { id: 'bond', label: 'ОВДБ / Облігації', icon: Receipt },
    { id: 'other', label: 'Інше', icon: Briefcase },
  ];

  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-500', 'bg-violet-500'
  ];

  return (
    <div className={`space-y-8 ${isCompact ? 'px-1' : ''} animate-in fade-in slide-in-from-bottom-4 duration-1000`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-orange-500/30">
            <ShieldCheck className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h2 className={`${isCompact ? 'text-xl' : 'text-3xl'} md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase leading-none mb-1.5 md:mb-2`}>Фінансова подушка</h2>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="flex items-center gap-1 px-2 py-0.5 md:px-2.5 md:py-1 bg-rose-500/10 text-rose-500 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-tight border border-rose-500/20">
                Інфляція: {cushionLevelData?.inflationRate}%
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 md:px-2.5 md:py-1 bg-emerald-500/10 text-emerald-500 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-tight border border-emerald-500/20">
                Реальна дохідність: {cushionLevelData?.realYieldPercentage?.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2.5 px-6 py-3 md:px-7 md:py-3.5 bg-orange-500 text-white rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-xl shadow-orange-500/20 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Додати актив
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isCompact ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-8`}>
        {/* Main Stats Column */}
        <div className={`${isCompact ? '' : 'lg:col-span-8'} space-y-8`}>
          {/* Premium Hero Card */}
          <div className="relative group perspective-1000">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[40px] md:rounded-[60px] border border-white/20 dark:border-white/5 shadow-2xi bg-zinc-900 text-white"
            >
              {/* Animated Mesh Gradient Background */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute -top-1/4 -right-1/4 w-full h-full ${cushionLevelData?.bg || 'bg-orange-500'} opacity-20 blur-[120px] animate-pulse`} />
                <div className="absolute -bottom-1/4 -left-1/4 w-full h-full bg-blue-600 opacity-10 blur-[120px] animate-pulse delay-700" />
              </div>

              <div className="relative z-10 p-5 md:p-14">
                <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-16">
                  {/* Left Side: Main Metric & Level */}
                  <div className="flex-1 space-y-4 md:space-y-12 w-full">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className={`w-12 h-12 md:w-24 md:h-24 rounded-2xl md:rounded-[38px] ${cushionLevelData?.bg || 'bg-zinc-700'} flex items-center justify-center text-white shadow-xl transform -rotate-3 group-hover:rotate-0 transition-transform duration-700 border border-white/20`}>
                        {cushionLevelData?.icon && <cushionLevelData.icon className="w-6 h-6 md:w-12 md:h-12" />}
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-1.5 md:mb-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                           <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-orange-400">Рівень {cushionLevelData?.level}</span>
                        </div>
                        <div className="flex items-baseline gap-2 md:gap-3">
                          <span className="text-4xl md:text-8xl font-black tracking-tighter leading-none italic">
                            {cushionLevelData?.monthsSurviving?.toFixed(1)}
                          </span>
                          <span className="text-sm md:text-2xl font-bold text-zinc-400 uppercase tracking-tighter italic">міс.</span>
                        </div>
                        <p className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] mt-1 md:mt-2 ml-1">Фінансова міцність</p>
                      </div>
                    </div>

                    {/* Progress with connected assets icons */}
                      <div className="space-y-4">
                         <div className="flex justify-between items-end">
                           <div className="space-y-1">
                              <span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 px-1">Глобальний прогрес ({cushionLevelData?.progressToNext?.toFixed(0)}%)</span>
                              <div className="flex items-center gap-2 mt-1.5 px-1">
                                 {cushionAssets.map((asset, i) => {
                                   const Icon = getAssetIcon(asset.type);
                                   return (
                                     <div 
                                       key={asset.id} 
                                       style={{ zIndex: 10 - i }}
                                       className={`w-7 h-7 md:w-9 md:h-9 rounded-xl md:rounded-2xl ${asset.color} border-2 border-zinc-900 flex items-center justify-center shadow-lg -ml-2.5 first:ml-1 transition-all pointer-events-none`}
                                     >
                                       <Icon className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                     </div>
                                   );
                                 })}
                              </div>
                           </div>
                           <div className="text-right">
                              <div className="text-lg md:text-2xl font-black tracking-tighter text-white">{formatUah(cushionTotal)}</div>
                              <div className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Ціль: {formatUah(cushionLevelData?.totalTargetAmount || 0)}</div>
                           </div>
                         </div>

                       <div className="relative h-3 md:h-4 bg-white/5 rounded-full p-1 shadow-inner border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (cushionTotal / (cushionLevelData?.totalTargetAmount || 1)) * 100)}%` }}
                          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                          className={`h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-500 relative overflow-hidden`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                        </motion.div>
                       </div>
                    </div>
                  </div>

                  {/* Right Side: Stats Breakdown */}
                  <div className="w-full lg:w-72 grid grid-cols-1 gap-4 relative">
                     <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                        <div className="p-4 md:p-6 rounded-[28px] md:rounded-[35px] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group/card">
                           <div className="flex items-center gap-2 md:gap-3 mb-2">
                              <div className="w-5 h-5 md:w-7 md:h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                 <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                              </div>
                              <span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Рік. дохід</span>
                           </div>
                           <div className="text-lg md:text-3xl font-black text-white tracking-tighter group-hover/card:scale-105 transition-transform origin-left">{formatUah(cushionLevelData?.totalYieldMonthly * 12)}</div>
                        </div>

                        <div className="p-4 md:p-6 rounded-[28px] md:rounded-[35px] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group/card">
                           <div className="flex items-center gap-2 md:gap-3 mb-2">
                              <div className="w-5 h-5 md:w-7 md:h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                 <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                              </div>
                              <span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Пасив / міс</span>
                           </div>
                           <div className="text-lg md:text-2xl font-black text-white tracking-tighter">{formatUah(cushionLevelData?.totalYieldMonthly)}</div>
                        </div>

                        <div className="p-4 md:p-6 rounded-[28px] md:rounded-[35px] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group/card col-span-2 lg:col-span-1">
                           <div className="flex items-center gap-2 md:gap-3 mb-2">
                              <div className="w-5 h-5 md:w-7 md:h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                                 <Star className="w-3 h-3 md:w-4 md:h-4" />
                              </div>
                              <span className="text-[8px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ефект.</span>
                           </div>
                           <div className="text-lg md:text-2xl font-black text-white tracking-tighter">{(cushionLevelData?.yieldPercentage || 0).toFixed(1)}%</div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Active Assets Block */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                  <Briefcase className="w-5 h-5" />
                 </div>
                 <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Розподіл за активами</h4>
              </div>
              
              {cushionLevelData?.unallocatedAmount > 0 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2.5 px-4 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl text-[10px] font-black uppercase tracking-tight border border-amber-500/20 shadow-sm"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Вільні: {formatUah(cushionLevelData.unallocatedAmount)}
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AnimatePresence mode="popLayout">
                {/* Manual Assets */}
                {cushionAssets.map((asset) => {
                  const Icon = getAssetIcon(asset.type);
                  const monthlyYield = (asset.amount * (asset.interestRate / 100)) / 12;
                  const progress = asset.targetAmount > 0 ? Math.min(100, (asset.amount / asset.targetAmount) * 100) : 0;
                  const isComplete = progress >= 100;

                  return (
                    <motion.div
                      key={asset.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -5 }}
                      className="glass-card p-4 md:p-6 rounded-[28px] border border-zinc-100 dark:border-zinc-800/50 shadow-sm group transition-all hover:shadow-xl hover:border-orange-500/20 bg-white/50 dark:bg-white/5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 md:w-12 md:h-12 rounded-xl ${asset.color} flex items-center justify-center text-white shadow-xl shadow-zinc-500/10 group-hover:scale-110 transition-transform duration-500`}>
                            <Icon className="w-4.5 h-4.5 md:w-6 md:h-6" />
                          </div>
                          <div>
                            <div className="text-[13px] font-black text-zinc-900 dark:text-white leading-tight uppercase tracking-tight">{asset.name}</div>
                            <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{assetTypes.find(t => t.id === asset.type)?.label}</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleOpenEdit(asset)} className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteAsset(asset.id)} className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>

                      {/* Fact */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Факт</span>
                        <span className={`text-base font-black tracking-tighter ${isComplete ? 'text-emerald-500' : 'text-orange-500'}`}>{formatUah(asset.amount)}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="relative h-2.5 md:h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-full mb-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : asset.color} relative overflow-hidden`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                        </motion.div>
                      </div>

                      {/* Target */}
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Ціль</span>
                        <span className="text-xs font-black text-zinc-500 tracking-tighter">{formatUah(asset.targetAmount)}</span>
                      </div>

                      {/* Yield info */}
                      {asset.interestRate > 0 && (
                        <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Дохід</span>
                          <div className="text-[9px] font-black text-emerald-500 uppercase tracking-tight flex items-center gap-1">
                            +{formatUah(monthlyYield)}/міс
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Empty State */}
                {cushionAssets.length === 0 && (
                  <div className="md:col-span-2 p-12 md:p-16 text-center border-3 border-dashed border-zinc-100 dark:border-zinc-800/50 rounded-[45px] bg-zinc-50/50 dark:bg-zinc-900/5 transition-all hover:bg-zinc-100/50 dark:hover:bg-zinc-900/10">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-100 dark:bg-zinc-800 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-300">
                      <Briefcase className="w-8 h-8 md:w-10 md:h-10" />
                    </div>
                    <h5 className="text-base md:text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-2">Активи не додані</h5>
                    <p className="text-[11px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest max-w-[300px] mx-auto leading-relaxed">Складіть план розподілу подушки: вкажіть депозити, облігації або готівку</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Asset Distribution Analytics */}
          {cushionAssets.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 px-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <PieChart className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Аналітика розподілу</h4>
              </div>

              <div className="glass-card p-6 rounded-[35px] border border-zinc-100 dark:border-zinc-800/50 shadow-sm space-y-5">
                {/* Overall progress */}
                {(() => {
                  const totalTarget = cushionAssets.reduce((s, a) => s + (a.targetAmount || 0), 0);
                  const totalFact = cushionAssets.reduce((s, a) => s + (a.amount || 0), 0);
                  const overallProgress = totalTarget > 0 ? Math.min(100, (totalFact / totalTarget) * 100) : 0;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Загальний прогрес</span>
                        <span className="text-sm font-black text-zinc-900 dark:text-white">{overallProgress.toFixed(0)}%</span>
                      </div>
                      <div className="relative h-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${overallProgress}%` }}
                          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                          className={`h-full rounded-full ${overallProgress >= 100 ? 'bg-emerald-500' : 'bg-orange-500'} relative overflow-hidden`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                        </motion.div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        <span>Факт: {formatUah(totalFact)}</span>
                        <span>Ціль: {formatUah(totalTarget)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="border-t border-zinc-100 dark:border-zinc-800/50" />

                {/* Per-asset mini bars */}
                <div className="space-y-4">
                  {cushionAssets.map(asset => {
                    const progress = asset.targetAmount > 0 ? Math.min(100, (asset.amount / asset.targetAmount) * 100) : 0;
                    const reach = asset.targetAmount - asset.amount;
                    const isComplete = progress >= 100;
                    return (
                      <div key={asset.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${asset.color}`} />
                            <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-tight">{asset.name}</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-tight ${isComplete ? 'text-emerald-500' : 'text-zinc-400'}`}>
                            {isComplete ? '✓ Виконано' : `${reach > 0 ? `Лишилось: ${formatUah(reach)}` : ''}`}
                          </span>
                        </div>
                        <div className="relative h-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                            className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : asset.color}`}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-bold text-zinc-400">
                          <span>{formatUah(asset.amount)}</span>
                          <span>{formatUah(asset.targetAmount)} ({progress.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Advice Column */}
        <div className={`${isCompact ? '' : 'lg:col-span-4'} space-y-8`}>
          {/* AI Insights Card */}
          <div className="glass-card p-8 rounded-[40px] border border-orange-500/10 bg-gradient-to-br from-orange-500/[0.03] to-amber-500/[0.03] shadow-lg shadow-orange-500/[0.02]">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-widest">AI Порадник</h4>
            </div>

            <div className="space-y-4">
              {aiAdvice?.length > 0 ? (
                aiAdvice.map((advice, idx) => (
                  <div key={idx} className="p-5 rounded-3xl bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex gap-4 group hover:border-orange-500/30 transition-all">
                    <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-xl ${advice.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : advice.type === 'warning' ? 'bg-rose-500/10 text-rose-500' : advice.type === 'tip' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'} flex items-center justify-center`}>
                      <advice.icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-tight">{advice.title}</div>
                      <p className="text-[11px] font-bold text-zinc-400 leading-relaxed group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors uppercase tracking-tight">{advice.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex gap-4">
                  <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-tight">Порада дня</div>
                    <p className="text-[11px] font-bold text-zinc-400 leading-relaxed uppercase tracking-tight">Регулярно переглядайте свій портфель, щоб підтримувати баланс між ризиком та дохідністю.</p>
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="p-1 text-center">
            <p className="text-[9px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-[0.3em] leading-relaxed">Ви будуєте надійний фундамент для свого майбутнього</p>
          </div>
        </div>
      </div>

      {/* Asset Form Modal */}
      <AnimatePresence>
        {showAssetModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto scrollbar-hide py-10">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowAssetModal(false)} 
              className="fixed inset-0 bg-black/90 backdrop-blur-xl cursor-pointer" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-50 dark:bg-zinc-950 rounded-[28px] md:rounded-[50px] shadow-3xl border border-white/10 overflow-hidden my-auto"
            >
              <div className="p-4 md:p-10 space-y-4 md:space-y-8">
                <div className="flex justify-between items-center bg-white dark:bg-zinc-900 -m-4 md:-m-10 mb-4 md:mb-8 p-4 md:p-10 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <h3 className="text-base md:text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter leading-none mb-1">
                      {editingAsset ? 'Редагування' : 'Новий актив'}
                    </h3>
                    <p className="text-[7px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Налаштування капіталу</p>
                  </div>
                  <div className={`w-8 h-8 md:w-16 md:h-16 rounded-lg md:rounded-3xl ${assetForm.color} flex items-center justify-center text-white shadow-xl`}>
                    {(() => {
                      const Icon = getAssetIcon(assetForm.type || 'other');
                      return <Icon className="w-4 h-4 md:w-8 md:h-8" />;
                    })()}
                  </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-1">
                    <label className="text-[8px] md:text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1 leading-none">Назва активу</label>
                    <input
                      type="text"
                      value={assetForm.name}
                      onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                      placeholder="Напр. Депозит"
                      className="w-full px-4 py-2.5 md:px-7 md:py-5 rounded-xl md:rounded-[30px] border-2 border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm md:text-lg font-black outline-none focus:border-blue-500 transition-all placeholder:text-zinc-300"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1 leading-none">Тип капіталу</label>
                      <div className="relative">
                        <select
                          value={assetForm.type}
                          onChange={e => setAssetForm({ ...assetForm, type: e.target.value as any })}
                          className="w-full px-4 py-2.5 md:px-7 md:py-5 rounded-xl md:rounded-[30px] border-2 border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-black appearance-none cursor-pointer outline-none focus:border-blue-500 transition-all text-xs md:text-base"
                        >
                          {assetTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-zinc-400 rotate-90" />
                      </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] md:text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1 leading-none">Колір</label>
                       <div className="flex flex-wrap gap-1.5 pt-1 md:pt-2 px-1">
                        {colors.map(c => (
                          <button
                            key={c}
                            onClick={() => setAssetForm({ ...assetForm, color: c })}
                            className={`w-5 h-5 md:w-9 md:h-9 rounded-full ${c} border-2 md:border-4 ${assetForm.color === c ? 'border-zinc-950 dark:border-white shadow-md scale-110' : 'border-transparent opacity-60 hover:opacity-100'} transition-all`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-5">
                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1 leading-none">Ціль (₴)</label>
                      <input
                        type="number"
                        value={assetForm.targetAmount || ''}
                        onChange={e => setAssetForm({ ...assetForm, targetAmount: Number(e.target.value) })}
                        placeholder="50000"
                        className="w-full px-4 py-2.5 md:px-7 md:py-5 rounded-xl md:rounded-[30px] border-2 border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm md:text-lg font-black outline-none focus:border-orange-500 transition-all placeholder:text-zinc-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] md:text-[11px] font-black text-zinc-400 uppercase tracking-widest ml-1 leading-none">Дохід (%)</label>
                      <input
                        type="number"
                        value={assetForm.interestRate || ''}
                        onChange={e => setAssetForm({ ...assetForm, interestRate: Number(e.target.value) })}
                        placeholder="0"
                        className="w-full px-4 py-2.5 md:px-7 md:py-5 rounded-xl md:rounded-[30px] border-2 border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm md:text-lg font-black outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 md:gap-4 pt-1 md:pt-4">
                  <button
                    onClick={() => setShowAssetModal(false)}
                    className="flex-1 py-3 md:py-5 rounded-2xl md:rounded-[30px] font-black uppercase text-[10px] md:text-[11px] tracking-widest bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all"
                  >
                    Скас.
                  </button>
                  <button
                    onClick={handleSaveAsset}
                    disabled={isSaving}
                    className={`flex-[2.5] py-3 md:py-5 rounded-2xl md:rounded-[30px] font-black uppercase text-[10px] md:text-[11px] tracking-widest bg-orange-500 text-white shadow-xl shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all ${isSaving ? 'opacity-70 cursor-wait animate-pulse' : ''}`}
                  >
                    {isSaving ? 'Зберігаю...' : 'Зберегти'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ label, value, color, icon: Icon }: any) => (
  <div className="p-6 rounded-[35px] bg-white/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 shadow-sm">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</label>
    </div>
    <div className={`text-2xl font-black ${color} tracking-tighter`}>{value}</div>
  </div>
);

const BankConnectionIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 21h18" />
    <path d="M3 10h18" />
    <path d="M5 6l7-3 7 3" />
    <path d="M4 10v11" />
    <path d="M20 10v11" />
    <path d="M8 14v3" />
    <path d="M12 14v3" />
    <path d="M16 14v3" />
  </svg>
);
