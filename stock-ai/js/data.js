/* data.js — real market data.
   The browser cannot call most finance APIs directly (they send no CORS
   headers), so every source is tried through a chain: direct first, then a set
   of public CORS relays, then the next source. Whatever worked last is
   remembered and tried first. Optional API keys unlock direct, relay-free
   sources. Diagnostics (testSources) shows the user exactly what works from
   their own network. */

import { load, save, fetchTimeout, dayKey } from './util.js';

const HIST_TTL_MS = 20 * 60 * 1000;   /* intraday re-analysis reuses the cache */
const MAX_CACHE_SYMBOLS = 40;

/* ---------- settings (API keys, custom relay) ---------- */

const DEFAULT_SETTINGS = {
  alphaVantageKey: '', twelveDataKey: '', fmpKey: '', polygonKey: '',
  customProxy: '',            /* e.g. https://my-worker.workers.dev/?url= */
  preferredSource: 'auto',
};

export function getDataSettings() { return { ...DEFAULT_SETTINGS, ...load('data.settings', {}) }; }
export function setDataSettings(patch) {
  const next = { ...getDataSettings(), ...patch };
  save('data.settings', next);
  return next;
}

/* ---------- CORS relays ---------- */

const RELAYS = [
  { id: 'direct', label: 'Direct (no relay)', wrap: (u) => u },
  { id: 'corsproxy', label: 'corsproxy.io', wrap: (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u) },
  { id: 'allorigins', label: 'allorigins.win', wrap: (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u) },
  { id: 'codetabs', label: 'codetabs.com', wrap: (u) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u) },
  { id: 'corslol', label: 'cors.lol', wrap: (u) => 'https://api.cors.lol/?url=' + encodeURIComponent(u) },
  { id: 'thingproxy', label: 'thingproxy', wrap: (u) => 'https://thingproxy.freeboard.io/fetch/' + u },
];

function relayChain() {
  const custom = getDataSettings().customProxy.trim();
  const chain = RELAYS.slice();
  if (custom) {
    chain.unshift({
      id: 'custom', label: 'Your relay',
      wrap: (u) => (custom.includes('{url}')
        ? custom.replace('{url}', encodeURIComponent(u))
        : custom + (custom.endsWith('=') ? '' : '') + encodeURIComponent(u)),
    });
  }
  const winner = load('data.lastRelay', null);
  if (winner) {
    const i = chain.findIndex((r) => r.id === winner);
    if (i > 0) chain.unshift(chain.splice(i, 1)[0]);
  }
  return chain;
}

/* Fetch a URL as text, walking the relay chain until one returns a usable body.
   `validate` rejects relay error pages that arrive with HTTP 200. */
async function fetchViaRelays(url, { validate, timeout = 13000 } = {}) {
  const errors = [];
  for (const relay of relayChain()) {
    try {
      const res = await fetchTimeout(relay.wrap(url), { headers: { Accept: '*/*' } }, timeout);
      if (!res.ok) { errors.push(`${relay.id}: HTTP ${res.status}`); continue; }
      const text = await res.text();
      if (!text || text.length < 16) { errors.push(`${relay.id}: empty body`); continue; }
      if (validate && !validate(text)) { errors.push(`${relay.id}: unexpected body`); continue; }
      save('data.lastRelay', relay.id);
      return { text, relay: relay.id };
    } catch (e) {
      errors.push(`${relay.id}: ${e.name === 'AbortError' ? 'timeout' : e.message}`);
    }
  }
  throw new Error('all relays failed — ' + errors.join(' | '));
}

/* ---------- shared row shape ----------
   row = { t: epoch ms, o, h, l, c, v } ascending by t, nulls dropped. */

