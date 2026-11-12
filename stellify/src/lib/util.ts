export const DAY = 86_400_000;

export const dateKey = (ts: number | Date = Date.now()) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const parseDateKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
export const addDays = (k: string, n: number) => { const d = new Date(parseDateKey(k)); d.setDate(d.getDate() + n); return dateKey(d); };
export const daysBetween = (a: string, b: string) => Math.round((parseDateKey(b) - parseDateKey(a)) / DAY);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));
export const sumBy = <T,>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + f(x), 0);

/** Deterministic PRNG so mock exams, daily challenges and tests are reproducible. */
export function rng(seed: number | string) {
  let h = 1779033703;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const fmtDuration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
};
export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const round10 = (x: number) => Math.round(x / 10) * 10;
