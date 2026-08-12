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

// --- Live rates (server-side only) ---

const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedRates: Record<string, number> | null = null;
let cachedAt = 0;

async function fetchLiveRates(): Promise<Record<string, number>> {
  const res = await fetch(RATES_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Rates API responded ${res.status}`);
  const data = await res.json();
  if (data?.result !== 'success' || !data?.rates) throw new Error('Invalid rates response');
  return data.rates as Record<string, number>;
}

/**
 * Returns live exchange rates (per 1 USD) for the supported currencies.
 * Falls back to the static rates if the API is unreachable.
 */
export async function getLiveRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < CACHE_TTL_MS) {
    return cachedRates;
  }
  try {
    const rates = await fetchLiveRates();
    const supported: Record<string, number> = {};
    for (const code of Object.keys(CURRENCIES)) {
      supported[code] = rates[code] ?? CURRENCIES[code].rate;
    }
    cachedRates = supported;
    cachedAt = now;
    return supported;
  } catch {
    // Fall back to static rates
    const fallback: Record<string, number> = {};
    for (const code of Object.keys(CURRENCIES)) {
      fallback[code] = CURRENCIES[code].rate;
    }
    return fallback;
  }
}

export async function convertPriceLive(price: number, from: string, to: string): Promise<number> {
  const rates = await getLiveRates();
  const fromRate = rates[from] ?? CURRENCIES[from]?.rate ?? 1;
  const toRate = rates[to] ?? CURRENCIES[to]?.rate ?? 1;
  return price * (toRate / fromRate);
}
