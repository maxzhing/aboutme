/* ai.js — the AI layer.

   Two providers need no API key at all, so the app has a working AI out of the
   box; the rest accept a key the user pastes in (kept in their own browser,
   never sent anywhere but the provider). A local daily budget ("credits")
   keeps the free endpoints from being hammered, and real upstream rate limits
   are surfaced verbatim when they happen.

   The AI never sees raw price arrays and is told not to invent numbers: it
   narrates and judges the metrics engine.js computed, and returns strict JSON
   so the app can act on its decision. */

import { load, save, dayKey, fetchTimeout, clamp } from './util.js';

/* ---------- providers ---------- */

export const PROVIDERS = {
  pollinations: {
    id: 'pollinations',
    label: 'Pollinations (free, no key)',
    free: true, needsKey: false,
    defaultModel: 'openai',
    models: ['openai', 'openai-large', 'mistral', 'llama', 'qwen-coder'],
    note: 'Free community endpoint. No sign-up, no key. Quality varies by model and it can be busy.',
    signup: 'https://pollinations.ai',
  },
  puter: {
    id: 'puter',
    label: 'Puter.js (free credits, sign-in)',
    free: true, needsKey: false,
    defaultModel: 'gpt-5-nano',
    models: ['gpt-5-nano', 'gpt-4.1-nano', 'claude-sonnet-4', 'claude-3-7-sonnet', 'gemini-2.0-flash'],
    note: 'Puter gives every signed-in user free AI credits. A sign-in window opens the first time you use it.',
    signup: 'https://puter.com',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter (free models with a key)',
    free: true, needsKey: true, keyField: 'openrouterKey',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    models: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'deepseek/deepseek-chat-v3-0324:free',
      'google/gemma-3-27b-it:free',
      'qwen/qwen-2.5-72b-instruct:free',
    ],
    note: 'Free API key, and every model ending in ":free" costs nothing.',
    signup: 'https://openrouter.ai/keys',
  },
  groq: {
    id: 'groq',
    label: 'Groq (free tier, very fast)',
    free: true, needsKey: true, keyField: 'groqKey',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b'],
    note: 'Free key with a generous daily allowance. Fastest of the free options.',
    signup: 'https://console.groq.com/keys',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini (free tier)',
    free: true, needsKey: true, keyField: 'geminiKey',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'],
    note: 'Free API key from AI Studio with a daily request allowance.',
    signup: 'https://aistudio.google.com/apikey',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic (paid key)',
    free: false, needsKey: true, keyField: 'anthropicKey',
    defaultModel: 'claude-sonnet-5',
    models: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001'],
    note: 'Your own key, billed to you. Strongest reasoning of the options here.',
    signup: 'https://console.anthropic.com/settings/keys',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI (paid key)',
    free: false, needsKey: true, keyField: 'openaiKey',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'o4-mini'],
    note: 'Your own key, billed to you.',
    signup: 'https://platform.openai.com/api-keys',
  },
};

const DEFAULT_AI_SETTINGS = {
  provider: 'pollinations',
  model: '',
  dailyBudget: 60,
  openrouterKey: '', groqKey: '', geminiKey: '', anthropicKey: '', openaiKey: '',
  temperature: 0.3,
};

export function getAiSettings() { return { ...DEFAULT_AI_SETTINGS, ...load('ai.settings', {}) }; }
export function setAiSettings(patch) {
  const next = { ...getAiSettings(), ...patch };
  save('ai.settings', next);
  return next;
}

export function activeModel(settings = getAiSettings()) {
  return settings.model?.trim() || PROVIDERS[settings.provider]?.defaultModel || '';
}

export function providerReady(id, settings = getAiSettings()) {
  const p = PROVIDERS[id];
  if (!p) return { ready: false, why: 'unknown provider' };
  if (p.needsKey && !settings[p.keyField]?.trim()) return { ready: false, why: `needs a ${p.label} key` };
  return { ready: true };
}

/* ---------- the credit ledger ---------- */

export function creditState() {
  const s = getAiSettings();
  const ledger = load('ai.credits', { days: {}, lifetime: 0 });
  const today = ledger.days[dayKey()] || { total: 0, byProvider: {} };
  return {
    budget: s.dailyBudget,
    usedToday: today.total,
    remaining: Math.max(0, s.dailyBudget - today.total),
    byProvider: today.byProvider,
    lifetime: ledger.lifetime || 0,
  };
}

