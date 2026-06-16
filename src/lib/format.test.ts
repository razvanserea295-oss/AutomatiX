import { describe, it, expect } from 'vitest';
import { convertMoney, formatMoney } from './format';

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
