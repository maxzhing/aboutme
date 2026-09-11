/* engine.js — the deterministic analyzer.

   Everything here is computed from real OHLCV bars: no opinions, no guesses.
   It answers the four questions the app exists to answer:
     1. Where are this stock's lows, in its own terms?
     2. Is today a low? (IREN usually trades over 40 — at 35, say so.)
     3. Is it high for what it is?
     4. Buy, sell or hold — and at what prices.

   The LLM layer sits on top of this and narrates it. If the AI is unavailable
   the verdict below still stands on its own. */

import {
  clamp, mean, median, quantile, pctRank, slopePct, stdev, lastN, dayKey,
} from './util.js';
import {
  sma, rsi, macd, bollinger, atr, stochastic, obv, realizedVol,
  rateOfChange, pivots, clusterLevels, streak,
} from './indicators.js';

/* Base factor weights. The learning module scales these by realised hit rate,
   so the mix the app ships with is only a starting point. */
export const BASE_WEIGHTS = {
  valuePosition: 1.4,
  discountToTypical: 1.2,
  trendQuality: 1.3,
  meanReversion: 1.0,
  bandPosition: 0.7,
  momentumTrend: 1.0,
  dipInUptrend: 0.9,
  volumeSignal: 0.6,
  supportProximity: 0.8,
  empiricalEdge: 1.3,
};

export const FACTOR_LABELS = {
  valuePosition: 'Position in its own 1-year range',
  discountToTypical: 'Discount / premium vs typical price',
  trendQuality: 'Trend quality',
  meanReversion: 'Oversold / overbought (RSI)',
  bandPosition: 'Bollinger band position',
  momentumTrend: 'Momentum (MACD + rate of change)',
  dipInUptrend: 'Pullback depth vs 52-week high',
  volumeSignal: 'Volume behaviour',
  supportProximity: 'Distance to support / resistance',
  empiricalEdge: 'What this price level historically paid',
};

const VERDICTS = ['STRONG BUY', 'BUY', 'HOLD', 'REDUCE', 'SELL'];

/* A "nice" round number just below a price — the level a human would quote.
   For a $44 stock this returns $40, which is how people actually talk about
   a stock's normal range. */
function roundAnchor(price) {
  if (!isFinite(price) || price <= 0) return 0;
  const step = price < 5 ? 0.5 : price < 20 ? 1 : price < 50 ? 5 : price < 200 ? 10 : price < 1000 ? 50 : 100;
  return Math.floor(price / step) * step;
}

function windowStats(closes, price) {
  if (!closes.length) return null;
  return {
    n: closes.length,
    high: Math.max(...closes),
    low: Math.min(...closes),
    p05: quantile(closes, 0.05),
    p10: quantile(closes, 0.10),
    p25: quantile(closes, 0.25),
    p50: quantile(closes, 0.50),
    p75: quantile(closes, 0.75),
    p90: quantile(closes, 0.90),
    p95: quantile(closes, 0.95),
    rank: pctRank(closes, price),
  };
}

/* Empirical forward-return study.
   For every past bar, work out which decile of its own trailing year it was
   trading in, then record what actually happened over the next N sessions.
   This turns "is this a good price" into a measured question about this
   specific stock rather than a rule of thumb. */
function forwardStudy(closes, horizon) {
  const lookback = 252;
  const buckets = Array.from({ length: 10 }, () => []);
  for (let i = lookback; i < closes.length - horizon; i++) {
    const window = closes.slice(i - lookback, i);
    const rank = pctRank(window, closes[i]);
    if (!isFinite(rank)) continue;
    const b = clamp(Math.floor(rank * 10), 0, 9);
    buckets[b].push((closes[i + horizon] / closes[i] - 1) * 100);
  }
  return buckets.map((rets, i) => ({
    decile: i,
    label: `${i * 10}–${i * 10 + 10}%`,
    n: rets.length,
    median: rets.length ? median(rets) : NaN,
    mean: rets.length ? mean(rets) : NaN,
    positive: rets.length ? rets.filter((r) => r > 0).length / rets.length * 100 : NaN,
    best: rets.length ? Math.max(...rets) : NaN,
    worst: rets.length ? Math.min(...rets) : NaN,
  }));
}

