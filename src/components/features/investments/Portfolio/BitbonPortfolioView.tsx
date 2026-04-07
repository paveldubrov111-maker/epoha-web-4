import React, { useState, useMemo } from 'react';
import { 
  Line, 
  Doughnut 
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);
import { 
  Plus, 
  Search, 
  Trash2, 
  RefreshCw, 
  Info, 
  TrendingUp, 
  ChevronRight, 
  ExternalLink, 
  AlertCircle,
  DownloadCloud,
  Minus, 
  Coins, 
  PieChart, 
  Activity, 
  History as HistoryIcon,
  Target,
  X,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Wallet,
  Check,
  Edit2
} from 'lucide-react';
import MonthlyReportView from './MonthlyReportView';
import { motion, AnimatePresence } from 'motion/react';
import { Currency, PortfolioAsset } from '../../../../types';

import { commonChartOptions } from '../../../../constants/charts';
import { formatGlobal } from '../../../../utils/format';
import LocalNumberInput from '../../../ui/LocalNumberInput';

interface BitbonPortfolioViewProps {
  portfolio: any;
  bCur: Currency;
  bUsdRate: number;
  livePrice: number;
  assets: PortfolioAsset[];
  onAddTx: (type: 'buy' | 'sell' | 'income' | 'transfer', data: any) => void;
  onAddAsset: (asset: Omit<PortfolioAsset, 'id' | 'updatedAt'>) => void;
  onUpdateAsset?: (id: string, updates: any) => Promise<void>;
  onDeleteAsset?: (id: string) => Promise<void>;
  onDeleteTx: (id: string) => void;
  onConfirmDeleteAsset?: (id: string) => void;
  onConfirmDeleteTx?: (id: string) => void;
  language?: any;
  t?: (key: string) => string;
  isManualPriceMode: boolean;
  setIsManualPriceMode: (val: boolean) => void;
  manualPriceValue: number;
  setManualPriceValue: (val: number) => void;
  distributionData?: any;
  isLoadingPrice?: boolean;
  priceError?: boolean;
  fetchPrice?: () => void;
  exchangeRates?: Record<string, number>;
  accounts: any[];
  availableBalanceUsd?: number;
  availableBalanceUah?: number;
  connectedPotentialAccountId?: string | null;
  formatGlobal: (n: number, targetCur: Currency, rates: Record<string, number>, sourceCur?: Currency, maxDecimals?: number, compact?: boolean) => string;
  globalCurrency: Currency;
}

