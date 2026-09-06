// The metropolitan area continues past the playable grid. This builds a coarse,
// cheap ring of land, hills and distant built-up blocks so the city reads as the
// core of a region rather than a slab floating in an ocean.
import * as THREE from 'three';
import { MeshBuilder, hexToRgb } from './geo.js';
import { GRID, CELL, WORLD } from '../core/defs.js';
import { RNG } from '../core/rng.js';

const wx = (x) => (x + 0.5) * CELL - WORLD / 2;

export function buildHinterland(scene, terrain, seed) {
  const rng = new RNG(seed ^ 0x5f3a);
  const mb = new MeshBuilder();
  const STEP = 4;              // cells per hinterland quad
  const OUT = 160;             // how far past the grid the region extends
  const land = hexToRgb('#44583a'), landDry = hexToRgb('#51603f'), hill = hexToRgb('#3a4a32');
  const urban = hexToRgb('#565a56'), far = hexToRgb('#5b6068');

  for (let y = -OUT; y < GRID + OUT; y += STEP) {
    for (let x = -OUT; x < GRID + OUT; x += STEP) {
      const inside = x >= 0 && y >= 0 && x < GRID && y < GRID;
      if (inside) continue;
      if (terrain.isWater(x + STEP / 2, y + STEP / 2)) continue;
      const x0 = wx(x) - CELL / 2, z0 = wx(y) - CELL / 2;
      const x1 = x0 + CELL * STEP, z1 = z0 + CELL * STEP;
      const d = Math.max(Math.abs(x + STEP / 2 - GRID / 2), Math.abs(y + STEP / 2 - GRID / 2)) / (GRID / 2);
      const h = Math.max(0, terrain.relief(x, y)) * Math.min(1, (d - 1) * 0.9);
      const t = rng.next();
      let col = h > 8 ? hill : (t < 0.3 ? landDry : land);
      // a belt of suburban development hugging the city edge
      const suburban = d < 1.75 && t < 0.35 + (1.75 - d) * 0.5;
      if (suburban) col = urban;
      const jj = 0.88 + rng.next() * 0.24;
      mb.rect(x0, z0, x1, z1, -0.25 + h, [col[0] * jj, col[1] * jj, col[2] * jj]);
      if (h > 0.4) {
        mb.wall(x0, z1, x1, z1, -0.25, h + 0.3, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8]);
        mb.wall(x1, z0, x0, z0, -0.25, h + 0.3, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8]);
        mb.wall(x1, z1, x1, z0, -0.25, h + 0.3, [col[0] * 0.72, col[1] * 0.72, col[2] * 0.72]);
        mb.wall(x0, z0, x0, z1, -0.25, h + 0.3, [col[0] * 0.72, col[1] * 0.72, col[2] * 0.72]);
      }
      // low-detail outlying buildings so the horizon is populated
      if (suburban) {
        const n = rng.int(1, 3);
        for (let i = 0; i < n; i++) {
          const bw = rng.float(6, 16), bd = rng.float(6, 16);
          const bh = rng.float(4, d < 1.2 ? 34 : d < 1.5 ? 18 : 10);
          mb.box(rng.float(x0 + bw, x1 - bw), bh / 2, rng.float(z0 + bd, z1 - bd), bw, bh, bd,
            [far[0] * rng.float(0.8, 1.2), far[1] * rng.float(0.8, 1.2), far[2] * rng.float(0.8, 1.2)]);
        }
      }
    }
  }
  const mesh = new THREE.Mesh(mb.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }));
  mesh.name = 'hinterland';
  mesh.receiveShadow = false; mesh.castShadow = false;
  scene.add(mesh);
  return mesh;
}
