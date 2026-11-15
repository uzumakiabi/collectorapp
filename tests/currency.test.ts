import { describe, expect, it } from 'vitest';
import { CURRENCY_LIST, convertWithRates } from '@/lib/currency';

const RATES = { USD: 1, EUR: 0.92, GBP: 0.79, MKD: 57.5 };

describe('convertWithRates', () => {
  it('returns the same value for the same currency', () => {
    expect(convertWithRates(42.5, 'USD', 'USD', RATES)).toBe(42.5);
    expect(convertWithRates(42.5, 'MKD', 'MKD', RATES)).toBe(42.5);
  });

  it('converts USD to EUR', () => {
    expect(convertWithRates(100, 'USD', 'EUR', RATES)).toBe(92);
  });

  it('converts EUR to MKD', () => {
    expect(convertWithRates(10, 'EUR', 'MKD', RATES)).toBe(625);
  });

  it('rounds to 2 decimals', () => {
    expect(convertWithRates(1, 'EUR', 'USD', RATES)).toBe(1.09);
    expect(convertWithRates(10, 'USD', 'EUR', RATES)).toBe(9.2);
    expect(convertWithRates(3, 'USD', 'EUR', RATES)).toBe(2.76);
  });

  it('falls back to the static rate when a rate is missing', () => {
    expect(convertWithRates(100, 'USD', 'EUR', { USD: 1 })).toBe(92);
    expect(convertWithRates(100, 'USD', 'MKD', {})).toBe(5750);
  });
});

describe('CURRENCY_LIST', () => {
  it('offers exactly USD, EUR and MKD', () => {
    expect(CURRENCY_LIST.map((c) => c.code)).toEqual(['USD', 'EUR', 'MKD']);
  });
});
