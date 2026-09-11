/* chart.js — hand-rolled canvas charts. No chart library, no CDN.

   Colour roles come from CSS custom properties so light and dark are one
   definition each. The price line is the subject (gold, heaviest); the moving
   averages are an ordinal one-hue ramp (light = short, dark = long) so they
   read as "the same thing at three lengths" rather than three rival series.
   Value bands and buy zones sit behind everything, recessive on purpose. */

import { clamp, fmtDate } from './util.js';

function palette(canvas) {
  const cs = getComputedStyle(canvas);
  const v = (name, fallback) => (cs.getPropertyValue(name).trim() || fallback);
  return {
    surface: v('--surface', '#0e0e11'),
    grid: v('--grid', 'rgba(255,255,255,.06)'),
    axis: v('--axis', 'rgba(255,255,255,.14)'),
    ink: v('--text-primary', '#ece7db'),
    ink2: v('--text-secondary', '#b8b3a8'),
    ink3: v('--text-muted', '#6e6a61'),
    price: v('--series-price', '#d4b472'),
    ma20: v('--series-ma20', '#9ec5f4'),
    ma50: v('--series-ma50', '#3987e5'),
    ma200: v('--series-ma200', '#1c5cab'),
    good: v('--status-good', '#0ca30c'),
    critical: v('--status-critical', '#d03b3b'),
    warning: v('--status-warning', '#fab219'),
    band: v('--band-fill', 'rgba(201,165,90,.07)'),
    volume: v('--volume-fill', 'rgba(255,255,255,.10)'),
  };
}

function setupCanvas(canvas, height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || canvas.parentElement?.clientWidth || 600;
  const cssH = height || canvas.clientHeight || 320;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  return { ctx, w: cssW, h: cssH };
}

const FONT = '11px "DM Mono", ui-monospace, monospace';

function niceTicks(lo, hi, count = 5) {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
  const first = Math.ceil(lo / step) * step;
  const out = [];
  for (let v = first; v <= hi + step * 0.001; v += step) out.push(+v.toFixed(6));
  return out;
}

/* ---------- price chart ---------- */

