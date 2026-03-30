import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Plus, Trash2, X, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Account, 
  BudgetCategory, 
  BudgetTx, 
  Currency, 
  MonthlyPlan, 
  Debt, 
  Language 
} from '../../../types';
import { 
  db, 
  doc, 
  setDoc, 
  handleFirestoreError, 
  OperationType 
} from '../../../firebase';
import { getLocalizedMonths } from '../../../utils/dateUtils';
import { CushionContent } from './CushionContent';
import { DebtContent } from './DebtContent';
import { CategoryDropdown } from './CategoryDropdown';

export interface MonthlyDetailViewProps {
  editingMonth: string;
  monthlyPlans: MonthlyPlan[];
  categories: BudgetCategory[];
  transactions: BudgetTx[];
  planningPillar: 'income' | 'expense' | 'investment' | 'cushion' | 'debt';
  setPlanningPillar: (p: 'income' | 'expense' | 'investment' | 'cushion' | 'debt') => void;
  setEditingMonth: (m: string | null) => void;
  formatGlobal: (n: number, cur?: Currency | 'USD', sourceCur?: Currency) => string;
  userId: string | null;
  pillarStats: Record<string, { fact: number, plan: number }>;
  targetPercents: Record<string, number>;
  onAddCategory: (name: string, type: BudgetCategory['type'], color?: string, month?: string) => Promise<string | undefined>;
  globalCurrency: Currency;
  setMonthlyPlans: React.Dispatch<React.SetStateAction<MonthlyPlan[]>>;
  onDeleteCategory: (id: string) => Promise<void>;
  language: Language;
  t: (key: string) => string;
  chartIdPrefix?: string;
  totalOverallDebt: number;
  totalRepaymentMonthly: number;
  aiDebtAdvice: string;
  debtTargetDate: string;
  setDebtTargetDate: (d: string) => void;
  debtSubTab: 'monobank' | 'manual';
  setDebtSubTab: (s: 'monobank' | 'manual') => void;
  blackCardAcc: any;
  setTxNote: (s: string) => void;
  accounts: Account[];
  monobankClientInfos: Record<string, any>;
  cushionLevelData: any;
  cushionTotal: number;
  cushion: any;
  handleSaveCushion: (updates: any) => Promise<void>;
  analyticsStats: any;
  setShowDebtForm: (b: boolean) => void;
  setEditingDebt: (d: Debt | null) => void;
  setDebtName: (s: string) => void;
  setDebtAmount: (n: number) => void;
  setDebtRate: (n: number) => void;
  setDebtPayment: (n: number) => void;
  setDebtColor: (s: string) => void;
  handleDeleteDebt: (id: string) => void;
  txAccountId: string;
  handleSaveDebt: () => void;
  showDebtForm: boolean;
  debtName: string;
  debtAmount: number;
  debtRate: number;
  debtPayment: number;
  debtColor: string;
  editingDebt: Debt | null;
  debtStats: any;
  debts: Debt[];
  setShowTxForm: (t: 'income' | 'expense' | null) => void;
  setTxAccountId: (id: string) => void;
  setTxCategoryId: (id: string) => void;
  setTxAmount: (n: number) => void;
  handleUpdateTxCategory: (txId: string, catId: string, type: BudgetCategory['type'], month?: string) => Promise<void>;
  onUpdatePillarPercent: (pillar: 'expense' | 'investment' | 'cushion' | 'debt', val: number) => Promise<void>;
  onDeleteBudgetTx: (id: string, affectedAccounts?: {id: string, balance: number}[]) => Promise<void>;
}

