import React, { useState } from 'react';
import { TrendingUp, PieChart } from 'lucide-react';
import { Currency, Language, PortfolioType } from '../../../types';
import CalculatorsTab from './Calculators/CalculatorsTab';
import AnalyticsTab from './Analytics/AnalyticsTab';
// HMR Force Update: bitbon-tx-fix-v4

interface InvestmentsTabProps {
  language: Language;
  t: (key: string) => string;
  globalCurrency: Currency;
  exchangeRates: Record<string, number>;
  livePrice: number | null;
  isLoadingPrice: boolean;
  priceError: boolean;
  fetchPrice: () => void;
  availableInvestmentUah: number;
  availableInvestmentUsd: number;
  portfolios: any[];
  portfolioAssets: any[];
  globalMetrics: any;
  activePortfolioId: string | null;
  setActivePortfolioId: (id: string | null) => void;
  showNewPortfolioForm: boolean;
  setShowNewPortfolioForm: (show: boolean) => void;
  newPortfolioName: string;
  setNewPortfolioName: (name: string) => void;
  newPortfolioType: PortfolioType;
  setNewPortfolioType: (type: PortfolioType) => void;
  handleCreatePortfolio: () => void;
  handleAddTx: (type: 'buy' | 'sell' | 'income', data: any) => Promise<void>;
  handleDeleteTx: (id: string) => Promise<void>;
  handleAddPortfolioAsset: (asset: any) => Promise<void>;
  handleUpdatePortfolioAsset: (id: string, updates: any) => Promise<void>;
  handleDeletePortfolioAsset: (id: string) => Promise<void>;
  handleDeletePortfolio: (id: string) => Promise<void>;
  onPortfolioTx: (tx: any) => Promise<void>;
  formatGlobal: any;
  theme: string;
  bitbonPortfolio: any;
  onUpdateInvestmentPotential: (val: number) => void;
}

const InvestmentsTab: React.FC<InvestmentsTabProps> = (props) => {
  const { onPortfolioTx, ...otherProps } = props;
  const [activeTab, setActiveTab] = useState<'calculators' | 'analytics'>('analytics');
  // Removed local bCur state as per user request to use global currency from header

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
        {/* Top Level Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('calculators')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeTab === 'calculators'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Калькулятори</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeTab === 'analytics'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="flex items-center gap-2"><PieChart className="w-4 h-4" /> Аналітика</span>
          </button>
        </div>

        {activeTab === 'calculators' ? (
          <CalculatorsTab 
            language={props.language}
            t={props.t}
            livePrice={props.livePrice}
            isLoadingPrice={props.isLoadingPrice}
            priceError={props.priceError}
            fetchPrice={props.fetchPrice}
            exchangeRates={props.exchangeRates}
          />
        ) : (
          <AnalyticsTab 
            {...otherProps}
            onPortfolioTx={onPortfolioTx}
            portfolioAssets={props.portfolioAssets}
            bCur={props.globalCurrency}
            bPrice={props.livePrice || 0.45} // Fallback if live price unavailable
            bUsdRate={props.exchangeRates['UAH'] || 40}
            bitbonPortfolio={props.bitbonPortfolio}
            onUpdateInvestmentPotential={props.onUpdateInvestmentPotential}
          />
        )}
      </div>
    </div>
  );
};

export default InvestmentsTab;
