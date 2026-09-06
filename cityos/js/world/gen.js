// Procedural generation of the starting metropolis: terrain, water, road hierarchy,
// districts, blocks, zoning and the initial building stock.
import { RNG, Noise2D, clamp, smoothstep } from '../core/rng.js';
import { GRID, CELL, K, RC, Z, BT, BUILDING_SPEC, DISTRICT_TYPES } from '../core/defs.js';

const idx = (x, y) => y * GRID + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID;

export function createGrids() {
  const n = GRID * GRID;
  return {
    kind: new Uint8Array(n), road: new Uint8Array(n), zone: new Uint8Array(n),
    dist: new Uint8Array(n).fill(255), bld: new Int32Array(n).fill(-1),
    bridge: new Uint8Array(n), tunnel: new Uint8Array(n), block: new Int32Array(n).fill(-1),
    elev: new Float32Array(n), land: new Float32Array(n), pol: new Float32Array(n),
    noise: new Float32Array(n), crime: new Float32Array(n), green: new Float32Array(n),
    vol: new Float32Array(n), speed: new Float32Array(n), transit: new Float32Array(n),
    service: new Float32Array(n), power: new Float32Array(n),
  };
}

// ---------------------------------------------------------------- terrain + water
// The shoreline is a pure function of the seed so the renderer can extend the
// same coast far beyond the playable grid without storing extra data.
export function makeTerrainFns(seed) {
  const nz = new Noise2D(seed + 11), nz2 = new Noise2D(seed + 29);
  const riverX = (y) => {
    const t = y / GRID;
    return GRID * 0.70 - GRID * 0.30 * t + 13 * Math.sin(t * 6.1 + 1.2) + 9 * nz2.fbm(t * 3, 4.5, 3);
  };
  const bayY = (x) => GRID * 0.855 + 7 * nz.fbm(x * 0.045, 9.1, 3) - 4 * Math.sin(x * 0.07);
  const isWater = (x, y) => {
    const rw = 3.2 + 1.6 * Math.sin(y * 0.09) + 1.2 * nz.fbm(y * 0.08, 3.3, 2);
    if (Math.abs(x - riverX(y)) < rw) return true;
    if (y > bayY(x)) return true;
    const dl = Math.hypot(x - GRID * 0.155, y - GRID * 0.235);
    if (dl < 5.4 + 1.8 * nz2.fbm(x * 0.2, y * 0.2, 2)) return true;
    // open sea beyond the western and eastern headlands
    if (x < -26 + 10 * nz.fbm(y * 0.05, 2.2, 2)) return true;
    if (x > GRID + 30 + 12 * nz.fbm(y * 0.05, 7.7, 2)) return true;
    return false;
  };
  const relief = (x, y) => nz.fbm(x * 0.012, y * 0.012, 4) * 26 + nz2.fbm(x * 0.04, y * 0.04, 3) * 7;
  return { riverX, bayY, isWater, relief, nz, nz2 };
}

function genTerrain(g, rng, seed) {
  const T = makeTerrainFns(seed);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = idx(x, y);
      g.elev[i] = 3.2;
      if (T.isWater(x, y)) { g.kind[i] = K.WATER; g.elev[i] = 0; }
    }
  }
  return T;
}

// ---------------------------------------------------------------- districts
const DISTRICT_LAYOUT = [
  { key: 'downtown',    x: 0.44, y: 0.40, r: 1.00, name: 'Downtown' },
  { key: 'financial',   x: 0.56, y: 0.29, r: 0.80, name: 'Financial District' },
  { key: 'arts',        x: 0.31, y: 0.32, r: 0.78, name: 'Arts District' },
  { key: 'university',  x: 0.19, y: 0.55, r: 0.86, name: 'University District' },
  { key: 'waterfront',  x: 0.52, y: 0.63, r: 0.82, name: 'Waterfront' },
  { key: 'residential', x: 0.30, y: 0.72, r: 0.92, name: 'Northgate' },
  { key: 'residential', x: 0.72, y: 0.52, r: 0.92, name: 'Eastside' },
  { key: 'suburbs',     x: 0.16, y: 0.14, r: 1.02, name: 'Cedar Hills' },
  { key: 'suburbs',     x: 0.84, y: 0.80, r: 1.02, name: 'Lakeview' },
  { key: 'industrial',  x: 0.80, y: 0.16, r: 0.95, name: 'Ironworks' },
  { key: 'port',        x: 0.66, y: 0.86, r: 0.85, name: 'Harbor Point' },
];

