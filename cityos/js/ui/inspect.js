// Inspector content. Anything clickable in the 3D world resolves to one of
// these panels, and every figure is read live out of the simulation.
import { GRID, CELL, K, Z, RC, BT, ZONE_SPEC, ROAD_SPEC, BUILDING_SPEC } from '../core/defs.js';
import { fmtNum, fmtMoney, fmtPct } from './format.js';
import { ZS, ZN } from '../sim/traffic.js';

const idx = (x, y) => y * GRID + x;
const stat = (k, v) => `<div class="stat"><span class="k">${k}</span><span class="v">${v}</span></div>`;
const bar = (v, col = 'var(--cy)') => `<div class="bar"><i style="width:${Math.max(0, Math.min(100, v * 100))}%;background:${col}"></i></div>`;
const hd = (t) => `<div class="sechd">${t}</div>`;

export function inspectBuilding(sim, b) {
  const g = sim.world.g, i = idx(b.x, b.y);
  const spec = BUILDING_SPEC[b.type] || {};
  const d = sim.world.districts[b.district];
  const occ = b.capacity > 0 ? b.residents / b.capacity : (b.jobs > 0 ? b.employed / b.jobs : 0);
  const chips = [];
  if (b.abandoned) chips.push('<span class="chip bad">Abandoned</span>');
  if (b.onFire) chips.push('<span class="chip bad">On fire</span>');
  if (b.construction < 1) chips.push(`<span class="chip warn">Under construction ${(b.construction * 100).toFixed(0)}%</span>`);
  if (!b.powered) chips.push('<span class="chip bad">No power</span>');
  if (!b.watered) chips.push('<span class="chip warn">No water</span>');
  if (b.landmark) chips.push('<span class="chip">Landmark</span>');
  if (b.hq) chips.push('<span class="chip good">Headquarters</span>');
  if (b.playerBuilt) chips.push('<span class="chip">You built this</span>');

  const pol = g.pol[i] / Math.max(0.0001, sim.fields.polMax || 1);
  const daily = Math.round((b.residents * 1.6 + b.employed * 1.8 + (b.visitors || 0) * 0.4));
  return `
  <div class="insp-hero">
    <div class="kind">${spec.label || b.type} · ${d ? d.name : ''}</div>
    <div class="name">${b.name}</div>
    <div class="sub">${b.floors} floor${b.floors === 1 ? '' : 's'} · ${b.w * CELL}×${b.h * CELL} m footprint · ${ZONE_SPEC[b.zone] ? ZONE_SPEC[b.zone].name : ''}</div>
  </div>
  ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
  ${hd('Occupancy')}
  ${b.capacity > 0 ? stat('Residents', `${fmtNum(b.residents)} / ${fmtNum(b.capacity)}`) : ''}
  ${b.jobs > 0 ? stat('Employees', `${fmtNum(b.employed)} / ${fmtNum(b.jobs)}`) : ''}
  ${bar(occ, occ > 0.95 ? 'var(--gd)' : 'var(--cy)')}
  ${b.visitors ? stat('Daily visitors', fmtNum(b.visitors)) : ''}
  ${stat('Trips generated', `${fmtNum(daily)} / day`)}
  ${hd('Economics')}
  ${b.rent ? stat('Rent', fmtMoney(b.rent, false) + ' / month') : ''}
  ${b.revenue ? stat('Revenue', fmtMoney(b.revenue) + ' / month') : ''}
  ${stat('Assessed value', fmtMoney(b.value))}
  ${stat('Land value here', (g.land[i]).toFixed(2))}
  ${hd('Resources')}
  ${stat('Electricity', (b.powerDemand * (b.capacity > 0 ? b.residents / Math.max(1, b.capacity) : b.employed / Math.max(1, b.jobs))).toFixed(1) + ' MW')}
  ${stat('Water', (b.waterDemand).toFixed(1) + ' units')}
  ${stat('Waste', (b.wasteOut).toFixed(1) + ' t/day')}
  ${stat('Emissions', b.pollution.toFixed(2))}
  ${hd('Surroundings')}
  ${stat('Pollution', (pol * 100).toFixed(0) + '/100')}
  ${stat('Noise', (g.noise[i] * 100).toFixed(0) + '/100')}
  ${stat('Crime index', (g.crime[i] * 100).toFixed(0))}
  ${stat('Transit access', fmtPct(sim.fields.transitAcc[i]))}
  ${stat('Service coverage', fmtPct(sim.fields.svcAll[i]))}
  ${stat('Condition', fmtPct(b.condition))}
  ${bar(b.condition, b.condition < 0.3 ? 'var(--rd)' : 'var(--gr)')}
  ${stat('Age', b.age + ' years')}
  <div style="padding:11px 13px;display:flex;gap:7px">
    <button class="btn sm" data-act="focus" data-arg="${b.id}">Zoom to</button>
    <button class="btn sm danger" data-act="demolish" data-arg="${b.id}">Demolish</button>
  </div>`;
}

