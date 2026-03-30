import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Account, BudgetCategory, BudgetTx, Currency, Transaction, Portfolio, 
  PortfolioAsset, PortfolioTransaction, BitbonAllocation, MonthlyPlan, 
  Goal, BankConnection, Cushion, PortfolioType, Asset, Debt 
} from './types';
import Budget from './components/Budget';
import PortfolioView from './components/PortfolioView';
import { MarketTicker } from './components/MarketTicker';
import { IOAssistant } from './components/IOAssistant';
import { 
  auth, db, handleFirestoreError, OperationType,
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut,
  collection, doc, onSnapshot, setDoc, deleteDoc, getDocFromServer
} from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import { CFG } from './constants/config';
import Header from './components/layout/Header';
import InvestmentsTab from './components/features/investments/InvestmentsTab';
import { LogIn, TrendingUp, Wallet } from 'lucide-react';
import { TRANSLATIONS } from './translations';
import { formatGlobal as formatGlobalUtil } from './utils/format';
import { memoryService } from './services/memoryService';

type Language = 'uk' | 'ru' | 'en';

export default function App() {
  const [theme, setTheme] = useState<'default' | 'ocean' | 'sunset' | 'forest' | 'cyberpunk'>(() => (localStorage.getItem('appTheme') as any) || 'default');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('appLang') as Language) || 'uk');
  
  const t = useCallback((key: string) => {
    return TRANSLATIONS[language]?.[key] || key;
  }, [language]);

  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Стан бюджету
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<BudgetTx[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cushion, setCushion] = useState<Cushion | null>(null);
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [budgetProportions, setBudgetProportions] = useState<Record<string, number>>({});
  
  // Стан інвестицій
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);
  const [portfolioTransactions, setPortfolioTransactions] = useState<PortfolioTransaction[]>([]);
  const [bbAllocations, setBbAllocations] = useState<BitbonAllocation[]>([]);
  const [livePrice, setLivePrice] = useState(0.45);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [investmentBalanceOverride, setInvestmentBalanceOverride] = useState<number | ''>(() => {
    const saved = localStorage.getItem('investmentBalanceOverride');
    return saved ? Number(saved) : '';
  });

  // Стан для створення нових портфелів
  const [showNewPortfolioForm, setShowNewPortfolioForm] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioType, setNewPortfolioType] = useState<PortfolioType>('crypto');

  const [mainTab, setMainTab] = useState<'budget' | 'investments'>(() => (localStorage.getItem('mainTab') as any) || 'budget');
  const handleMainTabChange = (val: 'budget' | 'investments') => {
    setMainTab(val);
    localStorage.setItem('mainTab', val);
  };
  
  const [globalCurrency, setGlobalCurrency] = useState<Currency>(() => (localStorage.getItem('globalCurrency') as Currency) || 'UAH');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  // Стани синхронізації та завантаження
  const [isSyncingBank, setIsSyncingBank] = useState(false);
  const [isSyncingBalances, setIsSyncingBalances] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string[]>([]);
  
  // Рефи для таймерів скасування (Undo)
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoDebtTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ефект для зміни теми
  useEffect(() => {
    document.documentElement.className = theme === 'default' ? '' : `theme-${theme}`;
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  // Ефект аутентифікації
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      setIsAuthReady(true);
    });
    return unsub;
  }, []);

  // Синхронізація Firebase у реальному часі
  useEffect(() => {
    if (!userId) {
      setAccounts([]); setCategories([]); setTransactions([]);
      setAssets([]); setMonthlyPlans([]); setGoals([]);
      setCushion(null); setBankConnections([]); setDebts([]);
      setPortfolios([]); setPortfolioAssets([]); setPortfolioTransactions([]);
      setBbAllocations([]);
      return;
    }

    const unsubs = [
      onSnapshot(collection(db, `users/${userId}/accounts`), (s) => setAccounts(s.docs.map(d => ({...d.data(), id: d.id} as Account)))),
      onSnapshot(collection(db, `users/${userId}/categories`), (s) => setCategories(s.docs.map(d => ({...d.data(), id: d.id} as BudgetCategory)))),
      onSnapshot(collection(db, `users/${userId}/budgetTxs`), (s) => setTransactions(s.docs.map(d => ({...d.data(), id: d.id} as BudgetTx)).sort((a,b) => b.date.localeCompare(a.date)))),
      onSnapshot(collection(db, `users/${userId}/assets`), (s) => setAssets(s.docs.map(d => ({...d.data(), id: d.id} as Asset)))),
      onSnapshot(collection(db, `users/${userId}/monthlyPlans`), (s) => setMonthlyPlans(s.docs.map(d => ({...d.data(), id: d.id} as MonthlyPlan)))),
      onSnapshot(collection(db, `users/${userId}/goals`), (s) => setGoals(s.docs.map(d => ({...d.data(), id: d.id} as Goal)))),
      onSnapshot(doc(db, `users/${userId}/cushion/main`), (s) => s.exists() ? setCushion(s.data() as Cushion) : setCushion(null)),
      onSnapshot(collection(db, `users/${userId}/bankConnections`), (s) => setBankConnections(s.docs.map(d => ({...d.data(), id: d.id} as BankConnection)))),
      onSnapshot(collection(db, `users/${userId}/debts`), (s) => setDebts(s.docs.map(d => ({...d.data(), id: d.id} as Debt)))),
      onSnapshot(collection(db, `users/${userId}/portfolios`), (s) => {
        const ps = s.docs.map(d => ({...d.data(), id: d.id} as Portfolio));
        setPortfolios(ps);
        if (ps.length > 0 && !activePortfolioId) setActivePortfolioId(ps[0].id);
      }),
      onSnapshot(collection(db, `users/${userId}/portfolioAssets`), (s) => setPortfolioAssets(s.docs.map(d => ({...d.data(), id: d.id} as PortfolioAsset)))),
      onSnapshot(collection(db, `users/${userId}/portfolioTransactions`), (s) => setPortfolioTransactions(s.docs.map(d => ({...d.data(), id: d.id} as PortfolioTransaction)))),
      onSnapshot(collection(db, `users/${userId}/bbAllocations`), (s) => setBbAllocations(s.docs.map(d => ({...d.data(), id: d.id} as BitbonAllocation)))),
      onSnapshot(doc(db, `users/${userId}`), (s) => {
        if (s.exists()) {
          const data = s.data();
          if (typeof data.investmentBalanceOverride === 'number') {
            setInvestmentBalanceOverride(data.investmentBalanceOverride);
          }
          if (data.budgetProportions) {
            setBudgetProportions(data.budgetProportions);
          }
        }
      })
    ];

    return () => unsubs.forEach(u => u());
  }, [userId, activePortfolioId]);

  // Курси валют та актуальні ціни
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const r = await fetch('https://open.er-api.com/v6/latest/USD');
        const d = await r.json();
        setExchangeRates(d.rates || {});
      } catch (e) { setExchangeRates({ UAH: 41.5, EUR: 0.93, PLN: 4.1 }); }
    };
    fetchRates();
  }, []);

  const fetchPrice = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const resp = await fetch('https://api.geckoterminal.com/api/v2/networks/eth/tokens/0x5702a4487da07c827cde512e2d5969cb430cd839');
      const data = await resp.json();
      const p = parseFloat(data?.data?.attributes?.price_usd);
      if (p > 0) setLivePrice(p);
    } catch (e) { console.error('Price fetch failed'); }
    setIsRefreshing(false);
  }, []);

  useEffect(() => { fetchPrice(); }, [fetchPrice]);
  
  const handleUpdateInvestmentPotential = useCallback(async (val: number) => {
    if (!userId) return;
    setInvestmentBalanceOverride(val);
    localStorage.setItem('investmentBalanceOverride', val.toString());
    await setDoc(doc(db, `users/${userId}`), { investmentBalanceOverride: val }, { merge: true });
  }, [userId]);

  const bitbonPortfolio = useMemo(() => {
    const p = portfolios.find(p => p.type === 'bitbon');
    const bId = p?.id || 'default-bitbon';
    const bAssets = portfolioAssets.filter(a => a.portfolioId === bId);
    const bTxs = portfolioTransactions.filter(tx => tx.portfolioId === bId);
    
    const tokens = bAssets.reduce((sum, a) => sum + a.amount, 0);
    const investedUsd = bTxs.reduce((sum, tx) => tx.type === 'buy' ? sum + tx.amountUsd : sum, 0);
    const totalSoldUsd = bTxs.reduce((sum, tx) => tx.type === 'sell' ? sum + tx.amountUsd : sum, 0);
    const totalIncomeTokens = bTxs.reduce((sum, tx) => tx.type === 'income' ? sum + tx.tokens : sum, 0);
    
    const valueUsd = tokens * livePrice;
    const usdRate = exchangeRates['UAH'] || 41.5;

    return {
      id: bId,
      type: 'bitbon' as PortfolioType,
      name: p?.name || 'Bitbon Portfolio',
      tokens,
      valueUsd,
      valueUah: valueUsd * usdRate,
      investedUsd,
      investedUah: investedUsd * usdRate,
      profitUsd: valueUsd - investedUsd,
      profitUah: (valueUsd - investedUsd) * usdRate,
      avgPriceUsd: investedUsd > 0 ? investedUsd / (tokens + totalSoldUsd - totalIncomeTokens) : 0,
      totalSoldUsd,
      totalIncomeTokens,
      updatedAt: new Date().toISOString(),
      assets: [],
      chartLabels: [], 
      chartTokens: [],
      sorted: [...bTxs].sort((a,b) => b.date.localeCompare(a.date))
    };
  }, [portfolios, portfolioAssets, portfolioTransactions, livePrice, exchangeRates]);

  // Обробники (Handlers) - Інвестиції
  const handleUpdatePortfolioAsset = useCallback(async (id: string, updates: Partial<PortfolioAsset>) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, `users/${userId}/portfolioAssets/${id}`), updates, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, id); }
  }, [userId]);

  const handleAddTx = useCallback(async (type: 'buy' | 'sell' | 'income' | 'transfer', data: any) => {
    if (!userId) return;
    const id = crypto.randomUUID();
    const newTx: PortfolioTransaction = {
      id,
      portfolioId: data.portfolioId,
      assetId: data.assetId,
      symbol: data.symbol || 'ERBB',
      type,
      amountUsd: Number(data.amountUsd) || 0,
      tokens: Number(data.tokens) || 0,
      priceUsd: Number(data.priceUsd) || 0,
      usdRate: Number(data.usdRate) || exchangeRates['UAH'] || 1,
      date: data.date,
      time: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
      note: data.note || '',
      ...(data.source ? { source: data.source } : {}),
      fromAssetId: data.fromAssetId,
      toAssetId: data.toAssetId
    };

    // Validation for astronomical values
    if (newTx.amountUsd > 1000000 || (newTx.symbol === 'ERBB' && newTx.priceUsd > 100)) {
      throw new Error('Занадто велика сума або ціна. Будь ласка, перевірте дані.');
    }

    try {
      await setDoc(doc(db, `users/${userId}/portfolioTransactions/${id}`), newTx);
      await memoryService.trackActivity(userId, 'додав транзакцію Bitbon', { type, tokens: data.tokens, amountUsd: data.amountUsd });
      
      // Списання з Інвестиційного Потенціалу при купівлі
      if (type === 'buy' && newTx.amountUsd) {
        const costUah = newTx.amountUsd * newTx.usdRate;
        const currentPotential = typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0;
        await handleUpdateInvestmentPotential(Math.max(0, currentPotential - costUah));
      }

      // Атомарне оновлення балансів
      if (type === 'transfer') {
        const from = portfolioAssets.find(a => a.id === data.fromAssetId);
        const to = portfolioAssets.find(a => a.id === data.toAssetId);
        if (from) await handleUpdatePortfolioAsset(from.id, { amount: Math.max(0, from.amount - newTx.tokens) });
        if (to) await handleUpdatePortfolioAsset(to.id, { amount: to.amount + newTx.tokens });
      } else {
        const asset = portfolioAssets.find(a => a.id === data.assetId);
        if (asset) {
          const delta = (type === 'buy' || type === 'income') ? newTx.tokens : -newTx.tokens;
          await handleUpdatePortfolioAsset(asset.id, { amount: Math.max(0, asset.amount + delta) });
        }
      }
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'portfolioTransactions'); }
  }, [userId, portfolioAssets, exchangeRates, handleUpdatePortfolioAsset, investmentBalanceOverride, handleUpdateInvestmentPotential]);

  const handleDeleteTx = useCallback(async (id: string) => {
    if (!userId) return;
    const tx = portfolioTransactions.find(t => t.id === id);
    if (!tx) return;

    // Оптимістичне оновлення
    setPortfolioTransactions(prev => prev.filter(t => t.id !== id));

    try {
      // Повернення балансів у попередній стан
      if (tx.type === 'transfer') {
        const from = portfolioAssets.find(a => a.id === tx.fromAssetId);
        const to = portfolioAssets.find(a => a.id === tx.toAssetId);
        if (from) await handleUpdatePortfolioAsset(from.id, { amount: from.amount + tx.tokens });
        if (to) await handleUpdatePortfolioAsset(to.id, { amount: Math.max(0, to.amount - tx.tokens) });
      } else {
        const asset = portfolioAssets.find(a => a.id === tx.assetId);
        if (asset) {
          const delta = (tx.type === 'buy' || tx.type === 'income') ? -tx.tokens : tx.tokens;
          await handleUpdatePortfolioAsset(asset.id, { amount: Math.max(0, asset.amount + delta) });
        }
      }

      // Відкат потенціалу при видаленні покупки
      if (tx.type === 'buy' && tx.amountUsd) {
        const costUah = tx.amountUsd * tx.usdRate;
        const currentPotential = typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0;
        await handleUpdateInvestmentPotential(currentPotential + costUah);
      }

      await deleteDoc(doc(db, `users/${userId}/portfolioTransactions/${id}`));
      await memoryService.trackActivity(userId, 'видалив транзакцію Bitbon', { id, type: tx.type, tokens: tx.tokens });
    } catch (err) { 
      // Відкат у разі помилки
      setPortfolioTransactions(prev => [...prev, tx]);
      handleFirestoreError(err, OperationType.DELETE, id); 
    }
  }, [userId, portfolioTransactions, portfolioAssets, handleUpdatePortfolioAsset, investmentBalanceOverride, handleUpdateInvestmentPotential]);

  const repairInvestmentData = useCallback(async () => {
    if (!userId || portfolioTransactions.length === 0) return;
    
    // Find astronomical transactions: amountUsd > 1,000,000 OR priceUsd > 10$ (for ERBB) OR tokens > 1,000,000
    const suspicious = portfolioTransactions.filter(tx => 
      tx.amountUsd > 500000 || 
      (tx.symbol === 'ERBB' && tx.priceUsd > 10) || 
      tx.tokens > 1000000
    );

    if (suspicious.length > 0) {
      console.warn(`[REPAIR] Found ${suspicious.length} suspicious investment transactions. Repairing...`);
      for (const tx of suspicious) {
        await handleDeleteTx(tx.id);
      }
      
      // Also if potential is huge, reset it to something reasonable or just 0
      if (typeof investmentBalanceOverride === 'number' && investmentBalanceOverride > 1000000) {
        await handleUpdateInvestmentPotential(0);
      }
      return suspicious.length;
    }
    return 0;
  }, [userId, portfolioTransactions, investmentBalanceOverride, handleDeleteTx, handleUpdateInvestmentPotential]);

  // Periodic Data Health Check
  useEffect(() => {
    if (userId && portfolioTransactions.length > 0) {
      repairInvestmentData().then(count => {
        if (count > 0) console.log(`[REPAIR] Cleared ${count} anomalies.`);
      });
    }
  }, [userId, portfolioTransactions.length, repairInvestmentData]);

  const handleDeletePortfolioAsset = useCallback(async (id: string) => {
    if (!userId) return;
    const asset = portfolioAssets.find(a => a.id === id);
    if (!asset) return;

    // Пошук пов'язаних транзакцій для видалення
    const relatedTxs = portfolioTransactions.filter(tx => 
      tx.assetId === id || tx.fromAssetId === id || tx.toAssetId === id
    );

    // Оптимістичне оновлення
    const oldAssets = [...portfolioAssets];
    const oldTxs = [...portfolioTransactions];
    
    setPortfolioAssets(prev => prev.filter(a => a.id !== id));
    setPortfolioTransactions(prev => prev.filter(tx => 
      tx.assetId !== id && tx.fromAssetId !== id && tx.toAssetId !== id
    ));

    try {
      // Видалення активу
      await deleteDoc(doc(db, `users/${userId}/portfolioAssets/${id}`));
      
      // Видалення пов'язаних транзакцій
      if (relatedTxs.length > 0) {
        await Promise.all(relatedTxs.map(tx => 
          deleteDoc(doc(db, `users/${userId}/portfolioTransactions/${tx.id}`))
        ));
      }

      await memoryService.trackActivity(userId, 'видалив блок активів та пов\'язані транзакції', { 
        name: asset.name, 
        txCount: relatedTxs.length 
      });
    } catch (err) { 
      // Відкат у разі помилки
      setPortfolioAssets(oldAssets);
      setPortfolioTransactions(oldTxs);
      handleFirestoreError(err, OperationType.DELETE, id); 
    }
  }, [userId, portfolioAssets, portfolioTransactions]);

  // Решта функцій...

  // Обробники Бюджету
  const handleSaveDebt = useCallback(async (debt: Partial<Debt>) => {
    if (!userId) return;
    const id = debt.id || crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      const debtData = { 
        ...debt, 
        id, 
        updatedAt: now,
        createdAt: debt.createdAt || now
      };
      await setDoc(doc(db, `users/${userId}/debts/${id}`), debtData, { merge: true });
      await memoryService.trackActivity(userId, 'зберіг борг', { name: debt.name, amount: debt.amount });
      return id;
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `debts/${id}`); }
  }, [userId]);

  const handleDeleteDebt = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/debts/${id}`));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }, [userId]);

  const handleCreatePortfolio = useCallback(async () => {
    if (!userId || !newPortfolioName) return;
    const id = crypto.randomUUID();
    const portfolio: Portfolio = {
      id,
      name: newPortfolioName,
      type: newPortfolioType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assets: []
    };
    try {
      await setDoc(doc(db, `users/${userId}/portfolios/${id}`), portfolio);
      setShowNewPortfolioForm(false);
      setNewPortfolioName('');
      setActivePortfolioId(id);
      await memoryService.trackActivity(userId, 'створив новий портфель', { name: newPortfolioName, type: newPortfolioType });
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'portfolios'); }
  }, [userId, newPortfolioName, newPortfolioType]);

  const handleSaveBudgetTx = useCallback(async (tx: Partial<BudgetTx>, affectedAccounts?: {id: string, balance: number}[]) => {
    if (!userId) return;
    const id = tx.id || crypto.randomUUID();
    const finalTx: any = { 
      ...tx, 
      id, 
      date: tx.date || new Date().toISOString().slice(0, 7),
      categoryId: tx.categoryId || null
    };
    if (finalTx.categoryId === "") finalTx.categoryId = null;
    
    // PGRST204 Fix: Do not send updatedAt to budget_txs as it's missing in Supabase schema
    if (tx.type !== 'investment' && tx.type !== 'income' && tx.type !== 'expense') {
        // We only keep it for portfolios or other tables if they have it
    }

    try {
      // 1. Пряме збереження транзакції
      await setDoc(doc(db, `users/${userId}/budgetTxs/${id}`), finalTx);
      
      // 2. Оновлення балансів рахунків
      if (affectedAccounts && affectedAccounts.length > 0) {
        await Promise.all(affectedAccounts.map(async acc => {
          const currentAcc = accounts.find(a => a.id === acc.id);
          const updatePayload: any = { balance: Number(acc.balance.toFixed(2)) };
          
          if (currentAcc) {
            updatePayload.name = currentAcc.name;
            updatePayload.currency = currentAcc.currency;
            updatePayload.color = currentAcc.color;
            if (currentAcc.isInvestment) updatePayload.isInvestment = true;
            if (currentAcc.bankConnectionId) updatePayload.bankConnectionId = currentAcc.bankConnectionId;
            if (currentAcc.bankAccountId) updatePayload.bankAccountId = currentAcc.bankAccountId;
          }
          
          await setDoc(doc(db, `users/${userId}/accounts/${acc.id}`), updatePayload, { merge: true });
        }));
      }

      // 3. Логіка Інвестиційного Потенціалу
      // Якщо це витрата за категорією "Інвестиції" або "Бітбон" тощо.
      const cat = categories.find(c => c.id === finalTx.categoryId);
      const isInvestmentCategory = cat?.name?.toLowerCase().includes('інвест') || 
                                   cat?.name?.toLowerCase().includes('бітбон') ||
                                   finalTx.type === 'investment';
      
      if (isInvestmentCategory && finalTx.amount) {
        // Only update potential if the amount is reasonable (e.g. < 500,000 UAH per tx)
        // This prevents mass errors from Monobank history sync
        if (finalTx.amount < 500000) {
          const currentPotential = typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0;
          const newPotential = Number((currentPotential + finalTx.amount).toFixed(2));
          await handleUpdateInvestmentPotential(newPotential);
        }
      }

      await memoryService.trackActivity(userId, 'зберіг бюджетну транзакцію', { type: finalTx.type, amount: finalTx.amount });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `budgetTxs/${id}`); }
  }, [userId, categories, accounts, investmentBalanceOverride, handleUpdateInvestmentPotential]);

  const handleUndoDeleteDebt = useCallback(async (debt: Debt) => {
    if (!userId || !debt) return;
    try {
      await setDoc(doc(db, `users/${userId}/debts/${debt.id}`), debt);
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `debts/${debt.id}`); }
  }, [userId]);

  const handleSaveCushion = useCallback(async (newData: Partial<Cushion>) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, `users/${userId}/cushion/main`), { ...newData, updatedAt: new Date().toISOString() }, { merge: true });
      await memoryService.trackActivity(userId, 'оновив фінансову подушку', newData);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'cushion'); }
  }, [userId]);

  const ensureCategoryInPlan = useCallback(async (categoryId: string, month: string) => {
    if (!userId || !categoryId || !month) return;
    try {
      const planRef = doc(db, `users/${userId}/monthlyPlans/${month}`);
      const s = await getDocFromServer(planRef);
      const currentPlans = s.exists() ? (s.data() as MonthlyPlan).plans : {};
      
      if (currentPlans[categoryId] === undefined) {
        await setDoc(planRef, {
          id: month,
          userId: userId,
          plans: { ...currentPlans, [categoryId]: 0 },
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err) { console.error('[PLAN SYNC] Failed to toggle plan category:', err); }
  }, [userId]);

  const handleCreateCategory = useCallback(async (name: string, type: BudgetCategory['type'], color: string = 'bg-zinc-500', monthToSync?: string) => {
    if (!userId || !name) return;
    const id = crypto.randomUUID();
    try {
      const newCat: BudgetCategory = { id, name, type, planned: 0, color };
      await setDoc(doc(db, `users/${userId}/categories/${id}`), newCat);
      
      if (monthToSync) {
        await ensureCategoryInPlan(id, monthToSync);
      }
      await memoryService.trackActivity(userId, 'створив категорію', { name, type });
      return id;
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'categories'); }
  }, [userId, ensureCategoryInPlan]);

  const handleDeleteCategory = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/categories/${id}`));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }, [userId]);

  const handleUndoDeleteCategory = useCallback(async (cat: BudgetCategory) => {
    if (!userId || !cat) return;
    try {
      await setDoc(doc(db, `users/${userId}/categories/${cat.id}`), cat);
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `categories/${cat.id}`); }
  }, [userId]);

  const handleUpdateTxCategory = useCallback(async (txId: string, catId: string, month?: string) => {
    if (!userId) return;
    try {
      if (month && catId) {
        await ensureCategoryInPlan(catId, month);
      }
      await setDoc(doc(db, `users/${userId}/budgetTxs/${txId}`), { categoryId: catId, isAiCategorized: false }, { merge: true });
      await memoryService.trackActivity(userId, 'змінив категорію транзакції', { txId, catId });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, txId); }
  }, [userId, ensureCategoryInPlan]);

  const handleSyncBank = useCallback(async (connId: string) => {
    // This is a placeholder for the complex sync logic. 
    // Usually the logic resides in a separate service or here.
    // Given the complexity of syncBankConnection, I'll ensure Budget.tsx can still handle UI-side sync steps if needed,
    // but centralizing the command here.
    // console.log('Служба синхронізації запущена...');
  }, []);

  const handleSaveAccount = useCallback(async (acc: Partial<Account>) => {
    if (!userId) return;
    const id = acc.id || crypto.randomUUID();
    try {
      await setDoc(doc(db, `users/${userId}/accounts/${id}`), {
        ...acc,
        id,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `accounts/${id}`); }
  }, [userId]);

  const handleDeleteAccount = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/accounts/${id}`));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }, [userId]);

  const handleSaveGoal = useCallback(async (goal: Partial<Goal>) => {
    if (!userId) return;
    const id = goal.id || crypto.randomUUID();
    try {
      await setDoc(doc(db, `users/${userId}/goals/${id}`), {
        ...goal,
        id,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `goals/${id}`); }
  }, [userId]);

  const handleDeleteGoal = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/goals/${id}`));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }, [userId]);

  const handleSaveAsset = useCallback(async (asset: Partial<Asset>) => {
    if (!userId) return;
    const id = asset.id || crypto.randomUUID();
    try {
      await setDoc(doc(db, `users/${userId}/assets/${id}`), {
        ...asset,
        id,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      await memoryService.trackActivity(userId, 'зберіг актив', { name: asset.name, value: asset.value });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `assets/${id}`); }
  }, [userId]);

  const handleDeleteAsset = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, `users/${userId}/assets/${id}`));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }, [userId]);

  const handleDeleteBudgetTx = useCallback(async (id: string, affectedAccounts?: {id: string, balance: number}[]) => {
    if (!userId) return;
    try {
      // 1. Пряме видалення транзакції
      await deleteDoc(doc(db, `users/${userId}/budgetTxs/${id}`));

      // 2. Оновлення балансів рахунків (якщо передано)
      if (affectedAccounts && affectedAccounts.length > 0) {
        await Promise.all(affectedAccounts.map(async acc => {
          const currentAcc = accounts.find(a => a.id === acc.id);
          const updatePayload: any = { balance: Number(acc.balance.toFixed(2)) };
          
          if (currentAcc) {
            updatePayload.name = currentAcc.name;
            updatePayload.currency = currentAcc.currency;
            updatePayload.color = currentAcc.color;
            if (currentAcc.isInvestment) updatePayload.isInvestment = true;
            if (currentAcc.bankConnectionId) updatePayload.bankConnectionId = currentAcc.bankConnectionId;
            if (currentAcc.bankAccountId) updatePayload.bankAccountId = currentAcc.bankAccountId;
          }
          
          await setDoc(doc(db, `users/${userId}/accounts/${acc.id}`), updatePayload, { merge: true });
        }));
      }

      await memoryService.trackActivity(userId, 'видалив бюджетну транзакцію', { id });
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, `budgetTxs/${id}`); }
  }, [userId, accounts]);


  // Похідні метрики (Розрахункові)
  const globalMetrics = useMemo(() => {
    const totalInvested = portfolioTransactions.reduce((acc, tx) => {
      if (tx.type === 'buy') return acc + tx.amountUsd;
      if (tx.type === 'sell') return acc - tx.amountUsd;
      return acc;
    }, 0);
    
    let totalTokens = 0;
    portfolioAssets.forEach(a => totalTokens += a.amount);
    
    const currentVal = totalTokens * livePrice;
    return {
      totalInvestedUsd: totalInvested,
      currentValueUsd: currentVal,
      totalProfitUsd: currentVal - totalInvested,
      totalTokens
    };
  }, [portfolioTransactions, portfolioAssets, livePrice]);

  const formatGlobal = useCallback((n: number, targetCur?: Currency | 'USD', sourceCur: Currency = 'USD') => {
    const cur = (targetCur || globalCurrency) as Currency;
    // We now pass sourceCur to formatGlobalUtil to handle budget values (UAH) correctly.
    return formatGlobalUtil(n, cur, exchangeRates, sourceCur);
  }, [globalCurrency, exchangeRates]);

  const tickerItems = useMemo(() => [
    { id: 'USD/UAH', label: 'USD/UAH', price: exchangeRates['UAH'] || 41.5, currency: '₴' },
    { id: 'ERBB/USD', label: 'ERBB', price: livePrice, currency: '$' },
  ], [exchangeRates, livePrice]);

  const totalAccountBalanceUah = useMemo(() => {
    return Number(accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0).toFixed(2));
  }, [accounts]);

  if (!isAuthReady) return null;

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 p-10 rounded-[40px] shadow-2xl border border-zinc-200 dark:border-white/5 text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-600/20">
            <LogIn className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-tighter italic">Epoha <span className="text-indigo-600">v4</span></h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-10 font-bold uppercase tracking-widest">{t('signInToContinue')}</p>
          <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-xl">{t('signInBtn')}</button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <MarketTicker items={tickerItems} />
      <div className="min-h-screen theme-bg text-zinc-900 dark:text-zinc-100 p-4 md:p-8 font-sans transition-colors duration-500">
        <div className="max-w-6xl mx-auto">
          <Header 
            language={language}
            onLanguageChange={setLanguage}
            globalCurrency={globalCurrency}
            onCurrencyChange={setGlobalCurrency}
            theme={theme}
            onThemeChange={setTheme}
            mainTab={mainTab}
            onMainTabChange={(tab) => handleMainTabChange(tab as any)}
            userId={userId}
            onSignIn={() => signInWithPopup(auth, new GoogleAuthProvider())}
            onSignOut={() => signOut(auth)}
            t={t}
          />
          
          <main className="mt-8">
            <AnimatePresence mode="wait">
              {mainTab === 'budget' ? (
                <motion.div key="budget" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Budget 
                    userId={userId}
                    currentPrice={livePrice}
                    accounts={accounts} setAccounts={setAccounts}
                    categories={categories} setCategories={setCategories}
                    transactions={transactions} setTransactions={setTransactions}
                    assets={assets} setAssets={setAssets}
                    formatGlobal={formatGlobal}
                    globalCurrency={globalCurrency}
                    monthlyPlans={monthlyPlans} setMonthlyPlans={setMonthlyPlans}
                    bbAllocations={bbAllocations} setBbAllocations={setBbAllocations}
                    goals={goals} setGoals={setGoals}
                    cushion={cushion} setCushion={setCushion}
                    bankConnections={bankConnections} setBankConnections={setBankConnections}
                    onAddBankConnection={async (c) => { await setDoc(doc(db, `users/${userId}/bankConnections/${c.id}`), c); }}
                    onDeleteBankConnection={async (id) => { await deleteDoc(doc(db, `users/${userId}/bankConnections/${id}`)); }}
                    budgetProportions={budgetProportions} setBudgetProportions={setBudgetProportions}
                    investmentBalanceOverride={investmentBalanceOverride}
                    setInvestmentBalanceOverride={setInvestmentBalanceOverride}
                    portfolios={portfolios}
                    portfolioAssets={portfolioAssets}
                    exchangeRates={exchangeRates}
                    globalMetrics={globalMetrics}
                    availableBalanceUah={totalAccountBalanceUah}
                    debts={debts} setDebts={setDebts}
                    onSaveDebt={handleSaveDebt}
                    onDeleteDebt={handleDeleteDebt}
                    onUndoDeleteDebt={handleUndoDeleteDebt}
                    onSaveCushion={handleSaveCushion}
                    onCreateCategory={handleCreateCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onUndoDeleteCategory={handleUndoDeleteCategory}
                    onUpdateTxCategory={handleUpdateTxCategory}
                    onSaveAccount={handleSaveAccount}
                    onDeleteAccount={handleDeleteAccount}
                    onSaveGoal={handleSaveGoal}
                    onDeleteGoal={handleDeleteGoal}
                    onSaveAsset={handleSaveAsset}
                    onDeleteAsset={handleDeleteAsset}
                    onSaveBudgetTx={handleSaveBudgetTx}
                    onDeleteBudgetTx={handleDeleteBudgetTx}
                    onSyncBank={handleSyncBank}
                    language={language}
                    t={t}
                  />
                </motion.div>
              ) : (
                <motion.div key="invest" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <InvestmentsTab 
                    language={language}
                    t={t}
                    globalCurrency={globalCurrency}
                    exchangeRates={exchangeRates}
                    livePrice={livePrice}
                    isLoadingPrice={isRefreshing}
                    priceError={false}
                    fetchPrice={fetchPrice}
                    onPortfolioTx={async (txData: any) => {
                      await handleAddTx(txData.type, txData);
                    }}
                    availableInvestmentUah={typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0}
                    availableInvestmentUsd={(typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0) / (exchangeRates['UAH'] || 1)}
                    portfolios={portfolios}
                    portfolioAssets={portfolioAssets}
                    globalMetrics={globalMetrics}
                    activePortfolioId={activePortfolioId}
                    setActivePortfolioId={setActivePortfolioId}
                    showNewPortfolioForm={showNewPortfolioForm}
                    setShowNewPortfolioForm={setShowNewPortfolioForm}
                    newPortfolioName={newPortfolioName}
                    setNewPortfolioName={setNewPortfolioName}
                    newPortfolioType={newPortfolioType}
                    setNewPortfolioType={setNewPortfolioType}
                    handleCreatePortfolio={handleCreatePortfolio}
                    handleAddTx={handleAddTx}
                    handleDeleteTx={handleDeleteTx}
                    handleAddPortfolioAsset={async (a) => { await setDoc(doc(db, `users/${userId}/portfolioAssets/${a.id || crypto.randomUUID()}`), a); }}
                    handleUpdatePortfolioAsset={handleUpdatePortfolioAsset}
                    handleDeletePortfolioAsset={handleDeletePortfolioAsset}
                    handleDeletePortfolio={async (id) => { await deleteDoc(doc(db, `users/${userId}/portfolios/${id}`)); }}
                    formatGlobal={formatGlobal}
                    theme={theme}
                    bitbonPortfolio={bitbonPortfolio}
                    onUpdateInvestmentPotential={handleUpdateInvestmentPotential}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
          
          <IOAssistant 
            userId={userId}
            language={language}
            t={t}
            globalMetrics={globalMetrics}
            portfolios={portfolios}
            portfolioAssets={portfolioAssets}
            context={{
              totalCapitalUsd: globalMetrics.currentValueUsd,
              totalInvestedUsd: globalMetrics.totalInvestedUsd,
              actualIncomeUsd: transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) / (exchangeRates.UAH || 41), 
              actualExpensesUsd: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) / (exchangeRates.UAH || 41),
              budgetBalanceUah: totalAccountBalanceUah,
              usdRate: exchangeRates.UAH || 41,
              language,
              budgetTransactions: transactions,
              accounts,
              goals,
              cushion,
            }}
          />
        </div>
      </div>
    </>
  );
}
