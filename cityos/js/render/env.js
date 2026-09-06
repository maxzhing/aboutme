// Sky, sun, stars, clouds, water and weather. Everything here is driven by the
// simulation clock so dawn/dusk/night and storms are the same state the sim uses.
import * as THREE from 'three';
import { WORLD, GRID, CELL, K } from '../core/defs.js';
import { clamp, smoothstep } from '../core/rng.js';

const SKY_VS = `
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const SKY_FS = `
precision highp float;
varying vec3 vDir;
uniform vec3 uZenith, uHorizon, uGround, uSunCol;
uniform vec3 uSunDir;
uniform float uCloud, uTime, uNight, uHaze;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5;} return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  float t = smoothstep(-0.12, 0.55, h);
  vec3 col = mix(uHorizon, uZenith, pow(t, 0.85));
  col = mix(uGround, col, smoothstep(-0.16, 0.02, h));
  // sun disc + glow
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunCol * pow(sd, 620.0) * 12.0;
  col += uSunCol * pow(sd, 8.0) * 0.34 * (1.0 - uNight*0.75);
  col += uSunCol * pow(sd, 2.0) * 0.10 * smoothstep(0.0,0.25,uSunDir.y+0.25);
  // clouds on a virtual dome plane
  if (h > 0.01) {
    vec2 uv = d.xz / max(h, 0.06) * 0.35;
    float c = fbm(uv * 1.6 + vec2(uTime*0.0045, uTime*0.0022));
    float c2 = fbm(uv * 3.4 - vec2(uTime*0.0075, 0.0));
    float cov = smoothstep(0.62 - uCloud*0.5, 0.92 - uCloud*0.35, c*0.65 + c2*0.35);
    cov *= smoothstep(0.02, 0.22, h);
    vec3 cloudLit = mix(vec3(0.28,0.30,0.36), vec3(1.0,0.97,0.92), clamp(uSunDir.y*1.6+0.35,0.0,1.0));
    cloudLit = mix(cloudLit, uSunCol*1.2, pow(sd,3.0)*0.5);
    cloudLit = mix(cloudLit*0.25, cloudLit, 1.0-uNight*0.8);
    col = mix(col, cloudLit, cov*0.92);
  }
  col = mix(col, col*1.06 + vec3(0.02,0.03,0.05), uHaze*0.4);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const WATER_VS = `
varying vec3 vWorld; varying vec2 vUvW;
void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz; vUvW = position.xz;
  gl_Position = projectionMatrix * viewMatrix * wp; }`;

