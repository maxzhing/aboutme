// Traffic model: a gravity demand matrix over 64 zones, assigned onto the real
// road network with BPR congestion and a logit car/transit mode split.
// Assignment is spread across ticks so it never blocks a frame.
import { GRID, CELL, K, RC, ROAD_SPEC } from '../core/defs.js';
import { clamp } from '../core/rng.js';
import { nearestRoad } from '../world/network.js';
import { Heap } from '../core/heap.js';

const N = GRID * GRID;
const idx = (x, y) => y * GRID + x;
export const ZS = 16;                 // zone size in cells
export const ZN = GRID / ZS;          // zones per side (8)
export const NZ = ZN * ZN;            // 64 zones

// Hourly share of daily trips — a real two-peak weekday profile.
const HOUR_PROFILE = [
  0.006, 0.004, 0.003, 0.003, 0.006, 0.016, 0.038, 0.082, 0.093, 0.062,
  0.046, 0.044, 0.052, 0.048, 0.046, 0.052, 0.070, 0.092, 0.081, 0.054,
  0.038, 0.026, 0.018, 0.010,
];
const WEEKEND_PROFILE = [
  0.010, 0.008, 0.005, 0.004, 0.004, 0.007, 0.014, 0.024, 0.036, 0.050,
  0.062, 0.070, 0.072, 0.070, 0.068, 0.066, 0.064, 0.060, 0.055, 0.048,
  0.040, 0.032, 0.021, 0.010,
];

export class TrafficModel {
  constructor(world, net) {
    this.world = world; this.net = net;
    this.g = world.g;
    this.timeCost = new Float32Array(N).fill(1e9);   // minutes to traverse a cell
    this.freeCost = new Float32Array(N).fill(1e9);
    this.vol = new Float32Array(N);                  // assigned veh/h
    this.volAccum = new Float32Array(N);
    this.closed = new Uint8Array(N);
    this.g.closed = this.closed;
    this.dist = new Float64Array(N);
    this.prev = new Int32Array(N);
    this.seen = new Int32Array(N);
    this.stamp = 0;
    this.heap = new Heap(N * 3);
    this.zones = [];
    this.zoneOf = new Uint8Array(N);
    this.cursor = 0;
    this.cycle = 0;
    this.budgetOrigins = 0;
    this.avgCommute = 22;
    this.congestion = 0;
    this.flowIndex = 0.9;
    this.transitTrips = 0; this.carTrips = 0;
    this.buildZones();
    this.updateCosts();
  }

  buildZones() {
    for (let zy = 0; zy < ZN; zy++) for (let zx = 0; zx < ZN; zx++) {
      const id = zy * ZN + zx;
      const cx = zx * ZS + ZS / 2, cy = zy * ZS + ZS / 2;
      const anchor = nearestRoad(this.g, Math.floor(cx), Math.floor(cy), 12);
      this.zones.push({
        id, zx, zy, cx, cy, anchor,
        workers: 0, jobs: 0, retail: 0, pop: 0,
        transit: 0, commute: 22, produced: 0,
      });
      for (let y = zy * ZS; y < (zy + 1) * ZS; y++) for (let x = zx * ZS; x < (zx + 1) * ZS; x++) this.zoneOf[idx(x, y)] = id;
    }
  }

  // Zones on the map edge served by an expressway act as regional gateways:
  // jobs the resident labour force cannot fill are commuted in from outside.
  findGateways() {
    const g = this.g;
    const gw = [];
    for (const z of this.zones) {
      const edge = z.zx === 0 || z.zy === 0 || z.zx === ZN - 1 || z.zy === ZN - 1;
      if (!edge) continue;
      let hasHwy = false;
      for (let y = z.zy * ZS; y < (z.zy + 1) * ZS && !hasHwy; y++)
        for (let x = z.zx * ZS; x < (z.zx + 1) * ZS; x++)
          if (g.kind[idx(x, y)] === K.ROAD && g.road[idx(x, y)] === RC.HIGHWAY) { hasHwy = true; break; }
      if (hasHwy && z.anchor >= 0) gw.push(z);
    }
    this.gateways = gw.length ? gw : this.zones.filter(z => z.anchor >= 0).slice(0, 4);
  }

  // Land use -> trip productions/attractions per zone.
  refreshLandUse(sim) {
    if (!this.gateways) this.findGateways();
    for (const z of this.zones) { z.workers = 0; z.jobs = 0; z.retail = 0; z.pop = 0; z.external = 0; }
    for (const b of this.world.buildings) {
      if (!b || b.demolished || b.abandoned) continue;
      const z = this.zones[this.zoneOf[idx(b.x, b.y)]];
      z.pop += b.residents;
      z.workers += b.residents * 0.52;
      z.jobs += b.employed;
      if (b.zone === 3 || b.zone === 6) z.retail += b.jobs * 0.9;
      if (b.type === 'stadium' || b.type === 'museum' || b.type === 'theater' || b.type === 'university') z.retail += b.jobs * 2.2;
    }
    for (const z of this.zones) {
      const a = z.anchor;
      z.transit = a >= 0 ? sim.fields.transitAcc[a] : 0;
    }
    const jobsTotal = this.zones.reduce((s2, z) => s2 + z.jobs, 0);
    const local = sim.stats.labourForce * 0.94;
    this.inCommuters = Math.max(0, jobsTotal - local);
    sim.stats.inCommuters = Math.round(this.inCommuters);
    if (this.gateways.length) {
      const per = this.inCommuters / this.gateways.length;
      for (const z of this.gateways) { z.external = per; z.workers += per; }
    }
  }