function genDistricts(g, rng, seed) {
  const nz = new Noise2D(seed + 71);
  const districts = DISTRICT_LAYOUT.map((d, i) => ({
    id: i, key: d.key, name: d.name, label: DISTRICT_TYPES[d.key].label,
    color: DISTRICT_TYPES[d.key].color, cx: d.x * GRID, cy: d.y * GRID,
    r: d.r, cells: 0, custom: false,
  }));
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const i = idx(x, y);
    let best = 0, bestD = Infinity;
    const jx = x + nz.fbm(x * 0.05, y * 0.05, 3) * 9, jy = y + nz.fbm(x * 0.05 + 40, y * 0.05 + 40, 3) * 9;
    for (const d of districts) {
      const dd = Math.hypot(jx - d.cx, jy - d.cy) / d.r;
      if (dd < bestD) { bestD = dd; best = d.id; }
    }
    g.dist[i] = best;
    if (g.kind[i] !== K.WATER) districts[best].cells++;
  }
  return districts;
}

// ---------------------------------------------------------------- roads
function paint(g, x, y, cls) {
  if (!inb(x, y)) return false;
  const i = idx(x, y);
  if (g.kind[i] === K.WATER) { g.kind[i] = K.ROAD; g.road[i] = Math.max(g.road[i], cls); g.bridge[i] = 1; return true; }
  g.kind[i] = K.ROAD; g.road[i] = Math.max(g.road[i], cls);
  return true;
}
function hline(g, y, x0, x1, cls, thick = 1) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let t = 0; t < thick; t++) paint(g, x, y + t, cls);
}
function vline(g, x, y0, y1, cls, thick = 1) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let t = 0; t < thick; t++) paint(g, x + t, y, cls);
}
function diagLine(g, x0, y0, x1, y1, cls) {
  let x = x0, y = y0;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 4096; guard++) {
    paint(g, x, y, cls);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; paint(g, x, y, cls); }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function genRoads(g, rng, seed, districts) {
  const nz = new Noise2D(seed + 101);
  const M = 4; // map margin

  // 1. Arterial skeleton with jittered spacing (denser toward the core).
  const vs = [], hs = [];
  for (let x = M + rng.int(0, 3); x < GRID - M; ) {
    vs.push(x);
    const coreness = 1 - Math.abs(x - GRID * 0.47) / (GRID * 0.55);
    x += Math.round(rng.float(7, 15) - coreness * 3.2);
  }
  for (let y = M + rng.int(0, 3); y < GRID - M; ) {
    hs.push(y);
    const coreness = 1 - Math.abs(y - GRID * 0.45) / (GRID * 0.55);
    y += Math.round(rng.float(7, 15) - coreness * 3.2);
  }
  for (const x of vs) vline(g, x, M, GRID - M - 1, RC.AVENUE);
  for (const y of hs) hline(g, y, M, GRID - M - 1, RC.AVENUE);

  // 2. Local street infill per superblock, spacing driven by district density.
  for (let a = 0; a < vs.length - 1; a++) {
    for (let b = 0; b < hs.length - 1; b++) {
      const x0 = vs[a], x1 = vs[a + 1], y0 = hs[b], y1 = hs[b + 1];
      const cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
      const dk = DISTRICT_LAYOUT[g.dist[idx(cx, cy)]]?.key || 'residential';
      const dens = DISTRICT_TYPES[dk].densityBias;
      const step = dens > 0.8 ? rng.int(3, 4) : dens > 0.45 ? rng.int(4, 6) : rng.int(5, 8);
      const curvy = dk === 'suburbs';
      for (let x = x0 + step; x < x1 - 1; x += step + rng.int(-1, 1)) {
        if (curvy && rng.bool(0.45)) { // gently curved suburban street
          let px = x;
          for (let y = y0; y <= y1; y++) {
            paint(g, px, y, RC.STREET);
            if (rng.bool(0.16) && y > y0 + 2 && y < y1 - 2) { px += rng.bool() ? 1 : -1; paint(g, px, y, RC.STREET); }
          }
        } else vline(g, x, y0, y1, RC.STREET);
      }
      for (let y = y0 + step; y < y1 - 1; y += step + rng.int(-1, 1)) {
        if (curvy && rng.bool(0.35)) {
          let py = y;
          for (let x = x0; x <= x1; x++) {
            paint(g, x, py, RC.STREET);
            if (rng.bool(0.16) && x > x0 + 2 && x < x1 - 2) { py += rng.bool() ? 1 : -1; paint(g, x, py, RC.STREET); }
          }
        } else hline(g, y, x0, x1, RC.STREET);
      }
    }
  }

  // 3. Two diagonal boulevards radiating from the core — breaks up the grid.
  diagLine(g, Math.round(GRID * 0.20), Math.round(GRID * 0.10), Math.round(GRID * 0.60), Math.round(GRID * 0.55), RC.AVENUE);
  diagLine(g, Math.round(GRID * 0.88), Math.round(GRID * 0.22), Math.round(GRID * 0.46), Math.round(GRID * 0.60), RC.AVENUE);

  // 4. Ring highway + two radial spurs, thick (2 cells) so it reads as a freeway.
  const r0 = Math.round(GRID * 0.115), r1 = Math.round(GRID * 0.885);
  hline(g, r0, r0, r1, RC.HIGHWAY, 2);
  hline(g, r1, r0, r1, RC.HIGHWAY, 2);
  vline(g, r0, r0, r1, RC.HIGHWAY, 2);
  vline(g, r1, r0, r1, RC.HIGHWAY, 2);
  vline(g, Math.round(GRID * 0.47), 0, r0, RC.HIGHWAY, 2);
  vline(g, Math.round(GRID * 0.47), r1, GRID - 1, RC.HIGHWAY, 2);
  hline(g, Math.round(GRID * 0.45), 0, r0, RC.HIGHWAY, 2);

  // 5. A cross-town expressway that tunnels beneath the CBD.
  const ty = Math.round(GRID * 0.38);
  hline(g, ty, r0, r1, RC.HIGHWAY, 2);
  const tx0 = Math.round(GRID * 0.38), tx1 = Math.round(GRID * 0.54);
  for (let x = tx0; x <= tx1; x++) for (let t = 0; t < 2; t++) g.tunnel[idx(x, ty + t)] = 1;

  // 6. Heavy rail corridor with stations, running along the eastern flank.
  const railX = Math.round(GRID * 0.665);
  const rail = [];
  for (let y = 2; y < GRID - 2; y++) {
    const x = railX + Math.round(3 * Math.sin(y * 0.05));
    for (const xx of [x, x + 1]) {
      const i = idx(xx, y);
      if (g.kind[i] === K.ROAD) continue;      // level crossings stay road
      g.kind[i] = K.RAIL;
      if (g.kind[i] === K.WATER) g.bridge[i] = 1;
    }
    rail.push([x, y]);
  }
  return { rail, arterialsV: vs, arterialsH: hs };
}

