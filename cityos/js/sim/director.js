// The Director turns the simulation into a game.
//
// It watches the city, notices what is actually wrong with it, and hands the
// player one problem at a time: what is happening, why it is happening, who it
// hurts, and what can be done about it. When the player fixes it, the Director
// says what changed — including what it changed for one named resident — and
// then finds the next problem.
//
// Every objective is measured against live simulation state. Nothing here is
// scripted or faked.
import { GRID, CELL, K, Z, BT, RC } from '../core/defs.js';
import { clamp } from '../core/rng.js';
import { fmtNum, fmtMoney, fmtPct } from '../ui/format.js';

const idx = (x, y) => y * GRID + x;

export const STAGES = [
  { id: 'town',       name: 'Town',          pop: 0,       blurb: 'A place people live. Keep the lights on and the streets moving.' },
  { id: 'growing',    name: 'Growing City',  pop: 140000,  blurb: 'Big enough to need a plan. Subways and universities are now worth building.' },
  { id: 'metropolis', name: 'Metropolis',    pop: 240000,  blurb: 'A regional centre. People commute in from outside every morning.' },
  { id: 'global',     name: 'Global City',   pop: 400000,  blurb: 'Density, transit and land value now reinforce each other.' },
  { id: 'megacity',   name: 'Megacity',      pop: 650000,  blurb: 'The last rung. Everything you do now is at the scale of millions of daily trips, and there is nothing left to unlock — only the city to run.' },
];

// What each stage makes available. Gated things stay visible but locked, so the
// player can see what they are working toward.
export const UNLOCKS = {
  town:       ['roads', 'zone', 'buildings', 'parks', 'services', 'utilities', 'bus'],
  growing:    ['metro', 'university'],
  metropolis: ['rail', 'stadium'],
  global:     ['museum', 'theatre', 'marina'],
  megacity:   [],
};

export function stageFor(pop) {
  let s = STAGES[0];
  for (const st of STAGES) if (pop >= st.pop) s = st;
  return s;
}
export function unlockedAt(stageId) {
  const out = new Set();
  for (const s of STAGES) {
    for (const u of UNLOCKS[s.id] || []) out.add(u);
    if (s.id === stageId) break;
  }
  return out;
}

