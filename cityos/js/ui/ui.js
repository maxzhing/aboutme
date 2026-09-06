// The command-centre HUD: top metric bar, navigation rail, city overview,
// event feed, build toolbar, minimap, overlay picker and the inspector.
import { LAYERS, SPEEDS, ZONE_SPEC, Z, K, GRID, CELL, WORLD, MODES } from '../core/defs.js';
import { fmtNum, fmtPct, fmtMoney, fmtCompact, el, delta } from './format.js';
import { sparkline } from './charts.js';
import { Briefing } from './briefing.js';

// Three places to be, plus the one tool that is worth its own door. Everything
// else lives inside Manage as a tab, or appears in context.
const NAV = [
  { id: 'cityview', label: 'City', ic: '◈', sub: 'Look at it' },
  { id: 'build', label: 'Build', ic: '⚒', sub: 'Change it' },
  { id: 'manage', label: 'Manage', ic: '▤', sub: 'Understand it' },
  { id: 'whatif', label: 'What-If', ic: '🔮', sub: 'Test it first' },
];

export class UI {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('ui');
    this.hist = { pop: [], happy: [], eco: [], budget: [], flow: [], util: [], commute: [] };
    this.build();
  }

  get sim() { return this.app.sim; }

  build() {
    this.root.innerHTML = '';
    this.buildTop();
    this.buildRail();
    this.buildRight();
    this.buildEvents();
    this.buildToolbar();
    this.buildMinimap();
    this.buildInspector();
    this.buildMisc();
  }

  // ------------------------------------------------------------- top bar
  buildTop() {
    const bar = el('div'); bar.id = 'topbar';
    bar.innerHTML = `
      <div class="brand"><h1>CITYOS<sup>®</sup></h1><span id="modelbl">MAYOR MODE</span></div>
      <div id="metrics"></div>
      <div id="clock"><div class="d">—</div><div class="t">—</div></div>
      <div id="speeds"></div>
      <button id="gear" title="Settings & save">⚙</button>`;
    this.root.appendChild(bar);
    this.metricsEl = bar.querySelector('#metrics');
    this.clockEl = bar.querySelector('#clock');

    this.metricDefs = [
      { id: 'budget', ic: '💰', k: 'Budget', color: '#4ade80' },
      { id: 'population', ic: '👥', k: 'Population', color: '#35d6ff' },
      { id: 'happiness', ic: '💛', k: 'Happiness', color: '#f0b345' },
      { id: 'economy', ic: '📈', k: 'Economy', color: '#a78bfa' },
      { id: 'utilities', ic: '⚡', k: 'Utilities', color: '#35d6ff' },
      { id: 'commute', ic: '🚌', k: 'Avg Commute', color: '#fb923c' },
      { id: 'flow', ic: '🚗', k: 'Traffic Flow', color: '#4ade80' },
    ];
    for (const m of this.metricDefs) {
      const e = el('div', 'metric');
      e.innerHTML = `<span class="mi">${m.ic}</span><div><div class="mv"><span class="n">—</span><span class="md fl"></span></div><div class="mk">${m.k}</div></div>`;
      e.title = 'Click for detail';
      e.onclick = () => this.app.openMetric(m.id);
      this.metricsEl.appendChild(e);
      m.el = e; m.n = e.querySelector('.n'); m.d = e.querySelector('.md');
    }

    const sp = bar.querySelector('#speeds');
    const labels = ['❚❚', '1×', '5×', '25×', '100×', '1000×'];
    this.speedBtns = SPEEDS.map((s, i) => {
      const b = el('button', 'sp' + (i === 0 ? ' pause' : ''), labels[i]);
      b.onclick = () => this.app.setSpeed(i);
      sp.appendChild(b);
      return b;
    });
    bar.querySelector('#gear').onclick = () => this.app.modals.open('settings');
  }

  // ------------------------------------------------------------- rail
  buildRail() {
    const rail = el('div'); rail.id = 'rail';
    for (const n of NAV) {
      const b = el('button', 'nav');
      b.innerHTML = `<span class="ic">${n.ic}</span><span class="nl">${n.label}<i>${n.sub}</i></span>`;
      b.onclick = () => this.app.nav(n.id);
      b.dataset.nav = n.id;
      rail.appendChild(b);
    }
    const foot = el('div', 'railfoot');
    foot.innerHTML = `<button data-a="layers"><span class="ic">▤</span><span>Layers</span></button>
      <button data-a="follow"><span class="ic">☺</span><span>A resident</span></button>`;
    foot.querySelector('[data-a="layers"]').onclick = () => this.toggleLayers();
    foot.querySelector('[data-a="follow"]').onclick = () => this.app.followSomeone();
    rail.appendChild(foot);
    this.root.appendChild(rail);
    this.railEl = rail;
  }
  setNav(id) {
    for (const b of this.railEl.querySelectorAll('.nav')) b.classList.toggle('on', b.dataset.nav === id);
  }

  // ------------------------------------------------------------- right overview
  buildRight() {
    const wrap = el('div'); wrap.id = 'right';
    this.briefing = new Briefing(this.app, this);
    wrap.appendChild(this.briefing.objEl);
    const p = el('div', 'pnl');
    p.style.marginTop = '10px';
    p.innerHTML = `
      <div class="pnl-h"><span class="t">City Overview</span><button class="x">×</button></div>
      <div class="pnl-b"></div>
      <div class="pnl-f"><button class="btn">› Detailed Reports</button></div>`;
    wrap.appendChild(p);
    this.root.appendChild(wrap);
    this.rightWrap = wrap;
    p.querySelector('.x').onclick = () => { wrap.style.display = wrap.style.display === 'none' ? 'flex' : 'none'; };
    p.querySelector('.btn').onclick = () => this.app.modals.open('dashboard');
    const body = p.querySelector('.pnl-b');
    this.overviewRows = [
      { id: 'population', ic: '👥', k: 'Population', color: '#4ade80' },
      { id: 'economy', ic: '💲', k: 'Economy', color: '#35d6ff' },
      { id: 'employment', ic: '💼', k: 'Employment', color: '#f0b345' },
      { id: 'housing', ic: '🏠', k: 'Housing', color: '#a78bfa' },
      { id: 'traffic', ic: '🚗', k: 'Traffic Flow', color: '#ff5f56' },
      { id: 'pollution', ic: '🌫', k: 'Pollution', color: '#84cc16' },
    ];
    for (const r of this.overviewRows) {
      const e = el('div', 'row');
      e.innerHTML = `<div class="ic">${r.ic}</div><div class="tx"><div class="k">${r.k}</div><div class="v">—</div></div><canvas></canvas>`;
      e.onclick = () => this.app.openMetric(r.id);
      body.appendChild(e);
      r.el = e; r.v = e.querySelector('.v'); r.c = e.querySelector('canvas');
    }
  }

  // ------------------------------------------------------------- events
  buildEvents() {
    const w = el('div'); w.id = 'events';
    const p = el('div', 'pnl');
    p.innerHTML = `<div class="pnl-h"><span class="t">City News</span><button class="x">×</button></div><div class="pnl-b"></div>`;
    w.appendChild(p);
    this.root.appendChild(w);
    p.querySelector('.x').onclick = () => { w.style.display = 'none'; };
    this.eventsBody = p.querySelector('.pnl-b');
    this.eventsWrap = w;
  }

  // ------------------------------------------------------------- toolbar
  buildToolbar() {
    const sub = el('div'); sub.id = 'subtools';
    this.root.appendChild(sub);
    this.subEl = sub;
    const tb = el('div'); tb.id = 'toolbar';
    this.toolDefs = [
      { id: 'roads', ic: '🛣', nm: 'Roads' },
      { id: 'zone', ic: '▦', nm: 'Zone' },
      { id: 'buildings', ic: '🏢', nm: 'Buildings' },
      { id: 'parks', ic: '🌳', nm: 'Parks' },
      { id: 'transit', ic: '🚇', nm: 'Transit' },
      { id: 'utilities', ic: '⚡', nm: 'Utilities' },
      { id: 'services', ic: '🏛', nm: 'Services' },
      { id: 'demolish', ic: '💥', nm: 'Demolish' },
    ];
    for (const t of this.toolDefs) {
      const b = el('button', 'tool');
      b.innerHTML = `<span class="ic">${t.ic}</span><span class="nm">${t.nm}</span>`;
      b.dataset.tool = t.id;
      b.onclick = () => this.app.tools.select(t.id);
      tb.appendChild(b);
    }
    this.root.appendChild(tb);
    this.toolbarEl = tb;
  }
  setTool(id) {
    for (const b of this.toolbarEl.querySelectorAll('.tool')) b.classList.toggle('on', b.dataset.tool === id);
  }
  setSubtools(items, activeId, onPick) {
    this.subEl.innerHTML = '';
    if (!items || !items.length) { this.subEl.classList.remove('show'); return; }
    for (const it of items) {
      const b = el('button', 'sub' + (it.id === activeId ? ' on' : '') + (it.lock ? ' locked' : ''));
      b.innerHTML = (it.color ? `<span class="sw" style="background:${it.color}"></span>` : (it.ic ? `<span>${it.ic}</span>` : '')) +
        `<span>${it.label}</span>` + (it.lock ? `<span class="cost">🔒 ${it.lock}</span>` : (it.cost ? `<span class="cost">${fmtMoney(it.cost)}</span>` : ''));
      b.onclick = () => it.lock ? this.toast(`${it.label} unlocks at ${it.lock}`) : onPick(it.id);
      this.subEl.appendChild(b);
    }
    this.subEl.classList.add('show');
  }

  // ------------------------------------------------------------- minimap
  buildMinimap() {
    const w = el('div'); w.id = 'minimap';
    w.innerHTML = `<canvas width="412" height="412"></canvas>
      <div id="mmbar">
        <button data-a="layers" title="Data layers">▤</button>
        <button data-a="districts" title="Districts">◉</button>
        <button data-a="grid" title="Zoning">▦</button>
        <button data-a="zoomin" title="Zoom in">＋</button>
        <button data-a="zoomout" title="Zoom out">－</button>
      </div>`;
    this.root.appendChild(w);
    this.mmCanvas = w.querySelector('canvas');
    this.mmCtx = this.mmCanvas.getContext('2d');
    this.mmMode = 'default';
    const rect = () => this.mmCanvas.getBoundingClientRect();
    const jump = (e) => {
      const r = rect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      this.app.focusWorld((fx - 0.5) * WORLD, (fy - 0.5) * WORLD);
    };
    this.mmCanvas.onclick = jump;
    this.mmCanvas.onpointerdown = (e) => { this.mmDrag = true; jump(e); };
    window.addEventListener('pointerup', () => { this.mmDrag = false; });
    this.mmCanvas.onpointermove = (e) => { if (this.mmDrag) jump(e); };
    for (const b of w.querySelectorAll('#mmbar button')) {
      b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'layers') this.toggleLayers();
        else if (a === 'districts') { this.mmMode = this.mmMode === 'districts' ? 'default' : 'districts'; }
        else if (a === 'grid') { this.app.setLayer(this.app.layer === 'zoning' ? 'none' : 'zoning'); }
        else if (a === 'zoomin') this.app.rig.dDist = Math.max(this.app.rig.minDist, this.app.rig.dDist * 0.62);
        else if (a === 'zoomout') this.app.rig.dDist = Math.min(this.app.rig.maxDist, this.app.rig.dDist * 1.6);
      };
    }
    // layer picker
    const lay = el('div', 'pnl'); lay.id = 'layers';
    lay.innerHTML = `<div class="pnl-h"><span class="t">Map Layers</span><button class="x">×</button></div><div class="pnl-b" style="max-height:340px"></div>`;
    const lb = lay.querySelector('.pnl-b');
    for (const L of LAYERS) {
      const b = el('button', 'lay');
      b.innerHTML = `<span class="ic">${L.icon}</span><span>${L.label}</span>`;
      b.dataset.layer = L.id;
      b.onclick = () => this.app.setLayer(L.id);
      lb.appendChild(b);
    }
    lay.querySelector('.x').onclick = () => this.toggleLayers(false);
    this.root.appendChild(lay);
    this.layersEl = lay;
  }
  toggleLayers(force) {
    const on = force === undefined ? !this.layersEl.classList.contains('show') : force;
    this.layersEl.classList.toggle('show', on);
  }
  setLayerActive(id) {
    for (const b of this.layersEl.querySelectorAll('.lay')) b.classList.toggle('on', b.dataset.layer === id);
  }

  // ------------------------------------------------------------- inspector
  buildInspector() {
    const w = el('div', 'pnl'); w.id = 'inspect';
    w.innerHTML = `<div class="pnl-h"><span class="t">Inspector</span><button class="x">×</button></div><div class="pnl-b"></div>`;
    w.querySelector('.x').onclick = () => this.app.select(null);
    this.root.appendChild(w);
    this.inspectEl = w;
    this.inspectBody = w.querySelector('.pnl-b');
  }
  showInspector(html) {
    if (!html) { this.inspectEl.classList.remove('show'); return; }
    this.inspectBody.innerHTML = html;
    this.inspectEl.classList.add('show');
    for (const b of this.inspectBody.querySelectorAll('[data-act]')) {
      b.onclick = () => this.app.inspectorAction(b.dataset.act, b.dataset.arg);
    }
  }

  // ------------------------------------------------------------- misc
  buildMisc() {
    const m = el('div'); m.id = 'modal';
    m.innerHTML = `<div class="mdl"><div class="mdl-h"><div><div class="t"></div><div class="s"></div></div><button class="x" style="font-size:20px;color:#7f93aa">×</button></div><div class="sections"></div><div class="tabs"></div><div class="mdl-b"></div><div class="mdl-f"></div></div>`;
    document.body.appendChild(m);
    this.modalEl = m;
    m.querySelector('.x').onclick = () => this.app.modals.close();
    m.onclick = (e) => { if (e.target === m) this.app.modals.close(); };

    const t = el('div', 'toast'); document.body.appendChild(t); this.toastEl = t;
    const h = el('div'); h.id = 'hint'; this.root.appendChild(h); this.hintEl = h;
    const tt = el('div'); tt.id = 'tooltip'; document.body.appendChild(tt); this.tipEl = tt;

  }

  toast(msg, isErr) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.toggle('err', !!isErr);
    this.toastEl.classList.add('show');
    clearTimeout(this._tt);
    this._tt = setTimeout(() => this.toastEl.classList.remove('show'), 2600);
  }
  hint(html) {
    if (!html) { this.hintEl.classList.remove('show'); return; }
    this.hintEl.innerHTML = html;
    this.hintEl.classList.add('show');
  }
  tip(x, y, html) {
    if (!html) { this.tipEl.classList.remove('show'); return; }
    this.tipEl.innerHTML = html;
    this.tipEl.classList.add('show');
    const r = this.tipEl.getBoundingClientRect();
    this.tipEl.style.left = Math.min(innerWidth - r.width - 8, x + 14) + 'px';
    this.tipEl.style.top = Math.min(innerHeight - r.height - 8, y + 16) + 'px';
  }

  // ------------------------------------------------------------- update
  update() {
    const sim = this.sim; if (!sim) return;
    const s = sim.stats;
    const tl = sim.timeLabel();
    this.clockEl.children[0].textContent = tl.date;
    this.clockEl.children[1].textContent = tl.time;
    document.getElementById('modelbl').textContent = MODES[sim.modeKey].label.toUpperCase() + ' MODE';

    // rolling history for the deltas + sparklines
    if (!this._lastHist || sim.minutes - this._lastHist > 720) {
      this._lastHist = sim.minutes;
      const push = (k, v) => { const a = this.hist[k]; a.push(v); if (a.length > 90) a.shift(); };
      push('pop', s.population); push('happy', s.happiness * 100);
      push('eco', s.gdp); push('budget', sim.budget.treasury);
      push('flow', s.flow * 100); push('util', (s.utilityIndex || 1) * 100);
      push('commute', s.commute);
    }
    const prev = (a) => a.length > 8 ? a[a.length - 9] : a[0];

    const vals = {
      budget: { v: fmtMoney(sim.budget.treasury), d: delta(sim.budget.treasury, prev(this.hist.budget)) },
      population: { v: fmtNum(s.population), d: delta(s.population, prev(this.hist.pop)) },
      happiness: { v: fmtPct(s.happiness), d: delta(s.happiness * 100, prev(this.hist.happy)) },
      economy: { v: (s.businessHealth || 1).toFixed(2) + '×', d: delta(s.gdp, prev(this.hist.eco)) },
      utilities: { v: fmtPct(s.utilityIndex || 1), d: delta((s.utilityIndex || 1) * 100, prev(this.hist.util)) },
      commute: { v: Math.round(s.commute) + ' min', d: delta(s.commute, prev(this.hist.commute), true) },
      flow: { v: fmtPct(s.flow), d: delta(s.flow * 100, prev(this.hist.flow)) },
    };
    for (const m of this.metricDefs) {
      const val = vals[m.id];
      m.n.textContent = val.v;
      m.d.textContent = val.d.txt;
      m.d.className = 'md ' + val.d.cls;
    }

    // overview rows
    const h = sim.history.series;
    const rowVals = {
      population: [fmtNum(s.population), h.population, '#4ade80'],
      economy: [fmtMoney(s.gdp), h.gdp, '#35d6ff'],
      employment: [fmtPct(1 - s.unemployment, 0), h.employment, '#f0b345'],
      housing: [fmtPct(1 - s.vacancy, 0) + ' occupied', h.vacancy, '#a78bfa'],
      traffic: [fmtPct(s.flow), h.congestion, '#ff5f56'],
      pollution: [((s.pollutionIndex || 0) * 100).toFixed(0) + ' idx', h.pollution, '#84cc16'],
    };
    for (const r of this.overviewRows) {
      const rv = rowVals[r.id];
      r.v.textContent = rv[0];
      sparkline(r.c, rv[1], { color: rv[2] });
    }

    // objective, news and the completion banner
    this.briefing.update();

    // speeds
    this.speedBtns.forEach((b, i) => b.classList.toggle('on', i === this.app.speedIdx));
    this.drawMinimap();
  }

  // ------------------------------------------------------------- minimap draw
  drawMinimap() {
    const c = this.mmCtx, sim = this.sim, g = sim.world.g;
    const S = 412;
    if (!this._mmBase || this._mmDirty) this.renderMinimapBase();
    c.drawImage(this._mmBase, 0, 0);
    // overlay: current data layer
    const layer = this.app.layer;
    if (layer && layer !== 'none') {
      const ov = this.app.overlays;
      c.globalAlpha = 0.62;
      const img = this._mmOverlay || (this._mmOverlay = document.createElement('canvas'));
      img.width = GRID; img.height = GRID;
      const ic = img.getContext('2d');
      const id = ic.createImageData(GRID, GRID);
      id.data.set(ov.data);
      ic.putImageData(id, 0, 0);
      c.imageSmoothingEnabled = false;
      c.drawImage(img, 0, 0, S, S);
      c.imageSmoothingEnabled = true;
      c.globalAlpha = 1;
    }
    // camera frustum footprint
    const rig = this.app.rig;
    const cx = (rig.target.x / WORLD + 0.5) * S, cy = (rig.target.z / WORLD + 0.5) * S;
    const r = Math.max(6, (rig.dist / WORLD) * S * 0.72);
    c.strokeStyle = 'rgba(53,214,255,.95)'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
    c.fillStyle = 'rgba(53,214,255,.12)'; c.fill();
    c.beginPath(); c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(rig.azim + Math.PI) * r * 1.5, cy + Math.sin(rig.azim + Math.PI) * r * 1.5);
    c.strokeStyle = 'rgba(53,214,255,.5)'; c.stroke();
    // selection marker
    if (this.app.selection && this.app.selection.cell !== undefined) {
      const sx = ((this.app.selection.cell % GRID) / GRID) * S, sy = (Math.floor(this.app.selection.cell / GRID) / GRID) * S;
      c.strokeStyle = '#fff'; c.lineWidth = 1.4;
      c.strokeRect(sx - 4, sy - 4, 8, 8);
    }
  }

  renderMinimapBase() {
    const sim = this.sim, g = sim.world.g;
    const S = 412;
    const cv = this._mmBase || (this._mmBase = document.createElement('canvas'));
    cv.width = S; cv.height = S;
    const c = cv.getContext('2d');
    const small = document.createElement('canvas');
    small.width = GRID; small.height = GRID;
    const sc = small.getContext('2d');
    const img = sc.createImageData(GRID, GRID);
    const d = img.data;
    const districts = sim.world.districts;
    for (let i = 0; i < GRID * GRID; i++) {
      let r = 20, gg = 26, b = 34;
      const k = g.kind[i];
      if (k === K.WATER) { r = 18; gg = 42; b = 62; }
      else if (k === K.ROAD) { const cls = g.road[i]; r = cls === 3 ? 92 : cls === 2 ? 76 : 58; gg = r + 4; b = r + 10; }
      else if (k === K.PARK) { r = 42; gg = 82; b = 46; }
      else if (k === K.RAIL) { r = 78; gg = 66; b = 58; }
      else if (k === K.BUILDING) {
        const bi = g.bld[i], bl = bi >= 0 ? sim.world.buildings[bi] : null;
        const z = g.zone[i];
        const zc = ZONE_SPEC[z] ? ZONE_SPEC[z].color : '#555';
        const hx = parseInt(zc.slice(1), 16);
        const lv = bl ? Math.min(1, 0.35 + bl.floors / 40) : 0.6;
        r = ((hx >> 16) & 255) * lv * 0.75; gg = ((hx >> 8) & 255) * lv * 0.75; b = (hx & 255) * lv * 0.75;
        if (bl && bl.abandoned) { r = 70; gg = 55; b = 50; }
      } else { r = 34; gg = 44; b = 34; }
      if (this.mmMode === 'districts' && k !== K.WATER) {
        const dc = districts[g.dist[i]];
        if (dc) { const hx = parseInt(dc.color.slice(1), 16);
          r = r * 0.4 + ((hx >> 16) & 255) * 0.6; gg = gg * 0.4 + ((hx >> 8) & 255) * 0.6; b = b * 0.4 + (hx & 255) * 0.6; }
      }
      d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
    sc.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(small, 0, 0, S, S);
    c.imageSmoothingEnabled = true;
    // transit lines
    for (const l of sim.transit.lines) {
      c.strokeStyle = l.color; c.lineWidth = l.type === 'bus' ? 1.4 : 2.2;
      c.globalAlpha = l.active ? 0.95 : 0.35;
      c.beginPath();
      l.path.forEach((cell, i) => {
        const x = ((cell % GRID) + 0.5) / GRID * S, y = (Math.floor(cell / GRID) + 0.5) / GRID * S;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      });
      c.stroke();
      c.globalAlpha = 1;
      c.fillStyle = l.color;
      for (const st of l.stops) {
        const x = ((st % GRID) + 0.5) / GRID * S, y = (Math.floor(st / GRID) + 0.5) / GRID * S;
        c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill();
      }
    }
    this._mmDirty = false;
  }
  dirtyMinimap() { this._mmDirty = true; }
}
