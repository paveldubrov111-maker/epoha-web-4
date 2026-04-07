import React, { useState } from 'react';
import { Module, Step, ContentBlock } from '../academyTypes';
import { Play, CheckCircle2, ChevronRight, HelpCircle, Lightbulb, Calculator, Layers, Share2, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import sub-components
import ScenarioBlock from './ScenarioBlock';
import FlipcardBlock from './FlipcardBlock';
import ChecklistBlock from './ChecklistBlock';
import HomeworkBlock from './HomeworkBlock';
import CalcBlock from './CalcBlock';
import PyramidBlock from './PyramidBlock';
import TimelineBlock from './TimelineBlock';
import ComparisonBlock from './ComparisonBlock';
import BlockchainDemo from './BlockchainDemo';
import TokenDemo from './TokenDemo';

interface LessonRendererProps {
  module: Module;
  step: Step;
  onCompleteStep: (moduleId: number, stepId: number, xp: number) => void;
  isStepCompleted: boolean;
  onPrev: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  hwAnswers: Record<string, string>;
  onHwChange: (id: string, val: string) => void;
  onAddXP: (amt: number) => void;
}

const LessonRenderer: React.FC<LessonRendererProps> = ({
  module,
  step,
  onCompleteStep,
  isStepCompleted,
  onPrev,
  onNext,
  isFirstStep,
  isLastStep,
  hwAnswers,
  onHwChange,
  onAddXP
}) => {
  const currentStepIdx = step.id;
  const progress = ((currentStepIdx + 1) / module.steps.length) * 100;

  const renderBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case 'video':
        return <VideoBlock key={index} block={block} />;
      case 'text':
        return <div key={index} className="prose prose-invert max-w-none mb-6 text-sm text-gray-200 leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: block.html }} />;
      case 'quiz':
        return <QuizBlock key={index} block={block} onCorrect={() => onAddXP(15)} />;
      case 'scenario':
        return <ScenarioBlock key={index} block={block} onGood={() => onAddXP(20)} />;
      case 'flipcards':
        return <FlipcardBlock key={index} block={block} />;
      case 'checklist':
        return <ChecklistBlock key={index} block={block} onTaskComplete={(xp) => onAddXP(xp)} />;
      case 'homework':
        return (
          <HomeworkBlock 
            key={index} 
            block={block} 
            value={hwAnswers[block.id] || ''} 
            onChange={(val) => onHwChange(block.id, val)}
            onSave={() => onAddXP(30)}
          />
        );
      case 'calc':
        return <CalcBlock key={index} block={block} />;
      case 'pyramid':
        return <PyramidBlock key={index} block={block} />;
      case 'timeline':
        return <TimelineBlock key={index} block={block} />;
      case 'comparison':
        return <ComparisonBlock key={index} block={block} />;
      case 'blockchain_demo':
        return <BlockchainDemo key={index} onAddXP={onAddXP} />;
      case 'token_demo':
        return <TokenDemo key={index} asset={block.asset} shares={block.shares} onAddXP={onAddXP} />;
      default:
        return null;
    }
  };

  return (
    <div className="lesson-player flex flex-col min-h-[500px]">
      {/* Progress Bar (from ModuleOne) */}
      <div className="px-2 pt-2 mb-8">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            {module.title} • Крок {currentStepIdx + 1}
          </span>
          <span className="text-[10px] font-black text-blue-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          />
        </div>
      </div>

      {/* Main Content with AnimatePresence */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-black text-white leading-tight mb-6">
              {step.title}
            </h2>

            {/* Support for structured blocks */}
            {step.blocks && step.blocks.length > 0 && (
              <div className="space-y-6">
                {step.blocks.map((block, idx) => renderBlock(block, idx))}
              </div>
            )}

            {/* Support for direct ReactNode content (from Lesson interface) */}
            {step.content && (
              <div className="lesson-custom-content text-gray-300 leading-relaxed font-medium">
                {step.content}
              </div>
            )}

            {/* Simple Quiz (from Lesson interface) */}
            {step.quiz && (
              <div className="mt-8">
                <SimpleQuiz quiz={step.quiz} onCorrect={() => onAddXP(25)} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="flex gap-3 mt-12 pt-8 border-t border-white/5">
        <button 
          onClick={onPrev}
          disabled={isFirstStep}
          className="p-4 rounded-2xl border border-white/10 bg-white/5 disabled:opacity-20 text-gray-400 hover:bg-white/10 transition-all active:scale-95 shadow-xl"
        >
          <ChevronRight className="rotate-180" size={24} />
        </button>
        
        <button 
          onClick={() => {
            if (!isStepCompleted) onCompleteStep(module.id, step.id, step.xp);
            onNext();
          }}
          className={`flex-1 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl ${
            isLastStep 
              ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-blue-600 text-white shadow-blue-500/20'
          }`}
        >
          {isLastStep ? 'Завершити модуль' : 'Далі'}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

// --- Embedded Blocks ---

const VideoBlock = ({ block }: { block: any }) => {
  const isPlaceholder = !block.url || block.url.includes('YOUR_') || block.url.includes('dQw4w9WgXcQ');
  
  return (
    <div className="vid-block mb-8">
      <div className="vid-lbl text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <div className="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center text-[7px] text-white">▶</div>
        {block.videoTitle || block.title}
      </div>
      <div className="vid-frame relative pt-[56.25%] bg-black/40 border border-white/5 rounded-3xl overflow-hidden group">
        {isPlaceholder ? (
          <div className="vid-ph absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="vid-ph-icon w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-500 transition-transform group-hover:scale-110">
              <Play size={20} fill="currentColor" />
            </div>
            <div className="text-center px-6">
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-tight mb-1">Відео в процесі розробки</div>
              <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Зйомка та монтаж</div>
            </div>
          </div>
        ) : (
          <iframe 
            className="absolute inset-0 w-full h-full border-none"
            src={block.url.replace('watch?v=', 'embed/')} 
            allowFullScreen
          />
        )}
      </div>
      <div className="vid-dur mt-3 flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
        ⏱ Тривалість: <span className="text-gray-400">{block.duration}</span>
      </div>
    </div>
  );
};

const QuizBlock = ({ block, onCorrect }: { block: any, onCorrect: () => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <div className="quiz bg-white/[0.02] border border-white/5 rounded-3xl p-6 mb-8 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-white/10">
      <div className="quiz-q text-sm font-bold text-white mb-5 leading-relaxed tracking-tight flex gap-4">
        <HelpCircle size={20} className="text-blue-500 shrink-0 mt-0.5 transition-transform group-hover:rotate-[360deg] duration-700" />
        {block.q}
      </div>
      <div className="quiz-opts space-y-2.5">
        {block.opts.map((opt: any, idx: number) => {
          let stateClass = "border-white/5 text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 hover:border-white/10";
          if (isSubmitted) {
            if (opt.isCorrect) stateClass = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]";
            else if (selected === idx) stateClass = "border-red-500/50 bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]";
            else stateClass = "border-white/5 opacity-20 blur-[0.5px] grayscale";
          } else if (selected === idx) {
            stateClass = "border-blue-500/50 bg-blue-500/10 text-blue-300";
          }

          return (
            <button
              key={idx}
              disabled={isSubmitted}
              className={`q-opt w-full text-left p-4 rounded-2xl border text-[13px] font-bold tracking-tight leading-relaxed transition-all duration-500 active:scale-95 ${stateClass}`}
              onClick={() => {
                setSelected(idx);
                setIsSubmitted(true);
                if (opt.isCorrect) onCorrect();
              }}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {isSubmitted && (
          <motion.div 
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            className={`quiz-fb mt-5 p-4 rounded-xl text-[11px] leading-relaxed font-black uppercase tracking-tight flex gap-3 shadow-xl ${
              block.opts[selected!].isCorrect 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}
          >
            {block.opts[selected!].isCorrect ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            {block.opts[selected!].fb}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SimpleQuiz: React.FC<{ quiz: any, onCorrect: () => void }> = ({ quiz, onCorrect }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <div className="simple-quiz bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group transition-all duration-500 hover:border-white/10">
      <div className="quiz-q text-lg font-bold text-white mb-6 leading-relaxed tracking-tight flex gap-4">
        <HelpCircle size={24} className="text-blue-500 shrink-0 mt-0.5 transition-transform group-hover:rotate-[360deg] duration-700" />
        {quiz.question}
      </div>
      <div className="quiz-opts space-y-3">
        {quiz.options.map((opt: string, idx: number) => {
          let stateClass = "border-white/5 text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 hover:border-white/10";
          if (isSubmitted) {
            if (idx === quiz.correct) stateClass = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]";
            else if (selected === idx) stateClass = "border-red-500/50 bg-red-500/10 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]";
            else stateClass = "border-white/5 opacity-20 blur-[0.5px] grayscale";
          } else if (selected === idx) {
            stateClass = "border-blue-500/50 bg-blue-500/10 text-blue-300";
          }

          return (
            <button
              key={idx}
              disabled={isSubmitted}
              className={`q-opt w-full text-left p-4 rounded-2xl border text-[14px] font-bold tracking-tight leading-relaxed transition-all duration-500 active:scale-95 ${stateClass}`}
              onClick={() => {
                setSelected(idx);
                setIsSubmitted(true);
                if (idx === quiz.correct) onCorrect();
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {isSubmitted && (
          <motion.div 
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: 'auto', opacity: 1, scale: 1 }}
            className={`quiz-fb mt-6 p-4 rounded-xl text-[11px] leading-relaxed font-black uppercase tracking-tight flex gap-3 shadow-xl ${
              selected === quiz.correct 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}
          >
            {selected === quiz.correct ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            {selected === quiz.correct ? 'Чудово! Ви правильно відповіли та отримали +25 XP' : 'На жаль, це невірна відповідь. Перечитайте матеріал та спробуйте ще раз!'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LessonRenderer;