function spendCredit(providerId, n = 1) {
  const ledger = load('ai.credits', { days: {}, lifetime: 0 });
  const k = dayKey();
  ledger.days[k] = ledger.days[k] || { total: 0, byProvider: {} };
  ledger.days[k].total += n;
  ledger.days[k].byProvider[providerId] = (ledger.days[k].byProvider[providerId] || 0) + n;
  ledger.lifetime = (ledger.lifetime || 0) + n;
  /* keep a fortnight of history, no more */
  const keep = Object.keys(ledger.days).sort().slice(-14);
  ledger.days = Object.fromEntries(keep.map((d) => [d, ledger.days[d]]));
  save('ai.credits', ledger);
}

export function resetCredits() { save('ai.credits', { days: {}, lifetime: 0 }); }

/* ---------- transport ---------- */

async function openAiCompatible(url, key, model, messages, { temperature, extraHeaders = {}, jsonMode = false }) {
  const body = { model, messages, temperature };
  if (jsonMode) body.response_format = { type: 'json_object' };
  const res = await fetchTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  }, 60000);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  let json;
  try { json = JSON.parse(text); } catch { return text; }
  const content = json.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => c.text || '').join('');
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return text;
}

let puterLoading = null;
function loadPuter() {
  if (window.puter) return Promise.resolve(window.puter);
  if (puterLoading) return puterLoading;
  puterLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.puter.com/v2/';
    s.onload = () => (window.puter ? resolve(window.puter) : reject(new Error('puter.js loaded but no global')));
    s.onerror = () => reject(new Error('could not load js.puter.com — blocked or offline'));
    document.head.append(s);
    setTimeout(() => reject(new Error('puter.js load timed out')), 20000);
  });
  return puterLoading;
}

async function callProvider(providerId, messages, { jsonMode = false } = {}) {
  const s = getAiSettings();
  const model = activeModel(s);
  const temperature = clamp(Number(s.temperature) || 0.3, 0, 1);

  switch (providerId) {
    case 'pollinations':
      return openAiCompatible('https://text.pollinations.ai/openai', null, model, messages, { temperature, jsonMode });

    case 'puter': {
      const puter = await loadPuter();
      const prompt = messages.map((m) => (m.role === 'system' ? `[instructions]\n${m.content}` : m.content)).join('\n\n');
      const res = await puter.ai.chat(prompt, { model });
      if (typeof res === 'string') return res;
      const c = res?.message?.content ?? res?.text ?? res?.content;
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) return c.map((x) => x.text || '').join('');
      return JSON.stringify(res);
    }

    case 'openrouter':
      return openAiCompatible('https://openrouter.ai/api/v1/chat/completions', s.openrouterKey.trim(), model, messages, {
        temperature, jsonMode,
        extraHeaders: { 'HTTP-Referer': location.origin, 'X-Title': 'Stock AI Analyzer' },
      });

    case 'groq':
      return openAiCompatible('https://api.groq.com/openai/v1/chat/completions', s.groqKey.trim(), model, messages, { temperature, jsonMode });

    case 'openai':
      return openAiCompatible('https://api.openai.com/v1/chat/completions', s.openaiKey.trim(), model, messages, { temperature, jsonMode });

    case 'anthropic': {
      const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
      const rest = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
      const res = await fetchTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': s.anthropicKey.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model, max_tokens: 2000, temperature, system, messages: rest }),
      }, 60000);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
      const json = JSON.parse(text);
      return (json.content || []).map((c) => c.text || '').join('');
    }

    case 'gemini': {
      const sys = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
      const contents = messages.filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
        + `?key=${encodeURIComponent(s.geminiKey.trim())}`;
      const res = await fetchTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
          generationConfig: { temperature, maxOutputTokens: 2048, ...(jsonMode ? { responseMimeType: 'application/json' } : {}) },
        }),
      }, 60000);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
      const json = JSON.parse(text);
      return (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    }

    default:
      throw new Error(`unsupported provider ${providerId}`);
  }
}

/* Public transport entry point. Enforces the local daily budget and, on
   failure, falls back to the other keyless provider so the app keeps working. */
