import React, { useState, useRef, useEffect } from 'react';
import { Coins, Wallet, TrendingUp, Globe, Palette, LogOut, LogIn, BookOpen } from 'lucide-react';
import { Language, Currency } from '../../types';
import { TRANSLATIONS } from '../../translations';
import { CFG } from '../../constants/config';
import { Tooltip as StickTip } from '../Tooltip';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  globalCurrency: Currency;
  onCurrencyChange: (cur: Currency) => void;
  theme: string;
  onThemeChange: (theme: any) => void;
  mainTab: 'investments' | 'budget' | 'academy';
  onMainTabChange: (tab: 'investments' | 'budget' | 'academy') => void;
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
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const langBtnRef = useRef<HTMLButtonElement>(null);
  const curBtnRef = useRef<HTMLButtonElement>(null);
  const themeBtnRef = useRef<HTMLButtonElement>(null);

  const [coords, setCoords] = useState<Record<string, { top: number; left: number; width: number }>>({});

  const updateCoords = (key: string, ref: React.RefObject<HTMLButtonElement>) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords(prev => ({
        ...prev,
        [key]: {
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        }
      }));
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showLangMenu && langBtnRef.current && !langBtnRef.current.contains(target)) setShowLangMenu(false);
      if (showCurrencyMenu && curBtnRef.current && !curBtnRef.current.contains(target)) setShowCurrencyMenu(false);
      if (showThemeMenu && themeBtnRef.current && !themeBtnRef.current.contains(target)) setShowThemeMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLangMenu, showCurrencyMenu, showThemeMenu]);

  return (
    <header data-main-header className="mb-6 md:mb-8 pt-4 md:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-[var(--z-header)]">
      <div>
        <h1 className="text-xl md:text-2xl font-black mb-0.5 flex items-center gap-2 tracking-tighter italic">
          <Coins className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
          {t('appTitle')}
        </h1>
        <p className="text-[10px] md:text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest opacity-60">
          {t('appDesc')}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex gap-2 bg-zinc-200/50 dark:bg-zinc-800/50 p-1 rounded-lg overflow-x-auto no-scrollbar">
          <button
            onClick={() => onMainTabChange('budget')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              mainTab === 'budget' ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <span className="flex items-center gap-2"><Wallet className="w-4 h-4" /> {t('tabBudget')}</span>
          </button>
          <button
            onClick={() => onMainTabChange('investments')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              mainTab === 'investments' ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {t('tabInvestments')}</span>
          </button>
          <button
            onClick={() => onMainTabChange('academy')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              mainTab === 'academy' ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> {t('tabAcademy')}</span>
          </button>
        </div>
        
        <div className="relative">
          <StickTip content={t('lang')}>
            <button 
              ref={langBtnRef}
              onClick={() => { 
                const newState = !showLangMenu;
                setShowLangMenu(newState); 
                setShowCurrencyMenu(false);
                setShowThemeMenu(false);
                if (newState) updateCoords('lang', langBtnRef);
              }}
              className={`p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50 transition-colors ${showLangMenu ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Globe className="w-5 h-5" />
            </button>
          </StickTip>
          {createPortal(
            <AnimatePresence>
              {showLangMenu && (
                <>
                  <motion.div 
                    key="lang-backdrop" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowLangMenu(false)} 
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]" 
                  />
                  <motion.div 
                    key="lang-menu"
                    initial={window.innerWidth < 768 ? { x: '100%', opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ x: 0, opacity: 1, scale: 1, y: 0 }}
                    exit={window.innerWidth < 768 ? { x: '100%', opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    onClick={(e) => e.stopPropagation()}
                    className="fixed md:absolute p-4 md:p-2 bg-white dark:bg-zinc-800 rounded-l-[2.5rem] md:rounded-3xl shadow-2xl border-l md:border border-zinc-200 dark:border-zinc-700 flex flex-col gap-1 w-[280px] md:w-36 overflow-hidden h-screen md:h-auto"
                    style={{ 
                      zIndex: 9999,
                      top: window.innerWidth < 768 ? 0 : (coords.lang?.top || 0),
                      left: window.innerWidth < 768 ? 'auto' : ((coords.lang?.left || 0) + (coords.lang?.width || 0) - 144),
                      right: window.innerWidth < 768 ? 0 : 'auto',
                      position: window.innerWidth < 768 ? 'fixed' : 'absolute'
                    }}
                  >
                    <div className="md:hidden px-4 py-8 border-b border-zinc-100 dark:border-zinc-700/50 mb-4">
                      <span className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">{t('lang')}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      {(['uk', 'ru', 'en'] as Language[]).map(l => (
                        <button
                          key={l}
                          onClick={() => { onLanguageChange(l); setShowLangMenu(false); }}
                          className={`w-full flex items-center gap-4 px-6 py-5 md:py-2 rounded-2xl md:rounded-lg text-lg md:text-sm whitespace-nowrap transition-all ${language === l ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300'}`}
                        >
                          <span className="text-3xl md:text-base">{l === 'uk' ? '🇺🇦' : l === 'ru' ? '🇷🇺' : '🇺🇸'}</span>
                          <span className="font-black md:font-medium">{TRANSLATIONS[language][`lang_${l}`]}</span>
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setShowLangMenu(false)}
                      className="md:hidden mb-8 py-5 text-[12px] font-black uppercase text-zinc-400 hover:text-rose-500 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl transition-all"
                    >
                      {t('confirmCancel') || 'Закрити'}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>

        <div className="relative">
          <StickTip content={t('currency')}>
            <button 
              ref={curBtnRef}
              onClick={() => { 
                const newState = !showCurrencyMenu;
                setShowCurrencyMenu(newState); 
                setShowLangMenu(false);
                setShowThemeMenu(false);
                if (newState) updateCoords('cur', curBtnRef);
              }}
              className={`p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50 transition-colors min-w-[36px] flex items-center justify-center ${showCurrencyMenu ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <span className="text-sm font-medium">{CFG[globalCurrency]?.sym || '$'}</span>
            </button>
          </StickTip>
          {createPortal(
            <AnimatePresence>
              {showCurrencyMenu && (
                <>
                  <motion.div 
                    key="cur-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowCurrencyMenu(false)} 
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]" 
                  />
                  <motion.div 
                    key="cur-menu"
                    initial={window.innerWidth < 768 ? { x: '100%', opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ x: 0, opacity: 1, scale: 1, y: 0 }}
                    exit={window.innerWidth < 768 ? { x: '100%', opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    onClick={(e) => e.stopPropagation()}
                    className="fixed md:absolute p-4 md:p-2 bg-white dark:bg-zinc-800 rounded-l-[2.5rem] md:rounded-3xl shadow-2xl border-l md:border border-zinc-200 dark:border-zinc-700 flex flex-col gap-1 w-[280px] md:w-32 overflow-hidden h-screen md:h-auto"
                    style={{ 
                      zIndex: 9999,
                      top: window.innerWidth < 768 ? 0 : (coords.cur?.top || 0),
                      left: window.innerWidth < 768 ? 'auto' : ((coords.cur?.left || 0) + (coords.cur?.width || 0) - 128),
                      right: window.innerWidth < 768 ? 0 : 'auto',
                      position: window.innerWidth < 768 ? 'fixed' : 'absolute'
                    }}
                  >
                    <div className="md:hidden px-4 py-8 border-b border-zinc-100 dark:border-zinc-700/50 mb-4">
                      <span className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400">{t('currency')}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                       {(Object.keys(CFG) as Currency[]).map(c => (
                        <button
                          key={c}
                          onClick={() => { onCurrencyChange(c); setShowCurrencyMenu(false); }}
                          className={`w-full flex items-center gap-4 px-6 py-5 md:py-2 rounded-2xl md:rounded-lg text-lg md:text-sm whitespace-nowrap transition-all ${globalCurrency === c ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300'}`}
                        >
                          <span className="w-12 text-center font-black text-3xl md:text-lg text-blue-500">{CFG[c].sym}</span>
                          <span className="font-black md:font-medium">{c}</span>
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => setShowCurrencyMenu(false)}
                      className="md:hidden mb-8 py-5 text-[12px] font-black uppercase text-zinc-400 hover:text-rose-500 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl transition-all"
                    >
                      {t('confirmCancel') || 'Закрити'}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>

        <div className="relative">
          <StickTip content={t('theme')}>
            <button 
              ref={themeBtnRef}
              onClick={() => {
                const newState = !showThemeMenu;
                setShowThemeMenu(newState);
                setShowLangMenu(false);
                setShowCurrencyMenu(false);
                if (newState) updateCoords('theme', themeBtnRef);
              }}
              className={`p-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/50 transition-colors ${showThemeMenu ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
            >
              <Palette className="w-5 h-5" />
            </button>
          </StickTip>

          {createPortal(
            <AnimatePresence>
              {showThemeMenu && (
                <>
                  <motion.div 
                    key="theme-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowThemeMenu(false)} 
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]" 
                  />
                  <motion.div 
                    key="theme-menu"
                    initial={window.innerWidth < 768 ? { x: '100%', opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ x: 0, opacity: 1, scale: 1, y: 0 }}
                    exit={window.innerWidth < 768 ? { x: '100%', opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    onClick={(e) => e.stopPropagation()}
                    className="fixed md:absolute p-4 md:p-2 bg-white dark:bg-zinc-800 rounded-l-[2.5rem] md:rounded-3xl shadow-2xl border-l md:border border-zinc-200 dark:border-zinc-700 flex flex-col gap-1 w-[280px] md:w-52 overflow-hidden h-screen md:h-auto"
                    style={{ 
                      zIndex: 9999,
                      top: window.innerWidth < 768 ? 0 : (coords.theme?.top || 0),
                      left: window.innerWidth < 768 ? 'auto' : ((coords.theme?.left || 0) + (coords.theme?.width || 0) - 208),
                      right: window.innerWidth < 768 ? 0 : 'auto',
                      position: window.innerWidth < 768 ? 'fixed' : 'absolute'
                    }}
                  >
                    <div className="md:hidden px-4 py-6 border-b border-zinc-100 dark:border-zinc-700/50 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Палітра оформлення</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-1 p-1">
                       {[
                         { id: 'default', name: "Золотий Ранок", color: 'bg-[#f59e0b]', icon: '🌅' },
                         { id: 'ocean', name: 'Океан', color: 'bg-[#0ea5e9]', icon: '🌊' },
                         { id: 'sunset', name: 'Захід Сонця', color: 'bg-[#f97316]', icon: '🌇' },
                         { id: 'forest', name: 'Ліс', color: 'bg-[#166534]', icon: '🌲' },
                         { id: 'cyberpunk', name: 'Кіберпанк', color: 'bg-[#d946ef]', icon: '⚡' }
                       ].map(t_item => (
                         <button
                           key={t_item.id}
                           onClick={() => { onThemeChange(t_item.id as any); setShowThemeMenu(false); }}
                           className={`w-full flex items-center gap-3 px-4 py-3 md:py-2 rounded-2xl md:rounded-lg transition-all ${theme === t_item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-200'}`}
                         >
                           <div className={`w-8 h-8 md:w-5 md:h-5 rounded-full border-2 border-white/20 shadow-sm flex items-center justify-center text-[10px] md:text-[8px] ${t_item.color}`}>
                             {t_item.icon}
                           </div>
                           <span className="text-[11px] md:text-[10px] font-black uppercase tracking-tight">{t_item.name}</span>
                         </button>
                       ))}
                    </div>
                    <button 
                      onClick={() => setShowThemeMenu(false)}
                      className="md:hidden mt-4 mb-6 py-4 text-[10px] font-black uppercase text-zinc-400 hover:text-rose-500 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl transition-all"
                    >
                      {t('confirmCancel') || 'Скасувати'}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )}
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
