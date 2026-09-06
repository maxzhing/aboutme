// The simulation clock and orchestrator. Owns time, weather, utilities,
// happiness, history and the tick schedule; every subsystem hangs off here.
// Contains no renderer types so the whole thing can be cloned for what-if runs.
import { GRID, CELL, K, Z, RC, BT, BUILDING_SPEC, ROAD_SPEC, MONTHS, DAYS, MODES } from '../core/defs.js';
import { RNG, clamp, smoothstep } from '../core/rng.js';
import { buildNetwork, updateSignals } from '../world/network.js';
import { Fields } from './fields.js';
import { TrafficModel, ZS, ZN } from './traffic.js';
import { TransitSystem } from './transit.js';
import { Citizens } from './citizens.js';
import { Economy } from './economy.js';
import { EventSystem } from './events.js';

const idx = (x, y) => y * GRID + x;
const START = Date.UTC(2035, 4, 15, 0, 0, 0);   // minutes are counted from midnight on day one

const STREET_NAMES = ['Harbor', 'Alder', 'Beacon', 'Cascade', 'Dunlop', 'Elmwood', 'Foundry', 'Granville', 'Halsted', 'Ivory', 'Jasper', 'Kingsway', 'Lakeshore', 'Merchant', 'Northgate', 'Orchard', 'Pioneer', 'Quarry', 'Redwood', 'Sentinel', 'Tanner', 'Union', 'Vista', 'Waverly', 'Yarrow', 'Zephyr', 'Cedar', 'Bridgeport', 'Copperline', 'Drayton'];

export class CitySim {
  constructor(world, net, opts = {}) {
    this.world = world;
    this.net = net;
    this.seed = opts.seed || 1;
    this.rng = new RNG(this.seed ^ 0x51ed);
    this.mode = MODES[opts.mode || 'mayor'];
    this.modeKey = opts.mode || 'mayor';
    this.headless = !!opts.headless;
    this.assignHours = opts.assignHours || (this.headless ? 24 : 6);

    this.minutes = 8 * 60;
    this.tickCount = 0;
    this.speed = 1;

    this.carOwnership = 0.72;
    this.policies = {
      taxRes: 0.092, taxComm: 0.098, taxInd: 0.086,
      serviceLevel: 0, transitBias: 0, envRegulation: 0.15,
      evAdoption: 0.06, tripRate: 0, retirementDrag: 0,
      congestionCharge: false, densityBonus: false, greenBelt: false,
      signalOptimisation: 0, bikeNetwork: 0,
    };
    this.mods = { economy: 0, migration: 0, resDemand: 0, commDemand: 0, indDemand: 0, powerLoss: 0, happiness: 0 };

    this.stats = {
      population: 0, housingCapacity: 0, vacancy: 0.05, labourForce: 0, employed: 0,
      jobsTotal: 0, jobsVacant: 0, unemployment: 0.05, happiness: 0.72,
      medianIncome: 46000, medianRent: 1200, affordability: 0.6,
      gdp: 0, retailJobs: 0, indJobs: 0, officeJobs: 0, educationLevel: 0.55,
      powerRatio: 0, waterRatio: 0, wasteRatio: 0, powerCapacity: 0, powerDemand: 0,
      waterCapacity: 0, waterDemand: 0, blackoutFrac: 0,
      pollution: 0, green: 0, noise: 0, crime: 0, landValue: 0, parkArea: 0, parkPerCapita: 0,
      utilityIndex: 1, inCommuters: 0, wasteCapacity: 0, wasteDemand: 0, businessHealth: 1,
      commute: 22, congestion: 0, flow: 0.9, transitRidership: 0, transitShare: 0,
      policeCover: 0, fireCover: 0, healthCover: 0, eduCover: 0, netMigration: 0,
    };
    this.budget = { treasury: this.mode.budget || 0, revenue: 0, expense: 0, breakdown: {} };

    this.weather = { type: 'clear', cloud: 0.25, rain: 0, wind: 0.12, temp: 18, target: null, until: 0 };

    this.fields = new Fields(world);
    this.traffic = new TrafficModel(world, net);
    this.transit = new TransitSystem(world, net);
    this.citizens = new Citizens(world, this.seed);
    this.economy = new Economy(world, this.seed);
    this.events = new EventSystem(world, this.seed);

    this.history = { labels: [], series: {} };
    for (const k of ['population', 'gdp', 'revenue', 'expense', 'treasury', 'employment', 'unemployment', 'vacancy', 'rent', 'commute', 'congestion', 'pollution', 'happiness', 'transit', 'jobs', 'landValue'])
      this.history.series[k] = [];

    this.dirtyBuildings = new Set();
    this.dirtySurface = new Set();
    this.roadNames = null;
    this.missions = [];
    this.paused = false;

    if (!opts.skipInit) this.initialise();
  }

