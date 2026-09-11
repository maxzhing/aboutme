/* util.js — small shared helpers: storage, formatting, DOM, math primitives. */

export const LS_PREFIX = 'sai.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}

export function save(key, value) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); return true; }
  catch { return false; }
}

export function remove(key) {
  try { localStorage.removeItem(LS_PREFIX + key); } catch {}
}

/* ---------- formatting ---------- */

export const money = (n, cur = 'USD') => {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  const digits = abs === 0 || abs >= 1 ? 2 : 4;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: cur,
      minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(n);
  } catch { return '$' + n.toFixed(digits); }
};

export const compact = (n) => {
  if (!isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
};

export const pct = (n, digits = 1) => (isFinite(n) ? (n >= 0 ? '+' : '') + n.toFixed(digits) + '%' : '—');
export const pctPlain = (n, digits = 1) => (isFinite(n) ? n.toFixed(digits) + '%' : '—');
export const num = (n, digits = 2) => (isFinite(n) ? n.toFixed(digits) : '—');

export const fmtDate = (t) => {
  const d = t instanceof Date ? t : new Date(t);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const fmtDateTime = (t) => {
  const d = t instanceof Date ? t : new Date(t);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

/* Trading-day distance is approximated at 252/365 of calendar days. */
export const tradingDaysBetween = (a, b) =>
  Math.max(0, Math.round(((b - a) / 86400000) * (252 / 365)));

/* ---------- math ---------- */

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const sum = (a) => a.reduce((s, x) => s + x, 0);
export const mean = (a) => (a.length ? sum(a) / a.length : NaN);

export function stdev(a) {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - 1));
}

export function median(a) { return quantile(a, 0.5); }

/* Linear-interpolated quantile. Input need not be sorted. */
export function quantile(a, q) {
  const s = a.filter(isFinite).slice().sort((x, y) => x - y);
  if (!s.length) return NaN;
  const pos = clamp(q, 0, 1) * (s.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/* Fraction of values strictly below v — "how much of this window sat under today". */
export function pctRank(a, v) {
  const s = a.filter(isFinite);
  if (!s.length) return NaN;
  return s.filter((x) => x < v).length / s.length;
}

/* Slope of the least-squares fit, expressed as % of the mean level per bar. */
export function slopePct(a) {
  const n = a.length;
  if (n < 3) return NaN;
  const xs = a.map((_, i) => i);
  const mx = mean(xs), my = mean(a);
  let cov = 0, varx = 0;
  for (let i = 0; i < n; i++) { cov += (xs[i] - mx) * (a[i] - my); varx += (xs[i] - mx) ** 2; }
  if (!varx || !my) return NaN;
  return (cov / varx) / Math.abs(my) * 100;
}

export const lastN = (a, n) => a.slice(Math.max(0, a.length - n));

/* ---------- dom ---------- */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* fetch with a hard timeout — every remote source in this app is best-effort. */
export async function fetchTimeout(url, opts = {}, ms = 12000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal });
  } finally { clearTimeout(timer); }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
