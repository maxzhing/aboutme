/* portfolio.js — the paper-money account.

   Real fake money: a fixed starting balance, positions with average cost,
   realised and unrealised P&L, an equity curve, and a full trade log with the
   reasoning attached to every fill. The learning module reads this log to work
   out whether the AI's calls actually made money. */

import { load, save, uid } from './util.js';

const DEFAULTS = {
  startCash: 100000,
  riskPct: 1.5,      /* of equity, risked per trade between entry and stop */
  maxPosPct: 20,     /* of equity, max in any one name */
  autopilot: false,  /* let the AI execute its own recommendation */
  slippageBps: 5,    /* charged on every fill, so results are not flattering */
};

export function getTradeSettings() { return { ...DEFAULTS, ...load('pf.settings', {}) }; }
export function setTradeSettings(patch) {
  const next = { ...getTradeSettings(), ...patch };
  save('pf.settings', next);
  return next;
}

function blank(startCash) {
  return {
    startCash, cash: startCash, positions: {}, trades: [],
    equityCurve: [{ t: Date.now(), equity: startCash, cash: startCash, invested: 0 }],
    lastPrices: {}, realized: 0, createdAt: Date.now(),
  };
}

export function getPortfolio() {
  const s = getTradeSettings();
  const pf = load('pf.state', null);
  if (!pf || typeof pf.cash !== 'number') return blank(s.startCash);
  return pf;
}

function put(pf) { save('pf.state', pf); return pf; }

export function resetPortfolio(startCash) {
  const cash = Number(startCash) || getTradeSettings().startCash;
  setTradeSettings({ startCash: cash });
  return put(blank(cash));
}

export function rememberPrice(symbol, price, t = Date.now()) {
  if (!isFinite(price) || price <= 0) return;
  const pf = getPortfolio();
  pf.lastPrices[symbol.toUpperCase()] = { price, t };
  put(pf);
}

/* A priced view of the account. Positions with no fresh price fall back to
   average cost so the equity figure never silently disappears. */
export function snapshot(extraPrices = {}) {
  const pf = getPortfolio();
  const s = getTradeSettings();
  const prices = { ...pf.lastPrices };
  for (const [sym, p] of Object.entries(extraPrices)) {
    if (isFinite(p) && p > 0) prices[sym.toUpperCase()] = { price: p, t: Date.now() };
  }

  const positions = Object.entries(pf.positions)
    .filter(([, p]) => p.shares > 0)
    .map(([symbol, p]) => {
      const mark = prices[symbol]?.price;
      const lastPrice = isFinite(mark) && mark > 0 ? mark : p.avgCost;
      const value = p.shares * lastPrice;
      const cost = p.shares * p.avgCost;
      return {
        symbol, shares: p.shares, avgCost: p.avgCost, lastPrice,
        priceAsOf: prices[symbol]?.t ?? null,
        stale: !isFinite(mark) || mark <= 0,
        value, cost,
        unrealised: value - cost,
        unrealisedPct: cost > 0 ? ((value / cost) - 1) * 100 : 0,
        firstOpened: p.firstOpened,
        heldDays: Math.max(0, Math.round((Date.now() - p.firstOpened) / 86400000)),
      };
    })
    .sort((a, b) => b.value - a.value);

  const invested = positions.reduce((s2, p) => s2 + p.value, 0);
  const equity = pf.cash + invested;
  const unrealised = positions.reduce((s2, p) => s2 + p.unrealised, 0);

  return {
    cash: pf.cash, invested, equity,
    startCash: pf.startCash,
    realized: pf.realized,
    unrealised,
    totalReturn: equity - pf.startCash,
    totalReturnPct: pf.startCash ? ((equity / pf.startCash) - 1) * 100 : 0,
    positions,
    trades: pf.trades,
    equityCurve: pf.equityCurve,
    createdAt: pf.createdAt,
    riskPct: s.riskPct,
    maxPosPct: s.maxPosPct,
    autopilot: s.autopilot,
    exposurePct: equity ? (invested / equity) * 100 : 0,
  };
}

