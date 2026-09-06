// Every detail panel behind the navigation rail. All content is generated from
// live simulation state each time a panel opens or refreshes.
import { GRID, CELL, K, Z, RC, BT, ZONE_SPEC, ROAD_SPEC, BUILDING_SPEC, LAYERS, MODES, UPKEEP } from '../core/defs.js';
import { clamp } from '../core/rng.js';
import { fmtNum, fmtMoney, fmtPct, fmtCompact, el } from './format.js';
import { chart, bars, sparkline } from './charts.js';
import { advisorReports, answer, SUGGESTED, topCongested, worstServedZones, serviceGaps } from './advisors.js';
import { SCENARIOS } from './whatif.js';
import { TRANSIT_SPEC } from '../sim/transit.js';

const idx = (x, y) => y * GRID + x;
const card = (h4, big, note) => `<div class="card"><h4>${h4}</h4><div class="big">${big}</div>${note ? `<div class="note">${note}</div>` : ''}</div>`;

export class Modals {
  constructor(app) {
    this.app = app;
    this.el = app.ui.modalEl;
    this.titleEl = this.el.querySelector('.t');
    this.subEl = this.el.querySelector('.s');
    this.tabsEl = this.el.querySelector('.tabs');
    this.bodyEl = this.el.querySelector('.mdl-b');
    this.footEl = this.el.querySelector('.mdl-f');
    this.current = null;
    this.tab = null;
  }
  get sim() { return this.app.sim; }

  open(id, tab) {
    this.current = id; this.tab = tab || null;
    this.el.classList.add('show');
    this.render();
  }
  close() { this.el.classList.remove('show'); this.current = null; this.app.ui.setNav(null); }
  isOpen(id) { return this.el.classList.contains('show') && (!id || this.current === id); }
  refresh() { if (this.el.classList.contains('show')) this.render(true); }

  setTabs(tabs, active) {
    this.tabsEl.innerHTML = '';
    if (!tabs) return;
    for (const t of tabs) {
      const b = el('button', 'tab' + (t.id === active ? ' on' : ''), t.label);
      b.onclick = () => { this.tab = t.id; this.render(); };
      this.tabsEl.appendChild(b);
    }
  }

  render(isRefresh) {
    const fn = this['r_' + this.current];
    if (!fn) return;
    const scroll = this.bodyEl.scrollTop;
    this.footEl.innerHTML = '';
    fn.call(this, isRefresh);
    if (isRefresh) this.bodyEl.scrollTop = scroll;
  }

  head(title, sub) { this.titleEl.textContent = title; this.subEl.textContent = sub || ''; }

  // ---------------------------------------------------------------- dashboard
  r_dashboard() {
    const sim = this.sim, s = sim.stats, b = sim.budget, h = sim.history.series;
    this.head('City Dashboard', `${sim.timeLabel().date} · ${MODES[sim.modeKey].label} mode`);
    this.setTabs(null);
    this.bodyEl.innerHTML = `
      <div class="grid3" style="margin-bottom:16px">
        ${card('Population', fmtNum(s.population), `${s.netMigration >= 0 ? '+' : ''}${fmtNum(s.netMigration)} last month · ${fmtNum(s.housingCapacity)} units`)}
        ${card('Reserves', fmtMoney(b.treasury), `${b.revenue >= b.expense ? 'Surplus' : 'Deficit'} ${fmtMoney(Math.abs(b.revenue - b.expense))}/mo`)}
        ${card('Approval', fmtPct(s.happiness), `Median income ${fmtMoney(s.medianIncome, false)}`)}
        ${card('Jobs', fmtNum(s.jobsTotal), `${fmtPct(s.unemployment, 1)} unemployment · ${fmtNum(s.inCommuters || 0)} in-commuters`)}
        ${card('Avg commute', s.commute.toFixed(1) + ' min', `Network at ${fmtPct(s.flow)} of free flow`)}
        ${card('Housing', fmtPct(1 - s.vacancy), `Median rent ${fmtMoney(s.medianRent, false)}/mo`)}
      </div>
      <div class="grid2">
        <div class="card"><h4>Population &amp; jobs</h4><canvas id="c1"></canvas></div>
        <div class="card"><h4>Budget</h4><canvas id="c2"></canvas></div>
        <div class="card"><h4>Commute &amp; congestion</h4><canvas id="c3"></canvas></div>
        <div class="card"><h4>Approval</h4><canvas id="c4"></canvas></div>
      </div>`;
    chart(this.bodyEl.querySelector('#c1'), [
      { data: h.population, color: '#4ade80' }, { data: h.jobs, color: '#35d6ff' }], { h: 150 });
    chart(this.bodyEl.querySelector('#c2'), [
      { data: h.revenue, color: '#4ade80' }, { data: h.expense, color: '#ff5f56' }], { h: 150, zero: true });
    chart(this.bodyEl.querySelector('#c3'), [
      { data: h.commute, color: '#fb923c' }, { data: h.congestion, color: '#ff5f56', fill: false }], { h: 150 });
    chart(this.bodyEl.querySelector('#c4'), [{ data: h.happiness, color: '#f0b345' }], { h: 150 });
  }

