import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Currency, PortfolioType } from '../../../../types';
import HeroCard from './HeroCard';
import AnalyticsGrid from './AnalyticsGrid';
import BitbonPortfolioView from '../Portfolio/BitbonPortfolioView';
import { CryptoPortfolioView } from '../Portfolio/CryptoPortfolioView';
import PortfolioView from '../../../PortfolioView';

interface AnalyticsTabProps {
  bCur: Currency;
  availableInvestmentUah: number;
  availableInvestmentUsd: number;
  portfolios: any[];
  portfolioAssets: any[];
  portfolioTransactions: any[];
  globalMetrics: any;
  livePrice: number | null;
  bPrice: number;
  bUsdRate: number;
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
  globalCurrency: Currency;
  theme: string;
  bitbonPortfolio: any;
  onUpdateInvestmentPotential: (val: number) => void;
  onWithdrawFromInvestment: (amountUah: number, accountId: string) => Promise<void>;
  accounts: any[];
  language: any;
  t: (key: string) => string;
  isLoadingPrice: boolean;
  priceError: boolean;
  fetchPrice: () => void;
  exchangeRates: Record<string, number>;
  isManualPriceMode: boolean;
  setIsManualPriceMode: (val: boolean) => void;
  manualPriceValue: number;
  setManualPriceValue: (val: number) => void;
  connectedPotentialAccountId: string | null;
  onConnectPotentialAccount: (id: string | null) => void;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = (props) => {
  const {
    bCur,
    availableInvestmentUah,
    availableInvestmentUsd,
    portfolios,
    portfolioAssets,
    portfolioTransactions,
    globalMetrics,
    livePrice,
    bPrice,
    bUsdRate,
    activePortfolioId,
    setActivePortfolioId,
    showNewPortfolioForm,
    setShowNewPortfolioForm,
    newPortfolioName,
    setNewPortfolioName,
    newPortfolioType,
    setNewPortfolioType,
    handleCreatePortfolio,
    handleAddTx,
    handleDeleteTx,
    handleAddPortfolioAsset,
    handleUpdatePortfolioAsset,
    handleDeletePortfolioAsset,
    handleDeletePortfolio,
    onPortfolioTx,
    formatGlobal,
    globalCurrency,
    theme,
    bitbonPortfolio,
    onUpdateInvestmentPotential,
    onWithdrawFromInvestment,
    accounts,
    language,
    t,
    isLoadingPrice,
    priceError,
    fetchPrice,
    exchangeRates,
    isManualPriceMode,
    setIsManualPriceMode,
    manualPriceValue,
    setManualPriceValue,
    connectedPotentialAccountId,
    onConnectPotentialAccount
  } = props;

  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [confirmDeleteAssetId, setConfirmDeleteAssetId] = React.useState<string | null>(null);

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <HeroCard 
        bCur={bCur}
        availableInvestmentUah={availableInvestmentUah}
        availableInvestmentUsd={availableInvestmentUsd}
        onUpdateInvestmentPotential={onUpdateInvestmentPotential}
        onWithdrawFromInvestment={onWithdrawFromInvestment}
        accounts={accounts}
        t={t}
        connectedPotentialAccountId={connectedPotentialAccountId}
        onConnectPotentialAccount={onConnectPotentialAccount}
        formatGlobal={formatGlobal}
        exchangeRates={exchangeRates}
        globalCurrency={globalCurrency}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-[24px] border border-zinc-200/50 dark:border-white/5">
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <div className="flex flex-nowrap gap-2">
          {portfolios.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePortfolioId(p.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activePortfolioId === p.id 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' 
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-indigo-400'
              }`}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() => setShowNewPortfolioForm(true)}
            className="p-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-indigo-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>

      {!activePortfolioId && (
        <AnalyticsGrid 
          portfolios={portfolios}
          globalMetrics={globalMetrics}
          livePrice={livePrice}
          bPrice={bPrice}
          bUsdRate={bUsdRate}
          t={t}
          formatGlobal={formatGlobal}
          globalCurrency={globalCurrency}
          exchangeRates={exchangeRates}
        />
      )}

      {showNewPortfolioForm && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl animate-in zoom-in-95 duration-200">
          <h4 className="text-sm font-bold mb-4 uppercase tracking-wider text-zinc-500">{t('createNewPortfolio')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 ml-1">{t('portfolioName')}</label>
              <input 
                type="text" 
                value={newPortfolioName} 
                onChange={e => setNewPortfolioName(e.target.value)} 
                placeholder={t('portfolioNamePlaceholder')} 
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 ml-1">{t('portfolioTypeLabel')}</label>
              <select 
                value={newPortfolioType} 
                onChange={e => setNewPortfolioType(e.target.value as PortfolioType)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="crypto">{t('cryptoLabel')}</option>
                <option value="stocks">{t('stocksLabel')}</option>
                <option value="alternative">{t('alternativeLabel')}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowNewPortfolioForm(false)} className="px-6 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">{t('cancel')}</button>
            <button onClick={handleCreatePortfolio} className="px-8 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]">{t('create')}</button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {activePortfolio?.type === 'bitbon' && bitbonPortfolio && (
          <BitbonPortfolioView 
            key="bitbon"
            portfolio={bitbonPortfolio}
            bCur={bCur}
            bUsdRate={bUsdRate}
            livePrice={livePrice || bPrice}
            distributionData={globalMetrics.bitbonBreakdown}
            assets={portfolioAssets.filter(a => a.portfolioId === bitbonPortfolio?.id)}
            onAddTx={handleAddTx}
            onDeleteTx={handleDeleteTx}
            onAddAsset={handleAddPortfolioAsset}
            onUpdateAsset={handleUpdatePortfolioAsset}
            onDeleteAsset={handleDeletePortfolioAsset}
            onConfirmDeleteAsset={(id) => {
              setConfirmDeleteAssetId(id);
            }}
            onConfirmDeleteTx={(id) => {
              setConfirmDeleteId(id);
            }}
            availableBalanceUsd={availableInvestmentUsd}
            availableBalanceUah={availableInvestmentUah}
            connectedPotentialAccountId={connectedPotentialAccountId}
            formatGlobal={formatGlobal}
            globalCurrency={globalCurrency}
            language={language}
            t={t}
            priceError={priceError}
            fetchPrice={fetchPrice}
            exchangeRates={exchangeRates}
            isManualPriceMode={isManualPriceMode}
            setIsManualPriceMode={setIsManualPriceMode}
            manualPriceValue={manualPriceValue}
            setManualPriceValue={setManualPriceValue}
            accounts={accounts}
          />
        )}

        {activePortfolio?.type === 'crypto' && (
          <CryptoPortfolioView
            key={activePortfolio.id}
            portfolio={activePortfolio}
            assets={portfolioAssets.filter(a => a.portfolioId === activePortfolioId)}
            transactions={portfolioTransactions.filter(t => t.portfolioId === activePortfolioId)}
            onAddAsset={handleAddPortfolioAsset}
            onUpdateAsset={handleUpdatePortfolioAsset}
            onDeleteAsset={async (id) => { setConfirmDeleteAssetId(id); }}
            onDeletePortfolio={handleDeletePortfolio}
            onRecordTransaction={onPortfolioTx}
            availableBalanceUsd={availableInvestmentUsd}
            currency={bCur}
            usdRate={bUsdRate}
            formatGlobal={formatGlobal}
            globalCurrency={globalCurrency}
            exchangeRates={exchangeRates}
            theme={theme}
            language={language}
            t={t}
          />
        )}

        {(activePortfolio?.type === 'alternative' || activePortfolio?.type === 'stocks') && (
          <PortfolioView
            key={activePortfolio.id}
            portfolio={activePortfolio}
            assets={portfolioAssets.filter(a => a.portfolioId === activePortfolioId)}
            onAddAsset={handleAddPortfolioAsset}
            onUpdateAsset={handleUpdatePortfolioAsset}
            onDeleteAsset={async (id) => { setConfirmDeleteAssetId(id); }}
            onDeletePortfolio={handleDeletePortfolio}
            onRecordTransaction={onPortfolioTx}
            availableBalanceUsd={availableInvestmentUsd}
            currency={bCur}
            usdRate={bUsdRate}
            formatGlobal={formatGlobal}
            globalCurrency={globalCurrency}
            exchangeRates={exchangeRates}
            theme={theme}
            language={language}
            t={t}
          />
        )}
      </AnimatePresence>

      {createPortal(
        <AnimatePresence>
          {(confirmDeleteId || confirmDeleteAssetId) && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pointer-events-auto">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setConfirmDeleteId(null);
                  setConfirmDeleteAssetId(null);
                }}
                className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl border border-zinc-200 dark:border-white/5 text-center overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter mb-2">
                  {confirmDeleteAssetId ? t('deleteAssetBlock') : t('deleteOperation')}
                </h3>
                <p className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest leading-relaxed">
                  {confirmDeleteAssetId 
                    ? t('deleteBlockDesc')
                    : t('deleteOpDesc')}
                </p>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setConfirmDeleteId(null);
                      setConfirmDeleteAssetId(null);
                    }}
                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={() => {
                      if (confirmDeleteId) handleDeleteTx(confirmDeleteId);
                      if (confirmDeleteAssetId) handleDeletePortfolioAsset(confirmDeleteAssetId);
                      setConfirmDeleteId(null);
                      setConfirmDeleteAssetId(null);
                    }}
                    className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    {t('delete')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default AnalyticsTab;