  // ---------------------------------------------------------------- init
  initialise() {
    let pop = 0;
    for (const b of this.world.buildings) {
      if (!b || b.demolished) continue;
      b.construction = 1;
      b.litProb = 0.78 + ((b.id * 2654435761) >>> 0) % 100 / 100 * 0.44;   // per-building variation
      pop += Math.round(b.capacity * 0.93);
    }
    this.stats.population = pop;
    this.transit.seedRail(this.world);
    this.buildRoadNames();
    this.fields.updateSources(this);
    this.fields.updateFields(this);
    this.economy.distribute(this);
    this.updateUtilities();
    this.traffic.refreshLandUse(this);
    for (let i = 0; i < 4; i++) { while (!this.traffic.stepAssignment(this, 64)); }
    this.fields.updateSources(this);
    this.fields.updateFields(this);
    this.fields.updateLandValue(this);
    this.economy.distribute(this);
    this.economy.monthly(this);
    this.citizens.sync(this);
    this.citizens.refresh(this, 2000);
    this.stats.medianIncome = this.citizens.medianIncome() || this.stats.medianIncome;
    this.syncTrafficStats();
    this.updateHappiness();
    this.calibrate();
    this.snapshotHistory();
    this.setupMissions();
    this.applyModeSetup();
    this.log('city', `You take office. ${Math.round(this.stats.population).toLocaleString()} residents are counting on you.`, { severity: 'good' });
    this.log('city', `${this.world.districts.length} districts, ${this.world.buildings.filter(b => b && !b.demolished).length.toLocaleString()} buildings, ${Math.round(this.stats.jobsTotal).toLocaleString()} jobs on the books.`, { severity: 'info' });
    const gaps0 = [];
    if (this.stats.policeCover < 0.6) gaps0.push('police');
    if (this.stats.fireCover < 0.6) gaps0.push('fire');
    if (this.stats.healthCover < 0.6) gaps0.push('healthcare');
    if (gaps0.length) this.log('city', `Service review flags gaps in ${gaps0.join(', ')} coverage.`, { severity: 'warn' });
  }

  // The generated city starts near equilibrium: record its ratios as the
  // reference the demand model pulls toward, and scale taxation so the opening
  // budget is roughly balanced whatever size of city was generated.
  calibrate() {
    const s = this.stats;
    this.economy.baseline = {
      retail: s.population > 0 ? s.retailJobs / s.population : 0.08,
      ind: s.population > 0 ? s.indJobs / s.population : 0.06,
      office: s.population > 0 ? s.officeJobs / s.population : 0.11,
      jobsRatio: s.labourForce > 0 ? s.jobsTotal / s.labourForce : 1,
    };
    this.economy.monthly(this);
    const rev = this.budget.revenue, exp = this.budget.expense;
    this.taxCalib = clamp(rev > 0 ? (exp * 1.06) / rev : 1, 0.15, 4);
    this.economy.monthly(this);
    this.budget.treasury = this.mode.unlimited ? this.mode.budget : Math.round(this.budget.revenue * this.mode.reserve);
  }