function regimeOf({ price, s50, s200, slope50, slope200 }) {
  const has200 = isFinite(s200);
  if (has200) {
    if (price > s50 && s50 > s200 && slope200 > 0.01) return { id: 'strong_uptrend', label: 'Strong uptrend' };
    if (price > s200 && slope200 >= -0.01) return { id: 'uptrend', label: 'Uptrend' };
    if (price < s200 && price < s50 && slope50 < -0.05) return { id: 'breakdown', label: 'Breaking down' };
    if (price < s200 && slope200 < -0.01) return { id: 'downtrend', label: 'Downtrend' };
    return { id: 'range', label: 'Rangebound' };
  }
  if (isFinite(s50)) {
    if (price > s50 && slope50 > 0) return { id: 'uptrend', label: 'Uptrend (short history)' };
    if (price < s50 && slope50 < 0) return { id: 'downtrend', label: 'Downtrend (short history)' };
  }
  return { id: 'range', label: 'Rangebound' };
}

/* ---------- the analyzer ---------- */

export function analyze(hist, { weightMultipliers = {}, equity = 0, riskPct = 1.5, maxPosPct = 20 } = {}) {
  const rows = hist.rows.slice();
  if (rows.length < 60) throw new Error(`need at least 60 bars to analyse, got ${rows.length}`);

  /* Fold the live quote into the series so every number below describes now,
     not yesterday's close. */
  const live = isFinite(hist.livePrice) && hist.livePrice > 0 ? hist.livePrice : null;
  if (live) {
    const last = rows[rows.length - 1];
    const sameDay = dayKey(hist.quoteTime || Date.now()) === dayKey(last.t);
    if (sameDay) {
      rows[rows.length - 1] = { ...last, c: live, h: Math.max(last.h, live), l: Math.min(last.l, live) };
    } else if (Math.abs(live / last.c - 1) > 0.0001) {
      rows.push({ t: hist.quoteTime || Date.now(), o: last.c, h: Math.max(last.c, live), l: Math.min(last.c, live), c: live, v: 0 });
    }
  }

  const cur0 = hist.currency || 'USD';
  /* Same half-up rounding the UI's money() uses, so a level never prints as
     35.63 in one place and 35.64 in another. */
  const m0 = (v) => (isFinite(v) ? (cur0 === 'USD' ? '$' : '') + (Math.round(v * 100) / 100).toFixed(2) : '—');

  const closes = rows.map((r) => r.c);
  const highs = rows.map((r) => r.h);
  const lows = rows.map((r) => r.l);
  const vols = rows.map((r) => r.v);
  const n = closes.length;
  const i = n - 1;
  const price = closes[i];

  /* ---- trend ---- */
  const s20a = sma(closes, 20), s50a = sma(closes, 50), s200a = sma(closes, 200);
  const s20 = s20a[i], s50 = s50a[i], s200 = s200a[i];
  const slope50 = slopePct(lastN(s50a.filter(isFinite), 20));
  const slope200 = slopePct(lastN(s200a.filter(isFinite), 40));
  const regime = regimeOf({ price, s50, s200, slope50, slope200 });

  /* ---- momentum ---- */
  const rsiA = rsi(closes, 14);
  const rsi14 = rsiA[i];
  const macdA = macd(closes);
  const stochA = stochastic(highs, lows, closes, 14, 3);
  const roc20 = rateOfChange(closes, 20);
  const roc63 = rateOfChange(closes, 63);

  /* ---- volatility ---- */
  const atrA = atr(highs, lows, closes, 14);
  const atr14 = isFinite(atrA[i]) ? atrA[i] : (price * 0.02);
  const atrPct = (atr14 / price) * 100;
  const bbA = bollinger(closes, 20, 2);
  const bbUpper = bbA.upper[i], bbLower = bbA.lower[i], bbMid = bbA.mid[i];
  const pctB = isFinite(bbUpper) && bbUpper !== bbLower ? (price - bbLower) / (bbUpper - bbLower) : 0.5;
  const bbWidth = isFinite(bbUpper) ? ((bbUpper - bbLower) / bbMid) * 100 : NaN;
  const vol20 = realizedVol(closes, 20);
  const vol60 = realizedVol(closes, 60);

  /* ---- volume ---- */
  const vLast = vols[i];
  const vAvg20 = mean(lastN(vols, 20).filter((v) => v > 0));
  const volRatio = vAvg20 > 0 ? vLast / vAvg20 : NaN;
  const obvA = obv(closes, vols);
  const obvSlope = slopePct(lastN(obvA, 20));

  /* ---- ranges and where we sit in them ---- */
  const w252 = lastN(closes, 252), w126 = lastN(closes, 126), w63 = lastN(closes, 63);
  const r252 = windowStats(w252, price);
  const r126 = windowStats(w126, price);
  const r63 = windowStats(w63, price);

  const hi252 = Math.max(...lastN(highs, 252));
  const lo252 = Math.min(...lastN(lows, 252));
  const fromHighPct = ((price / hi252) - 1) * 100;
  const fromLowPct = ((price / lo252) - 1) * 100;

  const typical = r252.p50;
  const discountPct = ((typical - price) / typical) * 100;   /* + = below typical */
  const iqr = r252.p75 - r252.p25;
  const daysAbovePrice = (w252.filter((c) => c > price).length / w252.length) * 100;
  const anchor = roundAnchor(typical);
  const daysAboveAnchor = anchor > 0 ? (w252.filter((c) => c > anchor).length / w252.length) * 100 : NaN;

  /* How stretched is price against its own 50-day mean, in that gap's own
     standard deviations? This is the "usually trades over 40" measure. */
  const gaps = [];
  for (let k = Math.max(0, n - 252); k <= i; k++) if (isFinite(s50a[k])) gaps.push(closes[k] - s50a[k]);
  const gapSd = stdev(gaps);
  const gapZ = gapSd > 0 && isFinite(s50) ? (price - s50) / gapSd : 0;

  /* ---- support and resistance ---- */
  const pvLookback = Math.min(n, 300);
  const start = n - pvLookback;
  const pv = pivots(highs.slice(start), lows.slice(start), 5);
  const tol = atr14 * 0.9;
  const supportsRaw = clusterLevels(pv.lows, tol, pvLookback).filter((l) => l.price < price * 0.998);
  const resistRaw = clusterLevels(pv.highs, tol, pvLookback).filter((l) => l.price > price * 1.002);

  const derived = [];
  if (isFinite(s200)) derived.push({ price: s200, type: '200-day average', strength: 0.6 });
  if (isFinite(s50)) derived.push({ price: s50, type: '50-day average', strength: 0.45 });
  if (isFinite(bbLower)) derived.push({ price: bbLower, type: 'lower Bollinger band', strength: 0.4 });
  derived.push({ price: lo252, type: '52-week low', strength: 0.7 });
  derived.push({ price: r252.p25, type: '1-year lower quartile', strength: 0.5 });

  const supports = [
    ...supportsRaw.map((l) => ({ ...l, type: `pivot low (${l.touches} touch${l.touches > 1 ? 'es' : ''})` })),
    ...derived.filter((d) => d.price < price * 0.998),
  ].sort((a, b) => b.price - a.price).slice(0, 5);

  const resistances = [
    ...resistRaw.map((l) => ({ ...l, type: `pivot high (${l.touches} touch${l.touches > 1 ? 'es' : ''})` })),
    ...[
      isFinite(bbUpper) ? { price: bbUpper, type: 'upper Bollinger band', strength: 0.4 } : null,
      { price: hi252, type: '52-week high', strength: 0.7 },
      { price: r252.p75, type: '1-year upper quartile', strength: 0.5 },
    ].filter(Boolean).filter((d) => d.price > price * 1.002),
  ].sort((a, b) => a.price - b.price).slice(0, 5);

  const nearSupport = supports[0] || null;
  const nearResist = resistances[0] || null;
  const supATR = nearSupport ? (price - nearSupport.price) / atr14 : 99;
  const resATR = nearResist ? (nearResist.price - price) / atr14 : 99;

  /* ---- empirical study ---- */
  const canStudy = n >= 252 + 40;
  const study20 = canStudy ? forwardStudy(closes, 20) : null;
  const study60 = n >= 252 + 80 ? forwardStudy(closes, 60) : null;
  const currentDecile = clamp(Math.floor(r252.rank * 10), 0, 9);
  const bucket20 = study20 ? study20[currentDecile] : null;
  const bucket60 = study60 ? study60[currentDecile] : null;

  /* ---- factors ---- */
  const f = {};
  const put = (key, score, note) => { f[key] = { key, label: FACTOR_LABELS[key], score: clamp(score, -1, 1), note }; };

  put('valuePosition', (0.5 - r252.rank) * 2.2,
    `Trading at the ${(r252.rank * 100).toFixed(0)}th percentile of its last year.`);

  put('discountToTypical', iqr > 0 ? (typical - price) / iqr : 0,
    discountPct >= 0
      ? `${discountPct.toFixed(1)}% below its 1-year typical price.`
      : `${Math.abs(discountPct).toFixed(1)}% above its 1-year typical price.`);

  {
    let t = 0;
    if (isFinite(s200)) t += price > s200 ? 0.40 : -0.40;
    if (isFinite(s200) && isFinite(s50)) t += s50 > s200 ? 0.25 : -0.25;
    if (isFinite(slope200)) t += clamp(slope200 * 8, -0.2, 0.2);
    if (isFinite(slope50)) t += clamp(slope50 * 4, -0.15, 0.15);
    put('trendQuality', t, `${regime.label}; price is ${isFinite(s200) ? (price > s200 ? 'above' : 'below') : 'un-measured against'} the 200-day.`);
  }

  put('meanReversion', isFinite(rsi14) ? (50 - rsi14) / 22 : 0,
    `RSI ${isFinite(rsi14) ? rsi14.toFixed(0) : '—'}${rsi14 <= 30 ? ' (oversold)' : rsi14 >= 70 ? ' (overbought)' : ''}.`);

  put('bandPosition', (0.5 - pctB) * 2,
    `${(pctB * 100).toFixed(0)}% of the way up the Bollinger channel.`);

  put('momentumTrend',
    clamp((macdA.hist[i] || 0) / atr14 * 1.2, -1, 1) * 0.6 + clamp((roc20 || 0) / 12, -1, 1) * 0.4,
    `MACD histogram ${isFinite(macdA.hist[i]) ? macdA.hist[i].toFixed(2) : '—'}, 20-day change ${isFinite(roc20) ? roc20.toFixed(1) + '%' : '—'}.`);

  {
    const dd = Math.abs(fromHighPct);
    let s;
    if (isFinite(s200) && price > s200) {
      s = clamp(dd / 18, 0, 1) * 0.9;
      if (dd > 35) s = Math.max(-0.5, 0.9 - (dd - 35) / 30);
    } else {
      s = -clamp(dd / 35, 0, 1);
    }
    put('dipInUptrend', s, `${dd.toFixed(1)}% below the 52-week high of ${hi252.toFixed(2)}.`);
  }

  {
    let s = isFinite(obvSlope) ? clamp(obvSlope * 0.02, -0.3, 0.3) : 0;
    if (r252.rank < 0.3 && volRatio > 1.6) s += 0.7;
    if (r252.rank > 0.75 && volRatio < 0.8) s -= 0.5;
    put('volumeSignal', s,
      `Volume ${isFinite(volRatio) ? volRatio.toFixed(2) + '×' : '—'} its 20-day average; on-balance volume ${isFinite(obvSlope) && obvSlope > 0 ? 'rising' : 'falling'}.`);
  }

  put('supportProximity',
    clamp(0.8 * (1 - supATR / 2.5), 0, 0.8) - clamp(0.6 * (1 - resATR / 2.5), 0, 0.6),
    nearSupport
      ? `Nearest support ${nearSupport.price.toFixed(2)} (${supATR.toFixed(1)} ATR below); nearest resistance ${nearResist ? nearResist.price.toFixed(2) : '—'}.`
      : 'No clear support below — price is at the low end of its record.');

  put('empiricalEdge',
    bucket20 && bucket20.n >= 5
      ? clamp(bucket20.median / 6, -1, 1) * Math.min(1, bucket20.n / 20)
      : 0,
    bucket20 && bucket20.n >= 5
      ? `At this level historically: median ${bucket20.median.toFixed(1)}% over the next 20 sessions (n=${bucket20.n}, ${bucket20.positive.toFixed(0)}% positive).`
      : study20
        ? 'No precedent — this stock has not traded at this point of its own range before, so there is nothing to measure.'
        : 'Not enough history for a forward-return study (needs ~1.5 years).');

  /* ---- weighted score ---- */
  const weights = {};
  let wSum = 0, wScore = 0, agreeWeight = 0;
  for (const key of Object.keys(BASE_WEIGHTS)) {
    const w = BASE_WEIGHTS[key] * clamp(weightMultipliers[key] ?? 1, 0.2, 3);
    weights[key] = w;
    wSum += w;
    wScore += w * f[key].score;
  }
  const score = wSum ? wScore / wSum : 0;
  for (const key of Object.keys(weights)) {
    if (Math.sign(f[key].score) === Math.sign(score) && f[key].score !== 0) agreeWeight += weights[key];
  }
  const agreement = wSum ? agreeWeight / wSum : 0;

  let verdict;
  if (score >= 0.42) verdict = 'STRONG BUY';
  else if (score >= 0.15) verdict = 'BUY';
  else if (score > -0.15) verdict = 'HOLD';
  else if (score > -0.42) verdict = 'REDUCE';
  else verdict = 'SELL';

  const volPenalty = clamp(((isFinite(vol20) ? vol20 : 30) - 45) / 4, 0, 18);
  const dataPenalty = n < 300 ? 10 : n < 500 ? 4 : 0;
  const conviction = Math.round(clamp(
    18 + Math.abs(score) * 60 + agreement * 40 - volPenalty - dataPenalty, 5, 95));

  /* ---- has the slide stopped? an objective trigger, not a feeling ---- */
  const priorLow = n >= 25 ? Math.min(...lows.slice(n - 25, n - 5)) : NaN;
  const recentLow = Math.min(...lows.slice(Math.max(0, n - 5)));
  const higherLow = isFinite(priorLow) && recentLow > priorLow;
  const aboveS20 = isFinite(s20) && price > s20;
  const macdTurning = isFinite(macdA.hist[i]) && isFinite(macdA.hist[i - 1]) && macdA.hist[i] > macdA.hist[i - 1];
  const stabilizing = (aboveS20 ? 1 : 0) + (higherLow ? 1 : 0) + (macdTurning ? 1 : 0) >= 2;

  /* ---- guards ----
     Cheap and falling is not the same as cheap and turning. A value score alone
     would happily buy every step of a collapse, so two objective gates sit
     between the score and the verdict. */
  const guards = [];
  const rawVerdict = verdict;
  const downgrade = (v) => VERDICTS[Math.min(VERDICTS.length - 1, VERDICTS.indexOf(v) + 1)];

  const knifeRegime = regime.id === 'breakdown' || regime.id === 'downtrend';
  if (knifeRegime && f.momentumTrend.score < -0.35 && !stabilizing && verdict.includes('BUY')) {
    verdict = downgrade(verdict);
    guards.push({
      id: 'falling_knife',
      label: 'Cheap, but still falling',
      detail: `${regime.label} with momentum still negative and no stabilisation yet `
        + `(${aboveS20 ? '' : 'below the 20-day, '}${higherLow ? '' : 'no higher low yet, '}`
        + `MACD ${macdTurning ? 'turning up' : 'still rolling over'}). `
        + `The price is genuinely low; the trend has not stopped. Downgraded from ${rawVerdict}.`,
      waitFor: `a close back above the 20-day at ${m0(s20)}, or a higher low holding above ${m0(recentLow)}`,
    });
  }

  const parabolic = regime.id === 'strong_uptrend' && gapZ >= 2.3 && rsi14 >= 75;
  if (parabolic && verdict.includes('BUY')) {
    verdict = 'HOLD';
    guards.push({
      id: 'parabolic',
      label: "Don't chase",
      detail: `${gapZ.toFixed(1)} standard deviations above its own 50-day mean with RSI ${rsi14.toFixed(0)}. `
        + `The trend is real but the entry is not — buying here pays the whole move up front. Downgraded from ${rawVerdict}.`,
      waitFor: `a pullback into ${m0(r252.p25)}–${m0(isFinite(s50) ? s50 : r252.p50)}, or a sideways pause that lets the 20-day catch up`,
    });
  }

  const simpleFinal = verdict.includes('BUY') ? 'BUY' : verdict === 'HOLD' ? 'HOLD' : 'SELL';
  const convictionFinal = guards.length ? Math.min(conviction, 45) : conviction;

  /* ---- is it low? ---- */
  const lowTriggers = [];
  if (r252.rank <= 0.25) lowTriggers.push(`in the bottom ${Math.max(1, Math.round(r252.rank * 100))}% of its 1-year range`);
  if (discountPct >= 7) lowTriggers.push(`${discountPct.toFixed(1)}% below its typical price of ${typical.toFixed(2)}`);
  if (pctB <= 0.15) lowTriggers.push('at or under the lower Bollinger band');
  if (rsi14 <= 35) lowTriggers.push(`RSI ${rsi14.toFixed(0)}, oversold`);
  if (price <= r252.p10) lowTriggers.push('inside the cheapest decile of the year');
  if (gapZ <= -1.2) lowTriggers.push(`${Math.abs(gapZ).toFixed(1)} standard deviations under its own 50-day mean`);

  const isLow = lowTriggers.length >= 2 || r252.rank <= 0.12;
  const lowSeverity = r252.rank <= 0.10 && lowTriggers.length >= 3 ? 'deep'
    : lowTriggers.length >= 2 ? 'notable' : lowTriggers.length === 1 ? 'mild' : 'none';

  /* ---- is it high for what it is? ---- */
  const highTriggers = [];
  if (r252.rank >= 0.85) highTriggers.push(`in the top ${Math.max(1, Math.round((1 - r252.rank) * 100))}% of its 1-year range`);
  if (discountPct <= -7) highTriggers.push(`${Math.abs(discountPct).toFixed(1)}% above its typical price of ${typical.toFixed(2)}`);
  if (pctB >= 0.9) highTriggers.push('pinned to the upper Bollinger band');
  if (rsi14 >= 68) highTriggers.push(`RSI ${rsi14.toFixed(0)}, overbought`);
  if (price >= r252.p90) highTriggers.push('inside the most expensive decile of the year');
  if (gapZ >= 1.3) highTriggers.push(`${gapZ.toFixed(1)} standard deviations over its own 50-day mean`);

  const isHigh = highTriggers.length >= 2 || r252.rank >= 0.95;
  const highSeverity = r252.rank >= 0.95 && highTriggers.length >= 3 ? 'extended'
    : highTriggers.length >= 2 ? 'rich' : highTriggers.length === 1 ? 'full' : 'none';

  /* ---- buy zones ---- */
  const TIERS = [
    { label: 'First scale-in', alloc: 40 },
    { label: 'Add', alloc: 35 },
    { label: 'Deep value', alloc: 25 },
  ];
  const pool = [
    { price: r252.p25, why: 'lower quartile of the year — the top of its cheap zone' },
    isFinite(s50) ? { price: s50, why: 'the 50-day average, where dips in an uptrend usually stop' } : null,
    isFinite(bbLower) ? { price: bbLower, why: 'lower Bollinger band — two standard deviations of ordinary noise' } : null,
    { price: r252.p10, why: 'cheapest decile of the year' },
    nearSupport ? { price: nearSupport.price, why: `the ${nearSupport.type}` } : null,
    isFinite(s200) ? { price: s200, why: 'the 200-day average — the line that separates a dip from a downtrend' } : null,
    { price: r252.p05, why: 'bottom 5% of the year — only reached in a real flush' },
    { price: lo252, why: 'the 52-week low' },
  ].filter((z) => z && isFinite(z.price) && z.price > 0);

  /* Only levels below today's price are entries; anything above is resistance. */
  const below = pool.filter((z) => z.price < price * 0.995).sort((a, b) => b.price - a.price);
  const deduped = [];
  for (const z of below) {
    if (deduped.some((d) => Math.abs(d.price / z.price - 1) < 0.015)) continue;
    deduped.push(z);
  }
  /* Tier by actual price order, so "First scale-in" is always the shallowest dip. */
  const buyZones = deduped.slice(0, 3).map((z, k) => ({
    ...z,
    label: TIERS[k].label,
    alloc: TIERS[k].alloc,
    distancePct: ((z.price / price) - 1) * 100,
    reached: false,
  }));
  /* Price already under every historical value level: that is information, not a zone. */
  const belowAllZones = buyZones.length === 0;
  if (belowAllZones) {
    buyZones.push({
      price, label: 'Already through every value level', alloc: 0, distancePct: 0, reached: true,
      why: `nothing in this stock's own year sits below ${m0(price)} — the levels above are resistance now, `
        + `so the question is whether the trend has broken, not whether it is cheap`,
    });
  }

  /* ---- targets, stop, sizing ---- */
  const targets = [];
  const pushTarget = (p, label) => {
    if (isFinite(p) && p > price * 1.01 && !targets.some((t) => Math.abs(t.price / p - 1) < 0.01)) {
      targets.push({ price: p, label, upsidePct: ((p / price) - 1) * 100 });
    }
  };
  pushTarget(typical, 'Back to typical price');
  pushTarget(price + 2 * atr14, '2 ATR swing target');
  pushTarget(r252.p75, '1-year upper quartile');
  pushTarget(hi252, '52-week high');
  targets.sort((a, b) => a.price - b.price);

  const stopBase = nearSupport ? Math.min(nearSupport.price - 0.3 * atr14, price - 2 * atr14) : price - 2 * atr14;
  const stop = Math.max(0.01, stopBase);
  const riskPerShare = price - stop;
  const riskPctOfPrice = (riskPerShare / price) * 100;

  const sizing = (() => {
    if (!equity || riskPerShare <= 0) return null;
    const byRisk = Math.floor((equity * (riskPct / 100)) / riskPerShare);
    const byCap = Math.floor((equity * (maxPosPct / 100)) / price);
    const shares = Math.max(0, Math.min(byRisk, byCap));
    return {
      shares, cost: shares * price, limitedBy: byRisk <= byCap ? 'risk budget' : 'position cap',
      riskDollars: shares * riskPerShare,
    };
  })();

  /* ---- horizon and data quality ---- */
  const horizonDays = clamp(Math.round(20 * (28 / (isFinite(vol20) ? Math.max(12, vol20) : 28))), 10, 35);
  const lastBarAgeDays = Math.round((Date.now() - rows[rows.length - 1].t) / 86400000);
  const dataQuality = {
    bars: n,
    years: +(n / 252).toFixed(1),
    lastBar: rows[rows.length - 1].t,
    lastBarAgeDays,
    stale: lastBarAgeDays > 5,
    hasStudy: !!study20,
    source: hist.source,
    via: hist.via,
    cached: !!hist.cached,
  };

  /* ---- plain-language narrative (used verbatim when the AI is off) ---- */
  const cur = cur0;
  const m = m0;
  const bandPos = price < r252.p25 ? 'below' : price > r252.p75 ? 'above' : 'inside';

  const lowText = isLow
    ? `${hist.symbol} at ${m(price)} is ${lowTriggers.join(', ')}. `
      + `It closed above ${m(anchor)} on ${isFinite(daysAboveAnchor) ? daysAboveAnchor.toFixed(0) : '—'}% of the last year's sessions, `
      + `and only ${(100 - daysAbovePrice).toFixed(0)}% of that year was spent below today's price. `
      + (regime.id === 'downtrend' || regime.id === 'breakdown'
        ? `The trend is still down, so treat this as a cheap price in a falling market — scale in, and let it prove a floor near ${nearSupport ? m(nearSupport.price) : m(r252.p10)} before adding.`
        : `The trend is intact, which is what makes this a dip rather than a decline.`)
    : `${hist.symbol} at ${m(price)} sits at the ${(r252.rank * 100).toFixed(0)}th percentile of its 1-year range — `
      + `not a low. The cheap zone starts nearer ${m(r252.p25)}.`;

  const studyLine = bucket20 && bucket20.n >= 5
    ? `Historically, buying this name at this point of its range returned a median ${bucket20.median.toFixed(1)}% `
      + `over the next 20 sessions (n=${bucket20.n}, ${bucket20.positive.toFixed(0)}% positive). `
    : '';

  const highText = isHigh
    ? `At ${m(price)} it is ${highTriggers.join(', ')}. ${studyLine}`
      + `This is high for what it is — its normal band is ${m(r252.p25)}–${m(r252.p75)}.`
    : bandPos === 'below'
      ? `Not expensive — ${m(price)} is under the bottom of its normal ${m(r252.p25)}–${m(r252.p75)} band, `
        + `with the year's high at ${m(hi252)}. Nothing here says "too high".`
      : bandPos === 'above'
        ? `Full, but not extreme: ${m(price)} is above its normal band of ${m(r252.p25)}–${m(r252.p75)} `
          + `without the overbought confirmation that would make it a sell. ${studyLine}`
        : `Fairly priced: ${m(price)} sits in the ${r252.rank < 0.45 ? 'lower' : r252.rank > 0.55 ? 'upper' : 'middle of the'} `
          + `part of its normal ${m(r252.p25)}–${m(r252.p75)} band, with the year's high at ${m(hi252)}.`;

  return {
    symbol: hist.symbol,
    name: hist.name,
    currency: cur,
    asOf: Date.now(),
    price,
    prevClose: hist.prevClose,
    changePct: isFinite(hist.prevClose) && hist.prevClose ? ((price / hist.prevClose) - 1) * 100 : NaN,
    rows,

    trend: { sma20: s20, sma50: s50, sma200: s200, slope50, slope200, regime },
    momentum: { rsi14, macd: { line: macdA.line[i], signal: macdA.signal[i], hist: macdA.hist[i] }, stochK: stochA.k[i], roc20, roc63, streak: streak(closes) },
    volatility: { atr14, atrPct, bbUpper, bbMid, bbLower, pctB, bbWidth, vol20, vol60 },
    volume: { last: vLast, avg20: vAvg20, ratio: volRatio, obvSlope },

    ranges: { y1: r252, m6: r126, m3: r63 },
    typical, discountPct, iqr, daysAbovePrice, anchor, daysAboveAnchor, gapZ,
    fiftyTwoWeek: { high: hi252, low: lo252, fromHighPct, fromLowPct },

    levels: { supports, resistances, nearSupport, nearResist, supATR, resATR },
    study: { horizon20: study20, horizon60: study60, currentDecile, bucket20, bucket60 },

    factors: Object.values(f).map((x) => ({ ...x, weight: weights[x.key], contribution: (weights[x.key] * x.score) / (wSum || 1) })),
    weights,
    score, agreement, verdict, simple: simpleFinal, conviction: convictionFinal,
    rawVerdict, guards, stabilizing, stabilization: { aboveS20, higherLow, macdTurning, recentLow, priorLow },

    low: { isLow, severity: lowSeverity, triggers: lowTriggers, text: lowText },
    high: { isHigh, severity: highSeverity, triggers: highTriggers, text: highText },

    plan: {
      buyZones, belowAllZones, targets, stop, riskPerShare, riskPctOfPrice, sizing,
      waitFor: guards.length ? guards[guards.length - 1].waitFor : null,
      fairBand: [r252.p25, r252.p75],
      horizonDays,
    },
    dataQuality,
  };
}

export { VERDICTS };
