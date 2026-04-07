import React, { useState } from 'react';
import { Module, Step, ContentBlock } from '../academyTypes';
import { Save, Plus, Trash2, ChevronRight, FileJson, Edit3, Eye, Layout, Type, Video, HelpCircle, CheckSquare, MessageSquare, Calculator, Share2, AlertCircle, FileText, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AcademyAdminProps {
  modules: Module[];
  onUpdate: (newModules: Module[]) => void;
  onClose: () => void;
}

const AcademyAdmin: React.FC<AcademyAdminProps> = ({ modules, onUpdate, onClose }) => {
  const [activeModIdx, setActiveModIdx] = useState(0);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [view, setView] = useState<'edit' | 'json'>('edit');

  const activeModule = modules[activeModIdx];
  const activeStep = activeModule?.steps[activeStepIdx];

  const updateModule = (idx: number, updates: Partial<Module>) => {
    const newModules = [...modules];
    newModules[idx] = { ...newModules[idx], ...updates };
    onUpdate(newModules);
  };

  const updateStep = (mIdx: number, sIdx: number, updates: Partial<Step>) => {
    const newModules = [...modules];
    const newSteps = [...newModules[mIdx].steps];
    newSteps[sIdx] = { ...newSteps[sIdx], ...updates };
    newModules[mIdx] = { ...newModules[mIdx], steps: newSteps };
    onUpdate(newModules);
  };

  const updateBlock = (mIdx: number, sIdx: number, bIdx: number, newBlock: ContentBlock) => {
    const newModules = [...modules];
    const step = newModules[mIdx].steps[sIdx];
    const currentBlocks = step.blocks || [];
    const newBlocks = [...currentBlocks];
    newBlocks[bIdx] = newBlock;
    
    const newSteps = [...newModules[mIdx].steps];
    newSteps[sIdx] = { ...step, blocks: newBlocks };
    newModules[mIdx] = { ...newModules[mIdx], steps: newSteps };
    onUpdate(newModules);
  };

  const addBlock = (type: ContentBlock['type']) => {
    const newModules = [...modules];
    let newBlock: ContentBlock;

    switch (type) {
      case 'text': newBlock = { type: 'text', html: '<p>Новий текст...</p>' }; break;
      case 'video': newBlock = { type: 'video', url: '', title: 'Назва відео', duration: '10 хв' }; break;
      case 'quiz': newBlock = { type: 'quiz', id: `q_${Date.now()}`, q: 'Питання?', opts: [{ text: 'Варіант 1', isCorrect: true, fb: 'Добре!' }] }; break;
      case 'homework': newBlock = { type: 'homework', id: `hw_${Date.now()}`, task: 'Опишіть ваші дії...' }; break;
      case 'scenario': newBlock = { type: 'scenario', id: `sc_${Date.now()}`, story: 'Опис ситуації...', q: 'Що ви зробите?', opts: [{ text: 'Дія А', isGood: true, fb: 'Це правильне рішення!' }] }; break;
      case 'flipcards': newBlock = { type: 'flipcards', cards: [{ front: 'Лицева сторона', back: 'Зворотна сторона', icon: '💡' }] }; break;
      case 'checklist': newBlock = { type: 'checklist', id: `cl_${Date.now()}`, tasks: [{ text: 'Завдання 1', xp: 15 }] }; break;
      case 'calc': newBlock = { type: 'calc', id: 'budget', title: 'Розрахунок бюджету' }; break;
      case 'pyramid': newBlock = { type: 'pyramid', items: [{ title: 'Етап 1', body: 'Опис...', icon: '1️⃣' }] }; break;
      case 'timeline': newBlock = { type: 'timeline', items: [{ year: '2024', title: 'Подія', desc: 'Опис події...' }] }; break;
      case 'comparison': newBlock = { type: 'comparison', items: [{ icon: '🌐', title: 'Web 3.0', features: [{ text: 'Децентралізація', isPositive: true }] }] }; break;
      case 'blockchain_demo': newBlock = { type: 'blockchain_demo', id: `bc_${Date.now()}` }; break;
      case 'token_demo': newBlock = { type: 'token_demo', asset: { name: 'Нерухомість', value: '1 000 000 $' }, shares: 10 }; break;
      default: newBlock = { type: 'text', html: 'Новий блок' }; break;
    }

    const step = newModules[activeModIdx].steps[activeStepIdx];
    const currentBlocks = step.blocks || [];
    const newBlocks = [...currentBlocks, newBlock];
    
    const newSteps = [...newModules[activeModIdx].steps];
    newSteps[activeStepIdx] = { ...step, blocks: newBlocks };
    newModules[activeModIdx] = { ...newModules[activeModIdx], steps: newSteps };
    onUpdate(newModules);
  };

  const removeBlock = (bIdx: number) => {
    const newModules = [...modules];
    const step = newModules[activeModIdx].steps[activeStepIdx];
    const currentBlocks = step.blocks || [];
    const newBlocks = currentBlocks.filter((_, i) => i !== bIdx);
    
    const newSteps = [...newModules[activeModIdx].steps];
    newSteps[activeStepIdx] = { ...step, blocks: newBlocks };
    newModules[activeModIdx] = { ...newModules[activeModIdx], steps: newSteps };
    onUpdate(newModules);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0b0f] text-white">
      {/* Header - Modern Sticky */}
      <div className="sticky top-0 z-[100] p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between bg-black/80 backdrop-blur-xl gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-black shadow-lg shadow-indigo-600/20 text-white">A</div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-widest text-indigo-500 leading-none mb-1">Academy <span className="text-white">Admin</span></h1>
              <p className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Управління навчанням v2.1</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden p-2 text-rose-500"><Plus className="w-6 h-6 rotate-45" /></button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          <button onClick={() => setView('edit')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap shadow-sm ${view === 'edit' ? 'bg-indigo-600 text-white shadow-indigo-600/20' : 'bg-white/5 text-gray-400'}`}><Edit3 size={14} /> Редактор</button>
          <button onClick={() => setView('json')} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap shadow-sm ${view === 'json' ? 'bg-indigo-600 text-white shadow-indigo-600/20' : 'bg-white/5 text-gray-400'}`}><FileJson size={14} /> JSON</button>
          <button onClick={onClose} className="hidden md:block px-5 py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Закрити</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar / Module Selector */}
        <div className="w-full md:w-72 border-r border-white/5 overflow-y-auto no-scrollbar bg-black/40 flex flex-row md:flex-col shrink-0">
          <div className="hidden md:block p-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5">Навчальні модулі</div>
          
          <div className="flex md:flex-col overflow-x-auto no-scrollbar w-full p-2 md:p-0">
            {modules.map((m, idx) => (
              <div 
                key={idx} 
                onClick={() => { setActiveModIdx(idx); setActiveStepIdx(0); }}
                className={`p-3 md:p-4 cursor-pointer hover:bg-white/5 border-b-4 md:border-b-0 md:border-l-4 transition-all flex items-center gap-3 shrink-0 md:shrink ${activeModIdx === idx ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-transparent opacity-50'}`}
              >
                <span className="text-2xl md:text-lg">{m.emoji}</span>
                <div className="flex-1 min-w-[120px] md:min-w-0 md:truncate">
                  <div className="text-[11px] font-black leading-tight md:mb-1 uppercase tracking-tighter truncate">{m.title}</div>
                  <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest hidden md:block">{m.steps.length} уроків</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0b0f]">
          {view === 'json' ? (
            <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Raw API Data Overlay</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(modules, null, 2))}
                  className="px-3 py-1.5 bg-indigo-600/10 text-indigo-500 text-[10px] font-black uppercase rounded-lg border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all"
                >
                  Копіювати все
                </button>
              </div>
              <textarea 
                readOnly 
                className="flex-1 w-full bg-black/60 border border-white/10 rounded-3xl p-6 text-[11px] font-mono text-indigo-300 leading-relaxed overflow-y-auto outline-none custom-scrollbar shadow-inner"
                value={JSON.stringify(modules, null, 2)}
              ></textarea>
            </div>
          ) : (
            <>
              {/* Steps bar */}
              <div className="flex gap-2 p-3 bg-white/[0.02] border-b border-white/5 overflow-x-auto no-scrollbar shadow-inner">
                {activeModule?.steps.map((s, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveStepIdx(idx)}
                    className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all border shrink-0 ${activeStepIdx === idx ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-transparent text-gray-500 hover:text-gray-300'}`}
                  >
                    {idx + 1}. {s.title}
                  </button>
                ))}
                <button className="px-5 py-3 border border-dashed border-white/10 rounded-2xl text-[10px] text-gray-600 font-black uppercase shrink-0 hover:border-white/20 active:scale-95 transition-all">+</button>
              </div>

              {/* Editor Pane */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8 md:space-y-10 pb-24 md:pb-20 no-scrollbar">
                {/* Module Details */}
                <section className="bg-white/5 p-5 md:p-0 rounded-[2rem] md:bg-transparent md:border-0 border border-white/5">
                  <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Layout size={14}/> Налаштування Модуля</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1">Emoji</label>
                      <input type="text" className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-center text-2xl focus:ring-2 ring-indigo-500 outline-none transition-all" value={activeModule?.emoji || ''} onChange={(e) => updateModule(activeModIdx, { emoji: e.target.value })} />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1">Заголовок</label>
                      <input type="text" className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all" value={activeModule?.title || ''} onChange={(e) => updateModule(activeModIdx, { title: e.target.value })} />
                    </div>
                  </div>
                </section>

                {/* Step Details */}
                <section className="bg-white/5 p-5 md:p-0 rounded-[2rem] md:bg-transparent md:border-0 border border-white/5 text-gray-200">
                  <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Eye size={14}/> Налаштування Кроку</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                      <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1">Назва уроку</label>
                      <input type="text" className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500 outline-none transition-all" value={activeStep?.title || ''} onChange={(e) => updateStep(activeModIdx, activeStepIdx, { title: e.target.value })} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1">XP</label>
                      <input type="number" className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-bold text-amber-500 focus:ring-2 ring-amber-500 outline-none transition-all" value={activeStep?.xp || 0} onChange={(e) => updateStep(activeModIdx, activeStepIdx, { xp: Number(e.target.value) })} />
                    </div>
                  </div>

                  {/* Indicator for interactive content (ReactNode) */}
                  {activeStep?.content && (
                    <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                        <Share2 size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase text-white tracking-widest leading-none mb-1">Інтерактивний контент</div>
                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">Цей урок містить складний React-код і не може бути змінений у спрощеному редакторі.</p>
                      </div>
                    </div>
                  )}
                </section>

                {/* Blocks Editor */}
                <section className="space-y-6">
                  <h2 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Layout size={14}/> Блоки контенту</h2>
                  <div className="space-y-6">
                    {activeStep?.blocks?.map((block, bIdx) => (
                      <div key={bIdx} className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden group shadow-lg">
                        <div className="px-6 py-4 bg-white/[0.03] flex justify-between items-center border-b border-white/5">
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                            <span className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20 text-xs shadow-inner">{bIdx + 1}</span>
                            <span className="contrast-125">{block.type}</span>
                          </div>
                          <button onClick={() => removeBlock(bIdx)} className="p-2 text-rose-500/60 hover:text-rose-500 transition-all active:scale-90"><Trash2 size={16}/></button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                          {block.type === 'text' && (
                            <textarea 
                              className="w-full bg-black/20 rounded-2xl p-4 text-sm font-medium leading-relaxed outline-none min-h-[160px] text-zinc-300 border border-white/5 focus:ring-2 ring-indigo-500/50 transition-all custom-scrollbar" 
                              value={block.html} 
                              onChange={(e) => updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, html: e.target.value })}
                              placeholder="Введіть HTML або текст уроку..."
                            />
                          )}
                          {block.type === 'video' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1 tracking-widest">URL Відео (YouTube)</label>
                                <input type="text" placeholder="https://..." className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/50 text-indigo-300" value={block.url} onChange={(e) => updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, url: e.target.value })} />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1 tracking-widest">Назва відео</label>
                                <input type="text" placeholder="Назва..." className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/50 text-white" value={block.title} onChange={(e) => updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, title: e.target.value })} />
                              </div>
                            </div>
                          )}
                          {block.type === 'quiz' && (
                            <div className="space-y-4">
                              <div>
                                <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1 tracking-widest">Запитання тесту</label>
                                <textarea className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm font-black outline-none focus:ring-2 ring-emerald-500/50 text-white leading-tight" value={block.q} onChange={(e) => updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, q: e.target.value })} />
                              </div>
                              <div className="space-y-3">
                                <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1 tracking-widest">Варіанти (виберіть правильні)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {block.opts.map((opt, oIdx) => (
                                    <div key={oIdx} className="flex gap-3 items-center bg-black/20 p-3 rounded-2xl border border-white/5 transition-all hover:border-white/10 group/opt">
                                      <input 
                                        type="checkbox" 
                                        className="w-6 h-6 rounded-lg border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/50 cursor-pointer"
                                        checked={opt.isCorrect} 
                                        onChange={(e) => {
                                          const newOpts = [...block.opts];
                                          newOpts[oIdx].isCorrect = e.target.checked;
                                          updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, opts: newOpts });
                                        }} 
                                      />
                                      <input type="text" className="flex-1 bg-transparent border-none p-1 text-xs font-bold outline-none text-zinc-400 group-hover/opt:text-white transition-colors" value={opt.text} onChange={(e) => {
                                        const newOpts = [...block.opts];
                                        newOpts[oIdx].text = e.target.value;
                                        updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, opts: newOpts });
                                      }} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          {block.type === 'homework' && (
                             <div>
                                <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1 tracking-widest">Текст завдання</label>
                                <textarea className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 ring-purple-500/50 text-white" value={block.task} onChange={(e) => updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, task: e.target.value })} />
                             </div>
                          )}
                          {block.type === 'scenario' && (
                            <div className="space-y-4">
                              <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1 tracking-widest">Текст сценарію (Story)</label>
                              <textarea className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-xs font-medium outline-none focus:ring-2 ring-indigo-500/50 text-white" value={block.story} onChange={(e) => updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, story: e.target.value })} />
                              <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1 tracking-widest">Питання</label>
                              <input className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/50 text-white" value={block.q} onChange={(e) => updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, q: e.target.value })} />
                            </div>
                          )}
                          {block.type === 'calc' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1 tracking-widest">Тип калькулятора</label>
                                <select 
                                  className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/50 text-indigo-300"
                                  value={block.id}
                                  onChange={(e: any) => updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, id: e.target.value })}
                                >
                                  <option value="budget">Бюджет</option>
                                  <option value="cushion">Подушка</option>
                                  <option value="compound">Складний відсоток</option>
                                  <option value="portfolio">Портфель</option>
                                  <option value="debt-calc">Боргова стратегія</option>
                                  <option value="fin-strat">Фінансова стратегія</option>
                                  <option value="detector">Детектор пірамід</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1 tracking-widest">Назва</label>
                                <input className="w-full bg-black/20 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 ring-indigo-500/50 text-white" value={block.title} onChange={(e) => updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, title: e.target.value })} />
                              </div>
                            </div>
                          )}
                          {block.type === 'pyramid' && (
                            <div className="space-y-4">
                              <label className="text-[9px] font-black text-gray-500 uppercase mb-1.5 block px-1 tracking-widest">Елементи піраміди</label>
                              {block.items.map((item, iIdx) => (
                                <div key={iIdx} className="p-4 bg-black/20 border border-white/5 rounded-2xl space-y-3">
                                  <div className="flex gap-3">
                                    <input className="w-12 bg-white/5 border border-white/5 rounded-xl p-2 text-center" value={item.icon} onChange={(e) => {
                                      const newItems = [...block.items];
                                      newItems[iIdx].icon = e.target.value;
                                      updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, items: newItems });
                                    }} />
                                    <input className="flex-1 bg-white/5 border border-white/5 rounded-xl p-2 font-bold" value={item.title} onChange={(e) => {
                                      const newItems = [...block.items];
                                      newItems[iIdx].title = e.target.value;
                                      updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, items: newItems });
                                    }} />
                                  </div>
                                  <textarea className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-xs" value={item.body} onChange={(e) => {
                                      const newItems = [...block.items];
                                      newItems[iIdx].body = e.target.value;
                                      updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, items: newItems });
                                    }} />
                                </div>
                              ))}
                              <button onClick={() => {
                                const newItems = [...block.items, { title: 'Новий пункт', body: 'Опис...', icon: '📌' }];
                                updateBlock(activeModIdx, activeStepIdx, bIdx, { ...block, items: newItems });
                              }} className="w-full p-3 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all">+ Додати пункт</button>
                            </div>
                          )}
                          {/* Demos and other blocks follow similar logic... */}
                          {(block.type === 'blockchain_demo' || block.type === 'token_demo' || block.type === 'timeline' || block.type === 'comparison' || block.type === 'flipcards' || block.type === 'checklist') && (
                            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                              <p className="text-[10px] font-black uppercase text-indigo-400">Складний блок: {block.type}</p>
                              <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-tighter">Редагування через JSON або по запиту. Струкутра: {JSON.stringify(block).slice(0, 50)}...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {!activeStep?.blocks?.length && !activeStep?.content && (
                       <div className="p-10 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center">
                          <AlertCircle size={32} className="mx-auto text-gray-600 mb-3 opacity-20" />
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Немає блоків контенту. Додайте перший!</p>
                       </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-6">
                    <button onClick={() => addBlock('text')} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex flex-col items-center gap-2"><Type size={20}/> Текст</button>
                    <button onClick={() => addBlock('video')} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex flex-col items-center gap-2"><Video size={20}/> Відео</button>
                    <button onClick={() => addBlock('quiz')} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex flex-col items-center gap-2"><HelpCircle size={20}/> Тест</button>
                    <button onClick={() => addBlock('scenario')} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex flex-col items-center gap-2"><MessageSquare size={20}/> Сценарій</button>
                    <button onClick={() => addBlock('homework')} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex flex-col items-center gap-2"><FileText size={20} /> Завдання</button>
                    <button onClick={() => addBlock('calc')} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex flex-col items-center gap-2"><Calculator size={20} /> Кальк</button>
                    <button onClick={() => addBlock('pyramid')} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex flex-col items-center gap-2"><Layers size={20} /> Піраміда</button>
                    <button onClick={() => addBlock('timeline')} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex flex-col items-center gap-2"><Layout size={20} /> Таймлайн</button>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademyAdmin;
