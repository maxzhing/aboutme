// A persistent, inspectable sample of the population. Every named citizen has a
// home, a workplace, an income and a daily schedule; their satisfaction is
// computed from the same fields that drive the aggregate model, so the profile
// you click on genuinely explains what the city-wide numbers are made of.
import { GRID, K, Z, BT } from '../core/defs.js';
import { RNG, clamp } from '../core/rng.js';
import { ZS, ZN } from './traffic.js';

const idx = (x, y) => y * GRID + x;

const FIRST = ['Ada', 'Ivo', 'Mira', 'Tomas', 'Lena', 'Owen', 'Priya', 'Kofi', 'Sasha', 'Nina', 'Diego', 'Yuki', 'Hana', 'Amir', 'Ruth', 'Milo', 'Zara', 'Ines', 'Kai', 'Nadia', 'Bo', 'Ellis', 'Tariq', 'Vera', 'Jonas', 'Leila', 'Otto', 'Suki', 'Rafa', 'Clara', 'Dmitri', 'Anya', 'Felix', 'Noor', 'Theo', 'Imani', 'Luca', 'Sofia', 'Ren', 'Mateo', 'Elif', 'Cyrus', 'Wren', 'Halim', 'Josie', 'Ravi', 'Marta', 'Kenji', 'Ada', 'Bram'];
const LAST = ['Okonkwo', 'Vance', 'Halloran', 'Reyes', 'Nakamura', 'Bergström', 'Dubois', 'Ferreira', 'Kaminski', 'Osei', 'Lindqvist', 'Moreau', 'Petrov', 'Abadi', 'Whitfield', 'Sørensen', 'Marchetti', 'Aliyev', 'Delgado', 'Novak', 'Iqbal', 'Fontaine', 'Andersen', 'Bello', 'Castellanos', 'Toma', 'Rasmussen', 'Ferrer', 'Grimaldi', 'Haddad', 'Voss', 'Larsen', 'Quintero', 'Bhatt', 'Sandoval', 'Weiss', 'Mbeki', 'Kovács', 'Tanaka', 'Ortiz', 'Hensley', 'Zafar', 'Blackwood', 'Cardoso', 'Nyström', 'Adeyemi', 'Rousseau', 'Ivanov', 'Salazar', 'Tremblay'];

const OCC = {
  [Z.OFFICE]: ['Systems Analyst', 'Accountant', 'Architect', 'Consultant', 'Attorney', 'Data Engineer', 'Insurance Broker', 'Project Manager', 'UX Designer', 'Financial Analyst'],
  [Z.COMM]: ['Barista', 'Shop Manager', 'Line Cook', 'Sales Assistant', 'Server', 'Pharmacist', 'Bookseller', 'Stylist', 'Baker', 'Bartender'],
  [Z.IND]: ['Machinist', 'Forklift Operator', 'Welder', 'Logistics Planner', 'Quality Inspector', 'Millwright', 'Warehouse Lead', 'Fabricator'],
  [Z.CIVIC]: ['Teacher', 'Nurse', 'Paramedic', 'Firefighter', 'Police Officer', 'Librarian', 'Lecturer', 'Curator', 'Transit Operator'],
  [Z.MIXED]: ['Graphic Designer', 'Sound Engineer', 'Illustrator', 'Chef', 'Gallery Assistant', 'Copywriter', 'Photographer'],
  [Z.RES_HIGH]: ['Building Manager', 'Caretaker', 'Concierge'],
};
const EDU = ['No qualification', 'High school', 'Vocational', 'Bachelor’s degree', 'Postgraduate'];

export class Citizens {
  constructor(world, seed) {
    this.world = world;
    this.rng = new RNG((seed ^ 0x9e37) >>> 0);
    this.list = [];
    this.nextId = 1;
    this.households = [];
  }

  targetCount(pop) { return clamp(Math.round(pop / 110), 240, 1600); }

  homePool() {
    const pool = [];
    for (const b of this.world.buildings) {
      if (!b || b.demolished || b.abandoned) continue;
      if (b.residents > 0) pool.push(b);
    }
    return pool;
  }
  jobPool() {
    const pool = [];
    for (const b of this.world.buildings) {
      if (!b || b.demolished || b.abandoned) continue;
      if (b.employed > 0) pool.push(b);
    }
    return pool;
  }

  // Keep the sample in step with the aggregate population.
  sync(sim) {
    const target = this.targetCount(sim.stats.population);
    const homes = this.homePool(), jobs = this.jobPool();
    if (!homes.length) return;
    // drop citizens whose home vanished
    this.list = this.list.filter(c => {
      const b = this.world.buildings[c.home];
      return b && !b.demolished && !b.abandoned && b.residents > 0;
    });
    let guard = 0;
    while (this.list.length > target && guard++ < 5000) this.list.splice(this.rng.int(0, this.list.length - 1), 1);
    guard = 0;
    while (this.list.length < target && guard++ < 5000) this.list.push(this.make(sim, homes, jobs));
    // periodically refresh jobs for a slice so the sample tracks the economy
    const slice = Math.min(this.list.length, 60);
    for (let k = 0; k < slice; k++) {
      const c = this.list[(sim.tickCount * 7 + k) % this.list.length];
      const wb = this.world.buildings[c.work];
      if (c.work >= 0 && (!wb || wb.demolished || wb.abandoned || wb.employed <= 0)) this.assignJob(c, sim, jobs);
    }
  }

