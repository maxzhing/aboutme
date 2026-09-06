// Data overlays. A 128x128 data texture is painted from the live simulation
// fields and projected onto the ground *and* onto the buildings, so switching
// layer visibly repaints the 3D city rather than just a 2D map.
import * as THREE from 'three';
import { GRID, CELL, WORLD, K, Z, ZONE_SPEC, RC } from '../core/defs.js';
import { clamp } from '../core/rng.js';

const N = GRID * GRID;

function ramp(t, stops) {
  t = clamp(t, 0, 1);
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (t <= b[0]) {
      const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
  }
  const l = stops[stops.length - 1];
  return [l[1], l[2], l[3]];
}
const HEAT = [[0, 30, 90, 160], [0.35, 60, 180, 120], [0.6, 235, 200, 60], [0.82, 240, 120, 40], [1, 230, 40, 50]];
const COOL = [[0, 20, 40, 70], [0.5, 40, 150, 200], [1, 150, 240, 255]];
const GOLD = [[0, 20, 50, 90], [0.45, 60, 150, 190], [0.75, 230, 190, 90], [1, 255, 235, 170]];
const GREEN = [[0, 60, 40, 30], [0.5, 120, 170, 70], [1, 60, 230, 120]];
const DIRT = [[0, 40, 80, 60], [0.4, 190, 190, 90], [0.75, 170, 110, 50], [1, 130, 50, 40]];