// ---------------------------------------------------------------- problems
// Each returns null when the city does not have that problem. `severity` ranks
// them; the worst one becomes the current objective.
const PROBLEMS = [
  // ---- utilities first: a blackout undoes everything else
  (sim) => {
    const s = sim.stats;
    if (s.powerRatio < 0.92) return null;
    const short = Math.max(0, s.powerDemand - s.powerCapacity);
    return {
      id: 'power',
      title: 'The grid is running out of headroom',
      metric: () => sim.stats.powerRatio,
      format: (v) => fmtPct(v, 0) + ' of capacity',
      target: 0.85, lowerIsBetter: true,
      severity: s.powerRatio > 1 ? 100 : 70,
      why: `Electricity demand is ${Math.round(s.powerDemand)} MW against ${Math.round(s.powerCapacity)} MW of generation` +
        (short > 0 ? `, a shortfall of ${Math.round(short)} MW` : ', with almost nothing spare') +
        `. Demand peaks in the evening as people get home, and rises further in hot and cold weather.`,
      who: s.blackoutFrac > 0.001
        ? `${fmtPct(s.blackoutFrac, 0)} of buildings are already being shed. They lose output, their residents lose approval, and they go dark at night.`
        : 'Nobody yet — but the next heatwave or new district will tip it over.',
      options: [
        { label: 'Build a power plant', hint: 'Adds ~3,120 MW. Costs $62M and $780k a month.', act: { tool: 'utilities', sub: BT.POWER } },
        { label: 'See what it would do', hint: 'Run it against a copy of the city first.', act: { whatif: 'powerPlant' } },
      ],
      focus: () => findBuilding(sim, b => b.type === BT.POWER),
      reward: 0.01,
    };
  },

  // ---- water
  (sim) => {
    const s = sim.stats;
    if (s.waterRatio < 0.92) return null;
    return {
      id: 'water',
      title: 'Water supply is at its limit',
      metric: () => sim.stats.waterRatio,
      format: (v) => fmtPct(v, 0) + ' of capacity',
      target: 0.85, lowerIsBetter: true,
      severity: s.waterRatio > 1 ? 95 : 60,
      why: `Demand is ${Math.round(s.waterDemand)} against ${Math.round(s.waterCapacity)} of treatment capacity. Buildings without water lose occupants.`,
      who: 'Every household and business downstream of the shortfall.',
      options: [{ label: 'Build water works', hint: '$28M to build, $340k a month to run.', act: { tool: 'utilities', sub: BT.WATER_PLANT } }],
      focus: () => findBuilding(sim, b => b.type === BT.WATER_PLANT),
      reward: 0.01,
    };
  },

  // ---- the commute: the classic city-builder problem
  (sim) => {
    const s = sim.stats;
    if (s.commute < 21) return null;
    const worst = worstCorridor(sim);
    const zone = worstCommuteZone(sim);
    return {
      id: 'commute',
      title: `The average commute is ${s.commute.toFixed(0)} minutes`,
      metric: () => sim.stats.commute,
      format: (v) => v.toFixed(1) + ' min',
      target: 20, lowerIsBetter: true,
      severity: 50 + (s.commute - 20) * 2,
      why: `The network is running at ${fmtPct(s.flow)} of free-flow speed` +
        (worst ? ` and ${worst.name} is carrying ${fmtNum(worst.vol)} vehicles an hour against a capacity of ${fmtNum(worst.cap)}` : '') +
        `. Only ${fmtPct(s.transitShare, 1)} of trips are on public transport, so growth lands on the roads.`,
      who: zone ? `Worst in ${zone.district}, where ${fmtNum(zone.pop)} residents average ${zone.commute.toFixed(0)} minutes each way.` :
        `${fmtNum(sim.stats.labourForce)} commuters, twice a day.`,
      options: [
        { label: 'Build a subway line', hint: 'Takes trips off the road entirely. ~$42M per km.', act: { tool: 'transit', sub: 'metro' }, needs: 'metro' },
        { label: 'Add a bus route', hint: 'Cheap, but shares the congestion it relieves.', act: { tool: 'transit', sub: 'bus' } },
        { label: 'Upgrade the worst corridor', hint: worst ? `Raise ${worst.name} a road class.` : 'Widen a saturated road.', act: { tool: 'roads', sub: 'upgrade' } },
        { label: 'Retime the signals', hint: 'The cheapest capacity there is.', act: { panel: 'manage', tab: 'transport' } },
        { label: 'Test a subway first', hint: 'Fork the city and see.', act: { whatif: 'subway' } },
      ],
      focus: () => worst ? worst.cell : (zone ? zone.cell : null),
      reward: 0.02,
    };
  },

  // ---- housing
  (sim) => {
    const s = sim.stats;
    if (s.vacancy > 0.025) return null;
    const upzonable = countUpzonable(sim);
    return {
      id: 'housing',
      title: 'There is nowhere left to live',
      metric: () => sim.stats.vacancy,
      format: (v) => fmtPct(v, 1) + ' vacant',
      target: 0.04, lowerIsBetter: false,
      severity: 55 + (0.025 - s.vacancy) * 400,
      why: `Housing is ${fmtPct(1 - s.vacancy)} occupied — only ${fmtNum(Math.max(0, s.housingCapacity - s.population))} units spare out of ${fmtNum(s.housingCapacity)}. ` +
        `Below about 4% vacancy a market has no slack, and rents climb until people are priced out. Median rent is already ${fmtMoney(s.medianRent, false)}.`,
      who: `Every renter in the city, and anyone who wanted to move here. Rent is ${fmtPct(s.medianRent * 12 / Math.max(1, s.medianIncome), 0)} of a median income.`,
      options: [
        { label: 'Upzone to Residential High', hint: `${upzonable} low-density parcels sit on land worth building up.`, act: { tool: 'zone', sub: 'res_high' } },
        { label: 'Zone new residential land', hint: 'Paint housing on vacant parcels.', act: { tool: 'zone', sub: 'res_high' } },
        { label: 'Test upzoning first', hint: 'See what it does to rents over a year.', act: { whatif: 'upzone' } },
      ],
      focus: () => densestResidentialCell(sim),
      reward: 0.02,
    };
  },

  // ---- service coverage
  (sim) => {
    const s = sim.stats;
    const gaps = [
      { k: 'policeCover', v: s.policeCover, what: 'police coverage', build: BT.POLICE, tool: 'services', label: 'Build a police station' },
      { k: 'fireCover', v: s.fireCover, what: 'fire coverage', build: BT.FIRE, tool: 'services', label: 'Build a fire station' },
      { k: 'healthCover', v: s.healthCover, what: 'healthcare access', build: BT.HOSPITAL, tool: 'services', label: 'Build a hospital' },
      { k: 'eduCover', v: s.eduCover, what: 'school places', build: BT.SCHOOL, tool: 'services', label: 'Build a school' },
    ].sort((a, b) => a.v - b.v);
    const g = gaps[0];
    if (!g || g.v > 0.55) return null;
    return {
      id: 'service-' + g.k,
      title: `Only ${fmtPct(g.v)} of residents have ${g.what}`,
      metric: () => sim.stats[g.k],
      format: (v) => fmtPct(v) + ' covered',
      target: 0.6, lowerIsBetter: false,
      severity: 45 + (0.55 - g.v) * 60,
      why: `Coverage is measured from where people actually live, not from the map. Services reach a fixed radius, so a district with none is simply uncovered — and public services are ${fmtPct(0.15, 0)} of the approval score, the single largest civic term.`,
      who: `Roughly ${fmtNum(Math.round(sim.stats.population * (1 - g.v)))} residents outside the catchment.`,
      options: [
        { label: g.label, hint: 'Place it where the gap is, not where it is convenient.', act: { tool: g.tool, sub: g.build } },
        { label: 'Show the coverage map', hint: 'See exactly where the hole is.', act: { layer: 'services' } },
      ],
      focus: () => worstServedCell(sim, g.k),
      reward: 0.015,
    };
  },

  // ---- budget
  (sim) => {
    const b = sim.budget;
    if (b.revenue >= b.expense) return null;
    const months = b.treasury > 0 ? Math.floor(b.treasury / (b.expense - b.revenue)) : 0;
    return {
      id: 'budget',
      title: 'The city is spending more than it earns',
      metric: () => sim.budget.revenue - sim.budget.expense,
      format: (v) => (v >= 0 ? '+' : '') + fmtMoney(v) + '/mo',
      target: 0, lowerIsBetter: false,
      severity: b.treasury < b.expense * 2 ? 90 : 48,
      why: `Revenue is ${fmtMoney(b.revenue)} against ${fmtMoney(b.expense)} of spending — a deficit of ${fmtMoney(b.expense - b.revenue)} a month. ` +
        `Reserves stand at ${fmtMoney(b.treasury)}` + (months > 0 ? `, about ${months} months at this rate.` : '.'),
      who: 'Everything you have built. Services are the first thing a deficit eats.',
      options: [
        { label: 'Adjust tax rates', hint: 'More revenue now, weaker demand later.', act: { panel: 'manage', tab: 'policies' } },
        { label: 'Test a tax rise', hint: 'See the second-order effects before committing.', act: { whatif: 'taxUp' } },
        { label: 'Review spending', hint: 'Services and administration are the big lines.', act: { panel: 'manage', tab: 'economy' } },
      ],
      focus: () => null,
      reward: 0.02,
    };
  },

  // ---- unemployment
  (sim) => {
    const s = sim.stats;
    if (s.unemployment < 0.075) return null;
    return {
      id: 'jobs',
      title: `Unemployment has reached ${fmtPct(s.unemployment, 1)}`,
      metric: () => sim.stats.unemployment,
      format: (v) => fmtPct(v, 1),
      target: 0.06, lowerIsBetter: true,
      severity: 46 + (s.unemployment - 0.075) * 200,
      why: `There are ${fmtNum(s.jobsTotal)} jobs for a labour force of ${fmtNum(s.labourForce)}. ` +
        `Developer incentive is ${sim.economy.profit.comm.toFixed(2)} for commercial and ${sim.economy.profit.ind.toFixed(2)} for industrial — a negative figure means nothing new will be built no matter how much land you zone.`,
      who: `${fmtNum(Math.round(s.labourForce * s.unemployment))} people out of work. Unemployment also drives the crime field.`,
      options: [
        { label: 'Zone commercial land', hint: 'Retail jobs appear fastest.', act: { tool: 'zone', sub: 'comm' } },
        { label: 'Zone industrial land', hint: 'More jobs per parcel, but pollution follows.', act: { tool: 'zone', sub: 'ind' } },
        { label: 'Cut business tax', hint: 'Raises the incentive to open.', act: { whatif: 'bizTaxDown' } },
      ],
      focus: () => null,
      reward: 0.02,
    };
  },

  // ---- pollution
  (sim) => {
    const s = sim.stats;
    if ((s.pollutionIndex || 0) < 0.62) return null;
    return {
      id: 'pollution',
      title: 'Air quality is deteriorating',
      metric: () => sim.stats.pollutionIndex || 0,
      format: (v) => Math.round(v * 100) + ' index',
      target: 0.5, lowerIsBetter: true,
      severity: 42 + (s.pollutionIndex - 0.62) * 60,
      why: `The pollution index is ${Math.round((s.pollutionIndex || 0) * 100)}, up from a baseline of 50. Industry emits at source and traffic adds along every arterial; both diffuse into the surrounding land and pull down land value and approval.`,
      who: `Anyone living downwind of industry, and everyone on a busy road.`,
      options: [
        { label: 'Tighten environmental rules', hint: 'Cuts emissions, costs industrial demand.', act: { panel: 'manage', tab: 'environment' } },
        { label: 'Plant parks', hint: 'Green cover absorbs and raises land value.', act: { tool: 'parks', sub: BT.PARK_S } },
        { label: 'Show the pollution map', hint: 'Find the source before treating it.', act: { layer: 'pollution' } },
      ],
      focus: () => worstPollutionCell(sim),
      reward: 0.02,
    };
  },

  // ---- parks
  (sim) => {
    const s = sim.stats;
    if ((s.parkPerCapita || 0) > 4) return null;
    return {
      id: 'parks',
      title: 'The city has almost no green space',
      metric: () => sim.stats.parkPerCapita || 0,
      format: (v) => v.toFixed(1) + ' m²/resident',
      target: 4, lowerIsBetter: false,
      severity: 30,
      why: `There is ${(s.parkPerCapita || 0).toFixed(1)} m² of parkland per resident against a 9 m² target. Green cover feeds land value, absorbs pollution and is the cheapest approval you can buy.`,
      who: 'Everyone, mildly — and land values everywhere parks are missing.',
      options: [
        { label: 'Build parks', hint: '$620k each. They pay for themselves in land value.', act: { tool: 'parks', sub: BT.PARK_S } },
        { label: 'Test doubling parkland', hint: 'See the land-value effect over a year.', act: { whatif: 'parks' } },
      ],
      focus: () => densestResidentialCell(sim),
      reward: 0.015,
    };
  },

  // ---- growth goal, always available as a fallback so there is always a goal
  (sim) => {
    const s = sim.stats;
    const st = stageFor(s.population);
    const next = STAGES[STAGES.indexOf(st) + 1];
    if (!next) return null;
    return {
      id: 'grow-' + next.id,
      title: `Grow the city to ${fmtNum(next.pop)} residents`,
      metric: () => sim.stats.population,
      format: (v) => fmtNum(v),
      target: next.pop, lowerIsBetter: false,
      severity: 10,
      why: `The city holds ${fmtNum(s.population)} people in ${fmtNum(s.housingCapacity)} homes. People move in when there are jobs, homes they can afford, and a city worth living in — migration is driven by exactly those three numbers.`,
      who: `Reaching ${next.name} unlocks ${(UNLOCKS[next.id] || []).join(', ') || 'new scale'}.`,
      options: [
        { label: 'Zone more housing', hint: 'Supply first — people follow homes.', act: { tool: 'zone', sub: 'res_high' } },
        { label: 'Zone more jobs', hint: 'Offices and commerce pull people in.', act: { tool: 'zone', sub: 'office' } },
        { label: 'Check what is holding it back', hint: 'The advisors read the live state.', act: { panel: 'manage', tab: 'advisors' } },
      ],
      focus: () => null,
      reward: 0.03,
    };
  },
];

