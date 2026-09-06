// Interaction suite. Drives the built cityos.html in a real browser and checks
// that each system actually changes the thing it claims to change — not that a
// button exists, but that pressing it moves the simulation.
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

// Prefer PW_CHROME, then any Chromium already sitting in PLAYWRIGHT_BROWSERS_PATH,
// and otherwise let Playwright resolve its own download.
function findChrome() {
  if (process.env.PW_CHROME) return process.env.PW_CHROME;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return null;
  for (const d of readdirSync(root)) {
    if (!d.startsWith('chromium-')) continue;
    const exe = join(root, d, 'chrome-linux', 'chrome');
    if (existsSync(exe)) return exe;
  }
  return null;
}
const CHROME = findChrome();
const url = 'file://' + process.cwd() + '/cityos.html';

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

const browser = await chromium.launch({
  ...(CHROME && existsSync(CHROME) ? { executablePath: CHROME } : {}),
  // software rendering, so the suite runs on a machine with no GPU
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(url);
await page.waitForFunction(() => window.__app && window.__app.director && window.__app.agents, null, { timeout: 240000 });
await page.evaluate(() => window.__perf(true));
await page.waitForTimeout(4000);
const ev = (fn, arg) => page.evaluate(fn, arg);

console.log('\n— boot —');
const intro = await ev(() => {
  const d = window.__app.director;
  const box = document.querySelector('#banner .bn');
  return {
    kind: d.banner && d.banner.kind,
    shown: document.querySelector('#banner').classList.contains('show'),
    text: box ? box.innerText : '',
    options: document.querySelectorAll('#banner [data-op]').length,
  };
});
check('a new mayor is briefed on their first problem', intro.kind === 'intro' && intro.shown, JSON.stringify({ kind: intro.kind, shown: intro.shown }));
check('the briefing explains why, who and what to do', /WHY THIS IS HAPPENING/i.test(intro.text) && /WHO IT AFFECTS/i.test(intro.text) && intro.options >= 1, intro.text.slice(0, 90));
await ev(() => window.__app.ui.briefing.dismiss());
check('the briefing can be dismissed', await ev(() => !document.querySelector('#banner').classList.contains('show')));

check('world generated', await ev(() => window.__app.world.buildings.length > 2000));
check('simulation has population', await ev(() => window.__app.sim.stats.population > 10000));
check('no boot errors', errors.length === 0, errors[0]);

console.log('\n— camera —');
await ev(() => { window.__app.rig.fly = null; window.__cam(0, 0, 900, 0.6, 0.9); });
await page.waitForTimeout(1200);
const camFly = await ev(async () => {
  const a = window.__app;
  a.rig.flyTo(new (a.rig.dTarget.constructor)(600, 0, -400), 300, 1.2, 0.9, 900);
  return { started: !!a.rig.fly };
});
await page.waitForTimeout(3500);
const camAfter = await ev(() => ({ x: Math.round(window.__app.rig.target.x), z: Math.round(window.__app.rig.target.z), d: Math.round(window.__app.rig.dist), flying: !!window.__app.rig.fly }));
check('flight starts', camFly.started);
check('flight completes on real time', !camAfter.flying && Math.abs(camAfter.x - 600) < 6 && Math.abs(camAfter.z + 400) < 6, JSON.stringify(camAfter));
check('flight reaches requested zoom', Math.abs(camAfter.d - 300) < 12, 'dist ' + camAfter.d);

const zoomLimits = await ev(() => {
  const r = window.__app.rig;
  r.dDist = 1e9; r.reclamp();
  const hi = r.dDist;
  r.dDist = -1e9; r.reclamp();
  const lo = r.dDist;
  return { hi, lo, min: r.minDist, max: r.maxDist };
});
check('zoom is clamped both ways', zoomLimits.hi === zoomLimits.max && zoomLimits.lo === zoomLimits.min, JSON.stringify(zoomLimits));

const polar = await ev(() => {
  const r = window.__app.rig;
  r.dDist = 60; r.dPolar = Math.PI / 2; r.reclamp();
  const near = r.dPolar;
  r.dDist = 900; r.dPolar = Math.PI / 2; r.reclamp();
  const far = r.dPolar;
  return { near, far, maxNear: r.maxPolarFor(60), maxFar: r.maxPolarFor(900) };
});
check('tilt limit tightens when zoomed out', polar.maxFar < polar.maxNear && polar.near <= polar.maxNear + 1e-6 && polar.far <= polar.maxFar + 1e-6, JSON.stringify(polar));

// drop the camera into the middle of the tallest cluster and confirm it is lifted clear
const collide = await ev(() => {
  const a = window.__app;
  let best = a.world.buildings[0];
  for (const b of a.world.buildings) if (b && !b.demolished && b.height > (best.height || 0)) best = b;
  const x = (best.x + 0.5) * 20 - 1280, z = (best.y + 0.5) * 20 - 1280;
  window.__cam(x, z, 30, 0.4, 1.45);
  return { x, z, top: best.height };
});
await page.waitForTimeout(1500);
const eye = await ev(() => ({ y: window.__app.camera.position.y, floor: window.__app.heightAt(window.__app.camera.position.x, window.__app.camera.position.z) }));
check('camera never sits inside geometry', eye.y > eye.floor, JSON.stringify(eye));

console.log('\n— time —');
const t0 = await ev(() => window.__app.sim.minutes);
await ev(() => window.__app.setSpeed(0));
await page.waitForTimeout(1500);
const tPaused = await ev(() => window.__app.sim.minutes);
check('pause stops the clock', tPaused === t0 || tPaused - t0 < 1, `${t0} -> ${tPaused}`);
await ev(() => window.__app.setSpeed(3));
await page.waitForTimeout(2500);
const tRun = await ev(() => window.__app.sim.minutes);
check('speed advances the clock', tRun > tPaused + 10, `${tPaused} -> ${tRun}`);
await ev(() => window.__app.setSpeed(1));

console.log('\n— roads —');
const roads = await ev(() => {
  const a = window.__app, g = a.world.g;
  // any straight run that is not water and not already road: a road can be put
  // through built-up land, which is what a player would actually be doing
  let start = -1;
  for (let y = 8; y < 118 && start < 0; y++) for (let x = 8; x < 112; x++) {
    let ok = true;
    for (let k = 0; k < 6; k++) { const c = y * 128 + x + k; if (g.kind[c] === 2 || g.kind[c] === 1) { ok = false; break; } }
    if (ok) { start = y * 128 + x; break; }
  }
  if (start < 0) return { notFound: true };
  const cells = []; for (let k = 0; k < 6; k++) cells.push(start + k);
  a.tools.select('roads'); a.tools.pickSub('street');
  const money0 = a.sim.budget.treasury;
  a.tools.applyCells(cells);
  return {
    built: cells.filter(c => g.kind[c] === 1).length, of: cells.length,
    spent: money0 - a.sim.budget.treasury,
    inNetwork: cells.filter(c => (a.net.cap[c] || 0) > 0).length,
  };
});
check('roads are laid where asked', roads.built === roads.of, JSON.stringify(roads));
check('roads cost money', roads.spent > 0, 'spent ' + roads.spent);
check('new roads join the routing network', roads.inNetwork === roads.of, JSON.stringify(roads));

console.log('\n— zoning —');
const zoning = await ev(() => {
  const a = window.__app, g = a.world.g;
  const cells = [];
  for (let i = 0; i < 128 * 128 && cells.length < 20; i++) if (g.kind[i] === 0) cells.push(i);
  if (!cells.length) return { notFound: true };
  a.tools.select('zone'); a.tools.pickSub('res_high');
  a.tools.applyCells(cells);
  return { painted: cells.filter(c => g.zone[c] === 2).length, of: cells.length };
});
check('zoning paints the grid', zoning.painted === zoning.of && zoning.of > 0, JSON.stringify(zoning));

console.log('\n— demolition, then building placement —');
const demo = await ev(() => {
  const a = window.__app, g = a.world.g;
  // clear a block that has road access, then build on the land it frees
  let target = null;
  for (const b of a.world.buildings) {
    if (!b || b.demolished || b.construction < 1) continue;
    let road = false;
    for (let j = -1; j <= b.h; j++) for (let i = -1; i <= b.w; i++) {
      const x = b.x + i, y = b.y + j;
      if (x < 0 || y < 0 || x > 127 || y > 127) continue;
      if (g.kind[y * 128 + x] === 1) road = true;
    }
    if (road && b.w >= 2 && b.h >= 2) { target = b; break; }
  }
  if (!target) return { notFound: true };
  const cell = target.y * 128 + target.x;
  a.tools.select('demolish'); a.tools.pickSub('building');
  a.tools.applyAt(cell);
  return { demolished: !!target.demolished, cleared: g.bld[cell] === -1, kind: g.kind[cell], cell };
});
check('demolition removes the building', demo.demolished && demo.cleared, JSON.stringify(demo));
check('demolition frees the land', demo.kind === 0, 'kind ' + demo.kind);

const placed = await ev((cell) => {
  const a = window.__app;
  a.tools.select('services'); a.tools.pickSub('fire');
  const n0 = a.world.buildings.length;
  a.tools.applyAt(cell);
  if (a.world.buildings.length === n0) return { rejected: true };
  const b = a.world.buildings[a.world.buildings.length - 1];
  return { added: 1, construction: b.construction, queued: a.sim.economy.buildQueue.some(q => q.b === b.id), id: b.id, type: b.type };
}, demo.cell);
check('a building can be placed on the cleared land', placed.added === 1, JSON.stringify(placed));
check('it starts under construction', placed.construction < 1 && placed.construction > 0, 'construction ' + placed.construction);
check('it is queued to finish', !!placed.queued);

const finished = await ev((id) => {
  const a = window.__app;
  for (let d = 0; d < 40; d++) a.sim.step(1440);
  const b = a.world.buildings[id];
  return b ? { construction: b.construction, form: b.form, demolished: !!b.demolished } : { missing: true };
}, placed.id);
check('construction completes over time', finished.construction >= 1 && finished.form !== 'construction', JSON.stringify(finished));

const cover = await ev((id) => {
  const a = window.__app;
  const b = a.world.buildings[id];
  if (!b) return { missing: true };
  return { at: a.sim.fields.svcFire[b.y * 128 + b.x], type: b.type };
}, placed.id);
check('a fire station actually projects coverage', cover.at > 0.2, JSON.stringify(cover));

console.log('\n— ghost preview —');
const ghost = await ev(() => {
  const a = window.__app;
  // select() toggles, so clear first — this is the same path the UI takes when
  // a different tool button is pressed
  a.tools.clear();
  a.tools.select('services'); a.tools.pickSub('hospital');
  const tool = a.tools.tool, sub = a.tools.sub;
  a.tools.showPreview(a.tools.brushCells(64 * 128 + 64));
  const kinds = a.tools.group.children.map(c => c.type);
  const r0 = a.tools.footprintFor('hospital');
  a.tools.onKey({ code: 'KeyR' });
  const r1 = a.tools.footprintFor('hospital');
  a.tools.onKey({ code: 'KeyR' });
  return { kinds, r0, r1, tool, sub, hasRing: a.tools.group.children.some(c => c.geometry && c.geometry.type === 'RingGeometry') };
});
check('preview draws a silhouette', ghost.kinds.includes('Mesh') && ghost.kinds.includes('LineSegments'), JSON.stringify(ghost));
check('preview shows the affected area', ghost.hasRing, JSON.stringify(ghost.kinds));
check('rotation turns the footprint', ghost.r0[0] === ghost.r1[1] && ghost.r0[1] === ghost.r1[0], JSON.stringify([ghost.r0, ghost.r1]));

const rotPlace = await ev(() => {
  const a = window.__app, g = a.world.g;
  a.tools.clear();
  a.tools.rot = Math.PI / 2;
  a.tools.select('services'); a.tools.pickSub('hospital');
  const base = a.tools.baseFootprint('hospital');
  const size = a.tools.footprintFor('hospital');
  a.sim.budget.treasury += 500_000_000;   // the harness is testing geometry, not affordability
  // clear a site big enough for the turned footprint, with road access
  let cell = -1;
  for (let y = 4; y < 120 && cell < 0; y++) for (let x = 4; x < 120; x++) {
    let ok = true, road = false;
    for (let j = 0; j < size[1] && ok; j++) for (let i = 0; i < size[0]; i++) {
      const k = g.kind[(y + j) * 128 + x + i];
      if (k === 2 || k === 1) { ok = false; break; }       // water or road
    }
    if (!ok) continue;
    for (let j = -1; j <= size[1]; j++) for (let i = -1; i <= size[0]; i++) {
      const nx = x + i, ny = y + j;
      if (nx >= 0 && ny >= 0 && nx < 128 && ny < 128 && g.kind[ny * 128 + nx] === 1) road = true;
    }
    if (road) { cell = y * 128 + x; break; }
  }
  if (cell < 0) return { notFound: true };
  const touched = [];
  for (let j = 0; j < size[1]; j++) for (let i = 0; i < size[0]; i++) {
    a.tools.removeBuildingAt(cell + j * 128 + i, touched);
  }
  a.applyWorldEdit(touched);
  const n0 = a.world.buildings.length;
  a.tools.applyAt(cell);
  if (a.world.buildings.length === n0) return { rejected: true, cell, size, reason: a.tools.validate(a.tools.brushCells(cell)).reason };
  const b = a.world.buildings[a.world.buildings.length - 1];
  let claimed = 0;
  for (let j = 0; j < size[1]; j++) for (let i = 0; i < size[0]; i++) {
    if (g.bld[(b.y + j) * 128 + b.x + i] === b.id) claimed++;
  }
  a.tools.rot = 0;
  a.tools.clear();
  return { base, size, w: b.w, h: b.h, rot: +(b.rot || 0).toFixed(3), claimed, of: size[0] * size[1] };
});
check('rotation swaps the footprint', !rotPlace.rejected && !rotPlace.notFound &&
  rotPlace.size[0] === rotPlace.base[1] && rotPlace.size[1] === rotPlace.base[0], JSON.stringify(rotPlace));
check('a rotated building occupies the cells it was previewed on',
  rotPlace.claimed === rotPlace.of && rotPlace.w === rotPlace.size[0] && rotPlace.h === rotPlace.size[1], JSON.stringify(rotPlace));
check('a rotated rectangle is not turned twice', rotPlace.rot === 0, JSON.stringify(rotPlace));

console.log('\n— transit —');
const transit = await ev(() => {
  const a = window.__app, g = a.world.g;
  const stops = [];
  for (let i = 0; i < 128 * 128 && stops.length < 4; i += 137) if (g.kind[i] === 1) stops.push(i);
  a.tools.select('transit'); a.tools.pickSub('bus');
  a.tools.transitStops = stops;
  const n0 = a.sim.transit.lines.length;
  a.tools.finishLine();
  const line = a.sim.transit.lines[a.sim.transit.lines.length - 1];
  return { added: a.sim.transit.lines.length - n0, stops: line ? line.stops.length : 0, cost: line ? line.buildCost : 0 };
});
check('a transit line is created from the stops placed', transit.added === 1 && transit.stops === 4, JSON.stringify(transit));
check('the line has a real build cost', transit.cost > 0);

const ridership = await ev(() => {
  const a = window.__app;
  for (let d = 0; d < 8; d++) a.sim.step(1440);
  return { share: a.sim.stats.transitShare, riders: a.sim.stats.transitRidership };
});
check('transit carries trips', ridership.riders > 0, JSON.stringify(ridership));

console.log('\n— citizens & vehicles —');
const people = await ev(() => {
  const a = window.__app;
  const c = a.sim.citizens.list[0];
  const act = a.sim.citizens.activity(c, a.sim.hourOfDay, false);
  return { n: a.sim.citizens.list.length, named: !!c.name, hasHome: c.home >= 0, act: act.act, vehicles: a.agents.activeCars };
});
check('citizens exist with identities', people.n > 100 && people.named && people.hasHome, JSON.stringify(people));
check('citizens have an activity right now', !!people.act, people.act);

const follow = await ev(() => {
  const a = window.__app;
  a.followSomeone();
  return { following: !!a.follow, rig: !!a.rig.follow, memory: !!a.rig.followMemory };
});
await page.waitForTimeout(2500);
const unfollow = await ev(() => {
  const a = window.__app;
  const during = { x: Math.round(a.rig.dTarget.x), z: Math.round(a.rig.dTarget.z) };
  a.setFollow(null);
  return { during, flyingBack: !!a.rig.fly, following: !!a.follow };
});
check('follow attaches the camera to a resident', follow.following && follow.rig && follow.memory, JSON.stringify(follow));
check('leaving follow restores the previous view', !unfollow.following && unfollow.flyingBack, JSON.stringify(unfollow));

console.log('\n— traffic —');
const traffic = await ev(() => {
  const a = window.__app;
  let loaded = 0, cap = 0;
  for (let i = 0; i < 128 * 128; i++) if (a.world.g.kind[i] === 1) { if (a.sim.traffic.vol[i] > 0) loaded++; cap += a.net.cap[i] || 0; }
  return { loaded, cap: Math.round(cap), commute: a.sim.stats.commute, flow: a.sim.stats.flow };
});
check('traffic is assigned to the network', traffic.loaded > 500, JSON.stringify(traffic));
check('commute and flow are real numbers', traffic.commute > 0 && traffic.flow > 0 && traffic.flow <= 1, JSON.stringify(traffic));

const closure = await ev(() => {
  const a = window.__app;
  let c = -1, best = 0;
  for (let i = 0; i < 128 * 128; i++) if (a.world.g.kind[i] === 1 && a.sim.traffic.vol[i] > best) { best = a.sim.traffic.vol[i]; c = i; }
  a.sim.traffic.closeRoad(c, true);
  for (let d = 0; d < 3; d++) a.sim.step(1440);
  const after = a.sim.traffic.vol[c];
  a.sim.traffic.closeRoad(c, false);
  return { before: Math.round(best), after: Math.round(after) };
});
check('closing a road re-routes its traffic', closure.after < closure.before * 0.5, JSON.stringify(closure));

console.log('\n— economy —');
const econ = await ev(() => {
  const a = window.__app, s = a.sim.stats, b = a.sim.budget;
  return { revenue: Math.round(b.revenue), expense: Math.round(b.expense), gdp: Math.round(s.gdp), rent: Math.round(s.medianRent), vacancy: +s.vacancy.toFixed(4), unemployment: +s.unemployment.toFixed(4) };
});
check('budget has both sides', econ.revenue > 0 && econ.expense > 0, JSON.stringify(econ));
check('housing market is sane', econ.rent > 100 && econ.vacancy >= 0 && econ.vacancy < 1, JSON.stringify(econ));
check('labour market is sane', econ.unemployment >= 0 && econ.unemployment < 0.6, JSON.stringify(econ));

const tax = await ev(() => {
  const a = window.__app;
  const r0 = a.sim.budget.revenue;
  a.sim.policies.taxRes = Math.min(0.35, a.sim.policies.taxRes + 0.05);
  a.onPolicyChange('taxRes');
  for (let d = 0; d < 35; d++) a.sim.step(1440);
  const r1 = a.sim.budget.revenue;
  a.sim.policies.taxRes = Math.max(0, a.sim.policies.taxRes - 0.05);
  a.onPolicyChange('taxRes');
  return { r0: Math.round(r0), r1: Math.round(r1) };
});
check('a tax change moves revenue', tax.r1 > tax.r0, JSON.stringify(tax));

console.log('\n— events —');
const events = await ev(() => {
  const a = window.__app;
  const id0 = a.sim.events.feed[0] ? a.sim.events.feed[0].id : 0;
  a.sim.events.trigger(a.sim, 'fire');
  a.sim.events.trigger(a.sim, 'accident');
  const feed = a.sim.events.feed.slice(0, 2);
  return {
    added: feed.filter(e => e.id > id0).length,
    withWhy: feed.filter(e => e.why && e.who).length,
    burning: a.world.buildings.filter(b => b && b.onFire).length,
    closed: a.sim.traffic.closed ? Array.from(a.sim.traffic.closed).filter(Boolean).length : 0,
  };
});
check('events are logged', events.added === 2, JSON.stringify(events));
check('events explain themselves', events.withWhy === 2, JSON.stringify(events));
check('a fire actually burns a building', events.burning > 0);
check('an accident actually closes a road', events.closed > 0);

await page.waitForTimeout(1500);
const incidentsVisible = await ev(() => ({ fires: window.__app.incidents.activeFires, closures: window.__app.incidents.activeClosures }));
check('incidents are drawn in the world', incidentsVisible.fires > 0, JSON.stringify(incidentsVisible));

console.log('\n— objectives —');
const obj = await ev(() => {
  const a = window.__app, d = a.director, o = d.objective;
  return o ? {
    id: o.id, title: o.title, why: (o.why || '').length, who: (o.who || '').length,
    options: o.options.length, metric: o.metric(), progress: d.progress(o),
    focus: o.focus ? o.focus() : null, subject: o.subject ? o.subject.name : null,
  } : null;
});
check('there is always a current objective', !!obj);
check('it explains why and who', obj.why > 40 && obj.who > 20, JSON.stringify({ why: obj.why, who: obj.who }));
check('it offers choices', obj.options >= 1);
check('it is measured against live state', typeof obj.metric === 'number' && isFinite(obj.metric));
check('it names a resident it is about', !!obj.subject, obj.subject);

const objUI = await page.$eval('.obj-b', e => e.innerText);
check('the objective card renders it', objUI.includes('WHY THIS IS HAPPENING') && objUI.includes('WHAT YOU CAN DO'), objUI.slice(0, 80));

const optionClick = await ev(() => {
  const a = window.__app;
  const o = a.director.objective;
  const opt = o.options.find(x => x.act && x.act.tool);
  if (!opt) return { skipped: true };
  a.applyAction(opt.act);
  return { tool: a.tools.tool, sub: a.tools.sub, wanted: opt.act };
});
check('an objective option selects the tool it names', optionClick.skipped || optionClick.tool === optionClick.wanted.tool, JSON.stringify(optionClick));
await ev(() => window.__app.tools.clear());

console.log('\n— progression —');
const stage = await ev(() => {
  const a = window.__app, d = a.director;
  const before = { stage: d.stage.id, metro: d.isUnlocked('metro') };
  const s0 = a.sim.stats.population;
  a.sim.stats.population = 300000;
  d.checkStage();
  const after = { stage: d.stage.id, metro: d.isUnlocked('metro'), banner: d.banner && d.banner.kind };
  a.sim.stats.population = s0;
  return { before, after };
});
check('stages gate tools before they are reached', !stage.before.metro, JSON.stringify(stage.before));
check('growth unlocks them', stage.after.metro && stage.after.stage === 'metropolis', JSON.stringify(stage.after));
check('growth is announced', stage.after.banner === 'stage');
const unlockCoverage = await ev(() => {
  const d = window.__app.director;
  // every gated build tool must be reachable from some stage, and every stage
  // that is not the last must actually open something
  const gates = new Set(Object.values(window.__app.tools.constructor.GATE));
  const reachable = new Set();
  const stages = [];
  for (const key of gates) { const s = d.stageThatUnlocks(key); if (s) reachable.add(key); stages.push([key, s]); }
  return { gates: [...gates], unreachable: [...gates].filter(k => !reachable.has(k)), stages };
});
check('every gated tool is unlocked by some stage', unlockCoverage.unreachable.length === 0, JSON.stringify(unlockCoverage));
await ev(() => { const d = window.__app.director; d.stage = { id: 'town', name: 'Town', pop: 0 }; d.unlocked = new Set(['roads','zone','buildings','parks','services','utilities','bus']); d.clearBanner(); });

console.log('\n— news —');
const news = await ev(() => {
  const d = window.__app.director;
  return { n: d.news.length, explained: d.news.filter(x => x.why).length, top: d.news[0] && d.news[0].title };
});
check('the news feed has entries', news.n > 2, JSON.stringify(news));
check('most of them explain themselves', news.explained / news.n > 0.7, `${news.explained}/${news.n}`);
const newsRows = await page.$$eval('#events .ev', ns => ns.length);
check('the feed renders', newsRows > 0, 'rows ' + newsRows);
const overlap = await ev(() => {
  const a = document.querySelector('#inspect'), b = document.querySelector('#events');
  if (!a || !a.classList.contains('show')) return { overlap: 0 };
  const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
  return { overlap: Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top)) };
});
check('the inspector does not cover the news feed', overlap.overlap === 0, 'overlap ' + overlap.overlap + 'px');
await ev(() => { window.__app.select(null); window.__app.ui.briefing.dismiss(); });
await page.click('#events .ev');
await page.waitForTimeout(500);
const expanded = await page.$eval('#events .ev', e => e.className + '|' + e.innerText.length);
check('a news item expands to the detail', expanded.includes('open'), expanded);

