import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Account, BudgetCategory, BudgetTx, Currency, Transaction, Portfolio, 
  PortfolioAsset, PortfolioTransaction, BitbonAllocation, MonthlyPlan, 
  Goal, BankConnection, Cushion, CushionAsset, PortfolioType, Asset, Debt 
} from './types';
const Budget = React.lazy(() => import('./components/Budget'));
const PortfolioView = React.lazy(() => import('./components/PortfolioView'));
const AcademyView = React.lazy(() => import('./components/features/academy/AcademyView'));
const InvestmentsTab = React.lazy(() => import('./components/features/investments/InvestmentsTab'));
const IOAssistant = React.lazy(() => import('./components/IOAssistant').then(m => ({ default: m.IOAssistant })));

import { MarketTicker } from './components/MarketTicker';
import { 
  auth, db, handleFirestoreError, OperationType,
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut,
  collection, doc, onSnapshot, setDoc, deleteDoc, getDocFromServer
} from './firebase';
import { ConfirmModal } from './components/ConfirmModal';
import { supabase } from './supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import { CFG } from './constants/config';
import Header from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
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
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [userMetadata, setUserMetadata] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdminBypass, setIsAdminBypass] = useState(false);

  // Стан бюджету (Hydrated from localStorage for speed)
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try { return JSON.parse(localStorage.getItem('cache_accounts') || '[]'); } catch { return []; }
  });
  const [categories, setCategories] = useState<BudgetCategory[]>(() => {
    try { return JSON.parse(localStorage.getItem('cache_categories') || '[]'); } catch { return []; }
  });
  const [transactions, setTransactions] = useState<BudgetTx[]>(() => {
    try { return JSON.parse(localStorage.getItem('cache_transactions') || '[]'); } catch { return []; }
  });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cushion, setCushion] = useState<Cushion | null>(null);
  const [cushionAssets, setCushionAssets] = useState<CushionAsset[]>([]);
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
  const [connectedPotentialAccountId, setConnectedPotentialAccountId] = useState<string | null>(null);

  const [isManualPriceMode, setIsManualPriceMode] = useState<boolean>(() => localStorage.getItem('bitbon_is_manual_price') === 'true');
  const [manualPriceValue, setManualPriceValue] = useState<number>(() => {
    const saved = localStorage.getItem('bitbon_manual_price_value');
    return saved ? parseFloat(saved) : 2.0;
  });

  useEffect(() => {
    localStorage.setItem('bitbon_is_manual_price', isManualPriceMode.toString());
  }, [isManualPriceMode]);

  useEffect(() => {
    localStorage.setItem('bitbon_manual_price_value', manualPriceValue.toString());
  }, [manualPriceValue]);

  // Стан для створення нових портфелів
  const [showNewPortfolioForm, setShowNewPortfolioForm] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioType, setNewPortfolioType] = useState<PortfolioType>('crypto');

  const [mainTab, setMainTab] = useState<'budget' | 'investments' | 'academy'>(() => (localStorage.getItem('mainTab') as any) || 'budget');
  const handleMainTabChange = (val: 'budget' | 'investments' | 'academy') => {
    setMainTab(val);
    localStorage.setItem('mainTab', val);
  };
  
  const [globalCurrency, setGlobalCurrency] = useState<Currency>(() => (localStorage.getItem('globalCurrency') as Currency) || 'UAH');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  // Стани синхронізації та завантаження
  const [isSyncingBank, setIsSyncingBank] = useState(false);
  const [isSyncingBalances, setIsSyncingBalances] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string[]>([]);
  
  // Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  // --- 1. HANDLERS (Hoisted) ---
  async function handleSaveAccount(acc: Partial<Account>) {
    if (!userId) return;
    const id = acc.id || crypto.randomUUID();
    try {
      await setDoc(doc(db, `users/${userId}/accounts/${id}`), {
        ...acc,
        id
      }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `accounts/${id}`); }
  }

  async function handleDeleteAccount(id: string) {
    if (!userId) return;
    setAccounts(prev => prev.filter(a => a.id !== id));
    try {
      await deleteDoc(doc(db, `users/${userId}/accounts/${id}`));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }


  const handleUpdateInvestmentPotential = useCallback(async (val: number) => {
    if (!userId) return;
    setInvestmentBalanceOverride(val);
    localStorage.setItem('investmentBalanceOverride', val.toString());
    await setDoc(doc(db, `users/${userId}`), { investmentBalanceOverride: val }, { merge: true });
  }, [userId]);

  const handleConnectPotentialAccount = useCallback(async (id: string | null) => {
    if (!userId) return;
    setConnectedPotentialAccountId(id);
    await setDoc(doc(db, `users/${userId}`), { connectedPotentialAccountId: id }, { merge: true });
    
    // If connecting, immediately sync balance
    if (id) {
      const acc = accounts.find(a => a.id === id);
      if (acc) {
        await handleUpdateInvestmentPotential(acc.balance);
      }
    }
  }, [userId, accounts, handleUpdateInvestmentPotential]);

  const handleSaveBudgetTx = useCallback(async (tx: Partial<BudgetTx>, affectedAccounts?: {id: string, balance: number}[]) => {
    if (!userId) return;
    const id = tx.id || crypto.randomUUID();
    const finalTx: any = { 
        ...tx, id, 
        date: tx.date || new Date().toISOString().slice(0, 10),
        categoryId: tx.categoryId || null
    };

    // --- OPTIMISTIC UI UPDATE & ATOMIC SYNC PREP ---
    let newPotentialValue: number | null = null;
    let isPotentialUpdatedViaAcc = false;

    if (affectedAccounts && affectedAccounts.length > 0) {
      setAccounts(current => current.map(acc => {
        const affected = affectedAccounts.find(a => a.id === acc.id);
        if (affected) {
          if (acc.id === connectedPotentialAccountId) {
            newPotentialValue = affected.balance;
            setInvestmentBalanceOverride(affected.balance);
            isPotentialUpdatedViaAcc = true;
          }
          return { ...acc, balance: affected.balance };
        }
        return acc;
      }));
    }

    // --- OPTIMISTIC TRANSACTION UPDATE ---
    setTransactions(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...finalTx };
        return updated;
      }
      return [finalTx as BudgetTx, ...prev];
    });

    // NEW: If it's an investment transaction and potential wasn't updated via linked account, update override manually
    if (finalTx.type === 'investment' && !isPotentialUpdatedViaAcc) {
      const amount = Number(finalTx.amount) || 0;
      const currentP = typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0;
      const nextP = Number((currentP + amount).toFixed(2));
      setInvestmentBalanceOverride(nextP);
      newPotentialValue = nextP;
    }
    // -----------------------------------------------

    const cleanPayload = { ...finalTx };
    delete cleanPayload.updatedAt; delete cleanPayload.updated_at;
    try {
      // 1. Save Transaction
      await setDoc(doc(db, `users/${userId}/budgetTxs/${id}`), cleanPayload);
      
      // 2. Save Accounts & Potential (Atomic-like)
      const updatePromises: Promise<any>[] = [];
      if (affectedAccounts && affectedAccounts.length > 0) {
        affectedAccounts.forEach(acc => {
          const currentAcc = accounts.find(a => a.id === acc.id);
          const updatePayload: any = { balance: Number(acc.balance.toFixed(2)) };
          if (currentAcc) {
            updatePayload.name = currentAcc.name; updatePayload.currency = currentAcc.currency; 
            updatePayload.color = currentAcc.color; if (currentAcc.isInvestment) updatePayload.isInvestment = true;
          }
          updatePromises.push(setDoc(doc(db, `users/${userId}/accounts/${acc.id}`), updatePayload, { merge: true }));
        });
      }

      // ЯКЩО МИ ОНОВИЛИ ПІДКЛЮЧЕНИЙ РАХУНОК - ОНОВЛЮЄМО ПОТЕНЦІАЛ В ДОКУМЕНТІ КОРИСТУВАЧА
      if (newPotentialValue !== null) {
        updatePromises.push(setDoc(doc(db, `users/${userId}`), { investmentBalanceOverride: newPotentialValue }, { merge: true }));
      }

      await Promise.all(updatePromises);

      const oldTx = transactions.find(t => t.id === id);
      const amountDelta = finalTx.amount - (oldTx?.amount || 0);
      if (amountDelta !== 0) {
        if (finalTx.goalId) {
          const tg = goals.find(g => g.id === finalTx.goalId);
          if (tg) await setDoc(doc(db, `users/${userId}/goals/${tg.id}`), { ...tg, currentAmount: Math.max(0, (tg.currentAmount || 0) + amountDelta) }, { merge: true });
        } else if (finalTx.cushionAssetId) {
          const ta = cushionAssets.find(a => a.id === finalTx.cushionAssetId);
          if (ta) await setDoc(doc(db, `users/${userId}/cushionAssets/${ta.id}`), { ...ta, amount: Math.max(0, (ta.amount || 0) + amountDelta) }, { merge: true });
        }
      }
    } catch (err) { 
        handleFirestoreError(err, OperationType.UPDATE, `budgetTxs/${id}`);
    }
  }, [userId, accounts, transactions, goals, cushionAssets, connectedPotentialAccountId]);

  async function handleSaveGoal(goal: Partial<Goal>) {
    if (!userId) return;
    const id = goal.id || crypto.randomUUID();
    try {
      const { updatedAt, ...cleanGoal } = goal as any;
      await setDoc(doc(db, `users/${userId}/goals/${id}`), {
        ...cleanGoal,
        id
      }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `goals/${id}`); }
  }

  async function handleDeleteGoal(id: string) {
    if (!userId) return;
    setGoals(prev => prev.filter(g => g.id !== id));
    try {
      await deleteDoc(doc(db, `users/${userId}/goals/${id}`));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }

  async function handleSaveDebt(debt: Partial<Debt>) {
    if (!userId) return;
    const id = debt.id || crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      const debtData = { ...debt, id, updatedAt: now, createdAt: debt.createdAt || now };
      await setDoc(doc(db, `users/${userId}/debts/${id}`), debtData, { merge: true });
      await memoryService.trackActivity(userId, t('activitySaveDebt'), { name: debt.name, amount: debt.amount });
      return id;
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `debts/${id}`); }
  }

  async function handleDeleteDebt(id: string) {
    if (!userId) return;
    setDebts(prev => prev.filter(d => d.id !== id));
    try {
      await deleteDoc(doc(db, `users/${userId}/debts/${id}`));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }

  // --- 2. REFS ---
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoDebtTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- 3. EFFECTS ---
  useEffect(() => {
    const list = document.documentElement.classList;
    ['theme-ocean', 'theme-sunset', 'theme-forest', 'theme-cyberpunk'].forEach(t => list.remove(t));
    if (theme !== 'default') list.add(`theme-${theme}`);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('appLang', language); }, [language]);
  useEffect(() => { localStorage.setItem('globalCurrency', globalCurrency); }, [globalCurrency]);

  // Caching effects
  useEffect(() => { if (accounts.length > 0) localStorage.setItem('cache_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { if (categories.length > 0) localStorage.setItem('cache_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { if (transactions.length > 0) localStorage.setItem('cache_transactions', JSON.stringify(transactions.slice(0, 100))); }, [transactions]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
      setUserMetadata(user || null);
      setIsAuthReady(true);
      if (user) setIsProfileLoading(true);
      else { setIsAllowed(null); setUserProfile(null); setIsProfileLoading(false); }
    });
    return unsub;
  }, []);

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
      onSnapshot(collection(db, `users/${userId}/cushionAssets`), (s) => setCushionAssets(s.docs.map(d => ({...d.data(), id: d.id} as CushionAsset)))),
      onSnapshot(collection(db, `users/${userId}/bankConnections`), (s) => setBankConnections(s.docs.map(d => ({...d.data(), id: d.id} as BankConnection)))),
      onSnapshot(collection(db, `users/${userId}/debts`), (s) => setDebts(s.docs.map(d => ({...d.data(), id: d.id} as Debt)))),
      onSnapshot(collection(db, `users/${userId}/portfolios`), (s) => {
        const ps = s.docs.map(d => ({...d.data(), id: d.id} as Portfolio));
        setPortfolios(ps);
        if (ps.length > 0 && !activePortfolioId) setActivePortfolioId(ps[0].id);
      }),
      onSnapshot(collection(db, `users/${userId}/portfolioAssets`), (s) => setPortfolioAssets(s.docs.map(d => ({...d.data(), id: d.id} as PortfolioAsset)))),
      onSnapshot(collection(db, `users/${userId}/portfolioTransactions`), (s) => setPortfolioTransactions(s.docs.map(d => {
        const data = d.data();
        let actualType = data.type;
        let fromAssetId = data.fromAssetId;
        let toAssetId = data.toAssetId;
        if (data.source && data.source.startsWith('{"from"')) {
          try {
            const src = JSON.parse(data.source);
            fromAssetId = src.from; toAssetId = src.to; actualType = 'transfer';
          } catch(e) {}
        }
        return {...data, id: d.id, fromAssetId, toAssetId, type: actualType} as PortfolioTransaction;
      }))),
      onSnapshot(collection(db, `users/${userId}/bbAllocations`), (s) => setBbAllocations(s.docs.map(d => ({...d.data(), id: d.id} as BitbonAllocation)))),
      onSnapshot(doc(db, `users/${userId}`), (s) => {
        if (s.exists()) {
          const data = s.data();
          if (typeof data.investmentBalanceOverride === 'number') setInvestmentBalanceOverride(data.investmentBalanceOverride);
          if (data.connectedPotentialAccountId !== undefined) setConnectedPotentialAccountId(data.connectedPotentialAccountId);
          if (data.budgetProportions) setBudgetProportions(data.budgetProportions);
          
          setUserProfile(data);
          // Allow access if not explicitly denied OR if user is in the whitelist (safety catch)
          const authEmail = (userMetadata?.email || '').toLowerCase();
          const profileEmail = (data.email || '').toLowerCase();
          const whitelist = ['pavel.dubrov111@gmail.com', 'pavel_dubrov111@gmail.com', 'paveldubrov111@gmail.com', 'paveldybrov@gmail.com'];
          const isWhitelisted = whitelist.includes(authEmail) || whitelist.includes(profileEmail);
          
          // Open access to everyone by default unless isAllowed is explicitly false
          setIsAllowed(data.isAllowed !== false || isWhitelisted);
          setIsProfileLoading(false);
        } else {
          // New User! Create profile
          if (userMetadata) {
            const userEmail = (userMetadata.email || '').toLowerCase();
            const isWhitelisted = ['pavel.dubrov111@gmail.com', 'pavel_dubrov111@gmail.com', 'paveldubrov111@gmail.com', 'paveldybrov@gmail.com'].includes(userEmail);
            const newProfile = {
              id: userMetadata.uid,
              email: userMetadata.email,
              fullName: userMetadata.displayName || userMetadata.email?.split('@')[0],
              isAllowed: true, // AUTO-ALLOW EVERYONE BY DEFAULT
              createdAt: new Date().toISOString()
            };
            setDoc(doc(db, `users/${userMetadata.uid}`), newProfile).then(() => {
              setUserProfile(newProfile);
              setIsAllowed(true); // Grant access to the new user immediately
              setIsProfileLoading(false);
            });
          } else {
            setIsProfileLoading(false);
          }
        }
      })
    ];
    return () => unsubs.forEach(u => u());
  }, [userId, activePortfolioId, userMetadata]);

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
  

  const handleWithdrawFromInvestment = useCallback(async (amountUah: number, accountId: string) => {
    if (!userId) return;
    const targetAcc = accounts.find(a => a.id === accountId);
    if (!targetAcc) return;
    const currentPotential = typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0;
    await handleUpdateInvestmentPotential(currentPotential - amountUah);
    const newBalance = targetAcc.balance + amountUah;
    await setDoc(doc(db, `users/${userId}/accounts/${accountId}`), { ...targetAcc, balance: newBalance }, { merge: true });
    const txId = crypto.randomUUID();
    const newTx: BudgetTx = {
      id: txId, type: 'income', date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
      amount: amountUah, currency: 'UAH', accountId: accountId, categoryId: null,
      description: t('withdrawInvestmentDesc'), isAiCategorized: false, isIncoming: true, accountName: targetAcc.name
    };
    await setDoc(doc(db, `users/${userId}/budgetTxs/${txId}`), newTx);
    await memoryService.trackActivity(userId, t('activityWithdraw'), { amount: amountUah, account: targetAcc.name });
  }, [userId, accounts, investmentBalanceOverride, handleUpdateInvestmentPotential, t]);

  const bitbonPortfolio = useMemo(() => {
    const p = portfolios.find(p => p.type === 'bitbon');
    const bId = p?.id || 'default-bitbon';
    const bAssets = portfolioAssets.filter(a => a.portfolioId === bId);
    const bTxs = portfolioTransactions.filter(tx => tx.portfolioId === bId);
    const tokens = bAssets.reduce((sum, a) => sum + (a.amount || 0), 0);
    const investedUsd = bTxs.reduce((sum, tx) => tx.type === 'buy' ? sum + (tx.amountUsd || 0) : sum, 0);
    const totalSoldUsd = bTxs.reduce((sum, tx) => tx.type === 'sell' ? sum + (tx.amountUsd || 0) : sum, 0);
    const totalSoldTokens = bTxs.reduce((sum, tx) => tx.type === 'sell' ? sum + (tx.tokens || 0) : sum, 0);
    const totalIncomeTokens = bTxs.reduce((sum, tx) => tx.type === 'income' ? sum + (tx.tokens || 0) : sum, 0);
    const valueUsd = tokens * livePrice;
    const usdRate = exchangeRates['UAH'] || 41.5;
    const profitUsd = (valueUsd + totalSoldUsd) - investedUsd;
    const now = new Date();
    const historyDays = 365;
    const labels: string[] = [];
    const values: number[] = [];
    let runningTokens = tokens;
    for (let i = 0; i <= historyDays; i++) {
        const d = new Date(); d.setDate(now.getDate() - i);
        if (i > 0) {
            const prevDayStr = new Date(d.getTime() + 86400000).toISOString().split('T')[0];
            const prevDayTxs = bTxs.filter(tx => tx.date === prevDayStr);
            prevDayTxs.forEach(tx => {
                if (tx.type === 'buy' || tx.type === 'income') runningTokens -= tx.tokens;
                else if (tx.type === 'sell' || tx.type === 'transfer') runningTokens += tx.tokens;
            });
        }
        labels.unshift(d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }));
        values.unshift(runningTokens * livePrice);
    }
    const boughtTokens = Math.max(0, tokens + totalSoldTokens - totalIncomeTokens);
    return {
      id: bId, type: 'bitbon' as PortfolioType, name: p?.name || 'Bitbon Portfolio',
      tokens, valueUsd, valueUah: valueUsd * usdRate, investedUsd, investedUah: investedUsd * usdRate,
      profitUsd, profitUah: profitUsd * usdRate, avgPriceUsd: boughtTokens > 0 ? investedUsd / boughtTokens : 0,
      totalSoldUsd, totalIncomeTokens, updatedAt: new Date().toISOString(), assets: [],
      chartLabels: labels, chartTokens: values,
      sorted: [...bTxs].sort((a,b) => {
        const dc = b.date.localeCompare(a.date);
        return dc !== 0 ? dc : (b.time || '').localeCompare(a.time || '');
      })
    };
  }, [portfolios, portfolioAssets, portfolioTransactions, livePrice, exchangeRates]);

  // Обробники - Інвестиції
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
      assetId: data.assetId || data.fromAssetId || '',
      symbol: data.symbol || 'ERBB',
      type,
      amountUsd: Number(data.amountUsd) || 0,
      tokens: Number(data.tokens) || 0,
      priceUsd: Number(data.priceUsd) || 0,
      usdRate: Number(data.usdRate) || exchangeRates['UAH'] || 1,
      date: data.date,
      time: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
      note: data.note || '',
      fromAssetId: data.fromAssetId,
      toAssetId: data.toAssetId,
      source: type === 'transfer' ? JSON.stringify({ from: data.fromAssetId, to: data.toAssetId }) : data.source
    };

    if (newTx.amountUsd > 1000000 || (newTx.symbol === 'ERBB' && newTx.priceUsd > 100)) {
       throw new Error(t('errAstronomicalValue'));
    }

    try {
      await setDoc(doc(db, `users/${userId}/portfolioTransactions/${id}`), newTx);
      await memoryService.trackActivity(userId, t('activityAddBitbonTx'), { type, tokens: data.tokens, amountUsd: data.amountUsd });
      
      if ((type === 'buy' || type === 'sell') && newTx.amountUsd) {
        const amountUah = newTx.amountUsd * newTx.usdRate;
        const currentPotential = typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0;
        if (type === 'buy') {
          await handleUpdateInvestmentPotential(Math.max(0, currentPotential - amountUah));
        } else if (type === 'sell') {
          await handleUpdateInvestmentPotential(currentPotential + amountUah);
        }
      }

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

      // --- Unified Transaction Recording ---
      if (data.budgetAccountId && (type === 'buy' || type === 'sell' || type === 'income')) {
        const amountUah = newTx.amountUsd * newTx.usdRate;
        const bAcc = accounts.find(a => a.id === data.budgetAccountId);
        
        if (bAcc) {
          const budgetTxId = crypto.randomUUID();
          const budgetTx: Partial<BudgetTx> = {
            id: budgetTxId,
            type: (type === 'income' ? 'income' : (type === 'buy' ? 'investment' : 'income')) as any,
            amount: amountUah,
            currency: 'UAH',
            accountId: bAcc.id,
            date: data.date,
            time: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
            description: `${type === 'income' ? 'Винагорода' : (type === 'buy' ? 'Купівля' : 'Продаж')} Bitbon (${newTx.tokens.toFixed(2)} ERBB)`,
            isIncoming: type === 'income' || type === 'sell',
            accountName: bAcc.name,
            note: data.note || ''
          };

          // Categorize automatically
          const bitbonCat = categories.find(c => c.name.toLowerCase().includes('bitbon') || c.name.toLowerCase().includes('інвест'));
          if (bitbonCat) budgetTx.categoryId = bitbonCat.id;

          const affectedAccounts = [{ 
            id: bAcc.id, 
            balance: type === 'buy' ? bAcc.balance - amountUah : bAcc.balance + amountUah 
          }];

          await handleSaveBudgetTx(budgetTx, affectedAccounts);
        }
      }
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'portfolioTransactions'); }
  }, [userId, portfolioAssets, exchangeRates, handleUpdatePortfolioAsset, investmentBalanceOverride, handleUpdateInvestmentPotential]);

  const handleDeleteTx = useCallback(async (id: string) => {
    if (!userId) return;
    const tx = portfolioTransactions.find(t => t.id === id);
    if (!tx) return;
    setPortfolioTransactions(prev => prev.filter(t => t.id !== id));
    try {
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
      if (tx.type === 'buy' && tx.amountUsd) {
        const costUah = tx.amountUsd * tx.usdRate;
        const currentPotential = typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0;
        await handleUpdateInvestmentPotential(currentPotential + costUah);
      }
      await deleteDoc(doc(db, `users/${userId}/portfolioTransactions/${id}`));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }, [userId, portfolioTransactions, portfolioAssets, handleUpdatePortfolioAsset, investmentBalanceOverride, handleUpdateInvestmentPotential]);

  const handleDeletePortfolioAsset = useCallback(async (id: string) => {
    if (!userId) return;
    const asset = portfolioAssets.find(a => a.id === id);
    if (!asset) return;
    setPortfolioAssets(prev => prev.filter(a => a.id !== id));
    setPortfolioTransactions(prev => prev.filter(tx => tx.assetId !== id && tx.fromAssetId !== id && tx.toAssetId !== id));
    try {
      await deleteDoc(doc(db, `users/${userId}/portfolioAssets/${id}`));
      const relatedTxs = portfolioTransactions.filter(tx => tx.assetId === id || tx.fromAssetId === id || tx.toAssetId === id);
      if (relatedTxs.length > 0) {
        await Promise.all(relatedTxs.map(tx => deleteDoc(doc(db, `users/${userId}/portfolioTransactions/${tx.id}`))));
      }
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }, [userId, portfolioAssets, portfolioTransactions]);

  const handleSaveCushion = useCallback(async (newData: Partial<Cushion>) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, `users/${userId}/cushion/main`), { ...newData, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, 'cushion'); }
  }, [userId]);

  const handleSaveCushionAsset = useCallback(async (asset: Partial<CushionAsset>) => {
    if (!userId) return;
    const id = asset.id || crypto.randomUUID();
    
    // Track change for history
    const old = cushionAssets.find(a => a.id === id);
    if (old && asset.amount !== undefined && asset.amount !== old.amount) {
      const diff = asset.amount - old.amount;
      const tx: Partial<BudgetTx> = {
        id: crypto.randomUUID(),
        type: 'adjustment',
        amount: diff,
        date: new Date().toISOString().slice(0, 10),
        description: `Коригування подушки: ${asset.name || old.name}`,
        note: 'Оновлено вручну',
        isIncoming: diff > 0,
        currency: 'UAH',
        accountId: accounts[0]?.id || 'manual',
        cushionAssetId: id
      };
      await handleSaveBudgetTx(tx);
    }

    try {
      await setDoc(doc(db, `users/${userId}/cushionAssets/${id}`), { ...asset, id, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) { handleFirestoreError(err, OperationType.UPDATE, `cushionAssets/${id}`); }
  }, [userId, cushionAssets, accounts, handleSaveBudgetTx]);

  const handleDeleteCushionAsset = useCallback(async (id: string) => {
    if (!userId) return;
    setCushionAssets(prev => prev.filter(a => a.id !== id));
    try {
      await deleteDoc(doc(db, `users/${userId}/cushionAssets/${id}`));
    } catch (err) { handleFirestoreError(err, OperationType.DELETE, id); }
  }, [userId]);

  const handleCreatePortfolio = useCallback(async () => {
    if (!userId || !newPortfolioName) return;
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, `users/${userId}/portfolios/${id}`), {
        id, name: newPortfolioName, type: newPortfolioType,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), assets: []
      });
      setShowNewPortfolioForm(false); setNewPortfolioName(''); setActivePortfolioId(id);
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'portfolios'); }
  }, [userId, newPortfolioName, newPortfolioType]);

  const handleDeleteBudgetTx = useCallback(async (id: string, affectedAccounts?: {id: string, balance: number}[]) => {
    if (!userId) return;
    const tx = transactions.find(t => t.id === id);
    
    // OPTIMISTIC UI
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (affectedAccounts) {
      setAccounts(current => current.map(acc => {
        const affected = affectedAccounts.find(a => a.id === acc.id);
        if (affected) return { ...acc, balance: affected.balance };
        return acc;
      }));
    }

    try {
      await deleteDoc(doc(db, `users/${userId}/budgetTxs/${id}`));

      const updatePromises: Promise<any>[] = [];
      let newPotentialValue: number | null = null;
      let isPotentialUpdatedViaAcc = false;

      if (affectedAccounts) {
        for (const acc of affectedAccounts) {
          const cur = accounts.find(a => a.id === acc.id);
          if (cur) {
             const updatePayload = { ...cur, balance: acc.balance };
             updatePromises.push(setDoc(doc(db, `users/${userId}/accounts/${acc.id}`), updatePayload, { merge: true }));
             
             if (acc.id === connectedPotentialAccountId) {
               newPotentialValue = acc.balance;
               setInvestmentBalanceOverride(acc.balance);
               isPotentialUpdatedViaAcc = true;
             }
          }
        }
      }

      if (tx?.type === 'investment' && !isPotentialUpdatedViaAcc) {
        const amount = Number(tx.amount) || 0;
        const currentP = typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0;
        const nextP = Number((currentP - amount).toFixed(2));
        setInvestmentBalanceOverride(nextP);
        newPotentialValue = nextP;
      }

      if (newPotentialValue !== null) {
        updatePromises.push(setDoc(doc(db, `users/${userId}`), { investmentBalanceOverride: newPotentialValue }, { merge: true }));
      }

      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [userId, accounts, transactions, connectedPotentialAccountId, investmentBalanceOverride]);

  const handleUndoDeleteDebt = useCallback(async (debt: Debt) => {
    if (!userId || !debt) return;
    try { await setDoc(doc(db, `users/${userId}/debts/${debt.id}`), debt); } catch (err) {}
  }, [userId]);

  const handleCreateCategory = useCallback(async (name: string, type: BudgetCategory['type'], color: string = 'bg-zinc-500') => {
    if (!userId || !name) return;
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, `users/${userId}/categories/${id}`), { id, name, type, planned: 0, color });
      return id;
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'categories'); }
  }, [userId]);

  const handleDeleteCategory = useCallback(async (id: string) => {
    if (!userId) return;
    setCategories(prev => prev.filter(c => c.id !== id));
    try { await deleteDoc(doc(db, `users/${userId}/categories/${id}`)); } catch (err) {}
  }, [userId]);

  const handleUndoDeleteCategory = useCallback(async (cat: BudgetCategory) => {
    if (!userId || !cat) return;
    try { await setDoc(doc(db, `users/${userId}/categories/${cat.id}`), cat); } catch (err) {}
  }, [userId]);

  const handleUpdateTxCategory = useCallback(async (txId: string, catId: string) => {
    if (!userId) return;
    try { await setDoc(doc(db, `users/${userId}/budgetTxs/${txId}`), { categoryId: catId, isAiCategorized: false }, { merge: true }); } catch (err) {}
  }, [userId]);

  const getSupabaseHeaders = useCallback(() => {
    const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
    return {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    };
  }, []);

  const handleSyncBank = useCallback(async (connId: string) => {
    if (!userId) return;
    const conn = bankConnections.find(c => c.id === connId);
    if (!conn?.token) return;
    setIsSyncingBank(true);
    try {
      const headers = { 
        ...getSupabaseHeaders(),
        'x-token': conn.token 
      };
      
      const { data: info, error } = await supabase.functions.invoke('monobank-proxy/personal/client-info', { 
        headers 
      });

      if (error) {
        console.error('[MONO SYNC ERROR]', error);
        return;
      }

      if (info) {
        const allRemote = [...(info.accounts || []), ...(info.jars || [])];
        const allMonoConns = bankConnections.filter(c => c.type === 'monobank');
        const isOnlyMono = allMonoConns.length === 1;

        for (const acc of accounts) {
          const cleanAccName = acc.name.toLowerCase().replace(/[^\w\sа-яіїєґ]/gi, '').trim();
          
          const remote = allRemote.find((ra: any) => {
            const cleanRemoteTitle = (ra.title || '').toLowerCase().replace(/[^\w\sа-яіїєґ]/gi, '').trim();
            const cleanTypeName = (ra.type === 'black' ? 'чорна' : ra.type === 'white' ? 'біла' : '').toLowerCase();
            
            const idMatch = ra.id === acc.bankAccountId;
            const nameMatch = cleanRemoteTitle.length > 2 && (cleanAccName.includes(cleanRemoteTitle) || cleanRemoteTitle.includes(cleanAccName));
            const typeMatch = ra.type && cleanAccName.includes(cleanTypeName) && cleanTypeName.length > 2;

            return idMatch || nameMatch || typeMatch;
          });
          
          if (remote) {
            const newBalance = remote.balance / 100;
            console.log(`[SYNC INFO] Match found: ${acc.name} <-> ${remote.title || remote.type}. Updating balance to ${newBalance}.`);
            await handleSaveAccount({ 
              ...acc, 
              balance: newBalance,
              creditLimit: Math.abs((remote.creditLimit || 0) / 100),
              bankAccountId: remote.id,
              bankConnectionId: connId
            });
          } else {
            if (acc.bankAccountId) {
              console.warn(`[SYNC WARN] No remote match for linked account: ${acc.name} (ID: ${acc.bankAccountId})`);
            }
          }
        }
      }
    } catch (err) { 
      console.error('Sync failed', err); 
    } finally { 
      setIsSyncingBank(false); 
    }
  }, [userId, bankConnections, accounts, handleSaveAccount, getSupabaseHeaders]);

  const handleSaveAsset = useCallback(async (asset: Partial<Asset>) => {
    if (!userId) return;
    const id = asset.id || crypto.randomUUID();

    // --- OPTIMISTIC UI UPDATE ---
    setAssets(prev => {
      const idx = prev.findIndex(a => a.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...asset, id };
        return next;
      }
      return [...prev, { ...asset, id } as Asset];
    });

    try { 
      const { updatedAt, updated_at, ...cleanAsset } = asset as any;
      // 1. Save to Firestore
      await setDoc(doc(db, `users/${userId}/assets/${id}`), { ...cleanAsset, id }, { merge: true }); 
      // 2. Save to Supabase (Dual Sync)
      await supabase.from('assets').upsert({ ...cleanAsset, id, userId });
    } catch (err) { 
      handleFirestoreError(err, OperationType.UPDATE, `assets/${id}`);
    }
  }, [userId, assets, accounts, handleSaveBudgetTx]);

  const handleDeleteAsset = useCallback(async (id: string) => {
    if (!userId) return;
    setAssets(prev => prev.filter(a => a.id !== id));
    try { 
      // 1. Delete from Firestore
      await deleteDoc(doc(db, `users/${userId}/assets/${id}`)); 
      // 2. Delete from Supabase
      await supabase.from('assets').delete().eq('id', id);
    } catch (err) {
      console.error('Delete asset error:', err);
    }
  }, [userId]);

  const globalMetrics = useMemo(() => {
    const usdRate = exchangeRates['UAH'] || 41.5;
    const effectiveBbPrice = isManualPriceMode ? manualPriceValue : (livePrice || 0);
    
    // 1. Physical Assets (Property)
    const physicalAssetsUsd = (assets || []).reduce((sum, a) => sum + (a.value || 0), 0) / usdRate;

    // 2. GLOBAL BITBON SCAN: Check EVERYTHING for "ERBB" or "Bitbon"
    const bitbonPortfolio = portfolios.find(p => p.type === 'bitbon' || p.name.toLowerCase().includes('bitbon'));
    
    // Scan portfolioAssets for Bitbon
    const bitbonAssets = portfolioAssets.filter(a => 
      (bitbonPortfolio && a.portfolioId === bitbonPortfolio.id) || 
      (a.symbol || '').toUpperCase().includes('ERBB') || 
      (a.name || '').toLowerCase().includes('bitbon')
    );
    
    // Scan manual accounts for Bitbon (some users store Bitbon in account balance)
    const bitbonAccountValueUsd = accounts
      .filter(acc => acc.name.toLowerCase().includes('bitbon') || acc.name.toUpperCase().includes('ERBB'))
      .reduce((s, acc) => s + (acc.balance || 0), 0) / usdRate;

    const bitbonTokens = bitbonAssets.reduce((s, a) => s + (a.amount || 0), 0);
    const bitbonValUsd = (bitbonTokens * effectiveBbPrice) + bitbonAccountValueUsd;
    
    // Total Invested (buy - sell from portfolio transactions)
    const totalInvUsd = portfolioTransactions.reduce((a, tx) => {
      if (tx.type === 'buy') return a + (tx.amountUsd || 0);
      if (tx.type === 'sell') return a - (tx.amountUsd || 0);
      return a;
    }, 0);
    
    // Total Portfolio Value
    const totalPortfolioValUsd = portfolioAssets.reduce((s, a) => {
      const isBitbon = (bitbonPortfolio && a.portfolioId === bitbonPortfolio.id) || (a.symbol || '').toUpperCase().includes('ERBB') || (a.name || '').toLowerCase().includes('bitbon');
      const price = a.currentPrice || a.averagePrice || (isBitbon ? effectiveBbPrice : 0);
      return s + ((a.amount || 0) * price);
    }, 0);

    // TOTAL CAPITAL (Net Worth) = Portfolios + Accounts (non-bitbon) + Physical Assets
    const nonBitbonAccountsUsd = accounts
      .filter(acc => !acc.name.toLowerCase().includes('bitbon') && !acc.name.toUpperCase().includes('ERBB'))
      .reduce((s, acc) => {
        const val = acc.balance || 0;
        const cur = acc.currency || 'UAH';
        if (cur === 'USD') return s + val;
        // Convert from cur to USD
        const valUsd = val / (exchangeRates[cur] || (cur === 'UAH' ? usdRate : 1));
        return s + valUsd;
      }, 0);

    const netWorthUsd = totalPortfolioValUsd + nonBitbonAccountsUsd + bitbonAccountValueUsd + physicalAssetsUsd;

    return { 
      totalInvestedUsd: totalInvUsd, 
      currentValueUsd: netWorthUsd, 
      totalProfitUsd: netWorthUsd - totalInvUsd, 
      totalRoi: totalInvUsd > 0 ? ((netWorthUsd - totalInvUsd) / totalInvUsd) * 100 : 0,
      totalTokens: bitbonTokens,
      bitbonValueUsd: bitbonValUsd,
      propertyValueUsd: physicalAssetsUsd,
      bitbonPrice: effectiveBbPrice,
      isManualPrice: isManualPriceMode
    };
  }, [portfolioTransactions, portfolioAssets, portfolios, accounts, assets, livePrice, exchangeRates, isManualPriceMode, manualPriceValue]);

  const formatGlobal = useCallback((n: number, targetCur: Currency, rates: Record<string, number>, sourceCur?: Currency, maxDecimals?: number, compact?: boolean) => {
    return formatGlobalUtil(n, targetCur, rates, sourceCur, maxDecimals, compact);
  }, []);

  const tickerItems = useMemo(() => [{ id: 'UAH', label: 'USD/UAH', price: exchangeRates['UAH'] || 41.5, currency: '₴' }, { id: 'ERBB', label: 'ERBB', price: livePrice, currency: '$' }], [exchangeRates, livePrice]);
  const totalAccountBalanceUah = useMemo(() => {
    return Number(accounts.reduce((sum, acc) => {
        const val = acc.balance || 0;
        const cur = acc.currency || 'UAH';
        if (cur === 'UAH') return sum + val;
        const valUah = (val / (exchangeRates[cur] || 1)) * (exchangeRates['UAH'] || 41);
        return sum + valUah;
    }, 0).toFixed(2));
  }, [accounts, exchangeRates]);

  if (!isAuthReady) return <div className="flex items-center justify-center min-h-screen bg-[#0a0b0f]"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (isProfileLoading) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center p-8">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (userId && isAllowed === false && !isAdminBypass) {
    return (
      <div className="min-h-screen theme-bg flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 animate-pulse">
          <LogIn size={48} />
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic">Доступ обмежено</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-bold leading-relaxed">
            Ваш обліковий запис очікує на підтвердження адміністратором. Будь ласка, зверніться до власника для отримання доступу.
          </p>
          <div className="pt-4">
             <button 
               onClick={() => signOut(auth)}
               className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
             >
               Вийти з акаунта
             </button>
          </div>
        </div>
        
        {/* Secret Admin Entry Point */}
        <div className="fixed bottom-8 opacity-0 hover:opacity-100 transition-opacity">
           <button 
             onClick={() => {
               setIsAdminBypass(true);
               setMainTab('academy');
             }}
             className="text-[10px] text-zinc-400 font-black uppercase tracking-widest px-4 py-2 hover:bg-white/5 rounded-full"
           >
             Admin Mode
           </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!userId ? (
        <motion.div 
          key="login" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0, scale: 1.1 }} 
          className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6"
        >
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-10 rounded-[40px] shadow-2xl border border-zinc-200 dark:border-white/5 text-center max-w-sm w-full">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
              <LogIn className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 italic">
              EPOHA <span className="text-indigo-600">WEB 4</span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mb-10 font-bold uppercase tracking-widest leading-relaxed">
              {t('signInToContinue')}
            </p>
            <button 
              onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} 
              className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-indigo-600 hover:text-white"
            >
              {t('signInBtn')}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="main-app" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="relative"
        >
          <MarketTicker 
            items={tickerItems} 
            isManualPriceMode={isManualPriceMode}
            manualPriceValue={manualPriceValue}
          />
          <div className="min-h-screen theme-bg text-zinc-900 dark:text-zinc-100 p-3 md:p-8 font-sans transition-all duration-700 overflow-x-hidden">
            <div className="w-full max-w-6xl mx-auto relative">
              <Header 
                language={language} 
                onLanguageChange={setLanguage} 
                globalCurrency={globalCurrency} 
                onCurrencyChange={setGlobalCurrency} 
                theme={theme} 
                onThemeChange={setTheme} 
                mainTab={mainTab} 
                onMainTabChange={(tab: any) => handleMainTabChange(tab)} 
                userId={userId} 
                onSignIn={() => signInWithPopup(auth, new GoogleAuthProvider())} 
                onSignOut={() => signOut(auth)} 
                t={t} 
              />
              
              <main className="mt-8 flex-1 relative pb-20">
                <React.Suspense fallback={
                  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">Завантаження...</p>
                  </div>
                }>
                  <AnimatePresence mode="wait">
                    {mainTab === 'budget' && (
                      <motion.div
                        key="budget"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Budget 
                          userId={userId} 
                          currentPrice={livePrice}
                          accounts={accounts} 
                          setAccounts={setAccounts}
                          categories={categories} 
                          setCategories={setCategories}
                          transactions={transactions} 
                          setTransactions={setTransactions}
                          assets={assets}
                          setAssets={setAssets}
                          formatGlobal={formatGlobal}
                          monthlyPlans={monthlyPlans}
                          setMonthlyPlans={setMonthlyPlans}
                          bbAllocations={bbAllocations}
                          setBbAllocations={setBbAllocations}
                          goals={goals}
                          setGoals={setGoals}
                          cushion={cushion}
                          setCushion={setCushion}
                          cushionAssets={cushionAssets}
                          bankConnections={bankConnections}
                          setBankConnections={setBankConnections}
                          debts={debts}
                          setDebts={setDebts}
                          onSaveDebt={handleSaveDebt}
                          onDeleteDebt={handleDeleteDebt}
                          onUndoDeleteDebt={handleUndoDeleteDebt}
                          onSaveCushion={handleSaveCushion}
                          onSaveCushionAsset={handleSaveCushionAsset}
                          onDeleteCushionAsset={handleDeleteCushionAsset}
                          onUpdateTxCategory={handleUpdateTxCategory}
                          onCreateCategory={handleCreateCategory}
                          onDeleteCategory={handleDeleteCategory}
                          onUndoDeleteCategory={handleUndoDeleteCategory}
                          onSaveAccount={handleSaveAccount}
                          onDeleteAccount={handleDeleteAccount}
                          onSaveGoal={handleSaveGoal}
                          onDeleteGoal={handleDeleteGoal}
                          onSaveAsset={handleSaveAsset}
                          onDeleteAsset={handleDeleteAsset}
                          onSyncBank={handleSyncBank}
                          onDeleteBudgetTx={handleDeleteBudgetTx}
                          onSaveBudgetTx={handleSaveBudgetTx}
                          globalCurrency={globalCurrency}
                          exchangeRates={exchangeRates}
                          t={t}
                          budgetProportions={budgetProportions}
                          setBudgetProportions={setBudgetProportions}
                          investmentBalanceOverride={investmentBalanceOverride}
                          setInvestmentBalanceOverride={setInvestmentBalanceOverride}
                          availableBalanceUah={totalAccountBalanceUah}
                          portfolios={portfolios}
                          portfolioAssets={portfolioAssets}
                          globalMetrics={globalMetrics}
                          onMainTabChange={handleMainTabChange}
                          language={language}
                          setConfirmModal={setConfirmModal}
                        />
                      </motion.div>
                    )}

                    {mainTab === 'investments' && (
                      <motion.div
                        key="investments"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <InvestmentsTab
                          language={language}
                          t={t}
                          globalCurrency={globalCurrency}
                          exchangeRates={exchangeRates}
                          livePrice={livePrice}
                          isLoadingPrice={isRefreshing}
                          priceError={false}
                          fetchPrice={fetchPrice}
                          availableInvestmentUah={typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0}
                          availableInvestmentUsd={(typeof investmentBalanceOverride === 'number' ? investmentBalanceOverride : 0) / (exchangeRates['UAH'] || 41)}
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
                          onPortfolioTx={async (tx) => { await handleAddTx(tx.type || 'buy', tx); }}
                          formatGlobal={formatGlobal}
                          theme={theme}
                          bitbonPortfolio={bitbonPortfolio}
                          onUpdateInvestmentPotential={handleUpdateInvestmentPotential}
                          onWithdrawFromInvestment={handleWithdrawFromInvestment}
                          accounts={accounts}
                          portfolioTransactions={portfolioTransactions}
                          isManualPriceMode={isManualPriceMode}
                          setIsManualPriceMode={setIsManualPriceMode}
                          manualPriceValue={manualPriceValue}
                          setManualPriceValue={setManualPriceValue}
                          connectedPotentialAccountId={connectedPotentialAccountId}
                          onConnectPotentialAccount={handleConnectPotentialAccount}
                        />
                      </motion.div>
                    )}

                    {mainTab === 'academy' && (
                      <motion.div
                        key="academy"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <AcademyView userId={userId} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </React.Suspense>
              </main>

              <React.Suspense fallback={null}>
                <IOAssistant 
                  userId={userId} 
                  language={language} 
                  t={t} 
                  globalMetrics={globalMetrics} 
                  portfolios={portfolios} 
                  portfolioAssets={portfolioAssets} 
                  formatGlobal={formatGlobal}
                  globalCurrency={globalCurrency}
                  exchangeRates={exchangeRates}
                  context={{ 
                    totalCapitalUsd: globalMetrics.currentValueUsd, 
                    totalInvestedUsd: globalMetrics.totalInvestedUsd, 
                    usdRate: exchangeRates['UAH'] || 41, 
                    actualIncomeUsd: transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount / (t.currency === 'USD' ? 1 : exchangeRates[t.currency] || 41)), 0), 
                    actualExpensesUsd: transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount / (t.currency === 'USD' ? 1 : exchangeRates[t.currency] || 41)), 0), 
                    budgetBalanceUah: totalAccountBalanceUah 
                  }} 
                />
              </React.Suspense>
            </div>
            
            <BottomNav 
              activeTab={mainTab} 
              onTabChange={handleMainTabChange} 
            />
            
            <ConfirmModal 
              isOpen={confirmModal.show}
              onClose={() => setConfirmModal({ ...confirmModal, show: false })}
              onConfirm={() => {
                confirmModal.onConfirm();
                setConfirmModal({ ...confirmModal, show: false });
              }}
              title={confirmModal.title}
              message={confirmModal.message}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
