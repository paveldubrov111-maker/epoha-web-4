import React, { useState, useMemo, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { supabase } from '../supabaseClient';
import { Account, BudgetCategory, BudgetTx, Currency, Asset, MonthlyPlan, BankConnection, Goal, Cushion, Portfolio, PortfolioAsset, BitbonAllocation, Debt, Language } from '../types';
import { fmt, fmtUsd } from '../utils/format';
import { Plus, Minus, ArrowRight, Settings, PieChart, TrendingUp, TrendingDown, ShieldCheck, Shield, Crown, Star, Gem, Wallet, Trash2, Edit2, Check, X, ArrowDownUp, Home, ChevronLeft, ChevronRight, ChevronDown, Calendar, Info, RefreshCw, Sparkles, History, Search, Undo2, Landmark, CreditCard, ArrowUpRight } from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';
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
import { db, doc, setDoc, deleteDoc, onSnapshot, getDoc, writeBatch, handleFirestoreError, OperationType } from '../firebase';
import { matchCategory } from '../utils/categoryMapper';
import { getLocalizedMonths } from '../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { DebtContent } from './features/budget/DebtContent';
import { CushionContent } from './features/budget/CushionContent';
import { MonthlyDetailView } from './features/budget/MonthlyDetailView';
import { MonthPicker } from './ui/MonthPicker';
import { CategoryDropdown } from './features/budget/CategoryDropdown';
import { CATEGORY_COLORS } from '../constants/colors';


const INTERNAL_TRANSFER_PATTERNS = [
  'банка', 'jar', 'з рахунку', 'на рахунок', 'переказ між рахунками', 
  'з білої', 'на білу', 'з чорної', 'на чорну', 'переказ між',
  'з рахунку на', 'собі на', 'своїх рахунк', 'свою картк', 'власної картк', 
  'зі своєї картк', 'власну карту', 'own accounts', 'скарбничк', 'transfer from',
  'переказ від', 'переказ на', 'поповнення з', 'надіслано від', 'надіслано на',
  'зі скарбнички', 'з карти', 'на карту', 'свої кошти', 'sweeping',
  'поповнення «', 'з білої картки', 'з чорної картки', 'на банку', 'з банки'
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
  formatGlobal: (n: number, cur?: Currency | 'USD', sourceCur?: Currency) => string;
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
  onDeleteBudgetTx: (id: string, affectedAccounts?: {id: string, balance: number}[]) => Promise<void>;
  onSaveBudgetTx: (tx: Partial<BudgetTx>, affectedAccounts?: {id: string, balance: number}[]) => Promise<void>;
  language: Language;
  t: (key: string) => string;
}


interface DeletionTarget {
  id: string;
  type: 'debt' | 'category';
  name: string;
}

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Видалити", 
  cancelText = "Скасувати",
  variant = 'danger'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
  confirmText?: string; 
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info'
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[32px] border border-white/20 dark:border-zinc-800 shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto ${variant === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white text-center mb-3 uppercase tracking-tight">{title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center leading-relaxed font-medium">{message}</p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-100 transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 py-4 ${variant === 'danger' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-700'} text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-500/20 transition-all`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);


export default function Budget({ 
  userId, currentPrice, accounts, setAccounts, categories, setCategories, 
  transactions, setTransactions, assets, setAssets, formatGlobal, globalCurrency, 
  monthlyPlans, setMonthlyPlans, bbAllocations, setBbAllocations, 
  goals, setGoals, cushion, setCushion, 
  bankConnections, setBankConnections, onAddBankConnection, onDeleteBankConnection, 
  budgetProportions, setBudgetProportions, investmentBalanceOverride, setInvestmentBalanceOverride,
  portfolios, portfolioAssets, exchangeRates, globalMetrics, availableBalanceUah,
  debts, setDebts, onSaveDebt, onDeleteDebt, onUndoDeleteDebt,
  onSaveCushion, onUpdateTxCategory, onCreateCategory, onDeleteCategory, onUndoDeleteCategory,
  onSaveAccount, onDeleteAccount, onSaveGoal, onDeleteGoal, onSaveAsset, onDeleteAsset, onSyncBank,
  onSaveBudgetTx, onDeleteBudgetTx,
  language, t
}: BudgetProps) {
  const localizedMonths = useMemo(() => getLocalizedMonths(language), [language]);
  const locale = useMemo(() => language === 'uk' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-US', [language]);
  const chartIdSuffix = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'planning' | 'accounts' | 'analytics' | 'assets' | 'goals'>(
    () => {
      const saved = localStorage.getItem('budgetActiveTab');
      if (saved && ['dashboard', 'transactions', 'planning', 'accounts', 'analytics', 'assets', 'goals'].includes(saved)) {
        return saved as any;
      }
      return 'dashboard';
    }
  );
  const [planningMonth, setPlanningMonth] = useState(new Date().toISOString().slice(0, 7));
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
  const chartGridColor = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';

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

  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

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

  // Category Form State
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catPlanned, setCatPlanned] = useState(0);
  const [catType, setCatType] = useState<'income' | 'expense' | 'cushion' | 'investment' | 'goal'>('expense');

  // Asset Form State
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetDesc, setAssetDesc] = useState('');
  const [assetValue, setAssetValue] = useState(0);

  // Month Filter
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('budgetSelectedMonth');
    if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
    return new Date().toISOString().slice(0, 7);
  }); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(() => Number(localStorage.getItem('budgetSelectedYear')) || new Date().getFullYear());
  const [editingMonth, setEditingMonth] = useState<string | null>(() => localStorage.getItem('budgetEditingMonth')); // YYYY-MM format for detail view
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
  
  // OKX State
  const [okxApiKey, setOkxApiKey] = useState('');
  const [okxSecretKey, setOkxSecretKey] = useState('');
  const [okxPassphrase, setOkxPassphrase] = useState('');
  const [okxBalances, setOkxBalances] = useState<any[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastBalancesUpdateTime, setLastBalancesUpdateTime] = useState<string | null>(null);
  const [isSyncingBalances, setIsSyncingBalances] = useState(false);
  const [isBackgroundSyncingBalances, setIsBackgroundSyncingBalances] = useState(false);

  const addSyncLog = (msg: string) => {
    setSyncStatus(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
    console.log(`[SYNC LOG] ${msg}`);
  };
  const mergeTransactionsLocal = (newTxs: BudgetTx[]) => {
    if (!newTxs.length) return;
    setTransactions(prev => {
      const current = prev || [];
      const seen = new Set(current.map(t => t.bankTxId || t.id));
      const toAdd = newTxs.filter(t => !seen.has(t.bankTxId || t.id));
      return toAdd.length ? [...toAdd, ...current] : current;
    });
  };
  const [monobankClientInfos, setMonobankClientInfos] = useState<Record<string, any>>({});
  const [txVisibleCount, setTxVisibleCount] = useState(100);

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
                'X-Token': conn.token,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
              } 
            });
            if (res.ok) {
              const info = await res.json();
              setMonobankClientInfos(prev => ({ ...prev, [conn.id]: info }));
            }
          } catch (e) {
            console.warn(`[MONO] Client info fetch failed for ${conn.name}:`, e);
          }
        }
      };
      fetchAllInfos();
    }
  }, [bankConnections, monobankClientInfos, isSyncingBank]);

  const handleConnectMonobank = async () => {
    if (!bankToken) return;
    console.log('[BANK DEBUG] Starting connection flow...');
    setIsSyncingBank(true);
    try {
      // Note: Monobank API has CORS restrictions. In a real app, this should go through a backend proxy.
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const url = getMonobankUrl('/personal/client-info', bankToken);
      const res = await fetch(url, {
        headers: { 
          'X-Token': bankToken,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Проксі-функцію не знайдено в Supabase. Переконайтеся, що функція monobank-proxy розгорнута.');
        }
        const errText = await res.text();
        throw new Error(`Помилка Monobank (${res.status}): ${errText.slice(0, 100)}`);
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
      console.warn(`Помилка підключення: ${err instanceof Error ? err.message : String(err)}. Переконайтеся, що токен вірний.`);
    } finally {
      setIsSyncingBank(false);
    }
  };

  const handleRegisterWebhook = async (conn: BankConnection) => {
    setIsSyncingBank(true);
    addSyncLog(`[WEBHOOK] Реєстрація вебхука для ${conn.name}...`);
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const webhookUrl = `${baseUrl}/functions/v1/monobank-webhook?connId=${conn.id}`;
      
      const monobankApiUrl = getMonobankUrl('/personal/webhook', conn.token);
      const res = await fetch(monobankApiUrl, {
        method: 'POST',
        headers: { 
          'X-Token': conn.token,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY 
        },
        body: JSON.stringify({ webHookUrl: webhookUrl })
      });

      if (res.ok) {
        addSyncLog(`[WEBHOOK] Успішно активовано! Миттєва синхронізація увімкнена.`);
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
      console.warn('Заповніть усі поля: API Key, Secret Key та Passphrase');
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
        throw new Error(data.msg || 'Помилка підключення до OKX');
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
    addSyncLog('OKX: Розпочато повну синхронізацію...');

    try {
      // 0. Get Market Prices for all symbols (to estimate Funding/Savings/Trading values)
      addSyncLog('Market: Отримання актуальних цін...');
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
      addSyncLog('OKX: Отримання торгового балансу...');
      const tradingData = await fetchOkx('/api/v5/account/balance');
      
      // 2. Funding account balance
      addSyncLog('OKX: Отримання основного балансу...');
      const fundingData = await fetchOkx('/api/v5/asset/balances');

      // 3. Заробіток / Savings balance
      addSyncLog('OKX: Отримання балансу Заробіток...');
      const savingsData = await fetchOkx('/api/v5/finance/savings/balance');

      // 4. Staking / Earn balance
      addSyncLog('OKX: Отримання балансу Staking...');
      const stakingData = await fetchOkx('/api/v5/finance/staking-defl/balance');

      // 5. Open positions
      addSyncLog('OKX: Отримання відкритих позицій...');
      const positionsData = await fetchOkx('/api/v5/account/positions');

      // 6. Recent Bills and Fills (Deep fetch 2 pages for better coverage)
      addSyncLog('OKX: Отримання розширеної історії операцій...');
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
        addSyncLog(`OKX Trading: +${trading.length} активів`);
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
        addSyncLog(`OKX Funding: +${funding.length} активів`);
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
        addSyncLog(`OKX Заробіток: +${savings.length} активів`);
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
        addSyncLog(`OKX Staking: +${staking.length} активів`);
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
        addSyncLog(`OKX Активний Заробіток: +${activeEarn.length} активів`);
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
        addSyncLog(`OKX Позиції: +${positions.length} активів`);
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
            trading: 'Торговий',
            funding: 'Фінансування',
            savings: 'Заробіток',
            staking: 'Стейкінг',
            position: 'Позиція'
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
        addSyncLog(`УСПІХ: Збережено ${allAssets.length} активів OKX.`);
      }

      await setDoc(doc(db, `users/${userId}/bankConnections/${conn.id}`), {
        ...conn,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert(`OKX синхронізовано! ${allAssets.length} активів знайдено (включаючи Заробіток та Позиції).`);
    } catch (err) {
      console.error('[OKX] Sync error:', err);
      addSyncLog(`ПОМИЛКА: ${err instanceof Error ? err.message : String(err)}`);
      alert(`Помилка синхронізації OKX: ${err instanceof Error ? err.message : String(err)}`);
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
    if (!userId || !confirm('Видалити цю ціль?')) return;
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

  const buildBankTxId = (bankAccountId: string | undefined, statementId: string | number) => {
    if (!bankAccountId) return String(statementId);
    return `${bankAccountId}:${String(statementId)}`;
  };

  const syncBankConnection = async (conn: BankConnection, silent = false, specificAccountId?: string, force = false) => {
    if (!userId) return { totalNew: 0 };
    try {
      let clientData: any = null;
      // 1. Fetch current balances first to ensure Total Balance is accurate
      const lastClientFetch = lastClientInfoFetchRef.current[conn.id] || 0;
      const canUseCached = !force && !!monobankClientInfos[conn.id] && (Date.now() - lastClientFetch < 120000);
      if (canUseCached) {
        clientData = monobankClientInfos[conn.id];
      } else {
        const clientUrl = getMonobankUrl('/personal/client-info', conn.token);
        const res = await fetch(clientUrl, { 
          headers: { 
            'X-Token': conn.token,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          } 
        });
        if (res.ok) {
          clientData = await res.json();
          lastClientInfoFetchRef.current[conn.id] = Date.now();
          setMonobankClientInfos(prev => ({ ...prev, [conn.id]: clientData }));
        }
      }
      if (clientData) {
        const batch = writeBatch(db);
        let balanceUpdates = 0;

        if (!silent && clientData.accounts) {
          addSyncLog(`🔍 В Monobank знайдено ${clientData.accounts.length} рахунків:`);
          clientData.accounts.forEach((ba: any) => {
            addSyncLog(`   - [${ba.type}] ID: ${ba.id.substring(0, 8)}... (${ba.currencyCode === 980 ? 'UAH' : ba.currencyCode})`);
          });
        }

        for (const ba of clientData.accounts) {
          const linkedAppAcc = accounts.find(a => a.bankAccountId === ba.id);
          if (linkedAppAcc) {
            if (linkedAppAcc.name.toLowerCase().includes('біла') || linkedAppAcc.name.toLowerCase().includes('white')) {
              console.log(`[SYNC] Found White Card: ${linkedAppAcc.name}, balance: ${ba.balance / 100}`);
              addSyncLog(`✅ Знайдено картку: ${linkedAppAcc.name} (Баланс: ${ba.balance / 100} ₴)`);
            }
            batch.update(doc(db, `users/${userId}/accounts/${linkedAppAcc.id}`), {
              ...linkedAppAcc,
              name: linkedAppAcc.name || `${ba.type} (${ba.currencyCode})`,
              currency: linkedAppAcc.currency || (ba.currencyCode === 980 ? 'UAH' : ba.currencyCode === 840 ? 'USD' : ba.currencyCode === 978 ? 'EUR' : 'UAH'),
              balance: ba.balance / 100,
              creditLimit: ba.creditLimit / 100
            });
            balanceUpdates++;
          }
        }
        
        if (clientData.jars) {
          for (const jar of clientData.jars) {
            const linkedJarAcc = accounts.find(a => a.bankAccountId === jar.id);
            if (linkedJarAcc) {
              batch.update(doc(db, `users/${userId}/accounts/${linkedJarAcc.id}`), {
                ...linkedJarAcc,
                name: linkedJarAcc.name || jar.title || 'Банка',
                currency: linkedJarAcc.currency || (jar.currencyCode === 980 ? 'UAH' : jar.currencyCode === 840 ? 'USD' : jar.currencyCode === 978 ? 'EUR' : 'UAH'),
                balance: jar.balance / 100
              });
              balanceUpdates++;
            }
          }
        }

        if (balanceUpdates > 0) {
          try {
            await batch.commit();
          } catch (balanceErr) {
            // Non-fatal: statement sync should continue even if balance write fails transiently.
            console.warn('[SYNC] Balance upsert warning (continuing with tx sync):', balanceErr);
            addSyncLog(`⚠️ Не вдалося оновити баланси (${conn.name}), продовжуємо синхронізацію транзакцій.`);
          }
        }
      }

      // 2. Now sync transactions
      let linkedAccs = accounts.filter(a => a.bankConnectionId === conn.id && a.bankAccountId);

      // Self-healing for legacy links:
      // some accounts may have bankAccountId but missing bankConnectionId.
      if (linkedAccs.length === 0 && clientData) {
        const bankIds = new Set<string>([
          ...(Array.isArray(clientData.accounts) ? clientData.accounts.map((a: any) => a.id) : []),
          ...(Array.isArray(clientData.jars) ? clientData.jars.map((j: any) => j.id) : [])
        ]);
        const legacyLinked = accounts.filter(a => a.bankAccountId && bankIds.has(a.bankAccountId));
        if (legacyLinked.length > 0) {
          const repairBatch = writeBatch(db);
          for (const acc of legacyLinked) {
            repairBatch.update(doc(db, `users/${userId}/accounts/${acc.id}`), {
              ...acc,
              bankConnectionId: conn.id
            });
          }
          await repairBatch.commit();
          linkedAccs = legacyLinked.map(a => ({ ...a, bankConnectionId: conn.id }));
          addSyncLog(`🔧 Відновлено прив'язку для ${legacyLinked.length} рахунків (${conn.name}).`);
        }
      }

      if (specificAccountId) {
        linkedAccs = linkedAccs.filter(a => a.id === specificAccountId);
      } else {
        // Prioritize White Card (Біла) as requested by user
        linkedAccs.sort((a, b) => {
          const aIsWhite = a.name.toLowerCase().includes('біла') || a.name.toLowerCase().includes('white');
          const bIsWhite = b.name.toLowerCase().includes('біла') || b.name.toLowerCase().includes('white');
          if (aIsWhite && !bIsWhite) return -1;
          if (!aIsWhite && bIsWhite) return 1;
          return 0;
        });
      }
      
      if (linkedAccs.length === 0) {
        if (!silent) {
          addSyncLog(`ПОМИЛКА: Немає прив'язаних рахунків для підключення "${conn.name}".`);
          alert(`До підключення "${conn.name}" не прив'язано жодного локального рахунку. \n\nБудь ласка, оберіть локальний рахунок у випадаючому списку під назвою банку "${conn.name}" на цій вкладці.`);
        }
        return { totalNew: 0 };
      }

      if (!silent) {
        setSyncStatus([]); // Clear previous logs
      }
      addSyncLog(`Розпочато синхронізацію для ${linkedAccs.length} рахунків (${conn.name})...`);
      
      const unlinkedBankAccs = new Set<string>();
      let totalNewForConn = 0;
      let latestSyncedMonth: string | null = null;
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60); // Monobank limit is 31 days. 30 is safe.
      const endBuffer = now + 10; 
      const syncedIds = new Set((transactions || []).map(t => t.bankTxId).filter(Boolean));

      for (const appAcc of linkedAccs) {
        if (!appAcc.bankAccountId) continue;
        
        // Rate limit for statements: 1 call per minute per account/endpoint.
        const lastSync = lastAccountSyncTimes[appAcc.bankAccountId] || 0;
        const secondsSinceLast = Math.floor((Date.now() - lastSync) / 1000);
        
        const isWhiteCard = appAcc.name.toLowerCase().includes('біла') || appAcc.name.toLowerCase().includes('white');
        const cooldownSeconds = isWhiteCard ? 10 : 60;
        if (!force && secondsSinceLast < cooldownSeconds) {
          const wait = cooldownSeconds - secondsSinceLast;
          addSyncLog(`⚠️ Скіпнуто ${appAcc.name}: занадто часто (ще ${wait}с).`);
          continue;
        }

        if (linkedAccs.indexOf(appAcc) > 0) {
          addSyncLog(`⏳ Очікування ліміту (15с) для ${appAcc.name}...`);
          await new Promise(r => setTimeout(r, 15000));
        }

        // Update sync time
        setLastAccountSyncTimes(prev => ({ ...prev, [appAcc.bankAccountId!]: Date.now() }));

        if (!silent) {
          addSyncLog(`Отримання даних для ${appAcc.name} (ID: ${appAcc.bankAccountId.slice(0, 6)}...)...`);
        }
        
        const statements: any[] = [];
        if (force) {
          // Forced single-account sync: pull deeper history by 31-day windows.
          for (let i = 0; i < 6; i++) {
            const to = endBuffer - (i * 31 * 24 * 60 * 60);
            const from = to - (31 * 24 * 60 * 60);
            const url = getMonobankUrl(`/personal/statement/${appAcc.bankAccountId}/${from}/${to}`, conn.token);
            const res = await fetch(url, { headers: { 'X-Token': conn.token, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY } });
            if (res.status === 429) {
              addSyncLog(`⚠️ Rate Limit (429) для ${appAcc.name} на кроці ${i + 1}/6.`);
              break;
            }
            if (!res.ok) {
              addSyncLog(`❌ Помилка API ${res.status} для ${appAcc.name} (крок ${i + 1}/6)`);
              continue;
            }
            const part = await res.json();
            if (Array.isArray(part)) statements.push(...part);
            await new Promise(r => setTimeout(r, 1200));
          }
        } else {
          const url = getMonobankUrl(`/personal/statement/${appAcc.bankAccountId}/${thirtyDaysAgo}/${endBuffer}`, conn.token);
          const res = await fetch(url, { 
            headers: { 
              'X-Token': conn.token,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            } 
          });
          
          if (res.status === 429) {
            addSyncLog(`⚠️ Rate Limit (429) для ${appAcc.name}. Спробуйте через 1-2 хвилини.`);
            // If we hit 429, it's better to stop entirely for this connection to avoid further blocking
            return { totalNew: totalNewForConn, error: 'Rate limit (429)' };
          }
          if (!res.ok) {
            addSyncLog(`❌ Помилка API ${res.status} для ${appAcc.name}`);
            continue;
          }
          const part = await res.json();
          if (Array.isArray(part)) statements.push(...part);
        }

        if (!Array.isArray(statements)) {
           addSyncLog(`⚠️ Відповідь банку для ${appAcc.name} не є списком транзакцій.`);
           continue;
        }

        if (appAcc.name.toLowerCase().includes('біла') || appAcc.name.toLowerCase().includes('white')) {
          addSyncLog(`📊 [БІЛА] Отримано ${statements.length} транзакцій для аналізу.`);
        }
        addSyncLog(`📊 Отримано від банку для ${appAcc.name}: ${statements.length} записів.`);
        let sessionNew = 0;
        let sessionSkipped = 0;
        let sessionTransfers = 0;
        const legacyRawIdsForAcc = new Set(
          (transactions || [])
            .filter(t => t.accountId === appAcc.id && t.bankTxId && !String(t.bankTxId).includes(':'))
            .map(t => String(t.bankTxId))
        );

        const txToPersist: BudgetTx[] = [];

        for (const st of statements) {
          const bankTxId = buildBankTxId(appAcc.bankAccountId, st.id);
          if (syncedIds.has(bankTxId) || legacyRawIdsForAcc.has(String(st.id))) {
            sessionSkipped++;
            continue;
          }

          const newTxId = crypto.randomUUID();
          const date = new Date(st.time * 1000).toISOString().split('T')[0];
          const time = new Date(st.time * 1000).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
          const amount = Math.abs(st.amount / 100);
          
          let type: BudgetTx['type'] = st.amount > 0 ? 'income' : 'expense';
          const desc = (st.description || '').toLowerCase();
          
          // Improved transfer detection
          const isTransferMcc = st.mcc === 4829 || st.mcc === 6011;
          const matchesPattern = INTERNAL_TRANSFER_PATTERNS.some(p => desc.includes(p));
          const matchesAccountName = accounts.some(acc => acc.id !== appAcc.id && desc.includes(acc.name.toLowerCase()));
          
          if (isTransferMcc || matchesPattern || matchesAccountName) {
            type = 'transfer';
            sessionTransfers++;
          }

          const matchedCatId = matchCategory(st.description || '', categories) || null;
          const newTx: BudgetTx = {
            id: newTxId,
            type,
            date,
            time,
            amount,
            currency: appAcc.currency,
            accountId: appAcc.id,
            categoryId: matchedCatId,
            description: st.description || '',
            accountName: appAcc.name,
            bankTxId,
            isAiCategorized: matchedCatId !== null,
            isIncoming: st.amount > 0
          };

          txToPersist.push(newTx);
          syncedIds.add(bankTxId);
          sessionNew++;
          totalNewForConn++;
          const txMonth = date.slice(0, 7);
          if (!latestSyncedMonth || txMonth > latestSyncedMonth) {
            latestSyncedMonth = txMonth;
          }
        }

        if (txToPersist.length > 0) {
          // Avoid batch upsert schema-cache issues on some Supabase deployments.
          await Promise.all(txToPersist.map(tx => setDoc(doc(db, `users/${userId}/budgetTxs/${tx.id}`), tx)));
          mergeTransactionsLocal(txToPersist);
          addSyncLog(`✅ +${txToPersist.length} нових для "${appAcc.name}". (Скіпнуто: ${sessionSkipped}, Переказів: ${sessionTransfers})`);
        } else {
          addSyncLog(`ℹ️ Нових для "${appAcc.name}" не знайдено. (В базі: ${sessionSkipped}, Переказів: ${sessionTransfers})`);
        }
        
        if (linkedAccs.indexOf(appAcc) < linkedAccs.length - 1) {
          addSyncLog(`⏳ Очікування ліміту (20с) для наступного рахунку...`);
          await new Promise(r => setTimeout(r, 20000)); // Increase delay to 20s
        }
      }
      await setDoc(doc(db, `users/${userId}/bankConnections/${conn.id}`), {
        ...conn,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // UX fix: switch to the latest synced month so fresh imported txs are visible immediately.
      if (!silent && latestSyncedMonth && selectedMonth !== latestSyncedMonth) {
        setSelectedMonth(latestSyncedMonth);
        addSyncLog(`📅 Перемкнуто період на ${latestSyncedMonth}, щоб показати нові транзакції.`);
      }

      return { totalNew: totalNewForConn };
    } catch (err) {
      console.error(`[SYNC] Error for ${conn.name}:`, err);
      if (String(err).includes("mcc")) {
        addSyncLog(`⚙️ Активовано fallback форс-імпорту для Білої картки через помилку схеми.`);
        try {
          await forcePullWhiteTransactionsNow();
          return { totalNew: 1 };
        } catch (fallbackErr) {
          console.error('[SYNC] Fallback force import failed:', fallbackErr);
        }
      }
      return { totalNew: 0, error: String(err) };
    }
  };
    

  const handleSyncBank = async (conn: BankConnection) => {
    if (!userId || isSyncingBank) return;
    setIsSyncingBank(true);
        const result = await syncBankConnection(conn);
    setIsSyncingBank(false);
    if (!result.error) {
      console.log(`Синхронізацію завершено! Додано ${result.totalNew} нових транзакцій.`);
    } else {
      console.warn('Помилка синхронізації. Спробуйте пізніше.');
    }
  };

  const handleSyncAllBanks = async (silent = false, force = false, specificAccountId?: string) => {
    if (!userId || isSyncingBank || (silent && isBackgroundSyncing)) return;
    
    // Rate limit for silent sync: 2 minutes
    if (silent && !force && Date.now() - lastFullSyncTimestamp < 2 * 60 * 1000) {
      console.log('[SYNC] Skipping silent sync (rate limit - 2m)');
      return;
    }

    if (silent) setIsBackgroundSyncing(true);
    else setIsSyncingBank(true);

    if (!silent) {
      setSyncStatus([]);
      addSyncLog('Розпочато повне оновлення всіх рахунків...');
    }

    if (force) {
      // Manual force sync must not be blocked by stale cooldown timestamps.
      setLastAccountSyncTimes({});
    }
    
    try {
      const monobankConns = bankConnections.filter(c => c.type === 'monobank');
      let totalNewOverall = 0;
      
      for (const conn of monobankConns) {
        const result = await syncBankConnection(conn, silent, specificAccountId, force);
        totalNewOverall += result.totalNew;
        if (monobankConns.indexOf(conn) < monobankConns.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      setLastFullSyncTimestamp(Date.now());
      setLastSyncTime(new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      if (!silent) {
        addSyncLog(`Всі рахунки оновлено! Додано разом ${totalNewOverall} транзакцій.`);
        console.log(`Всі рахунки оновлено! Додано разом ${totalNewOverall} нових транзакцій.`);
      } else {
        addSyncLog(`📊 Фонова синхронізація завершена: +${totalNewOverall} транзакцій.`);
      }
    } catch (err) {
      console.error('[SYNC ALL] Error:', err);
      addSyncLog(`❌ ПОМИЛКА СИНХРОНІЗАЦІЇ: ${String(err)}`);
      if (!silent) {
        console.error('Під час синхронізації виникла помилка.');
      }
    } finally {
      if (silent) setIsBackgroundSyncing(false);
      else setIsSyncingBank(false);
    }
  };

  const handleSyncPrimaryWhiteCard = async () => {
    const whiteAcc = accounts.find(a =>
      !!a.bankAccountId && (
        a.name.toLowerCase().includes('біла') ||
        a.name.toLowerCase().includes('white')
      )
    );
    await handleSyncAllBanks(false, true, whiteAcc?.id);
  };

  const forcePullWhiteTransactionsNow = async () => {
    if (!userId) return;
    const whiteAcc = accounts.find(a =>
      !!a.bankAccountId && (
        a.name.toLowerCase().includes('біла') ||
        a.name.toLowerCase().includes('white')
      )
    );
    if (!whiteAcc || !whiteAcc.bankConnectionId || !whiteAcc.bankAccountId) {
      alert('Не знайдено привʼязану Білу картку для форс-імпорту.');
      return;
    }
    const conn = bankConnections.find(c => c.id === whiteAcc.bankConnectionId);
    if (!conn) return;

    setIsSyncingBank(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const allStatements: any[] = [];
      const seenStatementIds = new Set<string>();
      // Pull deeper history by 31-day windows (up to 24 months), stop early if bank returns empty repeatedly.
      let emptyWindows = 0;
      for (let i = 0; i < 24; i++) {
        const to = now - (i * 31 * 24 * 60 * 60);
        const from = to - (31 * 24 * 60 * 60);
        const url = getMonobankUrl(`/personal/statement/${whiteAcc.bankAccountId}/${from}/${to}`, conn.token);
        const res = await fetch(url, { headers: { 'X-Token': conn.token, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY } });
        if (res.status === 429) {
          addSyncLog(`⚠️ Форс-імпорт Білої: ліміт API на кроці ${i + 1}/24 (429).`);
          break;
        }
        if (!res.ok) {
          addSyncLog(`❌ Форс-імпорт Білої: API ${res.status} (крок ${i + 1}/24).`);
          continue;
        }
        const part = await res.json();
        if (Array.isArray(part) && part.length > 0) {
          emptyWindows = 0;
          for (const st of part) {
            const sid = String(st?.id || '');
            if (!sid || seenStatementIds.has(sid)) continue;
            seenStatementIds.add(sid);
            allStatements.push(st);
          }
        } else {
          emptyWindows += 1;
          // Two empty old windows in a row -> likely no older statements for this account.
          if (emptyWindows >= 2 && i >= 5) break;
        }
        await new Promise(r => setTimeout(r, 1200));
      }

      const statements = allStatements;
      if (!Array.isArray(statements) || statements.length === 0) {
        addSyncLog('ℹ️ Форс-імпорт Білої: банк не повернув транзакції.');
        return;
      }
      addSyncLog(`📦 Форс-імпорт Білої: банк повернув ${statements.length} унікальних записів (глибокий пошук).`);

      const { data: existingRows } = await supabase
        .from('budget_txs')
        .select('bank_tx_id')
        .eq('user_id', userId)
        .eq('account_id', whiteAcc.id);
      const existingBankIds = new Set((existingRows || []).map((r: any) => String(r.bank_tx_id)));

      const rows = statements
        .map((st: any) => {
          const date = new Date(st.time * 1000).toISOString().split('T')[0];
          const desc = (st.description || '').toLowerCase();
          const isTransfer = INTERNAL_TRANSFER_PATTERNS.some(p => desc.includes(p)) || st.mcc === 4829 || st.mcc === 6011;
          const type: BudgetTx['type'] = isTransfer ? 'transfer' : (st.amount > 0 ? 'income' : 'expense');
          const bankTxId = buildBankTxId(whiteAcc.bankAccountId, st.id);
          return {
            id: crypto.randomUUID(),
            user_id: userId,
            type,
            date,
            time: new Date(st.time * 1000).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
            amount: Math.abs(st.amount / 100),
            currency: whiteAcc.currency,
            account_id: whiteAcc.id,
            category_id: matchCategory(st.description || '', categories) || null,
            description: st.description || '',
            account_name: whiteAcc.name,
            bank_tx_id: bankTxId,
            is_ai_categorized: !!matchCategory(st.description || '', categories),
            is_incoming: st.amount > 0
          };
        })
        .filter((r: any) => !existingBankIds.has(String(r.bank_tx_id)));

      if (rows.length === 0) {
        addSyncLog('ℹ️ Форс-імпорт Білої: нових транзакцій не знайдено.');
        return;
      }

      const { error } = await supabase.from('budget_txs').insert(rows);
      if (error) {
        addSyncLog(`❌ Форс-імпорт Білої: ${error.message}`);
        return;
      }
      mergeTransactionsLocal(rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        date: r.date,
        time: r.time,
        amount: r.amount,
        currency: r.currency,
        accountId: r.account_id,
        categoryId: r.category_id || undefined,
        description: r.description || '',
        accountName: r.account_name || '',
        bankTxId: r.bank_tx_id || undefined,
        isAiCategorized: !!r.is_ai_categorized,
        isIncoming: !!r.is_incoming
      } as BudgetTx)));
      addSyncLog(`✅ Форс-імпорт Білої: додано ${rows.length} транзакцій.`);
      setSelectedMonth(rows[0].date.slice(0, 7));
    } finally {
      setIsSyncingBank(false);
    }
  };

  const syncBankBalancesOnly = async (silent = true) => {
    if (!userId || isSyncingBalances || isSyncingBank || (silent && isBackgroundSyncingBalances)) return;
    
    if (silent) setIsBackgroundSyncingBalances(true);
    else setIsSyncingBalances(true);

    try {
      const monobankConns = bankConnections.filter(c => c.type === 'monobank');
      for (const conn of monobankConns) {
        const lastClientFetch = lastClientInfoFetchRef.current[conn.id] || 0;
        const canUseCached = !!monobankClientInfos[conn.id] && (Date.now() - lastClientFetch < 120000);
        let clientData: any = null;
        if (canUseCached) {
          clientData = monobankClientInfos[conn.id];
        } else {
          const clientUrl = getMonobankUrl('/personal/client-info', conn.token);
          const res = await fetch(clientUrl, { 
            headers: { 
              'X-Token': conn.token,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            } 
          });
          if (!res.ok) continue;
          clientData = await res.json();
          lastClientInfoFetchRef.current[conn.id] = Date.now();
        }
        if (clientData) {
          // Cache the client info as well
          setMonobankClientInfos(prev => ({ ...prev, [conn.id]: clientData }));
          
          const batch = writeBatch(db);
          let balanceUpdates = 0;

          for (const ba of clientData.accounts) {
            const linkedAppAcc = accounts.find(a => a.bankAccountId === ba.id);
            if (linkedAppAcc) {
              batch.update(doc(db, `users/${userId}/accounts/${linkedAppAcc.id}`), {
                ...linkedAppAcc,
                balance: ba.balance / 100,
                creditLimit: ba.creditLimit / 100
              });
              balanceUpdates++;
            }
          }
          
          if (clientData.jars) {
            for (const jar of clientData.jars) {
              const linkedJarAcc = accounts.find(a => a.bankAccountId === jar.id);
              if (linkedJarAcc) {
                batch.update(doc(db, `users/${userId}/accounts/${linkedJarAcc.id}`), {
                  ...linkedJarAcc,
                  balance: jar.balance / 100
                });
                balanceUpdates++;
              }
            }
          }

          if (balanceUpdates > 0) await batch.commit();
        }
      }
      setLastBalancesUpdateTime(new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('[SYNC BALANCES] Error:', err);
      addSyncLog(`⚠️ Помилка оновлення балансів: ${String(err)}`);
    } finally {
      if (silent) setIsBackgroundSyncingBalances(false);
      else setIsSyncingBalances(false);
    }
  };

  // Periodic Sync (every 60s balance, silent full sync on focus/visibility)
  useEffect(() => {
    if (userId && bankConnections.some(c => c.type === 'monobank')) {
      // 1. Initial balance sync only (avoid immediate statement rate-limit)
      syncBankBalancesOnly(true);

      // 2. Interval (60s) for balances
      const interval = setInterval(() => {
        syncBankBalancesOnly(true);
      }, 180 * 1000);

      // 3. Tab Visibility & Window Focus triggers balance-only sync
      const handleTrigger = () => {
        if (document.visibilityState === 'visible') {
          console.log('[SYNC] Triggered by focus/visibility');
          syncBankBalancesOnly(true);
        }
      };
      
      document.addEventListener('visibilitychange', handleTrigger);
      window.addEventListener('focus', handleTrigger);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleTrigger);
        window.removeEventListener('focus', handleTrigger);
      };
    }
  }, [userId, bankConnections.length]);


  // Sync balances when switching to Dashboard or Accounts tab
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'accounts') {
      syncBankBalancesOnly(true);
    }
  }, [activeTab]);

  const syncBankHistoryInternal = async (conn: BankConnection, months = 6, silent = false) => {
    if (!userId) return { totalNew: 0 };
    let totalNewForConn = 0;
    const unlinkedBankAccs = new Set<string>();
    try {
      // 1. Get all available accounts for this connection to find unlinked ones
      const resInfo = await fetch(getMonobankUrl('/personal/client-info', conn.token), { 
        headers: { 'X-Token': conn.token, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY } 
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

      const linkedAccs = accounts.filter(a => a.bankConnectionId === conn.id && a.bankAccountId);
      if (linkedAccs.length === 0) return { totalNew: 0 };

      const syncedIds = new Set((transactions || []).map(t => t.bankTxId).filter(Boolean));
      const nowSeconds = Math.floor(Date.now() / 1000);
      
      if (!silent) addSyncLog(`Розпочато глибоку синхронізацію для ${conn.name} (${months} міс.)...`);

      for (let i = 0; i < months; i++) {
        const to = nowSeconds - (i * 30 * 24 * 60 * 60);
        const from = to - (31 * 24 * 60 * 60);
        
        if (!silent) addSyncLog(`Крок ${i+1}/${months} (${conn.name})`);

        for (const appAcc of linkedAccs) {
          const url = getMonobankUrl(`/personal/statement/${appAcc.bankAccountId}/${from}/${to}`, conn.token);
          const res = await fetch(url, { 
            headers: { 
              'X-Token': conn.token,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            } 
          });
          
          if (res.status === 429) {
            if (!silent) addSyncLog(`⚠️ Rate Limit для ${appAcc.name}. Спробуйте пізніше.`);
            return { totalNew: totalNewForConn, error: 'Rate limit' };
          }
          if (!res.ok) continue;

          const statements = await res.json();
          if (!Array.isArray(statements)) continue;

          const legacyRawIdsForAcc = new Set(
            (transactions || [])
              .filter(t => t.accountId === appAcc.id && t.bankTxId && !String(t.bankTxId).includes(':'))
              .map(t => String(t.bankTxId))
          );
          const txToPersist: BudgetTx[] = [];

          for (const st of statements) {
            const bankTxId = buildBankTxId(appAcc.bankAccountId, st.id);
            if (syncedIds.has(bankTxId) || legacyRawIdsForAcc.has(String(st.id))) continue;

            const newId = crypto.randomUUID();
            const date = new Date(st.time * 1000).toISOString().split('T')[0];
            const time = new Date(st.time * 1000).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
            const amount = Math.abs(st.amount / 100);
            let type: BudgetTx['type'] = st.amount > 0 ? 'income' : 'expense';
            
            const desc = (st.description || '').toLowerCase();
            const matchesPattern = INTERNAL_TRANSFER_PATTERNS.some(p => desc.includes(p));
            const matchesAccountName = accounts.some(acc => acc.id !== appAcc.id && desc.includes(acc.name.toLowerCase()));
            const isTransferMcc = st.mcc === 4829 || st.mcc === 6011;
            if (matchesPattern || matchesAccountName || isTransferMcc) {
              type = 'transfer';
            }

            const matchedCatId = matchCategory(st.description || '', categories) || null;

            txToPersist.push({
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
              bankTxId,
              isAiCategorized: matchedCatId !== '',
              isIncoming: st.amount > 0
            });
            syncedIds.add(bankTxId);
            totalNewForConn++;
          }
        if (txToPersist.length > 0) {
          addSyncLog(`⏳ Збереження ${txToPersist.length} транзакцій (Крок ${i+1})...`);
          await Promise.all(txToPersist.map(tx => setDoc(doc(db, `users/${userId}/budgetTxs/${tx.id}`), tx)));
          mergeTransactionsLocal(txToPersist);
          console.log(`[HISTORY] Saved ${txToPersist.length} txs for ${appAcc.name}`);
        } else {
          addSyncLog(`ℹ️ Нових транзакцій на цьому кроці не знайдено.`);
        }
        await new Promise(r => setTimeout(r, 2000));
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
    const label = months === 24 ? '2 РОКИ' : `${months} МІСЯЦІВ`;
    if (!confirm(`Це завантажить історію за ${label}. Продовжуємо?`)) return;
    
    setIsSyncingBank(true);
    setSyncStatus([]);
    const result = await syncBankHistoryInternal(conn, months);
    setIsSyncingBank(false);
    
    if (!result.error) {
      alert(`Синхронізацію історії завершено! Додано ${result.totalNew} транзакцій.`);
    } else if (result.error !== 'Rate limit') {
      alert('Помилка глибокої синхронізації.');
    }
  };

  const handleSyncAllHistory = async (months = 6) => {
    if (!userId || isSyncingBank) return;
    const label = `${months} МІСЯЦІВ`;
    if (!confirm(`Це завантажить історію за ${label} для УСІХ банків. Продовжуємо?`)) return;

    setIsSyncingBank(true);
    setSyncStatus([]);
    addSyncLog(`РОЗПОЧАТО ПОВНУ СИНХРОНІЗАЦІЮ ІСТОРІЇ (${label})...`);

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
      alert(`Глибоку синхронізацію завершено! Додано разом ${totalNewOverall} транзакцій.`);
    } catch (err) {
      console.error('[HISTORY ALL] Error:', err);
      addSyncLog(`❌ ПОМИЛКА ІСТОРІЇ: ${String(err)}`);
      alert('Під час завантаження історії виникла помилка.');
    } finally {
      setIsSyncingBank(false);
    }
  };

  // One-time reclassification of existing Monobank transactions
  const repairTransactions = async () => {
    if (!userId || isSyncingBank) return;
    setIsSyncingBank(true);
    addSyncLog('РОЗПОЧАТО РЕМОНТ ТРАНЗАКЦІЙ...');
    
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
          const { mcc, ...txWithoutMcc } = tx as any;
          toUpdate.push({ ...txWithoutMcc, type: newType, isIncoming: newIsIncoming } as BudgetTx);
        }
      }

      if (toUpdate.length > 0) {
        addSyncLog(`Знайдено ${toUpdate.length} транзакцій для виправлення.`);
        for (let i = 0; i < toUpdate.length; i += 400) {
          const chunk = toUpdate.slice(i, i + 400);
          await Promise.all(chunk.map(tx => setDoc(doc(db, `users/${userId}/budgetTxs/${tx.id}`), tx)));
          addSyncLog(`Пакет ${Math.floor(i/400) + 1} збережено (${chunk.length})...`);
        }
        alert(`Виправлено ${toUpdate.length} транзакцій!`);
      } else {
        alert('Всі транзакції виглядають коректно.');
      }
    } catch (err) {
      addSyncLog(`ПОМИЛКА РЕМОНТУ: ${String(err)}`);
    } finally {
      setIsSyncingBank(false);
    }
  };

  // Auto-run disabled: it could trigger heavy writes and interfere with bank sync.

  const [planningFilter, setPlanningFilter] = useState<string>('all');

  // Analytics Filter
  const [analyticsYear, setAnalyticsYear] = useState<string>('all');
  const [analyticsMonth, setAnalyticsMonth] = useState<string>('all');
  const [analyticsAccountId, setAnalyticsAccountId] = useState<string>('all');
  const [lastAccountSyncTimes, setLastAccountSyncTimes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('lastAccountSyncTimes');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const lastClientInfoFetchRef = useRef<Record<string, number>>({});

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
    const manualDebts = debts.reduce((sum, d) => sum + d.amount, 0);
    const usedCreditLimit = accounts.reduce((sum, a) => sum + Math.max(0, (a.creditLimit || 0) - a.balance), 0);
    return manualDebts + usedCreditLimit;
  }, [debts, accounts]);

  const aiDebtAdvice = useMemo(() => {
    if (totalOverallDebt === 0) return "У вас немає активних боргів. Чудова робота! Продовжуйте інвестувати та нарощувати капітал.";
    if (totalRepaymentMonthly > (availableBalanceUah * 0.4)) return "Ваші витрати на обслуговування боргу перевищують 40% бюджету. Це високий ризик. Рекомендуємо зосередитись на погашенні найдорожчих кредитів (метод 'лавини').";
    if ((debts || []).length > 3) return "У вас багато дрібних боргів. Спробуйте метод 'снігової кулі': закрийте найменший борг першим для психологічної перемоги та вивільнення грошового потоку.";
    return "Стан ваших боргів під контролем. Продовжуйте планово вносити платежі та намагайтеся не збільшувати кредитне навантаження.";
  }, [totalOverallDebt, totalRepaymentMonthly, debts, availableBalanceUah]);


  const yearlyStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthStr = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
      const monthTxs = (transactions || []).filter(t => t.date.startsWith(monthStr));
      const monthlyPlan = (monthlyPlans || []).find(mp => mp.id === monthStr);

      let fact = 0;
      let plan = 0;

      categories.forEach(cat => {
        if (planningFilter !== 'all' && cat.id !== planningFilter) return;
        
        // Respect the pillar filter if nothing specific is selected
        if (planningFilter === 'all') {
          if (planningPillar === 'income' && cat.type !== 'income') return;
          if (planningPillar === 'expense' && cat.type !== 'expense') return;
          if (planningPillar === 'investment' && cat.type !== 'investment') return;
          if (planningPillar === 'cushion' && (cat.type !== 'cushion' && cat.type !== 'goal')) return;
        }

        fact += monthTxs.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
        plan += monthlyPlan?.plans?.[cat.id] ?? cat.planned;
      });

      return { monthStr, monthName: localizedMonths[i], fact, plan, percent: plan > 0 ? (fact / plan) * 100 : 0 };
    });
  }, [selectedYear, transactions, categories, monthlyPlans, planningFilter, planningPillar]);

  const PILLAR_METADATA: Record<string, any> = {
    income: { label: 'Доходи', icon: TrendingUp, color: 'text-indigo-600', ringColor: 'ring-indigo-500', hoverBg: 'bg-indigo-500/5', btnBg: 'bg-indigo-600' },
    expense: { label: 'Витрати', icon: TrendingDown, color: 'text-rose-600', ringColor: 'ring-rose-500', hoverBg: 'bg-rose-500/5', btnBg: 'bg-rose-600' },
    cushion: { label: 'Подушка', icon: ShieldCheck, color: 'text-amber-600', ringColor: 'ring-amber-500', hoverBg: 'bg-amber-500/5', btnBg: 'bg-amber-600' },
    investment: { label: 'Інвестиції', icon: Gem, color: 'text-emerald-600', ringColor: 'ring-emerald-500', hoverBg: 'bg-emerald-500/5', btnBg: 'bg-emerald-600' },
    debt: { label: 'Борги', icon: Landmark, color: 'text-orange-600', ringColor: 'ring-orange-500', hoverBg: 'bg-orange-500/5', btnBg: 'bg-orange-600' },
    default: { label: 'Блок', icon: Plus, color: 'text-zinc-600', ringColor: 'ring-zinc-500', hoverBg: 'bg-zinc-500/5', btnBg: 'bg-zinc-600' }
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
    const monthStr = editingMonth || (isPlanningTab ? planningMonth : selectedMonth);
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
  }, [selectedMonth, planningMonth, activeTab, editingMonth, transactions, categories, monthlyPlans, targetPercents, accounts]);


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
          const monthStr = editingMonth || (activeTab === 'planning' ? planningMonth : selectedMonth);
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
  
  const currentMonthTxs = useMemo(() => {
    return (transactions || []).filter(tx => tx.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const latestTxMonth = useMemo(() => {
    if (!transactions || transactions.length === 0) return null;
    return transactions.reduce((max, tx) => {
      const m = (tx.date || '').slice(0, 7);
      return m > max ? m : max;
    }, '0000-00');
  }, [transactions]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let invested = 0;
    let cushion = 0;
    let goal = 0;
    currentMonthTxs.forEach(tx => {
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
  }, [currentMonthTxs]);

  const analyticsStats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalInvested = 0;
    let totalCushion = 0;
    let totalGoal = 0;
    
    const monthlyData: Record<string, { income: number, expense: number, invested: number, cushion: number, goal: number }> = {};
    const categoryData: Record<string, number> = {};
    const accountSpending: Record<string, number> = {};
    let totalTransfers = 0;
    const heatmapData: Record<number, Record<number, number>> = {};
    for(let d=0; d<7; d++) {
      heatmapData[d] = {};
      for(let h=0; h<24; h++) heatmapData[d][h] = 0;
    }

    (transactions || []).forEach(tx => {
      const txYear = tx.date.slice(0, 4);
      const txMonth = tx.date.slice(5, 7);
      
      if (analyticsYear !== 'all' && txYear !== analyticsYear) return;
      if (analyticsYear !== 'all' && analyticsMonth !== 'all' && txMonth !== analyticsMonth) return;
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
        
        if (tx.categoryId) {
          categoryData[tx.categoryId] = (categoryData[tx.categoryId] || 0) + tx.amount;
        }
      } else if (tx.type === 'investment') {
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
          categoryData['adjustment'] = (categoryData['adjustment'] || 0) + absAmount;
        }
      }

      if (tx.type === 'transfer') {
        totalTransfers += tx.amount;
      }
      
      if (tx.type === 'expense' || (tx.type === 'adjustment' && tx.amount < 0)) {
        const amt = Math.abs(tx.amount);
        accountSpending[tx.accountId] = (accountSpending[tx.accountId] || 0) + amt;
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

    const sortedCategoryList = Object.entries(categoryData)
      .map(([id, amount]) => ({
        id,
        amount,
        name: id === 'adjustment' ? 'Корекція' : categories.find(c => c.id === id)?.name || 'Інше',
        percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        color: categories.find(c => c.id === id)?.color || 'bg-zinc-500'
      }))
      .sort((a, b) => b.amount - a.amount);

    return { 
      totalIncome, totalExpense, totalInvested, totalCushion, totalGoal, 
      monthlyData, sortedMonths, categoryData, heatmapData, heatmapMax,
      avgMonthlyExpense, avgMonthlyIncome, avgMonthlySavings, currentNW,
      totalTransfers, accountSpending, sortedCategoryList
    };
  }, [transactions, analyticsYear, analyticsMonth, analyticsAccountId, totalBalance, categories, assets]);

  const cushionTotal = useMemo(() => {
    if (!cushion) return 0;
    const accountSum = (accounts || []).filter(a => cushion.linkedAccountIds?.includes(a.id)).reduce((s, a) => s + a.balance, 0);
    const jarSum = Object.values(monobankClientInfos || {}).flatMap((info: any) => info?.jars || [])
      .filter((j: any) => cushion.linkedJarIds?.includes(j.id))
      .reduce((s: number, j: any) => s + (j.balance / 100), 0) || 0;
    return accountSum + jarSum;
  }, [cushion, accounts, monobankClientInfos]);

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
    const months = cushionTotal / expense;
    
    let level = 0;
    let title = "Початківець";
    let icon = Shield;
    let color = "text-zinc-500";
    let bg = "bg-zinc-500";
    let nextGoal = expense * 1;
    let nextLabel = "1 місяць";
    
    if (months >= 12) {
      level = 4;
      title = "Фінансовий Гуру";
      icon = Crown;
      color = "text-indigo-500";
      bg = "bg-indigo-500";
      nextGoal = cushionTotal; 
      nextLabel = "Максимум";
    } else if (months >= 6) {
      level = 3;
      title = "Золотий Щит";
      icon = Star;
      color = "text-yellow-500";
      bg = "bg-yellow-500";
      nextGoal = expense * 12;
      nextLabel = "12 місяців";
    } else if (months >= 3) {
      level = 2;
      title = "Срібний Щит";
      icon = ShieldCheck;
      color = "text-slate-400";
      bg = "bg-slate-400";
      nextGoal = expense * 6;
      nextLabel = "6 місяців";
    } else if (months >= 1) {
      level = 1;
      title = "Бронзовий Щит";
      icon = Shield;
      color = "text-amber-600";
      bg = "bg-amber-600";
      nextGoal = expense * 3;
      nextLabel = "3 місяці";
    }
    
    const progressToNext = nextGoal > 0 ? Math.min(100, (cushionTotal / nextGoal) * 100) : 100;
    const isMax = level === 4;
    
    return { level, title, icon, color, bg, nextGoal, nextLabel, progressToNext, monthsSurviving: months, currentExpense: expense, isMax };
  }, [cushionTotal, analyticsStats.avgMonthlyExpense]);

  const handleAddTx = async () => {
    if (!showTxForm || !userId) return;
    if (showTxForm !== 'adjustment' && txAmount <= 0) {
      console.warn('Сума має бути більшою за 0');
      return;
    }
    
    const finalAccountId = txAccountId || 
      accounts.find(a => a.name.toLowerCase().includes('готівка') || a.name.toLowerCase().includes('cash'))?.id || 
      (accounts.length > 0 ? accounts[0].id : '');
    
    const finalToAccountId = txToAccountId || 
      accounts.find(a => a.isInvestment)?.id ||
      (accounts.length > 1 ? accounts[1].id : (accounts.length > 0 ? accounts[0].id : ''));
    
    if (!finalAccountId) {
      alert('Будь ласка, оберіть рахунок для транзакції.');
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
      note: txNote || ''
    };

    if (showTxForm === 'transfer' || showTxForm === 'investment') newTx.toAccountId = finalToAccountId;
    if (['income', 'expense', 'cushion', 'investment', 'goal'].includes(showTxForm)) {
      if (!txCategoryId && showTxForm !== 'investment') {
        console.warn('Будь ласка, оберіть категорію');
        return;
      }
      newTx.categoryId = txCategoryId;
    }

    const affectedAccounts: {id: string, balance: number}[] = [];
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

    try {
      await onSaveBudgetTx(newTx, affectedAccounts);
      
      // Повідомлення в Telegram (опціонально, можна винести в App.tsx пізніше)
      try {
        const cat = categories.find(c => c.id === newTx.categoryId);
        const acc = accounts.find(a => a.id === newTx.accountId);
        const msg = `🆕 *Нова транзакція*\n\n` +
                    `📌 *Тип:* ${newTx.type === 'income' ? '📈 Дохід' : newTx.type === 'expense' ? '📉 Витрата' : newTx.type === 'investment' ? '💰 Інвестиція' : '🔄 Переказ'}\n` +
                    `💵 *Сума:* ${newTx.amount?.toLocaleString()} UAH\n` +
                    `📂 *Категорія:* ${cat?.name || 'Без категорії'}\n` +
                    `🏦 *Рахунок:* ${acc?.name || 'Невідомо'}\n` +
                    `${newTx.note ? `📝 *Примітка:* ${newTx.note}` : ''}`;
        
        await supabase.functions.invoke('telegram-notify', { body: { message: msg } });
      } catch (e) {}

      setShowTxForm(null);
      setTxAmount(0);
      setTxNote('');
      setTxCategoryId('');
      setTxAmount(0);
      setTxNote('');
    } catch (err) {
      console.error('Failed to add transaction:', err);
      console.warn('Помилка збереження транзакції');
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

    if (!confirm(`Видалити транзакцію "${tx.description || tx.note || 'Без опису'}"?`)) return;

    const affectedAccounts: {id: string, balance: number}[] = [];
    const fromAcc = accounts.find(a => a.id === tx.accountId);
    
    if (fromAcc) {
      let newBalance = fromAcc.balance;
      if (['expense', 'investment', 'transfer', 'cushion', 'goal'].includes(tx.type)) {
        newBalance += tx.amount;
      } else if (tx.type === 'income') {
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
      await onDeleteBudgetTx(id, affectedAccounts);
    } catch (error) {
      console.error('Error deleting transaction:', error);
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
          isInvestment: accIsInvestment 
        };
        await setDoc(doc(db, `users/${userId}/accounts/${newAcc.id}`), newAcc);
      } else {
        const existing = accounts.find(a => a.id === editingAcc);
        if (existing) {
          await setDoc(doc(db, `users/${userId}/accounts/${editingAcc}`), { 
            ...existing, 
            name: accName, 
            balance: accBalance, 
            isInvestment: accIsInvestment 
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

  const formatUah = (n: number) => fmt(n, 'UAH');

  const portfolioStats = useMemo(() => {
    let totalPortfoliosUsd = 0;
    
    // Create a dictionary to track individual portfolios dynamically based on user data
    const portfoliosData: Record<string, { name: string, type: string, valueUsd: number }> = {};
    
    if (portfolios) {
      portfolios.forEach(p => {
        portfoliosData[p.id] = { name: p.name, type: p.type, valueUsd: 0 };
      });
    }

    if (portfolioAssets && portfolios) {
      portfolioAssets.forEach(a => {
        const port = portfolios.find(p => p.id === a.portfolioId);
        if (!port) return;
        // Skip bitbon assets from portfolioAssets — we use globalMetrics for bitbon
        if (port.type === 'bitbon') return;
        
        const price = a.currentPrice || a.averagePrice || 0;
        const valueUsd = a.amount * price;

        if (portfoliosData[port.id]) {
          portfoliosData[port.id].valueUsd += valueUsd;
        }
        totalPortfoliosUsd += valueUsd;
      });
    }

    // Use globalMetrics for Bitbon value (portfolio.tokens * livePrice)
    if (globalMetrics?.bitbonValueUsd > 0) {
      const bitbonPortfolio = portfolios?.find(p => p.type === 'bitbon');
      if (bitbonPortfolio && portfoliosData[bitbonPortfolio.id]) {
        portfoliosData[bitbonPortfolio.id].valueUsd = globalMetrics.bitbonValueUsd;
      }
      totalPortfoliosUsd += globalMetrics.bitbonValueUsd;
    }

    const rate = exchangeRates?.['UAH'] || 41.5;
    
    const activePortfolios = Object.values(portfoliosData)
      .map(p => ({
         name: p.name,
         type: p.type,
         valueUah: p.valueUsd * rate,
      }));
    
    return { 
      activePortfolios,
      totalPortfoliosUah: totalPortfoliosUsd * rate 
    };
  }, [portfolios, portfolioAssets, currentPrice, exchangeRates, globalMetrics]);



  const totalCapital = totalBalance + portfolioStats.totalPortfoliosUah;
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 md:p-6 shadow-sm">
      
      {/* Top Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Дашборд</button>
        <button onClick={() => setActiveTab('transactions')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Транзакції</button>
        <button onClick={() => setActiveTab('planning')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'planning' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>План</button>
        <button onClick={() => setActiveTab('accounts')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'accounts' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Рахунки</button>
        <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Аналітика</button>
        <button onClick={() => setActiveTab('goals')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'goals' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Цілі</button>
        <button onClick={() => setActiveTab('assets')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'assets' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>Облік майна</button>
      </div>

      <AnimatePresence mode="wait">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="relative mb-10 space-y-4">
              {/* Hero Capital Section */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative p-8 md:p-12 rounded-[40px] bg-gradient-to-br from-zinc-900 to-black dark:from-zinc-900 dark:to-zinc-950 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8"
              >
                {/* Isolated Background Decoration with its own overflow handling */}
                <div className="absolute inset-0 overflow-hidden rounded-[40px] pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-20 -mt-20" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -ml-20 -mb-20" />
                </div>
                
                <div className="text-center md:text-left relative z-20 w-full flex flex-col items-center md:items-start">
                  <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Капітал загальний</span>
                    <button 
                      onClick={forcePullWhiteTransactionsNow}
                      className="ml-2 p-1.5 hover:bg-white/10 rounded-full transition-colors group"
                      title="Оновити з банку"
                    >
                      <RefreshCw className={`w-3 h-3 text-zinc-500 group-hover:text-blue-400 ${isSyncingBank ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-1 flex items-baseline gap-2">
                    {formatUah(totalCapital)}
                    {isSyncingBank && <span className="text-xs font-medium text-blue-400 animate-pulse lowercase">оновлення...</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 mb-4 justify-center md:justify-start">
                    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5 backdrop-blur-sm border border-white/5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Рахунки:</span>
                      <span className="text-sm font-black text-white">{formatUah(totalBalance)}</span>
                    </div>
                    {portfolioStats.activePortfolios.map((port, idx) => {
                      let bgColor = 'bg-zinc-500/10';
                      let borderColor = 'border-zinc-500/20';
                      let textColor = 'text-zinc-400';
                      let valueColor = 'text-zinc-300';
                      
                      if (port.type === 'crypto') {
                        bgColor = 'bg-emerald-500/10'; borderColor = 'border-emerald-500/20'; textColor = 'text-emerald-400'; valueColor = 'text-emerald-300';
                      } else if (port.type === 'bitbon') {
                        bgColor = 'bg-blue-500/10'; borderColor = 'border-blue-500/20'; textColor = 'text-blue-400'; valueColor = 'text-blue-300';
                      } else if (port.type === 'alternative') {
                        bgColor = 'bg-amber-500/10'; borderColor = 'border-amber-500/20'; textColor = 'text-amber-400'; valueColor = 'text-amber-300';
                      }

                      return (
                        <div key={idx} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 backdrop-blur-sm border ${bgColor} ${borderColor}`}>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${textColor}`}>{port.name}:</span>
                          <span className={`text-sm font-black ${valueColor}`}>{formatUah(port.valueUah)}</span>
                        </div>
                      )
                    })}
                  </div>
                  {(blackCardDebt > 0 || totalUsedCredit > 0 || debts.length > 0) && (
                    <div className="flex flex-wrap items-center gap-4 mb-4 mt-1 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 backdrop-blur-sm w-fit">
                      {(blackCardDebt > 0 || totalUsedCredit > 0) && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest">Кредити (Банки):</span>
                          <span className="text-xs font-black text-rose-400">-{formatUah(blackCardDebt + totalUsedCredit)}</span>
                        </div>
                      )}
                      {debts.length > 0 && (
                        <div className="flex items-center gap-2 border-l border-rose-500/20 pl-4">
                          <span className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest">Інші борги:</span>
                          <span className="text-xs font-black text-rose-400">-{formatUah(debts.reduce((s,d) => s + d.amount, 0))}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 border-l border-rose-500/20 pl-4">
                        <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">Чиста ліквідність:</span>
                        <span className="text-xs font-black text-emerald-400">{formatUah(totalBalance - (blackCardDebt + totalUsedCredit + debts.reduce((s,d) => s + d.amount, 0)))}</span>
                      </div>
                    </div>
                  )}
                  {/* Capital Composition Chart */}
                  <div className="hidden lg:flex flex-col items-center justify-center p-6 bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 min-w-[200px] mt-2">
                    <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Склад капіталу</h4>
                    <div className="w-20 h-20 relative flex items-center justify-center">
                      <Doughnut 
                        id={`capital-composition-doughnut-${chartIdSuffix}`}
                        key={`capital-composition-doughnut-${chartIdSuffix}`}
                        data={{
                          labels: ['Банки', 'Крипто', 'Bitbon'],
                          datasets: [{
                            data: [
                              totalBalance > 0 ? totalBalance : 0.1, 
                              (globalMetrics?.cryptoValueUsd || 0) * (exchangeRates?.['UAH'] || 41.5),
                              globalMetrics?.bitbonValueUsd * (exchangeRates?.['UAH'] || 41.5) || 0
                            ],
                            backgroundColor: ['rgba(255, 255, 255, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(59, 130, 246, 0.8)'],
                            borderWidth: 0,
                          }]
                        }}
                        options={{ cutout: '75%', plugins: { legend: { display: false } }, maintainAspectRatio: true }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-center md:justify-start mt-6 relative z-[30]">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('budgetPeriod')} </span>
                    <MonthPicker 
                      value={selectedMonth} 
                      onChange={v => setSelectedMonth(v)} 
                      language={language}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 relative z-10">
                  {[
                    { type: 'income', icon: Plus, label: 'Дохід', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20' },
                    { type: 'expense', icon: Minus, label: 'Витрата', color: 'bg-red-500', shadow: 'shadow-red-500/20' },
                    { type: 'investment', icon: TrendingUp, label: 'Інвест', color: 'bg-indigo-500', shadow: 'shadow-indigo-500/20' },
                    { type: 'transfer', icon: ArrowDownUp, label: 'Переказ', color: 'bg-blue-500', shadow: 'shadow-blue-500/20' },
                    { type: 'adjustment', icon: Settings, label: 'Корекція', color: 'bg-zinc-500', shadow: 'shadow-zinc-500/20' }
                  ].map((btn) => (
                    <button 
                      key={btn.type}
                      onClick={() => {
                        setShowTxForm(btn.type as any);
                        if (btn.type === 'investment') {
                          const investAcc = accounts.find(a => a.isInvestment);
                          if (investAcc) setTxToAccountId(investAcc.id);
                          setTxAmount(0);
                          
                          // Auto-select Investment category if exists
                          const investCat = categories.find(c => c.type === 'investment' || c.name.toLowerCase().includes('інвест'));
                          if (investCat) setTxCategoryId(investCat.id);
                        }
                        if (btn.type !== 'transfer' && btn.type !== 'adjustment') {
                          setTxCategoryId(categories.find(c => c.type === btn.type)?.id || '');
                        }
                      }}
                      className={`flex flex-col items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-3xl ${btn.color} text-white shadow-lg ${btn.shadow} hover:scale-105 transition-all active:scale-95 group`}
                    >
                      <btn.icon className="w-6 h-6 mb-2 group-hover:rotate-12 transition-transform" />
                      <span className="text-[10px] md:text-[11px] font-black uppercase tracking-tight">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>



            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mt-6">
              {[
                { label: 'Доходи', val: stats.income, color: 'text-emerald-600 dark:text-emerald-400', icon: Plus, bg: 'bg-emerald-500/10', tab: 'analytics' },
                { label: 'Витрати', val: stats.expense, color: 'text-rose-600 dark:text-rose-400', icon: Minus, bg: 'bg-rose-500/10', tab: 'analytics' },
                { label: 'Кредит', val: (blackCardDebt + totalUsedCredit + debts.reduce((s,d) => s + d.amount, 0)), color: 'text-rose-500', icon: Landmark, bg: 'bg-rose-500/10', tab: 'debts' },
                { label: 'Цілі', val: stats.goal, color: 'text-teal-600 dark:text-teal-400', icon: Sparkles, bg: 'bg-teal-500/10', tab: 'goals' },
                { label: 'Інвестиції', val: stats.invested, color: 'text-purple-600 dark:text-purple-400', icon: TrendingUp, bg: 'bg-purple-500/10', tab: 'analytics' }
              ].map((item, idx) => (
                <motion.div 
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => {
                    const pillarKey = item.label === 'Доходи' ? 'income' : item.label === 'Витрати' ? 'expense' : item.label === 'Кредит' ? 'debt' : item.label === 'Інвестиції' ? 'investment' : 'expense';
                    setPlanningPillar(pillarKey as any);
                    setEditingMonth(selectedMonth);
                  }}
                  className={`glass-card hover-lift p-4 rounded-3xl border border-white/10 dark:border-zinc-800/50 shadow-xl overflow-hidden group relative cursor-pointer hover:scale-105 transition-all active:scale-95`}
                >
                  <div className={`absolute -right-2 -top-2 w-12 h-12 ${item.bg} blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex flex-col gap-2 relative z-10">
                    <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center mb-1`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{item.label}</div>
                    <div className={`text-xl font-black ${item.color} truncate`}>{formatUah(item.val)}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick Accounts Access */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="md:col-span-2 glass-card p-6 rounded-[32px] border border-white/10 dark:border-zinc-800/50 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[11px] font-black text-black dark:text-zinc-100 uppercase tracking-widest leading-none">Ваші рахунки</h4>
                    <button onClick={() => setActiveTab('accounts')} className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-widest">Всі рахунки</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {accounts.slice(0, 4).map(acc => (
                      <div key={acc.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 shadow-sm">
                             <CreditCard className="w-4 h-4" />
                           </div>
                           <div className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{acc.name}</div>
                        </div>
                        <div className="text-xs font-black text-zinc-900 dark:text-white">{formatUah(acc.balance)}</div>
                      </div>
                    ))}
                  </div>
               </div>
               
               <motion.div 
                 whileHover={{ y: -4 }}
                 onClick={() => {
                   setActiveTab('planning');
                   setPlanningPillar('cushion');
                   setEditingMonth(selectedMonth);
                 }}
                 className="glass-card p-6 rounded-[32px] border border-orange-500/10 bg-orange-500/5 shadow-sm space-y-4 cursor-pointer hover:border-orange-500/30 transition-all"
               >
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg">
                       <ShieldCheck className="w-4 h-4" />
                     </div>
                     <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Фінансова подушка</h4>
                  </div>
                  <div className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-tighter">{formatUah(cushionTotal)}</div>
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
                    Захищено для непередбачуваних обставин
                  </div>
               </motion.div>
            </div>

            {/* Unlinked Bank Accounts Notice - Only if NO accounts are linked yet */}
            {bankConnections.length > 0 && Object.keys(monobankClientInfos).length > 0 && !accounts.some(a => a.bankAccountId) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-800 dark:text-amber-400">Потрібна дія: Прив'яжіть рахунки</div>
                    <div className="text-xs text-amber-700 dark:text-amber-500/80">У вас є непідключені рахунки Monobank. Прив'яжіть їх, щоб бачити транзакції.</div>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('accounts')} 
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-500/20"
                >
                  Налаштувати
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6 rounded-[32px] border border-white/10 dark:border-zinc-800/50 shadow-xl"
              >
                <h4 className="text-[11px] font-black text-black dark:text-zinc-100 uppercase tracking-widest mb-6">Структура витрат</h4>
                <div className="h-[240px] flex justify-center">
                  {stats.expense > 0 ? (
                    <Doughnut 
                      id={`expense-structure-doughnut-${chartIdSuffix}`}
                      key={`expense-structure-doughnut-${chartIdSuffix}`}
                      data={{
                        labels: categories.filter(c => c.type === 'expense').map(c => c.name),
                        datasets: [{
                          data: (categories || []).filter(c => c.type === 'expense').map(c => (currentMonthTxs || []).filter(t => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0)),
                          backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'],
                          hoverOffset: 20,
                          borderRadius: 8,
                          spacing: 4,
                          borderWidth: 0
                        }]
                      }}
                      options={{ 
                        maintainAspectRatio: false, 
                        cutout: '70%',
                        plugins: { 
                          legend: { 
                            position: 'right', 
                            labels: { 
                              color: chartTextColor,
                              usePointStyle: true,
                              pointStyle: 'circle',
                              padding: 20,
                              font: { size: 10, weight: 'bold' } 
                            } 
                          } 
                        } 
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-sm gap-4">
                      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center opacity-50">
                        <PieChart className="w-8 h-8" />
                      </div>
                      <span className="font-bold uppercase tracking-widest text-[10px]">Немає витрат за цей місяць</span>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6 rounded-[32px] border border-white/10 dark:border-zinc-800/50 shadow-xl"
              >
                <h4 className="text-[11px] font-black text-black dark:text-zinc-100 uppercase tracking-widest mb-6">Грошовий потік</h4>
                <div className="h-[240px]">
                  <Bar 
                    id={`cash-flow-bar-${chartIdSuffix}`}
                    key={`cash-flow-bar-${chartIdSuffix}`}
                    data={{
                      labels: ['Дохід', 'Витрати', 'Подушка', 'Цілі', 'Інвестиції'],
                      datasets: [{
                        label: 'Сума (₴)',
                        data: [stats.income, stats.expense, stats.cushion, stats.goal, stats.invested],
                        backgroundColor: (context: any) => {
                          const colors = ['#10b981', '#ef4444', '#f97316', '#14b8a6', '#8b5cf6'];
                          return colors[context.dataIndex];
                        },
                        borderRadius: 12,
                        barThickness: 32
                      }]
                    }}
                    options={{ 
                      maintainAspectRatio: false, 
                      plugins: { legend: { display: false } }, 
                      scales: { 
                        y: { 
                          beginAtZero: true, 
                          grid: { color: chartGridColor },
                          ticks: {
                            color: chartTextColor,
                            font: { size: 10, weight: 'bold' },
                            callback: (v) => v + ' ₴' 
                          } 
                        },
                        x: {
                          grid: { display: false },
                          ticks: {
                            color: '#888',
                            font: { size: 10, weight: 'bold' }
                          }
                        }
                      } 
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Monthly Detail Planning View */}
        {activeTab === 'planning' && editingMonth && (
          <motion.div
            key="planning-detail"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
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
              handleSaveDebt={handleSaveDebtLocal}
              showDebtForm={showDebtForm}
              debtName={debtName}
              debtAmount={debtAmount}
              debtRate={debtRate}
              debtPayment={debtPayment}
              debtColor={debtColor}
              editingDebt={editingDebt}
              txAccountId={txAccountId}
              monobankClientInfos={monobankClientInfos}
              cushionLevelData={cushionLevelData}
              cushionTotal={cushionTotal}
              cushion={cushion}
              handleSaveCushion={handleSaveCushionInternal}
              analyticsStats={analyticsStats}
            />
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
                <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">Планування</h3>
                <MonthPicker 
                  value={planningMonth} 
                  onChange={v => setPlanningMonth(v)} 
                  language={language}
                />
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{selectedYear}</span>
                <button onClick={() => setSelectedYear(prev => prev - 1)} className="p-0.5 hover:text-blue-500 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setSelectedYear(prev => prev + 1)} className="p-0.5 hover:text-blue-500 transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Pillar Summary Cards */}
            <div className="flex justify-between items-center mb-4">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Розподіл бюджету (%)</div>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    if (!userId) return;
                    try {
                      await setDoc(doc(db, `users/${userId}`), { budgetProportions: targetPercents }, { merge: true });
                      setBudgetProportions(targetPercents);
                      alert('Пропорції успішно збережено в базі даних!');
                    } catch (e) {
                      alert('Помилка збереження: ' + e);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[11px] font-bold hover:bg-emerald-600/20 transition-all uppercase tracking-tight"
                >
                  <Check className="w-3 h-3" /> Зберегти назавжди
                </button>
                <button 
                  onClick={() => setShowAddCat(!showAddCat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all uppercase tracking-tight ${showAddCat ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20'}`}
                >
                  {showAddCat ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  {showAddCat ? 'Скасувати' : 'Додати категорію'}
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
                      const monthToEdit = isPlanningTab ? planningMonth : selectedMonth;
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
                             {formatGlobal(displayValue, undefined, 'UAH')}
                             {isPlanningTab && <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">(Ціль)</span>}
                          </div>
                        </div>
                      </div>

                      {key === 'income' && stats.plan > 0 && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">План:</span>
                          <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300">{formatGlobal(stats.plan, undefined, 'UAH')}</span>
                        </div>
                      )}
                      
                      {key !== 'income' && (
                        <>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{isPlanningTab ? 'Факт (Сьогодні):' : 'Цільовий план:'}</span>
                            <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300">
                              {isPlanningTab 
                                ? formatGlobal(stats.fact, undefined, 'UAH')
                                : (
                                  (() => {
                                    const percentageTarget = (targetPercents[key] || 0) / 100 * ((pillarStats as any).income?.plan || 0);
                                    return formatGlobal(percentageTarget > 0 ? percentageTarget : stats.plan, undefined, 'UAH');
                                  })()
                                )
                              }
                            </span>
                          </div>
                          
                          <div className="mt-2 flex justify-end">
                             <div 
                               onClick={(e) => e.stopPropagation()}
                               onMouseDown={(e) => e.stopPropagation()}
                               className={`flex items-center gap-1 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-100 dark:border-zinc-700 shadow-sm focus-within:border-blue-500/50 transition-all`}
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
                        </>
                      )}
                    </div>
                    
                    <div className={`absolute top-0 right-1 w-24 h-24 ${meta.color.replace('text-', 'bg-')}/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/10 transition-all`}></div>
                  </motion.div>
                );
              })}
            </div>

            {/* Filter & Actions */}
            <div className="flex justify-between items-center mb-6 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Фільтр:</span>
                <select 
                  value={planningFilter}
                  onChange={(e) => setPlanningFilter(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-zinc-800 dark:text-zinc-100 outline-none cursor-pointer focus:text-blue-500 transition-colors"
                >
                  <option value="all">Всі категорії</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={async () => {
                  if (!userId || !confirm('Очистити всі місячні плани на цей рік?')) return;
                  try {
                    const batch = writeBatch(db);
                    for (let i = 1; i <= 12; i++) {
                      const id = `${selectedYear}-${String(i).padStart(2, '0')}`;
                      batch.delete(doc(db, `users/${userId}/monthlyPlans/${id}`));
                    }
                    await batch.commit();
                    setMonthlyPlans([]);
                    alert('Всі плани успішно очищено');
                  } catch (e) {
                    alert('Помилка очищення: ' + e);
                  }
                }}
                className="text-[10px] font-bold text-rose-500/50 hover:text-rose-500 transition-colors uppercase tracking-widest"
              >
                Очистити рік
              </button>
            </div>

            {/* Monthly Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...yearlyStats].sort((a, b) => {
                 const currentMonthStr = new Date().toISOString().slice(0, 7);
                 if (a.monthStr === currentMonthStr) return -1;
                 if (b.monthStr === currentMonthStr) return 1;
                 return a.monthStr.localeCompare(b.monthStr);
              }).map((ms, idx) => (
                <div 
                  key={ms.monthStr} 
                  onClick={() => setEditingMonth(ms.monthStr)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-[24px] shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex gap-4 items-center">
                    <CircularProgress percent={ms.percent} colorClass={ms.percent > 100 ? 'text-red-500' : 'text-emerald-500'} />
                    <div>
                      <div className="text-xl font-black text-zinc-900 dark:text-white">{formatGlobal(ms.fact, undefined, 'UAH')}</div>
                      <div className="text-sm text-zinc-400 font-black">{formatGlobal(ms.plan, undefined, 'UAH')}</div>
                      <div className="text-[10px] text-zinc-800 dark:text-zinc-400 mt-1 font-black group-hover:text-blue-500 transition-colors uppercase tracking-tight">{ms.monthName}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <motion.div
            key="accounts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">Мої рахунки</h3>
                {lastBalancesUpdateTime && (
                   <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">
                     <div className={`w-1 h-1 rounded-full bg-emerald-500 ${isSyncingBalances ? 'animate-pulse' : ''}`} />
                     Оновлено: {lastBalancesUpdateTime}
                   </div>
                )}
              </div>
              <button onClick={() => { setEditingAcc('new'); setAccName(''); setAccBalance(0); setAccIsInvestment(false); }} className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 transition-all"><Plus className="w-4 h-4" /> Додати рахунок</button>
            </div>

            {editingAcc && (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Назва</label>
                  <input type="text" value={accName} onChange={e => setAccName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Баланс (₴)</label>
                  <input type="number" value={accBalance || ''} onChange={e => setAccBalance(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Кредитний ліміт (₴)</label>
                  <input type="number" value={accCreditLimit || ''} onChange={e => setAccCreditLimit(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" placeholder="150000" />
                </div>
                <div className="flex items-center gap-2 mb-1 px-2 pb-2">
                  <input type="checkbox" id="isInvestment" checked={accIsInvestment} onChange={e => setAccIsInvestment(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="isInvestment" className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tight cursor-pointer">Інвестиційний рахунок</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveAccount} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Зберегти</button>
                  <button onClick={() => setEditingAcc(null)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm">Скасувати</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc, idx) => {
                const isCredit = (acc.creditLimit || 0) > 0;
                const usedCredit = isCredit ? Math.max(0, (acc.creditLimit || 0) - acc.balance) : 0;
                const ownMoney = isCredit ? Math.max(0, acc.balance - (acc.creditLimit || 0)) : acc.balance;
                
                // Calculate monthly inflow (repayment)
                const monthlyInflow = transactions
                  .filter(t => t.date.startsWith(selectedMonth) && (
                    (t.accountId === acc.id && t.type === 'income') || 
                    (t.toAccountId === acc.id && (t.type === 'transfer' || t.type === 'investment'))
                  ))
                  .reduce((sum, t) => sum + t.amount, 0);

                return (
                  <motion.div 
                    key={acc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card p-5 rounded-[24px] border border-white/20 dark:border-zinc-800/50 shadow-sm transition-all hover:shadow-xl group relative overflow-hidden active:scale-95"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-full">
                        <div className="text-[10px] text-zinc-600 dark:text-white font-black uppercase tracking-widest leading-none mb-1.5">{acc.name}</div>
                        <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">
                          {formatUah(ownMoney)}
                        </div>
                        
                        {isCredit && (
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
                              <span className="text-zinc-500">Кредитний ліміт:</span>
                              <span className="text-zinc-900 dark:text-zinc-300">{formatUah(acc.creditLimit || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                              <span className="text-rose-500">Використано:</span>
                              <span className="text-rose-600 dark:text-rose-400">-{formatUah(usedCredit)}</span>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                          <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Сплата за місяць</div>
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">{formatUah(monthlyInflow)}</div>
                        </div>

                        {acc.bankAccountId && (
                          <div className="mt-3 flex items-center gap-1.5 text-[9px] text-blue-500 font-black px-2 py-1 bg-blue-500/10 rounded-full w-fit uppercase tracking-tighter shadow-inner">
                            <RefreshCw className="w-2.5 h-2.5" /> Linked to Monobank
                          </div>
                        )}
                      </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                      <button onClick={() => { 
                        setEditingAcc(acc.id); 
                        setAccName(acc.name); 
                        setAccBalance(acc.balance); 
                        setAccCreditLimit(acc.creditLimit || 0);
                        setAccIsInvestment(!!acc.isInvestment); 
                      }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteAccount(acc.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -mr-10 -mb-10 blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                  </motion.div>
                );
              })}
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
                      onClick={forcePullWhiteTransactionsNow}
                      className="px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 font-bold"
                    >
                      ФОРСУВАТИ ПОВНИЙ СИНХРОН
                    </button>
                    <button onClick={() => setSyncStatus([])} className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 font-bold uppercase">Очистити</button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-2">
                  {syncStatus.length === 0 ? (
                    <div className="text-zinc-600 italic">Логів поки немає...</div>
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
            
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowDiagnostics(!showDiagnostics)} className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-blue-500 transition-colors flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {showDiagnostics ? 'Сховати діагностику' : 'Показати діагностику'}
              </button>
            </div>
            
            {/* Bank Connections Section */}
            <div className="pt-8 mt-4 border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">Підключення</h3>
                {!showBankForm && (
                  <div className="flex gap-2">
                    <button onClick={() => { setShowBankForm(true); setBankFormType('monobank'); }} className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[11px] font-bold hover:opacity-90 transition-all uppercase tracking-tight shadow-md">
                      <Plus className="w-3 h-3" /> Monobank
                    </button>
                    <button onClick={() => { setShowBankForm(true); setBankFormType('okx'); }} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full text-[11px] font-bold hover:opacity-90 transition-all uppercase tracking-tight shadow-md">
                      <Plus className="w-3 h-3" /> OKX Біржа
                    </button>
                  </div>
                )}
              </div>

              {showBankForm && bankFormType === 'monobank' && (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[24px] border border-blue-100 dark:border-blue-900/30 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-bold mb-4 uppercase tracking-tight">Підключення Monobank</h4>
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-500 font-medium">Введіть свій персональний токен Monobank. Його можна отримати на <a href="https://api.monobank.ua/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">api.monobank.ua</a></p>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">X-Token</label>
                      <input type="password" value={bankToken} onChange={e => setBankToken(e.target.value)} placeholder="Вставте ваш токен тут..." className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50 rounded-xl text-sm outline-none focus:ring-2 ring-blue-500" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleConnectMonobank} disabled={!bankToken || isSyncingBank} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95">{isSyncingBank ? 'Підключення...' : 'Підключити'}</button>
                      <button onClick={() => setShowBankForm(false)} className="px-6 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Скасувати</button>
                    </div>
                  </div>
                </div>
              )}

              {showBankForm && bankFormType === 'okx' && (
                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-[24px] border border-indigo-100 dark:border-indigo-900/30 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-bold mb-4 uppercase tracking-tight flex items-center gap-2">
                    <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-[10px] text-white font-black">₿</span>
                    Підключення OKX Exchange
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-white/80 dark:bg-zinc-900/50 p-4 rounded-xl border border-indigo-200/50 dark:border-indigo-800/30">
                      <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase mb-2">Як отримати API ключ:</p>
                      <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Зайдіть на <a href="https://www.okx.com/account/my-api" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-bold">okx.com → API Management</a></li>
                        <li>Натисніть <strong>"Create API key"</strong></li>
                        <li>Введіть назву (наприклад, "OneSpace")</li>
                        <li>Виберіть <strong>"Read only"</strong> дозволи (без торгівлі!)</li>
                        <li>Встановіть Passphrase (запам'ятайте його)</li>
                        <li>Підтвердіть через 2FA</li>
                        <li>Скопіюйте API Key, Secret Key та Passphrase</li>
                      </ol>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">API Key</label>
                      <input type="text" value={okxApiKey} onChange={e => setOkxApiKey(e.target.value)} placeholder="Ваш API Key..." className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Secret Key</label>
                      <input type="password" value={okxSecretKey} onChange={e => setOkxSecretKey(e.target.value)} placeholder="Ваш Secret Key..." className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Passphrase</label>
                      <input type="password" value={okxPassphrase} onChange={e => setOkxPassphrase(e.target.value)} placeholder="Ваш Passphrase..." className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl text-sm outline-none focus:ring-2 ring-indigo-500" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleConnectOkx} disabled={!okxApiKey || !okxSecretKey || !okxPassphrase || isSyncingBank} className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-95">{isSyncingBank ? 'Підключення...' : 'Підключити OKX'}</button>
                      <button onClick={() => setShowBankForm(false)} className="px-6 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">Скасувати</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                {bankConnections.map(conn => (
                  <div key={conn.id} className="glass-card p-8 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-3xl ${conn.type === 'okx' ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-zinc-900 dark:bg-white'} flex items-center justify-center text-white ${conn.type === 'okx' ? '' : 'dark:text-zinc-900'} font-black text-3xl shadow-2xl relative`}>
                          {conn.type === 'okx' ? '₿' : 'M'}
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-4 border-white dark:border-zinc-900">
                             <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-1">{conn.name}</div>
                          <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest opacity-60">Останнє оновлення: {new Date(conn.updatedAt).toLocaleString('uk-UA')}</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {conn.type === 'monobank' ? (
                          <>
                            <button onClick={() => handleSyncBank(conn)} disabled={isSyncingBank} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all active:scale-95 disabled:opacity-50 shadow-sm border border-blue-500/20">
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBank ? 'animate-spin' : ''}`} /> Оновити
                            </button>
                            <button onClick={() => handleSyncBankHistory(conn, 6)} disabled={isSyncingBank} className="flex items-center gap-2 px-6 py-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all active:scale-95 disabled:opacity-50 shadow-sm border border-amber-500/20">
                              <History className="w-3.5 h-3.5" /> Історія 6 міс.
                            </button>
                            <button onClick={() => handleSyncBankHistory(conn, 24)} disabled={isSyncingBank} className="flex items-center gap-2 px-6 py-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-500 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all active:scale-95 disabled:opacity-50 shadow-sm border border-purple-500/20">
                              <Sparkles className="w-3.5 h-3.5" /> Глибока синхр. (2 роки)
                            </button>
                            <button 
                              onClick={repairTransactions} 
                              disabled={isSyncingBank} 
                              className="flex items-center gap-2 px-6 py-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-500 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all active:scale-95 disabled:opacity-50 shadow-sm border border-rose-500/20"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Виправити
                            </button>
                          </>
                        ) : conn.type === 'okx' ? (
                          <button onClick={() => handleSyncOkx(conn)} disabled={isSyncingBank} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 shadow-sm border border-indigo-500/20">
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBank ? 'animate-spin' : ''}`} /> Оновити OKX
                          </button>
                        ) : null}
                        <button onClick={() => { if (confirm(`Видалити підключення ${conn.name}?`)) onDeleteBankConnection(conn.id); }} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-full hover:bg-rose-500/20 transition-all active:scale-95 border border-rose-500/20" title="Видалити підключення">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {monobankClientInfos[conn.id] && (
                      <div className="mt-8 p-1">
                        <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6 px-1">Доступні рахунки Monobank</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {monobankClientInfos[conn.id].accounts.map((ba: any) => {
                            const linkedAppAcc = accounts.find(a => a.bankAccountId === ba.id);
                            const cardIcon = ba.type === 'platinum' ? '💎' : ba.type === 'white' ? '⚪' : '⚫';
                            return (
                              <div key={ba.id} className="flex flex-col p-5 bg-white dark:bg-zinc-900/50 rounded-[28px] border border-zinc-100 dark:border-zinc-800/50 shadow-sm transition-all hover:border-blue-500/50 group/item relative overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="text-2xl">{cardIcon}</div>
                                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{ba.type === 'black' ? 'Чорна' : ba.type === 'white' ? 'Біла' : ba.type === 'platinum' ? 'Платинум' : 'Інший'}</div>
                                </div>
                                <div className="mb-4">
                                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Баланс API</div>
                                  <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">{formatUah(ba.balance / 100)}</div>
                                </div>
                                <div>
                                  {linkedAppAcc ? (
                                    <div className="w-full text-center text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-2.5 rounded-2xl uppercase tracking-tighter border border-emerald-500/20">
                                      {linkedAppAcc.name}
                                    </div>
                                  ) : (
                                    <select 
                                      className="w-full text-[11px] font-black px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/50 outline-none focus:ring-2 ring-blue-500 transition-all cursor-pointer uppercase tracking-tight" 
                                      onChange={(e) => handleLinkAccount(ba.id, e.target.value, conn.id)} 
                                      defaultValue=""
                                    >
                                      <option value="" disabled>Прив'язати локальний рахунок...</option>
                                      {accounts.map(a => (
                                        <option key={a.id} value={a.id}>
                                          {a.name} {a.bankAccountId ? `(ID: ${a.bankAccountId.slice(0,4)}...)` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {monobankClientInfos[conn.id].jars && monobankClientInfos[conn.id].jars.length > 0 && (
                          <>
                            <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6 mt-10 px-1">Банки Monobank (Jars)</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {monobankClientInfos[conn.id].jars.map((jar: any) => {
                                const linkedJarAcc = accounts.find(a => a.bankAccountId === jar.id);
                                return (
                                  <div key={jar.id} className="flex flex-col p-5 bg-amber-50/10 dark:bg-amber-900/5 rounded-[28px] border border-amber-200/30 dark:border-amber-900/20 shadow-sm transition-all hover:border-amber-500/50 group/item relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="text-2xl">🏺</div>
                                      <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Банка</div>
                                    </div>
                                    <div className="mb-4">
                                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{jar.title}</div>
                                      <div className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">{formatUah(jar.balance / 100)}</div>
                                      {jar.goal > 0 && (
                                        <div className="mt-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Ціль: {formatUah(jar.goal / 100)}</div>
                                      )}
                                    </div>
                                    <div>
                                      {linkedJarAcc ? (
                                        <div className="w-full text-center text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-2.5 rounded-2xl uppercase tracking-tighter border border-emerald-500/20">
                                          {linkedJarAcc.name}
                                        </div>
                                      ) : (
                                        <select 
                                          className="w-full text-[11px] font-black px-4 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-amber-100/30 dark:bg-amber-900/20 outline-none focus:ring-2 ring-amber-500 transition-all cursor-pointer uppercase tracking-tight" 
                                          onChange={(e) => handleLinkAccount(jar.id, e.target.value, conn.id)} 
                                          defaultValue=""
                                        >
                                          <option value="" disabled>Прив'язати банку...</option>
                                          {accounts.filter(a => !a.bankAccountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  </div>
                ))}
                {bankConnections.length === 0 && !showBankForm && (
                  <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900/20 rounded-[32px] border-2 border-dashed border-zinc-100 dark:border-zinc-800/50">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                    </div>
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Немає підключених банків</p>
                    <p className="text-xs text-zinc-400 mt-2 font-medium">Підключіть Monobank для автоматичного обліку витрат</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
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
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">Транзакції</h3>
                {isSyncingBank && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-500 rounded-full"
                  >
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-widest leading-none">Синхронізація...</span>
                  </motion.div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSyncAllHistory(6)}
                  disabled={isSyncingBank}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-full text-[11px] font-bold hover:bg-amber-500/20 transition-all uppercase tracking-tight disabled:opacity-50"
                  title="Завантажити всі транзакції за останні півроку (може зайняти до хвилини)"
                >
                  <History className={`w-3 h-3 ${isSyncingBank ? 'animate-pulse' : ''}`} /> {isSyncingBank ? 'Синхронізація...' : 'Завантажити 6 місяців'}
                </button>
                <button
                  onClick={forcePullWhiteTransactionsNow}
                  disabled={isSyncingBank}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-bold hover:bg-blue-600/20 transition-all uppercase tracking-tight"
                  title="Оновити баланси та останні 60 днів"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingBank ? 'animate-spin' : ''}`} /> {isSyncingBank ? '...' : 'Оновити (60 днів)'}
                </button>
                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${showDiagnostics ? 'bg-zinc-800 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'}`}
                  title="Показати діагностику"
                >
                  <Search className="w-3.5 h-3.5" />
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
                      onClick={forcePullWhiteTransactionsNow}
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
                          className={`px-2 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all flex items-center gap-2 ${
                            isCooldown 
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

            <div className="flex items-center gap-2 mb-6 bg-white dark:bg-zinc-900/50 p-4 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-sm w-fit relative z-[30]">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('budgetPeriod')}</span>
              <MonthPicker 
                value={selectedMonth} 
                onChange={v => setSelectedMonth(v)} 
                language={language}
              />
            </div>

            {latestTxMonth && latestTxMonth !== selectedMonth && (
              <div className="mb-4 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between gap-3">
                <span>Є новіші транзакції у періоді {latestTxMonth}. Зараз показано {selectedMonth}.</span>
                <button
                  onClick={() => setSelectedMonth(latestTxMonth)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 transition-all text-[10px] uppercase tracking-wider"
                >
                  Показати новіші
                </button>
              </div>
            )}

            <div className="space-y-3">
              {(currentMonthTxs || []).length === 0 ? (
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
              ) : (currentMonthTxs || [])
                .sort((a,b) => {
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
                  
                  return (
                    <React.Fragment key={tx.id}>
                      {showMonthHeader && (
                        <div className="pt-6 pb-2 sticky top-[120px] z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
                          <span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">
                            {new Date(currentMonth + '-01').toLocaleString(locale, { month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.01 }}
                        className="glass-card p-4 rounded-3xl border border-white/20 dark:border-zinc-800/50 shadow-sm flex items-center justify-between group hover:border-blue-500/30 transition-all cursor-default relative"
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div className={`w-12 h-12 rounded-2xl ${cat?.color || 'bg-zinc-200 dark:bg-zinc-800'} flex items-center justify-center text-white shadow-inner relative group-hover:scale-110 transition-transform`}>
                            <Sparkles className={`w-6 h-6 ${isAi ? 'text-white' : 'opacity-40 text-black dark:text-white'}`} />
                            {isAi && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm">
                                <Sparkles className="w-2.5 h-2.5 text-white fill-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-black text-zinc-900 dark:text-white leading-tight mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{displayName}</div>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{tx.date}</span>
                               {accountLabel && (
                                 <>
                                   <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                   <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-tight">{accountLabel}</span>
                                 </>
                               )}
                               <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
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
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="text-right">
                            <div className={`text-lg font-black ${tx.type === 'transfer' ? 'text-zinc-500 dark:text-zinc-400' : (isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')} tracking-tighter`}>
                              {isIncome ? '+' : '-'}{formatUah(Math.abs(tx.amount))}
                            </div>
                            {isAi && <div className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">AI Категорія</div>}
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(tx.id); }}
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl text-zinc-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'} opacity-30 group-hover:opacity-100 transition-opacity rounded-l-3xl`} />
                      </motion.div>
                    </React.Fragment>
                  );
                })}
              
              {transactions.length > txVisibleCount && (
                <button
                  onClick={() => setTxVisibleCount(prev => prev + 100)}
                  className="w-full py-4 mt-4 bg-zinc-50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-100 dark:border-zinc-800 text-[11px] font-black text-zinc-400 uppercase tracking-widest rounded-3xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  Показати ще транзакції (+100)
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Analytics Section - shown on both Dashboard and Analytics tabs */}
        {(activeTab === 'dashboard' || activeTab === 'analytics') && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">Аналітика</h3>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                   <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Доступно для інвестування: {formatGlobal(availableBalanceUah, undefined, 'UAH')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 shadow-sm">
                <select 
                  value={analyticsYear} 
                  onChange={e => { setAnalyticsYear(e.target.value); if (e.target.value === 'all') setAnalyticsMonth('all'); }}
                  className="bg-transparent border-none text-xs font-bold text-zinc-800 dark:text-zinc-100 outline-none cursor-pointer"
                >
                  <option value="all">Всі роки</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {analyticsYear !== 'all' && (
                  <select 
                    value={analyticsMonth} 
                    onChange={e => setAnalyticsMonth(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-zinc-800 dark:text-zinc-100 outline-none cursor-pointer border-l border-zinc-200 dark:border-zinc-800 pl-2"
                  >
                    <option value="all">{language === 'uk' ? 'Всі місяці' : language === 'ru' ? 'Все месяцы' : 'All months'}</option>
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                      <option key={m} value={m}>{localizedMonths[parseInt(m)-1]}</option>
                    ))}
                  </select>
                )}
                <select 
                  value={analyticsAccountId} 
                  onChange={e => setAnalyticsAccountId(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-zinc-800 dark:text-zinc-100 outline-none cursor-pointer border-l border-zinc-200 dark:border-zinc-800 pl-2 lg:max-w-[120px]"
                >
                  <option value="all">{language === 'uk' ? 'Всі рахунки' : language === 'ru' ? 'Все счета' : 'All accounts'}</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="glass-card p-4 rounded-[24px] border border-white/20 dark:border-zinc-800/50 shadow-sm transition-all hover:scale-105">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Дохід</div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{formatUah(analyticsStats.totalIncome)}</div>
              </div>
              <div className="glass-card p-4 rounded-[24px] border border-white/20 dark:border-zinc-800/50 shadow-sm transition-all hover:scale-105">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Витрати</div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tighter">{formatUah(analyticsStats.totalExpense)}</div>
              </div>
              <div className="glass-card p-4 rounded-[24px] border border-white/20 dark:border-zinc-800/50 shadow-sm transition-all hover:scale-105">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Подушка</div>
                <div className="text-xl font-black text-orange-600 dark:text-orange-400 tracking-tighter">{formatUah(analyticsStats.totalCushion)}</div>
              </div>
              <div className="glass-card p-4 rounded-[24px] border border-white/20 dark:border-zinc-800/50 shadow-sm transition-all hover:scale-105">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Цілі</div>
                <div className="text-xl font-black text-teal-600 dark:text-teal-400 tracking-tighter">{formatUah(analyticsStats.totalGoal)}</div>
              </div>
              <div className="glass-card p-4 rounded-[24px] border border-white/20 dark:border-zinc-800/50 shadow-sm transition-all hover:scale-105 text-purple-400">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Інвестовано</div>
                <div className="text-xl font-black tracking-tighter">{formatUah(analyticsStats.totalInvested)}</div>
              </div>
              <div className="glass-card p-4 rounded-[24px] border border-white/20 dark:border-zinc-800/50 shadow-sm transition-all hover:scale-105 text-blue-400">
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Перекази</div>
                <div className="text-xl font-black tracking-tighter">{formatUah(analyticsStats.totalTransfers)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Витрати за категоріями</h4>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{analyticsStats.sortedCategoryList.length} кат.</span>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                  {analyticsStats.sortedCategoryList.map((cat, idx) => (
                    <div key={cat.id} className="group">
                      <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${cat.color} opacity-70 group-hover:scale-150 transition-transform`} />
                          <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-zinc-900 dark:text-white mr-2">{formatUah(cat.amount)}</span>
                          <span className="text-[10px] font-bold text-zinc-500">{Math.round(cat.percent)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-[1px]">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.percent}%` }}
                          transition={{ duration: 1, delay: idx * 0.05 }}
                          className={`h-full ${cat.color} rounded-full opacity-60 group-hover:opacity-100 transition-opacity`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Витрати за рахунками</h4>
                  <Wallet className="w-3 h-3 text-zinc-400" />
                </div>
                <div className="space-y-4">
                  {Object.entries(analyticsStats.accountSpending).sort((a,b) => b[1] - a[1]).map(([accId, amount], idx) => {
                    const acc = accounts.find(a => a.id === accId);
                    const percent = analyticsStats.totalExpense > 0 ? (amount / analyticsStats.totalExpense) * 100 : 0;
                    return (
                      <div key={accId} className="group">
                        <div className="flex justify-between items-end mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-sm ${acc?.color || 'bg-zinc-500'} opacity-70`} />
                            <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">{acc?.name || 'Невідомий рахунок'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-zinc-900 dark:text-white mr-2">{formatUah(amount)}</span>
                            <span className="text-[10px] font-bold text-zinc-500">{Math.round(percent)}%</span>
                          </div>
                        </div>
                        <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            className={`h-full ${acc?.color || 'bg-zinc-500'} opacity-50 group-hover:opacity-80 transition-opacity`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Динаміка</h4>
                <div className="h-[300px]">
                  <Bar 
                    id={`analytics-monthly-bar-${chartIdSuffix}`}
                    key={`analytics-monthly-bar-${chartIdSuffix}`}
                    data={{
                      labels: analyticsStats.sortedMonths,
                      datasets: [
                        { label: 'Доходи', data: analyticsStats.sortedMonths.map(m => analyticsStats.monthlyData[m].income), backgroundColor: '#10b981', borderRadius: 8 },
                        { label: 'Витрати', data: analyticsStats.sortedMonths.map(m => analyticsStats.monthlyData[m].expense), backgroundColor: '#ef4444', borderRadius: 8 }
                      ]
                    }}
                    options={{ 
                      maintainAspectRatio: false, 
                      plugins: { legend: { display: false } }, 
                      scales: { 
                        y: { 
                          beginAtZero: true, 
                          grid: { color: chartGridColor },
                          ticks: { color: chartTextColor, font: { size: 10, weight: 'bold' } }
                        }, 
                        x: { 
                          grid: { display: false },
                          ticks: { color: chartTextColor, font: { size: 10, weight: 'bold' } }
                        } 
                      } 
                    }}
                  />
                </div>
              </div>

              <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Структура витрат</h4>
                <div className="h-[300px] flex justify-center">
                  {analyticsStats.totalExpense > 0 ? (
                    <Doughnut 
                      id={`analytics-category-doughnut-${chartIdSuffix}`}
                      key={`analytics-category-doughnut-${chartIdSuffix}`}
                      data={{
                        labels: Object.keys(analyticsStats.categoryData).map(id => id === 'adjustment' ? 'Корекція' : categories.find(c => c.id === id)?.name || 'Інше'),
                        datasets: [{
                          data: Object.values(analyticsStats.categoryData),
                          backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'],
                          borderWidth: 0,
                          hoverOffset: 20
                        }]
                      }}
                      options={{ 
                        maintainAspectRatio: false, 
                        plugins: { 
                          legend: { 
                            position: 'right', 
                            labels: { 
                              color: chartTextColor,
                              boxWidth: 8, 
                              usePointStyle: true, 
                              font: { size: 10, weight: 'bold' } 
                            } 
                          } 
                        }, 
                        cutout: '70%' 
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500 text-xs font-bold uppercase tracking-widest">Немає даних</div>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Analytics: Heatmap */}
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm overflow-hidden relative group">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1.5">Карта витрат (День / Година)</h4>
                  <p className="text-[10px] text-zinc-500 font-medium">Візуалізація активності ваших витрат за часом</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest opacity-60">Мін</span>
                  <div className="flex gap-0.5">
                    {[0.1, 0.4, 0.7, 1].map(o => (
                      <div key={o} className="w-2.5 h-2.5 rounded-sm bg-rose-500" style={{ opacity: o }}></div>
                    ))}
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest opacity-60">Макс</span>
                </div>
              </div>

              <div className="relative overflow-x-auto pb-4 scrollbar-hide">
                <div className="min-w-[500px]">
                  <div className="grid grid-cols-[30px_repeat(24,1fr)] gap-1">
                    <div />
                    {[...Array(24)].map((_, h) => (
                      <div key={h} className="text-[9px] font-black text-zinc-400 text-center uppercase tracking-tighter">
                        {h%4 === 0 ? String(h).padStart(2, '0') : ''}
                      </div>
                    ))}
                    
                    {['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map((day, d) => (
                      <React.Fragment key={day}>
                        <div className="text-[9px] font-black text-zinc-950 dark:text-zinc-400 flex items-center contrast-125">{day}</div>
                        {[...Array(24)].map((_, h) => {
                          const val = analyticsStats.heatmapData[d][h];
                          const intensity = analyticsStats.heatmapMax > 0 ? val / analyticsStats.heatmapMax : 0;
                          return (
                            <motion.div 
                              key={h}
                              whileHover={{ scale: 1.2, zIndex: 20 }}
                              className="aspect-square rounded-sm relative group/cell"
                              style={{ 
                                backgroundColor: val > 0 ? 'rgb(244 63 94)' : (isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                                opacity: val > 0 ? Math.max(0.1, intensity) : 1
                              }}
                            >
                              {val > 0 && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-[9px] font-black rounded opacity-0 group-hover/cell:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none shadow-xl border border-white/10 uppercase tracking-tighter">
                                  {day}, {String(h).padStart(2, '0')}:00 &mdash; {formatUah(val)}
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
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
                onClick={() => { setEditingAsset('new'); setAssetName(''); setAssetDesc(''); setAssetValue(0); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-[11px] font-bold hover:opacity-90 transition-all uppercase tracking-tight shadow-lg"
              >
                <Plus className="w-3 h-3" /> Додати майно
              </button>
            </div>

            <div className="bg-zinc-900 dark:bg-zinc-800 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Загальна вартість майна</div>
                <div className="text-3xl font-black text-white">{formatUah((assets || []).reduce((sum, a) => sum + a.value, 0))}</div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
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
                    if (!assetName || assetValue <= 0) return;
                    const id = editingAsset === 'new' ? crypto.randomUUID() : editingAsset;
                    await setDoc(doc(db, `users/${userId}/assets/${id}`), { id, name: assetName, description: assetDesc, value: assetValue });
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
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingAsset(asset.id); setAssetName(asset.name); setAssetDesc(asset.description || ''); setAssetValue(asset.value); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={async () => { if (confirm('Видалити майно?')) await deleteDoc(doc(db, `users/${userId}/assets/${asset.id}`)); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">Фінансові цілі</h2>
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mt-1">Плануйте та досягайте більшого</p>
              </div>
              <button 
                onClick={() => {
                  setEditingGoal('new');
                  setGoalName('');
                  setGoalTarget(0);
                  setGoalDeadline('');
                  setGoalBankAccId('');
                }}
                className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[20px] font-black transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center gap-3 uppercase tracking-widest text-xs"
              >
                <Plus className="w-5 h-5" />
                Нова ціль
              </button>
            </div>

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
                const currentSaved = linkedJar ? (linkedJar.balance / 100) : 0;
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

                        {/* Calculator Info */}
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                          <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                          <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                            {progress >= 100 
                              ? "Вітаємо! Ціль досягнута ✨" 
                              : `Дійдете через ${yearsToReach > 0 ? `${yearsToReach} р. та ` : ''}${remainingMonthsToReach} міс. (при збереженні ${formatUah(monthlySavings)}/міс)`
                            }
                          </p>
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-xs"
          >
            <div className="bg-zinc-900 dark:bg-zinc-800 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Транзакція видалена</div>
                  <div className="text-xs font-bold truncate max-w-[120px]">{lastDeletedTx?.description || 'Без опису'}</div>
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
        title="Видалити транзакцію?"
        message="Ця дія безповоротно видалить транзакцію та оновить баланс вашого рахунку."
      />

      {/* Global Transaction Form */}
      <AnimatePresence>
        {showTxForm && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
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
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 p-8 rounded-[40px] border border-white/20 dark:border-zinc-800/50 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                  {showTxForm === 'income' && 'Новий дохід'}
                  {showTxForm === 'expense' && 'Нова витрата'}
                  {showTxForm === 'transfer' && 'Переказ між рахунками'}
                  {showTxForm === 'adjustment' && 'Корегування балансу'}
                  {showTxForm === 'cushion' && 'У фінансову подушку'}
                  {showTxForm === 'goal' && 'На ціль'}
                  {showTxForm === 'investment' && 'В інвестиції'}
                </h3>
                <button onClick={() => setShowTxForm(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-all"><X className="w-5 h-5" /></button>
              </div>

              {accounts.length === 0 ? (
                <div className="text-center py-12 px-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800 relative z-10">
                  <div className="text-zinc-500 mb-6 text-sm font-bold uppercase tracking-tight">У вас ще немає жодного рахунку. Створіть його спочатку!</div>
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
                    Створити рахунок
                  </button>
                </div>
              ) : (
                <div className="relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">{showTxForm === 'adjustment' ? 'Новий баланс' : 'Сума (₴)'}</label>
                      <input 
                        type="number" 
                        value={txAmount || ''} 
                        onChange={e => setTxAmount(Number(e.target.value))} 
                        className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-lg font-black text-zinc-900 dark:text-white outline-none focus:ring-2 ring-blue-500/50 transition-all" 
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">Дата</label>
                      <input 
                        type="date" 
                        value={txDate} 
                        onChange={e => setTxDate(e.target.value)} 
                        className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-black text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 ring-blue-500/50" 
                      />
                    </div>
                    
                    {showTxForm !== 'income' && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">З рахунку</label>
                        <select value={txAccountId} onChange={e => setTxAccountId(e.target.value)} className="w-full px-5 py-4 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-sm font-black text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 ring-blue-500/50 appearance-none cursor-pointer">
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatUah(a.balance)})</option>)}
                        </select>
                      </div>
                    )}
                    
                    {showTxForm === 'income' && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-zinc-950 dark:text-zinc-400 uppercase tracking-widest ml-1">На рахунок</label>
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

                    {(showTxForm === 'income' || showTxForm === 'expense' || showTxForm === 'cushion' || showTxForm === 'investment' || showTxForm === 'goal') && (
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
                      className="px-10 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[24px] font-black shadow-xl hover:scale-105 transition-all active:scale-95 uppercase tracking-widest text-[12px]"
                    >
                      Зберегти транзакцію
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
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-xs"
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
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingMonth(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <div className="h-full overflow-y-auto p-6 md:p-8 custom-scrollbar">
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
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
        title="Підтвердження видалення"
        message={`Ви впевнені, що хочете видалити ${itemToDelete?.type === 'debt' ? 'цей борг' : 'цю категорію'} "${itemToDelete?.name}"?`}
      />

      {/* Undo Toasts Overlay */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] space-y-3 pointer-events-none">
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

    <AnimatePresence>
        {(isBackgroundSyncing || isBackgroundSyncingBalances) && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[2000] pointer-events-none"
          >
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/90 dark:bg-zinc-100/90 backdrop-blur-xl rounded-full border border-white/10 dark:border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
              <div className="relative flex items-center justify-center">
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-[spin_2s_linear_infinite]" />
                <div className="absolute inset-0 bg-blue-500/30 blur-md rounded-full animate-pulse" />
              </div>
              <span className="text-[10px] font-black text-white dark:text-zinc-900 uppercase tracking-[0.2em] leading-none">
                {isBackgroundSyncing ? 'Синхронізація транзакцій' : 'Оновлення балансів'}
              </span>
              <div className="flex gap-1">
                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