console.log('\n— what-if —');
await ev(() => { window.__app.whatif.result = null; window.__app.whatif.cancel(); window.__app.whatif.start('taxUp', 40); });
await page.waitForFunction(() => window.__app.whatif.result, null, { timeout: 180000 });
const wi = await ev(() => {
  const r = window.__app.whatif.result;
  return { scenario: r.scenario.id, metrics: r.metrics.length, control: r.control.population, treat: r.treat.population, differs: r.control._revenue !== r.treat._revenue, narrative: r.narrative.length };
});
check('what-if produces a control and a treatment', wi.control > 0 && wi.treat > 0, JSON.stringify(wi));
check('the change actually changes something', wi.differs, JSON.stringify(wi));
const enact = await ev(() => {
  const a = window.__app;
  const t0 = a.sim.policies.taxRes;
  const res = a.whatif.enact(a.whatif.result.scenario);
  return { ok: res.ok, t0: +t0.toFixed(4), t1: +a.sim.policies.taxRes.toFixed(4) };
});
check('what-if can be enacted on the real city', enact.ok && enact.t1 > enact.t0, JSON.stringify(enact));
await ev(() => { window.__app.whatif.result = null; });

console.log('\n— save / load —');
const save = await ev(() => {
  const a = window.__app;
  a.sim.budget.treasury = 424242;
  const data = a.sim.serialize();
  return { bytes: JSON.stringify(data).length, seed: data.seed };
});
check('the city serialises', save.bytes > 1000, JSON.stringify(save));
const load = await ev(async () => {
  const a = window.__app;
  const data = a.sim.serialize();
  const pop0 = Math.round(a.sim.stats.population);
  a.loadFromData(data);
  return { pop0, pop1: Math.round(a.sim.stats.population), treasury: Math.round(a.sim.budget.treasury), director: !!a.director, objective: a.director && !!a.director.objective };
});
check('it loads back with the same city', Math.abs(load.pop1 - load.pop0) < load.pop0 * 0.02, JSON.stringify(load));
check('reload keeps the treasury', Math.abs(load.treasury - 424242) < 2000, 'treasury ' + load.treasury);
check('reload rebuilds the director', load.director && load.objective);

