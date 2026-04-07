import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Calculator, PieChart, Info, Shield, Target, Plus, ArrowUpRight, Activity } from 'lucide-react';
import { Currency, Language } from '../../../../types';
import { CFG } from '../../../../constants/config';
import { commonChartOptions } from '../../../../constants/charts';
import { fmt } from '../../../../utils/format';
import PlannerInput from '../../../ui/PlannerInput';
import HistoricalPresets, { Preset } from '../../../ui/HistoricalPresets';
import HistoricalTimeline from '../../../ui/HistoricalTimeline';

interface CompoundCalculatorProps {
  language: Language;
  t: (key: string) => string;
  exchangeRates: Record<string, number>;
}

const CompoundCalculator: React.FC<CompoundCalculatorProps> = ({ language, t, exchangeRates }) => {
  const chartIdSuffix = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  const [cCur, setCCur] = useState<Currency>('USD');
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [cPrincipal, setCPrincipal] = useState(1000);
  const [cRate, setCRate] = useState(8);
  const [cYears, setCYears] = useState(20);
  const [cMonthly, setCMonthly] = useState(100);
  const [cContributionFreq, setCContributionFreq] = useState<'monthly' | 'yearly'>('monthly');
  const [cReturnMode, setCReturnMode] = useState<'template' | 'manual'>('template');
  const [cInflation, setCInflation] = useState(3);
  const [cContributionGrowth, setCContributionGrowth] = useState(3);
  const [cTaxRate, setCTaxRate] = useState(0);
  const [cRiskProfile, setCRiskProfile] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [cChartType, setCChartType] = useState<'nominal' | 'real'>('nominal');
  const [cCalcPension, setCCalcPension] = useState(false);
  const [cPensionYears, setCPensionYears] = useState(25);
  const [cPensionExpenses, setCPensionExpenses] = useState(2000);
  const [cPensionReturn, setCPensionReturn] = useState(5);

  const usdRate = exchangeRates['UAH'] || 40;

  const handleCurSwitch = (newCur: Currency) => {
    if (newCur === cCur) return;
    if (newCur === 'UAH') {
      setCPrincipal(Math.round(cPrincipal * usdRate));
      setCMonthly(Math.round(cMonthly * usdRate));
      setCPensionExpenses(Math.round(cPensionExpenses * usdRate));
    } else {
      setCPrincipal(Math.round(cPrincipal / usdRate));
      setCMonthly(Math.round(cMonthly / usdRate));
      setCPensionExpenses(Math.round(cPensionExpenses / usdRate));
    }
    setCCur(newCur);
  };

  const cData = useMemo(() => {
    let currentNom = cPrincipal;
    let currentReal = cPrincipal;
    let currentInv = cPrincipal;
    const labels = ['0'];
    const comp = [cPrincipal];
    const real = [cPrincipal];
    const inv = [cPrincipal];

    const monthlyRate = Math.pow(1 + cRate / 100, 1 / 12) - 1;
    const monthlyInf = Math.pow(1 + cInflation / 100, 1 / 12) - 1;
    const monthlyCG = Math.pow(1 + cContributionGrowth / 100, 1 / 12) - 1;

    for (let y = 1; y <= cYears; y++) {
      for (let m = 1; m <= 12; m++) {
        currentNom *= (1 + monthlyRate);
        currentReal *= (1 + monthlyRate) / (1 + monthlyInf);
        
        const cont = (cContributionFreq === 'monthly') ? cMonthly : (m === 12 ? cMonthly : 0);
        const actualCont = cont * Math.pow(1 + monthlyCG, (y - 1) * 12 + m - 1);
        
        currentNom += actualCont;
        currentReal += actualCont / Math.pow(1 + monthlyInf, (y - 1) * 12 + m);
        currentInv += actualCont;
      }
      labels.push(y.toString());
      comp.push(Math.round(currentNom));
      real.push(Math.round(currentReal));
      inv.push(Math.round(currentInv));
    }

    return { labels, comp, real, inv, fin: currentNom, finReal: currentReal, totalInv: currentInv };
  }, [cPrincipal, cRate, cYears, cMonthly, cContributionFreq, cInflation, cContributionGrowth, cTaxRate]);

  const glassStyle = "bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 shadow-xl shadow-black/5";
  const accentCardStyle = "bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 border border-indigo-500/20 dark:border-indigo-400/20 shadow-lg shadow-indigo-500/5";

  return (
    <div className="space-y-8">
      {/* Historical Presets Section */}
      <HistoricalPresets t={t} onSelect={(p) => {
        setCRate(p.cagr);
        setCYears(p.years);
        setCReturnMode('manual');
        setSelectedPreset(p);
      }} />

      <AnimatePresence mode="wait">
        {selectedPreset && (
          <motion.div
            key={selectedPreset.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`p-8 rounded-[40px] ${glassStyle} mb-8`}>
              <HistoricalTimeline 
                preset={selectedPreset} 
                t={t} 
                principal={cPrincipal} 
                monthly={cMonthly} 
                currency={cCur} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-1">
        <div className="flex items-center gap-4 bg-zinc-100/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 w-fit">
          {(['USD', 'UAH'] as Currency[]).map(c => (
            <button
              key={c}
              onClick={() => handleCurSwitch(c)}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                cCur === c 
                ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-md ring-1 ring-black/5' 
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {c === 'USD' ? t('curUsd') : t('curUah')}
            </button>
          ))}
        </div>

        <div className={`flex items-center gap-4 p-1.5 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 w-fit`}>
           <button 
             onClick={() => setCChartType('nominal')}
             className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${cChartType === 'nominal' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
           >
             {t('nominalLabel')}
           </button>
           <button 
             onClick={() => setCChartType('real')}
             className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${cChartType === 'real' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
           >
             {t('realLabel')}
           </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-8">
        {/* Left Side: Inputs */}
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                <Calculator className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="font-bold text-zinc-800 dark:text-zinc-200">{t('inputParams')}</h3>
            </div>
            
            <PlannerInput label={t('planHorizon')} value={cYears} onChange={setCYears} suffix={cYears === 1 ? t('yearAcc') : cYears < 5 ? t('yearsAcc') : t('yearsPlural')} />
            <PlannerInput label={t('startCapital')} value={cPrincipal} onChange={setCPrincipal} symbol={CFG[cCur].sym} />
            <PlannerInput label={t('regTopUp')} value={cMonthly} onChange={setCMonthly} symbol={CFG[cCur].sym} />
            
            <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800/50">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">{t('topUpFreq')}</label>
              <select 
                value={cContributionFreq} 
                onChange={(e) => setCContributionFreq(e.target.value as any)}
                className="w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="monthly">{t('monthly')}</option>
                <option value="yearly">{t('yearly')}</option>
              </select>
            </div>
          </div>

          <div className={`p-6 rounded-3xl ${glassStyle}`}>
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl mb-6">
              <button 
                onClick={() => setCReturnMode('template')}
                className={`flex-1 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all duration-300 ${cReturnMode === 'template' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                {t('ptfTemplate')}
              </button>
              <button 
                onClick={() => setCReturnMode('manual')}
                className={`flex-1 text-[10px] font-black uppercase tracking-wider py-2 rounded-lg transition-all duration-300 ${cReturnMode === 'manual' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                {t('manualReturn')}
              </button>
            </div>

            {cReturnMode === 'manual' ? (
              <PlannerInput label={t('expReturn')} value={cRate} onChange={setCRate} suffix="%" />
            ) : (
              <div className="flex items-center justify-between py-3">
                <label className="text-sm text-zinc-600 dark:text-zinc-400">{t('riskProfile')}</label>
                <select 
                  value={cRiskProfile} 
                  onChange={(e) => {
                    setCRiskProfile(e.target.value as any);
                    if (e.target.value === 'conservative') setCRate(5);
                    if (e.target.value === 'moderate') setCRate(8);
                    if (e.target.value === 'aggressive') setCRate(12);
                  }}
                  className="w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="conservative">{t('riskCons')}</option>
                  <option value="moderate">{t('riskMod')}</option>
                  <option value="aggressive">{t('riskAgg')}</option>
                </select>
              </div>
            )}
          </div>

          <div className={`p-6 rounded-3xl ${glassStyle}`}>
            <PlannerInput label={t('inflation')} value={cInflation} onChange={setCInflation} suffix="%" />
            <PlannerInput label={t('topUpGrowth')} value={cContributionGrowth} onChange={setCContributionGrowth} suffix="%" />
            <PlannerInput label={t('taxRate')} value={cTaxRate} onChange={setCTaxRate} suffix="%" />
          </div>

          <div className={`p-6 rounded-3xl ${glassStyle}`}>
            <label className="flex items-center justify-between cursor-pointer mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <PieChart className="w-4 h-4 text-indigo-500" />
                </div>
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{t('calcPension')}</span>
              </div>
              <div className="relative">
                <input type="checkbox" className="hidden" checked={cCalcPension} onChange={(e) => setCCalcPension(e.target.checked)} />
                <div className={`w-10 h-5 rounded-full border border-zinc-200 dark:border-zinc-700 transition-colors ${cCalcPension ? 'bg-indigo-500' : 'bg-transparent'}`}>
                  <motion.div 
                    animate={{ x: cCalcPension ? 20 : 2 }}
                    className="mt-0.5 w-[14px] h-[14px] bg-white dark:bg-zinc-200 rounded-full shadow-sm"
                  />
                </div>
              </div>
            </label>
            <AnimatePresence>
              {cCalcPension && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-1 pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4"
                >
                  <PlannerInput label={t('pensionYears')} value={cPensionYears} onChange={setCPensionYears} suffix={t('yearsPlural')} />
                  <PlannerInput label={t('regExpenses')} value={cPensionExpenses} onChange={setCPensionExpenses} symbol={CFG[cCur].sym} />
                  <PlannerInput label={t('ptfReturn')} value={cPensionReturn} onChange={setCPensionReturn} suffix="%" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: Results & Chart */}
        <div className="space-y-6">
          {/* Main Result Card */}
          <div className={`p-8 rounded-[40px] ${accentCardStyle} relative overflow-hidden`}>
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-black mb-2 leading-none">
                    {t('nomValAfter')} {cYears} {cYears === 1 ? t('yearAcc') : cYears < 5 ? t('yearsAcc') : t('yearsPlural')}
                  </h4>
                  <div className="text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {fmt(cData.fin, cCur)}
                  </div>
                </div>
                <div className="hidden sm:block">
                   <div className="p-4 bg-white/50 dark:bg-zinc-800/50 rounded-2xl backdrop-blur-md border border-white/50 dark:border-zinc-700/50">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{t('realVal')}</div>
                      <div className="text-xl font-black text-emerald-500">
                        {fmt(cData.finReal, cCur)}
                      </div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 border-t border-indigo-500/10 pt-8">
                <div>
                  <div className="text-[11px] text-indigo-600/60 dark:text-indigo-400/60 font-bold uppercase mb-2 leading-none">{t('expReturn')}</div>
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                    {cRate}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500 font-bold uppercase mb-2 leading-none">{t('investedLine')}</div>
                  <div className="text-2xl font-bold text-zinc-700 dark:text-zinc-400">
                    {fmt(cData.totalInv, cCur)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Risks & Assets Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className={`p-6 rounded-3xl ${glassStyle}`}>
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-amber-500/10 rounded-xl">
                      <Shield className="w-5 h-5 text-amber-500" />
                   </div>
                   <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{t('risks')}</h4>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-medium">{t('portfolioRisk')}</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{cRiskProfile === 'conservative' ? '4.5%' : cRiskProfile === 'moderate' ? '9.2%' : '14.26%'}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-medium">{t('maxDrawdown')}</span>
                      <span className="font-bold text-rose-500">{cRiskProfile === 'conservative' ? '-8.5%' : cRiskProfile === 'moderate' ? '-15.4%' : '-27.68%'}</span>
                   </div>
                </div>
             </div>

             <div className={`p-6 rounded-3xl ${glassStyle}`}>
                <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-blue-500/10 rounded-xl">
                      <Activity className="w-5 h-5 text-blue-500" />
                   </div>
                   <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{t('efficiency')}</h4>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-medium">{t('yieldMultiple')}</span>
                      <span className="font-bold text-emerald-500">{(cData.fin / cData.totalInv).toFixed(2)}x</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-medium">{t('annualGrowthAvg')}</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">~{cRate}%</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Chart Card */}
          <div className={`p-8 rounded-[40px] ${glassStyle}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h3 className="font-black text-xl text-zinc-800 dark:text-zinc-200">{t('pensionPlanning')}</h3>
              <div className="flex items-center gap-4 text-[11px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 rounded-xl">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>{t('compoundInterest')}</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{t('totalInv')}</span>
              </div>
            </div>

            <div className="h-[400px] w-full relative">
              <Line
                id={`compound-calc-chart-${chartIdSuffix}`}
                key={`compound-calc-chart-${chartIdSuffix}`}
                data={{
                  labels: cData.labels,
                  datasets: [
                    {
                      label: cChartType === 'nominal' ? t('compoundNom') : t('compoundReal'),
                      data: cChartType === 'nominal' ? cData.comp : cData.real,
                      borderColor: '#6366f1',
                      backgroundColor: (ctx: any) => {
                          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
                          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                          return gradient;
                      },
                      fill: true,
                      tension: 0.4,
                      pointRadius: 0,
                      pointHoverRadius: 6,
                      borderWidth: 3
                    },
                    {
                      label: t('investedLine'),
                      data: cData.inv,
                      borderColor: '#10b981',
                      backgroundColor: 'rgba(16, 185, 129, 0.05)',
                      fill: true,
                      tension: 0.4,
                      pointRadius: 0,
                      borderWidth: 2,
                      borderDash: [5, 5]
                    }
                  ]
                }}
                options={{
                  ...commonChartOptions,
                  plugins: {
                    ...commonChartOptions.plugins,
                    tooltip: {
                      backgroundColor: 'rgba(0,0,0,0.85)',
                      padding: 12,
                      cornerRadius: 12,
                      callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.parsed.y, cCur)}` }
                    },
                    legend: { display: false }
                  },
                  interaction: { mode: 'index', intersect: false },
                  scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, weight: 'bold' }, color: '#a1a1aa' }
                    },
                    y: {
                        grid: { color: 'rgba(161, 161, 170, 0.08)' },
                        ticks: {
                            font: { size: 10, weight: 'bold' },
                            color: '#a1a1aa',
                            callback: (v) => {
                                const val = Number(v);
                                const s = val >= 1000 ? Math.round(val / 1000) + 'k' : val;
                                return CFG[cCur].sym + s;
                            }
                        }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompoundCalculator;