// ---------------------------------------------------------------- helpers
function findBuilding(sim, pred) {
  for (const b of sim.world.buildings) if (b && !b.demolished && pred(b)) return idx(b.x, b.y);
  return null;
}
function worstCorridor(sim) {
  const g = sim.world.g, tr = sim.traffic;
  let best = null;
  for (let i = 0; i < GRID * GRID; i++) {
    if (g.kind[i] !== K.ROAD) continue;
    const sat = tr.congestionAt(i);
    if (!best || sat > best.sat) best = { cell: i, sat, vol: Math.round(tr.vol[i]), cap: Math.round(sim.net.cap[i] || 0) };
  }
  if (best) best.name = sim.roadName(best.cell);
  return best && best.sat > 0.5 ? best : null;
}
function worstCommuteZone(sim) {
  let best = null;
  for (const z of sim.traffic.zones) {
    if (z.pop < 300 || z.anchor < 0) continue;
    const score = (z.commute || 0) * z.pop;
    if (!best || score > best.score) best = { score, zone: z };
  }
  if (!best) return null;
  const z = best.zone;
  return { district: sim.districtName(sim.world.g.dist[z.anchor]), pop: Math.round(z.pop), commute: z.commute || 0, cell: z.anchor };
}
function countUpzonable(sim) {
  const g = sim.world.g;
  let n = 0;
  for (let i = 0; i < GRID * GRID; i++) if (g.zone[i] === Z.RES_LOW && g.land[i] > 0.45) n++;
  return n;
}
function densestResidentialCell(sim) {
  let best = null, bv = -1;
  for (const b of sim.world.buildings) {
    if (!b || b.demolished || b.residents <= 0) continue;
    const d = b.residents / (b.w * b.h);
    if (d > bv) { bv = d; best = idx(b.x, b.y); }
  }
  return best;
}
function worstPollutionCell(sim) {
  const g = sim.world.g;
  let best = null, bv = -1;
  for (let i = 0; i < GRID * GRID; i++) if (g.kind[i] !== K.WATER && g.pol[i] > bv) { bv = g.pol[i]; best = i; }
  return best;
}
function worstServedCell(sim, key) {
  const field = { policeCover: sim.fields.svcPolice, fireCover: sim.fields.svcFire, healthCover: sim.fields.svcHealth, eduCover: sim.fields.svcEdu }[key];
  if (!field) return null;
  let best = null, bv = Infinity;
  for (const b of sim.world.buildings) {
    if (!b || b.demolished || b.residents < 5) continue;
    const i = idx(b.x, b.y);
    const score = field[i] - b.residents / 4000;
    if (score < bv) { bv = score; best = i; }
  }
  return best;
}

