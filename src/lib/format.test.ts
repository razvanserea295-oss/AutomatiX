import { describe, it, expect } from 'vitest';
import { convertMoney, formatMoney, parseBackendTimestamp, formatDateRo } from './format';

const RATE = 5; 

describe('convertMoney', () => {
  it('passes through when source and target currency match', () => {
    expect(convertMoney(1000, 'RON', 'RON', RATE)).toBe(1000);
    expect(convertMoney(1000, 'EUR', 'EUR', RATE)).toBe(1000);
  });

  it('converts RON → EUR by dividing by the rate', () => {
    expect(convertMoney(1000, 'RON', 'EUR', RATE)).toBe(200);
  });

  it('converts EUR → RON by multiplying by the rate', () => {
    expect(convertMoney(200, 'EUR', 'RON', RATE)).toBe(1000);
  });

  it('treats null/undefined currency as RON', () => {
    expect(convertMoney(1000, null, 'EUR', RATE)).toBe(200);
    expect(convertMoney(200, 'EUR', undefined, RATE)).toBe(1000);
  });

  it('never corrupts a value when the rate is missing/invalid', () => {
    expect(convertMoney(1000, 'RON', 'EUR', 0)).toBe(1000);
    expect(convertMoney(1000, 'RON', 'EUR', -1)).toBe(1000);
  });

  it('round-trips RON → EUR → RON', () => {
    const eur = convertMoney(1000, 'RON', 'EUR', RATE);
    expect(convertMoney(eur, 'EUR', 'RON', RATE)).toBe(1000);
  });
});

describe('useMoney pipeline (convert + format)', () => {
  
  
  const money = (value: number, native: string, display: string) =>
    formatMoney(convertMoney(value, native, display, RATE), display);

  it('a RON amount shown in EUR is converted, not just relabeled', () => {
    const ron = money(1000, 'RON', 'RON');
    const eur = money(1000, 'RON', 'EUR');
    expect(ron).not.toBe(eur);
    expect(ron).toMatch(/1\.000/);            
    expect(eur).toMatch(/200/);               
  });

  it('a EUR amount shown in RON is converted', () => {
    expect(money(200, 'EUR', 'RON')).toMatch(/1\.000/);
  });
});

describe('formatMoney', () => {
  it('defaults to RON with 0 fraction digits', () => {
    const s = formatMoney(1234.56);
    expect(s).toContain('RON');
    expect(s).toMatch(/1\.235/); // ro-RO grouping, rounded
  });

  it('formats EUR with 2 fraction digits by default', () => {
    const s = formatMoney(1234.5, 'EUR');
    expect(s).toContain('EUR');
    expect(s).toMatch(/1\.234,50/);
  });

  it('treats null/undefined currency as RON', () => {
    expect(formatMoney(10, null)).toContain('RON');
    expect(formatMoney(10, undefined)).toContain('RON');
  });

  it('coerces a null/NaN value to 0 rather than printing NaN', () => {
    expect(formatMoney(NaN as unknown as number)).not.toMatch(/NaN/);
    expect(formatMoney(0)).toMatch(/0/);
  });
});

describe('parseBackendTimestamp', () => {
  it('returns null for empty input', () => {
    expect(parseBackendTimestamp(null)).toBeNull();
    expect(parseBackendTimestamp(undefined)).toBeNull();
    expect(parseBackendTimestamp('')).toBeNull();
  });

  it('treats a naive "YYYY-MM-DD HH:MM:SS" string as UTC', () => {
    const d = parseBackendTimestamp('2026-06-29 10:30:00');
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe('2026-06-29T10:30:00.000Z');
  });

  it('respects an explicit timezone offset', () => {
    const d = parseBackendTimestamp('2026-06-29T12:00:00+02:00');
    expect(d!.toISOString()).toBe('2026-06-29T10:00:00.000Z');
  });

  it('returns null for an unparseable string', () => {
    expect(parseBackendTimestamp('not-a-date')).toBeNull();
  });
});

describe('formatDateRo', () => {
  it('renders an em dash for empty input', () => {
    expect(formatDateRo(null)).toBe('—');
  });

  it('echoes the raw string when it cannot be parsed', () => {
    expect(formatDateRo('not-a-date')).toBe('not-a-date');
  });
});