  // ---------------------------------------------------------------- transport
  r_transport() {
    const sim = this.sim, s = sim.stats, tr = sim.traffic;
    this.head('Transport', `${s.commute.toFixed(1)} min average commute · network at ${fmtPct(s.flow)}`);
    const tabs = [{ id: 'network', label: 'Network' }, { id: 'lines', label: 'Transit lines' }, { id: 'signals', label: 'Signals' }];
    const tab = this.tab || 'network';
    this.setTabs(tabs, tab);
    if (tab === 'network') {
      const hot = topCongested(sim, 8);
      this.bodyEl.innerHTML = `
        <div class="grid3" style="margin-bottom:16px">
          ${card('Traffic flow', fmtPct(s.flow), `Travel-time index ${(tr.travelTimeIndex || 1).toFixed(2)}×`)}
          ${card('Saturation', fmtPct(tr.congestion, 0), `Peak link at ${fmtPct(tr.peakSaturation || 0, 0)} of capacity`)}
          ${card('Transit share', fmtPct(s.transitShare, 1), `${fmtNum(s.transitRidership)} trips this hour`)}
          ${card('In-commuters', fmtNum(s.inCommuters || 0), 'Jobs the resident workforce cannot fill')}
        </div>
        <h4 style="font-size:9px;letter-spacing:.17em;color:var(--faint);margin-bottom:8px">MOST CONGESTED CORRIDORS</h4>
        <table class="dt"><thead><tr><th>Corridor</th><th>Class</th><th style="text-align:right">Volume</th><th style="text-align:right">Capacity</th><th style="text-align:right">Saturation</th><th></th></tr></thead><tbody>
        ${hot.length ? hot.map(x => `<tr><td>${x.name}</td><td>${ROAD_SPEC[sim.world.g.road[x.cell]].name}</td>
          <td class="num">${fmtNum(x.vol)}</td><td class="num">${fmtNum(sim.net.cap[x.cell])}</td>
          <td class="num" style="color:${x.sat > 1 ? '#ff8a82' : x.sat > 0.85 ? '#f8d18a' : '#8ff0b4'}">${fmtPct(x.sat, 0)}</td>
          <td><button class="btn sm" data-go="${x.cell}">Inspect</button></td></tr>`).join('')
          : '<tr><td colspan="6" style="color:var(--dim)">No corridor is above 72% of capacity.</td></tr>'}
        </tbody></table>`;
      for (const b of this.bodyEl.querySelectorAll('[data-go]')) b.onclick = () => { this.close(); this.app.selectCell(+b.dataset.go, true); };
    } else if (tab === 'lines') {
      const lines = sim.transit.lines;
      this.bodyEl.innerHTML = `
        <p style="color:var(--dim);font-size:11.5px;margin-bottom:12px">Draw new lines with the <b>Transit</b> tool: click each stop in order, then Finish Line.</p>
        <table class="dt"><thead><tr><th>Line</th><th>Mode</th><th style="text-align:right">Length</th><th style="text-align:right">Stops</th><th style="text-align:right">Headway</th><th style="text-align:right">Ridership</th><th style="text-align:right">Operating</th><th></th></tr></thead><tbody>
        ${lines.length ? lines.map(l => `<tr><td><span style="color:${l.color}">●</span> ${l.name}</td><td>${TRANSIT_SPEC[l.type].label}</td>
          <td class="num">${(l.lengthM / 1000).toFixed(1)} km</td><td class="num">${l.stops.length}</td>
          <td class="num">${l.headway} min</td><td class="num">${fmtNum(l.ridership)}/h</td><td class="num">${fmtMoney(l.opCost)}</td>
          <td><button class="btn sm" data-line="${l.id}">${l.active ? 'Suspend' : 'Resume'}</button></td></tr>`).join('')
          : '<tr><td colspan="8" style="color:var(--dim)">No transit lines yet.</td></tr>'}
        </tbody></table>`;
      for (const b of this.bodyEl.querySelectorAll('[data-line]')) b.onclick = () => {
        const l = sim.transit.lines.find(x => x.id === +b.dataset.line);
        if (l) { l.active = !l.active; this.render(); this.app.ui.dirtyMinimap(); }
      };
    } else {
      const p = sim.policies;
      this.bodyEl.innerHTML = `
        <p style="color:var(--dim);font-size:11.5px;margin-bottom:14px">Signal delay grows with the cube of approach saturation. Coordinating signals city-wide reduces that penalty — the cheapest capacity available, but it costs money to run.</p>
        <div class="slider"><label>Signal optimisation</label><input type="range" min="0" max="100" value="${Math.round(p.signalOptimisation * 100)}" data-pol="signalOptimisation"><span class="val">${fmtPct(p.signalOptimisation, 0)}</span></div>
        <div class="slider"><label>Transit preference</label><input type="range" min="-50" max="150" value="${Math.round(p.transitBias * 100)}" data-pol="transitBias"><span class="val">${p.transitBias.toFixed(2)}</span></div>
        <div class="grid3" style="margin-top:16px">
          ${card('Signalised junctions', fmtNum(sim.net.lights.length), 'Every one is simulated and drawn')}
          ${card('Stop-controlled', fmtNum(sim.net.stopSigns.length), 'Minor junctions')}
          ${card('Road cells', fmtNum(sim.net.nbrList.length / 2), 'Network links')}
        </div>`;
      this.wireSliders();
    }
  }

