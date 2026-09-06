// Spatial fields: pollution, noise, crime, green cover, service coverage and
// land value. All are real 128x128 scalar fields updated by diffusion from
// sources, and every one of them feeds back into rents, happiness and growth.
import { GRID, CELL, K, Z, RC, BT, ROAD_SPEC, BUILDING_SPEC } from '../core/defs.js';
import { clamp } from '../core/rng.js';

const N = GRID * GRID;
const idx = (x, y) => y * GRID + x;

const tmpA = new Float32Array(N);

// 5-point diffusion with decay; `passes` controls spread radius.
export function diffuse(src, dst, passes, keep = 0.55, decay = 1.0) {
  dst.set(src);
  for (let p = 0; p < passes; p++) {
    tmpA.set(dst);
    for (let y = 0; y < GRID; y++) {
      const yo = y * GRID;
      for (let x = 0; x < GRID; x++) {
        const i = yo + x;
        let s = 0, c = 0;
        if (x > 0) { s += tmpA[i - 1]; c++; }
        if (x < GRID - 1) { s += tmpA[i + 1]; c++; }
        if (y > 0) { s += tmpA[i - GRID]; c++; }
        if (y < GRID - 1) { s += tmpA[i + GRID]; c++; }
        dst[i] = (tmpA[i] * keep + (s / c) * (1 - keep)) * decay;
      }
    }
  }
  return dst;
}

// Distance-decayed coverage from a set of service buildings.
export function coverageField(out, sources, radiusCells) {
  out.fill(0);
  for (const s of sources) {
    const r = s.r || radiusCells;
    const x0 = Math.max(0, s.x - r), x1 = Math.min(GRID - 1, s.x + r);
    const y0 = Math.max(0, s.y - r), y1 = Math.min(GRID - 1, s.y + r);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - s.x, y - s.y);
      if (d > r) continue;
      const v = (1 - d / r) * (s.w || 1);
      const i = idx(x, y);
      if (v > out[i]) out[i] = Math.min(1.4, out[i] + v * 0.55 + (v > out[i] ? v * 0.45 : 0));
    }
  }
  for (let i = 0; i < N; i++) out[i] = Math.min(1, out[i]);
  return out;
}

export class Fields {
  constructor(world) {
    this.world = world;
    this.g = world.g;
    this.polSrc = new Float32Array(N);
    this.noiseSrc = new Float32Array(N);
    this.crimeSrc = new Float32Array(N);
    this.greenSrc = new Float32Array(N);
    this.svcPolice = new Float32Array(N);
    this.svcFire = new Float32Array(N);
    this.svcHealth = new Float32Array(N);
    this.svcEdu = new Float32Array(N);
    this.svcAll = new Float32Array(N);
    this.transitAcc = new Float32Array(N);
    this.jobsAcc = new Float32Array(N);
    this.popDens = new Float32Array(N);
    this.waterDist = new Float32Array(N).fill(99);
    this.cbd = world.districts.find(d => d.key === 'downtown');
    this.computeWaterDistance();
  }

  computeWaterDistance() {
    const g = this.g, d = this.waterDist;
    d.fill(999);
    const q = [];
    for (let i = 0; i < N; i++) if (g.kind[i] === K.WATER) { d[i] = 0; q.push(i); }
    let head = 0;
    while (head < q.length) {
      const i = q[head++];
      const x = i % GRID, y = (i / GRID) | 0;
      const nd = d[i] + 1;
      if (nd > 14) continue;
      if (x > 0 && d[i - 1] > nd) { d[i - 1] = nd; q.push(i - 1); }
      if (x < GRID - 1 && d[i + 1] > nd) { d[i + 1] = nd; q.push(i + 1); }
      if (y > 0 && d[i - GRID] > nd) { d[i - GRID] = nd; q.push(i - GRID); }
      if (y < GRID - 1 && d[i + GRID] > nd) { d[i + GRID] = nd; q.push(i + GRID); }
    }
  }