  weightedPick(pool, key) {
    let total = 0;
    for (const b of pool) total += b[key];
    let r = this.rng.next() * total;
    for (const b of pool) { r -= b[key]; if (r <= 0) return b; }
    return pool[pool.length - 1];
  }

  make(sim, homes, jobs) {
    const rng = this.rng;
    const home = this.weightedPick(homes, 'residents');
    const age = rng.weighted([[rng.int(0, 17), 20], [rng.int(18, 24), 12], [rng.int(25, 39), 26], [rng.int(40, 59), 24], [rng.int(60, 88), 18]]);
    const c = {
      id: this.nextId++,
      name: `${rng.pick(FIRST)} ${rng.pick(LAST)}`,
      age, home: home.id, work: -1, occupation: '—', income: 0,
      edu: EDU[clamp(Math.round(rng.gauss(age > 24 ? 2.4 : 1.2, 1.1)), 0, 4)],
      household: 0, car: false, commuteMin: 0, satisfaction: 0.6,
      wake: 6 + rng.float(-0.8, 1.4), sleep: 22.4 + rng.float(-1.2, 1.6),
      workStart: 8.5 + rng.float(-1.2, 1.2), workEnd: 17 + rng.float(-1.2, 1.8),
      social: rng.float(0, 1), seed: rng.int(0, 1e9),
    };
    if (age < 6) { c.occupation = 'Pre-school'; c.status = 'child'; }
    else if (age < 18) { c.occupation = 'Student'; c.status = 'school'; }
    else if (age >= 67) { c.occupation = 'Retired'; c.status = 'retired'; c.income = Math.round(rng.float(14, 34) * 1000); }
    else { c.status = 'worker'; this.assignJob(c, sim, jobs); }
    c.car = c.status === 'worker' && rng.bool(0.62 - sim.fields.transitAcc[idx(home.x, home.y)] * 0.35);
    return c;
  }

  assignJob(c, sim, jobs) {
    if (!jobs || !jobs.length) { c.work = -1; c.occupation = 'Seeking work'; c.income = 0; return; }
    const rng = this.rng;
    if (rng.next() < sim.stats.unemployment) {
      c.work = -1; c.occupation = 'Seeking work'; c.income = Math.round(rng.float(6, 16) * 1000); c.status = 'unemployed';
      return;
    }
    const b = this.weightedPick(jobs, 'employed');
    c.work = b.id; c.status = 'worker';
    const list = OCC[b.zone] || OCC[Z.OFFICE];
    c.occupation = rng.pick(list);
    const home = this.world.buildings[c.home];
    const lv = home ? this.world.g.land[idx(b.x, b.y)] : 0.5;
    const eduBoost = 1 + EDU.indexOf(c.edu) * 0.19;
    const base = b.zone === Z.OFFICE ? 62 : b.zone === Z.CIVIC ? 48 : b.zone === Z.IND ? 44 : b.zone === Z.COMM ? 33 : 46;
    c.income = Math.round(base * 1000 * eduBoost * (0.55 + lv * 0.9) * rng.float(0.8, 1.25));
  }

  // Where a citizen is, and what they're doing, at the given hour.
  activity(c, hour, weekend) {
    const b = this.world.buildings;
    const home = b[c.home];
    const work = c.work >= 0 ? b[c.work] : null;
    const h = hour;
    if (h < c.wake || h > c.sleep) return { act: 'Asleep at home', where: home, out: false };
    if (weekend) {
      if (h < 10) return { act: 'At home', where: home, out: false };
      if (h < 12.5) return { act: c.social > 0.5 ? 'Out shopping' : 'At home', where: c.social > 0.5 ? this.leisureNear(c) : home, out: c.social > 0.5 };
      if (h < 17) return { act: 'Out in the city', where: this.leisureNear(c), out: true };
      if (h < 21) return { act: c.social > 0.35 ? 'Dinner out' : 'At home', where: c.social > 0.35 ? this.leisureNear(c) : home, out: c.social > 0.35 };
      return { act: 'At home', where: home, out: false };
    }
    if (c.status === 'school') {
      if (h < 7.6) return { act: 'Getting ready', where: home, out: false };
      if (h < 8.2) return { act: 'Travelling to school', where: home, out: true, commuting: true };
      if (h < 15.3) return { act: 'At school', where: this.schoolNear(c), out: false };
      if (h < 16.2) return { act: 'Travelling home', where: home, out: true, commuting: true };
      if (h < 18.5) return { act: 'Out with friends', where: this.leisureNear(c), out: true };
      return { act: 'At home', where: home, out: false };
    }
    if (c.status === 'retired' || c.status === 'unemployed' || !work) {
      if (h < 9) return { act: 'At home', where: home, out: false };
      if (h < 12) return { act: c.status === 'unemployed' ? 'Looking for work' : 'Out in the neighbourhood', where: this.leisureNear(c), out: true };
      if (h < 14) return { act: 'Lunch', where: home, out: false };
      if (h < 18) return { act: 'Out in the neighbourhood', where: this.leisureNear(c), out: true };
      return { act: 'At home', where: home, out: false };
    }
    const dep = c.workStart - Math.max(0.15, c.commuteMin / 60);
    if (h < dep - 0.4) return { act: 'Getting ready at home', where: home, out: false };
    if (h < c.workStart) return { act: 'Commuting to work', where: work, out: true, commuting: true };
    if (h < 12.4) return { act: `At work — ${c.occupation}`, where: work, out: false };
    if (h < 13.3) return { act: 'Lunch break', where: this.leisureNear(c, work), out: true };
    if (h < c.workEnd) return { act: `At work — ${c.occupation}`, where: work, out: false };
    if (h < c.workEnd + Math.max(0.2, c.commuteMin / 60)) return { act: 'Commuting home', where: home, out: true, commuting: true };
    if (h < 20.5 && c.social > 0.55) return { act: 'Out for the evening', where: this.leisureNear(c), out: true };
    if (h < 20) return { act: 'Errands and shopping', where: this.leisureNear(c), out: c.social > 0.25 };
    return { act: 'At home', where: home, out: false };
  }

