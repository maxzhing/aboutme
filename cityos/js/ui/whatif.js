// What-if simulator. Forks the entire simulation twice — a control and a
// treatment — applies the change to one, and fast-forwards both by the same
// horizon. The difference between them is the effect of the decision alone.
import { GRID, CELL, K, Z, BT, RC, BUILDING_SPEC } from '../core/defs.js';
import { RNG, clamp } from '../core/rng.js';
import { makeBuilding } from '../world/gen.js';
import { fmtNum, fmtMoney, fmtPct } from './format.js';
import { ZS, ZN } from '../sim/traffic.js';

const idx = (x, y) => y * GRID + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID;

export const SCENARIOS = [
  { id: 'stadium', label: 'Build a stadium here', needs: 'cell', desc: 'Site a 42M stadium on the selected block.' },
  { id: 'subway', label: 'Build a subway line', needs: 'none', desc: 'Drive a metro line through the two most under-served dense zones.' },
  { id: 'removeHighway', label: 'Remove this road', needs: 'road', desc: 'Delete the selected road corridor and let traffic re-route.' },
  { id: 'widenRoad', label: 'Upgrade this road', needs: 'road', desc: 'Raise the selected corridor one road class.' },
  { id: 'popDouble', label: 'Population doubles', needs: 'none', desc: 'A regional boom doubles inbound migration pressure.' },
  { id: 'taxUp', label: 'Raise residential tax 2 points', needs: 'none', desc: 'More revenue now, weaker demand later.' },
  { id: 'taxDown', label: 'Cut residential tax 2 points', needs: 'none', desc: 'Less revenue, stronger household demand.' },
  { id: 'bizTaxDown', label: 'Cut business tax 2 points', needs: 'none', desc: 'Cheaper to operate; more firms, less revenue per firm.' },
  { id: 'upzone', label: 'Upzone low-density housing', needs: 'none', desc: 'Convert high-value Residential Low to Residential High.' },
  { id: 'parks', label: 'Double park provision', needs: 'none', desc: 'Convert vacant zoned lots into parks.' },
  { id: 'powerPlant', label: 'Build a power plant', needs: 'none', desc: 'Add 3120 MW of generation on open industrial land.' },
  { id: 'greenPolicy', label: 'Tighten environmental rules', needs: 'none', desc: 'Cut emissions, at a cost to industrial demand.' },
];

const METRICS = [
  { k: 'population', label: 'Population', fmt: (v) => fmtNum(v), good: 1 },
  { k: 'jobsTotal', label: 'Jobs', fmt: (v) => fmtNum(v), good: 1 },
  { k: 'unemployment', label: 'Unemployment', fmt: (v) => fmtPct(v, 1), good: -1 },
  { k: 'commute', label: 'Avg commute', fmt: (v) => v.toFixed(1) + ' min', good: -1 },
  { k: 'flow', label: 'Traffic flow', fmt: (v) => fmtPct(v), good: 1 },
  { k: 'transitShare', label: 'Transit share', fmt: (v) => fmtPct(v, 1), good: 1 },
  { k: 'medianRent', label: 'Median rent', fmt: (v) => fmtMoney(v, false), good: -1 },
  { k: 'vacancy', label: 'Housing vacancy', fmt: (v) => fmtPct(v, 1), good: 1 },
  { k: 'happiness', label: 'Approval', fmt: (v) => fmtPct(v), good: 1 },
  { k: 'pollution', label: 'Pollution index', fmt: (v) => (v * 100).toFixed(1), good: -1 },
  { k: '_revenue', label: 'Monthly revenue', fmt: (v) => fmtMoney(v), good: 1 },
  { k: '_expense', label: 'Monthly spending', fmt: (v) => fmtMoney(v), good: -1 },
  { k: '_treasury', label: 'Reserves', fmt: (v) => fmtMoney(v), good: 1 },
];

export class WhatIf {
  constructor(app) {
    this.app = app;
    this.running = false;
    this.progress = 0;
    this.result = null;
    this.horizonDays = 365;
    this.onUpdate = null;
    this.log = [];
  }

