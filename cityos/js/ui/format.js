export const fmtNum = (n) => Math.round(n).toLocaleString('en-US');
export const fmtPct = (n, d = 0) => (n * 100).toFixed(d) + '%';
export function fmtMoney(n, compact = true) {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (!compact) return sign + '$' + Math.round(a).toLocaleString('en-US');
  if (a >= 1e12) return sign + '$' + (a / 1e12).toFixed(2) + 'T';
  if (a >= 1e9) return sign + '$' + (a / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return sign + '$' + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'M';
  if (a >= 1e3) return sign + '$' + (a / 1e3).toFixed(0) + 'k';
  return sign + '$' + Math.round(a);
}
export const fmtCompact = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e8 ? 0 : 2) + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(0) + 'k';
  return Math.round(n).toLocaleString('en-US');
};
export const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
export function delta(now, prev, invert = false) {
  if (prev === undefined || prev === null || !isFinite(prev) || prev === 0) return { cls: 'fl', txt: '' };
  const d = (now - prev) / Math.abs(prev);
  if (Math.abs(d) < 0.0015) return { cls: 'fl', txt: '0.0%' };
  const good = invert ? d < 0 : d > 0;
  return { cls: good ? 'up' : 'dn', txt: (d > 0 ? '+' : '') + (d * 100).toFixed(1) + '%' };
}
