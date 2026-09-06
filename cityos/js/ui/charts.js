// Canvas sparklines and full charts for the history panels.
export function sparkline(canvas, data, opts = {}) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = opts.w || 74, h = opts.h || 24;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  if (!data || data.length < 2) return;
  const n = Math.min(data.length, opts.points || 64);
  const d = data.slice(-n);
  let min = Infinity, max = -Infinity;
  for (const v of d) { if (v < min) min = v; if (v > max) max = v; }
  if (max - min < 1e-9) { min -= 1; max += 1; }
  const pad = 2.5;
  const X = (i) => pad + (i / (n - 1)) * (w - pad * 2);
  const Y = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const col = opts.color || '#35d6ff';
  // area
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, col + '55'); g.addColorStop(1, col + '00');
  c.beginPath(); c.moveTo(X(0), h);
  for (let i = 0; i < n; i++) c.lineTo(X(i), Y(d[i]));
  c.lineTo(X(n - 1), h); c.closePath(); c.fillStyle = g; c.fill();
  c.beginPath();
  for (let i = 0; i < n; i++) (i ? c.lineTo(X(i), Y(d[i])) : c.moveTo(X(i), Y(d[i])));
  c.strokeStyle = col; c.lineWidth = 1.4; c.lineJoin = 'round'; c.stroke();
  c.beginPath(); c.arc(X(n - 1), Y(d[n - 1]), 1.9, 0, 7); c.fillStyle = col; c.fill();
}

export function chart(canvas, series, opts = {}) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = opts.w || canvas.clientWidth || 420, h = opts.h || 190;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = '100%'; canvas.style.height = h + 'px';
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const L = 52, R = 10, T = 12, B = 24;
  const iw = w - L - R, ih = h - T - B;
  let min = Infinity, max = -Infinity, n = 0;
  for (const s of series) { n = Math.max(n, s.data.length); for (const v of s.data) { if (v < min) min = v; if (v > max) max = v; } }
  if (!isFinite(min)) return;
  if (opts.zero) min = Math.min(0, min);
  if (max - min < 1e-9) { max = min + 1; }
  const padR = (max - min) * 0.08; max += padR; min -= padR;
  const X = (i) => L + (n <= 1 ? 0 : (i / (n - 1)) * iw);
  const Y = (v) => T + ih - ((v - min) / (max - min)) * ih;
  // grid
  c.strokeStyle = 'rgba(96,146,196,.13)'; c.lineWidth = 1;
  c.fillStyle = '#68809a'; c.font = '9px ui-monospace,Menlo,monospace'; c.textAlign = 'right';
  for (let g = 0; g <= 4; g++) {
    const v = min + (max - min) * (g / 4);
    const y = Y(v);
    c.beginPath(); c.moveTo(L, y); c.lineTo(w - R, y); c.stroke();
    c.fillText(fmtAxis(v), L - 7, y + 3);
  }
  if (opts.labels && opts.labels.length) {
    c.textAlign = 'center';
    const step = Math.max(1, Math.floor(n / 5));
    for (let i = 0; i < n; i += step) c.fillText(opts.labels[i] || '', X(i), h - 7);
  }
  for (const s of series) {
    const d = s.data;
    if (d.length < 2) continue;
    if (s.fill !== false) {
      const g2 = c.createLinearGradient(0, T, 0, T + ih);
      g2.addColorStop(0, s.color + '3a'); g2.addColorStop(1, s.color + '00');
      c.beginPath(); c.moveTo(X(0), T + ih);
      for (let i = 0; i < d.length; i++) c.lineTo(X(i), Y(d[i]));
      c.lineTo(X(d.length - 1), T + ih); c.closePath(); c.fillStyle = g2; c.fill();
    }
    c.beginPath();
    for (let i = 0; i < d.length; i++) (i ? c.lineTo(X(i), Y(d[i])) : c.moveTo(X(i), Y(d[i])));
    c.strokeStyle = s.color; c.lineWidth = 1.7; c.lineJoin = 'round'; c.stroke();
  }
}

function fmtAxis(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e4) return (v / 1e3).toFixed(0) + 'k';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  if (a >= 10) return v.toFixed(0);
  return v.toFixed(1);
}

export function bars(canvas, items, opts = {}) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = opts.w || canvas.clientWidth || 420, h = opts.h || (items.length * 22 + 10);
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = '100%'; canvas.style.height = h + 'px';
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const max = Math.max(1, ...items.map(i => Math.abs(i.value)));
  const L = opts.labelWidth || 118;
  c.font = '10.5px Inter,system-ui,sans-serif';
  items.forEach((it, i) => {
    const y = 6 + i * 22;
    c.fillStyle = '#7f93aa'; c.textAlign = 'left';
    c.fillText(it.label, 0, y + 11);
    const bw = (Math.abs(it.value) / max) * (w - L - 76);
    c.fillStyle = it.color || '#35d6ff';
    c.globalAlpha = 0.85;
    c.fillRect(L, y + 2, Math.max(1, bw), 11);
    c.globalAlpha = 1;
    c.fillStyle = '#eaf3fb'; c.textAlign = 'right';
    c.fillText(it.text !== undefined ? it.text : it.value, w, y + 11);
  });
}
