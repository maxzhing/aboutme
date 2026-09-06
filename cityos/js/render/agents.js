// Moving agents: cars routed on the real network, transit vehicles on their
// lines, and pedestrians bound to actual named citizens. Vehicle density follows
// the assigned traffic volumes, so what you see matches what the model computes.
import * as THREE from 'three';
import { MeshBuilder, hexToRgb } from './geo.js';
import { GRID, CELL, WORLD, K, RC, ROAD_SPEC, Z } from '../core/defs.js';
import { RNG, clamp } from '../core/rng.js';
import { findPath } from '../world/network.js';
import { ZS, ZN } from '../sim/traffic.js';

const idx = (x, y) => y * GRID + x;
const wxc = (x) => (x + 0.5) * CELL - WORLD / 2;

function carGeo(kind) {
  const mb = new MeshBuilder();
  const glass = [0.24, 0.29, 0.36];
  if (kind === 'car') {
    mb.box(0, 0.66, 0, 1.85, 0.82, 4.4, [1, 1, 1]);
    mb.box(0, 1.32, -0.2, 1.68, 0.66, 2.3, glass);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mb.box(ox * 0.88, 0.34, oz * 1.5, 0.26, 0.64, 0.66, [0.08, 0.09, 0.1]);
  } else if (kind === 'van') {
    mb.box(0, 1.05, 0, 2.1, 2.1, 5.6, [1, 1, 1]);
    mb.box(0, 1.55, -2.4, 1.95, 1.0, 0.5, glass);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mb.box(ox * 1.0, 0.36, oz * 1.9, 0.3, 0.72, 0.74, [0.08, 0.09, 0.1]);
  } else if (kind === 'bus') {
    mb.box(0, 1.6, 0, 2.5, 3.0, 11.5, [1, 1, 1]);
    mb.box(0, 2.2, 0, 2.56, 1.0, 10.4, glass);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 0.55], [1, 0.55]]) mb.box(ox * 1.2, 0.42, oz * 4.0, 0.34, 0.84, 0.9, [0.08, 0.09, 0.1]);
  } else if (kind === 'truck') {
    mb.box(0, 1.5, -3.2, 2.5, 2.6, 3.4, [1, 1, 1]);
    mb.box(0, 2.0, 1.6, 2.6, 3.4, 8.0, [0.72, 0.72, 0.74]);
    for (const [ox, oz] of [[-1, -1.4], [1, -1.4], [-1, 0.6], [1, 0.6]]) mb.box(ox * 1.2, 0.45, oz * 3.2, 0.36, 0.9, 0.94, [0.08, 0.09, 0.1]);
  } else { // train car
    mb.box(0, 2.0, 0, 3.0, 3.4, 19, [1, 1, 1]);
    mb.box(0, 2.7, 0, 3.06, 1.2, 17.4, glass);
    mb.box(0, 3.9, 0, 1.2, 0.5, 16, [0.3, 0.32, 0.35]);
  }
  return mb.build();
}

const CAR_COLORS = [0xdcdce0, 0x2b2f36, 0x8f949b, 0x8d3029, 0x1d4f80, 0x2c6349, 0xb9a24c, 0x4d3b64, 0xc7c2b6, 0x6d7278, 0x374151, 0xa63f2f];

