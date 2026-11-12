/**
 * Authoring + verification kit for the question bank.
 * `r` lets question text contain LaTeX backslashes without double escaping.
 * The numeric helpers are used by each math question's independent `check()`.
 */
export const r = String.raw;

export const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
export const ints = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
export const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
export const mean = (a: number[]) => sum(a) / a.length;
export const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const sd = (a: number[], sample = false) => {
  const m = mean(a);
  return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - (sample ? 1 : 0)));
};
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const rad = (deg: number) => (deg * Math.PI) / 180;

/** Real roots of f on [lo, hi] found by scanning for sign changes and bisecting. */
export function roots(f: (x: number) => number, lo: number, hi: number, n = 40000): number[] {
  const out: number[] = [];
  const push = (x: number) => { if (!out.some((y) => Math.abs(y - x) < 1e-6)) out.push(x); };
  let px = lo;
  let py = f(lo);
  for (let i = 1; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n;
    const y = f(x);
    if (Number.isFinite(py) && Number.isFinite(y)) {
      if (py === 0) push(px);
      else if (py * y < 0) {
        let a = px, b = x, fa = py;
        for (let k = 0; k < 80; k++) {
          const m = (a + b) / 2;
          const fm = f(m);
          if (fa * fm <= 0) b = m; else { a = m; fa = fm; }
        }
        const root = (a + b) / 2;
        // reject sign changes across a vertical asymptote
        if (Math.abs(f(root)) < 1e-4) push(root);
      }
    }
    px = x; py = y;
  }
  if (py === 0) push(px);
  return out.sort((a, b) => a - b);
}

/** True when the two lists contain the same numbers (order-insensitive, tolerance-based). */
export const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort((x, y) => x - y).every((x, i) => near(x, [...b].sort((p, q) => p - q)[i], 1e-5));

/** Exactly one of the candidate values satisfies the predicate, and it is the keyed one. */
export const only = (candidates: number[], keyed: number, pred: (v: number) => boolean) =>
  pred(keyed) && candidates.filter((c) => pred(c)).length === 1;