function cleanRows(rows) {
  const seen = new Set();
  return rows
    .filter((r) => r && isFinite(r.t) && isFinite(r.c) && r.c > 0)
    .filter((r) => { const k = dayKey(r.t); if (seen.has(k)) return false; seen.add(k); return true; })
    .map((r) => ({
      t: r.t,
      o: isFinite(r.o) && r.o > 0 ? r.o : r.c,
      h: isFinite(r.h) && r.h > 0 ? r.h : Math.max(r.o ?? r.c, r.c),
      l: isFinite(r.l) && r.l > 0 ? r.l : Math.min(r.o ?? r.c, r.c),
      c: r.c,
      v: isFinite(r.v) && r.v >= 0 ? r.v : 0,
    }))
    .sort((a, b) => a.t - b.t);
}

/* ---------- source: Yahoo Finance chart API (no key, free, full OHLCV) ---------- */

function parseYahoo(text, symbol) {
  const json = JSON.parse(text);
  const r = json?.chart?.result?.[0];
  if (!r?.timestamp?.length) throw new Error(json?.chart?.error?.description || 'no bars in Yahoo payload');
  const q = r.indicators?.quote?.[0] || {};
  const adj = r.indicators?.adjclose?.[0]?.adjclose;
  const rows = r.timestamp.map((ts, i) => ({
    t: ts * 1000,
    o: q.open?.[i], h: q.high?.[i], l: q.low?.[i],
    c: (adj?.[i] ?? q.close?.[i]), v: q.volume?.[i],
  }));
  const m = r.meta || {};
  return {
    symbol: (m.symbol || symbol).toUpperCase(),
    name: m.longName || m.shortName || '',
    currency: m.currency || 'USD',
    exchange: m.fullExchangeName || m.exchangeName || '',
    marketState: m.marketState || '',
    livePrice: isFinite(m.regularMarketPrice) ? m.regularMarketPrice : null,
    prevClose: isFinite(m.chartPreviousClose) ? m.chartPreviousClose
      : (isFinite(m.previousClose) ? m.previousClose : null),
    quoteTime: isFinite(m.regularMarketTime) ? m.regularMarketTime * 1000 : null,
    rows: cleanRows(rows),
  };
}

async function fromYahoo(symbol, range = '2y') {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  let lastErr;
  for (const host of hosts) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}`
      + `?range=${range}&interval=1d&includePrePost=false&events=div%2Csplit`;
    try {
      const { text, relay } = await fetchViaRelays(url, { validate: (t) => t.includes('"chart"') });
      const out = parseYahoo(text, symbol);
      return { ...out, source: 'Yahoo Finance', via: relay };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Yahoo unavailable');
}

/* ---------- source: Stooq daily CSV (no key, free, long history) ---------- */

function parseStooqCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!/date/i.test(lines[0])) throw new Error('not a Stooq CSV');
  const head = lines[0].toLowerCase().split(',');
  const idx = (n) => head.indexOf(n);
  const rows = lines.slice(1).map((line) => {
    const c = line.split(',');
    const t = Date.parse(c[idx('date')] + 'T00:00:00Z');
    return {
      t,
      o: parseFloat(c[idx('open')]), h: parseFloat(c[idx('high')]),
      l: parseFloat(c[idx('low')]), c: parseFloat(c[idx('close')]),
      v: parseFloat(c[idx('volume')]),
    };
  });
  return cleanRows(rows);
}

async function fromStooq(symbol) {
  const candidates = [symbol.toLowerCase() + '.us', symbol.toLowerCase()];
  let lastErr;
  for (const s of candidates) {
    try {
      const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(s)}&i=d`;
      const { text, relay } = await fetchViaRelays(url, { validate: (t) => /date,/i.test(t) });
      const rows = parseStooqCsv(text);
      if (rows.length < 60) throw new Error('too little history');
      return {
        symbol: symbol.toUpperCase(), name: '', currency: 'USD', exchange: '',
        marketState: '', livePrice: rows[rows.length - 1].c,
        prevClose: rows.length > 1 ? rows[rows.length - 2].c : null,
        quoteTime: rows[rows.length - 1].t,
        rows, source: 'Stooq', via: relay,
      };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Stooq unavailable');
}

/* ---------- keyed sources (direct, no relay needed) ---------- */