const WATER_FS = `
precision highp float;
varying vec3 vWorld; varying vec2 vUvW;
uniform vec3 uDeep, uShallow, uSkyCol, uSunCol, uSunDir, uCamPos, uCityGlow;
uniform float uTime, uNight, uRain, uWind;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 p = vUvW * 0.011;
  float w1 = noise(p + vec2(uTime*0.035, uTime*0.02));
  float w2 = noise(p*2.3 - vec2(uTime*0.055, uTime*0.03));
  float w3 = noise(p*5.5 + vec2(uTime*0.10, -uTime*0.06));
  float hgt = (w1*0.6 + w2*0.28 + w3*0.12);
  float amp = 0.16 + uWind*0.55;
  vec3 nrm = normalize(vec3((w2-w1)*amp, 1.0, (w3-w2)*amp));
  vec3 V = normalize(uCamPos - vWorld);
  float fres = pow(1.0 - max(dot(nrm, V), 0.0), 3.2);
  vec3 base = mix(uDeep, uShallow, hgt);
  vec3 col = mix(base, uSkyCol, clamp(fres*1.25, 0.0, 0.92));
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(nrm, H), 0.0), 340.0);
  col += uSunCol * spec * 1.4;
  float glint = pow(max(dot(nrm,H),0.0), 40.0) * 0.05;
  col += uSunCol * glint;
  // city lights smearing across the water at night
  float streak = noise(vec2(vUvW.x*0.02, vUvW.y*0.5 + uTime*0.05));
  col += uCityGlow * uNight * (0.20 + streak*0.35) * (0.35 + fres*0.9);
  // rain stipple
  float r = noise(vUvW*1.2 + uTime*4.0);
  col += vec3(0.05,0.06,0.08) * uRain * step(0.9, r);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Environment {
  constructor(scene, renderer, world) {
    this.scene = scene; this.renderer = renderer; this.world = world;

    this.skyUniforms = {
      uZenith: { value: new THREE.Color(0x2d5fa8) }, uHorizon: { value: new THREE.Color(0xa8c6e0) },
      uGround: { value: new THREE.Color(0x25292e) }, uSunCol: { value: new THREE.Color(0xfff2d8) },
      uSunDir: { value: new THREE.Vector3(0.3, 0.6, 0.4) }, uCloud: { value: 0.25 },
      uTime: { value: 0 }, uNight: { value: 0 }, uHaze: { value: 0.2 },
    };
    const skyGeo = new THREE.SphereGeometry(WORLD * 3.2, 32, 24);
    this.sky = new THREE.Mesh(skyGeo, new THREE.ShaderMaterial({
      vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: this.skyUniforms,
      side: THREE.BackSide, depthWrite: false, fog: false,
    }));
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1000;
    scene.add(this.sky);

    // lights
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const S = 340;
    this.sun.shadow.camera.left = -S; this.sun.shadow.camera.right = S;
    this.sun.shadow.camera.top = S; this.sun.shadow.camera.bottom = -S;
    this.sun.shadow.camera.near = 10; this.sun.shadow.camera.far = 2200;
    this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.5;
    scene.add(this.sun); scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0x9fc4e8, 0x4a4438, 0.9);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.18);
    scene.add(this.ambient);

    // stars
    const sc = 1400, sp = new Float32Array(sc * 3), ss = new Float32Array(sc);
    for (let i = 0; i < sc; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.98);
      const r = WORLD * 2.6;
      sp[i * 3] = Math.sin(ph) * Math.cos(th) * r;
      sp[i * 3 + 1] = Math.cos(ph) * r;
      sp[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      ss[i] = 1 + Math.random() * 3.2;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    starGeo.setAttribute('sz', new THREE.Float32BufferAttribute(ss, 1));
    this.starMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: `attribute float sz; varying float vS; void main(){ vS=sz; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=sz*1.6; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uOpacity; varying float vS; void main(){ vec2 c=gl_PointCoord-0.5; float d=1.0-smoothstep(0.1,0.5,length(c)); gl_FragColor=vec4(vec3(1.0,0.98,0.92), d*uOpacity*(0.4+vS*0.2)); }`,
      transparent: true, depthWrite: false, fog: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.frustumCulled = false; this.stars.renderOrder = -999;
    scene.add(this.stars);

    // moon
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(WORLD * 0.045, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xe8e6df, fog: false }));
    this.moon.renderOrder = -998;
    scene.add(this.moon);

    // water
    this.waterUniforms = {
      uDeep: { value: new THREE.Color(0x10202e) }, uShallow: { value: new THREE.Color(0x27556b) },
      uSkyCol: { value: new THREE.Color(0x9ec0e0) }, uSunCol: { value: new THREE.Color(0xfff0d0) },
      uSunDir: { value: new THREE.Vector3(0.3, 0.6, 0.4) }, uCamPos: { value: new THREE.Vector3() },
      uCityGlow: { value: new THREE.Color(0x2a1c0a) }, uTime: { value: 0 },
      uNight: { value: 0 }, uRain: { value: 0 }, uWind: { value: 0.1 },
    };
    const wgeo = new THREE.PlaneGeometry(WORLD * 3, WORLD * 3, 1, 1);
    wgeo.rotateX(-Math.PI / 2);
    // Opaque, not transparent: the sea belongs in the depth-sorted opaque pass,
    // otherwise it is drawn after the streets and paints over them.
    this.water = new THREE.Mesh(wgeo, new THREE.ShaderMaterial({
      vertexShader: WATER_VS, fragmentShader: WATER_FS, uniforms: this.waterUniforms,
      transparent: false, depthWrite: true, depthTest: true, fog: false,
    }));
    this.water.position.y = -1.6;
    scene.add(this.water);

    // rain
    this.rainCount = 5000;
    const rg = new THREE.BufferGeometry();
    const rp = new Float32Array(this.rainCount * 3), rv = new Float32Array(this.rainCount);
    for (let i = 0; i < this.rainCount; i++) {
      rp[i * 3] = (Math.random() - 0.5) * 700; rp[i * 3 + 1] = Math.random() * 260; rp[i * 3 + 2] = (Math.random() - 0.5) * 700;
      rv[i] = 0.6 + Math.random() * 0.8;
    }
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    rg.setAttribute('spd', new THREE.Float32BufferAttribute(rv, 1));
    this.rainMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uOrigin: { value: new THREE.Vector3() }, uWind: { value: new THREE.Vector2(6, 2) } },
      vertexShader: `attribute float spd; uniform float uTime; uniform vec3 uOrigin; uniform vec2 uWind; varying float vA;
        void main(){ vec3 p = position;
          p.y = mod(p.y - uTime*130.0*spd, 260.0);
          p.x += uWind.x * (260.0-p.y)*0.06; p.z += uWind.y * (260.0-p.y)*0.06;
          p += vec3(uOrigin.x, 0.0, uOrigin.z);
          vA = spd;
          vec4 mv = modelViewMatrix*vec4(p,1.0);
          gl_PointSize = max(1.2, 26.0/ -mv.z * 8.0);
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform float uOpacity; varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float d=1.0-smoothstep(0.0,0.5,abs(c.x)*3.0); gl_FragColor=vec4(0.72,0.80,0.92, d*uOpacity*0.5); }`,
      transparent: true, depthWrite: false, fog: false,
    });
    this.rain = new THREE.Points(rg, this.rainMat);
    this.rain.frustumCulled = false;
    scene.add(this.rain);

    this.fog = new THREE.FogExp2(0x9ec0e0, 0.00018);
    scene.fog = this.fog;
    this.nightFactor = 0;
  }

  // hour: 0..24 float, weather: {type, cloud, rain, wind}
  update(hour, weather, camPos, dt, blackoutFrac = 0) {
    const rad = ((hour - 6) / 24) * Math.PI * 2;
    const elev = Math.sin(((hour - 6) / 12) * Math.PI) * 1.05;
    const az = rad;
    const dir = new THREE.Vector3(Math.cos(az) * 0.85, Math.max(-0.4, elev), Math.sin(az) * 0.5).normalize();
    const dayT = clamp((dir.y + 0.06) / 0.30, 0, 1);           // 0 = night, 1 = full day
    const goldT = smoothstep(0.0, 0.32, dir.y) * (1 - smoothstep(0.28, 0.62, dir.y));
    this.nightFactor = 1 - dayT;

    const night = { z: [0.020, 0.032, 0.070], h: [0.055, 0.080, 0.135], g: [0.03, 0.035, 0.045] };
    const dusk = { z: [0.105, 0.115, 0.255], h: [0.72, 0.34, 0.16], g: [0.09, 0.07, 0.07] };
    const day = { z: [0.145, 0.330, 0.700], h: [0.60, 0.74, 0.90], g: [0.14, 0.15, 0.16] };
    const mixArr = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    let z = mixArr(night.z, day.z, dayT), h = mixArr(night.h, day.h, dayT), gr = mixArr(night.g, day.g, dayT);
    z = mixArr(z, dusk.z, goldT * 0.85); h = mixArr(h, dusk.h, goldT * 0.95); gr = mixArr(gr, dusk.g, goldT * 0.5);
    const cloud = weather.cloud;
    const desat = cloud * 0.55;
    const grey = (c) => [c[0] * (1 - desat) + 0.42 * desat, c[1] * (1 - desat) + 0.45 * desat, c[2] * (1 - desat) + 0.50 * desat];
    z = grey(z); h = grey(h);

    this.skyUniforms.uZenith.value.setRGB(z[0], z[1], z[2]);
    this.skyUniforms.uHorizon.value.setRGB(h[0], h[1], h[2]);
    this.skyUniforms.uGround.value.setRGB(gr[0], gr[1], gr[2]);
    const sunTint = new THREE.Color().setRGB(1.0, 0.86 - goldT * 0.22, 0.68 - goldT * 0.36);
    this.skyUniforms.uSunCol.value.copy(sunTint);
    this.skyUniforms.uSunDir.value.copy(dir);
    this.skyUniforms.uCloud.value = cloud;
    this.skyUniforms.uNight.value = this.nightFactor;
    this.skyUniforms.uHaze.value = 0.15 + cloud * 0.35;

    // sun / sky lights
    const sunI = (0.10 + 3.0 * clamp(dir.y, 0, 1)) * (1 - cloud * 0.62);
    this.sun.intensity = sunI;
    this.sun.color.copy(sunTint);
    this.sun.position.set(dir.x, Math.max(0.05, dir.y), dir.z).multiplyScalar(900).add(camPos ? new THREE.Vector3(camPos.x, 0, camPos.z) : new THREE.Vector3());
    if (camPos) { this.sun.target.position.set(camPos.x, 0, camPos.z); this.sun.target.updateMatrixWorld(); }
    this.sun.visible = dir.y > -0.02;
    // At night the sky stops filling the scene — facades go dark and the
    // windows, streetlights and headlights become the light in the picture.
    this.hemi.intensity = 0.030 + 1.06 * dayT * (1 - cloud * 0.3) + cloud * 0.20 * dayT;
    // keep some warmth in the sky bounce so grey surfaces do not read as water
    this.hemi.color.setRGB(h[0] * 0.75 + 0.30, h[1] * 0.80 + 0.26, h[2] * 0.90 + 0.20);
    this.hemi.groundColor.setRGB(0.16 + 0.12 * dayT, 0.14 + 0.10 * dayT, 0.11 + 0.07 * dayT);
    // a little ambient at night so the city reads as lit, not silhouetted
    this.ambient.intensity = 0.016 + 0.18 * dayT + this.nightFactor * 0.012;

    this.starMat.uniforms.uOpacity.value = clamp(this.nightFactor * 1.35 - 0.35, 0, 1) * (1 - cloud * 0.85);
    const mAz = az + Math.PI;
    this.moon.position.set(Math.cos(mAz) * 0.85, Math.max(-0.3, -elev), Math.sin(mAz) * 0.5).normalize().multiplyScalar(WORLD * 2.2);
    if (camPos) this.moon.position.add(new THREE.Vector3(camPos.x, 0, camPos.z));
    this.moon.visible = this.nightFactor > 0.15 && this.moon.position.y > 0;
    this.moon.material.opacity = clamp(this.nightFactor * 1.2, 0, 1);

    // fog matches the horizon so distance dissolves into sky
    const glow = this.nightFactor * (1 - blackoutFrac * 0.8) * 0.10;
    this.fog.color.setRGB(h[0] * 0.95 + 0.02 + glow * 1.5, h[1] * 0.95 + 0.02 + glow, h[2] * 0.95 + 0.03 + glow * 0.5);
    const alt = camPos ? Math.max(0, camPos.y) : 300;
    const altFade = 1 / (1 + alt / 420);
    this.fog.density = (0.00030 + cloud * 0.00022 + weather.rain * 0.00075 + this.nightFactor * 0.00012) * (0.30 + 0.70 * altFade);

    // water
    const wu = this.waterUniforms;
    wu.uTime.value += dt;
    wu.uSkyCol.value.setRGB(h[0] * 0.9 + z[0] * 0.3, h[1] * 0.9 + z[1] * 0.3, h[2] * 0.9 + z[2] * 0.35);
    wu.uSunCol.value.copy(sunTint).multiplyScalar(0.4 + sunI * 0.3);
    wu.uSunDir.value.copy(dir);
    wu.uNight.value = this.nightFactor * (1 - blackoutFrac * 0.85);
    wu.uRain.value = weather.rain;
    wu.uWind.value = weather.wind;
    wu.uDeep.value.setRGB(0.028 + dayT * 0.035, 0.055 + dayT * 0.085, 0.085 + dayT * 0.13);
    wu.uShallow.value.setRGB(0.05 + dayT * 0.10, 0.13 + dayT * 0.22, 0.18 + dayT * 0.26);
    if (camPos) wu.uCamPos.value.copy(camPos);

    this.skyUniforms.uTime.value += dt;
    this.rainMat.uniforms.uTime.value += dt;
    this.rainMat.uniforms.uOpacity.value = weather.rain;
    this.rainMat.uniforms.uWind.value.set(weather.wind * 30, weather.wind * 12);
    if (camPos) {
      this.rain.visible = weather.rain > 0.01;
      this.rainMat.uniforms.uOrigin.value.copy(camPos);
      this.water.position.x = camPos.x * 0.0; this.water.position.z = 0;
      this.sky.position.set(camPos.x, 0, camPos.z);
      this.stars.position.set(camPos.x, 0, camPos.z);
    }
    return { night: this.nightFactor, sunDir: dir, dayT };
  }
}