export async function chat(messages, { jsonMode = false, allowFallback = true, cost = 1 } = {}) {
  const s = getAiSettings();
  const credits = creditState();
  if (credits.remaining < cost) {
    throw new Error(`Daily AI budget spent (${credits.usedToday}/${credits.budget}). `
      + 'Raise it in Settings — it is your own local cap, not the provider\'s.');
  }

  const chain = [s.provider];
  if (allowFallback) {
    for (const id of ['pollinations', 'puter', 'groq', 'openrouter', 'gemini']) {
      if (id !== s.provider && providerReady(id, s).ready) chain.push(id);
    }
  }

  const errors = [];
  for (const id of chain) {
    const check = providerReady(id, s);
    if (!check.ready) { errors.push(`${id}: ${check.why}`); continue; }
    const t0 = performance.now();
    try {
      const out = await callProvider(id, messages, { jsonMode });
      if (!out || !String(out).trim()) throw new Error('empty response');
      spendCredit(id, cost);
      return {
        text: String(out),
        provider: id,
        providerLabel: PROVIDERS[id].label,
        model: activeModel(s),
        ms: Math.round(performance.now() - t0),
        fellBackFrom: id === s.provider ? null : s.provider,
        errors,
      };
    } catch (e) {
      errors.push(`${PROVIDERS[id]?.label || id}: ${e.message}`);
    }
  }
  throw new Error('No AI provider responded. ' + errors.join(' | '));
}

/* ---------- prompt construction ---------- */

const SYSTEM = `You are the analyst inside a stock-analysis app. You are given metrics that the
app has ALREADY computed from real daily OHLCV bars. Your job is judgement and plain English,
not arithmetic.

Hard rules:
1. Use ONLY the numbers in the payload. Never invent a price, date, ratio, earnings figure or
   news event. If something is not in the payload, you do not know it — say so.
2. Anchor every claim to a number from the payload.
3. The user's core question is always: is this price LOW for this stock, is it HIGH for what
   this stock is, and should they buy, sell or hold. Answer that directly and early.
4. Respect the guards. If a guard says price is cheap but still falling, do not issue a buy
   without naming the trigger that would change your mind.
5. Read the learning journal. It records how your past calls on real data actually turned out.
   If a signal has been unreliable, weight it down and say you are doing so.
6. You are managing a paper-money portfolio for learning. Size positions like an adult:
   respect the risk budget and the position cap given to you.
7. Plain, concrete language. No hedging boilerplate, no "consult a financial advisor" filler,
   no emoji. This is educational analysis, not personalised financial advice, and the app
   already says so.

Reply with ONE JSON object and nothing else — no prose, no code fence:

{
  "verdict": "STRONG BUY" | "BUY" | "HOLD" | "REDUCE" | "SELL",
  "conviction": 0-100,
  "headline": "one sentence, names the price and the call",
  "isLow": true|false,
  "lowVerdict": "2-4 sentences on whether this is a low for THIS stock, with the numbers",
  "isHigh": true|false,
  "highVerdict": "2-4 sentences on whether this is high for what it is, with the numbers",
  "reasoning": ["3-6 bullets, each one anchored to a number"],
  "buyPlan": [{"price": number, "note": "what this level is and what to do there"}],
  "sellTrigger": "the condition that would make you exit",
  "targets": [{"price": number, "why": "short"}],
  "stop": number,
  "risks": ["2-4 things that would make this call wrong"],
  "horizonDays": number,
  "disagreesWithEngine": "empty string, or why you differ from the engine verdict",
  "trade": {"action": "BUY"|"SELL"|"HOLD", "shares": number, "why": "one sentence"},
  "learned": "one sentence on what the journal changed about this call, or empty string"
}`;