export const MonthlyDetailView = ({ 
  editingMonth, 
  monthlyPlans, 
  categories, 
  transactions, 
  planningPillar, 
  setPlanningPillar, 
  setEditingMonth, 
  formatGlobal,
  userId,
  pillarStats,
  targetPercents,
  onAddCategory,
  globalCurrency,
  setMonthlyPlans,
  onDeleteCategory,
  language,
  t,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chartIdPrefix = '',
  totalOverallDebt,
  totalRepaymentMonthly,
  aiDebtAdvice,
  debtTargetDate,
  setDebtTargetDate,
  debtSubTab,
  setDebtSubTab,
  blackCardAcc,
  debtStats,
  debts,
  setShowTxForm,
  setTxAccountId,
  setTxCategoryId,
  setTxAmount,
  setTxNote,
  accounts,
  handleDeleteDebt,
  txAccountId,
  handleSaveDebt,
  showDebtForm,
  debtName,
  debtAmount,
  debtRate,
  debtPayment,
  debtColor,
  editingDebt,
  setShowDebtForm,
  setEditingDebt,
  setDebtName,
  setDebtAmount,
  setDebtRate,
  setDebtPayment,
  setDebtColor,
  monobankClientInfos,
  cushionLevelData,
  cushionTotal,
  cushion,
  handleSaveCushion,
  analyticsStats,
  handleUpdateTxCategory,
  onUpdatePillarPercent,
  onDeleteBudgetTx,
}: MonthlyDetailViewProps) => {
  const [tempPlans, setTempPlans] = useState<Record<string, number>>(() => {
    const existing = monthlyPlans.find(mp => mp.id === editingMonth);
    return existing?.plans || {};
  });
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedCatForTxs, setSelectedCatForTxs] = useState<string | null>(null);
  const saveTimerRef = useRef<any>(null);
  const successTimerRef = useRef<any>(null);
  const isFirstRender = useRef(true);
  const isDirty = useRef(false);
  const isInitialized = useRef(false);

  const handleCopyPrevious = () => {
    const [year, month] = editingMonth.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevMonthId = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const previousPlan = monthlyPlans.find(mp => mp.id === prevMonthId);
    
    if (previousPlan?.plans) {
      if (confirm(`Скопіювати план з ${prevMonthId}? Поточні незбережені зміни в ${editingMonth} будуть замінені.`)) {
        setTempPlans(previousPlan.plans);
        isDirty.current = true;
      }
    } else {
      alert(`Плану за ${prevMonthId} не знайдено.`);
    }
  };

  const handleClearPlans = () => {
    if (confirm('Очистити всі плани на цей місяць?')) {
      setTempPlans({});
      isDirty.current = true;
    }
  };

  // Sync tempPlans when monthlyPlans prop updates from Firestore
  useEffect(() => {
    if (!isDirty.current) {
      const monthPlan = monthlyPlans.find(mp => mp.id === editingMonth);
      if (monthPlan?.plans) {
        console.log(`[PLAN] Initializing monthly plan for ${editingMonth}`, monthPlan.plans);
        setTempPlans(monthPlan.plans);
        isInitialized.current = true;
      } else if (monthlyPlans.length > 0) {
        // We have plans for other months, but not this one. Use defaults.
        console.log(`[PLAN] No specific plan for ${editingMonth}, using defaults.`);
        isInitialized.current = true;
      }
    }
  }, [monthlyPlans, editingMonth]);
  
  const saveMonthlyPlan = async (currentPlans?: Record<string, number>) => {
    if (!userId) return;
    const plansToSave = currentPlans || tempPlans;
    setIsSaving(true);
    try {
      // 1. Update local state immediately for instant feedback
      setMonthlyPlans(prev => {
        const others = prev.filter(p => p.id !== editingMonth);
        return [...others, { id: editingMonth, plans: plansToSave }];
      });

      // 2. Save to Firestore
      const docRef = doc(db, `users/${userId}/monthlyPlans/${editingMonth}`);
      await setDoc(docRef, {
        id: editingMonth,
        userId: userId,
        plans: plansToSave,
        updatedAt: new Date().toISOString()
      });
      isDirty.current = false;
    } catch (error) {
      console.error('[Firestore DEBUG] FAILED to save plan:', error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Помилка під час збереження плану: ${msg}. Спробуйте оновити сторінку або перевірте підключення.`);
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/monthlyPlans`);
    } finally {
      setIsSaving(false);
      setShowSaved(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setShowSaved(false), 3000);
    }
  };

  // Debounced Auto-Save
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!isDirty.current || !isInitialized.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    
    saveTimerRef.current = setTimeout(() => {
      saveMonthlyPlan();
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [tempPlans]);

  const handleClose = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      if (isDirty.current) {
        await saveMonthlyPlan();
      }
    } catch (e) {
      console.error('Error during final save:', e);
    } finally {
      setEditingMonth(null);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || !userId) return;

    if (!confirm(t('confirmDeleteTx') || 'Видалити цю транзакцію?')) return;

    const acc = accounts.find(a => a.id === tx.accountId);
    const affectedAccounts: {id: string, balance: number}[] = [];

    if (acc) {
      let newBalance = acc.balance;
      // Revert the transaction effect:
      // If it was an expense (negative amount in record, but stored as positive 'amount' with isIncoming=false),
      // or if it's just 'amount' that was subtracted/added.
      // In this app, tx.amount seems to be absolute, and tx.isIncoming tells the direction.
      
      if (tx.isIncoming || tx.type === 'income') {
        newBalance -= tx.amount;
      } else {
        newBalance += tx.amount;
      }
      affectedAccounts.push({ id: acc.id, balance: newBalance });
    }

    // Handle transfers (revert the other side if txToAccountId exists)
    // Note: transfers in this app might have txToAccountId
    if (tx.type === 'transfer' && (tx as any).toAccountId) {
      const toAcc = accounts.find(a => a.id === (tx as any).toAccountId);
      if (toAcc) {
        let newToBalance = toAcc.balance;
        newToBalance -= tx.amount;
        affectedAccounts.push({ id: toAcc.id, balance: newToBalance });
      }
    }

    try {
      await onDeleteBudgetTx(txId, affectedAccounts);
      // Optional: optimistic update is handled by the parent's onSnapshot
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  if (!editingMonth) return null;

  const currentMonthName = getLocalizedMonths(language)[parseInt(editingMonth.split('-')[1], 10) - 1];
  const year = editingMonth.split('-')[0];

  // 1. Calculate TOTAL INCOME PLAN for this specific month
  const incomeCats = categories.filter(c => c.type === 'income');
  const totalIncomePlan = (incomeCats || []).reduce((sum, cat) => sum + (tempPlans[cat.id] ?? cat.planned), 0);

  const pillarCats = categories.filter(c => {
    if (planningPillar === 'income') return c.type === 'income';
    if (planningPillar === 'expense') return c.type === 'expense';
    if (planningPillar === 'investment') return c.type === 'investment';
    if (planningPillar === 'cushion') return c.type === 'cushion' || c.type === 'goal';
    if (planningPillar === 'debt') return c.type === 'debt';
    return false;
  });

  const pillarPercent = targetPercents[planningPillar] || 0;
  const percentageTarget = Math.round((pillarPercent / 100) * totalIncomePlan);
  const currentTotal = (pillarCats || []).reduce((sum, cat) => sum + (tempPlans[cat.id] ?? cat.planned), 0);
  
  // Final target for this pillar: either percentage-based from income, or sum of categories (if no target set)
  const plannedTotal = (planningPillar === 'income' || percentageTarget === 0) ? currentTotal : percentageTarget;
  const remaining = plannedTotal - currentTotal;

  const applyProportions = () => {
    if (pillarCats.length === 0) return;

    const targetPillarTotal = plannedTotal;
    const currentSum = currentTotal;
    const newTempPlans = { ...tempPlans };

    pillarCats.forEach(cat => {
      const currentVal = tempPlans[cat.id] ?? cat.planned;
      let newVal = 0;
      if (currentSum > 0) {
        newVal = Math.round(targetPillarTotal * (currentVal / currentSum));
      } else {
        newVal = Math.round(targetPillarTotal / pillarCats.length);
      }
      newTempPlans[cat.id] = newVal;
    });

    isDirty.current = true;
    setTempPlans(newTempPlans);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button onClick={handleClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">
            Оновити план за {currentMonthName} {year}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <AnimatePresence>
            {isSaving ? (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 rounded-full text-[10px] font-black uppercase tracking-widest"
              >
                <div className="w-1 h-1 bg-zinc-400 rounded-full animate-ping"></div>
                Синхронізація
              </motion.div>
            ) : showSaved ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest"
              >
                <Check className="w-3 h-3" />
                Збережено
              </motion.div>
            ) : null}
          </AnimatePresence>
          <button 
            onClick={handleClose}
            className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-sm font-bold shadow-lg hover:opacity-90 transition-all active:scale-95"
          >
            Готово
          </button>
        </div>
      </div>

      <div className="flex justify-start gap-3 px-1 mb-2">
         <button 
           onClick={handleCopyPrevious}
           className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
         >
           Скопіювати з минулого місяця
         </button>
         <button 
           onClick={handleClearPlans}
           className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
         >
           Очистити план
         </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(['income', 'expense', 'cushion', 'debt', 'investment'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPlanningPillar(p)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              planningPillar === p 
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {p === 'income' ? 'Доходи' : p === 'expense' ? 'Витрати' : p === 'cushion' ? 'Подушка' : p === 'investment' ? 'Інвестиції' : 'Борги'}
          </button>
        ))}
      </div>

      {planningPillar !== 'income' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-zinc-50 dark:bg-zinc-800/50 p-7 rounded-[40px] border border-zinc-200/50 dark:border-white/5 shadow-sm group overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Цільовий розподіл</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner group/percent focus-within:ring-2 ring-blue-500/20">
                    <input 
                      type="number" 
                      value={pillarPercent} 
                      onChange={(e) => onUpdatePillarPercent(planningPillar as any, Number(e.target.value))}
                      className="w-8 bg-transparent border-none text-sm font-black text-blue-500 outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] font-black text-zinc-400 ml-0.5">%</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">від доходу {formatGlobal(totalIncomePlan, undefined, 'UAH')}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none">Ціль (сума)</span>
                <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter mt-1">{formatGlobal(percentageTarget, undefined, 'UAH')}</div>
              </div>
            </div>

            <div className="flex justify-between items-end mb-6">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none mb-2">Вже розподілено</span>
                  <div className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter drop-shadow-sm">{formatGlobal(currentTotal, undefined, 'UAH')}</div>
               </div>
               <button 
                  onClick={applyProportions}
                  className="flex items-center gap-2 px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-zinc-500/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Розподілити автоматично
                </button>
            </div>
            
            <div className="w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full h-4 overflow-hidden mb-5 shadow-inner border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (currentTotal / (percentageTarget || 1)) * 100)}%` }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className={`h-full bg-gradient-to-r ${currentTotal > percentageTarget ? 'from-rose-500 to-rose-600' : 'from-zinc-800 to-zinc-900 dark:from-zinc-200 dark:to-white'} shadow-[0_0_15px_rgba(0,0,0,0.2)] rounded-full`}
              ></motion.div>
            </div>
            <div className="flex justify-between text-[11px] font-black uppercase tracking-tighter">
              <span className={`transition-colors flex items-center gap-1.5 ${remaining < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {remaining < 0 ? (
                  <>⚠️ Перевищення: {formatGlobal(Math.abs(remaining), undefined, 'UAH')}</>
                ) : remaining === 0 ? (
                  <>✅ План повністю розподілено</>
                ) : (
                  <>⚖️ Залишилось розподілити: {formatGlobal(remaining, undefined, 'UAH')}</>
                )}
              </span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-zinc-500/5 rounded-full -mr-40 -mt-40 blur-[80px] group-hover:bg-blue-500/10 transition-all duration-700"></div>
        </motion.div>
      )}

      {planningPillar === 'income' && (
        <div className="glass-card p-6 rounded-[32px] border border-emerald-500/20 bg-emerald-500/5 shadow-sm">
           <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Загальний планований дохід</span>
                <div className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter mt-1">{formatGlobal(totalIncomePlan, undefined, 'UAH')}</div>
              </div>
              <div className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                Додайте ваші джерела доходів нижче,<br/>щоб система знала, що розподіляти.
              </div>
           </div>
        </div>
      )}

      {planningPillar === 'cushion' && (
        <CushionContent 
          cushionLevelData={cushionLevelData}
          formatUah={(n) => formatGlobal(n, undefined, 'UAH')}
          cushionTotal={cushionTotal}
          cushion={cushion}
          handleSaveCushion={handleSaveCushion}
          analyticsStats={analyticsStats}
          accounts={accounts}
          monobankClientInfos={monobankClientInfos}
          isCompact={true}
          monthlyTarget={percentageTarget}
        />
      )}

      {planningPillar === 'debt' && (
        <DebtContent 
          totalOverallDebt={totalOverallDebt}
          totalRepaymentMonthly={totalRepaymentMonthly}
          aiDebtAdvice={aiDebtAdvice}
          debtTargetDate={debtTargetDate}
          setDebtTargetDate={setDebtTargetDate}
          debtSubTab={debtSubTab}
          setDebtSubTab={setDebtSubTab}
          blackCardAcc={blackCardAcc}
          debtStats={debtStats}
          transactions={transactions}
          debts={debts}
          formatUah={(n) => formatGlobal(n, undefined, 'UAH')}
          setShowTxForm={setShowTxForm}
          setTxAccountId={setTxAccountId}
          setTxCategoryId={setTxCategoryId}
          setTxAmount={setTxAmount}
          setTxNote={setTxNote}
          accounts={accounts}
          categories={categories}
          monthlyPlans={monthlyPlans}
          selectedMonth={editingMonth}
          setShowDebtForm={setShowDebtForm}
          setEditingDebt={setEditingDebt}
          setDebtName={setDebtName}
          setDebtAmount={setDebtAmount}
          setDebtRate={setDebtRate}
          setDebtPayment={setDebtPayment}
          setDebtColor={setDebtColor}
          handleDeleteDebt={handleDeleteDebt}
          handleCreateCategory={onAddCategory}
          txAccountId={txAccountId}
          handleSaveDebt={handleSaveDebt}
          showDebtForm={showDebtForm}
          debtName={debtName}
          debtAmount={debtAmount}
          debtRate={debtRate}
          debtPayment={debtPayment}
          debtColor={debtColor}
          editingDebt={editingDebt}
          handleUpdateTxCategory={handleUpdateTxCategory}
          isCompact={true}
        />
      )}

      {planningPillar !== 'debt' && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.filter(c => {
            if (planningPillar === 'income') return c.type === 'income';
            if (planningPillar === 'expense') return c.type === 'expense';
            if (planningPillar === 'investment') return c.type === 'investment';
            if (planningPillar === 'cushion') return c.type === 'cushion' || c.type === 'goal';
            return (c.type as any) === planningPillar;
          }).map(cat => {
            const monthTxs = transactions.filter(t => t.date?.startsWith(editingMonth) && t.categoryId === cat.id);
            const fact = (monthTxs || []).reduce((sum, t) => sum + t.amount, 0);
            const currentPlan = tempPlans[cat.id] ?? cat.planned;

            return (
              <motion.div 
                key={cat.id} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedCatForTxs(cat.id)}
                className="glass-card p-4 rounded-[28px] border border-white/20 dark:border-zinc-800/50 shadow-sm flex flex-col justify-between min-h-[160px] group hover:border-blue-500/30 transition-all cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cat.color || 'bg-blue-500'} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></div>
                      <span className="text-[12px] font-black text-black dark:text-white truncate uppercase tracking-tight">{cat.name}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCategory(cat.id);
                      }}
                      className="p-1.5 hover:bg-red-500/10 dark:hover:bg-red-500/20 text-zinc-400 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      title="Видалити"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Факт</div>
                    <div className={`text-sm font-black ${fact > currentPlan && cat.type !== 'income' ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-950 dark:text-white'}`}>
                      {formatGlobal(fact, undefined, 'UAH')}
                    </div>
                  </div>

                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ${fact > currentPlan && cat.type !== 'income' ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, currentPlan > 0 ? (fact / currentPlan) * 100 : 0)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {cat.type !== 'income' && !['cushion', 'debt'].includes(planningPillar) && (percentageTarget || 0) > 0 && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 flex items-center justify-between bg-zinc-100/50 dark:bg-zinc-800/30 px-3 py-2 rounded-2xl border border-zinc-200/50 dark:border-white/5 group/input focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50 transition-all shadow-inner"
                    >
                      <span className="text-[10px] font-black text-zinc-400 group-focus-within/input:text-blue-500 transition-colors">%</span>
                      <input 
                        type="number"
                        className="w-10 bg-transparent border-none text-[12px] font-black text-zinc-800 dark:text-zinc-200 text-right outline-none p-0 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={Math.round((currentPlan / (percentageTarget || 1)) * 100)}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          if (!isNaN(p)) {
                            isDirty.current = true;
                            setTempPlans(prev => ({ ...prev, [cat.id]: Math.round((p / 100) * (percentageTarget || 0)) }));
                          }
                        }}
                      />
                    </div>
                  )}

                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="flex-[1.5] flex items-center justify-between bg-white/80 dark:bg-zinc-800/80 px-3 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-700/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm"
                  >
                     <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">{globalCurrency}</span>
                    <input 
                      type="number" 
                      className="w-full bg-transparent border-none text-[12px] font-black text-zinc-900 dark:text-white text-right outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={currentPlan || ''}
                      placeholder="0"
                      onChange={(e) => {
                        isDirty.current = true;
                        setTempPlans(prev => ({ ...prev, [cat.id]: Number(e.target.value) }));
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Uncategorized Card */}
          {(() => {
            const isIncomePillar = planningPillar === 'income';
            const isExpensePillar = planningPillar === 'expense';
            const isInvestmentPillar = planningPillar === 'investment';
            
            const uncategorizedTxs = transactions.filter(t => 
              t.date?.startsWith(editingMonth) && 
              (t.categoryId === null || t.categoryId === '') &&
              ((isIncomePillar && (t.isIncoming || t.type === 'income')) || 
               (isExpensePillar && (!t.isIncoming && t.type === 'expense')) ||
               (isInvestmentPillar && t.type === 'investment'))
            );
            const uncategorizedSum = uncategorizedTxs.reduce((sum, t) => sum + t.amount, 0);
            
            if (uncategorizedTxs.length === 0) return null;

            return (
              <motion.div 
                key="uncategorized"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedCatForTxs('uncategorized')}
                className="glass-card p-4 rounded-[28px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between min-h-[160px] group hover:border-blue-500/50 transition-all cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/10"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-zinc-400 animate-pulse"></div>
                       <span className="text-[12px] font-black text-zinc-500 uppercase tracking-tight">Без категорії</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Сума</div>
                    <div className="text-sm font-black text-blue-500">
                      {formatGlobal(uncategorizedSum, undefined, 'UAH')}
                    </div>
                  </div>
                  <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-tight">
                    {uncategorizedTxs.length} транзакцій очікують<br/>на розподіл
                  </div>
                </div>
                <div className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg group-hover:scale-105 transition-transform">
                   Розподілити
                </div>
              </motion.div>
            );
          })()}

          <div className="relative min-h-[140px]">
              {!isAdding ? (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="w-full h-full border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[20px] text-zinc-400 dark:text-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-500 transition-all flex flex-col items-center justify-center gap-1 group bg-zinc-50/30"
                >
                  <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Додати</span>
                </button>
              ) : (
                <div className="w-full h-full bg-white dark:bg-zinc-900 border-2 border-blue-500 p-3 rounded-[20px] shadow-lg flex flex-col justify-between">
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Назва..."
                    className="w-full bg-transparent border-none text-xs font-bold text-zinc-800 dark:text-zinc-100 outline-none"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newCatName) {
                        const type = (planningPillar === 'cushion' ? 'cushion' : planningPillar) as BudgetCategory['type'];
                        const id = await onAddCategory(newCatName, type, undefined, editingMonth || undefined);
                        if (id) {
                          isDirty.current = true;
                          setTempPlans(prev => ({ ...prev, [id]: 0 }));
                        }
                        setIsAdding(false);
                        setNewCatName('');
                      }
                      if (e.key === 'Escape') {
                        setIsAdding(false);
                        setNewCatName('');
                      }
                    }}
                  />
                  <div className="flex justify-end gap-1 mt-2">
                    <button onClick={() => setIsAdding(false)} className="p-1.5 text-zinc-400"><X className="w-4 h-4" /></button>
                    <button 
                      disabled={!newCatName}
                      onClick={async () => {
                        const type = (planningPillar === 'cushion' ? 'cushion' : planningPillar) as BudgetCategory['type'];
                        const id = await onAddCategory(newCatName, type, undefined, editingMonth || undefined);
                        if (id) {
                          isDirty.current = true;
                          setTempPlans(prev => ({ ...prev, [id]: 0 }));
                        }
                        setIsAdding(false);
                        setNewCatName('');
                      }}
                      className="p-1.5 bg-blue-500 text-white rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Category Transactions Drill-down Overlay */}
      <AnimatePresence>
        {selectedCatForTxs && (
          <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCatForTxs(null)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-white/20 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${selectedCatForTxs === 'uncategorized' ? 'bg-zinc-400' : (categories.find(c => c.id === selectedCatForTxs)?.color || 'bg-blue-500')}`}></div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    {selectedCatForTxs === 'uncategorized' ? 'Без категорії' : categories.find(c => c.id === selectedCatForTxs)?.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedCatForTxs(null)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1">
                {transactions
                  .filter(t => {
                    const dateMatch = t.date?.startsWith(editingMonth);
                    if (selectedCatForTxs === 'uncategorized') {
                      const isMissingCat = t.categoryId === null || t.categoryId === '';
                      const isIncomePillar = planningPillar === 'income';
                      const isExpensePillar = planningPillar === 'expense';
                      const isInvestmentPillar = planningPillar === 'investment';
                      const pillarMatch = (isIncomePillar && (t.isIncoming || t.type === 'income')) ||
                                          (isExpensePillar && (!t.isIncoming && t.type === 'expense')) ||
                                          (isInvestmentPillar && t.type === 'investment');
                      return dateMatch && isMissingCat && pillarMatch;
                    }
                    return dateMatch && t.categoryId === selectedCatForTxs;
                  })
                  .sort((a,b) => (b.date || '').localeCompare(a.date || ''))
                  .map(tx => (
                    <div key={tx.id} className="flex flex-col p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 gap-3">
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                            {tx.description || 'Без опису'}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            {new Date(tx.date).toLocaleDateString('uk-UA')} {tx.time}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-black text-zinc-900 dark:text-white">
                            {formatGlobal(tx.amount, undefined, 'UAH')}
                          </div>
                          <button 
                            onClick={() => handleDeleteTx(tx.id)}
                            className="p-2 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 rounded-xl transition-all"
                            title="Видалити транзакцію"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/30">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Категорія:</span>
                        <CategoryDropdown 
                          currentCategoryId={tx.categoryId}
                          categories={categories}
                          type={tx.isIncoming ? 'income' : 'expense'}
                          onSelect={(newCatId) => handleUpdateTxCategory(tx.id, newCatId, tx.isIncoming ? 'income' : 'expense', editingMonth)}
                          onAdd={(name, type, color) => onAddCategory(name, type, color, editingMonth)}
                          monthlyPlans={monthlyPlans}
                          month={editingMonth}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  ))}
                
                {transactions.filter(t => t.date?.startsWith(editingMonth) && t.categoryId === selectedCatForTxs).length === 0 && (
                  <div className="py-12 text-center text-zinc-400 text-sm font-bold uppercase tracking-widest opacity-50">
                    Транзакцій не знайдено
                  </div>
                )}
              </div>

              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Всього (Факт)</span>
                  <span className="text-xl font-black text-zinc-900 dark:text-white">
                    {formatGlobal(transactions.filter(t => t.date?.startsWith(editingMonth) && t.categoryId === selectedCatForTxs).reduce((s, t) => s + t.amount, 0), undefined, 'UAH')}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
