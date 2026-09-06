// Procedural building geometry. Every archetype has its own generator so the
// skyline reads as designed architecture rather than extruded boxes.
import * as THREE from 'three';
import { MeshBuilder, hexToRgb } from './geo.js';
import { GRID, CELL, WORLD, CHUNK, CHUNKS, BT, Z, BUILDING_SPEC } from '../core/defs.js';
import { RNG } from '../core/rng.js';

const wx = (x) => (x + 0.5) * CELL - WORLD / 2;

// Facade palettes keyed loosely by use — keeps districts visually coherent.
const PAL = {
  glassCool: ['#5f7d94', '#5a7386', '#6b8ba1', '#54697a', '#7093a8'],
  glassWarm: ['#8a8577', '#96907f', '#7d7a6d', '#a09a86'],
  concrete: ['#9d9a92', '#8e8b84', '#aca79c', '#b6b1a5', '#847f77'],
  brick: ['#8c5b47', '#7d5342', '#9a6650', '#6f4a3c', '#a3705a'],
  stucco: ['#c3b9a5', '#d0c6b2', '#b5aa96', '#ddd3bd', '#a89d8a'],
  suburb: ['#c8bda8', '#b7c4b0', '#d4c9b4', '#a9b8bf', '#cbb9a5', '#bfc7cd', '#d8cdb8'],
  roof: ['#4a4340', '#3d3835', '#584f49', '#6b5b4d', '#403a37'],
  industrial: ['#8b8d8a', '#7a7d7c', '#9aa09c', '#6f7472'],
  civic: ['#c9c3b4', '#b9b3a4', '#d5cfc0'],
};

function pal(rng, key) { return hexToRgb(rng.pick(PAL[key])); }

// ------------------------------------------------------------------ helpers
function rooftop(mb, rng, cx, cy, cz, sx, sz, col) {
  const n = rng.int(1, 3);
  for (let i = 0; i < n; i++) {
    const w = rng.float(1.2, Math.max(1.4, sx * 0.22)), d = rng.float(1.2, Math.max(1.4, sz * 0.22));
    const hgt = rng.float(0.8, 1.9);
    mb.box(cx + rng.float(-sx / 2 + w, sx / 2 - w), cy + hgt / 2, cz + rng.float(-sz / 2 + d, sz / 2 - d), w, hgt, d, col);
  }
  if (rng.bool(0.35)) mb.box(cx + sx * 0.3, cy + 1.2, cz - sz * 0.3, 0.5, 2.4, 0.5, col);
}
function parapet(mb, cx, cy, cz, sx, sz, col, hgt = 0.9) {
  const t = 0.35;
  mb.box(cx, cy + hgt / 2, cz - sz / 2 + t / 2, sx, hgt, t, col);
  mb.box(cx, cy + hgt / 2, cz + sz / 2 - t / 2, sx, hgt, t, col);
  mb.box(cx - sx / 2 + t / 2, cy + hgt / 2, cz, t, hgt, sz - t * 2, col);
  mb.box(cx + sx / 2 - t / 2, cy + hgt / 2, cz, t, hgt, sz - t * 2, col);
}