export function drawPriceChart(canvas, report, { bars = 252, height = 380, hoverIndex = null } = {}) {
  const p = palette(canvas);
  const { ctx, w, h } = setupCanvas(canvas, height);

  const rows = report.rows.slice(-bars);
  if (rows.length < 2) return null;

  const padL = 8, padR = 62, padT = 14;
  const volH = Math.round(h * 0.14);
  const padB = 22 + volH;
  const plotW = w - padL - padR, plotH = h - padT - padB;

  const lows = rows.map((r) => r.l), highs = rows.map((r) => r.h);
  const zoneLows = report.plan.buyZones.map((z) => z.price).filter(isFinite);
  const loRaw = Math.min(...lows, ...zoneLows, report.plan.stop);
  const hiRaw = Math.max(...highs, ...report.plan.targets.slice(0, 2).map((t) => t.price).filter(isFinite));
  const pad = (hiRaw - loRaw) * 0.06 || 1;
  const lo = loRaw - pad, hi = hiRaw + pad;

  const x = (i) => padL + (i / (rows.length - 1)) * plotW;
  const y = (v) => padT + plotH - ((v - lo) / (hi - lo)) * plotH;

  /* --- background bands: normal range, then the actionable zones --- */
  const [fairLo, fairHi] = report.plan.fairBand;
  if (isFinite(fairLo) && isFinite(fairHi)) {
    ctx.fillStyle = p.band;
    ctx.fillRect(padL, y(fairHi), plotW, Math.max(1, y(fairLo) - y(fairHi)));
    ctx.strokeStyle = p.ink3; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(padL, y(report.typical)); ctx.lineTo(padL + plotW, y(report.typical)); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }

  const hexA = (hex, a) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return hex;
    return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
  };

  /* buy zones — a band from each zone price down a little, labelled at the edge */
  report.plan.buyZones.forEach((z, k) => {
    if (!isFinite(z.price) || z.alloc === 0) return;
    const yy = y(z.price);
    ctx.fillStyle = hexA(p.good, 0.10 - k * 0.025);
    ctx.fillRect(padL, yy, plotW, Math.max(2, y(z.price * 0.985) - yy));
    ctx.strokeStyle = hexA(p.good, 0.55); ctx.lineWidth = 1; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(padL + plotW, yy); ctx.stroke();
    ctx.setLineDash([]);
  });

  /* rich zone above the upper quartile */
  if (isFinite(fairHi)) {
    ctx.fillStyle = hexA(p.critical, 0.07);
    ctx.fillRect(padL, padT, plotW, Math.max(0, y(report.ranges.y1.p90) - padT));
  }

  /* --- grid + price axis --- */
  ctx.font = FONT; ctx.textBaseline = 'middle';
  for (const t of niceTicks(lo, hi, 5)) {
    const yy = y(t);
    ctx.strokeStyle = p.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, yy + 0.5); ctx.lineTo(padL + plotW, yy + 0.5); ctx.stroke();
    ctx.fillStyle = p.ink3; ctx.textAlign = 'left';
    ctx.fillText(t.toFixed(t < 10 ? 2 : t < 1000 ? 1 : 0), padL + plotW + 6, yy);
  }

  /* --- volume strip --- */
  const volTop = padT + plotH + 16;
  const maxVol = Math.max(...rows.map((r) => r.v || 0)) || 1;
  const bw = Math.max(1, plotW / rows.length * 0.7);
  rows.forEach((r, i) => {
    const vh = ((r.v || 0) / maxVol) * volH;
    ctx.fillStyle = i > 0 && r.c >= rows[i - 1].c ? hexA(p.good, 0.32) : hexA(p.critical, 0.32);
    ctx.fillRect(x(i) - bw / 2, volTop + volH - vh, bw, vh);
  });

  /* --- moving averages: ordinal ramp, thin, behind the price --- */
  const maSeries = [
    { field: 'sma20', color: p.ma20, label: '20d', dash: [4, 3] },
    { field: 'sma50', color: p.ma50, label: '50d', dash: [] },
    { field: 'sma200', color: p.ma200, label: '200d', dash: [] },
  ];
  const window = report.rows.length - rows.length;
  const maAt = (field, i) => {
    const period = field === 'sma20' ? 20 : field === 'sma50' ? 50 : 200;
    const abs = window + i;
    if (abs < period - 1) return NaN;
    let s = 0;
    for (let k = abs - period + 1; k <= abs; k++) s += report.rows[k].c;
    return s / period;
  };

  /* A long average early in a window can sit far below everything visible, so
     the lines are clipped to the plot rather than allowed to run through the
     volume strip. */
  const maLabels = [];
  ctx.save();
  ctx.beginPath(); ctx.rect(padL, padT, plotW, plotH); ctx.clip();
  for (const ma of maSeries) {
    ctx.strokeStyle = ma.color; ctx.lineWidth = 1.5; ctx.setLineDash(ma.dash);
    ctx.beginPath();
    let started = false, lastY = null;
    rows.forEach((_, i) => {
      const v = maAt(ma.field, i);
      if (!isFinite(v)) return;
      if (!started) { ctx.moveTo(x(i), y(v)); started = true; } else ctx.lineTo(x(i), y(v));
      lastY = y(v);
    });
    if (started) ctx.stroke();
    ctx.setLineDash([]);
    if (lastY !== null && lastY >= padT - 20 && lastY <= padT + plotH + 20) {
      maLabels.push({ label: ma.label, color: ma.color, y: clamp(lastY, padT + 6, padT + plotH - 6) });
    }
  }
  ctx.restore();

  /* Nudge colliding end-labels apart so "50d" never lands on top of "200d". */
  maLabels.sort((a, b) => a.y - b.y);
  const MIN_GAP = 12;
  for (let k = 1; k < maLabels.length; k++) {
    if (maLabels[k].y - maLabels[k - 1].y < MIN_GAP) maLabels[k].y = maLabels[k - 1].y + MIN_GAP;
  }
  ctx.font = '10px "DM Mono", monospace'; ctx.textAlign = 'left';
  for (const l of maLabels) {
    ctx.fillStyle = l.color;
    ctx.fillText(l.label, padL + plotW + 6, clamp(l.y, padT + 6, padT + plotH - 2));
  }
  ctx.font = FONT;

  /* --- the price line: the subject, heaviest mark on the canvas --- */
  ctx.strokeStyle = p.price; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath();
  rows.forEach((r, i) => (i ? ctx.lineTo(x(i), y(r.c)) : ctx.moveTo(x(i), y(r.c))));
  ctx.stroke();

  /* soft fill under the price for weight */
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, hexA(p.price, 0.16));
  grad.addColorStop(1, hexA(p.price, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  rows.forEach((r, i) => (i ? ctx.lineTo(x(i), y(r.c)) : ctx.moveTo(x(i), y(r.c))));
  ctx.lineTo(x(rows.length - 1), padT + plotH); ctx.lineTo(x(0), padT + plotH); ctx.closePath(); ctx.fill();

  /* last price marker + label */
  const lastX = x(rows.length - 1), lastY2 = y(rows[rows.length - 1].c);
  ctx.fillStyle = p.surface; ctx.beginPath(); ctx.arc(lastX, lastY2, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.price; ctx.beginPath(); ctx.arc(lastX, lastY2, 3, 0, Math.PI * 2); ctx.fill();
  const lbl = report.price.toFixed(report.price < 10 ? 2 : 2);
  ctx.font = 'bold 11px "DM Mono", monospace';
  const lw = ctx.measureText(lbl).width + 10;
  ctx.fillStyle = p.price;
  ctx.fillRect(padL + plotW + 3, lastY2 - 8, Math.min(lw, padR - 6), 16);
  ctx.fillStyle = p.surface; ctx.textAlign = 'left';
  ctx.fillText(lbl, padL + plotW + 8, lastY2);
  ctx.font = FONT;

  /* --- date axis --- */
  ctx.fillStyle = p.ink3; ctx.textAlign = 'center';
  const stepI = Math.max(1, Math.floor(rows.length / 5));
  for (let i = 0; i < rows.length; i += stepI) {
    const d = new Date(rows[i].t);
    ctx.fillText(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), x(i), h - 6);
  }

  /* --- crosshair --- */
  let hover = null;
  if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < rows.length) {
    const i = hoverIndex, r = rows[i];
    ctx.strokeStyle = p.axis; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x(i), padT); ctx.lineTo(x(i), padT + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padL, y(r.c)); ctx.lineTo(padL + plotW, y(r.c)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = p.surface; ctx.beginPath(); ctx.arc(x(i), y(r.c), 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.price; ctx.beginPath(); ctx.arc(x(i), y(r.c), 3.5, 0, Math.PI * 2); ctx.fill();
    hover = { t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v, x: x(i), y: y(r.c) };
  }

  return { xToIndex: (px) => Math.round(clamp((px - padL) / plotW, 0, 1) * (rows.length - 1)), rows, hover, geom: { padL, plotW, padT, plotH } };
}

/* ---------- equity curve ---------- */

export function drawEquityCurve(canvas, curve, startCash, { height = 190 } = {}) {
  const p = palette(canvas);
  const { ctx, w, h } = setupCanvas(canvas, height);
  if (!curve || curve.length < 2) {
    ctx.fillStyle = p.ink3; ctx.font = FONT; ctx.textAlign = 'center';
    ctx.fillText('No equity history yet — make a paper trade.', w / 2, h / 2);
    return;
  }
  const padL = 8, padR = 58, padT = 12, padB = 20;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const vals = curve.map((c) => c.equity).concat([startCash]);
  const lo = Math.min(...vals) * 0.998, hi = Math.max(...vals) * 1.002;
  const x = (i) => padL + (i / (curve.length - 1)) * plotW;
  const y = (v) => padT + plotH - ((v - lo) / (hi - lo || 1)) * plotH;

  ctx.font = FONT; ctx.textBaseline = 'middle';
  for (const t of niceTicks(lo, hi, 4)) {
    ctx.strokeStyle = p.grid; ctx.beginPath();
    ctx.moveTo(padL, y(t) + 0.5); ctx.lineTo(padL + plotW, y(t) + 0.5); ctx.stroke();
    ctx.fillStyle = p.ink3; ctx.textAlign = 'left';
    ctx.fillText((t / 1000).toFixed(1) + 'k', padL + plotW + 6, y(t));
  }

  /* the line that matters: did the AI beat its own starting balance */
  ctx.strokeStyle = p.ink3; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, y(startCash)); ctx.lineTo(padL + plotW, y(startCash)); ctx.stroke();
  ctx.setLineDash([]);

  const up = curve[curve.length - 1].equity >= startCash;
  const col = up ? p.good : p.critical;
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
  curve.forEach((c, i) => (i ? ctx.lineTo(x(i), y(c.equity)) : ctx.moveTo(x(i), y(c.equity))));
  ctx.stroke();

  ctx.fillStyle = p.ink3; ctx.textAlign = 'left';
  ctx.fillText(fmtDate(curve[0].t), padL, h - 6);
  ctx.textAlign = 'right';
  ctx.fillText(fmtDate(curve[curve.length - 1].t), padL + plotW, h - 6);
}