// ---------------------------------------------------------------- blocks
function genBlocks(g) {
  const blocks = [];
  const stack = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const s = idx(x, y);
    if (g.block[s] !== -1) continue;
    if (g.kind[s] !== K.EMPTY) continue;
    const cells = [];
    stack.length = 0; stack.push(s);
    g.block[s] = blocks.length;
    while (stack.length) {
      const c = stack.pop(); cells.push(c);
      const cx = c % GRID, cy = (c / GRID) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!inb(nx, ny)) continue;
        const ni = idx(nx, ny);
        if (g.block[ni] !== -1 || g.kind[ni] !== K.EMPTY) continue;
        g.block[ni] = blocks.length; stack.push(ni);
      }
    }
    blocks.push({ id: blocks.length, cells, zone: Z.NONE, dist: g.dist[s] });
  }
  return blocks;
}

// ---------------------------------------------------------------- land value seed
export function seedLandValue(g, districts) {
  const cbd = districts.find(d => d.key === 'downtown');
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const i = idx(x, y);
    const dc = Math.hypot(x - cbd.cx, y - cbd.cy) / (GRID * 0.5);
    let v = 0.72 * Math.exp(-dc * 1.5) + 0.18;
    // waterfront premium
    let wd = 99;
    for (let r = 1; r <= 6 && wd === 99; r++) {
      for (let a = 0; a < 12; a++) {
        const nx = x + Math.round(r * Math.cos(a * 0.5236)), ny = y + Math.round(r * Math.sin(a * 0.5236));
        if (inb(nx, ny) && g.kind[idx(nx, ny)] === K.WATER) { wd = r; break; }
      }
    }
    if (wd < 7) v += 0.22 * (1 - wd / 7);
    g.land[i] = clamp(v, 0.05, 1);
  }
}

