// One camera. Orbit, pan, zoom, scripted flights and citizen-follow all drive
// the same four numbers — target, distance, azimuth, polar — and every one of
// them is damped and clamped in a single place, so the camera can never
// teleport, tip past vertical, or end up inside a building.
import * as THREE from 'three';
import { WORLD, CELL, GRID } from '../core/defs.js';
import { clamp, smoothstep } from '../core/rng.js';

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;

export const VIEW_PRESETS = {
  city:     { dist: 780, polar: 42, label: 'City' },
  district: { dist: 320, polar: 52, label: 'District' },
  building: { dist: 95,  polar: 60, label: 'Building' },
  street:   { dist: 22,  polar: 82, label: 'Street' },
};

// Shortest signed angular difference, so orbiting never spins the long way.
function angleDelta(from, to) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export class CameraRig {
  constructor(camera, dom) {
    this.cam = camera; this.dom = dom;

    // desired state (what input writes) and smoothed state (what renders)
    this.dTarget = new THREE.Vector3(0, 0, 60);
    this.target = this.dTarget.clone();
    this.dDist = 820; this.dist = 820;
    this.dAzim = -55 * D2R; this.azim = this.dAzim;
    this.dPolar = 42 * D2R; this.polar = this.dPolar;

    this.minDist = 9; this.maxDist = 1750;
    this.minPolar = 8 * D2R;

    this.fly = null;
    this.follow = null;
    this.followMemory = null;
    this.cinematic = false;
    this.cinematicT = 0;
    this.keys = new Set();
    this.enabled = true;
    this.viewName = 'city';
    this.onChange = null;

    // Filled in by the app: returns the height of whatever occupies a world
    // point, so the camera can refuse to go inside it.
    this.heightAt = () => 0;
    this._eye = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._bind();
  }

  // ---------------------------------------------------------------- limits
  // Close in you need a near-horizontal eye to walk the streets; far out that
  // same angle would bury the camera in the skyline, so the ceiling tightens
  // with distance.
  maxPolarFor(dist) {
    const t = smoothstep(45, 520, dist);
    return (86 - t * 22) * D2R;
  }

  // ---------------------------------------------------------------- input
  _bind() {
    const dom = this.dom;
    this.dragging = 0; this.lastX = 0; this.lastY = 0; this.moved = 0;
    dom.addEventListener('contextmenu', e => e.preventDefault());

    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      try { dom.setPointerCapture(e.pointerId); } catch (_) {}
      this.dragging = (e.button === 0 && !e.shiftKey) ? 1 : 2;
      this.lastX = e.clientX; this.lastY = e.clientY; this.moved = 0;
      this._interrupt();
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this.dragging || !this.enabled) return;
      const dx = e.clientX - this.lastX, dy = e.clientY - this.lastY;
      this.lastX = e.clientX; this.lastY = e.clientY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      if (this.dragging === 2) {
        this.dAzim -= dx * 0.0045;
        this.dPolar = clamp(this.dPolar - dy * 0.0038, this.minPolar, this.maxPolarFor(this.dDist));
      } else {
        // pan in the ground plane, scaled so a drag moves the same amount of
        // city at every altitude
        const k = this.dDist * 0.0016;
        const s = Math.sin(this.dAzim), c = Math.cos(this.dAzim);
        this.dTarget.x -= (dx * c - dy * s) * k;
        this.dTarget.z -= (dx * s + dy * c) * k;
        this._clampTarget();
      }
      if (this.onChange) this.onChange();
    });

    const up = (e) => {
      if (!this.dragging) return;
      this.dragging = 0;
      try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);

    dom.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this._interrupt();
      const f = Math.exp(clamp(e.deltaY, -260, 260) * 0.0011);
      const nd = clamp(this.dDist * f, this.minDist, this.maxDist);
      // zoom toward the cursor so the point under the mouse stays put
      const hit = this.groundAt(e.clientX, e.clientY);
      if (hit) {
        const t = clamp((1 - nd / this.dDist) * 0.9, -0.55, 0.55);
        this.dTarget.x += (hit.x - this.dTarget.x) * t;
        this.dTarget.z += (hit.z - this.dTarget.z) * t;
        this._clampTarget();
      }
      this.dDist = nd;
      this.dPolar = Math.min(this.dPolar, this.maxPolarFor(nd));
      if (this.onChange) this.onChange();
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  // Any manual input abandons a scripted move, but never snaps: the damping
  // simply starts chasing whatever the player is now asking for.
  _interrupt() {
    if (this.fly) { this._adoptFlyState(); this.fly = null; }
    this.cinematic = false;
    if (this.follow) this.stopFollow(false);
  }
  _adoptFlyState() {
    this.dTarget.copy(this.target);
    this.dDist = this.dist; this.dAzim = this.azim; this.dPolar = this.polar;
  }

  _clampTarget() {
    const L = WORLD * 0.56;
    this.dTarget.x = clamp(this.dTarget.x, -L, L);
    this.dTarget.z = clamp(this.dTarget.z, -L, L);
    this.dTarget.y = 0;
  }
  // Force every part of the camera state back inside its limits. Called after
  // the world is rebuilt and once a frame, so no input path or scripted move
  // can leave the camera somewhere it is not allowed to be.
  reclamp() {
    this._clampTarget();
    this.target.clamp(
      new THREE.Vector3(-WORLD * 0.56, 0, -WORLD * 0.56),
      new THREE.Vector3(WORLD * 0.56, 0, WORLD * 0.56));
    this.dDist = clamp(this.dDist, this.minDist, this.maxDist);
    this.dist = clamp(this.dist, this.minDist, this.maxDist);
    const maxP = this.maxPolarFor(this.dist);
    this.dPolar = clamp(this.dPolar, this.minPolar, this.maxPolarFor(this.dDist));
    this.polar = clamp(this.polar, this.minPolar, maxP);
  }

  // ---------------------------------------------------------------- picking
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

  // ---------------------------------------------------------------- moves
  // Every scripted move goes through here. Duration scales with how far there
  // is to travel, so short hops are quick and long flights still feel flown.
  flyTo(pos, dist, azim, polar, ms) {
    const to = {
      p: pos ? pos.clone() : this.dTarget.clone(),
      d: dist === undefined ? this.dDist : clamp(dist, this.minDist, this.maxDist),
      a: azim === undefined ? this.azim : azim,
      po: polar === undefined ? this.polar : polar,
    };
    to.po = clamp(to.po, this.minPolar, this.maxPolarFor(to.d));
    const from = { p: this.target.clone(), d: this.dist, a: this.azim, po: this.polar };
    const travel = from.p.distanceTo(to.p);
    const zoom = Math.abs(Math.log(to.d / Math.max(1, from.d)));
    const auto = clamp(520 + travel * 0.9 + zoom * 420, 500, 2400);
    this.fly = { t: 0, ms: ms || auto, from, to, arc: Math.min(520, travel * 0.22) };
    this.cinematic = false;
  }

  preset(name, focus) {
    const p = VIEW_PRESETS[name];
    if (!p) return;
    this.viewName = name;
    this.flyTo(focus ? focus.clone() : this.dTarget.clone(), p.dist, this.azim, p.polar * D2R);
  }

  get viewMode() {
    if (this.dist < 45) return 'street';
    if (this.dist < 150) return 'building';
    if (this.dist < 460) return 'district';
    return 'city';
  }

  // ---------------------------------------------------------------- follow
  // Remember where we were so leaving follow mode restores the same view
  // rather than stranding the player wherever the subject wandered.
  startFollow(subject, getPos) {
    if (!this.follow) {
      this.followMemory = { p: this.dTarget.clone(), d: this.dDist, a: this.dAzim, po: this.dPolar };
    }
    this.follow = { subject, getPos, settled: false };
    this.fly = null;
    this.cinematic = false;
  }
  stopFollow(restore = true) {
    if (!this.follow) return;
    this.follow = null;
    if (restore && this.followMemory) {
      const m = this.followMemory;
      this.flyTo(m.p, m.d, m.a, m.po, 1200);
    } else {
      this._adoptFlyState();
    }
    this.followMemory = null;
  }

  // ---------------------------------------------------------------- update
  update(dt) {
    // Scripted moves run on real elapsed time: a flight told to take 1.4 s must
    // take 1.4 s whether the renderer is managing 120 frames a second or four.
    // Damping keeps the tighter clamp, where a large step would overshoot.
    const real = Math.min(dt, 0.4);
    dt = Math.min(dt, 0.05);
    this._keyboard(real);
    this._script(real);

    // whatever just wrote to the desired state, it is legal from here on
    this._clampTarget();
    this.dDist = clamp(this.dDist, this.minDist, this.maxDist);

    // one damping constant for everything, frame-rate independent
    const k = 1 - Math.pow(0.0018, dt);
    const kSlow = 1 - Math.pow(0.02, dt);

    this.target.lerp(this.dTarget, this.follow ? kSlow : k);
    this.dist += (this.dDist - this.dist) * k;
    this.azim += angleDelta(this.azim, this.dAzim) * k;
    this.polar += (this.dPolar - this.polar) * k;

    // keep the smoothed angle legal even if a limit tightened under it
    const maxP = this.maxPolarFor(this.dist);
    this.dPolar = clamp(this.dPolar, this.minPolar, maxP);
    this.polar = clamp(this.polar, this.minPolar, maxP);

    const sp = Math.sin(this.polar), cp = Math.cos(this.polar);
    const eye = this._eye.set(
      this.target.x + Math.cos(this.azim) * this.dist * sp,
      this.dist * cp,
      this.target.z + Math.sin(this.azim) * this.dist * sp
    );

    // --- collision: lift the eye clear of whatever it would sit inside
    const clearance = clamp(this.dist * 0.06, 2.5, 26);
    let floor = this.heightAt(eye.x, eye.z) + clearance;
    // and clear of anything between the eye and what it is looking at
    const steps = 5;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = eye.x + (this.target.x - eye.x) * t;
      const sz = eye.z + (this.target.z - eye.z) * t;
      const h = this.heightAt(sx, sz) + clearance * 0.55;
      // only things nearer the eye than the target can block the view
      const allowed = h - (h - 2) * t;
      if (allowed > floor) floor = allowed;
    }
    eye.y = Math.max(eye.y, floor, 2.2);

    // aim a little above the target when low, so street view looks down a
    // street rather than at the tarmac
    const streetT = smoothstep(90, 20, this.dist);
    const lookY = this.target.y + streetT * Math.min(16, this.dist * 0.55);

    this.cam.position.copy(eye);
    this._look.set(this.target.x, lookY, this.target.z);
    this.cam.lookAt(this._look);
    this.cam.near = clamp(this.dist * 0.01, 0.25, 5);
    this.cam.far = 9500;
    this.cam.updateProjectionMatrix();
  }

  _keyboard(dt) {
    if (!this.enabled || !this.keys.size) return;
    const fast = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 3 : 1;
    const sp = (this.dDist * 0.5 + 26) * dt * fast;
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
      this._clampTarget();
      this._interrupt();
    }
    if (this.keys.has('KeyQ')) { this.dAzim -= dt * 1.1; this._interrupt(); }
    if (this.keys.has('KeyE')) { this.dAzim += dt * 1.1; this._interrupt(); }
    if (this.keys.has('KeyR')) { this.dDist = clamp(this.dDist * (1 - dt * 1.2), this.minDist, this.maxDist); this._interrupt(); }
    if (this.keys.has('KeyF')) { this.dDist = clamp(this.dDist * (1 + dt * 1.2), this.minDist, this.maxDist); this._interrupt(); }
  }

  _script(dt) {
    if (this.follow) {
      const p = this.follow.getPos();
      if (!p) { this.stopFollow(true); return; }
      this.dTarget.set(p.x, 0, p.z);
      this._clampTarget();
      if (!this.follow.settled) {
        // ease into the subject rather than snapping onto them
        this.dDist += (120 - this.dDist) * Math.min(1, dt * 1.6);
        this.dPolar += (62 * D2R - this.dPolar) * Math.min(1, dt * 1.6);
        if (Math.abs(this.dDist - 120) < 6) this.follow.settled = true;
      }
      return;
    }

    if (this.fly) {
      this.fly.t += dt * 1000;
      const t = clamp(this.fly.t / this.fly.ms, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const f = this.fly.from, to = this.fly.to;
      // drive the smoothed state directly: a flight is the authority while it runs
      this.target.lerpVectors(f.p, to.p, e);
      this.dist = f.d + (to.d - f.d) * e + Math.sin(e * Math.PI) * this.fly.arc;
      this.azim = f.a + angleDelta(f.a, to.a) * e;
      this.polar = f.po + (to.po - f.po) * e;
      this.dTarget.copy(this.target);
      this.dDist = this.dist; this.dAzim = this.azim; this.dPolar = this.polar;
      if (t >= 1) { this.dDist = to.d; this.dist = to.d; this.fly = null; }
      return;
    }

    if (this.cinematic) {
      this.cinematicT += dt;
      this.dAzim += dt * 0.03;
      this.dPolar = (42 + Math.sin(this.cinematicT * 0.11) * 7) * D2R;
      this.dDist = 560 + Math.sin(this.cinematicT * 0.08) * 170;
    }
  }
}
