/* app.js — wiring. Fetch real bars, run the engine, let the AI judge it,
   record the call, optionally trade it, then draw all of it. */

import {
  $, $$, el, esc, money, compact, pct, pctPlain, num, fmtDate, fmtDateTime,
  load, save, clamp,
} from './util.js';
import {
  fetchHistory, fetchLastPrice, searchSymbols, ingestCsv, testSources, testRelays,
  getDataSettings, setDataSettings, cachedSymbols,
} from './data.js';
import { analyze } from './engine.js';
import {
  PROVIDERS, getAiSettings, setAiSettings, creditState, resetCredits,
  analyseWithAI, askAboutStock, testProviders,
} from './ai.js';
import {
  getPortfolio, getTradeSettings, setTradeSettings, resetPortfolio, snapshot,
  buy, sell, executeDecision, rememberPrice, recordEquityPoint,
  tradeStats, exportState, importPortfolio,
} from './portfolio.js';
import {
  recordPrediction, evaluateDue, stats as learnStats, factorReliability, getWeights,
  journalFor, allPredictions, resetLearning, exportLearning, importLearning, duePredictions,
} from './learning.js';
import { drawPriceChart, drawEquityCurve, drawStudy, drawFactors } from './chart.js';

const state = { report: null, decision: null, aiMeta: null, bars: 252, hoverIndex: null, busy: false };

/* ---------- chrome ---------- */

function toast(msg, kind = 'info', ms = 5200) {
  const t = el('div', { class: `toast ${kind}`, html: msg });
  $('#toasts').append(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, ms);
}

