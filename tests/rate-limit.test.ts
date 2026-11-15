import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enforces the limit', () => {
    expect(rateLimit('limit-key', 2, 60_000)).toBe(true);
    expect(rateLimit('limit-key', 2, 60_000)).toBe(true);
    expect(rateLimit('limit-key', 2, 60_000)).toBe(false);
    expect(rateLimit('limit-key', 2, 60_000)).toBe(false);
  });

  it('resets after the window elapses', () => {
    expect(rateLimit('window-key', 1, 60_000)).toBe(true);
    expect(rateLimit('window-key', 1, 60_000)).toBe(false);

    vi.setSystemTime(new Date('2026-01-01T00:01:01.000Z'));

    expect(rateLimit('window-key', 1, 60_000)).toBe(true);
  });
});

describe('getClientIp', () => {
  it('prefers the first x-forwarded-for entry', () => {
    const request = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'x-real-ip': '198.51.100.9' },
    });
    expect(getClientIp(request)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip', () => {
    const request = new Request('http://localhost/', { headers: { 'x-real-ip': '198.51.100.9' } });
    expect(getClientIp(request)).toBe('198.51.100.9');
  });

  it('returns unknown when no header is present', () => {
    expect(getClientIp(new Request('http://localhost/'))).toBe('unknown');
  });
});