  // ---------------------------------------------------------------- economy
  r_economy() {
    const sim = this.sim, s = sim.stats, b = sim.budget, e = sim.economy, h = sim.history.series;
    this.head('Economy & Budget', `${fmtMoney(b.revenue)} in · ${fmtMoney(b.expense)} out each month`);
    const tabs = [{ id: 'budget', label: 'Budget' }, { id: 'sectors', label: 'Sectors' }, { id: 'demand', label: 'Demand' }];
    const tab = this.tab || 'budget';
    this.setTabs(tabs, tab);
    if (tab === 'budget') {
      const bd = b.breakdown || {};
      this.bodyEl.innerHTML = `
        <div class="grid3" style="margin-bottom:16px">
          ${card('Reserves', fmtMoney(b.treasury), '')}
          ${card('Revenue', fmtMoney(b.revenue), 'per month')}
          ${card('Spending', fmtMoney(b.expense), 'per month')}
          ${card('Net', (b.revenue - b.expense >= 0 ? '+' : '') + fmtMoney(b.revenue - b.expense), 'per month')}
        </div>
        <div class="grid2">
          <div class="card"><h4>Revenue</h4><canvas id="rev"></canvas></div>
          <div class="card"><h4>Spending</h4><canvas id="exp"></canvas></div>
        </div>
        <div class="card" style="margin-top:13px"><h4>Reserves over time</h4><canvas id="tre"></canvas></div>`;
      bars(this.bodyEl.querySelector('#rev'), [
        { label: 'Residential tax', value: bd.residentialTax || 0, text: fmtMoney(bd.residentialTax || 0), color: '#4ade80' },
        { label: 'Business tax', value: bd.commercialTax || 0, text: fmtMoney(bd.commercialTax || 0), color: '#35d6ff' },
        { label: 'Industrial tax', value: bd.industrialTax || 0, text: fmtMoney(bd.industrialTax || 0), color: '#f0b345' },
        { label: 'Fees & charges', value: bd.fees || 0, text: fmtMoney(bd.fees || 0), color: '#a78bfa' }]);
      bars(this.bodyEl.querySelector('#exp'), [
        { label: 'Services', value: bd.services || 0, text: fmtMoney(bd.services || 0), color: '#ff5f56' },
        { label: 'Administration', value: bd.administration || 0, text: fmtMoney(bd.administration || 0), color: '#fb923c' },
        { label: 'Roads', value: bd.roads || 0, text: fmtMoney(bd.roads || 0), color: '#f0b345' },
        { label: 'Utilities', value: bd.utilities || 0, text: fmtMoney(bd.utilities || 0), color: '#35d6ff' },
        { label: 'Transit', value: bd.transit || 0, text: fmtMoney(bd.transit || 0), color: '#a78bfa' },
        { label: 'Parks', value: bd.parks || 0, text: fmtMoney(bd.parks || 0), color: '#4ade80' }]);
      chart(this.bodyEl.querySelector('#tre'), [{ data: h.treasury, color: '#4ade80' }], { h: 150, zero: true });
    } else if (tab === 'sectors') {
      this.bodyEl.innerHTML = `
        <div class="grid3" style="margin-bottom:16px">
          ${card('City output', fmtMoney(s.gdp), 'annualised')}
          ${card('Business index', e.businessHealth.toFixed(2) + '×', 'conditions for firms')}
          ${card('Retail jobs', fmtNum(s.retailJobs), '')}
          ${card('Industrial jobs', fmtNum(s.indJobs), '')}
          ${card('Office jobs', fmtNum(s.officeJobs), '')}
          ${card('Unemployment', fmtPct(s.unemployment, 1), `${fmtNum(s.labourForce)} in the labour force`)}
        </div>
        <div class="card"><h4>Output over time</h4><canvas id="gd"></canvas></div>`;
      chart(this.bodyEl.querySelector('#gd'), [{ data: h.gdp, color: '#35d6ff' }], { h: 160 });
    } else {
      const row = (k, dem, prof) => `<tr><td>${k}</td>
        <td class="num" style="color:${dem > 0 ? '#8ff0b4' : '#ff8a82'}">${dem.toFixed(2)}</td>
        <td class="num" style="color:${prof > 0 ? '#8ff0b4' : '#ff8a82'}">${prof.toFixed(2)}</td></tr>`;
      this.bodyEl.innerHTML = `
        <p style="color:var(--dim);font-size:11.5px;margin-bottom:12px">
          <b>Demand</b> is how much households and firms want to be here — it drives migration and approval.
          <b>Developer incentive</b> is whether building is profitable — it drives construction. They can point in opposite directions:
          scarce, expensive housing repels residents while attracting builders.</p>
        <table class="dt"><thead><tr><th>Land use</th><th style="text-align:right">Demand</th><th style="text-align:right">Developer incentive</th></tr></thead><tbody>
        ${row('Residential', e.demand.res, e.profit.res)}
        ${row('Commercial', e.demand.comm, e.profit.comm)}
        ${row('Industrial', e.demand.ind, e.profit.ind)}
        ${row('Office', e.demand.office, e.profit.office)}
        </tbody></table>
        <div class="grid3" style="margin-top:16px">
          ${card('Rent index', e.rentIndex.toFixed(2) + '×', `Median ${fmtMoney(s.medianRent, false)}/mo`)}
          ${card('Property index', e.priceIndex.toFixed(2) + '×', '')}
          ${card('Sites under construction', fmtNum(e.buildQueue.length), '')}
        </div>`;
    }
  }