// ---------------------------------------------------------------- zoning + buildings
function zoneBlocks(g, rng, blocks, districts) {
  for (const b of blocks) {
    const d = districts[b.dist];
    const spec = DISTRICT_TYPES[d.key];
    // Blocks far from any road become parkland instead of dead space.
    let roadTouch = 0;
    for (const c of b.cells) {
      const cx = c % GRID, cy = (c / GRID) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (inb(cx + dx, cy + dy) && g.kind[idx(cx + dx, cy + dy)] === K.ROAD) { roadTouch++; break; }
      }
    }
    if (b.cells.length > 3 && roadTouch / b.cells.length < 0.18) { b.zone = Z.PARK; }
    else b.zone = rng.weighted(spec.zones);
    for (const c of b.cells) g.zone[c] = b.zone;
  }
}

const RES_NAMES = ['Alder', 'Birchwood', 'Cedar', 'Dunmore', 'Elmhurst', 'Fairview', 'Grantly', 'Harborview', 'Ivywood', 'Juniper', 'Kingsley', 'Larkspur', 'Maple', 'Northcrest', 'Oakridge', 'Pinehurst', 'Quarry', 'Rosewood', 'Stonegate', 'Thornbury', 'Umberton', 'Vinehill', 'Westbrook', 'Yardley'];
const RES_SUFFIX = ['Court', 'Residences', 'Apartments', 'Terrace', 'Lofts', 'Commons', 'Place', 'House', 'Gardens'];
const CORP = ['Novatech', 'Aurelia', 'Halcyon', 'Meridian', 'Kestrel', 'Vantage', 'Orion', 'Solstice', 'Ardent', 'Brightline', 'Cobalt', 'Delphi', 'Evergreen', 'Fulcrum', 'Granite', 'Helios', 'Ironclad', 'Juno', 'Lattice', 'Monolith', 'Nimbus', 'Obsidian', 'Pinnacle', 'Quantum', 'Redstone', 'Summit', 'Tessera', 'Vertex', 'Waypoint', 'Zenith'];
const CORP_SUFFIX = ['Tower', 'Center', 'Plaza', 'House', 'Works', 'Group', 'Holdings', 'Labs', 'Industries', 'Partners'];
const SHOP = ['Market', 'Emporium', 'Corner Store', 'Grocers', 'Bookshop', 'Outfitters', 'Bakery', 'Pharmacy', 'Hardware', 'Boutique'];
const FOOD = ['Bistro', 'Noodle Bar', 'Taqueria', 'Coffee House', 'Brasserie', 'Pizzeria', 'Diner', 'Ramen', 'Grill', 'Tea Room'];

