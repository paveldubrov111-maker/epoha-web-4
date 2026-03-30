import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Currency, PortfolioAsset, PortfolioTransaction } from '../../../../types';
import { fmt, fmtUsd } from '../../../../utils/format';

interface MonthlyReportViewProps {
  assets: PortfolioAsset[];
  transactions: PortfolioTransaction[];
  bCur: Currency;
  usdRate: number;
}

const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  assets,
  transactions,
  bCur,
  usdRate
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const monthName = new Intl.DateTimeFormat('uk-UA', { month: 'long' }).format(selectedDate);

  const prevMonth = () => setSelectedDate(new Date(year, month - 1, 1));
  const nextMonth = () => setSelectedDate(new Date(year, month + 1, 1));

  // Reporting Logic
  const reportData = useMemo(() => {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    return (assets || []).map(asset => {
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

      const monthIncomeTxs = (transactions || []).filter(tx => {
        const txDate = new Date(tx.date);
        return tx.assetId === asset.id && 
               tx.type === 'income' && 
               txDate >= startOfMonth && 
               txDate <= endOfMonth;
      });

      const incomeTokens = monthIncomeTxs.reduce((sum, tx) => sum + tx.tokens, 0);
      const incomeUsd = monthIncomeTxs.reduce((sum, tx) => sum + tx.amountUsd, 0);
      const incomeUah = monthIncomeTxs.reduce((sum, tx) => sum + (tx.amountUsd * (tx.usdRate || usdRate)), 0);

      const monthChanges = (transactions || [])
        .filter(tx => {
          const txDate = new Date(tx.date);
          return txDate >= startOfMonth && txDate <= endOfMonth;
        })
        .reduce((sum, tx) => {
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
      const progress = openingBalance > 0 ? (closingBalance / openingBalance - 1) * 100 : 0;

      return {
        id: asset.id,
        name: asset.name,
        openingBalance,
        closingBalance,
        incomeTokens,
        incomeUsd,
        incomeUah,
        progress
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
              <TrendingUp className="w-3 h-3" /> Аналітичний звіт місяця
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
          { label: 'Дохід місяця (BB)', value: `${totals.tokens.toFixed(2)} ERBB`, icon: TrendingUp, color: 'from-blue-600 to-indigo-700', shadow: 'shadow-indigo-500/20' },
          { label: 'Еквівалент USD', value: fmtUsd(totals.usd), icon: DollarSign, color: 'from-emerald-600 to-teal-700', shadow: 'shadow-emerald-500/20' },
          { label: `Дохід у ${bCur}`, value: fmt(bCur === 'USD' ? totals.usd : totals.uah, bCur), icon: Wallet, color: 'from-zinc-800 to-black dark:from-white dark:to-zinc-200 dark:text-zinc-900', shadow: 'shadow-zinc-500/20' }
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
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {reportData.map((row, i) => (
            <motion.div
              layout
              key={row.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5 }}
              className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl p-6 rounded-[32px] border border-zinc-200/50 dark:border-white/5 shadow-xl hover:shadow-2xl transition-all group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-200/20">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{row.name}</h4>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">Аналіз блоку</p>
                  </div>
                </div>
                {row.progress !== 0 && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border ${
                    row.progress > 0 
                      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' 
                      : 'text-red-500 bg-red-500/10 border-red-500/20'
                  }`}>
                    {row.progress > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(row.progress).toFixed(1)}%
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-white/5">
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Початок місяця</p>
                    <p className="text-sm font-black text-zinc-900 dark:text-white">{row.openingBalance.toFixed(2)} <span className="text-[10px] text-zinc-400">ERBB</span></p>
                  </div>
                  <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-white/5">
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Кінець місяця</p>
                    <p className="text-sm font-black text-indigo-500">{row.closingBalance.toFixed(2)} <span className="text-[10px] text-zinc-400">ERBB</span></p>
                  </div>
                </div>

                <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Чистий Дохід (BB)</p>
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-500">+{row.incomeTokens.toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">ERBB</span>
                  </div>
                  <div className="mt-2 text-xs font-bold text-zinc-400 italic">
                    ≈ {fmt(bCur === 'USD' ? row.incomeUsd : row.incomeUah, bCur)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-8 bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/20 dark:border-white/10 rounded-[40px] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <TrendingUp className="w-20 h-20 rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
             <TrendingUp className="w-8 h-8 text-indigo-500" />
          </div>
          <div className="text-center md:text-left">
            <h5 className="text-lg font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight mb-2 italic">Філософія Аналітики</h5>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium italic max-w-2xl">
              💡 Ми аналізуємо "тіло" ваших активів. Цей звіт допомагає зрозуміти не просто ціну Bitbon, а швидкість зростання вашої частки в екосистемі. Кожна цифра розрахована на основі атомів вашої історії — ваших транзакцій.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReportView;
