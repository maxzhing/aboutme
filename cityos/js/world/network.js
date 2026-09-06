// Road network: adjacency, deck heights (bridges/tunnels), intersections,
// traffic signals and shortest-path routing. Pure data — no renderer types.
import { GRID, CELL, K, RC, ROAD_SPEC } from '../core/defs.js';
import { Heap } from '../core/heap.js';

const idx = (x, y) => y * GRID + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID;
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function buildNetwork(g) {
  const n = GRID * GRID;
  const nbrStart = new Int32Array(n + 1);
  const deg = new Uint8Array(n);
  let m = 0;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const i = idx(x, y);
    if (g.kind[i] !== K.ROAD) continue;
    let d = 0;
    for (const [dx, dy] of DIRS) if (inb(x + dx, y + dy) && g.kind[idx(x + dx, y + dy)] === K.ROAD) d++;
    deg[i] = d; m += d;
  }
  const nbrList = new Int32Array(m);
  let p = 0;
  for (let i = 0; i < n; i++) {
    nbrStart[i] = p;
    if (g.kind[i] !== K.ROAD) continue;
    const x = i % GRID, y = (i / GRID) | 0;
    for (const [dx, dy] of DIRS) {
      if (!inb(x + dx, y + dy)) continue;
      const j = idx(x + dx, y + dy);
      if (g.kind[j] === K.ROAD) nbrList[p++] = j;
    }
  }
  nbrStart[n] = p;

  // Deck height field: bridges ride above the water, tunnels dive under the CBD.
  const roadY = new Float32Array(n);
  const fixed = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (g.kind[i] !== K.ROAD) continue;
    if (g.bridge[i]) { roadY[i] = 7.5; fixed[i] = 1; }
    else if (g.tunnel[i]) { roadY[i] = -9.0; fixed[i] = 1; }
  }
  for (let pass = 0; pass < 14; pass++) {
    const next = roadY.slice();
    for (let i = 0; i < n; i++) {
      if (g.kind[i] !== K.ROAD || fixed[i]) continue;
      let s = roadY[i], c = 1;
      for (let k = nbrStart[i]; k < nbrStart[i + 1]; k++) { s += roadY[nbrList[k]]; c++; }
      next[i] = s / c;
    }
    roadY.set(next);
  }
  for (let i = 0; i < n; i++) if (Math.abs(roadY[i]) < 0.05) roadY[i] = 0;

  // Capacity + free-flow speed per cell
  const cap = new Float32Array(n), freeSpeed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (g.kind[i] !== K.ROAD) continue;
    const spec = ROAD_SPEC[g.road[i]] || ROAD_SPEC[RC.STREET];
    cap[i] = spec.capacity; freeSpeed[i] = spec.speed;
    g.speed[i] = spec.speed;
  }

  // Intersections + signals
  const lights = [];
  const lightAt = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (g.kind[i] !== K.ROAD || deg[i] < 3) continue;
    const x = i % GRID, y = (i / GRID) | 0;
    if (g.road[i] === RC.HIGHWAY) continue;         // grade-separated, no signal
    let major = g.road[i] === RC.AVENUE;
    for (const [dx, dy] of DIRS) {
      if (inb(x + dx, y + dy) && g.road[idx(x + dx, y + dy)] >= RC.AVENUE) major = true;
    }
    if (!major && deg[i] < 4) continue;             // minor T-junctions get a stop sign instead
    lightAt[i] = lights.length;
    lights.push({ cell: i, x, y, green: 0, t: (i * 7919) % 60, ns: 26, ew: 26, amber: 4, major });
  }
  const stopSigns = [];
  for (let i = 0; i < n; i++) {
    if (g.kind[i] === K.ROAD && deg[i] >= 3 && lightAt[i] === -1 && g.road[i] !== RC.HIGHWAY) stopSigns.push(i);
  }

  return { nbrStart, nbrList, deg, roadY, cap, freeSpeed, lights, lightAt, stopSigns, n };
}

