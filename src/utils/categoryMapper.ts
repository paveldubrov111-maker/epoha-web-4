import { BudgetCategory, BudgetTx } from '../types';

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Транспорт': ['uber', 'bolt', 'uklon', 'taxi', 'пальне', 'gas', 'azk', 'wog', 'okko', 'socar', 'книжка', 'метро', 'автобус'],
  'Розваги': ['netflix', 'spotify', 'youtube', 'steam', 'psn', 'cinema', 'кіно', 'театр', 'парк', 'ігри', 'games'],
  'Житло': ['комуналка', 'оренда', 'rent', 'gas', 'water', 'electricity', 'інтернет', 'lanet', 'triolan', 'kyivstar'],
  'Здоров\'я': ['apteka', 'аптека', 'ліки', 'doctor', 'лікар', 'стоматолог', 'hospital', 'аналізи'],
  'Покупки': ['rozetka', 'prom', 'aliexpress', 'amazon', 'zara', 'h&m', 'одяг', 'clothes', 'shop'],
  'Зарплата': ['salary', 'зарплата', 'аванс', 'income', 'переказ', 'pay'],
};

export function matchCategory(description: string, categories: BudgetCategory[]): string | undefined {
  if (!description) return undefined;
  
  const desc = description.toLowerCase();
  
  // Try to find a match in keywords
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => desc.includes(kw))) {
      // Find the actual category ID in the user's categories
      const category = categories.find(c => c.name.toLowerCase() === catName.toLowerCase() || catName.toLowerCase().includes(c.name.toLowerCase()));
      if (category) return category.id;
    }
  }
  
  return undefined;
}