export function recordEquityPoint() {
  const pf = getPortfolio();
  const snap = snapshot();
  const last = pf.equityCurve[pf.equityCurve.length - 1];
  const point = { t: Date.now(), equity: snap.equity, cash: snap.cash, invested: snap.invested };
  /* one point per hour at most, so the curve stays readable */
  if (last && Date.now() - last.t < 3600000) pf.equityCurve[pf.equityCurve.length - 1] = point;
  else pf.equityCurve.push(point);
  if (pf.equityCurve.length > 2000) pf.equityCurve = pf.equityCurve.slice(-2000);
  put(pf);
  return point;
}

/* Position size from the risk budget: never risk more than riskPct of equity
   between entry and stop, and never hold more than maxPosPct in one name. */
export function sizePosition(price, stop, { equity, riskPct, maxPosPct } = {}) {
  const s = getTradeSettings();
  const snap = snapshot();
  const eq = isFinite(equity) ? equity : snap.equity;
  const risk = isFinite(riskPct) ? riskPct : s.riskPct;
  const cap = isFinite(maxPosPct) ? maxPosPct : s.maxPosPct;
  const perShare = price - stop;
  const byRisk = perShare > 0 ? Math.floor((eq * (risk / 100)) / perShare) : Infinity;
  const byCap = Math.floor((eq * (cap / 100)) / price);
  const byCash = Math.floor(snap.cash / price);
  const shares = Math.max(0, Math.min(byRisk, byCap, byCash));
  return {
    shares,
    limitedBy: shares === byCash ? 'cash' : shares === byRisk ? 'risk budget' : 'position cap',
    riskDollars: perShare > 0 ? shares * perShare : null,
    cost: shares * price,
  };
}

function fillPrice(price, side, slippageBps) {
  const slip = price * (slippageBps / 10000);
  return side === 'BUY' ? price + slip : price - slip;
}

export function buy(symbol, shares, price, meta = {}) {
  const sym = symbol.toUpperCase();
  shares = Math.floor(Number(shares));
  const s = getTradeSettings();
  if (!(shares > 0)) throw new Error('shares must be a positive whole number');
  if (!(price > 0)) throw new Error('no valid price to trade at');

  const pf = getPortfolio();
  const fill = fillPrice(price, 'BUY', s.slippageBps);
  const cost = shares * fill;
  if (cost > pf.cash + 0.005) {
    throw new Error(`not enough paper cash: need ${cost.toFixed(2)}, have ${pf.cash.toFixed(2)}`);
  }

  const pos = pf.positions[sym] || { shares: 0, avgCost: 0, lots: [], firstOpened: Date.now() };
  const newShares = pos.shares + shares;
  pos.avgCost = ((pos.shares * pos.avgCost) + cost) / newShares;
  pos.shares = newShares;
  pos.lots.push({ shares, price: fill, t: Date.now() });
  pf.positions[sym] = pos;
  pf.cash -= cost;
  pf.lastPrices[sym] = { price, t: Date.now() };

  const trade = {
    id: uid(), t: Date.now(), side: 'BUY', symbol: sym, shares,
    price: fill, requestedPrice: price, value: cost,
    slippage: (fill - price) * shares,
    cashAfter: pf.cash, ...meta,
  };
  pf.trades.unshift(trade);
  put(pf);
  recordEquityPoint();
  return trade;
}

export function sell(symbol, shares, price, meta = {}) {
  const sym = symbol.toUpperCase();
  shares = Math.floor(Number(shares));
  const s = getTradeSettings();
  if (!(shares > 0)) throw new Error('shares must be a positive whole number');
  if (!(price > 0)) throw new Error('no valid price to trade at');

  const pf = getPortfolio();
  const pos = pf.positions[sym];
  if (!pos || pos.shares <= 0) throw new Error(`no open position in ${sym}`);
  if (shares > pos.shares) throw new Error(`only ${pos.shares} shares held in ${sym}`);

  const fill = fillPrice(price, 'SELL', s.slippageBps);
  const proceeds = shares * fill;
  const realised = shares * (fill - pos.avgCost);

  pos.shares -= shares;
  if (pos.shares <= 0) delete pf.positions[sym];
  else pf.positions[sym] = pos;

  pf.cash += proceeds;
  pf.realized += realised;
  pf.lastPrices[sym] = { price, t: Date.now() };

  const trade = {
    id: uid(), t: Date.now(), side: 'SELL', symbol: sym, shares,
    price: fill, requestedPrice: price, value: proceeds,
    slippage: (price - fill) * shares,
    realised, avgCostAtSale: pos.avgCost ?? null,
    cashAfter: pf.cash, ...meta,
  };
  pf.trades.unshift(trade);
  put(pf);
  recordEquityPoint();
  return trade;
}

