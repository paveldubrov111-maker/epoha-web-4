import React, { useState, useMemo, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { supabase } from '../supabaseClient';
import { Account, AccountType, BudgetCategory, BudgetTx, Currency, Asset, MonthlyPlan, BankConnection, Goal, Cushion, CushionAsset, Portfolio, PortfolioAsset, BitbonAllocation, Debt, Language } from '../types';
import { fmt, fmtUsd } from '../utils/format';
import { Plus, Minus, ArrowRight, Settings, PieChart, TrendingUp, TrendingDown, ShieldCheck, Shield, Crown, Star, Gem, Wallet, Trash2, Edit2, Check, X, ArrowDownUp, Home, ChevronLeft, ChevronRight, ChevronDown, Calendar, Info, RefreshCw, Sparkles, History, Search, Undo2, Landmark, CreditCard, ArrowUpRight, Target, CheckCircle2, Zap, AlertCircle } from 'lucide-react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
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
import { db, doc, setDoc, deleteDoc, onSnapshot, getDoc, writeBatch, handleFirestoreError, OperationType } from '../firebase';
import { matchCategory } from '../utils/categoryMapper';
import { getLocalizedMonths } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { DebtContent } from './features/budget/DebtContent';
import { CushionContent } from './features/budget/CushionContent';
import MonthlyDetailView from './features/budget/MonthlyDetailView';
import { MonthPicker } from './ui/MonthPicker';
import { CategoryDropdown } from './features/budget/CategoryDropdown';
import { AccountsTab } from './features/budget/AccountsTab';
import { PropertyCard } from './features/budget/PropertyCard';
import { CATEGORY_COLORS } from '../constants/colors';
import { ConfirmModal } from './ConfirmModal';

const INTERNAL_TRANSFER_PATTERNS = [
  'банка', 'jar', 'з рахунку', 'на рахунок', 'переказ між рахунками',
  'з білої', 'на білу', 'з чорної', 'на чорну', 'переказ між',
  'з рахунку на', 'собі на', 'своїх рахунк', 'свою картк', 'власної картк',
  'зі своєї картк', 'власну карту', 'own accounts', 'скарбничк', 'sweeping',
  'transfer from', 'поповнення з', 'надіслано від', 'надіслано на',
  'зі скарбнички', 'свої кошти', 'переказ з банки', 'виплата з банки', 'поповнення банки'
];





interface BudgetProps {
  userId: string | null;
  currentPrice: number;
  accounts: Account[];
  setAccounts: Dispatch<SetStateAction<Account[]>>;
  categories: BudgetCategory[];
  setCategories: Dispatch<SetStateAction<BudgetCategory[]>>;
  transactions: BudgetTx[];
  setTransactions: Dispatch<SetStateAction<BudgetTx[]>>;
  assets: Asset[];
  setAssets: Dispatch<SetStateAction<Asset[]>>;
  formatGlobal: (n: number, targetCur: Currency, rates: Record<string, number>, sourceCur?: Currency, maxDecimals?: number, compact?: boolean) => string;
  globalCurrency: Currency;
  monthlyPlans: MonthlyPlan[];
  setMonthlyPlans: Dispatch<SetStateAction<MonthlyPlan[]>>;
  bbAllocations: BitbonAllocation[];
  setBbAllocations: Dispatch<SetStateAction<BitbonAllocation[]>>;
  goals: Goal[];
  setGoals: Dispatch<SetStateAction<Goal[]>>;
  cushion: Cushion | null;
  setCushion: Dispatch<SetStateAction<Cushion | null>>;
  bankConnections: BankConnection[];
  setBankConnections: Dispatch<SetStateAction<BankConnection[]>>;
  onAddBankConnection?: (conn: BankConnection) => Promise<void>;
  onDeleteBankConnection?: (id: string) => Promise<void>;
  budgetProportions: Record<string, number>;
  setBudgetProportions: Dispatch<SetStateAction<Record<string, number>>>;
  investmentBalanceOverride: number | '';
  setInvestmentBalanceOverride: Dispatch<SetStateAction<number | ''>>;
  portfolios: Portfolio[];
  portfolioAssets: PortfolioAsset[];
  exchangeRates: Record<string, number>;
  globalMetrics: any;
  availableBalanceUah: number;
  debts: Debt[];
  setDebts: Dispatch<SetStateAction<Debt[]>>;
  onSaveDebt: (debt: Partial<Debt>) => Promise<string | undefined>;
  onDeleteDebt: (id: string) => Promise<void>;
  onUndoDeleteDebt: (debt: Debt) => Promise<void>;
  onSaveCushion: (newData: Partial<Cushion>) => Promise<void>;
  cushionAssets: CushionAsset[];
  onSaveCushionAsset: (asset: Partial<CushionAsset>) => Promise<void>;
  onDeleteCushionAsset: (id: string) => Promise<void>;
  onUpdateTxCategory: (txId: string, catId: string, type: BudgetCategory['type'], month?: string) => Promise<void>;
  onCreateCategory: (name: string, type: BudgetCategory['type'], color?: string, monthToSync?: string) => Promise<string | undefined>;
  onDeleteCategory: (id: string) => Promise<void>;
  onUndoDeleteCategory: (cat: BudgetCategory) => Promise<void>;
  onSaveAccount: (acc: Partial<Account>) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onSaveGoal: (goal: Partial<Goal>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onSaveAsset: (asset: Partial<Asset>) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
  onSyncBank: (connId: string) => Promise<void>;
  onDeleteBudgetTx: (id: string, affectedAccounts?: { id: string, balance: number }[]) => Promise<void>;
  onSaveBudgetTx: (tx: Partial<BudgetTx>, affectedAccounts?: { id: string, balance: number }[]) => Promise<void>;
  onMainTabChange: (tab: 'budget' | 'investments' | 'academy') => void;
  language: Language;
  t: (key: string) => string;
  setConfirmModal: Dispatch<SetStateAction<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>>;
}


interface DeletionTarget {
  id: string;
  type: 'debt' | 'category';
  name: string;
}



export default function Budget({
  userId, currentPrice, accounts, setAccounts, categories, setCategories,
  transactions, setTransactions, assets, setAssets, formatGlobal, globalCurrency,
  monthlyPlans, setMonthlyPlans, bbAllocations, setBbAllocations,
  goals, setGoals, cushion, setCushion,
  bankConnections, setBankConnections, onAddBankConnection, onDeleteBankConnection,
  budgetProportions, setBudgetProportions, investmentBalanceOverride, setInvestmentBalanceOverride,
  portfolios, portfolioAssets, exchangeRates, globalMetrics, availableBalanceUah,
  debts, setDebts, onSaveDebt, onDeleteDebt, onUndoDeleteDebt,
  onSaveCushion, cushionAssets, onSaveCushionAsset, onDeleteCushionAsset, onUpdateTxCategory, onCreateCategory, onDeleteCategory, onUndoDeleteCategory,
  onSaveAccount, onDeleteAccount, onSaveGoal, onDeleteGoal, onSaveAsset, onDeleteAsset, onSyncBank,
  onSaveBudgetTx, onDeleteBudgetTx,
  onMainTabChange,
  language, t,
  setConfirmModal
}: BudgetProps) {
  const localizedMonths = useMemo(() => getLocalizedMonths(language), [language]);
  const locale = useMemo(() => language === 'uk' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-US', [language]);
  const chartIdSuffix = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'planning' | 'accounts' | 'assets' | 'goals'>(
    () => {
      const saved = localStorage.getItem('budgetActiveTab');
      if (saved && ['dashboard', 'transactions', 'planning', 'accounts', 'assets', 'goals'].includes(saved)) {
        return saved as any;
      }
      return 'dashboard';
    }
  );



  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('hiddenCategoryIds');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    localStorage.setItem('hiddenCategoryIds', JSON.stringify(Array.from(hiddenCategoryIds)));
  }, [hiddenCategoryIds]);

  const toggleCategoryVisibility = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHiddenCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [showCushionSettings, setShowCushionSettings] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lastDeletedTx, setLastDeletedTx] = useState<BudgetTx | null>(null);
  const [lastDeletedAccs, setLastDeletedAccs] = useState<Account[] | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [lastDeletedDebt, setLastDeletedDebt] = useState<Debt | null>(null);
  const [showDebtUndoToast, setShowDebtUndoToast] = useState(false);
  const undoDebtTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [itemToDelete, setItemToDelete] = useState<DeletionTarget | null>(null);
  const [lastDeletedCategory, setLastDeletedCategory] = useState<BudgetCategory | null>(null);
  const [showCategoryUndoToast, setShowCategoryUndoToast] = useState(false);
  const undoCategoryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastFullSyncTimestamp, setLastFullSyncTimestamp] = useState(0);

  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof window !== 'undefined' && (
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    )
  );

  useEffect(() => {
    const checkDark = () => {
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDark);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDark);
    };
  }, []);

  const chartTextColor = isDarkMode ? '#ffffff' : '#18181b';
  const chartGridColor = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';

  useEffect(() => {
    console.log(`[BANK DEBUG] Budget received ${bankConnections.length} connections`);
  }, [bankConnections]);

  // Transaction Form State
  const [showTxForm, setShowTxForm] = useState<'income' | 'expense' | 'transfer' | 'adjustment' | 'investment' | 'cushion' | 'goal' | null>(null);
  const [txAmount, setTxAmount] = useState(0);
  const [txAccountId, setTxAccountId] = useState(accounts[0]?.id || '');
  const [txToAccountId, setTxToAccountId] = useState(accounts[1]?.id || '');
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txNote, setTxNote] = useState('');
  const [txCushionAssetId, setTxCushionAssetId] = useState('');
  const [txGoalId, setTxGoalId] = useState('');

  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Academy Stats for Dashboard
  const [academyStats, setAcademyStats] = useState({ xp: 0, modules: 0 });
  useEffect(() => {
    const xp = parseInt(localStorage.getItem('academy_xp') || '0');
    const mods = JSON.parse(localStorage.getItem('academy_modules') || '[]').length;
    setAcademyStats({ xp, modules: mods });
  }, [activeTab]);

  // Debt Management State
  const [debtSubTab, setDebtSubTab] = useState<'monobank' | 'manual'>('monobank');
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState(0);
  const [debtRate, setDebtRate] = useState(0);
  const [debtPayment, setDebtPayment] = useState(0);
  const [debtColor, setDebtColor] = useState(CATEGORY_COLORS[0]);

  const handleSaveDebtLocal = async () => {
    if (!userId || !debtName) return;
    const debtId = editingDebt?.id || crypto.randomUUID();
    const newDebt: Partial<Debt> = {
      id: debtId,
      name: debtName,
      amount: debtAmount,
      interestRate: debtRate,
      monthlyPayment: debtPayment,
      color: debtColor,
      createdAt: editingDebt?.createdAt
    };
    await onSaveDebt(newDebt);
    setShowDebtForm(false);
    setEditingDebt(null);
    setDebtName(''); setDebtAmount(0); setDebtRate(0); setDebtPayment(0);
  };

  const [newCatType, setNewCatType] = useState<BudgetCategory['type']>('expense');

  const handleCreateCategoryLocal = async (name?: string, type?: BudgetCategory['type'], color: string = 'bg-zinc-500', monthToSync?: string) => {
    const finalName = name || newCatName;
    const finalType = type || newCatType;
    if (!userId || !finalName) return;

    const id = await onCreateCategory(finalName, finalType, color, monthToSync);

    if (!name) {
      setShowAddCat(false);
      setNewCatName('');
    }
    return id;
  };


  // Fix: initialize txAccountId asynchronously when accounts load from Firebase
  useEffect(() => {
    if (!txAccountId && accounts.length > 0) setTxAccountId(accounts[0].id);
    if (!txToAccountId && accounts.length > 1) setTxToAccountId(accounts[1].id);
    else if (!txToAccountId && accounts.length > 0) setTxToAccountId(accounts[0].id);
  }, [accounts, txAccountId, txToAccountId]);

  // Account Form State
  const [editingAcc, setEditingAcc] = useState<string | null>(null);
  const [accName, setAccName] = useState('');
  const [accBalance, setAccBalance] = useState(0);
  const [accCreditLimit, setAccCreditLimit] = useState(0);
  const [accIsInvestment, setAccIsInvestment] = useState(false);
  const [accType, setAccType] = useState<AccountType>('cards');

  // Category Form State
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catPlanned, setCatPlanned] = useState(0);
  const [catType, setCatType] = useState<'income' | 'expense' | 'cushion' | 'investment' | 'goal'>('expense');

  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const totalPhysicalAssetsValue = useMemo(() => (assets || []).reduce((sum, a) => sum + (a.value || 0), 0), [assets]);

  // Asset Form State
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetDesc, setAssetDesc] = useState('');
  const [assetValue, setAssetValue] = useState<number>(0);
  const [confirmDeleteAssetId, setConfirmDeleteAssetId] = useState<string | null>(null);

  // Month Filter
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('budgetSelectedMonth');
    if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
    return new Date().toISOString().slice(0, 7);
  }); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(() => Number(localStorage.getItem('budgetSelectedYear')) || new Date().getFullYear());
  const [editingMonth, setEditingMonth] = useState<string | null>(() => localStorage.getItem('budgetEditingMonth')); // YYYY-MM format for detail view

  useEffect(() => {
    document.body.classList.toggle('modal-view-open', !!editingMonth);
    return () => document.body.classList.remove('modal-view-open');
  }, [editingMonth]);
  const [planningPillar, setPlanningPillar] = useState<'income' | 'expense' | 'investment' | 'cushion' | 'debt'>('expense');

  // Bank Sync State
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankFormType, setBankFormType] = useState<'monobank' | 'okx'>('monobank');
  const [bankToken, setBankToken] = useState('');
  const [bankName, setBankName] = useState('Monobank');
  const [isSyncingBank, setIsSyncingBank] = useState(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const [okxApiKey, setOkxApiKey] = useState('');
  const [okxSecretKey, setOkxSecretKey] = useState('');
  const [okxPassphrase, setOkxPassphrase] = useState('');
  const [okxBalances, setOkxBalances] = useState<any[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastBalancesUpdateTime, setLastBalancesUpdateTime] = useState<string | null>(null);
  const [isSyncingBalances, setIsSyncingBalances] = useState(false);
  const [isBackgroundSyncingBalances, setIsBackgroundSyncingBalances] = useState(false);
  const [includePhysicalAssets, setIncludePhysicalAssets] = useState(() => {
    const saved = localStorage.getItem('budgetIncludePhysicalAssets');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('budgetIncludePhysicalAssets', includePhysicalAssets.toString());
  }, [includePhysicalAssets]);

  const addSyncLog = (msg: string) => {
    setSyncStatus(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
    console.log(`[SYNC LOG] ${msg}`);
  };
  const [monobankClientInfos, setMonobankClientInfos] = useState<Record<string, any>>(() => {
    const cached = localStorage.getItem('budget_monobankClientInfos');
    return cached ? JSON.parse(cached) : {};
  });

  useEffect(() => {
    if (Object.keys(monobankClientInfos).length > 0) {
      localStorage.setItem('budget_monobankClientInfos', JSON.stringify(monobankClientInfos));
    }
  }, [monobankClientInfos]);

  const categorizedAccounts = useMemo(() => {
    const groups: Record<AccountType, Account[]> = {
      cards: [],
      jars: [],
      goals: [],
      investments: [],
      savings: [],
      cushion: [],
      credit: [],
    };

    accounts.forEach(acc => {
      const name = acc.name.toLowerCase();
      
      // Check if this account is actually a Monobank Jar
      const isMonobankJar = Object.values(monobankClientInfos || {}).some((info: any) => 
        info?.jars?.some((j: any) => j.id === acc.bankAccountId)
      ) || acc.bankAccountId?.startsWith('jar_');

      const isCrypto = name.includes('usdt') || name.includes('okx') || name.includes('crypto') || name.includes('біткоїн') || name.includes('binance') || name.includes('бітбон') || name.includes('bitbon');
      const isJar = name.includes('банка') || name.includes('jar') || isMonobankJar;
      const isInvestment = acc.isInvestment || name.includes('інвест') || isCrypto;
      const isDeposit = name.includes('депозит') || name.includes('скарбничка');
      const isCredit = (acc.creditLimit || 0) > 0;
      const isCurrency = (acc.currency !== 'UAH' && acc.currency !== (globalCurrency as string)) && !isCrypto;
      const isGoal = name.includes('ціль') || name.includes('на ') || name.includes('мета');
      const isCushion = name.includes('подушка') || name.includes('безпек');

      // 1. Explicit type check (highest priority)
      if (acc.type && groups[acc.type]) {
        groups[acc.type].push(acc);
        return;
      }

      // 2. Auto-detection logic
      if (isCredit) {
        groups.credit.push(acc);
      } else if (isCushion) {
        groups.cushion.push(acc);
      } else if (isGoal || (isJar && (name.includes('на ') || name.includes('ціль')))) {
        groups.goals.push(acc);
      } else if (isInvestment || isCrypto) {
        groups.investments.push(acc);
      } else if (isJar) {
        groups.jars.push(acc);
      } else if (isDeposit || isCurrency) {
        groups.savings.push(acc);
      } else {
        // Default to cards (includes cash)
        groups.cards.push(acc);
      }
    });

    return groups;
  }, [accounts, monobankClientInfos]);

  const [txVisibleCount, setTxVisibleCount] = useState(100);
  const [isSaving, setIsSaving] = useState(false);

  // Goal Form State
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState(0);
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalBankAccId, setGoalBankAccId] = useState('');
  const [goalColor, setGoalColor] = useState('bg-blue-500');

  // Debt Calculator State
  const [debtTargetDate, setDebtTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });

  const getMonobankUrl = (path: string, token: string) => {
    // We use the Supabase Edge Function monobank-proxy instead of the legacy Firebase proxy.
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    return `${baseUrl}/functions/v1/monobank-proxy${path}`;
  };

  // Auto-fetch bank info on mount if connection exists
  useEffect(() => {
    // Auto-calculate suggested monthly payment if rate or amount changes and payment is 0
    if (showDebtForm && debtAmount > 0 && debtRate > 0 && debtPayment === 0) {
      const monthlyInterest = (debtAmount * (debtRate / 100)) / 12;
      // Suggested payment: Interest + pay off principal in 24 months
      const suggested = Math.ceil(monthlyInterest + (debtAmount / 24));
      setDebtPayment(suggested);
    }
  }, [debtAmount, debtRate, showDebtForm, debtPayment]);

  useEffect(() => {
    if (bankConnections.length > 0 && !isSyncingBank) {
      const fetchAllInfos = async () => {
        const monobankConns = bankConnections.filter(c => c.type === 'monobank');
        for (const conn of monobankConns) {
          if (monobankClientInfos[conn.id]) continue; // Already fetched

          try {
            const url = getMonobankUrl('/personal/client-info', conn.token);
            const res = await fetch(url, {
              headers: {
                ...getCommonHeaders(),
                'X-Token': conn.token
              }
            });
            if (res.ok) {
              const info = await res.json();
              setMonobankClientInfos(prev => ({ ...prev, [conn.id]: info }));
            } else {
              setMonobankClientInfos(prev => ({ ...prev, [conn.id]: { error: true } }));
            }
          } catch (e) {
            console.warn(`[MONO] Client info fetch failed for ${conn.name}:`, e);
            setMonobankClientInfos(prev => ({ ...prev, [conn.id]: { error: true } }));
          }
        }
      };
      fetchAllInfos();
    }
  }, [bankConnections, monobankClientInfos, isSyncingBank]);

  // Balance healing logic: If we have fresh API data, ensure 'My Accounts' matches it
  useEffect(() => {
    if (Object.keys(monobankClientInfos).length > 0) {
      const allInfos = Object.values(monobankClientInfos).filter(info => !info.error && info.accounts);
      if (allInfos.length === 0) return;

      const allRemoteAccounts = allInfos.flatMap((info: any) => [...(info.accounts || []), ...(info.jars || [])]);
      
      accounts.forEach(async (acc) => {
        if (!acc.bankAccountId) return;
        const remote = allRemoteAccounts.find((ra: any) => ra.id === acc.bankAccountId);
        if (remote) {
          const remoteBalance = remote.balance / 100;
          // If difference is more than 0.01 (cents precision issues), update
          if (Math.abs(acc.balance - remoteBalance) > 0.01) {
            console.warn(`[HEALING] Balance mismatch for ${acc.name}. Local: ${acc.balance}, Remote: ${remoteBalance}. Fixing...`);
            await onSaveAccount({ ...acc, balance: remoteBalance });
          }
        }
      });
    }
  }, [monobankClientInfos]); // Dependency only on API data to avoid constant loops

  const handleConnectMonobank = async () => {
    if (!bankToken) return;
    console.log('[BANK DEBUG] Starting connection flow...');
    setIsSyncingBank(true);
    try {
      // Note: Monobank API has CORS restrictions. In a real app, this should go through a backend proxy.
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kcsitkemfmkdlttvqegp.supabase.co';
      const res = await fetch(
        `${baseUrl}/functions/v1/monobank-proxy/personal/client-info`,
        {
          method: "GET",
          headers: {
            ...getCommonHeaders(),
            "X-Token": bankToken
          },
        }
      );
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(t('errProxyNotFound'));
      }
      const errText = await res.text();
      throw new Error(`${t('errMonoError')} (${res.status}): ${errText.slice(0, 100)}`);
    }
    const data = await res.json();

    const newConn: BankConnection = {
      id: crypto.randomUUID(),
      type: 'monobank',
      token: bankToken,
      name: data.name || 'Monobank',
      updatedAt: new Date().toISOString()
    };
    await onAddBankConnection(newConn);
    setShowBankForm(false);
    setBankToken('');
  } catch (err) {
    console.error(err);
    console.warn(`${t('errConnection')}: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    setIsSyncingBank(false);
  }
};

const getCommonHeaders = () => {
  const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  return {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`
  };
};

