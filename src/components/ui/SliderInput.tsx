import React from 'react';

interface SliderInputProps {
  label: React.ReactNode;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  symbol: string;
}

const SliderInput: React.FC<SliderInputProps> = ({
  label, min, max, step, value, onChange, symbol
}) => (
  <div className="mb-4">
    <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-600"
      />
      <input
        type="number"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!isNaN(v)) onChange(Math.min(Math.max(v, min), max));
        }}
        className="w-20 px-2 py-1 text-right text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
      />
      <span className="text-sm text-zinc-500 w-4">{symbol}</span>
    </div>
  </div>
);

export default SliderInput;
