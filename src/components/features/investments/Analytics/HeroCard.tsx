import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Edit2, Check, X, ArrowUpRight, Wallet, AlertCircle, Link, Link2Off } from 'lucide-react';
import { Currency, Account } from '../../../../types';
import { fmt } from '../../../../utils/format';

interface HeroCardProps {
  bCur: Currency;
  availableInvestmentUah: number;
  availableInvestmentUsd: number;
  onUpdateInvestmentPotential: (val: number) => void;
  onWithdrawFromInvestment: (amountUah: number, accountId: string) => Promise<void>;
  accounts: Account[];
  t: (key: string) => string;
  connectedPotentialAccountId: string | null;
  onConnectPotentialAccount: (id: string | null) => void;
  formatGlobal: (n: number, targetCur: Currency, rates: Record<string, number>, sourceCur?: Currency, maxDecimals?: number, compact?: boolean) => string;
  exchangeRates: Record<string, number>;
  globalCurrency: Currency;
}

const HeroCard: React.FC<HeroCardProps> = ({ 
  bCur, 
  availableInvestmentUah, 
  availableInvestmentUsd, 
  onUpdateInvestmentPotential,
  onWithdrawFromInvestment,
  accounts,
  t,
  connectedPotentialAccountId,
  onConnectPotentialAccount,
  formatGlobal,
  exchangeRates,
  globalCurrency
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(availableInvestmentUah.toString());
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(availableInvestmentUah);
  const [targetAccountId, setTargetAccountId] = useState(accounts[0]?.id || '');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = () => {
    onUpdateInvestmentPotential(parseFloat(editValue) || 0);
    setIsEditing(false);
  };

  const handleWithdrawClick = () => {
    if (withdrawAmount <= 0) return;
    if (!targetAccountId) return;
    setShowConfirm(true);
  };

  const confirmWithdraw = async () => {
    setIsProcessing(true);
    try {
      await onWithdrawFromInvestment(withdrawAmount, targetAccountId);
      setShowWithdrawForm(false);
      setShowConfirm(false);
    } catch (e) {
      console.error('Withdrawal failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const targetAcc = accounts.find(a => a.id === targetAccountId);
  const connectedAcc = accounts.find(a => a.id === connectedPotentialAccountId);
  
  // Filter only investment accounts for connection
  const investmentAccounts = accounts.filter(a => a.isInvestment);

  return (
    <div className="space-y-4">
      <div className="glass-card p-10 rounded-[48px] border border-white/20 dark:border-zinc-800/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-all duration-700 blur-sm">
          <Sparkles className="w-32 h-32 rotate-12 text-indigo-500" />
        </div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">{t('investmentPotential')}</h3>
                {connectedAcc && (
                  <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter flex items-center gap-1">
                    <Link className="w-2 h-2" /> {connectedAcc.name}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isEditing && !showWithdrawForm && (
                <button 
                  onClick={() => setShowAccountSelector(!showAccountSelector)}
                  className={`p-2 rounded-xl transition-all ${connectedAcc ? 'bg-indigo-500/10 text-indigo-600' : 'text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  title={connectedAcc ? "Відключити рахунок" : "Підключити рахунок"}
                >
                  {connectedAcc ? <Link2Off className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                </button>
              )}
              {!isEditing && !showWithdrawForm && (
                <button 
                  onClick={() => setShowWithdrawForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> {t('investmentWithdrawal')}
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showAccountSelector && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-3xl border border-zinc-200 dark:border-white/5 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Виберіть рахунок для синхронізації</span>
                  <button onClick={() => setShowAccountSelector(false)}><X className="w-3 h-3 text-zinc-400" /></button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {investmentAccounts.length > 0 ? (
                    investmentAccounts.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          onConnectPotentialAccount(acc.id);
                          setShowAccountSelector(false);
                        }}
                        className={`flex justify-between items-center px-4 py-3 rounded-2xl border transition-all ${
                          connectedPotentialAccountId === acc.id 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-indigo-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Wallet className="w-4 h-4 opacity-50" />
                          <span className="text-xs font-black">{acc.name}</span>
                        </div>
                        <span className="text-xs font-bold opacity-80">{formatGlobal(acc.balance, globalCurrency, exchangeRates, 'UAH')}</span>
                      </button>
                    ))
                  ) : (
                    <div className="text-[10px] font-bold text-center py-2 text-zinc-400 italic">Немає інвестиційних рахунків</div>
                  )}
                  {connectedAcc && (
                    <button
                      onClick={() => {
                        onConnectPotentialAccount(null);
                        setShowAccountSelector(false);
                      }}
                      className="mt-2 text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline text-center"
                    >
                      Відключити та використовувати ручне введення
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                <div className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter drop-shadow-sm">
                  {formatGlobal(globalCurrency === 'USD' ? availableInvestmentUsd : availableInvestmentUah, globalCurrency, exchangeRates, globalCurrency === 'USD' ? 'USD' : 'UAH')}
                </div>
                {!showWithdrawForm && !connectedAcc && (
                  <button 
                    onClick={() => {
                      setEditValue(availableInvestmentUah.toString());
                      setIsEditing(true);
                    }}
                    className="p-3 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {connectedAcc && (
                  <div className="p-3 text-indigo-500 animate-pulse">
                    <Link className="w-5 h-5" />
                  </div>
                )}
              </>
            )}
          </div>
          
          <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest italic">
            {connectedAcc ? "Синхронізовано з рахунком" : t('availableForReinvestment')}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showWithdrawForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center justify-between gap-4 p-2 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md rounded-[32px] border border-zinc-200/50 dark:border-white/5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4 w-full px-4 pt-2">
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" /> {t('whereToWithdraw')}
              </h4>
              <button onClick={() => setShowWithdrawForm(false)} className="p-2 text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full px-4">
              <div>
                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">{t('account')}</label>
                <select 
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatGlobal(acc.balance, globalCurrency, exchangeRates, 'UAH')})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">{t('amountLabel')}</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                    <button 
                      onClick={() => setWithdrawAmount(availableInvestmentUah * 0.5)}
                      className="text-[9px] font-black text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-1.5 py-0.5 rounded-md uppercase"
                    >
                      50%
                    </button>
                    <button 
                      onClick={() => setWithdrawAmount(availableInvestmentUah)}
                      className="text-[9px] font-black text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-1.5 py-0.5 rounded-md uppercase"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full px-4 pb-4">
              <button 
                onClick={handleWithdrawClick}
                disabled={!targetAccountId || withdrawAmount <= 0 || withdrawAmount > availableInvestmentUah}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {t('confirmWithdrawal')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-center"
            >
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter mb-2">{t('confirmWithdrawTitle')}</h3>
              <p className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest leading-relaxed">
                {t('withdrawConfirmText').replace('{amount}', formatGlobal(withdrawAmount, globalCurrency, exchangeRates, 'UAH')).replace('{account}', targetAcc?.name || '')}
              </p>
              <div className="flex gap-4">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all">{t('cancel')}</button>
                <button 
                  onClick={confirmWithdraw}
                  disabled={isProcessing}
                  className="flex-1 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all"
                >
                  {isProcessing ? t('withdrawing') : t('yesWithdraw')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeroCard;