const BitbonPortfolioView: React.FC<BitbonPortfolioViewProps> = ({
  portfolio,
  bCur,
  bUsdRate,
  livePrice,
  assets,
  onAddTx,
  onAddAsset,
  onUpdateAsset,
  onDeleteTx,
  onConfirmDeleteAsset,
  onConfirmDeleteTx,
  language,
  t = (k: string) => k,
  isManualPriceMode,
  setIsManualPriceMode,
  manualPriceValue,
  setManualPriceValue,
  distributionData,
  isLoadingPrice,
  fetchPrice,
  accounts,
  availableBalanceUah,
  connectedPotentialAccountId,
  formatGlobal,
  globalCurrency,
  exchangeRates
}) => {
  const chartIdSuffix = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'analysis' | 'distribution' | 'history' | 'reports'>('overview');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState(manualPriceValue.toString());

  // Sync tempPrice with global manualPriceValue when not editing
  React.useEffect(() => {
    if (!isEditingPrice) {
      setTempPrice(manualPriceValue.toString());
    }
  }, [manualPriceValue, isEditingPrice]);

  const effectivePrice = isManualPriceMode ? manualPriceValue : (livePrice || 0);

  const monthlyIncomeTokens = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    return (portfolio?.transactions || [])
      .filter((tx: any) => tx.type === 'income' && tx.date.startsWith(currentMonth))
      .reduce((sum: number, tx: any) => sum + (tx.tokens || 0), 0);
  }, [portfolio?.transactions]);

  const [targetPrice20y, setTargetPrice20y] = useState<number>(effectivePrice > 0 ? effectivePrice * 5 : 2.0);
  const [addedMonthlyUsd, setAddedMonthlyUsd] = useState<number>(0);
  const [showTxForm, setShowTxForm] = useState<'buy' | 'sell' | 'income' | 'transfer' | null>(null);
  
  const [historyFilter, setHistoryFilter] = useState<'all' | 'income' | 'trade' | 'transfer'>('all');
  const [historyAssetFilter, setHistoryAssetFilter] = useState<string>('all');
  const [txError, setTxError] = useState<string | null>(null);

  const calculatedAssets = useMemo(() => {
    const palette = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#3b82f6', '#f97316'];
    
    return assets.map((asset, idx) => {
      let color = palette[idx % palette.length];
      const name = asset.name.toLowerCase();
      
      if (name.includes('genesis')) color = '#10b981'; // Emerald
      else if (name.includes('provid') || name.includes('майнінг')) color = '#4f46e5'; // Indigo
      else if (name.includes('wallet') || name.includes('гаманець')) color = '#f59e0b'; // Amber
      else if (name.includes('trade') || name.includes('трейдінг')) color = '#3b82f6'; // Blue
      else if (name.includes('sale') || name.includes('продаж')) color = '#ec4899'; // Rose
      else if (name.includes('erbb')) color = '#06b6d4'; // Cyan

      return {
        ...asset,
        amount: asset.amount || 0,
        color
      } as PortfolioAsset & { color: string };
    }).sort((a, b) => b.amount - a.amount);
  }, [assets]);

  const [showAddAssetForm, setShowAddAssetForm] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txAmount, setTxAmount] = useState(100);
  const [txTokens, setTxTokens] = useState(10);
  const [txPrice, setTxPrice] = useState(effectivePrice);
  const [txUsdRate, setTxUsdRate] = useState(bUsdRate);
  const [txSource, setTxSource] = useState('');
  const [txAssetId, setTxAssetId] = useState<string>('');
  const [txFromAssetId, setTxFromAssetId] = useState<string>('');
  const [txToAssetId, setTxToAssetId] = useState<string>('');
  const [txNote, setTxNote] = useState('');
  const [txBudgetAccountId, setTxBudgetAccountId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [chartRange, setChartRange] = useState<'6m' | '1y'>('6m');

  React.useEffect(() => {
    if (showTxForm === 'buy' || showTxForm === 'sell') {
      setTxPrice(effectivePrice);
      setTxUsdRate(bUsdRate);
      setTxDate(new Date().toISOString().split('T')[0]);
      syncTokensToAmount(txTokens, effectivePrice, bUsdRate);
    } else if (showTxForm === 'transfer' || showTxForm === 'income') {
      setTxDate(new Date().toISOString().split('T')[0]);
    }
  }, [showTxForm, effectivePrice, bUsdRate]);

  const filteredChartLabels = useMemo(() => {
    if (!portfolio?.chartLabels) return [];
    return chartRange === '6m' ? portfolio.chartLabels.slice(-180) : portfolio.chartLabels;
  }, [portfolio?.chartLabels, chartRange]);

  const filteredChartData = useMemo(() => {
    if (!portfolio?.chartTokens) return [];
    const baseData = chartRange === '6m' ? portfolio.chartTokens.slice(-180) : portfolio.chartTokens;
    return baseData.map((v: number) => formatGlobal(v, globalCurrency, exchangeRates, 'USD'));
  }, [portfolio?.chartTokens, chartRange, formatGlobal]);

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
    syncAmountToTokens(val, txPrice, bUsdRate);
  };

  const handleTokensChange = (val: number) => {
    setTxTokens(val);
    syncTokensToAmount(val, txPrice, bUsdRate);
  };

  const handleSaveTx = async () => {
    if (showTxForm === 'transfer') {
      if (!txFromAssetId || !txToAssetId || txTokens <= 0) {
        setTxError(t('fillTransferFields'));
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
          priceUsd: effectivePrice
        });
        setShowTxForm(null);
      } catch (err: any) {
        setTxError(err.message || 'Error');
      } finally {
        setIsSaving(false);
      }
    } else {
      if (!txAssetId || txTokens <= 0) {
        setTxError(t('selectCategoryAndAmount'));
        return;
      }
      const amountUsd = txTokens * txPrice;
      setIsSaving(true);
      try {
        await onAddTx(showTxForm!, {
          portfolioId: portfolio.id,
          assetId: txAssetId,
          symbol: 'BITBON',
          date: txDate,
          amountUsd,
          tokens: txTokens,
          priceUsd: txPrice,
          usdRate: txUsdRate,
          source: txSource,
          budgetAccountId: txBudgetAccountId,
          note: txNote
        });
        setShowTxForm(null);
      } catch (err: any) {
        setTxError(err.message || 'Error');
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
      symbol: 'BITBON',
      amount: 0,
      averagePrice: 0.45,
      currentPrice: effectivePrice,
      metadata: {}
    });
    setNewAssetName('');
    setShowAddAssetForm(false);
  };

  const distribution = useMemo(() => {
    return calculatedAssets.map(a => ({
      id: a.id,
      name: a.name,
      value: a.amount,
      color: a.color
    }));
  }, [calculatedAssets]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-zinc-100/50 dark:bg-zinc-800/50 p-1.5 rounded-[24px] border border-zinc-200/50 dark:border-white/5 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-1.5">
          {[
            { id: 'overview', label: t('overview'), icon: Activity },
            { id: 'distribution', label: t('distribution'), icon: PieChart },
            { id: 'history', label: t('history'), icon: HistoryIcon },
            { id: 'reports', label: t('reports'), icon: FileText },
            { id: 'analysis', label: t('analysis'), icon: Activity }
          ].map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                activeSubTab === tab.id 
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xl border border-zinc-200/50 dark:border-white/10' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-transparent'
              } ${idx >= 3 ? 'sm:col-span-1' : ''}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-8 rounded-[40px] border border-zinc-200/50 dark:border-white/5 shadow-2xl relative overflow-hidden group/hero">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[120px] rounded-full" />
                  <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[100px] rounded-full" />
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.8)]" />
                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{t('bitbonPortfolio')}</span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-1">
                      <div className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tighter drop-shadow-sm">
                        {formatGlobal(portfolio?.tokens * effectivePrice || 0, globalCurrency, exchangeRates, 'USD')}
                      </div>
                      
                      <div className="flex-shrink-0">
                        <div className="flex flex-row items-center gap-2 md:gap-3">
                          {/* Segmented Control / Toggle */}
                          <div className="bg-zinc-200/80 dark:bg-white/10 p-1 rounded-2xl border border-zinc-300 dark:border-white/10 flex items-center shadow-inner relative overflow-hidden">
                            <motion.div 
                              className="absolute bg-white dark:bg-zinc-700 shadow-md border border-zinc-200 dark:border-white/10"
                              initial={false}
                              animate={{ 
                                x: isManualPriceMode ? '101%' : '0%',
                                width: '48.5%'
                              }}
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              style={{ top: 4, bottom: 4, left: 4 }}
                            />
                            
                            <button 
                              onClick={() => setIsManualPriceMode(false)}
                              className={`relative z-10 px-3 md:px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${!isManualPriceMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                            >
                              Market
                            </button>
                            <button 
                              onClick={() => {
                                setIsManualPriceMode(true);
                                setIsEditingPrice(true);
                              }}
                              className={`relative z-10 px-3 md:px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${isManualPriceMode ? 'text-amber-600' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'}`}
                            >
                              Manual
                            </button>
                          </div>

                          {/* Manual Input Field - Only when in manual mode */}
                          <AnimatePresence mode="popLayout">
                            {isManualPriceMode && (
                              <motion.div
                                initial={{ opacity: 0, x: 10, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                                className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-1.5 pl-3 rounded-2xl shadow-xl border border-amber-500/30 group/pricein"
                              >
                                <span className="text-[10px] font-black text-amber-500">$</span>
                                <input 
                                  type="text"
                                  value={tempPrice}
                                  onChange={(e) => {
                                    setTempPrice(e.target.value);
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val)) setManualPriceValue(val);
                                  }}
                                  className="w-14 bg-transparent border-none outline-none text-sm font-black text-zinc-900 dark:text-white"
                                />
                                {tempPrice !== manualPriceValue.toString() && (
                                  <button 
                                    onClick={() => {
                                      const val = parseFloat(tempPrice);
                                      if (!isNaN(val)) setManualPriceValue(val);
                                    }}
                                    className="p-1.5 bg-amber-500 text-white rounded-lg shadow-lg hover:bg-amber-600 transition-colors"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Refresh Trigger for live mode */}
                          {!isManualPriceMode && (
                            <motion.button
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              whileHover={{ rotate: 180 }}
                              onClick={() => fetchPrice?.()}
                              className="p-2 mr-1 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500/20 shadow-sm"
                              title="Оновити ціну"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrice ? 'animate-spin' : ''}`} />
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-[10px] md:text-xs font-bold text-emerald-500 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 shadow-sm">
                        <Target className="w-3.5 h-3.5" /> {(portfolio?.tokens || 0).toFixed(4)} ERBB
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowTxForm('buy')} className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"><Plus className="w-3.5 h-3.5" /> {t('buyAction')}</button>
                    <button onClick={() => setShowTxForm('sell')} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all"><Minus className="w-3.5 h-3.5" /> {t('sellAction')}</button>
                    <button onClick={() => setShowTxForm('transfer')} className="flex items-center gap-2 px-5 py-2.5 bg-blue-500/10 text-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-blue-500/20 hover:bg-blue-500/20 transition-all"><ArrowLeftRight className="w-3.5 h-3.5" /> {t('transferAction') || 'Переказ'}</button>
                    <button onClick={() => setShowTxForm('income')} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg"><Coins className="w-3.5 h-3.5" /> {t('incomeAction')}</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-zinc-200/20 dark:border-white/5 relative z-10">
                   {[
                    { label: t('marketPrice'), value: formatGlobal(effectivePrice, globalCurrency, exchangeRates, 'USD'), icon: TrendingUp, color: 'text-indigo-500', isMarket: true },
                    { label: 'Дохід за місяць', value: `${monthlyIncomeTokens.toFixed(2)} ERBB`, icon: Coins, color: 'text-emerald-500', isIncome: true },
                    { label: t('totalInvestment'), value: formatGlobal(portfolio.investedUsd, globalCurrency, exchangeRates, 'USD'), icon: Wallet, color: 'text-zinc-500' },
                    { label: t('totalProfit'), value: formatGlobal(portfolio?.tokens * effectivePrice - portfolio.investedUsd, globalCurrency, exchangeRates, 'USD', 2), icon: Activity, color: (portfolio?.tokens * effectivePrice - portfolio.investedUsd) >= 0 ? 'text-emerald-500' : 'text-rose-500' }
                  ].map((stat, i) => (
                    <div key={i} className={`p-4 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm transition-all ${stat.isMarket ? (isManualPriceMode ? 'ring-2 ring-indigo-500/50 bg-indigo-50/30' : '') : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{stat.label}</div>
                        {stat.isMarket ? (
                           <TrendingUp className={`w-3 h-3 ${stat.color} opacity-60`} />
                         ) : (
                          <stat.icon className={`w-3 h-3 ${stat.color} opacity-60`} />
                        )}
                      </div>
                      <div className={`text-base font-black tracking-tight ${stat.color.includes('emerald') || stat.color.includes('rose') ? stat.color : 'text-zinc-900 dark:text-white'}`}>
                        {stat.value}
                        {stat.isIncome && (
                          <div className="text-[9px] font-bold text-zinc-400 opacity-60 mt-0.5 whitespace-nowrap">
                            ≈ {formatGlobal(monthlyIncomeTokens * effectivePrice, globalCurrency, exchangeRates, 'USD')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/60 dark:bg-zinc-900/60 p-8 rounded-[40px] border border-zinc-200/50 dark:border-white/5 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <HistoryIcon className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">{t('portfolioDevelopment')}</h4>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <Line 
                    data={{
                      labels: filteredChartLabels.map(l => {
                        const d = new Date(l);
                        if (isNaN(d.getTime())) return l;
                        return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
                      }),
                      datasets: [{
                        label: t('valueTitle'),
                        data: filteredChartData.map(v => isManualPriceMode ? (v / (livePrice || 1)) * manualPriceValue : v),
                        borderColor: '#4f46e5',
                        backgroundColor: (context) => {
                          const chart = context.chart;
                          const {ctx, chartArea} = chart;
                          if (!chartArea) return 'rgba(79, 70, 229, 0.1)';
                          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                          gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
                          gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
                          return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#4f46e5',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
                      }]
                    }}
                    options={{
                      ...commonChartOptions, 
                      maintainAspectRatio: false,
                      scales: {
                        ...commonChartOptions.scales,
                        x: {
                          ...commonChartOptions.scales?.x,
                          grid: { display: false },
                          ticks: {
                            ...commonChartOptions.scales?.x?.ticks,
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,
                            font: { size: 10, weight: 'bold' }
                          }
                        },
                        y: {
                          ...commonChartOptions.scales?.y,
                          grid: { color: 'rgba(255,255,255,0.05)' },
                          ticks: {
                            ...commonChartOptions.scales?.y?.ticks,
                            font: { size: 10 }
                          }
                        }
                      }
                    } as any}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/60 dark:bg-zinc-900/60 p-8 rounded-[32px] border border-zinc-200/50 dark:border-white/5 shadow-xl relative overflow-hidden">
                <Doughnut 
                  data={{
                    labels: distribution.map(d => d.name),
                    datasets: [{
                      data: distribution.map(d => d.value),
                      backgroundColor: distribution.map(d => d.color),
                      borderWidth: 0
                    }]
                  }}
                  options={{ cutout: '75%', plugins: { legend: { display: false } } }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('assetBlocks')}</div>
                  <div className="text-sm font-black text-zinc-900 dark:text-white tracking-tighter">{distribution.length}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 max-h-[250px] overflow-y-auto no-scrollbar pr-1 pt-2">
                {distribution.map((d, i) => (
                  <div key={i} className="flex flex-col p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/5 hover:bg-white dark:hover:bg-zinc-800 transition-all group">
                    <div className="flex items-center gap-2 mb-1.5">
                       <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: d.color }} />
                       <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tight group-hover:text-zinc-900 dark:group-hover:text-white transition-colors truncate">{d.name}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                       <span className="text-xs font-black text-zinc-900 dark:text-white">
                         {d.value.toLocaleString()} BB
                       </span>
                       <span className="text-[8px] font-bold text-zinc-400 opacity-60 ml-2">
                          ≈ {formatGlobal(d.value * effectivePrice, globalCurrency, exchangeRates, 'USD')}
                       </span>
                       <span className="text-[10px] font-black text-indigo-500">
                          {portfolio.tokens > 0 ? ((d.value / portfolio.tokens) * 100).toFixed(0) : 0}%
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeSubTab === 'distribution' && (
          <motion.div key="distribution" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">{t('assetBlocks')}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    if (confirm('Ви впевнені, що хочете очистити всі суми та історію? Блоки активів залишаться, але їх баланси стануть 0.')) {
                      setIsSaving(true);
                      try {
                        for (const tx of portfolio.sorted) {
                          await onDeleteTx(tx.id);
                        }
                        for (const a of assets) {
                          if (onUpdateAsset) {
                            await onUpdateAsset(a.id, { amount: 0 });
                          }
                        }
                      } finally {
                        setIsSaving(false);
                      }
                    }
                  }} 
                  disabled={isSaving} 
                  className="flex items-center gap-2 px-5 py-3.5 bg-zinc-100 dark:bg-white/5 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-200/50 dark:border-white/5 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all font-black"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} /> 
                  {isSaving ? 'Очищення...' : 'Скинути баланси'}
                </button>
                <button onClick={() => setShowAddAssetForm(true)} className="px-8 py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:bg-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest">
                  <Plus className="w-4 h-4 mr-2 inline" /> {t('addAsset')}
                </button>
              </div>
            </div>
            
            {showAddAssetForm && (
              <div className="bg-white/60 dark:bg-zinc-900/60 p-8 rounded-[40px] border border-zinc-200/50 dark:border-white/5 shadow-2xl space-y-4">
                <input type="text" value={newAssetName} onChange={e => setNewAssetName(e.target.value)} placeholder={t('portfolioName')} className="w-full px-6 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none font-black text-sm" />
                <button onClick={handleAddAsset} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest">{t('create')}</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {calculatedAssets.map(asset => (
                <div key={asset.id} className="relative bg-white dark:bg-zinc-900 p-8 rounded-[40px] shadow-xl border border-zinc-100 dark:border-white/5 hover:scale-[1.02] transition-all group">
                  <div className="flex items-center justify-between mb-8">
                     <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center" style={{ color: asset.color }}><Wallet className="w-7 h-7" /></div>
                     <button onClick={() => onConfirmDeleteAsset?.(asset.id)} className="w-10 h-10 rounded-full flex items-center justify-center text-red-500/30 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <h4 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{asset.name}</h4>
                  <div className="flex items-baseline gap-3 mt-1">
                    <div className="text-3xl font-black text-zinc-900 dark:text-white">{asset.amount.toFixed(2)} <span className="text-xs">ERBB</span></div>
                    <div className="text-sm font-bold text-indigo-500 opacity-60">
                      ≈ {formatGlobal(asset.amount * effectivePrice, globalCurrency, exchangeRates, globalCurrency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 pt-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-[32px] border border-zinc-200/50 dark:border-white/5">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                  {[
                    { id: 'all', label: 'Всі' },
                    { id: 'income', label: 'Винагороди' },
                    { id: 'trade', label: 'Торгівля' },
                    { id: 'transfer', label: 'Перекази' }
                  ].map(f => (
                    <button key={f.id} onClick={() => setHistoryFilter(f.id as any)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${historyFilter === f.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white dark:bg-zinc-800 text-zinc-400 border border-zinc-200/50 dark:border-white/5'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                   <button 
                     onClick={() => {
                        const seen = new Set();
                        const toDelete: string[] = [];
                        portfolio.sorted.forEach((tx: any) => {
                          const key = `${tx.date}-${tx.tokens}-${tx.assetId || ''}-${tx.fromAssetId || ''}-${tx.toAssetId || ''}-${tx.type}`;
                          if (seen.has(key)) {
                            toDelete.push(tx.id);
                          } else {
                            seen.add(key);
                          }
                        });
                        if (toDelete.length > 0 && confirm(`Видалити ${toDelete.length} дублікатів?`)) {
                           toDelete.forEach(id => onDeleteTx(id));
                        }
                     }}
                     className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all whitespace-nowrap"
                   >
                     <RefreshCw className="w-3 h-3" /> Очистити дублікати
                   </button>
                   <select value={historyAssetFilter} onChange={e => setHistoryAssetFilter(e.target.value)} className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-xl text-[10px) font-black uppercase tracking-widest outline-none border border-zinc-200/50 dark:border-white/5 flex-1 md:flex-none">
                     <option value="all">Всі блоки</option>
                     {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                   </select>
                </div>
            </div>
            <div className="space-y-4">
              {portfolio.sorted
                .filter((tx: any) => {
                  if (historyFilter === 'income') return tx.type === 'income';
                  if (historyFilter === 'trade') return ['buy', 'sell'].includes(tx.type);
                  if (historyFilter === 'transfer') return tx.type === 'transfer';
                  return true;
                })
                .filter((tx: any) => historyAssetFilter === 'all' || [tx.assetId, tx.fromAssetId, tx.toAssetId].includes(historyAssetFilter))
                .map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-4 p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-white/5 group hover:border-indigo-500/30 transition-all">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                    tx.type === 'income' ? 'bg-emerald-500 shadow-emerald-500/20' : 
                    tx.type === 'buy' ? 'bg-indigo-600 shadow-indigo-600/20' :
                    tx.type === 'sell' ? 'bg-rose-500 shadow-rose-500/20' :
                    'bg-blue-500 shadow-blue-500/20'
                  }`}>
                    {tx.type === 'income' ? <Coins className="w-5 h-5" /> : 
                     tx.type === 'buy' ? <Plus className="w-5 h-5" /> :
                     tx.type === 'sell' ? <Minus className="w-5 h-5" /> :
                     <ArrowLeftRight className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-zinc-400 uppercase mb-1">
                      {tx.date} • {t(tx.type + 'Action') || tx.type.toUpperCase()}
                    </div>
                    <div className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                      {tx.type === 'transfer' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400">{assets.find(a => a.id === tx.fromAssetId)?.name}</span>
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>{assets.find(a => a.id === tx.toAssetId)?.name}</span>
                        </div>
                      ) : (
                        assets.find(a => a.id === tx.assetId)?.name || 'Блокчейн'
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xl font-black ${
                      ['sell', 'transfer'].includes(tx.type) ? 'text-rose-500' : 'text-emerald-500'
                    }`}>
                      {tx.type === 'sell' || (tx.type === 'transfer' && tx.assetId === tx.fromAssetId) ? '-' : '+'}
                      {tx.tokens.toFixed(4)} <span className="text-xs">ERBB</span>
                    </div>
                    <div className="text-[10px] font-black text-zinc-400 opacity-60">≈ {formatGlobal((tx.amountUsd || tx.tokens * effectivePrice), globalCurrency, exchangeRates, 'USD')}</div>
                  </div>
                  <button onClick={() => onConfirmDeleteTx?.(tx.id)} className="w-10 h-10 rounded-full flex items-center justify-center text-red-500/30 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSubTab === 'analysis' && (
          <motion.div key="analysis" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 pt-4">
             <div className="bg-white/60 dark:bg-zinc-900/60 p-8 rounded-[40px] shadow-2xl border border-zinc-200/50 dark:border-white/5 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                   <div>
                     <h3 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter mb-2">{t('projection20y')}</h3>
                     <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest opacity-60">Моделювання капіталу при цільовій ціні</p>
                   </div>
                   <div className="flex gap-4">
                     <div className="flex flex-col gap-1 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-3xl border border-zinc-200/50 dark:border-white/5">
                       <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1 text-center">Цільова ціна $ (через 20р)</span>
                       <input type="number" value={targetPrice20y} onChange={e => setTargetPrice20y(parseFloat(e.target.value))} className="w-32 bg-transparent text-center font-black text-xl outline-none text-indigo-500" />
                     </div>
                   </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-3 h-[400px]">
                    <Line 
                      data={(() => {
                        const labels = Array.from({length: 21}, (_, i) => `${new Date().getFullYear() + i}`);
                        const points: number[] = [];
                        let curTokens = portfolio.tokens || 0;
                        let curPrice = effectivePrice;
                        const ratio = targetPrice20y / curPrice;
                        const yMult = Math.pow(ratio, 1/20);
                        for (let y = 0; y <= 20; y++) {
                          points.push(curTokens * curPrice * Math.pow(yMult, y));
                        }
                        return {
                          labels,
                          datasets: [{ 
                            label: t('capitalProjection') || 'Прогноз капіталу', 
                            data: points, 
                            borderColor: '#4f46e5', 
                            tension: 0.4, 
                            fill: true, 
                            borderWidth: 4,
                            pointRadius: 4,
                            pointBackgroundColor: '#4f46e5',
                            pointBorderColor: '#fff',
                            backgroundColor: (context: any) => {
                              const chart = context.chart;
                              const {ctx, chartArea} = chart;
                              if (!chartArea) return 'rgba(79, 70, 229, 0.05)';
                              const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                              gradient.addColorStop(0, 'rgba(79,70,229,0.2)');
                              gradient.addColorStop(1, 'rgba(79,70,229,0)');
                              return gradient;
                            }
                          }]
                        };
                      })()}
                      options={{ 
                        ...commonChartOptions, 
                        maintainAspectRatio: false,
                        scales: {
                          ...commonChartOptions.scales,
                          y: {
                            ...commonChartOptions.scales?.y,
                            ticks: {
                               callback: (v) => formatGlobal(v as number, globalCurrency, exchangeRates || {}, 'USD').replace('.00', ''),
                              font: { weight: 'bold' }
                            }
                          }
                        }
                      } as any}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Орієнтири (Milestones)</div>
                    {[50000, 100000, 250000, 500000, 1000000].map(goal => {
                      const curTokens = portfolio.tokens || 0;
                      const curPrice = effectivePrice;
                      const ratio = targetPrice20y / curPrice;
                      const yMult = Math.pow(ratio, 1/20);
                      
                      let yearReached = null;
                      for (let y = 0; y <= 20; y++) {
                        if (curTokens * curPrice * Math.pow(yMult, y) >= goal) {
                          yearReached = new Date().getFullYear() + y;
                          break;
                        }
                      }
                      
                      return (
                        <div key={goal} className={`p-4 rounded-2xl border ${yearReached ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-zinc-100/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-white/5 opacity-40'}`}>
                          <div className="text-[8px] font-black text-zinc-400 uppercase mb-1">Ціль {formatGlobal(goal, globalCurrency, exchangeRates || {}, 'USD').replace('.00', '')}</div>
                          <div className="text-sm font-black text-zinc-900 dark:text-white">{yearReached ? `Рік достиження: ${yearReached}` : 'Потрібно більше часу або вища ціна'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
             </div>
          </motion.div>
        )}

        {activeSubTab === 'reports' && (
          <motion.div key="reports" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
             <MonthlyReportView 
            assets={assets}
            transactions={portfolio.transactions}
            bCur={bCur}
            usdRate={bUsdRate}
            language={language}
            t={t}
            formatGlobal={formatGlobal}
            globalCurrency={globalCurrency}
            exchangeRates={exchangeRates || {}}
          />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTxForm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTxForm(null)} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-zinc-800 p-8 rounded-[40px] shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                 <h4 className="text-sm font-black uppercase tracking-widest">
                   {showTxForm === 'buy' ? 'Купити' : 
                    showTxForm === 'sell' ? 'Продати' : 
                    showTxForm === 'transfer' ? 'Переказ' : 'Винагорода'}
                 </h4>
                 <button onClick={() => setShowTxForm(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
               </div>
               <div className="space-y-4">
                  {showTxForm === 'transfer' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-zinc-400 uppercase ml-2">Звідки</label>
                          <select value={txFromAssetId} onChange={e => setTxFromAssetId(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900 px-6 py-4 rounded-2xl font-black text-sm outline-none">
                            <option value="">Оберіть блок...</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px) font-black text-zinc-400 uppercase ml-2">Куди</label>
                          <select value={txToAssetId} onChange={e => setTxToAssetId(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900 px-6 py-4 rounded-2xl font-black text-sm outline-none">
                            <option value="">Оберіть блок...</option>
                            {assets.map(a => <option key={a.id} value={a.id} disabled={a.id === txFromAssetId}>{a.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <select value={txAssetId} onChange={e => setTxAssetId(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900 px-6 py-4 rounded-2xl font-black text-sm outline-none">
                      <option value="">Оберіть блок...</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase ml-2">Дата</label>
                      <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900 px-6 py-4 rounded-2xl font-black text-sm outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase ml-2">Кількість ERBB</label>
                      <LocalNumberInput value={txTokens} onChange={handleTokensChange} className="w-full bg-zinc-100 dark:bg-zinc-900 px-6 py-4 rounded-2xl font-black text-sm outline-none" />
                    </div>
                  </div>

                  {(showTxForm === 'buy' || showTxForm === 'sell') && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-[28px] border border-zinc-200/50 dark:border-white/5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase ml-2">Ціна $ (за 1 ERBB)</label>
                        <LocalNumberInput 
                          value={txPrice} 
                          onChange={(v) => {
                            setTxPrice(v);
                            syncTokensToAmount(txTokens, v, bUsdRate);
                          }} 
                          className="w-full bg-transparent px-2 py-1 font-black text-sm outline-none text-indigo-500" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase ml-2">Курс $ (UAH/$)</label>
                        <LocalNumberInput 
                          value={txUsdRate} 
                          onChange={(v) => {
                            setTxUsdRate(v);
                            syncTokensToAmount(txTokens, txPrice, v);
                          }} 
                          className="w-full bg-transparent px-2 py-1 font-black text-sm outline-none text-indigo-500" 
                        />
                      <div className="text-[8px] font-bold text-zinc-400 uppercase ml-2 opacity-50">Можна редагувати вручну</div>
                      </div>
                    </div>
                  )}

                  {(showTxForm === 'buy' || showTxForm === 'sell') && (
                    <div className="flex items-center justify-between px-6 py-4 bg-indigo-600/5 rounded-2xl border border-indigo-500/10">
                      <span className="text-[10px] font-black text-indigo-600/60 uppercase">Разом до сплати:</span>
                      <span className="text-lg font-black text-indigo-600">
                        {formatGlobal(txAmount, globalCurrency, exchangeRates || {}, bCur)}
                        {bCur !== 'USD' && (
                          <span className="text-[10px] ml-2 opacity-50">
                            (≈ {formatGlobal(txAmount / bUsdRate, globalCurrency, exchangeRates || {}, 'USD')})
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Investment Potential Info */}
                  {(showTxForm === 'buy' || showTxForm === 'sell') && (
                    <div className="p-4 bg-indigo-500/5 rounded-[28px] border border-indigo-500/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Інвестиційний потенціал</div>
                          <div className="text-sm font-black text-zinc-900 dark:text-white">{formatGlobal(availableBalanceUah || 0, globalCurrency, exchangeRates || {}, 'UAH')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Доступно</div>
                        <div className="text-[10px] font-black text-emerald-600">{(availableBalanceUah || 0) >= txAmount ? 'Достатньо' : 'Недостатньо'}</div>
                      </div>
                    </div>
                  )}

                  {/* Budget Account Selection for Unified Transactions */}
                  {(showTxForm === 'buy' || showTxForm === 'sell' || showTxForm === 'income') && (
                    <div className="space-y-1 p-4 bg-blue-500/5 rounded-[28px] border border-blue-500/10 relative">
                      <label className="text-[10px] font-black text-zinc-400 uppercase ml-2 flex items-center gap-2">
                        <Wallet className="w-3 h-3 text-blue-500" />
                        {showTxForm === 'buy' ? 'Списати з рахунку (Додатково)' : 'Зарахувати на рахунок'}
                      </label>
                      <select 
                        value={txBudgetAccountId} 
                        onChange={e => setTxBudgetAccountId(e.target.value)} 
                        className="w-full bg-transparent px-2 py-1 font-black text-sm outline-none text-blue-600 dark:text-blue-400 appearance-none cursor-pointer"
                      >
                        <option value="">-- {showTxForm === 'buy' ? 'Тільки з потенціалу' : 'На обраний рахунок'} --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({formatGlobal(acc.balance, globalCurrency, exchangeRates || {}, 'UAH')})
                          </option>
                        ))}
                      </select>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase ml-2 opacity-50 italic">
                        {showTxForm === 'buy' 
                          ? 'Якщо обрано, кошти спишуться і з потенціалу, і з рахунку (для синхронізації)' 
                          : 'Створить запис в історії бюджету'}
                      </p>
                    </div>
                  )}

                  {txError && <div className="p-4 bg-red-500/10 text-red-500 text-[10px] font-black rounded-xl">{txError}</div>}
                  <button onClick={handleSaveTx} disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest">{isSaving ? 'Зберігаємо...' : 'Зберегти'}</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BitbonPortfolioView;