function nameFor(type, rng, district) {
  switch (type) {
    case BT.HOUSE: case BT.ROWHOUSE: return `${rng.pick(RES_NAMES)} ${rng.pick(['St', 'Ave', 'Lane', 'Row'])} Homes`;
    case BT.APARTMENT: case BT.TOWER_RES: return `${rng.pick(RES_NAMES)} ${rng.pick(RES_SUFFIX)}`;
    case BT.OFFICE: case BT.TOWER_OFF: return `${rng.pick(CORP)} ${rng.pick(CORP_SUFFIX)}`;
    case BT.SHOP: return `${rng.pick(RES_NAMES)} ${rng.pick(SHOP)}`;
    case BT.RESTAURANT: return `The ${rng.pick(RES_NAMES)} ${rng.pick(FOOD)}`;
    case BT.MALL: return `${rng.pick(RES_NAMES)} Shopping Centre`;
    case BT.FACTORY: return `${rng.pick(CORP)} Works`;
    case BT.WAREHOUSE: return `${rng.pick(CORP)} Logistics`;
    case BT.SCHOOL: return `${rng.pick(RES_NAMES)} School`;
    case BT.UNIVERSITY: return `${district.name.split(' ')[0]} University`;
    case BT.HOSPITAL: return `${rng.pick(RES_NAMES)} General Hospital`;
    case BT.POLICE: return `${district.name} Police Precinct`;
    case BT.FIRE: return `Fire Station ${rng.int(1, 28)}`;
    case BT.MUSEUM: return `${rng.pick(RES_NAMES)} Museum`;
    case BT.THEATER: return `The ${rng.pick(RES_NAMES)} Theatre`;
    case BT.STADIUM: return `${rng.pick(CORP)} Arena`;
    case BT.STATION: return `${district.name} Station`;
    case BT.PARK_S: return `${rng.pick(RES_NAMES)} Park`;
    case BT.PLAZA: return `${rng.pick(RES_NAMES)} Plaza`;
    case BT.MARINA: return `${rng.pick(RES_NAMES)} Marina`;
    case BT.POWER: return `${rng.pick(RES_NAMES)} Generating Station`;
    case BT.WATER_PLANT: return `${rng.pick(RES_NAMES)} Water Works`;
    case BT.WASTE: return `${rng.pick(RES_NAMES)} Recycling Centre`;
    case BT.PARKING: return `${rng.pick(RES_NAMES)} Parking`;
    default: return BUILDING_SPEC[type]?.label || 'Building';
  }
}

function pickType(zone, rng, land, dens, quotas) {
  switch (zone) {
    case Z.RES_LOW:  return rng.bool(0.72) ? BT.HOUSE : BT.ROWHOUSE;
    case Z.RES_HIGH: return (land > 0.62 && rng.bool(0.35 + dens * 0.4)) ? BT.TOWER_RES : BT.APARTMENT;
    case Z.COMM:     return rng.weighted([[BT.SHOP, 5], [BT.RESTAURANT, 3], [BT.MALL, 1], [BT.PARKING, 0.7]]);
    case Z.OFFICE:   return (land > 0.6 && rng.bool(0.3 + dens * 0.5)) ? BT.TOWER_OFF : BT.OFFICE;
    case Z.IND:      return rng.bool(0.55) ? BT.FACTORY : BT.WAREHOUSE;
    case Z.MIXED:    return rng.weighted([[BT.SHOP, 3], [BT.APARTMENT, 4], [BT.RESTAURANT, 2], [BT.OFFICE, 2]]);
    case Z.PARK:     return rng.bool(0.75) ? BT.PARK_S : BT.PLAZA;
    case Z.CIVIC: {
      const need = ['school', 'police', 'fire', 'hospital', 'museum', 'theater'].filter(k => (quotas[k] || 0) > 0);
      if (need.length) { const k = rng.pick(need); quotas[k]--; return k; }
      return rng.bool(0.5) ? BT.OFFICE : BT.APARTMENT;
    }
    default: return BT.HOUSE;
  }
}