  applyModeSetup() {
    if (this.modeKey === 'transport') {
      this.policies.tripRate = 0.55;
      this.mods.migration = 0.1;
    } else if (this.modeKey === 'green') {
      this.policies.envRegulation = 0;
      for (const b of this.world.buildings) if (b && b.zone === Z.IND) b.pollution *= 1.9;
    } else if (this.modeKey === 'economic') {
      this.mods.economy = -0.25;
    }
  }

  setupMissions() {
    const s = this.stats;
    const base = [
      { id: 'commute', label: 'Average commute under 20 minutes', test: (sim) => sim.stats.commute <= 20, progress: (sim) => clamp((34 - sim.stats.commute) / 14, 0, 1) },
      { id: 'pop', label: 'Grow the population to 250,000', test: (sim) => sim.stats.population >= 250000, progress: (sim) => clamp(sim.stats.population / 250000, 0, 1) },
      { id: 'happy', label: 'Hold happiness above 85% for a year', test: (sim) => sim.happyStreak >= 365, progress: (sim) => clamp(sim.happyStreak / 365, 0, 1) },
      { id: 'green', label: 'Cut average pollution by 30%', test: (sim) => sim.stats.pollution <= sim.baselinePollution * 0.7, progress: (sim) => clamp((sim.baselinePollution - sim.stats.pollution) / (sim.baselinePollution * 0.3), 0, 1) },
      { id: 'jobs', label: 'Create 100,000 new jobs', test: (sim) => sim.stats.jobsTotal - sim.baselineJobs >= 100000, progress: (sim) => clamp((sim.stats.jobsTotal - sim.baselineJobs) / 100000, 0, 1) },
      { id: 'transit', label: 'Carry 20% of trips on public transport', test: (sim) => sim.stats.transitShare >= 0.20, progress: (sim) => clamp(sim.stats.transitShare / 0.20, 0, 1) },
      { id: 'solvent', label: 'Finish 5 years in the black', test: (sim) => sim.solventYears >= 5, progress: (sim) => clamp(sim.solventYears / 5, 0, 1) },
    ];
    this.baselinePollution = this.stats.pollution || 0.05;
    this.stats.pollutionIndex = 0.5;
    this.baselineJobs = this.stats.jobsTotal;
    this.happyStreak = 0;
    this.solventYears = 0;
    const order = { mayor: ['commute', 'happy', 'pop', 'solvent'], transport: ['commute', 'transit', 'happy'], green: ['green', 'transit', 'happy'], economic: ['jobs', 'solvent', 'pop'], creative: ['pop', 'happy'], sandbox: ['pop', 'happy'] };
    const keys = order[this.modeKey] || order.mayor;
    this.missions = base.filter(m => keys.includes(m.id)).map(m => ({ ...m, done: false }));
  }

  buildRoadNames() {
    const g = this.world.g;
    this.roadNames = { vertical: new Map(), horizontal: new Map() };
    const rng = new RNG(this.seed ^ 0x2b);
    const used = new Set();
    const pickName = () => {
      for (let k = 0; k < 40; k++) { const n = rng.pick(STREET_NAMES); if (!used.has(n)) { used.add(n); return n; } }
      return rng.pick(STREET_NAMES);
    };
    for (let x = 0; x < GRID; x++) {
      let run = 0;
      for (let y = 0; y < GRID; y++) if (g.kind[idx(x, y)] === K.ROAD) run++;
      if (run > 22) this.roadNames.vertical.set(x, `${pickName()} ${run > 70 ? 'Avenue' : 'Street'}`);
    }
    for (let y = 0; y < GRID; y++) {
      let run = 0;
      for (let x = 0; x < GRID; x++) if (g.kind[idx(x, y)] === K.ROAD) run++;
      if (run > 22) this.roadNames.horizontal.set(y, `${Math.abs(y - 64) + 1}${ordinal(Math.abs(y - 64) + 1)} ${y < 64 ? 'Street N' : 'Street S'}`);
    }
  }

