// Public transport: bus, metro and commuter rail lines the player draws on the
// map. Lines carry real vehicles, cost real money to run, and pull real trips
// off the road network through the mode-split model in traffic.js.
import { GRID, CELL, K, BT } from '../core/defs.js';
import { findPath, nearestRoad } from '../world/network.js';
import { ZS, ZN } from './traffic.js';

const idx = (x, y) => y * GRID + x;

export const TRANSIT_SPEC = {
  bus:   { label: 'Bus Route',    speed: 22, headway: 8,  capacity: 60,  costPerKm: 420000,  opPerKm: 18000,  color: '#f0b345', stopCost: 120000 },
  metro: { label: 'Subway Line',  speed: 46, headway: 4,  capacity: 900, costPerKm: 42000000, opPerKm: 140000, color: '#35d6ff', stopCost: 9500000 },
  rail:  { label: 'Commuter Rail',speed: 62, headway: 12, capacity: 700, costPerKm: 14000000, opPerKm: 62000, color: '#a78bfa', stopCost: 3800000 },
};

let LINE_ID = 1;

export class TransitSystem {
  constructor(world, net) {
    this.world = world; this.net = net; this.g = world.g;
    this.lines = [];
    this.zoneLines = new Map();   // zoneId -> [lineIdx]
    this.ridershipDay = 0;
  }

  makeLine(type, stops, name, opts = {}) {
    const spec = TRANSIT_SPEC[type];
    const path = [];
    const segs = [];
    for (let i = 0; i < stops.length - 1; i++) {
      let seg = null;
      if (type === 'bus') {
        const a = nearestRoad(this.g, stops[i] % GRID, (stops[i] / GRID) | 0, 6);
        const b = nearestRoad(this.g, stops[i + 1] % GRID, (stops[i + 1] / GRID) | 0, 6);
        const tc = new Float32Array(GRID * GRID).fill(1e9);
        for (let c = 0; c < GRID * GRID; c++) if (this.g.kind[c] === K.ROAD) tc[c] = (CELL / 1000) / Math.max(8, this.g.speed[c] || 40) * 60;
        seg = (a >= 0 && b >= 0) ? findPath(this.net, this.g, a, b, tc) : null;
      }
      if (!seg) { // metro/rail run direct between stations
        seg = this.straight(stops[i], stops[i + 1]);
      }
      segs.push(seg);
      for (let k = (i === 0 ? 0 : 1); k < seg.length; k++) path.push(seg[k]);
    }
    let len = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      len += Math.hypot((a % GRID) - (b % GRID), ((a / GRID) | 0) - ((b / GRID) | 0)) * CELL;
    }
    const line = {
      id: LINE_ID++, type, name: name || `${spec.label} ${LINE_ID}`,
      color: opts.color || spec.color, stops: stops.slice(), path,
      lengthM: len, headway: opts.headway || spec.headway, speed: spec.speed,
      capacity: spec.capacity, active: true, ridership: 0, boardings: 0,
      buildCost: Math.round(len / 1000 * spec.costPerKm + stops.length * spec.stopCost),
      opCost: Math.round(len / 1000 * spec.opPerKm),
      vehicles: [],
    };
    const runTime = len / 1000 / spec.speed * 60;         // minutes one way
    line.runTime = runTime;
    const nVeh = Math.max(1, Math.round((runTime * 2) / line.headway));
    for (let i = 0; i < nVeh; i++) {
      line.vehicles.push({ u: (i / nVeh) * 2, dwell: 0 });   // u in [0,2): 0..1 forward, 1..2 back
    }
    return line;
  }

  straight(a, b) {
    const out = [];
    let x0 = a % GRID, y0 = (a / GRID) | 0;
    const x1 = b % GRID, y1 = (b / GRID) | 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, guard = 0;
    for (;;) {
      out.push(idx(x0, y0));
      if ((x0 === x1 && y0 === y1) || guard++ > 600) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return out;
  }

  addLine(line) {
    this.lines.push(line);
    this.reindex();
    return line;
  }
  removeLine(id) {
    const i = this.lines.findIndex(l => l.id === id);
    if (i >= 0) { this.lines.splice(i, 1); this.reindex(); return true; }
    return false;
  }
  reindex() {
    this.zoneLines.clear();
    this.lines.forEach((l, li) => {
      l.zones = new Set();
      for (const s of l.stops) {
        const zx = Math.floor((s % GRID) / ZS), zy = Math.floor(((s / GRID) | 0) / ZS);
        const z = zy * ZN + zx;
        l.zones.add(z);
        // adjacent zones are within a comfortable walk of a stop too
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = zx + dx, ny = zy + dy;
          if (nx >= 0 && ny >= 0 && nx < ZN && ny < ZN) l.zones.add(ny * ZN + nx);
        }
      }
      for (const z of l.zones) {
        if (!this.zoneLines.has(z)) this.zoneLines.set(z, []);
        this.zoneLines.get(z).push(li);
      }
    });
  }

  // Fastest single-line (or one-transfer) transit connection between two zones.
  bestLineBetween(za, zb) {
    const la = this.zoneLines.get(za), lb = this.zoneLines.get(zb);
    if (!la || !lb) return null;
    let best = null;
    for (const i of la) {
      if (!lb.includes(i)) continue;
      const l = this.lines[i];
      if (!l.active) continue;
      const t = l.runTime * 0.55 + l.headway / 2;
      if (!best || t < best.time) best = { line: l, time: t, transfers: 0 };
    }
    if (best) return best;
    // one transfer
    for (const i of la) {
      const l1 = this.lines[i]; if (!l1.active) continue;
      for (const j of lb) {
        if (i === j) continue;
        const l2 = this.lines[j]; if (!l2.active) continue;
        let shares = false;
        for (const z of l1.zones) if (l2.zones.has(z)) { shares = true; break; }
        if (!shares) continue;
        const t = l1.runTime * 0.4 + l2.runTime * 0.4 + l1.headway / 2 + l2.headway / 2 + 3;
        if (!best || t < best.time) best = { line: l1, time: t, transfers: 1 };
      }
    }
    return best;
  }

  totalOpCost() { return this.lines.reduce((s, l) => s + (l.active ? l.opCost : l.opCost * 0.2), 0); }

  step(simMinutes) {
    for (const l of this.lines) {
      if (!l.active || l.path.length < 2) continue;
      const cycle = l.runTime * 2;
      for (const v of l.vehicles) {
        v.u = (v.u + (simMinutes / cycle) * 2) % 2;
      }
    }
  }

  // Position of a transit vehicle in grid coordinates (fractional).
  vehiclePos(line, v) {
    const p = line.path;
    const u = v.u < 1 ? v.u : 2 - v.u;
    const f = u * (p.length - 1);
    const i = Math.min(p.length - 2, Math.floor(f));
    const t = f - i;
    const a = p[i], b = p[i + 1];
    const ax = a % GRID, ay = (a / GRID) | 0, bx = b % GRID, by = (b / GRID) | 0;
    return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, dir: Math.atan2(by - ay, bx - ax), back: v.u >= 1 };
  }

  // Seed the pre-existing commuter rail line from the generated corridor.
  seedRail(world) {
    if (!world.railStops || world.railStops.length < 2) return;
    const stops = world.railStops.map(s => idx(s.x, s.y));
    const line = this.makeLine('rail', stops, 'Regional Line R1', { color: '#a78bfa' });
    line.buildCost = 0;
    this.addLine(line);
  }
}