function facingOf(g, x, y, w, h) {
  // Return the direction (radians) the facade should face: toward the nearest road.
  const checks = [
    { dir: 0, n: 0 }, { dir: Math.PI / 2, n: 0 }, { dir: Math.PI, n: 0 }, { dir: -Math.PI / 2, n: 0 },
  ];
  for (let i = 0; i < w; i++) {
    if (inb(x + i, y - 1) && g.kind[idx(x + i, y - 1)] === K.ROAD) checks[3].n++;
    if (inb(x + i, y + h) && g.kind[idx(x + i, y + h)] === K.ROAD) checks[1].n++;
  }
  for (let j = 0; j < h; j++) {
    if (inb(x - 1, y + j) && g.kind[idx(x - 1, y + j)] === K.ROAD) checks[2].n++;
    if (inb(x + w, y + j) && g.kind[idx(x + w, y + j)] === K.ROAD) checks[0].n++;
  }
  checks.sort((a, b) => b.n - a.n);
  return { rot: checks[0].dir, hasRoad: checks[0].n > 0 };
}

function genBuildings(g, rng, blocks, districts, buildings) {
  const quotas = { school: 12, police: 7, fire: 8, hospital: 5, museum: 3, theater: 3 };
  const order = rng.shuffle(blocks.slice());
  for (const b of order) {
    const d = districts[b.dist];
    const dens = DISTRICT_TYPES[d.key].densityBias;
    if (b.zone === Z.PARK) { makeParkBlock(g, rng, b, d, buildings); continue; }
    const cells = rng.shuffle(b.cells.slice());
    for (const c of cells) {
      if (g.bld[c] !== -1 || g.kind[c] !== K.EMPTY) continue;
      const x = c % GRID, y = (c / GRID) | 0;
      const land = g.land[c];
      const type = pickType(b.zone, rng, land, dens, quotas);
      const spec = BUILDING_SPEC[type];
      // footprint sizing
      let maxW = 1, maxH = 1;
      if (type === BT.HOUSE) { maxW = 1; maxH = 1; }
      else if (type === BT.ROWHOUSE) { maxW = rng.int(1, 2); maxH = 1; }
      else if (type === BT.TOWER_OFF || type === BT.TOWER_RES) { maxW = rng.int(2, 3); maxH = rng.int(2, 3); }
      else if (type === BT.MALL || type === BT.FACTORY || type === BT.WAREHOUSE) { maxW = rng.int(2, 4); maxH = rng.int(2, 3); }
      else if (type === BT.HOSPITAL || type === BT.UNIVERSITY) { maxW = rng.int(2, 3); maxH = rng.int(2, 3); }
      else if (type === BT.PARK_S || type === BT.PLAZA) { maxW = rng.int(1, 2); maxH = rng.int(1, 2); }
      else { maxW = rng.int(1, 2); maxH = rng.int(1, 2); }
      let w = maxW, h = maxH;
      // shrink until it fits inside the block
      let fits = false;
      for (; w >= 1; w--) {
        for (let hh = h; hh >= 1; hh--) {
          let ok = true;
          for (let j = 0; j < hh && ok; j++) for (let i = 0; i < w; i++) {
            const nx = x + i, ny = y + j;
            if (!inb(nx, ny) || g.kind[idx(nx, ny)] !== K.EMPTY || g.bld[idx(nx, ny)] !== -1 || g.block[idx(nx, ny)] !== b.id) { ok = false; break; }
          }
          if (ok) { h = hh; fits = true; break; }
        }
        if (fits) break;
      }
      if (!fits) continue;
      const face = facingOf(g, x, y, w, h);
      if (!face.hasRoad && rng.bool(0.6)) continue; // keep interior of blocks as yards
      const bi = buildings.length;
      const floors = Math.max(1, Math.round(
        spec.floors[0] + (spec.floors[1] - spec.floors[0]) * Math.pow(clamp(land * (0.45 + dens) * rng.float(0.55, 1.35), 0, 1), 1.35)
      ));
      const bld = makeBuilding(bi, type, x, y, w, h, floors, face.rot, b.zone, d, rng, g);
      buildings.push(bld);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const ii = idx(x + i, y + j);
        g.bld[ii] = bi; g.kind[ii] = K.BUILDING;
      }
    }
  }
}