  leisureNear(c, from) {
    const b = this.world.buildings;
    const anchor = from || b[c.home];
    if (!anchor) return null;
    if (c._leisure !== undefined && b[c._leisure] && !b[c._leisure].demolished) return b[c._leisure];
    let best = null, bestD = 1e9;
    const rng = new RNG(c.seed);
    for (let k = 0; k < 40; k++) {
      const cand = b[Math.floor(rng.next() * b.length)];
      if (!cand || cand.demolished || cand.abandoned) continue;
      if (!(cand.zone === Z.COMM || cand.zone === Z.MIXED || cand.zone === Z.PARK)) continue;
      const d = Math.hypot(cand.x - anchor.x, cand.y - anchor.y);
      if (d < bestD) { bestD = d; best = cand; }
    }
    if (best) c._leisure = best.id;
    return best || anchor;
  }
  schoolNear(c) {
    const b = this.world.buildings;
    if (c._school !== undefined && b[c._school]) return b[c._school];
    const home = b[c.home];
    let best = null, bestD = 1e9;
    for (const cand of b) {
      if (!cand || cand.demolished) continue;
      if (cand.type !== BT.SCHOOL && cand.type !== BT.UNIVERSITY) continue;
      const d = Math.hypot(cand.x - home.x, cand.y - home.y);
      if (d < bestD) { bestD = d; best = cand; }
    }
    if (best) c._school = best.id;
    return best || home;
  }

  // Refresh commute times and satisfaction for a rotating slice each tick.
  refresh(sim, slice = 90) {
    const n = this.list.length;
    if (!n) return;
    const g = this.world.g;
    for (let k = 0; k < Math.min(slice, n); k++) {
      const c = this.list[(sim.tickCount * 13 + k) % n];
      const home = this.world.buildings[c.home];
      if (!home) continue;
      const hz = Math.floor(home.y / ZS) * ZN + Math.floor(home.x / ZS);
      const work = c.work >= 0 ? this.world.buildings[c.work] : null;
      if (work) {
        const wz = Math.floor(work.y / ZS) * ZN + Math.floor(work.x / ZS);
        const zo = sim.traffic.zones[hz];
        const dist = Math.hypot(work.x - home.x, work.y - home.y);
        const base = zo ? zo.commute : sim.traffic.avgCommute;
        c.commuteMin = clamp(base * (0.55 + dist / 46), 3, 95);
      } else c.commuteMin = 0;
      const hi = idx(home.x, home.y);
      const rentBurden = home.rent * 12 / Math.max(12000, c.income || 22000);
      const pol = g.pol[hi] / Math.max(0.001, sim.fields.polMax || 1);
      c.satisfaction = clamp(
        0.62
        - clamp((c.commuteMin - 22) / 60, -0.12, 0.32)
        - clamp((rentBurden - 0.28) * 1.15, -0.10, 0.30)
        - pol * 0.20
        - g.crime[hi] * 0.22
        + sim.fields.svcAll[hi] * 0.20
        + Math.min(0.12, g.green[hi] * 0.25)
        + (c.status === 'unemployed' ? -0.28 : 0.04)
        + (home.powered ? 0.02 : -0.22)
        , 0, 1);
    }
  }

  averageSatisfaction() {
    if (!this.list.length) return 0.6;
    let s = 0; for (const c of this.list) s += c.satisfaction;
    return s / this.list.length;
  }
  averageCommute() {
    let s = 0, n = 0;
    for (const c of this.list) if (c.commuteMin > 0) { s += c.commuteMin; n++; }
    return n ? s / n : 0;
  }
  medianIncome() {
    const inc = this.list.filter(c => c.income > 0).map(c => c.income).sort((a, b) => a - b);
    return inc.length ? inc[Math.floor(inc.length / 2)] : 0;
  }
}
