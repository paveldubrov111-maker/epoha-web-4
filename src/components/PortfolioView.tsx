import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Line, Doughnut } from 'react-chartjs-2';
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
import { 
  Plus, Trash2, Edit2, RefreshCw, ShoppingCart, Search, X, 
  Minus, ChevronDown, ChevronUp, TrendingUp, Wallet 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Portfolio, PortfolioAsset, Currency, PortfolioTransaction } from '../types';

interface Props {
  portfolio: Portfolio;
  assets: PortfolioAsset[];
  onAddAsset: (asset: Omit<PortfolioAsset, 'id' | 'updatedAt'>) => Promise<void>;
  onUpdateAsset: (id: string, updates: Partial<PortfolioAsset>) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
  onDeletePortfolio?: (id: string) => Promise<void>;
  currency: Currency;
  usdRate: number;
  availableBalanceUsd?: number;
  onRecordTransaction?: (tx: Omit<PortfolioTransaction, 'id'>) => Promise<void>;
  formatGlobal: (n: number, cur?: Currency | 'USD') => string;
  globalCurrency: Currency;
  theme: string;
}

export default function PortfolioView({ 
  portfolio, assets, onAddAsset, onUpdateAsset, onDeleteAsset, 
  onDeletePortfolio, currency, usdRate, availableBalanceUsd, 
  onRecordTransaction,
  formatGlobal, globalCurrency, theme 
}: Props) {
  // Form state
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSellForm, setShowSellForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PortfolioAsset | null>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [confirmDeleteAssetId, setConfirmDeleteAssetId] = useState<string | null>(null);
  
  // Add existing holdings form
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [addSelectedCrypto, setAddSelectedCrypto] = useState<{ name: string; symbol: string } | null>(null);
  const [addAmount, setAddAmount] = useState(0);
  const [addAvgPrice, setAddAvgPrice] = useState(0);
  
  // Buy form
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState<{ name: string; symbol: string } | null>(null);
  const [buyAmountUsd, setBuyAmountUsd] = useState(100);
  const [buyTokens, setBuyTokens] = useState(0);
  const [buyPrice, setBuyPrice] = useState(0);
  const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);
  const [buyUsdRate, setBuyUsdRate] = useState(usdRate || 41);
  const [buyNote, setBuyNote] = useState('');
  const [buyTargetWalletId, setBuyTargetWalletId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Sell form
  const [sellAsset, setSellAsset] = useState<PortfolioAsset | null>(null);
  const [sellAmountUsd, setSellAmountUsd] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [sellTokens, setSellTokens] = useState(0);
  const [sellMode, setSellMode] = useState<'usd' | 'tokens'>('usd');

  // Income form
  const [incomeAsset, setIncomeAsset] = useState<PortfolioAsset | null>(null);
  const [incomeAmountUsd, setIncomeAmountUsd] = useState(0);
  const [incomeTokens, setIncomeTokens] = useState(0);
  const [incomeMode, setIncomeMode] = useState<'usd' | 'tokens'>('usd');
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [incomeNote, setIncomeNote] = useState('');
  const [incomeUsdRate, setIncomeUsdRate] = useState(usdRate || 41);
  const [incomePrice, setIncomePrice] = useState(0);

  // Sell specifics
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellUsdRate, setSellUsdRate] = useState(usdRate || 41);
  const [sellNote, setSellNote] = useState('');
  
  // Edit form
  const [editName, setEditName] = useState('');
  const [editSymbol, setEditSymbol] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editAvgPrice, setEditAvgPrice] = useState(0);
  const [editCurrentPrice, setEditCurrentPrice] = useState(0);

  // Transfer form
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferSourceId, setTransferSourceId] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  
  // Prices
  const [allPrices, setAllPrices] = useState<Record<string, number>>({});
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Historical chart state for Crypto
  const [chartTimeframe, setChartTimeframe] = useState('1M');
  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  const isCrypto = portfolio.type === 'crypto' || portfolio.type === 'bitbon';
  const isBitbon = portfolio.type === 'bitbon';
  const walletLabel = isBitbon ? 'гаманець' : 'актив';
  const WalletLabel = isBitbon ? 'Гаманець' : 'Актив';

  const chartIdSuffix = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  const handleTransfer = async () => {
    if (!transferSourceId || !transferTargetId || transferAmount <= 0 || isSaving) return;
    setIsSaving(true);
    try {
      const source = assets.find(a => a.id === transferSourceId);
      const target = assets.find(a => a.id === transferTargetId);
      if (!source || !target) return;

      // 1. Decrease source
      await onUpdateAsset(transferSourceId, { amount: source.amount - transferAmount });
      // 2. Increase target
      await onUpdateAsset(transferTargetId, { amount: target.amount + transferAmount });
      
      // 3. Record transaction (optional buy/sell record? No, let's record as transfer)
      if (onRecordTransaction) {
        await onRecordTransaction({
          portfolioId: portfolio.id,
          assetId: transferSourceId,
          symbol: source.symbol,
          type: 'sell', // Simplified as sell from one, buy to another for accounting?
          amountUsd: transferAmount * (source.currentPrice || 1),
          tokens: transferAmount,
          priceUsd: source.currentPrice || 1,
          date: new Date().toISOString().split('T')[0],
          note: `Переказ до ${target.name}`
        });
        await onRecordTransaction({
          portfolioId: portfolio.id,
          assetId: transferTargetId,
          symbol: target.symbol,
          type: 'buy',
          amountUsd: transferAmount * (target.currentPrice || 1),
          tokens: transferAmount,
          priceUsd: target.currentPrice || 1,
          date: new Date().toISOString().split('T')[0],
          note: `Переказ з ${source.name}`
        });
      }

      setShowTransferForm(false);
      setTransferAmount(0);
    } catch (e) {
      console.error('Transfer failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuyUsdChange = (val: number) => {
    setBuyAmountUsd(val);
    if (buyPrice > 0) setBuyTokens(val / buyPrice);
  };
  const handleBuyTokensChange = (val: number) => {
    setBuyTokens(val);
    if (buyPrice > 0) setBuyAmountUsd(val * buyPrice);
  };
  const handleSellUsdChange = (val: number) => {
    setSellAmountUsd(val);
    if (sellPrice > 0) setSellTokens(val / sellPrice);
  };
  const handleSellTokensChange = (val: number) => {
    setSellTokens(val);
    if (sellPrice > 0) setSellAmountUsd(val * sellPrice);
  };

  const handleIncomeUsdChange = (val: number) => {
    setIncomeAmountUsd(val);
    if (incomePrice > 0) setIncomeTokens(val / incomePrice);
  };
  const handleIncomeTokensChange = (val: number) => {
    setIncomeTokens(val);
    if (incomePrice > 0) setIncomeAmountUsd(val * incomePrice);
  };

  useEffect(() => {
    if (!isCrypto || assets.length === 0) return;

    let isMounted = true;
    const fetchHistoricalData = async () => {
      setIsLoadingChart(true);
      try {
        const tfConfig = {
          '1D': { interval: '15m', limit: 96 },
          '1W': { interval: '2h', limit: 84 },
          '1M': { interval: '12h', limit: 60 },
          '3M': { interval: '1d', limit: 90 },
          '6M': { interval: '1d', limit: 180 },
          '1Y': { interval: '1d', limit: 365 },
          'ALL': { interval: '1w', limit: 300 }
        };
        const config = tfConfig[chartTimeframe as keyof typeof tfConfig] || tfConfig['1M'];

        const fetchSymbolHistory = async (symbol: string) => {
          // 1. Try Binance
          try {
            const sym = symbol.toUpperCase() + 'USDT';
            const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${config.interval}&limit=${config.limit}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                return {
                  timestamps: data.map((d: any) => d[0]),
                  prices: data.map((d: any) => parseFloat(d[4]))
                };
              }
            }
          } catch (e) {}

          // 2. Fallback to OKX Candles
          try {
            const instId = `${symbol.toUpperCase()}-USDT`;
            const barMap: Record<string, string> = { '15m': '15m', '2h': '2H', '12h': '12H', '1d': '1D', '1w': '1W' };
            const bar = barMap[config.interval] || '1D';
            const res = await fetch(`https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${config.limit}`);
            if (res.ok) {
              const data = await res.json();
              if (data?.data && data.data.length > 0) {
                // OKX returns newest first. Reverse for oldest first.
                return {
                  timestamps: data.data.map((d: any) => parseInt(d[0])).reverse(),
                  prices: data.data.map((d: any) => parseFloat(d[4])).reverse()
                };
              }
            }
          } catch (e) {}

          return null;
        };

        const fmtDate = (ts: number) => {
          const d = new Date(ts);
          if (chartTimeframe === '1D') return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
          if (['1M', '3M', '6M', '1Y', '1W', 'ALL'].includes(chartTimeframe)) {
            return d.toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' });
          }
          return d.toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' });
        };

        const assetHistories: Record<string, number[]> = {};
        const timestamps: number[] = [];
        let timeLabels: string[] = [];

        // Try to get timestamps from BTC first, or the first successful asset
        const referenceSymbols = ['BTC', 'ETH', 'SOL', ...assets.map(a => a.symbol || '')];
        for (const symbol of referenceSymbols) {
          if (!symbol) continue;
          const hist = await fetchSymbolHistory(symbol);
          if (hist && hist.timestamps.length > 0) {
            hist.timestamps.forEach((ts, idx) => {
              timestamps.push(ts);
              timeLabels.push(fmtDate(ts));
            });
            break;
          }
        }

        if (!isMounted) return;
        if (timestamps.length === 0) {
          setIsLoadingChart(false);
          return;
        }

        // Fetch all asset histories
        await Promise.all(assets.map(async (asset) => {
          if (!asset.symbol) return;
          const hist = await fetchSymbolHistory(asset.symbol);
          if (hist && hist.prices.length > 0) {
            assetHistories[asset.id] = hist.prices;
          }
        }));

        const aggregatedData = timestamps.map((ts, idx) => {
          let totalValue = 0;
          assets.forEach(asset => {
            const history = assetHistories[asset.id];
            if (history && history[idx] !== undefined) {
              totalValue += history[idx] * asset.amount;
            } else {
              // Fallback to current/average price if history missing
              const price = livePrices[asset.id] || asset.averagePrice || asset.currentPrice || 0;
              totalValue += price * asset.amount;
            }
          });
          return totalValue;
        });

        setChartData({
          labels: timeLabels,
          data: aggregatedData
        });

      } catch (err) {
        console.error('Error computing historical chart', err);
      } finally {
        if (isMounted) setIsLoadingChart(false);
      }
    };

    fetchHistoricalData();
    return () => { isMounted = false; };
  }, [isCrypto, assets, chartTimeframe, livePrices]);

  const fetchAllPrices = async () => {
    setLoadingPrices(true);
    try {
      const priceMap: Record<string, number> = {};
      
      // 1. Fetch from Binance
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price');
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (item.symbol?.endsWith('USDT')) priceMap[item.symbol.replace('USDT', '')] = parseFloat(item.price);
          });
        }
      } catch (e) { console.error('Binance fetch failed:', e); }

      // 2. Fetch from OKX
      try {
        const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
        const data = await res.json();
        if (data?.data) {
          data.data.forEach((item: any) => {
            const sym = item.instId.replace('-USDT', '');
            if (!priceMap[sym]) priceMap[sym] = parseFloat(item.last);
          });
        }
      } catch (e) { console.error('OKX fetch failed:', e); }

      // 3. Fetch from CoinCap (External Service as requested)
      try {
        const res = await fetch('https://api.coincap.io/v2/assets?limit=1000');
        const data = await res.json();
        if (data?.data) {
          data.data.forEach((asset: any) => {
            if (!priceMap[asset.symbol]) priceMap[asset.symbol] = parseFloat(asset.priceUsd);
          });
        }
      } catch (e) { console.error('CoinCap fetch failed:', e); }

      // 4. Fetch ERBB price specifically from DexScreener (Uniswap)
      try {
        const res = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0xffd9d7e35b026514787d5a570c9f1311b2eb93e3');
        const data = await res.json();
        if (data?.pair?.priceUsd) {
          priceMap['ERBB'] = parseFloat(data.pair.priceUsd);
          priceMap['BB'] = parseFloat(data.pair.priceUsd); // Use ERBB price for BB as well
        }
      } catch (e) { console.error('ERBB fetch failed:', e); }
      
      setAllPrices(priceMap);
      const newLive: Record<string, number> = {};
      assets.forEach(asset => {
        if (asset.symbol) {
          const sym = asset.symbol.toUpperCase();
          if (priceMap[sym]) newLive[asset.id] = priceMap[sym];
        }
      });
      setLivePrices(newLive);
    } catch (e) {
      console.error('Failed to fetch prices:', e);
    } finally {
      setLoadingPrices(false);
    }
  };

  useEffect(() => { if (isCrypto) fetchAllPrices(); }, [isCrypto]);

  useEffect(() => {
    if (Object.keys(allPrices).length > 0) {
      const newLive: Record<string, number> = {};
      assets.forEach(asset => {
        if (asset.symbol) {
          const sym = asset.symbol.toUpperCase();
          if (allPrices[sym]) newLive[asset.id] = allPrices[sym];
        }
      });
      setLivePrices(newLive);
    }
  }, [assets, allPrices]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    
    // Fallback search strictly from Binance API prices if available
    const fromBinance = Object.keys(allPrices)
      .filter(sym => sym.toLowerCase().includes(q))
      .slice(0, 15)
      .map(sym => ({ name: sym, symbol: sym }));
      
    return fromBinance;
  }, [searchQuery, allPrices]);

  const handleSelectCrypto = (crypto: { name: string; symbol: string }) => {
    setSelectedCrypto(crypto);
    setSearchQuery('');
    const price = allPrices[crypto.symbol.toUpperCase()] || 0;
    setBuyPrice(price);
    if (buyAmountUsd > 0 && price > 0) setBuyTokens(buyAmountUsd / price);
  };

  const handleBuy = async () => {
    const symbol = isBitbon ? 'BB' : selectedCrypto?.symbol?.toUpperCase();
    if (!symbol || buyAmountUsd <= 0 || buyPrice <= 0 || buyTokens <= 0) return;
    setIsSaving(true);
    try {
      const targetId = isBitbon ? buyTargetWalletId : assets.find(a => a.symbol?.toUpperCase() === symbol)?.id;
      const existing = assets.find(a => a.id === targetId);

      if (existing) {
        const totalAmount = existing.amount + buyTokens;
        const existingValue = existing.amount * (existing.averagePrice || 0);
        const newValue = buyTokens * buyPrice;
        const newAvgPrice = totalAmount > 0 ? (existingValue + newValue) / totalAmount : buyPrice;
        await onUpdateAsset(existing.id, { amount: totalAmount, averagePrice: newAvgPrice });
      } else if (selectedCrypto) {
        await onAddAsset({
          portfolioId: portfolio.id,
          name: selectedCrypto.name,
          symbol: symbol,
          amount: buyTokens,
          averagePrice: buyPrice,
        });
      }

      if (onRecordTransaction) {
        await onRecordTransaction({
          portfolioId: portfolio.id,
          assetId: existing?.id || 'new-' + symbol,
          symbol: symbol,
          type: 'buy',
          amountUsd: buyAmountUsd,
          tokens: buyTokens,
          priceUsd: buyPrice,
          date: buyDate || new Date().toISOString().split('T')[0],
          usdRate: buyUsdRate,
          note: buyNote
        });
      }

      setShowBuyForm(false);
      setSelectedCrypto(null);
      setBuyAmountUsd(100);
      setBuyPrice(0);
      setBuyNote('');
      setBuyTargetWalletId('');
    } catch (e) {
      console.error('Failed to save:', e);
      console.error('Помилка: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  // Add existing holdings handler (no USD cost recorded)
  const handleAddExisting = async () => {
    if (!addSelectedCrypto || addAmount <= 0) return;
    setIsSaving(true);
    try {
      const existing = assets.find(a => a.symbol?.toUpperCase() === addSelectedCrypto.symbol.toUpperCase());
      if (existing) {
        const existingValue = existing.amount * (existing.averagePrice || 0);
        const newValue = addAmount * (addAvgPrice || 0);
        const totalAmount = existing.amount + addAmount;
        const newAvg = totalAmount > 0 && (addAvgPrice > 0 || existing.averagePrice) ? (existingValue + newValue) / totalAmount : existing.averagePrice || 0;
        await onUpdateAsset(existing.id, { amount: totalAmount, averagePrice: newAvg });
      } else {
        await onAddAsset({
          portfolioId: portfolio.id,
          name: addSelectedCrypto.name,
          symbol: addSelectedCrypto.symbol.toUpperCase(),
          amount: addAmount,
          averagePrice: addAvgPrice || allPrices[addSelectedCrypto.symbol.toUpperCase()] || 0,
        });
      }
      setShowAddForm(false);
      setAddSelectedCrypto(null);
      setAddSearchQuery('');
      setAddAmount(0);
      setAddAvgPrice(0);
    } catch (e) {
      console.error('Failed to save:', e);
      console.error('Помилка: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  // Sell handler
  const handleSell = async () => {
    if (!sellAsset || sellTokens <= 0) return;
    if (sellTokens > sellAsset.amount) {
      console.warn('Недостатньо токенів для продажу');
      return;
    }
    setIsSaving(true);
    try {
      const newAmount = sellAsset.amount - sellTokens;
      if (newAmount <= 0.000001) {
        await onDeleteAsset(sellAsset.id);
      } else {
        await onUpdateAsset(sellAsset.id, { amount: newAmount });
      }
      if (onRecordTransaction) {
        await onRecordTransaction({
          portfolioId: portfolio.id,
          assetId: sellAsset.id,
          symbol: (sellAsset.symbol || '').toUpperCase(),
          type: 'sell',
          amountUsd: sellAmountUsd,
          tokens: sellTokens,
          priceUsd: sellPrice,
          date: isBitbon ? sellDate : new Date().toISOString().split('T')[0],
          usdRate: isBitbon ? sellUsdRate : undefined,
          note: isBitbon ? sellNote : undefined
        });
      }

      setShowSellForm(false);
      setSellAsset(null);
      setSellTokens(0);
      setSellAmountUsd(0);
      setSellNote('');
    } catch (e) {
      console.error('Failed to sell:', e);
      console.error('Помилка: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  // Income handler
  const handleIncome = async () => {
    if (!incomeAsset || incomeTokens <= 0) return;
    setIsSaving(true);
    try {
      const newAmount = incomeAsset.amount + incomeTokens;
      await onUpdateAsset(incomeAsset.id, { amount: newAmount });
      
      if (onRecordTransaction) {
        await onRecordTransaction({
          portfolioId: portfolio.id,
          assetId: incomeAsset.id,
          symbol: (incomeAsset.symbol || '').toUpperCase(),
          type: 'income',
          amountUsd: incomeAmountUsd,
          tokens: incomeTokens,
          priceUsd: incomePrice || incomeAsset.currentPrice || 0,
          date: isBitbon ? incomeDate : new Date().toISOString().split('T')[0],
          usdRate: isBitbon ? incomeUsdRate : undefined,
          note: isBitbon ? incomeNote : incomeSource
        });
      }

      setShowIncomeForm(false);
      setIncomeAsset(null);
      setIncomeTokens(0);
      setIncomeAmountUsd(0);
      setIncomeNote('');
      setIncomeSource('');
    } catch (e) {
      console.error('Failed to record income:', e);
      console.error('Помилка: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  const openIncomeForm = (asset: PortfolioAsset) => {
    setIncomeAsset(asset);
    setIncomeTokens(0);
    setIncomeAmountUsd(0);
    const price = livePrices[asset.id] || allPrices[asset.symbol?.toUpperCase() || ''] || asset.averagePrice || 1;
    setIncomePrice(price);
    setIncomeMode('tokens');
    setIncomeDate(new Date().toISOString().split('T')[0]);
    setIncomeNote('');
    setShowIncomeForm(true);
    setShowBuyForm(false);
    setShowSellForm(false);
    setShowEditForm(false);
  };

  const openSellForm = (asset: PortfolioAsset) => {
    setSellAsset(asset);
    const price = livePrices[asset.id] || allPrices[asset.symbol?.toUpperCase() || ''] || asset.averagePrice || 0;
    setSellPrice(price);
    setSellTokens(0);
    setSellAmountUsd(0);
    setSellMode('usd');
    setShowSellForm(true);
    setShowBuyForm(false);
    setShowEditForm(false);
  };

  const handleEditSave = async () => {
    if (!editingAsset || !editName) return;
    setIsSaving(true);
    try {
      const updates: Partial<PortfolioAsset> = {
        name: editName,
        amount: editAmount,
      };
      if (isCrypto) {
        updates.symbol = editSymbol;
        updates.averagePrice = editAvgPrice;
      } else {
        updates.currentPrice = editCurrentPrice;
      }
      await onUpdateAsset(editingAsset.id, updates);
      setShowEditForm(false);
      setEditingAsset(null);
    } catch (e) {
      console.error('Failed to save:', e);
      console.error('Помилка: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (asset: PortfolioAsset) => {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditSymbol(asset.symbol || '');
    setEditAmount(asset.amount);
    setEditAvgPrice(asset.averagePrice || 0);
    setEditCurrentPrice(asset.currentPrice || 0);
    setShowEditForm(true);
    setShowBuyForm(false);
    setShowSellForm(false);
  };

  const handleBuyExisting = (asset: PortfolioAsset) => {
    setSelectedCrypto({ name: asset.name, symbol: asset.symbol || '' });
    setBuyPrice(livePrices[asset.id] || allPrices[asset.symbol?.toUpperCase() || ''] || asset.averagePrice || 0);
    setBuyAmountUsd(100);
    setShowBuyForm(true);
    setShowEditForm(false);
    setShowSellForm(false);
  };

  const formatUsd = (val: number) => {
    return formatGlobal(val, 'USD');
  };

  const formatPrice = (val: number) => {
    if (globalCurrency === 'USD') {
      if (val >= 1) return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (val >= 0.01) return `$${val.toFixed(4)}`;
      return `$${val.toFixed(8)}`;
    }
    return formatGlobal(val, 'USD');
  };

  // Asset analytics
  const assetAnalytics = useMemo(() => {
    const majorTokens = ['BTC', 'ETH', 'SOL', 'BNB', 'USDT', 'USDC', 'TON', 'USDS'];
    
    return assets
      .map(a => {
        const liveP = isCrypto ? (livePrices[a.id] || a.averagePrice || 0) : (a.currentPrice || 0);
        const currentValue = a.amount * liveP;
        const invested = a.amount * (a.averagePrice || 0);
        const profit = currentValue - invested;
        const roiPct = invested > 0 ? (profit / invested) * 100 : 0;
        return { 
          id: a.id, 
          name: a.name, 
          symbol: a.symbol, 
          amount: a.amount, 
          avgPrice: a.averagePrice || 0, 
          livePrice: liveP, 
          currentValue, 
          invested, 
          profit, 
          roiPct, 
          metadata: a.metadata, 
          accountType: a.accountType 
        };
      })
      .filter(a => {
        // Relaxed filters to restore disappeared assets
        return true;
        /*
        const valueOk = a.currentValue >= 10 || a.invested >= 10;
        const amountOk = a.amount >= 5 || majorTokens.includes(a.symbol?.toUpperCase() || '');
        // Resilience: show if amount is significant even if price is missing
        const isSignificant = a.amount >= 100 && isCrypto;
        // Keep manually added assets
        const isManual = a.metadata?.source === 'manual';
        
        return (valueOk && (amountOk || isManual)) || isSignificant;
        */
      });


  }, [assets, livePrices, isCrypto]);


  const totalValueUsd = assetAnalytics.reduce((s, a) => s + a.currentValue, 0);
  const totalInvestedUsd = assetAnalytics.reduce((s, a) => s + a.invested, 0);
  const profitUsd = totalValueUsd - totalInvestedUsd;
  const roi = totalInvestedUsd > 0 ? (profitUsd / totalInvestedUsd) * 100 : 0;

  const allocationChartData = useMemo(() => {
    const sorted = [...assetAnalytics].sort((a, b) => b.currentValue - a.currentValue);
    const top = sorted.slice(0, 6);
    const others = sorted.slice(6);
    const othersValue = others.reduce((s, a) => s + a.currentValue, 0);

    const labels = top.map(a => a.symbol || a.name);
    const data = top.map(a => a.currentValue);

    if (othersValue > 0) {
      labels.push('Інші');
      data.push(othersValue);
    }

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // Blue
          'rgba(16, 185, 129, 0.8)',   // Green
          'rgba(245, 158, 11, 0.8)',   // Amber
          'rgba(239, 68, 68, 0.8)',    // Red
          'rgba(139, 92, 246, 0.8)',   // Violet
          'rgba(236, 72, 153, 0.8)',   // Pink
          'rgba(107, 114, 128, 0.5)',  // Gray
        ],
        borderWidth: 0,
        hoverOffset: 10
      }]
    };
  }, [assetAnalytics]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className={`glass-card md:p-10 p-6 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-2xl transition-all duration-500 hover-lift relative overflow-hidden backdrop-blur-xl ${portfolio.type === 'crypto' ? 'bg-gradient-to-br from-white/40 to-emerald-50/20 dark:from-zinc-900/60 dark:to-emerald-900/20' : 'bg-white/40 dark:bg-zinc-900/60'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-900 dark:bg-zinc-100 rounded-2xl shadow-lg">
              {isCrypto ? <TrendingUp className="w-5 h-5 text-white dark:text-zinc-900" /> : <Wallet className="w-5 h-5 text-white dark:text-zinc-900" />}
            </div>
            <div>
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-0.5">{portfolio.type}</div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{portfolio.name}</h2>
            </div>
            {onDeletePortfolio && !['bitbon', 'crypto'].includes(portfolio.id) && (
              <button onClick={() => onDeletePortfolio(portfolio.id)} className="ml-2 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" title="Видалити портфель">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Analytics Header for Bitbon */}
          {isBitbon && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-indigo-500/5 dark:bg-indigo-900/10 p-5 rounded-[32px] border border-indigo-100 dark:border-indigo-800/30">
                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Капітал у Bitbon</div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">{assets.reduce((sum, a) => sum + a.amount, 0).toLocaleString()} BB</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase mt-1">≈ {formatGlobal(assets.reduce((sum, a) => sum + a.amount * (a.currentPrice || 1), 0), 'USD')}</div>
              </div>
              <div className="bg-emerald-500/5 dark:bg-emerald-900/10 p-5 rounded-[32px] border border-emerald-100 dark:border-emerald-800/30">
                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Дохід в BB</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">+{portfolio.totalIncomeTokens || 0} BB</div>
                {portfolio.totalIncomeUsd && (
                  <div className="text-[9px] font-bold text-zinc-500 uppercase mt-1">≈ {formatGlobal(portfolio.totalIncomeUsd, 'USD')}</div>
                )}
              </div>
              <div className="bg-amber-500/5 dark:bg-amber-900/10 p-5 rounded-[32px] border border-amber-100 dark:border-amber-800/30">
                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Куплено BB ($)</div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">{formatGlobal(portfolio.totalBoughtUsd || 0, 'USD')}</div>
              </div>
              <div className="bg-red-500/5 dark:bg-red-900/10 p-5 rounded-[32px] border border-red-100 dark:border-red-800/30">
                <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Продано BB ($)</div>
                <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">{formatGlobal(portfolio.totalSoldUsd || 0, 'USD')}</div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {isCrypto && (
              <button onClick={fetchAllPrices} disabled={loadingPrices} className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm text-zinc-700 dark:text-zinc-200 rounded-full text-[11px] font-bold hover:bg-white dark:hover:bg-zinc-700 transition-all shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPrices ? 'animate-spin' : ''}`} /> 
                Оновити ціни
              </button>
            )}
            {(isCrypto || isBitbon) && (
              <button
                onClick={() => { 
                  if (isBitbon) {
                    setEditName(''); setEditSymbol('BB'); setEditAmount(0); setEditingAsset(null); setShowAddForm(true); 
                  } else {
                    setShowAddForm(true); setShowBuyForm(false); setShowSellForm(false); setShowEditForm(false); setAddSelectedCrypto(null); setAddSearchQuery(''); setAddAmount(0); setAddAvgPrice(0); 
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[11px] font-bold hover:opacity-90 transition-all shadow-lg uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" /> {isBitbon ? 'Додати гаманець' : 'Додати актив'}
              </button>
            )}
            {isBitbon && (
              <>
                <button 
                  onClick={() => { setSelectedCrypto({ name: 'Bitbon', symbol: 'BB' }); setBuyAmountUsd(100); setBuyPrice(assets[0]?.currentPrice || 1); setShowBuyForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-full text-[11px] font-bold hover:bg-emerald-700 transition-all shadow-lg uppercase tracking-wider"
                >
                  <ShoppingCart className="w-3.5 h-3.5" /> Купити BB
                </button>
                <button 
                  onClick={() => { setShowSellForm(true); setSellAsset(assets[0] || null); }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full text-[11px] font-bold hover:bg-red-700 transition-all shadow-lg uppercase tracking-wider"
                >
                  <Minus className="w-3.5 h-3.5" /> Продати BB
                </button>
                <button 
                  onClick={() => { setShowTransferForm(true); setTransferSourceId(assets[0]?.id || ''); setTransferTargetId(assets[1]?.id || ''); }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-[11px] font-bold hover:bg-indigo-700 transition-all shadow-lg uppercase tracking-wider"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Перемістити
                </button>
              </>
            )}
            {availableBalanceUsd !== undefined && (
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
                <Wallet className="w-3.5 h-3.5" />
                <div className="flex flex-col leading-none">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-80 mb-0.5">Доступно</span>
                  <span className="text-[11px] font-black">{formatGlobal(availableBalanceUsd * usdRate)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary horizontal grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/30 dark:bg-zinc-900/40 backdrop-blur-md p-6 rounded-[32px] border border-white/20 dark:border-white/5 shadow-sm relative group overflow-hidden">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 opacity-60">Текуча вартість</div>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{formatUsd(totalValueUsd)}</div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
          </div>
          {isCrypto && (
            <>
              <div className="bg-white/30 dark:bg-zinc-900/40 backdrop-blur-md p-6 rounded-[32px] border border-white/20 dark:border-white/5 shadow-sm relative group overflow-hidden">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 opacity-60">Вкладено</div>
                <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{formatUsd(totalInvestedUsd)}</div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
              </div>
              <div className={`bg-white/30 dark:bg-zinc-900/40 backdrop-blur-md p-6 rounded-[32px] border shadow-sm relative group overflow-hidden ${profitUsd >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 opacity-60">Прибуток / ROI</div>
                <div className={`text-3xl font-black flex items-baseline gap-2 ${profitUsd >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {profitUsd >= 0 ? '+' : ''}{formatUsd(profitUsd)}
                  <span className="text-xs font-black opacity-80">({roi >= 0 ? '+' : ''}{roi.toFixed(2)}%)</span>
                </div>
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 blur-2xl group-hover:opacity-20 transition-all ${profitUsd >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}></div>
              </div>
            </>
          )}
        </div>

        {/* ERBB Real-time Price & Chart */}
        {isBitbon && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-1 bg-white/30 dark:bg-zinc-900/40 backdrop-blur-md p-6 rounded-[32px] border border-emerald-500/20 shadow-sm overflow-hidden relative group">
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 opacity-60">Фактична ціна ERBB</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-emerald-500">
                  {allPrices['ERBB'] ? `$${allPrices['ERBB'].toFixed(4)}` : '$1.1240'}
                </div>
                <div className="text-xs font-bold text-emerald-600/60 uppercase tracking-tight">USDT</div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-500/5 px-2 py-1 rounded-lg w-fit">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> Live Price
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
            </div>
            
            <div className="md:col-span-2 bg-white/30 dark:bg-zinc-900/40 backdrop-blur-md p-4 rounded-[32px] border border-white/20 dark:border-white/5 shadow-sm min-h-[300px]">
               <iframe 
                src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_762ae&symbol=UNISWAP%3AERBBWETH&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=${theme === 'dark' ? 'dark' : 'light'}&style=1&timezone=Europe%2FKiev&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=UNISWAP%3AERBBWETH`}
                style={{ width: '100%', height: '300px', border: 'none', borderRadius: '24px' }}
               />
            </div>
          </div>
        )}

        {/* Allocation Chart & Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-1 glass-card p-6 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-xl flex flex-col items-center bg-white/10 backdrop-blur-md">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">Розподіл часток</h4>
            <div className="w-full max-w-[170px] aspect-square relative flex items-center justify-center">
              <Doughnut 
                id={`portfolio-allocation-doughnut-${chartIdSuffix}`}
                key={`portfolio-allocation-doughnut-${chartIdSuffix}`}
                data={allocationChartData} 
                options={{
                  cutout: '80%',
                  plugins: { legend: { display: false } },
                  maintainAspectRatio: true
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Портфель</span>
                <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{formatUsd(totalValueUsd).split('.')[0]}</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {allocationChartData.labels?.slice(0, 3).map((label, i) => (
                <div key={label as string} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (allocationChartData.datasets[0].backgroundColor as string[])[i] }} />
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tight">{label as string}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="glass-card p-6 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-xl bg-gradient-to-br from-white/20 to-blue-50/10 dark:from-white/5 dark:to-blue-900/5 transition-all hover:scale-[1.01]">
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Поточне значення</div>
              <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{formatUsd(totalValueUsd)}</div>
            </div>
            <div className="glass-card p-6 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-xl flex flex-col justify-between hover:scale-[1.01] transition-all">
              <div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Чистий прибуток</div>
                <div className={`text-2xl font-black ${profitUsd >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {profitUsd >= 0 ? '+' : '-'}{formatUsd(Math.abs(profitUsd))}
                </div>
              </div>
              <div className={`mt-2 py-1 px-3 rounded-xl text-[10px] font-black w-fit ${roi >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {roi >= 0 ? '+' : ''}{roi.toFixed(1)}% ROI
              </div>
            </div>
          </div>
        </div>

        {isCrypto && assets.length > 0 && (
          <div className="bg-zinc-950/[0.03] dark:bg-zinc-100/[0.03] rounded-[40px] p-8 mb-8 border border-zinc-200/50 dark:border-white/5 shadow-inner">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest mb-1">Динаміка вартості</h3>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-tight">Дані з Binance API</p>
              </div>
              <div className="flex flex-wrap gap-1.5 p-1 bg-white/50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                {['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'].map(tf => (
                  <button key={tf} onClick={() => setChartTimeframe(tf)} disabled={isLoadingChart}
                    className={`px-4 py-2 text-[10px] font-black transition-all rounded-xl ${
                      chartTimeframe === tf 
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg scale-105' 
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}>
                    {tf === '1D' ? '1Д' : tf === '1W' ? '1Т' : tf === '1M' ? '1М' : tf === '3M' ? '3М' : tf === '6M' ? '6М' : tf === '1Y' ? '1Р' : 'ВСІ'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-[300px] w-full relative">
              {isLoadingChart ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Завантаження даних...</span>
                  </div>
                </div>
              ) : chartData.labels.length > 0 ? (
                <Line
                  id={`portfolio-dynamics-line-${chartIdSuffix}`}
                  key={`portfolio-dynamics-line-${chartIdSuffix}`}
                  data={{
                    labels: chartData.labels,
                      datasets: [{
                        label: 'Вартість портфеля',
                        data: chartData.data.map(v => currency === 'USD' ? v : v * usdRate),
                        borderColor: '#10b981',
                        backgroundColor: (context: any) => {
                          const chart = context.chart;
                          const {ctx, chartArea} = chart;
                          if (!chartArea) return 'transparent';
                          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
                          gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.1)');
                          gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                          return gradient;
                        },
                        borderWidth: 4,
                        fill: true,
                        tension: 0.45,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#10b981',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 3,
                        hoverBorderWidth: 4
                      }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(9, 9, 11, 0.9)',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 14, weight: 'bold' },
                        padding: 12,
                        cornerRadius: 16,
                        displayColors: false,
                        callbacks: {
                          label: (c) => ` ${currency === 'USD' ? '$' : '₴'}${c.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        }
                      }
                    },
                    scales: {
                      x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 10, weight: 'bold' }, color: '#a1a1aa' } },
                      y: { border: { display: false }, grid: { color: 'rgba(161, 161, 170, 0.1)', drawTicks: false }, ticks: { maxTicksLimit: 6, font: { size: 10, weight: 'bold' }, color: '#a1a1aa', callback: (v) => `${currency === 'USD' ? '$' : '₴'}${Number(v).toLocaleString()}` } }
                    }
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-zinc-400 uppercase tracking-widest opacity-50">Немає історичних даних</div>
              )}
            </div>
          </div>
        )}

        {/* "Add Existing" Form — import holdings without cost */}
        {showAddForm && isCrypto && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-indigo-200 dark:border-indigo-800/50 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-tight">📥 Додати активи</h4>
                <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 bg-indigo-50 dark:bg-indigo-900/20 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-800/40">
                Внесіть існуючі активи без запису транзакції покупки.
              </p>
              {!addSelectedCrypto && !isBitbon ? (
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block font-black">Шукати криптовалюту</label>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input type="text" value={addSearchQuery} onChange={e => setAddSearchQuery(e.target.value)}
                      placeholder="Пошук за тикером..."
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-indigo-500" autoFocus />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">{WalletLabel} (Назва)</label>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Напр. Genesis" 
                        className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Початкова кількість BB</label>
                      <input type="number" step="any" value={editAmount || ''} onChange={e => setEditAmount(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setShowAddForm(false); setAddSelectedCrypto(null); }} className="px-6 py-3 text-sm font-black text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all uppercase tracking-widest font-black">Скасувати</button>
                    <button onClick={handleAddExisting} disabled={((isBitbon && !editName) || (!isBitbon && addAmount <= 0)) || isSaving}
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-indigo-500/30 uppercase tracking-widest font-black">
                      {isSaving ? 'Збереження...' : `📥 Додати ${walletLabel}`}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>,
          document.body
        )}

        {/* Buy Form */}
        {showBuyForm && isCrypto && (
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-8 rounded-[32px] border border-emerald-200 dark:border-emerald-800/50 mb-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">🛒 Купити криптоактив</h4>
              <button onClick={() => setShowBuyForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            {availableBalanceUsd !== undefined && (
              <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/50 text-sm">
                <span className="text-indigo-600 dark:text-indigo-400">Доступний баланс: </span>
                <span className="font-bold text-indigo-900 dark:text-indigo-100">{formatUsd(availableBalanceUsd)}</span>
              </div>
            )}
            {!selectedCrypto && !isBitbon ? (
              <div>
                <label className="block text-xs text-zinc-500 mb-2">Оберіть криптовалюту</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Пошук за назвою або тикером..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500" autoFocus />
                </div>
                {/* Search results grid */}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm">
                    <ShoppingCart className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black">{selectedCrypto?.symbol || 'BB'}</span>
                      <span className="text-sm text-zinc-500">{selectedCrypto?.name || 'Bitbon'}</span>
                    </div>
                  </div>
                  {!isBitbon && <button onClick={() => setSelectedCrypto(null)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Змінити</button>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Цільовий гаманець</label>
                    <select 
                      value={buyTargetWalletId} 
                      onChange={e => setBuyTargetWalletId(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    >
                      <option value="">-- Оберіть гаманець --</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Дата покупки</label>
                    <input type="date" value={buyDate} onChange={e => setBuyDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Сума покупки ($)</label>
                    <input type="number" step="any" value={buyAmountUsd || ''} onChange={e => handleBuyUsdChange(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold focus:ring-2 focus:ring-emerald-500/20" autoFocus />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Ціна за 1 {selectedCrypto?.symbol || 'BB'} ($)</label>
                    <input type="number" step="any" value={buyPrice || ''} onChange={e => { const v = Number(e.target.value); setBuyPrice(v); if (buyTokens > 0) setBuyAmountUsd(buyTokens * v); else if (buyAmountUsd > 0) setBuyTokens(buyAmountUsd / v); }}
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                  {isBitbon && (
                    <div className="md:col-span-2">
                       <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Курс долара (UAH/$)</label>
                       <input type="number" step="any" value={buyUsdRate || ''} onChange={e => setBuyUsdRate(Number(e.target.value))}
                         className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Примітка</label>
                    <input type="text" value={buyNote} onChange={e => setBuyNote(e.target.value)} placeholder="Додаткова інформація..."
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" />
                  </div>
                </div>

                {buyTokens > 0 && buyAmountUsd > 0 && (
                  <div className="mb-6 p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 text-sm">
                    Буде зараховано: <strong className="text-base">{buyTokens < 1 ? buyTokens.toFixed(8) : buyTokens.toLocaleString()} {selectedCrypto?.symbol || 'BB'}</strong>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowBuyForm(false); setSelectedCrypto(null); }} className="px-6 py-3 text-sm font-black text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all uppercase tracking-widest">Скасувати</button>
                  <button onClick={handleBuy} disabled={buyAmountUsd <= 0 || buyPrice <= 0 || isSaving || (isBitbon && !buyTargetWalletId)}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-emerald-500/30 uppercase tracking-widest">
                    {isSaving ? 'Збереження...' : `🛒 Підтвердити Купівлю`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transfer Form */}
        {showTransferForm && isBitbon && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTransferForm(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-indigo-200 dark:border-indigo-800/50 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-600/10 rounded-2xl text-indigo-600">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-indigo-900 dark:text-zinc-100 uppercase tracking-tight">Перемістити Bitbon</h3>
                </div>
                <button onClick={() => setShowTransferForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Звідки (Джерело)</label>
                    <div className="grid grid-cols-1 gap-2">
                      {assets.map(a => (
                        <button 
                          key={a.id} 
                          onClick={() => { setTransferSourceId(a.id); setTransferAmount(0); }}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${transferSourceId === a.id ? 'border-indigo-500 bg-indigo-500/5 ring-4 ring-indigo-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                        >
                          <span className="font-bold text-sm">{a.name}</span>
                          <span className="text-xs text-zinc-500 font-bold">{a.amount.toLocaleString()} BB</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Куди (Ціль)</label>
                    <div className="grid grid-cols-1 gap-2">
                      {assets.map(a => (
                        <button 
                          key={a.id} 
                          onClick={() => setTransferTargetId(a.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${transferTargetId === a.id ? 'border-indigo-500 bg-indigo-500/5 ring-4 ring-indigo-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                        >
                          <span className="font-bold text-sm">{a.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-[24px] border border-zinc-200 dark:border-zinc-800 mb-8">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Кількість для переміщення</label>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <input 
                        type="number" 
                        value={transferAmount || ''} 
                        onChange={e => setTransferAmount(Number(e.target.value))}
                        className="w-full px-6 py-4 rounded-2xl border-none bg-white dark:bg-zinc-900 text-2xl font-black focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                        placeholder="0.00"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-400">BB</span>
                    </div>
                    <button 
                      onClick={() => setTransferAmount(assets.find(a => a.id === transferSourceId)?.amount || 0)}
                      className="px-6 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black text-xs hover:opacity-90 transition-all uppercase tracking-widest"
                    >
                      MAX
                    </button>
                  </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => setShowTransferForm(false)} className="px-8 py-4 text-sm font-black text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all uppercase tracking-widest">Скасувати</button>
                <button 
                  onClick={handleTransfer} 
                  disabled={isSaving || transferAmount <= 0 || transferSourceId === transferTargetId || transferAmount > (assets.find(a => a.id === transferSourceId)?.amount || 0)}
                  className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-indigo-500/30 uppercase tracking-widest"
                >
                  {isSaving ? 'Переміщення...' : '🚀 Підтвердити переміщення'}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* Sell Form */}
        {showSellForm && (isCrypto || isBitbon) && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSellForm(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-red-200 dark:border-red-800/50 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-600/10 rounded-2xl text-red-600">
                    <Minus className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-red-700 dark:text-red-400 uppercase tracking-tight">Продати {isBitbon ? 'Bitbon' : walletLabel}</h3>
                </div>
                <button onClick={() => setShowSellForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"><X className="w-5 h-5" /></button>
              </div>
              
              {!sellAsset ? (
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Оберіть гаманець для продажу</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {assets.map(asset => (
                      <button key={asset.id} onClick={() => openSellForm(asset)}
                        className="text-left p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-red-300 transition-all flex justify-between items-center group">
                        <div>
                          <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase">{asset.name}</div>
                          <div className="text-[10px] text-zinc-500 font-bold mt-0.5">{asset.amount.toLocaleString()} BB</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-6 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm">
                      <TrendingUp className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black">{sellAsset.name}</span>
                        <span className="text-sm text-zinc-500">Доступно: {sellAsset.amount.toLocaleString()} BB</span>
                      </div>
                    </div>
                    <button onClick={() => setSellAsset(null)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">Змінити</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Дата продажу</label>
                      <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Кількість для продажу (BB)</label>
                      <div className="relative">
                        <input type="number" step="any" value={sellTokens || ''} onChange={e => handleSellTokensChange(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                        <button onClick={() => handleSellTokensChange(sellAsset.amount)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl hover:bg-zinc-200 transition-all">MAX</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Сума продажу ($)</label>
                      <input type="number" step="any" value={sellAmountUsd || ''} onChange={e => handleSellUsdChange(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Ціна за 1 BB ($)</label>
                      <input type="number" step="any" value={sellPrice || ''} onChange={e => { setSellPrice(Number(e.target.value)); if (sellTokens > 0) setSellAmountUsd(sellTokens * Number(e.target.value)); }}
                        className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                    </div>
                    {isBitbon && (
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Курс долара (UAH/$)</label>
                        <input type="number" step="any" value={sellUsdRate || ''} onChange={e => setSellUsdRate(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Примітка</label>
                      <input type="text" value={sellNote} onChange={e => setSellNote(e.target.value)} placeholder="Коментар до транзакції..."
                        className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-8">
                    <button onClick={() => { setShowSellForm(false); setSellAsset(null); }} className="px-8 py-4 text-sm font-black text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all uppercase tracking-widest">Скасувати</button>
                    <button onClick={handleSell} disabled={sellTokens <= 0 || (sellAsset && sellTokens > sellAsset.amount) || isSaving}
                      className="px-10 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-red-500/30 uppercase tracking-widest">
                      {isSaving ? 'Збереження...' : '🚀 Підтвердити продаж'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>,
          document.body
        )}
        {showIncomeForm && (isCrypto || isBitbon) && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIncomeForm(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-emerald-200 dark:border-emerald-800/50 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600/10 rounded-2xl text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">Нарахування для {incomeAsset?.name}</h3>
                </div>
                <button onClick={() => setShowIncomeForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Дата нарахування</label>
                  <input type="date" value={incomeDate} onChange={e => setIncomeDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Кількість (BB)</label>
                  <input type="number" step="any" value={incomeTokens || ''} onChange={e => handleIncomeTokensChange(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Еквівалент ($)</label>
                  <input type="number" step="any" value={incomeAmountUsd || ''} onChange={e => handleIncomeUsdChange(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Курс за 1 BB ($)</label>
                  <input type="number" step="any" value={incomePrice || ''} onChange={e => { setIncomePrice(Number(e.target.value)); if (incomeTokens > 0) setIncomeAmountUsd(incomeTokens * Number(e.target.value)); }}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                </div>
                {isBitbon && (
                  <div className="md:col-span-2">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Курс долара (UAH/$)</label>
                     <input type="number" step="any" value={incomeUsdRate || ''} onChange={e => setIncomeUsdRate(Number(e.target.value))}
                       className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-bold" />
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1 mb-2 block">Примітка / Джерело</label>
                  <input type="text" value={incomeNote} onChange={e => setIncomeNote(e.target.value)} placeholder="Наприклад: Провайдинг, Бонус..."
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button onClick={() => { setShowIncomeForm(false); setIncomeAsset(null); }} className="px-8 py-4 text-sm font-black text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all uppercase tracking-widest">Скасувати</button>
                <button onClick={handleIncome} disabled={incomeTokens <= 0 || isSaving}
                  className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-emerald-500/30 uppercase tracking-widest">
                  {isSaving ? 'Збереження...' : '✨ Підтвердити нарахування'}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* Edit Form */}
        {showEditForm && editingAsset && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditForm(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">Редагувати {walletLabel}</h4>
                <button onClick={() => setShowEditForm(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div><label className="block text-xs text-zinc-500 mb-1">Назва</label><input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>
                {isCrypto && <div><label className="block text-xs text-zinc-500 mb-1">Тикер</label><input type="text" value={editSymbol} onChange={e => setEditSymbol(e.target.value)} className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>}
                <div><label className="block text-xs text-zinc-500 mb-1">Кількість</label><input type="number" step="any" value={editAmount || ''} onChange={e => setEditAmount(Number(e.target.value))} className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>
                {isCrypto ? (
                  <div><label className="block text-xs text-zinc-500 mb-1">Середня ціна ($)</label><input type="number" step="any" value={editAvgPrice || ''} onChange={e => setEditAvgPrice(Number(e.target.value))} className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>
                ) : (
                  <div><label className="block text-xs text-zinc-500 mb-1">Оціночна вартість ($)</label><input type="number" step="any" value={editCurrentPrice || ''} onChange={e => setEditCurrentPrice(Number(e.target.value))} className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent" /></div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowEditForm(false)} className="px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">Скасувати</button>
                <button onClick={handleEditSave} disabled={isSaving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md font-medium">{isSaving ? 'Збереження...' : 'Зберегти'}</button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {/* Assets Table */}
        {assets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] md:text-xs text-zinc-500 uppercase bg-zinc-100/50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-1.5 md:px-4 py-2 md:py-3 rounded-tl-lg">{isBitbon ? 'Гаманець' : 'Актив'}</th>
                  <th className="px-1.5 md:px-4 py-2 md:py-3 text-center sm:text-left">К-сть</th>
                  {isCrypto && <th className="hidden sm:table-cell px-4 py-3">Сер. ціна</th>}
                  <th className="hidden sm:table-cell px-4 py-3">Поточна</th>
                  <th className="px-1.5 md:px-4 py-2 md:py-3 font-bold text-zinc-900 dark:text-zinc-100">Вартість</th>
                  {isCrypto && <th className="hidden lg:table-cell px-4 py-3">Прибуток</th>}
                  <th className="px-1.5 md:px-4 py-2 md:py-3 rounded-tr-lg text-right">Дії</th>
                </tr>
              </thead>
              <tbody>
                {assetAnalytics.map(a => {
                  const asset = assets.find(x => x.id === a.id)!;
                  const share = totalValueUsd > 0 ? (a.currentValue / totalValueUsd) * 100 : 0;
                  const isExpanded = expandedAssetId === a.id;
                  const typeLabel = {
                    trading: 'Торговий',
                    funding: 'Фінансування',
                    savings: 'Заробіток',
                    staking: 'Стейкінг',
                    position: 'Позиція'
                  }[a.accountType || ''] || a.accountType;
                  const purchaseDate = a.metadata?.lastPurchaseDate ? new Date(a.metadata.lastPurchaseDate).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;

                  return (
                    <React.Fragment key={a.id}>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedAssetId(isExpanded ? null : a.id)}>
                        <td className="px-1.5 md:px-4 py-2 md:py-3 font-medium">
                          <div className="flex items-center gap-1.5">
                            {isCrypto && (isExpanded ? <ChevronUp className="w-3 h-3 text-zinc-400" /> : <ChevronDown className="w-3 h-3 text-zinc-400" />)}
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs md:text-base leading-none font-bold text-zinc-900 dark:text-zinc-100">{a.name}</span>
                                {a.accountType && (
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest ${
                                    a.accountType === 'savings' || a.accountType === 'staking' 
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                      : a.accountType === 'trading' 
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  }`}>
                                    {typeLabel}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {a.symbol && <span className="text-[9px] text-zinc-500 uppercase font-medium">{a.symbol}</span>}
                                {purchaseDate && <span className="text-[9px] text-blue-500 font-bold uppercase tracking-tight">Куплено {purchaseDate}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-1.5 md:px-4 py-2 md:py-3 text-zinc-600 dark:text-zinc-400 text-xs md:text-sm">
                          {a.amount < 1 ? a.amount.toFixed(4) : a.amount.toLocaleString('uk-UA', { maximumFractionDigits: 2 })}
                          <div className="sm:hidden flex flex-col gap-0.5 mt-1">
                            <div className="text-[8px] opacity-70 flex items-center gap-1">
                              <span className="uppercase text-[6px] px-1 bg-zinc-100 dark:bg-zinc-800 rounded">Сер</span>
                              {formatPrice(a.avgPrice)}
                            </div>
                            <div className="text-[8px] font-bold text-blue-500 flex items-center gap-1">
                              <span className="uppercase text-[6px] px-1 bg-blue-50 dark:bg-blue-900/30 rounded">Лайв</span>
                              {formatPrice(a.livePrice)}
                            </div>
                          </div>
                        </td>
                        {isCrypto && <td className="hidden sm:table-cell px-4 py-3 opacity-60">{formatPrice(a.avgPrice)}</td>}
                        <td className="hidden sm:table-cell px-4 py-3">{formatPrice(a.livePrice)}</td>
                        <td className="px-1.5 md:px-4 py-2 md:py-3 font-bold text-zinc-900 dark:text-zinc-100 text-xs md:text-sm">
                          {formatUsd(a.currentValue)}
                          {isCrypto && (
                            <div className={`sm:hidden text-[9px] font-bold mt-0.5 ${a.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {a.roiPct >= 0 ? '+' : ''}{a.roiPct.toFixed(1)}%
                            </div>
                          )}
                        </td>
                        {isCrypto && (
                          <td className={`hidden lg:table-cell px-4 py-3 font-medium ${a.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {a.profit >= 0 ? '+' : ''}{formatUsd(a.profit)} <span className="text-xs opacity-70">({a.roiPct >= 0 ? '+' : ''}{a.roiPct.toFixed(1)}%)</span>
                          </td>
                        )}
                        <td className="px-1.5 md:px-4 py-2 md:py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-0.5 md:gap-1">
                            {isCrypto && isBitbon && <button onClick={() => openIncomeForm(asset)} title="Нарахування" className="p-1 md:p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"><TrendingUp className="w-3 h-3 md:w-4 md:h-4" /></button>}
                            {isCrypto && !isBitbon && <button onClick={() => handleBuyExisting(asset)} className="p-1 md:p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"><ShoppingCart className="w-3 h-3 md:w-4 md:h-4" /></button>}
                            <button onClick={() => handleEdit(asset)} className="p-1 md:p-2 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Edit2 className="w-3 h-3 md:w-4 md:h-4" /></button>
                            <button onClick={() => onDeleteAsset(asset.id)} className="p-1 md:p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-3 h-3 md:w-4 md:h-4" /></button>
                          </div>
                        </td>
                      </tr>
                      {/* Per-asset analytics row */}
                      {isExpanded && isCrypto && (
                        <tr className="bg-zinc-50/50 dark:bg-zinc-800/50">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <div className="text-[10px] text-zinc-500 uppercase mb-1">Вкладено</div>
                                <div className="text-sm font-bold">{formatUsd(a.invested)}</div>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <div className="text-[10px] text-zinc-500 uppercase mb-1">Поточна вартість</div>
                                <div className="text-sm font-bold">{formatUsd(a.currentValue)}</div>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <div className="text-[10px] text-zinc-500 uppercase mb-1">Прибуток</div>
                                <div className={`text-sm font-bold ${a.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {a.profit >= 0 ? '+' : ''}{formatUsd(a.profit)}
                                </div>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <div className="text-[10px] text-zinc-500 uppercase mb-1">Доля портфеля</div>
                                <div className="text-sm font-bold">{share.toFixed(1)}%</div>
                                <div className="mt-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(share, 100)}%` }} />
                                </div>
                              </div>
                              {a.metadata?.lastSync && (
                                <div className="col-span-2 md:col-span-4 mt-2 px-1">
                                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest leading-relaxed">
                                    Остання синхронізація: {new Date(a.metadata.lastSync).toLocaleString('uk-UA')} · Джерело: {a.metadata.source || 'Manual'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500">
            <p>Немає {walletLabel}ів у цьому портфелі.</p>
            <button onClick={() => { 
               if (isBitbon) {
                 setSelectedCrypto({ name: 'Bitbon', symbol: 'BB' }); setBuyAmountUsd(100); setBuyPrice(1); setShowBuyForm(true);
               } else {
                 setShowBuyForm(true); setSelectedCrypto(null); 
               }
            }} className="mt-2 text-emerald-600 hover:underline text-sm">Купити перший {walletLabel}</button>
          </div>
        )}
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {confirmDeleteAssetId && createPortal(
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmDeleteAssetId(null)}
                className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl border border-zinc-200 dark:border-white/5 text-center"
              >
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter mb-2">Видалити {walletLabel}?</h3>
                <p className="text-sm font-bold text-zinc-400 mb-8 uppercase tracking-widest leading-relaxed">Цю дію неможливо буде скасувати. Всі дані про цей {walletLabel} будуть видалені з історії.</p>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => setConfirmDeleteAssetId(null)}
                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all"
                  >
                    Скасувати
                  </button>
                  <button 
                    onClick={() => {
                      onDeleteAsset(confirmDeleteAssetId);
                      setConfirmDeleteAssetId(null);
                    }}
                    className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    Видалити
                  </button>
                </div>
              </motion.div>
            </div>,
            document.body
          )}
        </AnimatePresence>
      </motion.div>
    );
}
