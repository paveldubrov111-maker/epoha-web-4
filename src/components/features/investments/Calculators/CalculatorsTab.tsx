import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Zap } from 'lucide-react';
import { Language } from '../../../../types';
import CompoundCalculator from './CompoundCalculator';
import BitbonCalculator from './BitbonCalculator';

interface CalculatorsTabProps {
  language: Language;
  t: (key: string) => string;
  livePrice: number | null;
  isLoadingPrice: boolean;
  priceError: boolean;
  fetchPrice: () => void;
  exchangeRates: Record<string, number>;
}

const CalculatorsTab: React.FC<CalculatorsTabProps> = ({
  language,
  t,
  livePrice,
  isLoadingPrice,
  priceError,
  fetchPrice,
  exchangeRates
}) => {
  const [calculatorTab, setCalculatorTab] = useState<'compound' | 'bitbon'>('compound');

  return (
    <div className="space-y-8">
      {/* Main Tabs Container */}
      <div className="flex p-1.5 bg-zinc-100/50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 w-fit backdrop-blur-sm">
        {[
          { id: 'compound', label: t('calcCompound'), icon: Calculator },
          { id: 'bitbon', label: t('calcBitbon'), icon: Zap }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCalculatorTab(tab.id as any)}
            className={`relative flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all duration-500 ${
              calculatorTab === tab.id 
                ? 'text-indigo-600 dark:text-indigo-300' 
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'
            }`}
          >
            {calculatorTab === tab.id && (
              <motion.div
                layoutId="mainCalculatorTab"
                className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-xl shadow-lg ring-1 ring-black/5"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <tab.icon className={`w-4 h-4 relative z-10 ${calculatorTab === tab.id ? 'text-indigo-500' : ''}`} />
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={calculatorTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          {calculatorTab === 'compound' ? (
            <CompoundCalculator language={language} t={t} exchangeRates={exchangeRates} />
          ) : (
            <BitbonCalculator 
              language={language} 
              t={t} 
              livePrice={livePrice}
              isLoadingPrice={isLoadingPrice}
              priceError={priceError}
              fetchPrice={fetchPrice}
              exchangeRates={exchangeRates}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CalculatorsTab;
