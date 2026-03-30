import { Currency } from '../types';
import { CFG } from '../constants/config';

export function fmt(v: number | undefined | null, c: Currency) {
  if (v === undefined || v === null || isNaN(v)) return '0';
  const cfg = CFG[c];
  if (!cfg) return v.toLocaleString();
  const s = v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return cfg.suffix ? `${s} ${cfg.sym}` : `${cfg.sym}${s}`;
}

export function fmtUsd(v: number | undefined | null) {
  if (v === undefined || v === null || isNaN(v)) return '$0';
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatGlobal(val: number | undefined | null, cur: Currency, rates: Record<string, number>, sourceCur: Currency = 'USD') {
  if (val === 0 || val === undefined || val === null || isNaN(val)) return fmt(0, cur);
  
  // Якщо вхідна валюта вже збігається з цільовою, просто форматуємо
  if (sourceCur === cur) return fmt(val, cur);

  // Convert from source currency to USD first
  const usdVal = sourceCur === 'USD' ? val : val / (rates[sourceCur] || 1);
  // Then convert from USD to target currency
  const targetVal = usdVal * (rates[cur] || 1);
  return fmt(targetVal, cur);
}
