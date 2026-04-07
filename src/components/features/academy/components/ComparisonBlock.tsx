import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ComparisonFeature {
  text: string;
  isPositive?: boolean;
  isNegative?: boolean;
  isWarning?: boolean;
}

interface ComparisonItem {
  icon: string;
  title: string;
  features: ComparisonFeature[];
}

interface ComparisonBlockProps {
  block: {
    items: ComparisonItem[];
    highlightIndex?: number;
  };
}

const ComparisonBlock: React.FC<ComparisonBlockProps> = ({ block }) => {
  return (
    <div className="compare-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 my-6">
      {block.items.map((item, idx) => (
        <div 
          key={idx}
          className={`cmp-card p-5 rounded-[2rem] border transition-all duration-500 shadow-2xl relative overflow-hidden group ${
            block.highlightIndex === idx 
              ? 'border-blue-500/40 bg-blue-500/[0.03] shadow-blue-500/10' 
              : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
          }`}
        >
          {block.highlightIndex === idx && (
             <div className="absolute top-0 right-0 p-3 opacity-10">
                <div className="w-16 h-16 bg-blue-500 rounded-full blur-[20px]" />
             </div>
          )}
          
          <div className="cmp-ico text-3xl mb-4 transform transition-transform group-hover:scale-110 duration-500">
            {item.icon}
          </div>
          <div className="cmp-title text-sm font-black text-white mb-4 uppercase tracking-wider">
            {item.title}
          </div>
          
          <div className="cmp-rows space-y-2">
            {item.features.map((feature, fidx) => (
              <div 
                key={fidx}
                className="cmp-row flex gap-3 items-start border-b border-white/5 last:border-b-0 py-2.5"
              >
                <span className="shrink-0 mt-0.5">
                  {feature.isPositive && <Check size={12} className="text-emerald-500" />}
                  {feature.isNegative && <X size={12} className="text-red-500" />}
                  {feature.isWarning && <AlertTriangle size={12} className="text-amber-500" />}
                  {!feature.isPositive && !feature.isNegative && !feature.isWarning && <span className="text-blue-500 text-[10px]">→</span>}
                </span>
                <span className="text-[11px] text-gray-400 font-medium leading-relaxed">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ComparisonBlock;
