import React from 'react';
import { Doughnut } from 'react-chartjs-2';
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
import { PieChart, TrendingUp, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { fmt, fmtUsd } from '../../../../utils/format';

interface AnalyticsGridProps {
  portfolios: any[];
  globalMetrics: any;
  livePrice: number | null;
  bPrice: number;
  bUsdRate: number;
}

const AnalyticsGrid: React.FC<AnalyticsGridProps> = ({
  portfolios,
  globalMetrics,
  livePrice,
  bPrice,
  bUsdRate
}) => {
  const chartIdSuffix = React.useMemo(() => Math.random().toString(36).substring(2, 9), []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Distribution Card */}
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-6 rounded-[28px] border border-zinc-200/50 dark:border-white/5 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <PieChart className="w-4 h-4" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Розподіл Капіталу</span>
        </div>
        <div className="h-48 relative flex items-center justify-center">
          <Doughnut 
            id={`analytics-distribution-doughnut-${chartIdSuffix}`}
            key={`analytics-distribution-doughnut-${chartIdSuffix}`}
            data={{
              labels: portfolios.map(p => p.name),
              datasets: [{
                data: portfolios.map(p => p.type === 'bitbon' ? globalMetrics.bitbonValueUsd : (p.type === 'crypto' ? globalMetrics.cryptoValueUsd : globalMetrics.altValueUsd)),
                backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899'],
                borderWidth: 0,
                hoverOffset: 4
              }]
            }}
            options={{ cutout: '75%', plugins: { legend: { display: false } }, maintainAspectRatio: false }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Всього</div>
            <div className="text-xl font-black text-zinc-800 dark:text-zinc-100">{fmtUsd(globalMetrics.totalCapitalUsd || 0)}</div>
          </div>
        </div>
      </div>

      {/* Performance Card */}
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-6 rounded-[28px] border border-zinc-200/50 dark:border-white/5 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Прибутковість</span>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] font-black text-zinc-400 uppercase mb-1">Загальний прибуток</div>
              <div className={`text-2xl font-black ${(globalMetrics.totalProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {(globalMetrics.totalProfit || 0) >= 0 ? '+' : ''}{fmtUsd(globalMetrics.totalProfit || 0)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-zinc-400 uppercase mb-1">ROI</div>
              <div className="text-xl font-black text-emerald-500">{(globalMetrics.totalRoi || 0).toFixed(2)}%</div>
            </div>
          </div>
          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, globalMetrics.totalRoi || 0)}%` }}
              className="h-full bg-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Market Status Card */}
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-6 rounded-[28px] border border-zinc-200/50 dark:border-white/5 shadow-xl md:col-span-2 lg:col-span-1">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <RefreshCw className="w-4 h-4" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Статус Ринку</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-white/5">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-tight">ERBB/USD</span>
            <span className="text-sm font-black text-zinc-800 dark:text-zinc-100">{fmtUsd(livePrice || bPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsGrid;
