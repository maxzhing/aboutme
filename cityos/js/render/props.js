// Instanced street furniture: trees, streetlights (with night light pools),
// traffic signals wired to the real signal controllers, and parked cars.
import * as THREE from 'three';
import { MeshBuilder, hexToRgb } from './geo.js';
import { GRID, CELL, WORLD, K, RC, Z, ROAD_SPEC } from '../core/defs.js';
import { RNG } from '../core/rng.js';

const idx = (x, y) => y * GRID + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID;
const wx = (x) => (x + 0.5) * CELL - WORLD / 2;

function radialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  // a soft pool of light, not a headlamp aimed at the camera
  grd.addColorStop(0, 'rgba(255,222,168,0.55)');
  grd.addColorStop(0.22, 'rgba(255,206,142,0.20)');
  grd.addColorStop(0.55, 'rgba(255,190,120,0.055)');
  grd.addColorStop(1, 'rgba(255,180,110,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function treeGeometry() {
  const mb = new MeshBuilder();
  const trunk = hexToRgb('#4a3a2c');
  mb.cyl(0, 0, 0, 0.24, 2.6, trunk, 5, 0.75);
  const leaf = hexToRgb('#3e6b34');
  const ico = new THREE.IcosahedronGeometry(1, 0);
  const push = (cy, r, col) => {
    const pos = ico.attributes.position;
    const base = mb.count;
    for (let i = 0; i < pos.count; i++) mb.vert(pos.getX(i) * r, cy + pos.getY(i) * r * 1.15, pos.getZ(i) * r, pos.getX(i), pos.getY(i), pos.getZ(i), 0, 0, col[0], col[1], col[2]);
    for (let i = 0; i < pos.count; i += 3) mb.i.push(base + i, base + i + 1, base + i + 2);
  };
  push(3.5, 1.75, leaf);
  push(4.9, 1.15, [leaf[0] * 1.18, leaf[1] * 1.18, leaf[2] * 1.12]);
  ico.dispose();
  return mb.build(true);
}

function lampGeometry() {
  const mb = new MeshBuilder();
  const col = hexToRgb('#5c6169');
  mb.cyl(0, 0, 0, 0.13, 7.6, col, 5, 0.8);
  mb.box(0, 7.7, 1.1, 0.16, 0.16, 2.4, col);
  mb.box(0, 7.55, 2.2, 0.7, 0.24, 0.9, col);
  return mb.build();
}

function signalGeometry() {
  const mb = new MeshBuilder();
  const col = hexToRgb('#4a4f56');
  mb.cyl(0, 0, 0, 0.12, 5.4, col, 5);
  mb.box(0, 5.4, 0.9, 0.14, 0.14, 1.9, col);
  mb.box(0, 5.15, 1.75, 0.42, 1.15, 0.34, hexToRgb('#26292e'));
  return mb.build();
}

function carGeometry(scale = 1) {
  const mb = new MeshBuilder();
  const body = [1, 1, 1];
  mb.box(0, 0.62, 0, 1.85 * scale, 0.78, 4.3 * scale, body);
  mb.box(0, 1.25, -0.15 * scale, 1.66 * scale, 0.62, 2.25 * scale, [0.30, 0.34, 0.40]);
  const tire = hexToRgb('#181a1d');
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    mb.box(ox * 0.86 * scale, 0.32, oz * 1.42 * scale, 0.24, 0.6, 0.62, tire);
  return mb.build();
}

export class Props {
  constructor(scene, world, net, seed) {
    this.scene = scene; this.world = world; this.net = net;
    this.group = new THREE.Group(); this.group.name = 'props';
    scene.add(this.group);
    this.rng = new RNG((seed ^ 0x1234) >>> 0);
    this.night = 0;
    this.buildTrees();
    this.buildLamps();
    this.buildSignals();
    this.buildParked();
  }