export function makeBuilding(id, type, x, y, w, h, floors, rot, zone, district, rng, g) {
  const spec = BUILDING_SPEC[type];
  const area = w * h;
  const fl = Math.max(1, floors);
  const b = {
    id, type, form: spec.form, x, y, w, h, rot, zone,
    district: district.id, name: nameFor(type, rng, district),
    floors: fl,
    height: 0,
    seed: rng.int(0, 1e9),
    capacity: Math.round(spec.res * area * fl),
    residents: 0,
    jobs: Math.round(spec.jobs * area * fl),
    employed: 0,
    condition: 1,
    age: rng.int(0, 40),
    powerDemand: spec.power * area * fl * 0.1,
    waterDemand: spec.water * area * fl * 0.1,
    wasteOut: spec.waste * area * fl * 0.06,
    pollution: spec.pol * area * (spec.form === 'factory' ? fl : 1),
    value: 0, rent: 0, revenue: 0, visitors: 0, trips: 0,
    powered: true, watered: true, onFire: 0, abandoned: false, construction: 0,
    built: 0,
  };
  b.height = floorHeight(type) * fl + (spec.form === 'tower' ? 6 : 0);
  b.value = Math.round((g ? g.land[y * GRID + x] : 0.5) * area * fl * 62000 + area * 40000);
  b.rent = Math.round(600 + (g ? g.land[y * GRID + x] : 0.5) * 2400);
  return b;
}

export function floorHeight(type) {
  switch (type) {
    case BT.HOUSE: case BT.ROWHOUSE: return 3.4;
    case BT.FACTORY: case BT.WAREHOUSE: return 7.5;
    case BT.MALL: return 5.6;
    case BT.TOWER_OFF: return 4.0;
    case BT.TOWER_RES: return 3.3;
    case BT.OFFICE: return 3.9;
    case BT.STADIUM: return 26;
    case BT.PARK_S: case BT.PLAZA: return 0.4;
    default: return 3.6;
  }
}

function makeParkBlock(g, rng, b, d, buildings) {
  // Turn the whole block into parkland with one park record for statistics.
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const c of b.cells) {
    const x = c % GRID, y = (c / GRID) | 0;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    g.kind[c] = K.PARK; g.zone[c] = Z.PARK; g.green[c] = 1;
  }
  const type = (b.cells.length <= 2 && rng.bool(0.5)) ? BT.PLAZA : BT.PARK_S;
  const bi = buildings.length;
  const bld = makeBuilding(bi, type, minX, minY, maxX - minX + 1, maxY - minY + 1, 1, 0, Z.PARK, d, rng, g);
  bld.cells = b.cells.slice();
  buildings.push(bld);
  for (const c of b.cells) g.bld[c] = bi;
}

// ---------------------------------------------------------------- landmarks
function placeLandmarks(g, rng, districts, buildings) {
  const wants = [
    { type: BT.UNIVERSITY, dk: 'university', size: [3, 3] },
    { type: BT.STADIUM, dk: 'waterfront', size: [4, 4] },
    { type: BT.POWER, dk: 'industrial', size: [3, 2] },
    { type: BT.POWER, dk: 'port', size: [3, 2] },
    { type: BT.WATER_PLANT, dk: 'port', size: [2, 2] },
    { type: BT.WASTE, dk: 'industrial', size: [2, 2] },
    { type: BT.HOSPITAL, dk: 'residential', size: [3, 2] },
    { type: BT.MUSEUM, dk: 'arts', size: [2, 2] },
    { type: BT.THEATER, dk: 'arts', size: [2, 2] },
    { type: BT.MARINA, dk: 'waterfront', size: [3, 2] },
    { type: BT.BUS_DEPOT, dk: 'industrial', size: [2, 2] },
  ];
  for (const want of wants) {
    const cands = districts.filter(d => d.key === want.dk);
    if (!cands.length) continue;
    const d = rng.pick(cands);
    let placed = false;
    for (let tries = 0; tries < 900 && !placed; tries++) {
      const x = Math.round(d.cx + rng.gauss(0, 9)), y = Math.round(d.cy + rng.gauss(0, 9));
      const [w, h] = want.size;
      let ok = true;
      for (let j = 0; j < h && ok; j++) for (let i = 0; i < w; i++) {
        const nx = x + i, ny = y + j;
        if (!inb(nx, ny)) { ok = false; break; }
        const ii = idx(nx, ny);
        if (g.kind[ii] === K.ROAD || g.kind[ii] === K.WATER || g.kind[ii] === K.RAIL) { ok = false; break; }
      }
      if (!ok) continue;
      // clear whatever was there
      const removed = new Set();
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const ii = idx(x + i, y + j);
        if (g.bld[ii] >= 0) removed.add(g.bld[ii]);
      }
      for (const r of removed) { const rb = buildings[r]; if (rb) rb.removed = true; }
      const face = facingOf(g, x, y, w, h);
      const spec = BUILDING_SPEC[want.type];
      const bi = buildings.length;
      const bld = makeBuilding(bi, want.type, x, y, w, h, rng.int(spec.floors[0], spec.floors[1]), face.rot, spec.zone, d, rng, g);
      bld.landmark = true;
      buildings.push(bld);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const ii = idx(x + i, y + j); g.bld[ii] = bi; g.kind[ii] = K.BUILDING; g.zone[ii] = spec.zone;
      }
      placed = true;
    }
  }
  // purge buildings displaced by landmarks
  for (let i = 0; i < buildings.length; i++) {
    if (buildings[i] && buildings[i].removed) buildings[i] = null;
  }
}

