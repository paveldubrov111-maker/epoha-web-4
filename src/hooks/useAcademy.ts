import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProgress, Module, LEVELS, BADGES_DEF } from '../components/features/academy/academyTypes';
import { INITIAL_MODULES } from '../components/features/academy/academyData';
import { db, doc, setDoc, onSnapshot } from '../firebase';

const PROGRESS_KEY = 'epoha_academy_progress_v4';
const CONTENT_KEY = 'epoha_academy_content_v4';

const INITIAL_PROGRESS: UserProgress = {
  userName: '',
  userEmail: '',
  track: 'full',
  xp: 0,
  completedModules: [],
  completedSteps: {},
  completedTasks: 0,
  earnedBadges: [],
  activeModule: -1,
  activeSteps: {},
  hwAnswers: {},
  dailyDone: '',
  startDate: new Date().toISOString(),
  streak: 1,
  lastVisit: new Date().toDateString(),
  onboardDone: false,
};

export const useAcademy = (userId: string | null) => {
  const [progress, setProgress] = useState<UserProgress>(INITIAL_PROGRESS);
  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Initial load from localStorage (instant feedback)
  useEffect(() => {
    const savedProgress = localStorage.getItem(PROGRESS_KEY);
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProgress(parsed);
      } catch (e) {
        console.error("Failed to parse local progress", e);
      }
    }

    const savedContent = localStorage.getItem(CONTENT_KEY);
    if (savedContent) {
      try {
        setModules(JSON.parse(savedContent));
      } catch (e) {
        console.error("Failed to parse local content", e);
      }
    }
  }, []);

  // 2. Sync from Supabase (Real-time)
  useEffect(() => {
    if (!userId) return;

    // Load/Sync Progress
        const progressUnsub = onSnapshot(doc(db, `users/${userId}/academyProgress/main`), (s) => {
          if (s.exists()) {
            const remoteData = s.data() as UserProgress;
            
            setProgress(prev => {
              if (JSON.stringify(prev) === JSON.stringify(remoteData)) return prev;
              
              const merged = { ...remoteData };
              // Protect 'onboardDone' status - if we already have it true, keep it true
              if (prev.onboardDone) merged.onboardDone = true;
              if (prev.userName && !merged.userName) merged.userName = prev.userName;
              if (prev.track && !merged.track) merged.track = prev.track;
              
              const today = new Date().toDateString();
              if (merged.lastVisit && merged.lastVisit !== today) {
                const diff = (new Date(today).getTime() - new Date(merged.lastVisit).getTime()) / 86400000;
                merged.streak = diff <= 1 ? (merged.streak || 1) + 1 : 1;
                merged.lastVisit = today;
              }
              
              return merged;
            });
          }
        });

    // Load Custom Content 
    const contentUnsub = onSnapshot(doc(db, `academyContent/main`), (s) => {
      if (s.exists()) {
        const remoteContent = s.data() as { data: Module[] };
        if (remoteContent.data && remoteContent.data.length > 0) {
          // Check if remote content is missing our new restored modules
          const hasNewLesson = remoteContent.data.some(m => m.title === 'Психологія грошей');
          
          if (!hasNewLesson) {
            console.log("Remote content is stale. Force updating...");
            setDoc(doc(db, `academyContent/main`), { data: INITIAL_MODULES }, { merge: true });
            localStorage.removeItem(CONTENT_KEY); 
            setModules(INITIAL_MODULES);
          } else {
            setModules(remoteContent.data);
          }
        } else {
          setDoc(doc(db, `academyContent/main`), { data: INITIAL_MODULES }, { merge: true });
          setModules(INITIAL_MODULES);
        }
      } else {
        setDoc(doc(db, `academyContent/main`), { data: INITIAL_MODULES }, { merge: true });
      }
    });

    return () => {
      progressUnsub();
      contentUnsub();
    };
  }, [userId]);

  // 3. Auto-save to LocalStorage AND Supabase
  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));

    if (userId && !isSyncing) {
      const sync = async () => {
        setIsSyncing(true);
        try {
          await setDoc(doc(db, `users/${userId}/academyProgress/main`), progress, { merge: true });
        } catch (e) {
          console.error("Failed to sync progress to Supabase", e);
        } finally {
          setIsSyncing(false);
        }
      };
      
      const timeout = setTimeout(sync, 1000); // 1s debounce
      return () => clearTimeout(timeout);
    }
  }, [progress, userId]);

  // Content save (Admin only)
  useEffect(() => {
    if (modules !== INITIAL_MODULES) {
      localStorage.setItem(CONTENT_KEY, JSON.stringify(modules));
      
      if (isAdmin && userId) {
        const saveContent = async () => {
          try {
            await setDoc(doc(db, `academyContent/main`), { data: modules }, { merge: true });
          } catch (e) {
            console.error("Failed to sync content to Supabase", e);
          }
        };
        saveContent();
      }
    }
  }, [modules, isAdmin, userId]);

  const addXP = useCallback((amount: number) => {
    setProgress(prev => ({
      ...prev,
      xp: prev.xp + amount,
      completedTasks: (prev.completedTasks || 0) + 1
    }));
  }, []);

  const completeStep = useCallback((moduleId: number, stepId: number, xp: number) => {
    setProgress(prev => {
      const moduleSteps = prev.completedSteps[moduleId] || [];
      if (moduleSteps.includes(stepId)) return prev;

      const newModuleSteps = [...moduleSteps, stepId];
      const newCompletedSteps = { ...prev.completedSteps, [moduleId]: newModuleSteps };

      const module = modules.find(m => m.id === moduleId);
      let newCompletedModules = prev.completedModules || [];
      let newEarnedBadges = prev.earnedBadges || [];

      if (module && newModuleSteps.length === module.steps.length) {
        if (!newCompletedModules.includes(moduleId)) {
          newCompletedModules = [...newCompletedModules, moduleId];
          if (module.badgeId && !newEarnedBadges.includes(module.badgeId)) {
            newEarnedBadges = [...newEarnedBadges, module.badgeId];
          }
        }
      }

      if (!newEarnedBadges.includes('first_step')) {
        newEarnedBadges = [...newEarnedBadges, 'first_step'];
      }

      if (newCompletedModules.length === modules.length && !newEarnedBadges.includes('strategist')) {
        newEarnedBadges = [...newEarnedBadges, 'strategist'];
      }

      return {
        ...prev,
        xp: prev.xp + xp,
        completedSteps: newCompletedSteps,
        completedModules: newCompletedModules,
        earnedBadges: newEarnedBadges,
        completedTasks: (prev.completedTasks || 0) + 1
      };
    });
  }, [modules]);

  const currentLevel = useMemo(() => {
    const xp = progress.xp || 0;
    let level = LEVELS[0];
    let index = 0;
    for (let i = 0; i < LEVELS.length; i++) {
        if (xp >= LEVELS[i].min) {
            level = LEVELS[i];
            index = i;
        }
    }
    const nextLevel = LEVELS[index + 1] || { min: 99999, name: 'Max' };
    const progressToNext = Math.min(100, Math.round(((xp - level.min) / (nextLevel.min - level.min)) * 100));
    
    return {
      ...level,
      index: index + 1,
      nextMin: nextLevel.min,
      progressToNext
    };
  }, [progress.xp]);

  const updateContent = useCallback((newModules: Module[]) => {
    setModules(newModules);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(INITIAL_PROGRESS);
    localStorage.removeItem(PROGRESS_KEY);
    if (userId) {
       setDoc(doc(db, `users/${userId}/academyProgress/main`), INITIAL_PROGRESS);
    }
  }, [userId]);

  return {
    progress,
    setProgress,
    modules,
    updateContent,
    addXP,
    completeStep,
    currentLevel,
    isAdmin,
    setIsAdmin,
    resetProgress,
    badges: BADGES_DEF
  };
};