  scenarioAvailable(s) {
    if (s.needs === 'cell') return true;
    if (s.needs === 'road') {
      const sel = this.app.selection;
      return !!(sel && sel.type === 'road');
    }
    return true;
  }

  start(scenarioId, horizonDays) {
    const sc = SCENARIOS.find(x => x.id === scenarioId);
    if (!sc) return;
    this.scenario = sc;
    this.horizonDays = horizonDays || 365;
    this.log = [];
    const base = this.app.sim;
    const a = base.fork(), b = base.fork();
    a.sim.assignHours = 48; b.sim.assignHours = 48;
    a.sim.headless = true; b.sim.headless = true;
    this.control = a; this.treat = b;
    this.baseline = this.snap(base);
    this.applyChange(sc, b);
    this.daysDone = 0;
    this.running = true;
    this.progress = 0;
    this.result = null;
  }

  snap(sim) {
    const s = sim.stats;
    const o = {};
    for (const m of METRICS) {
      if (m.k === '_revenue') o[m.k] = sim.budget.revenue;
      else if (m.k === '_expense') o[m.k] = sim.budget.expense;
      else if (m.k === '_treasury') o[m.k] = sim.budget.treasury;
      else o[m.k] = s[m.k];
    }
    return o;
  }

  // ------------------------------------------------------------- mutations
  applyChange(sc, fork) {
    const sim = fork.sim, world = fork.world, g = world.g;
    const sel = this.app.selection;
    switch (sc.id) {
      case 'stadium': {
        const cell = sel && sel.cell !== undefined ? sel.cell : this.centerCell();
        const x = cell % GRID, y = (cell / GRID) | 0;
        this.placeInFork(fork, BT.STADIUM, x, y, 4, 4);
        this.log.push(`Sited a stadium at ${sim.districtName(g.dist[cell])}, clearing the blocks it occupies.`);
        sim.budget.treasury -= 42_000_000;
        break;
      }
      case 'powerPlant': {
        const spot = this.findOpenLand(fork, 3, 2, (c) => g.zone[c] === Z.IND || g.zone[c] === Z.NONE);
        if (spot) {
          this.placeInFork(fork, BT.POWER, spot % GRID, (spot / GRID) | 0, 3, 2);
          this.log.push('Added a 3,120 MW generating station on open industrial land.');
          sim.budget.treasury -= 62_000_000;
        } else this.log.push('No suitable open land was found for a plant.');
        break;
      }
      case 'subway': {
        const zones = [...sim.traffic.zones].filter(z => z.anchor >= 0 && z.pop > 200)
          .sort((a, b) => (b.pop * (1 - b.transit)) - (a.pop * (1 - a.transit)));
        if (zones.length >= 2) {
          const stops = [zones[0].anchor, zones[1].anchor];
          // route it through the centre so it serves the core too
          const cbd = world.districts.find(d => d.key === 'downtown');
          const mid = idx(Math.round(cbd.cx), Math.round(cbd.cy));
          const line = sim.transit.makeLine('metro', [stops[0], mid, stops[1]], 'Line X');
          sim.transit.addLine(line);
          sim.budget.treasury -= line.buildCost;
          this.log.push(`Built a ${(line.lengthM / 1000).toFixed(1)} km subway with 3 stations, costing ${fmtMoney(line.buildCost)} to build and ${fmtMoney(line.opCost)} a month to run.`);
        }
        break;
      }
      case 'removeHighway': {
        if (sel && sel.type === 'road') {
          const cells = this.corridorCells(fork, sel.cell);
          for (const c of cells) { g.kind[c] = g.bridge[c] ? K.WATER : K.EMPTY; g.road[c] = RC.NONE; }
          fork.net = this.rebuild(fork);
          this.log.push(`Removed ${cells.length} cells of ${sim.roadName(sel.cell)} — traffic must re-route.`);
        }
        break;
      }
      case 'widenRoad': {
        if (sel && sel.type === 'road') {
          const cells = this.corridorCells(fork, sel.cell);
          let n = 0;
          for (const c of cells) if (g.road[c] < RC.HIGHWAY) { g.road[c]++; n++; }
          fork.net = this.rebuild(fork);
          this.log.push(`Upgraded ${n} cells of ${sim.roadName(sel.cell)} by one road class.`);
        }
        break;
      }
      case 'popDouble':
        sim.mods.migration += 0.75; sim.mods.resDemand += 0.5;
        this.log.push('Doubled inbound migration pressure for the whole horizon.');
        break;
      case 'taxUp':
        sim.policies.taxRes = clamp(sim.policies.taxRes + 0.02, 0, 0.35);
        this.log.push(`Residential tax raised to ${fmtPct(sim.policies.taxRes, 1)}.`);
        break;
      case 'taxDown':
        sim.policies.taxRes = clamp(sim.policies.taxRes - 0.02, 0, 0.35);
        this.log.push(`Residential tax cut to ${fmtPct(sim.policies.taxRes, 1)}.`);
        break;
      case 'bizTaxDown':
        sim.policies.taxComm = clamp(sim.policies.taxComm - 0.02, 0, 0.35);
        sim.policies.taxInd = clamp(sim.policies.taxInd - 0.02, 0, 0.35);
        this.log.push(`Business taxes cut to ${fmtPct(sim.policies.taxComm, 1)}.`);
        break;
      case 'upzone': {
        let n = 0;
        for (let i = 0; i < GRID * GRID; i++) {
          if (g.zone[i] === Z.RES_LOW && g.land[i] > 0.45) { g.zone[i] = Z.RES_HIGH; n++; }
        }
        this.log.push(`Upzoned ${n} parcels from Residential Low to Residential High, raising the height ceiling on each.`);
        break;
      }
      case 'parks': {
        let n = 0;
        for (let i = 0; i < GRID * GRID && n < 260; i++) {
          if (g.kind[i] !== K.EMPTY || g.zone[i] === Z.NONE) continue;
          g.zone[i] = Z.PARK; g.kind[i] = K.PARK; n++;
        }
        this.log.push(`Converted ${n} vacant lots into parkland.`);
        break;
      }
      case 'greenPolicy':
        sim.policies.envRegulation = clamp(sim.policies.envRegulation + 0.35, 0, 1);
        sim.policies.evAdoption = clamp(sim.policies.evAdoption + 0.25, 0, 1);
        for (const b of world.buildings) if (b && b.zone === Z.IND) b.pollution *= 0.55;
        this.log.push('Tightened emission limits and accelerated fleet electrification.');
        break;
    }
    sim.fields.updateSources(sim);
    sim.fields.updateFields(sim);
    sim.traffic.refreshLandUse(sim);
    sim.traffic.updateCosts();
  }

