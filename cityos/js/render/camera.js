// Orbit/pan/zoom camera with smooth damping, cinematic fly-to transitions and a
// continuous range from metropolitan altitude down to walking on the sidewalk.
import * as THREE from 'three';
import { WORLD, CELL, GRID } from '../core/defs.js';
import { clamp, smoothstep } from '../core/rng.js';

const D2R = Math.PI / 180;

export const VIEW_PRESETS = {
  city:     { dist: 760, polar: 44, label: 'City View' },
  district: { dist: 300, polar: 52, label: 'District View' },
  street:   { dist: 14,  polar: 86, label: 'Street View' },
  building: { dist: 78,  polar: 58, label: 'Building View' },
};

export class CameraRig {
  constructor(camera, dom) {
    this.cam = camera; this.dom = dom;
    this.target = new THREE.Vector3(0, 0, 60);
    this.dTarget = this.target.clone();
    this.dist = 820; this.dDist = 820;
    this.azim = -55 * D2R; this.dAzim = this.azim;
    this.polar = 42 * D2R; this.dPolar = this.polar;
    this.minDist = 6; this.maxDist = 1900;
    this.minPolar = 6 * D2R; this.maxPolar = 89 * D2R;
    this.fly = null;
    this.cinematic = false;
    this.cinematicT = 0;
    this.keys = new Set();
    this.enabled = true;
    this.onChange = null;
    this._bind();
  }