export function inspectRoad(sim, cell) {
  const g = sim.world.g, net = sim.net, tr = sim.traffic;
  const spec = ROAD_SPEC[g.road[cell]] || ROAD_SPEC[RC.STREET];
  const vol = tr.vol[cell], cap = net.cap[cell] || spec.capacity;
  const sat = vol / cap;
  const speed = g.speed[cell] || spec.speed;
  const closed = tr.closed[cell];
  const light = net.lightAt[cell] >= 0 ? net.lights[net.lightAt[cell]] : null;
  const d = sim.world.districts[g.dist[cell]];
  const chips = [];
  if (closed) chips.push('<span class="chip bad">Closed</span>');
  if (g.bridge[cell]) chips.push('<span class="chip">Bridge</span>');
  if (g.tunnel[cell]) chips.push('<span class="chip">Tunnel</span>');
  if (light) chips.push('<span class="chip">Signalised</span>');
  const lvl = sat > 1 ? 'F — forced flow' : sat > 0.85 ? 'E — at capacity' : sat > 0.7 ? 'D — approaching capacity' : sat > 0.5 ? 'C — stable' : sat > 0.3 ? 'B — free flowing' : 'A — free flowing';
  return `
  <div class="insp-hero">
    <div class="kind">${spec.name} · ${d ? d.name : ''}</div>
    <div class="name">${sim.roadName(cell)}</div>
    <div class="sub">${spec.lanes} lanes · ${spec.width.toFixed(1)} m carriageway</div>
  </div>
  ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
  ${hd('Traffic')}
  ${stat('Volume', fmtNum(vol) + ' veh/h')}
  ${stat('Capacity', fmtNum(cap) + ' veh/h')}
  ${stat('Saturation', fmtPct(sat))}
  ${bar(Math.min(1, sat), sat > 0.85 ? 'var(--rd)' : sat > 0.6 ? 'var(--gd)' : 'var(--gr)')}
  ${stat('Level of service', lvl)}
  ${stat('Average speed', Math.round(speed) + ' km/h')}
  ${stat('Free-flow speed', spec.speed + ' km/h')}
  ${stat('Delay factor', (tr.timeCost[cell] / Math.max(1e-6, tr.freeCost[cell])).toFixed(2) + '×')}
  ${light ? hd('Signal timing') + stat('North–south green', light.ns + ' s') + stat('East–west green', light.ew + ' s') + stat('Amber', light.amber + ' s') +
      `<div style="padding:4px 13px 10px;display:flex;gap:6px">
        <button class="btn sm" data-act="signal-ns" data-arg="${cell}">N–S +5s</button>
        <button class="btn sm" data-act="signal-ew" data-arg="${cell}">E–W +5s</button>
      </div>` : ''}
  ${hd('Maintenance')}
  ${stat('Upkeep', fmtMoney(spec.maint) + ' / month')}
  <div style="padding:11px 13px;display:flex;gap:7px;flex-wrap:wrap">
    ${g.road[cell] < RC.HIGHWAY ? `<button class="btn sm" data-act="upgrade-road" data-arg="${cell}">Upgrade class</button>` : ''}
    <button class="btn sm" data-act="${closed ? 'open-road' : 'close-road'}" data-arg="${cell}">${closed ? 'Reopen' : 'Close'}</button>
  </div>`;
}

