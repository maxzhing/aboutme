// CITYOS — application shell. Owns the renderer, the simulation, and the loop
// that keeps the two in step.
import * as THREE from 'three';
import { GRID, CELL, WORLD, CHUNK, CHUNKS, K, Z, RC, BT, SPEEDS, MODES, ZONE_SPEC } from './core/defs.js';
import { clamp } from './core/rng.js';
import { generateWorld, makeTerrainFns } from './world/gen.js';
import { buildNetwork, updateSignals } from './world/network.js';
import { CitySurface } from './render/city.js';
import { BuildingLayer } from './render/buildings.js';
import { Environment } from './render/env.js';
import { CameraRig, VIEW_PRESETS } from './render/camera.js';
import { buildHinterland } from './render/hinterland.js';
import { Props } from './render/props.js';
import { Agents } from './render/agents.js';
import { Overlays } from './render/overlays.js';
import { DistrictLabels } from './render/labels.js';
import { Incidents } from './render/incidents.js';
import { CitySim } from './sim/sim.js';
import { UI } from './ui/ui.js';
import { BuildTools } from './ui/tools.js';
import { Modals } from './ui/modals.js';
import { WhatIf } from './ui/whatif.js';
import { SaveSystem } from './ui/save.js';
import { inspectBuilding, inspectRoad, inspectCitizen, inspectDistrict, inspectVehicle, inspectTile, inspectTransitLine } from './ui/inspect.js';

const idx = (x, y) => y * GRID + x;
const wxc = (x) => (x + 0.5) * CELL - WORLD / 2;
const DEFAULT_SEED = 20350515;

class App {
  constructor() {
    this.canvas = document.getElementById('view');
    this.quality = 1;
    this.speedIdx = 1;
    this.layer = 'none';
    this.selection = null;
    this.bloomEnabled = true;
    this.perfLevel = 0;
    this.autoQuality = true;
    this.buildNetworkFn = buildNetwork;
    this.boot();
  }

  async boot() {
    const step = (pct, msg) => {
      const b = document.getElementById('bootbar'), s = document.getElementById('bootstep');
      if (b) b.style.width = pct + '%';
      if (s) s.textContent = msg;
      return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    };

    await step(6, 'starting renderer');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 1, 9000);
    this.rig = new CameraRig(this.camera, this.canvas);

    await step(16, 'generating the metropolis');
    this.seed = DEFAULT_SEED;
    this.world = generateWorld(this.seed);
    this.terrain = makeTerrainFns(this.seed);
    this.net = buildNetwork(this.world.g);

    await step(34, 'starting the simulation');
    this.sim = new CitySim(this.world, this.net, { seed: this.seed, mode: 'mayor' });

    await step(50, 'building streets and blocks');
    this.surface = new CitySurface(this.scene, this.world, this.net);
    await step(64, 'raising the skyline');
    this.buildings = new BuildingLayer(this.scene, this.world);
    await step(74, 'planting the city');
    this.props = new Props(this.scene, this.world, this.net, this.seed);
    buildHinterland(this.scene, this.terrain, this.seed);

    await step(84, 'setting the sky');
    this.env = new Environment(this.scene, this.renderer, this.world);
    this.overlays = new Overlays(this.scene, this.world, this.sim);
    this.overlays.attach(this.buildings.mat, 'buildings');
    this.overlays.attach(this.surface.mat, 'surface');

    await step(92, 'putting people on the streets');
    this.agents = new Agents(this.scene, this.world, this.net, this.sim, this.seed);
    this.selectionBox = this.makeSelectionBox();
    this.labels = new DistrictLabels(this.scene, this.world);
    this.incidents = new Incidents(this.scene, this.world, this.net, this.sim);

    await step(96, 'opening the command centre');
    this.ui = new UI(this);
    this.tools = new BuildTools(this);
    this.modals = new Modals(this);
    this.whatif = new WhatIf(this);
    this.save = new SaveSystem(this);
    this.setupPost();
    this.bindInput();
    this.ui.update();

    await step(100, 'ready');
    setTimeout(() => document.getElementById('boot').classList.add('gone'), 220);

