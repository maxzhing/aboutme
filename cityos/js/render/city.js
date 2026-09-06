// Surface renderer: ground, road decks with curbs and markings, bridges,
// tunnel portals and heavy rail. Built per 16x16-cell chunk so a single edit
// only rebuilds a small piece of geometry.
import * as THREE from 'three';
import { MeshBuilder, hexToRgb } from './geo.js';
import { GRID, CELL, WORLD, CHUNK, CHUNKS, K, RC, ROAD_SPEC, Z } from '../core/defs.js';
import { RNG } from '../core/rng.js';

const idx = (x, y) => y * GRID + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID;
const wx = (x) => (x + 0.5) * CELL - WORLD / 2;

const C = {
  grass: hexToRgb('#4a6238'), grassDry: hexToRgb('#63703e'), lawn: hexToRgb('#4f7c3e'),
  lot: hexToRgb('#6b6459'), plaza: hexToRgb('#857f72'), sand: hexToRgb('#a2937a'),
  asphalt: hexToRgb('#38393c'), asphaltHwy: hexToRgb('#323336'), sidewalk: hexToRgb('#8b8981'),
  curb: hexToRgb('#75736c'), white: hexToRgb('#cfcabc'), yellow: hexToRgb('#c9a63a'),
  rail: hexToRgb('#4a4038'), ballast: hexToRgb('#57534a'), steel: hexToRgb('#8b8b90'),
  bridge: hexToRgb('#5d6068'), pillar: hexToRgb('#6b6e74'), tunnelWall: hexToRgb('#43464c'),
  crosswalk: hexToRgb('#a9a496'),
};