// ---- routing -------------------------------------------------------------
// A* over the cell grid. `timeCost` gives the minutes to traverse each cell, so
// congestion, closures and road class all feed the same router.
const _g = new Float64Array(GRID * GRID);
const _f = new Float64Array(GRID * GRID);
const _came = new Int32Array(GRID * GRID);
const _seen = new Int32Array(GRID * GRID);
const _heap = new Heap(GRID * GRID * 3);
let _stamp = 0;

export function findPath(net, g, start, goal, timeCost) {
  if (start === goal) return [start];
  if (g.kind[start] !== K.ROAD || g.kind[goal] !== K.ROAD) return null;
  _stamp++;
  _heap.clear();
  const gx = goal % GRID, gy = (goal / GRID) | 0;
  const HW = (CELL / 1000) / 100 * 60;      // optimistic minutes per cell
  _seen[start] = _stamp; _g[start] = 0; _came[start] = -1;
  _heap.push(start, 0);
  let guard = 0;
  while (_heap.n > 0 && guard++ < 90000) {
    _heap.pop();
    const cur = _heap.topV, fd = _heap.topD;
    if (cur === goal) {
      const path = [];
      let c = cur;
      while (c !== -1) { path.push(c); c = _came[c]; }
      path.reverse();
      return path;
    }
    if (fd > _f[cur] + 1e-7 && _f[cur] > 0) continue;
    const gc = _g[cur];
    for (let k = net.nbrStart[cur], kEnd = net.nbrStart[cur + 1]; k < kEnd; k++) {
      const nb = net.nbrList[k];
      const t = timeCost[nb];
      if (t >= 1e6) continue;
      const tentative = gc + t;
      if (_seen[nb] === _stamp && tentative >= _g[nb] - 1e-12) continue;
      _seen[nb] = _stamp; _g[nb] = tentative; _came[nb] = cur;
      const h = (Math.abs((nb % GRID) - gx) + Math.abs(((nb / GRID) | 0) - gy)) * HW;
      _f[nb] = tentative + h;
      _heap.push(nb, _f[nb]);
    }
  }
  return null;
}

// Multi-source Dijkstra producing a distance (travel time, minutes) field —
// used for accessibility metrics, service coverage and transit catchments.
export function dijkstraField(net, g, sources, timeCost, maxT = 60) {
  const n = GRID * GRID;
  const dist = new Float64Array(n).fill(Infinity);
  const heap = new Heap(n * 3);
  for (const s of sources) { if (g.kind[s] === K.ROAD) { dist[s] = 0; heap.push(s, 0); } }
  while (heap.n > 0) {
    heap.pop();
    const v = heap.topV, d = heap.topD;
    if (d > dist[v] + 1e-7) continue;
    if (d > maxT) continue;
    for (let k = net.nbrStart[v]; k < net.nbrStart[v + 1]; k++) {
      const nb = net.nbrList[k];
      const nd = d + Math.min(timeCost[nb], 5);
      if (nd < dist[nb]) { dist[nb] = nd; heap.push(nb, nd); }
    }
  }
  return dist;
}

// Nearest road cell to an arbitrary tile (buildings connect to the network here).
export function nearestRoad(g, x, y, maxR = 6) {
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy;
      if (inb(nx, ny) && g.kind[idx(nx, ny)] === K.ROAD) return idx(nx, ny);
    }
  }
  return -1;
}

export function updateSignals(net, dtSec) {
  for (const L of net.lights) {
    L.t += dtSec;
    const total = L.ns + L.ew + L.amber * 2;
    if (L.t >= total) L.t -= total;
    if (L.t < L.ns) L.green = 0;                 // north-south flowing
    else if (L.t < L.ns + L.amber) L.green = 2;  // amber
    else if (L.t < L.ns + L.amber + L.ew) L.green = 1; // east-west flowing
    else L.green = 3;                            // amber
  }
}