/* ---------- forward-return study by decile ---------- */

export function drawStudy(canvas, study, currentDecile, { height = 200, horizon = 20 } = {}) {
  const p = palette(canvas);
  const { ctx, w, h } = setupCanvas(canvas, height);
  if (!study) {
    ctx.fillStyle = p.ink3; ctx.font = FONT; ctx.textAlign = 'center';
    ctx.fillText('Not enough history for a forward-return study.', w / 2, h / 2);
    return;
  }
  const rows = study.filter((d) => d.n > 0);
  if (!rows.length) return;

  const padL = 30, padR = 10, padT = 30, padB = 30;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const maxAbs = Math.max(...rows.map((d) => Math.abs(d.median)), 1) * 1.15;
  const zeroY = padT + plotH / 2;
  const barW = Math.min(46, (plotW / study.length) - 6);

  ctx.font = FONT; ctx.textBaseline = 'middle';
  ctx.strokeStyle = p.axis; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, zeroY + 0.5); ctx.lineTo(padL + plotW, zeroY + 0.5); ctx.stroke();
  ctx.fillStyle = p.ink3; ctx.textAlign = 'right';
  ctx.fillText('0%', padL - 6, zeroY);
  ctx.fillText(`+${maxAbs.toFixed(0)}%`, padL - 6, padT + 6);
  ctx.fillText(`-${maxAbs.toFixed(0)}%`, padL - 6, padT + plotH - 6);

  study.forEach((d, i) => {
    const cx = padL + (i + 0.5) * (plotW / study.length);
    if (!d.n) {
      ctx.fillStyle = p.ink3; ctx.textAlign = 'center'; ctx.globalAlpha = 0.45;
      ctx.fillText('·', cx, zeroY);
      ctx.globalAlpha = 1;
    } else {
      const barH = (Math.abs(d.median) / maxAbs) * (plotH / 2);
      const top = d.median >= 0 ? zeroY - barH : zeroY;
      ctx.fillStyle = d.median >= 0 ? p.good : p.critical;
      /* 4px rounded data-end, square against the baseline */
      const r = Math.min(4, barH);
      ctx.beginPath();
      if (d.median >= 0) {
        ctx.moveTo(cx - barW / 2, zeroY);
        ctx.lineTo(cx - barW / 2, top + r);
        ctx.quadraticCurveTo(cx - barW / 2, top, cx - barW / 2 + r, top);
        ctx.lineTo(cx + barW / 2 - r, top);
        ctx.quadraticCurveTo(cx + barW / 2, top, cx + barW / 2, top + r);
        ctx.lineTo(cx + barW / 2, zeroY);
      } else {
        ctx.moveTo(cx - barW / 2, zeroY);
        ctx.lineTo(cx - barW / 2, zeroY + barH - r);
        ctx.quadraticCurveTo(cx - barW / 2, zeroY + barH, cx - barW / 2 + r, zeroY + barH);
        ctx.lineTo(cx + barW / 2 - r, zeroY + barH);
        ctx.quadraticCurveTo(cx + barW / 2, zeroY + barH, cx + barW / 2, zeroY + barH - r);
        ctx.lineTo(cx + barW / 2, zeroY);
      }
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = p.ink2; ctx.textAlign = 'center'; ctx.font = '10px "DM Mono", monospace';
      ctx.fillText(`${d.median >= 0 ? '+' : ''}${d.median.toFixed(1)}`,
        cx, d.median >= 0 ? top - 8 : zeroY + barH + 8);
      ctx.font = FONT;
    }

    /* where the stock is right now gets a surface ring, not a different hue */
    if (i === currentDecile) {
      ctx.strokeStyle = p.price; ctx.lineWidth = 2;
      ctx.strokeRect(cx - barW / 2 - 3, padT - 2, barW + 6, plotH + 4);
      ctx.fillStyle = p.price; ctx.textAlign = 'center'; ctx.font = 'bold 9px "DM Mono", monospace';
      ctx.fillText('NOW', cx, padT + 8);
      ctx.font = FONT;
    }

    ctx.fillStyle = i === currentDecile ? p.price : p.ink3;
    ctx.textAlign = 'center'; ctx.font = '9px "DM Mono", monospace';
    ctx.fillText(`${d.decile * 10}`, cx, h - 16);
    if (d.n) ctx.fillText(`n=${d.n}`, cx, h - 5);
    ctx.font = FONT;
  });

  ctx.fillStyle = p.ink3; ctx.textAlign = 'left'; ctx.font = '10px "DM Mono", monospace';
  ctx.fillText(`median % move over the next ${horizon} sessions, by decile of its own 1-year range`, padL, 10);
}