const handleRegisterWebhook = async (conn: BankConnection) => {
  setIsSyncingBank(true);
  addSyncLog(t('webhookRegistering').replace('{name}', conn.name));
  try {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const webhookUrl = `${baseUrl}/functions/v1/monobank-webhook?connId=${conn.id}`;

    const monobankApiUrl = getMonobankUrl('/personal/webhook', conn.token);
    const res = await fetch(monobankApiUrl, {
      method: 'POST',
      headers: {
        ...getCommonHeaders(),
        'X-Token': conn.token
      },
      body: JSON.stringify({ webHookUrl: webhookUrl })
    });

    if (res.ok) {
      addSyncLog(t('webhookActivated'));
      console.log('Миттєва синхронізація активована!');
    } else {
      const errorData = await res.json();
      addSyncLog(`[WEBHOOK] Помилка API: ${JSON.stringify(errorData)}`);
      console.error('Помилка активації вебхука.');
    }
  } catch (error) {
    addSyncLog(`[WEBHOOK] Помилка: ${error}`);
  } finally {
    setIsSyncingBank(false);
  }
};

// OKX Connection
const getOkxProxyUrl = (path: string) => {
  const base = import.meta.env.VITE_SUPABASE_URL || '';
  return `${base}/functions/v1/okx-proxy`;
};

const handleConnectOkx = async () => {
  if (!userId || !okxApiKey || !okxSecretKey || !okxPassphrase) {
    console.warn(t('fillAllFieldsMono'));
    return;
  }
  setIsSyncingBank(true);
  try {
    // Test connection by fetching balance
    const res = await fetch(getOkxProxyUrl('/api/v5/account/balance'), {
      headers: {
        'x-okx-apikey': okxApiKey,
        'x-okx-secretkey': okxSecretKey,
        'x-okx-passphrase': okxPassphrase,
        'x-okx-path': '/api/v5/account/balance',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      }
    });
    const data = await res.json();
    if (data.code !== '0') {
      throw new Error(data.msg || t('errOkxConnect'));
    }

    const newConn: BankConnection = {
      id: crypto.randomUUID(),
      type: 'okx',
      token: '', // Not used for OKX
      name: 'OKX Exchange',
      updatedAt: new Date().toISOString(),
      apiKey: okxApiKey,
      secretKey: okxSecretKey,
      passphrase: okxPassphrase,
    };
    await onAddBankConnection(newConn);
    setShowBankForm(false);
    setOkxApiKey('');
    setOkxSecretKey('');
    setOkxPassphrase('');

    // Immediately sync
    await handleSyncOkx(newConn);
  } catch (err) {
    console.error('[OKX] Connect error:', err);
    alert(`Помилка підключення OKX: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    setIsSyncingBank(false);
  }
};

const handleSyncOkx = async (conn: BankConnection) => {
  if (!userId || !conn.apiKey || !conn.secretKey || !conn.passphrase) return;
  setIsSyncingBank(true);
  setSyncStatus([]);
  addSyncLog(`OKX: ${t('syncStarted')}`);

  try {
    // 0. Get Market Prices for all symbols (to estimate Funding/Savings/Trading values)
    addSyncLog(`Market: ${t('marketPricesFetching')}`);
    const priceMap: Record<string, number> = {};
    try {
      const [binanceRes, okxMarketRes, coincapRes] = await Promise.allSettled([
        fetch('https://api.binance.com/api/v3/ticker/price'),
        fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT'),
        fetch('https://api.coincap.io/v2/assets?limit=1000')
      ]);

      if (binanceRes.status === 'fulfilled') {
        const data = await binanceRes.value.json();
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (item.symbol?.endsWith('USDT')) priceMap[item.symbol.replace('USDT', '')] = parseFloat(item.price);
          });
        }
      }

      if (okxMarketRes.status === 'fulfilled') {
        const data = await okxMarketRes.value.json();
        if (data?.data) {
          data.data.forEach((item: any) => {
            const sym = item.instId.replace('-USDT', '');
            if (!priceMap[sym]) priceMap[sym] = parseFloat(item.last);
          });
        }
      }

      if (coincapRes.status === 'fulfilled') {
        const data = await coincapRes.value.json();
        if (data?.data) {
          data.data.forEach((asset: any) => {
            if (!priceMap[asset.symbol]) priceMap[asset.symbol] = parseFloat(asset.priceUsd);
          });
        }
      }
    } catch (e) {
      console.error('Failed to pre-fetch prices for sync', e);
    }
    const headers = {
      'x-okx-apikey': conn.apiKey,
      'x-okx-secretkey': conn.secretKey,
      'x-okx-passphrase': conn.passphrase,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    };

    const fetchOkx = async (path: string) => {
      try {
        const res = await fetch(getOkxProxyUrl(''), {
          headers: { ...headers, 'x-okx-path': path }
        });
        const data = await res.json();
        if (data.code !== '0') {
          console.warn(`[OKX] Error fetching ${path}:`, data.msg);
          return null;
        }
        return data.data;
      } catch (e) {
        console.error(`[OKX] Fetch failed for ${path}:`, e);
        return null;
      }
    };

    // 1. Trading account balance
    addSyncLog(`OKX: ${t('tradingBalanceFetching')}`);
    const tradingData = await fetchOkx('/api/v5/account/balance');

    // 2. Funding account balance
    addSyncLog(`OKX: ${t('fundingBalanceFetching')}`);
    const fundingData = await fetchOkx('/api/v5/asset/balances');

    // 3. Заробіток / Savings balance
    addSyncLog(`OKX: ${t('savingsBalanceFetching')}`);
    const savingsData = await fetchOkx('/api/v5/finance/savings/balance');

    // 4. Staking / Earn balance
    addSyncLog(`OKX: ${t('stakingBalanceFetching')}`);
    const stakingData = await fetchOkx('/api/v5/finance/staking-defl/balance');

    // 5. Open positions
    addSyncLog(`OKX: ${t('positionsFetching')}`);
    const positionsData = await fetchOkx('/api/v5/account/positions');

    // 6. Recent Bills and Fills (Deep fetch 2 pages for better coverage)
    addSyncLog(`OKX: ${t('historyFetching')}`);
    const earnPromise = fetchOkx('/api/v5/finance/staking-defl/active-orders');

    let allBills: any[] = [];
    const bills1 = await fetchOkx('/api/v5/asset/bills?limit=100');
    if (bills1) {
      allBills.push(...bills1);
      if (bills1.length === 100) {
        const lastId = bills1[bills1.length - 1].billId;
        const bills2 = await fetchOkx(`/api/v5/asset/bills?limit=100&after=${lastId}`);
        if (bills2) allBills.push(...bills2);
      }
    }

    let allFills: any[] = [];
    const fills1 = await fetchOkx('/api/v5/trade/fills?instType=SPOT&limit=100');
    if (fills1) {
      allFills.push(...fills1);
      if (fills1.length === 100) {
        const lastId = fills1[fills1.length - 1].billId;
        const fills2 = await fetchOkx(`/api/v5/trade/fills?instType=SPOT&limit=100&after=${lastId}`);
        if (fills2) allFills.push(...fills2);
      }
    }

    const earnData = await earnPromise;
    const billsData = allBills;
    const fillsData = allFills;

    // Map bills and fills to find last purchase date and price for each currency
    const assetHistory: Record<string, { lastPurchaseDate?: string, lastPrice?: number }> = {};

    // Process fills first (direct trades) as they have precise prices
    if (fillsData?.[0]?.instId) {
      fillsData.forEach((fill: any) => {
        const ccy = fill.instId.replace('-USDT', '');
        if (!assetHistory[ccy] && fill.side === 'buy') {
          assetHistory[ccy] = {
            lastPurchaseDate: new Date(parseInt(fill.fillTime)).toISOString(),
            lastPrice: parseFloat(fill.fillPx)
          };
        }
      });
    }

    // Process bills for other types of acquisition
    if (billsData) {
      billsData.forEach((bill: any) => {
        if (!assetHistory[bill.ccy]) {
          // Types: 1=Deposit, 18=Spot buy, 20=Buy, etc.
          if (['1', '18', '20', '34'].includes(bill.billIdType || bill.type)) {
            const price = parseFloat(bill.px || bill.billPx || '0');
            assetHistory[bill.ccy] = {
              lastPurchaseDate: new Date(parseInt(bill.ts)).toISOString(),
              lastPrice: price > 0 ? price : undefined
            };
          }
        }
      });
    }

    let allAssets: { symbol: string, amount: number, usdValue: number, accountType: string, namePrefix?: string }[] = [];

    // Process trading account
    if (tradingData?.[0]?.details) {
      const trading = tradingData[0].details
        .filter((d: any) => parseFloat(d.eq) > 0)
        .map((d: any) => ({
          symbol: d.ccy,
          amount: parseFloat(d.eq),
          usdValue: parseFloat(d.eqUsd || '0'),
          accountType: 'trading'
        }));
      allAssets.push(...trading);
      addSyncLog(t('tradingAssetsAdded').replace('{count}', String(trading.length)));
    }

    // Process funding account  
    if (fundingData) {
      const funding = fundingData
        .filter((d: any) => parseFloat(d.bal) > 0)
        .map((d: any) => {
          const amount = parseFloat(d.bal);
          const price = priceMap[d.ccy] || 0;
          return {
            symbol: d.ccy,
            amount: amount,
            usdValue: amount * price,
            accountType: 'funding'
          };
        });
      allAssets.push(...funding);
      addSyncLog(t('fundingAssetsAdded').replace('{count}', String(funding.length)));
    }

    // Process savings account
    if (savingsData) {
      const savings = savingsData
        .filter((d: any) => parseFloat(d.amt) > 0)
        .map((d: any) => {
          const amount = parseFloat(d.amt);
          const price = priceMap[d.ccy] || 0;
          return {
            symbol: d.ccy,
            amount: amount,
            usdValue: amount * price,
            accountType: 'savings'
          };
        });
      allAssets.push(...savings);
      addSyncLog(`OKX ${t('typeSavings')}: +${savings.length} ${t('tokensTitle')}`);
    }
    // Process staking account
    if (stakingData) {
      const staking = stakingData
        .filter((d: any) => parseFloat(d.amt) > 0)
        .map((d: any) => {
          const amount = parseFloat(d.amt);
          const price = priceMap[d.ccy] || 0;
          return {
            symbol: d.ccy,
            amount: amount,
            usdValue: amount * price,
            accountType: 'staking'
          };
        });
      allAssets.push(...staking);
      addSyncLog(`OKX ${t('typeStaking')}: +${staking.length} ${t('tokensTitle')}`);
    }

    // Process additional earnData (Active Orders)
    if (earnData && Array.isArray(earnData)) {
      const activeEarn = earnData
        .filter((d: any) => parseFloat(d.amt || d.investAmt || '0') > 0)
        .map((d: any) => {
          const sym = d.ccy || d.instId?.split('-')[0] || '';
          const amount = parseFloat(d.amt || d.investAmt || '0');
          const price = priceMap[sym] || 0;
          return {
            symbol: sym,
            amount: amount,
            usdValue: amount * price,
            accountType: 'earn'
          };
        });
      allAssets.push(...activeEarn);
      addSyncLog(`OKX ${t('typeEarn')}: +${activeEarn.length} ${t('tokensTitle')}`);
    }

    // Process positions (Equity only)
    if (positionsData && positionsData.length > 0) {
      const positions = positionsData.map((p: any) => ({
        symbol: p.instId.split('-')[0], // e.g. BTC from BTC-USDT-SWAP
        amount: 0, // We treat position as a USD value/equity for simplicity
        usdValue: parseFloat(p.mgnEquity || '0'),
        accountType: 'position',
        namePrefix: `${p.instId} (${p.posSide === 'long' ? 'Long' : 'Short'})`
      })).filter((p: any) => p.usdValue !== 0);
      allAssets.push(...positions);
      addSyncLog(`OKX ${t('typePosition')}: +${positions.length} ${t('tokensTitle')}`);
    }

    setOkxBalances(allAssets);

    // Save as portfolio assets under the crypto portfolio
    const cryptoPortfolio = portfolios.find(p => p.type === 'crypto');
    if (cryptoPortfolio && allAssets.length > 0) {
      const batch = writeBatch(db);

      for (const asset of allAssets) {
        const existing = portfolioAssets.find(pa =>
          pa.portfolioId === cryptoPortfolio.id &&
          pa.symbol === asset.symbol &&
          pa.accountType === asset.accountType &&
          pa.metadata?.namePrefix === asset.namePrefix
        );

        const assetId = existing?.id || crypto.randomUUID();
        // Estimate price if usdValue is 0 but we have symbol
        let pricePerUnit = asset.amount > 0 ? (asset.usdValue / asset.amount) : 0;
        if (pricePerUnit === 0 && asset.symbol === 'USDT') pricePerUnit = 1;

        const typeLabel = {
          trading: t('typeTrading'),
          funding: t('typeFunding'),
          savings: t('typeSavings'),
          staking: t('typeStaking'),
          position: t('typePosition')
        }[asset.accountType] || asset.accountType;

        const hist = assetHistory[asset.symbol];
        const currentPriceFinal = pricePerUnit || priceMap[asset.symbol] || (existing?.currentPrice || 0);

        batch.set(doc(db, `users/${userId}/portfolioAssets/${assetId}`), {
          id: assetId,
          portfolioId: cryptoPortfolio.id,
          name: `OKX ${typeLabel} ${asset.namePrefix ? asset.namePrefix : asset.symbol}`,
          symbol: asset.symbol,
          amount: asset.amount,
          accountType: asset.accountType,
          currentPrice: currentPriceFinal,
          averagePrice: hist?.lastPrice || existing?.averagePrice || currentPriceFinal,
          updatedAt: new Date().toISOString(),
          metadata: {
            source: 'okx',
            lastSync: new Date().toISOString(),
            namePrefix: asset.namePrefix,
            purchaseDate: hist?.lastPurchaseDate || existing?.metadata?.purchaseDate,
            originalAmount: asset.amount,
            originalUsdValue: asset.usdValue,
            lastPurchaseDate: hist?.lastPurchaseDate || existing?.metadata?.lastPurchaseDate || null
          }
        }, { merge: true });
      }

      await batch.commit();
      addSyncLog(t('successOkxSync').replace('{count}', String(allAssets.length)));
    }

    await setDoc(doc(db, `users/${userId}/bankConnections/${conn.id}`), {
      ...conn,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    alert(t('successOkxSync').replace('{count}', String(allAssets.length)));
  } catch (err) {
    console.error('[OKX] Sync error:', err);
    addSyncLog(`ERR: ${err instanceof Error ? err.message : String(err)}`);
    alert(`${t('errSync')} OKX: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    setIsSyncingBank(false);
  }
};

const handleSaveGoal = async () => {
  if (!userId || !goalName) return;
  const gId = editingGoal === 'new' ? crypto.randomUUID() : editingGoal!;
  try {
    await setDoc(doc(db, `users/${userId}/goals/${gId}`), {
      id: gId,
      name: goalName,
      targetAmount: goalTarget,
      deadline: goalDeadline,
      bankAccountId: goalBankAccId,
      color: goalColor,
      createdAt: new Date().toISOString()
    }, { merge: true });
    setEditingGoal(null);
    setGoalName('');
    setGoalTarget(0);
    setGoalDeadline('');
    setGoalBankAccId('');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'goals');
  }
};

const handleDeleteGoal = async (id: string) => {
  if (!userId || !confirm(t('confirmDeleteGoal'))) return;
  try {
    await deleteDoc(doc(db, `users/${userId}/goals/${id}`));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'goals');
  }
};

const handleSaveCushionInternal = async (newData: Partial<Cushion>) => {
  await onSaveCushion(newData);
};

const handleLinkAccount = async (bankAccId: string, appAccId: string, connId: string) => {
  if (!userId || !appAccId) return;
  const acc = accounts.find(a => a.id === appAccId);
  if (!acc) return;

  try {
    await setDoc(doc(db, `users/${userId}/accounts/${appAccId}`), {
      ...acc,
      bankConnectionId: connId,
      bankAccountId: bankAccId
    });
    // Immediately trigger sync after linking
    const conn = bankConnections.find(c => c.id === connId);
    if (conn) handleSyncBank(conn);
    setMonobankClientInfos({});
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'accounts');
  }
};

const syncBankConnection = async (conn: BankConnection, silent = false) => {
  if (!userId || isSyncingBank) return { totalNew: 0 };
  const headers = { 
    ...getCommonHeaders(),
    'X-Token': conn.token 
  };
  try {
    if (!silent) addSyncLog(`Запуск синхронізації для ${conn.name} через Supabase...`);
    await onSyncBank(conn.id);
    return { totalNew: 0 };
  } catch (err) {
    console.error(`[SYNC] Error for ${conn.name}:`, err);
    if (!silent) addSyncLog(`❌ Помилка: ${String(err)}`);
    return { totalNew: 0, error: String(err) };
  }
};