/* Compact payload — small enough for free models, complete enough to reason on. */
export function buildPayload(report, { portfolio, journal, question } = {}) {
  const r = report;
  const f = Object.fromEntries(r.factors.map((x) => [x.key, +x.score.toFixed(2)]));
  const round = (v, d = 2) => (isFinite(v) ? +v.toFixed(d) : null);

  const payload = {
    symbol: r.symbol,
    name: r.name || null,
    currency: r.currency,
    asOf: new Date(r.asOf).toISOString(),
    dataSource: `${r.dataQuality.source} (${r.dataQuality.bars} daily bars, ${r.dataQuality.years}y)`,
    dataStale: r.dataQuality.stale ? `last bar is ${r.dataQuality.lastBarAgeDays} days old` : false,

    price: round(r.price),
    changeTodayPct: round(r.changePct),

    itsOwnRange: {
      oneYear: {
        low: round(r.ranges.y1.low), p25: round(r.ranges.y1.p25), median: round(r.ranges.y1.p50),
        p75: round(r.ranges.y1.p75), high: round(r.ranges.y1.high),
        percentileOfPriceToday: Math.round(r.ranges.y1.rank * 100),
      },
      typicalPrice: round(r.typical),
      pctBelowTypical: round(r.discountPct, 1),
      roundNumberItUsuallyTradesAbove: r.anchor,
      pctOfYearAboveThatNumber: round(r.daysAboveAnchor, 0),
      pctOfYearSpentAboveTodaysPrice: round(r.daysAbovePrice, 0),
      fiftyTwoWeek: { high: round(r.fiftyTwoWeek.high), low: round(r.fiftyTwoWeek.low), pctBelowHigh: round(r.fiftyTwoWeek.fromHighPct, 1) },
    },

    trend: {
      regime: r.trend.regime.label,
      sma20: round(r.trend.sma20), sma50: round(r.trend.sma50), sma200: round(r.trend.sma200),
      stdDevsFromIts50DayNorm: round(r.gapZ, 2),
    },
    momentum: { rsi14: round(r.momentum.rsi14, 0), macdHistogram: round(r.momentum.macd.hist, 3), change20d: round(r.momentum.roc20, 1) },
    volatility: { atr: round(r.volatility.atr14), atrPctOfPrice: round(r.volatility.atrPct, 1), annualisedVol: round(r.volatility.vol20, 0), bollingerPosition: round(r.volatility.pctB, 2) },
    volume: { vsTwentyDayAverage: round(r.volume.ratio, 2), onBalanceVolumeTrend: r.volume.obvSlope > 0 ? 'rising' : 'falling' },

    supports: r.levels.supports.slice(0, 4).map((l) => ({ price: round(l.price), what: l.type })),
    resistances: r.levels.resistances.slice(0, 4).map((l) => ({ price: round(l.price), what: l.type })),

    whatThisLevelHistoricallyPaid: r.study.bucket20 && r.study.bucket20.n >= 5 ? {
      decileOfOwnRange: r.study.currentDecile,
      sampleSize: r.study.bucket20.n,
      medianReturnNext20Sessions: round(r.study.bucket20.median, 1),
      pctOfTimesPositive: round(r.study.bucket20.positive, 0),
      medianReturnNext60Sessions: r.study.bucket60 && r.study.bucket60.n >= 5 ? round(r.study.bucket60.median, 1) : null,
    } : 'not enough history',

    engine: {
      verdict: r.verdict,
      verdictBeforeGuards: r.rawVerdict,
      score: round(r.score, 3),
      conviction: r.conviction,
      factorScores: f,
      factorWeights: Object.fromEntries(Object.entries(r.weights).map(([k, v]) => [k, +v.toFixed(2)])),
      guards: r.guards.map((g) => ({ label: g.label, detail: g.detail, waitFor: g.waitFor })),
      isLow: r.low.isLow, lowTriggers: r.low.triggers,
      isHigh: r.high.isHigh, highTriggers: r.high.triggers,
      suggestedBuyZones: r.plan.buyZones.map((z) => ({ tier: z.label, price: round(z.price), pctAway: round(z.distancePct, 1), why: z.why })),
      suggestedTargets: r.plan.targets.map((t) => ({ price: round(t.price), why: t.label })),
      suggestedStop: round(r.plan.stop),
      horizonDays: r.plan.horizonDays,
    },
  };

  if (portfolio) {
    payload.paperPortfolio = {
      cash: round(portfolio.cash),
      equity: round(portfolio.equity),
      totalReturnPct: round(portfolio.totalReturnPct, 2),
      openPositions: portfolio.positions.map((p) => ({
        symbol: p.symbol, shares: p.shares, avgCost: round(p.avgCost),
        lastPrice: round(p.lastPrice), unrealisedPct: round(p.unrealisedPct, 1),
      })),
      existingPositionInThisName: portfolio.positions.find((p) => p.symbol === r.symbol) || null,
      riskBudgetPctPerTrade: portfolio.riskPct,
      maxPositionPctOfEquity: portfolio.maxPosPct,
      sizeTheEngineSuggests: r.plan.sizing ? r.plan.sizing.shares : null,
    };
  }

  if (journal) payload.learningJournal = journal;
  if (question) payload.userQuestion = question;
  return payload;
}

