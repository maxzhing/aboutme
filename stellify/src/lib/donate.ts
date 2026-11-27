import config from '@/data/donate.json';

/** Optional donations. Stellify stays free for everyone, whether or not they give. Settings: src/data/donate.json. */
export const DONATE = config as { url: string; currency: string; amounts: number[]; min: number; max: number };
const url = () => (globalThis as { __STELLIFY_DONATE_URL__?: string }).__STELLIFY_DONATE_URL__ ?? DONATE.url;
export const donationsOpen = () => Boolean(url());

/** A whole or two-decimal amount within the allowed range, or null. */
export function parseAmount(raw: string | number): number | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(n) || n < DONATE.min || n > DONATE.max) return null;
  return Math.round(n * 100) / 100;
}

/** The payment page for an amount ({amount} in the address is filled in), or null while donations aren't set up. */
export function donateLink(amount: number): string | null {
  const u = url(); if (!u) return null;
  return u.includes('{amount}') ? u.replace('{amount}', String(amount)) : u;
}
