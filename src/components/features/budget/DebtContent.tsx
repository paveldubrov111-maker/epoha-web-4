import { CreditCard, Plus, ArrowRight, ArrowUpRight, History, Edit2, Trash2, Check, Sparkles, Landmark, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React from 'react';
import { Account, BudgetCategory, BudgetTx, MonthlyPlan, Debt } from '../../../types';
import { CategoryDropdown } from './CategoryDropdown';

const CATEGORY_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

export interface DebtContentProps {
  totalOverallDebt: number;
  totalRepaymentMonthly: number;
  aiDebtAdvice: string;
  debtTargetDate: string;
  setDebtTargetDate: (d: string) => void;
  debtSubTab: 'monobank' | 'manual';
  setDebtSubTab: (s: 'monobank' | 'manual') => void;
  blackCardAcc: any;
  debtStats: any;
  transactions: BudgetTx[];
  debts: Debt[];
  formatUah: (n: number) => string;
  setShowTxForm: (t: 'income' | 'expense' | null) => void;
  setTxAccountId: (id: string) => void;
  setTxCategoryId: (id: string) => void;
  setTxAmount: (n: number) => void;
  setTxNote: (s: string) => void;
  accounts: Account[];
  categories: BudgetCategory[];
  monthlyPlans: MonthlyPlan[];
  selectedMonth: string;
  setShowDebtForm: (b: boolean) => void;
  setEditingDebt: (d: Debt | null) => void;
  setDebtName: (s: string) => void;
  setDebtAmount: (n: number) => void;
  setDebtRate: (n: number) => void;
  setDebtPayment: (n: number) => void;
  setDebtColor: (s: string) => void;
  handleDeleteDebt: (id: string) => void;
  handleCreateCategory: (name: string, type: BudgetCategory['type'], color?: string, month?: string) => Promise<string | undefined>;
  txAccountId: string;
  handleSaveDebt: () => void;
  showDebtForm: boolean;
  debtName: string;
  debtAmount: number;
  debtRate: number;
  debtPayment: number;
  debtColor: string;
  editingDebt: Debt | null;
  handleUpdateTxCategory: (txId: string, catId: string, type: BudgetCategory['type'], month?: string) => Promise<void>;
  isCompact?: boolean;
}

export const DebtContent = ({ 
  totalOverallDebt, totalRepaymentMonthly, aiDebtAdvice, debtTargetDate, setDebtTargetDate,
  debtSubTab, setDebtSubTab, blackCardAcc, debtStats, transactions = [], debts = [], formatUah,
  setShowTxForm, setTxAccountId, setTxCategoryId, setTxAmount, setTxNote,
  accounts, categories, monthlyPlans, selectedMonth,
  setShowDebtForm, setEditingDebt, setDebtName, setDebtAmount, setDebtRate, setDebtPayment, setDebtColor,
  handleDeleteDebt, handleCreateCategory, txAccountId, handleSaveDebt, showDebtForm,
  debtName, debtAmount, debtRate, debtPayment, debtColor, editingDebt, 
  handleUpdateTxCategory, isCompact = false
}: DebtContentProps) => {
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  return (
    <div className={`space-y-8 ${isCompact ? 'px-1' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h2 className={`${isCompact ? 'text-2xl' : 'text-4xl'} font-black text-zinc-900 dark:text-white tracking-tighter uppercase`}>Борги та Кредити</h2>
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => setDebtSubTab('monobank')}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${debtSubTab === 'monobank' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
            >
              Monobank
            </button>
            <button 
              onClick={() => setDebtSubTab('manual')}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${debtSubTab === 'manual' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
            >
              Інші борги
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Загальний борг</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tighter">{formatUah(totalOverallDebt)}</div>
          </div>
          {!isCompact && <div className="w-px h-10 bg-zinc-200 dark:bg-zinc-800" />}
          <div className="text-right">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Місячний платіж</div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{formatUah(totalRepaymentMonthly)}</div>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isCompact ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-8`}>
        <div className={`${isCompact ? '' : 'lg:col-span-2'} space-y-8`}>
          {debtSubTab === 'monobank' ? (
            <>
              {blackCardAcc ? (
                <div className="glass-card p-10 rounded-[40px] border border-rose-500/20 bg-rose-500/5 relative overflow-hidden">
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-xl">
                          <CreditCard className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Кредитна карта</div>
                          <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{blackCardAcc.name}</h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Використано ліміту</div>
                        <div className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tighter">
                          {formatUah(debtStats?.used || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        <span>Власні кошти: {formatUah(Math.max(0, blackCardAcc.balance - (blackCardAcc.creditLimit || 0)))}</span>
                        <span>Ліміт: {formatUah(blackCardAcc.creditLimit || 0)}</span>
                      </div>
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner border border-zinc-200 dark:border-zinc-700">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((debtStats?.used || 0) / (debtStats?.limit || 1)) * 100)}%` }}
                          className="h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                </div>
              ) : (
                <div className="p-20 text-center glass-card rounded-[40px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Кредитну карту не знайдено</p>
                </div>
              )}

              {blackCardAcc && (
                <div className="glass-card p-8 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                       <History className="w-4 h-4 text-zinc-400" /> Останні операції по кредитці
                    </h4>
                    <button 
                      onClick={() => { setShowTxForm('income'); setTxAccountId(blackCardAcc.id); }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> Поповнити
                    </button>
                  </div>
                  <div className="space-y-2">
                      {transactions
                        .filter(tx => tx.accountId === blackCardAcc.id)
                        .slice(0, 5)
                        .map(tx => (
                          <div key={tx.id} className="flex flex-col p-4 rounded-3xl bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:scale-[1.01] transition-transform shadow-sm gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                  {tx.type === 'income' ? <ArrowRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                </div>
                                <div className="max-w-[140px] md:max-w-[200px]">
                                  <div className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-tight leading-none mb-1 truncate">{tx.description || 'Платіж'}</div>
                                  <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{tx.date}</div>
                                </div>
                              </div>
                              <div className={`text-xs font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {tx.type === 'income' ? '+' : '-'}{formatUah(tx.amount)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Категорія:</span>
                              <CategoryDropdown 
                                currentCategoryId={tx.categoryId}
                                categories={categories}
                                type={tx.type === 'income' ? 'income' : 'expense'}
                                onSelect={(newId) => handleUpdateTxCategory(tx.id, newId, tx.type === 'income' ? 'income' : 'expense', selectedMonth)}
                                onAdd={(name, type, color) => handleCreateCategory(name, type, color, selectedMonth)}
                                monthlyPlans={monthlyPlans}
                                month={selectedMonth}
                                className="flex-1"
                              />
                            </div>
                          </div>
                        ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">Ваші інші борги</h3>
                <button 
                   onClick={() => { setShowDebtForm(true); setEditingDebt(null); setDebtName(''); setDebtAmount(0); setDebtRate(0); setDebtPayment(0); }}
                   className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Plus className="w-4 h-4" /> Додати
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {debts.map(debt => (
                  <div key={debt.id} className="glass-card p-6 rounded-[32px] border border-white/20 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${debt.color}`} />
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">{debt.name}</h4>
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{debt.startDate}</div>
                      </div>
                      <div className="flex gap-2">
                         <button 
                           onClick={() => { setEditingDebt(debt); setDebtName(debt.name); setDebtAmount(debt.amount); setDebtRate(debt.interestRate); setDebtPayment(debt.monthlyPayment); setDebtColor(debt.color); setShowDebtForm(true); }}
                           className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-blue-500 transition-colors"
                         >
                           <Edit2 className="w-3.5 h-3.5" />
                         </button>
                         
                         <div className="flex items-center gap-1">
                           <AnimatePresence mode="wait">
                             {confirmDeleteId === debt.id ? (
                               <motion.div 
                                 key="confirm"
                                 initial={{ opacity: 0, scale: 0.5 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 exit={{ opacity: 0, scale: 0.5 }}
                                 className="flex items-center gap-1"
                               >
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setConfirmDeleteId(null);
                                   }}
                                   className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all"
                                   title="Скасувати"
                                 >
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleDeleteDebt(debt.id);
                                     setConfirmDeleteId(null);
                                   }}
                                   className="p-2 rounded-lg bg-rose-500 text-white transition-all shadow-lg shadow-rose-500/20"
                                   title="Підтвердити видалення"
                                 >
                                   <Check className="w-3.5 h-3.5" />
                                 </button>
                               </motion.div>
                             ) : (
                               <motion.button 
                                 key="trash"
                                 initial={{ opacity: 0, scale: 0.5 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 exit={{ opacity: 0, scale: 0.5 }}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setConfirmDeleteId(debt.id);
                                 }}
                                 className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all opacity-40 group-hover:opacity-100"
                                 title="Видалити"
                                >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </motion.button>
                             )}
                           </AnimatePresence>
                         </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Сума</div>
                        <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">{formatUah(debt.amount)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Платіж</div>
                        <div className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{formatUah(debt.monthlyPayment || 0)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 rounded-[40px] border border-indigo-500/20 bg-indigo-500/5 shadow-sm space-y-6 relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Помічник IO</h4>
            </div>
            <p className="text-xs font-bold leading-relaxed text-zinc-600 dark:text-zinc-400 relative z-10 italic">"{aiDebtAdvice}"</p>
          </div>

          <div className="glass-card p-8 rounded-[40px] border border-blue-500/20 bg-blue-500/5 shadow-sm space-y-6">
            <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
               <Landmark className="w-4 h-4 text-blue-500" /> Планування
            </h4>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Погашення до</label>
                <input 
                  type="date"
                  value={debtTargetDate}
                  onChange={e => setDebtTargetDate(e.target.value)}
                  className="w-full px-5 py-4 rounded-[20px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm font-black text-zinc-900 dark:text-white outline-none focus:ring-2 ring-blue-500/50"
                />
              </div>
              <div className="p-6 rounded-[32px] bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800">
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Необхідний платіж</div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">
                  {formatUah(totalOverallDebt / (Math.max(1, (new Date(debtTargetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44))))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Debt Form Modal */}
      <AnimatePresence>
        {showDebtForm && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDebtForm(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-[48px] shadow-2xl border border-white/20 dark:border-zinc-800"
            >
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">
                    {editingDebt ? 'Редагувати борг' : 'Додати новий борг'}
                  </h3>
                  <button onClick={() => setShowDebtForm(false)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Назва боргу</label>
                     <input 
                       type="text"
                       value={debtName}
                       onChange={e => setDebtName(e.target.value)}
                       placeholder="Наприклад: Борг другу, Кредит у ПУМБ"
                       className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-sm font-bold outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Сума боргу (₴)</label>
                     <input 
                       type="number"
                       value={debtAmount}
                       onChange={e => setDebtAmount(Number(e.target.value))}
                       className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-sm font-bold outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Річна ставка (%)</label>
                     <input 
                       type="number"
                       value={debtRate}
                       onChange={e => setDebtRate(Number(e.target.value))}
                       className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-sm font-bold outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Місячний платіж (₴)</label>
                     <input 
                       type="number"
                       value={debtPayment}
                       onChange={e => setDebtPayment(Number(e.target.value))}
                       className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-sm font-bold outline-none focus:ring-2 ring-zinc-900/5 transition-all"
                     />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Колір маркування</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map(color => (
                      <button 
                        key={color}
                        onClick={() => setDebtColor(color)}
                        className={`w-10 h-10 rounded-xl ${color} transition-all ${debtColor === color ? 'ring-4 ring-zinc-900/10 scale-110 shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                      />
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleSaveDebt}
                  disabled={!debtName || debtAmount <= 0}
                  className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {editingDebt ? 'Зберегти зміни' : 'Додати борг'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
