import React from 'react';

interface MetricProps {
  label: React.ReactNode;
  value: React.ReactNode;
  valueClass?: string;
}

const Metric: React.FC<MetricProps> = ({
  label,
  value,
  valueClass = "text-zinc-900 dark:text-zinc-100"
}) => (
  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">{label}</div>
    <div className={`text-base font-medium ${valueClass}`}>{value}</div>
  </div>
);

export default Metric;
