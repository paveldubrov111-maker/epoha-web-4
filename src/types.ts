export type PortfolioType = 'bitbon' | 'crypto' | 'alternative' | 'stocks';

export type Portfolio = {
  id: string;
  name: string;
  type: PortfolioType;
  createdAt: string;
  totalIncomeTokens?: number;
  totalIncomeUsd?: number;
  totalBoughtUsd?: number;
  totalSoldUsd?: number;
  updatedAt?: string;
  assets?: any[];
};

export type PortfolioAsset = {
  id: string;
  portfolioId: string;
  name: string;
  symbol?: string;
  amount: number;
  averagePrice?: number;
  currentPrice?: number;
  accountType?: string; // e.g., 'trading', 'funding', 'savings', 'staking'
  metadata?: any;
  updatedAt: string;
};

export type Asset = {
  id: string;
  name: string;
  description: string;
  value: number;
};

export type Currency = 'UAH' | 'USD' | 'EUR' | 'PLN' | 'GBP';

export type Language = 'uk' | 'ru' | 'en';

export type Transaction = {
  id: string;
  type: 'buy' | 'sell' | 'income';
  date: string;
  time?: string;
  amountUsd: number;
  priceUsd: number;
  usdRate: number;
  tokens: number;
  source?: string;
};

export type AccountType = 'cards' | 'jars' | 'goals' | 'investments' | 'savings' | 'cushion' | 'credit';

export type Account = {
  id: string;
  name: string;
  balance: number;
  currency: Currency;
  color: string;
  bankConnectionId?: string;
  bankAccountId?: string;
  isInvestment?: boolean;
  creditLimit?: number;
  type?: AccountType;
};

export type BankConnection = {
  id: string;
  type: 'monobank' | 'okx';
  token: string; // Monobank token
  name: string;
  updatedAt: string;
  apiKey?: string;      // OKX API Key
  secretKey?: string;   // OKX Secret Key
  passphrase?: string;  // OKX Passphrase
};

export type BudgetCategory = {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'cushion' | 'investment' | 'goal' | 'debt';
  color: string;
  planned: number;
  isVisible?: boolean;
  interestRate?: number;
};

export type BudgetTx = {
  id: string;
  type: 'income' | 'expense' | 'transfer' | 'adjustment' | 'investment' | 'invest' | 'cushion' | 'goal';
  date: string;
  time?: string;
  amount: number;
  currency: Currency;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  note?: string;
  description?: string; // For Monobank or extended info
  accountName?: string; // Virtual/Cached for UI
  bankTxId?: string; // For deduplication
  isAiCategorized?: boolean;
  isIncoming?: boolean;
  mcc?: number; // Monobank Merchant Category Code
  goalId?: string; // Linked goal ID for goal transactions
  cushionAssetId?: string; // Linked cushion asset ID for cushion transactions
};

export type BitbonAllocation = {
  id: string;
  service: string;
  amount: number;
  month: string; // YYYY-MM format
  note?: string;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number; // This can be initial+sum(txs) or linked to Jar
  deadline?: string;
  categoryId?: string; // Links to a budget category if needed
  bankAccountId?: string; // Linked Monobank Jar/Account ID
  color: string;
  createdAt: string;
};

export type MonthlyPlan = {
  id: string; // YYYY-MM format
  plans: Record<string, number>; // { [categoryId]: plannedAmount }
};

export type CushionAsset = {
  id: string;
  name: string;
  type: 'cash' | 'deposit' | 'bond' | 'other';
  amount: number; // Фактична сума (скільки реально вкладено)
  targetAmount: number; // Планова ціль
  interestRate: number; // annual %
  color: string;
  updatedAt: string;
};

export type Cushion = {
  id: string;
  targetAmount: number;
  monthlyContribution: number;
  linkedJarIds: string[]; // Monobank Jar IDs
  linkedAccountIds: string[]; // Internal account IDs
  assets?: CushionAsset[]; // Manual assets like Deposits, Bonds
  updatedAt: string;
};
export type PortfolioTransaction = {
  id: string;
  portfolioId: string;
  assetId: string;
  symbol: string;
  type: 'buy' | 'sell' | 'income' | 'transfer';
  amountUsd: number;
  tokens: number;
  priceUsd: number;
  usdRate?: number;
  date: string;
  time?: string;
  note?: string;
  source?: string;
  fromAssetId?: string;
  toAssetId?: string;
};

export type Debt = {
  id: string;
  name: string;
  amount: number;
  interestRate: number; // annual %
  monthlyPayment: number;
  startDate: string;
  color: string;
  createdAt: string;
};
