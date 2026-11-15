import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from '@/lib/csv';

describe('csv', () => {
  it('round trips commas, quotes and newlines', () => {
    const rows = [
      ['name', 'description'],
      ['Widget, large', 'He said "hello"'],
      ['Multi', 'line1\nline2'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('prefixes formula-injection payloads', () => {
    expect(toCsv([['=SUM(A1:A2)']])).toBe("'=SUM(A1:A2)");
    expect(toCsv([['+1']])).toBe("'+1");
    expect(toCsv([['@cmd']])).toBe("'@cmd");
  });

  it('leaves a negative numeric value unchanged', () => {
    expect(toCsv([[-5.2]])).toBe('-5.2');
    expect(toCsv([['-5.2']])).toBe('-5.2');
  });

  it('strips a leading BOM when parsing', () => {
    expect(parseCsv('\uFEFFname,category\r\nWidget,Coins')).toEqual([
      ['name', 'category'],
      ['Widget', 'Coins'],
    ]);
  });
});
