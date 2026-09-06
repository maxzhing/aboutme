// District name plates that float over the city at strategic altitude.
import * as THREE from 'three';
import { GRID, CELL, WORLD } from '../core/defs.js';

const wxc = (x) => (x + 0.5) * CELL - WORLD / 2;

function plate(text, sub, color) {
  const pad = 26, fs = 46, sfs = 24;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width);
  ctx.font = `500 ${sfs}px Inter, system-ui, sans-serif`;
  const w2 = Math.ceil(ctx.measureText(sub).width);
  c.width = Math.max(w, w2) + pad * 2;
  c.height = fs + sfs + pad * 2 + 10;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(8,13,21,.62)';
  g.beginPath();
  const r = 14;
  g.roundRect(0, 0, c.width, c.height, r);
  g.fill();
  g.strokeStyle = color + 'aa'; g.lineWidth = 2; g.stroke();
  g.textAlign = 'center';
  g.fillStyle = '#eaf3fb';
  g.font = `600 ${fs}px Inter, system-ui, sans-serif`;
  g.fillText(text, c.width / 2, pad + fs - 6);
  g.fillStyle = color;
  g.font = `500 ${sfs}px Inter, system-ui, sans-serif`;
  g.fillText(sub.toUpperCase(), c.width / 2, pad + fs + sfs + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { tex: t, aspect: c.width / c.height };
}

export class DistrictLabels {
  constructor(scene, world) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'labels';
    scene.add(this.group);
    this.sprites = [];
    for (const d of world.districts) {
      const sub = d.label.toLowerCase() === d.name.toLowerCase() ? 'District' : d.label;
      const { tex, aspect } = plate(d.name, sub, d.color);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, sizeAttenuation: true });
      const sp = new THREE.Sprite(mat);
      const h = 21;
      sp.scale.set(h * aspect, h, 1);
      sp.position.set(wxc(d.cx), 128, wxc(d.cy));
      sp.renderOrder = 40;
      this.group.add(sp);
      this.sprites.push(sp);
    }
    this.enabled = true;
  }
  update(camDist) {
    // fade in at district altitude, out again when you drop into the streets
    const t = Math.max(0, Math.min(1, (camDist - 300) / 260)) * Math.max(0, Math.min(1, (1900 - camDist) / 500));
    for (const s of this.sprites) {
      s.material.opacity = this.enabled ? t * 0.80 : 0;
      s.visible = s.material.opacity > 0.02;
    }
  }
  dispose() {
    for (const s of this.sprites) { s.material.map.dispose(); s.material.dispose(); }
    this.scene.remove(this.group);
  }
}
