import { Currency } from '../types';

export const CFG: Record<Currency, {
  sym: string;
  suffix: boolean;
  maxP: number;
  stepP: number;
  defP: number;
  maxM: number;
  stepM: number;
  defM: number;
  defR: number;
  depDef: number;
  defBuy: number;
}> = {
  UAH: { sym: '₴', suffix: true, maxP: 500000, stepP: 5000, defP: 50000, maxM: 20000, stepM: 500, defM: 0, defR: 15, depDef: 15, defBuy: 2000 },
  USD: { sym: '$', suffix: false, maxP: 50000, stepP: 100, defP: 1000, maxM: 2000, stepM: 50, defM: 0, defR: 7, depDef: 5, defBuy: 100 },
  EUR: { sym: '€', suffix: false, maxP: 50000, stepP: 100, defP: 1000, maxM: 2000, stepM: 50, defM: 0, defR: 7, depDef: 5, defBuy: 100 },
  PLN: { sym: 'zł', suffix: true, maxP: 200000, stepP: 1000, defP: 5000, maxM: 10000, stepM: 100, defM: 0, defR: 10, depDef: 10, defBuy: 500 },
  GBP: { sym: '£', suffix: false, maxP: 40000, stepP: 100, defP: 1000, maxM: 1500, stepM: 50, defM: 0, defR: 5, depDef: 5, defBuy: 100 }
};
