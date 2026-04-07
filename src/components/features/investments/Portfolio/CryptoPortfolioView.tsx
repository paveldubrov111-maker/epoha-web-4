import React, { useState, useEffect, useMemo } from 'react';
// import { Doughnut } from 'react-chartjs-2';
/*
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
*/
import { 
  TrendingUp, TrendingDown, ShoppingCart, 
  Trash2, Edit2, Plus, Search, X, 
  Gauge, AlertCircle, RefreshCw,
  ArrowRight, ShieldCheck, Clock, Zap, Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Portfolio, PortfolioAsset, Currency, PortfolioTransaction } from '../../../../types';

interface Props {
  portfolio: Portfolio;
  assets: PortfolioAsset[];
  onAddAsset: (asset: Omit<PortfolioAsset, 'id' | 'updatedAt'>) => Promise<void>;
  onUpdateAsset: (id: string, updates: Partial<PortfolioAsset>) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
  onDeletePortfolio?: (id: string) => Promise<void>;
  currency: Currency;
  usdRate: number;
  availableBalanceUsd?: number;
  onRecordTransaction?: (tx: Omit<PortfolioTransaction, 'id'>) => Promise<void>;
  transactions: PortfolioTransaction[];
  formatGlobal: (n: number, targetCur: Currency, rates: Record<string, number>, sourceCur?: Currency, maxDecimals?: number, compact?: boolean) => string;
  globalCurrency: Currency;
  exchangeRates: Record<string, number>;
  theme: string;
  language: any;
  t: (key: string) => string;
}