const JSON_RE = /\{[\s\S]*\}/;

export function parseDecision(text) {
  let raw = String(text).trim()
    .replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let obj = null;
  try { obj = JSON.parse(raw); } catch {
    const m = raw.match(JSON_RE);
    if (m) { try { obj = JSON.parse(m[0]); } catch {} }
  }
  if (!obj || typeof obj !== 'object') throw new Error('AI did not return JSON');

  const str = (v, d = '') => (typeof v === 'string' ? v.trim() : d);
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined) : []);
  const n = (v) => (isFinite(Number(v)) ? Number(v) : null);

  const verdict = str(obj.verdict).toUpperCase().replace(/[^A-Z ]/g, '');
  const known = ['STRONG BUY', 'BUY', 'HOLD', 'REDUCE', 'SELL'];

  return {
    verdict: known.includes(verdict) ? verdict : (verdict.includes('BUY') ? 'BUY' : verdict.includes('SELL') ? 'SELL' : 'HOLD'),
    conviction: clamp(n(obj.conviction) ?? 50, 0, 100),
    headline: str(obj.headline),
    isLow: !!obj.isLow,
    lowVerdict: str(obj.lowVerdict),
    isHigh: !!obj.isHigh,
    highVerdict: str(obj.highVerdict),
    reasoning: arr(obj.reasoning).map((x) => str(x)).filter(Boolean),
    buyPlan: arr(obj.buyPlan).map((x) => ({ price: n(x?.price), note: str(x?.note) })).filter((x) => x.price),
    sellTrigger: str(obj.sellTrigger),
    targets: arr(obj.targets).map((x) => ({ price: n(x?.price), why: str(x?.why) })).filter((x) => x.price),
    stop: n(obj.stop),
    risks: arr(obj.risks).map((x) => str(x)).filter(Boolean),
    horizonDays: clamp(n(obj.horizonDays) ?? 20, 1, 365),
    disagreesWithEngine: str(obj.disagreesWithEngine),
    trade: {
      action: ['BUY', 'SELL', 'HOLD'].includes(str(obj.trade?.action).toUpperCase())
        ? str(obj.trade.action).toUpperCase() : 'HOLD',
      shares: Math.max(0, Math.floor(n(obj.trade?.shares) ?? 0)),
      why: str(obj.trade?.why),
    },
    learned: str(obj.learned),
  };
}

/* Full analysis call: engine report in, structured decision out. */
export async function analyseWithAI(report, { portfolio, journal } = {}) {
  const payload = buildPayload(report, { portfolio, journal });
  const res = await chat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: JSON.stringify(payload, null, 1) },
  ], { jsonMode: true });
  const decision = parseDecision(res.text);
  return { decision, meta: res, payload };
}

/* Free-form follow-up question about the stock currently on screen. */
export async function askAboutStock(report, question, { portfolio, journal } = {}) {
  const payload = buildPayload(report, { portfolio, journal, question });
  const res = await chat([
    {
      role: 'system',
      content: 'You are the analyst inside a stock-analysis app. Answer the user\'s question about '
        + 'this stock using only the metrics in the payload — never invent prices, news or fundamentals. '
        + 'Be direct and concrete, quote the numbers you rely on, and keep it under 200 words. '
        + 'Plain prose, no JSON, no emoji. If the payload does not contain what they asked about, say so.',
    },
    { role: 'user', content: JSON.stringify(payload, null, 1) },
  ]);
  return { answer: res.text.trim(), meta: res };
}

/* Diagnostics: one cheap round-trip per provider so the user can see what works. */
export async function testProviders() {
  const s = getAiSettings();
  const out = [];
  for (const p of Object.values(PROVIDERS)) {
    const check = providerReady(p.id, s);
    if (!check.ready) { out.push({ provider: p.label, status: 'skipped', detail: check.why }); continue; }
    const t0 = performance.now();
    try {
      const text = await callProvider(p.id, [
        { role: 'system', content: 'Reply with exactly: OK' },
        { role: 'user', content: 'ping' },
      ], {});
      out.push({
        provider: p.label, status: 'ok', ms: Math.round(performance.now() - t0),
        detail: String(text).trim().slice(0, 40) || '(empty)',
      });
    } catch (e) {
      out.push({ provider: p.label, status: 'fail', ms: Math.round(performance.now() - t0), detail: e.message.slice(0, 160) });
    }
  }
  return out;
}