const handleSyncBank = async (conn: BankConnection) => {
  if (!userId || isSyncingBank) return;
  setIsSyncingBank(true);
  const result = await syncBankConnection(conn);
  setIsSyncingBank(false);
  if (!result.error) {
    console.log(t('successHistorySync').replace('{count}', String(result.totalNew)));
  } else {
    console.warn(t('errSync'));
  }
};
const syncBankRecentTransactions = async (conn: BankConnection, silent = true, targetAccountId?: string) => {
  if (!userId) return { totalNew: 0 };
  let totalNew = 0;
  try {
    let linkedAccs = accounts.filter(a => 
      a.bankAccountId && 
      (a.bankConnectionId === conn.id || (bankConnections.length === 1 && a.bankAccountId))
    );
    
    if (targetAccountId) {
      linkedAccs = linkedAccs.filter(a => a.id === targetAccountId);
    }

    if (linkedAccs.length === 0) return { totalNew: 0 };

    const syncedIds = new Set(transactions.map(t => t.bankTxId).filter(Boolean));
    const nowSeconds = Math.floor(Date.now() / 1000);
    const to = nowSeconds;
    const from = to - (7 * 24 * 60 * 60); // Last 7 days

    if (!silent) {
       const scope = targetAccountId ? linkedAccs[0]?.name : conn.name;
       addSyncLog(`Оновлення транзакцій для ${scope}...`);
    }

    for (const appAcc of linkedAccs) {
      // Check cooldown if not forced or if specifically requested
      const lastSync = lastAccountSyncTimes[appAcc.bankAccountId!] || 0;
      if (Date.now() - lastSync < 60000 && !targetAccountId) {
        if (!silent) addSyncLog(`[${appAcc.name}] Нещодавно оновлено, пропускаємо.`);
        continue;
      }

      const url = getMonobankUrl(`/personal/statement/${appAcc.bankAccountId}/${from}/${to}`, conn.token);
      const res = await fetch(url, {
        headers: {
          ...getCommonHeaders(),
          'X-Token': conn.token
        }
      });

      // Always update last sync time to maintain cooldown regardless of success/error (except maybe network error)
      setLastAccountSyncTimes(prev => ({ ...prev, [appAcc.bankAccountId!]: Date.now() }));

      if (res.status === 429) {
        if (!silent) addSyncLog(`⚠️ [${appAcc.name}] Помилка ліміту (429). Спробуйте за хвилину.`);
        return { totalNew, error: 'Rate limit' };
      }
      
      if (!res.ok) {
        if (!silent) addSyncLog(`❌ [${appAcc.name}] Помилка API: ${res.status}`);
        continue;
      }

      const statements = await res.json();
      if (!Array.isArray(statements)) continue;

      const batch = writeBatch(db);
      let count = 0;

      for (const st of statements) {
        if (syncedIds.has(st.id)) continue;

        const newId = crypto.randomUUID();
        const date = new Date(st.time * 1000).toISOString().split('T')[0];
        const time = new Date(st.time * 1000).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        const amount = Math.abs(st.amount / 100);
        let type: BudgetTx['type'] = st.amount > 0 ? 'income' : 'expense';

        const desc = (st.description || '').toLowerCase();
        if (INTERNAL_TRANSFER_PATTERNS.some(p => desc.includes(p))) {
          type = 'transfer';
        }

        const matchedCatId = matchCategory(st.description || '', categories) || null;

        batch.set(doc(db, `users/${userId}/budgetTxs/${newId}`), {
          id: newId,
          type,
          date,
          time,
          amount,
          currency: appAcc.currency,
          accountId: appAcc.id,
          categoryId: matchedCatId,
          description: st.description || '',
          accountName: appAcc.name,
          bankTxId: st.id,
          isAiCategorized: matchedCatId !== null
        });
        syncedIds.add(st.id);
        count++;
        totalNew++;
      }

      if (count > 0) {
        await batch.commit();
        if (!silent) addSyncLog(`✅ [${appAcc.name}] Додано ${count} транзакцій.`);
      } else {
        if (!silent) addSyncLog(`ℹ️ [${appAcc.name}] Нових операцій не знайдено.`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return { totalNew };
  } catch (err) {
    console.error(`[RECENT SYNC] Error for ${conn.name}:`, err);
    return { totalNew, error: String(err) };
  }
};


const handleSyncAllBanks = async (silent = false, force = false, targetAccountId?: string) => {
  if (!userId || isSyncingBank || (silent && isBackgroundSyncing)) return;
  if (silent && !force && Date.now() - lastFullSyncTimestamp < 2 * 60 * 1000) return;

  if (silent) setIsBackgroundSyncing(true);
  else setIsSyncingBank(true);

  if (!silent) {
    if (!targetAccountId) setSyncStatus([]);
    const title = targetAccountId ? `Оновлення рахунку...` : `Розпочато повне оновлення через Supabase Edge Functions...`;
    addSyncLog(title);
  }

  try {
    const monobankConns = bankConnections.filter(c => c.type === 'monobank');
    for (const conn of monobankConns) {
      // Check if this connection has the target account
      const hasTarget = !targetAccountId || accounts.some(a => a.id === targetAccountId && (a.bankConnectionId === conn.id || (!a.bankConnectionId && monobankConns.length === 1)));
      
      if (!hasTarget) continue;

      await onSyncBank(conn.id);
      // Wait for balance update to reflect in UI then fetch recent txs
      await syncBankRecentTransactions(conn, silent, targetAccountId);
    }
    if (!targetAccountId) setLastFullSyncTimestamp(Date.now());
    setLastSyncTime(new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    if (!silent) addSyncLog('Синхронізацію завершено! ✅');
  } catch (err) {
    console.error('[SYNC ALL] Error:', err);
    if (!silent) addSyncLog(`❌ Помилка: ${String(err)}`);
  } finally {
    if (silent) setIsBackgroundSyncing(false);
    else setIsSyncingBank(false);
  }
};

// Periodic Sync
useEffect(() => {
  if (userId && bankConnections.some(c => c.type === 'monobank')) {
    // Ми відмовилися від подвійного агресивного виклику при старті
    // Дані завантажуються миттєво з кешу localStorage

    const interval = setInterval(() => {
      handleSyncAllBanks(true, false);
    }, 5 * 60 * 1000); // Кожні 5 хвилин

    let triggerTimeout: NodeJS.Timeout | null = null;
    const handleTrigger = () => {
      if (document.visibilityState === 'visible') {
        if (triggerTimeout) clearTimeout(triggerTimeout);
        triggerTimeout = setTimeout(() => {
          handleSyncAllBanks(true, false);
        }, 2000);
      }
    };

    document.addEventListener('visibilitychange', handleTrigger);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleTrigger);
      if (triggerTimeout) clearTimeout(triggerTimeout);
    };
  }
}, [userId, bankConnections.length]);

useEffect(() => {
  if (activeTab === 'dashboard' || activeTab === 'accounts') {
    handleSyncAllBanks(true, false);
  }
}, [activeTab]);

const syncBankHistoryInternal = async (conn: BankConnection, months = 6, silent = false) => {
  if (!userId) return { totalNew: 0 };
  let totalNewForConn = 0;
  const unlinkedBankAccs = new Set<string>();
  try {
    // 1. Get info via Supabase proxy
    const resInfo = await fetch(getMonobankUrl('/personal/client-info', conn.token), {
      headers: getCommonHeaders()
    });

    if (resInfo.ok) {
      const info = await resInfo.json();
      const allBankAccs = [
        ...info.accounts.map((a: any) => ({ id: a.id, name: `${a.type} (${a.currencyCode})` })),
        ...(info.jars || []).map((j: any) => ({ id: j.id, name: `Банка: ${j.title}` }))
      ];
      allBankAccs.forEach(ba => {
        if (!accounts.some(a => a.bankAccountId === ba.id)) {
          unlinkedBankAccs.add(ba.name);
        }
      });
    }

    const allMonoConns = bankConnections.filter(c => c.type === 'monobank');
    const isOnlyMono = allMonoConns.length === 1 && conn.type === 'monobank';
    const linkedAccs = accounts.filter(a => a.bankAccountId && (
      a.bankConnectionId === conn.id || 
      (isOnlyMono && !a.bankConnectionId)
    ));
    if (linkedAccs.length === 0) return { totalNew: 0 };

    const syncedIds = new Set(transactions.map(t => t.bankTxId).filter(Boolean));
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (!silent) addSyncLog(`Розпочато глибоку синхронізацію для ${conn.name} (${months} міс.)...`);

    for (let i = 0; i < months; i++) {
      const to = nowSeconds - (i * 30 * 24 * 60 * 60);
      const from = to - (31 * 24 * 60 * 60);

      if (!silent) addSyncLog(`Крок ${i + 1}/${months} (${conn.name})`);

      for (const appAcc of linkedAccs) {
        const url = getMonobankUrl(`/personal/statement/${appAcc.bankAccountId}/${from}/${to}`, conn.token);
        const res = await fetch(url, {
          headers: {
            ...getCommonHeaders(),
            'X-Token': conn.token
          }
        });

        if (res.status === 429) {
          if (!silent) addSyncLog(`⚠️ Rate Limit для ${appAcc.name}. Спробуйте пізніше.`);
          return { totalNew: totalNewForConn, error: 'Rate limit' };
        }
        if (!res.ok) continue;

        const statements = await res.json();
        if (!Array.isArray(statements)) continue;

        const batch = writeBatch(db);
        let count = 0;

        for (const st of statements) {
          if (syncedIds.has(st.id)) continue;

          const newId = crypto.randomUUID();
          const date = new Date(st.time * 1000).toISOString().split('T')[0];
          const time = new Date(st.time * 1000).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
          const amount = Math.abs(st.amount / 100);
          let type: BudgetTx['type'] = st.amount > 0 ? 'income' : 'expense';

          const desc = (st.description || '').toLowerCase();
          if (INTERNAL_TRANSFER_PATTERNS.some(p => desc.includes(p))) {
            type = 'transfer';
          }

          const matchedCatId = matchCategory(st.description || '', categories) || null;

          batch.set(doc(db, `users/${userId}/budgetTxs/${newId}`), {
            id: newId,
            type,
            date,
            time,
            amount,
            currency: appAcc.currency,
            accountId: appAcc.id,
            categoryId: matchedCatId,
            description: st.description || '',
            accountName: appAcc.name,
            bankTxId: st.id,
            isAiCategorized: matchedCatId !== ''
          });
          syncedIds.add(st.id);
          count++;
          totalNewForConn++;
        }
        if (count > 0) {
          addSyncLog(`⏳ Збереження ${count} транзакцій (Крок ${i + 1})...`);
          await batch.commit();
        } else {
          addSyncLog(`ℹ️ Нових транзакцій на цьому кроці не знайдено.`);
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return { totalNew: totalNewForConn };
  } catch (err) {
    console.error(`[HISTORY] Error for ${conn.name}:`, err);
    return { totalNew: totalNewForConn, error: String(err) };
  }
};

const handleSyncBankHistory = async (conn: BankConnection, months = 6) => {
  if (!userId || isSyncingBank) return;
  const label = months === 24 ? `2 ${t('yearsPlural').toUpperCase()}` : `${months} ${t('monthTitle').toUpperCase()}`;
  if (!confirm(t('confirmHistorySync').replace('{label}', label))) return;

  setIsSyncingBank(true);
  setSyncStatus([]);
  const result = await syncBankHistoryInternal(conn, months);
  setIsSyncingBank(false);

  if (!result.error) {
    // console.log(t('successHistorySync').replace('{count}', String(result.totalNew)));
  } else if (result.error !== 'Rate limit') {
    // console.error('Помилка глибокої синхронізації.');
  }
};

const handleSyncAllHistory = async (months = 6) => {
  if (!userId || isSyncingBank) return;
  const label = `${months} МІСЯЦІВ`;
  if (!confirm(t('confirmAllHistorySync').replace('{label}', label))) return;

  setIsSyncingBank(true);
  setSyncStatus([]);
  addSyncLog(`${t('allSyncStarted')} (${label})...`);

  try {
    const monobankConns = bankConnections.filter(c => c.type === 'monobank');
    let totalNewOverall = 0;

    for (const conn of monobankConns) {
      const result = await syncBankHistoryInternal(conn, months, true);
      totalNewOverall += result.totalNew;
      if (result.error === 'Rate limit') break;
      if (monobankConns.indexOf(conn) < monobankConns.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    // Silenced alert(`Глибоку синхронізацію завершено! Додано разом ${totalNewOverall} транзакцій.`);
  } catch (err) {
    console.error('[HISTORY ALL] Error:', err);
    addSyncLog(`❌ ПОМИЛКА ІСТОРІЇ: ${String(err)}`);
    // console.error('Під час завантаження історії виникла помилка.');
  } finally {
    setIsSyncingBank(false);
  }
};

// One-time reclassification of existing Monobank transactions
const repairTransactions = async () => {
  if (!userId || isSyncingBank) return;
  setIsSyncingBank(true);
  // Silent background repair

  try {
    const toUpdate: BudgetTx[] = [];
    const INCOMING_KEYWORDS = ['від:', 'поповнення', 'зарахування', 'з картки', 'з рахунку', 'з чорної', 'з білої', 'income', 'зі своєї картки', 'власної картки', 'зняття з «'];
    const OUTGOING_KEYWORDS = ['оплата', 'переказ на', 'на картку', 'купівля', 'на рахунок', 'expense', 'на свою карту', 'власну карту', 'поповнення «'];

    for (const tx of transactions) {
      if (!tx.bankTxId) continue;

      const desc = (tx.description || '').toLowerCase();
      let changed = false;
      let newIsIncoming = tx.isIncoming;
      let newType = tx.type;

      // 1. Infer direction if missing
      if (newIsIncoming === undefined) {
        if (INCOMING_KEYWORDS.some(k => desc.includes(k))) newIsIncoming = true;
        else if (OUTGOING_KEYWORDS.some(k => desc.includes(k))) newIsIncoming = false;
        else if (tx.type === 'adjustment') newIsIncoming = tx.amount >= 0;
        else newIsIncoming = tx.type === 'income'; // Fallback
        changed = true;
      }

      // 2. Fix Over-matched Transfers with expanded logic
      const matchesPattern = INTERNAL_TRANSFER_PATTERNS.some(p => desc.includes(p));
      const matchesAccountName = (accounts || []).some(acc => acc.id !== tx.accountId && desc.includes(acc.name.toLowerCase()));
      const isTransferMcc = tx.mcc === 4829 || tx.mcc === 6011;

      const matchesTransfer = matchesPattern || matchesAccountName || isTransferMcc;

      if (tx.type === 'transfer' && !matchesTransfer) {
        newType = newIsIncoming ? 'income' : 'expense';
        changed = true;
      } else if (tx.type !== 'transfer' && matchesTransfer) {
        newType = 'transfer';
        changed = true;
      }

      if (changed) {
        toUpdate.push({ ...tx, type: newType, isIncoming: newIsIncoming });
      }
    }

    if (toUpdate.length > 0) {
      // Silent background repair log
      for (let i = 0; i < toUpdate.length; i += 400) {
        const chunk = toUpdate.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const tx of chunk) {
          batch.set(doc(db, `users/${userId}/budgetTxs/${tx.id}`), tx);
        }
        await batch.commit();
      }
      // Silenced alert(t('msgRepairFinished').replace('{count}', String(toUpdate.length)));
    } else {
      // Silenced alert(t('msgNoRepairNeeded'));
    }
  } catch (err) {
    addSyncLog(`ERR: ${String(err)}`);
  } finally {
    setIsSyncingBank(false);
  }
};

// Auto-run reclassification once when transactions are loaded
const reclassifyRanRef = useRef(false);
useEffect(() => {
  if (transactions.length > 0 && userId && !reclassifyRanRef.current) {
    reclassifyRanRef.current = true;
    repairTransactions();
  }
}, [transactions, userId]);


// Analytics Filter
const [analyticsAccountId, setAnalyticsAccountId] = useState<string>('all');

const analyticsYear = useMemo(() => selectedYear.toString(), [selectedYear]);
const analyticsMonth = useMemo(() => viewMode === 'year' ? 'all' : selectedMonth, [viewMode, selectedMonth]);
const [lastAccountSyncTimes, setLastAccountSyncTimes] = useState<Record<string, number>>(() => {
  try {
    const saved = localStorage.getItem('lastAccountSyncTimes');
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
});

// Sync timestamps persistence
useEffect(() => {
  localStorage.setItem('lastAccountSyncTimes', JSON.stringify(lastAccountSyncTimes));
}, [lastAccountSyncTimes]);
// Persist UI state
useEffect(() => { localStorage.setItem('budgetActiveTab', activeTab); }, [activeTab]);
useEffect(() => { localStorage.setItem('budgetSelectedMonth', selectedMonth); }, [selectedMonth]);
useEffect(() => { localStorage.setItem('budgetSelectedYear', selectedYear.toString()); }, [selectedYear]);
useEffect(() => {
  if (editingMonth) localStorage.setItem('budgetEditingMonth', editingMonth);
  else localStorage.removeItem('budgetEditingMonth');
}, [editingMonth]);

const availableYears = useMemo(() => {
  const years = new Set(transactions.map(tx => tx.date.slice(0, 4)));
  return Array.from(years).sort().reverse();
}, [transactions]);

// Derived Data
const totalBalance = useMemo(() => (accounts || []).reduce((sum, acc) => sum + (acc.balance - (acc.creditLimit || 0)), 0), [accounts]);
const totalUsedCredit = useMemo(() => (accounts || []).reduce((sum, acc) => sum + Math.max(0, (acc.creditLimit || 0) - acc.balance), 0), [accounts]);

const blackCardAcc = useMemo(() => {
  return accounts.find(a => a.name.toLowerCase().includes('чорна') || a.name.toLowerCase().includes('кредитка'));
}, [accounts]);

const debtStats = useMemo(() => {
  if (!blackCardAcc) return null;
  const limit = blackCardAcc.creditLimit || 0;
  const balance = blackCardAcc.balance;
  const used = Math.max(0, limit - balance);
  const diffTime = (new Date(debtTargetDate).getTime() - new Date().getTime());
  const monthsUntilTarget = Math.max(1, diffTime / (1000 * 60 * 60 * 24 * 30.44));
  const monthlyPayment = used / monthsUntilTarget;

  return {
    limit,
    balance,
    used,
    monthlyPayment,
    monthsRemaining: Math.ceil(monthsUntilTarget)
  };
}, [blackCardAcc, debtTargetDate]);

const blackCardDebt = debtStats?.used || 0;

const totalManualDebt = useMemo(() => (debts || []).reduce((sum, d) => sum + d.amount, 0), [debts]);
const totalRepaymentMonthly = useMemo(() => {
  const mono = debtStats?.monthlyPayment || 0;
  const manual = (debts || []).reduce((sum, d) => sum + d.monthlyPayment, 0);
  return mono + manual;
}, [debtStats, debts]);

const totalOverallDebt = useMemo(() => {
  const manualDebts = (debts || []).reduce((sum, d) => sum + d.amount, 0);
  
  // Calculate used credit and ignore accounts marked as investment
  // Most banks return balance as (own funds + credit limit). 
  // If balance < creditLimit, then some credit is used.
  const usedCreditLimit = accounts.reduce((sum, a) => {
    if (a.isInvestment) return sum; // Ignore investment accounts in debt calculation
    
    const creditPos = a.creditLimit || 0;
    if (creditPos <= 0) return sum; // No credit limit - no credit usage
    
    // If balance is less than credit limit, it's a debt
    const used = Math.max(0, creditPos - a.balance);
    return sum + used;
  }, 0);
  
  return manualDebts + usedCreditLimit;
}, [debts, accounts]);





const PILLAR_METADATA: Record<string, any> = {
  income: { label: t('pillarIncome'), icon: TrendingUp, color: 'text-indigo-600', ringColor: 'ring-indigo-500', hoverBg: 'bg-indigo-500/5', btnBg: 'bg-indigo-600' },
  expense: { label: t('pillarExpense'), icon: TrendingDown, color: 'text-rose-600', ringColor: 'ring-rose-500', hoverBg: 'bg-rose-500/5', btnBg: 'bg-rose-600' },
  cushion: { label: t('pillarCushion'), icon: ShieldCheck, color: 'text-amber-600', ringColor: 'ring-amber-500', hoverBg: 'bg-amber-500/5', btnBg: 'bg-amber-600' },
  investment: { label: t('pillarInvestment'), icon: Gem, color: 'text-emerald-600', ringColor: 'ring-emerald-500', hoverBg: 'bg-emerald-500/5', btnBg: 'bg-emerald-600' },
  debt: { label: t('pillarDebt'), icon: Landmark, color: 'text-orange-600', ringColor: 'ring-orange-500', hoverBg: 'bg-orange-500/5', btnBg: 'bg-orange-600' },
  default: { label: t('pillarBlock'), icon: Plus, color: 'text-zinc-600', ringColor: 'ring-zinc-500', hoverBg: 'bg-zinc-500/5', btnBg: 'bg-zinc-600' }
};

const getPillarMeta = (type: string) => PILLAR_METADATA[type] || { ...PILLAR_METADATA.default, label: type.charAt(0).toUpperCase() + type.slice(1) };

const [targetPercents, setTargetPercents] = useState<Record<string, number>>(budgetProportions || { expense: 50, cushion: 15, investment: 25, debt: 10 });

useEffect(() => {
  if (Object.keys(budgetProportions || {}).length > 0) {
    setTargetPercents(budgetProportions);
  }
}, [budgetProportions]);
const [showAddPillar, setShowAddPillar] = useState(false);
const [newPillarName, setNewPillarName] = useState('');

const handleAddPillar = async () => {
  if (!newPillarName) return;
  const key = newPillarName.toLowerCase();
  setTargetPercents(prev => ({ ...prev, [key]: 10 }));
  setNewPillarName('');
  setShowAddPillar(false);
};

const ensureCategoryInPlan = async (categoryId: string, month: string) => {
  if (!userId || !categoryId || !month) return;
  try {
    const planRef = doc(db, `users/${userId}/monthlyPlans/${month}`);
    const s = await getDoc(planRef);
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
};

const pillarStats = useMemo(() => {
  const pillars: Record<string, { fact: number, plan: number, factToday?: number, interest?: number }> = {
    income: { fact: 0, plan: 0 }
  };

  // Initialize all pillars from targetPercents
  Object.keys(targetPercents).forEach(key => {
    pillars[key] = { fact: 0, plan: 0 };
  });

  const isPlanningTab = activeTab === 'planning';
  const monthStr = editingMonth || selectedMonth;
  const monthTxs = (transactions || []).filter(t => t.date.startsWith(monthStr));
  const monthlyPlan = (monthlyPlans || []).find(mp => mp.id === monthStr);

  categories.forEach(cat => {
    let type = cat.type === 'goal' ? 'cushion' : cat.type;

    if (pillars[type]) {
      pillars[type].fact += monthTxs.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
      const p = monthlyPlan?.plans?.[cat.id] ?? cat.planned;
      pillars[type].plan += (typeof p === 'number' ? p : 0);
    }
  });

  const liquidAccountsTotal = (accounts || []).filter(a => !a.isInvestment).reduce((sum, a) => sum + (a.balance - (a.creditLimit || 0)), 0);
  if (pillars.income) pillars.income.factToday = liquidAccountsTotal;
  if (pillars.expense) pillars.expense.factToday = liquidAccountsTotal;

  // Calculate Cushion Interest
  if (pillars.cushion) {
    pillars.cushion.interest = categories
      .filter(c => c.type === 'cushion')
      .reduce((sum, c) => {
        const factValue = monthTxs.filter(t => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0);
        return sum + (factValue * (c.interestRate || 0) / 100 / 12);
      }, 0);
  }

  return pillars as any;
}, [selectedMonth, selectedYear, activeTab, editingMonth, transactions, categories, monthlyPlans, targetPercents, accounts]);

const yearlyPlanningStats = useMemo(() => {
  const year = selectedYear.toString();
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  
  return months.map(m => {
    const monthStr = `${year}-${m}`;
    const monthTxs = (transactions || []).filter(t => t.date.startsWith(monthStr));
    const monthlyPlan = (monthlyPlans || []).find(mp => mp.id === monthStr);
    
    let totalPlan = 0;
    let totalFact = 0;
    
    categories.forEach(cat => {
      if (cat.type === 'expense' || cat.type === 'investment' || cat.type === 'goal' || cat.type === 'cushion' || cat.type === 'debt') {
        const p = monthlyPlan?.plans?.[cat.id] ?? cat.planned;
        totalPlan += (typeof p === 'number' ? p : 0);
        totalFact += monthTxs.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
      }
    });
    
    return {
      month: m,
      monthName: getLocalizedMonths(language)[parseInt(m) - 1],
      plan: totalPlan,
      fact: totalFact
    };
  });
}, [selectedYear, transactions, categories, monthlyPlans, language]);


const investmentGap = useMemo(() => {
  const stats = pillarStats.investment || { plan: 0, fact: 0 };
  return Math.max(0, stats.plan - stats.fact);
}, [pillarStats]);


useEffect(() => {
  if (budgetProportions && Object.keys(budgetProportions).length > 0) {
    setTargetPercents(budgetProportions);
  }
}, [budgetProportions]);

const handlePercentageChange = (pillar: string, val: number) => {
  setTargetPercents(prev => ({ ...prev, [pillar]: Math.min(100, Math.max(0, val)) }));
};

const handlePillarPercentChange = async (pillar: 'expense' | 'investment' | 'cushion' | 'debt', newPercent: number) => {
  if (!userId) return;

  // Clamp values between 0 and 100
  const val = Math.min(100, Math.max(0, newPercent));
  const nextPercents = { ...targetPercents, [pillar]: val };

  // Update local state immediately for instant UI feedback
  setTargetPercents(nextPercents);
  setBudgetProportions(nextPercents); // Keep App state in sync

  const totalIncomePlan = pillarStats.income.plan;
  const batch = writeBatch(db);

  try {
    // 1. Save to profiles
    batch.set(doc(db, `users/${userId}`), {
      budgetProportions: nextPercents
    }, { merge: true });

    if (totalIncomePlan > 0) {
      const targetPillarTotal = Math.round((val / 100) * totalIncomePlan);

      const pillarCategories = categories.filter(c => {
        if (pillar === 'expense') return c.type === 'expense';
        if (pillar === 'investment') return c.type === 'investment';
        if (pillar === 'cushion') return c.type === 'cushion' || c.type === 'goal';
        return false;
      });

      if (pillarCategories.length > 0) {
        const currentPillarTotal = pillarCategories.reduce((sum, cat) => sum + (cat.planned || 0), 0);
        const monthStr = editingMonth || selectedMonth;
        const monthPlan = monthlyPlans.find(mp => mp.id === monthStr);
        const newMonthPlans = { ...(monthPlan?.plans || {}) };
        let changed = false;

        for (const cat of pillarCategories) {
          let newPlanned = 0;
          const currentCatPlanned = monthPlan?.plans[cat.id] ?? cat.planned;

          if (currentPillarTotal > 0) {
            const ratio = currentCatPlanned / currentPillarTotal;
            newPlanned = Math.round(targetPillarTotal * ratio);
          } else {
            newPlanned = Math.round(targetPillarTotal / pillarCategories.length);
          }

          if (newPlanned !== currentCatPlanned) {
            batch.set(doc(db, `users/${userId}/categories/${cat.id}`), { ...cat, planned: newPlanned });
            newMonthPlans[cat.id] = newPlanned;
            changed = true;
          }
        }

        if (changed && userId) {
          batch.set(doc(db, `users/${userId}/monthlyPlans/${monthStr}`), {
            id: monthStr,
            plans: newMonthPlans,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
};

  const [searchTerm, setSearchTerm] = useState('');

  const currentPeriodTxs = useMemo(() => {
    if (viewMode === 'year') {
      const year = selectedMonth.split('-')[0];
      return (transactions || []).filter(tx => tx.date.startsWith(year));
    }
    return (transactions || []).filter(tx => tx.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth, viewMode]);

  const filteredTxs = useMemo(() => {
    if (!searchTerm) return currentPeriodTxs;
    const s = searchTerm.toLowerCase();
    return (currentPeriodTxs || []).filter(tx => 
      tx.description?.toLowerCase().includes(s) || 
      tx.note?.toLowerCase().includes(s) ||
      tx.accountName?.toLowerCase().includes(s) ||
      categories.find(c => c.id === tx.categoryId)?.name.toLowerCase().includes(s)
    );
  }, [currentPeriodTxs, searchTerm, categories]);

const stats = useMemo(() => {
  let income = 0;
  let expense = 0;
  let invested = 0;
  let cushion = 0;
  let goal = 0;
  currentPeriodTxs.forEach(tx => {
    if (tx.type === 'income') income += tx.amount;
    if (tx.type === 'expense') expense += tx.amount;
    if (tx.type === 'investment') invested += tx.amount;
    if (tx.type === 'cushion') cushion += tx.amount;
    if (tx.type === 'goal') goal += tx.amount;
    if (tx.type === 'adjustment') {
      if (tx.amount > 0) income += tx.amount;
      else if (tx.amount < 0) expense += Math.abs(tx.amount);
    }
  });
  return { income, expense, invested, cushion, goal };
}, [currentPeriodTxs]);

const analyticsStats = useMemo(() => {
  let totalIncome = 0;
  let totalExpense = 0;
  let totalInvested = 0;
  let totalCushion = 0;
  let totalGoal = 0;

  const categorySpending: Record<string, number> = {};
  const monthlyData: Record<string, { income: number, expense: number, invested: number, cushion: number, goal: number }> = {};
  let totalTransfers = 0;
  const heatmapData: Record<number, Record<number, number>> = {};
  for (let d = 0; d < 7; d++) {
    heatmapData[d] = {};
    for (let h = 0; h < 24; h++) heatmapData[d][h] = 0;
  }

  (transactions || []).forEach(tx => {
    const txYear = tx.date.slice(0, 4);
    const txMonth = tx.date.slice(5, 7);

    if (analyticsYear !== 'all' && txYear !== analyticsYear) return;
    if (analyticsMonth !== 'all' && tx.date.slice(0, 7) !== analyticsMonth) return;
    if (analyticsAccountId !== 'all' && tx.accountId !== analyticsAccountId) return;

    const month = tx.date.slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expense: 0, invested: 0, cushion: 0, goal: 0 };
    }

    if (tx.type === 'income') {
      totalIncome += tx.amount;
      monthlyData[month].income += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
      monthlyData[month].expense += tx.amount;
    } else if (tx.type === 'investment' || tx.type === 'invest') {
      totalInvested += tx.amount;
      monthlyData[month].invested += tx.amount;
    } else if (tx.type === 'cushion') {
      totalCushion += tx.amount;
      monthlyData[month].cushion += tx.amount;
    } else if (tx.type === 'goal') {
      totalGoal += tx.amount;
      monthlyData[month].goal += tx.amount;
    } else if (tx.type === 'adjustment') {
      if (tx.amount > 0) {
        totalIncome += tx.amount;
        monthlyData[month].income += tx.amount;
      } else if (tx.amount < 0) {
        const absAmount = Math.abs(tx.amount);
        totalExpense += absAmount;
        monthlyData[month].expense += absAmount;
      }
    }

    if (tx.type === 'transfer') {
      totalTransfers += tx.amount;
    }

    if (tx.type === 'expense' || (tx.type === 'adjustment' && tx.amount < 0)) {
      const catId = tx.categoryId || 'uncategorized';
      if (!categorySpending[catId]) categorySpending[catId] = 0;
      categorySpending[catId] += Math.abs(tx.amount);
    }

    // Heatmap logic - only for expenses
    if (tx.type === 'expense' || (tx.type === 'adjustment' && tx.amount < 0)) {
      const dateObj = new Date(tx.date);
      const dayOfWeek = dateObj.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0, Sun=6

      let hour = 12;
      if (tx.time) {
        const h = parseInt(tx.time.split(':')[0]);
        if (!isNaN(h)) hour = h;
      }
      heatmapData[adjustedDay][hour] += Math.abs(tx.amount);
    }
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  const monthsCount = Math.max(1, sortedMonths.length);
  const avgMonthlyExpense = totalExpense / monthsCount;
  const avgMonthlyIncome = totalIncome / monthsCount;
  const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpense;
  const currentNW = totalBalance + (assets || []).reduce((s, a) => s + a.value, 0);

  let heatmapMax = 0;
  Object.values(heatmapData).forEach(hours => {
    Object.values(hours).forEach(val => {
      if (val > heatmapMax) heatmapMax = val;
    });
  });

  return {
    totalIncome, totalExpense, totalInvested, totalCushion, totalGoal,
    monthlyData, sortedMonths, heatmapData, heatmapMax,
    avgMonthlyExpense, avgMonthlyIncome, avgMonthlySavings, currentNW,
    totalTransfers, categorySpending
  };
}, [transactions, analyticsYear, analyticsMonth, analyticsAccountId, totalBalance, categories, assets]);

const cushionTotal = useMemo(() => {
  // Sum only from factual asset amounts as requested
  return (cushionAssets || []).reduce((s, a) => s + (a.amount || 0), 0);
}, [cushionAssets]);

const goalsTotalBalance = useMemo(() => {
  return (goals || []).reduce((sum, g) => {
    if (g.bankAccountId) {
      const jar = Object.values(monobankClientInfos || {}).flatMap((info: any) => info?.jars || [])
        .find((j: any) => j.id === g.bankAccountId);
      if (jar) return sum + (jar.balance / 100);
      
      const acc = accounts.find(a => a.bankAccountId === g.bankAccountId || a.id === g.bankAccountId);
      if (acc) return sum + acc.balance;
    }
    return sum + (g.currentAmount || 0);
  }, 0);
}, [goals, monobankClientInfos, accounts]);

const aiDebtAdvice = useMemo(() => {
  if (totalOverallDebt === 0) return t('aiDebtAdviceNone');
  if (totalRepaymentMonthly > (totalBalance * 0.4)) return t('aiDebtAdviceHigh');
  if (debts.length > 3) return t('aiDebtAdviceMany');
  return t('aiDebtAdviceOk');
}, [totalOverallDebt, totalRepaymentMonthly, debts, totalBalance, t]);

const aiBudgetInsight = useMemo(() => {
  const investPercent = targetPercents.investment || 0;
  const expensePercent = targetPercents.expense || 0;
  
  if (investPercent > 30) return "Чудова стратегія для швидкого зростання капіталу! 🚀 ";
  if (expensePercent > 60) return "Увага: ваші планові витрати перевищують 60% доходу. Можливо, варто переглянути необов'язкові категорії? ⚠️ ";
  if (targetPercents.cushion < 10 && (cushionTotal || 0) < totalBalance * 3) return "Пріоритет: ваша подушка безпеки зараз менша за цільовий рівень. Рекомендуємо збільшити відсоток у Pillar Cushion. 🛡️ ";
  return "Ваш план виглядає збалансованим та реалістичним. Продовжуйте в тому ж дусі! ✅ ";
}, [targetPercents, cushionTotal, totalBalance]);

const aiDebtProjection = useMemo(() => {
  if (totalOverallDebt <= 0) return "";
  const monthsToPayoff = totalOverallDebt / (totalRepaymentMonthly || 1);
  return `При поточному плані ви повністю закриєте всі борги за ${Math.ceil(monthsToPayoff)} місяців. 📉 `;
}, [totalOverallDebt, totalRepaymentMonthly]);

const expenseBalance = useMemo(() => {
  return (accounts || []).filter(a => {
    const name = a.name.toLowerCase();
    const isCushion = cushion?.linkedAccountIds?.includes(a.id);
    const isGoal = goals?.some(g => g.bankAccountId === a.id || g.bankAccountId === a.bankAccountId);
    if (isCushion || isGoal) return false;
    return name.includes('біла') || name.includes('white') || name.includes('готівк') || name.includes('cash');
  }).reduce((sum, a) => sum + (a.balance - (a.creditLimit || 0)), 0);
}, [accounts, cushion, goals]);

// Monobank Auto-Sync (2 minutes to respect API limits)
useEffect(() => {
  if (!userId || bankConnections.length === 0) return;

  console.log('[MONO] Starting 120s auto-sync interval');
  const interval = setInterval(() => {
    handleSyncAllBanks(true);
  }, 120000);

  return () => clearInterval(interval);
}, [userId, bankConnections]);

const cushionLevelData = useMemo(() => {
  const expense = analyticsStats.avgMonthlyExpense > 0 ? analyticsStats.avgMonthlyExpense : 10000; // fallback if no expenses
  
  // Calculate yield from manual assets
  const assetsToUse = cushionAssets || [];
  
  // Inflation rates based on currency (2026 projections/estimations)
  const inflations: Record<string, number> = {
    'UAH': 8.5,
    'USD': 3.1,
    'EUR': 2.8,
    'PLN': 4.2,
    'GBP': 3.0
  };
  const currentInflation = inflations[globalCurrency] || 0;

  const totalYieldMonthly = assetsToUse.reduce((sum, asset) => {
    return sum + (asset.amount * (asset.interestRate / 100) / 12);
  }, 0);

  const allocatedAmount = assetsToUse.reduce((sum, asset) => sum + asset.amount, 0);
  const totalTargetAmount = assetsToUse.reduce((sum, asset) => sum + (asset.targetAmount || 0), 0);
  const unallocatedAmount = 0; // Not applicable anymore as it's fully manual

  // Survival calculation: how many months expenses are covered?
  // If yield >= expense, it's effectively infinite for this level of spending
  const netBurn = Math.max(0.01, expense - totalYieldMonthly);
  const months = cushionTotal / netBurn;

  let level = 0;
  let title = t('levelTitle0');
  let icon = Shield;
  let color = "text-zinc-500";
  let bg = "bg-zinc-500";
  let nextGoal = expense * 1;
  let nextLabel = t('levelMonth1');

  if (months >= 12) {
    level = 4;
    title = t('levelTitle4');
    icon = Crown;
    color = "text-indigo-500";
    bg = "bg-indigo-500";
    nextGoal = cushionTotal;
    nextLabel = t('levelMax');
  } else if (months >= 6) {
    level = 3;
    title = t('levelTitle3Gold');
    icon = Star;
    color = "text-yellow-500";
    bg = "bg-yellow-500";
    nextGoal = expense * 12;
    nextLabel = t('levelMonth12');
  } else if (months >= 3) {
    level = 3;
    title = t('levelTitle3');
    icon = ShieldCheck;
    color = "text-slate-400";
    bg = "bg-slate-400";
    nextGoal = expense * 6;
    nextLabel = t('levelMonth6');
  } else if (months >= 2) {
    level = 2;
    title = t('levelTitle2');
    icon = Shield;
    color = "text-zinc-400";
    bg = "bg-zinc-400";
    nextGoal = expense * 3;
    nextLabel = t('levelMonth3');
  } else if (months >= 1) {
    level = 1;
    title = t('levelTitle1');
    icon = Shield;
    color = "text-amber-600";
    bg = "bg-amber-600";
    nextGoal = expense * 2;
    nextLabel = t('levelMonth2');
  }

  const progressToNext = nextGoal > 0 ? Math.min(100, (cushionTotal / nextGoal) * 100) : 100;
  const isMax = level === 4;

  return { 
    level, title, icon, color, bg, nextGoal, nextLabel, 
    progressToNext, monthsSurviving: months, currentExpense: expense, 
    isMax, totalYieldMonthly, allocatedAmount, unallocatedAmount,
    totalTargetAmount,
    yieldPercentage: cushionTotal > 0 ? (totalYieldMonthly * 12 / cushionTotal) * 100 : 0,
    inflationRate: currentInflation,
    realYieldPercentage: (cushionTotal > 0 ? (totalYieldMonthly * 12 / cushionTotal) * 100 : 0) - currentInflation
  };
}, [cushionTotal, analyticsStats.avgMonthlyExpense, cushionAssets, globalCurrency]);

const handleAddTx = async () => {
  if (!showTxForm || !userId) return;
  if (showTxForm !== 'adjustment' && txAmount <= 0) {
    console.warn(t('errAmountPositive'));
    return;
  }

  const finalAccountId = txAccountId ||
    accounts.find(a => a.name.toLowerCase().includes('готівка') || a.name.toLowerCase().includes('cash'))?.id ||
    (accounts.length > 0 ? accounts[0].id : '');

  const finalToAccountId = txToAccountId ||
    accounts.find(a => a.isInvestment)?.id ||
    (accounts.length > 1 ? accounts[1].id : (accounts.length > 0 ? accounts[0].id : ''));

  if (!finalAccountId) {
    alert(t('errSelectAccount'));
    return;
  }

  const fromAcc = accounts.find(a => a.id === finalAccountId);
  const toAcc = accounts.find(a => a.id === finalToAccountId);

  let diff = txAmount;
  if (showTxForm === 'adjustment' && fromAcc) {
    diff = txAmount - fromAcc.balance;
  }

  const newTx: Partial<BudgetTx> = {
    id: crypto.randomUUID(),
    type: showTxForm as any,
    amount: Number(showTxForm === 'adjustment' ? diff : txAmount) || 0,
    currency: 'UAH',
    accountId: finalAccountId,
    date: txDate,
    time: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
    note: txNote || '',
    isIncoming: showTxForm === 'adjustment' ? diff >= 0 : (showTxForm === 'income')
  };

  if (showTxForm === 'transfer' || showTxForm === 'investment') newTx.toAccountId = finalToAccountId;
  if (['income', 'expense', 'cushion', 'investment', 'goal'].includes(showTxForm)) {
    if (showTxForm === 'cushion' || showTxForm === 'goal') {
      if (showTxForm === 'cushion' && (!txCushionAssetId || cushionAssets.length === 0)) {
        alert(t('errCreateCushionFirst'));
        return;
      }
      if (showTxForm === 'goal' && (!txGoalId || goals.length === 0)) {
        alert(t('errCreateGoalFirst'));
        return;
      }
      
      // Set IDs and descriptions for better visibility
      if (showTxForm === 'goal') {
        newTx.goalId = txGoalId;
        const targetGoal = goals.find(g => g.id === txGoalId);
        newTx.description = `Накопичення: ${targetGoal?.name || 'Ціль'}`;
      } else {
        newTx.cushionAssetId = txCushionAssetId;
        const targetAsset = cushionAssets.find(a => a.id === txCushionAssetId);
        newTx.description = `${t('pillarCushion')}: ${targetAsset?.name || 'Резерв'}`;
      }

      // For cushion/goal, category is optional — use the first suitable category if available
      const defaultCat = categories.find(c => 
        c.type === showTxForm || 
        c.name.toLowerCase().includes(showTxForm === 'goal' ? 'ціл' : 'подушк')
      );
      newTx.categoryId = txCategoryId || defaultCat?.id || '';
    } else {
      if (!txCategoryId && showTxForm !== 'investment') {
        console.warn(t('errSelectCategory'));
        return;
      }
      newTx.categoryId = txCategoryId;
    }
  }

  const affectedAccounts: { id: string, balance: number }[] = [];
  if (fromAcc) {
    let newBalance = fromAcc.balance;
    if (['expense', 'investment', 'transfer', 'cushion', 'goal'].includes(showTxForm)) {
      newBalance -= txAmount;
    } else if (showTxForm === 'income') {
      newBalance += txAmount;
    } else if (showTxForm === 'adjustment') {
      newBalance = txAmount;
    }
    affectedAccounts.push({ id: fromAcc.id, balance: Number(newBalance.toFixed(2)) });
  }

  if ((showTxForm === 'transfer' || showTxForm === 'investment') && toAcc) {
    affectedAccounts.push({ id: toAcc.id, balance: Number((toAcc.balance + txAmount).toFixed(2)) });
  }

  setIsSaving(true);
  try {
    console.log(`[TX SAVE] Type: ${showTxForm}, Amount: ${txAmount}, From: ${fromAcc?.name}, To: ${toAcc?.name}`);
    console.log(`[TX SAVE] Affected Accounts:`, affectedAccounts);

    await onSaveBudgetTx(newTx, affectedAccounts);

    // Автоматичне перемикання місяця, щоб побачити нову транзакцію
    const txMonth = newTx.date?.slice(0, 7);
    if (txMonth && txMonth !== selectedMonth) {
      setSelectedMonth(txMonth);
    }

    // Повідомлення в Telegram (опціонально, можна винести в App.tsx пізніше)
    try {
      const cat = categories.find(c => c.id === newTx.categoryId);
      const acc = accounts.find(a => a.id === newTx.accountId);
      const msg = `🆕 *${t('tgNewTx')}*\n\n` +
        `📌 *${t('tgType')}:* ${newTx.type === 'income' ? t('tgIncome') : newTx.type === 'expense' ? t('tgExpense') : newTx.type === 'investment' ? t('tgInvestment') : t('tgTransfer')}\n` +
        `💵 *${t('tgAmount')}:* ${newTx.amount?.toLocaleString()} UAH\n` +
        `📂 *${t('tgCategory')}:* ${cat?.name || 'Без категорії'}\n` +
        `🏦 *${t('tgAccount')}:* ${acc?.name || 'Невідомо'}\n` +
        `${newTx.note ? `📝 *${t('tgNote')}:* ${newTx.note}` : ''}`;

      await supabase.functions.invoke('telegram-notify', { body: { message: msg } });
    } catch (e) { }

    // NOTE: Оновлення цілей та подушки тепер відбувається АТОМАРНО у App.tsx -> handleSaveBudgetTx
    // Це запобігає подвійному нарахуванню та розбіжностям у балансах.

    setShowTxForm(null);
    setTxAmount(0);
    setTxNote('');
    setTxCategoryId('');
    setTxCushionAssetId('');
    setTxGoalId('');
  } catch (err) {
    console.error('Failed to add transaction:', err);
    console.warn(t('errSync'));
  } finally {
    setIsSaving(false);
  }
};

const handleUpdateTxCategory = async (txId: string, catId: string, type: BudgetCategory['type'] = 'expense', month?: string) => {
  if (!userId) return;

  // Sync with Month Plan if provided
  if (month && catId) {
    await ensureCategoryInPlan(catId, month);
  }

  try {
    const txRef = doc(db, `users/${userId}/budgetTxs/${txId}`);
    await setDoc(txRef, {
      categoryId: catId,
      isAiCategorized: false
    }, { merge: true });
    console.log(`[CAT] Updated tx ${txId} category to ${catId} for month ${month}`);
  } catch (err) {
    console.error('Error updating transaction category:', err);
  }
};

const handleDeleteTx = async (id: string) => {
  if (!userId || !id) return;
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;

  // We skip browser confirm() because we use the ConfirmModal
  const affectedAccounts: { id: string, balance: number }[] = [];
  const fromAcc = accounts.find(a => a.id === tx.accountId);

  if (fromAcc) {
    let newBalance = fromAcc.balance;
    if (['expense', 'investment', 'transfer', 'cushion', 'goal'].includes(tx.type)) {
      newBalance += tx.amount;
    } else if (tx.type === 'income') {
      newBalance -= tx.amount;
    } else if (tx.type === 'adjustment') {
      newBalance -= tx.amount;
    }
    affectedAccounts.push({ id: fromAcc.id, balance: Number(newBalance.toFixed(2)) });
  }

  if ((tx.type === 'transfer' || tx.type === 'investment') && tx.toAccountId) {
    const toAcc = accounts.find(a => a.id === tx.toAccountId);
    if (toAcc) {
      affectedAccounts.push({ id: toAcc.id, balance: Number((toAcc.balance - tx.amount).toFixed(2)) });
    }
  }

  try {
    // Save state for Undo BEFORE deletion
    setLastDeletedTx({ ...tx });
    setLastDeletedAccs([...accounts]);
    setShowUndoToast(true);
    
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setShowUndoToast(false);
    }, 10000);

    await onDeleteBudgetTx(id, affectedAccounts);
    setConfirmDeleteId(null); // Close modal
  } catch (error) {
    console.error('Error deleting transaction:', error);
    setShowUndoToast(false);
  }
};

const handleUndoDelete = async () => {
  if (!userId || !lastDeletedTx || !lastDeletedAccs) return;

  const txToRestore = lastDeletedTx;
  const accsToRestore = lastDeletedAccs;

  // Reset undo state
  setLastDeletedTx(null);
  setLastDeletedAccs(null);
  setShowUndoToast(false);
  if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

  try {
    // 1. Restore Transaction
    await setDoc(doc(db, `users/${userId}/budgetTxs/${txToRestore.id}`), txToRestore);

    // 2. Restore Accounts (they were updated optimistically and persisted in handleDeleteTx)
    for (const acc of accsToRestore) {
      await setDoc(doc(db, `users/${userId}/accounts/${acc.id}`), acc);
    }

    // 3. Update local state
    setTransactions(prev => [txToRestore, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    setAccounts(accsToRestore);

  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${userId}/budgetTxs/${txToRestore.id}`);
  }
};

const saveAccount = async () => {
  if (!userId) return;
  try {
    if (editingAcc === 'new') {
      const newAcc: Account = {
        id: crypto.randomUUID(),
        name: accName,
        balance: accBalance,
        currency: 'UAH',
        color: 'bg-zinc-500',
        isInvestment: accIsInvestment,
        type: accType
      };
      await setDoc(doc(db, `users/${userId}/accounts/${newAcc.id}`), newAcc);
    } else {
      const existing = accounts.find(a => a.id === editingAcc);
      if (existing) {
        await setDoc(doc(db, `users/${userId}/accounts/${editingAcc}`), {
          ...existing,
          name: accName,
          balance: accBalance,
          isInvestment: accIsInvestment,
          type: accType
        });
      }
    }
    setEditingAcc(null);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/accounts`);
  }
};

const deleteAccount = async (id: string) => {
  if (!userId) return;
  if (!window.confirm(t('deleteConfirm') || 'Видалити рахунок?')) return;
  
  // Optimistic update for fast UI response
  setAccounts(prev => prev.filter(a => a.id !== id));
  
  try {
    await deleteDoc(doc(db, `users/${userId}/accounts/${id}`));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/accounts/${id}`);
  }
};

const saveCategory = async () => {
  if (!userId) return;
  try {
    if (editingCat === 'new') {
      const newCat: BudgetCategory = { id: crypto.randomUUID(), name: catName, type: catType, planned: catPlanned, color: 'bg-zinc-500' };
      await setDoc(doc(db, `users/${userId}/categories/${newCat.id}`), newCat);
    } else {
      const existing = categories.find(c => c.id === editingCat);
      if (existing) {
        await setDoc(doc(db, `users/${userId}/categories/${editingCat}`), { ...existing, name: catName, planned: catPlanned });
      }
    }
    setEditingCat(null);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/categories`);
  }
};
const deleteCategory = async (id: string) => {
  if (!userId) return;
  try {
    await deleteDoc(doc(db, `users/${userId}/categories/${id}`));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/categories/${id}`);
  }
};

const { totalCushionBalance, totalGoalsBalance, totalLiquidBalance, totalCreditLimits } = useMemo(() => {
  let cushion = 0;
  let goals = 0;
  let others = 0;
  let credits = 0;
  accounts.forEach(acc => {
    const ownFunds = acc.balance - (acc.creditLimit || 0);
    credits += (acc.creditLimit || 0);
    
    if (acc.type === 'cushion') cushion += ownFunds;
    else if (acc.type === 'goals') goals += ownFunds;
    else others += ownFunds;
  });
  return { 
    totalCushionBalance: cushion, 
    totalGoalsBalance: goals, 
    totalLiquidBalance: others,
    totalCreditLimits: credits 
  };
}, [accounts]);

const formatUah = (n: number) => {
  return formatGlobal(n, globalCurrency, exchangeRates, 'UAH');
};

const portfolioStats = useMemo(() => {
  let totalUsd = 0;
  const portfoliosData: Record<string, { name: string, type: string, valueUsd: number }> = {};

  // 1. Initialize portfolios
  if (portfolios) {
    portfolios.forEach(p => {
      portfoliosData[p.id] = { name: p.name, type: p.type, valueUsd: 0 };
    });
  }

  // 2. Add Bitbon value from globalMetrics (tri-safe)
  const bitbonValUsd = globalMetrics?.bitbonValueUsd || 0;
  const bitbonPortfolio = portfolios?.find(p => p.type === 'bitbon' || p.name.toLowerCase().includes('bitbon'));
  if (bitbonPortfolio && portfoliosData[bitbonPortfolio.id]) {
    portfoliosData[bitbonPortfolio.id].valueUsd = bitbonValUsd;
    totalUsd += bitbonValUsd;
  } else if (bitbonValUsd > 0) {
    // Fallback if no portfolio object exists, just add to total
    totalUsd += bitbonValUsd;
  }

  // 3. Add other portfolio assets
  if (portfolioAssets && portfolios) {
    portfolioAssets.forEach(a => {
      const port = portfolios.find(p => p.id === a.portfolioId);
      if (!port) return;
      // Skip bitbon as we already handled it globally
      if (port.type === 'bitbon' || port.name.toLowerCase().includes('bitbon')) return;

      const price = a.currentPrice || a.averagePrice || 0;
      const val = (a.amount || 0) * price;
      if (portfoliosData[port.id]) portfoliosData[port.id].valueUsd += val;
      totalUsd += val;
    });
  }

  const rate = exchangeRates?.['UAH'] || 43.1;
  const totalUah = totalUsd * rate;

  return {
    activePortfolios: Object.values(portfoliosData),
    totalPortfoliosUah: totalUah
  };
}, [portfolios, portfolioAssets, exchangeRates, globalMetrics]);

const totalCapital = totalBalance + portfolioStats.totalPortfoliosUah + (includePhysicalAssets ? totalPhysicalAssetsValue : 0) - totalOverallDebt;
return (
  <div className="w-full bg-zinc-50 dark:bg-zinc-950/40 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-3 md:p-8 shadow-2xl">

    <div className="sticky top-0 z-[var(--z-header)] -mx-4 -mt-4 mb-8 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800/50 p-4 sm:p-6 rounded-t-[2.5rem]">
      <div className="flex flex-col gap-6">
        {/* Main Navigation Grid */}
        <div className="grid grid-cols-3 sm:flex items-center justify-center gap-1.5 sm:gap-3 w-full transition-all duration-500">
          {[
            { id: 'dashboard', icon: PieChart, label: t('tabDashboard'), color: 'blue' },
            { id: 'transactions', icon: ArrowDownUp, label: t('tabTransactions'), color: 'blue' },
            { id: 'planning', icon: Calendar, label: t('tabPlanning'), color: 'blue' },
            { id: 'accounts', icon: Wallet, label: t('tabAccounts'), color: 'blue' },
            { id: 'goals', icon: Target, label: t('tabGoals'), color: 'emerald' },
            { id: 'assets', icon: Gem, label: t('tabAssets'), color: 'amber' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex flex-col items-center justify-center gap-1 px-1 py-2 sm:flex-row sm:px-4 sm:py-2 rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-tighter sm:tracking-widest transition-all duration-500 group min-w-0 w-full sm:w-auto
                  ${isActive 
                    ? 'text-white shadow-lg overflow-hidden' 
                    : 'bg-white/50 dark:bg-zinc-800/30 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-100 dark:border-white/5'
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBg"
                    className={`absolute inset-0 z-0 ${tab.color === 'emerald' ? 'bg-emerald-500' : tab.color === 'amber' ? 'bg-amber-500' : 'bg-indigo-600'}`}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                  <Icon className={`w-4 h-4 sm:w-3 sm:h-3 transition-all duration-500 ${isActive ? 'rotate-[360deg] scale-110' : 'opacity-60 group-hover:opacity-100 group-hover:scale-110'}`} />
                  <span className="truncate max-w-full">{tab.label}</span>
                </div>
              </button>
            )})}
        </div>

        {/* Action Buttons Grid - Moved Under Navigation */}
        {activeTab === 'dashboard' && (
          <div className="w-full flex justify-center -mt-2 px-2">
             <div className="flex flex-wrap items-center justify-center gap-y-4 gap-x-1 sm:gap-2 w-full max-w-full">
              {[
                { type: 'income', label: t('actionIncome'), icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                { type: 'expense', label: t('actionExpense'), icon: Minus, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
                { type: 'goal', label: t('actionGoal'), icon: Target, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-500/10' },
                { type: 'cushion', label: t('actionCushion'), icon: ShieldCheck, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
                { type: 'investment', label: t('actionInvest'), icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
                { type: 'transfer', label: t('actionTransfer'), icon: ArrowDownUp, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-500/10' },
                { type: 'adjustment', label: t('actionAdjustment'), icon: Settings, color: 'text-zinc-400', bg: 'bg-zinc-50 dark:bg-white/5' }
              ].map((btn) => (
                <button 
                  key={btn.type} 
                  onClick={() => setShowTxForm(btn.type as any)} 
                  className="flex flex-col items-center gap-1 group active:scale-95 transition-transform w-[23%] sm:w-auto min-w-0"
                >
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 ${btn.bg} rounded-xl sm:rounded-2xl flex items-center justify-center border border-zinc-200/50 dark:border-white/5 shadow-sm group-hover:shadow-md transition-all`}>
                    <btn.icon className={`w-5 h-5 sm:w-5 sm:h-5 ${btn.color}`} />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-black text-zinc-400 uppercase tracking-tighter truncate w-full px-0.5 text-center">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Unified Calendar Island */}
        <div className="flex justify-center">
          <div className="flex items-center gap-1 bg-zinc-900/5 dark:bg-white/5 p-1 rounded-[24px] border border-zinc-200 dark:border-white/5 shadow-inner">
            <div className="flex p-0.5 bg-white dark:bg-zinc-800 rounded-[18px] shadow-sm">
              <button 
                onClick={() => setViewMode('month')} 
                className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                {t('viewMonth')}
              </button>
              <button 
                onClick={() => setViewMode('year')} 
                className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'year' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                {t('viewYear')}
              </button>
            </div>
            <div className="px-3 py-1 flex items-center gap-2">
              <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />
              <MonthPicker value={selectedMonth} onChange={v => setSelectedMonth(v)} language={language} small />
            </div>
          </div>
        </div>
      </div>
    </div>

    <AnimatePresence mode="wait">
      {activeTab === 'dashboard' && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-8"
        >
             {/* Hero Premium Section - Professional Light Style */}
          <div className="relative overflow-hidden glass-card rounded-[48px] p-8 md:p-14 shadow-2xl border border-white/20 dark:border-white/5 active:scale-[0.99] transition-all group">
            <div className="absolute inset-0 opacity-20 blur-3xl pointer-events-none overflow-hidden">
              <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full animate-pulse" />
              <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative z-10 space-y-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                  <span className="text-[12px] font-black text-zinc-500 uppercase tracking-[0.5em]">{t('netWorth')}</span>
                </div>
                <h2 className="text-7xl md:text-[10rem] font-black text-zinc-900 dark:text-white tracking-tighter drop-shadow-xl italic text-center">
                  {formatGlobal(totalCapital, globalCurrency, exchangeRates, 'UAH')}
                </h2>
                
                {/* Physical Assets Toggle */}
                <button 
                  onClick={() => setIncludePhysicalAssets(!includePhysicalAssets)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                    includePhysicalAssets 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-500 opacity-60'
                  }`}
                >
                  <Gem className={`w-3.5 h-3.5 ${includePhysicalAssets ? 'animate-bounce' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {includePhysicalAssets ? 'Майно включено' : 'Без майна'}
                  </span>
                </button>
              </div>

              {/* Enhanced Net Worth Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
                {[
                  { label: 'Баланс (Власні)', val: totalLiquidBalance, color: 'text-indigo-600', bg: 'bg-indigo-50/80', icon: Wallet },
                  { label: 'Інвестовано', val: portfolioStats.totalPortfoliosUah, color: 'text-violet-600', bg: 'bg-violet-50/80', icon: Zap },
                  { label: 'Подушка', val: totalCushionBalance, color: 'text-orange-600', bg: 'bg-orange-50/80', icon: ShieldCheck },
                  { label: 'Цілі', val: totalGoalsBalance, color: 'text-teal-600', bg: 'bg-teal-50/80', icon: Target },
                  { label: 'Майно', val: totalPhysicalAssetsValue, color: 'text-amber-600', bg: 'bg-amber-50/80', icon: Gem },
                  { label: 'Кредитний ліміт', val: totalCreditLimits, color: 'text-blue-600', bg: 'bg-blue-50/80', icon: CreditCard },
                  { label: 'Борг', val: totalOverallDebt, color: 'text-rose-600', bg: 'bg-rose-50/80', icon: TrendingDown },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={`p-4 sm:p-5 rounded-[28px] border border-white/40 ${item.bg} backdrop-blur-xl flex flex-col items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 group/item`}>
                      <div className={`p-1.5 rounded-lg bg-white/50 mb-2 group-hover/item:rotate-12 transition-transform shadow-sm`}>
                         <Icon className={`w-3 h-3 ${item.color}`} />
                      </div>
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tight mb-1 text-center leading-tight">{item.label}</span>
                      <span className={`text-base sm:text-lg font-black ${item.color} tracking-tighter truncate w-full text-center`}>{formatGlobal(item.val, globalCurrency, exchangeRates, 'UAH')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>


          {/* Detailed Analytics Section */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4">
              <div className="flex items-center gap-4">
                 <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                 <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{t('analytics')}</h3>
              </div>
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl px-3 py-1.5 shadow-sm">
                <select value={analyticsAccountId} onChange={e => setAnalyticsAccountId(e.target.value)} className="bg-transparent border-none text-[11px] font-black text-zinc-800 dark:text-zinc-100 outline-none cursor-pointer uppercase tracking-tighter lg:max-w-[140px]">
                  <option value="all">Всі рахунки</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
            </div>

            {/* Analytics Grid - Professional Light Style */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Дохід', val: analyticsStats.totalIncome, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: TrendingUp },
                { label: 'Витрати', val: analyticsStats.totalExpense, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: TrendingDown },
                { label: 'Подушка', val: analyticsStats.totalCushion, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10', icon: ShieldCheck },
                { label: 'Цілі', val: analyticsStats.totalGoal, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-500/10', icon: Target },
                { label: 'Інвестовано', val: analyticsStats.totalInvested, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', icon: Zap },
                { label: 'Перекази', val: analyticsStats.totalTransfers, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10', icon: ArrowDownUp }
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className="p-5 rounded-[32px] glass-card border border-white/10 shadow-xl transition-all hover:scale-105 hover:shadow-2xl group/card">
                    <div className="flex items-center justify-between mb-2">
                       <div className={`p-2 rounded-xl ${card.bg} transition-transform group-hover/card:scale-110`}>
                          <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                       </div>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest mb-1">{card.label}</div>
                    <div className={`text-xl font-black tracking-tighter ${card.color}`}>{formatGlobal(card.val, globalCurrency, exchangeRates, 'UAH')}</div>
                  </div>
                );
              })}
            </div>

          </div>



          {/* Bottom Feed Grid: Property and Academy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PropertyCard 
              totalValue={totalPhysicalAssetsValue} 
              assetsCount={assets.length} 
              formatValue={(v) => formatUah(v)} 
              onClick={() => setActiveTab('assets')}
              language={language}
            />

            {/* Bitbon Academy Progress Card */}
            <div className="bg-gradient-to-br from-indigo-600/5 to-purple-600/5 backdrop-blur-xl p-6 rounded-[40px] border border-indigo-500/10 flex flex-col justify-between group cursor-pointer hover:scale-[1.02] transition-all shadow-sm h-full" onClick={() => onMainTabChange('academy')}>
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Bitbon Academy</h4>
                  </div>
                  <div className="px-2 py-1 bg-amber-500/10 rounded-lg text-[9px] font-black text-amber-600 uppercase tracking-tighter flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" /> {academyStats.xp} XP
                  </div>
               </div>
               <div>
                  <div className="flex justify-between items-end mb-2">
                    <div className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{academyStats.modules}/7</div>
                    <div className="text-[9px] font-black text-zinc-500 uppercase">Модулів пройдено</div>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${(academyStats.modules / 7) * 100}%` }} />
                  </div>
               </div>
            </div>
          </div>

        </motion.div>
      )}

      {/* Yearly Planning View */}
      {activeTab === 'planning' && !editingMonth && (
        <motion.div
          key="planning-year"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Header & Year Selector */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">{t('planningTitle')}</h3>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{selectedYear}</span>
              <button onClick={() => setSelectedYear(prev => prev - 1)} className="p-0.5 hover:text-blue-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setSelectedYear(prev => prev + 1)} className="p-0.5 hover:text-blue-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Pillar Summary Cards */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">{t('budgetDistribution')}</div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!userId) return;
                  try {
                    await setDoc(doc(db, `users/${userId}`), { budgetProportions: targetPercents }, { merge: true });
                    setBudgetProportions(targetPercents);
                    alert(t('successSavedDb'));
                  } catch (e) {
                    alert(t('errSync') + ': ' + e);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[11px] font-bold hover:bg-emerald-600/20 transition-all uppercase tracking-tight"
              >
                <Check className="w-3 h-3" /> {t('saveForever')}
              </button>
              <button
                onClick={() => setShowAddCat(!showAddCat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all uppercase tracking-tight ${showAddCat ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20'}`}
              >
                {showAddCat ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showAddCat ? t('confirmCancel') : t('addCategory')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            {['income', 'expense', 'cushion', 'debt', 'investment'].map(key => {
              const meta = getPillarMeta(key);
              const Icon = meta.icon;
              const isDistribution = key === 'expense' || key === 'investment' || key === 'cushion' || key === 'debt';
              const stats = pillarStats[key] || { fact: 0, plan: 0, factToday: 0 };
              const isPlanningTab = activeTab === 'planning';
              const displayValue = key === 'debt'
                ? (isPlanningTab ? totalRepaymentMonthly : totalOverallDebt)
                : (isPlanningTab ? stats.plan : stats.fact);

              return (
                <motion.div
                  key={key}
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    setPlanningPillar(key as any);
                    const monthToEdit = selectedMonth;
                    setEditingMonth(monthToEdit);
                    if (key === 'debt') setDebtSubTab('manual');
                  }}
                  className="glass-card p-5 rounded-[32px] border border-white/20 dark:border-zinc-800/50 shadow-sm transition-all cursor-pointer relative overflow-hidden group hover:border-blue-500/30 hover:shadow-xl"
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl ${meta.btnBg} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] text-zinc-500 dark:text-zinc-400 font-black uppercase tracking-widest leading-none contrast-125 mb-0.5 truncate">{meta.label}</div>
                        <div className={`text-lg font-black ${meta.color} tracking-tighter truncate flex items-center gap-1.5`}>
                          {formatGlobal(displayValue, globalCurrency, exchangeRates, 'UAH')}
                          {isPlanningTab && <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">({t('targetTitle')})</span>}
                        </div>
                      </div>
                    </div>

                    {key === 'income' && (
                      <div className="space-y-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{t('planLabel')}</span>
                          <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300">{formatGlobal(stats.plan, globalCurrency, exchangeRates, 'UAH')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{t('factTodayLabel')}</span>
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{formatGlobal(stats.fact, globalCurrency, exchangeRates, 'UAH')}</span>
                        </div>
                        <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (stats.fact / (stats.plan || 1)) * 100)}%` }} className="h-full bg-emerald-500" />
                        </div>
                      </div>
                    )}

                    {key !== 'income' && (
                      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{isPlanningTab ? t('factTodayLabel') : t('targetPlanLabel')}</span>
                          <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300">
                            {isPlanningTab
                              ? formatGlobal(stats.fact, globalCurrency, exchangeRates, 'UAH')
                              : (
                                (() => {
                                  const percentageTarget = (targetPercents[key] || 0) / 100 * ((pillarStats as any).income?.plan || 0);
                                  return formatGlobal(percentageTarget > 0 ? percentageTarget : stats.plan, globalCurrency, exchangeRates, 'UAH');
                                })()
                              )
                            }
                          </span>
                        </div>

                        {/* Mini Progress Bar */}
                        <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${Math.min(100, stats.plan > 0 ? (stats.fact / stats.plan) * 100 : 0)}%` }} 
                            className={`h-full ${stats.fact > stats.plan && key !== 'income' ? 'bg-rose-500' : meta.color.replace('text-', 'bg-')}`} 
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <div
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`flex items-center gap-1 bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-100 dark:border-zinc-700 shadow-sm focus-within:border-blue-500/50 transition-all`}
                          >
                            <input
                              type="number"
                              className={`w-10 bg-transparent border-none text-[10px] font-black ${meta.color} text-right outline-none p-0 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                              value={targetPercents[key] || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  handlePillarPercentChange(key as any, val);
                                }
                              }}
                            />
                            <span className={`text-[9px] font-black ${meta.color}`}>%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`absolute top-0 right-1 w-24 h-24 ${meta.color.replace('text-', 'bg-')}/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/10 transition-all`}></div>
                </motion.div>
              );
            })}
          </div>

          {/* Yearly Projection Chart */}
          <div className="bg-white/40 dark:bg-black/40 backdrop-blur-3xl p-6 md:p-12 rounded-[48px] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] mb-12 group transition-all hover:scale-[1.005]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">{t('planVsFact')}</h4>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-tight opacity-60">Аналіз виконання бюджету за рік</p>
              </div>
              <div className="flex items-center gap-4 md:gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{t('targetPlanLabel')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('factTodayLabel')}</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] md:h-[450px] w-full relative">
              <Line
                id={`yearly-chart-${chartIdSuffix}-${activeTab}-${selectedYear}`}
                key={`yearly-chart-${chartIdSuffix}-${activeTab}-${selectedYear}`}
                data={{
                  labels: yearlyPlanningStats.map(d => d.monthName),
                  datasets: [
                    {
                      label: t('factTodayLabel'),
                      data: yearlyPlanningStats.map(d => d.fact),
                      borderColor: '#3b82f6',
                      backgroundColor: (context: any) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
                        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
                        return gradient;
                      },
                      borderWidth: 4,
                      pointRadius: 0,
                      pointHoverRadius: 6,
                      pointHoverBackgroundColor: '#3b82f6',
                      pointHoverBorderColor: '#fff',
                      pointHoverBorderWidth: 3,
                      fill: true,
                      tension: 0.4,
                    },
                    {
                      label: t('targetPlanLabel'),
                      data: yearlyPlanningStats.map(d => d.plan),
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      backgroundColor: 'transparent',
                      borderWidth: 2,
                      borderDash: [5, 5],
                      pointRadius: 0,
                      tension: 0.4,
                      fill: false,
                    }
                  ]
                }}
                options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                      titleColor: isDarkMode ? '#ffffff' : '#18181b',
                      bodyColor: isDarkMode ? '#a1a1aa' : '#71717a',
                      padding: 16,
                      cornerRadius: 20,
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      borderWidth: 1,
                      displayColors: false,
                      intersect: false,
                      mode: 'index',
                      callbacks: {
                        label: (context) => {
                          const val = context.parsed.y;
                          return `${context.dataset.label}: ${formatGlobal(val, globalCurrency, exchangeRates, 'UAH')}`;
                        }
                      }
                    }
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index',
                  },
                  scales: {
                    y: { 
                      beginAtZero: true, 
                      grid: { 
                        color: chartGridColor,
                        display: true,
                      },
                      border: { display: false },
                      ticks: { 
                        color: chartTextColor, 
                        font: { size: 9, weight: 'bold' },
                        padding: 10,
                        callback: (value) => formatGlobal(value as number, globalCurrency, exchangeRates, 'UAH').split(' ')[0]
                      }
                    },
                    x: { 
                      grid: { display: false },
                      ticks: { 
                        color: chartTextColor, 
                        font: { size: 9, weight: 'bold' },
                        padding: 10
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* AI Forecasting Box */}
          <div className="p-8 rounded-[40px] bg-indigo-600/5 border border-indigo-500/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
               <Sparkles className="w-16 h-16 text-indigo-500" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="w-16 h-16 rounded-[24px] bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-xl shadow-indigo-600/20">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2 text-center md:text-left">
                <h4 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">AI Forecasting: {t('planningTitle')}</h4>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                  {aiBudgetInsight}
                  Ваш план на цей місяць передбачає інвестування <span className="font-black text-indigo-500">{targetPercents.investment}%</span> доходу. 
                  {aiDebtProjection}
                  Поточні ліквідні кошти ({formatGlobal(totalBalance, globalCurrency, exchangeRates, 'UAH')}) покривають ваші базові витрати на {(totalBalance / (pillarStats.expense?.plan || 1)).toFixed(1)} міс.
                </p>
              </div>
              <div className="md:ml-auto">
                 <button onClick={() => setPlanningPillar('investment')} className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Деталі прогнозу</button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'accounts' && (
        <AccountsTab 
          accounts={accounts}
          transactions={transactions}
          selectedMonth={selectedMonth}
          lastBalancesUpdateTime={lastBalancesUpdateTime}
          isSyncingBalances={isSyncingBalances}
          categorizedAccounts={categorizedAccounts}
          editingAcc={editingAcc}
          accName={accName}
          accBalance={accBalance}
          accCreditLimit={accCreditLimit || 0}
          accIsInvestment={accIsInvestment}
          accType={accType}
          setEditingAcc={setEditingAcc}
          setAccName={setAccName}
          setAccBalance={setAccBalance}
          setAccCreditLimit={setAccCreditLimit}
          setAccIsInvestment={setAccIsInvestment}
          setAccType={setAccType}
          saveAccount={saveAccount}
          deleteAccount={deleteAccount}
          setShowTxForm={setShowTxForm}
          setTxAccountId={setTxAccountId}
          showDiagnostics={showDiagnostics}
          setShowDiagnostics={setShowDiagnostics}
          syncStatus={syncStatus}
          setSyncStatus={setSyncStatus}
          bankConnections={bankConnections}
          onDeleteBankConnection={onDeleteBankConnection}
          handleSyncAllBanks={handleSyncAllBanks}
          handleSyncBank={handleSyncBank}
          handleRegisterWebhook={handleRegisterWebhook}
          handleSyncBankHistory={handleSyncBankHistory}
          repairTransactions={repairTransactions}
          handleSyncOkx={handleSyncOkx}
          monobankClientInfos={monobankClientInfos}
          handleLinkAccount={handleLinkAccount}
          bankToken={bankToken}
          setBankToken={setBankToken}
          handleConnectMonobank={handleConnectMonobank}
          okxApiKey={okxApiKey}
          setOkxApiKey={setOkxApiKey}
          okxSecretKey={okxSecretKey}
          setOkxSecretKey={setOkxSecretKey}
          okxPassphrase={okxPassphrase}
          setOkxPassphrase={setOkxPassphrase}
          handleConnectOkx={handleConnectOkx}
          showBankForm={showBankForm}
          setShowBankForm={setShowBankForm}
          bankFormType={bankFormType}
          setBankFormType={setBankFormType}
          isSyncingBank={isSyncingBank}
          formatUah={(v) => formatGlobal(v, globalCurrency, exchangeRates, 'UAH')}
          t={t}
          isDarkMode={isDarkMode}
          getMonobankUrl={getMonobankUrl}
        />
      )}
      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <motion.div
          key="transactions"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Транзакції</h3>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleSyncAllHistory(6)}
                disabled={isSyncingBank}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-2xl text-[10px] font-black hover:bg-amber-500/20 transition-all uppercase tracking-widest disabled:opacity-50 border border-amber-500/10"
                title="Завантажити за 6 місяців"
              >
                <History className={`w-3.5 h-3.5 ${isSyncingBank ? 'animate-pulse' : ''}`} />
                <span className="hidden xs:inline">6 МІСЯЦІВ</span>
                <span className="xs:hidden">6М</span>
              </button>
              <button
                onClick={() => handleSyncAllBanks(false, true)}
                disabled={isSyncingBank}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black hover:bg-blue-700 transition-all uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50"
                title="Оновити (60 днів)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBank ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">ОНОВИТИ</span>
                <span className="xs:hidden">СИНХРОН</span>
              </button>
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all ${showDiagnostics ? 'bg-zinc-900 text-white shadow-xl' : 'bg-white dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 border border-zinc-200 dark:border-zinc-700'}`}
                title="Діагностика"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showDiagnostics && (
            <div className="mb-6 p-4 bg-zinc-950 rounded-3xl border border-zinc-800 font-mono text-[10px] leading-relaxed">
              <div className="flex items-center justify-between mb-3">
                <div className="text-zinc-500 uppercase tracking-widest font-bold">Діагностика Синхронізації</div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const conn = bankConnections[0];
                      if (!conn) { console.warn('Token not found'); return; }
                      const res = await fetch(getMonobankUrl('/personal/client-info', conn.token), {
                        headers: {
                          'X-Token': conn.token,
                          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                        }
                      });
                      const info = await res.json();
                      console.log('CLIENT INFO:', info);
                      const accs = info.accounts.map((a: any) => {
                        const type = a.type === 'black' ? 'Чорна' : a.type === 'white' ? 'Біла' : a.type === 'platinum' ? 'Платинум' : a.type;
                        const currency = a.currencyCode === 980 ? 'UAH' : a.currencyCode === 840 ? 'USD' : a.currencyCode === 978 ? 'EUR' : a.currencyCode;
                        const balance = (a.balance / 100).toFixed(2);
                        return `[${type}] ${currency}: ${balance} (ID: ${a.id})`;
                      }).join('\n');
                      const jars = (info.jars || []).map((j: any) => `[Банка] ${j.title}: ${(j.balance / 100).toFixed(2)} (ID: ${j.id})`).join('\n');
                      alert(`ДОСТУПНІ РАХУНКИ:\n${accs}\n\nБАНКИ:\n${jars || 'Відсутні'}`);
                    }}
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
                  >
                    ПЕРЕВІРИТИ ID РАХУНКІВ
                  </button>
                  <button
                    onClick={() => handleSyncAllBanks(false, true)}
                    className="px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 font-bold"
                  >
                    СФОРСУВАТИ ПОВНИЙ СИНХРОН (FORCE)
                  </button>
                  <button
                    onClick={() => repairTransactions()}
                    className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-bold"
                    title="Виправити типи транзакцій (переказ vs витрата) на основі нових правил"
                  >
                    РЕМOНТ ТИПІВ
                  </button>
                  <button
                    onClick={() => {
                      const monobankConns = bankConnections.filter(c => c.type === 'monobank');
                      monobankConns.forEach(conn => handleRegisterWebhook(conn));
                    }}
                    className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold"
                    title="Налаштувати Webhook для миттєвого отримання транзакцій"
                  >
                    АКТИВУВАТИ МИТТЄВІ СПОВІЩЕННЯ
                  </button>
                  <button onClick={() => setSyncStatus([])} className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 font-bold uppercase">Очистити</button>
                </div>
              </div>
              <div className="text-[9px] text-zinc-400 bg-zinc-900/50 p-2 rounded-xl mb-3 border border-zinc-800/50 italic leading-relaxed">
                💡 Monobank обмежує запити виписок: 1 запит на 60 сек по кожному рахунку.
                Ми автоматично оновлюємо дані кожні 2-5 хв, щоб уникнути блокувань.
              </div>
              <div className="text-zinc-400 mb-2 flex items-center justify-between">
                <div>Усього транзакцій: <span className="text-white font-bold">{transactions.length}</span></div>
                <div>Ост. оновлення: <span className="text-blue-400">{lastFullSyncTimestamp > 0 ? new Date(lastFullSyncTimestamp).toLocaleTimeString() : '---'}</span></div>
              </div>

              <div className="mb-4 bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/50">
                <div className="text-[9px] text-zinc-500 uppercase font-black mb-2 px-1">Прив'язані рахунки (Синхрон по одному):</div>
                <div className="flex flex-wrap gap-2">
                  {accounts.filter(a => a.bankAccountId).map(acc => {
                    const lastSync = lastAccountSyncTimes[acc.bankAccountId!] || 0;
                    const secondsSinceLast = Math.floor((Date.now() - lastSync) / 1000);
                    const isCooldown = secondsSinceLast < 60;
                    const wait = 60 - secondsSinceLast;

                    return (
                      <button
                        key={acc.id}
                        disabled={isSyncingBank || isCooldown}
                        onClick={() => handleSyncAllBanks(false, true, acc.id)}
                        className={`px-2 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all flex items-center gap-2 ${isCooldown
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 hover:scale-105 active:scale-95'
                          }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${acc.color || 'bg-blue-500'}`} />
                        {acc.name}
                        {isCooldown && <span className="text-orange-500">{wait}с</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                {syncStatus.length === 0 ? (
                  <div className="text-zinc-600 italic">Логів поки немає. Натисніть "Оновити"...</div>
                ) : (
                  syncStatus.map((log, i) => (
                    <div key={i} className={log.includes('ПОМИЛКА') ? 'text-red-400' : log.includes('ЗБЕРЕЖЕНО') ? 'text-emerald-400' : 'text-zinc-300'}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900/50 px-5 py-3.5 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-sm flex-1 group focus-within:border-blue-500/50 transition-all">
              <Search className="w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Пошук транзакцій..."
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none w-full"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900/50 px-5 py-3.5 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-sm whitespace-nowrap">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{t('budgetPeriod')}</span>
            </div>
          </div>

          <div className="space-y-3">
            {(currentPeriodTxs || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-zinc-50 dark:bg-zinc-800/20 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center rounded-full mb-4">
                  <History className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Транзакцій не знайдено</h3>
                <p className="text-sm text-zinc-500 text-center max-w-xs mb-6">
                  За {new Date(selectedMonth + '-01').toLocaleString(locale, { month: 'long', year: 'numeric' })} даних немає.
                  Можливо, ви обрали інший період?
                </p>
                <button
                  onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg"
                >
                  Повернутись до сьогодні
                </button>
              </div>
            ) : (filteredTxs || [])
              .sort((a, b) => {
                const dateComp = b.date.localeCompare(a.date);
                if (dateComp !== 0) return dateComp;
                return (b.time || '').localeCompare(a.time || '');
              })
              .slice(0, txVisibleCount)
              .map((tx, idx, allTxs) => {
                const currentMonth = tx.date.slice(0, 7);
                const prevMonth = idx > 0 ? allTxs[idx - 1].date.slice(0, 7) : null;
                const showMonthHeader = currentMonth !== prevMonth;

                const cat = categories.find(c => c.id === tx.categoryId);
                const isAi = tx.isAiCategorized;
                const acc = accounts.find(a => a.id === tx.accountId);
                const displayName = tx.description || tx.note || 'Без опису';
                const accountLabel = tx.accountName || acc?.name;
                const isIncome = tx.isIncoming !== undefined ? tx.isIncoming : tx.type === 'income';
                const isTransfer = tx.type === 'transfer';

                return (
                  <React.Fragment key={tx.id}>
                    {showMonthHeader && (
                      <div className="pt-10 pb-4 sticky top-[110px] z-[20] bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-2xl -mx-4 px-4 sm:mx-0 sm:px-0">
                        <div className="flex items-center gap-4">
                          <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-600/50 to-transparent rounded-full" />
                          <span className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] whitespace-nowrap">
                            {new Date(currentMonth + '-01').toLocaleString(locale, { month: 'long', year: 'numeric' })}
                          </span>
                          <div className="h-0.5 flex-[4] bg-zinc-200 dark:bg-zinc-800/50 rounded-full" />
                        </div>
                      </div>
                    )}
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: 30 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true, margin: "-20px" }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 260,
                        damping: 20
                      }}
                      className="group relative mb-4"
                    >
                      {/* 3D Depth Layers */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 dark:to-transparent rounded-[32px] blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative bg-white/70 dark:bg-zinc-900/40 backdrop-blur-2xl rounded-[32px] border border-white/40 dark:border-white/5 p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.2)] overflow-hidden group-hover:border-blue-500/30 transition-all duration-300">
                        {/* Glassmorphism Inner Glow */}
                        <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
                        
                        <div className="flex items-center gap-4 relative z-10">
                          {/* Transaction Icon / Category Color */}
                          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[24px] ${cat?.color || 'bg-zinc-100 dark:bg-zinc-800'} flex items-center justify-center text-white shrink-0 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] relative transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent rounded-[24px]" />
                            {tx.type === 'goal' ? (
                              <Target className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
                            ) : tx.type === 'cushion' ? (
                              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
                            ) : tx.type === 'investment' ? (
                              <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
                            ) : isTransfer ? (
                              <RefreshCw className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
                            ) : isIncome ? (
                              <ArrowUpRight className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
                            ) : (
                              <Sparkles className={`w-7 h-7 sm:w-8 sm:h-8 drop-shadow-lg ${isAi ? 'text-white' : 'opacity-30 text-zinc-900/30 dark:text-zinc-100/30'}`} />
                            )}
                            
                            {isAi && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-xl z-20"
                              >
                                <Sparkles className="w-3 h-3 text-white fill-white" />
                              </motion.div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-[15px] sm:text-[17px] font-black text-zinc-900 dark:text-white truncate leading-tight tracking-tight uppercase">
                                {displayName}
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                                  {tx.date.split('-').slice(1).reverse().join('.')}
                                </span>
                                {tx.time && <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700">• {tx.time}</span>}
                              </div>
                              
                              {accountLabel && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100/50 dark:border-white/5 transition-colors">
                                  <div className={`w-1.5 h-1.5 rounded-full ${acc?.color || 'bg-zinc-400'}`} />
                                  <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">{accountLabel}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 scale-95 origin-left">
                                <CategoryDropdown
                                  currentCategoryId={tx.categoryId}
                                  categories={categories}
                                  type={isIncome ? 'income' : 'expense'}
                                  onSelect={(catId) => onUpdateTxCategory(tx.id, catId, isIncome ? 'income' : 'expense', tx.date.slice(0, 7))}
                                  onAdd={(name, type, color) => onCreateCategory(name, type, color, tx.date.slice(0, 7))}
                                  monthlyPlans={monthlyPlans}
                                  month={tx.date.slice(0, 7)}
                                />
                            </div>
                          </div>

                          {/* Amount & Quick Actions */}
                          <div className="flex flex-col items-end gap-2 shrink-0 pl-2">
                            <div className={`text-lg sm:text-2xl font-black tracking-tighter whitespace-nowrap ${isTransfer ? 'text-zinc-500 dark:text-zinc-400' : (isIncome ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400')}`}>
                              <span className="opacity-50 mr-0.5 text-[0.7em] font-black">{isTransfer ? '' : (isIncome ? '+' : '−')}</span>
                              {formatUah(Math.abs(tx.amount))}
                            </div>
                            
                            <div className="flex items-center gap-2">
                               <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(tx.id); }}
                                  className="w-10 h-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl transition-all active:scale-90"
                                  title="Видалити"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Side Accent Shadow */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isTransfer ? 'bg-zinc-100 dark:bg-zinc-800' : (isIncome ? 'bg-emerald-500' : 'bg-rose-500')} rounded-r-full group-hover:w-2 transition-all duration-300 opacity-60`} />
                      </div>
                    </motion.div>
                  </React.Fragment>
                );
              })}

            {filteredTxs.length > txVisibleCount && (
              <button
                onClick={() => setTxVisibleCount(prev => prev + 100)}
                className="w-full py-6 mt-6 bg-white dark:bg-zinc-900/20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em] rounded-[32px] hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:border-blue-500/30 transition-all flex items-center justify-center gap-3 group"
              >
                ПОКАЗАТИ ЩЕ ТРАНЗАКЦІЇ
                <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>
        </motion.div>
      )}


      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <motion.div
          key="assets"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">Матеріальне майно</h3>
            <button
              onClick={() => { 
                setEditingAsset('new'); 
                setAssetName(''); 
                setAssetDesc(''); 
                setAssetValue(0); 
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[11px] font-bold hover:opacity-90 transition-all uppercase tracking-tight shadow-lg"
            >
              <Plus className="w-3 h-3" /> Додати майно
            </button>
          </div>

          <div className="bg-zinc-900/80 dark:bg-zinc-800/60 backdrop-blur-xl p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden border border-white/10">
            <div className="relative z-10">
              <div className="text-[11px] font-black uppercase tracking-[0.3em] text-white/50 mb-2">Загальна вартість майна</div>
              <div className="text-4xl font-black text-white tracking-tighter italic">{formatUah((assets || []).reduce((sum, a) => sum + a.value, 0))}</div>
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          </div>

          {editingAsset && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
              <h4 className="text-sm font-bold mb-4 uppercase tracking-tight">{editingAsset === 'new' ? 'Нове майно' : 'Редагувати майно'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <input type="text" value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="Назва (напр. Автомобіль)" className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-sm outline-none focus:ring-2 ring-blue-500" />
                <input type="text" value={assetDesc} onChange={e => setAssetDesc(e.target.value)} placeholder="Опис" className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-sm outline-none focus:ring-2 ring-blue-500" />
                <input type="number" value={assetValue || ''} onChange={e => setAssetValue(Number(e.target.value))} placeholder="Вартість (₴)" className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl text-sm outline-none focus:ring-2 ring-blue-500" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingAsset(null)} className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl text-sm font-bold">Скасувати</button>
                <button onClick={async () => {
                  if (!assetName || assetValue < 0) return;
                  const id = editingAsset === 'new' ? crypto.randomUUID() : editingAsset;
                  console.log('[DEBUG] Saving Asset:', { id, name: assetName, value: assetValue });
                  await onSaveAsset({ id, name: assetName, description: assetDesc, value: assetValue });
                  setEditingAsset(null);
                }} className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-bold">Зберегти</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset, idx) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-6 rounded-[32px] border border-white/20 dark:border-zinc-800/50 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden active:scale-95"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 shadow-lg">
                      <Plus className="w-5 h-5 opacity-40" />
                    </div>
                    <div>
                      <h4 className="font-black text-zinc-900 dark:text-white leading-tight uppercase tracking-tight">{asset.name}</h4>
                      {asset.description && <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{asset.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingAsset(asset.id); setAssetName(asset.name); setAssetDesc(asset.description || ''); setAssetValue(asset.value); }} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500 hover:text-blue-500 hover:scale-110 active:scale-90 transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          show: true,
                          title: 'Видалити майно?',
                          message: `Ви впевнені, що хочете видалити ${asset.name}? Це дію неможливо буде скасувати.`,
                          onConfirm: () => onDeleteAsset(asset.id)
                        });
                      }} 
                      className="p-2.5 bg-rose-500/10 dark:bg-rose-500/20 rounded-xl text-rose-500 hover:text-rose-600 hover:scale-110 active:scale-90 transition-all shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Поточна оцінка</div>
                  <div className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{formatUah(asset.value)}</div>
                </div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full -mr-8 -mb-8 blur-2xl group-hover:bg-blue-500/5 transition-all"></div>
              </motion.div>
            ))}
            {assets.length === 0 && !editingAsset && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[32px]">
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Немає майна</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'goals' && (
        <motion.div
          key="goals"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-8"
        >
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter mb-2">Фінансові цілі</h2>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest opacity-60">Плануйте та досягайте більшого</p>
            </div>
            <button
              onClick={() => {
                setEditingGoal(null);
                setGoalName(''); setGoalTarget(0); setGoalDeadline(''); setGoalBankAccId('');
                setShowTxForm(null);
                setActiveTab('goals');
                setGoalColor(CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]);
                setEditingGoal('new');
              }}
              className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[24px] text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Нова ціль
            </button>
          </div>

          {/* AI Goals Advisor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="glass-card p-8 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">ШІ-Порадник по цілях</h4>
                </div>
                <div className="px-3 py-1 bg-emerald-500/20 rounded-full">
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Smart Analysis</span>
                </div>
              </div>

              <div className="flex overflow-x-auto pb-4 gap-6 no-scrollbar relative z-10">
                {(() => {
                  const advices = [];
                  const avgSavings = analyticsStats.avgMonthlySavings || 1000;
                  
                  if (goals.length === 0) {
                    advices.push({
                      icon: Target,
                      title: "Час ставити цілі",
                      text: "Додайте свою першу велику мрію, і я розрахую ідеальний план для її досягнення.",
                      color: "text-blue-500",
                      bg: "bg-blue-500/10"
                    });
                  }

                  goals.forEach(goal => {
                    const linkedJar = Object.values(monobankClientInfos || {}).flatMap((info: any) => info?.jars || []).find((j: any) => j.id === goal.bankAccountId);
                    const currentSaved = (linkedJar ? (linkedJar.balance / 100) : 0) + (goal.currentAmount || 0);
                    const remaining = goal.targetAmount - currentSaved;
                    const progress = (currentSaved / goal.targetAmount) * 100;
                    
                    if (goal.deadline) {
                      const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      const monthsLeft = daysLeft / 30.44;
                      const neededMonthly = remaining / (monthsLeft || 1);
                      
                      if (neededMonthly > avgSavings * 1.5 && progress < 90) {
                        advices.push({
                          icon: AlertCircle,
                          title: `Ризик дедлайну: ${goal.name}`,
                          text: `Щоб встигнути до ${new Date(goal.deadline).toLocaleDateString()}, потрібно відкладати ${formatUah(neededMonthly)}/міс. Це вище вашого середнього рівня.`,
                          color: "text-rose-500",
                          bg: "bg-rose-500/10"
                        });
                      }
                    }

                    if (progress >= 80 && progress < 100) {
                      advices.push({
                        icon: Gem,
                        title: `Майже у мети: ${goal.name}`,
                        text: `Ви на фінішній прямій (${progress.toFixed(0)}%)! Зосередьте зусилля на цій цілі, щоб закрити її швидше.`,
                        color: "text-emerald-500",
                        bg: "bg-emerald-500/10"
                      });
                    }

                    if (remaining > 0 && remaining < avgSavings) {
                      advices.push({
                        icon: Zap,
                        title: "Оптимізація: Швидкий результат",
                        text: `Ви можете закрити ціль '${goal.name}' вже цього місяця, просто перерозподіливши невелику суму.`,
                        color: "text-amber-500",
                        bg: "bg-amber-500/10"
                      });
                    }
                  });

                  if (cushionTotal > (analyticsStats.avgMonthlyExpense || 0) * 12) {
                    advices.push({
                      icon: ArrowUpRight,
                      title: "Надлишок подушки",
                      text: "Ваша подушка перевищує 12 місяців витрат. Розгляньте можливість переведення частини коштів на пріоритетні цілі.",
                      color: "text-purple-500",
                      bg: "bg-purple-500/10"
                    });
                  }

                  return advices.slice(0, 5).map((a, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="min-w-[320px] p-6 rounded-3xl bg-white/50 dark:bg-white/5 border border-white/10 shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-2xl ${a.bg} flex items-center justify-center ${a.color} shadow-sm shrink-0`}>
                          <a.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className={`text-[11px] font-black uppercase tracking-tight mb-1 ${a.color}`}>{a.title}</div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{a.text}</p>
                        </div>
                      </div>
                    </motion.div>
                  ));
                })()}
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl text-zinc-900" />
            </div>
          </motion.div>

          {editingGoal && (
            <div className="glass-card p-8 rounded-[40px] border border-blue-500/30 bg-blue-500/5 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    {editingGoal === 'new' ? 'Створення нової цілі' : 'Редагування цілі'}
                  </h3>
                  <button onClick={() => setEditingGoal(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Назва</label>
                    <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)} className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-black text-zinc-900 dark:text-white outline-none focus:ring-2 ring-blue-500/50" placeholder="Напр: Автомобіль" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Сума мети (₴)</label>
                    <input type="number" value={goalTarget || ''} onChange={e => setGoalTarget(Number(e.target.value))} className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-black text-zinc-900 dark:text-white outline-none focus:ring-2 ring-blue-500/50" placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Дедлайн (опц.)</label>
                    <input type="date" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-black text-zinc-900 dark:text-white outline-none focus:ring-2 ring-blue-500/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Прив'язати Банку Monobank</label>
                    <div className="relative">
                      <select
                        value={goalBankAccId}
                        onChange={e => setGoalBankAccId(e.target.value)}
                        className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-black text-zinc-900 dark:text-white outline-none focus:ring-2 ring-blue-500/50 appearance-none cursor-pointer"
                      >
                        <option value="">Не прив'язувати</option>
                        {Object.values(monobankClientInfos || {}).flatMap((info: any) => info?.jars || []).map((jar: any) => (
                          <option key={jar.id} value={jar.id}>{jar.title} ({formatUah(jar.balance / 100)})</option>
                        ))}
                      </select>
                      <ArrowDownUp className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleSaveGoal}
                    className="px-10 py-4 bg-blue-600 text-white rounded-[20px] font-black transition-all hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/25 uppercase tracking-widest text-[11px]"
                  >
                    Зберегти ціль
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {goals.map(goal => {
              const linkedJar = Object.values(monobankClientInfos || {}).flatMap((info: any) => info?.jars || []).find((j: any) => j.id === goal.bankAccountId);
              const currentSaved = (linkedJar ? (linkedJar.balance / 100) : 0) + (goal.currentAmount || 0);
              const progress = Math.min(100, Math.round((currentSaved / (goal.targetAmount || 1)) * 100));

              // Calculator: months to reach
              const remaining = Math.max(0, goal.targetAmount - currentSaved);
              const monthlySavings = analyticsStats.avgMonthlySavings > 0 ? analyticsStats.avgMonthlySavings : 1000;
              const monthsToReach = Math.ceil(remaining / (monthlySavings || 1));
              const yearsToReach = Math.floor(monthsToReach / 12);
              const remainingMonthsToReach = monthsToReach % 12;

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-8 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group hover:bg-white/5 dark:hover:bg-zinc-800/30 transition-all"
                >
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-[20px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm shadow-emerald-500/10`}>
                          <Gem className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{goal.name}</h3>
                          {goal.deadline && (
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Ціль до: {new Date(goal.deadline).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingGoal(goal.id);
                            setGoalName(goal.name);
                            setGoalTarget(goal.targetAmount);
                            setGoalDeadline(goal.deadline || '');
                            setGoalBankAccId(goal.bankAccountId || '');
                          }}
                          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-blue-500 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-zinc-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            Відкладено
                            {linkedJar && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                          </div>
                          <div className="text-3xl font-black text-emerald-500 tracking-tighter">{formatUah(currentSaved)}</div>
                          {linkedJar && <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">{linkedJar.title}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Ціль</div>
                          <div className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">{formatUah(goal.targetAmount)}</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                          <span className="text-zinc-400">Прогрес</span>
                          <span className="text-emerald-500">{progress}%</span>
                        </div>
                        <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-1 border border-zinc-200 dark:border-zinc-700">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          />
                        </div>
                      </div>

                      {/* Calculator Info & Quick Action */}
                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                          <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                            {progress >= 100
                              ? "Вітаємо! Ціль досягнута ✨"
                              : `Дійдете через ${yearsToReach > 0 ? `${yearsToReach} р. та ` : ''}${remainingMonthsToReach} міс.`
                            }
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setTxGoalId(goal.id);
                            setShowTxForm('goal');
                            setTxAmount(0);
                            setTxDate(new Date().toISOString().slice(0, 10));
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                          Відкласти
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {goals.length === 0 && !editingGoal && (
              <div className="col-span-full py-24 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[40px] bg-zinc-50/50 dark:bg-zinc-900/20">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                  <Gem className="w-10 h-10 text-zinc-300" />
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-2">Наразі немає цілей</h3>
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-8">Час поставити першу амбітну мету!</p>
                <button
                  onClick={() => {
                    setEditingGoal('new');
                    setGoalName('');
                    setGoalTarget(0);
                    setGoalDeadline('');
                    setGoalBankAccId('');
                  }}
                  className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black transition-all hover:scale-105 active:scale-95 shadow-lg uppercase tracking-widest text-[10px]"
                >
                  Додати ціль
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Undo Toast */}
    <AnimatePresence>
      {showUndoToast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[var(--z-overlay)] w-full max-w-xs"
        >
          <div className="bg-zinc-900 dark:bg-zinc-800 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('txDeleted')}</div>
                <div className="text-xs font-bold truncate max-w-[120px]">{lastDeletedTx?.description || t('noDescription')}</div>
              </div>
            </div>
            <button
              onClick={handleUndoDelete}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Відмінити
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Confirmation Modal */}
    <ConfirmModal
      isOpen={!!confirmDeleteId}
      onClose={() => setConfirmDeleteId(null)}
      onConfirm={() => confirmDeleteId && handleDeleteTx(confirmDeleteId)}
      title={t('deleteOperation')}
      message={t('deleteOpDesc')}
      t={t}
    />

    {/* Global Transaction Form */}
    <AnimatePresence>
      {showTxForm && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTxForm(null)}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                {showTxForm === 'income' && t('newIncome')}
                {showTxForm === 'expense' && t('newExpense')}
                {showTxForm === 'transfer' && t('newTransfer')}
                {showTxForm === 'adjustment' && t('newAdjustment')}
                {showTxForm === 'cushion' && t('newCushion')}
                {showTxForm === 'goal' && t('newGoal')}
                {showTxForm === 'investment' && t('newInvestment')}
              </h3>
              <button onClick={() => setShowTxForm(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-all"><X className="w-5 h-5" /></button>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-12 px-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800 relative z-10">
                <div className="text-zinc-500 mb-6 text-sm font-bold uppercase tracking-tight">{t('noAccountsYet')}</div>
                <button
                  onClick={() => {
                    setShowTxForm(null);
                    setActiveTab('accounts');
                    setEditingAcc('new');
                    setAccName('');
                    setAccBalance(0);
                  }}
                  className="px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-black transition-all hover:scale-105 active:scale-95 shadow-lg uppercase tracking-widest text-[11px]"
                >
                  {t('createAccountBtn')}
                </button>
              </div>
            ) : (
              <div className="relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">{showTxForm === 'adjustment' ? t('newBalance') : t('amountUah')}</label>
                    <input
                      type="number"
                      value={txAmount || ''}
                      onChange={e => setTxAmount(Number(e.target.value))}
                      className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-lg font-black text-zinc-900 dark:text-white outline-none focus:ring-2 ring-blue-500/50 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">{t('date')}</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={e => setTxDate(e.target.value)}
                      className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-black text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 ring-blue-500/50"
                    />
                  </div>

                  {showTxForm !== 'income' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">{t('fromAccount')}</label>
                      <select value={txAccountId} onChange={e => setTxAccountId(e.target.value)} className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-black text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 ring-blue-500/50 appearance-none cursor-pointer">
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatUah(a.balance)})</option>)}
                      </select>
                    </div>
                  )}

                  {showTxForm === 'income' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">{t('toAccount')}</label>
                      <select value={txAccountId} onChange={e => setTxAccountId(e.target.value)} className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-black text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 ring-blue-500/50 appearance-none cursor-pointer">
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatUah(a.balance)})</option>)}
                      </select>
                    </div>
                  )}

                  {(showTxForm === 'transfer' || showTxForm === 'investment') && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">{showTxForm === 'investment' ? 'На інвест. рахунок' : 'На рахунок'}</label>
                      <select value={txToAccountId} onChange={e => setTxToAccountId(e.target.value)} className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-black text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 ring-blue-500/50 appearance-none cursor-pointer">
                        {accounts.filter(a => showTxForm !== 'investment' || a.isInvestment).map(a => <option key={a.id} value={a.id}>{a.name} ({formatUah(a.balance)})</option>)}
                      </select>
                      {showTxForm === 'investment' && accounts.filter(a => a.isInvestment).length === 0 && (
                        <p className="text-[10px] text-rose-500 font-bold uppercase mt-1">Позначте рахунок як інвестиційний!</p>
                      )}
                    </div>
                  )}

                  {showTxForm === 'goal' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">На яку ціль?</label>
                      {goals.length === 0 ? (
                        <div className="p-6 rounded-[20px] border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 text-center">
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-3">Спочатку створіть фінансові цілі</p>
                          <button
                            onClick={() => {
                              setShowTxForm(null);
                              setActiveTab('goals');
                            }}
                            className="px-6 py-2.5 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                          >
                            Створити ціль
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {goals.map(goal => {
                            const isSelected = txGoalId === goal.id;
                            const linkedJar = Object.values(monobankClientInfos || {}).flatMap((info: any) => info?.jars || []).find((j: any) => j.id === goal.bankAccountId);
                            const currentSaved = (linkedJar ? (linkedJar.balance / 100) : 0) + (goal.currentAmount || 0);
                            const progress = Math.min(100, Math.round((currentSaved / (goal.targetAmount || 1)) * 100));
                            
                            return (
                              <button
                                key={goal.id}
                                onClick={() => setTxGoalId(goal.id)}
                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl ${goal.color || 'bg-emerald-500'} flex items-center justify-center text-white shadow-md`}>
                                    <Target className="w-5 h-5" />
                                  </div>
                                  <div className="text-left">
                                    <div className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{goal.name}</div>
                                    <div className="text-[9px] font-bold text-zinc-400">{formatUah(currentSaved)} / {formatUah(goal.targetAmount)} ({progress}%)</div>
                                  </div>
                                </div>
                                {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {showTxForm === 'cushion' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">В який актив подушки?</label>
                      {cushionAssets.length === 0 ? (
                        <div className="p-6 rounded-[20px] border-2 border-dashed border-amber-500/30 bg-amber-500/5 text-center">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-3">Спочатку створіть активи у плануванні подушки</p>
                          <button
                            onClick={() => {
                              setShowTxForm(null);
                              setActiveTab('planning');
                              setPlanningPillar('cushion');
                              setEditingMonth(selectedMonth);
                            }}
                            className="px-6 py-2.5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                          >
                            Перейти до планування
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {cushionAssets.map(asset => {
                            const isSelected = txCushionAssetId === asset.id;
                            const progress = asset.targetAmount > 0 ? Math.min(100, (asset.amount / asset.targetAmount) * 100) : 0;
                            return (
                              <button
                                key={asset.id}
                                onClick={() => setTxCushionAssetId(asset.id)}
                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl ${asset.color} flex items-center justify-center text-white shadow-md`}>
                                    <ShieldCheck className="w-5 h-5" />
                                  </div>
                                  <div className="text-left">
                                    <div className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{asset.name}</div>
                                    <div className="text-[9px] font-bold text-zinc-400">{formatUah(asset.amount)} / {formatUah(asset.targetAmount)} ({progress.toFixed(0)}%)</div>
                                  </div>
                                </div>
                                {isSelected && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {(showTxForm === 'income' || showTxForm === 'expense' || showTxForm === 'investment') && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">Категорія</label>
                      <CategoryDropdown
                        currentCategoryId={txCategoryId}
                        categories={categories}
                        type={showTxForm as BudgetCategory['type']}
                        onSelect={(id) => {
                          setTxCategoryId(id);
                          if (id) ensureCategoryInPlan(id, txDate.slice(0, 7));
                        }}
                        onAdd={(name, type, color) => onCreateCategory(name, type, color, txDate.slice(0, 7))}
                        monthlyPlans={monthlyPlans}
                        month={txDate.slice(0, 7)}
                        placeholder="-- Оберіть категорію --"
                        className="w-full"
                      />
                    </div>
                  )}

                  <div className={showTxForm === 'transfer' ? 'md:col-span-2 space-y-2' : 'space-y-2'}>
                    <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">Примітка</label>
                    <input type="text" value={txNote} onChange={e => setTxNote(e.target.value)} className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-black text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 ring-blue-500/50" placeholder="Опціонально..." />
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleAddTx}
                    disabled={isSaving}
                    className="px-10 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[24px] font-black shadow-xl hover:scale-105 transition-all active:scale-95 uppercase tracking-widest text-[12px] disabled:opacity-50"
                  >
                    {isSaving ? 'ЗБЕРЕЖЕННЯ...' : t('saveTransaction')}
                  </button>
                </div>
              </div>
            )}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Debt Undo Toast */}
    <AnimatePresence>
      {showDebtUndoToast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[var(--z-overlay)] w-full max-w-xs"
        >
          <div className="bg-rose-900 dark:bg-rose-950 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-rose-200/80">Борг видалено</div>
                <div className="text-xs font-bold truncate max-w-[120px]">{lastDeletedDebt?.name || 'Без назви'}</div>
              </div>
            </div>
            <button
              onClick={() => lastDeletedDebt && onUndoDeleteDebt(lastDeletedDebt)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-rose-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Відмінити
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Monthly Detail Modal - Restored and Localized */}
    <AnimatePresence>
      {editingMonth && (
        <div className="fixed inset-0 !z-[999999] md:flex md:items-center md:justify-center bg-zinc-950/90 backdrop-blur-2xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingMonth(null)}
            className="absolute inset-0 cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="relative w-full md:max-w-5xl h-[100dvh] md:h-auto md:max-h-[85vh] !bg-zinc-50 dark:!bg-zinc-900 rounded-none md:rounded-[40px] shadow-2xl border-none md:border md:border-zinc-200 md:dark:border-white/10 overflow-hidden flex flex-col !z-[100001]"
          >
            <MonthlyDetailView
              onDeleteBudgetTx={onDeleteBudgetTx}
              editingMonth={editingMonth}
              monthlyPlans={monthlyPlans}
              categories={categories}
              transactions={transactions || []}
              planningPillar={planningPillar}
              setPlanningPillar={setPlanningPillar}
              setEditingMonth={setEditingMonth}
              formatGlobal={formatGlobal}
              userId={userId}
              exchangeRates={exchangeRates}
              pillarStats={pillarStats}
              targetPercents={targetPercents}
              onAddCategory={onCreateCategory}
              globalCurrency={globalCurrency}
              setMonthlyPlans={setMonthlyPlans}
              onDeleteCategory={onDeleteCategory}
              language={language}
              t={t}
              handleUpdateTxCategory={handleUpdateTxCategory}
              onUpdatePillarPercent={handlePillarPercentChange}
              setConfirmModal={setConfirmModal}
              chartIdPrefix="modal-"
              totalOverallDebt={totalOverallDebt}
              totalRepaymentMonthly={totalRepaymentMonthly}
              aiDebtAdvice={aiDebtAdvice}
              debtTargetDate={debtTargetDate}
              setDebtTargetDate={setDebtTargetDate}
              debtSubTab={debtSubTab}
              setDebtSubTab={setDebtSubTab}
              blackCardAcc={blackCardAcc}
              debtStats={debtStats}
              debts={debts}
              setShowTxForm={setShowTxForm}
              setTxAccountId={setTxAccountId}
              setTxCategoryId={setTxCategoryId}
              setTxAmount={setTxAmount}
              setTxNote={setTxNote}
              accounts={accounts}
              setShowDebtForm={setShowDebtForm}
              setEditingDebt={setEditingDebt}
              setDebtName={setDebtName}
              setDebtAmount={setDebtAmount}
              setDebtRate={setDebtRate}
              setDebtPayment={setDebtPayment}
              setDebtColor={setDebtColor}
              handleDeleteDebt={onDeleteDebt}
              txAccountId={txAccountId}
              handleSaveDebt={handleSaveDebtLocal}
              showDebtForm={showDebtForm}
              debtName={debtName}
              debtAmount={debtAmount}
              debtRate={debtRate}
              debtPayment={debtPayment}
              debtColor={debtColor}
              editingDebt={editingDebt}
              monobankClientInfos={monobankClientInfos}
              cushionLevelData={globalMetrics?.cushionLevelData}
              cushionTotal={cushionTotal}
              cushion={cushion}
              handleSaveCushion={handleSaveCushionInternal}
              analyticsStats={analyticsStats}
              cushionAssets={cushionAssets}
              onSaveCushionAsset={onSaveCushionAsset}
              onDeleteCushionAsset={onDeleteCushionAsset}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    
    {/* Background-only sync (visual pill removed as requested) */}

    <ConfirmModal
      isOpen={!!confirmDeleteAssetId}
      onClose={() => setConfirmDeleteAssetId(null)}
      onConfirm={async () => {
        if (confirmDeleteAssetId) {
          await onDeleteAsset(confirmDeleteAssetId);
          setConfirmDeleteAssetId(null);
        }
      }}
      title="Видалити майно?"
      message="Цю дію неможливо скасувати. Майно буде остаточно видалено з обліку."
      type="danger"
      t={t}
    />

    <ConfirmModal
      isOpen={!!itemToDelete}
      onClose={() => setItemToDelete(null)}
      onConfirm={() => {
        if (itemToDelete) {
          if (itemToDelete.type === 'debt') onDeleteDebt(itemToDelete.id);
          else if (itemToDelete.type === 'category') onDeleteCategory(itemToDelete.id);
          setItemToDelete(null);
        }
      }}
      title={t('confirmDelete')}
      message={itemToDelete?.type === 'debt' ? t('deleteDebtConfirm').replace('{name}', itemToDelete?.name || '') : t('deleteCategoryConfirm').replace('{name}', itemToDelete?.name || '')}
      t={t}
    />

    {/* Undo Toasts Overlay */}
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[var(--z-overlay)] space-y-3 pointer-events-none">
      <AnimatePresence>
        {showDebtUndoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="pointer-events-auto flex items-center gap-4 px-6 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-[28px] shadow-2xl border border-white/10"
          >
            <div className="p-2 bg-blue-500 rounded-xl">
              <Undo2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-50">Борг видалено</div>
              <div className="text-sm font-black">{lastDeletedDebt?.name}</div>
            </div>
            <button
              onClick={() => lastDeletedDebt && onUndoDeleteDebt(lastDeletedDebt)}
              className="ml-4 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/30"
            >
              Відмінити (10с)
            </button>
          </motion.div>
        )}

        {showCategoryUndoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="pointer-events-auto flex items-center gap-4 px-6 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-[28px] shadow-2xl border border-white/10"
          >
            <div className="p-2 bg-emerald-500 rounded-xl">
              <Undo2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-50">Категорію видалено</div>
              <div className="text-sm font-black">{lastDeletedCategory?.name}</div>
            </div>
            <button
              onClick={() => lastDeletedCategory && onUndoDeleteCategory(lastDeletedCategory)}
              className="ml-4 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/30"
            >
              Відмінити (10с)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    </div>
  );
}


const PillarPercentInput = ({ value, colorClass, onChange }: { value: number, colorClass: string, onChange: (val: number) => void }) => {
  return (
    <input
      type="number"
      className={`w-10 bg-${colorClass.split('-')[1]}-500/10 ${colorClass} rounded border-none px-1 py-0.5 text-center font-bold text-[10px] outline-none hover:bg-${colorClass.split('-')[1]}-500/20 focus:ring-1 ring-${colorClass.split('-')[1]}-500 shadow-inner`}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

const CircularProgress = ({ percent, size = 56, strokeWidth = 5, colorClass = "text-blue-500" }: { percent: number, size?: number, strokeWidth?: number, colorClass?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-zinc-100 dark:text-zinc-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${colorClass} transition-all duration-500`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-zinc-700 dark:text-zinc-300">{Math.round(percent)}%</span>
    </div>
  );
};

