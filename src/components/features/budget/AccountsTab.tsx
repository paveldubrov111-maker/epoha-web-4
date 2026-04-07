import React from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Wallet, RefreshCw, History, ShieldCheck, Zap, Check, Sparkles, Target, Landmark, PiggyBank, CreditCard } from 'lucide-react';
import { Account, AccountType, BudgetTx, BankConnection, Currency } from '../../../types';

interface AccountsTabProps {
  accounts: Account[];
  transactions: BudgetTx[];
  selectedMonth: string;
  lastBalancesUpdateTime: string | null;
  isSyncingBalances: boolean;
  categorizedAccounts: Record<string, Account[]>;
  editingAcc: string | 'new' | null;
  accName: string;
  accBalance: number;
  accCreditLimit: number;
  accIsInvestment: boolean;
  accType: AccountType;
  setEditingAcc: (id: string | 'new' | null) => void;
  setAccName: (name: string) => void;
  setAccBalance: (bal: number) => void;
  setAccCreditLimit: (limit: number) => void;
  setAccIsInvestment: (isInv: boolean) => void;
  setAccType: (type: AccountType) => void;
  saveAccount: () => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  setShowTxForm: (type: 'income' | 'expense' | null) => void;
  setTxAccountId: (id: string) => void;
  showDiagnostics: boolean;
  setShowDiagnostics: (show: boolean) => void;
  syncStatus: string[];
  setSyncStatus: (status: string[]) => void;
  bankConnections: BankConnection[];
  onDeleteBankConnection: (id: string) => Promise<void>;
  handleSyncAllBanks: (silent?: boolean, force?: boolean) => Promise<void>;
  handleSyncBank: (conn: BankConnection) => Promise<void>;
  handleRegisterWebhook: (conn: BankConnection) => Promise<void>;
  handleSyncBankHistory: (conn: BankConnection, months: number) => Promise<void>;
  repairTransactions: () => Promise<void>;
  handleSyncOkx: (conn: BankConnection) => Promise<void>;
  monobankClientInfos: Record<string, any>;
  handleLinkAccount: (bankAccId: string, appAccId: string, connId: string) => Promise<void>;
  bankToken: string;
  setBankToken: (token: string) => void;
  handleConnectMonobank: () => Promise<void>;
  okxApiKey: string;
  setOkxApiKey: (key: string) => void;
  okxSecretKey: string;
  setOkxSecretKey: (key: string) => void;
  okxPassphrase: string;
  setOkxPassphrase: (pass: string) => void;
  handleConnectOkx: () => Promise<void>;
  showBankForm: boolean;
  setShowBankForm: (show: boolean) => void;
  bankFormType: 'monobank' | 'okx' | null;
  setBankFormType: (type: 'monobank' | 'okx' | null) => void;
  isSyncingBank: boolean;
  formatUah: (n: number) => string;
  t: (key: string) => string;
  isDarkMode: boolean;
  getMonobankUrl: (path: string, token: string) => string;
}