  centerCell() {
    const t = this.app.rig.target;
    const x = clamp(Math.floor((t.x + GRID * CELL / 2) / CELL), 2, GRID - 5);
    const y = clamp(Math.floor((t.z + GRID * CELL / 2) / CELL), 2, GRID - 5);
    return idx(x, y);
  }
  rebuild(fork) {
    const net = this.app.buildNetworkFn(fork.world.g);
    fork.sim.net = net; fork.sim.traffic.net = net;
    fork.sim.traffic.updateCosts();
    return net;
  }
  corridorCells(fork, cell) {
    const g = fork.world.g;
    const cls = g.road[cell];
    const x0 = cell % GRID, y0 = (cell / GRID) | 0;
    const out = [cell];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let x = x0 + dx, y = y0 + dy, n = 0;
      while (inb(x, y) && g.kind[idx(x, y)] === K.ROAD && g.road[idx(x, y)] === cls && n < 26) {
        out.push(idx(x, y)); x += dx; y += dy; n++;
      }
    }
    return [...new Set(out)];
  }
  findOpenLand(fork, w, h, test) {
    const g = fork.world.g;
    for (let y = 2; y < GRID - h - 2; y++) for (let x = 2; x < GRID - w - 2; x++) {
      let ok = true, road = false;
      for (let j = 0; j < h && ok; j++) for (let i = 0; i < w; i++) {
        const c = idx(x + i, y + j);
        if (g.kind[c] === K.ROAD || g.kind[c] === K.WATER || g.kind[c] === K.RAIL) { ok = false; break; }
        if (test && !test(c)) { ok = false; break; }
      }
      if (!ok) continue;
      for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++)
        if (inb(x + i, y + j) && g.kind[idx(x + i, y + j)] === K.ROAD) road = true;
      if (road) return idx(x, y);
    }
    return null;
  }
  placeInFork(fork, type, x, y, w, h) {
    const g = fork.world.g, sim = fork.sim;
    x = clamp(x, 0, GRID - w); y = clamp(y, 0, GRID - h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const c = idx(x + i, y + j);
      const bi = g.bld[c];
      if (bi >= 0 && fork.world.buildings[bi]) fork.world.buildings[bi].demolished = true;
      g.bld[c] = -1;
    }
    const spec = BUILDING_SPEC[type];
    const d = fork.world.districts[g.dist[idx(x, y)]];
    const b = makeBuilding(fork.world.buildings.length, type, x, y, w, h, spec.floors[0], 0, spec.zone, d, new RNG(99), g);
    b.construction = 1;
    fork.world.buildings.push(b);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const c = idx(x + i, y + j);
      g.kind[c] = K.BUILDING; g.bld[c] = b.id; g.zone[c] = spec.zone;
    }
  }

  // ------------------------------------------------------------- run
  tick(budgetMs = 26) {
    if (!this.running) return;
    const t0 = performance.now();
    while (this.daysDone < this.horizonDays && performance.now() - t0 < budgetMs) {
      this.control.sim.step(1440);
      this.treat.sim.step(1440);
      this.daysDone++;
    }
    this.progress = this.daysDone / this.horizonDays;
    if (this.daysDone >= this.horizonDays) {
      this.running = false;
      this.result = {
        scenario: this.scenario,
        horizonDays: this.horizonDays,
        now: this.baseline,
        control: this.snap(this.control.sim),
        treat: this.snap(this.treat.sim),
        log: this.log,
        metrics: METRICS,
        narrative: this.narrate(),
      };
      this.control = null; this.treat = null;
    }
    if (this.onUpdate) this.onUpdate(this);
  }

  narrate() {
    const c = this.snap(this.control.sim), t = this.snap(this.treat.sim);
    const lines = [];
    const cmp = (k, label, fmt, good) => {
      const dv = t[k] - c[k];
      if (Math.abs(dv) < 1e-9) return;
      const rel = c[k] !== 0 ? dv / Math.abs(c[k]) : 0;
      if (Math.abs(rel) < 0.005) return;
      const better = good > 0 ? dv > 0 : dv < 0;
      lines.push({ label, txt: `${label} ${dv > 0 ? 'up' : 'down'} ${fmt(Math.abs(dv))} versus doing nothing`, better, mag: Math.abs(rel) });
    };
    cmp('population', 'Population', (v) => fmtNum(v), 1);
    cmp('jobsTotal', 'Jobs', (v) => fmtNum(v), 1);
    cmp('commute', 'Average commute', (v) => v.toFixed(1) + ' min', -1);
    cmp('flow', 'Traffic flow', (v) => (v * 100).toFixed(1) + ' pts', 1);
    cmp('medianRent', 'Median rent', (v) => fmtMoney(v, false), -1);
    cmp('happiness', 'Approval', (v) => (v * 100).toFixed(1) + ' pts', 1);
    cmp('pollution', 'Pollution', (v) => (v * 100).toFixed(1) + ' pts', -1);
    cmp('_treasury', 'Reserves', (v) => fmtMoney(v), 1);
    lines.sort((a, b) => b.mag - a.mag);
    return lines.slice(0, 6);
  }

  cancel() { this.running = false; this.control = null; this.treat = null; }
}