/* Turn an AI/engine decision into an actual paper fill, with the guard rails on. */
export function executeDecision(report, decision, { source = 'ai' } = {}) {
  const s = getTradeSettings();
  const snap = snapshot({ [report.symbol]: report.price });
  const held = snap.positions.find((p) => p.symbol === report.symbol);
  const action = decision.trade?.action || 'HOLD';
  const meta = {
    reason: decision.trade?.why || decision.headline || '',
    verdict: decision.verdict, conviction: decision.conviction,
    engineScore: +report.score.toFixed(3), engineVerdict: report.verdict,
    regime: report.trend.regime.label, by: source,
  };

  if (action === 'BUY') {
    const stop = isFinite(decision.stop) && decision.stop > 0 && decision.stop < report.price
      ? decision.stop : report.plan.stop;
    const sizing = sizePosition(report.price, stop, {});
    const wanted = decision.trade.shares > 0 ? decision.trade.shares : sizing.shares;
    /* the AI may ask for more than the risk rules allow; the rules win */
    const shares = Math.min(wanted, sizing.shares);
    if (shares <= 0) {
      return { skipped: true, why: `no room to buy (${sizing.limitedBy} exhausted)`, sizing };
    }
    const capRoom = Math.floor((snap.equity * (s.maxPosPct / 100) - (held?.value || 0)) / report.price);
    const final = Math.min(shares, Math.max(0, capRoom));
    if (final <= 0) return { skipped: true, why: `already at the ${s.maxPosPct}% position cap in ${report.symbol}`, sizing };
    return { trade: buy(report.symbol, final, report.price, { ...meta, stop, sizedBy: sizing.limitedBy }) };
  }

  if (action === 'SELL') {
    if (!held) return { skipped: true, why: `nothing to sell — no position in ${report.symbol}` };
    const shares = decision.trade.shares > 0 ? Math.min(decision.trade.shares, held.shares) : held.shares;
    return { trade: sell(report.symbol, shares, report.price, meta) };
  }

  return { skipped: true, why: 'decision was HOLD' };
}

export function exportState() {
  return {
    exportedAt: new Date().toISOString(),
    portfolio: getPortfolio(),
    tradeSettings: getTradeSettings(),
  };
}

export function importPortfolio(obj) {
  if (!obj?.portfolio?.positions) throw new Error('not a portfolio export');
  put(obj.portfolio);
  if (obj.tradeSettings) setTradeSettings(obj.tradeSettings);
  return snapshot();
}

/* Simple performance stats from closed trades. */
export function tradeStats() {
  const pf = getPortfolio();
  const sells = pf.trades.filter((t) => t.side === 'SELL' && isFinite(t.realised));
  const wins = sells.filter((t) => t.realised > 0);
  const losses = sells.filter((t) => t.realised <= 0);
  const grossWin = wins.reduce((s, t) => s + t.realised, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.realised, 0));
  return {
    closed: sells.length,
    wins: wins.length,
    losses: losses.length,
    winRate: sells.length ? (wins.length / sells.length) * 100 : NaN,
    avgWin: wins.length ? grossWin / wins.length : NaN,
    avgLoss: losses.length ? grossLoss / losses.length : NaN,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : NaN),
    totalRealised: pf.realized,
    buys: pf.trades.filter((t) => t.side === 'BUY').length,
    slippagePaid: pf.trades.reduce((s, t) => s + Math.abs(t.slippage || 0), 0),
  };
}

export { DEFAULTS as PORTFOLIO_DEFAULTS };
