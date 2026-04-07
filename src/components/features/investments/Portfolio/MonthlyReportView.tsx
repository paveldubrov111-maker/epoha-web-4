import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Minus, Coins } from 'lucide-react';
import { Currency, PortfolioAsset, PortfolioTransaction } from '../../../../types';

interface MonthlyReportViewProps {
  assets: PortfolioAsset[];
  transactions: PortfolioTransaction[];
  bCur: Currency;
  usdRate: number;
  language: string;
  t: (key: string) => string;
  formatGlobal: (n: number, targetCur: Currency, rates: Record<string, number>, sourceCur?: Currency, maxDecimals?: number, compact?: boolean) => string;
  globalCurrency: Currency;
  exchangeRates: Record<string, number>;
}

const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  assets,
  transactions,
  usdRate,
  language,
  t,
  formatGlobal,
  globalCurrency,
  exchangeRates
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const monthName = new Intl.DateTimeFormat(language === 'uk' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long' }).format(selectedDate);

  const prevMonth = () => setSelectedDate(new Date(year, month - 1, 1));
  const nextMonth = () => setSelectedDate(new Date(year, month + 1, 1));

  // Reporting Logic
  const reportData = useMemo(() => {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    return (assets || []).map(asset => {
      const monthTxs = (transactions || []).filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= startOfMonth && txDate <= endOfMonth && 
               (tx.assetId === asset.id || tx.fromAssetId === asset.id || tx.toAssetId === asset.id);
      });

      const openingBalance = (transactions || [])
        .filter(tx => {
          if (!tx) return false;
          const txDate = new Date(tx.date);
          if (tx.assetId === asset.id) return txDate < startOfMonth;
          if (tx.type === 'transfer') {
            if (tx.fromAssetId === asset.id) return txDate < startOfMonth;
            if (tx.toAssetId === asset.id) return txDate < startOfMonth;
          }
          return false;
        })
        .reduce((sum, tx) => {
          if (tx.type === 'transfer') {
             if (tx.fromAssetId === asset.id) return sum - tx.tokens;
             if (tx.toAssetId === asset.id) return sum + tx.tokens;
             return sum;
          }
          const delta = (tx.type === 'buy' || tx.type === 'income') ? tx.tokens : -tx.tokens;
          return sum + (tx.assetId === asset.id ? delta : 0);
        }, 0);

      const incomeTxs = monthTxs.filter(tx => tx.type === 'income' && tx.assetId === asset.id);
      const buyTxs = monthTxs.filter(tx => tx.type === 'buy' && tx.assetId === asset.id);
      
      const incomeTokens = incomeTxs.reduce((sum, tx) => sum + tx.tokens, 0);
      const buyTokens = buyTxs.reduce((sum, tx) => sum + tx.tokens, 0);
      
      const incomeUsd = incomeTxs.reduce((sum, tx) => sum + tx.amountUsd, 0);
      const incomeUah = incomeTxs.reduce((sum, tx) => sum + (tx.amountUsd * (tx.usdRate || usdRate)), 0);

      const monthChanges = monthTxs.reduce((sum, tx) => {
          if (tx.type === 'transfer') {
             if (tx.fromAssetId === asset.id) return sum - tx.tokens;
             if (tx.toAssetId === asset.id) return sum + tx.tokens;
             return sum;
          }
          if (tx.assetId !== asset.id) return sum;
          const delta = (tx.type === 'buy' || tx.type === 'income') ? tx.tokens : -tx.tokens;
          return sum + delta;
        }, 0);

      const closingBalance = openingBalance + monthChanges;
      const roiPassiv = openingBalance > 0 ? (incomeTokens / openingBalance) * 100 : 0;

      return {
        id: asset.id,
        name: asset.name,
        openingBalance,
        closingBalance,
        incomeTokens,
        buyTokens,
        incomeUsd,
        incomeUah,
        roiPassiv,
        monthTxs: monthTxs.sort((a, b) => b.tokens - a.tokens).slice(0, 3)
      };
    }).filter(row => row.openingBalance > 0 || row.closingBalance > 0 || row.incomeTokens > 0);
  }, [assets, transactions, year, month, usdRate]);

  const totals = useMemo(() => {
    return reportData.reduce((acc, row) => ({
      tokens: acc.tokens + row.incomeTokens,
      usd: acc.usd + row.incomeUsd,
      uah: acc.uah + row.incomeUah
    }), { tokens: 0, usd: 0, uah: 0 });
  }, [reportData]);

  return (
    <div className="space-y-8 p-1">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white/60 dark:bg-zinc-900/60 backdrop-blur-3xl p-6 rounded-[32px] border border-zinc-200/50 dark:border-white/5 shadow-2xl">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Calendar className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight leading-none">
              {monthName} <span className="text-indigo-600 dark:text-indigo-400">{year}</span>
            </h3>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> {t('monthlyAnalyticalReport')}
            </p>
          </div>
        </div>

        <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-white/5">
          <button onClick={prevMonth} className="p-2.5 hover:bg-white dark:hover:bg-zinc-900 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm">
            <ChevronLeft className="w-5 h-5 text-zinc-500" />
          </button>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 my-auto mx-1" />
          <button onClick={nextMonth} className="p-2.5 hover:bg-white dark:hover:bg-zinc-900 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm">
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: t('passiveIncomeShort'), value: `${totals.tokens.toFixed(2)} ERBB`, icon: TrendingUp, color: 'from-indigo-600 to-blue-700', shadow: 'shadow-indigo-500/20' },
          { label: t('equivalentUsd'), value: formatGlobal(totals.usd, globalCurrency, exchangeRates, 'USD'), icon: DollarSign, color: 'from-emerald-600 to-teal-700', shadow: 'shadow-emerald-500/20' },
          { label: `${t('totalInCurrency')} ${globalCurrency}`, value: formatGlobal(totals.usd, globalCurrency, exchangeRates, 'USD'), icon: Wallet, color: 'from-zinc-800 to-zinc-900 dark:from-white dark:to-zinc-200 dark:text-zinc-900', shadow: 'shadow-zinc-500/20' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`relative overflow-hidden p-8 rounded-[40px] bg-gradient-to-br ${stat.color} ${stat.color.includes('dark:text-zinc-900') ? '' : 'text-white'} shadow-2xl ${stat.shadow} group`}
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
              <stat.icon className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">{stat.label}</p>
              <h4 className="text-3xl font-black tracking-tighter">{stat.value}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {reportData.map((row, i) => (
            <motion.div
              layout
              key={row.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-3xl p-8 rounded-[48px] border border-zinc-200/50 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
            >
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/5 blur-3xl rounded-full" />
              
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-200/20 shadow-inner">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tighter">{row.name}</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t('assetReporting')}</p>
                  </div>
                </div>
                {row.roiPassiv > 0 && (
                  <div className="flex flex-col items-end">
                    <div className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                      ROI: {row.roiPassiv.toFixed(2)}%
                    </div>
                    <span className="text-[8px] font-black text-zinc-400 uppercase mt-1 mr-1">{t('passiveYield')}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                       <span>{t('balanceGrowth')}</span>
                       <span className="text-indigo-500">+{((row.closingBalance / (row.openingBalance || 1) - 1) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-1 border border-zinc-200/20 dark:border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (row.closingBalance / (row.openingBalance || 1)) * 50)}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                      />
                    </div>
                    <div className="flex justify-between items-end">
                       <div>
                         <p className="text-[9px] font-black text-zinc-400 uppercase mb-0.5">{t('startLabel')}</p>
                         <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 leading-none">{row.openingBalance.toFixed(2)}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[9px] font-black text-zinc-400 uppercase mb-0.5">{t('endLabel')}</p>
                         <p className="text-sm font-black text-indigo-500 leading-none">{row.closingBalance.toFixed(2)}</p>
                       </div>
                    </div>
                  </div>

                  <div className="p-6 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-[32px] border border-emerald-500/10 hover:bg-emerald-500/15 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{t('sourcePassive')}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-emerald-500 tracking-tighter">+{row.incomeTokens.toFixed(2)}</span>
                      <span className="text-xs font-black text-emerald-400/60 uppercase">ERBB</span>
                    </div>
                    <div className="mt-2 text-xs font-bold text-zinc-400 italic">
                      ≈ {formatGlobal(row.incomeUsd, globalCurrency, exchangeRates, 'USD')}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-100/50 dark:bg-zinc-800/30 rounded-[32px] p-6 border border-zinc-200/30 dark:border-white/5">
                  <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" /> {t('topActivity')}
                  </h5>
                  <div className="space-y-4">
                    {row.monthTxs.map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/50 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 
                            tx.type === 'buy' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-zinc-500/10 text-zinc-500'
                          }`}>
                            {tx.type === 'income' ? <Coins className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-zinc-800 dark:text-zinc-200 uppercase leading-none mb-1">
                            {tx.type === 'income' ? t('incomeLabel') : tx.type === 'buy' ? t('buyLabel') : t('transferAction')}
                            </p>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{tx.date.split('-').slice(1).join('.')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            +{tx.tokens.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {row.monthTxs.length === 0 && (
                      <div className="py-8 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest opacity-50">
                        {t('noOperations')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-10 bg-zinc-900 border border-white/10 rounded-[48px] relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <TrendingUp className="w-32 h-32 rotate-12 text-white" />
        </div>
        <div className="absolute bottom-0 left-0 p-10 opacity-10">
          <Wallet className="w-24 h-24 -rotate-12 text-indigo-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 rounded-[28px] bg-indigo-500 flex items-center justify-center shrink-0 shadow-xl shadow-indigo-500/40">
             <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <div className="text-center md:text-left">
            <h5 className="text-2xl font-black text-white uppercase tracking-tighter mb-3 drop-shadow-sm">{t('deepAnalytics')}</h5>
            <p className="text-sm text-zinc-400 leading-relaxed font-bold italic max-w-3xl opacity-80">
              {t('deepAnalyticsDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReportView;
