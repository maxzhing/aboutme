/* learning.js — the feedback loop that makes the fake money worth something.

   Every call the app makes is written down with the price and the factor scores
   behind it. Once a call's horizon has passed, the real price is fetched and the
   call is marked right or wrong. Two things come out of that:

     1. Factor weights. A factor that keeps pointing the wrong way on this
        user's watchlist gets scaled down; one that keeps being right gets
        scaled up. engine.js consumes these multipliers directly, so the
        arithmetic behind the next verdict is literally different.
     2. A journal, handed to the AI on every analysis, telling it how its own
        past calls turned out — including calibration, so it can stop being
        confidently wrong.

   This is out-of-sample scoring: a prediction is only ever judged against
   prices that did not exist when it was made. */

import { load, save, uid, clamp, mean, median, tradingDaysBetween } from './util.js';
import { BASE_WEIGHTS, FACTOR_LABELS } from './engine.js';

const MAX_PREDICTIONS = 500;
const LEARN_RATE = 0.7;      /* how hard hit rate pushes a weight */
const MIN_SAMPLES = 5;       /* below this a factor is left alone */
const FULL_TRUST_AT = 12;    /* samples needed before the full push applies */
const MATERIAL_FACTOR = 0.25;/* |score| under this is not a real opinion */
const FLAT_MOVE = 0.05;      /* a move smaller than this tells you nothing */

function db() {
  return load('learn.state', { predictions: [], weights: {}, evaluatedAt: null, lessons: [] });
}
function put(state) { save('learn.state', state); return state; }

/* ---------- recording ---------- */

export function recordPrediction(report, decision, { source = 'ai', aiMeta = null } = {}) {
  const state = db();
  const verdict = decision?.verdict || report.verdict;
  const pred = {
    id: uid(),
    symbol: report.symbol,
    t: Date.now(),
    price: report.price,
    verdict,
    simple: verdict.includes('BUY') ? 'BUY' : verdict === 'HOLD' ? 'HOLD' : 'SELL',
    conviction: decision?.conviction ?? report.conviction,
    engineScore: +report.score.toFixed(4),
    engineVerdict: report.verdict,
    factors: Object.fromEntries(report.factors.map((f) => [f.key, +f.score.toFixed(3)])),
    regime: report.trend.regime.id,
    atrPct: +report.volatility.atrPct.toFixed(2),
    horizonDays: decision?.horizonDays ?? report.plan.horizonDays,
    source,
    provider: aiMeta?.provider || null,
    model: aiMeta?.model || null,
    status: 'open',
    outcome: null,
  };
  state.predictions.unshift(pred);
  if (state.predictions.length > MAX_PREDICTIONS) state.predictions.length = MAX_PREDICTIONS;
  put(state);
  return pred;
}

export function duePredictions(now = Date.now()) {
  return db().predictions.filter(
    (p) => p.status === 'open' && tradingDaysBetween(p.t, now) >= p.horizonDays,
  );
}

/* A call is right if the market moved enough in the direction it implied.
   The bar scales with the stock's own volatility AND the length of the call:
   a typical move over H sessions is about ATR% x sqrt(H), so a 4% move means
   something very different over 5 sessions than over 40. Judging every call
   against one flat percentage marks every HOLD on a volatile name wrong. */
function judge(pred, retPct) {
  const expected = clamp((pred.atrPct || 2) * Math.sqrt(Math.max(1, pred.horizonDays || 20)), 1.5, 40);
  const directional = clamp(expected * 0.35, 1, 15);
  const flat = clamp(expected * 0.8, 2, 25);
  if (pred.simple === 'BUY') {
    return { correct: retPct > directional, band: directional, expected,
      note: `needed more than +${directional.toFixed(1)}% over ${pred.horizonDays} sessions` };
  }
  if (pred.simple === 'SELL') {
    return { correct: retPct < -directional, band: directional, expected,
      note: `needed less than -${directional.toFixed(1)}% over ${pred.horizonDays} sessions` };
  }
  return { correct: Math.abs(retPct) <= flat, band: flat, expected,
    note: `needed to stay inside ±${flat.toFixed(1)}% over ${pred.horizonDays} sessions` };
}

