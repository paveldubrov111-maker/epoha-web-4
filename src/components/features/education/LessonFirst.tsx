import React from 'react';
import { BookOpen, ArrowRight, ExternalLink, PlayCircle } from 'lucide-react';
import { motion } from 'motion/react';

const LessonFirst: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6 space-y-8 bg-white"
    >
      {/* Header */}
      <header className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-blue-600 mb-2">
          <BookOpen size={20} />
          <span className="font-medium uppercase tracking-wider text-sm">Модуль 1 • Урок 1</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
          Народження обміну: Як зародилась економіка
        </h1>
      </header>

      {/* Main Content */}
      <section className="prose prose-slate max-w-none space-y-6 text-slate-700">
        <p className="text-lg leading-relaxed">
          Економіка почалася не з грошей, а з **довіри та потреби**. До появи золотих монет люди використовували систему бартеру — прямий обмін товарами.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg italic">
          "Ти мені — мішок зерна, я тобі — вироблений глечик. Це було просто, поки в обох сторін були взаємні потреби."
        </div>

        <h3 className="text-xl font-semibold text-slate-900">Еволюційні кроки:</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
          {[
            { title: 'Натуральний обмін', desc: 'Бартер без посередників.' },
            { title: 'Товарні гроші', desc: 'Сіль, хутро, черепашки каурі.' },
            { title: 'Металеві гроші', desc: 'Золото та срібло як еталон цінності.' },
            { title: 'Карбована монета', desc: 'Державна гарантія ваги та якості.' }
          ].map((item, idx) => (
            <li key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <strong className="block text-slate-900 mb-1">{item.title}</strong>
              <span className="text-sm text-slate-500">{item.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Additional Materials Block */}
      <section className="space-y-4 pt-8">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <PlayCircle size={24} className="text-red-500" />
          Додаткові матеріали
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a 
            href="#" 
            className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-medium">Історія грошей (Відео)</span>
            <ExternalLink size={16} className="text-slate-400" />
          </a>
          <a 
            href="#" 
            className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-medium">Еволюція обміну (PDF)</span>
            <ExternalLink size={16} className="text-slate-400" />
          </a>
        </div>
      </section>

      {/* Navigation */}
      <footer className="flex justify-end pt-10">
        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-medium hover:bg-slate-800 transition-all active:scale-95">
          Наступний урок
          <ArrowRight size={18} />
        </button>
      </footer>
    </motion.div>
  );
};

export default LessonFirst;
