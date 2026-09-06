// Visible consequences: fires burning on the buildings the event system picked,
// and closure markers on the road cells traffic is actually being routed around.
import * as THREE from 'three';
import { GRID, CELL, WORLD, K } from '../core/defs.js';

const wxc = (x) => (x + 0.5) * CELL - WORLD / 2;

function sprite(draw, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Incidents {
  constructor(scene, world, net, sim) {
    this.world = world; this.net = net; this.sim = sim;
    this.group = new THREE.Group(); this.group.name = 'incidents';
    scene.add(this.group);

    const fireTex = sprite((g, s) => {
      const grd = g.createRadialGradient(s / 2, s * 0.62, 0, s / 2, s * 0.62, s * 0.46);
      grd.addColorStop(0, 'rgba(255,246,200,0.98)');
      grd.addColorStop(0.28, 'rgba(255,176,58,0.88)');
      grd.addColorStop(0.62, 'rgba(226,88,28,0.42)');
      grd.addColorStop(1, 'rgba(120,40,10,0)');
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
    });
    const smokeTex = sprite((g, s) => {
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.5);
      grd.addColorStop(0, 'rgba(60,58,56,0.55)');
      grd.addColorStop(0.5, 'rgba(80,78,76,0.26)');
      grd.addColorStop(1, 'rgba(90,88,86,0)');
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
    });
    const closeTex = sprite((g, s) => {
      g.fillStyle = 'rgba(255,110,50,0.95)';
      g.beginPath(); g.moveTo(s / 2, s * 0.12); g.lineTo(s * 0.9, s * 0.84); g.lineTo(s * 0.1, s * 0.84); g.closePath(); g.fill();
      g.fillStyle = '#1a1005';
      g.font = `bold ${s * 0.46}px Inter, system-ui, sans-serif`;
      g.textAlign = 'center'; g.fillText('!', s / 2, s * 0.76);
    });

    const mk = (tex, n, blending, scale) => {
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending, opacity: 1 });
      const items = [];
      for (let i = 0; i < n; i++) {
        const s = new THREE.Sprite(mat);
        s.scale.setScalar(scale);
        s.visible = false;
        s.renderOrder = 35;
        this.group.add(s);
        items.push(s);
      }
      return items;
    };
    this.fires = mk(fireTex, 24, THREE.AdditiveBlending, 22);
    this.smoke = mk(smokeTex, 48, THREE.NormalBlending, 40);
    this.closures = mk(closeTex, 60, THREE.NormalBlending, 9);
    this.t = 0;
  }

  update(dt, camPos) {
    this.t += dt;
    let f = 0, sm = 0, c = 0;
    const burning = [];
    for (const b of this.world.buildings) {
      if (b && !b.demolished && b.onFire) burning.push(b);
      if (burning.length >= this.fires.length) break;
    }
    for (const b of burning) {
      const x = wxc(b.x) + (b.w - 1) * CELL / 2, z = wxc(b.y) + (b.h - 1) * CELL / 2;
      const top = Math.max(6, b.height);
      const s = this.fires[f++];
      s.visible = true;
      s.position.set(x, top + 6 + Math.sin(this.t * 3 + b.id) * 1.6, z);
      s.scale.setScalar(20 + Math.sin(this.t * 5.3 + b.id) * 5);
      for (let k = 0; k < 2 && sm < this.smoke.length; k++) {
        const p = this.smoke[sm++];
        const rise = ((this.t * 7 + k * 26 + b.id * 3) % 70);
        p.visible = true;
        p.position.set(x + Math.sin(this.t * 0.5 + k) * rise * 0.16, top + 12 + rise, z + Math.cos(this.t * 0.4 + k) * rise * 0.16);
        p.scale.setScalar(24 + rise * 0.8);
        p.material.opacity = Math.max(0, 0.7 - rise / 78);
      }
    }
    // road closures — only those near enough to matter visually
    const closed = this.sim.traffic.closed;
    const g = this.world.g;
    for (let i = 0; i < GRID * GRID && c < this.closures.length; i++) {
      if (!closed[i] || g.kind[i] !== K.ROAD) continue;
      const x = wxc(i % GRID), z = wxc((i / GRID) | 0);
      if (camPos && (Math.abs(x - camPos.x) > 1500 || Math.abs(z - camPos.z) > 1500)) continue;
      const s = this.closures[c++];
      s.visible = true;
      s.position.set(x, (this.net.roadY[i] || 0) + 5.5 + Math.sin(this.t * 2 + i) * 0.4, z);
      s.material.opacity = 0.65 + 0.35 * Math.sin(this.t * 4 + i);
    }
    for (let k = f; k < this.fires.length; k++) this.fires[k].visible = false;
    for (let k = sm; k < this.smoke.length; k++) this.smoke[k].visible = false;
    for (let k = c; k < this.closures.length; k++) this.closures[k].visible = false;
    this.activeFires = f; this.activeClosures = c;
  }
  dispose() { this.group.parent && this.group.parent.remove(this.group); }
}
