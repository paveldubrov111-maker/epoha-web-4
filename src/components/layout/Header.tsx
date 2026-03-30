import React, { useState } from 'react';
import { Coins, Wallet, TrendingUp, Globe, Palette, LogOut, LogIn } from 'lucide-react';
import { Language, Currency } from '../../types';
import { TRANSLATIONS } from '../../translations';
import { CFG } from '../../constants/config';
import { Tooltip as StickTip } from '../Tooltip';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  globalCurrency: Currency;
  onCurrencyChange: (cur: Currency) => void;
  theme: string;
  onThemeChange: (theme: any) => void;
  mainTab: 'investments' | 'budget';
  onMainTabChange: (tab: 'investments' | 'budget') => void;
  userId: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  t: (key: string) => string;
}

const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  globalCurrency,
  onCurrencyChange,
  theme,
  onThemeChange,
  mainTab,
  onMainTabChange,
  userId,
  onSignIn,
  onSignOut,
  t
}) => {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);

  return (
    <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-medium mb-1 flex items-center gap-2">
          <Coins className="w-6 h-6 text-yellow-500" />
          {t('appTitle')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('appDesc')}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-2 bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-lg">
          <button
            onClick={() => onMainTabChange('budget')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mainTab === 'budget' ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <span className="flex items-center gap-2"><Wallet className="w-4 h-4" /> {t('tabBudget')}</span>
          </button>
          <button
            onClick={() => onMainTabChange('investments')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mainTab === 'investments' ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {t('tabInvestments')}</span>
          </button>
        </div>
        
        <div className="relative group">
          <StickTip content={t('lang')}>
            <button 
              onClick={() => { setShowLangMenu(!showLangMenu); setShowCurrencyMenu(false); }}
              className={`p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50 transition-colors ${showLangMenu ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Globe className="w-5 h-5" />
            </button>
          </StickTip>
          {showLangMenu && (
            <div className="absolute right-0 top-full mt-2 z-50">
              <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 flex flex-col gap-1 w-36">
                {(['uk', 'ru', 'en'] as Language[]).map(l => (
                  <button
                    key={l}
                    onClick={() => { onLanguageChange(l); setShowLangMenu(false); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${language === l ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300'}`}
                  >
                    <span>{l === 'uk' ? '🇺🇦' : l === 'ru' ? '🇷🇺' : '🇺🇸'}</span>
                    {TRANSLATIONS[language][`lang_${l}`]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative group">
          <StickTip content={t('currency')}>
            <button 
              onClick={() => { setShowCurrencyMenu(!showCurrencyMenu); setShowLangMenu(false); }}
              className={`p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50 transition-colors min-w-[36px] flex items-center justify-center ${showCurrencyMenu ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <span className="text-sm font-medium">{CFG[globalCurrency]?.sym || '$'}</span>
            </button>
          </StickTip>
          {showCurrencyMenu && (
            <div className="absolute right-0 top-full mt-2 z-50">
              <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 flex flex-col gap-1 w-32">
                {(Object.keys(CFG) as Currency[]).map(c => (
                  <button
                    key={c}
                    onClick={() => { onCurrencyChange(c); setShowCurrencyMenu(false); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${globalCurrency === c ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300'}`}
                  >
                    <span className="w-5 text-center font-medium text-zinc-400">{CFG[c].sym}</span>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative group">
          <StickTip content={t('theme')}>
            <button className="p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <Palette className="w-5 h-5" />
            </button>
          </StickTip>

          <div className="absolute right-0 top-full mt-2 p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 hidden group-hover:flex flex-col gap-1 z-50">
            {[
              { id: 'default', name: t('themeDefault'), color: 'bg-zinc-500' },
              { id: 'ocean', name: 'Океан', color: 'bg-cyan-500' },
              { id: 'sunset', name: 'Захід Сонця', color: 'bg-orange-500' },
              { id: 'forest', name: 'Ліс', color: 'bg-emerald-500' },
              { id: 'cyberpunk', name: 'Кіберпанк', color: 'bg-fuchsia-500' }
            ].map(t_item => (
              <button
                key={t_item.id}
                onClick={() => onThemeChange(t_item.id as any)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${theme === t_item.id ? 'bg-zinc-100 dark:bg-zinc-700 font-medium' : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50'}`}
              >
                <div className={`w-3 h-3 rounded-full ${t_item.color}`} />
                {t_item.name}
              </button>
            ))}
          </div>
        </div>

        {userId ? (
          <StickTip content={t('logOut')}>
            <button
              onClick={onSignOut}
              className="p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </StickTip>
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <LogIn className="w-4 h-4" />
            {t('signInBtn')}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