async function fromAlphaVantage(symbol) {
  const key = getDataSettings().alphaVantageKey.trim();
  if (!key) throw new Error('no Alpha Vantage key');
  const url = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&outputsize=full'
    + `&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const res = await fetchTimeout(url, {}, 15000);
  const json = await res.json();
  const series = json['Time Series (Daily)'];
  if (!series) throw new Error(json.Note || json['Error Message'] || json.Information || 'no series');
  const rows = cleanRows(Object.entries(series).map(([d, v]) => ({
    t: Date.parse(d + 'T00:00:00Z'),
    o: +v['1. open'], h: +v['2. high'], l: +v['3. low'], c: +v['4. close'], v: +v['5. volume'],
  })));
  const last = rows[rows.length - 1];
  return {
    symbol: symbol.toUpperCase(), name: '', currency: 'USD', exchange: '', marketState: '',
    livePrice: last?.c ?? null, prevClose: rows[rows.length - 2]?.c ?? null,
    quoteTime: last?.t ?? null, rows, source: 'Alpha Vantage', via: 'direct',
  };
}

async function fromTwelveData(symbol) {
  const key = getDataSettings().twelveDataKey.trim();
  if (!key) throw new Error('no Twelve Data key');
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}`
    + `&interval=1day&outputsize=800&apikey=${encodeURIComponent(key)}`;
  const res = await fetchTimeout(url, {}, 15000);
  const json = await res.json();
  if (!Array.isArray(json.values)) throw new Error(json.message || 'no values');
  const rows = cleanRows(json.values.map((v) => ({
    t: Date.parse(v.datetime.length > 10 ? v.datetime.replace(' ', 'T') + 'Z' : v.datetime + 'T00:00:00Z'),
    o: +v.open, h: +v.high, l: +v.low, c: +v.close, v: +v.volume,
  })));
  const last = rows[rows.length - 1];
  return {
    symbol: symbol.toUpperCase(), name: json.meta?.symbol || '', currency: json.meta?.currency || 'USD',
    exchange: json.meta?.exchange || '', marketState: '',
    livePrice: last?.c ?? null, prevClose: rows[rows.length - 2]?.c ?? null,
    quoteTime: last?.t ?? null, rows, source: 'Twelve Data', via: 'direct',
  };
}

async function fromFmp(symbol) {
  const key = getDataSettings().fmpKey.trim();
  if (!key) throw new Error('no FMP key');
  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}`
    + `?serietype=line&timeseries=800&apikey=${encodeURIComponent(key)}`;
  const res = await fetchTimeout(url, {}, 15000);
  const json = await res.json();
  if (!Array.isArray(json.historical)) throw new Error(json['Error Message'] || 'no historical');
  const rows = cleanRows(json.historical.map((v) => ({
    t: Date.parse(v.date + 'T00:00:00Z'),
    o: +v.open, h: +v.high, l: +v.low, c: +v.close, v: +v.volume,
  })));
  const last = rows[rows.length - 1];
  return {
    symbol: symbol.toUpperCase(), name: json.symbol || '', currency: 'USD', exchange: '', marketState: '',
    livePrice: last?.c ?? null, prevClose: rows[rows.length - 2]?.c ?? null,
    quoteTime: last?.t ?? null, rows, source: 'FMP', via: 'direct',
  };
}

async function fromPolygon(symbol) {
  const key = getDataSettings().polygonKey.trim();
  if (!key) throw new Error('no Polygon key');
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol.toUpperCase())}`
    + `/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(key)}`;
  const res = await fetchTimeout(url, {}, 15000);
  const json = await res.json();
  if (!Array.isArray(json.results)) throw new Error(json.error || json.message || 'no results');
  const rows = cleanRows(json.results.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v })));
  const last = rows[rows.length - 1];
  return {
    symbol: symbol.toUpperCase(), name: '', currency: 'USD', exchange: '', marketState: '',
    livePrice: last?.c ?? null, prevClose: rows[rows.length - 2]?.c ?? null,
    quoteTime: last?.t ?? null, rows, source: 'Polygon', via: 'direct',
  };
}

