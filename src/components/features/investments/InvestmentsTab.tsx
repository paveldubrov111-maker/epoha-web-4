import React, { useState } from 'react';
import { TrendingUp, PieChart } from 'lucide-react';
import { Currency, Language, PortfolioType, PortfolioTransaction } from '../../../types';
import CalculatorsTab from './Calculators/CalculatorsTab';
import AnalyticsTab from './Analytics/AnalyticsTab';

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
  onWithdrawFromInvestment: (amountUah: number, accountId: string) => Promise<void>;
  accounts: any[];
  portfolioTransactions: PortfolioTransaction[];
  isManualPriceMode: boolean;
  setIsManualPriceMode: (val: boolean) => void;
  manualPriceValue: number;
  setManualPriceValue: (val: number) => void;
  connectedPotentialAccountId: string | null;
  onConnectPotentialAccount: (id: string | null) => void;
}

const InvestmentsTab: React.FC<InvestmentsTabProps> = (props) => {
  const { onPortfolioTx, ...otherProps } = props;
  const [activeTab, setActiveTab] = useState<'calculators' | 'analytics'>('analytics');

  return (
    <div className="bg-transparent backdrop-blur-none rounded-[2.5rem] border-none p-0 md:p-0 shadow-none">
      <div className="flex bg-zinc-100/50 dark:bg-black/20 p-2 rounded-3xl border border-white/5 shadow-inner mb-8 w-fit">
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-1 rounded-[1.25rem] border border-zinc-200/50 dark:border-white/5 shadow-sm">
          <button
            onClick={() => setActiveTab('calculators')}
            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'calculators'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {props.t('tabCalculators')}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            {props.t('tabAnalytics')}
          </button>
        </div>
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
          {...props}
          onPortfolioTx={onPortfolioTx}
          bCur={props.globalCurrency}
          bPrice={props.livePrice || 0.45}
          bUsdRate={props.exchangeRates['UAH'] || 40}
        />
      )}
    </div>
  );
};

export default InvestmentsTab;
