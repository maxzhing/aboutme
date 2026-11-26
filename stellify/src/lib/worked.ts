/**
 * Checks a typed step answer against the accepted forms: ignores spaces, a leading "x =" style label and a
 * trailing "%", accepts a real minus sign, and compares numbers by value (so 0.8, .8 and 4/5 all match 4/5).
 */
const toNum = (s: string): number | null => {
  const m = s.match(/^(-?\d*\.?\d+)\/(-?\d*\.?\d+)$/);
  if (m) { const d = Number(m[2]); return d ? Number(m[1]) / d : null; }
  return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? Number(s) : null;
};
export const normalize = (s: string) => s.trim().replace(/−/g, '-').replace(/\s+/g, '').replace(/^[a-z]\(?[a-z0-9]*\)?=/i, '').replace(/%$/, '').replace(/,(?=\d{3}\b)/g, '').toLowerCase();
export function matches(input: string, accepted: string[]): boolean {
  const a = normalize(input);
  if (!a) return false;
  const an = toNum(a);
  return accepted.some((x) => {
    const b = normalize(x);
    const bn = toNum(b);
    return an !== null && bn !== null ? Math.abs(an - bn) <= 1e-4 * Math.max(1, Math.abs(bn)) : a === b;
  });
}