export class CitySurface {
  constructor(scene, world, net) {
    this.scene = scene; this.world = world; this.net = net;
    this.group = new THREE.Group();
    this.group.name = 'surface';
    scene.add(this.group);
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0.02 });
    this.chunks = new Array(CHUNKS * CHUNKS).fill(null);
    this.rebuildAll();
  }

  rebuildAll() { for (let c = 0; c < CHUNKS * CHUNKS; c++) this.rebuildChunk(c % CHUNKS, (c / CHUNKS) | 0); }

  markDirtyCell(x, y) {
    const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && ny >= 0 && nx < CHUNKS && ny < CHUNKS) this.rebuildChunk(nx, ny);
    }
  }

  rebuildChunk(cx, cy) {
    const ci = cy * CHUNKS + cx;
    const old = this.chunks[ci];
    if (old) { this.group.remove(old); old.geometry.dispose(); }
    const mb = new MeshBuilder();
    const g = this.world.g, net = this.net;
    const rng = new RNG(ci * 7841 + 13);
    for (let y = cy * CHUNK; y < (cy + 1) * CHUNK; y++) {
      for (let x = cx * CHUNK; x < (cx + 1) * CHUNK; x++) {
        this.emitCell(mb, g, net, x, y, rng);
      }
    }
    if (mb.isEmpty()) { this.chunks[ci] = null; return; }
    const mesh = new THREE.Mesh(mb.build(), this.mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.userData.chunk = ci;
    this.group.add(mesh);
    this.chunks[ci] = mesh;
  }

  emitCell(mb, g, net, x, y, rng) {
    const i = idx(x, y);
    const k = g.kind[i];
    const cx = wx(x), cz = wx(y), h = CELL / 2;
    if (k === K.WATER) return;

    if (k !== K.ROAD) {
      // --- ground pad
      let col = C.grass;
      if (k === K.PARK) col = C.lawn;
      else if (k === K.PLAZA) col = C.plaza;
      else if (k === K.BUILDING) col = C.lot;
      else if (k === K.RAIL) col = C.ballast;
      else {
        // shoreline sand + dry patches
        let nearWater = false;
        for (let dy = -1; dy <= 1 && !nearWater; dy++) for (let dx = -1; dx <= 1; dx++)
          if (inb(x + dx, y + dy) && g.kind[idx(x + dx, y + dy)] === K.WATER) { nearWater = true; break; }
        col = nearWater ? C.sand : (rng.next() < 0.25 ? C.grassDry : C.grass);
      }
      const j = 0.92 + rng.next() * 0.16;
      mb.rect(cx - h, cz - h, cx + h, cz + h, 0, [col[0] * j, col[1] * j, col[2] * j]);
      this.emitShore(mb, g, x, y, cx, cz, h);
      if (k === K.RAIL) this.emitRail(mb, g, x, y, cx, cz);
      return;
    }

    // --- road cell
    const cls = g.road[i] || RC.STREET;
    const spec = ROAD_SPEC[cls];
    const rw = spec.width / 2;
    const ry = net.roadY[i];
    const isTunnel = g.tunnel[i] === 1;
    const asph = cls === RC.HIGHWAY ? C.asphaltHwy : C.asphalt;

    if (isTunnel) { // tunnel lid: ground continues over the top
      mb.rect(cx - h, cz - h, cx + h, cz + h, 0, C.grass);
      return;
    }

    const E = inb(x + 1, y) && g.kind[idx(x + 1, y)] === K.ROAD;
    const W = inb(x - 1, y) && g.kind[idx(x - 1, y)] === K.ROAD;
    const N = inb(x, y - 1) && g.kind[idx(x, y - 1)] === K.ROAD;
    const S = inb(x, y + 1) && g.kind[idx(x, y + 1)] === K.ROAD;
    const closed = g.closed && g.closed[i];

    const x0 = W ? cx - h : cx - rw, x1 = E ? cx + h : cx + rw;
    const z0 = N ? cz - h : cz - rw, z1 = S ? cz + h : cz + rw;
    const dark = closed ? 0.62 : 1;
    const aC = [asph[0] * dark, asph[1] * dark, asph[2] * dark];

    if (E || W) mb.rect(x0, cz - rw, x1, cz + rw, ry, aC);
    if (N || S) mb.rect(cx - rw, z0, cx + rw, z1, ry, aC);
    if (!E && !W && !N && !S) mb.rect(cx - rw, cz - rw, cx + rw, cz + rw, ry, aC);

    // --- sidewalk slabs (corners always, edges where no through-road)
    const sy = ry + 0.18, sw = h - rw;
    const swc = C.sidewalk;
    const emitWalk = (a0, b0, a1, b1) => {
      mb.rect(a0, b0, a1, b1, sy, swc);
      // curb faces
      mb.wall(a0, b0, a1, b0, ry, 0.18, C.curb);
      mb.wall(a1, b1, a0, b1, ry, 0.18, C.curb);
      mb.wall(a0, b1, a0, b0, ry, 0.18, C.curb);
      mb.wall(a1, b0, a1, b1, ry, 0.18, C.curb);
    };
    if (sw > 0.05) {
      emitWalk(cx - h, cz - h, cx - rw, cz - rw);
      emitWalk(cx + rw, cz - h, cx + h, cz - rw);
      emitWalk(cx - h, cz + rw, cx - rw, cz + h);
      emitWalk(cx + rw, cz + rw, cx + h, cz + h);
      if (!N) emitWalk(cx - rw, cz - h, cx + rw, cz - rw);
      if (!S) emitWalk(cx - rw, cz + rw, cx + rw, cz + h);
      if (!W) emitWalk(cx - h, cz - rw, cx - rw, cz + rw);
      if (!E) emitWalk(cx + h, cz - rw, cx + rw, cz + rw);
    }

    // --- lane markings
    const my = ry + 0.03;
    const deg = (E ? 1 : 0) + (W ? 1 : 0) + (N ? 1 : 0) + (S ? 1 : 0);
    const inter = deg >= 3;
    if (!inter) {
      if (cls === RC.HIGHWAY) {
        if (E && W) { for (const off of [-rw * 0.34, rw * 0.34]) this.dash(mb, cx - h, cz + off, cx + h, cz + off, my, 0.22, C.white, true); 
          this.solid(mb, cx - h, cz - rw + 0.4, cx + h, cz - rw + 0.4, my, 0.22, C.white);
          this.solid(mb, cx - h, cz + rw - 0.4, cx + h, cz + rw - 0.4, my, 0.22, C.white); }
        if (N && S) { for (const off of [-rw * 0.34, rw * 0.34]) this.dash(mb, cx + off, cz - h, cx + off, cz + h, my, 0.22, C.white, true);
          this.solid(mb, cx - rw + 0.4, cz - h, cx - rw + 0.4, cz + h, my, 0.22, C.white);
          this.solid(mb, cx + rw - 0.4, cz - h, cx + rw - 0.4, cz + h, my, 0.22, C.white); }
      } else if (cls === RC.AVENUE) {
        if (E && W) { this.solid(mb, cx - h, cz - 0.28, cx + h, cz - 0.28, my, 0.16, C.yellow); this.solid(mb, cx - h, cz + 0.28, cx + h, cz + 0.28, my, 0.16, C.yellow); }
        if (N && S) { this.solid(mb, cx - 0.28, cz - h, cx - 0.28, cz + h, my, 0.16, C.yellow); this.solid(mb, cx + 0.28, cz - h, cx + 0.28, cz + h, my, 0.16, C.yellow); }
      } else {
        if (E && W) this.dash(mb, cx - h, cz, cx + h, cz, my, 0.16, C.white, true);
        if (N && S) this.dash(mb, cx, cz - h, cx, cz + h, my, 0.16, C.white, true);
      }
    } else {
      // crosswalks on every approach + stop bars
      const major = cls >= RC.AVENUE || this.net.lightAt[i] >= 0;
      if (major) {
        const bars = 4;
        if (N) this.zebra(mb, cx, cz - rw + 0.9, rw * 0.86, my, true, bars);
        if (S) this.zebra(mb, cx, cz + rw - 0.9, rw * 0.86, my, true, bars);
        if (W) this.zebra(mb, cx - rw + 0.9, cz, rw * 0.86, my, false, bars);
        if (E) this.zebra(mb, cx + rw - 0.9, cz, rw * 0.86, my, false, bars);
      }
    }

    // --- bridge structure
    this.emitShore(mb, g, x, y, cx, cz, h, ry);
    if (g.bridge[i] || ry > 1.2) this.emitBridge(mb, g, net, x, y, cx, cz, ry, rw, E, W, N, S);
    // --- retaining walls for tunnel ramps
    if (ry < -0.6) {
      const depth = -ry + 0.4;
      if (!N) mb.wall(cx + rw, cz - rw, cx - rw, cz - rw, ry, depth, C.tunnelWall);
      if (!S) mb.wall(cx - rw, cz + rw, cx + rw, cz + rw, ry, depth, C.tunnelWall);
      if (!W) mb.wall(cx - rw, cz + rw, cx - rw, cz - rw, ry, depth, C.tunnelWall);
      if (!E) mb.wall(cx + rw, cz - rw, cx + rw, cz + rw, ry, depth, C.tunnelWall);
      if (E || W) { mb.wall(cx - h, cz - rw, cx + h, cz - rw, ry, depth, C.tunnelWall); mb.wall(cx + h, cz + rw, cx - h, cz + rw, ry, depth, C.tunnelWall); }
      if (N || S) { mb.wall(cx - rw, cz + h, cx - rw, cz - h, ry, depth, C.tunnelWall); mb.wall(cx + rw, cz - h, cx + rw, cz + h, ry, depth, C.tunnelWall); }
    }
  }

  emitShore(mb, g, x, y, cx, cz, h, top = 0) {
    // Retaining edge where land meets water so the coast reads as a bank, not a cut.
    const D = 4.2, col = C.sand, dark = [col[0] * 0.55, col[1] * 0.55, col[2] * 0.5];
    const W = (i) => inb(i % GRID, (i / GRID) | 0) && g.kind[i] === K.WATER;
    if (inb(x, y - 1) && W(idx(x, y - 1))) { mb.wall(cx + h, cz - h, cx - h, cz - h, top - D, D, dark); }
    if (inb(x, y + 1) && W(idx(x, y + 1))) { mb.wall(cx - h, cz + h, cx + h, cz + h, top - D, D, dark); }
    if (inb(x - 1, y) && W(idx(x - 1, y))) { mb.wall(cx - h, cz - h, cx - h, cz + h, top - D, D, dark); }
    if (inb(x + 1, y) && W(idx(x + 1, y))) { mb.wall(cx + h, cz + h, cx + h, cz - h, top - D, D, dark); }
  }

  solid(mb, x0, z0, x1, z1, y, w, col) {
    if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) mb.rect(x0, z0 - w / 2, x1, z0 + w / 2, y, col);
    else mb.rect(x0 - w / 2, z0, x0 + w / 2, z1, y, col);
  }
  dash(mb, x0, z0, x1, z1, y, w, col) {
    const horiz = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const len = horiz ? x1 - x0 : z1 - z0;
    const seg = 2.2, gap = 2.0;
    for (let t = 0; t < len; t += seg + gap) {
      const t1 = Math.min(t + seg, len);
      if (horiz) mb.rect(x0 + t, z0 - w / 2, x0 + t1, z0 + w / 2, y, col);
      else mb.rect(x0 - w / 2, z0 + t, x0 + w / 2, z0 + t1, y, col);
    }
  }
  zebra(mb, cx, cz, rw, y, horiz, n) {
    const stripe = (rw * 2) / (n * 2 - 1);
    for (let s = 0; s < n; s++) {
      const o = -rw + s * stripe * 2;
      if (horiz) mb.rect(cx + o, cz - 0.7, cx + o + stripe, cz + 0.7, y, C.crosswalk);
      else mb.rect(cx - 0.7, cz + o, cx + 0.7, cz + o + stripe, y, C.crosswalk);
    }
  }

  emitBridge(mb, g, net, x, y, cx, cz, ry, rw, E, W, N, S) {
    const h = CELL / 2;
    // deck underside
    mb.rect(cx - h, cz - h, cx + h, cz + h, ry - 0.9, C.bridge);
    const deckEdge = (a0, b0, a1, b1) => mb.wall(a0, b0, a1, b1, ry - 0.9, 0.9, C.bridge);
    deckEdge(cx - h, cz - h, cx + h, cz - h); deckEdge(cx + h, cz + h, cx - h, cz + h);
    deckEdge(cx - h, cz + h, cx - h, cz - h); deckEdge(cx + h, cz - h, cx + h, cz + h);
    // railings along the open sides
    const rail = (a0, b0, a1, b1) => { mb.wall(a0, b0, a1, b1, ry + 0.1, 1.1, C.pillar); mb.wall(a1, b1, a0, b0, ry + 0.1, 1.1, C.pillar); };
    if (E || W) { rail(cx - h, cz - rw, cx + h, cz - rw); rail(cx - h, cz + rw, cx + h, cz + rw); }
    if (N || S) { rail(cx - rw, cz - h, cx - rw, cz + h); rail(cx + rw, cz - h, cx + rw, cz + h); }
    // support pier every 3rd cell
    if ((x + y) % 3 === 0 && ry > 2) {
      mb.box(cx, (ry - 0.9) / 2 - 2, cz, 2.2, ry + 3, 2.2, C.pillar);
    }
  }

  emitRail(mb, g, x, y, cx, cz) {
    const h = CELL / 2, y0 = 0.35;
    mb.box(cx, y0 / 2, cz, CELL, y0, 7.2, C.ballast);
    const vertical = (inb(x, y + 1) && g.kind[idx(x, y + 1)] === K.RAIL) || (inb(x, y - 1) && g.kind[idx(x, y - 1)] === K.RAIL);
    for (const off of [-1.5, 1.5]) {
      if (vertical) mb.box(cx + off, y0 + 0.14, cz, 0.24, 0.28, CELL, C.steel);
      else mb.box(cx, y0 + 0.14, cz + off, CELL, 0.28, 0.24, C.steel);
    }
    for (let s = 0; s < 6; s++) {
      const t = -h + (s + 0.5) * (CELL / 6);
      if (vertical) mb.box(cx, y0 + 0.05, cz + t, 4.4, 0.16, 0.8, C.rail);
      else mb.box(cx + t, y0 + 0.05, cz, 0.8, 0.16, 4.4, C.rail);
    }
  }

  setWet(wet) {
    this.mat.roughness = 0.93 - wet * 0.55;
    this.mat.metalness = 0.02 + wet * 0.22;
    this.mat.needsUpdate = false;
  }
  dispose() {
    for (const m of this.chunks) if (m) { m.geometry.dispose(); this.group.remove(m); }
    this.mat.dispose();
    this.scene.remove(this.group);
  }
}