// ---------------------------------------------------------------- Director
export class Director {
  constructor(app) {
    this.app = app;
    this.objective = null;
    this.completed = [];
    this.optional = [];
    this.stage = stageFor(app.sim.stats.population);
    this.unlocked = unlockedAt(this.stage.id);
    this.news = [];
    this.banner = null;
    this.story = null;
    this._t = 0;
    this._lastFeed = 0;
    this.pullNews();
    this.pick(true);
    // A new mayor gets told what they have walked into, in the same four parts
    // as everything else. On a loaded save the player already knows.
    if (this.objective && app.sim.day === 0) {
      this.banner = { kind: 'intro', title: 'Your first problem', objective: this.objective, t: 0 };
    }
  }

  get sim() { return this.app.sim; }

  // ---------------------------------------------------------------- loop
  // Watch the city on a wall-clock cadence. Frame dt is not a reliable measure
  // of elapsed time when the renderer is struggling, and the player should see
  // an objective resolve within a second of it actually resolving.
  update() {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - this._t < 700) return;
    this._t = now;
    this.checkStage();
    this.checkObjective();
    this.pullNews();
  }

  candidates() {
    const out = [];
    for (const fn of PROBLEMS) {
      let p = null;
      try { p = fn(this.sim); } catch (_) { p = null; }
      if (p && !this.completed.includes(p.id)) out.push(p);
    }
    out.sort((a, b) => b.severity - a.severity);
    return out;
  }

  pick(initial) {
    const list = this.candidates();
    const next = list[0] || null;
    if (!next) { this.objective = null; this.optional = []; return; }
    this.objective = this.arm(next);
    this.optional = list.slice(1, 4).map(p => ({ id: p.id, title: p.title, severity: p.severity }));
    if (!initial) {
      this.pushNews({
        kind: 'objective', severity: 'info', title: `New priority: ${next.title}`,
        why: next.why, who: next.who, action: next.options.map(o => o.label).join(' · '),
      });
    }
  }

  // Snapshot the starting value and a representative resident, so that when the
  // objective completes we can say what actually changed and for whom.
  arm(p) {
    const o = { ...p };
    o.start = o.metric();
    o.startDay = this.sim.day;
    o.subject = this.pickSubject(o);
    return o;
  }

  // Somebody this problem is actually happening to: rank residents by how badly
  // the objective's own measure hits them, keep the worst-affected, and among
  // those take the one living closest to where the problem is. An outlier makes
  // a worse story than a typical affected resident, so the very worst is skipped.
  pickSubject(o) {
    const list = this.sim.citizens.list;
    if (!list.length) return null;
    const better = this.subjectHigherIsBetter(o);
    const scored = [];
    for (const c of list) {
      const home = this.sim.world.buildings[c.home];
      if (!home || home.demolished) continue;
      const v = this.subjectMetric(o, c);
      scored.push({ c, home, bad: better ? -v : v });
    }
    if (!scored.length) return null;
    scored.sort((a, b) => b.bad - a.bad);
    // narrow to the people this measure actually harms — anyone worse off than
    // the best case — and then to the worst tenth of those. Filtering by harm
    // before rank matters: when only 5% of homes are being shed, a flat
    // tenth-percentile cut would step straight past every affected resident.
    const bestCase = scored[scored.length - 1].bad;
    const harmed = scored.filter(e => e.bad > bestCase);
    const base = harmed.length ? harmed : scored;
    const pool = base.slice(0, Math.max(1, Math.ceil(base.length * 0.1)));

    let best = pool[0].c;
    const focus = o.focus ? (() => { try { return o.focus(); } catch (_) { return null; } })() : null;
    if (focus !== null && focus !== undefined && focus >= 0) {
      const fx = focus % GRID, fy = (focus / GRID) | 0;
      let bd = Infinity;
      for (const e of pool) {
        const d = Math.hypot(e.home.x - fx, e.home.y - fy) + (e.c.work < 0 ? 6 : 0);
        if (d < bd) { bd = d; best = e.c; }
      }
    }
    if (!best) return null;
    return {
      id: best.id, name: best.name, age: best.age, occupation: best.occupation,
      home: this.homeName(best), work: this.workName(best),
      before: this.subjectMetric(o, best), label: this.subjectLabel(o),
    };
  }
  homeRent(c) { const b = this.sim.world.buildings[c.home]; return b ? b.rent : 0; }
  homeName(c) { const b = this.sim.world.buildings[c.home]; return b ? this.sim.districtName(b.district) : 'the city'; }
  workName(c) { const b = c.work >= 0 ? this.sim.world.buildings[c.work] : null; return b ? this.sim.districtName(b.district) : null; }
  // Tell each story in the units the objective is actually about, so the
  // before-and-after is the change the player made, not a proxy for it.
  subjectLabel(o) {
    if (o.id === 'commute') return 'Commute';
    if (o.id === 'housing') return 'Rent';
    if (o.id === 'power') return 'Power at home';
    if (o.id === 'water') return 'Water at home';
    if (o.id === 'pollution') return 'Air where they live';
    if (o.id.startsWith('service-')) return 'Services within reach';
    return 'How they feel about the city';
  }
  subjectMetric(o, c) {
    if (o.id === 'commute') return c.commuteMin;
    if (o.id === 'housing') return this.homeRent(c);
    const home = this.sim.world.buildings[c.home];
    const i = home ? idx(home.x, home.y) : -1;
    if (o.id === 'power') return home && home.powered ? 100 : 0;
    if (o.id === 'water') return home && home.watered ? 100 : 0;
    if (o.id === 'pollution') return i >= 0 ? this.sim.world.g.pol[i] * 100 : 0;
    if (o.id.startsWith('service-')) return i >= 0 ? this.sim.fields.svcAll[i] * 100 : 0;
    return c.satisfaction * 100;
  }
  subjectFormat(o, v) {
    if (o.id === 'commute') return Math.round(v) + ' min';
    if (o.id === 'housing') return fmtMoney(v, false);
    if (o.id === 'power' || o.id === 'water') return v >= 50 ? 'connected' : 'being shed';
    if (o.id === 'pollution') return v.toFixed(0) + ' index';
    return Math.round(v) + '%';
  }
  // Which direction of the subject's own measure counts as better off.
  subjectHigherIsBetter(o) {
    if (o.id === 'commute' || o.id === 'housing' || o.id === 'pollution') return false;
    return true;
  }
  // How much the subject's measure has to move before it is worth telling.
  subjectThreshold(o) {
    if (o.id === 'housing') return 20;
    if (o.id === 'power' || o.id === 'water') return 40;
    if (o.id === 'commute') return 1;
    return 4;
  }

  progress(o) {
    if (!o) return 0;
    const now = o.metric();
    if (o.lowerIsBetter) {
      if (now <= o.target) return 1;
      const span = Math.max(1e-6, o.start - o.target);
      return clamp((o.start - now) / span, 0, 1);
    }
    if (now >= o.target) return 1;
    const span = Math.max(1e-6, o.target - o.start);
    return clamp((now - o.start) / span, 0, 1);
  }

  checkObjective() {
    const o = this.objective;
    if (!o) { this.pick(true); return; }
    if (this.progress(o) < 1) return;

    // resolved — say what changed, and for whom
    const now = o.metric();
    const days = this.sim.day - o.startDay;
    let storyLine = null;
    if (o.subject) {
      const c = this.sim.citizens.list.find(x => x.id === o.subject.id);
      if (c) {
        const after = this.subjectMetric(o, c);
        const moved = Math.abs(after - o.subject.before) > this.subjectThreshold(o);
        if (moved) {
          storyLine = {
            name: o.subject.name, age: o.subject.age, occupation: o.subject.occupation,
            home: o.subject.home, work: o.subject.work, label: o.subject.label,
            before: this.subjectFormat(o, o.subject.before),
            after: this.subjectFormat(o, after),
            better: o.lowerIsBetter ? after < o.subject.before : after > o.subject.before,
          };
        }
      }
    }
    this.story = storyLine;
    this.completed.push(o.id);
    const reward = Math.round(this.sim.budget.revenue * (o.reward || 0.02));
    if (!this.sim.mode.unlimited) this.sim.budget.treasury += reward;
    this.sim.mods.happiness = clamp(this.sim.mods.happiness + 0.02, -0.18, 0.18);

    this.banner = {
      kind: 'solved',
      title: 'Objective complete',
      headline: o.title,
      from: o.format(o.start), to: o.format(now),
      days,
      reward,
      story: storyLine,
      t: 0,
    };
    this.pushNews({
      kind: 'solved', severity: 'good', title: `Solved: ${o.title}`,
      why: `${o.format(o.start)} → ${o.format(now)} over ${days} days.`,
      who: storyLine ? `${storyLine.name}'s ${storyLine.label.toLowerCase()}: ${storyLine.before} → ${storyLine.after}.` : 'The whole city.',
      action: reward ? `A grant of ${fmtMoney(reward)} was released.` : '',
    });
    this.pick(false);
  }

  checkStage() {
    const st = stageFor(this.sim.stats.population);
    if (st.id === this.stage.id) return;
    const grew = STAGES.indexOf(st) > STAGES.indexOf(this.stage);
    this.stage = st;
    this.unlocked = unlockedAt(st.id);
    if (!grew) return;
    this.banner = { kind: 'stage', title: 'The city has grown', headline: st.name, blurb: st.blurb, unlocks: UNLOCKS[st.id] || [], t: 0 };
    this.pushNews({
      kind: 'stage', severity: 'good', title: `${this.sim.world.districts[0] ? 'The city' : 'The city'} is now a ${st.name}`,
      why: st.blurb, who: `${fmtNum(this.sim.stats.population)} residents.`,
      action: (UNLOCKS[st.id] || []).length ? `Unlocked: ${(UNLOCKS[st.id] || []).join(', ')}.` : '',
    });
  }

  // Fold simulation incidents into the same news format, so everything the
  // player reads has the same four parts.
  pullNews() {
    const feed = this.sim.events.feed;
    for (let i = feed.length - 1; i >= 0; i--) {
      const e = feed[i];
      if (e.id <= this._lastFeed) continue;
      this._lastFeed = Math.max(this._lastFeed, e.id);
      this.pushNews({
        kind: e.kind, severity: e.severity || 'info', title: e.title,
        why: e.why || '', who: e.who || '', action: e.action || '',
        focus: e.focus, building: e.building, stamp: e.stamp, day: e.day, minute: e.minute,
      });
    }
  }

  pushNews(n) {
    n.stamp = n.stamp || this.sim.timeLabelShort();
    n.day = n.day === undefined ? this.sim.day : n.day;
    n.minute = n.minute === undefined ? this.sim.minuteOfDay : n.minute;
    n.id = (this._nid = (this._nid || 0) + 1);
    this.news.unshift(n);
    if (this.news.length > 60) this.news.length = 60;
  }

  isUnlocked(key) { return this.unlocked.has(key); }
  // The name of the stage that opens a given tool, for the lock labels.
  stageThatUnlocks(key) {
    const s = STAGES.find(st => (UNLOCKS[st.id] || []).includes(key));
    return s ? s.name : null;
  }
  clearBanner() { this.banner = null; }
}