console.log('\n— lifecycle —');
const rebuild = await ev(() => {
  const a = window.__app;
  const count = () => { let n = 0; a.scene.traverse(o => { if (o.name === 'incidents' || o.name === 'beacon' || o.name === 'agents' || o.name === 'props') n++; }); return n; };
  const before = count();
  a.rebuildWorld(12345, 'mayor');
  return { before, after: count(), director: !!a.director, follow: !!a.rig.follow, tool: a.tools.tool };
});
check('rebuilding the world does not duplicate systems', rebuild.after === rebuild.before, JSON.stringify(rebuild));
check('rebuilding clears follow and tools', !rebuild.follow && !rebuild.tool);
check('rebuilding re-arms the director', rebuild.director);

console.log('\n— UI —');
const ui = await ev(() => {
  const a = window.__app;
  const seen = [];
  for (const id of ['dashboard', 'transport', 'economy', 'population', 'utilities', 'environment', 'emergencies', 'districts', 'policies', 'advisors', 'whatif', 'stats', 'settings']) {
    try { a.modals.open(id); seen.push([id, a.ui.modalEl.querySelector('.mdl-b').innerText.length]); }
    catch (e) { seen.push([id, 'ERROR: ' + e.message]); }
  }
  a.modals.close();
  return seen;
});
const emptyPanels = ui.filter(([, n]) => typeof n !== 'number' || n < 50);
check('every report panel renders content', emptyPanels.length === 0, JSON.stringify(emptyPanels));