export class Agents {
  constructor(scene, world, net, sim, seed) {
    this.scene = scene; this.world = world; this.net = net; this.sim = sim;
    this.rng = new RNG((seed ^ 0x5eed) >>> 0);
    this.group = new THREE.Group(); this.group.name = 'agents';
    scene.add(this.group);

    this.maxCars = 900;
    this.cars = [];
    this.routeCache = new Map();

    const mkInst = (geo, n, cast = true) => {
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.5 });
      const m = new THREE.InstancedMesh(geo, mat, n);
      m.castShadow = cast; m.receiveShadow = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
      this.group.add(m);
      return m;
    };
    this.carMesh = mkInst(carGeo('car'), this.maxCars);
    this.vanMesh = mkInst(carGeo('van'), Math.floor(this.maxCars * 0.2));
    this.truckMesh = mkInst(carGeo('truck'), Math.floor(this.maxCars * 0.12));
    this.busMesh = mkInst(carGeo('bus'), 160);
    this.trainMesh = mkInst(carGeo('train'), 90);

    // headlights / tail-lights: additive quads, only lit at night
    const hlGeo = new THREE.PlaneGeometry(1, 1);
    this.hlMat = new THREE.MeshBasicMaterial({ color: 0xfff0cc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.headlights = new THREE.InstancedMesh(hlGeo, this.hlMat, this.maxCars);
    this.headlights.count = 0; this.headlights.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.headlights.renderOrder = 6;
    this.group.add(this.headlights);

    // pedestrians
    const pgeo = new MeshBuilder();
    pgeo.box(0, 0.45, 0, 0.42, 0.9, 0.30, [0.25, 0.27, 0.32]);
    pgeo.box(0, 1.18, 0, 0.5, 0.62, 0.34, [1, 1, 1]);
    pgeo.box(0, 1.63, 0, 0.3, 0.3, 0.3, [0.78, 0.62, 0.5]);
    this.pedMesh = new THREE.InstancedMesh(pgeo.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }), 420);
    this.pedMesh.count = 0; this.pedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pedMesh.castShadow = false;
    this.group.add(this.pedMesh);
    this.peds = [];

    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    this._up = new THREE.Vector3(0, 1, 0); this._c = new THREE.Color();
    this.enabled = true;
    this.pickList = [];
  }

  // ---------------------------------------------------------------- routing
  randomBuilding(weight, near, radius) {
    const bs = this.world.buildings;
    for (let k = 0; k < 60; k++) {
      const b = bs[Math.floor(this.rng.next() * bs.length)];
      if (!b || b.demolished || b.abandoned || b.construction < 1) continue;
      if (near) {
        const bx = wxc(b.x), bz = wxc(b.y);
        if (Math.abs(bx - near.x) > radius || Math.abs(bz - near.z) > radius) continue;
      }
      if (weight === 'res' && b.residents > 4) return b;
      if (weight === 'job' && b.employed > 4) return b;
      if (weight === 'any') return b;
    }
    return null;
  }
  roadNear(b) {
    const g = this.world.g;
    for (let r = 1; r <= 3; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const nx = b.x + dx, ny = b.y + dy;
        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
        const i = idx(nx, ny);
        if (g.kind[i] === K.ROAD && !g.tunnel[i]) return i;
      }
    }
    return -1;
  }

  spawnCar(focus, radius) {
    const sim = this.sim;
    const hour = sim.hourOfDay;
    // Morning flows home -> work, evening the reverse; off-peak is mixed.
    // Origins are drawn from the area the player can actually see: the cars are
    // a visual sample of the assigned flow, not the flow model itself.
    const morning = hour > 5.5 && hour < 11;
    const evening = hour > 15 && hour < 20.5;
    let o, d;
    const near = focus, R = radius;
    if (morning) { o = this.randomBuilding('res', near, R); d = this.randomBuilding('job', near, R * 2.2); }
    else if (evening) { o = this.randomBuilding('job', near, R); d = this.randomBuilding('res', near, R * 2.2); }
    else { o = this.randomBuilding('any', near, R); d = this.randomBuilding('any', near, R * 2.2); }
    if (!o || !d || o === d) return null;
    const a = this.roadNear(o), b = this.roadNear(d);
    if (a < 0 || b < 0 || a === b) return null;
    const key = a * 131071 + b;
    let path = this.routeCache.get(key);
    if (!path) {
      path = findPath(this.net, this.world.g, a, b, sim.traffic.timeCost);
      if (!path || path.length < 3) return null;
      if (this.routeCache.size > 900) this.routeCache.clear();
      this.routeCache.set(key, path);
    }
    const kind = this.rng.weighted([['car', 84], ['van', 9], ['truck', 7]]);
    const pts = this.buildPolyline(path);
    if (!pts) return null;
    return {
      path, pts, t: 0, seg: 0, kind, from: o.id, to: d.id,
      color: CAR_COLORS[this.rng.int(0, CAR_COLORS.length - 1)],
      speed: 0, wait: 0, len: pts.length,
    };
  }

  // Cell path -> smooth driving polyline with right-hand lane offset.
  buildPolyline(path) {
    const g = this.world.g, net = this.net;
    const pts = [];
    for (let i = 0; i < path.length; i++) {
      const c = path[i];
      const x = c % GRID, y = (c / GRID) | 0;
      let dxIn = 0, dzIn = 0, dxOut = 0, dzOut = 0;
      if (i > 0) { const p = path[i - 1]; dxIn = x - (p % GRID); dzIn = y - ((p / GRID) | 0); }
      if (i < path.length - 1) { const n = path[i + 1]; dxOut = (n % GRID) - x; dzOut = ((n / GRID) | 0) - y; }
      if (i === 0) { dxIn = dxOut; dzIn = dzOut; }
      if (i === path.length - 1) { dxOut = dxIn; dzOut = dzIn; }
      const dx = (dxIn + dxOut), dz = (dzIn + dzOut);
      const len = Math.hypot(dx, dz) || 1;
      const nx = dz / len, nz = -dx / len;      // right-hand normal
      const half = (ROAD_SPEC[g.road[c]] || ROAD_SPEC[RC.STREET]).width / 2;
      const off = Math.max(1.6, half * 0.5);
      pts.push({
        x: wxc(x) + nx * off, y: net.roadY[c] + 0.06, z: wxc(y) + nz * off,
        cell: c, tunnel: g.tunnel[c] === 1,
      });
    }
    // segment lengths
    for (let i = 0; i < pts.length - 1; i++) {
      pts[i].seglen = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z) || 0.01;
      pts[i].dir = Math.atan2(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
    }
    return pts.length > 2 ? pts : null;
  }

  // ---------------------------------------------------------------- update
  update(dt, simMinutes, camera, nightFactor, quality) {
    if (!this.enabled) { this.carMesh.count = 0; this.vanMesh.count = 0; this.truckMesh.count = 0; this.busMesh.count = 0; this.trainMesh.count = 0; this.pedMesh.count = 0; this.headlights.count = 0; return; }
    const sim = this.sim;
    const camY = camera.position.y;
    const budget = camY > 1400 ? 0 : Math.round(this.maxCars * clamp(1 - (camY - 350) / 1100, 0.25, 1) * quality);
    // keep the fleet sized to demand and distance
    const want = Math.min(budget, Math.round(budget * clamp(0.35 + sim.traffic.congestion * 1.1, 0.35, 1.15)));
    const focus = { x: camera.position.x, z: camera.position.z };
    const radius = clamp(camY * 1.9 + 220, 260, 1400);
    const t0 = performance.now();
    let attempts = 0;
    while (this.cars.length < want && attempts++ < 90 && performance.now() - t0 < 3.2) {
      const c = this.spawnCar(focus, radius);
      if (c) this.cars.push(c);
    }
    while (this.cars.length > want + 40) this.cars.pop();

    const g = this.world.g;
    const simSec = Math.min(4, simMinutes * 60);      // cap so cars never teleport
    const mm = this._m, qq = this._q, pp = this._p, ss = this._s, up = this._up, col = this._c;
    let nCar = 0, nVan = 0, nTruck = 0, nHead = 0;
    this.pickList.length = 0;

    for (let i = this.cars.length - 1; i >= 0; i--) {
      const v = this.cars[i];
      const p = v.pts[v.seg];
      if (!p || v.seg >= v.pts.length - 1) { this.cars.splice(i, 1); continue; }
      // desired speed from the congested link speed, then signals
      const cellSpeed = Math.max(6, g.speed[p.cell] || 40);
      let target = cellSpeed / 3.6;                     // m/s
      const li = this.net.lightAt[p.cell];
      if (li >= 0) {
        const L = this.net.lights[li];
        const horiz = Math.abs(Math.sin(p.dir || 0)) > 0.7;
        const flowing = (L.green === 0 && !horiz) || (L.green === 1 && horiz);
        const distToNode = p.seglen * (1 - v.t);
        if (!flowing && distToNode < CELL * 0.55) target = 0;
      }
      v.speed += (target - v.speed) * Math.min(1, dt * 2.4);
      const adv = v.speed * simSec;
      v.t += adv / p.seglen;
      while (v.t >= 1 && v.seg < v.pts.length - 1) { v.t -= 1; v.seg++; }
      if (v.seg >= v.pts.length - 1) { this.cars.splice(i, 1); continue; }
      const a = v.pts[v.seg], b = v.pts[v.seg + 1] || a;
      const x = a.x + (b.x - a.x) * v.t, z = a.z + (b.z - a.z) * v.t;
      const y = a.y + (b.y - a.y) * v.t;
      if (a.tunnel) continue;                            // hidden underground
      const dir = a.dir || 0;
      pp.set(x, y, z); qq.setFromAxisAngle(up, dir); mm.compose(pp, qq, ss);
      col.setHex(v.color);
      let mesh, n;
      if (v.kind === 'car') { mesh = this.carMesh; n = nCar++; }
      else if (v.kind === 'van') { mesh = this.vanMesh; n = nVan++; }
      else { mesh = this.truckMesh; n = nTruck++; }
      if (n < mesh.instanceMatrix.count) { mesh.setMatrixAt(n, mm); mesh.setColorAt(n, col); }
      if (nightFactor > 0.25 && nHead < this.maxCars) {
        pp.set(x + Math.sin(dir) * 2.4, y + 0.55, z + Math.cos(dir) * 2.4);
        qq.setFromAxisAngle(up, dir);
        ss.set(4.2, 2.4, 1);
        mm.compose(pp, qq, ss);
        this.headlights.setMatrixAt(nHead++, mm);
        ss.set(1, 1, 1);
      }
      this.pickList.push({ v, x, z });
    }
    this.carMesh.count = Math.min(nCar, this.carMesh.instanceMatrix.count);
    this.vanMesh.count = Math.min(nVan, this.vanMesh.instanceMatrix.count);
    this.truckMesh.count = Math.min(nTruck, this.truckMesh.instanceMatrix.count);
    this.carMesh.instanceMatrix.needsUpdate = true;
    this.vanMesh.instanceMatrix.needsUpdate = true;
    this.truckMesh.instanceMatrix.needsUpdate = true;
    if (this.carMesh.instanceColor) this.carMesh.instanceColor.needsUpdate = true;
    if (this.vanMesh.instanceColor) this.vanMesh.instanceColor.needsUpdate = true;
    if (this.truckMesh.instanceColor) this.truckMesh.instanceColor.needsUpdate = true;
    this.headlights.count = nightFactor > 0.25 ? nHead : 0;
    this.headlights.instanceMatrix.needsUpdate = true;
    this.hlMat.opacity = clamp((nightFactor - 0.22) * 1.7, 0, 0.95);

    this.updateTransit(camY);
    this.updatePeds(dt, camera, quality);
  }

  updateTransit(camY) {
    const mm = this._m, qq = this._q, pp = this._p, ss = this._s, up = this._up, col = this._c;
    let nBus = 0, nTrain = 0;
    const net = this.net;
    for (const line of this.sim.transit.lines) {
      if (!line.active || line.path.length < 2) continue;
      for (const veh of line.vehicles) {
        const pos = this.sim.transit.vehiclePos(line, veh);
        const cell = idx(Math.round(clamp(pos.x, 0, GRID - 1)), Math.round(clamp(pos.y, 0, GRID - 1)));
        const under = line.type === 'metro';
        const y = under ? -14 : (net.roadY[cell] || 0) + (line.type === 'rail' ? 1.1 : 0.06);
        if (under) continue;                       // subways run in tube
        pp.set(wxc(pos.x), y, wxc(pos.y));
        qq.setFromAxisAngle(up, pos.dir + (pos.back ? Math.PI : 0) + Math.PI / 2);
        mm.compose(pp, qq, ss);
        col.set(line.color);
        if (line.type === 'bus') {
          if (nBus < this.busMesh.instanceMatrix.count) { this.busMesh.setMatrixAt(nBus, mm); this.busMesh.setColorAt(nBus, col); nBus++; }
        } else {
          if (nTrain < this.trainMesh.instanceMatrix.count) { this.trainMesh.setMatrixAt(nTrain, mm); this.trainMesh.setColorAt(nTrain, col); nTrain++; }
        }
      }
    }
    this.busMesh.count = nBus; this.trainMesh.count = nTrain;
    this.busMesh.instanceMatrix.needsUpdate = true;
    this.trainMesh.instanceMatrix.needsUpdate = true;
    if (this.busMesh.instanceColor) this.busMesh.instanceColor.needsUpdate = true;
    if (this.trainMesh.instanceColor) this.trainMesh.instanceColor.needsUpdate = true;
  }

  // Pedestrians are real citizens: we draw the ones whose current activity puts
  // them outdoors near the camera.
  updatePeds(dt, camera, quality) {
    const camY = camera.position.y;
    if (camY > 260 || quality < 0.5) { this.pedMesh.count = 0; this.pedPick = []; return; }
    const sim = this.sim;
    const hour = sim.hourOfDay;
    const weekend = sim.dayOfWeek === 0 || sim.dayOfWeek === 6;
    const cx = camera.position.x, cz = camera.position.z;
    const R = 240;
    const mm = this._m, qq = this._q, pp = this._p, ss = this._s, up = this._up, col = this._c;
    let n = 0;
    const list = sim.citizens.list;
    const cap = Math.min(this.pedMesh.instanceMatrix.count, Math.round(400 * quality));
    this.pedPick = this.pedPick || [];
    this.pedPick.length = 0;
    for (let k = 0; k < list.length && n < cap; k++) {
      const c = list[(k + sim.tickCount) % list.length];
      const act = sim.citizens.activity(c, hour, weekend);
      if (!act.out || !act.where) continue;
      const b = act.where;
      const bx = wxc(b.x) + (b.w - 1) * CELL / 2, bz = wxc(b.y) + (b.h - 1) * CELL / 2;
      if (Math.abs(bx - cx) > R || Math.abs(bz - cz) > R) continue;
      // walk a small loop on the pavement beside the building
      const ph = ((c.seed % 997) / 997) * Math.PI * 2 + performance.now() * 0.00016 * (1 + (c.seed % 7) * 0.06);
      const rad = (b.w * CELL) / 2 + 4.5;
      const px = bx + Math.cos(ph) * rad, pz = bz + Math.sin(ph) * (b.h * CELL / 2 + 4.5);
      pp.set(px, 0.2, pz);
      qq.setFromAxisAngle(up, -ph + Math.PI / 2);
      const sc = 0.92 + ((c.seed % 13) / 13) * 0.18;
      ss.set(sc, sc, sc);
      mm.compose(pp, qq, ss);
      this.pedMesh.setMatrixAt(n, mm);
      const t = (c.seed % 100) / 100;
      col.setHSL(0.02 + t * 0.75, 0.22 + t * 0.18, 0.34 + t * 0.24);
      this.pedMesh.setColorAt(n, col);
      this.pedPick.push({ c, x: px, z: pz, act: act.act });
      n++;
    }
    ss.set(1, 1, 1);
    this.pedMesh.count = n;
    this.pedMesh.instanceMatrix.needsUpdate = true;
    if (this.pedMesh.instanceColor) this.pedMesh.instanceColor.needsUpdate = true;
  }

  // Nearest agent to a world-space point, for click inspection.
  pickAt(x, z, radius = 6) {
    let best = null, bestD = radius * radius;
    for (const p of this.pedPick || []) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestD) { bestD = d; best = { type: 'citizen', citizen: p.c, activity: p.act }; }
    }
    for (const p of this.pickList) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestD) { bestD = d; best = { type: 'vehicle', vehicle: p.v }; }
    }
    return best;
  }

  clearRoutes() { this.routeCache.clear(); this.cars.length = 0; }
}
