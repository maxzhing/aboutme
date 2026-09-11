/* indicators.js — technical indicators computed from real OHLCV bars.
   Every function takes plain number arrays and returns arrays aligned to the
   input length, with NaN for the warm-up period. No dependencies. */

import { mean, stdev, clamp } from './util.js';

export function sma(values, period) {
  const out = new Array(values.length).fill(NaN);
  let running = 0;
  for (let i = 0; i < values.length; i++) {
    running += values[i];
    if (i >= period) running -= values[i - period];
    if (i >= period - 1) out[i] = running / period;
  }
  return out;
}

export function ema(values, period) {
  const out = new Array(values.length).fill(NaN);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = mean(values.slice(0, period));
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/* Wilder's RSI. */
export function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(NaN);
  if (closes.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= period; loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + (d > 0 ? d : 0)) / period;
    loss = (loss * (period - 1) + (d < 0 ? -d : 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function macd(closes, fast = 12, slow = 26, signalPeriod = 9) {
  const ef = ema(closes, fast), es = ema(closes, slow);
  const line = closes.map((_, i) => (isFinite(ef[i]) && isFinite(es[i]) ? ef[i] - es[i] : NaN));
  const seed = line.findIndex(isFinite);
  const compact = seed < 0 ? [] : line.slice(seed);
  const sig = ema(compact, signalPeriod);
  const signal = new Array(closes.length).fill(NaN);
  sig.forEach((v, i) => { signal[seed + i] = v; });
  const hist = line.map((v, i) => (isFinite(v) && isFinite(signal[i]) ? v - signal[i] : NaN));
  return { line, signal, hist };
}

export function bollinger(closes, period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper = new Array(closes.length).fill(NaN);
  const lower = new Array(closes.length).fill(NaN);
  for (let i = period - 1; i < closes.length; i++) {
    const sd = stdev(closes.slice(i - period + 1, i + 1));
    upper[i] = mid[i] + mult * sd;
    lower[i] = mid[i] - mult * sd;
  }
  return { upper, mid, lower };
}

/* Wilder's ATR — the volatility unit this app sizes stops and targets in. */
export function atr(highs, lows, closes, period = 14) {
  const n = closes.length;
  const out = new Array(n).fill(NaN);
  if (n <= period) return out;
  const tr = new Array(n).fill(NaN);
  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1]),
    );
  }
  let prev = mean(tr.slice(1, period + 1));
  out[period] = prev;
  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

export function stochastic(highs, lows, closes, period = 14, smoothK = 3) {
  const n = closes.length;
  const raw = new Array(n).fill(NaN);
  for (let i = period - 1; i < n; i++) {
    const hh = Math.max(...highs.slice(i - period + 1, i + 1));
    const ll = Math.min(...lows.slice(i - period + 1, i + 1));
    raw[i] = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100;
  }
  const seed = raw.findIndex(isFinite);
  const k = new Array(n).fill(NaN);
  if (seed >= 0) sma(raw.slice(seed), smoothK).forEach((v, i) => { k[seed + i] = v; });
  return { raw, k };
}

/* On-balance volume — accumulation/distribution proxy. */
export function obv(closes, volumes) {
  const out = new Array(closes.length).fill(0);
  for (let i = 1; i < closes.length; i++) {
    const dir = Math.sign(closes[i] - closes[i - 1]);
    out[i] = out[i - 1] + dir * (volumes[i] || 0);
  }
  return out;
}

/* Annualised realised volatility from daily log returns, in percent. */
export function realizedVol(closes, period = 20) {
  if (closes.length < period + 1) return NaN;
  const rets = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  const sd = stdev(rets);
  return isFinite(sd) ? sd * Math.sqrt(252) * 100 : NaN;
}

export function rateOfChange(closes, period = 20) {
  if (closes.length <= period) return NaN;
  const then = closes[closes.length - 1 - period];
  if (!then) return NaN;
  return (closes[closes.length - 1] / then - 1) * 100;
}

/* Max drawdown of an equity/price series, in percent. */
export function maxDrawdown(values) {
  let peak = -Infinity, worst = 0;
  for (const v of values) {
    if (!isFinite(v)) continue;
    peak = Math.max(peak, v);
    if (peak > 0) worst = Math.min(worst, (v / peak - 1) * 100);
  }
  return worst;
}

/* Pivot highs/lows: a bar that is the extreme of a +/- k window.
   These are the levels a chart reader would actually draw. */
export function pivots(highs, lows, k = 5) {
  const hi = [], lo = [];
  for (let i = k; i < highs.length - k; i++) {
    let isHi = true, isLo = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if (highs[j] >= highs[i]) isHi = false;
      if (lows[j] <= lows[i]) isLo = false;
      if (!isHi && !isLo) break;
    }
    if (isHi) hi.push({ i, price: highs[i] });
    if (isLo) lo.push({ i, price: lows[i] });
  }
  return { highs: hi, lows: lo };
}

/* Collapse nearby pivots into levels; a level touched more often matters more. */
export function clusterLevels(points, tolerance, recentIndex) {
  const sorted = points.slice().sort((a, b) => a.price - b.price);
  const levels = [];
  for (const p of sorted) {
    const last = levels[levels.length - 1];
    if (last && Math.abs(p.price - last.price) <= tolerance) {
      last.members.push(p);
      last.price = mean(last.members.map((m) => m.price));
      last.lastIndex = Math.max(last.lastIndex, p.i);
    } else {
      levels.push({ price: p.price, members: [p], lastIndex: p.i });
    }
  }
  return levels.map((l) => {
    const touches = l.members.length;
    const age = recentIndex ? clamp(1 - (recentIndex - l.lastIndex) / recentIndex, 0, 1) : 0.5;
    return {
      price: l.price,
      touches,
      lastIndex: l.lastIndex,
      /* Strength blends how often a level was respected with how recent it is. */
      strength: clamp(touches / 4 * 0.7 + age * 0.3, 0, 1),
    };
  });
}

/* Consecutive up/down closes ending at the last bar. */
export function streak(closes) {
  let n = 0, dir = 0;
  for (let i = closes.length - 1; i > 0; i--) {
    const d = Math.sign(closes[i] - closes[i - 1]);
    if (d === 0) break;
    if (dir === 0) { dir = d; n = 1; }
    else if (d === dir) n++;
    else break;
  }
  return { dir, count: n };
}