  // Rebuild the source terms from current land use + traffic. Cheap enough to run daily.
  updateSources(sim) {
    const g = this.g, w = this.world;
    this.polSrc.fill(0); this.noiseSrc.fill(0); this.crimeSrc.fill(0); this.greenSrc.fill(0);
    this.popDens.fill(0); this.jobsAcc.fill(0);
    const police = [], fire = [], health = [], edu = [], transit = [];

    for (const b of w.buildings) {
      if (!b || b.demolished) continue;
      const i = idx(b.x, b.y);
      const area = b.w * b.h;
      if (!b.abandoned) {
        this.polSrc[i] += b.pollution * (b.powered ? 1 : 0.3);
        this.popDens[i] += b.residents / area;
        this.jobsAcc[i] += b.jobs;
      }
      if (b.type === BT.PARK_S || b.type === BT.PLAZA) this.greenSrc[i] += b.w * b.h * 0.6;
      if (b.type === BT.POLICE) police.push({ x: b.x, y: b.y, r: 22, w: b.powered ? 1 : 0.4 });
      if (b.type === BT.FIRE) fire.push({ x: b.x, y: b.y, r: 20, w: b.powered ? 1 : 0.4 });
      if (b.type === BT.HOSPITAL) health.push({ x: b.x, y: b.y, r: 30, w: b.powered ? 1 : 0.4 });
      if (b.type === BT.SCHOOL) edu.push({ x: b.x, y: b.y, r: 16, w: 1 });
      if (b.type === BT.UNIVERSITY) edu.push({ x: b.x, y: b.y, r: 34, w: 1 });
      if (b.type === BT.STATION) transit.push({ x: b.x, y: b.y, r: 14, w: 1 });
      if (b.abandoned) this.crimeSrc[i] += 0.5;
    }
    // transit stops from player-built lines
    for (const line of sim.transit.lines) {
      for (const s of line.stops) transit.push({ x: s % GRID, y: (s / GRID) | 0, r: line.type === 'bus' ? 9 : 16, w: line.active ? 1 : 0.2 });
    }

    // traffic noise + vehicle emissions straight off the assigned volumes
    for (let i = 0; i < N; i++) {
      if (g.kind[i] !== K.ROAD) continue;
      const v = g.vol[i];
      if (v <= 0) continue;
      const cls = g.road[i];
      this.noiseSrc[i] += (v / 900) * (cls === RC.HIGHWAY ? 2.4 : cls === RC.AVENUE ? 1.4 : 0.8);
      this.polSrc[i] += (v / 2600) * (1 - sim.policies.evAdoption * 0.75);
    }

    coverageField(this.svcPolice, police, 22);
    coverageField(this.svcFire, fire, 20);
    coverageField(this.svcHealth, health, 30);
    coverageField(this.svcEdu, edu, 20);
    coverageField(this.transitAcc, transit, 14);
    for (let i = 0; i < N; i++) {
      this.svcAll[i] = (this.svcPolice[i] + this.svcFire[i] + this.svcHealth[i] + this.svcEdu[i]) / 4;
      g.transit[i] = this.transitAcc[i];
      g.service[i] = this.svcAll[i];
    }
  }

  updateFields(sim) {
    const g = this.g;
    diffuse(this.polSrc, g.pol, 7, 0.5, 0.985);
    diffuse(this.noiseSrc, g.noise, 3, 0.45, 0.96);
    diffuse(this.greenSrc, g.green, 5, 0.5, 0.97);
    // crime rises with density + unemployment + low policing, falls with income
    const unemp = sim.stats.unemployment;
    for (let i = 0; i < N; i++) {
      const dens = Math.min(1, this.popDens[i] / 14);
      const base = dens * (0.32 + unemp * 2.2) * (1 - this.svcPolice[i] * 0.72) + this.crimeSrc[i];
      this.crimeSrc[i] = base;
    }
    diffuse(this.crimeSrc, g.crime, 3, 0.5, 0.97);
    // normalise pollution to a readable 0..1 scale
    let maxP = 0.001;
    for (let i = 0; i < N; i++) if (g.pol[i] > maxP) maxP = g.pol[i];
    this.polMax = maxP;
  }

  updateLandValue(sim) {
    const g = this.g, w = this.world;
    const cbd = this.cbd;
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      const i = idx(x, y);
      if (g.kind[i] === K.WATER) { g.land[i] = 0; continue; }
      const dc = Math.hypot(x - cbd.cx, y - cbd.cy) / (GRID * 0.5);
      let v = 0.52 * Math.exp(-dc * 1.35) + 0.14;
      const wd = this.waterDist[i];
      if (wd < 8) v += 0.16 * (1 - wd / 8);
      v += Math.min(0.20, g.green[i] * 0.30);
      v += this.svcAll[i] * 0.16;
      v += this.transitAcc[i] * 0.13;
      v += Math.min(0.12, this.jobsAcc[i] / 900);
      v -= Math.min(0.30, g.pol[i] / Math.max(0.001, this.polMax) * 0.30);
      v -= Math.min(0.14, g.noise[i] * 0.10);
      v -= Math.min(0.22, g.crime[i] * 0.30);
      v -= sim.policies.taxRes * 0.30;
      // congestion on the doorstep hurts, but access to a road helps
      v = clamp(v, 0.03, 1.35);
      g.land[i] = g.land[i] * 0.86 + v * 0.14;   // smooth over time
    }
  }

  // Aggregate readouts used by the HUD and advisors.
  summary(sim) {
    const g = this.g;
    let pol = 0, polN = 0, green = 0, noise = 0, crime = 0, land = 0, n = 0;
    for (let i = 0; i < N; i++) {
      if (g.kind[i] === K.WATER) continue;
      pol += g.pol[i]; green += g.green[i]; noise += g.noise[i]; crime += g.crime[i]; land += g.land[i]; n++;
      if (g.pol[i] > 0.02) polN++;
    }
    return {
      pollution: pol / n, green: green / n, noise: noise / n, crime: crime / n,
      landValue: land / n, pollutedShare: polN / n,
    };
  }
}