const layerTest = await ev(() => {
  const a = window.__app;
  const ids = Array.from(document.querySelectorAll('#layers .lay')).map(b => b.dataset.layer);
  const bad = [];
  for (const id of ids) {
    a.setLayer(id);
    a.overlays.repaint();
    let sum = 0;
    for (let i = 3; i < a.overlays.data.length; i += 4) sum += a.overlays.data[i];
    if (id !== 'none' && sum === 0) bad.push(id);
  }
  a.setLayer('none');
  return { ids: ids.length, bad };
});
check('every map layer paints something', layerTest.bad.length === 0, JSON.stringify(layerTest));

console.log('\n— camera keeps up with the city —');
const hf = await ev(async () => {
  const a = window.__app;
  // put a tower somewhere the camera can then be driven into
  const g = a.world.g;
  let spot = -1;
  for (const b of a.world.buildings) {
    if (!b || b.demolished || b.w < 2 || b.h < 2) continue;
    let road = false;
    for (let j = -1; j <= b.h; j++) for (let i = -1; i <= b.w; i++) {
      const x = b.x + i, y = b.y + j;
      if (x >= 0 && y >= 0 && x < 128 && y < 128 && g.kind[y * 128 + x] === 1) road = true;
    }
    if (road) { spot = b.y * 128 + b.x; break; }
  }
  a.tools.clear();
  a.tools.select('demolish'); a.tools.pickSub('building'); a.tools.applyAt(spot);
  a.tools.clear();
  a.tools.select('buildings'); a.tools.pickSub('tower_res'); a.tools.applyAt(spot);
  const b = a.world.buildings[a.world.buildings.length - 1];
  for (let d = 0; d < 40; d++) a.sim.step(1440);
  return { spot, id: b.id, height: b.height, before: a.heightField[spot] };
});
await page.waitForTimeout(2500);
const hfAfter = await ev((h) => {
  const a = window.__app;
  return { field: a.heightField[h.spot], height: a.world.buildings[h.id].height };
}, hf);
check('the camera collision field follows new construction', hfAfter.field > hfAfter.height * 0.9, JSON.stringify({ hf, hfAfter }));
await ev((h) => {
  const a = window.__app;
  window.__cam((h.spot % 128 + 0.5) * 20 - 1280, ((h.spot / 128 | 0) + 0.5) * 20 - 1280, 25, 0.3, 1.45);
}, hf);
await page.waitForTimeout(1800);
const inTower = await ev(() => ({ y: window.__app.camera.position.y, floor: window.__app.heightAt(window.__app.camera.position.x, window.__app.camera.position.z) }));
check('the camera is lifted clear of a tower built during play', inTower.y > inTower.floor, JSON.stringify(inTower));
await ev(() => window.__app.tools.clear());

console.log('\n— performance —');
const perf = await ev(() => ({ fps: window.__app.fps, tris: window.__app.renderer.info.render.triangles, calls: window.__app.renderer.info.render.calls }));
check('draw calls stay batched', perf.calls < 400, JSON.stringify(perf));

console.log('\n— errors —');
check('no runtime errors during the whole run', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) { console.log('\nFailures:'); for (const f of failures) console.log('  · ' + f); }
await browser.close();
process.exit(fail ? 1 : 0);