  updateCosts() {
    const g = this.g, net = this.net;
    for (let i = 0; i < N; i++) {
      if (g.kind[i] !== K.ROAD) { this.timeCost[i] = 1e9; continue; }
      if (this.closed[i]) { this.timeCost[i] = 1e6; g.speed[i] = 3; continue; }
      const cap = net.cap[i] || 700;
      const v0 = net.freeSpeed[i] || 40;
      const ratio = this.vol[i] / cap;
      const bpr = 1 + 0.16 * Math.pow(ratio, 4.2);
      // Signal and stop-line delay grows sharply as an approach saturates.
      const sat = Math.min(1.35, ratio);
      const opt = 1 - (this.signalOpt || 0) * 0.45;
      const junction = net.deg[i] >= 3
        ? (net.lightAt[i] >= 0 ? (0.26 + 1.5 * Math.pow(sat, 3)) * opt : 0.10 + 0.5 * Math.pow(sat, 3))
        : 0;
      const spd = clamp(v0 / bpr, 4, v0);
      g.speed[i] = spd;
      const base = (CELL / 1000) / v0 * 60;
      this.freeCost[i] = base + (net.deg[i] >= 3 ? (net.lightAt[i] >= 0 ? 0.26 * opt : 0.10) : 0);
      this.timeCost[i] = (CELL / 1000) / spd * 60 + junction;   // minutes
    }
  }

  dijkstra(src) {
    this.stamp++;
    const { timeCost, dist, prev, seen, heap } = this;
    const net = this.net;
    heap.clear();
    dist[src] = 0; prev[src] = -1; seen[src] = this.stamp;
    heap.push(src, 0);
    const nbrStart = net.nbrStart, nbrList = net.nbrList;
    while (heap.n > 0) {
      heap.pop();
      const v = heap.topV, d = heap.topD;
      if (d > dist[v] + 1e-7) continue;
      if (d > 120) continue;
      for (let k = nbrStart[v], kEnd = nbrStart[v + 1]; k < kEnd; k++) {
        const nb = nbrList[k];
        const c = timeCost[nb];
        if (c >= 1e6) continue;
        const nd = d + c;
        if (seen[nb] !== this.stamp || nd < dist[nb] - 1e-12) {
          seen[nb] = this.stamp; dist[nb] = nd; prev[nb] = v; heap.push(nb, nd);
        }
      }
    }
  }

  // Process a slice of origin zones; returns true when a full cycle completed.
  // Owed origin-zones accumulate at a rate of one full cycle per simulated hour.
  advance(sim, simMinutes, maxPerFrame = 64, hoursPerCycle = 6) {
    this.budgetOrigins += (simMinutes / 60 / Math.max(0.25, hoursPerCycle)) * NZ;
    let n = Math.min(maxPerFrame, Math.floor(this.budgetOrigins));
    if (n <= 0) return false;
    this.budgetOrigins -= n;
    if (this.budgetOrigins > NZ * 3) this.budgetOrigins = NZ * 3;
    let completed = false;
    while (n > 0) {
      const take = Math.min(n, NZ - this.cursor);
      if (this.stepAssignment(sim, take)) completed = true;
      n -= take;
    }
    return completed;
  }

