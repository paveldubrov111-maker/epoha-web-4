import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Currency, Language } from '../../../../types';
import { CFG } from '../../../../constants/config';
import { commonChartOptions } from '../../../../constants/charts';
import { fmt } from '../../../../utils/format';
import PlannerInput from '../../../ui/PlannerInput';

interface CompoundCalculatorProps {
  language: Language;
  t: (key: string) => string;
}

const CompoundCalculator: React.FC<CompoundCalculatorProps> = ({ language, t }) => {
  const chartIdSuffix = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  const [cCur, setCCur] = useState<Currency>('USD');
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

  return (
    <div className="lg:grid lg:grid-cols-[380px_1fr] gap-8 items-start">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs text-zinc-500">{t('currency')}:</span>
          {(['USD', 'UAH'] as Currency[]).map(c => (
            <button
              key={c}
              onClick={() => setCCur(c)}
              className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors ${
                cCur === c ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              {c === 'USD' ? '$ Долар' : '₴ Гривня'}
            </button>
          ))}
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <PlannerInput label="Горизонт планування" value={cYears} onChange={setCYears} suffix="років" />
          <PlannerInput label="Стартовий капітал" value={cPrincipal} onChange={setCPrincipal} symbol={CFG[cCur].sym} />
          <PlannerInput label="Регулярне поповнення" value={cMonthly} onChange={setCMonthly} symbol={CFG[cCur].sym} />
          <div className="flex items-center justify-between py-3">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">Частота поповнень</label>
            <select 
              value={cContributionFreq} 
              onChange={(e) => setCContributionFreq(e.target.value as any)}
              className="w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="monthly">Щомісячно</option>
              <option value="yearly">Щорічно</option>
            </select>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex bg-zinc-200/50 dark:bg-zinc-900/50 p-1 rounded-lg mb-4">
            <button 
              onClick={() => setCReturnMode('template')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${cReturnMode === 'template' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Шаблон портфеля
            </button>
            <button 
              onClick={() => setCReturnMode('manual')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${cReturnMode === 'manual' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Дохідність вручну
            </button>
          </div>
          {cReturnMode === 'manual' ? (
            <PlannerInput label="Очікувана дохідність" value={cRate} onChange={setCRate} suffix="%" />
          ) : (
            <div className="flex items-center justify-between py-3">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Ризик-профіль</label>
              <select 
                value={cRiskProfile} 
                onChange={(e) => {
                  setCRiskProfile(e.target.value as any);
                  if (e.target.value === 'conservative') setCRate(5);
                  if (e.target.value === 'moderate') setCRate(8);
                  if (e.target.value === 'aggressive') setCRate(12);
                }}
                className="w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="conservative">Консервативний</option>
                <option value="moderate">Помірний</option>
                <option value="aggressive">Агресивний</option>
              </select>
            </div>
          )}
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <PlannerInput label="Рівень інфляції" value={cInflation} onChange={setCInflation} suffix="%" />
          <PlannerInput label="Зростання поповнень" value={cContributionGrowth} onChange={setCContributionGrowth} suffix="%" />
          <PlannerInput label="Податкова ставка" value={cTaxRate} onChange={setCTaxRate} suffix="%" />
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cCalcPension ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${cCalcPension ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm font-medium">Розрахувати пенсію</span>
            <input type="checkbox" className="hidden" checked={cCalcPension} onChange={(e) => setCCalcPension(e.target.checked)} />
          </label>
          {cCalcPension && (
            <div className="space-y-1 pt-2 border-t border-zinc-200 dark:border-zinc-700/50">
              <PlannerInput label="Років пенсії" value={cPensionYears} onChange={setCPensionYears} suffix="років" />
              <PlannerInput label="Періодичні витрати" value={cPensionExpenses} onChange={setCPensionExpenses} symbol={CFG[cCur].sym} />
              <PlannerInput label="Дохідність портфеля" value={cPensionReturn} onChange={setCPensionReturn} suffix="%" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 lg:mt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="text-3xl font-bold mb-1">{fmt(cData.fin, cCur)}</div>
            <div className="text-xs text-zinc-500 mb-4">Номінальна вартість портфеля через {cYears} {cYears === 1 ? 'рік' : cYears < 5 ? 'роки' : 'років'}</div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Очікувана дохідність</span>
              <span className="font-semibold">{cRate}%</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-900/10 dark:to-emerald-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <div className="text-base font-medium mb-4">Ризики</div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Портфельний ризик</span>
                <span className="font-semibold">{cRiskProfile === 'conservative' ? '4.5%' : cRiskProfile === 'moderate' ? '9.2%' : '14.26%'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 dark:text-zinc-400">Максимальна просадка</span>
                <span className="font-semibold">{cRiskProfile === 'conservative' ? '-8.5%' : cRiskProfile === 'moderate' ? '-15.4%' : '-27.68%'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Планування капіталу</h3>
            <div className="flex bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-1">
              <button 
                onClick={() => setCChartType('nominal')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${cChartType === 'nominal' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                Номінальна
              </button>
              <button 
                onClick={() => setCChartType('real')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${cChartType === 'real' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                Реальна
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-[11px] text-zinc-500 mb-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#378ADD]"></span>Складний %</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#639922]"></span>Вкладено</span>
          </div>

          <div className="h-[350px] w-full relative">
            <Line
              id={`compound-calc-line-${chartIdSuffix}`}
              key={`compound-calc-line-${chartIdSuffix}`}
              data={{
                labels: cData.labels,
                datasets: [
                  {
                    label: cChartType === 'nominal' ? 'Складний % (номінал)' : 'Складний % (реальний)',
                    data: cChartType === 'nominal' ? cData.comp : cData.real,
                    borderColor: '#378ADD',
                    backgroundColor: 'rgba(55,138,221,0.12)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    borderWidth: 2
                  },
                  {
                    label: 'Вкладено',
                    data: cData.inv,
                    borderColor: '#639922',
                    backgroundColor: 'rgba(99,153,34,0.10)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    borderWidth: 2,
                    borderDash: [4, 3]
                  }
                ]
              }}
              options={{
                ...commonChartOptions,
                plugins: {
                  ...commonChartOptions.plugins,
                  tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + fmt(c.parsed.y, cCur) } }
                },
                scales: {
                  ...commonChartOptions.scales,
                  y: {
                    ...commonChartOptions.scales?.y,
                    ticks: {
                      ...commonChartOptions.scales?.y?.ticks,
                      callback: (v) => {
                        const val = Number(v);
                        const s = val >= 1000 ? Math.round(val / 1000) + 'к' : val;
                        const c = CFG[cCur];
                        return c.suffix ? s + ' ' + c.sym : c.sym + s;
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
  );
};

export default CompoundCalculator;
