import React, { useState, useEffect } from 'react';

interface PlannerInputProps {
  label: React.ReactNode;
  value: number | string;
  onChange: (v: any) => void;
  symbol?: string;
  type?: string;
  suffix?: string;
}

const PlannerInput: React.FC<PlannerInputProps> = ({
  label,
  value,
  onChange,
  symbol,
  type = 'number',
  suffix = ''
}) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    if (type === 'number' && Number(localValue) !== Number(value)) {
      setLocalValue(value.toString());
    } else if (type !== 'number' && localValue !== value) {
      setLocalValue(value.toString());
    }
  }, [value, type]);

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
      <label className="text-sm text-zinc-600 dark:text-zinc-400">{label}</label>
      <div className="relative w-32">
        {symbol && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{symbol}</span>}
        <input
          type={type}
          step="any"
          value={type === 'number' ? localValue : value}
          onChange={(e) => {
            if (type === 'number') {
              setLocalValue(e.target.value);
              const parsed = parseFloat(e.target.value);
              if (!isNaN(parsed)) {
                onChange(parsed);
              } else if (e.target.value === '') {
                onChange(0);
              }
            } else {
              onChange(e.target.value);
            }
          }}
          onBlur={() => {
            if (type === 'number') {
              setLocalValue(Number(value).toString());
            }
          }}
          className={`w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2 ${symbol ? 'pl-8' : 'px-3'} ${suffix ? 'pr-10' : 'pr-3'} text-sm focus:outline-none focus:border-blue-500 text-right font-medium`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">{suffix}</span>}
      </div>
    </div>
  );
};

export default PlannerInput;