/* Score every matured prediction. `priceFor` is an async symbol -> {price}. */
export async function evaluateDue(priceFor, { now = Date.now() } = {}) {
  const state = db();
  const due = state.predictions.filter((p) => p.status === 'open' && tradingDaysBetween(p.t, now) >= p.horizonDays);
  const wanted = [...new Set(due.map((p) => p.symbol))];
  const prices = {};
  const failed = [];

  for (const sym of wanted) {
    try {
      const q = await priceFor(sym);
      if (isFinite(q?.price) && q.price > 0) prices[sym] = q;
    } catch (e) { failed.push(`${sym}: ${e.message}`); }
  }

  let scored = 0;
  for (const p of due) {
    const q = prices[p.symbol];
    if (!q) continue;
    const retPct = ((q.price / p.price) - 1) * 100;
    const { correct, band, note } = judge(p, retPct);
    p.status = 'scored';
    p.outcome = {
      evaluatedAt: now, priceThen: p.price, priceNow: q.price,
      retPct: +retPct.toFixed(2), correct, band: +band.toFixed(2), note,
      heldDays: tradingDaysBetween(p.t, now),
    };
    delete p.__future;
    scored++;
  }

  state.evaluatedAt = now;
  put(state);
  const after = recomputeWeights();
  return { scored, pending: due.length - scored, failed, weights: after.weights, lessons: after.lessons };
}

/* ---------- factor reliability and weights ---------- */

export function factorReliability() {
  const state = db();
  const done = state.predictions.filter((p) => p.status === 'scored' && p.outcome);
  const out = {};
  for (const key of Object.keys(BASE_WEIGHTS)) {
    /* A flat outcome says nothing about whether a signal pointed the right way,
       so it is left out of the sample rather than counted against every signal. */
    const rows = done.filter((p) => Math.abs(p.factors?.[key] ?? 0) >= MATERIAL_FACTOR
      && Math.abs(p.outcome.retPct) > FLAT_MOVE);
    const hits = rows.filter((p) => Math.sign(p.factors[key]) === Math.sign(p.outcome.retPct));
    const n = rows.length;
    const hitRate = n ? hits.length / n : NaN;
    /* average return in the direction the factor pointed */
    const edge = n ? mean(rows.map((p) => Math.sign(p.factors[key]) * p.outcome.retPct)) : NaN;
    out[key] = { key, label: FACTOR_LABELS[key], n, hits: hits.length, hitRate, edge };
  }
  return out;
}

export function recomputeWeights() {
  const state = db();
  const rel = factorReliability();
  const weights = {};
  const notes = [];

  for (const [key, r] of Object.entries(rel)) {
    if (!isFinite(r.hitRate) || r.n < MIN_SAMPLES) { weights[key] = 1; continue; }
    const raw = 1 + LEARN_RATE * (r.hitRate - 0.5) * 2;
    const trust = Math.min(1, r.n / FULL_TRUST_AT);
    weights[key] = +clamp(1 + (raw - 1) * trust, 0.4, 2).toFixed(3);
    if (weights[key] <= 0.8 || weights[key] >= 1.2) {
      notes.push({
        key, label: r.label, n: r.n, hitRate: r.hitRate, multiplier: weights[key],
        direction: weights[key] > 1 ? 'up' : 'down',
      });
    }
  }

  state.weights = weights;
  state.lessons = buildLessons(state, rel, notes);
  put(state);
  return { weights, rel, notes, lessons: state.lessons };
}

export function getWeights() {
  const w = db().weights || {};
  const out = {};
  for (const key of Object.keys(BASE_WEIGHTS)) out[key] = isFinite(w[key]) ? w[key] : 1;
  return out;
}

/* ---------- stats ---------- */

