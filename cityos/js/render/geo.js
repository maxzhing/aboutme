// Lightweight mesh builder: accumulate positions/normals/uvs/colors into plain
// arrays and hand back a BufferGeometry. Used by every procedural mesh in CITYOS.
import * as THREE from 'three';

export class MeshBuilder {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; this.v = 0; }
  get count() { return this.v; }

  vert(x, y, z, nx, ny, nz, u, vv, r, g, b) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.u.push(u, vv); this.c.push(r, g, b);
    return this.v++;
  }
  // quad given 4 corners in CCW order (viewed from the normal side)
  quad(a, b, c, d, nrm, col, uv) {
    const [nx, ny, nz] = nrm; const [r, g, bl] = col;
    const uvs = uv || [0, 0, 1, 0, 1, 1, 0, 1];
    const i0 = this.vert(a[0], a[1], a[2], nx, ny, nz, uvs[0], uvs[1], r, g, bl);
    const i1 = this.vert(b[0], b[1], b[2], nx, ny, nz, uvs[2], uvs[3], r, g, bl);
    const i2 = this.vert(c[0], c[1], c[2], nx, ny, nz, uvs[4], uvs[5], r, g, bl);
    const i3 = this.vert(d[0], d[1], d[2], nx, ny, nz, uvs[6], uvs[7], r, g, bl);
    this.i.push(i0, i1, i2, i0, i2, i3);
  }
  // axis-aligned horizontal rectangle at height y
  rect(x0, z0, x1, z1, y, col, uvScale = 0) {
    const u = uvScale ? (x1 - x0) / uvScale : 1, v = uvScale ? (z1 - z0) / uvScale : 1;
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], col, [0, 0, u, 0, u, v, 0, v]);
  }
  // vertical side wall between two ground points, extruded to height h from y0
  wall(x0, z0, x1, z1, y0, h, col, uvS = 0) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dz / len, nz = -dx / len;
    const u = uvS ? len / uvS : 1, v = uvS ? h / uvS : 1;
    this.quad([x0, y0, z0], [x1, y0, z1], [x1, y0 + h, z1], [x0, y0 + h, z0], [nx, 0, nz], col, [0, 0, u, 0, u, v, 0, v]);
  }
  // axis-aligned box; `faces` bitmask 1=+X 2=-X 4=+Y 8=-Y 16=+Z 32=-Z
  box(cx, cy, cz, sx, sy, sz, col, rotY = 0, uvS = 0, faces = 63) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const cos = Math.cos(rotY), sin = Math.sin(rotY);
    const tp = (x, y, z) => [cx + x * cos - z * sin, cy + y, cz + x * sin + z * cos];
    const tn = (x, z) => [x * cos - z * sin, 0, x * sin + z * cos];
    const U = (w, h) => uvS ? [0, 0, w / uvS, 0, w / uvS, h / uvS, 0, h / uvS] : null;
    if (faces & 4) this.quad(tp(-hx, hy, hz), tp(hx, hy, hz), tp(hx, hy, -hz), tp(-hx, hy, -hz), [0, 1, 0], col, U(sx, sz));
    if (faces & 8) this.quad(tp(-hx, -hy, -hz), tp(hx, -hy, -hz), tp(hx, -hy, hz), tp(-hx, -hy, hz), [0, -1, 0], col, U(sx, sz));
    if (faces & 16) { const n = tn(0, 1); this.quad(tp(-hx, -hy, hz), tp(hx, -hy, hz), tp(hx, hy, hz), tp(-hx, hy, hz), n, col, U(sx, sy)); }
    if (faces & 32) { const n = tn(0, -1); this.quad(tp(hx, -hy, -hz), tp(-hx, -hy, -hz), tp(-hx, hy, -hz), tp(hx, hy, -hz), n, col, U(sx, sy)); }
    if (faces & 1) { const n = tn(1, 0); this.quad(tp(hx, -hy, hz), tp(hx, -hy, -hz), tp(hx, hy, -hz), tp(hx, hy, hz), n, col, U(sz, sy)); }
    if (faces & 2) { const n = tn(-1, 0); this.quad(tp(-hx, -hy, -hz), tp(-hx, -hy, hz), tp(-hx, hy, hz), tp(-hx, hy, -hz), n, col, U(sz, sy)); }
  }
  prism(cx, cy, cz, sx, sy, sz, col, rotY = 0) { // gable roof
    const hx = sx / 2, hz = sz / 2;
    const cos = Math.cos(rotY), sin = Math.sin(rotY);
    const tp = (x, y, z) => [cx + x * cos - z * sin, cy + y, cz + x * sin + z * cos];
    const A = tp(-hx, 0, -hz), B = tp(hx, 0, -hz), C = tp(hx, 0, hz), D = tp(-hx, 0, hz);
    const E = tp(-hx, sy, 0), F = tp(hx, sy, 0);
    this.quad(D, C, F, E, [0, 0.7, 0.7], col);
    this.quad(B, A, E, F, [0, 0.7, -0.7], col);
    const i0 = this.vert(A[0], A[1], A[2], -1, 0, 0, 0, 0, col[0], col[1], col[2]);
    const i1 = this.vert(D[0], D[1], D[2], -1, 0, 0, 1, 0, col[0], col[1], col[2]);
    const i2 = this.vert(E[0], E[1], E[2], -1, 0, 0, 0.5, 1, col[0], col[1], col[2]);
    this.i.push(i0, i1, i2);
    const j0 = this.vert(C[0], C[1], C[2], 1, 0, 0, 0, 0, col[0], col[1], col[2]);
    const j1 = this.vert(B[0], B[1], B[2], 1, 0, 0, 1, 0, col[0], col[1], col[2]);
    const j2 = this.vert(F[0], F[1], F[2], 1, 0, 0, 0.5, 1, col[0], col[1], col[2]);
    this.i.push(j0, j1, j2);
  }
  cyl(cx, cy, cz, r, h, col, seg = 8, taper = 1) {
    const base = this.v;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      const nx = Math.cos(a), nz = Math.sin(a);
      this.vert(cx + nx * r, cy, cz + nz * r, nx, 0, nz, s / seg, 0, col[0], col[1], col[2]);
      this.vert(cx + nx * r * taper, cy + h, cz + nz * r * taper, nx, 0, nz, s / seg, 1, col[0], col[1], col[2]);
    }
    for (let s = 0; s < seg; s++) {
      const a = base + s * 2, b = base + ((s + 1) % seg) * 2;
      this.i.push(a, b, b + 1, a, b + 1, a + 1);
    }
    const top = this.v;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      this.vert(cx + Math.cos(a) * r * taper, cy + h, cz + Math.sin(a) * r * taper, 0, 1, 0, 0.5, 0.5, col[0], col[1], col[2]);
    }
    for (let s = 1; s < seg - 1; s++) this.i.push(top, top + s, top + s + 1);
  }
  build(computeNormals = false) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    geo.setIndex(this.i);
    if (computeNormals) geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }
  isEmpty() { return this.v === 0; }
}

export function hexToRgb(hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}
export function shade(col, f) { return [col[0] * f, col[1] * f, col[2] * f]; }
export function jitterCol(col, rng, amt = 0.06) {
  const j = 1 + (rng.next() - 0.5) * amt * 2;
  return [Math.min(1, col[0] * j), Math.min(1, col[1] * j), Math.min(1, col[2] * j)];
}
