import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  Plus, 
  Minus, 
  Coins, 
  Trash2, 
  TrendingUp, 
  PieChart, 
  Activity, 
  History as HistoryIcon,
  Target,
  Calendar,
  X,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from 'lucide-react';
import MonthlyReportView from './MonthlyReportView';
import { motion, AnimatePresence } from 'motion/react';
import { Currency, PortfolioAsset } from '../../../../types';
import { commonChartOptions } from '../../../../constants/charts';
import { fmt, fmtUsd } from '../../../../utils/format';
import LocalNumberInput from '../../../ui/LocalNumberInput';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BitbonPortfolioViewProps {
  portfolio: any;
  bCur: Currency;
  bUsdRate: number;
  livePrice: number;
  distributionData?: any;
  assets: PortfolioAsset[];
  onAddTx: (type: 'buy' | 'sell' | 'income' | 'transfer', data: any) => void;
  onDeleteTx: (id: string) => void;
  onAddAsset: (asset: Omit<PortfolioAsset, 'id' | 'updatedAt'>) => void;
  onDeleteAsset: (id: string) => void;
  onConfirmDeleteAsset?: (id: string) => void;
  onConfirmDeleteTx?: (id: string) => void;
  availableBalanceUsd?: number;
}
const BitbonPortfolioView: React.FC<BitbonPortfolioViewProps> = ({
  portfolio,
  bCur,
  bUsdRate,
  livePrice,
  distributionData,
  assets,
  onAddTx,
  onDeleteTx,
  onAddAsset,
  onDeleteAsset,
  onConfirmDeleteAsset,
  onConfirmDeleteTx,
  availableBalanceUsd
}) => {
  const chartIdSuffix = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'analysis' | 'distribution' | 'history' | 'reports'>('overview');
  const [showTxForm, setShowTxForm] = useState<'buy' | 'sell' | 'income' | 'transfer' | null>(null);
  const [showAddAssetForm, setShowAddAssetForm] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  
  // Стан форми
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txAmount, setTxAmount] = useState(100);
  const [txTokens, setTxTokens] = useState(10);
  const [txPrice, setTxPrice] = useState(livePrice);
  const [txUsdRate, setTxUsdRate] = useState(bUsdRate);
  const [txSource, setTxSource] = useState('');
  const [txError, setTxError] = useState<string | null>(null);
  const [txAssetId, setTxAssetId] = useState<string>('');
  const [txFromAssetId, setTxFromAssetId] = useState<string>('');
  const [txToAssetId, setTxToAssetId] = useState<string>('');
  const [txNote, setTxNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Стан аналізу
  const [annualGrowthRate, setAnnualGrowthRate] = useState(5.5); 

  const syncAmountToTokens = (amt: number, price: number, rate: number) => {
    const amtUsd = bCur === 'USD' ? amt : amt / rate;
    setTxTokens(price > 0 ? amtUsd / price : 0);
  };

  const syncTokensToAmount = (tokens: number, price: number, rate: number) => {
    const amtUsd = tokens * price;
    setTxAmount(bCur === 'USD' ? amtUsd : amtUsd * rate);
  };

  const handleAmountChange = (val: number) => {
    setTxAmount(val);
    syncAmountToTokens(val, txPrice, txUsdRate);
  };

  const handleTokensChange = (val: number) => {
    setTxTokens(val);
    syncTokensToAmount(val, txPrice, txUsdRate);
  };

  const handleSaveTx = async () => {
    if (showTxForm === 'transfer') {
      if (!txFromAssetId || !txToAssetId || txTokens <= 0) {
        setTxError('Заповніть усі поля переказу');
        return;
      }
      if (txFromAssetId === txToAssetId) {
        setTxError('Рахунки повинні бути різними');
        return;
      }
      setIsSaving(true);
      try {
        await onAddTx('transfer', {
          date: txDate,
          tokens: txTokens,
          fromAssetId: txFromAssetId,
          toAssetId: txToAssetId,
          portfolioId: portfolio.id,
          note: txNote,
          amountUsd: 0,
          priceUsd: livePrice
        });
        
        setShowTxForm(null);
        setTxError(null);
        setTxNote('');
      } catch (err: any) {
        setTxError(err.message || 'Помилка при збереженні переказу');
      } finally {
        setIsSaving(false);
      }
    } else {
      if (!txAssetId || txTokens <= 0) {
        setTxError('Виберіть категорію та введіть кількість');
        return;
      }
      
      if (txPrice > 10) {
        setTxError('Ціна виглядає занадто високою (> $10). Перевірте дані.');
        return;
      }
      
      if (txAmount > 1000000) {
        setTxError('Сума занадто велика. Перевірте дані.');
        return;
      }

      const amountUsd = bCur === 'USD' ? txAmount : txAmount / txUsdRate;

      setIsSaving(true);
      try {
        await onAddTx(showTxForm!, {
          portfolioId: portfolio.id,
          assetId: txAssetId,
          symbol: 'ERBB',
          date: txDate,
          amountUsd,
          tokens: txTokens,
          priceUsd: txPrice,
          usdRate: txUsdRate,
          source: txSource,
          note: txNote
        });

        setShowTxForm(null);
        setTxError(null);
        setTxNote('');
      } catch (err: any) {
        setTxError(err.message || 'Помилка при збереженні операції');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddAsset = () => {
    if (!newAssetName.trim()) return;
    onAddAsset({
      portfolioId: portfolio.id,
      name: newAssetName.trim(),
      symbol: 'ERBB',
      amount: 0,
      averagePrice: 0.45,
      currentPrice: livePrice
    });
    setNewAssetName('');
    setShowAddAssetForm(false);
  };

  // Дані розподілу
  const distribution = useMemo(() => {
    if (!assets) return [];
    return assets.map(a => ({
      id: a.id,
      name: a.name,
      value: a.amount,
      color: a.name.toLowerCase().includes('provid') ? '#4f46e5' : 
             a.name.toLowerCase().includes('genesis') ? '#10b981' : 
             a.name.toLowerCase().includes('sale') ? '#ec4899' : '#f59e0b'
    }));
  }, [assets]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Під-навігація */}
      <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-2xl border border-zinc-200/50 dark:border-white/5 w-full overflow-x-auto no-scrollbar">
        <div className="flex min-w-max">
          {[
            { id: 'overview', label: 'Огляд', icon: Activity },
            { id: 'distribution', label: 'Розподіл', icon: PieChart },
            { id: 'history', label: 'Історія', icon: HistoryIcon },
            { id: 'reports', label: 'Звіти', icon: FileText },
            { id: 'analysis', label: 'Аналіз (20р)', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${
                activeSubTab === tab.id 
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xl' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-8 rounded-[32px] border border-zinc-200/50 dark:border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Портфель Bitbon</span>
                    </div>
                    <div className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-1">
                      {fmt(bCur === 'USD' ? (portfolio?.valueUsd || 0) : (portfolio?.valueUah || 0), bCur)}
                    </div>
                    <div className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <Target className="w-3 h-3" /> {(portfolio?.tokens || 0).toFixed(4)} ERBB
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { 
                        setShowTxForm('buy'); setTxAmount(100); setTxPrice(livePrice); setTxUsdRate(bUsdRate); setTxError(null);
                        setTxAssetId(assets.find(a => a.name.toLowerCase().includes('provid'))?.id || assets[0]?.id || '');
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-lg"
                    >
                      <Plus className="w-3.5 h-3.5" /> Купити
                    </button>
                    <button
                      onClick={() => { 
                        setShowTxForm('sell'); setTxAmount(100); setTxPrice(livePrice); setTxUsdRate(bUsdRate); setTxError(null); 
                        setTxAssetId(assets.find(a => a.name.toLowerCase().includes('sale'))?.id || assets[0]?.id || '');
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" /> Продати
                    </button>
                    <button
                      onClick={() => { 
                        setShowTxForm('income'); setTxTokens(10); setTxPrice(livePrice); setTxSource(''); setTxError(null);
                        setTxAssetId(assets.find(a => a.name.toLowerCase().includes('provid'))?.id || assets[0]?.id || '');
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Coins className="w-3.5 h-3.5" /> Дохід
                    </button>
                    <button
                      onClick={() => { 
                        setShowTxForm('transfer'); setTxTokens(10); setTxPrice(livePrice); setTxError(null);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-500/20"
                    >
                      <Activity className="w-3.5 h-3.5 rotate-90" /> Переказ
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-10 pt-8 border-t border-zinc-200/50 dark:border-white/5 relative z-10">
                  <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-2xl md:bg-transparent md:p-0 md:rounded-none">
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Актуальна ціна</div>
                    <div className="text-lg font-black text-zinc-900 dark:text-white">{fmtUsd(livePrice)}</div>
                  </div>
                  <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-2xl md:bg-transparent md:p-0 md:rounded-none">
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Загальна інвестиція</div>
                    <div className="text-lg font-black text-zinc-900 dark:text-white">{fmt(bCur === 'USD' ? portfolio.investedUsd : portfolio.investedUah, bCur)}</div>
                  </div>
                  <div className={`p-4 rounded-2xl md:p-4 transition-colors ${portfolio.avgPriceUsd > 10 ? 'bg-red-500/10 border border-red-500/20' : 'bg-zinc-50/50 dark:bg-zinc-800/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                       <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Сер. ціна купівлі</div>
                       {portfolio.avgPriceUsd > 10 && (
                         <div className="text-[8px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter animate-pulse">Помилка в даних?</div>
                       )}
                    </div>
                    <div className={`text-lg font-black ${portfolio.avgPriceUsd > 10 ? 'text-red-500' : 'text-zinc-900 dark:text-white'}`}>
                      {fmtUsd(portfolio.avgPriceUsd)}
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-2xl md:bg-transparent md:p-0 md:rounded-none">
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Прибуток</div>
                    <div className={`text-lg font-black ${portfolio.profitUsd >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {portfolio.profitUsd >= 0 ? '+' : ''}{fmt(bCur === 'USD' ? portfolio.profitUsd : portfolio.profitUah, bCur)}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {showTxForm && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowTxForm(null)}
                        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200 dark:border-white/5 shadow-2xl overflow-y-auto max-h-[90vh]"
                      >
                        <div className="max-w-md mx-auto min-h-full flex flex-col justify-center py-10 md:py-0">
                          <div className="flex justify-between items-center mb-6">
                             <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-100">
                               {showTxForm === 'buy' ? '🟢 Нова покупка' : showTxForm === 'sell' ? '🔴 Новий продаж' : showTxForm === 'transfer' ? '🔵 Переказ ERBB' : '🧬 Дохід ERBB'}
                             </h4>
                             <button onClick={() => setShowTxForm(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                               <X className="w-4 h-4 text-zinc-400" />
                             </button>
                          </div>

                          {availableBalanceUsd !== undefined && showTxForm === 'buy' && (
                            <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex justify-between items-center">
                              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Доступний потенціал</span>
                              <span className="text-sm font-black text-indigo-900 dark:text-indigo-100">{fmtUsd(availableBalanceUsd)}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 mb-8">
                            {showTxForm === 'transfer' ? (
                              <>
                                <div className="col-span-2">
                                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Звідки (Джерело)</label>
                                  <select 
                                    value={txFromAssetId}
                                    onChange={e => setTxFromAssetId(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3 text-sm font-black focus:ring-2 ring-blue-500/20 outline-none"
                                  >
                                    <option value="">Виберіть блок...</option>
                                    {(assets || []).map(a => (
                                      <option key={a.id} value={a.id}>{a.name} ({a.amount.toFixed(2)})</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Куди (Отримувач)</label>
                                  <select 
                                    value={txToAssetId}
                                    onChange={e => setTxToAssetId(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3 text-sm font-black focus:ring-2 ring-blue-500/20 outline-none"
                                  >
                                    <option value="">Виберіть блок...</option>
                                    {(assets || []).map(a => (
                                      <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className={showTxForm === 'income' ? 'col-span-2' : ''}>
                                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Категорія (Актив)</label>
                                  <select 
                                    value={txAssetId}
                                    onChange={(e) => setTxAssetId(e.target.value)}
                                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3 text-sm font-black focus:ring-2 ring-indigo-500/20 outline-none"
                                  >
                                    {(assets || []).map(a => (
                                      <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className={showTxForm === 'income' ? 'col-span-2' : ''}>
                                   <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Дата</label>
                                   <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3 text-sm font-black" />
                                </div>
                              </>
                            )}

                            <div className="col-span-2">
                               <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Кількість ERBB</label>
                               <div className="relative">
                                 <LocalNumberInput value={txTokens} onChange={handleTokensChange} className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-xl font-black focus:ring-2 ring-indigo-500/20" />
                                 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400 uppercase tracking-widest">Token</div>
                               </div>
                            </div>

                            {(showTxForm === 'buy' || showTxForm === 'sell') && (
                              <div className="col-span-2">
                                 <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Сума ({bCur})</label>
                                 <div className="relative">
                                   <LocalNumberInput value={txAmount} onChange={handleAmountChange} className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-lg font-black focus:ring-2 ring-indigo-500/20" />
                                   <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400 uppercase tracking-widest">{bCur}</div>
                                 </div>
                              </div>
                            )}

                            {showTxForm === 'income' && (
                              <div className="col-span-2">
                                 <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Джерело доходу</label>
                                 <input type="text" value={txSource} onChange={e => setTxSource(e.target.value)} placeholder="Наприклад: Майнінг, Реферальні" className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-4 py-3 text-sm font-black" />
                              </div>
                            )}

                            <div className="col-span-2">
                               <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Примітка</label>
                               <input type="text" value={txNote} onChange={e => setTxNote(e.target.value)} placeholder="Коментар до операції..." className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-sm font-black focus:ring-2 ring-indigo-500/20" />
                            </div>
                          </div>

                          {txError && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] font-bold text-red-500 text-center animate-in fade-in zoom-in-95">
                              {txError}
                            </div>
                          )}

                          <div className="flex gap-4">
                            <button 
                              onClick={() => setShowTxForm(null)} 
                              disabled={isSaving}
                              className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                            >
                              Скасувати
                            </button>
                            <button 
                              onClick={handleSaveTx} 
                              disabled={isSaving}
                              className="flex-1 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                            >
                              {isSaving ? 'Збереження...' : 'Зберегти'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>,
                    document.body
                  )}
                </AnimatePresence>
              </div>

              <div className="bg-white/40 dark:bg-zinc-900/40 p-8 rounded-[32px] border border-zinc-200/50 dark:border-white/5 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <HistoryIcon className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Розвиток портфеля</h4>
                  </div>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                     <button className="px-3 py-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">6 МІС</button>
                     <button className="px-3 py-1 text-[10px] font-black text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">1 РІК</button>
                  </div>
                </div>
                <div className="h-[280px] w-full relative">
                  <Line
                    id={`bitbon-portfolio-overview-${chartIdSuffix}`}
                    key={`bitbon-portfolio-overview-${chartIdSuffix}`}
                    data={{
                      labels: portfolio.chartLabels,
                      datasets: [
                        {
                          label: 'Вартість',
                          data: (portfolio?.chartTokens || []).map((v: number) => bCur === 'USD' ? v : v * bUsdRate),
                          borderColor: '#4f46e5',
                          backgroundColor: 'rgba(79,70,229,0.1)',
                          fill: true,
                          tension: 0.4,
                          pointRadius: 0,
                          borderWidth: 3
                        }
                      ]
                    }}
                    options={{
                      ...commonChartOptions,
                      maintainAspectRatio: false,
                      plugins: {
                        ...commonChartOptions.plugins,
                        legend: { display: false }
                      }
                    }}
                  />
                </div>
                </div>
              </div>

              <div className="space-y-6">
              <div className="bg-white/60 dark:bg-zinc-900/60 p-6 rounded-[32px] border border-zinc-200/50 dark:border-white/5 shadow-xl">
                 <div className="flex items-center gap-3 mb-6">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Статистика</h4>
                 </div>
                 <div className="space-y-4">
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-white/5">
                       <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Реалізований прибуток</div>
                       <div className="text-xl font-black text-zinc-900 dark:text-white">{fmt(portfolio.totalSoldUsd * (bCur === 'USD' ? 1 : bUsdRate), bCur)}</div>
                    </div>
                    <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-white/5">
                       <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Токени отримано (Дохід)</div>
                       <div className="text-xl font-black text-indigo-500">{portfolio.totalIncomeTokens?.toFixed(2) || '0.00'} ERBB</div>
                    </div>
                 </div>
              </div>

              <div className="bg-white/60 dark:bg-zinc-900/60 p-6 rounded-[32px] border border-zinc-200/50 dark:border-white/5 shadow-xl">
                 <div className="flex items-center gap-3 mb-6">
                    <PieChart className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Розподіл</h4>
                 </div>
                 <div className="h-[200px] mb-6">
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400 italic">Дивіться вкладку Розподіл</div>
                 </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Вкладка Розподілу */}
        {activeSubTab === 'distribution' && (
          <motion.div
            key="distribution"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8 pt-4"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-600">
                    <PieChart className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Блоки Активів</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Детальна структура порфеля Bitbon</p>
                  </div>
               </div>
               <button 
                 onClick={() => setShowAddAssetForm(true)}
                 className="w-full md:w-auto px-8 py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
               >
                 <Plus className="w-4 h-4" /> Додати Новий Блок
               </button>
            </div>

            {showAddAssetForm && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-3xl rounded-[40px] border border-indigo-500/20 shadow-2xl mb-8"
              >
                <div className="flex justify-between items-center mb-6">
                   <h4 className="text-sm font-black uppercase tracking-widest text-indigo-600">Назва нового блоку</h4>
                   <button onClick={() => setShowAddAssetForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                     <X className="w-5 h-5 text-zinc-400" />
                   </button>
                </div>
                <div className="flex gap-4">
                  <input 
                    type="text"
                    value={newAssetName}
                    onChange={e => setNewAssetName(e.target.value)}
                    placeholder="Наприклад: Провайдинг 2 або Холодне Сховище"
                    className="flex-1 px-6 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none outline-none focus:ring-2 ring-indigo-500/20 font-black text-sm"
                  />
                  <button 
                    onClick={handleAddAsset}
                    className="px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg"
                  >
                    Створити
                  </button>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {(distribution || []).map((d, i) => (
                   <motion.div 
                     layout
                     key={i} 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className="relative overflow-hidden p-8 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-3xl rounded-[40px] border border-zinc-200/50 dark:border-white/5 transition-all hover:shadow-2xl hover:-translate-y-2 group"
                   >
                     <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
                        <PieChart className="w-32 h-32 rotate-12" />
                     </div>
                     
                     <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                           <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: d.color || '#4f46e5' }}>
                              {d.name.toLowerCase().includes('provid') ? <TrendingUp className="w-6 h-6" /> : 
                               d.name.toLowerCase().includes('genesis') ? <Calendar className="w-6 h-6" /> : 
                               d.name.toLowerCase().includes('sale') ? <Target className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                           </div>
                           <div>
                              <div className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight leading-none mb-1">{d.name}</div>
                              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Системний блок</div>
                           </div>
                        </div>
                        
                        {assets.some(a => a.id === d.id) && (
                          <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               if (onConfirmDeleteAsset) onConfirmDeleteAsset(d.id!);
                             }}
                             className="w-12 h-12 rounded-full flex items-center justify-center text-red-500 bg-white dark:bg-zinc-800 shadow-xl shadow-red-500/10 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-90 border border-zinc-100 dark:border-white/5 relative z-20"
                             title="Видалити блок"
                          >
                             <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                     </div>

                     <div className="space-y-6">
                        <div className="flex items-end justify-between">
                           <div>
                              <div className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none mb-1">{d.value.toFixed(2)}</div>
                              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Доступно ERBB</div>
                           </div>
                           <div className="text-right">
                              <div className="text-lg font-black text-zinc-800 dark:text-zinc-200 tracking-tight">{fmtUsd(d.value * livePrice)}</div>
                              <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Ринкова Оцінка</div>
                           </div>
                        </div>
                        
                        <div className="space-y-2">
                           <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${Math.min(100, (d.value / (portfolio.tokens || 1)) * 100)}%` }}
                                 className="h-full rounded-full"
                                 style={{ backgroundColor: d.color || '#4f46e5' }}
                              />
                           </div>
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-zinc-400">{((d.value / (portfolio.tokens || 1)) * 100).toFixed(1)}% ПОРТФЕЛЯ</span>
                              <span className="text-indigo-500">ACTIVE</span>
                           </div>
                        </div>
                     </div>
                   </motion.div>
                 ))}
                </div>
          </motion.div>
        )}

        {/* Вкладка Історії */}
        {activeSubTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 pt-4"
          >
            <div className="bg-white/60 dark:bg-zinc-900/60 p-10 rounded-[48px] border border-zinc-200/50 dark:border-white/5 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                  <HistoryIcon className="w-32 h-32 rotate-12" />
               </div>
               
               <div className="flex items-center gap-6 mb-12 relative z-10">
                  <div className="w-16 h-16 rounded-[24px] bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/20">
                    <HistoryIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Історія Операцій</h3>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Повний хронологічний аудит вашого портфеля</p>
                  </div>
               </div>

               <div className="space-y-4 relative z-10">
                  <div className="absolute left-[39px] top-10 bottom-10 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block" />
                  
                  {(!portfolio?.sorted || portfolio.sorted.length === 0) ? (
                    <div className="py-24 text-center">
                       <HistoryIcon className="w-16 h-16 text-zinc-100 dark:text-zinc-800 mx-auto mb-4" />
                       <div className="text-zinc-400 italic text-sm font-medium">Транзакцій не знайдено</div>
                    </div>
                  ) : (
                    [...(portfolio?.sorted || [])].reverse().map((tx: any, idx: number) => {
                      const asset = assets.find(a => a.id === tx.assetId);
                      const fromAsset = assets.find(a => a.id === tx.fromAssetId);
                      const toAsset = assets.find(a => a.id === tx.toAssetId);
                      
                      const typeStyles = {
                        buy: { bg: 'bg-indigo-600', icon: Plus, color: 'text-indigo-600', label: 'Покупка' },
                        sell: { bg: 'bg-zinc-900 dark:bg-white', icon: Minus, color: 'text-zinc-900 dark:text-white', label: 'Продаж' },
                        income: { bg: 'bg-emerald-500', icon: Coins, color: 'text-emerald-500', label: 'Дохід' },
                        transfer: { bg: 'bg-blue-600', icon: Activity, color: 'text-blue-600', label: 'Переказ' },
                      };
                      const style = typeStyles[tx.type as keyof typeof typeStyles] || typeStyles.buy;

                      return (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          key={tx.id || idx} 
                          className="relative flex flex-col md:flex-row items-center gap-6 p-6 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-[32px] border border-zinc-100/50 dark:border-white/5 hover:border-indigo-500/30 transition-all group"
                        >
                          <div className="relative z-10 shrink-0">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${style.bg} shadow-xl shadow-current/20 border-4 border-white dark:border-zinc-900`}>
                              <style.icon className={`w-6 h-6 ${tx.type === 'sell' ? 'text-white dark:text-zinc-900' : 'text-white'}`} />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 pt-2">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 ${style.color} border border-current/10`}>
                                {style.label}
                              </span>
                              <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{tx.date}</span>
                              {tx.time && <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest opacity-50">• {tx.time}</span>}
                            </div>
                            
                            <h4 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter truncate leading-none">
                              {tx.type === 'transfer' 
                                ? <span className="flex items-center gap-2">{fromAsset?.name} <ArrowUpRight className="w-4 h-4 opacity-30" /> {toAsset?.name}</span>
                                : asset?.name || 'Загальна категорія'}
                            </h4>
                            
                            {tx.note && (
                              <p className="text-xs font-bold text-zinc-400 mt-2 italic truncate opacity-80">
                                {tx.note}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-8 w-full md:w-auto mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-white/5">
                            <div className="text-left md:text-right flex-1 md:flex-none">
                              <div className={`text-3xl font-black tracking-tighter leading-none mb-1 ${
                                tx.type === 'buy' || tx.type === 'income' ? 'text-emerald-500' : 
                                tx.type === 'sell' ? 'text-red-500' : 'text-blue-500'
                              }`}>
                                {tx.type === 'buy' || tx.type === 'income' ? '+' : tx.type === 'sell' ? '-' : ''} 
                                {tx.tokens.toFixed(4)} <span className="text-[12px] uppercase font-black opacity-40">ERBB</span>
                              </div>
                              {tx.amountUsd > 0 && (
                                <div className="text-[11px] font-black text-zinc-400 uppercase tracking-widest opacity-60">
                                  ≈ {fmtUsd(tx.amountUsd)}
                                </div>
                              )}
                            </div>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onConfirmDeleteTx) onConfirmDeleteTx(tx.id);
                              }}
                              className="w-14 h-14 rounded-full flex items-center justify-center text-red-500 bg-white dark:bg-zinc-800 shadow-xl shadow-red-500/10 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-90 border border-zinc-100 dark:border-white/5 relative z-20"
                              title="Видалити транзакцію"
                            >
                              <Trash2 className="w-6 h-6" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8 pt-4"
          >
             <div className="bg-white/60 dark:bg-zinc-900/60 p-8 rounded-[32px] border border-zinc-200/50 dark:border-white/5 shadow-xl">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                 <div>
                   <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Прогноз росту (20 років)</h3>
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Комбінований інтерес та стратегія реінвестування</p>
                 </div>
                 <div className="flex items-center gap-6 bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-2xl w-full md:w-auto">
                   <div className="shrink-0 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Growth %</div>
                   <input 
                      type="range" 
                      min="1" max="50" step="0.5" 
                      value={annualGrowthRate} 
                      onChange={e => setAnnualGrowthRate(parseFloat(e.target.value))}
                      className="accent-indigo-500 flex-1 md:w-32"
                   />
                   <div className="w-12 text-center text-sm font-black text-indigo-500">{annualGrowthRate}%</div>
                 </div>
               </div>

               <div className="h-[400px]">
                 <Line 
                   id="projection-chart"
                   data={{
                     labels: Array.from({length: 21}, (_, i) => `${new Date().getFullYear() + i}`),
                     datasets: [
                       {
                         label: 'Оптимістичний прогноз',
                         data: Array.from({length: 21}, (_, i) => (portfolio.tokens || 0) * livePrice * Math.pow(1 + annualGrowthRate / 100, i)),
                         borderColor: '#4f46e5',
                         backgroundColor: 'rgba(79,70,229,0.1)',
                         fill: true,
                         tension: 0.4,
                         pointRadius: 4,
                         pointHoverRadius: 6,
                         borderWidth: 4
                       }
                     ]
                   }}
                   options={{
                     ...commonChartOptions,
                     maintainAspectRatio: false,
                     scales: {
                       y: {
                         ticks: {
                           callback: (val: any) => fmt(val, bCur)
                         }
                       }
                     }
                   }}
                 />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                  <div className="p-6 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-white/5">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Через 5 років</div>
                    <div className="text-2xl font-black text-zinc-900 dark:text-white">
                      {fmt((portfolio.tokens || 0) * livePrice * Math.pow(1 + annualGrowthRate/100, 5), bCur)}
                    </div>
                  </div>
                  <div className="p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Через 10 років</div>
                    <div className="text-2xl font-black text-indigo-500">
                      {fmt((portfolio.tokens || 0) * livePrice * Math.pow(1 + annualGrowthRate/100, 10), bCur)}
                    </div>
                  </div>
                  <div className="p-6 bg-zinc-900 text-white rounded-2xl border border-white/5 shadow-2xl">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Через 20 років</div>
                    <div className="text-2xl font-black text-white">
                      {fmt((portfolio.tokens || 0) * livePrice * Math.pow(1 + annualGrowthRate/100, 20), bCur)}
                    </div>
                  </div>
               </div>
             </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default BitbonPortfolioView;