export function inspectCitizen(sim, c, activity) {
  const b = sim.world.buildings;
  const home = b[c.home], work = c.work >= 0 ? b[c.work] : null;
  const rentBurden = home ? (home.rent * 12) / Math.max(1, c.income || 20000) : 0;
  const sat = c.satisfaction;
  const sched = [
    [c.wake, 'Wake'], [Math.max(c.wake + 0.5, c.workStart - Math.max(0.2, c.commuteMin / 60)), 'Leave home'],
    [c.workStart, c.status === 'school' ? 'School starts' : 'Work starts'],
    [12.5, 'Lunch'], [c.workEnd, 'Leave work'],
    [c.workEnd + Math.max(0.2, c.commuteMin / 60), 'Home'], [c.sleep, 'Sleep'],
  ];
  const fmtH = (h) => { const hh = Math.floor(h) % 24, mm = Math.round((h % 1) * 60); const ap = hh >= 12 ? 'PM' : 'AM'; return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')} ${ap}`; };
  return `
  <div class="insp-hero">
    <div class="kind">Resident</div>
    <div class="name">${c.name}</div>
    <div class="sub">${c.age} years old · ${c.occupation}</div>
  </div>
  <div class="chips">
    <span class="chip ${sat > 0.65 ? 'good' : sat < 0.4 ? 'bad' : 'warn'}">${sat > 0.65 ? 'Content' : sat < 0.4 ? 'Unhappy' : 'Getting by'}</span>
    ${c.car ? '<span class="chip">Owns a car</span>' : '<span class="chip">No car</span>'}
    ${c.status === 'unemployed' ? '<span class="chip bad">Out of work</span>' : ''}
  </div>
  ${hd('Right now')}
  ${stat('Activity', activity || '—')}
  ${hd('Life')}
  ${stat('Education', c.edu)}
  ${c.income ? stat('Income', fmtMoney(c.income, false) + ' / year') : ''}
  ${home ? stat('Home', home.name) : ''}
  ${home ? stat('Rent', fmtMoney(home.rent, false) + ' / month') : ''}
  ${home ? stat('Rent burden', fmtPct(rentBurden, 0) + ' of income') : ''}
  ${work ? stat('Workplace', work.name) : ''}
  ${c.commuteMin ? stat('Commute', c.commuteMin.toFixed(0) + ' min each way') : ''}
  ${hd('Satisfaction')}
  ${bar(sat, sat > 0.65 ? 'var(--gr)' : sat < 0.4 ? 'var(--rd)' : 'var(--gd)')}
  ${hd('Daily routine')}
  ${sched.filter(s => s[0] > 0 && s[0] < 24).sort((a, x) => a[0] - x[0]).map(s => stat(fmtH(s[0]), s[1])).join('')}
  <div style="padding:11px 13px;display:flex;gap:7px">
    ${home ? `<button class="btn sm" data-act="focus" data-arg="${home.id}">Their home</button>` : ''}
    ${work ? `<button class="btn sm" data-act="focus" data-arg="${work.id}">Their work</button>` : ''}
  </div>`;
}

export function inspectDistrict(sim, d) {
  const g = sim.world.g;
  let pop = 0, jobs = 0, cap = 0, buildings = 0, abandoned = 0, value = 0, pol = 0, cells = 0, park = 0;
  for (const b of sim.world.buildings) {
    if (!b || b.demolished || b.district !== d.id) continue;
    buildings++; pop += b.residents; jobs += b.jobs; cap += b.capacity; value += b.value;
    if (b.abandoned) abandoned++;
    if (b.zone === Z.PARK) park += b.w * b.h * CELL * CELL;
  }
  for (let i = 0; i < GRID * GRID; i++) if (g.dist[i] === d.id && g.kind[i] !== K.WATER) { pol += g.pol[i]; cells++; }
  const rel = cells ? (pol / cells) / Math.max(0.0001, sim.fields.polMax || 1) : 0;
  // population-weighted commute from the zones overlapping this district
  let cw = 0, cs = 0;
  for (const z of sim.traffic.zones) {
    if (z.anchor < 0 || g.dist[z.anchor] !== d.id) continue;
    cs += (z.commute || 0) * z.pop; cw += z.pop;
  }
  return `
  <div class="insp-hero">
    <div class="kind">District · ${d.label}</div>
    <div class="name">${d.name}</div>
    <div class="sub">${cells} cells · ${(cells * CELL * CELL / 1e6).toFixed(2)} km²</div>
  </div>
  ${hd('People')}
  ${stat('Residents', fmtNum(pop))}
  ${stat('Housing units', fmtNum(cap))}
  ${stat('Occupancy', cap ? fmtPct(pop / cap) : '—')}
  ${stat('Density', cells ? fmtNum(pop / (cells * CELL * CELL / 1e6)) + ' / km²' : '—')}
  ${hd('Economy')}
  ${stat('Jobs', fmtNum(jobs))}
  ${stat('Buildings', fmtNum(buildings) + (abandoned ? ` (${abandoned} abandoned)` : ''))}
  ${stat('Property value', fmtMoney(value))}
  ${hd('Environment & access')}
  ${stat('Pollution index', (rel * 100).toFixed(0))}
  ${stat('Parkland', (park / 10000).toFixed(1) + ' ha')}
  ${stat('Average commute', cw ? (cs / cw).toFixed(1) + ' min' : '—')}
  <div style="padding:11px 13px"><button class="btn sm" data-act="focus-district" data-arg="${d.id}">Fly there</button></div>`;
}

export function inspectVehicle(sim, v) {
  const b = sim.world.buildings;
  const from = b[v.from], to = b[v.to];
  const cell = v.pts[v.seg] ? v.pts[v.seg].cell : 0;
  const kinds = { car: 'Private car', van: 'Delivery van', truck: 'Freight lorry' };
  return `
  <div class="insp-hero">
    <div class="kind">Vehicle</div>
    <div class="name">${kinds[v.kind] || 'Vehicle'}</div>
    <div class="sub">On ${sim.roadName(cell)}</div>
  </div>
  ${hd('Journey')}
  ${from ? stat('From', from.name) : ''}
  ${to ? stat('To', to.name) : ''}
  ${stat('Route length', v.pts.length + ' segments')}
  ${stat('Progress', fmtPct(v.seg / Math.max(1, v.pts.length - 1)))}
  ${stat('Current speed', Math.round(v.speed * 3.6) + ' km/h')}
  ${stat('Link speed', Math.round(sim.world.g.speed[cell] || 0) + ' km/h')}
  <div style="padding:11px 13px">${to ? `<button class="btn sm" data-act="focus" data-arg="${to.id}">Its destination</button>` : ''}</div>`;
}

export function inspectTransitLine(sim, line) {
  return `
  <div class="insp-hero">
    <div class="kind">${line.type === 'bus' ? 'Bus route' : line.type === 'metro' ? 'Subway line' : 'Commuter rail'}</div>
    <div class="name">${line.name}</div>
    <div class="sub">${(line.lengthM / 1000).toFixed(1)} km · ${line.stops.length} stops</div>
  </div>
  ${hd('Service')}
  ${stat('Headway', line.headway + ' min')}
  ${stat('End-to-end run', line.runTime.toFixed(0) + ' min')}
  ${stat('Vehicles in service', line.vehicles.length)}
  ${stat('Capacity per vehicle', fmtNum(line.capacity))}
  ${hd('Performance')}
  ${stat('Ridership', fmtNum(line.ridership) + ' trips/h')}
  ${stat('Operating cost', fmtMoney(line.opCost) + ' / month')}
  ${stat('Cost per trip', line.ridership ? fmtMoney(line.opCost / (line.ridership * 30 * 16), false) : '—')}
  <div style="padding:11px 13px;display:flex;gap:7px">
    <button class="btn sm" data-act="toggle-line" data-arg="${line.id}">${line.active ? 'Suspend' : 'Resume'}</button>
    <button class="btn sm danger" data-act="delete-line" data-arg="${line.id}">Close line</button>
  </div>`;
}

export function inspectTile(sim, cell) {
  const g = sim.world.g;
  const d = sim.world.districts[g.dist[cell]];
  const z = ZONE_SPEC[g.zone[cell]];
  const kinds = { 0: 'Vacant land', 2: 'Water', 3: 'Parkland', 5: 'Plaza', 6: 'Railway' };
  return `
  <div class="insp-hero">
    <div class="kind">${d ? d.name : 'City'}</div>
    <div class="name">${kinds[g.kind[cell]] || 'Land'}</div>
    <div class="sub">${z ? z.name : 'Unzoned'} · cell ${cell % GRID}, ${(cell / GRID) | 0}</div>
  </div>
  ${hd('Site')}
  ${stat('Land value', g.land[cell].toFixed(2))}
  ${stat('Pollution', ((g.pol[cell] / Math.max(0.0001, sim.fields.polMax || 1)) * 100).toFixed(0) + '/100')}
  ${stat('Noise', (g.noise[cell] * 100).toFixed(0) + '/100')}
  ${stat('Crime', (g.crime[cell] * 100).toFixed(0))}
  ${stat('Green cover', (g.green[cell] * 100).toFixed(0) + '/100')}
  ${stat('Transit access', fmtPct(sim.fields.transitAcc[cell]))}
  ${stat('Service coverage', fmtPct(sim.fields.svcAll[cell]))}`;
}
