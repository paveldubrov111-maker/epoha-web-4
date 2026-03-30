import React, { useState } from 'react';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { PieChart, TrendingUp, Zap, Shield, Sparkles, ChevronDown, ChevronUp, Wallet, ArrowUpRight, ArrowDownRight, BarChart } from 'lucide-react';
import { Tooltip as StickTip } from './Tooltip';
import { Portfolio, PortfolioAsset, Transaction, BudgetTx, BitbonAllocation, Currency } from '../types';

interface StrategicOverviewProps {
  t: (key: string) => string;
  globalMetrics: any;
  availableInvestmentUsd: number;
  availableInvestmentUah: number;
  bCur: Currency | 'USD';
  fmt: (v: number, c: string) => string;
  fmtUsd: (v: number) => string;
  theme: string;
  commonChartOptions: any;
  bUsdRate: number;
  showBalanceEdit: boolean;
  setShowBalanceEdit: (v: boolean) => void;
  editBalanceAmount: number | string;
  setEditBalanceAmount: (v: number) => void;
  userId: string | null;
  calculatedAvailableInvestmentUah: number;
  db: any;
  setDoc: any;
  doc: any;
  // New props for integrated analytics
  portfolios: Portfolio[];
  portfolioAssets: PortfolioAsset[];
  transactions: Transaction[];
  budgetTxs: BudgetTx[];
  chartTimeframe: string;
  setChartTimeframe: (v: string) => void;
  chartPortfolioFilter: 'all' | 'crypto' | 'alternative' | 'bitbon';
  setChartPortfolioFilter: (v: 'all' | 'crypto' | 'alternative' | 'bitbon') => void;
  TIMEFRAMES: any[];
}