export function stats() {
  const state = db();
  const all = state.predictions;
  const done = all.filter((p) => p.status === 'scored' && p.outcome);
  const byVerdict = {};
  for (const simple of ['BUY', 'HOLD', 'SELL']) {
    const rows = done.filter((p) => p.simple === simple);
    byVerdict[simple] = {
      n: rows.length,
      hitRate: rows.length ? (rows.filter((p) => p.outcome.correct).length / rows.length) * 100 : NaN,
      avgReturn: rows.length ? mean(rows.map((p) => p.outcome.retPct)) : NaN,
      medianReturn: rows.length ? median(rows.map((p) => p.outcome.retPct)) : NaN,
    };
  }

  const buckets = [[0, 40], [40, 60], [60, 80], [80, 101]];
  const calibration = buckets.map(([lo, hi]) => {
    const rows = done.filter((p) => p.conviction >= lo && p.conviction < hi);
    return {
      label: `${lo}–${hi === 101 ? 100 : hi}`,
      n: rows.length,
      hitRate: rows.length ? (rows.filter((p) => p.outcome.correct).length / rows.length) * 100 : NaN,
      avgConviction: rows.length ? mean(rows.map((p) => p.conviction)) : NaN,
    };
  });

  const bySymbol = {};
  for (const p of done) {
    const b = bySymbol[p.symbol] || (bySymbol[p.symbol] = { symbol: p.symbol, n: 0, hits: 0, rets: [] });
    b.n++; if (p.outcome.correct) b.hits++; b.rets.push(p.outcome.retPct);
  }
  const symbolRows = Object.values(bySymbol)
    .map((b) => ({ ...b, hitRate: (b.hits / b.n) * 100, avgReturn: mean(b.rets) }))
    .sort((a, b) => b.n - a.n);

  return {
    total: all.length,
    open: all.filter((p) => p.status === 'open').length,
    scored: done.length,
    due: duePredictions().length,
    hitRate: done.length ? (done.filter((p) => p.outcome.correct).length / done.length) * 100 : NaN,
    avgReturn: done.length ? mean(done.map((p) => p.outcome.retPct)) : NaN,
    byVerdict, calibration, bySymbol: symbolRows,
    evaluatedAt: state.evaluatedAt,
    lessons: state.lessons || [],
  };
}

function buildLessons(state, rel, notes) {
  const done = state.predictions.filter((p) => p.status === 'scored' && p.outcome);
  const lessons = [];
  if (done.length < MIN_SAMPLES) {
    lessons.push(`Only ${done.length} call${done.length === 1 ? '' : 's'} have matured so far — `
      + `not enough to change how anything is weighted. Weights stay at their defaults until ${MIN_SAMPLES} per factor.`);
    return lessons;
  }

  const hitRate = (done.filter((p) => p.outcome.correct).length / done.length) * 100;
  const avg = mean(done.map((p) => p.outcome.retPct));
  lessons.push(`${done.length} matured calls, ${hitRate.toFixed(0)}% of them right; `
    + `the names moved an average ${avg >= 0 ? '+' : ''}${avg.toFixed(1)}% over the holding windows.`);

  const ranked = Object.values(rel).filter((r) => r.n >= MIN_SAMPLES).sort((a, b) => b.hitRate - a.hitRate);
  if (ranked.length) {
    const best = ranked[0], worst = ranked[ranked.length - 1];
    if (best.hitRate > 0.55) {
      lessons.push(`"${best.label}" has been the most reliable signal here — right ${(best.hitRate * 100).toFixed(0)}% `
        + `of the ${best.n} times it had a real opinion, so it now carries more weight.`);
    }
    if (worst.hitRate < 0.45 && worst.key !== best.key) {
      lessons.push(`"${worst.label}" has been the least reliable — right only ${(worst.hitRate * 100).toFixed(0)}% `
        + `of ${worst.n} times, so its weight has been cut.`);
    }
  }

  const signed = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
  const buys = done.filter((p) => p.simple === 'BUY');
  const sells = done.filter((p) => p.simple === 'SELL');
  if (buys.length >= MIN_SAMPLES) {
    lessons.push(`Buy calls: ${((buys.filter((p) => p.outcome.correct).length / buys.length) * 100).toFixed(0)}% right, `
      + `the stock moved a median ${signed(median(buys.map((p) => p.outcome.retPct)))} `
      + `over the ${Math.round(mean(buys.map((p) => p.outcome.heldDays)))} sessions that followed.`);
  }
  if (sells.length >= MIN_SAMPLES) {
    lessons.push(`Sell/reduce calls: ${((sells.filter((p) => p.outcome.correct).length / sells.length) * 100).toFixed(0)}% right, `
      + `the stock moved a median ${signed(median(sells.map((p) => p.outcome.retPct)))} afterwards `
      + `(a rise is a miss on a sell call).`);
  }

  const high = done.filter((p) => p.conviction >= 70);
  const low = done.filter((p) => p.conviction < 50);
  if (high.length >= MIN_SAMPLES && low.length >= MIN_SAMPLES) {
    const hh = (high.filter((p) => p.outcome.correct).length / high.length) * 100;
    const lh = (low.filter((p) => p.outcome.correct).length / low.length) * 100;
    lessons.push(hh >= lh
      ? `Calibration holds: high-conviction calls (70+) are right ${hh.toFixed(0)}% versus ${lh.toFixed(0)}% for low-conviction ones.`
      : `Calibration is off: high-conviction calls are right only ${hh.toFixed(0)}% against ${lh.toFixed(0)}% for low-conviction ones — treat loud confidence with suspicion.`);
  }

  const regimes = {};
  for (const p of done) {
    const r = regimes[p.regime] || (regimes[p.regime] = { n: 0, hits: 0 });
    r.n++; if (p.outcome.correct) r.hits++;
  }
  const regimeRows = Object.entries(regimes).filter(([, r]) => r.n >= MIN_SAMPLES);
  if (regimeRows.length >= 2) {
    regimeRows.sort((a, b) => (b[1].hits / b[1].n) - (a[1].hits / a[1].n));
    const [bestId, bestR] = regimeRows[0];
    const [worstId, worstR] = regimeRows[regimeRows.length - 1];
    lessons.push(`By market regime: best in "${bestId.replace(/_/g, ' ')}" (${((bestR.hits / bestR.n) * 100).toFixed(0)}% of ${bestR.n}), `
      + `worst in "${worstId.replace(/_/g, ' ')}" (${((worstR.hits / worstR.n) * 100).toFixed(0)}% of ${worstR.n}).`);
  }

  for (const note of notes.slice(0, 4)) {
    lessons.push(`Weight ${note.direction === 'up' ? 'raised' : 'cut'} to ${note.multiplier}× on "${note.label}" `
      + `(${(note.hitRate * 100).toFixed(0)}% right over ${note.n} calls).`);
  }
  return lessons;
}