export const SOURCES = [
  { id: 'yahoo', label: 'Yahoo Finance', needsKey: false, run: fromYahoo },
  { id: 'stooq', label: 'Stooq CSV', needsKey: false, run: fromStooq },
  { id: 'alphavantage', label: 'Alpha Vantage', needsKey: 'alphaVantageKey', run: fromAlphaVantage },
  { id: 'twelvedata', label: 'Twelve Data', needsKey: 'twelveDataKey', run: fromTwelveData },
  { id: 'fmp', label: 'Financial Modeling Prep', needsKey: 'fmpKey', run: fromFmp },
  { id: 'polygon', label: 'Polygon.io', needsKey: 'polygonKey', run: fromPolygon },
];

/* ---------- cache ---------- */

function cacheKey(sym) { return 'hist.' + sym.toUpperCase(); }

function readCache(sym, maxAgeMs) {
  const hit = load(cacheKey(sym), null);
  if (!hit?.payload?.rows?.length) return null;
  if (maxAgeMs !== Infinity && Date.now() - hit.fetchedAt > maxAgeMs) return null;
  return { ...hit.payload, fetchedAt: hit.fetchedAt, cached: true };
}

function writeCache(sym, payload) {
  save(cacheKey(sym), { fetchedAt: Date.now(), payload });
  const index = load('hist.index', []).filter((s) => s !== sym.toUpperCase());
  index.unshift(sym.toUpperCase());
  while (index.length > MAX_CACHE_SYMBOLS) {
    const drop = index.pop();
    try { localStorage.removeItem('sai.' + cacheKey(drop)); } catch {}
  }
  save('hist.index', index);
}

export function cachedSymbols() { return load('hist.index', []); }

/* ---------- public API ---------- */

/* Returns { symbol, name, currency, rows, livePrice, source, via, attempts, stale }.
   Falls back to a stale cache rather than failing outright, and says so. */
export async function fetchHistory(symbol, { force = false, range = '2y' } = {}) {
  const sym = String(symbol || '').trim().toUpperCase();
  if (!sym) throw new Error('no symbol given');

  if (!force) {
    const fresh = readCache(sym, HIST_TTL_MS);
    if (fresh) return { ...fresh, attempts: [{ source: 'cache', ok: true }] };
  }

  const settings = getDataSettings();
  let order = SOURCES.filter((s) => !s.needsKey || settings[s.needsKey]?.trim());
  if (settings.preferredSource !== 'auto') {
    const i = order.findIndex((s) => s.id === settings.preferredSource);
    if (i > 0) order.unshift(order.splice(i, 1)[0]);
  }

  const attempts = [];
  for (const src of order) {
    const t0 = performance.now();
    try {
      const payload = await src.run(sym, range);
      if (!payload.rows || payload.rows.length < 40) throw new Error(`only ${payload.rows?.length || 0} bars`);
      attempts.push({ source: src.label, ok: true, ms: Math.round(performance.now() - t0), via: payload.via });
      const out = { ...payload, fetchedAt: Date.now(), cached: false, attempts };
      writeCache(sym, payload);
      return out;
    } catch (e) {
      attempts.push({ source: src.label, ok: false, ms: Math.round(performance.now() - t0), error: e.message });
    }
  }

  const stale = readCache(sym, Infinity);
  if (stale) return { ...stale, stale: true, attempts };

  const detail = attempts.map((a) => `${a.source}: ${a.error}`).join(' · ');
  throw new Error(`Could not load real data for ${sym}. ${detail}`);
}

/* Latest close only — used by the learning loop when scoring old predictions.
   Tolerates a slightly older cache since it only needs a recent print. */
export async function fetchLastPrice(symbol) {
  const cached = readCache(symbol, 12 * 60 * 60 * 1000);
  if (cached) {
    const last = cached.rows[cached.rows.length - 1];
    return { price: cached.livePrice ?? last.c, t: cached.quoteTime ?? last.t, cached: true };
  }
  const h = await fetchHistory(symbol);
  const last = h.rows[h.rows.length - 1];
  return { price: h.livePrice ?? last.c, t: h.quoteTime ?? last.t, cached: !!h.cached };
}