export const AccountsTab = ({
  accounts,
  transactions,
  selectedMonth,
  lastBalancesUpdateTime,
  isSyncingBalances,
  categorizedAccounts,
  editingAcc,
  accName,
  accBalance,
  accCreditLimit,
  accIsInvestment,
  accType,
  setEditingAcc,
  setAccName,
  setAccBalance,
  setAccCreditLimit,
  setAccIsInvestment,
  setAccType,
  saveAccount,
  deleteAccount,
  setShowTxForm,
  setTxAccountId,
  showDiagnostics,
  setShowDiagnostics,
  syncStatus,
  setSyncStatus,
  bankConnections,
  onDeleteBankConnection,
  handleSyncAllBanks,
  handleSyncBank,
  handleRegisterWebhook,
  handleSyncBankHistory,
  repairTransactions,
  handleSyncOkx,
  monobankClientInfos,
  handleLinkAccount,
  bankToken,
  setBankToken,
  handleConnectMonobank,
  okxApiKey,
  setOkxApiKey,
  okxSecretKey,
  setOkxSecretKey,
  okxPassphrase,
  setOkxPassphrase,
  handleConnectOkx,
  showBankForm,
  setShowBankForm,
  bankFormType,
  setBankFormType,
  isSyncingBank,
  formatUah,
  t,
  isDarkMode,
  getMonobankUrl,
}: AccountsTabProps) => {
  return (
    <motion.div
      key="accounts"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl p-4 md:p-6 rounded-[32px] border border-zinc-200 dark:border-white/5">
        <div>
          <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Мої активи
          </h3>
          {lastBalancesUpdateTime && (
            <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">
              <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isSyncingBalances ? 'animate-pulse' : ''}`} />
              Живий баланс: {lastBalancesUpdateTime}
            </div>
          )}
        </div>
        <button 
          onClick={() => { setEditingAcc('new'); setAccName(''); setAccBalance(0); setAccIsInvestment(false); setAccType('cards'); }} 
          className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white hover:scale-105 active:scale-95 rounded-[20px] text-[10px] font-black uppercase tracking-widest text-white dark:text-zinc-900 transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/5"
        >
          <Plus className="w-4 h-4" /> 
          Додати рахунок
        </button>
      </div>

      {editingAcc && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-zinc-50 dark:bg-zinc-800/80 p-6 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-700/50 flex flex-wrap gap-4 items-end"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Назва</label>
            <input type="text" value={accName} onChange={e => setAccName(e.target.value)} className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold outline-none focus:ring-2 ring-blue-500/50 transition-all" placeholder="Назва рахунку..." />
          </div>
          <div className="w-32">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Баланс (₴)</label>
            <input type="number" value={accBalance || ''} onChange={e => setAccBalance(Number(e.target.value))} className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold outline-none focus:ring-2 ring-blue-500/50" />
          </div>
          <div className="w-40">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Категорія</label>
            <select 
              value={editingAcc === 'new' ? accType : (accounts.find(a => a.id === editingAcc)?.type || accType)} 
              onChange={e => setAccType(e.target.value as AccountType)}
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] font-black uppercase tracking-tight outline-none focus:ring-2 ring-blue-500/50 appearance-none cursor-pointer"
            >
              <option value="cards">💳 Картки</option>
              <option value="credit">🛡️ Кредит</option>
              <option value="jars">🏺 Банки</option>
              <option value="goals">🎯 Цілі</option>
              <option value="investments">📈 Інвестиції</option>
              <option value="savings">💰 Збереження</option>
              <option value="cushion">🛡️ Подушка</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Кредит (₴)</label>
            <input type="number" value={accCreditLimit || ''} onChange={e => setAccCreditLimit(Number(e.target.value))} className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold outline-none focus:ring-2 ring-blue-500/50" placeholder="0" />
          </div>
          
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setEditingAcc(null)} className="px-5 py-3 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">Скасувати</button>
            <button onClick={saveAccount} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Зберегти</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-12 pb-20">
        {(['cards', 'credit', 'jars', 'goals', 'investments', 'savings', 'cushion'] as const).map((key) => {
          const groupAccounts = categorizedAccounts[key] || [];
          if (groupAccounts.length === 0) return null;

          const titles: Record<string, { label: string, icon: any, color: string }> = {
            cards: { label: 'Картки та Готівка', icon: CreditCard, color: 'text-blue-500' },
            credit: { label: t('creditCategory'), icon: ShieldCheck, color: 'text-rose-500' },
            jars: { label: 'Банки Monobank', icon: PiggyBank, color: 'text-amber-500' },
            goals: { label: 'Цілі', icon: Target, color: 'text-emerald-500' },
            investments: { label: 'Інвестиції', icon: Sparkles, color: 'text-indigo-500' },
            savings: { label: 'Збереження', icon: Landmark, color: 'text-purple-500' },
            cushion: { label: 'Фінподушка', icon: ShieldCheck, color: 'text-rose-500' },
          };

          const Meta = titles[key];

          return (
            <div key={key} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="flex items-center gap-3 mb-4 ml-1">
                <div className={`p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 shadow-sm ${Meta.color}`}>
                  <Meta.icon size={12} />
                </div>
                <h4 className="text-[9px] font-black text-zinc-900 dark:text-zinc-400 uppercase tracking-[0.2em]">{Meta.label}</h4>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-zinc-200 dark:from-white/5 to-transparent"></div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {groupAccounts.map((acc, idx) => {
                  const isCredit = (acc.creditLimit || 0) > 0;
                  const usedCredit = isCredit ? Math.max(0, (acc.creditLimit || 0) - acc.balance) : 0;
                  const ownMoney = isCredit ? Math.max(0, acc.balance - (acc.creditLimit || 0)) : acc.balance;
                  const creditPercent = isCredit ? Math.min(100, (usedCredit / (acc.creditLimit || 1)) * 100) : 0;

                  const isMono = !!acc.bankAccountId || acc.name.toLowerCase().includes('mono');
                  const isJar = acc.bankAccountId?.startsWith('jar_') || (acc.bankAccountId && key === 'jars');

                  return (
                    <motion.div
                      key={acc.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => {
                        setEditingAcc(acc.id);
                        setAccName(acc.name);
                        setAccBalance(acc.balance);
                        setAccCreditLimit(acc.creditLimit || 0);
                        setAccIsInvestment(!!acc.isInvestment);
                        if (acc.type) setAccType(acc.type);
                      }}
                      className="group relative bg-white/70 dark:bg-zinc-900/40 p-2.5 rounded-[18px] border border-zinc-200/50 dark:border-white/5 hover:border-blue-500/40 transition-all cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-md flex flex-col justify-between h-[84px]"
                    >
                      <div className="flex justify-between items-start">
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] shadow-sm ${isJar ? 'bg-amber-500/10 text-amber-500' : isMono ? 'bg-zinc-950 dark:bg-black text-white' : 'bg-blue-500/10 text-blue-500'}`}>
                          {isJar ? '🏺' : isMono ? '🐈' : <Wallet size={10} />}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                           <button 
                             onClick={(e) => { e.stopPropagation(); setShowTxForm('income'); setTxAccountId(acc.id); }} 
                             className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all"
                           >
                              <Plus size={10} />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); deleteAccount(acc.id); }} 
                             className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all"
                           >
                              <Trash2 size={10} />
                           </button>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <div className="text-[7px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate mb-0.5 leading-none">
                           {acc.name}
                        </div>
                        <div className={`text-xs font-black tracking-tight truncate leading-none ${ownMoney < 0 ? 'text-rose-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {formatUah(ownMoney)}
                        </div>
                        
                        {isCredit && (
                          <>
                            <div className="mt-1 flex justify-between items-center text-[6px] font-bold uppercase tracking-tighter text-zinc-400">
                               <span>{t('usedLabel')}: {formatUah(usedCredit)}</span>
                               <span className="opacity-60">{t('creditLimitLabel')}: {formatUah(acc.creditLimit || 0)}</span>
                            </div>
                            <div className="mt-1 h-[1.5px] w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }} 
                                animate={{ width: `${creditPercent}%` }} 
                                className={`h-full ${creditPercent > 80 ? 'bg-rose-500' : 'bg-blue-500'}`} 
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className={`absolute -bottom-4 -right-4 w-8 h-8 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-all ${isJar ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showDiagnostics && (
        <div className="mb-6 p-4 bg-zinc-950 rounded-3xl border border-zinc-800 font-mono text-[10px] leading-relaxed">
          <div className="flex items-center justify-between mb-3">
            <div className="text-zinc-500 uppercase tracking-widest font-bold">Діагностика Синхронізації</div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const conn = bankConnections[0];
                  if (!conn) { console.warn('Token not found'); return; }
                  const res = await fetch(getMonobankUrl('/personal/client-info', conn.token), {
                    headers: {
                      'X-Token': conn.token,
                      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                    }
                  });
                  const info = await res.json();
                  console.log('CLIENT INFO:', info);
                  const accs = info.accounts.map((a: any) => {
                    const type = a.type === 'black' ? 'Чорна' : a.type === 'white' ? 'Біла' : a.type === 'platinum' ? 'Платинум' : a.type;
                    const currency = a.currencyCode === 980 ? 'UAH' : a.currencyCode === 840 ? 'USD' : a.currencyCode === 978 ? 'EUR' : a.currencyCode;
                    const balance = (a.balance / 100).toFixed(2);
                    return `[${type}] ${currency}: ${balance} (ID: ${a.id})`;
                  }).join('\n');
                  const jars = (info.jars || []).map((j: any) => `[Банка] ${j.title}: ${(j.balance / 100).toFixed(2)} (ID: ${j.id})`).join('\n');
                  alert(`ДОСТУПНІ РАХУНКИ:\n${accs}\n\nБАНКИ:\n${jars || 'Відсутні'}`);
                }}
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
              >
                ПЕРЕВІРИТИ ID РАХУНКІВ
              </button>
              <button
                onClick={() => handleSyncAllBanks(false, true)}
                className="px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 font-bold"
              >
                ФОРСУВАТИ ПОВНИЙ СИНХРОН
              </button>
              <button onClick={() => setSyncStatus([])} className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 font-bold uppercase">Очистити</button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-2">
            {syncStatus.length === 0 ? (
              <div className="text-zinc-600 italic">Логів поки немає...</div>
            ) : (
              syncStatus.map((log, i) => (
                <div key={i} className={log.includes('ПОМИЛКА') ? 'text-red-400' : log.includes('ЗБЕРЕЖЕНО') ? 'text-emerald-400' : 'text-zinc-300'}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowDiagnostics(!showDiagnostics)} className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-blue-500 transition-colors flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> {showDiagnostics ? 'Сховати діагностику' : 'Показати діагностику'}
        </button>
      </div>

      <div className="pt-10 mt-8 border-t border-zinc-100 dark:border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Сервісний Хаб</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1 opacity-60">Управління підключеннями банку та бірж</p>
          </div>
          {!showBankForm && (
            <div className="flex gap-2 p-1.5 bg-zinc-100 dark:bg-white/5 rounded-[22px] border border-zinc-200 dark:border-white/5 shadow-inner overflow-x-auto no-scrollbar max-w-full">
              <button 
                onClick={() => { setShowBankForm(true); setBankFormType('monobank'); }} 
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-[14px] text-[10px] font-black hover:shadow-lg transition-all uppercase tracking-widest border border-zinc-200 dark:border-white/10 shrink-0"
              >
                🐈 Mono
              </button>
              <button 
                onClick={() => { setShowBankForm(true); setBankFormType('okx'); }} 
                className="flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white rounded-[14px] text-[10px] font-black hover:shadow-lg transition-all uppercase tracking-widest shadow-2xl shrink-0"
              >
                ₿ OKX
              </button>
            </div>
          )}
        </div>

        {showBankForm && bankFormType === 'monobank' && (
          <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[24px] border border-blue-100 dark:border-blue-900/30 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h4 className="text-sm font-bold mb-4 uppercase tracking-tight">Підключення Monobank</h4>
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 font-medium">Введіть свій персональний токен Monobank. Його можна отримати на <a href="https://api.monobank.ua/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">api.monobank.ua</a></p>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">X-Token</label>
                <input type="password" value={bankToken} onChange={e => setBankToken(e.target.value)} placeholder="Вставте ваш токен тут..." className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50 rounded-xl text-sm outline-none focus:ring-2 ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleConnectMonobank} disabled={!bankToken || isSyncingBank} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95">{isSyncingBank ? 'Підключення...' : 'Підключити'}</button>
                <button onClick={() => setShowBankForm(false)} className="px-6 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Скасувати</button>
              </div>
            </div>
          </div>
        )}

        {showBankForm && bankFormType === 'okx' && (
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h4 className="text-sm font-bold mb-4 uppercase tracking-tight flex items-center gap-2">
              <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-[10px] text-white font-black">₿</span>
              Підключення OKX Exchange
            </h4>
            <div className="space-y-4">
              <div className="bg-white/80 dark:bg-zinc-900/50 p-4 rounded-xl border border-indigo-200/50 dark:border-indigo-800/30">
                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase mb-2">Як отримати API ключ:</p>
                <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-decimal list-inside">
                  <li>Зайдіть на <a href="https://www.okx.com/account/my-api" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-bold">okx.com → API Management</a></li>
                  <li>Натисніть <strong>"Create API key"</strong></li>
                  <li>Виберіть <strong>"Read only"</strong> дозволи (без торгівлі!)</li>
                  <li>Скопіюйте API Key, Secret Key та Passphrase</li>
                </ol>
              </div>
              <div>
                <input type="text" value={okxApiKey} onChange={e => setOkxApiKey(e.target.value)} placeholder="Ваш API Key..." className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50 rounded-xl text-sm mb-2" />
                <input type="password" value={okxSecretKey} onChange={e => setOkxSecretKey(e.target.value)} placeholder="Ваш Secret Key..." className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50 rounded-xl text-sm mb-2" />
                <input type="password" value={okxPassphrase} onChange={e => setOkxPassphrase(e.target.value)} placeholder="Ваш Passphrase..." className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50 rounded-xl text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleConnectOkx} disabled={!okxApiKey || isSyncingBank} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-95">Підключити OKX</button>
                <button onClick={() => setShowBankForm(false)} className="px-6 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Скасувати</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bankConnections.map(conn => (
            <div key={conn.id} className="bg-white/40 dark:bg-black/40 backdrop-blur-xl p-6 rounded-[32px] border border-zinc-200 dark:border-white/5 relative overflow-hidden group/card shadow-sm hover:shadow-xl transition-all">
              <div className="flex justify-between items-center relative z-10 mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${conn.type === 'okx' ? 'bg-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800'} flex items-center justify-center font-black text-xl border border-zinc-200 dark:border-white/10 shadow-inner`}>
                    {conn.type === 'okx' ? '₿' : '🐈'}
                  </div>
                  <div>
                    <div className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                      {conn.name}
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                    <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest opacity-60">Активне підключення</div>
                  </div>
                </div>

                <div className="flex gap-2">
                   <button onClick={() => handleSyncBank(conn)} className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all">
                      <RefreshCw className={`w-4 h-4 ${isSyncingBank ? 'animate-spin' : ''}`} />
                   </button>
                   <button onClick={() => { if (confirm(`Видалити підключення ${conn.name}?`)) onDeleteBankConnection(conn.id); }} className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>


              
              {monobankClientInfos[conn.id] && !monobankClientInfos[conn.id].error && (
                <div className="relative z-10 space-y-6">
                  {monobankClientInfos[conn.id].accounts && monobankClientInfos[conn.id].accounts.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Рахунки Monobank</h5>
                      {monobankClientInfos[conn.id].accounts.map((ba: any) => {
                        const linkedAppAcc = accounts.find(a => a.bankAccountId === ba.id);
                        return (
                          <div key={ba.id} className="flex items-center justify-between p-3 bg-zinc-50/50 dark:bg-white/5 rounded-2xl border border-zinc-100/50 dark:border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 flex items-center justify-center text-sm">
                                {ba.type === 'platinum' ? '💎' : ba.type === 'white' ? '⚪' : '⚫'}
                              </div>
                              <div>
                                <div className="text-[9px] font-black uppercase text-zinc-900 dark:text-zinc-100">{ba.id.slice(0, 8)}...</div>
                                <div className="text-[10px] font-bold text-zinc-500">{formatUah(ba.balance / 100)}</div>
                              </div>
                            </div>
                            {!linkedAppAcc && (
                              <select
                                className="text-[9px] font-black px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:ring-2 ring-blue-500 uppercase tracking-tight"
                                onChange={(e) => handleLinkAccount(ba.id, e.target.value, conn.id)}
                                defaultValue=""
                              >
                                <option value="" disabled>Link...</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            )}
                            {linkedAppAcc && (
                              <div className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter opacity-60">Linked: {linkedAppAcc.name}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {monobankClientInfos[conn.id].jars && monobankClientInfos[conn.id].jars.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-[9px] font-black text-amber-500/80 uppercase tracking-widest px-1">Банки Monobank</h5>
                      {monobankClientInfos[conn.id].jars.map((jar: any) => {
                        const linkedJarAcc = accounts.find(a => a.bankAccountId === jar.id);
                        return (
                          <div key={jar.id} className="flex items-center justify-between p-3 bg-amber-500/[0.03] rounded-2xl border border-amber-500/10">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-sm">🏺</div>
                              <div className="max-w-[100px]">
                                <div className="text-[9px] font-black uppercase text-zinc-900 dark:text-zinc-100 truncate">{jar.title}</div>
                                <div className="text-[10px] font-bold text-amber-600">{formatUah(jar.balance / 100)}</div>
                              </div>
                            </div>
                            {!linkedJarAcc && (
                              <select
                                className="text-[9px] font-black px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-900 bg-white dark:bg-zinc-900 outline-none focus:ring-2 ring-amber-500 uppercase tracking-tight"
                                onChange={(e) => handleLinkAccount(jar.id, e.target.value, conn.id)}
                                defaultValue=""
                              >
                                <option value="" disabled>Link jar...</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            )}
                            {linkedJarAcc && (
                              <div className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter opacity-60">Linked</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
            </div>
          ))}
          
          {bankConnections.length === 0 && !showBankForm && (
            <div className="md:col-span-2 text-center py-16 bg-zinc-50 dark:bg-zinc-900/20 rounded-[32px] border-2 border-dashed border-zinc-100 dark:border-zinc-800/50">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
              </div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Немає підключених банків</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