function showTab(name) {
  $$('nav.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  $$('.panel').forEach((p) => p.classList.toggle('on', p.id === 'p-' + name));
  save('ui.tab', name);
  if (name === 'chart') requestAnimationFrame(redrawCharts);
  if (name === 'portfolio') renderPortfolio();
  if (name === 'learning') renderLearning();
}

function applyTheme(mode) {
  if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', mode);
  save('ui.theme', mode);
  if (state.report) requestAnimationFrame(redrawCharts);
}

function updateCredits() {
  const c = creditState();
  const frac = c.budget ? c.remaining / c.budget : 0;
  $('#credbar').style.width = `${clamp(frac * 100, 0, 100)}%`;
  $('#credbar').style.background = frac > 0.25 ? 'var(--gold)' : 'var(--status-critical)';
  $('#credtxt').textContent = `${c.remaining}/${c.budget}`;
  $('#credtxt').parentElement.title =
    `${c.usedToday} AI calls today out of your ${c.budget}-call local cap. ${c.lifetime} all-time. `
    + `Provider: ${PROVIDERS[getAiSettings().provider]?.label || '—'}`;
}

/* ---------- watchlist ---------- */

const DEFAULT_WATCH = ['IREN', 'NVDA', 'AAPL', 'SPY'];
const getWatch = () => load('ui.watch', DEFAULT_WATCH);

function renderWatch() {
  const list = getWatch();
  const box = $('#watchlist');
  box.replaceChildren(...list.map((sym) => {
    const chip = el('span', { class: 'chip', title: `Analyze ${sym}` },
      el('b', { text: sym }),
      el('span', { class: 'x', text: '×', title: 'Remove' }));
    chip.querySelector('b').addEventListener('click', () => { $('#q').value = sym; run(sym); });
    chip.querySelector('.x').addEventListener('click', (e) => {
      e.stopPropagation();
      save('ui.watch', getWatch().filter((s) => s !== sym));
      renderWatch();
    });
    return chip;
  }), el('span', { class: 'chip', title: 'Add the symbol in the box', style: { borderStyle: 'dashed' }, onclick: () => {
    const sym = $('#q').value.trim().toUpperCase();
    if (!sym) return toast('Type a ticker in the box first.', 'info');
    const list2 = getWatch();
    if (!list2.includes(sym)) { save('ui.watch', [...list2, sym]); renderWatch(); }
  } }, el('b', { text: '+ add' })));
}

/* ---------- the main flow ---------- */

async function run(symbolMaybe, { force = false } = {}) {
  if (state.busy) return;
  const sym = String(symbolMaybe || $('#q').value || '').trim().toUpperCase();
  if (!sym) return toast('Enter a ticker.', 'info');

  state.busy = true;
  const btn = $('#go');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
  $('#ac').hidden = true;
  showTab('analysis');
  $('#analysis-empty').hidden = true;
  $('#analysis').hidden = false;
  $('#analysis').innerHTML = `<div class="empty"><div class="big"><span class="spin"></span> Loading real bars for ${esc(sym)}…</div>
    <p class="small">Trying market-data sources in order. If they are all blocked, the Connections tab will say why.</p></div>`;

  try {
    const hist = await fetchHistory(sym, { force });
    const ts = getTradeSettings();
    const snap = snapshot({ [hist.symbol]: hist.livePrice });
    const report = analyze(hist, {
      weightMultipliers: getWeights(),
      equity: snap.equity, riskPct: ts.riskPct, maxPosPct: ts.maxPosPct,
    });

    state.report = report;
    state.decision = null;
    state.aiMeta = null;
    rememberPrice(report.symbol, report.price);
    recordEquityPoint();

    if (hist.stale) toast('Live sources failed — showing the last cached data for this symbol.', 'err', 8000);
    else if (report.dataQuality.stale) toast(`Latest bar is ${report.dataQuality.lastBarAgeDays} days old. Market closed, or the source is behind.`, 'info');

    renderAnalysis();
    renderChartTab();

    /* the AI layer is a bonus on top of a complete answer, never a blocker */
    await runAI(report);
  } catch (e) {
    $('#analysis').innerHTML = `<div class="empty"><div class="big">Could not analyse ${esc(sym)}</div>
      <p class="small">${esc(e.message)}</p>
      <p class="small" style="margin-top:1rem">Open <b>Connections</b> to see which sources your network allows,
      set your own relay in Settings, or paste the history in by hand.</p></div>`;
    toast(esc(e.message), 'err', 9000);
  } finally {
    state.busy = false;
    btn.disabled = false; btn.textContent = 'Analyze';
  }
}

async function runAI(report) {
  const slot = $('#ai-slot');
  if (slot) slot.innerHTML = `<div class="lbl">AI analyst</div><p class="small muted"><span class="spin"></span> Asking ${esc(PROVIDERS[getAiSettings().provider]?.label || 'the model')}…</p>`;

  const ts = getTradeSettings();
  const snap = snapshot({ [report.symbol]: report.price });
  const journal = journalFor(report.symbol, snap);
  const pf = {
    cash: snap.cash, equity: snap.equity, totalReturnPct: snap.totalReturnPct,
    positions: snap.positions, riskPct: ts.riskPct, maxPosPct: ts.maxPosPct,
  };

  try {
    const { decision, meta } = await analyseWithAI(report, { portfolio: pf, journal });
    state.decision = decision;
    state.aiMeta = meta;
    updateCredits();
    if (meta.fellBackFrom) {
      toast(`${PROVIDERS[meta.fellBackFrom]?.label || meta.fellBackFrom} failed — used ${meta.providerLabel} instead.`, 'info');
    }
    recordPrediction(report, decision, { source: 'ai', aiMeta: meta });

    if (ts.autopilot) {
      const res = executeDecision(report, decision, { source: 'ai' });
      if (res.trade) toast(`Autopilot: ${res.trade.side} ${res.trade.shares} ${res.trade.symbol} @ ${money(res.trade.price)}`, 'ok');
      else toast(`Autopilot held: ${esc(res.why)}`, 'info');
      renderPortfolio();
    }
    renderAnalysis();
  } catch (e) {
    state.decision = null;
    state.aiMeta = { error: e.message };
    recordPrediction(report, null, { source: 'engine' });
    renderAnalysis();
    toast(`AI unavailable — the computed analysis below still stands. ${esc(e.message)}`, 'err', 9000);
  }
}

/* ---------- render: analysis ---------- */

function verdictClass(v) { return v.includes('BUY') ? 'buy' : v === 'HOLD' ? 'hold' : 'sell'; }

function tile(k, v, s) {
  return `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
}

function rangeMeter(r) {
  /* The 52-week range everyone quotes is the intraday one, and it is what the
     support/resistance list uses — so the meter is drawn on that same axis. */
  const lo = Math.min(r.fiftyTwoWeek.low, r.price), hi = Math.max(r.fiftyTwoWeek.high, r.price);
  const span = hi - lo || 1;
  const at = (v) => clamp(((v - lo) / span) * 100, 0, 100);
  const p25 = at(r.ranges.y1.p25), p75 = at(r.ranges.y1.p75), p90 = at(r.ranges.y1.p90);
  return `<div class="meter">
    <div class="track">
      <div class="cheap" style="width:${p25}%"></div>
      <div class="fair" style="left:${p25}%;width:${Math.max(0, p75 - p25)}%"></div>
      <div class="rich" style="width:${Math.max(0, 100 - p90)}%"></div>
      <div class="now" style="left:${at(r.price)}%" title="now ${money(r.price, r.currency)}"></div>
    </div>
    <div class="ends">
      <span>${money(lo, r.currency)} <span class="muted">52w low</span></span>
      <span class="muted">cheap · normal · rich</span>
      <span><span class="muted">52w high</span> ${money(hi, r.currency)}</span>
    </div>
  </div>`;
}

function renderAnalysis() {
  const r = state.report;
  if (!r) return;
  const d = state.decision;
  const cur = r.currency;
  const m = (v) => money(v, cur);

  const finalVerdict = d?.verdict || r.verdict;
  const finalConv = d?.conviction ?? r.conviction;
  const chg = r.changePct;
  const chgCls = !isFinite(chg) ? 'flat' : chg > 0 ? 'up' : chg < 0 ? 'down' : 'flat';

  const zonesHtml = r.plan.buyZones.map((z) => `
    <div class="zone ${z.reached ? 'hit' : ''}">
      <div><div class="zl">${esc(z.label)}${z.alloc ? ` · ${z.alloc}%` : ''}</div><div class="zp">${m(z.price)}</div></div>
      <div class="zw">${esc(z.why)}</div>
      <div class="zd">${z.reached ? '<span class="badge good">here now</span>' : pct(z.distancePct) + ' away'}</div>
    </div>`).join('');

  const targetsHtml = r.plan.targets.map((t) => `
    <div class="zone">
      <div><div class="zl">target</div><div class="zp">${m(t.price)}</div></div>
      <div class="zw">${esc(t.label)}</div>
      <div class="zd up">${pct(t.upsidePct, 0)}</div>
    </div>`).join('');

  const guardsHtml = r.guards.map((g) => `
    <div class="callout guard">
      <div class="t"><span class="dot"></span>${esc(g.label)}</div>
      <p>${esc(g.detail)}</p>
      <p style="margin-top:.5rem"><strong>What would change it:</strong> ${esc(g.waitFor)}</p>
    </div>`).join('');

  const b20 = r.study.bucket20;
  const studyTile = b20 && b20.n >= 5
    ? tile('At this level, historically', `${pct(b20.median, 1)}`,
        `median over the next 20 sessions · ${b20.positive.toFixed(0)}% positive · n=${b20.n}`)
    : tile('At this level, historically', b20 && b20.n ? `${pct(b20.median, 1)}?` : '—',
        b20 && b20.n
          ? `only ${b20.n} precedent${b20.n === 1 ? '' : 's'} this low in its range — too thin to lean on`
          : r.study.horizon20
            ? 'it has never traded this part of its range before'
            : 'needs ~1.5 years of history to measure');

  const aiHtml = d ? `
    <div class="lbl">AI analyst${state.aiMeta ? ` · ${esc(state.aiMeta.providerLabel)} · ${esc(state.aiMeta.model)}` : ''}</div>
    ${d.headline ? `<p class="headline" style="margin-top:0">${esc(d.headline)}</p>` : ''}
    ${d.reasoning.length ? `<ul class="bullets" style="margin-top:.9rem">${d.reasoning.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${d.disagreesWithEngine ? `<div class="callout guard" style="margin-top:12px"><div class="t"><span class="dot"></span>Differs from the computed verdict (${esc(r.verdict)})</div><p>${esc(d.disagreesWithEngine)}</p></div>` : ''}
    <div class="grid g2" style="margin-top:14px">
      ${d.sellTrigger ? `<div><div class="lbl">Exit trigger</div><p class="small">${esc(d.sellTrigger)}</p></div>` : ''}
      ${d.risks.length ? `<div><div class="lbl">What would make this wrong</div><ul class="bullets small">${d.risks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    </div>
    ${d.learned ? `<p class="small muted" style="margin-top:12px"><b>From its own record:</b> ${esc(d.learned)}</p>` : ''}
    <div class="src-line" style="margin-top:12px">
      <span>AI call: <b>${esc(d.verdict)}</b> · conviction ${d.conviction} · horizon ${d.horizonDays} sessions</span>
      ${d.trade.action !== 'HOLD' ? `<span class="badge gold">would ${esc(d.trade.action)} ${d.trade.shares} shares</span>` : '<span class="badge">no trade</span>'}
      ${state.aiMeta?.ms ? `<span class="muted">${state.aiMeta.ms} ms</span>` : ''}
    </div>`
    : state.aiMeta?.error
      ? `<div class="lbl">AI analyst</div><p class="small">Unavailable right now — <span class="muted">${esc(state.aiMeta.error)}</span></p>
         <p class="small muted">The verdict, zones and levels above are computed from the price history and do not need the AI.
         Pick a different provider in Settings, or check <b>Connections</b>.</p>`
      : `<div class="lbl">AI analyst</div><p class="small muted"><span class="spin"></span> Waiting on the model…</p>`;

  $('#analysis').innerHTML = `
    <div class="card">
      <div class="hero">
        <div>
          <div class="sym-line">
            <span class="sym">${esc(r.symbol)}</span>
            ${r.name ? `<span class="sym-name">${esc(r.name)}</span>` : ''}
            <span class="badge ${r.trend.regime.id.includes('up') ? 'good' : r.trend.regime.id.includes('down') || r.trend.regime.id === 'breakdown' ? 'bad' : ''}">${esc(r.trend.regime.label)}</span>
          </div>
          <div class="price-line">
            <span class="price">${m(r.price)}</span>
            <span class="chg ${chgCls}">${isFinite(chg) ? pct(chg, 2) : ''}</span>
            <span class="tiny muted">${r.dataQuality.cached ? 'cached · ' : ''}${esc(r.dataQuality.source)}${r.dataQuality.via && r.dataQuality.via !== 'direct' ? ` via ${esc(r.dataQuality.via)}` : ''} · ${r.dataQuality.bars} bars · last ${fmtDate(r.dataQuality.lastBar)}</span>
          </div>
          ${rangeMeter(r)}
        </div>
        <div class="verdict-box">
          <span class="verdict ${verdictClass(finalVerdict)}">${esc(finalVerdict)}</span>
          <div class="conv">conviction ${finalConv}</div>
          <div class="conv-bar"><i style="width:${clamp(finalConv, 0, 100)}%"></i></div>
          ${d && d.verdict !== r.verdict ? `<div class="tiny muted" style="margin-top:.4rem">computed: ${esc(r.verdict)}</div>` : ''}
          ${r.rawVerdict !== r.verdict ? `<div class="tiny muted">before guards: ${esc(r.rawVerdict)}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="callout ${r.low.isLow ? 'low' : ''}">
        <div class="t"><span class="dot"></span>Is this a low?${r.low.isLow ? ` — yes, ${esc(r.low.severity)}` : ' — no'}</div>
        <p>${esc(r.low.text)}</p>
        ${d?.lowVerdict ? `<p style="margin-top:.6rem"><strong>AI:</strong> ${esc(d.lowVerdict)}</p>` : ''}
      </div>
      <div class="callout ${r.high.isHigh ? 'high' : ''}">
        <div class="t"><span class="dot"></span>Is it high for what it is?${r.high.isHigh ? ` — yes, ${esc(r.high.severity)}` : ' — no'}</div>
        <p>${esc(r.high.text)}</p>
        ${d?.highVerdict ? `<p style="margin-top:.6rem"><strong>AI:</strong> ${esc(d.highVerdict)}</p>` : ''}
      </div>
      ${guardsHtml}
    </div>

    <div class="grid g4">
      ${tile('Typical price (1y median)', m(r.typical), `now ${r.discountPct >= 0 ? pctPlain(r.discountPct) + ' below' : pctPlain(-r.discountPct) + ' above'}`)}
      ${tile('Usually trades above', m(r.anchor), `${isFinite(r.daysAboveAnchor) ? r.daysAboveAnchor.toFixed(0) : '—'}% of the last year`)}
      ${tile('Percentile of its own year', `${(r.ranges.y1.rank * 100).toFixed(0)}th`, `${(100 - r.daysAbovePrice).toFixed(0)}% of the year was cheaper`)}
      ${tile('Normal band', `${m(r.plan.fairBand[0])}–${m(r.plan.fairBand[1])}`, '25th to 75th percentile')}
      ${tile('From 52-week high', pct(r.fiftyTwoWeek.fromHighPct), `high ${m(r.fiftyTwoWeek.high)}`)}
      ${tile('RSI (14)', num(r.momentum.rsi14, 0), r.momentum.rsi14 <= 30 ? 'oversold' : r.momentum.rsi14 >= 70 ? 'overbought' : 'neutral')}
      ${tile('Vs its 50-day norm', `${r.gapZ >= 0 ? '+' : ''}${num(r.gapZ, 1)}σ`, 'standard deviations of its usual gap')}
      ${studyTile}
      ${tile('Volatility (ann.)', pctPlain(r.volatility.vol20, 0), `ATR ${m(r.volatility.atr14)} · ${pctPlain(r.volatility.atrPct, 1)} a day`)}
      ${tile('Volume', `${num(r.volume.ratio, 2)}×`, '20-day average')}
      ${tile('Moving averages', `${isFinite(r.trend.sma50) ? m(r.trend.sma50) : '—'} / ${isFinite(r.trend.sma200) ? m(r.trend.sma200) : '—'}`, '50-day / 200-day')}
      ${tile('Suggested horizon', `${r.plan.horizonDays} sessions`, 'scaled to its volatility')}
    </div>

    <div class="grid g2" style="margin-top:14px">
      <div class="card">
        <div class="lbl">Where to buy it</div>
        <h3>Buy zones${r.plan.belowAllZones ? '' : ' — scale in, don\'t lump in'}</h3>
        ${zonesHtml}
        ${d?.buyPlan?.length ? `<div style="margin-top:12px"><div class="lbl">AI's own levels</div>
          ${d.buyPlan.map((x) => `<div class="zone"><div><div class="zl">ai</div><div class="zp">${m(x.price)}</div></div><div class="zw">${esc(x.note)}</div><div class="zd">${pct(((x.price / r.price) - 1) * 100, 1)}</div></div>`).join('')}</div>` : ''}
      </div>
      <div class="card">
        <div class="lbl">Where it goes if right, and where you are wrong</div>
        <h3>Targets and stop</h3>
        ${targetsHtml}
        <div class="zone">
          <div><div class="zl" style="color:var(--status-critical-ink)">stop</div><div class="zp">${m(d?.stop ?? r.plan.stop)}</div></div>
          <div class="zw">below the nearest support and 2 ATR of noise</div>
          <div class="zd down">−${pctPlain(r.plan.riskPctOfPrice, 1)}</div>
        </div>
        ${r.plan.sizing ? `<p class="small muted" style="margin-top:10px">At ${pctPlain(getTradeSettings().riskPct, 1)} risk per trade on
          ${money(snapshot().equity)} of paper equity, that is <b class="mono">${r.plan.sizing.shares}</b> shares
          (${money(r.plan.sizing.cost)}), limited by the ${esc(r.plan.sizing.limitedBy)}.</p>` : ''}
      </div>
    </div>

    <div class="card" id="ai-slot">${aiHtml}</div>

    <div class="card">
      <div class="lbl">Support and resistance</div>
      <div class="grid g2">
        <div>
          <h3 class="small mono" style="font-family:var(--mono);font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted)">Support below</h3>
          ${r.levels.supports.length ? r.levels.supports.map((l) => `<div class="zone"><div class="zp">${m(l.price)}</div><div class="zw">${esc(l.type)}</div><div class="zd">${pct(((l.price / r.price) - 1) * 100, 1)}</div></div>`).join('') : '<p class="small muted">Nothing below — it is at the low end of its record.</p>'}
        </div>
        <div>
          <h3 class="small mono" style="font-family:var(--mono);font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted)">Resistance above</h3>
          ${r.levels.resistances.length ? r.levels.resistances.map((l) => `<div class="zone"><div class="zp">${m(l.price)}</div><div class="zw">${esc(l.type)}</div><div class="zd">${pct(((l.price / r.price) - 1) * 100, 1)}</div></div>`).join('') : '<p class="small muted">Nothing above — it is at new highs.</p>'}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="lbl">Ask about ${esc(r.symbol)}</div>
      <div class="row" style="align-items:flex-start">
        <input id="ask-q" class="input" placeholder="e.g. why not wait for the 200-day? what would make you change your mind?">
        <button class="btn" id="ask-btn" style="flex:0 0 auto">Ask</button>
      </div>
      <div id="ask-out" style="margin-top:12px"></div>
      <p class="tiny muted" style="margin-top:8px">The model only sees the numbers on this page — no news, no fundamentals.</p>
    </div>

    <div class="src-line" style="margin-top:16px">
      <button class="btn sm" id="refetch">Refetch live data</button>
      <button class="btn sm" id="add-watch">Add to watchlist</button>
      <span class="muted">analysed ${fmtDateTime(r.asOf)}</span>
      <span class="muted">weights: ${Object.entries(getWeights()).filter(([, v]) => v !== 1).length || 'all default'}${Object.entries(getWeights()).some(([, v]) => v !== 1) ? ' adjusted by learning' : ''}</span>
    </div>`;

  $('#refetch')?.addEventListener('click', () => run(r.symbol, { force: true }));
  $('#add-watch')?.addEventListener('click', () => {
    const w = getWatch();
    if (!w.includes(r.symbol)) { save('ui.watch', [...w, r.symbol]); renderWatch(); toast(`${r.symbol} added to the watchlist.`, 'ok'); }
    else toast('Already on the watchlist.', 'info');
  });
  $('#ask-btn')?.addEventListener('click', askQuestion);
  $('#ask-q')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') askQuestion(); });
}

async function askQuestion() {
  const q = $('#ask-q').value.trim();
  if (!q) return;
  const out = $('#ask-out');
  out.innerHTML = '<p class="small muted"><span class="spin"></span> Thinking…</p>';
  try {
    const snap = snapshot({ [state.report.symbol]: state.report.price });
    const ts = getTradeSettings();
    const { answer, meta } = await askAboutStock(state.report, q, {
      portfolio: { cash: snap.cash, equity: snap.equity, totalReturnPct: snap.totalReturnPct, positions: snap.positions, riskPct: ts.riskPct, maxPosPct: ts.maxPosPct },
      journal: journalFor(state.report.symbol, snap),
    });
    updateCredits();
    out.innerHTML = `<div class="ai-answer">${esc(answer)}</div>
      <p class="tiny muted" style="margin-top:6px">${esc(meta.providerLabel)} · ${esc(meta.model)} · ${meta.ms} ms</p>`;
  } catch (e) {
    out.innerHTML = `<p class="small">Could not reach the AI — <span class="muted">${esc(e.message)}</span></p>`;
  }
}

/* ---------- render: chart tab ---------- */

function renderChartTab() {
  const r = state.report;
  if (!r) return;
  $('#chart-empty').hidden = true;
  $('#chart-body').hidden = false;
  $('#chart-title').textContent = `${r.symbol} — ${money(r.price, r.currency)} · normal range ${money(r.plan.fairBand[0], r.currency)}–${money(r.plan.fairBand[1], r.currency)}`;
  redrawCharts();
}

let priceGeom = null;
function redrawCharts() {
  const r = state.report;
  if (!r) return;
  if (!$('#p-chart').classList.contains('on') && !$('#p-portfolio').classList.contains('on')) {
    /* charts in hidden panels have zero width; draw them when their tab opens */
  }
  if ($('#p-chart').classList.contains('on')) {
    priceGeom = drawPriceChart($('#price-canvas'), r, { bars: state.bars, hoverIndex: state.hoverIndex });
    drawStudy($('#study-canvas'), r.study.horizon20, r.study.currentDecile, { horizon: 20 });
    drawFactors($('#factor-canvas'), r.factors, { cvdSafe: load('ui.cvdSafe', false) });
  }
  if ($('#p-portfolio').classList.contains('on')) {
    const pf = getPortfolio();
    drawEquityCurve($('#equity-canvas'), pf.equityCurve, pf.startCash);
  }
}

function wirePriceHover() {
  const canvas = $('#price-canvas');
  const tip = $('#price-tip');
  const move = (ev) => {
    if (!priceGeom || !state.report) return;
    const rect = canvas.getBoundingClientRect();
    const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
    const i = priceGeom.xToIndex(px);
    if (i === state.hoverIndex) return;
    state.hoverIndex = i;
    priceGeom = drawPriceChart(canvas, state.report, { bars: state.bars, hoverIndex: i });
    const h = priceGeom.hover;
    if (!h) return;
    const cur = state.report.currency;
    tip.innerHTML = `<b>${fmtDate(h.t)}</b><br>`
      + `O ${money(h.o, cur)} H ${money(h.h, cur)}<br>L ${money(h.l, cur)} <b>C ${money(h.c, cur)}</b><br>`
      + `Vol ${compact(h.v)}`;
    tip.classList.add('on');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = clamp(h.x + 14, 4, rect.width - tw - 4) + 'px';
    tip.style.top = clamp(h.y - th - 12, 4, rect.height - th - 4) + 'px';
  };
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('touchmove', (e) => { move(e); }, { passive: true });
  canvas.addEventListener('mouseleave', () => {
    state.hoverIndex = null; tip.classList.remove('on');
    if (state.report) priceGeom = drawPriceChart(canvas, state.report, { bars: state.bars, hoverIndex: null });
  });
}

function renderStudyTable() {
  const r = state.report;
  if (!r?.study.horizon20) return '<p class="small muted">No study available.</p>';
  const rows = r.study.horizon20.map((d) => `<tr${d.decile === r.study.currentDecile ? ' style="background:var(--surface-2)"' : ''}>
    <td class="mono">${d.decile * 10}–${d.decile * 10 + 10}%${d.decile === r.study.currentDecile ? ' <span class="badge gold">now</span>' : ''}</td>
    <td class="num">${d.n || '—'}</td>
    <td class="num ${isFinite(d.median) ? (d.median >= 0 ? 'up' : 'down') : ''}">${isFinite(d.median) ? pct(d.median, 1) : '—'}</td>
    <td class="num">${isFinite(d.positive) ? d.positive.toFixed(0) + '%' : '—'}</td>
    <td class="num">${isFinite(d.best) ? pct(d.best, 0) : '—'}</td>
    <td class="num">${isFinite(d.worst) ? pct(d.worst, 0) : '—'}</td>
  </tr>`).join('');
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>Decile of its 1-year range</th><th class="num">Samples</th><th class="num">Median next 20</th>
    <th class="num">Positive</th><th class="num">Best</th><th class="num">Worst</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

/* ---------- render: portfolio ---------- */

function renderPortfolio() {
  const snap = snapshot(state.report ? { [state.report.symbol]: state.report.price } : {});
  const st = tradeStats();
  const ts = getTradeSettings();

  $('#auto-btn').textContent = `Autopilot: ${ts.autopilot ? 'on' : 'off'}`;
  $('#auto-btn').classList.toggle('on', ts.autopilot);

  const retCls = snap.totalReturnPct >= 0 ? 'up' : 'down';
  $('#pf-tiles').innerHTML = [
    tile('Equity', `<span class="${retCls}">${money(snap.equity)}</span>`, `from ${money(snap.startCash)}`),
    tile('Total return', `<span class="${retCls}">${pct(snap.totalReturnPct, 2)}</span>`, `${money(snap.totalReturn)}`),
    tile('Cash', money(snap.cash), `${pctPlain(100 - snap.exposurePct, 0)} uninvested`),
    tile('Open positions', String(snap.positions.length), `${money(snap.invested)} at work`),
    tile('Realised P&L', `<span class="${snap.realized >= 0 ? 'up' : 'down'}">${money(snap.realized)}</span>`, `${st.closed} closed trade${st.closed === 1 ? '' : 's'}`),
    tile('Unrealised', `<span class="${snap.unrealised >= 0 ? 'up' : 'down'}">${money(snap.unrealised)}</span>`, 'open positions'),
    tile('Win rate', isFinite(st.winRate) ? pctPlain(st.winRate, 0) : '—', st.closed ? `${st.wins}W / ${st.losses}L` : 'no closed trades yet'),
    tile('Profit factor', isFinite(st.profitFactor) ? (st.profitFactor === Infinity ? '∞' : num(st.profitFactor, 2)) : '—', 'gross win / gross loss'),
  ].join('');

  $('#pf-positions').innerHTML = snap.positions.length ? `<table>
    <thead><tr><th>Symbol</th><th class="num">Shares</th><th class="num">Avg cost</th><th class="num">Last</th>
    <th class="num">Value</th><th class="num">P&L</th><th class="num">Held</th><th></th></tr></thead>
    <tbody>${snap.positions.map((p) => `<tr>
      <td class="mono"><b>${esc(p.symbol)}</b>${p.stale ? ' <span class="badge warn" title="no fresh price — marked at cost">stale</span>' : ''}</td>
      <td class="num">${p.shares}</td>
      <td class="num">${money(p.avgCost)}</td>
      <td class="num">${money(p.lastPrice)}</td>
      <td class="num">${money(p.value)}</td>
      <td class="num ${p.unrealised >= 0 ? 'up' : 'down'}">${money(p.unrealised)}<br><span class="tiny">${pct(p.unrealisedPct, 1)}</span></td>
      <td class="num">${p.heldDays}d</td>
      <td class="num"><button class="btn sm" data-analyze="${esc(p.symbol)}">Analyze</button>
        <button class="btn sm danger" data-close="${esc(p.symbol)}">Close</button></td>
    </tr>`).join('')}</tbody></table>`
    : '<p class="empty small">No open positions. Analyse something and let the AI trade it, or use the buy box above.</p>';

  $$('#pf-positions [data-analyze]').forEach((b) => b.addEventListener('click', () => { $('#q').value = b.dataset.analyze; run(b.dataset.analyze); }));
  $$('#pf-positions [data-close]').forEach((b) => b.addEventListener('click', async () => {
    const sym = b.dataset.close;
    const pos = snap.positions.find((p) => p.symbol === sym);
    try {
      const q = await fetchLastPrice(sym);
      sell(sym, pos.shares, q.price, { reason: 'closed by hand', by: 'user' });
      toast(`Closed ${pos.shares} ${sym} at ${money(q.price)}.`, 'ok');
      renderPortfolio();
    } catch (e) { toast(`Could not price ${sym}: ${esc(e.message)}`, 'err'); }
  }));

  const trades = snap.trades.slice(0, 60);
  $('#pf-trades').innerHTML = trades.length ? `<table>
    <thead><tr><th>When</th><th>Side</th><th>Symbol</th><th class="num">Shares</th><th class="num">Price</th>
    <th class="num">Value</th><th class="num">Realised</th><th>Why</th></tr></thead>
    <tbody>${trades.map((t) => `<tr>
      <td class="tiny">${fmtDateTime(t.t)}</td>
      <td><span class="badge ${t.side === 'BUY' ? 'good' : 'bad'}">${t.side}</span></td>
      <td class="mono">${esc(t.symbol)}</td>
      <td class="num">${t.shares}</td>
      <td class="num">${money(t.price)}</td>
      <td class="num">${money(t.value)}</td>
      <td class="num ${isFinite(t.realised) ? (t.realised >= 0 ? 'up' : 'down') : 'muted'}">${isFinite(t.realised) ? money(t.realised) : '—'}</td>
      <td class="small">${esc(t.reason || '')}${t.verdict ? `<br><span class="tiny muted">${esc(t.verdict)}${t.conviction != null ? ` · conviction ${t.conviction}` : ''}${t.by ? ` · ${esc(t.by)}` : ''}</span>` : ''}</td>
    </tr>`).join('')}</tbody></table>`
    : '<p class="empty small">No trades yet.</p>';

  if ($('#p-portfolio').classList.contains('on')) {
    const pf = getPortfolio();
    drawEquityCurve($('#equity-canvas'), pf.equityCurve, pf.startCash);
  }
}

/* ---------- render: learning ---------- */

function renderLearning() {
  const s = learnStats();
  const rel = factorReliability();
  const w = getWeights();

  $('#learn-tiles').innerHTML = [
    tile('Calls made', String(s.total), `${s.scored} scored · ${s.open} still open`),
    tile('Hit rate', isFinite(s.hitRate) ? pctPlain(s.hitRate, 0) : '—', 'of matured calls'),
    tile('Average move after a call', isFinite(s.avgReturn) ? pct(s.avgReturn, 1) : '—', 'over the call horizon'),
    tile('Ready to score', String(s.due), s.due ? 'press Score matured calls' : 'nothing due yet'),
  ].join('');

  $('#learn-lessons').innerHTML = s.lessons.length
    ? `<div class="lbl">Lessons it has drawn</div><ul class="bullets">${s.lessons.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
    : `<p class="small muted">Nothing learned yet. Analyse a few names; once a call's horizon has passed,
       press <b>Score matured calls</b> and the weights start moving.</p>`;

  const relRows = Object.values(rel).map((f) => `<tr>
    <td class="small">${esc(f.label)}</td>
    <td class="num">${f.n || '—'}</td>
    <td class="num">${isFinite(f.hitRate) ? (f.hitRate * 100).toFixed(0) + '%' : '—'}</td>
    <td class="num ${isFinite(f.edge) ? (f.edge >= 0 ? 'up' : 'down') : ''}">${isFinite(f.edge) ? pct(f.edge, 1) : '—'}</td>
    <td class="num"><b>${num(w[f.key], 2)}×</b></td>
  </tr>`).join('');
  $('#learn-factors').innerHTML = `<table>
    <thead><tr><th>Signal</th><th class="num">Calls</th><th class="num">Right</th><th class="num">Avg edge</th><th class="num">Weight</th></tr></thead>
    <tbody>${relRows}</tbody></table>
    <p class="tiny muted" style="margin-top:8px">"Avg edge" is the average move in the direction the signal pointed.
    A signal needs 5 opinionated calls before its weight moves at all, and 12 before it moves fully.</p>`;

  const cal = s.calibration.filter((c) => c.n > 0);
  $('#learn-calib').innerHTML = cal.length ? `<table>
    <thead><tr><th>Claimed conviction</th><th class="num">Calls</th><th class="num">Actually right</th></tr></thead>
    <tbody>${cal.map((c) => `<tr><td class="mono">${c.label}</td><td class="num">${c.n}</td>
      <td class="num">${isFinite(c.hitRate) ? c.hitRate.toFixed(0) + '%' : '—'}</td></tr>`).join('')}</tbody></table>`
    : '<p class="small muted">No matured calls yet.</p>';

  const preds = allPredictions().slice(0, 80);
  $('#learn-preds').innerHTML = preds.length ? `<table>
    <thead><tr><th>When</th><th>Symbol</th><th>Call</th><th class="num">Conv.</th><th class="num">At</th>
    <th class="num">Now / then</th><th class="num">Move</th><th>Result</th><th>By</th></tr></thead>
    <tbody>${preds.map((p) => `<tr>
      <td class="tiny">${fmtDate(p.t)}</td>
      <td class="mono">${esc(p.symbol)}</td>
      <td><span class="badge ${p.simple === 'BUY' ? 'good' : p.simple === 'SELL' ? 'bad' : ''}">${esc(p.verdict)}</span></td>
      <td class="num">${p.conviction}</td>
      <td class="num">${money(p.price)}</td>
      <td class="num">${p.outcome ? money(p.outcome.priceNow) : '—'}</td>
      <td class="num ${p.outcome ? (p.outcome.retPct >= 0 ? 'up' : 'down') : ''}">${p.outcome ? pct(p.outcome.retPct, 1) : '—'}</td>
      <td class="small">${p.outcome
        ? `<span class="badge ${p.outcome.correct ? 'good' : 'bad'}">${p.outcome.correct ? 'right' : 'wrong'}</span>
           <span class="tiny muted">${esc(p.outcome.note)}</span>`
        : `<span class="tiny muted">open · ${p.horizonDays}-session horizon</span>`}</td>
      <td class="tiny muted">${esc(p.source)}${p.model ? `<br>${esc(p.model)}` : ''}</td>
    </tr>`).join('')}</tbody></table>`
    : '<p class="empty small">No calls recorded yet.</p>';
}

/* ---------- settings ---------- */

function openSettings() {
  const ai = getAiSettings(), ts = getTradeSettings(), ds = getDataSettings();

  const sel = $('#s-provider');
  sel.replaceChildren(...Object.values(PROVIDERS).map((p) =>
    el('option', { value: p.id, selected: p.id === ai.provider ? '' : null },
      `${p.label}${p.free ? ' · free' : ''}`)));
  sel.value = ai.provider;

  $('#s-model').value = ai.model || '';
  $('#s-budget').value = ai.dailyBudget;
  $('#s-cash').value = ts.startCash;
  $('#s-risk').value = ts.riskPct;
  $('#s-cap').value = ts.maxPosPct;
  $('#s-slip').value = ts.slippageBps;
  $('#s-source').value = ds.preferredSource;
  $('#s-av').value = ds.alphaVantageKey;
  $('#s-td').value = ds.twelveDataKey;
  $('#s-fmp').value = ds.fmpKey;
  $('#s-poly').value = ds.polygonKey;
  $('#s-proxy').value = ds.customProxy;
  $('#s-cvd').checked = load('ui.cvdSafe', false);

  syncProviderFields();
  $('#settings-modal').classList.add('on');
}

function syncProviderFields() {
  const id = $('#s-provider').value;
  const p = PROVIDERS[id];
  const ai = getAiSettings();
  $('#s-provider-note').innerHTML = `${esc(p.note)} <a href="${esc(p.signup)}" target="_blank" rel="noopener">${p.needsKey ? 'Get a key ↗' : 'About ↗'}</a>`;
  $('#model-list').replaceChildren(...p.models.map((m) => el('option', { value: m })));
  $('#s-model').placeholder = p.defaultModel;
  $('#s-key-field').hidden = !p.needsKey;
  if (p.needsKey) {
    $('#s-key').value = ai[p.keyField] || '';
    $('#s-key-note').innerHTML = `Stored in this browser only, sent only to ${esc(p.label.split(' (')[0])}. `
      + `<a href="${esc(p.signup)}" target="_blank" rel="noopener">Get one ↗</a>`;
  }
}

function saveSettings() {
  const id = $('#s-provider').value;
  const p = PROVIDERS[id];
  const patch = {
    provider: id,
    model: $('#s-model').value.trim(),
    dailyBudget: clamp(parseInt($('#s-budget').value, 10) || 60, 1, 500),
  };
  if (p.needsKey) patch[p.keyField] = $('#s-key').value.trim();
  setAiSettings(patch);

  setTradeSettings({
    startCash: Math.max(100, Number($('#s-cash').value) || 100000),
    riskPct: clamp(Number($('#s-risk').value) || 1.5, 0.1, 20),
    maxPosPct: clamp(Number($('#s-cap').value) || 20, 1, 100),
    slippageBps: clamp(Number($('#s-slip').value) || 0, 0, 200),
  });

  setDataSettings({
    preferredSource: $('#s-source').value,
    alphaVantageKey: $('#s-av').value.trim(),
    twelveDataKey: $('#s-td').value.trim(),
    fmpKey: $('#s-fmp').value.trim(),
    polygonKey: $('#s-poly').value.trim(),
    customProxy: $('#s-proxy').value.trim(),
  });

  save('ui.cvdSafe', $('#s-cvd').checked);
  updateCredits();
  redrawCharts();
  $('#settings-modal').classList.remove('on');
  toast('Settings saved.', 'ok');
}

/* ---------- diagnostics ---------- */

function diagTable(rows, firstCol) {
  return `<div class="tbl-wrap"><table>
    <thead><tr><th>${firstCol}</th><th>Status</th><th class="num">ms</th><th>Detail</th></tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td class="small"><b>${esc(r.source || r.relay || r.provider)}</b></td>
      <td><span class="badge ${r.status === 'ok' ? 'good' : r.status === 'fail' ? 'bad' : ''}">${esc(r.status)}</span></td>
      <td class="num">${r.ms ?? '—'}</td>
      <td class="small muted">${esc(r.detail || '')}${r.via && r.via !== 'direct' ? ` <span class="badge">via ${esc(r.via)}</span>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

async function runDiag(kind) {
  const out = $('#diag-out');
  out.innerHTML = `<p class="small"><span class="spin"></span> Testing…</p>`;
  try {
    if (kind === 'data') {
      const rows = await testSources($('#q').value.trim().toUpperCase() || 'AAPL');
      out.innerHTML = `<div class="lbl">Market data sources</div>${diagTable(rows, 'Source')}
        <p class="small muted" style="margin-top:8px">One working source is all you need. If every keyless source fails,
        set your own relay in Settings or add a free API key — those go direct and skip relays entirely.</p>`;
    } else if (kind === 'relays') {
      const rows = await testRelays();
      out.innerHTML = `<div class="lbl">CORS relays (tested against Yahoo)</div>${diagTable(rows, 'Relay')}
        <p class="small muted" style="margin-top:8px">Public relays are rate-limited and come and go. The app remembers
        whichever one worked last and tries it first.</p>`;
    } else {
      const rows = await testProviders();
      out.innerHTML = `<div class="lbl">AI providers</div>${diagTable(rows, 'Provider')}
        <p class="small muted" style="margin-top:8px">Each test spends one call on your daily budget only if it succeeds
        through the normal path; these pings bypass the budget.</p>`;
      updateCredits();
    }
  } catch (e) {
    out.innerHTML = `<p class="small">Test failed: ${esc(e.message)}</p>`;
  }
}

/* ---------- export / import ---------- */

function exportAll() {
  const blob = new Blob([JSON.stringify({
    app: 'stock-ai-analyzer', version: 1, exportedAt: new Date().toISOString(),
    ...exportState(), ...exportLearning(),
    ui: { watch: getWatch(), theme: load('ui.theme', 'auto') },
    aiSettings: getAiSettings(), dataSettings: getDataSettings(),
  }, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `stock-ai-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  toast('Exported.', 'ok');
}

async function importAll(file) {
  try {
    const obj = JSON.parse(await file.text());
    if (obj.portfolio) importPortfolio(obj);
    if (obj.learning) importLearning(obj);
    if (obj.ui?.watch) save('ui.watch', obj.ui.watch);
    if (obj.aiSettings) setAiSettings(obj.aiSettings);
    if (obj.dataSettings) setDataSettings(obj.dataSettings);
    renderWatch(); renderPortfolio(); renderLearning(); updateCredits();
    toast('Imported.', 'ok');
  } catch (e) { toast(`Import failed: ${esc(e.message)}`, 'err'); }
}

/* ---------- autocomplete ---------- */

let acTimer = null, acRows = [], acSel = -1;

function wireSearch() {
  const q = $('#q'), ac = $('#ac');

  q.addEventListener('input', () => {
    clearTimeout(acTimer);
    const v = q.value.trim();
    if (v.length < 1) { ac.hidden = true; return; }
    const local = [...new Set([...getWatch(), ...cachedSymbols()])]
      .filter((s) => s.startsWith(v.toUpperCase()))
      .map((s) => ({ symbol: s, name: 'recent', exchange: '' }));
    if (local.length) paintAc(local);
    acTimer = setTimeout(async () => {
      const remote = await searchSymbols(v);
      if (remote.length) paintAc(remote);
    }, 320);
  });

  q.addEventListener('keydown', (e) => {
    if (!ac.hidden && acRows.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); acSel = Math.min(acRows.length - 1, acSel + 1); paintAc(acRows, true); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); acSel = Math.max(0, acSel - 1); paintAc(acRows, true); return; }
      if (e.key === 'Enter' && acSel >= 0) { e.preventDefault(); pick(acRows[acSel].symbol); return; }
      if (e.key === 'Escape') { ac.hidden = true; return; }
    }
    if (e.key === 'Enter') run();
  });

  function paintAc(rows, keepSel = false) {
    acRows = rows.slice(0, 8);
    if (!keepSel) acSel = -1;
    ac.replaceChildren(...acRows.map((r, i) => {
      const d = el('div', { class: i === acSel ? 'sel' : '' },
        el('b', { text: r.symbol }), el('span', { text: `${r.name}${r.exchange ? ' · ' + r.exchange : ''}` }));
      d.addEventListener('mousedown', (e) => { e.preventDefault(); pick(r.symbol); });
      return d;
    }));
    ac.hidden = !acRows.length;
  }

  function pick(sym) { q.value = sym; ac.hidden = true; run(sym); }

  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) ac.hidden = true; });
}

