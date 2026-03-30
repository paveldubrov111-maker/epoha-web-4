import { Language } from '../types';

export const getLocalizedMonths = (lang: Language) => {
  const locale = lang === 'uk' ? 'uk-UA' : lang === 'ru' ? 'ru-RU' : 'en-US';
  const months = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(2024, i, 1);
    months.push(date.toLocaleString(locale, { month: 'long' }));
  }
  return months;
};
