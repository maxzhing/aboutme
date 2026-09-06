// Build tools. Everything here mutates the real simulation grid: roads join the
// routing network, zones change what develops, services extend coverage fields,
// and every placement is paid for out of the treasury.
import * as THREE from 'three';
import { GRID, CELL, WORLD, K, RC, Z, BT, ZONE_SPEC, BUILDING_SPEC, ROAD_SPEC } from '../core/defs.js';
import { RNG, clamp } from '../core/rng.js';
import { makeBuilding } from '../world/gen.js';
import { TRANSIT_SPEC } from '../sim/transit.js';
import { fmtMoney } from './format.js';

const idx = (x, y) => y * GRID + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID;
const wxc = (x) => (x + 0.5) * CELL - WORLD / 2;

const ROAD_COST = { [RC.STREET]: 34000, [RC.AVENUE]: 92000, [RC.HIGHWAY]: 310000 };
const ZONE_COST = 3200;
const DEMOLISH_COST = 6000;

export class BuildTools {
  constructor(app) {
    this.app = app;
    this.tool = null;
    this.sub = null;
    this.brush = 1;
    this.dragStart = null;
    this.transitStops = [];
    this.rng = new RNG(4242);
    this.group = new THREE.Group();
    this.group.name = 'toolpreview';
    app.scene.add(this.group);
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x35d6ff, transparent: true, opacity: 0.35, depthWrite: false });
    this.badMat = new THREE.MeshBasicMaterial({ color: 0xff5f56, transparent: true, opacity: 0.35, depthWrite: false });
    this.lineMat = new THREE.LineBasicMaterial({ color: 0x35d6ff });
    this.hoverCell = -1;
  }

  get sim() { return this.app.sim; }

  // ------------------------------------------------------------- selection
  select(id) {
    if (this.tool === id) { this.clear(); return; }
    this.tool = id;
    this.sub = null;
    this.transitStops = [];
    this.app.ui.setTool(id);
    const S = this.subtoolsFor(id);
    if (S && S.length) { this.sub = S[0].id; this.app.ui.setSubtools(S, this.sub, (sid) => this.pickSub(sid)); }
    else this.app.ui.setSubtools(null);
    this.app.canvas.classList.add('tool-active');
    this.hint();
  }
  pickSub(sid) {
    // 'finish' and 'cancel' are actions on the line being drawn, not modes —
    // switching to them must not discard the stops already placed.
    if (sid === 'finish') { this.finishLine(); return; }
    if (sid === 'cancel') { this.transitStops = []; this.clearPreview(); this.hint(); return; }
    this.sub = sid;
    this.transitStops = [];
    this.app.ui.setSubtools(this.subtoolsFor(this.tool), sid, (x) => this.pickSub(x));
    this.hint();
  }
  clear() {
    this.tool = null; this.sub = null; this.transitStops = [];
    this.app.ui.setTool(null);
    this.app.ui.setSubtools(null);
    this.app.ui.hint(null);
    this.app.canvas.classList.remove('tool-active');
    this.clearPreview();
  }

  subtoolsFor(id) {
    switch (id) {
      case 'roads': return [
        { id: 'street', label: 'Street', cost: ROAD_COST[RC.STREET], color: '#5a6270' },
        { id: 'avenue', label: 'Avenue', cost: ROAD_COST[RC.AVENUE], color: '#7d8794' },
        { id: 'highway', label: 'Expressway', cost: ROAD_COST[RC.HIGHWAY], color: '#98a3b2' },
        { id: 'upgrade', label: 'Upgrade', ic: '↑' },
      ];
      case 'zone': return [
        { id: 'res_low', label: 'Residential Low', color: ZONE_SPEC[Z.RES_LOW].color, cost: ZONE_COST },
        { id: 'res_high', label: 'Residential High', color: ZONE_SPEC[Z.RES_HIGH].color, cost: ZONE_COST },
        { id: 'comm', label: 'Commercial', color: ZONE_SPEC[Z.COMM].color, cost: ZONE_COST },
        { id: 'office', label: 'Office', color: ZONE_SPEC[Z.OFFICE].color, cost: ZONE_COST },
        { id: 'ind', label: 'Industrial', color: ZONE_SPEC[Z.IND].color, cost: ZONE_COST },
        { id: 'mixed', label: 'Mixed Use', color: ZONE_SPEC[Z.MIXED].color, cost: ZONE_COST },
        { id: 'dezone', label: 'Clear Zoning', color: '#39414d', cost: 900 },
      ];
      case 'buildings': return [
        { id: BT.APARTMENT, label: 'Apartments', cost: 2_600_000 },
        { id: BT.TOWER_RES, label: 'Residential Tower', cost: 18_000_000 },
        { id: BT.OFFICE, label: 'Offices', cost: 5_200_000 },
        { id: BT.TOWER_OFF, label: 'Corporate Tower', cost: 34_000_000 },
        { id: BT.SHOP, label: 'Shops', cost: 1_400_000 },
        { id: BT.MALL, label: 'Shopping Centre', cost: 9_000_000 },
        { id: BT.FACTORY, label: 'Factory', cost: 7_400_000 },
        { id: BT.WAREHOUSE, label: 'Warehouse', cost: 3_100_000 },
        { id: BT.PARKING, label: 'Parking', cost: 900_000 },
      ];
      case 'parks': return [
        { id: BT.PARK_S, label: 'Park', cost: 620_000 },
        { id: BT.PLAZA, label: 'Plaza', cost: 380_000 },
        { id: BT.STADIUM, label: 'Stadium', cost: 42_000_000 },
        { id: BT.MARINA, label: 'Marina', cost: 6_800_000 },
      ];
      case 'transit': return [
        { id: 'bus', label: 'Bus Route', color: TRANSIT_SPEC.bus.color },
        { id: 'metro', label: 'Subway Line', color: TRANSIT_SPEC.metro.color },
        { id: 'rail', label: 'Commuter Rail', color: TRANSIT_SPEC.rail.color },
        { id: 'station', label: 'Station Building', cost: 4_200_000 },
        { id: 'finish', label: '✓ Finish Line', ic: '✓' },
        { id: 'cancel', label: '✕ Cancel', ic: '✕' },
      ];
      case 'utilities': return [
        { id: BT.POWER, label: 'Power Plant', cost: 62_000_000 },
        { id: BT.WATER_PLANT, label: 'Water Works', cost: 28_000_000 },
        { id: BT.WASTE, label: 'Waste Facility', cost: 21_000_000 },
      ];
      case 'services': return [
        { id: BT.SCHOOL, label: 'School', cost: 8_600_000 },
        { id: BT.UNIVERSITY, label: 'University', cost: 88_000_000 },
        { id: BT.HOSPITAL, label: 'Hospital', cost: 54_000_000 },
        { id: BT.POLICE, label: 'Police Station', cost: 11_000_000 },
        { id: BT.FIRE, label: 'Fire Station', cost: 9_800_000 },
        { id: BT.MUSEUM, label: 'Museum', cost: 26_000_000 },
        { id: BT.THEATER, label: 'Theatre', cost: 17_000_000 },
      ];
      case 'demolish': return [
        { id: 'building', label: 'Demolish Building', cost: DEMOLISH_COST },
        { id: 'road', label: 'Remove Road', cost: DEMOLISH_COST },
      ];
      default: return null;
    }
  }

  hint() {
    if (!this.tool) return this.app.ui.hint(null);
    const h = {
      roads: 'Drag to lay road. <b>Shift</b> for a straight run · <b>Esc</b> to cancel',
      zone: 'Drag to paint zoning · <b>[</b> / <b>]</b> resize brush',
      buildings: 'Click an empty, road-adjacent lot to build · <b>R</b> rotates',
      parks: 'Click to place · <b>R</b> rotates',
      transit: 'Click stops in order, then <b>✓ Finish Line</b>',
      utilities: 'Click open land to site the plant',
      services: 'Click to place · coverage shows on the Service Cover layer',
      demolish: 'Click to demolish · drag to clear a run of road',
    }[this.tool];
    this.app.ui.hint(h);
  }

  // ------------------------------------------------------------- pointer
  cellAt(clientX, clientY) {
    const p = this.app.rig.groundAt(clientX, clientY);
    if (!p) return -1;
    const x = Math.floor((p.x + WORLD / 2) / CELL), y = Math.floor((p.z + WORLD / 2) / CELL);
    return inb(x, y) ? idx(x, y) : -1;
  }

  onMove(e) {
    if (!this.tool) { this.clearPreview(); return; }
    const c = this.cellAt(e.clientX, e.clientY);
    this.hoverCell = c;
    if (c < 0) { this.clearPreview(); return; }
    const cells = this.dragStart !== null ? this.pathCells(this.dragStart, c) : this.brushCells(c);
    this.showPreview(cells);
  }

  onDown(e) {
    if (!this.tool || e.button !== 0) return false;
    const c = this.cellAt(e.clientX, e.clientY);
    if (c < 0) return false;
    if (this.tool === 'roads' || this.tool === 'zone' || (this.tool === 'demolish' && this.sub === 'road')) {
      this.dragStart = c;
      return true;
    }
    if (this.tool === 'transit' && (this.sub === 'bus' || this.sub === 'metro' || this.sub === 'rail')) {
      this.transitStops.push(c);
      this.app.ui.toast(`Stop ${this.transitStops.length} placed — ${this.transitStops.length > 1 ? 'click ✓ Finish Line when done' : 'add more stops'}`);
      this.showTransitPreview();
      return true;
    }
    this.applyAt(c);
    return true;
  }

  onUp(e) {
    if (this.dragStart === null) return false;
    const c = this.cellAt(e.clientX, e.clientY);
    const cells = c >= 0 ? this.pathCells(this.dragStart, c) : [];
    this.dragStart = null;
    if (cells.length) this.applyCells(cells);
    this.clearPreview();
    return true;
  }

  onKey(e) {
    if (e.code === 'Escape') { this.clear(); return true; }
    if (!this.tool) return false;
    if (e.code === 'BracketLeft') { this.brush = Math.max(1, this.brush - 1); return true; }
    if (e.code === 'BracketRight') { this.brush = Math.min(8, this.brush + 1); return true; }
    if (e.code === 'KeyR') { this.rot = ((this.rot || 0) + Math.PI / 2) % (Math.PI * 2); return true; }
    return false;
  }

  brushCells(c) {
    if (this.tool === 'zone') {
      const out = [];
      const x = c % GRID, y = (c / GRID) | 0, r = this.brush - 1;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
        if (inb(x + dx, y + dy)) out.push(idx(x + dx, y + dy));
      return out;
    }
    if (this.tool === 'buildings' || this.tool === 'parks' || this.tool === 'services' || this.tool === 'utilities' || (this.tool === 'transit' && this.sub === 'station')) {
      const size = this.footprintFor(this.sub);
      const out = [];
      const x = c % GRID, y = (c / GRID) | 0;
      for (let j = 0; j < size[1]; j++) for (let i = 0; i < size[0]; i++) if (inb(x + i, y + j)) out.push(idx(x + i, y + j));
      return out;
    }
    return [c];
  }

  // L-shaped run between two cells, like a road planner.
  pathCells(a, b) {
    const ax = a % GRID, ay = (a / GRID) | 0, bx = b % GRID, by = (b / GRID) | 0;
    const out = [];
    if (this.tool === 'zone') {
      const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(idx(x, y));
      return out;
    }
    const horizFirst = Math.abs(bx - ax) >= Math.abs(by - ay);
    if (horizFirst) {
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) out.push(idx(x, ay));
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) out.push(idx(bx, y));
    } else {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) out.push(idx(ax, y));
      for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) out.push(idx(x, by));
    }
    return [...new Set(out)];
  }

  footprintFor(type) {
    switch (type) {
      case BT.STADIUM: return [4, 4];
      case BT.UNIVERSITY: return [3, 3];
      case BT.HOSPITAL: case BT.POWER: return [3, 2];
      case BT.TOWER_OFF: case BT.TOWER_RES: return [2, 2];
      case BT.MALL: case BT.FACTORY: case BT.WAREHOUSE: case BT.MARINA: return [3, 2];
      case BT.WATER_PLANT: case BT.WASTE: case BT.SCHOOL: case BT.MUSEUM: case BT.THEATER: return [2, 2];
      case BT.PARK_S: case BT.PLAZA: return [2, 2];
      default: return [2, 2];
    }
  }

  // ------------------------------------------------------------- preview
  clearPreview() {
    for (const c of this.group.children.slice()) { this.group.remove(c); c.geometry?.dispose?.(); }
  }
  showPreview(cells) {
    this.clearPreview();
    if (!cells.length) return;
    const ok = this.validate(cells);
    const geo = new THREE.BoxGeometry(CELL * 0.92, 0.6, CELL * 0.92);
    const mesh = new THREE.InstancedMesh(geo, ok.valid ? this.ghostMat : this.badMat, cells.length);
    const m = new THREE.Matrix4();
    cells.forEach((c, i) => {
      m.makeTranslation(wxc(c % GRID), 0.7 + (this.app.net.roadY[c] || 0), wxc((c / GRID) | 0));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.renderOrder = 20;
    this.group.add(mesh);
    this.previewCost = ok.cost;
    this.app.ui.hint(`${ok.label} — <b>${fmtMoney(ok.cost)}</b>${ok.valid ? '' : ' · <span style="color:#ff8a82">' + ok.reason + '</span>'}`);
  }
  showTransitPreview() {
    this.clearPreview();
    if (this.transitStops.length < 1) return;
    const pts = [];
    for (const s of this.transitStops) pts.push(new THREE.Vector3(wxc(s % GRID), 6, wxc((s / GRID) | 0)));
    if (pts.length > 1) {
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(g, this.lineMat);
      line.renderOrder = 21;
      this.group.add(line);
    }
    const geo = new THREE.SphereGeometry(3.4, 10, 8);
    const mesh = new THREE.InstancedMesh(geo, this.ghostMat, pts.length);
    const m = new THREE.Matrix4();
    pts.forEach((p, i) => { m.makeTranslation(p.x, 6, p.z); mesh.setMatrixAt(i, m); });
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
    const est = this.estimateLine();
    this.app.ui.hint(`${TRANSIT_SPEC[this.sub].label} · ${this.transitStops.length} stops · est. <b>${fmtMoney(est)}</b> — click <b>✓ Finish Line</b>`);
  }
  estimateLine() {
    const spec = TRANSIT_SPEC[this.sub] || TRANSIT_SPEC.bus;
    let len = 0;
    for (let i = 1; i < this.transitStops.length; i++) {
      const a = this.transitStops[i - 1], b = this.transitStops[i];
      len += Math.hypot((a % GRID) - (b % GRID), ((a / GRID) | 0) - ((b / GRID) | 0)) * CELL;
    }
    return Math.round(len / 1000 * spec.costPerKm + this.transitStops.length * spec.stopCost);
  }

  // ------------------------------------------------------------- validation
  validate(cells) {
    const g = this.sim.world.g;
    const T = this.tool;
    let cost = 0, valid = true, reason = '', label = '';
    if (T === 'roads') {
      const cls = this.sub === 'avenue' ? RC.AVENUE : this.sub === 'highway' ? RC.HIGHWAY : RC.STREET;
      label = this.sub === 'upgrade' ? 'Upgrade road' : `Build ${ROAD_SPEC[cls].name.toLowerCase()}`;
      for (const c of cells) {
        if (this.sub === 'upgrade') { if (g.kind[c] === K.ROAD && g.road[c] < RC.HIGHWAY) cost += ROAD_COST[g.road[c] + 1] * 0.6; continue; }
        if (g.kind[c] === K.ROAD && g.road[c] >= cls) continue;
        cost += ROAD_COST[cls] * (g.kind[c] === K.WATER ? 3.2 : g.kind[c] === K.BUILDING ? 1.7 : 1);
      }
    } else if (T === 'zone') {
      label = this.sub === 'dezone' ? 'Clear zoning' : `Zone ${ZONE_SPEC[this.zoneId()].name}`;
      for (const c of cells) if (g.kind[c] !== K.WATER && g.kind[c] !== K.ROAD && g.zone[c] !== this.zoneId()) cost += this.sub === 'dezone' ? 900 : ZONE_COST;
    } else if (T === 'demolish') {
      label = 'Demolish';
      const seen = new Set();
      for (const c of cells) {
        if (this.sub === 'road') { if (g.kind[c] === K.ROAD) cost += DEMOLISH_COST; }
        else { const b = g.bld[c]; if (b >= 0 && !seen.has(b)) { seen.add(b); cost += DEMOLISH_COST; } }
      }
    } else if (T === 'transit' && this.sub !== 'station') {
      label = 'Transit line'; cost = this.estimateLine();
    } else {
      const spec = this.subtoolsFor(T)?.find(s => s.id === this.sub);
      label = spec ? `Build ${spec.label}` : 'Build';
      cost = spec?.cost || 0;
      for (const c of cells) {
        if (g.kind[c] === K.WATER && this.sub !== BT.MARINA) { valid = false; reason = 'cannot build on water'; }
        if (g.kind[c] === K.ROAD) { valid = false; reason = 'blocked by road'; }
      }
      let road = false;
      for (const c of cells) {
        const x = c % GRID, y = (c / GRID) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
          if (inb(x + dx, y + dy) && g.kind[idx(x + dx, y + dy)] === K.ROAD) road = true;
      }
      if (!road) { valid = false; reason = 'needs road access'; }
    }
    if (!this.sim.mode.unlimited && cost > this.sim.budget.treasury) { valid = false; reason = 'insufficient funds'; }
    return { valid, cost, reason, label };
  }

  zoneId() {
    return { res_low: Z.RES_LOW, res_high: Z.RES_HIGH, comm: Z.COMM, office: Z.OFFICE, ind: Z.IND, mixed: Z.MIXED, dezone: Z.NONE }[this.sub] || Z.NONE;
  }

  // ------------------------------------------------------------- apply
  applyAt(c) {
    this.applyCells(this.brushCells(c));
  }

  applyCells(cells) {
    if (!cells.length) return;
    const v = this.validate(cells);
    if (!v.valid) { this.app.ui.toast(v.reason || 'cannot build here', true); return; }
    const sim = this.sim, g = sim.world.g;
    const touched = [];
    if (this.tool === 'roads') this.buildRoads(cells, touched);
    else if (this.tool === 'zone') this.paintZone(cells, touched);
    else if (this.tool === 'demolish') this.demolish(cells, touched);
    else this.placeBuilding(cells, touched);
    if (!sim.mode.unlimited) sim.budget.treasury -= v.cost;
    this.app.applyWorldEdit(touched);
    this.app.ui.toast(`${v.label} · ${fmtMoney(v.cost)}`);
  }

  buildRoads(cells, touched) {
    const g = this.sim.world.g;
    const cls = this.sub === 'avenue' ? RC.AVENUE : this.sub === 'highway' ? RC.HIGHWAY : RC.STREET;
    for (const c of cells) {
      if (this.sub === 'upgrade') {
        if (g.kind[c] === K.ROAD && g.road[c] < RC.HIGHWAY) { g.road[c]++; touched.push(c); }
        continue;
      }
      if (g.kind[c] === K.WATER) g.bridge[c] = 1;
      if (g.kind[c] === K.BUILDING) this.removeBuildingAt(c, touched);
      g.kind[c] = K.ROAD;
      g.road[c] = Math.max(g.road[c], cls);
      g.bld[c] = -1;
      g.zone[c] = Z.NONE;
      touched.push(c);
    }
  }

  paintZone(cells, touched) {
    const g = this.sim.world.g;
    const z = this.zoneId();
    for (const c of cells) {
      if (g.kind[c] === K.WATER || g.kind[c] === K.ROAD || g.kind[c] === K.RAIL) continue;
      g.zone[c] = z;
      touched.push(c);
    }
  }

  removeBuildingAt(c, touched) {
    const g = this.sim.world.g;
    const bi = g.bld[c];
    if (bi < 0) return;
    const b = this.sim.world.buildings[bi];
    if (!b) return;
    b.demolished = true; b.residents = 0; b.employed = 0;
    const cells = b.cells || [];
    if (cells.length) { for (const cc of cells) { g.bld[cc] = -1; g.kind[cc] = K.EMPTY; touched.push(cc); } }
    else for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
      if (!inb(b.x + i, b.y + j)) continue;
      const cc = idx(b.x + i, b.y + j);
      g.bld[cc] = -1;
      if (g.kind[cc] === K.BUILDING || g.kind[cc] === K.PARK) g.kind[cc] = K.EMPTY;
      touched.push(cc);
    }
    this.app.dirtyBuilding(b);
  }

  demolish(cells, touched) {
    const g = this.sim.world.g;
    for (const c of cells) {
      if (this.sub === 'road') {
        if (g.kind[c] !== K.ROAD) continue;
        g.kind[c] = g.bridge[c] ? K.WATER : K.EMPTY;
        g.road[c] = RC.NONE; g.bridge[c] = 0; g.tunnel[c] = 0;
        touched.push(c);
      } else this.removeBuildingAt(c, touched);
    }
  }

  placeBuilding(cells, touched) {
    const sim = this.sim, g = sim.world.g;
    const type = this.sub;
    const spec = BUILDING_SPEC[type];
    if (!spec) return;
    const size = this.footprintFor(type);
    const x = cells[0] % GRID, y = (cells[0] / GRID) | 0;
    for (const c of cells) this.removeBuildingAt(c, touched);
    const district = sim.world.districts[g.dist[cells[0]]];
    const floors = Math.max(1, Math.round(spec.floors[0] + (spec.floors[1] - spec.floors[0]) * clamp(g.land[cells[0]], 0, 1)));
    const b = makeBuilding(sim.world.buildings.length, type, x, y, size[0], size[1], floors, this.rot || 0, spec.zone, district, this.rng, g);
    b.playerBuilt = true;
    b.construction = 0.05; b.form = 'construction';
    b.litProb = 0.45;
    sim.world.buildings.push(b);
    for (let j = 0; j < size[1]; j++) for (let i = 0; i < size[0]; i++) {
      if (!inb(x + i, y + j)) continue;
      const c = idx(x + i, y + j);
      g.kind[c] = spec.zone === Z.PARK ? K.PARK : K.BUILDING;
      g.bld[c] = b.id; g.zone[c] = spec.zone;
      touched.push(c);
    }
    if (spec.zone === Z.PARK) b.cells = cells.slice();
    sim.economy.buildQueue.push({ b: b.id, days: clamp(Math.round(3 + floors * 0.6 + size[0] * size[1]), 3, 30) });
    sim.log('construction', `${b.name} approved in ${district.name}`, { severity: 'good', building: b.id, focus: cells[0] });
    this.app.dirtyBuilding(b);
  }

  finishLine() {
    const sim = this.sim;
    if (this.transitStops.length < 2) { this.app.ui.toast('A line needs at least two stops', true); return; }
    const type = ['bus', 'metro', 'rail'].includes(this.sub) ? this.sub : 'bus';
    const line = sim.transit.makeLine(type, this.transitStops.slice(), null);
    if (!sim.mode.unlimited && line.buildCost > sim.budget.treasury) {
      this.app.ui.toast(`Not enough funds — ${fmtMoney(line.buildCost)} needed`, true); return;
    }
    const n = sim.transit.lines.filter(l => l.type === type).length + 1;
    line.name = `${type === 'bus' ? 'Bus' : type === 'metro' ? 'Line' : 'Rail'} ${type === 'metro' ? String.fromCharCode(64 + n) : n}`;
    if (!sim.mode.unlimited) sim.budget.treasury -= line.buildCost;
    sim.transit.addLine(line);
    sim.log('transit', `${line.name} opened — ${(line.lengthM / 1000).toFixed(1)} km, ${line.stops.length} stops`, { severity: 'good', focus: line.stops[0] });
    this.transitStops = [];
    this.clearPreview();
    this.app.ui.setSubtools(this.subtoolsFor(this.tool), this.sub, (x) => this.pickSub(x));
    this.app.ui.dirtyMinimap();
    this.app.ui.toast(`${line.name} opened · ${fmtMoney(line.buildCost)}`);
    sim.fields.updateSources(sim);
    sim.fields.updateFields(sim);
    this.app.overlays.repaint();
  }
}