export class Overlays {
  constructor(scene, world, sim) {
    this.scene = scene; this.world = world; this.sim = sim;
    this.data = new Uint8Array(N * 4);
    this.tex = new THREE.DataTexture(this.data, GRID, GRID, THREE.RGBAFormat);
    this.tex.magFilter = THREE.LinearFilter;
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.needsUpdate = true;
    this.layer = 'none';
    this.mix = { value: 0 };
    this.uniforms = {
      uOverlay: { value: this.tex },
      uOverlayMix: this.mix,
      uWorldSize: { value: WORLD },
    };

    const geo = new THREE.PlaneGeometry(WORLD, WORLD, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.plane = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true, depthWrite: false, fog: false,
      vertexShader: `varying vec2 vUvW; void main(){ vUvW = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D uOverlay; uniform float uOverlayMix;
        varying vec2 vUvW;
        void main(){
          vec4 c = texture2D(uOverlay, vec2(vUvW.x, 1.0 - vUvW.y));
          if (c.a < 0.01 || uOverlayMix < 0.01) discard;
          gl_FragColor = vec4(c.rgb, c.a * uOverlayMix * 0.82);
        }`,
    }));
    this.plane.position.y = 0.55;
    this.plane.renderOrder = 8;
    this.plane.visible = false;
    scene.add(this.plane);
  }

  // Injects overlay sampling into any MeshStandardMaterial so buildings tint too.
  // `tag` must be unique per material: three keys its program cache on the
  // source text of onBeforeCompile, and two wrappers that stringify alike would
  // silently share one compiled shader.
  attach(material, tag) {
    const self = this;
    const prev = material.onBeforeCompile;
    const prevKey = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : () => '';
    material.customProgramCacheKey = () => 'cityos:overlay:' + tag + '|' + prevKey();
    material.onBeforeCompile = (shader) => {
      if (prev) prev(shader);
      Object.assign(shader.uniforms, self.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n varying vec3 vWorldPosO;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n vWorldPosO = (modelMatrix * vec4(transformed,1.0)).xyz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uOverlay; uniform float uOverlayMix; uniform float uWorldSize;
          varying vec3 vWorldPosO;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          if (uOverlayMix > 0.01) {
            vec2 ouv = (vWorldPosO.xz / uWorldSize) + 0.5;
            vec4 oc = texture2D(uOverlay, vec2(ouv.x, 1.0 - ouv.y));
            diffuseColor.rgb = mix(diffuseColor.rgb, oc.rgb, oc.a * uOverlayMix * 0.80);
          }`);
    };
    material.needsUpdate = true;
  }

  set(layer) {
    this.layer = layer;
    this.plane.visible = layer !== 'none';
    this.repaint();
  }

  repaint() {
    const d = this.data, g = this.world.g, sim = this.sim, layer = this.layer;
    if (layer === 'none') { this.mix.value = 0; return; }
    this.mix.value = 1;
    const f = sim.fields, tr = sim.traffic;
    let maxPol = 0.0001, maxPop = 0.0001, maxJobs = 0.0001;
    for (let i = 0; i < N; i++) {
      if (g.pol[i] > maxPol) maxPol = g.pol[i];
      if (f.popDens[i] > maxPop) maxPop = f.popDens[i];
      if (f.jobsAcc[i] > maxJobs) maxJobs = f.jobsAcc[i];
    }
    for (let i = 0; i < N; i++) {
      let r = 0, gr = 0, b = 0, a = 0;
      const isRoad = g.kind[i] === K.ROAD;
      const isWater = g.kind[i] === K.WATER;
      switch (layer) {
        case 'traffic': {
          if (!isRoad) break;
          const sat = clamp(tr.congestionAt(i) / 1.15, 0, 1);
          [r, gr, b] = ramp(sat, HEAT); a = 0.55 + sat * 0.45;
          break;
        }
        case 'population': { const t = clamp(f.popDens[i] / maxPop, 0, 1); if (t <= 0.001) break; [r, gr, b] = ramp(Math.sqrt(t), COOL); a = 0.25 + t * 0.7; break; }
        case 'density': {
          const bi = g.bld[i]; const bl = bi >= 0 ? this.world.buildings[bi] : null;
          if (!bl) break; const t = clamp(bl.floors / 45, 0, 1);
          [r, gr, b] = ramp(t, GOLD); a = 0.3 + t * 0.6; break;
        }
        case 'income': {
          const bi = g.bld[i]; const bl = bi >= 0 ? this.world.buildings[bi] : null;
          if (!bl || bl.residents <= 0) break;
          const t = clamp(g.land[i], 0, 1);
          [r, gr, b] = ramp(t, GOLD); a = 0.28 + t * 0.6; break;
        }
        case 'housing': {
          const bi = g.bld[i]; const bl = bi >= 0 ? this.world.buildings[bi] : null;
          if (!bl || bl.capacity <= 0) break;
          const occ = clamp(bl.residents / Math.max(1, bl.capacity), 0, 1);
          [r, gr, b] = ramp(1 - occ, HEAT); a = 0.55; break;
        }
        case 'employment': { const t = clamp(f.jobsAcc[i] / maxJobs, 0, 1); if (t <= 0.001) break; [r, gr, b] = ramp(Math.sqrt(t), GOLD); a = 0.25 + t * 0.65; break; }
        case 'pollution': { const t = clamp(g.pol[i] / maxPol, 0, 1); if (t < 0.02) break; [r, gr, b] = ramp(t, DIRT); a = 0.2 + t * 0.7; break; }
        case 'crime': { const t = clamp(g.crime[i] * 2.2, 0, 1); if (t < 0.02) break; [r, gr, b] = ramp(t, HEAT); a = 0.2 + t * 0.65; break; }
        case 'noise': { const t = clamp(g.noise[i] * 1.6, 0, 1); if (t < 0.02) break; [r, gr, b] = ramp(t, HEAT); a = 0.18 + t * 0.6; break; }
        case 'transit': { const t = clamp(f.transitAcc[i], 0, 1); if (t < 0.02) break; [r, gr, b] = ramp(t, COOL); a = 0.2 + t * 0.7; break; }
        case 'services': { const t = clamp(f.svcAll[i], 0, 1); if (t < 0.02) break; [r, gr, b] = ramp(t, GREEN); a = 0.2 + t * 0.65; break; }
        case 'utilities': {
          const bi = g.bld[i]; const bl = bi >= 0 ? this.world.buildings[bi] : null;
          if (!bl) break;
          const ok = bl.powered && bl.watered;
          r = ok ? 60 : 235; gr = ok ? 200 : 70; b = ok ? 130 : 60; a = ok ? 0.28 : 0.75; break;
        }
        case 'landvalue': { const t = clamp(g.land[i] / 1.1, 0, 1); if (isWater) break; [r, gr, b] = ramp(t, GOLD); a = 0.3 + t * 0.55; break; }
        case 'zoning': {
          const z = g.zone[i]; if (!z) break;
          const c = new THREE.Color(ZONE_SPEC[z].color);
          r = c.r * 255; gr = c.g * 255; b = c.b * 255; a = 0.62; break;
        }
        default: break;
      }
      d[i * 4] = r; d[i * 4 + 1] = gr; d[i * 4 + 2] = b; d[i * 4 + 3] = a * 255;
    }
    this.tex.needsUpdate = true;
  }
}
