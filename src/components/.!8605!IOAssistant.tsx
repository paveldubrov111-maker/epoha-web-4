import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, X, MessageSquare, Zap, Target, TrendingUp, AlertTriangle, Send, ChevronLeft, Shield, Brain, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface IOContext {
  totalCapitalUsd: number;
  totalProfitUsd: number;
  totalRoi: number;
  bitbonValueUsd: number;
  bitbonCount: number;
  cryptoValueUsd: number;
  alternativeValueUsd: number;
  activeTab: string;
  currency: string;
  usdRate: number;
  availableInvestmentUsd?: number;
  monthlyExpensesUsd?: number;
  monthlyIncomeUsd?: number;
  savingsRate?: number;
  budgetCategories?: any[];
  budgetBalanceUah?: number;
  budgetTxs?: any[];
  accounts?: any[];
  goals: any[];
  cushion?: any;
  portfolios?: any[];
  portfolioAssets?: any[];
  language?: string;
}

interface IOAssistantProps {
  t: (key: string) => string;
  context?: IOContext;
  userId: string | null;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
}

export const IOAssistant: React.FC<IOAssistantProps> = ({ t, context, userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'overview' | 'chat' | 'voice'>('overview');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showMicHint, setShowMicHint] = useState(false);
  const micHintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef('');
  const isVoiceModeRef = useRef(isVoiceMode);
  const isSpeakingRef = useRef(isSpeaking);
  const isTypingRef = useRef(isTyping);
  const isOpenRef = useRef(isOpen);
  const voiceWatchdogRef = useRef<NodeJS.Timeout | null>(null);

  // Heartbeat to prevent "Standby" stuckness
  useEffect(() => {
    if (isVoiceMode && isOpen && !isSpeaking && !isTyping && !isListening) {
      voiceWatchdogRef.current = setTimeout(() => {
        restartVoiceEngine();
      }, 5000);
    } else {
      if (voiceWatchdogRef.current) clearTimeout(voiceWatchdogRef.current);
    }
    return () => { if (voiceWatchdogRef.current) clearTimeout(voiceWatchdogRef.current); };
  }, [isVoiceMode, isOpen, isSpeaking, isTyping, isListening]);
  const typingWatchdogRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isTyping) {
      if (typingWatchdogRef.current) clearTimeout(typingWatchdogRef.current);
      typingWatchdogRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          setIsTyping(false);
          isTypingRef.current = false;
        }
      }, 15000); // 15s watchdog
    } else {
      if (typingWatchdogRef.current) clearTimeout(typingWatchdogRef.current);
    }
  }, [isTyping]);

  const speakingWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isSpeaking) {
      if (speakingWatchdogRef.current) clearTimeout(speakingWatchdogRef.current);
      speakingWatchdogRef.current = setTimeout(() => {
        if (isSpeakingRef.current) {
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          restartVoiceEngine();
        }
      }, 12000); // 12s watchdog for speaking
    } else {
      if (speakingWatchdogRef.current) clearTimeout(speakingWatchdogRef.current);
    }
  }, [isSpeaking]);

  useEffect(() => { isVoiceModeRef.current = isVoiceMode; }, [isVoiceMode]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isTypingRef.current = isTyping; }, [isTyping]);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  // V3 Fail-Safe Restart
  const restartVoiceEngine = (force = false) => {
    if (!isVoiceModeRef.current || !isOpenRef.current) return;
    
    // If not forced, don't restart if already busy
    if (!force && (isTypingRef.current || isSpeakingRef.current)) {
      console.log("Restart suppressed: engine busy");
      return;
    }
    
    console.log(`V3: Attempting voice engine restart (force: ${force})...`);
    try {
      recognitionRef.current?.stop();
    } catch (e) {}

    setTimeout(() => {
      if (!isVoiceModeRef.current || !isOpenRef.current) return;
      if (!force && (isTypingRef.current || isSpeakingRef.current)) return;
      
      try {
        recognitionRef.current?.start();
        console.log("V3: Recognition started successfully");
      } catch (e) {
        console.error("V3: Recognition start failed:", e);
      }
    }, force ? 600 : 400);
  };

  useEffect(() => {
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSpeechSupported(false);
        return;
      }

      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
      }
      
      const rec = recognitionRef.current;
      rec.continuous = true;
      rec.interimResults = true;
      
      const appLang = context?.language || 'uk';
      rec.lang = appLang === 'ru' ? 'ru-RU' : appLang === 'en' ? 'en-US' : 'uk-UA';

      rec.onstart = () => {
        setIsListening(true);
        setShowMicHint(false);
      };
      
      rec.onresult = (event: any) => {
        if (micHintTimerRef.current) clearTimeout(micHintTimerRef.current);
        
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          setInputValue(currentText);
          transcriptRef.current = currentText;
          
          if (isVoiceModeRef.current) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              if (transcriptRef.current.trim() && !isTypingRef.current && !isSpeakingRef.current) {
                handleSendMessage(transcriptRef.current);
              }
            }, 1800);
          }
        }
      };

      rec.onerror = (event: any) => {
        console.warn("V3 Recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setIsVoiceMode(false);
        } else {
          restartVoiceEngine();
        }
      };

      rec.onend = () => {
        setIsListening(false);
        console.log("V3 Recognition end");
        restartVoiceEngine();
      };
    }
  }, [context?.language]);

  const toggleVoiceMode = () => {
    if (!isSpeechSupported) {
      alert("Голосове введення не підтримується у вашому браузері.");
      return;
    }
    const newMode = !isVoiceMode;
    setIsVoiceMode(newMode);
    
    if (newMode) {
      setView('voice');
      setShowMicHint(false);
      // Start listening immediately
      try {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        
        // Timer to show hint if no speech detected after 10s
        micHintTimerRef.current = setTimeout(() => {
          setShowMicHint(true);
        }, 10000);

        recognitionRef.current?.start();
      } catch (e) {}
    } else {
      setView('overview');
      setInputValue('');
      transcriptRef.current = '';
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (micHintTimerRef.current) clearTimeout(micHintTimerRef.current);
      recognitionRef.current?.stop();
    }
  };

  const toggleListening = () => {
    if (!isSpeechSupported || !recognitionRef.current) {
      alert("Голосове введення не підтримується у вашому браузері. Будь ласка, використовуйте Chrome або Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start recognition:", e);
        setIsListening(false);
      }
    }
  };

  const speak = (text: string) => {
    if (!text) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    if (!isSpeakingEnabled) {
      if (isVoiceMode && isOpen) {
        setTimeout(() => {
          try { recognitionRef.current?.start(); } catch (e) {}
        }, 300);
      }
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    const appLang = context?.language || 'uk';
    const langCode = appLang === 'ru' ? 'ru-RU' : appLang === 'en' ? 'en-US' : 'uk-UA';
    
    // Select voice based on app context
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(appLang)) || voices.find(v => v.lang.startsWith('uk'));
    
    if (voice) utterance.voice = voice;
    utterance.lang = langCode;
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    
    utterance.onstart = () => setIsSpeaking(true);
    
    utterance.onend = () => {
      setIsSpeaking(false);
      console.log("V3: Speech synthesis ended");
      restartVoiceEngine();
    };

    utterance.onerror = (e) => {
      console.error("Speech Synthesis Error:", e);
      setIsSpeaking(false);
      // Fallback: start listening if error occurred or was blocked
      if (isVoiceMode && isOpen) {
        setTimeout(() => {
          try { recognitionRef.current?.start(); } catch (err) {}
        }, 100);
      }
    };

    window.speechSynthesis.speak(utterance);
  };


  const { 
    totalCapitalUsd = 0,
    totalProfitUsd = 0,
    totalRoi = 0,
    bitbonValueUsd = 0,
    cryptoValueUsd = 0,
    bitbonCount = 0, 
    currency = 'USD', 
    usdRate = 1,
    availableInvestmentUsd = 0,
    monthlyExpensesUsd = 0,
    monthlyIncomeUsd = 0,
    savingsRate = 0,
    budgetCategories = [],
    budgetBalanceUah = 0,
    budgetTxs = [],
    accounts = [],
    goals = [],
    cushion,
    portfolios = [],
    portfolioAssets = []
  } = context || {};

  const mood = useMemo(() => {
    if (totalCapitalUsd === 0) return 'empty';
    if (totalRoi > 0) return 'bullish';
    if (totalRoi < -5) return 'alert';
    return 'neutral';
  }, [totalCapitalUsd, totalRoi]);

  const moodConfig = {
    empty: { base: 'zinc-400', glow: 'rgba(161, 161, 170, 0.3)', text: 'zinc-400', icon: Sparkles },
    bullish: { base: 'emerald-500', glow: 'rgba(16, 185, 129, 0.3)', text: 'emerald-400', icon: TrendingUp },
    alert: { base: 'rose-600', glow: 'rgba(225, 29, 72, 0.3)', text: 'rose-400', icon: AlertTriangle },
    neutral: { base: 'indigo-600', glow: 'rgba(99, 102, 241, 0.3)', text: 'indigo-400', icon: Zap },
  }[mood];

  const fmt = (val: number, curOverride?: string) => {
    const cur = curOverride || currency;
    const v = cur === 'USD' ? (curOverride ? val : val) : (curOverride === 'UAH' ? val : val * usdRate);
    // Note: this is a simple approximation. In App.tsx it's more precise, but for IO's advice it works.
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 }) + (cur === 'USD' ? ' $' : ' ₴');
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const generateInitialGreeting = () => {
    const capitalStr = fmt(totalCapitalUsd);
    const roiStr = totalRoi.toFixed(2) + '%';
    const base = t('ioGreeting') || "Привіт! Я IO.";
    
    if (totalCapitalUsd === 0) return `${base} Схоже, ваш портфель поки порожній. Хочете, я допоможу скласти план перших інвестицій?`;
    
    return `${base} Ваш капітал зараз становить ${capitalStr} з ROI ${roiStr}. Я проаналізував дані і готовий надати стратегічні поради.`;
  };

  const handleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    isOpenRef.current = nextState;

    if (nextState) {
      // Force reset voice engine on open if in voice mode
      if (isVoiceModeRef.current) {
        restartVoiceEngine(true);
      }

      if (messages.length === 0) {
        setIsTyping(true);
        isTypingRef.current = true;
        setTimeout(() => {
          setMessages([{ id: '1', type: 'assistant', content: generateInitialGreeting() }]);
          setIsTyping(false);
          isTypingRef.current = false;
        }, 1000);
      }
    } else {
      // Stop recognition on close
      try { recognitionRef.current?.stop(); } catch (e) {}
    }
  };

  const getAIResponse = (query: string): string => {
    const q = query.toLowerCase();
    
    // 1. Budget & Income (High Priority)
    if (q.includes('бюджет') || q.includes('грош') || q.includes('витрат') || q.includes('дохід') || q.includes('заощадж') || q.includes('економ')) {
      if (monthlyIncomeUsd > 0 || monthlyExpensesUsd > 0) {
        const topExpense = budgetCategories.length > 0 
          ? [...budgetCategories].filter(c => c.type === 'expense').sort((a, b) => b.planned - a.planned)[0]
          : null;
        
        let response = `Ваш бюджет: Дохід ${fmt(monthlyIncomeUsd)}, Витрати ${fmt(monthlyExpensesUsd)}. `;
        if (monthlyIncomeUsd > 0) {
          response += `Ви зберігаєте ${savingsRate.toFixed(1)}% доходу. `;
        }
        if (topExpense) {
          response += `Найбільша категорія витрат: ${topExpense.name} (${fmt(topExpense.planned)}). `;
        }
        return response + (savingsRate > 20 ? "Чудова фінансова дисципліна!" : "Раджу переглянути необов'язкові витрати для прискорення росту капіталу.");
      }
      return "Для аналізу бюджету додайте ваші планові доходи та витрати у вкладці 'Бюджет'. Я одразу їх проаналізую!";
    }

    // 2. Goals
    if (q.includes('ціль') || q.includes('goal') || q.includes('мета') || q.includes('мрія')) {
      if (goals.length > 0) {
        const topGoal = goals[0];
        const progress = ((topGoal.currentAmount / topGoal.targetAmount) * 100).toFixed(1);
        return `Ваша ціль "${topGoal.name}": виконано на ${progress}% (${fmt(topGoal.currentAmount)} з ${fmt(topGoal.targetAmount)}). Ви рухаєтесь у вірному напрямку!`;
      }
      return "У вас поки немає активних цілей. Додайте їх, і я розрахую шлях до їх досягнення.";
    }

    // 3. Capital & Profit
    if (q.includes('капітал') || q.includes('capital') || q.includes('скільки') || q.includes('баланс') || q.includes('усього')) {
      return `Ваш сумарний капітал: ${fmt(totalCapitalUsd)}. Прибуток: ${fmt(context?.totalProfitUsd || 0)} (ROI: ${totalRoi.toFixed(2)}%).`;
    }

    if (q.includes('bitbon') || q.includes('erbb')) {
      const share = ((context?.bitbonValueUsd || 0) / (totalCapitalUsd || 1) * 100).toFixed(1);
      return `У вас ${bitbonCount.toFixed(2)} Bitbon (${fmt(context?.bitbonValueUsd || 0)}), що складає ${share}% портфеля.`;
    }

    // 4. Future & Passive
    if (q.includes('майбутн') || q.includes('прогноз') || q.includes('через') || q.includes('рок')) {
      const annualRoi = totalRoi > 0 ? totalRoi : 10;
      const years5 = totalCapitalUsd * Math.pow(1 + annualRoi/100, 5);
      return `Мій прогноз на 5 років при ROI ${annualRoi.toFixed(0)}%: ваш капітал може зрости до ${fmt(years5)}. Складний відсоток — це сила!`;
    }

    if (q.includes('пасив') || q.includes('пенсія') || q.includes('життя')) {
      const monthlyIncome = (totalCapitalUsd * (totalRoi > 0 ? totalRoi : 8) / 100) / 12;