// ---------------------------------------------------------------- rail stations
function placeStations(g, rng, rail, districts, buildings) {
  const stops = [];
  for (let k = 0; k < rail.length; k += Math.floor(rail.length / 5)) {
    const [x, y] = rail[k];
    for (let tries = 0; tries < 40; tries++) {
      const sx = x + rng.int(2, 4), sy = y + rng.int(-1, 1);
      let ok = true;
      for (let j = 0; j < 2 && ok; j++) for (let i = 0; i < 2; i++) {
        const ii = inb(sx + i, sy + j) ? idx(sx + i, sy + j) : -1;
        if (ii < 0 || g.kind[ii] === K.ROAD || g.kind[ii] === K.WATER || g.kind[ii] === K.RAIL) { ok = false; break; }
      }
      if (!ok) continue;
      const d = districts[g.dist[idx(sx, sy)]];
      const bi = buildings.length;
      const bld = makeBuilding(bi, BT.STATION, sx, sy, 2, 2, 1, 0, Z.CIVIC, d, rng, g);
      buildings.push(bld);
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const ii = idx(sx + i, sy + j);
        if (g.bld[ii] >= 0 && buildings[g.bld[ii]]) buildings[g.bld[ii]] = null;
        g.bld[ii] = bi; g.kind[ii] = K.BUILDING;
      }
      stops.push({ x: sx, y: sy, b: bi });
      break;
    }
  }
  return stops;
}

// ---------------------------------------------------------------- entry point
export function generateWorld(seed) {
  const rng = new RNG(seed);
  const g = createGrids();
  const water = genTerrain(g, rng, seed);
  const districts = genDistricts(g, rng, seed);
  const roads = genRoads(g, rng, seed, districts);
  seedLandValue(g, districts);
  const blocks = genBlocks(g);
  zoneBlocks(g, rng, blocks, districts);
  const buildings = [];
  genBuildings(g, rng, blocks, districts, buildings);
  placeLandmarks(g, rng, districts, buildings);
  const railStops = placeStations(g, rng, roads.rail, districts, buildings);
  // compact building list (landmarks may have nulled entries)
  const compact = [];
  for (const b of buildings) {
    if (!b) continue;
    const nb = b; nb.id = compact.length; compact.push(nb);
  }
  g.bld.fill(-1);
  for (const b of compact) {
    if (b.cells) { for (const c of b.cells) g.bld[c] = b.id; }
    else for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
      if (inb(b.x + i, b.y + j)) g.bld[idx(b.x + i, b.y + j)] = b.id;
    }
  }
  return { g, districts, blocks, buildings: compact, rail: roads.rail, railStops, water };
}
