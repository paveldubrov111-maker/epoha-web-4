export type ContentBlock = 
  | { type: 'text'; html: string }
  | { type: 'video'; url: string; title: string; duration: string }
  | { type: 'quiz'; id: string; q: string; opts: { text: string; isCorrect: boolean; fb: string }[] }
  | { type: 'scenario'; id: string; story: string; q: string; opts: { text: string; isGood: boolean; fb: string }[] }
  | { type: 'flipcards'; cards: { front: string; back: string; icon?: string }[] }
  | { type: 'checklist'; id: string; tasks: { text: string; xp: number }[] }
  | { type: 'homework'; id: string; task: string; placeholder?: string }
  | { type: 'game'; gameId: string; data?: any }
  | { type: 'calc'; id: 'budget' | 'cushion' | 'compound' | 'portfolio' | 'debt-calc' | 'fin-strat' | 'detector'; title: string }
  | { type: 'pyramid'; items: { title: string; body: string; icon: string }[] }
  | { type: 'timeline'; items: { year: string; title: string; desc: string }[] }
  | { type: 'comparison'; items: { icon: string; title: string; features: { text: string; isPositive?: boolean; isNegative?: boolean; isWarning?: boolean }[] }[]; highlightIndex?: number }
  | { type: 'blockchain_demo'; id: string }
  | { type: 'token_demo'; asset: { name: string; value: string }; shares: number };

export interface Lesson {
  id: number;
  title: string;
  content: React.ReactNode;
  quiz?: {
    question: string;
    options: string[];
    correct: number;
  };
}

export interface Step {
  id: number;
  title: string;
  xp: number;
  blocks?: ContentBlock[];
  content?: React.ReactNode;
  quiz?: {
    question: string;
    options: string[];
    correct: number;
  };
}

export interface Module {
  id: number;
  emoji: string;
  color: string;
  title: string;
  desc: string;
  totalXP: number;
  badgeId: string;
  categoryId: 'finance' | 'digital' | 'business';
  steps: Step[];
}

export interface Badge {
  id: string;
  icon: string;
  name: string;
  desc: string;
}

export interface DailyQuestion {
  q: string;
  opts: string[];
  a: number;
  fb: string;
}

export interface UserProgress {
  userName: string;
  userEmail: string;
  track: 'full' | 'invest' | 'bitbon';
  xp: number;
  completedModules: number[];
  completedSteps: Record<number, number[]>;
  completedTasks: number;
  earnedBadges: string[];
  activeModule: number;
  activeSteps: Record<number, number>;
  hwAnswers: Record<string, any>;
  dailyDone: string;
  startDate: string;
  streak: number;
  lastVisit: string;
  onboardDone: boolean;
}

export const LEVELS = [
  { min: 0, max: 500, name: "Початківець 🌱" },
  { min: 500, max: 1200, name: "Учень 📖" },
  { min: 1200, max: 2500, name: "Практик 💼" },
  { min: 2500, max: 4500, name: "Стратег 📊" },
  { min: 4500, max: 7000, name: "Інвестор 💎" },
  { min: 7000, max: 99999, name: "Майстер капіталу 🏆" }
];

export const BADGES_DEF: Badge[] = [
  { id: 'first_step', icon: '🚀', name: 'Перший крок', desc: 'Завершено перший урок' },
  { id: 'psycho', icon: '🧠', name: 'Психолог', desc: 'Модуль Психологія' },
  { id: 'budget', icon: '📊', name: 'Бюджетмайстер', desc: 'Модуль Облік' },
  { id: 'debt_free', icon: '⚖️', name: 'Боргознищувач', desc: 'Модуль Борги' },
  { id: 'investor', icon: '📈', name: 'Інвестор', desc: 'Модуль Інвестиції' },
  { id: 'bitboner', icon: '🔷', name: 'Bitbon Pioneer', desc: 'Модуль Bitbon' },
  { id: 'digital_pioneer', icon: '🌐', name: 'Цифровий піонер', desc: 'Модуль Цифрова економіка' },
  { id: 'entrepreneur', icon: '🚀', name: 'Підприємець', desc: 'Модуль Бізнес' },
  { id: 'strategist', icon: '🎯', name: 'Стратег', desc: 'Всі 7 модулів' },
];