// ------------------------------------------------------------------ forms
const FORMS = {
  house(mb, b, rng, cx, cz, sx, sz, hgt) {
    const wall = pal(rng, 'suburb'), roof = pal(rng, 'roof');
    const bw = sx * rng.float(0.62, 0.8), bd = sz * rng.float(0.62, 0.8);
    const fh = Math.max(3.0, hgt);
    mb.box(cx, fh / 2, cz, bw, fh, bd, wall, b.rot, 3.4);
    mb.prism(cx, fh, cz, bw * 1.08, rng.float(1.6, 2.6), bd * 1.08, roof, b.rot);
    // garage / porch pushed toward the street
    const gr = b.rot, gx = Math.cos(gr) * bw * 0.62, gz = Math.sin(gr) * bw * 0.62;
    if (rng.bool(0.65)) mb.box(cx + gx * 0.55, 1.3, cz + gz * 0.55, bw * 0.42, 2.6, bd * 0.42, wall, gr, 3.4);
    if (rng.bool(0.4)) mb.box(cx - bw * 0.25, fh + 1.6, cz - bd * 0.25, 0.55, 1.8, 0.55, hexToRgb('#7d6a5c'));
  },
  row(mb, b, rng, cx, cz, sx, sz, hgt) {
    const n = Math.max(2, Math.round(sx / 5));
    const roof = pal(rng, 'roof');
    for (let i = 0; i < n; i++) {
      const w = sx / n;
      const ox = -sx / 2 + w * (i + 0.5);
      const px = cx + Math.cos(b.rot + Math.PI / 2) * ox, pz = cz + Math.sin(b.rot + Math.PI / 2) * ox;
      const h2 = hgt * rng.float(0.9, 1.1);
      const col = pal(rng, rng.bool(0.55) ? 'brick' : 'stucco');
      mb.box(px, h2 / 2, pz, w * 0.94, h2, sz * 0.82, col, b.rot, 3.4);
      mb.prism(px, h2, pz, w * 0.98, 1.5, sz * 0.86, roof, b.rot);
    }
  },
  block(mb, b, rng, cx, cz, sx, sz, hgt) {
    const isRes = b.type === BT.APARTMENT;
    const col = pal(rng, isRes ? (rng.bool(0.5) ? 'brick' : 'stucco') : (hgt > 24 ? 'glassCool' : 'concrete'));
    const podium = hgt > 26 && rng.bool(0.5);
    let base = hgt;
    if (podium) {
      const ph = rng.float(6, 12);
      mb.box(cx, ph / 2, cz, sx, ph, sz, col, b.rot, 3.6);
      base = hgt - ph;
      const s2 = sx * rng.float(0.7, 0.88), d2 = sz * rng.float(0.7, 0.88);
      mb.box(cx, ph + base / 2, cz, s2, base, d2, col, b.rot, 3.6);
      parapet(mb, cx, hgt, cz, s2, d2, col);
      rooftop(mb, rng, cx, hgt, cz, s2, d2, col);
      parapet(mb, cx, ph, cz, sx, sz, col, 0.7);
    } else {
      mb.box(cx, hgt / 2, cz, sx, hgt, sz, col, b.rot, 3.6);
      parapet(mb, cx, hgt, cz, sx, sz, col);
      rooftop(mb, rng, cx, hgt, cz, sx, sz, col);
    }
    if (isRes && rng.bool(0.45)) { // balcony bands
      const bc = [col[0] * 0.85, col[1] * 0.85, col[2] * 0.85];
      for (let y = 6; y < hgt - 2; y += rng.float(6, 12)) mb.box(cx, y, cz, sx * 1.03, 0.35, sz * 1.03, bc, b.rot);
    }
  },
  tower(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, rng.bool(0.7) ? 'glassCool' : 'glassWarm');
    const style = rng.int(0, 2);
    const ph = rng.float(7, 14);
    mb.box(cx, ph / 2, cz, sx, ph, sz, [col[0] * 0.9, col[1] * 0.9, col[2] * 0.9], b.rot, 3.9);
    parapet(mb, cx, ph, cz, sx, sz, col, 0.6);
    let y = ph, w = sx * 0.9, d = sz * 0.9;
    const remaining = hgt - ph;
    if (style === 0) { // stepped setbacks
      const steps = rng.int(2, 3);
      for (let s = 0; s < steps; s++) {
        const sh = remaining / steps * rng.float(0.85, 1.15);
        mb.box(cx, y + sh / 2, cz, w, sh, d, col, b.rot, 4.0);
        parapet(mb, cx, y + sh, cz, w, d, col, 0.55);
        y += sh; w *= rng.float(0.74, 0.88); d *= rng.float(0.74, 0.88);
      }
    } else if (style === 1) { // slab with a shifted core
      mb.box(cx, y + remaining / 2, cz, w, remaining, d, col, b.rot, 4.0);
      parapet(mb, cx, y + remaining, cz, w, d, col, 0.8);
      const ox = w * 0.16;
      mb.box(cx + Math.cos(b.rot) * ox, y + remaining * 0.62, cz + Math.sin(b.rot) * ox, w * 0.42, remaining * 1.16, d * 0.55, col, b.rot, 4.0);
      y += remaining;
    } else { // tapered obelisk
      const seg = 4;
      for (let s = 0; s < seg; s++) {
        const sh = remaining / seg;
        mb.box(cx, y + sh / 2, cz, w, sh, d, col, b.rot, 4.0);
        y += sh; w *= 0.9; d *= 0.9;
      }
      mb.prism(cx, y, cz, w, w * 0.9, d, col, b.rot);
      y += w * 0.9;
    }
    // crown + antenna + aviation light
    if (rng.bool(0.55)) {
      mb.box(cx, y + 1.2, cz, w * 0.55, 2.4, d * 0.55, [col[0] * 1.1, col[1] * 1.1, col[2] * 1.1], b.rot);
      y += 2.4;
    }
    if (hgt > 70 || rng.bool(0.35)) mb.cyl(cx, y, cz, 0.35, rng.float(6, 18), hexToRgb('#6d7178'), 6, 0.4);
  },
  mall(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, 'concrete');
    mb.box(cx, hgt / 2, cz, sx, hgt, sz, col, b.rot, 5.4);
    parapet(mb, cx, hgt, cz, sx, sz, col, 1.4);
    rooftop(mb, rng, cx, hgt, cz, sx, sz, col);
    // entrance canopy toward the street + signage band
    const ex = Math.cos(b.rot) * sx * 0.5, ez = Math.sin(b.rot) * sx * 0.5;
    mb.box(cx + ex * 0.98, 4.2, cz + ez * 0.98, 3.0, 0.5, sz * 0.5, hexToRgb('#3f4348'), b.rot);
    mb.box(cx, hgt * 0.72, cz, sx * 1.005, 1.6, sz * 1.005, hexToRgb('#c05a3a'), b.rot);
  },
  factory(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, 'industrial');
    const bh = Math.max(8, hgt);
    mb.box(cx, bh / 2, cz, sx, bh, sz, col, b.rot, 4.5);
    // sawtooth roof
    const n = Math.max(2, Math.round(sx / 6));
    for (let i = 0; i < n; i++) {
      const ox = -sx / 2 + (sx / n) * (i + 0.5);
      const px = cx + Math.cos(b.rot + Math.PI / 2) * ox, pz = cz + Math.sin(b.rot + Math.PI / 2) * ox;
      mb.prism(px, bh, pz, sx / n * 0.96, 2.2, sz, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8], b.rot);
    }
    // stacks + silos
    for (let i = 0; i < rng.int(1, 3); i++) {
      mb.cyl(cx + rng.float(-sx * 0.3, sx * 0.3), bh, cz + rng.float(-sz * 0.3, sz * 0.3), rng.float(0.9, 1.5), rng.float(8, 20), hexToRgb('#a8a29a'), 8, 0.92);
    }
    if (rng.bool(0.5)) mb.cyl(cx - sx * 0.36, 0, cz + sz * 0.32, 2.4, bh * 0.9, hexToRgb('#b9b3a8'), 10);
  },
  shed(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, 'industrial');
    const bh = Math.max(7.5, hgt);
    mb.box(cx, bh / 2, cz, sx, bh, sz, col, b.rot, 6);
    mb.box(cx, bh + 0.25, cz, sx * 1.02, 0.5, sz * 1.02, [col[0] * 0.75, col[1] * 0.75, col[2] * 0.75], b.rot);
    // loading dock doors on the street face
    const n = Math.max(2, Math.round(sx / 5));
    for (let i = 0; i < n; i++) {
      const ox = -sx / 2 + (sx / n) * (i + 0.5);
      const dx = Math.cos(b.rot) * (sz / 2), dz = Math.sin(b.rot) * (sz / 2);
      const px = cx + Math.cos(b.rot + Math.PI / 2) * ox + dx, pz = cz + Math.sin(b.rot + Math.PI / 2) * ox + dz;
      mb.box(px, 1.8, pz, sx / n * 0.6, 3.6, 0.4, hexToRgb('#4a4d52'), b.rot);
    }
  },
  civic(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, 'civic');
    mb.box(cx, hgt / 2, cz, sx, hgt, sz, col, b.rot, 3.8);
    parapet(mb, cx, hgt, cz, sx, sz, col, 1.1);
    // portico with columns facing the street
    const fx = Math.cos(b.rot), fz = Math.sin(b.rot);
    const px = cx + fx * (sz / 2 + 1.4), pz = cz + fz * (sz / 2 + 1.4);
    mb.box(px, 0.3, pz, sx * 0.6, 0.6, 3.0, [col[0] * 0.92, col[1] * 0.92, col[2] * 0.92], b.rot);
    const nCol = 4;
    for (let i = 0; i < nCol; i++) {
      const ox = -sx * 0.26 + (sx * 0.52 / (nCol - 1)) * i;
      mb.cyl(px + Math.cos(b.rot + Math.PI / 2) * ox, 0.6, pz + Math.sin(b.rot + Math.PI / 2) * ox, 0.42, 5.2, col, 8);
    }
    mb.box(px, 6.1, pz, sx * 0.62, 0.8, 3.2, col, b.rot);
    if (b.type === BT.HOSPITAL) { // helipad + red cross
      mb.box(cx, hgt + 0.2, cz, sx * 0.4, 0.2, sz * 0.4, hexToRgb('#3c4046'), b.rot);
      mb.box(cx, hgt + 0.35, cz, sx * 0.26, 0.1, 2.0, hexToRgb('#d94f4f'), b.rot);
      mb.box(cx, hgt + 0.35, cz, 2.0, 0.1, sz * 0.26, hexToRgb('#d94f4f'), b.rot);
    }
    if (b.type === BT.FIRE) {
      mb.box(cx + fx * (sz / 2 + 0.1), 2.2, cz + fz * (sz / 2 + 0.1), sx * 0.7, 4.4, 0.4, hexToRgb('#a63a30'), b.rot);
    }
    if (b.type === BT.POLICE) mb.box(cx, hgt + 1.4, cz, 1.0, 2.8, 1.0, hexToRgb('#3d6fa8'));
  },
  campus(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, 'brick');
    const wings = [[0, 0, sx, sz * 0.42], [0, sz * 0.32, sx * 0.42, sz * 0.5], [0, -sz * 0.32, sx * 0.42, sz * 0.5]];
    for (const [ox, oz, w, d] of wings) {
      const px = cx + Math.cos(b.rot) * oz + Math.cos(b.rot + Math.PI / 2) * ox;
      const pz = cz + Math.sin(b.rot) * oz + Math.sin(b.rot + Math.PI / 2) * ox;
      const h2 = hgt * rng.float(0.75, 1.05);
      mb.box(px, h2 / 2, pz, w, h2, d, col, b.rot, 3.8);
      parapet(mb, px, h2, pz, w, d, col, 0.8);
    }
    mb.box(cx, hgt + 2, cz, 3.2, 4, 3.2, hexToRgb('#c9c3b4'), b.rot);
    mb.cyl(cx, hgt + 6, cz, 1.6, 3.4, hexToRgb('#5c7f6b'), 10, 0.2);
  },
  culture(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, 'concrete');
    mb.box(cx, hgt * 0.5, cz, sx, hgt, sz, col, b.rot, 4.2);
    // angled glazed prow
    const fx = Math.cos(b.rot), fz = Math.sin(b.rot);
    mb.box(cx + fx * sz * 0.42, hgt * 0.42, cz + fz * sz * 0.42, sx * 0.72, hgt * 0.84, sz * 0.3, hexToRgb('#6d8fa5'), b.rot, 4.2);
    mb.prism(cx, hgt, cz, sx, 2.6, sz, [col[0] * 1.05, col[1] * 1.05, col[2] * 1.05], b.rot);
    if (b.type === BT.THEATER) mb.box(cx + fx * (sz * 0.5 + 1), hgt * 0.9, cz + fz * (sz * 0.5 + 1), sx * 0.5, 1.4, 0.5, hexToRgb('#d8a23c'), b.rot);
  },
  stadium(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, 'concrete');
    const rx = sx / 2, rz = sz / 2, seg = 22;
    for (let s = 0; s < seg; s++) {
      const a0 = (s / seg) * Math.PI * 2, a1 = ((s + 1) / seg) * Math.PI * 2;
      const p0 = [cx + Math.cos(a0) * rx, cz + Math.sin(a0) * rz];
      const p1 = [cx + Math.cos(a1) * rx, cz + Math.sin(a1) * rz];
      mb.wall(p0[0], p0[1], p1[0], p1[1], 0, hgt, col);
      const i0 = [cx + Math.cos(a0) * rx * 0.72, cz + Math.sin(a0) * rz * 0.72];
      const i1 = [cx + Math.cos(a1) * rx * 0.72, cz + Math.sin(a1) * rz * 0.72];
      mb.quad([p0[0], hgt, p0[1]], [p1[0], hgt, p1[1]], [i1[0], hgt * 0.92, i1[1]], [i0[0], hgt * 0.92, i0[1]], [0, 1, 0], [col[0] * 1.05, col[1] * 1.05, col[2] * 1.05]);
      mb.quad([i0[0], hgt * 0.35, i0[1]], [i1[0], hgt * 0.35, i1[1]], [p1[0], hgt * 0.92, p1[1]], [p0[0], hgt * 0.92, p0[1]], [0, 0.8, 0], hexToRgb('#3a4a63'));
      if (s % 4 === 0) mb.box(p0[0], hgt + 3, p0[1], 0.5, 6, 0.5, hexToRgb('#8f949a'));
    }
    mb.rect(cx - rx * 0.62, cz - rz * 0.62, cx + rx * 0.62, cz + rz * 0.62, 0.3, hexToRgb('#3f7a3c'));
  },
  station(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, 'civic');
    mb.box(cx, 3.2, cz, sx * 0.6, 6.4, sz * 0.6, col, b.rot, 4);
    // platform canopy
    mb.box(cx, 6.6, cz, sx * 1.15, 0.4, sz * 1.15, hexToRgb('#4a5058'), b.rot);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      mb.cyl(cx + ox * sx * 0.5, 0, cz + oz * sz * 0.5, 0.28, 6.6, hexToRgb('#6b7078'), 6);
    }
    mb.box(cx, 7.4, cz, 2.6, 1.2, 0.4, hexToRgb('#3d78c0'), b.rot);
  },
  power(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, 'industrial');
    mb.box(cx, 6, cz, sx * 0.62, 12, sz * 0.9, col, b.rot, 5);
    mb.cyl(cx + sx * 0.3, 0, cz - sz * 0.22, sz * 0.2, 22, hexToRgb('#c3bdb2'), 12, 0.72);
    mb.cyl(cx + sx * 0.3, 0, cz + sz * 0.26, sz * 0.2, 22, hexToRgb('#c3bdb2'), 12, 0.72);
    mb.cyl(cx - sx * 0.3, 12, cz, 1.1, 16, hexToRgb('#b45a4a'), 8, 0.85);
  },
  plant(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = pal(rng, 'industrial');
    mb.box(cx, 3.5, cz - sz * 0.28, sx * 0.9, 7, sz * 0.4, col, b.rot, 4);
    for (let i = 0; i < 3; i++) {
      mb.cyl(cx - sx * 0.3 + i * sx * 0.3, 0, cz + sz * 0.26, Math.min(sx, sz) * 0.13, 6.5, hexToRgb('#9aa3a8'), 12);
    }
  },
  parking(mb, b, rng, cx, cz, sx, sz, hgt) {
    const col = hexToRgb('#8e8a82');
    const lv = Math.max(2, Math.min(5, Math.round(hgt / 3)));
    for (let l = 0; l < lv; l++) {
      mb.box(cx, l * 3 + 0.15, cz, sx, 0.3, sz, col, b.rot);
      if (l > 0) mb.box(cx, l * 3 + 0.75, cz, sx * 1.005, 0.5, sz * 1.005, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8], b.rot);
    }
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mb.box(cx + ox * sx * 0.48, lv * 1.5, cz + oz * sz * 0.48, 0.7, lv * 3, 0.7, col, b.rot);
  },
  marina(mb, b, rng, cx, cz, sx, sz, hgt) {
    const deck = hexToRgb('#8a7a63');
    mb.box(cx, 0.6, cz, sx * 0.9, 0.4, sz * 0.25, deck, b.rot);
    for (let i = 0; i < 4; i++) {
      const ox = -sx * 0.36 + i * sx * 0.24;
      mb.box(cx + Math.cos(b.rot + Math.PI / 2) * ox, 0.6, cz + Math.sin(b.rot + Math.PI / 2) * ox + sz * 0.3, 1.4, 0.35, sz * 0.55, deck, b.rot);
      if (rng.bool(0.7)) {
        const bx = cx + Math.cos(b.rot + Math.PI / 2) * (ox + 2.4);
        mb.box(bx, 0.9, cz + sz * 0.4, 1.6, 1.1, 4.4, hexToRgb('#e6e2d8'), b.rot);
        mb.cyl(bx, 1.6, cz + sz * 0.4, 0.12, 5.5, hexToRgb('#d8d4cc'), 5);
      }
    }
    mb.box(cx - sx * 0.36, 2, cz - sz * 0.3, 3.4, 4, 3.4, hexToRgb('#b8ada0'), b.rot, 3.4);
  },
  park(mb, b, rng, cx, cz, sx, sz, hgt) {
    // paths + a small pond; trees are instanced separately
    const path = hexToRgb('#9a9078');
    mb.rect(cx - sx / 2, cz - 1.1, cx + sx / 2, cz + 1.1, 0.08, path);
    mb.rect(cx - 1.1, cz - sz / 2, cx + 1.1, cz + sz / 2, 0.08, path);
    if (sx > 20 && sz > 20 && rng.bool(0.55)) {
      const r = Math.min(sx, sz) * 0.2;
      mb.cyl(cx + sx * 0.2, -0.4, cz - sz * 0.2, r, 0.42, hexToRgb('#3c5f74'), 14);
    }
  },
  plazaB(mb, b, rng, cx, cz, sx, sz, hgt) {
    mb.rect(cx - sx / 2, cz - sz / 2, cx + sx / 2, cz + sz / 2, 0.1, hexToRgb('#8d887d'));
    mb.cyl(cx, 0.1, cz, Math.min(sx, sz) * 0.14, 0.7, hexToRgb('#a8a49a'), 12);
    mb.cyl(cx, 0.8, cz, Math.min(sx, sz) * 0.05, 1.6, hexToRgb('#b6b2a8'), 8, 0.5);
  },
  // A site reads its own progress: hoarding and a dug pad, then a steel frame
  // climbing with the crane, then cladding chasing the frame up. The stage comes
  // straight from b.construction, which the economy advances a day at a time.
  construction(mb, b, rng, cx, cz, sx, sz, hgt) {
    const frame = hexToRgb('#7d7368');
    const dirt = hexToRgb('#4e463c');
    const clad = hexToRgb('#8e97a3');
    const yellow = hexToRgb('#d8a53c');
    const done = Math.min(1, Math.max(0.02, b.construction || 0.05));

    // stage 1 — hoarding and excavation, always present
    mb.rect(cx - sx / 2, cz - sz / 2, cx + sx / 2, cz + sz / 2, 0.12, dirt);
    const hb = sx / 2, hz = sz / 2;
    mb.box(cx, 1.1, cz - hz, sx, 2.2, 0.4, yellow, b.rot);
    mb.box(cx, 1.1, cz + hz, sx, 2.2, 0.4, yellow, b.rot);
    mb.box(cx - hb, 1.1, cz, 0.4, 2.2, sz, yellow, b.rot);
    mb.box(cx + hb, 1.1, cz, 0.4, 2.2, sz, yellow, b.rot);
    if (done < 0.18) {
      // rebar mat, before anything stands up
      for (let i = 0; i < 5; i++) mb.box(cx, 0.5, cz - hz + (i + 0.5) * sz / 5, sx * 0.86, 0.16, 0.16, frame, b.rot);
      mb.box(cx + sx * 0.3, 5, cz + sz * 0.3, 3.2, 10, 3.2, yellow);   // digger
      return;
    }

    // stage 2 — frame rising
    const fh = Math.max(3.4, hgt * done);
    mb.box(cx, 0.5, cz, sx * 0.98, 1, sz * 0.98, hexToRgb('#6b6258'), b.rot);
    for (let l = 0; l < Math.ceil(fh / 3.5); l++) mb.box(cx, 1 + l * 3.5, cz, sx * 0.9, 0.26, sz * 0.9, frame, b.rot);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      mb.box(cx + ox * sx * 0.44, fh / 2, cz + oz * sz * 0.44, 0.5, fh, 0.5, frame, b.rot);

    // stage 3 — cladding chases the frame up from the bottom
    if (done > 0.45) {
      const ch2 = fh * ((done - 0.45) / 0.55);
      if (ch2 > 1) mb.box(cx, ch2 / 2, cz, sx * 0.94, ch2, sz * 0.94, clad, b.rot);
      // scaffold netting on the working level
      mb.box(cx, ch2 + 1.4, cz, sx * 0.99, 2.8, sz * 0.99, hexToRgb('#6f7a68'), b.rot);
    }

    // the crane stays until the frame is topped out
    if (done < 0.92) {
      const ch = Math.max(14, hgt * 1.15);
      mb.box(cx + sx * 0.34, ch / 2, cz + sz * 0.34, 1.0, ch, 1.0, yellow);
      mb.box(cx + sx * 0.34 - 7, ch, cz + sz * 0.34, 24, 0.8, 0.8, yellow, b.rot);
      mb.box(cx + sx * 0.34 - 15, ch - 3.5, cz + sz * 0.34, 0.3, 7, 0.3, frame);
    }
  },
};