    // open on a cinematic sweep over downtown, then hand control to the player
    const cbd = this.world.districts.find(d => d.key === 'downtown');
    this.rig.dTarget.set(wxc(cbd.cx), 0, wxc(cbd.cy));
    this.rig.target.copy(this.rig.dTarget);
    this.rig.dDist = this.rig.dist = 1150;
    this.rig.flyTo(new THREE.Vector3(wxc(cbd.cx), 0, wxc(cbd.cy)), 540, -2.3, 0.70 * Math.PI / 2, 3400);

    this.last = performance.now();
    this.frames = 0; this.fpsT = 0; this.fps = 60;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    addEventListener('resize', () => this.onResize());
    setInterval(() => { if (!document.hidden) this.save.autosave(); }, 180000);
  }

  // ---------------------------------------------------------------- post
  async setupPost() {
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'),
        import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'),
        import('three/addons/postprocessing/OutputPass.js'),
      ]);
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.30, 0.30, 0.94);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
      this.composer.setSize(innerWidth, innerHeight);
      // three skips material tone mapping when rendering into a render target,
      // so OutputPass applies the curve exactly once using renderer.toneMapping.
    } catch (e) {
      this.composer = null; this.bloomEnabled = false;
    }
  }
  setBloom(v) { this.bloomEnabled = v && !!this.composer; }
  setShadows(v) {
    this.renderer.shadowMap.enabled = v;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  }
  // Step detail down (and back up) so the city stays responsive on whatever
  // hardware it lands on, including software rasterisers.
  adaptQuality() {
    if (this.autoQuality === false) return;
    const f = this.fps;
    if (f < 26) {
      this._slow = (this._slow || 0) + 1;
      this._fast = 0;
      if (this._slow >= 2) {
        this._slow = 0;
        if (this.bloomEnabled) { this.setBloom(false); this.perfLevel = 1; }
        else if (this.renderer.shadowMap.enabled) { this.setShadows(false); this.perfLevel = 2; }
        else if (this.quality > 0.45) { this.quality = Math.max(0.4, this.quality - 0.25); this.applyQuality(); this.perfLevel = 3; }
        else if (this.renderer.getPixelRatio() > 0.7) { this.renderer.setPixelRatio(0.7); this.perfLevel = 4; }
      }
    } else if (f > 52) {
      this._fast = (this._fast || 0) + 1;
      this._slow = 0;
      if (this._fast >= 12 && this.perfLevel > 0) {
        this._fast = 0;
        if (this.perfLevel === 1 && this.composer) this.setBloom(true);
        else if (this.perfLevel === 2) this.setShadows(true);
        else if (this.perfLevel >= 3) { this.quality = Math.min(1, this.quality + 0.25); this.applyQuality(); }
        this.perfLevel--;
      }
    }
  }

  applyQuality() {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 0.7 + this.quality * 1.1));
    this.env.sun.shadow.mapSize.setScalar(this.quality > 0.8 ? 2048 : 1024);
  }

  onResize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    if (this.composer) this.composer.setSize(innerWidth, innerHeight);
  }

  makeSelectionBox() {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(g);
    const m = new THREE.LineBasicMaterial({ color: 0x35d6ff, transparent: true, opacity: 0.95 });
    const box = new THREE.LineSegments(edges, m);
    box.visible = false;
    box.renderOrder = 30;
    this.scene.add(box);
    return box;
  }

  // ---------------------------------------------------------------- input
  bindInput() {
    const c = this.canvas;
    c.addEventListener('pointermove', (e) => {
      this.tools.onMove(e);
      this.hoverTip(e);
    });
    c.addEventListener('pointerdown', (e) => {
      this._downX = e.clientX; this._downY = e.clientY;
      if (this.tools.onDown(e)) { e.stopPropagation(); this._toolDown = true; }
    }, true);
    c.addEventListener('pointerup', (e) => {
      if (this._toolDown) { this.tools.onUp(e); this._toolDown = false; return; }
      const moved = Math.hypot(e.clientX - this._downX, e.clientY - this._downY);
      if (moved < 5 && e.button === 0 && !this.tools.tool) this.pick(e);
    });
    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (this.tools.onKey(e)) { e.preventDefault(); return; }
      switch (e.code) {
        case 'Space': this.setSpeed(this.speedIdx === 0 ? (this._lastSpeed || 1) : 0); e.preventDefault(); break;
        case 'Digit1': this.setSpeed(1); break;
        case 'Digit2': this.setSpeed(2); break;
        case 'Digit3': this.setSpeed(3); break;
        case 'Digit4': this.setSpeed(4); break;
        case 'Digit5': this.setSpeed(5); break;
        case 'KeyL': this.ui.toggleLayers(); break;
        case 'Tab': {
          e.preventDefault();
          const order = ['city', 'district', 'building', 'street'];
          const cur = order.indexOf(this.rig.viewName || 'city');
          this.rig.preset(order[(cur + 1) % order.length]);
          break;
        }
        case 'Escape': if (this.modals.isOpen()) this.modals.close(); else if (this.follow) this.setFollow(null); else this.select(null); break;
      }
    });
  }

  hoverTip(e) {
    if (this.tools.tool || this.rig.dragging) { this.ui.tip(null); return; }
    if (this.camera.position.y > 1100) { this.ui.tip(null); return; }
    const cell = this.tools.cellAt(e.clientX, e.clientY);
    if (cell < 0) { this.ui.tip(null); return; }
    const g = this.world.g;
    const bi = g.bld[cell];
    let html = null;
    if (bi >= 0 && this.world.buildings[bi] && !this.world.buildings[bi].demolished) {
      const b = this.world.buildings[bi];
      html = `<b>${b.name}</b><br><span style="color:#7f93aa">${b.residents ? b.residents + ' residents' : ''}${b.residents && b.employed ? ' · ' : ''}${b.employed ? b.employed + ' jobs' : ''}</span>`;
    } else if (g.kind[cell] === K.ROAD) {
      const sat = this.sim.traffic.congestionAt(cell);
      html = `<b>${this.sim.roadName(cell)}</b><br><span style="color:#7f93aa">${Math.round(this.sim.traffic.vol[cell])} veh/h · ${Math.round(sat * 100)}% of capacity</span>`;
    }
    this.ui.tip(e.clientX, e.clientY, html);
  }

  // ---------------------------------------------------------------- selection
  pick(e) {
    const p = this.rig.groundAt(e.clientX, e.clientY);
    if (!p) return this.select(null);
    // agents first — they are small and sit on top of everything
    const a = this.agents.pickAt(p.x, p.z, Math.max(5, this.camera.position.y * 0.03));
    if (a && a.type === 'citizen') return this.selectCitizen(a.citizen, a.activity);
    if (a && a.type === 'vehicle') return this.selectVehicle(a.vehicle);
    const cell = this.tools.cellAt(e.clientX, e.clientY);
    if (cell < 0) return this.select(null);
    this.selectCell(cell);
  }

  selectCell(cell, fly) {
    const g = this.world.g;
    const bi = g.bld[cell];
    if (bi >= 0 && this.world.buildings[bi] && !this.world.buildings[bi].demolished) {
      return this.selectBuilding(this.world.buildings[bi], fly);
    }
    if (g.kind[cell] === K.ROAD) {
      this.selection = { type: 'road', cell, label: this.sim.roadName(cell) };
      this.ui.showInspector(inspectRoad(this.sim, cell));
      this.showSelectionBox(cell % GRID, (cell / GRID) | 0, 1, 1, 1.5);
      if (fly) this.focusWorld(wxc(cell % GRID), wxc((cell / GRID) | 0), 130);
      return;
    }
    this.selection = { type: 'tile', cell, label: 'this parcel' };
    this.ui.showInspector(inspectTile(this.sim, cell));
    this.showSelectionBox(cell % GRID, (cell / GRID) | 0, 1, 1, 1.2);
  }

  selectBuilding(b, fly) {
    this.selection = { type: 'building', building: b, cell: idx(b.x, b.y), label: b.name };
    this.ui.showInspector(inspectBuilding(this.sim, b));
    this.showSelectionBox(b.x, b.y, b.w, b.h, Math.max(2, b.height));
    if (fly) this.focusBuilding(b);
  }
  selectCitizen(c, activity) {
    const act = activity || this.sim.citizens.activity(c, this.sim.hourOfDay, this.sim.dayOfWeek === 0 || this.sim.dayOfWeek === 6).act;
    this.selection = { type: 'citizen', citizen: c, label: c.name, cell: this.world.buildings[c.home] ? idx(this.world.buildings[c.home].x, this.world.buildings[c.home].y) : undefined };
    this.ui.showInspector(inspectCitizen(this.sim, c, act));
    const home = this.world.buildings[c.home];
    if (home) this.showSelectionBox(home.x, home.y, home.w, home.h, Math.max(2, home.height));
  }
  selectVehicle(v) {
    this.selection = { type: 'vehicle', vehicle: v, label: 'a vehicle' };
    this.ui.showInspector(inspectVehicle(this.sim, v));
    this.selectionBox.visible = false;
  }
  selectDistrict(d) {
    this.selection = { type: 'district', district: d, label: d.name, cell: idx(Math.round(d.cx), Math.round(d.cy)) };
    this.ui.showInspector(inspectDistrict(this.sim, d));
    this.selectionBox.visible = false;
  }
  select(x) {
    if (x === null) { this.selection = null; this.ui.showInspector(null); this.selectionBox.visible = false; }
  }
  showSelectionBox(x, y, w, h, height) {
    const b = this.selectionBox;
    b.scale.set(w * CELL, height, h * CELL);
    b.position.set(wxc(x) + (w - 1) * CELL / 2, height / 2, wxc(y) + (h - 1) * CELL / 2);
    b.visible = true;
  }

  inspectorAction(act, arg) {
    const sim = this.sim;
    if (act === 'focus') { const b = this.world.buildings[+arg]; if (b) { this.selectBuilding(b); this.focusBuilding(b); } }
    else if (act === 'follow') {
      const c = sim.citizens.list.find(x => x.id === +arg);
      this.setFollow(this.follow === c ? null : c);
    }
    else if (act === 'focus-district') this.focusDistrict(+arg);
    else if (act === 'demolish') {
      const b = this.world.buildings[+arg];
      if (!b) return;
      const touched = [];
      this.tools.removeBuildingAt(idx(b.x, b.y), touched);
      if (!sim.mode.unlimited) sim.budget.treasury -= 6000;
      this.applyWorldEdit(touched);
      this.select(null);
      this.ui.toast(`${b.name} demolished`);
    } else if (act === 'upgrade-road') {
      const cell = +arg;
      if (this.world.g.road[cell] < RC.HIGHWAY) {
        this.world.g.road[cell]++;
        this.applyWorldEdit([cell]);
        this.selectCell(cell);
        this.ui.toast('Road upgraded');
      }
    } else if (act === 'close-road') { sim.traffic.closeRoad(+arg, true); this.applyWorldEdit([+arg]); this.selectCell(+arg); }
    else if (act === 'open-road') { sim.traffic.closeRoad(+arg, false); this.applyWorldEdit([+arg]); this.selectCell(+arg); }
    else if (act === 'signal-ns' || act === 'signal-ew') {
      const li = this.net.lightAt[+arg];
      if (li >= 0) {
        const L = this.net.lights[li];
        if (act === 'signal-ns') L.ns = clamp(L.ns + 5, 8, 90); else L.ew = clamp(L.ew + 5, 8, 90);
        this.selectCell(+arg);
        this.ui.toast('Signal timing adjusted');
      }
    } else if (act === 'toggle-line') {
      const l = sim.transit.lines.find(x => x.id === +arg);
      if (l) { l.active = !l.active; this.ui.dirtyMinimap(); this.ui.showInspector(inspectTransitLine(sim, l)); }
    } else if (act === 'delete-line') {
      sim.transit.removeLine(+arg); this.select(null); this.ui.dirtyMinimap();
    }
  }

  // Track a resident as their day takes them across the city.
  updateFollow() {
    if (!this.follow) return;
    const c = this.follow;
    const weekend = this.sim.dayOfWeek === 0 || this.sim.dayOfWeek === 6;
    const act = this.sim.citizens.activity(c, this.sim.hourOfDay, weekend);
    const b = act.where;
    if (!b || b.demolished) { this.setFollow(null); return; }
    const x = wxc(b.x) + (b.w - 1) * CELL / 2, z = wxc(b.y) + (b.h - 1) * CELL / 2;
    this.rig.dTarget.set(x, 0, z);
    if (this.rig.dDist > 190) this.rig.dDist = 150;
    this.rig.fly = null;
    if (this._followAct !== act.act) {
      this._followAct = act.act;
      this.ui.hint(`Following <b>${c.name}</b> — ${act.act} · <b>Esc</b> to stop`);
      if (this.selection && this.selection.type === 'citizen' && this.selection.citizen === c) this.selectCitizen(c, act.act);
    }
  }
  setFollow(c) {
    this.follow = c;
    this._followAct = null;
    if (!c) { this.ui.hint(null); this.ui.toast('Stopped following'); }
    else this.ui.toast(`Following ${c.name}`);
  }

  // ---------------------------------------------------------------- camera
  focusWorld(x, z, dist) {
    this.rig.flyTo(new THREE.Vector3(x, 0, z), dist || Math.min(this.rig.dDist, 460), undefined, undefined, 1100);
  }
  focusBuilding(b) {
    const x = wxc(b.x) + (b.w - 1) * CELL / 2, z = wxc(b.y) + (b.h - 1) * CELL / 2;
    this.rig.flyTo(new THREE.Vector3(x, 0, z), clamp(b.height * 2.2 + 60, 70, 320), this.rig.dAzim, 58 * Math.PI / 180, 1400);
  }
  focusDistrict(id) {
    const d = this.world.districts[id];
    if (!d) return;
    this.selectDistrict(d);
    this.rig.flyTo(new THREE.Vector3(wxc(d.cx), 0, wxc(d.cy)), 400, this.rig.dAzim, 50 * Math.PI / 180, 1700);
  }
  focusEvent(e) {
    if (e.building !== undefined && this.world.buildings[e.building]) {
      const b = this.world.buildings[e.building];
      if (!b.demolished) { this.selectBuilding(b); this.focusBuilding(b); return; }
    }
    if (e.focus !== undefined) this.selectCell(e.focus, true);
  }

  // ---------------------------------------------------------------- nav / UI
  nav(id) {
    this.ui.setNav(id);
    if (id === 'cityview') { this.modals.close(); this.tools.clear(); this.rig.preset('city'); this.ui.setNav('cityview'); return; }
    if (id === 'build') { this.modals.close(); this.tools.select('roads'); return; }
    if (id === 'zoning') { this.modals.close(); this.tools.select('zone'); this.setLayer('zoning'); return; }
    this.modals.open(id);
  }
  openMetric(id) {
    const map = {
      budget: 'economy', population: 'population', happiness: 'dashboard', economy: 'economy',
      utilities: 'utilities', commute: 'transport', flow: 'transport', employment: 'economy',
      housing: 'population', traffic: 'transport', pollution: 'environment',
    };
    this.modals.open(map[id] || 'dashboard');
  }
  setLayer(id) {
    this.layer = id;
    this.overlays.set(id);
    this.ui.setLayerActive(id);
    if (id !== 'none') this.ui.toggleLayers(true);
  }
  setSpeed(i) {
    if (i > 0) this._lastSpeed = i;
    this.speedIdx = i;
    this.sim.speed = SPEEDS[i];
  }
  onPolicyChange(k) {
    const sim = this.sim;
    sim.economy.updateDemand(sim);
    if (k === 'signalOptimisation' || k === 'transitBias') sim.traffic.updateCosts();
    sim.updateHappiness();
  }

  // ---------------------------------------------------------------- world edits
  dirtyBuilding(b) { this.sim.dirtyBuildings.add(b.id); }

  applyWorldEdit(cells) {
    if (!cells || !cells.length) { this.flushDirty(); return; }
    const sim = this.sim;
    this.net = buildNetwork(this.world.g);
    sim.net = this.net;
    sim.traffic.net = this.net;
    sim.traffic.updateCosts();
    sim.traffic.findGateways();
    this.surface.net = this.net;
    this.agents.net = this.net;
    this.agents.clearRoutes();
    const chunks = new Set(), bChunks = new Set();
    for (const c of cells) {
      const x = c % GRID, y = (c / GRID) | 0;
      const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < CHUNKS && ny < CHUNKS) { chunks.add(ny * CHUNKS + nx); bChunks.add(ny * CHUNKS + nx); }
      }
    }
    for (const ci of chunks) this.surface.rebuildChunk(ci % CHUNKS, Math.floor(ci / CHUNKS));
    for (const ci of bChunks) this.buildings.rebuildChunk(ci);
    sim.buildRoadNames();
    sim.fields.updateSources(sim);
    sim.fields.updateFields(sim);
    sim.traffic.refreshLandUse(sim);
    this.overlays.repaint();
    this.ui.dirtyMinimap();
    this.rebuildPropsSoon();
    sim.dirtyBuildings.clear();
    sim.dirtySurface.clear();
  }

  rebuildPropsSoon() {
    clearTimeout(this._propT);
    this._propT = setTimeout(() => {
      this.props.group.clear();
      this.scene.remove(this.props.group);
      this.props = new Props(this.scene, this.world, this.net, this.seed);
    }, 700);
  }

  flushDirty() {
    const sim = this.sim;
    if (sim.dirtyBuildings.size) {
      const chunks = new Set();
      for (const id of sim.dirtyBuildings) {
        const b = this.world.buildings[id];
        if (b) chunks.add(this.buildings.chunkOf(b.x, b.y));
      }
      for (const ci of chunks) this.buildings.rebuildChunk(ci);
      sim.dirtyBuildings.clear();
      this.ui.dirtyMinimap();
    }
    if (sim.dirtySurface.size) {
      const chunks = new Set();
      for (const c of sim.dirtySurface) {
        const cx = Math.floor((c % GRID) / CHUNK), cy = Math.floor(((c / GRID) | 0) / CHUNK);
        chunks.add(cy * CHUNKS + cx);
      }
      for (const ci of chunks) this.surface.rebuildChunk(ci % CHUNKS, Math.floor(ci / CHUNKS));
      sim.dirtySurface.clear();
    }
  }

  // ---------------------------------------------------------------- lifecycle
  newCity(mode) {
    const seed = (Math.random() * 1e9) | 0;
    this.rebuildWorld(seed, mode);
    this.ui.toast(`New ${MODES[mode].label.toLowerCase()} city generated`);
  }

  rebuildWorld(seed, mode, restoreData) {
    this.seed = seed;
    if (restoreData) {
      const r = CitySim.restore(restoreData, (s) => generateWorld(s));
      this.world = r.world; this.net = r.net; this.sim = r.sim;
      this.seed = restoreData.seed;
    } else {
      this.world = generateWorld(seed);
      this.net = buildNetwork(this.world.g);
      this.sim = new CitySim(this.world, this.net, { seed, mode: mode || 'mayor' });
    }
    this.terrain = makeTerrainFns(this.seed);
    this.surface.dispose(); this.buildings.dispose();
    for (const o of this.scene.children.slice()) if (o.name === 'hinterland' || o.name === 'props' || o.name === 'agents' || o.name === 'labels' || o.name === 'incidents') this.scene.remove(o);
    this.surface = new CitySurface(this.scene, this.world, this.net);
    this.buildings = new BuildingLayer(this.scene, this.world);
    this.props = new Props(this.scene, this.world, this.net, this.seed);
    buildHinterland(this.scene, this.terrain, this.seed);
    this.overlays.world = this.world; this.overlays.sim = this.sim;
    this.overlays.attach(this.buildings.mat, 'buildings');
    this.overlays.attach(this.surface.mat, 'surface');
    this.agents = new Agents(this.scene, this.world, this.net, this.sim, this.seed);
    if (this.labels) this.labels.dispose();
    if (this.incidents) this.incidents.dispose();
    this.labels = new DistrictLabels(this.scene, this.world);
    this.incidents = new Incidents(this.scene, this.world, this.net, this.sim);
    this.incidents = new Incidents(this.scene, this.world, this.net, this.sim);
    this.follow = null;
    this.select(null);
    this.ui.hist = { pop: [], happy: [], eco: [], budget: [], flow: [], util: [], commute: [] };
    this.ui.dirtyMinimap();
    this.overlays.repaint();
    this.ui.update();
  }

  loadFromData(data) {
    try { this.rebuildWorld(data.seed, data.mode, data); }
    catch (e) { console.error(e); this.ui.toast('That save could not be loaded', true); }
  }

  // ---------------------------------------------------------------- loop
  loop(now) {
    requestAnimationFrame(this.loop);
    const real = (now - this.last) / 1000;
    const dt = Math.min(0.06, real);
    this.last = now;
    this.frames++; this.fpsT += real;
    if (this.fpsT > 1.0) {
      this.fps = this.frames / this.fpsT; this.frames = 0; this.fpsT = 0;
      this.adaptQuality();
    }

    const speed = SPEEDS[this.speedIdx];
    const simMinutes = speed * dt;
    if (simMinutes > 0) this.sim.step(simMinutes);

    // traffic signals run on wall-clock seconds scaled by game speed, capped so
    // they stay legible when time is accelerated
    updateSignals(this.net, dt * clamp(speed, 1, 12));

    this.rig.update(dt);
    const camPos = this.camera.position;
    const st = this.env.update(this.sim.hourOfDay, this.sim.weather, camPos, dt, this.sim.stats.blackoutFrac);
    // Expose the frame like a camera would: stop down at night so window light
    // and headlights carry the image instead of a lifted grey.
    this.renderer.toneMappingExposure = 1.18 * (0.40 + 0.60 * st.dayT) * (1 - this.sim.weather.rain * 0.12);
    this.buildings.setNight(st.night, this.sim.stats.blackoutFrac);
    this.buildings.setTime(now / 1000);
    this.buildings.setOccupancy(this.sim.hourOfDay);
    this.surface.setWet(this.sim.weather.rain);
    this.props.update(st.night, camPos, this.sim.stats.blackoutFrac);
    this.labels.update(this.rig.dist);
    this.incidents.update(dt, camPos);
    this.updateFollow();
    this.agents.update(dt, simMinutes, this.camera, st.night, this.quality);

    this.flushDirty();
    if (this.whatif.running) this.whatif.tick(20);

    // periodic UI + overlay refresh
    this._uiT = (this._uiT || 0) + dt;
    if (this._uiT > 0.28) {
      this._uiT = 0;
      try {
      this.ui.update();
      if (this.layer !== 'none') this.overlays.repaint();
      if (this.modals.isOpen() && ['dashboard', 'transport', 'economy', 'utilities', 'emergencies'].includes(this.modals.current)) this.modals.refresh();
      if (this.modals.isOpen('whatif')) this.modals.render(true);
      if (this.selection && this.selection.type === 'building' && !this.selection.building.demolished) {
        this.ui.showInspector(inspectBuilding(this.sim, this.selection.building));
      } else if (this.selection && this.selection.type === 'road') {
        this.ui.showInspector(inspectRoad(this.sim, this.selection.cell));
      }
      } catch (err) {
        // A panel failing must never take the simulation or the view with it.
        if (this._lastErr !== err.message) { this._lastErr = err.message; console.error('[ui]', err); }
      }
    }

    if (this.bloomEnabled && this.composer) {
      this.bloom.strength = 0.06 + st.night * 0.20;
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

const app = new App();
window.__app = app;
// test/debug hooks
window.__cam = (x, z, d, az, po) => { app.rig.fly = null; app.rig.cinematic = false;
  app.rig.dTarget.set(x, 0, z); app.rig.target.set(x, 0, z);
  app.rig.dDist = app.rig.dist = d; app.rig.dAzim = app.rig.azim = az; app.rig.dPolar = app.rig.polar = po; };
window.__hour = (h) => { app.sim.minutes = Math.floor(app.sim.minutes / 1440) * 1440 + h * 60; app.sim.updateWeather(); };
window.__click = (cx, cy) => app.pick({ clientX: cx, clientY: cy, button: 0 });
window.__perf = (low) => { app.autoQuality = false; if (low) { app.setBloom(false); app.setShadows(false);
  app.quality = 0.4; app.renderer.setPixelRatio(0.6); app.agents.maxCars = 260; } };
