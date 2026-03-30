import React, { useState } from 'react';
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
    <div>
      <div className="flex flex-wrap gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <button
          onClick={() => setCalculatorTab('compound')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            calculatorTab === 'compound'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          Складний %
        </button>
        <button
          onClick={() => setCalculatorTab('bitbon')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            calculatorTab === 'bitbon'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          ERBB / Бітбон
        </button>
      </div>

      {calculatorTab === 'compound' ? (
        <CompoundCalculator language={language} t={t} />
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
    </div>
  );
};

export default CalculatorsTab;
