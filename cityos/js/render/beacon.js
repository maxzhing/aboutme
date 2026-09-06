// The current objective, marked in the world. A ring on the ground where the
// problem is and a marker pin floating above it, so "what am I solving?" has an
// answer you can see as well as read. The pin ignores depth so it is never lost
// behind the skyline it is pointing into.
import * as THREE from 'three';
import { GRID, CELL, WORLD } from '../core/defs.js';

const wxc = (x) => (x + 0.5) * CELL - WORLD / 2;
const COL = 0x35d6ff;

export class Beacon {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'beacon';
    this.group.visible = false;
    scene.add(this.group);

    this.ringMat = new THREE.MeshBasicMaterial({ color: COL, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
    this.ring2Mat = this.ringMat.clone();
    // wide enough to sit outside a city block rather than inside a building
    this.ring = new THREE.Mesh(new THREE.RingGeometry(CELL * 2.8, CELL * 3.15, 72), this.ringMat);
    this.ring2 = new THREE.Mesh(new THREE.RingGeometry(CELL * 4.4, CELL * 4.6, 72), this.ring2Mat);
    for (const r of [this.ring, this.ring2]) { r.rotation.x = -Math.PI / 2; r.renderOrder = 24; this.group.add(r); }

    this.beamMat = new THREE.MeshBasicMaterial({
      color: COL, transparent: true, opacity: 0.16, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(CELL * 0.5, CELL * 1.35, 320, 24, 1, true), this.beamMat);
    this.beam.renderOrder = 25;
    this.group.add(this.beam);

    // the pin: a downward cone under a bead, drawn over everything
    this.pin = new THREE.Group();
    this.pinMat = new THREE.MeshBasicMaterial({ color: COL, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(5, 13, 5), this.pinMat);
    cone.rotation.x = Math.PI;             // point down at the problem
    cone.position.y = 6.5;
    const bead = new THREE.Mesh(new THREE.SphereGeometry(3.8, 14, 10), this.pinMat);
    bead.position.y = 16;
    const halo = new THREE.Mesh(new THREE.RingGeometry(5.5, 7.4, 32), new THREE.MeshBasicMaterial({
      color: COL, transparent: true, opacity: 0.45, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    halo.position.y = 16;
    this.halo = halo;
    for (const m of [cone, bead, halo]) { m.renderOrder = 999; this.pin.add(m); }
    this.group.add(this.pin);

    this.cell = -1;
    this.t = 0;
  }

  // `cell` is null when the objective has no single place to point at. `ground`
  // is the terrain height there, `top` the height of whatever stands on it.
  set(cell, ground, top) {
    if (cell === null || cell === undefined || cell < 0) { this.group.visible = false; this.cell = -1; return; }
    const y = ground || 0;
    const h = Math.max(18, (top || 0) + 18);
    if (cell === this.cell && Math.abs(h - this.pinY) < 2) return;
    this.cell = cell;
    this.pinY = h;
    this.group.position.set(wxc(cell % GRID), y + 0.9, wxc((cell / GRID) | 0));
    this.pin.position.y = h;
    this.beam.position.y = 150;
    this.group.visible = true;
  }

  update(dt, camPos, camDist) {
    if (!this.group.visible) return;
    this.t += dt;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 2.2);
    this.ringMat.opacity = 0.35 + pulse * 0.5;
    this.ring2Mat.opacity = 0.12 + (1 - pulse) * 0.34;
    this.ring2.scale.setScalar(1 + (1 - pulse) * 0.05);
    // the pin bobs, and grows with distance so it stays legible from the air
    this.pin.position.y = this.pinY + pulse * 5;
    const s = Math.min(3, Math.max(0.85, camDist / 300));
    this.pin.scale.setScalar(s);
    if (camPos) this.halo.lookAt(camPos);
    // the column would sit in front of its own subject at street level
    this.beamMat.opacity = 0.012 + 0.075 * Math.min(1, Math.max(0, (camDist - 180) / 460)) * (0.5 + pulse * 0.5);
  }

  dispose() {
    this.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.group.parent && this.group.parent.remove(this.group);
  }
}