/* Ticker lookup for the search box (best-effort; the box works without it). */
export async function searchSymbols(query) {
  const q = String(query || '').trim();
  if (q.length < 1) return [];
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}`
    + '&quotesCount=8&newsCount=0&listsCount=0';
  try {
    const { text } = await fetchViaRelays(url, { validate: (t) => t.includes('quotes'), timeout: 7000 });
    const json = JSON.parse(text);
    return (json.quotes || [])
      .filter((x) => x.symbol && (x.quoteType === 'EQUITY' || x.quoteType === 'ETF' || x.quoteType === 'INDEX'))
      .map((x) => ({ symbol: x.symbol, name: x.shortname || x.longname || '', exchange: x.exchDisp || '', type: x.quoteType }));
  } catch { return []; }
}

/* Manual escape hatch: paste a Date,Open,High,Low,Close,Volume CSV
   (exactly what Yahoo/Stooq/most brokers export) and analyse that. */
export function ingestCsv(symbol, text) {
  const sym = String(symbol || 'MANUAL').trim().toUpperCase();
  let rows;
  const t = text.trim();
  if (/^date/i.test(t)) {
    rows = parseStooqCsv(t);
  } else {
    rows = cleanRows(t.split(/\r?\n/).map((line) => {
      const c = line.split(/[,;\t]/).map((x) => x.trim());
      if (c.length < 2) return null;
      const t0 = Date.parse(c[0].length <= 10 ? c[0] + 'T00:00:00Z' : c[0]);
      const nums = c.slice(1).map(Number).filter((n) => isFinite(n));
      if (!isFinite(t0) || !nums.length) return null;
      return nums.length >= 4
        ? { t: t0, o: nums[0], h: nums[1], l: nums[2], c: nums[3], v: nums[4] }
        : { t: t0, o: nums[0], h: nums[0], l: nums[0], c: nums[0], v: 0 };
    }).filter(Boolean));
  }
  if (rows.length < 60) throw new Error(`need at least 60 rows of history, got ${rows.length}`);
  const last = rows[rows.length - 1];
  const payload = {
    symbol: sym, name: 'Pasted history', currency: 'USD', exchange: '', marketState: '',
    livePrice: last.c, prevClose: rows[rows.length - 2].c, quoteTime: last.t,
    rows, source: 'Pasted CSV', via: 'manual',
  };
  writeCache(sym, payload);
  return { ...payload, fetchedAt: Date.now(), attempts: [{ source: 'Pasted CSV', ok: true }] };
}

/* Diagnostics: probe every source (and every relay for keyless ones) so the
   user can see what their network actually allows. */
export async function testSources(symbol = 'AAPL') {
  const settings = getDataSettings();
  const results = [];
  for (const src of SOURCES) {
    if (src.needsKey && !settings[src.needsKey]?.trim()) {
      results.push({ source: src.label, status: 'skipped', detail: 'no API key set' });
      continue;
    }
    const t0 = performance.now();
    try {
      const p = await src.run(symbol);
      results.push({
        source: src.label, status: 'ok', ms: Math.round(performance.now() - t0),
        detail: `${p.rows.length} bars, last ${p.rows[p.rows.length - 1].c}`, via: p.via,
      });
    } catch (e) {
      results.push({ source: src.label, status: 'fail', ms: Math.round(performance.now() - t0), detail: e.message });
    }
  }
  return results;
}

export async function testRelays() {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=5d&interval=1d';
  const out = [];
  for (const relay of relayChain()) {
    const t0 = performance.now();
    try {
      const res = await fetchTimeout(relay.wrap(url), {}, 9000);
      const text = await res.text();
      const ok = res.ok && text.includes('"chart"');
      out.push({ relay: relay.label, status: ok ? 'ok' : 'fail', ms: Math.round(performance.now() - t0),
        detail: ok ? 'Yahoo JSON returned' : `HTTP ${res.status}, ${text.slice(0, 60)}` });
    } catch (e) {
      out.push({ relay: relay.label, status: 'fail', ms: Math.round(performance.now() - t0),
        detail: e.name === 'AbortError' ? 'timeout' : e.message });
    }
  }
  return out;
}
