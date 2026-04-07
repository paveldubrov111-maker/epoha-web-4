import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { RefreshCw, TrendingUp, Wallet, PieChart, Calendar, ChevronRight, Activity, ArrowUpRight, DollarSign, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Currency, Language } from '../../../../types';
import { CFG } from '../../../../constants/config';
import { commonChartOptions } from '../../../../constants/charts';
import { fmt, fmtUsd } from '../../../../utils/format';
import PlannerInput from '../../../ui/PlannerInput';


interface BitbonCalculatorProps {
  language: Language;
  t: (key: string) => string;
  livePrice: number | null;
  isLoadingPrice: boolean;
  priceError: boolean;
  fetchPrice: () => void;
  exchangeRates: Record<string, number>;
}

const BitbonCalculator: React.FC<BitbonCalculatorProps> = ({
  language,
  t,
  livePrice,
  isLoadingPrice,
  priceError,
  fetchPrice,
  exchangeRates
}) => {
  const [bCur, setBCur] = useState<Currency>('USD');
  const [activeSubTab, setActiveSubTab] = useState<'onetime' | 'dca'>('onetime');
  
  const usdRate = exchangeRates['UAH'] || 40;

  // One-time State
  const [bSum, setBSum] = useState(1000);
  const [bUsdRate, setBUsdRate] = useState(exchangeRates['USD'] || 40);
  const [bPrice, setBPrice] = useState(livePrice || 0.45);
  const [bFee, setBFee] = useState(0);
  const [fPrice, setFPrice] = useState(2.0);
  const [fYears, setFYears] = useState(3);
  const [bDepRate, setBDepRate] = useState(5);

  // DCA State
  const [mInit, setMInit] = useState(1000);
  const [mBuy, setMBuy] = useState(100);
  const [mPrice, setMPrice] = useState(livePrice || 0.45);
  const [mFee, setMFee] = useState(0);
  const [mYears, setMYears] = useState(3);
  const [mUsdRate, setMUsdRate] = useState(exchangeRates['USD'] || 40);
  const [mTarget, setMTarget] = useState(2.0);
  const [bCalcPension, setBCalcPension] = useState(false);
  const [bPensionYears, setBPensionYears] = useState(25);
  const [bPensionExpenses, setBPensionExpenses] = useState(2000);
  const [bPensionReturn, setBPensionReturn] = useState(5);



  const handleCurSwitch = (newCur: Currency) => {
    if (newCur === bCur) return;
    if (newCur === 'UAH') {
      setBSum(Math.round(bSum * usdRate));
      setMInit(Math.round(mInit * usdRate));
      setMBuy(Math.round(mBuy * usdRate));
      setBPensionExpenses(Math.round(bPensionExpenses * usdRate));
    } else {
      setBSum(Math.round(bSum / usdRate));
      setMInit(Math.round(mInit / usdRate));
      setMBuy(Math.round(mBuy / usdRate));
      setBPensionExpenses(Math.round(bPensionExpenses / usdRate));
    }
    setBCur(newCur);
  };

  const chartIdSuffix = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  // Sync price when livePrice changes
  React.useEffect(() => {
    if (livePrice) {
      setBPrice(prev => prev === 0.45 ? livePrice : prev);
      setMPrice(prev => prev === 0.45 ? livePrice : prev);
    }
  }, [livePrice]);

  const bData = useMemo(() => {
    const sumU = bCur === 'USD' ? bSum : bSum / bUsdRate;
    const tokens = (sumU * (1 - bFee / 100)) / bPrice;
    const bzUsd = sumU / tokens;
    const capitalUsd = tokens * fPrice;
    const profitUsd = capitalUsd - sumU;
    const roi = sumU > 0 ? (profitUsd / sumU) * 100 : 0;
    const depositUsd = sumU * Math.pow(1 + bDepRate / 100, fYears);
    const vsUsd = capitalUsd - depositUsd;

    const labels = [];
    const erbbLine = [];
    const baseLine = [];
    const depLine = [];
    for (let i = 0; i <= fYears; i++) {
        labels.push(i.toString());
        erbbLine.push(tokens * (bPrice + (fPrice - bPrice) * (i / fYears)));
        baseLine.push(tokens * bPrice * Math.pow(1.2, i));
        depLine.push(sumU * Math.pow(1 + bDepRate / 100, i));
    }

    const toDisp = (v: number) => bCur === 'USD' ? v : v * bUsdRate;

    return { tokens, bzUsd, capitalUsd, profitUsd, roi, depositUsd, vsUsd, labels, erbbLine, baseLine, depLine, toDisp, sumUsd: sumU, uniq: [0.35, 0.45, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0] };
  }, [bSum, bUsdRate, bPrice, bFee, fPrice, fYears, bDepRate, bCur]);

  const mData = useMemo(() => {
    const initU = bCur === 'USD' ? mInit : mInit / mUsdRate;
    const buyU = bCur === 'USD' ? mBuy : mBuy / mUsdRate;
    const totalMonths = mYears * 12;

    let totalTok = (initU * (1 - mFee / 100)) / mPrice;
    let totalInv = initU;
    const labels = ['0'];
    const pL = [totalTok * mPrice];
    const iL = [totalInv];
    // Dynamic price starts at mPrice and grows to mTarget
    const tL = [totalTok * mPrice];
    const tableData = [{ year: 0, inv: totalInv, tok: totalTok, cur: totalTok * mPrice, tgt: totalTok * mPrice, prf: 0 }];

    for (let y = 1; y <= mYears; y++) {
      for (let m = 1; m <= 12; m++) {
        const currentMonth = (y - 1) * 12 + m;
        const currentPrice = mPrice + (mTarget - mPrice) * (currentMonth / totalMonths);
        totalTok += (buyU * (1 - mFee / 100)) / currentPrice;
        totalInv += buyU;
      }
      const currentYearPrice = mPrice + (mTarget - mPrice) * (y / mYears);
      labels.push(y.toString());
      pL.push(totalTok * mPrice);
      iL.push(totalInv);
      tL.push(totalTok * currentYearPrice);
      tableData.push({ year: y, inv: totalInv, tok: totalTok, cur: totalTok * mPrice, tgt: totalTok * currentYearPrice, prf: totalTok * currentYearPrice - totalInv });
    }

    const toDisp = (v: number) => bCur === 'USD' ? v : v * mUsdRate;
    return { labels, pL, iL, tL, tableData, finalTok: totalTok, finalInv: totalInv, curVal: totalTok * mPrice, capUsd: totalTok * mTarget, profitUsd: totalTok * mTarget - totalInv, roi: totalInv > 0 ? ((totalTok * mTarget - totalInv) / totalInv * 100) : 0, avgP: totalInv / totalTok, toDisp };
  }, [mInit, mBuy, mPrice, mFee, mYears, mUsdRate, mTarget, bCur]);

  const glassStyle = "bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 shadow-xl shadow-black/5";
  const accentCardStyle = "bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 dark:border-indigo-400/20 shadow-lg shadow-indigo-500/5";

  return (
    <div className="space-y-8">


      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-1">
        <div className="flex items-center gap-4 bg-zinc-100/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 w-fit">
          {(['USD', 'UAH'] as Currency[]).map(c => (
            <button
              key={c}
              onClick={() => handleCurSwitch(c)}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                bCur === c 
                ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-md ring-1 ring-black/5' 
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {c === 'USD' ? t('curUsd') : t('curUah')}
            </button>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-4 px-6 py-3 rounded-2xl ${glassStyle} flex-1 max-w-md`}
        >
          <div className="flex -space-x-1">
            <span className={`w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${isLoadingPrice ? 'bg-amber-400 animate-pulse' : priceError ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{t('livePrice')}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                ERBB: {livePrice ? fmtUsd(livePrice) : '...'}
              </span>
              <span className="text-xs text-zinc-400">/</span>
              <span className="text-sm font-semibold text-zinc-500">
                {livePrice ? fmt(livePrice * (exchangeRates['UAH'] || 40), 'UAH') : '...'}
              </span>
            </div>
          </div>
          <button
            onClick={fetchPrice}
            className="ml-auto p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPrice ? 'animate-spin' : ''}`} />
          </button>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 w-fit">
        {[
          { id: 'onetime', label: t('onetimeBuy'), icon: Wallet },
          { id: 'dca', label: t('dcaBuy'), icon: Calendar }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`relative flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-500 ${
              activeSubTab === tab.id 
                ? 'text-indigo-600 dark:text-indigo-300' 
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'
            }`}
          >
            {activeSubTab === tab.id && (
              <motion.div
                layoutId="activeSubTab"
                className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-xl shadow-sm ring-1 ring-black/5"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <tab.icon className={`w-4 h-4 relative z-10 ${activeSubTab === tab.id ? 'text-indigo-500' : ''}`} />
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="grid lg:grid-cols-[400px_1fr] gap-8"
        >
          {/* Inputs Section */}
          <div className="space-y-6">
            <div className={`p-6 rounded-3xl ${glassStyle}`}>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                  <Activity className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200">{t('inputParams')}</h3>
              </div>
              
              {activeSubTab === 'onetime' ? (
                <>
                  <PlannerInput label={t('invSum')} value={bSum} onChange={setBSum} symbol={CFG[bCur].sym} />
                  <PlannerInput label={t('usdRate')} value={bUsdRate} onChange={setBUsdRate} symbol="₴" />
                  <PlannerInput label={t('erbbPrice')} value={bPrice} onChange={setBPrice} symbol="$" />
                  <PlannerInput label={t('fee')} value={bFee} onChange={setBFee} suffix="%" />
                </>
              ) : (
                <>
                  <PlannerInput label={t('startCapital')} value={mInit} onChange={setMInit} symbol={CFG[bCur].sym} />
                  <PlannerInput label={t('monthlyBuy')} value={mBuy} onChange={setMBuy} symbol={CFG[bCur].sym} />
                  <PlannerInput label={t('erbbPrice')} value={mPrice} onChange={setMPrice} symbol="$" />
                  <PlannerInput label={t('accumPeriod')} value={mYears} onChange={setMYears} suffix={mYears === 1 ? t('yearAcc') : mYears < 5 ? t('yearsAcc') : t('yearsPlural')} />
                  <PlannerInput label={t('targetErbbPrice')} value={mTarget} onChange={setMTarget} symbol="$" />

                  {/* Pension Toggle */}
                  <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button 
                      onClick={() => setBCalcPension(!bCalcPension)}
                      className="flex items-center justify-between w-full p-4 rounded-2xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{t('pensionPlanning')}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">Розрахунок виходу на спокій</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${bCalcPension ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${bCalcPension ? 'left-6' : 'left-1'}`}></div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {bCalcPension && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-4 pt-4"
                        >
                          <PlannerInput 
                            label={t('pensionExpensesBitbon')} 
                            value={bPensionExpenses} 
                            onChange={setBPensionExpenses} 
                            symbol={CFG[bCur].sym} 
                          />
                          <PlannerInput 
                            label={t('pensionReturnBitbon')} 
                            value={bPensionReturn} 
                            onChange={setBPensionReturn} 
                            suffix="%" 
                          />
                          <PlannerInput 
                            label={t('pensionYears')} 
                            value={bPensionYears} 
                            onChange={setBPensionYears} 
                            suffix={t('yearsPlural')} 
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>

            {activeSubTab === 'onetime' && (
              <div className={`p-6 rounded-3xl ${glassStyle}`}>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-zinc-800 dark:text-zinc-200">{t('futureCapitalForecast')}</h3>
                </div>
                <PlannerInput label={t('futureErbbPrice')} value={fPrice} onChange={setFPrice} symbol="$" />
                <PlannerInput label={t('planHorizon')} value={fYears} onChange={setFYears} suffix={fYears === 1 ? t('yearAcc') : fYears < 5 ? t('yearsAcc') : t('yearsPlural')} />
                <PlannerInput label={t('depRate')} value={bDepRate} onChange={setBDepRate} suffix="%" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-5 rounded-3xl ${glassStyle} relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <PieChart className="w-12 h-12" />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">{activeSubTab === 'onetime' ? t('erbbBought') : t('accumulatedErbb')}</div>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {activeSubTab === 'onetime' ? bData.tokens.toFixed(2) : mData.finalTok.toFixed(2)}
                </div>
                <div className="text-xs text-zinc-400 mt-1 font-medium">ERBB Units</div>
              </div>
              <div className={`p-5 rounded-3xl ${glassStyle} relative overflow-hidden group`}>
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ArrowUpRight className="w-12 h-12" />
                </div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">{activeSubTab === 'onetime' ? t('breakeven') : t('avgBuyPrice')}</div>
                <div className="text-2xl font-black text-zinc-800 dark:text-zinc-100">
                  {fmtUsd(activeSubTab === 'onetime' ? bData.bzUsd : mData.avgP)}
                </div>
                <div className="text-xs text-zinc-400 mt-1 font-medium">Target Price/Unit</div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`p-8 rounded-[40px] ${accentCardStyle} relative overflow-hidden`}>
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-black mb-2">
                      {activeSubTab === 'onetime' 
                        ? `${t('ptfValueAfter')} ${fYears} ${fYears === 1 ? t('yearAcc') : fYears < 5 ? t('yearsAcc') : t('yearsPlural')}`
                        : t('ptfValueAtTarget')}
                    </h4>
                    <div className="text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
                      {activeSubTab === 'onetime' ? fmt(bData.toDisp(bData.capitalUsd), bCur) : fmt(mData.toDisp(mData.capUsd), bCur)}
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end">
                    <div className="p-4 bg-white/50 dark:bg-zinc-800/50 rounded-2xl backdrop-blur-md border border-white/50 dark:border-zinc-700/50">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Total ROI</div>
                      <div className="text-xl font-black text-emerald-500">
                        +{(activeSubTab === 'onetime' ? bData.roi : mData.roi).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 border-t border-indigo-500/10 pt-8">
                  <div>
                    <div className="text-[11px] text-indigo-600/60 dark:text-indigo-400/60 font-bold uppercase mb-2 leading-none">{t('profit')}</div>
                    <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                      +{fmt((activeSubTab === 'onetime' ? bData.toDisp(bData.profitUsd) : mData.toDisp(mData.profitUsd)), bCur)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 font-bold uppercase mb-2 leading-none">{t('investedNow')}</div>
                    <div className="text-2xl font-bold text-zinc-700 dark:text-zinc-400">
                      {fmt((activeSubTab === 'onetime' ? bData.toDisp(bData.sumUsd) : mData.toDisp(mData.finalInv)), bCur)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {activeSubTab === 'dca' && bCalcPension && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`p-6 rounded-[32px] ${glassStyle} border-emerald-500/20 relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5">
                    <Shield className="w-24 h-24 text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                      <Shield className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-200">{t('pensionPlanning')}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                      <p className="text-[10px] uppercase font-black text-emerald-600/70 mb-1">Щомісячний чек</p>
                      <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                        {fmt(mData.toDisp((mData.capUsd * (bPensionReturn/100)) / 12), bCur)}
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                      <p className="text-[10px] uppercase font-black text-indigo-600/70 mb-1">Достатність капіталу</p>
                      <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                        {((mData.capUsd * (bPensionReturn/100) / 12) / (bCur === 'USD' ? bPensionExpenses : bPensionExpenses / usdRate) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                      При капіталі {fmt(mData.toDisp(mData.capUsd), bCur)} та дохідності {bPensionReturn}% річних, 
                      ваш портфель зможе генерувати пасивний дохід протягом {bPensionYears} років.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {activeSubTab === 'onetime' && (
              <div className={`p-6 rounded-3xl ${glassStyle} flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase leading-tight">{t('altDeposit')}</div>
                    <div className="text-lg font-bold">{fmt(bData.toDisp(bData.depositUsd), bCur)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase leading-tight">{t('erbbVsDep')}</div>
                  <div className={`text-lg font-black ${bData.vsUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {bData.vsUsd >= 0 ? '+' : ''}{fmt(bData.toDisp(bData.vsUsd), bCur)}
                  </div>
                </div>
              </div>
            )}

            <div className={`p-8 rounded-[40px] ${glassStyle}`}>
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-xl text-zinc-800 dark:text-zinc-200">
                  {activeSubTab === 'onetime' ? t('growthForecast') : t('dcaForecast')}
                </h3>
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                   <div className="text-[10px] font-bold px-3 text-zinc-500 uppercase tracking-widest">{activeSubTab === 'onetime' ? fYears : mYears} {t('yearsPlural')}</div>
                </div>
              </div>

              <div className="h-[380px] w-full relative mb-6">
                <Line
                  id={`bitbon-calc-chart-${activeSubTab}-${chartIdSuffix}`}
                  key={`bitbon-calc-chart-${activeSubTab}-${chartIdSuffix}`}
                  data={{
                    labels: activeSubTab === 'onetime' ? bData.labels : mData.labels,
                    datasets: activeSubTab === 'onetime' ? [
                      {
                        label: t('erbbYourForecast'),
                        data: bData.erbbLine,
                        borderColor: '#6366f1',
                        backgroundColor: (ctx: any) => {
                          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
                          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                          return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        borderWidth: 3,
                        pointBackgroundColor: '#6366f1',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2
                      },
                      {
                        label: t('erbbBaseForecast'),
                        data: bData.baseLine,
                        borderColor: '#10b981',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2,
                        borderDash: [5, 5]
                      },
                      {
                        label: t('deposit'),
                        data: bData.depLine,
                        borderColor: '#f59e0b',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2,
                        borderDash: [2, 4]
                      }
                    ] : [
                      {
                        label: t('valueAtTarget'),
                        data: mData.tL,
                        borderColor: '#6366f1',
                        backgroundColor: (ctx: any) => {
                          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
                          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                          return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        borderWidth: 3
                      },
                      {
                        label: t('investedLine'),
                        data: mData.iL,
                        borderColor: '#10b981',
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2
                      }
                    ]
                  }}
                  options={{
                    ...commonChartOptions,
                    plugins: {
                      ...commonChartOptions.plugins,
                      tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        cornerRadius: 12,
                        callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.parsed.y, bCur)}` }
                      },
                      legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                          usePointStyle: true,
                          pointStyle: 'circle',
                          padding: 20,
                          font: { size: 11, weight: 'bold' },
                          color: '#71717a'
                        }
                      }
                    },
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                      x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { font: { size: 11, weight: 'bold' }, color: '#a1a1aa' }
                      },
                      y: {
                        grid: { color: 'rgba(161, 161, 170, 0.1)' },
                        border: { display: false },
                        ticks: {
                          font: { size: 11, weight: 'bold' },
                          color: '#a1a1aa',
                          callback: (v) => {
                            const val = Number(v);
                            const s = val >= 1000 ? Math.round(val / 1000) + 'k' : val;
                            return CFG[bCur].sym + s;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>

              {activeSubTab === 'onetime' && (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="py-4 px-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('priceErbb')}</th>
                        <th className="py-4 px-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('ptfValueTitle')}</th>
                        <th className="py-4 px-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">{t('profit')} (ROI)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {bData.uniq.map((np, idx) => {
                        const portUsd = bData.tokens * np;
                        const profU = portUsd - bData.sumUsd;
                        const r = bData.sumUsd > 0 ? ((portUsd - bData.sumUsd) / bData.sumUsd * 100).toFixed(1) : '0';
                        return (
                          <tr key={idx} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                            <td className="py-3 px-3 font-bold text-zinc-800 dark:text-zinc-200">{fmtUsd(np)}</td>
                            <td className="py-3 px-3 font-semibold text-zinc-600 dark:text-zinc-400">{fmt(bData.toDisp(portUsd), bCur)}</td>
                            <td className="py-3 px-3 text-right">
                              <span className={`inline-flex items-center gap-1.5 font-black ${profU >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {profU >= 0 ? '+' : ''}{fmt(bData.toDisp(profU), bCur)}
                                <span className="text-[10px] opacity-70">({profU >= 0 ? '+' : ''}{r}%)</span>
                              </span>
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default BitbonCalculator;
