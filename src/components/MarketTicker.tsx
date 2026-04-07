import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TickerItem {
  id: string;
  label: string;
  price: number;
  currency: string;
  change?: number;
}

interface MarketTickerProps {
  items: TickerItem[];
  isManualPriceMode: boolean;
  manualPriceValue: number;
}

export const MarketTicker = ({ 
  items, 
  isManualPriceMode, 
  manualPriceValue 
}: MarketTickerProps) => {
  // Duplicate items for seamless looping
  const loopedItems = [...items, ...items];

  return (
    <div data-main-ticker className="w-full bg-zinc-950/95 dark:bg-black/98 backdrop-blur-xl border-b border-white/10 py-1 md:py-1.5 overflow-hidden whitespace-nowrap z-[100] sticky top-0 shadow-lg">
      {/* Edge Fades */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 dark:from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-950 dark:from-black to-transparent z-10 pointer-events-none" />

      <motion.div
        className="inline-flex gap-8 md:gap-16"
        animate={{
          x: [0, "-50%"],
        }}
        transition={{
          duration: items.length * 15,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{ width: "max-content" }}
      >
        {loopedItems.map((item, idx) => {
          const isERBB = item.id === 'ERBB';
          return (
            <div key={`${item.id}-${idx}`} className="inline-flex items-center gap-3">
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-zinc-400/80">
                {item.label}
              </span>
              <span className={`text-[11px] md:text-[13px] font-bold tabular-nums tracking-normal drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${isERBB && isManualPriceMode ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                {['USD/UAH', 'EUR/UAH'].includes(item.id) ? item.price.toFixed(2) : item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: (item.price < 1 ? 4 : 2) })}
                <span className="ml-1 text-[10px] opacity-70 font-medium">{item.currency}</span>
              </span>
              {item.change !== undefined && !isManualPriceMode && (
                <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.change > 0 ? 'bg-emerald-500/10 text-emerald-400' : item.change < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                  {item.change > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : item.change < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                  {Math.abs(item.change).toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};