  _bind() {
    const dom = this.dom;
    this.dragging = 0; this.lastX = 0; this.lastY = 0; this.moved = 0;
    dom.addEventListener('contextmenu', e => e.preventDefault());
    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      dom.setPointerCapture(e.pointerId);
      this.dragging = e.button === 0 ? (e.shiftKey ? 2 : 1) : 2;
      if (e.button === 1) this.dragging = 2;
      this.lastX = e.clientX; this.lastY = e.clientY; this.moved = 0;
      this.fly = null; this.cinematic = false;
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this.dragging || !this.enabled) return;
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      this.lastX = e.clientX; this.lastY = e.clientY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      if (this.dragging === 2) {
        this.dAzim -= dx * 0.0045;
        this.dPolar = clamp(this.dPolar - dy * 0.0038, this.minPolar, this.maxPolar);
      } else {
        const k = this.dDist * 0.0016;
        const s = Math.sin(this.dAzim), c = Math.cos(this.dAzim);
        this.dTarget.x -= (dx * c - dy * s) * k;
        this.dTarget.z -= (dx * s + dy * c) * k;
        this._clampTarget();
      }
      if (this.onChange) this.onChange();
    });
    const up = (e) => { if (this.dragging) { this.dragging = 0; try { dom.releasePointerCapture(e.pointerId); } catch (_) {} } };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    dom.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.fly = null; this.cinematic = false;
      const f = Math.exp(e.deltaY * 0.0011);
      const nd = clamp(this.dDist * f, this.minDist, this.maxDist);
      // zoom toward the cursor so the point under the mouse stays put
      const hit = this.groundAt(e.clientX, e.clientY);
      if (hit) {
        const t = 1 - nd / this.dDist;
        this.dTarget.lerp(new THREE.Vector3(hit.x, 0, hit.z), clamp(t * 0.9, -0.6, 0.6));
        this._clampTarget();
      }
      this.dDist = nd;
      if (this.onChange) this.onChange();
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  _clampTarget() {
    const L = WORLD * 0.62;
    this.dTarget.x = clamp(this.dTarget.x, -L, L);
    this.dTarget.z = clamp(this.dTarget.z, -L, L);
  }

  groundAt(clientX, clientY, plane = 0) {
    const r = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.cam);
    const p = new THREE.Plane(new THREE.Vector3(0, 1, 0), -plane);
    const out = new THREE.Vector3();
    return ray.ray.intersectPlane(p, out) ? out : null;
  }
  raycaster(clientX, clientY) {
    const r = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.cam);
    return ray;
  }

  flyTo(pos, dist, azim, polar, ms = 1500) {
    this.fly = {
      t: 0, ms,
      from: { p: this.dTarget.clone(), d: this.dDist, a: this.dAzim, po: this.dPolar },
      to: { p: pos.clone(), d: dist, a: azim === undefined ? this.dAzim : azim, po: polar === undefined ? this.dPolar : polar },
    };
    // take the short way around the circle
    let da = this.fly.to.a - this.fly.from.a;
    while (da > Math.PI) this.fly.to.a -= Math.PI * 2;
    while (da < -Math.PI) { this.fly.to.a += Math.PI * 2; da = this.fly.to.a - this.fly.from.a; }
    this.cinematic = false;
  }

  preset(name, focus) {
    const p = VIEW_PRESETS[name];
    if (!p) return;
    const t = focus ? focus.clone() : this.dTarget.clone();
    this.flyTo(t, p.dist, this.dAzim, p.polar * D2R, 1400);
    this.viewName = name;
  }

  get viewMode() {
    if (this.dist < 30) return 'street';
    if (this.dist < 130) return 'building';
    if (this.dist < 430) return 'district';
    return 'city';
  }

  update(dt) {
    // keyboard navigation
    if (this.enabled && this.keys.size) {
      const fast = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 3 : 1;
      const sp = (this.dDist * 0.55 + 20) * dt * fast;
      const s = Math.sin(this.dAzim), c = Math.cos(this.dAzim);
      let mx = 0, mz = 0;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mz -= 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mz += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
      if (mx || mz) {
        const l = Math.hypot(mx, mz);
        this.dTarget.x += ((mx / l) * c - (mz / l) * s) * sp;
        this.dTarget.z += ((mx / l) * s + (mz / l) * c) * sp;
        this._clampTarget(); this.fly = null; this.cinematic = false;
      }
      if (this.keys.has('KeyQ')) { this.dAzim -= dt * 1.1; this.fly = null; }
      if (this.keys.has('KeyE')) { this.dAzim += dt * 1.1; this.fly = null; }
      if (this.keys.has('KeyR')) { this.dDist = clamp(this.dDist * (1 - dt * 1.2), this.minDist, this.maxDist); this.fly = null; }
      if (this.keys.has('KeyF')) { this.dDist = clamp(this.dDist * (1 + dt * 1.2), this.minDist, this.maxDist); this.fly = null; }
    }

    if (this.fly) {
      this.fly.t += dt * 1000;
      const t = clamp(this.fly.t / this.fly.ms, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const f = this.fly.from, to = this.fly.to;
      this.dTarget.lerpVectors(f.p, to.p, e);
      // arc through altitude so long moves feel like flight, not a dolly
      const arc = Math.sin(e * Math.PI) * Math.min(600, Math.abs(to.d - f.d) * 0.35 + f.p.distanceTo(to.p) * 0.18);
      this.dDist = f.d + (to.d - f.d) * e + arc;
      this.dAzim = f.a + (to.a - f.a) * e;
      this.dPolar = f.po + (to.po - f.po) * e;
      if (t >= 1) { this.dDist = to.d; this.fly = null; }
    }

    if (this.cinematic) {
      this.cinematicT += dt;
      this.dAzim += dt * 0.035;
      this.dPolar = (40 + Math.sin(this.cinematicT * 0.13) * 9) * D2R;
      this.dDist = 520 + Math.sin(this.cinematicT * 0.09) * 190;
    }

    // critically-damped smoothing
    const k = 1 - Math.pow(0.0016, dt);
    this.target.lerp(this.dTarget, k);
    this.dist += (this.dDist - this.dist) * k;
    this.azim += (this.dAzim - this.azim) * k;
    this.polar += (this.dPolar - this.polar) * k;

    // ease the pitch toward horizontal as we descend into the street
    const streetT = smoothstep(60, 12, this.dist);
    const polar = this.polar + streetT * (86 * D2R - this.polar) * 0.0;
    const sp = Math.sin(polar), cp = Math.cos(polar);
    const y = Math.max(1.6, this.dist * cp);
    this.cam.position.set(
      this.target.x + Math.cos(this.azim) * this.dist * sp,
      y + (streetT > 0.5 ? 1.2 : 0),
      this.target.z + Math.sin(this.azim) * this.dist * sp
    );
    const lookY = this.target.y + streetT * Math.min(14, this.dist * 0.5);
    this.cam.lookAt(this.target.x, lookY, this.target.z);
    this.cam.near = clamp(this.dist * 0.008, 0.12, 4);
    this.cam.far = 9000;
    this.cam.updateProjectionMatrix();
  }
}