export const CryptoPortfolioView: React.FC<Props> = ({ 
  portfolio, assets, onAddAsset, onUpdateAsset, onDeleteAsset, 
  onDeletePortfolio, currency, usdRate, availableBalanceUsd, 
  onRecordTransaction,
  transactions,
  formatGlobal, globalCurrency, exchangeRates, theme,
  language, t
}) => {
  // UI State
  const [fngData, setFngData] = useState<{ value: string; classification: string } | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [allPrices, setAllPrices] = useState<Record<string, number>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  
  // Forms state
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState<{ name: string; symbol: string } | null>(null);
  const [buyAmountUsd, setBuyAmountUsd] = useState(100);
  const [buyPrice, setBuyPrice] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Fear & Greed Index
  useEffect(() => {
    fetch('https://api.alternative.me/fng/?limit=1')
      .then(res => res.json())
      .then(data => {
        if (data?.data && data.data[0]) {
          setFngData({
            value: data.data[0].value,
            classification: data.data[0].value_classification
          });
        }
      })
      .catch(err => console.error('F&G fetch failed', err));
  }, []);

  // Fetch Prices Logic
  const fetchPrices = async () => {
    if (isLoadingPrices) return;
    setIsLoadingPrices(true);
    try {
      const priceMap: Record<string, number> = {};
      
      // 1. Binance
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price');
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item.symbol?.endsWith('USDT')) {
              const sym = item.symbol.replace('USDT', '');
              priceMap[sym] = parseFloat(item.price);
            }
          });
        }
      } catch (e) { console.warn('Binance fetch failed', e); }

      // 2. OKX
      try {
        const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
        const data = await res.json();
        if (data?.data) {
          data.data.forEach((item: any) => {
            const sym = item.instId.replace('-USDT', '').replace('-USDC', '');
            if (!priceMap[sym]) priceMap[sym] = parseFloat(item.last);
          });
        }
      } catch (e) { console.warn('OKX fetch failed', e); }

      // 3. CoinCap (for tokens like RIO)
      try {
        const res = await fetch('https://api.coincap.io/v2/assets?limit=1000');
        const data = await res.json();
        if (data?.data) {
          data.data.forEach((asset: any) => {
            if (!priceMap[asset.symbol]) priceMap[asset.symbol] = parseFloat(asset.priceUsd);
          });
        }
      } catch (e) { console.warn('CoinCap fetch failed', e); }

      // 4. DexScreener Fallback for missing assets (like RIO if CoinCap fails)
      const stabalecoins = ['USDT', 'USDC', 'DAI', 'USDS', 'BUSD'];
      const missingAssets = assets.filter(a => 
        a.symbol && 
        !priceMap[a.symbol.toUpperCase()] && 
        !stabalecoins.includes(a.symbol.toUpperCase())
      );

      if (missingAssets.length > 0) {
        await Promise.all(missingAssets.map(async (a) => {
          try {
            const sym = a.symbol?.toUpperCase();
            if (!sym) return;
            const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${sym}`);
            const data = await res.json();
            if (data?.pairs && data.pairs.length > 0) {
               // Narrow search to exact symbol match to avoid random pairs
               const exactPair = data.pairs.find((p: any) => p.baseToken?.symbol?.toUpperCase() === sym);
               const bestPair = exactPair || data.pairs[0];
               if (bestPair.priceUsd) {
                  priceMap[sym] = parseFloat(bestPair.priceUsd);
               }
            }
          } catch (e) { console.warn(`DexScreener failed for ${a.symbol}`, e); }
        }));
      }

      // 5. Hardcode Stablecoins for absolute accuracy
      stabalecoins.forEach(coin => {
        priceMap[coin] = 1.0;
      });

      setAllPrices(prev => ({ ...prev, ...priceMap }));
    } catch (err) {
      console.error('All price fetches failed', err);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Sync state to livePrices whenever allPrices or assets change
  useEffect(() => {
    const newLive: Record<string, number> = {};
    assets.forEach(a => {
      if (a.symbol) {
        const upperSym = a.symbol.toUpperCase();
        const price = allPrices[upperSym];
        if (price) {
          newLive[a.id] = price;
        }
      }
    });
    setLivePrices(newLive);
  }, [allPrices, assets]);

  // Fetch prices on mount and when assets change
  useEffect(() => { 
    fetchPrices();
    const timer = setInterval(fetchPrices, 60000); // refresh every minute
    return () => clearInterval(timer);
  }, [assets.length]);

  // Calculations
  const assetData = useMemo(() => {
    return assets.map(a => {
      const price = livePrices[a.id] || a.averagePrice || a.currentPrice || 1;
      const value = a.amount * price;
      const cost = a.amount * (a.averagePrice || 0);
      const profit = value - cost;
      const roi = cost > 0 ? (profit / cost) * 100 : 0;
      return { ...a, currentPrice: price, value, profit, roi };
    }).sort((a, b) => b.value - a.value);
  }, [assets, livePrices]);

  const totalValueUsd = assetData.reduce((s, a) => s + a.value, 0);
  const totalCostUsd = assetData.reduce((s, a) => s + (a.amount * (a.averagePrice || 0)), 0);
  const overallProfit = totalValueUsd - totalCostUsd;
  const overallRoi = totalCostUsd > 0 ? (overallProfit / totalCostUsd) * 100 : 0;

  // Search Logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return Object.keys(allPrices)
      .filter(sym => sym.toLowerCase().includes(q))
      .slice(0, 10)
      .map(sym => ({ name: sym, symbol: sym }));
  }, [searchQuery, allPrices]);

  const handleBuy = async () => {
    if (!selectedCrypto || buyAmountUsd <= 0 || buyPrice <= 0) return;
    setIsSaving(true);
    try {
      const tokens = buyAmountUsd / buyPrice;
      const existing = assets.find(a => a.symbol?.toUpperCase() === selectedCrypto.symbol.toUpperCase());
      
      if (existing) {
        const newAmount = existing.amount + tokens;
        const newAvg = (existing.amount * (existing.averagePrice || 0) + buyAmountUsd) / newAmount;
        await onUpdateAsset(existing.id, { amount: newAmount, averagePrice: newAvg });
      } else {
        await onAddAsset({
          portfolioId: portfolio.id,
          name: selectedCrypto.name,
          symbol: selectedCrypto.symbol.toUpperCase(),
          amount: tokens,
          averagePrice: buyPrice
        });
      }

      if (onRecordTransaction) {
        await onRecordTransaction({
          portfolioId: portfolio.id,
          assetId: existing?.id || 'new-' + selectedCrypto.symbol,
          symbol: selectedCrypto.symbol,
          type: 'buy',
          amountUsd: buyAmountUsd,
          tokens: tokens,
          priceUsd: buyPrice,
          date: new Date().toISOString().split('T')[0]
        });
      }
      setShowBuyForm(false);
      setSelectedCrypto(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-zinc-950 to-black rounded-[48px] p-8 md:p-12 shadow-2xl border border-white/5 group transition-all">
        <div className="absolute inset-0 opacity-40 blur-3xl pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full animate-pulse" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">{t('cryptoHub')} • {portfolio.name}</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
              {formatGlobal(totalValueUsd, globalCurrency, exchangeRates, 'USD')}
            </h2>
            <div className="flex items-center gap-4">
               <div className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl border ${overallProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                 {overallProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="text-sm font-black tracking-tight">{formatGlobal(Math.abs(overallProfit), globalCurrency, exchangeRates, 'USD')} ({overallRoi.toFixed(2)}%)</span>
               </div>
               <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest italic">{t('allTimeProfit')}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-6 w-full md:w-auto">
             {/* Fear & Greed Gauge */}
             {fngData && (() => {
                const val = parseInt(fngData.value);
                const getSentimentStyle = (v: number) => {
                  if (v <= 25) return { color: 'text-rose-500', bg: 'bg-rose-500', shadow: 'shadow-rose-500/50', label: t('sentimentExtremeFear'), advice: t('adviceExtremeFear') };
                  if (v <= 45) return { color: 'text-orange-500', bg: 'bg-orange-500', shadow: 'shadow-orange-500/50', label: t('sentimentFear'), advice: t('adviceFear') };
                  if (v <= 55) return { color: 'text-yellow-500', bg: 'bg-yellow-500', shadow: 'shadow-yellow-500/50', label: t('sentimentNeutral'), advice: t('adviceNeutral') };
                  if (v <= 75) return { color: 'text-emerald-500', bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/50', label: t('sentimentGreed'), advice: t('adviceGreed') };
                  return { color: 'text-green-500', bg: 'bg-green-500', shadow: 'shadow-green-500/50', label: t('sentimentExtremeGreed'), advice: t('adviceExtremeGreed') };
                };
                const style = getSentimentStyle(val);
                
                return (
                  <div className="glass-card bg-white/5 p-6 rounded-[32px] border border-white/5 flex items-center gap-6 group/fng w-full md:w-auto relative overflow-hidden">
                    <div className={`absolute inset-0 ${style.bg} opacity-[0.03]`} />
                    <div className="relative w-16 h-16">
                       <svg className="w-full h-full transform -rotate-90">
                         <circle cx="32" cy="32" r="28" fill="transparent" stroke="currentColor" strokeWidth="5" className="text-white/5" />
                         <circle 
                           cx="32" cy="32" r="28" 
                           fill="transparent" 
                           stroke="currentColor" 
                           strokeWidth="5" 
                           strokeDasharray="176" 
                           strokeDashoffset={176 - (176 * val) / 100} 
                           strokeLinecap="round"
                           className={`${style.color} transition-all duration-1000 ease-out`}
                           style={{ filter: `drop-shadow(0 0 4px currentColor)` }}
                         />
                       </svg>
                       <div className="absolute inset-0 flex items-center justify-center">
                         <span className="text-lg font-black text-white">{val}</span>
                       </div>
                    </div>
                    <div>
                       <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">{t('marketSentiment')}</div>
                       <div className={`text-xs font-black uppercase tracking-tight ${style.color}`}>
                         {style.label}
                       </div>
                       <div className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest mt-1 opacity-0 group-hover/fng:opacity-100 transition-opacity whitespace-nowrap">
                         {style.advice}
                       </div>
                    </div>
                    <div className={`p-3 bg-white/5 rounded-2xl group-hover/fng:rotate-12 transition-transform ${style.color}`}>
                      <Gauge className="w-5 h-5" />
                    </div>
                  </div>
                );
             })()}

             <div className="flex gap-3 w-full md:w-auto">
               <button onClick={() => setShowBuyForm(true)} className="flex-1 md:flex-none px-8 py-4 bg-indigo-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2">
                 <ShoppingCart className="w-4 h-4" /> {t('quickBuy')}
               </button>
               <button className="p-4 bg-white/5 border border-white/5 text-white rounded-3xl hover:bg-white/10 transition-all" onClick={() => fetchPrices()}>
                  <RefreshCw className={`w-5 h-5 ${isLoadingPrices ? 'animate-spin' : ''}`}  />
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Asset Performance Grid */}
         <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {assetData.slice(0, 4).map((asset, idx) => (
                  <motion.div 
                    key={asset.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-card bg-white/40 dark:bg-zinc-900/40 p-5 rounded-[32px] border border-white/20 dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/10 transition-all group"
                  >
                     <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-xs font-black text-white group-hover:rotate-12 transition-transform">
                          {asset.symbol?.slice(0,3)}
                        </div>
                        <div className={`text-[10px] font-black ${asset.roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%
                        </div>
                     </div>
                     <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{asset.name}</div>
                     <div className="text-lg font-black text-zinc-900 dark:text-white tracking-tighter truncate">{formatGlobal(asset.value, globalCurrency, exchangeRates, 'USD', 2)}</div>
                  </motion.div>
               ))}
               {assetData.length === 0 && (
                 <div className="col-span-4 py-12 text-center glass-card bg-white/20 rounded-[32px] border border-dashed border-zinc-300 dark:border-white/10">
                   <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-4" />
                   <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t('noTransactionsYet')}</p>
                 </div>
               )}
            </div>

            {/* Main Asset List */}
            <div className="glass-card bg-white/60 dark:bg-zinc-900/60 rounded-[40px] border border-zinc-200/50 dark:border-white/5 p-8 shadow-2xl relative overflow-hidden backdrop-blur-3xl">
               <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest leading-none">{t('globalHoldings')}</h3>
                  </div>
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="border-b border-zinc-200 dark:border-white/5">
                          <th className="pb-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-2">{t('assetType')}</th>
                          <th className="pb-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">{t('amountLabel')}</th>
                          <th className="pb-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">{t('priceTitle')}</th>
                          <th className="pb-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest px-4 hidden md:table-cell">{t('trendTitle') || 'ТРЕНД'}</th>
                          <th className="pb-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right pr-2">{t('profitTitle')}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
                       {assetData.map(asset => (
                          <tr key={asset.id} className="group hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-all">
                             <td className="py-5 pl-2">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] font-black text-white">
                                      {asset.symbol}
                                   </div>
                                   <div>
                                      <div className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-tight">{asset.name}</div>
                                      <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{formatGlobal(asset.value, globalCurrency, exchangeRates, 'USD')}</div>
                                   </div>
                                </div>
                             </td>
                             <td className="py-5 text-xs font-black text-zinc-900 dark:text-white text-center">
                                {asset.amount.toLocaleString()}
                             </td>
                             <td className="py-5 text-xs font-black text-zinc-900 dark:text-white text-right">
                                {formatGlobal(asset.currentPrice || 0, globalCurrency, exchangeRates, 'USD', 4)}
                             </td>
                             <td className="py-5 px-4 hidden md:table-cell">
                                <div className="w-16 h-8 bg-white/5 rounded-lg flex items-end gap-0.5 p-1">
                                   {[...Array(6)].map((_, i) => {
                                      const h = 20 + (Math.sin(asset.symbol.length + i) * 15) + (asset.roi > 0 ? 15 : -5);
                                      return (
                                        <div 
                                          key={i} 
                                          className={`flex-1 rounded-t-sm ${asset.roi >= 0 ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`} 
                                          style={{ height: `${Math.max(10, Math.min(100, h))}%` }} 
                                        />
                                      );
                                   })}
                                </div>
                             </td>
                             <td className={`py-5 text-xs font-black text-right pr-2 ${asset.roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {asset.roi >= 0 ? '+' : ''}{asset.roi.toFixed(1)}%
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
         </div>

         {/* Right Sidebar: Intelligence Hub & Allocation */}
         <div className="space-y-6">
            <div className="glass-card bg-indigo-600/10 rounded-[40px] border border-indigo-500/20 p-8 shadow-2xl relative overflow-hidden backdrop-blur-3xl group">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Brain className="w-4 h-4" /> {t('intelligenceHub')}
                </h4>
                
                <div className="space-y-6">
                  {/* Dynamic Advice */}
                  <div className="p-5 rounded-3xl bg-white/5 border border-white/5 space-y-3 hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Zap className="w-4 h-4 fill-current" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t('smartAdvice') || 'РОЗУМНІ ПОРАДИ'}</span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-300 leading-relaxed italic uppercase">
                      {(() => {
                        const topAssetShare = totalValueUsd > 0 ? (assetData[0]?.value / totalValueUsd) : 0;
                        const fearVal = fngData ? parseInt(fngData.value) : 50;
                        
                        if (fearVal < 25) return t('advicePanic');
                        if (topAssetShare > 0.6) return t('adviceHighAssetShare').replace('{symbol}', assetData[0].symbol);
                        if (fearVal > 75) return t('adviceCorrection');
                        if (overallRoi < -20) return t('adviceDrawdown');
                        return t('adviceBalanced');
                      })()}
                    </p>
                  </div>

                  {/* Top Gainer */}
                  {assetData.length > 0 && (
                    <div className="flex justify-between items-center px-5 py-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
                      <div>
                        <div className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest leading-none mb-1">{t('topDriver')}</div>
                        <div className="text-xs font-black text-white">{assetData[0].symbol} (+{assetData[0].roi.toFixed(1)}%)</div>
                      </div>
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>
                  )}

                  {/* Activity Timeline */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                       <span>{t('recentActivity')}</span>
                       <Clock className="w-3 h-3" />
                    </div>
                    <div className="space-y-3">
                      {transactions.slice(0, 3).length > 0 ? (
                        transactions.slice(0, 3).map((tx, idx) => (
                          <div key={tx.id || idx} className="flex items-center gap-3 group/tx">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[8px] font-black ${
                              tx.type === 'buy' ? 'bg-indigo-500/20 text-indigo-400' : 
                              tx.type === 'sell' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {tx.symbol?.slice(0, 3)}
                            </div>
                            <div className="flex-1">
                              <div className="text-[10px] font-black text-white uppercase tracking-tight">
                                {tx.type === 'buy' ? t('buyLabel') : t('sellLabel')} {tx.tokens.toLocaleString()} {tx.symbol}
                              </div>
                              <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                                {tx.date} • {formatGlobal(tx.amountUsd, globalCurrency, exchangeRates, 'USD')}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] font-bold text-zinc-600 italic">{t('noTransactionsInline')}</p>
                      )}
                    </div>
                  </div>

                  <button className="w-full py-4 rounded-3xl bg-white text-zinc-950 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/5">
                     {t('fullReport')} <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
             </div>

            <div className="glass-card bg-white/40 dark:bg-zinc-900/60 rounded-[40px] border border-zinc-200/50 dark:border-white/5 p-8 shadow-2xl flex flex-col items-center">
               {(() => {
                 const topCount = 4;
                 const topAssets = assetData.slice(0, topCount);
                 const othersValue = assetData.slice(topCount).reduce((sum, a) => sum + a.value, 0);
                 const groupedData = [...topAssets];
                 if (othersValue > 0) {
                   groupedData.push({ id: 'others-group', symbol: 'ІНШІ', value: othersValue } as any);
                 }

                 return (
                   <>
                     <div className="w-48 h-48 mb-8 relative group/chart">
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800/30 rounded-full border border-white/5">
                           <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Chart</div>
                        </div>
                        {/* 
                         <Doughnut 
                           data={{
                             labels: groupedData.map(a => a.symbol),
                             datasets: [{
                               data: groupedData.map(a => a.value),
                               backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#6b7280'],
                               borderWidth: 0,
                               hoverOffset: 20
                             }]
                           }}
                           options={{ 
                             cutout: '75%', 
                             plugins: { 
                               legend: { display: false },
                               tooltip: { enabled: false }
                             },
                             onHover: (event, elements) => {
                               if (elements && elements.length > 0) setHoveredIndex(elements[0].index);
                               else setHoveredIndex(null);
                             }
                           }}
                         />
                         */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                           {hoveredIndex !== null ? (
                              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                                 <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none">
                                   {groupedData[hoveredIndex]?.symbol === 'ІНШІ' ? 'ІНШІ АКТИВИ' : groupedData[hoveredIndex]?.symbol}
                                 </span>
                                 <div className="text-lg font-black text-zinc-900 dark:text-white leading-tight">
                                    {formatGlobal(groupedData[hoveredIndex]?.value, globalCurrency, exchangeRates, 'USD')}
                                 </div>
                                 <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{((groupedData[hoveredIndex]?.value / totalValueUsd) * 100).toFixed(1)}%</span>
                              </motion.div>
                           ) : (
                              <>
                                 <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{t('dominance')}</span>
                                 <span className="text-xl font-black text-zinc-900 dark:text-white">{groupedData[0]?.symbol || 'N/A'}</span>
                              </>
                           )}
                        </div>
                     </div>
                     <div className="w-full space-y-2">
                        {groupedData.map((a, i) => {
                          const share = totalValueUsd > 0 ? (a.value / totalValueUsd) * 100 : 0;
                          return (
                            <div 
                              key={a.id} 
                              className={`flex justify-between items-center px-4 py-3 rounded-2xl transition-all border ${hoveredIndex === i ? 'bg-indigo-500/10 border-indigo-500/20 scale-[1.02]' : 'bg-white/20 dark:bg-white/5 border-white/20 dark:border-white/10'}`}
                              onMouseEnter={() => setHoveredIndex(i)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            >
                               <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#6b7280'][i] || '#6b7280' }} />
                                  <div>
                                     <div className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-tight">{a.symbol}</div>
                                     <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{formatGlobal(a.value, globalCurrency, exchangeRates, 'USD')}</div>
                                  </div>
                               </div>
                               <div className="text-right">
                                 <span className="text-xs font-black text-zinc-900 dark:text-white">{share.toFixed(1)}%</span>
                                 {i === 0 && share > 50 && (
                                    <div className="text-[6px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-0.5 justify-end mt-0.5">
                                       <AlertCircle className="w-2 h-2" /> {t('highDominance')}
                                    </div>
                                 )}
                               </div>
                            </div>
                          );
                        })}
                     </div>
                   </>
                 );
               })()}
               
               {assetData.length > 0 && assetData[0].value / totalValueUsd > 0.5 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl w-full text-center"
                  >
                     <p className="text-[8px] font-bold text-amber-500 uppercase tracking-[0.2em] leading-relaxed">
                        {t('diversifyAdvice').replace('{symbol}', assetData[0].symbol)}
                     </p>
                  </motion.div>
               )}
            </div>
         </div>
      </div>

      {/* Buy Form Modal */}
      <AnimatePresence>
        {showBuyForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowBuyForm(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[48px] p-10 shadow-2xl border border-zinc-200 dark:border-white/5 overflow-hidden"
            >
               <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl opacity-50" />
               
               <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                           <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">{t('quickBuy')}</h3>
                           <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{t('marketStats')}</p>
                        </div>
                     </div>
                     <button onClick={() => setShowBuyForm(false)} className="p-3 bg-zinc-100 dark:bg-white/5 rounded-2xl hover:bg-rose-500/10 hover:text-rose-500 transition-all"><X className="w-6 h-6" /></button>
                  </div>

                  <div className="space-y-6">
                    <div className="relative">
                       <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1 italic">{t('searchTicker')}</label>
                       <div className="relative group">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                          <input 
                            type="text" 
                            placeholder={t('searchTicker')} 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-3xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-zinc-500"
                          />
                       </div>
                       
                       <AnimatePresence>
                         {searchResults.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                              className="absolute z-20 w-full mt-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto"
                            >
                              {searchResults.map(c => (
                                 <button 
                                   key={c.symbol}
                                   onClick={() => { setSelectedCrypto(c); setSearchQuery(''); setBuyPrice(allPrices[c.symbol] || 0); }}
                                   className="w-full px-6 py-4 text-left hover:bg-indigo-500/10 flex items-center justify-between border-b border-zinc-100 dark:border-white/5 last:border-0 transition-colors"
                                 >
                                    <div className="flex items-center gap-4">
                                       <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center text-[10px] font-black text-white">{c.symbol}</div>
                                       <span className="text-xs font-black text-zinc-900 dark:text-white">{c.symbol}</span>
                                    </div>
                                    <span className="text-xs font-bold text-zinc-500 tracking-tight">{formatGlobal(allPrices[c.symbol] || 0, globalCurrency, exchangeRates, 'USD', 4)}</span>
                                 </button>
                              ))}
                            </motion.div>
                         )}
                       </AnimatePresence>
                    </div>

                    {selectedCrypto && (
                       <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-[32px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white text-xs font-black">{selectedCrypto.symbol}</div>
                             <div>
                                <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{t('activeAsset') || 'АКТИВ'}</div>
                                <div className="text-lg font-black text-zinc-900 dark:text-white uppercase">{selectedCrypto.name}</div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{t('marketPrice')}</div>
                             <div className="text-xl font-black text-indigo-500">{formatGlobal(buyPrice, globalCurrency, exchangeRates, 'USD', 4)}</div>
                          </div>
                       </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t('investmentSumUsd') || 'СУМА ІНВЕСТИЦІЇ (USD)'}</label>
                          <input 
                             type="number" 
                             value={buyAmountUsd}
                             onChange={e => setBuyAmountUsd(Number(e.target.value))}
                             className="w-full px-6 py-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-3xl text-xl font-black text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t('marketPrice')}</label>
                          <input 
                             type="number" 
                             value={buyPrice}
                             onChange={e => setBuyPrice(Number(e.target.value))}
                             className="w-full px-6 py-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-3xl text-xl font-black text-indigo-500 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                       </div>
                    </div>

                    <button 
                       onClick={handleBuy}
                       disabled={isSaving || !selectedCrypto}
                       className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-[32px] text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                       {isSaving ? t('loading') : t('confirmBuy')}
                    </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
