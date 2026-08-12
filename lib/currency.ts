export interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number; // per 1 USD
  label: string;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', rate: 1, label: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', rate: 0.92, label: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', rate: 0.79, label: 'British Pound' },
  MKD: { code: 'MKD', symbol: 'ден', rate: 57.5, label: 'Macedonian Denar' },
};

export const CURRENCY_LIST: CurrencyInfo[] = Object.values(CURRENCIES);

export function getCurrency(code: string): CurrencyInfo {
  return CURRENCIES[code] ?? CURRENCIES.USD;
}

export function getCurrencySymbol(code: string): string {
  return getCurrency(code).symbol;
}

export function convertPrice(price: number, from: string, to: string): number {
  const fromRate = getCurrency(from).rate;
  const toRate = getCurrency(to).rate;
  return price * (toRate / fromRate);
}