export const StrategicOverview: React.FC<StrategicOverviewProps> = ({
  t, globalMetrics, availableInvestmentUsd, availableInvestmentUah, bCur, fmt, fmtUsd, theme, commonChartOptions, bUsdRate,
  showBalanceEdit, setShowBalanceEdit, editBalanceAmount, setEditBalanceAmount, userId, calculatedAvailableInvestmentUah,
  db, setDoc, doc,
  portfolios, portfolioAssets, transactions, budgetTxs, chartTimeframe, setChartTimeframe, chartPortfolioFilter, setChartPortfolioFilter, TIMEFRAMES
}) => {
  const [showTable, setShowTable] = useState(false);

  const { bitbonValueUsd, bitbonInvestedUsd, bitbonProfitUsd, cryptoValueUsd, cryptoInvestedUsd, cryptoProfitUsd, altValueUsd, altInvestedUsd, totalCapitalUsd, totalInvested, totalProfit, totalRoi } = globalMetrics;

  const toDisp = (usdVal: number) => bCur === 'USD' ? fmtUsd(usdVal) : fmt(usdVal * bUsdRate, 'UAH');

  const portfolioBreakdown = [
    { id: 'bitbon', name: 'Бітбон (ERBB)', value: bitbonValueUsd, invested: bitbonInvestedUsd, profit: bitbonProfitUsd, color: 'bg-blue-500' },
    { id: 'crypto', name: t('cryptoAssets'), value: cryptoValueUsd, invested: cryptoInvestedUsd, profit: cryptoProfitUsd, color: 'bg-emerald-500' },
    { id: 'alternative', name: t('altAssets'), value: altValueUsd, invested: altInvestedUsd, profit: altValueUsd - altInvestedUsd, color: 'bg-amber-500' },
  ].filter(p => {
    if (p.id === 'bitbon') return true;
    return portfolios.some(pr => pr.type === p.id);
  });

  // Calculate Growth Chart Data
  const getGrowthData = () => {
    const tf = TIMEFRAMES.find(tf => tf.key === chartTimeframe) || TIMEFRAMES[5];
    const now = new Date();
    const startDate = new Date(now.getTime() - tf.days * 86400000);

    let baseInvested = 0;
    const includeBitbon = chartPortfolioFilter === 'all' || chartPortfolioFilter === 'bitbon';
    const includeBudget = chartPortfolioFilter === 'all';

    if (includeBitbon) {
      baseInvested += transactions.filter(tx => new Date(tx.date) < startDate)
        .reduce((s, tx) => s + (tx.type === 'sell' ? -1 : 1) * tx.amountUsd, 0);
    }
    if (includeBudget) {
      baseInvested += budgetTxs.filter(tx => tx.type === 'investment' && new Date(tx.date) < startDate)
        .reduce((s, tx) => s + tx.amount / bUsdRate, 0);
    }

    const events: { date: Date; investedUsd: number }[] = [];
    if (includeBitbon) {
      transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (d >= startDate && d <= now) events.push({ date: d, investedUsd: (tx.type === 'sell' ? -1 : 1) * tx.amountUsd });
      });
    }
    if (includeBudget) {
      budgetTxs.filter(tx => tx.type === 'investment').forEach(tx => {
        const d = new Date(tx.date);
        if (d >= startDate && d <= now) events.push({ date: d, investedUsd: tx.amount / bUsdRate });
      });
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    const points: { date: string; value: number }[] = [];
    let cur = baseInvested;
    
    // Add start point
    points.push({ date: startDate.toLocaleDateString(), value: cur });
    
    events.forEach(ev => {
      cur += ev.investedUsd;
      points.push({ date: ev.date.toLocaleDateString(), value: cur });
    });
    
    // Add end point (current value estimate is complex, simplifying to cumulative invested for now)
    points.push({ date: now.toLocaleDateString(), value: cur });

    return {
      labels: points.map(p => p.date),
      datasets: [{
        label: t('capitalGrowth'),
        data: points.map(p => p.value),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0
      }]
    };
  };

  const chartIdSuffix = React.useMemo(() => Math.random().toString(36).substring(2, 9), []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* IO Daily Briefing */}
      <div className="bg-gradient-to-r from-indigo-600/10 via-emerald-500/5 to-indigo-600/10 backdrop-blur-xl rounded-[32px] p-6 border border-white/20 dark:border-white/5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all">
           <Sparkles className="w-16 h-16 text-indigo-500" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center border border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
               <div className="text-sm font-black text-white tracking-widest">IO</div>
            </div>
            <div>
              <div className="text-lg font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight leading-none mb-1">{t('ioBriefing')}</div>
              <div className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">{t('ioBriefingDesc')}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 md:ml-8">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/40 dark:bg-zinc-800/40 border border-white/20 dark:border-white/5 hover:border-indigo-500/30 transition-all">
               <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
               <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 leading-tight">{t('ioInsightOneDesc')}</div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/40 dark:bg-zinc-800/40 border border-white/20 dark:border-white/5 hover:border-indigo-500/30 transition-all">
               <Shield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
               <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 leading-tight">{t('ioInsightTwoDesc')}</div>
            </div>
            <div className="hidden lg:flex items-start gap-3 p-3 rounded-2xl bg-white/40 dark:bg-zinc-800/40 border border-white/20 dark:border-white/5 hover:border-indigo-500/30 transition-all">
               <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
               <div className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 leading-tight">{t('ioInsightThreeDesc')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-indigo-500/10 dark:bg-indigo-900/20 backdrop-blur-md p-6 rounded-[32px] border border-indigo-200/50 dark:border-indigo-800/40 relative group overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
             <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{t('totalCapital')}</div>
             <Wallet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-indigo-900 dark:text-indigo-100 tracking-tight mb-1">{toDisp(totalCapitalUsd)}</div>
          <div className="text-[10px] text-indigo-500/70 font-bold uppercase tracking-wide">
             ≈ {bCur === 'USD' ? fmt(totalCapitalUsd * bUsdRate, 'UAH') : fmtUsd(totalCapitalUsd)}
          </div>
        </div>

        <div className="bg-emerald-500/10 dark:bg-emerald-900/20 backdrop-blur-md p-6 rounded-[32px] border border-emerald-200/50 dark:border-emerald-800/40 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Global ROI</div>
             <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight mb-1">{totalRoi >= 0 ? '+' : ''}{totalRoi.toFixed(2)}%</div>
          <div className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-wide">
             {t('totalProfitGlobal')}: {toDisp(totalProfit)}
          </div>
        </div>

        <div className="bg-amber-500/10 dark:bg-amber-900/20 backdrop-blur-md p-6 rounded-[32px] border border-amber-200/50 dark:border-amber-800/40 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{t('availableForInv')}</div>
            <StickTip content={t('adjustBalance')}>
                <button onClick={() => { setEditBalanceAmount(Math.round(availableInvestmentUah)); setShowBalanceEdit(!showBalanceEdit); }} className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors p-1 rounded">
                   <Zap className="w-4 h-4" />
                </button>
              </StickTip>
          </div>
          <div className="text-3xl font-black text-amber-900 dark:text-amber-100 tracking-tight mb-1">
             {bCur === 'USD' ? fmtUsd(availableInvestmentUsd) : fmt(availableInvestmentUah, 'UAH')}
          </div>
        </div>
      </div>

      {/* Growth Chart Section */}
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[40px] p-8 border border-white/20 dark:border-white/5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
             <TrendingUp className="w-4 h-4" /> {t('capitalGrowth')}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              {TIMEFRAMES.filter(f => ['1M', '3M', '6M', '1Y', 'ALL'].includes(f.key)).map(tf => (
                <button
                  key={tf.key}
                  onClick={() => setChartTimeframe(tf.key)}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${chartTimeframe === tf.key ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            <select 
              value={chartPortfolioFilter}
              onChange={(e) => setChartPortfolioFilter(e.target.value as any)}
              className="bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-600 dark:text-zinc-300 px-3 py-1 rounded-xl outline-none border-none cursor-pointer"
            >
              <option value="all">{t('allPortfolios')}</option>
              <option value="bitbon">Bitbon</option>
              <option value="crypto">{t('cryptoAssets')}</option>
              <option value="alternative">{t('altAssets')}</option>
            </select>
          </div>
        </div>
        <div className="h-[350px]">
          <Line 
            id={`strategic-growth-line-${chartIdSuffix}`}
            key={`strategic-growth-line-${chartIdSuffix}`}
            data={getGrowthData()} 
            options={{ ...commonChartOptions, maintainAspectRatio: false }} 
          />
        </div>
      </div>

      {/* Allocation & Performance Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[40px] p-8 border border-white/20 dark:border-white/5 shadow-2xl">
          <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 mb-6 uppercase tracking-widest flex items-center gap-2">
             <PieChart className="w-4 h-4" /> {t('assetAllocation')}
          </div>
          <div className="h-[250px] flex items-center justify-center relative">
            <Pie 
            id={`strategic-allocation-pie-${chartIdSuffix}`}
            key={`strategic-allocation-pie-${chartIdSuffix}`}
              data={{
                labels: chartPortfolioFilter === 'bitbon' 
                  ? ['Genesis', 'Providing', 'Tokens for Sale', 'Other']
                  : ['Bitbon', t('cryptoAssets'), t('altInvestments')],
                datasets: [{
                  data: chartPortfolioFilter === 'bitbon'
                    ? [
                        globalMetrics.bitbonBreakdown?.genesis || 0,
                        globalMetrics.bitbonBreakdown?.providing || 0,
                        globalMetrics.bitbonBreakdown?.sale || 0,
                        globalMetrics.bitbonBreakdown?.other || 0
                      ]
                    : [globalMetrics.bitbonValueUsd, globalMetrics.cryptoValueUsd, globalMetrics.altValueUsd],
                  backgroundColor: chartPortfolioFilter === 'bitbon'
                    ? ['#6366f1', '#10b981', '#f59e0b', '#94a3b8']
                    : ['#4f46e5', '#10b981', '#f59e0b'],
                  borderColor: theme === 'dark' ? '#18181b' : '#ffffff',
                  borderWidth: 2
                }]
              }}
              options={{ 
                plugins: { 
                    legend: { position: 'bottom', labels: { color: theme === 'dark' ? '#a1a1aa' : '#71717a', font: { weight: 'bold', size: 10 } } } 
                }, 
                maintainAspectRatio: false 
              }}
            />
          </div>
        </div>
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[40px] p-8 border border-white/20 dark:border-white/5 shadow-2xl">
          <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 mb-6 uppercase tracking-widest flex items-center gap-2">
             <BarChart className="w-4 h-4 text-emerald-500" /> {t('portfolioPerformance')}
          </div>
          <div className="h-[250px]">
            <Bar 
              id={`strategic-performance-bar-${chartIdSuffix}`}
              key={`strategic-performance-bar-${chartIdSuffix}`}
              data={{
                labels: ['Bitbon', 'Crypto', 'Alternative'],
                datasets: [{ label: 'Profit (USD)', data: [globalMetrics.bitbonProfitUsd, globalMetrics.cryptoProfitUsd, globalMetrics.altProfitUsd], backgroundColor: 'rgba(16, 185, 129, 0.6)', borderRadius: 12 }]
              }}
              options={{ ...commonChartOptions, indexAxis: 'y', plugins: { legend: { display: false } }, maintainAspectRatio: false }}
            />
          </div>
        </div>
      </div>

      {/* Distribution Table (Collapsible) */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-[32px] border border-white/20 dark:border-white/5 overflow-hidden shadow-xl transition-all duration-500">
        <button 
          onClick={() => setShowTable(!showTable)}
          className="w-full p-6 flex items-center justify-between group hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 transition-colors">
                <PieChart className="w-4 h-4" />
             </div>
             <div className="text-left">
                <div className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest">{t('portfolioDistribution')}</div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">{t('detailedBreakdown')}</div>
             </div>
          </div>
          {showTable ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
        </button>
        
        {showTable && (
          <div className="px-6 pb-6 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-4 px-2">{t('portfolioTitle')}</th>
                  <th className="py-4 px-2 text-right">{t('investedTitle')}</th>
                  <th className="py-4 px-2 text-right">{t('valueTitle')}</th>
                  <th className="py-4 px-2 text-right">{t('profitTitle')}</th>
                  <th className="py-4 px-2 text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {portfolioBreakdown.map((p, i) => {
                  const pRoi = p.invested > 0 ? (p.profit / p.invested) * 100 : 0;
                  return (
                    <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.color}`} />
                          <span className="text-xs font-black text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right text-[11px] font-bold text-zinc-500">{toDisp(p.invested)}</td>
                      <td className="py-4 px-2 text-right text-[11px] font-black text-zinc-700 dark:text-zinc-100">{toDisp(p.value)}</td>
                      <td className={`py-4 px-2 text-right text-[11px] font-black ${p.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {p.profit >= 0 ? '+' : ''}{toDisp(p.profit)}
                      </td>
                      <td className={`py-4 px-2 text-right text-[11px] font-black ${pRoi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {pRoi >= 0 ? '+' : ''}{pRoi.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