  // ------------------------------------------------------------- trees
  buildTrees() {
    const g = this.world.g, rng = this.rng;
    const pts = [];
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      const i = idx(x, y), k = g.kind[i];
      const cx = wx(x), cz = wx(y);
      if (k === K.PARK) {
        const n = rng.int(1, 3);
        for (let t = 0; t < n; t++) {
          const px = cx + rng.float(-5, 5), pz = cz + rng.float(-5, 5);
          if (Math.abs(px - cx) < 1.6 && Math.abs(pz - cz) < 1.6) continue; // keep paths clear
          pts.push([px, pz, rng.float(0.75, 1.5)]);
        }
      } else if (k === K.EMPTY) {
        if (rng.bool(0.55)) pts.push([cx + rng.float(-4, 4), cz + rng.float(-4, 4), rng.float(0.6, 1.25)]);
      } else if (k === K.ROAD) {
        // street trees in the verge, denser on avenues and residential streets
        const cls = g.road[i];
        const rw = ROAD_SPEC[cls].width / 2;
        if (rw > CELL / 2 - 1.2) continue;
        const zone = this.nearbyZone(x, y);
        const p = cls === RC.AVENUE ? 0.5 : (zone === Z.RES_LOW || zone === Z.RES_HIGH ? 0.34 : 0.16);
        if (cls === RC.HIGHWAY || !rng.bool(p)) continue;
        const off = (CELL / 2 + rw) / 2;
        const horiz = inb(x + 1, y) && g.kind[idx(x + 1, y)] === K.ROAD;
        const s = rng.bool() ? 1 : -1;
        if (horiz) pts.push([cx + rng.float(-3, 3), cz + s * off, rng.float(0.6, 0.95)]);
        else pts.push([cx + s * off, cz + rng.float(-3, 3), rng.float(0.6, 0.95)]);
      }
    }
    const geo = treeGeometry();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true });
    const mesh = new THREE.InstancedMesh(geo, mat, pts.length);
    mesh.castShadow = true; mesh.receiveShadow = false;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
    const col = new THREE.Color();
    for (let i = 0; i < pts.length; i++) {
      const [px, pz, s] = pts[i];
      pos.set(px, 0, pz);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.float(0, 6.28));
      sc.set(s, s * rng.float(0.85, 1.25), s);
      m.compose(pos, q, sc);
      mesh.setMatrixAt(i, m);
      const t = rng.float(0, 1);
      col.setRGB(0.72 + t * 0.5, 0.95 + t * 0.25, 0.66 + t * 0.4);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.trees = mesh;
    this.group.add(mesh);
  }

  nearbyZone(x, y) {
    const g = this.world.g;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inb(x + dx, y + dy)) { const z = g.zone[idx(x + dx, y + dy)]; if (z) return z; }
    }
    return 0;
  }

  // ------------------------------------------------------------- streetlights
  buildLamps() {
    const g = this.world.g, net = this.net, rng = this.rng;
    const items = [];
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      const i = idx(x, y);
      if (g.kind[i] !== K.ROAD || g.tunnel[i]) continue;
      const cls = g.road[i];
      const every = cls === RC.HIGHWAY ? 3 : cls === RC.AVENUE ? 2 : 4;
      if ((x * 3 + y * 7) % every !== 0) continue;
      const rw = ROAD_SPEC[cls].width / 2;
      const off = Math.min(CELL / 2 - 0.5, rw + 0.9);
      const horiz = (inb(x + 1, y) && g.kind[idx(x + 1, y)] === K.ROAD) || (inb(x - 1, y) && g.kind[idx(x - 1, y)] === K.ROAD);
      const s = ((x + y) % 2) ? 1 : -1;
      const ry = net.roadY[i];
      if (horiz) items.push([wx(x), ry, wx(y) + s * off, s > 0 ? -Math.PI / 2 : Math.PI / 2]);
      else items.push([wx(x) + s * off, ry, wx(y), s > 0 ? Math.PI : 0]);
    }
    this.lampItems = items;
    const geo = lampGeometry();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.4 });
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.castShadow = false;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < items.length; i++) {
      const [px, py, pz, rot] = items[i];
      p.set(px, py, pz); q.setFromAxisAngle(up, rot);
      m.compose(p, q, one); mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.lamps = mesh; this.group.add(mesh);

    // glowing lamp heads
    const bulbGeo = new THREE.SphereGeometry(0.30, 6, 5);
    this.bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0 });
    const bulbs = new THREE.InstancedMesh(bulbGeo, this.bulbMat, items.length);
    for (let i = 0; i < items.length; i++) {
      const [px, py, pz, rot] = items[i];
      const dx = Math.sin(rot) * 2.2, dz = Math.cos(rot) * 2.2;
      p.set(px + dx, py + 7.3, pz + dz); q.identity();
      m.compose(p, q, one); bulbs.setMatrixAt(i, m);
    }
    bulbs.instanceMatrix.needsUpdate = true;
    this.bulbs = bulbs; this.group.add(bulbs);

    // ground light pools (additive)
    const tex = radialTexture();
    const poolGeo = new THREE.PlaneGeometry(1, 1); poolGeo.rotateX(-Math.PI / 2);
    this.poolMat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, color: 0xffc98a,
    });
    const pools = new THREE.InstancedMesh(poolGeo, this.poolMat, items.length);
    pools.renderOrder = 5;
    const s16 = new THREE.Vector3(10.5, 1, 10.5);
    for (let i = 0; i < items.length; i++) {
      const [px, py, pz, rot] = items[i];
      const dx = Math.sin(rot) * 2.2, dz = Math.cos(rot) * 2.2;
      p.set(px + dx, py + 0.14, pz + dz); q.identity();
      m.compose(p, q, s16); pools.setMatrixAt(i, m);
    }
    pools.instanceMatrix.needsUpdate = true;
    this.pools = pools; this.group.add(pools);
  }

  // ------------------------------------------------------------- traffic signals
  buildSignals() {
    const net = this.net, g = this.world.g;
    const items = [];
    for (const L of net.lights) {
      if (!L.major) continue;
      const rw = ROAD_SPEC[g.road[L.cell] || RC.STREET].width / 2;
      const o = Math.min(CELL / 2 - 0.4, rw + 1.0);
      const ry = net.roadY[L.cell];
      // one head per corner, oriented into the approach it controls
      items.push({ L, x: wx(L.x) - o, y: ry, z: wx(L.y) - o, rot: 0, axis: 0 });
      items.push({ L, x: wx(L.x) + o, y: ry, z: wx(L.y) + o, rot: Math.PI, axis: 0 });
      items.push({ L, x: wx(L.x) + o, y: ry, z: wx(L.y) - o, rot: -Math.PI / 2, axis: 1 });
      items.push({ L, x: wx(L.x) - o, y: ry, z: wx(L.y) + o, rot: Math.PI / 2, axis: 1 });
    }
    this.signalItems = items;
    const geo = signalGeometry();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.2 });
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      p.set(it.x, it.y, it.z); q.setFromAxisAngle(up, it.rot);
      m.compose(p, q, one); mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.signals = mesh; this.group.add(mesh);

    // lamp faces — colour updated every frame from the signal controllers
    const lensGeo = new THREE.SphereGeometry(0.2, 5, 4);
    this.lensMat = new THREE.MeshBasicMaterial({ vertexColors: false });
    const lens = new THREE.InstancedMesh(lensGeo, this.lensMat, items.length);
    lens.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(items.length * 3), 3);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const dx = Math.sin(it.rot) * 1.9, dz = Math.cos(it.rot) * 1.9;
      p.set(it.x + dx, it.y + 5.15, it.z + dz); q.identity();
      m.compose(p, q, new THREE.Vector3(1, 1, 1)); lens.setMatrixAt(i, m);
    }
    lens.instanceMatrix.needsUpdate = true;
    this.lens = lens; this.group.add(lens);
  }

  // ------------------------------------------------------------- parked cars
  buildParked() {
    const g = this.world.g, net = this.net, rng = this.rng;
    const items = [];
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      const i = idx(x, y);
      if (g.kind[i] !== K.ROAD || g.tunnel[i] || g.road[i] === RC.HIGHWAY) continue;
      if (!rng.bool(g.road[i] === RC.STREET ? 0.42 : 0.14)) continue;
      const rw = ROAD_SPEC[g.road[i]].width / 2;
      const horiz = inb(x + 1, y) && g.kind[idx(x + 1, y)] === K.ROAD;
      const s = rng.bool() ? 1 : -1;
      const off = rw - 1.2;
      const ry = net.roadY[i];
      if (horiz) items.push([wx(x) + rng.float(-3.5, 3.5), ry, wx(y) + s * off, Math.PI / 2]);
      else items.push([wx(x) + s * off, ry, wx(y) + rng.float(-3.5, 3.5), 0]);
    }
    const geo = carGeometry(1);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.42 });
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.castShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    const palette = [0xd8d8dc, 0x2c3038, 0x8d9299, 0x8e2f2a, 0x1f4a7a, 0x2f5f45, 0xb8a24a, 0x5a3f6b];
    for (let i = 0; i < items.length; i++) {
      const [px, py, pz, rot] = items[i];
      p.set(px, py, pz); q.setFromAxisAngle(up, rot);
      m.compose(p, q, one); mesh.setMatrixAt(i, m);
      col.setHex(palette[rng.int(0, palette.length - 1)]);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.parked = mesh; this.group.add(mesh);
  }

  dispose() {
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
      }
    });
    this.group.clear();
    this.scene.remove(this.group);
  }

  update(nightFactor, camPos, blackout = 0) {
    this.night = nightFactor;
    const lit = Math.max(0, nightFactor * 1.25 - 0.18) * (1 - blackout * 0.9);
    this.bulbMat.opacity = Math.min(1.0, lit * 1.3);
    this.poolMat.opacity = Math.min(0.70, lit * 0.62);
    this.bulbs.visible = lit > 0.02;
    this.pools.visible = lit > 0.02;
    // signal lenses
    const c = this.lens.instanceColor.array;
    const items = this.signalItems;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const st = it.L.green;
      let r, g2, b;
      const flowing = (st === 0 && it.axis === 0) || (st === 1 && it.axis === 1);
      const amber = (st === 2 && it.axis === 0) || (st === 3 && it.axis === 1);
      if (flowing) { r = 0.16; g2 = 1.0; b = 0.32; }
      else if (amber) { r = 1.0; g2 = 0.68; b = 0.12; }
      else { r = 1.0; g2 = 0.18; b = 0.14; }
      c[i * 3] = r; c[i * 3 + 1] = g2; c[i * 3 + 2] = b;
    }
    this.lens.instanceColor.needsUpdate = true;
    const far = camPos ? camPos.y > 520 : false;
    this.signals.visible = !far; this.lens.visible = !far;
    this.parked.visible = camPos ? camPos.y < 900 : true;
  }
}