// ------------------------------------------------------------------ material
export function makeBuildingMaterial() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.06 });
  mat.userData.uniforms = {
    uNight: { value: 0 }, uBlackout: { value: 0 }, uTime: { value: 0 },
    // share of windows lit, per land use, driven by the simulation clock
    uLitRes: { value: 0.4 }, uLitOff: { value: 0.4 }, uLitCom: { value: 0.4 }, uLitCiv: { value: 0.3 },
  };
  mat.customProgramCacheKey = () => 'cityos:buildings:v1';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, mat.userData.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 bInfo;   // x: seed, y: litProbability, z: floorHeight, w: flags
        attribute vec2 fUv;     // facade uv in metres (x along wall, y from base)
        varying vec4 vB;
        varying vec2 vF;
        varying float vUpFace;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vB = bInfo; vF = fUv; vUpFace = abs(normal.y);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uNight; uniform float uBlackout; uniform float uTime;
        uniform float uLitRes; uniform float uLitOff; uniform float uLitCom; uniform float uLitCiv;
        varying vec4 vB; varying vec2 vF; varying float vUpFace;
        float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fh = max(vB.z, 2.2);
        float spacing = 2.9;
        float wallY = vF.y;
        float floorI = floor(wallY / fh);
        float colI = floor(vF.x / spacing);
        float fy = fract(wallY / fh);
        float fx = fract(vF.x / spacing);
        float winY = smoothstep(0.16,0.24,fy) * (1.0-smoothstep(0.76,0.84,fy));
        float winX = smoothstep(0.14,0.22,fx) * (1.0-smoothstep(0.78,0.86,fx));
        float isWall = 1.0 - vUpFace;
        float ground = 1.0 - step(4.2, wallY);
        float win = winX * winY * isWall * step(1.0, wallY);
        float storefront = isWall * ground * step(0.9, wallY) * winX;
        win = max(win, storefront);
        vec3 glass = mix(vec3(0.16,0.20,0.25), diffuseColor.rgb*0.5, 0.35);
        diffuseColor.rgb = mix(diffuseColor.rgb, glass, win*0.82);
        float band = (1.0-smoothstep(0.0,0.06,abs(fy-0.06))) * isWall * 0.10;
        diffuseColor.rgb *= (1.0 - band);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // vB.w packs land use (0 res, 1 office, 2 commercial, 3 civic) plus 4
        // when the building is on a protected circuit and never load-shed.
        float zc = mod(vB.w, 4.0);
        float crit = step(3.5, vB.w);
        float useLit = uLitRes * step(zc, 0.5)
                     + uLitOff * step(0.5, zc) * step(zc, 1.5)
                     + uLitCom * step(1.5, zc) * step(zc, 2.5)
                     + uLitCiv * step(2.5, zc);
        float litProb = clamp(vB.y * useLit, 0.0, 1.0);
        float rnd = h21(vec2(colI + vB.x*7.0, floorI*1.7 + vB.x*3.0));
        float flick = 0.85 + 0.15*sin(uTime*0.7 + rnd*30.0);
        float lit = step(1.0 - litProb, rnd) * flick;
        vec3 lampCol = mix(vec3(1.0,0.78,0.42), vec3(0.72,0.86,1.0), step(0.72, rnd));
        // Individual windows are sub-pixel from across the city, so fade the
        // fine pattern out with screen-space derivatives and cross-fade into a
        // smooth facade glow. Up close you see windows; from the air, a skyline.
        float px = max(fwidth(vF.y), fwidth(vF.x));
        float aa = clamp(1.0 - px / (fh * 0.95), 0.0, 1.0);
        float coverage = vB.y * 0.42;
        float smoothGlow = coverage * isWall * step(1.0, wallY);
        float powered = 1.0 - uBlackout * (1.0 - crit);
        totalEmissiveRadiance += lampCol * win * lit * aa * uNight * 3.00 * powered;
        totalEmissiveRadiance += vec3(1.0,0.80,0.50) * smoothGlow * (1.0 - aa) * uNight * 1.35 * powered;
        totalEmissiveRadiance += vec3(1.0,0.86,0.55) * storefront * uNight * (1.10 + aa * 1.10) * powered;`);
    mat.userData.shader = shader;
  };
  return mat;
}

// ------------------------------------------------------------------ chunk build
export class BuildingLayer {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.group = new THREE.Group(); this.group.name = 'buildings';
    scene.add(this.group);
    this.mat = makeBuildingMaterial();
    this.chunks = new Array(CHUNKS * CHUNKS).fill(null);
    this.rebuildAll();
  }
  rebuildAll() { for (let c = 0; c < CHUNKS * CHUNKS; c++) this.rebuildChunk(c); }
  chunkOf(x, y) { return Math.floor(y / CHUNK) * CHUNKS + Math.floor(x / CHUNK); }
  markDirty(x, y) { this.rebuildChunk(this.chunkOf(x, y)); }

  rebuildChunk(ci) {
    const old = this.chunks[ci];
    if (old) { this.group.remove(old); old.geometry.dispose(); this.chunks[ci] = null; }
    const cx0 = (ci % CHUNKS) * CHUNK, cy0 = Math.floor(ci / CHUNKS) * CHUNK;
    const mb = new MeshBuilder();
    const info = [], fuv = [];
    for (const b of this.world.buildings) {
      if (!b || b.demolished) continue;
      if (b.x < cx0 || b.x >= cx0 + CHUNK || b.y < cy0 || b.y >= cy0 + CHUNK) continue;
      const start = mb.count;
      this.emitBuilding(mb, b);
      const seed = (b.seed % 997) / 997;
      // an abandoned building is dark and stays dark — the derelict lot is the
      // consequence the player should be able to see from the air
      const litProb = b.abandoned ? 0 : (b.litProb === undefined ? 1 : b.litProb);
      const fh = Math.max(2.6, b.height / Math.max(1, b.floors));
      const critical = b.type === BT.HOSPITAL || b.type === BT.FIRE || b.type === BT.POLICE || b.type === BT.POWER;
      const zc = b.zone === Z.OFFICE ? 1 : (b.zone === Z.COMM || b.zone === Z.MIXED || b.zone === Z.IND) ? 2 : (b.zone === Z.CIVIC ? 3 : 0);
      const w = zc + (critical ? 4 : 0);
      for (let v = start; v < mb.count; v++) info.push(seed, litProb, fh, w);
    }
    if (mb.isEmpty()) return;
    const geo = mb.build();
    geo.setAttribute('bInfo', new THREE.Float32BufferAttribute(info, 4));
    // facade uv: x = distance along wall (from geo uv), y = world height
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    const fu = new Float32Array(pos.count * 2);
    for (let v = 0; v < pos.count; v++) { fu[v * 2] = uv.getX(v) * 3.6; fu[v * 2 + 1] = pos.getY(v); }
    geo.setAttribute('fUv', new THREE.BufferAttribute(fu, 2));
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData.chunk = ci;
    this.group.add(mesh);
    this.chunks[ci] = mesh;
  }

  emitBuilding(mb, b) {
    const rng = new RNG(b.seed || (b.id * 7919 + 3));
    const inset = 1.6;
    const sx = Math.max(3, b.w * CELL - inset * 2);
    const sz = Math.max(3, b.h * CELL - inset * 2);
    const cx = wx(b.x) + (b.w - 1) * CELL / 2;
    const cz = wx(b.y) + (b.h - 1) * CELL / 2;
    let hgt = Math.max(2, b.height);
    const form = b.construction !== undefined && b.construction < 1 && b.construction > 0 ? 'construction' : b.form;
    const fn = FORMS[form] || FORMS.block;
    fn(mb, b, rng, cx, cz, sx, sz, hgt);
  }

  setNight(v, blackout) {
    const u = this.mat.userData.uniforms;
    u.uNight.value = v; u.uBlackout.value = blackout;
  }
  // Offices empty out after work, homes fill up, shops close late.
  setOccupancy(hour) {
    const g = (h, c, w) => Math.exp(-Math.pow((((h - c + 36) % 24) - 12) / w, 2));
    const u = this.mat.userData.uniforms;
    u.uLitRes.value = 0.055 + 0.40 * g(hour, 21.0, 3.6) + 0.10 * g(hour, 7.5, 1.7);
    u.uLitOff.value = 0.030 + 0.50 * g(hour, 13.5, 4.0) + 0.07 * g(hour, 20.0, 2.4);
    u.uLitCom.value = 0.040 + 0.42 * g(hour, 18.5, 4.8);
    u.uLitCiv.value = 0.030 + 0.32 * g(hour, 13.0, 4.6);
  }
  setTime(t) { this.mat.userData.uniforms.uTime.value = t; }
  dispose() {
    for (const m of this.chunks) if (m) { m.geometry.dispose(); this.group.remove(m); }
    this.mat.dispose(); this.scene.remove(this.group);
  }
}