/* ---------- the journal handed to the AI ---------- */

export function journalFor(symbol, portfolioSnap) {
  const s = stats();
  const rel = factorReliability();
  const w = getWeights();
  const state = db();
  const thisName = state.predictions
    .filter((p) => p.symbol === symbol && p.status === 'scored' && p.outcome)
    .slice(0, 6)
    .map((p) => ({
      when: new Date(p.t).toISOString().slice(0, 10),
      said: p.verdict, atPrice: p.price, conviction: p.conviction,
      thenMoved: `${p.outcome.retPct > 0 ? '+' : ''}${p.outcome.retPct}% in ${p.outcome.heldDays} sessions`,
      right: p.outcome.correct,
    }));

  return {
    howToUseThis: 'These are your own past calls, scored against prices that did not exist when you made them. '
      + 'Lean on the signals that have worked and discount the ones that have not. Say so when you do.',
    maturedCalls: s.scored,
    openCalls: s.open,
    overallHitRatePct: isFinite(s.hitRate) ? +s.hitRate.toFixed(0) : null,
    byCallType: Object.fromEntries(Object.entries(s.byVerdict)
      .filter(([, v]) => v.n > 0)
      .map(([k, v]) => [k, { n: v.n, hitRatePct: +v.hitRate.toFixed(0), medianReturnPct: +v.medianReturn.toFixed(1) }])),
    convictionCalibration: s.calibration.filter((c) => c.n > 0)
      .map((c) => ({ convictionBand: c.label, n: c.n, hitRatePct: +c.hitRate.toFixed(0) })),
    signalReliability: Object.fromEntries(Object.entries(rel)
      .filter(([, r]) => r.n >= MIN_SAMPLES)
      .map(([k, r]) => [k, { n: r.n, hitRatePct: Math.round(r.hitRate * 100), weightNow: w[k] }])),
    yourPastCallsOnThisName: thisName.length ? thisName : 'none yet',
    paperAccount: portfolioSnap ? {
      returnSinceStartPct: +portfolioSnap.totalReturnPct.toFixed(2),
      closedTrades: portfolioSnap.trades.filter((t) => t.side === 'SELL').length,
    } : null,
    lessons: s.lessons,
  };
}

export function resetLearning() {
  save('learn.state', { predictions: [], weights: {}, evaluatedAt: null, lessons: [] });
}

export function allPredictions() { return db().predictions; }

export function exportLearning() { return { exportedAt: new Date().toISOString(), learning: db() }; }

export function importLearning(obj) {
  if (!obj?.learning?.predictions) throw new Error('not a learning export');
  put(obj.learning);
  return stats();
}