/* ---------- boot ---------- */

function wire() {
  $('#go').addEventListener('click', () => run());
  $$('nav.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

  $('#theme').addEventListener('click', () => {
    const order = ['auto', 'dark', 'light'];
    const next = order[(order.indexOf(load('ui.theme', 'auto')) + 1) % order.length];
    applyTheme(next);
    toast(`Theme: ${next}`, 'info', 1800);
  });

  $('#settings-btn').addEventListener('click', openSettings);
  $('#close-settings').addEventListener('click', () => $('#settings-modal').classList.remove('on'));
  $('#settings-modal').addEventListener('click', (e) => { if (e.target.id === 'settings-modal') $('#settings-modal').classList.remove('on'); });
  $('#s-provider').addEventListener('change', syncProviderFields);
  $('#save-settings').addEventListener('click', saveSettings);
  $('#reset-credits').addEventListener('click', () => { resetCredits(); updateCredits(); toast("Today's AI count reset.", 'ok'); });

  $$('#range-btns button').forEach((b) => b.addEventListener('click', () => {
    $$('#range-btns button').forEach((x) => x.classList.toggle('on', x === b));
    state.bars = parseInt(b.dataset.bars, 10);
    redrawCharts();
  }));

  $('#study-table-btn').addEventListener('click', () => {
    const box = $('#study-table');
    box.hidden = !box.hidden;
    $('#study-table-btn').textContent = box.hidden ? 'Show data table' : 'Hide data table';
    if (!box.hidden) box.innerHTML = renderStudyTable();
  });

  $('#auto-btn').addEventListener('click', () => {
    const on = !getTradeSettings().autopilot;
    setTradeSettings({ autopilot: on });
    renderPortfolio();
    toast(on ? 'Autopilot on — the AI will trade its own calls inside the risk rules.' : 'Autopilot off.', 'info');
  });

  $('#reset-pf').addEventListener('click', () => {
    if (!confirm('Reset the paper portfolio? Trade history goes with it.')) return;
    resetPortfolio(getTradeSettings().startCash);
    renderPortfolio();
    toast('Portfolio reset.', 'ok');
  });

  $('#mark-btn').addEventListener('click', async () => {
    const snap = snapshot();
    if (!snap.positions.length) return toast('No positions to mark.', 'info');
    let ok = 0;
    for (const p of snap.positions) {
      try { const q = await fetchLastPrice(p.symbol); rememberPrice(p.symbol, q.price, q.t); ok++; } catch {}
    }
    recordEquityPoint(); renderPortfolio();
    toast(`Marked ${ok} of ${snap.positions.length} positions to the latest price.`, ok ? 'ok' : 'err');
  });

  const manual = async (side) => {
    const sym = $('#t-sym').value.trim().toUpperCase();
    const shares = parseInt($('#t-shares').value, 10);
    if (!sym || !(shares > 0)) return toast('Need a symbol and a share count.', 'info');
    try {
      const q = await fetchLastPrice(sym);
      const t = side === 'BUY'
        ? buy(sym, shares, q.price, { reason: 'manual', by: 'user' })
        : sell(sym, shares, q.price, { reason: 'manual', by: 'user' });
      toast(`${t.side} ${t.shares} ${t.symbol} @ ${money(t.price)}`, 'ok');
      $('#t-shares').value = '';
      renderPortfolio();
    } catch (e) { toast(esc(e.message), 'err'); }
  };
  $('#t-buy').addEventListener('click', () => manual('BUY'));
  $('#t-sell').addEventListener('click', () => manual('SELL'));

  $('#eval-btn').addEventListener('click', async () => {
    const btn = $('#eval-btn');
    btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
    try {
      const res = await evaluateDue((sym) => fetchLastPrice(sym));
      renderLearning();
      if (state.report) renderAnalysis();
      toast(res.scored
        ? `Scored ${res.scored} call${res.scored === 1 ? '' : 's'}. Weights updated.`
        : 'Nothing matured yet — calls are scored once their horizon has passed.', res.scored ? 'ok' : 'info');
      if (res.failed.length) toast(`Could not price: ${esc(res.failed.join(', '))}`, 'err');
    } catch (e) { toast(esc(e.message), 'err'); }
    finally { btn.disabled = false; btn.textContent = 'Score matured calls'; }
  });

  $('#reset-learn').addEventListener('click', () => {
    if (!confirm('Reset everything it has learned — every recorded call and weight?')) return;
    resetLearning(); renderLearning(); toast('Learning reset. Weights back to default.', 'ok');
  });

  $('#test-data').addEventListener('click', () => runDiag('data'));
  $('#test-relays').addEventListener('click', () => runDiag('relays'));
  $('#test-ai').addEventListener('click', () => runDiag('ai'));

  $('#csv-go').addEventListener('click', () => {
    const sym = $('#csv-sym').value.trim().toUpperCase() || 'PASTED';
    try {
      const hist = ingestCsv(sym, $('#csv-text').value);
      const ts = getTradeSettings();
      const snap = snapshot();
      state.report = analyze(hist, { weightMultipliers: getWeights(), equity: snap.equity, riskPct: ts.riskPct, maxPosPct: ts.maxPosPct });
      state.decision = null; state.aiMeta = null;
      rememberPrice(state.report.symbol, state.report.price);
      showTab('analysis'); $('#analysis-empty').hidden = true; $('#analysis').hidden = false;
      renderAnalysis(); renderChartTab();
      toast(`Analysed ${state.report.dataQuality.bars} pasted bars for ${sym}.`, 'ok');
      runAI(state.report);
    } catch (e) { toast(esc(e.message), 'err', 9000); }
  });

  $('#export-btn').addEventListener('click', exportAll);
  $('#import-btn').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => { if (e.target.files[0]) importAll(e.target.files[0]); });

  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(redrawCharts, 140); });

  wireSearch();
  wirePriceHover();
}

async function boot() {
  applyTheme(load('ui.theme', 'auto'));
  renderWatch();
  updateCredits();
  renderPortfolio();
  renderLearning();
  wire();

  const tab = load('ui.tab', 'analysis');
  if (tab !== 'analysis') showTab(tab);

  /* Quietly score anything that has matured since the last visit — this is the
     loop that makes the fake money mean something. */
  const due = duePredictions();
  if (due.length) {
    try {
      const res = await evaluateDue((sym) => fetchLastPrice(sym));
      if (res.scored) {
        renderLearning();
        toast(`Scored ${res.scored} call${res.scored === 1 ? '' : 's'} that came due. `
          + `<a href="#" id="see-learn" style="color:var(--gold)">See what changed</a>`, 'ok', 9000);
        $('#see-learn')?.addEventListener('click', (e) => { e.preventDefault(); showTab('learning'); });
      }
    } catch { /* offline is fine — they stay pending */ }
  }

  const last = load('ui.lastSymbol', null);
  if (last) $('#q').value = last;
}

window.addEventListener('beforeunload', () => {
  if (state.report) save('ui.lastSymbol', state.report.symbol);
});

boot();
