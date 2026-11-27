import { describe, expect, it } from 'vitest';
import { DONATE, donateLink, parseAmount } from '@/lib/donate';

describe('donations', () => {
  it('accepts set and typed amounts in range, rejects others', () => {
    expect(DONATE.amounts.length).toBeGreaterThan(0);
    for (const a of DONATE.amounts) expect(parseAmount(a)).toBe(a);
    expect(parseAmount('$15')).toBe(15);
    expect(parseAmount('12.345')).toBe(12.35);
    expect(parseAmount('1,000')).toBe(1000);
    for (const bad of ['', 'abc', '0', '0.5', '-5', '1001', 'NaN']) expect(parseAmount(bad)).toBeNull();
  });
  it('fills the amount into the payment address, and says so when none is set', () => {
    const g = globalThis as { __STELLIFY_DONATE_URL__?: string };
    g.__STELLIFY_DONATE_URL__ = '';
    expect(donateLink(10)).toBeNull();
    g.__STELLIFY_DONATE_URL__ = 'https://pay.example/d?amount={amount}';
    expect(donateLink(25)).toBe('https://pay.example/d?amount=25');
    g.__STELLIFY_DONATE_URL__ = 'https://ko-fi.com/stellify';
    expect(donateLink(25)).toBe('https://ko-fi.com/stellify');
    delete g.__STELLIFY_DONATE_URL__;
  });
});
