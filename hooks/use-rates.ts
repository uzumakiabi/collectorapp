'use client';

import { useEffect, useState } from 'react';
import { CURRENCIES } from '@/lib/currency';

function staticRates(): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const code of Object.keys(CURRENCIES)) {
    rates[code] = CURRENCIES[code].rate;
  }
  return rates;
}

let ratesPromise: Promise<Record<string, number>> | null = null;
let cachedRates: Record<string, number> | null = null;

function loadRates(): Promise<Record<string, number>> {
  if (!ratesPromise) {
    ratesPromise = fetch('/api/rates')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load rates'))))
      .then((data) => {
        const rates = data?.rates;
        if (!rates || typeof rates !== 'object') throw new Error('Invalid rates');
        cachedRates = rates as Record<string, number>;
        return cachedRates;
      })
      .catch(() => {
        const fallback = staticRates();
        cachedRates = fallback;
        return fallback;
      });
  }
  return ratesPromise;
}

export function useRates(): Record<string, number> | null {
  const [rates, setRates] = useState<Record<string, number> | null>(cachedRates);

  useEffect(() => {
    let active = true;
    loadRates().then((next) => {
      if (active) setRates(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return rates;
}