  stepAssignment(sim, originsPerStep = 8) {
    const hour = sim.hourOfDay;
    const weekend = sim.dayOfWeek === 0 || sim.dayOfWeek === 6;
    const prof = (weekend ? WEEKEND_PROFILE : HOUR_PROFILE)[Math.floor(hour) % 24];
    const beta = 0.075;
    const ACCESS = 8.0;                              // walk / park / wait, minutes
    this.signalOpt = sim.policies.signalOptimisation;
    let end = Math.min(NZ, this.cursor + originsPerStep);
    for (; this.cursor < end; this.cursor++) {
      const o = this.zones[this.cursor];
      if (o.anchor < 0 || (o.workers < 1 && o.pop < 1)) continue;
      this.dijkstra(o.anchor);
      // gravity distribution over reachable zones
      let denom = 0;
      const w = [];
      for (const d of this.zones) {
        if (d.anchor < 0) { w.push(0); continue; }
        const reach = this.seen[d.anchor] === this.stamp;
        const c = reach ? this.dist[d.anchor] : 999;
        const attract = d.jobs + d.retail * 0.55 + d.pop * 0.10;
        const f = attract * Math.exp(-beta * c);
        w.push(f); denom += f;
      }
      if (denom <= 0) continue;
      // daily productions -> this hour's vehicle trips
      // A bike network takes short car trips off the road outright.
      const bikeShift = 1 - sim.policies.bikeNetwork * 0.16;
      const daily = (o.pop * 1.62 + o.workers * 1.30 + (o.external || 0) * 2.0)
        * sim.carOwnership * bikeShift * (1 + sim.policies.tripRate);
      const hourly = daily * prof;
      let commuteSum = 0, commuteW = 0, carSum = 0, trSum = 0;
      for (let di = 0; di < NZ; di++) {
        if (w[di] <= 0) continue;
        const d = this.zones[di];
        const share = w[di] / denom;
        let trips = hourly * share;
        if (trips < 0.05) continue;
        const carTime = this.dist[d.anchor];
        // mode split: transit competes when both ends are served
        const acc = Math.min(o.transit, d.transit);
        let transitShare = 0;
        if (acc > 0.12) {
          const line = sim.transit.bestLineBetween(o.id, d.id);
          if (line) {
            const tTime = line.time + 6 / Math.max(0.2, acc);
            // A congestion charge prices driving, tilting the split toward transit.
            const util = (carTime - tTime) * 0.10 - 0.55 + sim.policies.transitBias + (sim.policies.congestionCharge ? 0.6 : 0);
            transitShare = clamp(1 / (1 + Math.exp(-util)), 0, 0.86) * clamp(acc * 1.4, 0, 1);
          }
        }
        const carTrips = trips * (1 - transitShare);
        trSum += trips * transitShare; carSum += carTrips;
        const extLeg = o.external > 0 ? 15 * (o.external / Math.max(1, o.workers)) : 0;
        const carDoor = carTime + ACCESS + extLeg;
        const trDoor = (transitShare ? (this.transitTimeFor(sim, o, d, carTime) + extLeg) : 0);
        commuteSum += trips * (carDoor * (1 - transitShare) + trDoor * transitShare);
        commuteW += trips;
        if (carTrips < 0.05 || di === this.cursor) continue;
        // load the shortest path
        let c = d.anchor, guard = 0;
        while (c !== -1 && c !== o.anchor && guard++ < 400) { this.volAccum[c] += carTrips; c = this.prev[c]; }
      }
      o.commute = commuteW > 0 ? commuteSum / commuteW : 0;
      o.produced = hourly;
      o.carTrips = carSum; o.transitTrips = trSum;
    }
    if (this.cursor >= NZ) {
      this.cursor = 0; this.cycle++;
      const lambda = 0.42;
      // Saturation and delay are weighted by traffic volume, so the headline
      // figures describe what drivers actually experience rather than the state
      // of empty back streets.
      let volW = 0, satW = 0, overW = 0, ttW = 0, peak = 0;
      for (let i = 0; i < N; i++) {
        if (this.g.kind[i] !== K.ROAD) { this.vol[i] = 0; continue; }
        this.vol[i] = this.vol[i] * (1 - lambda) + this.volAccum[i] * lambda;
        this.g.vol[i] = this.vol[i];
        const v = this.vol[i];
        if (v <= 0) continue;
        const r = v / (this.net.cap[i] || 700);
        if (r > peak) peak = r;
        volW += v; satW += v * Math.min(2.5, r);
        if (r > 0.85) overW += v;
        ttW += v * (this.timeCost[i] / Math.max(1e-6, this.freeCost[i]));
      }
      this.volAccum.fill(0);
      this.updateCosts();
      this.congestion = volW > 0 ? satW / volW : 0;
      this.overloaded = volW > 0 ? overW / volW : 0;
      this.peakSaturation = peak;
      this.travelTimeIndex = volW > 0 ? ttW / volW : 1;
      this.flowIndex = clamp(1 / Math.max(1, this.travelTimeIndex) - this.overloaded * 0.30, 0.05, 1);
      let cw = 0, cs = 0, tr = 0, ct = 0;
      for (const z of this.zones) { if (z.produced > 0) { cs += z.commute * z.produced; cw += z.produced; tr += z.transitTrips || 0; ct += z.carTrips || 0; } }
      this.avgCommute = cw > 0 ? cs / cw : this.avgCommute;
      this.transitTrips = tr; this.carTrips = ct;
      this.totalTrips = tr + ct;
      return true;
    }
    return false;
  }

  transitTimeFor(sim, o, d, carTime) {
    const line = sim.transit.bestLineBetween(o.id, d.id);
    if (!line) return carTime * 1.4 + 12;
    const acc = Math.min(o.transit, d.transit);
    return line.time + 4 + 5 / Math.max(0.15, acc);
  }

  closeRoad(cell, on) { this.closed[cell] = on ? 1 : 0; }

  // Congestion at a point, 0..1+, for overlays and inspection.
  congestionAt(cell) {
    if (this.g.kind[cell] !== K.ROAD) return 0;
    return this.vol[cell] / (this.net.cap[cell] || 700);
  }
}