  roadName(cell) {
    const g = this.world.g;
    if (g.kind[cell] !== K.ROAD) return 'this location';
    const x = cell % GRID, y = (cell / GRID) | 0;
    if (g.road[cell] === RC.HIGHWAY) return 'the ring expressway';
    const v = this.roadNames?.vertical.get(x), h = this.roadNames?.horizontal.get(y);
    if (v && h) return `${v} at ${h}`;
    return v || h || `${this.districtName(g.dist[cell])} local street`;
  }
  districtName(id) { return this.world.districts[id]?.name || 'the city'; }
  log(kind, title, opts) { return this.events.log(this, kind, title, opts); }

  // ---------------------------------------------------------------- time
  get date() { return new Date(START + this.minutes * 60000); }
  get hourOfDay() { return (this.minutes / 60) % 24; }
  get minuteOfDay() { return this.minutes % 1440; }
  get day() { return Math.floor(this.minutes / 1440); }
  get dayOfWeek() { return this.date.getUTCDay(); }
  get year() { return this.date.getUTCFullYear(); }
  timeLabel() {
    const d = this.date;
    const h = d.getUTCHours(), m = d.getUTCMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return { date: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`, time: `${DAYS[d.getUTCDay()]} ${hh}:${String(m).padStart(2, '0')} ${ap}` };
  }
  timeLabelShort() {
    const d = this.date;
    const h = d.getUTCHours(), m = d.getUTCMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${ap}`;
  }

  // ---------------------------------------------------------------- tick
  step(simMinutes) {
    if (simMinutes <= 0) return;
    let remaining = simMinutes;
    let guard = 0;
    while (remaining > 0 && guard++ < 200) {
      const toHour = 60 - (this.minutes % 60);
      const chunk = Math.min(remaining, toHour);
      const prevDay = this.day;
      const prevMonth = this.date.getUTCMonth();
      const prevYear = this.date.getUTCFullYear();
      this.minutes += chunk;
      remaining -= chunk;
      this.transit.step(chunk);
      this.tickCount++;
      // traffic assignment advances continuously, a few origin zones at a time
      this.traffic.advance(this, chunk, this.headless ? 64 : 40, this.assignHours);
      if (this.minutes % 60 === 0) this.hourly();
      if (this.day !== prevDay) this.daily();
      const d = this.date;
      if (d.getUTCMonth() !== prevMonth || d.getUTCFullYear() !== prevYear) this.monthly();
      if (d.getUTCFullYear() !== prevYear) this.yearly();
    }
  }

  syncTrafficStats() {
    const t = this.traffic;
    this.stats.commute = t.avgCommute;
    this.stats.congestion = t.congestion;
    this.stats.flow = t.flowIndex;
    this.stats.transitRidership = Math.round(t.transitTrips || 0);
    this.stats.transitShare = clamp((t.transitTrips || 0) / Math.max(1, t.totalTrips || 1), 0, 1);
  }

  hourly() {
    this.updateWeather();
    this.updateUtilities();
    this.events.hourly(this);
    this.traffic.refreshLandUse(this);
    this.citizens.refresh(this, this.headless ? 0 : 70);
    // transit ridership accumulates from the mode split
    let ride = 0;
    for (const z of this.traffic.zones) ride += z.transitTrips || 0;
    this.stats.transitRidership = Math.round(ride);
    const tot = (this.traffic.totalTrips || 1);
    this.stats.transitShare = clamp((this.traffic.transitTrips || 0) / tot, 0, 1);
    for (const l of this.transit.lines) {
      const share = this.transit.lines.length ? 1 / this.transit.lines.length : 0;
      l.ridership = Math.round(ride * share * (l.active ? 1 : 0));
    }
    this.syncTrafficStats();
    this.updateHappiness();
  }

  daily() {
    // transient mood effects fade instead of accumulating forever
    this.mods.happiness = clamp(this.mods.happiness * 0.94, -0.18, 0.18);
    this.fields.updateSources(this);
    this.fields.updateFields(this);
    this.fields.updateLandValue(this);
    const fs = this.fields.summary(this);
    let parkArea = 0;
    for (const b of this.world.buildings) if (b && !b.demolished && b.zone === Z.PARK) parkArea += b.w * b.h * CELL * CELL;
    this.stats.parkArea = parkArea;
    this.stats.parkPerCapita = this.stats.population > 0 ? parkArea / this.stats.population : 0;
    this.stats.pollution = fs.pollution; this.stats.green = fs.green;
    this.stats.pollutionIndex = clamp(fs.pollution / Math.max(1e-6, (this.baselinePollution || fs.pollution || 1e-6) * 2), 0, 1);
    this.stats.noise = fs.noise; this.stats.crime = fs.crime; this.stats.landValue = fs.landValue;
    this.economy.updateDemand(this);
    this.economy.dailyDevelopment(this);
    this.economy.dailyRedevelopment(this);
    this.economy.dailyDecay(this);
    this.economy.updateHousing(this);
    this.economy.distribute(this);
    this.events.dailyRoll(this);
    this.citizens.sync(this);
    const mi = this.citizens.medianIncome();
    if (mi) this.stats.medianIncome += (mi * (0.85 + this.economy.businessHealth * 0.15) - this.stats.medianIncome) * 0.05;
    this.stats.policeCover = this.popWeighted(this.fields.svcPolice);
    this.stats.fireCover = this.popWeighted(this.fields.svcFire);
    this.stats.healthCover = this.popWeighted(this.fields.svcHealth);
    this.stats.eduCover = this.popWeighted(this.fields.svcEdu);
    this.stats.educationLevel = clamp(0.3 + this.stats.eduCover * 0.55, 0, 1);
    this.updateHappiness();
    if (this.stats.happiness > 0.85) this.happyStreak++; else this.happyStreak = 0;
    this.checkMissions();
    if (this.day % 5 === 0) this.snapshotHistory();
  }

  monthly() {
    this.economy.monthly(this);
    this.economy.migrate(this);
    this.economy.distribute(this);
    this.snapshotHistory();
    if (this.budget.treasury < 0 && !this.mode.unlimited) {
      this.log('finance', `Treasury is in deficit — $${Math.abs(Math.round(this.budget.treasury)).toLocaleString()} overdrawn`, { severity: 'bad' });
    }
  }

  yearly() {
    if (this.budget.revenue >= this.budget.expense) this.solventYears++; else this.solventYears = 0;
    this.log('city', `${this.year} begins — population ${Math.round(this.stats.population).toLocaleString()}`, { severity: 'info' });
  }

  popWeighted(field) {
    let s = 0, w = 0;
    for (const b of this.world.buildings) {
      if (!b || b.demolished || b.residents <= 0) continue;
      s += field[idx(b.x, b.y)] * b.residents; w += b.residents;
    }
    return w > 0 ? s / w : 0;
  }

  // ---------------------------------------------------------------- weather
  updateWeather() {
    const w = this.weather;
    if (this.minutes >= w.until) {
      const r = this.rng.next();
      const seasonal = Math.sin((this.date.getUTCMonth() / 12) * Math.PI * 2 - 1.2);
      const wetBias = 0.34 - seasonal * 0.18;
      w.type = r < 0.42 ? 'clear' : r < 0.42 + wetBias ? 'cloudy' : r < 0.86 ? 'rain' : 'storm';
      w.until = this.minutes + this.rng.int(180, 900);
      w.temp = Math.round(13 + seasonal * 11 + this.rng.float(-4, 4));
    }
    const targets = {
      clear: { cloud: 0.14, rain: 0, wind: 0.10 },
      cloudy: { cloud: 0.62, rain: 0, wind: 0.20 },
      rain: { cloud: 0.86, rain: 0.55, wind: 0.30 },
      storm: { cloud: 0.97, rain: 0.95, wind: 0.72 },
    }[w.type];
    const k = 0.05;
    w.cloud += (targets.cloud - w.cloud) * k;
    w.rain += (targets.rain - w.rain) * k;
    w.wind += (targets.wind - w.wind) * k;
  }

  // ---------------------------------------------------------------- utilities
  updateUtilities() {
    const w = this.world;
    let pCap = 0, wCap = 0, sCap = 0;
    let pDem = 0, wDem = 0, sDem = 0;
    const hour = this.hourOfDay;
    // demand profile: evening peak for homes, daytime peak for offices
    const evening = 0.72 + 0.55 * Math.exp(-Math.pow((hour - 19.5) / 3.4, 2));
    const daytime = 0.55 + 0.75 * Math.exp(-Math.pow((hour - 13) / 4.6, 2));
    const heat = 1 + Math.max(0, (this.weather.temp - 24) / 14) * 0.35 + Math.max(0, (6 - this.weather.temp) / 16) * 0.3;
    for (const b of w.buildings) {
      if (!b || b.demolished || b.construction < 1) continue;
      if (b.type === BT.POWER) { if (!b.offline) pCap += 520 * b.w * b.h; continue; }
      if (b.type === BT.WATER_PLANT) { if (!b.offline) wCap += 1150 * b.w * b.h; continue; }
      if (b.type === BT.WASTE) { if (!b.offline) sCap += 900 * b.w * b.h; continue; }
      if (b.abandoned) continue;
      const occ = b.capacity > 0 ? (b.residents / Math.max(1, b.capacity)) : (b.employed / Math.max(1, b.jobs));
      const prof = b.capacity > 0 ? evening : daytime;
      pDem += b.powerDemand * occ * prof * heat;
      wDem += b.waterDemand * occ * prof;
      sDem += b.wasteOut * occ;
    }
    pCap *= (1 - clamp(this.mods.powerLoss, 0, 0.9));
    this.stats.powerCapacity = pCap; this.stats.powerDemand = pDem;
    this.stats.waterCapacity = wCap; this.stats.waterDemand = wDem;
    this.stats.wasteCapacity = sCap; this.stats.wasteDemand = sDem;
    this.stats.powerRatio = pCap > 0 ? pDem / pCap : (pDem > 0 ? 2 : 0);
    this.stats.waterRatio = wCap > 0 ? wDem / wCap : (wDem > 0 ? 2 : 0);
    this.stats.wasteRatio = sCap > 0 ? sDem / sCap : (sDem > 0 ? 2 : 0);
    const bf = clamp(1 - 1 / Math.max(0.0001, this.stats.powerRatio), 0, 0.9);
    const wf = clamp(1 - 1 / Math.max(0.0001, this.stats.waterRatio), 0, 0.9);
    this.stats.blackoutFrac = bf;
    for (const b of w.buildings) {
      if (!b || b.demolished) continue;
      const critical = b.type === BT.HOSPITAL || b.type === BT.FIRE || b.type === BT.POLICE || b.type === BT.POWER;
      const h = ((b.id * 2654435761) >>> 0) % 1000 / 1000;
      b.powered = critical || h >= bf;
      b.watered = critical || h >= wf;
    }
    this.stats.utilityIndex = clamp(1 - (bf * 0.6 + wf * 0.3 + Math.max(0, this.stats.wasteRatio - 1) * 0.25), 0, 1);
  }

  // ---------------------------------------------------------------- happiness
  updateHappiness() {
    const s = this.stats, p = this.policies;
    const commuteScore = clamp(1 - (s.commute - 14) / 40, 0, 1);
    const polScore = clamp(1 - s.pollution / Math.max(0.02, (this.fields.polMax || 0.2) * 0.55), 0, 1);
    const jobScore = clamp(1 - s.unemployment / 0.14, 0, 1);
    const rentScore = clamp(s.affordability, 0, 1);
    const svcScore = clamp((s.policeCover * 0.9 + s.fireCover * 0.8 + s.healthCover + s.eduCover) / 3.7, 0, 1);
    const utilScore = clamp(s.utilityIndex, 0, 1);
    const greenScore = clamp(s.parkPerCapita / 9, 0, 1);   // 9 m2 of park per resident is the target
    const crimeScore = clamp(1 - s.crime * 2.4, 0, 1);
    const taxScore = clamp(1 - (p.taxRes - 0.06) / 0.14, 0, 1);
    const target = clamp(
      commuteScore * 0.15 + polScore * 0.11 + jobScore * 0.16 + rentScore * 0.14 +
      svcScore * 0.15 + utilScore * 0.12 + greenScore * 0.06 + crimeScore * 0.07 + taxScore * 0.04
      + this.mods.happiness, 0, 1);
    if (target === target) s.happiness += (target - s.happiness) * 0.12;
    if (s.happiness !== s.happiness) s.happiness = 0.6;
    s.happinessParts = { commute: commuteScore, pollution: polScore, jobs: jobScore, housing: rentScore, services: svcScore, utilities: utilScore, parks: greenScore, safety: crimeScore, taxes: taxScore };
  }

  checkMissions() {
    for (const m of this.missions) {
      if (m.done) continue;
      if (m.test(this)) {
        m.done = true;
        this.log('mission', `Objective complete — ${m.label}`, { severity: 'good' });
      }
    }
  }

  snapshotHistory() {
    const h = this.history, s = this.stats;
    h.labels.push(this.minutes);
    const push = (k, v) => { const a = h.series[k]; a.push(v); if (a.length > 4000) a.shift(); };
    push('population', Math.round(s.population));
    push('gdp', Math.round(s.gdp));
    push('revenue', this.budget.revenue);
    push('expense', this.budget.expense);
    push('treasury', Math.round(this.budget.treasury));
    push('employment', Math.round(s.employed));
    push('unemployment', +(s.unemployment * 100).toFixed(2));
    push('vacancy', +(s.vacancy * 100).toFixed(2));
    push('rent', s.medianRent);
    push('commute', +s.commute.toFixed(2));
    push('congestion', +(s.congestion * 100).toFixed(1));
    push('pollution', +(s.pollution * 100).toFixed(3));
    push('happiness', +(s.happiness * 100).toFixed(1));
    push('transit', Math.round(s.transitRidership));
    push('jobs', Math.round(s.jobsTotal));
    push('landValue', +(s.landValue * 100).toFixed(1));
    if (h.labels.length > 4000) h.labels.shift();
  }

  // ---------------------------------------------------------------- persistence
  serialize() {
    const g = this.world.g;
    const arr = (a) => Array.from(a);
    return {
      v: 1, seed: this.seed, mode: this.modeKey, minutes: this.minutes,
      grids: {
        kind: arr(g.kind), road: arr(g.road), zone: arr(g.zone), dist: arr(g.dist),
        bridge: arr(g.bridge), tunnel: arr(g.tunnel), bld: arr(g.bld),
        land: arr(g.land), pol: arr(g.pol), green: arr(g.green),
      },
      buildings: this.world.buildings.map(b => b && ({ ...b, _des: undefined, _acc: undefined, _leisure: undefined, _school: undefined })),
      districts: this.world.districts.map(d => ({ ...d })),
      stats: { ...this.stats }, budget: { ...this.budget }, policies: { ...this.policies },
      mods: { ...this.mods }, weather: { ...this.weather },
      economy: { demand: this.economy.demand, rentIndex: this.economy.rentIndex, priceIndex: this.economy.priceIndex, businessHealth: this.economy.businessHealth, buildQueue: this.economy.buildQueue },
      transit: this.transit.lines.map(l => ({ ...l, vehicles: l.vehicles.map(v => ({ ...v })), zones: undefined })),
      history: this.history,
      feed: this.events.feed.slice(0, 60),
      missions: this.missions.map(m => ({ id: m.id, done: m.done })),
      happyStreak: this.happyStreak, solventYears: this.solventYears,
      baselinePollution: this.baselinePollution, baselineJobs: this.baselineJobs,
    };
  }

  static restore(data, worldFactory) {
    const world = worldFactory(data.seed);
    const g = world.g;
    const set = (name, Type) => { if (data.grids[name]) g[name].set(data.grids[name]); };
    for (const k of ['kind', 'road', 'zone', 'dist', 'bridge', 'tunnel', 'bld', 'land', 'pol', 'green']) set(k);
    world.buildings = data.buildings.filter(Boolean);
    const net = buildNetwork(g);
    const sim = new CitySim(world, net, { seed: data.seed, mode: data.mode, skipInit: true });
    sim.minutes = data.minutes;
    Object.assign(sim.stats, data.stats);
    Object.assign(sim.budget, data.budget);
    Object.assign(sim.policies, data.policies);
    Object.assign(sim.mods, data.mods);
    Object.assign(sim.weather, data.weather);
    Object.assign(sim.economy, data.economy);
    sim.history = data.history;
    sim.events.feed = data.feed || [];
    sim.happyStreak = data.happyStreak || 0; sim.solventYears = data.solventYears || 0;
    sim.buildRoadNames();
    sim.setupMissions();
    sim.baselinePollution = data.baselinePollution; sim.baselineJobs = data.baselineJobs;
    for (const m of sim.missions) { const d = (data.missions || []).find(x => x.id === m.id); if (d) m.done = d.done; }
    for (const l of data.transit || []) { l.zones = undefined; sim.transit.lines.push(l); }
    sim.transit.reindex();
    sim.fields.updateSources(sim);
    sim.fields.updateFields(sim);
    sim.traffic.refreshLandUse(sim);
    while (!sim.traffic.stepAssignment(sim, 64));
    sim.updateUtilities();
    sim.citizens.sync(sim);
    sim.citizens.refresh(sim, 2000);
    return { sim, world, net };
  }

  // Deep, renderer-free copy used by the what-if simulator.
  fork() {
    const g = this.world.g;
    const gg = {};
    for (const k of Object.keys(g)) gg[k] = g[k].slice ? g[k].slice() : g[k];
    const world = {
      g: gg,
      districts: this.world.districts.map(d => ({ ...d })),
      buildings: this.world.buildings.map(b => b && { ...b }),
      blocks: this.world.blocks, rail: this.world.rail, railStops: this.world.railStops,
    };
    const net = buildNetwork(gg);
    const sim = new CitySim(world, net, { seed: this.seed, mode: this.modeKey, skipInit: true, headless: true });
    sim.minutes = this.minutes;
    Object.assign(sim.stats, this.stats);
    Object.assign(sim.budget, this.budget); sim.budget.breakdown = { ...this.budget.breakdown };
    Object.assign(sim.policies, this.policies);
    Object.assign(sim.mods, this.mods);
    Object.assign(sim.weather, this.weather);
    sim.economy.demand = { ...this.economy.demand };
    sim.economy.rentIndex = this.economy.rentIndex;
    sim.economy.priceIndex = this.economy.priceIndex;
    sim.economy.businessHealth = this.economy.businessHealth;
    sim.economy.buildQueue = this.economy.buildQueue.map(q => ({ ...q }));
    sim.roadNames = this.roadNames;
    sim.baselinePollution = this.baselinePollution; sim.baselineJobs = this.baselineJobs;
    sim.missions = [];
    for (const l of this.transit.lines) sim.transit.lines.push({ ...l, zones: undefined, vehicles: l.vehicles.map(v => ({ ...v })) });
    sim.transit.reindex();
    sim.traffic.vol.set(this.traffic.vol);
    sim.traffic.closed.set(this.traffic.closed);
    sim.traffic.updateCosts();
    sim.fields.updateSources(sim);
    sim.fields.updateFields(sim);
    sim.traffic.refreshLandUse(sim);
    sim.citizens.list = [];
    return { sim, world, net };
  }
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