/* ---------- factor contribution bars ---------- */

export function drawFactors(canvas, factors, { height = null, cvdSafe = false } = {}) {
  const p = palette(canvas);
  const rowH = 22;
  const H = height || factors.length * rowH + 26;
  const { ctx, w, h } = setupCanvas(canvas, H);
  const padL = 4, padR = 4, labelW = clamp(w * 0.34, 120, 290);
  const plotW = w - padL - padR - labelW - 44;
  const cx = padL + labelW + plotW / 2;

  const pos = cvdSafe ? p.ma50 : p.good;
  const neg = cvdSafe ? p.warning : p.critical;

  ctx.font = FONT; ctx.textBaseline = 'middle';
  ctx.strokeStyle = p.axis; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx + 0.5, 14); ctx.lineTo(cx + 0.5, h - 6); ctx.stroke();

  factors.forEach((f, i) => {
    const yy = 20 + i * rowH;
    ctx.fillStyle = p.ink2; ctx.textAlign = 'left';
    const maxChars = Math.floor(labelW / 6.1);
    ctx.fillText(f.label.length > maxChars ? f.label.slice(0, maxChars - 1) + '…' : f.label, padL, yy);

    const bw = (Math.abs(f.score) / 1) * (plotW / 2);
    ctx.fillStyle = f.score >= 0 ? pos : neg;
    const bh = 9;
    const bx = f.score >= 0 ? cx : cx - bw;
    ctx.beginPath();
    const r = Math.min(4, bw);
    if (f.score >= 0) {
      ctx.moveTo(bx, yy - bh / 2); ctx.lineTo(bx + bw - r, yy - bh / 2);
      ctx.quadraticCurveTo(bx + bw, yy - bh / 2, bx + bw, yy - bh / 2 + r);
      ctx.lineTo(bx + bw, yy + bh / 2 - r);
      ctx.quadraticCurveTo(bx + bw, yy + bh / 2, bx + bw - r, yy + bh / 2);
      ctx.lineTo(bx, yy + bh / 2);
    } else {
      ctx.moveTo(bx + bw, yy - bh / 2); ctx.lineTo(bx + r, yy - bh / 2);
      ctx.quadraticCurveTo(bx, yy - bh / 2, bx, yy - bh / 2 + r);
      ctx.lineTo(bx, yy + bh / 2 - r);
      ctx.quadraticCurveTo(bx, yy + bh / 2, bx + r, yy + bh / 2);
      ctx.lineTo(bx + bw, yy + bh / 2);
    }
    ctx.closePath(); ctx.fill();

    /* the number, in ink — never in the series colour */
    ctx.fillStyle = p.ink2; ctx.textAlign = 'left';
    ctx.fillText(`${f.score >= 0 ? '+' : ''}${f.score.toFixed(2)}`, padL + labelW + plotW + 8, yy);
  });

  ctx.fillStyle = p.ink3; ctx.textAlign = 'center'; ctx.font = '9px "DM Mono", monospace';
  ctx.fillText('bearish  ←  0  →  bullish', cx, 8);
}

export { palette as chartPalette };
