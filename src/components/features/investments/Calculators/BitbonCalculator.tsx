import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { RefreshCw } from 'lucide-react';
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
    let totalTok = (initU * (1 - mFee / 100)) / mPrice;
    let totalInv = initU;
    const labels = ['0'];
    const pL = [totalTok * mPrice];
    const iL = [totalInv];
    const tL = [totalTok * mTarget];
    const tableData = [{ year: 0, inv: totalInv, tok: totalTok, cur: totalTok * mPrice, tgt: totalTok * mTarget, prf: totalTok * mTarget - totalInv }];

    for (let y = 1; y <= mYears; y++) {
      for (let m = 1; m <= 12; m++) {
        totalTok += (buyU * (1 - mFee / 100)) / mPrice;
        totalInv += buyU;
      }
      labels.push(y.toString());
      pL.push(totalTok * mPrice);
      iL.push(totalInv);
      tL.push(totalTok * mTarget);
      tableData.push({ year: y, inv: totalInv, tok: totalTok, cur: totalTok * mPrice, tgt: totalTok * mTarget, prf: totalTok * mTarget - totalInv });
    }

    const toDisp = (v: number) => bCur === 'USD' ? v : v * mUsdRate;
    return { labels, pL, iL, tL, tableData, finalTok: totalTok, finalInv: totalInv, curVal: totalTok * mPrice, capUsd: totalTok * mTarget, profitUsd: totalTok * mTarget - totalInv, roi: totalInv > 0 ? ((totalTok * mTarget - totalInv) / totalInv * 100) : 0, avgP: totalInv / totalTok, toDisp };
  }, [mInit, mBuy, mPrice, mFee, mYears, mUsdRate, mTarget, bCur]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">Показувати в:</span>
          {(['USD', 'UAH'] as Currency[]).map(c => (
            <button
              key={c}
              onClick={() => setBCur(c)}
              className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors ${
                bCur === c ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              {c === 'USD' ? '$ Долар' : '₴ Гривня'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-4 py-2 flex-1 min-w-[240px]">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLoadingPrice ? 'bg-yellow-500 animate-pulse' : priceError ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            ERBB/USD: <b className="text-zinc-900 dark:text-zinc-100 font-medium">{livePrice ? fmtUsd(livePrice) : (priceError ? 'недоступно' : 'завантаження...')}</b>
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            ERBB/₴: <b className="text-zinc-900 dark:text-zinc-100 font-medium">{livePrice ? fmt(livePrice * (exchangeRates['UAH'] || 40), 'UAH') : '...'}</b>
          </span>
          <button
            onClick={fetchPrice}
            className="ml-auto px-3 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingPrice ? 'animate-spin' : ''}`} /> Оновити
          </button>
        </div>
      </div>

      <div className="flex overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 w-fit mb-6">
        <button
          onClick={() => setActiveSubTab('onetime')}
          className={`px-5 py-2 text-sm font-medium transition-colors border-r border-zinc-200 dark:border-zinc-700 last:border-r-0 ${
            activeSubTab === 'onetime'
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              : 'bg-transparent text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          💰 Одноразова купівля
        </button>
        <button
          onClick={() => setActiveSubTab('dca')}
          className={`px-5 py-2 text-sm font-medium transition-colors border-r border-zinc-200 dark:border-zinc-700 last:border-r-0 ${
            activeSubTab === 'dca'
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              : 'bg-transparent text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          🔄 Щомісячна купівля (DCA)
        </button>
      </div>

      {activeSubTab === 'onetime' ? (
        <div className="lg:grid lg:grid-cols-[380px_1fr] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <PlannerInput label={`Сума інвестиції`} value={bSum} onChange={setBSum} symbol={CFG[bCur].sym} />
              <PlannerInput label="Курс USD/₴" value={bUsdRate} onChange={setBUsdRate} symbol="₴" />
              <PlannerInput label="Поточна ціна ERBB" value={bPrice} onChange={setBPrice} symbol="$" />
              <PlannerInput label="Комісія" value={bFee} onChange={setBFee} suffix="%" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Куплено ERBB</div>
                <div className="text-lg font-semibold">{bData.tokens.toFixed(4)}</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Точка беззбитковості</div>
                <div className="text-lg font-semibold">{fmtUsd(bData.bzUsd)}</div>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="text-sm font-medium mb-4">Прогноз вартості капіталу</div>
              <PlannerInput label="Майбутня ціна ERBB" value={fPrice} onChange={setFPrice} symbol="$" />
              <PlannerInput label="Горизонт планування" value={fYears} onChange={setFYears} suffix="років" />
              <PlannerInput label="Ставка депозиту" value={bDepRate} onChange={setBDepRate} suffix="%" />
            </div>
          </div>

          <div className="mt-8 lg:mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Вартість портфеля ERBB через {fYears} {fYears === 1 ? 'рік' : fYears < 5 ? 'роки' : 'років'}</div>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-4">{fmt(bData.toDisp(bData.capitalUsd), bCur)}</div>
                <div className="flex justify-between items-center text-sm border-t border-blue-200/50 dark:border-blue-800/50 pt-3">
                  <span className="text-blue-600/80 dark:text-blue-400/80">Прибуток</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">{bData.profitUsd >= 0 ? '+' : ''}{fmt(bData.toDisp(bData.profitUsd), bCur)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-blue-600/80 dark:text-blue-400/80">ROI</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">{bData.roi >= 0 ? '+' : ''}{bData.roi.toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Альтернатива: Депозит</div>
                <div className="text-2xl font-bold mb-4">{fmt(bData.toDisp(bData.depositUsd), bCur)}</div>
                <div className="flex justify-between items-center text-sm border-t border-zinc-200 dark:border-zinc-700 pt-3">
                  <span className="text-zinc-500">ERBB vs Депозит</span>
                  <span className={`font-semibold ${bData.vsUsd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {(bData.vsUsd >= 0 ? '+' : '') + fmt(bData.toDisp(bData.vsUsd), bCur)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-zinc-500">Вкладено зараз</span>
                  <span className="font-semibold">{fmt(bData.toDisp(bData.sumUsd), bCur)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-medium mb-6">Прогноз зростання</h3>
              <div className="flex flex-wrap gap-4 text-[11px] text-zinc-500 mb-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#378ADD]"></span>ERBB (твій прогноз)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#639922]"></span>ERBB (базовий ×1.2/рік)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#BA7517]"></span>Депозит</span>
              </div>
              <div className="h-[350px] w-full relative mb-8">
                <Line
                  id={`bitbon-calc-onetime-line-${chartIdSuffix}`}
                  key={`bitbon-calc-onetime-line-${chartIdSuffix}`}
                  data={{
                    labels: bData.labels,
                    datasets: [
                      {
                        label: 'ERBB (твій прогноз)',
                        data: bData.erbbLine,
                        borderColor: '#378ADD',
                        backgroundColor: 'rgba(55,138,221,0.15)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        borderWidth: 2,
                        pointBackgroundColor: '#378ADD'
                      },
                      {
                        label: 'ERBB (базовий ×1.2/рік)',
                        data: bData.baseLine,
                        borderColor: '#639922',
                        backgroundColor: 'rgba(99,153,34,0.08)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        borderWidth: 2,
                        borderDash: [4, 3]
                      },
                      {
                        label: 'Депозит',
                        data: bData.depLine,
                        borderColor: '#BA7517',
                        backgroundColor: 'rgba(250,199,117,0.12)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        borderWidth: 2,
                        borderDash: [2, 4]
                      }
                    ]
                  }}
                  options={{
                    ...commonChartOptions,
                    plugins: {
                      ...commonChartOptions.plugins,
                      tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + fmt(c.parsed.y, bCur) } }
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
                            const c = CFG[bCur];
                            return c.suffix ? s + ' ' + c.sym : c.sym + s;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="py-2 px-2 font-medium text-zinc-500 text-xs">Ціна ERBB</th>
                      <th className="py-2 px-2 font-medium text-zinc-500 text-xs">Вартість</th>
                      <th className="py-2 px-2 font-medium text-zinc-500 text-xs">Прибуток</th>
                      <th className="py-2 px-2 font-medium text-zinc-500 text-xs">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bData.uniq.map((np, idx) => {
                      const portUsd = bData.tokens * np;
                      const profU = portUsd - bData.sumUsd;
                      const r = bData.sumUsd > 0 ? ((portUsd - bData.sumUsd) / bData.sumUsd * 100).toFixed(1) : 0;
                      return (
                        <tr key={idx} className="border-b border-zinc-200 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <td className="py-2 px-2">{fmtUsd(np)}</td>
                          <td className="py-2 px-2">{fmt(bData.toDisp(portUsd), bCur)}</td>
                          <td className={`py-2 px-2 ${profU >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{profU >= 0 ? '+' : ''}{fmt(bData.toDisp(profU), bCur)}</td>
                          <td className={`py-2 px-2 ${profU >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{profU >= 0 ? '+' : ''}{r}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[380px_1fr] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <PlannerInput label={`Початкова інвестиція`} value={mInit} onChange={setMInit} symbol={CFG[bCur].sym} />
              <PlannerInput label={`Щомісячна купівля`} value={mBuy} onChange={setMBuy} symbol={CFG[bCur].sym} />
              <PlannerInput label="Поточна ціна ERBB" value={mPrice} onChange={setMPrice} symbol="$" />
              <PlannerInput label="Термін накопичення" value={mYears} onChange={setMYears} suffix="років" />
              <PlannerInput label="Цільова ціна ERBB" value={mTarget} onChange={setMTarget} symbol="$" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Накопичено ERBB</div>
                <div className="text-lg font-semibold text-emerald-600">{mData.finalTok.toFixed(2)}</div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Середня ціна</div>
                <div className="text-lg font-semibold">{fmtUsd(mData.avgP)}</div>
              </div>
            </div>
          </div>

          <div className="mt-8 lg:mt-0">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800/30 mb-8">
              <div className="text-xs text-blue-600 mb-1">Вартість портфеля при цільовій ціні</div>
              <div className="text-3xl font-bold text-blue-700 mb-4">{fmt(mData.toDisp(mData.capUsd), bCur)}</div>
              <div className="flex justify-between items-center text-sm border-t border-blue-200/50 pt-3">
                <span className="text-blue-600/80">Прибуток</span>
                <span className="font-semibold text-blue-700">+{fmt(mData.toDisp(mData.profitUsd), bCur)}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-medium mb-6">Прогноз накопичення (DCA)</h3>
              <div className="h-[350px] w-full relative">
                <Line
                  id={`bitbon-calc-dca-line-${chartIdSuffix}`}
                  key={`bitbon-calc-dca-line-${chartIdSuffix}`}
                  data={{
                    labels: mData.labels,
                    datasets: [
                      {
                        label: 'Вартість (цільова)',
                        data: mData.tL,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79,70,229,0.12)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 2,
                        borderWidth: 2
                      },
                      {
                        label: 'Вкладено',
                        data: mData.iL,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,0.08)',
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
                      tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + fmt(c.parsed.y, bCur) } }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BitbonCalculator;