  // ---------------------------------------------------------------- population
  r_population() {
    const sim = this.sim, s = sim.stats, h = sim.history.series;
    this.head('Population', `${fmtNum(s.population)} residents · ${fmtNum(sim.citizens.list.length)} tracked in detail`);
    const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'people', label: 'Residents' }];
    const tab = this.tab || 'overview';
    this.setTabs(tabs, tab);
    if (tab === 'overview') {
      const ages = [0, 0, 0, 0, 0];
      for (const c of sim.citizens.list) {
        ages[c.age < 18 ? 0 : c.age < 30 ? 1 : c.age < 50 ? 2 : c.age < 67 ? 3 : 4]++;
      }
      const n = Math.max(1, sim.citizens.list.length);
      this.bodyEl.innerHTML = `
        <div class="grid3" style="margin-bottom:16px">
          ${card('Residents', fmtNum(s.population), `${s.netMigration >= 0 ? '+' : ''}${fmtNum(s.netMigration)} net migration last month`)}
          ${card('Housing units', fmtNum(s.housingCapacity), `${fmtPct(1 - s.vacancy)} occupied`)}
          ${card('Labour force', fmtNum(s.labourForce), `${fmtPct(s.unemployment, 1)} unemployed`)}
          ${card('Median income', fmtMoney(s.medianIncome, false), 'per year')}
          ${card('Median rent', fmtMoney(s.medianRent, false), `${fmtPct(s.medianRent * 12 / Math.max(1, s.medianIncome), 0)} of income`)}
          ${card('Approval', fmtPct(s.happiness), '')}
        </div>
        <div class="grid2">
          <div class="card"><h4>Age structure (sampled)</h4><canvas id="ag"></canvas></div>
          <div class="card"><h4>Population history</h4><canvas id="ph"></canvas></div>
        </div>`;
      bars(this.bodyEl.querySelector('#ag'), [
        { label: 'Under 18', value: ages[0], text: fmtPct(ages[0] / n, 0), color: '#4ade80' },
        { label: '18–29', value: ages[1], text: fmtPct(ages[1] / n, 0), color: '#35d6ff' },
        { label: '30–49', value: ages[2], text: fmtPct(ages[2] / n, 0), color: '#a78bfa' },
        { label: '50–66', value: ages[3], text: fmtPct(ages[3] / n, 0), color: '#f0b345' },
        { label: '67+', value: ages[4], text: fmtPct(ages[4] / n, 0), color: '#fb923c' }]);
      chart(this.bodyEl.querySelector('#ph'), [{ data: h.population, color: '#4ade80' }], { h: 150 });
    } else {
      const weekend = sim.dayOfWeek === 0 || sim.dayOfWeek === 6;
      const list = sim.citizens.list.slice(0, 60);
      this.bodyEl.innerHTML = `
        <p style="color:var(--dim);font-size:11.5px;margin-bottom:12px">A persistent sample of ${fmtNum(sim.citizens.list.length)} residents with real homes, workplaces and routines. Click anyone to follow them.</p>
        <table class="dt"><thead><tr><th>Name</th><th>Age</th><th>Occupation</th><th style="text-align:right">Income</th><th style="text-align:right">Commute</th><th>Doing now</th><th style="text-align:right">Mood</th></tr></thead><tbody>
        ${list.map(c => {
          const a = sim.citizens.activity(c, sim.hourOfDay, weekend);
          return `<tr data-cit="${c.id}" style="cursor:pointer"><td>${c.name}</td><td>${c.age}</td><td>${c.occupation}</td>
            <td class="num">${c.income ? fmtMoney(c.income, false) : '—'}</td>
            <td class="num">${c.commuteMin ? c.commuteMin.toFixed(0) + ' min' : '—'}</td>
            <td style="color:var(--dim)">${a.act}</td>
            <td class="num" style="color:${c.satisfaction > 0.65 ? '#8ff0b4' : c.satisfaction < 0.4 ? '#ff8a82' : '#f8d18a'}">${fmtPct(c.satisfaction, 0)}</td></tr>`;
        }).join('')}
        </tbody></table>`;
      for (const tr of this.bodyEl.querySelectorAll('[data-cit]')) tr.onclick = () => {
        const c = sim.citizens.list.find(x => x.id === +tr.dataset.cit);
        if (c) { this.close(); this.app.selectCitizen(c); }
      };
    }
  }

  // ---------------------------------------------------------------- utilities
  r_utilities() {
    const sim = this.sim, s = sim.stats;
    this.head('Utilities', `Electricity ${fmtPct(s.powerRatio, 0)} loaded`);
    this.setTabs(null);
    const meter = (label, dem, cap, unit) => {
      const r = cap > 0 ? dem / cap : (dem > 0 ? 2 : 0);
      const col = r > 1 ? 'var(--rd)' : r > 0.9 ? 'var(--gd)' : 'var(--gr)';
      return `<div class="card"><h4>${label}</h4><div class="big" style="color:${col}">${fmtPct(r, 0)}</div>
        <div class="bar" style="margin:8px 0 6px"><i style="width:${Math.min(100, r * 100)}%;background:${col}"></i></div>
        <div class="note">${Math.round(dem)} / ${Math.round(cap)} ${unit}</div></div>`;
    };
    const plants = sim.world.buildings.filter(b => b && !b.demolished && (b.type === BT.POWER || b.type === BT.WATER_PLANT || b.type === BT.WASTE));
    this.bodyEl.innerHTML = `
      <div class="grid3" style="margin-bottom:16px">
        ${meter('Electricity', s.powerDemand, s.powerCapacity, 'MW')}
        ${meter('Water', s.waterDemand, s.waterCapacity, 'units')}
        ${meter('Waste handling', s.wasteDemand, s.wasteCapacity, 't/day')}
      </div>
      ${s.blackoutFrac > 0.001 ? `<div class="card" style="border-color:rgba(255,95,86,.4);margin-bottom:14px">
        <h4 style="color:#ff8a82">Load shedding in effect</h4>
        <div class="note">${fmtPct(s.blackoutFrac, 0)} of buildings are without power. Hospitals, fire and police stations are exempt.
        Unpowered buildings lose output, their residents' approval falls, and they go dark at night.</div></div>` : ''}
      <p style="color:var(--dim);font-size:11.5px;margin-bottom:10px">Demand follows occupancy and the time of day — homes peak in the evening, offices at midday — and rises in hot and cold weather.</p>
      <table class="dt"><thead><tr><th>Facility</th><th>Type</th><th>District</th><th style="text-align:right">Capacity</th><th style="text-align:right">Upkeep</th><th>Status</th></tr></thead><tbody>
      ${plants.map(p => `<tr><td>${p.name}</td><td>${BUILDING_SPEC[p.type].label}</td><td>${sim.districtName(p.district)}</td>
        <td class="num">${p.type === BT.POWER ? Math.round(520 * p.w * p.h) + ' MW' : p.type === BT.WATER_PLANT ? Math.round(1150 * p.w * p.h) : Math.round(900 * p.w * p.h)}</td>
        <td class="num">${fmtMoney(UPKEEP[p.type] || 0)}</td>
        <td style="color:${p.offline ? '#ff8a82' : '#8ff0b4'}">${p.offline ? 'Offline' : 'Online'}</td></tr>`).join('')}
      </tbody></table>`;
  }

  // ---------------------------------------------------------------- environment
  r_environment() {
    const sim = this.sim, s = sim.stats, p = sim.policies;
    const rel = s.pollution / Math.max(0.0001, sim.fields.polMax || 1);
    this.head('Environment', `Pollution index ${(rel * 100).toFixed(0)} · ${(s.parkPerCapita || 0).toFixed(1)} m² of park per resident`);
    this.setTabs(null);
    this.bodyEl.innerHTML = `
      <div class="grid3" style="margin-bottom:16px">
        ${card('Pollution index', (rel * 100).toFixed(0), `Worst cell ${(sim.fields.polMax || 0).toFixed(2)}`)}
        ${card('Park per resident', (s.parkPerCapita || 0).toFixed(1) + ' m²', 'Target 9 m²')}
        ${card('Parkland', ((s.parkArea || 0) / 10000).toFixed(0) + ' ha', '')}
        ${card('Noise index', (s.noise * 100).toFixed(0), 'Traffic-driven')}
        ${card('Transit share', fmtPct(s.transitShare, 1), 'Trips off the road network')}
        ${card('Weather', sim.weather.type, `${sim.weather.temp}°C`)}
      </div>
      <div class="slider"><label>Environmental regulation</label><input type="range" min="0" max="100" value="${Math.round(p.envRegulation * 100)}" data-pol="envRegulation"><span class="val">${fmtPct(p.envRegulation, 0)}</span></div>
      <div class="slider"><label>EV adoption support</label><input type="range" min="0" max="100" value="${Math.round(p.evAdoption * 100)}" data-pol="evAdoption"><span class="val">${fmtPct(p.evAdoption, 0)}</span></div>
      <p style="color:var(--dim);font-size:11.5px;margin-top:12px">Regulation suppresses industrial demand but cuts emissions at source. EV adoption scales the traffic component of emissions directly. Use the <b>Pollution</b> map layer to see where the load actually sits.</p>
      <div style="margin-top:14px"><button class="btn" style="width:auto;padding:0 16px" data-layer="pollution">Show pollution layer</button></div>`;
    this.wireSliders();
    const lb = this.bodyEl.querySelector('[data-layer]');
    if (lb) lb.onclick = () => { this.app.setLayer('pollution'); this.close(); };
  }

  // ---------------------------------------------------------------- emergencies
  r_emergencies() {
    const sim = this.sim, s = sim.stats;
    this.head('Emergencies & Services', `${sim.events.active.length} active incident${sim.events.active.length === 1 ? '' : 's'}`);
    this.setTabs(null);
    const gaps = serviceGaps(sim);
    const cover = (l, v) => `<div class="card"><h4>${l}</h4><div class="big">${fmtPct(v)}</div>
      <div class="bar" style="margin:8px 0 0"><i style="width:${v * 100}%;background:${v < 0.5 ? 'var(--rd)' : v < 0.7 ? 'var(--gd)' : 'var(--gr)'}"></i></div></div>`;
    const names = { accident: 'Traffic accident', fire: 'Building fire', outage: 'Power outage', flood: 'Flooding', roadworks: 'Roadworks', infra: 'Utility failure', downturn: 'Economic downturn', boom: 'Population boom' };
    this.bodyEl.innerHTML = `
      <div class="grid3" style="margin-bottom:16px">
        ${cover('Police coverage', s.policeCover)}
        ${cover('Fire coverage', s.fireCover)}
        ${cover('Healthcare', s.healthCover)}
        ${cover('Education', s.eduCover)}
      </div>
      ${gaps.length ? `<div class="card" style="border-color:rgba(240,179,69,.35);margin-bottom:14px"><h4 style="color:#f8d18a">Coverage gaps</h4>
        <div class="note">${gaps.map(g => `${g.what} reaches only ${fmtPct(g.v)} of residents — build a ${g.build}.`).join('<br>')}</div></div>` : ''}
      <h4 style="font-size:9px;letter-spacing:.17em;color:var(--faint);margin-bottom:8px">ACTIVE INCIDENTS</h4>
      <table class="dt"><thead><tr><th>Type</th><th>Where</th><th>Severity</th><th></th></tr></thead><tbody>
      ${sim.events.active.length ? sim.events.active.map(e => {
        const cell = e.cell !== undefined ? e.cell : (e.building !== undefined && sim.world.buildings[e.building] ? idx(sim.world.buildings[e.building].x, sim.world.buildings[e.building].y) : (e.cells ? e.cells[0] : undefined));
        return `<tr><td>${names[e.type] || e.type}</td>
          <td>${cell !== undefined ? (sim.world.g.kind[cell] === K.ROAD ? sim.roadName(cell) : sim.districtName(sim.world.g.dist[cell])) : 'City-wide'}</td>
          <td style="color:${e.severity === 'bad' ? '#ff8a82' : e.severity === 'warn' ? '#f8d18a' : 'var(--dim)'}">${e.severity || 'info'}</td>
          <td>${cell !== undefined ? `<button class="btn sm" data-go="${cell}">Go there</button>` : ''}</td></tr>`;
      }).join('') : '<tr><td colspan="4" style="color:var(--dim)">Nothing is on fire. Quiet day.</td></tr>'}
      </tbody></table>
      <h4 style="font-size:9px;letter-spacing:.17em;color:var(--faint);margin:18px 0 8px">EVENT LOG</h4>
      <table class="dt"><tbody>
      ${sim.events.feed.slice(0, 24).map(e => `<tr><td style="color:${e.severity === 'bad' ? '#ff8a82' : e.severity === 'good' ? '#8ff0b4' : e.severity === 'warn' ? '#f8d18a' : 'var(--text)'}">${e.title}</td>
        <td style="text-align:right;color:var(--faint)">${e.stamp}, day ${e.day}</td></tr>`).join('')}
      </tbody></table>`;
    for (const b of this.bodyEl.querySelectorAll('[data-go]')) b.onclick = () => { this.close(); this.app.selectCell(+b.dataset.go, true); };
  }

  // ---------------------------------------------------------------- districts
  r_districts() {
    const sim = this.sim, g = sim.world.g;
    this.head('Districts', `${sim.world.districts.length} districts`);
    this.setTabs(null);
    const agg = sim.world.districts.map(d => ({ d, pop: 0, jobs: 0, cap: 0, val: 0, cells: 0, pol: 0, ab: 0 }));
    for (const b of sim.world.buildings) {
      if (!b || b.demolished) continue;
      const a = agg[b.district]; if (!a) continue;
      a.pop += b.residents; a.jobs += b.jobs; a.cap += b.capacity; a.val += b.value; if (b.abandoned) a.ab++;
    }
    for (let i = 0; i < GRID * GRID; i++) { const a = agg[g.dist[i]]; if (a && g.kind[i] !== K.WATER) { a.cells++; a.pol += g.pol[i]; } }
    const maxPol = Math.max(0.0001, sim.fields.polMax || 1);
    this.bodyEl.innerHTML = `
      <table class="dt"><thead><tr><th>District</th><th>Type</th><th style="text-align:right">Residents</th><th style="text-align:right">Jobs</th>
        <th style="text-align:right">Occupancy</th><th style="text-align:right">Density</th><th style="text-align:right">Pollution</th><th style="text-align:right">Value</th><th></th></tr></thead><tbody>
      ${agg.sort((a, b) => b.pop - a.pop).map(a => `<tr>
        <td><span style="color:${a.d.color}">●</span> ${a.d.name}</td><td style="color:var(--dim)">${a.d.label}</td>
        <td class="num">${fmtNum(a.pop)}</td><td class="num">${fmtNum(a.jobs)}</td>
        <td class="num">${a.cap ? fmtPct(a.pop / a.cap, 0) : '—'}</td>
        <td class="num">${a.cells ? fmtNum(a.pop / (a.cells * CELL * CELL / 1e6)) : '—'}/km²</td>
        <td class="num">${a.cells ? ((a.pol / a.cells) / maxPol * 100).toFixed(0) : '—'}</td>
        <td class="num">${fmtMoney(a.val)}</td>
        <td><button class="btn sm" data-dist="${a.d.id}">Fly there</button></td></tr>`).join('')}
      </tbody></table>`;
    for (const b of this.bodyEl.querySelectorAll('[data-dist]')) b.onclick = () => { this.close(); this.app.focusDistrict(+b.dataset.dist); };
  }

  // ---------------------------------------------------------------- policies
  r_policies() {
    const sim = this.sim, p = sim.policies;
    this.head('Policies', 'Every setting here feeds directly into the simulation');
    this.setTabs(null);
    this.bodyEl.innerHTML = `
      <h4 style="font-size:9px;letter-spacing:.17em;color:var(--faint);margin-bottom:10px">TAXATION</h4>
      <div class="slider"><label>Residential tax</label><input type="range" min="0" max="30" step="0.2" value="${(p.taxRes * 100).toFixed(1)}" data-pol="taxRes" data-scale="100"><span class="val">${fmtPct(p.taxRes, 1)}</span></div>
      <div class="slider"><label>Business tax</label><input type="range" min="0" max="30" step="0.2" value="${(p.taxComm * 100).toFixed(1)}" data-pol="taxComm" data-scale="100"><span class="val">${fmtPct(p.taxComm, 1)}</span></div>
      <div class="slider"><label>Industrial tax</label><input type="range" min="0" max="30" step="0.2" value="${(p.taxInd * 100).toFixed(1)}" data-pol="taxInd" data-scale="100"><span class="val">${fmtPct(p.taxInd, 1)}</span></div>
      <p style="color:var(--dim);font-size:11.5px;margin:6px 0 18px">Higher rates raise revenue immediately, but reduce household demand, developer profitability and land values. Test a change in the What-If simulator before committing.</p>
      <h4 style="font-size:9px;letter-spacing:.17em;color:var(--faint);margin-bottom:10px">SERVICES &amp; PLANNING</h4>
      <div class="slider"><label>Service level</label><input type="range" min="-50" max="100" value="${Math.round(p.serviceLevel * 100)}" data-pol="serviceLevel"><span class="val">${(p.serviceLevel >= 0 ? '+' : '') + fmtPct(p.serviceLevel, 0)}</span></div>
      <div class="slider"><label>Environmental regulation</label><input type="range" min="0" max="100" value="${Math.round(p.envRegulation * 100)}" data-pol="envRegulation"><span class="val">${fmtPct(p.envRegulation, 0)}</span></div>
      <div class="slider"><label>Signal optimisation</label><input type="range" min="0" max="100" value="${Math.round(p.signalOptimisation * 100)}" data-pol="signalOptimisation"><span class="val">${fmtPct(p.signalOptimisation, 0)}</span></div>
      <div class="slider"><label>Transit preference</label><input type="range" min="-50" max="150" value="${Math.round(p.transitBias * 100)}" data-pol="transitBias"><span class="val">${p.transitBias.toFixed(2)}</span></div>
      <div class="slider"><label>EV adoption support</label><input type="range" min="0" max="100" value="${Math.round(p.evAdoption * 100)}" data-pol="evAdoption"><span class="val">${fmtPct(p.evAdoption, 0)}</span></div>
      <div class="toggle" data-tog="densityBonus"><span>Density bonus — raises developer incentive to build housing</span><span class="tw"></span></div>
      <div class="toggle" data-tog="congestionCharge"><span>Congestion charge — cuts car trips, raises revenue, annoys drivers</span><span class="tw"></span></div>
      <div class="toggle" data-tog="greenBelt"><span>Green belt — blocks development on the outer ring</span><span class="tw"></span></div>`;
    this.wireSliders();
    for (const t of this.bodyEl.querySelectorAll('[data-tog]')) {
      const k = t.dataset.tog;
      t.classList.toggle('on', !!p[k]);
      t.onclick = () => { p[k] = !p[k]; t.classList.toggle('on', !!p[k]); this.app.onPolicyChange(k); };
    }
  }

  wireSliders() {
    for (const s of this.bodyEl.querySelectorAll('input[type=range][data-pol]')) {
      s.oninput = () => {
        const k = s.dataset.pol;
        const v = +s.value / (s.dataset.scale ? +s.dataset.scale : 100);
        this.sim.policies[k] = v;
        const val = s.parentElement.querySelector('.val');
        if (val) val.textContent = k.startsWith('tax') || k === 'envRegulation' || k === 'evAdoption' || k === 'signalOptimisation'
          ? fmtPct(v, k.startsWith('tax') ? 1 : 0) : (k === 'serviceLevel' ? ((v >= 0 ? '+' : '') + fmtPct(v, 0)) : v.toFixed(2));
        this.app.onPolicyChange(k);
      };
    }
  }

  // ---------------------------------------------------------------- advisors
  r_advisors() {
    const sim = this.sim;
    this.head('Advisors', 'Six specialists, six different objectives. They will disagree.');
    const tabs = [{ id: 'panel', label: 'Advisory panel' }, { id: 'ask', label: 'Ask the analyst' }];
    const tab = this.tab || 'panel';
    this.setTabs(tabs, tab);
    if (tab === 'panel') {
      const reps = advisorReports(sim);
      this.bodyEl.innerHTML = reps.map(r => `
        <div class="adv">
          <div class="av">${r.ic}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center"><div><div class="nm">${r.name}</div><div class="ro">${r.role}</div></div>
            <span class="mood ${r.mood}">${r.mood === 'pos' ? 'Satisfied' : r.mood === 'neg' ? 'Concerned' : 'Watching'}</span></div>
            <div class="msg">${r.msg}</div>
            ${r.recs && r.recs.length ? `<ul style="margin:8px 0 0 16px;font-size:11.5px;color:var(--dim);line-height:1.6">${r.recs.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
          </div>
        </div>`).join('');
    } else {
      this.bodyEl.innerHTML = `
        <div class="ask"><input id="askq" placeholder="Ask about traffic, housing, transit, jobs, taxes, the budget…" value="${this._lastQ || ''}"><button class="btn pri" id="askgo">Ask</button></div>
        <div class="suggest">${SUGGESTED.map(s => `<button class="sg">${s}</button>`).join('')}</div>
        <div id="answers">${this._answers || '<p style="color:var(--dim);font-size:12px">The analyst reads the current simulation state before answering. Every number it quotes is measured, not invented.</p>'}</div>`;
      const input = this.bodyEl.querySelector('#askq');
      const go = () => {
        const q = input.value.trim();
        if (!q) return;
        this._lastQ = q;
        const a = answer(sim, q);
        this._answers = `<div class="answer"><h5>${a.title}</h5>${a.html}</div>` + (this._answers || '').replace(/^<p style[^>]*>.*?<\/p>/, '');
        this.bodyEl.querySelector('#answers').innerHTML = this._answers;
      };
      this.bodyEl.querySelector('#askgo').onclick = go;
      input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
      for (const b of this.bodyEl.querySelectorAll('.sg')) b.onclick = () => { input.value = b.textContent; go(); };
      input.focus();
    }
  }

  // ---------------------------------------------------------------- what-if
  r_whatif(isRefresh) {
    const wi = this.app.whatif, sim = this.sim;
    this.head('What-If Simulator', 'Forks the whole city, applies the change, and races it against an unchanged copy');
    this.setTabs(null);
    if (wi.running) {
      this.bodyEl.innerHTML = `
        <div class="card"><h4>Running ${wi.scenario.label}</h4>
        <div class="note">Simulating ${wi.horizonDays} days on two forks of the city — one with the change, one without.</div>
        <div class="progress"><i style="width:${(wi.progress * 100).toFixed(1)}%"></i></div>
        <div class="note">${Math.round(wi.progress * 100)}% · day ${wi.daysDone} of ${wi.horizonDays}</div></div>`;
      this.footEl.innerHTML = '';
      const c = el('button', 'btn danger', 'Cancel');
      c.onclick = () => { wi.cancel(); this.render(); };
      this.footEl.appendChild(c);
      return;
    }
    if (wi.result) {
      const r = wi.result;
      const rows = r.metrics.map(m => {
        const now = r.now[m.k], ctl = r.control[m.k], tre = r.treat[m.k];
        const dv = tre - ctl;
        const rel = ctl !== 0 ? dv / Math.abs(ctl) : 0;
        const better = m.good > 0 ? dv > 0 : dv < 0;
        const cls = Math.abs(rel) < 0.005 ? 'fl' : better ? 'up' : 'dn';
        return `<tr><td>${m.label}</td><td class="num">${m.fmt(now)}</td><td class="num" style="color:var(--dim)">${m.fmt(ctl)}</td>
          <td class="num">${m.fmt(tre)}</td>
          <td class="num"><span class="delta ${cls}">${Math.abs(rel) < 0.005 ? '—' : (dv > 0 ? '+' : '') + (m.k === 'happiness' || m.k === 'unemployment' || m.k === 'flow' || m.k === 'vacancy' || m.k === 'transitShare' ? (dv * 100).toFixed(1) + ' pts' : m.fmt(Math.abs(dv)))}</span></td></tr>`;
      }).join('');
      this.bodyEl.innerHTML = `
        <div class="card" style="margin-bottom:14px"><h4>${r.scenario.label} · ${r.horizonDays} day horizon</h4>
          <div class="note">${r.log.join(' ')}</div></div>
        <table class="dt"><thead><tr><th>Metric</th><th style="text-align:right">Today</th><th style="text-align:right">Do nothing</th><th style="text-align:right">With change</th><th style="text-align:right">Difference</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="card" style="margin-top:14px"><h4>What it means</h4>
        ${r.narrative.length ? `<ul style="margin:6px 0 0 16px;font-size:12px;line-height:1.65">${r.narrative.map(n => `<li style="color:${n.better ? '#8ff0b4' : '#ff8a82'}">${n.txt}</li>`).join('')}</ul>`
          : '<div class="note">No metric moved by more than half a percent against the control. On this horizon, the change is close to neutral.</div>'}
        </div>`;
      this.footEl.innerHTML = '';
      const again = el('button', 'btn', 'Run another scenario');
      again.onclick = () => { wi.result = null; this.render(); };
      this.footEl.appendChild(again);
      return;
    }
    const sel = this.app.selection;
    this.bodyEl.innerHTML = `
      <p style="color:var(--dim);font-size:11.5px;margin-bottom:14px">
        This is not an estimate — it forks the entire simulation twice, applies your change to one copy, and fast-forwards both by the same number of days.
        The difference between them is the effect of the decision, with the passage of time cancelled out.
        ${sel ? `Selected: <b style="color:var(--cy2)">${sel.label || 'a tile'}</b>` : 'Some scenarios use the selected tile — click something in the city first.'}
      </p>
      <div class="slider"><label>Horizon</label><input type="range" id="hz" min="90" max="1095" step="5" value="${wi.horizonDays}"><span class="val" id="hzv">${wi.horizonDays} days</span></div>
      <div class="grid2" style="margin-top:12px">
      ${SCENARIOS.map(s => {
        const ok = wi.scenarioAvailable(s);
        return `<div class="card" style="${ok ? '' : 'opacity:.45'}">
          <h4>${s.label}</h4><div class="note">${s.desc}</div>
          <button class="btn sm" style="margin-top:10px" data-sc="${s.id}" ${ok ? '' : 'disabled'}>${ok ? 'Run scenario' : 'Select a road first'}</button></div>`;
      }).join('')}
      </div>`;
    const hz = this.bodyEl.querySelector('#hz');
    hz.oninput = () => { wi.horizonDays = +hz.value; this.bodyEl.querySelector('#hzv').textContent = hz.value + ' days'; };
    for (const b of this.bodyEl.querySelectorAll('[data-sc]')) b.onclick = () => {
      wi.start(b.dataset.sc, +hz.value);
      this.render();
    };
  }

  // ---------------------------------------------------------------- stats
  r_stats() {
    const sim = this.sim, h = sim.history.series;
    this.head('City History', `${(sim.minutes / 1440 / 365).toFixed(2)} years simulated · ${h.population.length} data points`);
    const tabs = [{ id: 'growth', label: 'Growth' }, { id: 'money', label: 'Money' }, { id: 'mobility', label: 'Mobility' }, { id: 'quality', label: 'Quality of life' }];
    const tab = this.tab || 'growth';
    this.setTabs(tabs, tab);
    const labels = sim.history.labels.map(m => {
      const d = new Date(Date.UTC(2035, 4, 15, 8) + m * 60000);
      return `${d.getUTCFullYear()}`;
    });
    const sets = {
      growth: [['Population', h.population, '#4ade80'], ['Jobs', h.jobs, '#35d6ff'], ['Housing vacancy %', h.vacancy, '#a78bfa'], ['Land value index', h.landValue, '#f0b345']],
      money: [['Monthly revenue', h.revenue, '#4ade80'], ['Monthly spending', h.expense, '#ff5f56'], ['Reserves', h.treasury, '#35d6ff'], ['City output', h.gdp, '#a78bfa']],
      mobility: [['Average commute (min)', h.commute, '#fb923c'], ['Congestion index', h.congestion, '#ff5f56'], ['Transit ridership', h.transit, '#35d6ff']],
      quality: [['Approval %', h.happiness, '#f0b345'], ['Unemployment %', h.unemployment, '#ff5f56'], ['Pollution index', h.pollution, '#84cc16'], ['Median rent', h.rent, '#a78bfa']],
    }[tab];
    this.bodyEl.innerHTML = `<div class="grid2">${sets.map((s, i) => `<div class="card"><h4>${s[0]}</h4><canvas id="h${i}"></canvas></div>`).join('')}</div>
      <p style="color:var(--dim);font-size:11px;margin-top:12px">Snapshots are taken every five simulated days and at every month end. The city remembers its whole history.</p>`;
    sets.forEach((s, i) => chart(this.bodyEl.querySelector('#h' + i), [{ data: s[1], color: s[2] }], { h: 165, labels }));
  }

  // ---------------------------------------------------------------- settings
  r_settings() {
    const app = this.app, sim = this.sim;
    this.head('Settings', 'Save, load, quality and a new city');
    this.setTabs(null);
    const saves = app.save.list();
    this.bodyEl.innerHTML = `
      <h4 style="font-size:9px;letter-spacing:.17em;color:var(--faint);margin-bottom:10px">SAVED CITIES</h4>
      <table class="dt"><tbody>
      ${saves.length ? saves.map(s => `<tr><td>${s.name}</td><td style="color:var(--dim)">${s.date}</td>
        <td style="text-align:right;color:var(--dim)">${fmtNum(s.population)} residents</td>
        <td style="text-align:right"><button class="btn sm" data-load="${s.slot}">Load</button></td>
        <td style="text-align:right"><button class="btn sm danger" data-del="${s.slot}">Delete</button></td></tr>`).join('')
        : '<tr><td style="color:var(--dim)">No saved cities yet.</td></tr>'}
      </tbody></table>
      <div style="display:flex;gap:8px;margin:14px 0 22px">
        <button class="btn" style="width:auto;padding:0 16px" id="savebtn">Save city</button>
        <button class="btn" style="width:auto;padding:0 16px" id="exportbtn">Export file</button>
        <button class="btn" style="width:auto;padding:0 16px" id="importbtn">Import file</button>
        <input type="file" id="fileinput" accept=".json" style="display:none">
      </div>
      <h4 style="font-size:9px;letter-spacing:.17em;color:var(--faint);margin-bottom:10px">GRAPHICS</h4>
      <div class="slider"><label>Detail level</label><input type="range" min="30" max="150" value="${Math.round(app.quality * 100)}" id="q"><span class="val">${Math.round(app.quality * 100)}%</span></div>
      <div class="toggle" id="tshadow"><span>Shadows</span><span class="tw"></span></div>
      <div class="toggle" id="tbloom"><span>Bloom &amp; glow</span><span class="tw"></span></div>
      <div class="toggle" id="tagents"><span>Moving vehicles and pedestrians</span><span class="tw"></span></div>
      <div class="toggle" id="tcine"><span>Cinematic idle camera</span><span class="tw"></span></div>
      <h4 style="font-size:9px;letter-spacing:.17em;color:var(--faint);margin:22px 0 10px">NEW CITY</h4>
      <div class="grid3">
      ${Object.entries(MODES).map(([k, m]) => `<div class="card"><h4>${m.label}</h4><div class="note">${m.desc}</div>
        <button class="btn sm" style="margin-top:10px" data-mode="${k}">Start</button></div>`).join('')}
      </div>
      <h4 style="font-size:9px;letter-spacing:.17em;color:var(--faint);margin:22px 0 10px">CONTROLS</h4>
      <div class="note" style="color:var(--dim);font-size:11.5px;line-height:1.8">
        <b>Left-drag</b> pan · <b>Right-drag</b> orbit · <b>Wheel</b> zoom to cursor · <b>WASD</b> move · <b>Q/E</b> rotate · <b>R/F</b> zoom<br>
        <b>1–5</b> speed · <b>Space</b> pause · <b>Esc</b> cancel tool · <b>L</b> layers · <b>Tab</b> cycle camera presets · <b>[</b> <b>]</b> brush size
      </div>`;
    const q = this.bodyEl.querySelector('#q');
    q.oninput = () => { app.quality = +q.value / 100; q.parentElement.querySelector('.val').textContent = q.value + '%'; app.applyQuality(); };
    const tg = (id, get, set) => {
      const t = this.bodyEl.querySelector('#' + id);
      t.classList.toggle('on', get());
      t.onclick = () => { set(!get()); t.classList.toggle('on', get()); };
    };
    tg('tshadow', () => app.renderer.shadowMap.enabled, (v) => app.setShadows(v));
    tg('tbloom', () => app.bloomEnabled, (v) => app.setBloom(v));
    tg('tagents', () => app.agents.enabled, (v) => { app.agents.enabled = v; });
    tg('tcine', () => app.rig.cinematic, (v) => { app.rig.cinematic = v; });
    this.bodyEl.querySelector('#savebtn').onclick = () => { app.save.save(); this.render(); app.ui.toast('City saved'); };
    this.bodyEl.querySelector('#exportbtn').onclick = () => app.save.exportFile();
    const fi = this.bodyEl.querySelector('#fileinput');
    this.bodyEl.querySelector('#importbtn').onclick = () => fi.click();
    fi.onchange = () => { if (fi.files[0]) app.save.importFile(fi.files[0]); };
    for (const b of this.bodyEl.querySelectorAll('[data-load]')) b.onclick = () => { app.save.load(b.dataset.load); this.close(); };
    for (const b of this.bodyEl.querySelectorAll('[data-del]')) b.onclick = () => { app.save.remove(b.dataset.del); this.render(); };
    for (const b of this.bodyEl.querySelectorAll('[data-mode]')) b.onclick = () => { this.close(); app.newCity(b.dataset.mode); };
  }
}
