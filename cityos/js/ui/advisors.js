// The advisory system. Six advisors with genuinely different objective functions,
// plus a question-answering city analyst. Every figure quoted is read out of the
// live simulation — nothing here invents numbers.
import { GRID, CELL, K, Z, BT, RC, ROAD_SPEC } from '../core/defs.js';
import { clamp } from '../core/rng.js';
import { fmtNum, fmtMoney, fmtPct } from './format.js';
import { ZS, ZN } from '../sim/traffic.js';

const idx = (x, y) => y * GRID + x;

export const ADVISORS = [
  { id: 'mayor', name: 'Chief of Staff', role: 'Quality of life', ic: '🏛' },
  { id: 'economist', name: 'City Economist', role: 'Growth & jobs', ic: '📈' },
  { id: 'planner', name: 'City Planner', role: 'Long-term development', ic: '📐' },
  { id: 'transport', name: 'Transport Engineer', role: 'Mobility', ic: '🚦' },
  { id: 'environment', name: 'Environmental Officer', role: 'Sustainability', ic: '🌿' },
  { id: 'finance', name: 'Finance Director', role: 'Budget stability', ic: '💼' },
];

// --- helpers over the live state -------------------------------------------
export function topCongested(sim, n = 5) {
  const g = sim.world.g, tr = sim.traffic;
  const out = [];
  for (let i = 0; i < GRID * GRID; i++) {
    if (g.kind[i] !== K.ROAD) continue;
    const sat = tr.congestionAt(i);
    if (sat > 0.72) out.push({ cell: i, sat, vol: tr.vol[i] });
  }
  out.sort((a, b) => b.sat - a.sat);
  // de-duplicate by street name so we report corridors, not cells
  const seen = new Map();
  for (const o of out) {
    const name = sim.roadName(o.cell);
    if (!seen.has(name)) seen.set(name, o);
    if (seen.size >= n) break;
  }
  return [...seen.entries()].map(([name, o]) => ({ name, ...o }));
}

export function trend(series, back = 12) {
  if (!series || series.length < 3) return { d: 0, from: 0, to: 0 };
  const to = series[series.length - 1];
  const from = series[Math.max(0, series.length - 1 - back)];
  return { d: from !== 0 ? (to - from) / Math.abs(from) : 0, from, to };
}

export function worstServedZones(sim, n = 3) {
  const out = [];
  for (const z of sim.traffic.zones) {
    if (z.pop < 400) continue;
    out.push({ z, score: z.pop * (1 - z.transit) * (1 + (z.commute || 0) / 30) });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, n).map(o => ({
    zone: o.z,
    district: sim.districtName(sim.world.g.dist[o.z.anchor >= 0 ? o.z.anchor : 0]),
    pop: Math.round(o.z.pop), transit: o.z.transit, commute: o.z.commute,
  }));
}

export function serviceGaps(sim) {
  const gaps = [];
  const s = sim.stats;
  if (s.policeCover < 0.55) gaps.push({ what: 'police coverage', v: s.policeCover, build: 'Police Station' });
  if (s.fireCover < 0.55) gaps.push({ what: 'fire coverage', v: s.fireCover, build: 'Fire Station' });
  if (s.healthCover < 0.55) gaps.push({ what: 'healthcare access', v: s.healthCover, build: 'Hospital' });
  if (s.eduCover < 0.55) gaps.push({ what: 'school places', v: s.eduCover, build: 'School' });
  return gaps.sort((a, b) => a.v - b.v);
}

// --- advisor reports --------------------------------------------------------
export function advisorReports(sim) {
  const s = sim.stats, b = sim.budget, e = sim.economy, tr = sim.traffic;
  const h = sim.history.series;
  const out = [];

  // Chief of staff — public approval
  {
    const p = s.happinessParts || {};
    const worst = Object.entries(p).sort((a, b2) => a[1] - b2[1])[0];
    const mood = s.happiness > 0.72 ? 'pos' : s.happiness < 0.5 ? 'neg' : 'neu';
    const names = { commute: 'commute times', pollution: 'air quality', jobs: 'employment', housing: 'housing costs', services: 'public services', utilities: 'utility reliability', parks: 'green space', safety: 'safety', taxes: 'the tax burden' };
    out.push({
      ...ADVISORS[0], mood,
      msg: `Approval sits at <b>${fmtPct(s.happiness)}</b>. The biggest drag is <b>${names[worst[0]] || worst[0]}</b>, scoring ${fmtPct(worst[1])}. ` +
        (s.netMigration === null || s.netMigration === undefined
          ? 'Migration figures land at the end of the month.'
          : s.netMigration >= 0
            ? `We gained ${fmtNum(Math.abs(s.netMigration))} residents last month, so the mood is holding.`
            : `We lost ${fmtNum(Math.abs(s.netMigration))} residents last month — people are voting with their feet.`),
      recs: worst[0] === 'housing' ? ['Upzone to Residential High near transit', 'Approve more housing before rents run further']
        : worst[0] === 'services' ? [`Coverage gaps: ${serviceGaps(sim).map(g => g.what).join(', ') || 'none critical'}`]
        : worst[0] === 'parks' ? [`Only ${(s.parkPerCapita || 0).toFixed(1)} m² of park per resident — the target is 9`]
        : worst[0] === 'commute' ? ['Commute is the top complaint — see the transport brief'] : [],
    });
  }

  // Economist — growth
  {
    const jobsRatio = s.labourForce > 0 ? s.jobsTotal / s.labourForce : 1;
    const mood = s.unemployment < 0.06 && e.businessHealth > 1 ? 'pos' : s.unemployment > 0.10 ? 'neg' : 'neu';
    out.push({
      ...ADVISORS[1], mood,
      msg: `Unemployment is <b>${fmtPct(s.unemployment, 1)}</b> against ${fmtNum(s.jobsTotal)} jobs and a labour force of ${fmtNum(s.labourForce)} ` +
        `(${jobsRatio.toFixed(2)} jobs per worker; ${fmtNum(s.inCommuters || 0)} filled by in-commuters). ` +
        `Business conditions index ${e.businessHealth.toFixed(2)}×, city output ${fmtMoney(s.gdp)}.`,
      recs: [
        e.profit.office > 0.2 ? 'Office demand is unmet — zone more Office near the core' : null,
        e.profit.comm > 0.2 ? 'Retail demand is unmet — zone Commercial in residential districts' : null,
        s.unemployment > 0.08 ? 'Unemployment is high: industrial and commercial zoning creates jobs fastest' : null,
        sim.policies.taxComm > 0.11 ? `Business tax at ${fmtPct(sim.policies.taxComm, 1)} is suppressing formation` : null,
      ].filter(Boolean),
    });
  }

  // Planner — land use
  {
    const g = sim.world.g;
    let zonedEmpty = 0, unzoned = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      if (g.kind[i] !== K.EMPTY) continue;
      if (g.zone[i] === Z.NONE) unzoned++; else zonedEmpty++;
    }
    const mood = s.vacancy < 0.015 ? 'neg' : zonedEmpty > 200 ? 'pos' : 'neu';
    out.push({
      ...ADVISORS[2], mood,
      msg: `Housing is <b>${fmtPct(1 - s.vacancy)}</b> occupied with ${fmtNum(s.housingCapacity - s.population)} units spare. ` +
        `There are ${zonedEmpty} zoned vacant lots and ${unzoned} unzoned parcels left. ` +
        (s.vacancy < 0.02 ? 'We are effectively built out — further growth has to come from density.' : 'There is still room to grow outward.'),
      recs: [
        s.vacancy < 0.03 ? 'Upzone Residential Low → High where land value is above 0.5' : null,
        unzoned > 60 ? `${unzoned} parcels sit unzoned — assign a use to unlock them` : null,
        'Zoning sets the height ceiling; land value decides how close developers build to it',
      ].filter(Boolean),
    });
  }

  // Transport engineer
  {
    const hot = topCongested(sim, 3);
    const mood = s.flow > 0.85 ? 'pos' : s.flow < 0.6 ? 'neg' : 'neu';
    out.push({
      ...ADVISORS[3], mood,
      msg: `Average door-to-door commute <b>${s.commute.toFixed(1)} min</b>; network running at ${fmtPct(s.flow)} of free-flow. ` +
        `${fmtPct(s.transitShare, 1)} of trips are on public transport. ` +
        (hot.length ? `Worst corridors: ${hot.map(x => `${x.name} (${Math.round(x.sat * 100)}% of capacity)`).join(', ')}.`
          : 'No corridor is currently over capacity.'),
      recs: [
        hot.length ? `Widen or bypass ${hot[0].name}, or take demand off it with transit` : null,
        s.transitShare < 0.12 ? 'Transit share is low — a line linking the busiest zone pairs would move the needle' : null,
        sim.policies.signalOptimisation < 0.5 ? 'Signal retiming is the cheapest capacity you can buy' : null,
      ].filter(Boolean),
    });
  }

  // Environment
  {
    const polRel = s.pollutionIndex ?? (s.pollution / Math.max(0.0001, sim.fields.polMax || 1));
    const mood = polRel < 0.35 ? 'pos' : polRel > 0.7 ? 'neg' : 'neu';
    out.push({
      ...ADVISORS[4], mood,
      msg: `Average pollution index <b>${((s.pollutionIndex ?? polRel) * 100).toFixed(0)}</b>, park provision <b>${(s.parkPerCapita || 0).toFixed(1)} m²</b> per resident ` +
        `(target 9). Industry contributes most of the load; traffic adds the rest along the arterials.`,
      recs: [
        polRel > 0.3 ? 'Raise environmental regulation, or move heavy industry downwind of housing' : null,
        (s.parkPerCapita || 0) < 6 ? 'Parks are the cheapest happiness and land-value lever available' : null,
        s.transitShare < 0.15 ? 'Every point of transit share is a point off traffic emissions' : null,
      ].filter(Boolean),
    });
  }

  // Finance
  {
    const net = b.revenue - b.expense;
    const mood = net > 0 && b.treasury > 0 ? 'pos' : net < 0 ? 'neg' : 'neu';
    const tt = trend(sim.history.series.treasury, 12);
    out.push({
      ...ADVISORS[5], mood,
      msg: `Monthly revenue <b>${fmtMoney(b.revenue)}</b> against <b>${fmtMoney(b.expense)}</b> of spending — ` +
        `a ${net >= 0 ? 'surplus' : 'deficit'} of ${fmtMoney(Math.abs(net))}. Reserves ${fmtMoney(b.treasury)}` +
        (tt.d ? ` (${tt.d > 0 ? '+' : ''}${(tt.d * 100).toFixed(0)}% recently).` : '.'),
      recs: [
        net < 0 ? 'Spending exceeds income — trim service level or widen the tax base' : null,
        b.treasury < b.expense * 3 ? 'Reserves are under three months of spending' : null,
        net > b.revenue * 0.3 ? 'A large surplus is idle capital — invest it in transit or services' : null,
      ].filter(Boolean),
    });
  }
  return out;
}

// --- question answering -----------------------------------------------------
const N = (v) => `<span class="fig">${v}</span>`;
const W = (v) => `<span class="warnv">${v}</span>`;
const B = (v) => `<span class="badv">${v}</span>`;

export const SUGGESTED = [
  'Why is traffic getting worse?',
  'Why are housing costs increasing?',
  'Where should I build the next subway station?',
  'Why is unemployment rising?',
  'What happens if I increase taxes?',
  'How is the budget doing?',
  'Why is happiness falling?',
  'Is pollution a problem?',
  'What should I build next?',
];

export function answer(sim, qRaw) {
  const q = (qRaw || '').toLowerCase();
  const s = sim.stats, h = sim.history.series;
  const has = (...k) => k.some(w => q.includes(w));

  if (has('traffic', 'congest', 'jam', 'gridlock', 'commute', 'drive'))
    return trafficAnswer(sim);
  if (has('hous', 'rent', 'afford', 'price', 'vacan'))
    return housingAnswer(sim);
  if (has('subway', 'metro', 'transit', 'bus', 'train', 'station', 'rail'))
    return transitAnswer(sim);
  if (has('unemploy', 'job', 'work', 'employ'))
    return jobsAnswer(sim);
  if (has('tax'))
    return taxAnswer(sim);
  if (has('budget', 'money', 'deficit', 'finance', 'treasur', 'spend'))
    return budgetAnswer(sim);
  if (has('happ', 'approv', 'mood', 'satisf'))
    return happinessAnswer(sim);
  if (has('pollut', 'environment', 'air', 'green', 'emission'))
    return environmentAnswer(sim);
  if (has('power', 'electric', 'water', 'utilit', 'blackout', 'outage'))
    return utilityAnswer(sim);
  if (has('crime', 'police', 'safe'))
    return crimeAnswer(sim);
  if (has('build next', 'what should', 'advice', 'recommend', 'do next', 'priorit'))
    return adviceAnswer(sim);
  return statusAnswer(sim);
}

function trafficAnswer(sim) {
  const s = sim.stats, tr = sim.traffic;
  const hot = topCongested(sim, 5);
  const ct = trend(sim.history.series.congestion, 12);
  const pt = trend(sim.history.series.population, 12);
  const closed = [];
  for (let i = 0; i < GRID * GRID; i++) if (tr.closed[i]) closed.push(i);
  const parts = [];
  parts.push(`<p>Right now the network runs at ${N(fmtPct(s.flow))} of free-flow speed and the average door-to-door commute is ${N(s.commute.toFixed(1) + ' min')}. Volume-weighted saturation is ${N(fmtPct(tr.congestion, 0))} of capacity.</p>`);
  if (ct.d > 0.05) parts.push(`<p>Congestion is ${W('up ' + (ct.d * 100).toFixed(0) + '%')} over the recent record. Contributing factors the model can see:</p><ul>` +
    (pt.d > 0.01 ? `<li>Population is up ${N((pt.d * 100).toFixed(1) + '%')} to ${fmtNum(s.population)} — more trips on the same roads.</li>` : '') +
    (closed.length ? `<li>${W(closed.length + ' road segments')} are currently closed by incidents or works, pushing traffic onto parallel routes.</li>` : '') +
    (s.transitShare < 0.15 ? `<li>Only ${W(fmtPct(s.transitShare, 1))} of trips use public transport, so almost all growth lands on the road network.</li>` : '') +
    (s.jobsTotal / Math.max(1, s.labourForce) > 1.2 ? `<li>The city has ${N((s.jobsTotal / Math.max(1, s.labourForce)).toFixed(2) + ' jobs per resident worker')}, so ${fmtNum(s.inCommuters || 0)} people commute in from outside every day.</li>` : '') +
    `</ul>`);
  else if (ct.d < -0.05) parts.push(`<p>Congestion is actually ${N('down ' + Math.abs(ct.d * 100).toFixed(0) + '%')} over the recent record.</p>`);
  else parts.push(`<p>Congestion is broadly flat over the recent record.</p>`);
  if (hot.length) {
    parts.push(`<p>The pressure is not evenly spread. The worst corridors:</p><ul>` +
      hot.map(x => `<li>${x.name} — ${(x.sat > 1 ? B : W)(Math.round(x.sat * 100) + '% of capacity')}, ${fmtNum(x.vol)} vehicles/hour</li>`).join('') + `</ul>`);
    parts.push(`<p>Each of these is a candidate for an upgrade to a wider road class, a parallel route, or a transit line that removes the trips entirely. Signal delay grows with the cube of saturation, so the last 10% of capacity costs far more time than the first 10%.</p>`);
  } else {
    parts.push(`<p>No individual corridor is over capacity, so the commute figure is dominated by trip length and the ${N('8 minute')} fixed access, parking and walking time rather than by queuing.</p>`);
  }
  return { title: 'Traffic diagnosis', html: parts.join('') };
}

function housingAnswer(sim) {
  const s = sim.stats, e = sim.economy;
  const rt = trend(sim.history.series.rent, 12);
  const vt = trend(sim.history.series.vacancy, 12);
  const parts = [];
  parts.push(`<p>Median rent is ${N(fmtMoney(s.medianRent, false))} a month against a median income of ${N(fmtMoney(s.medianIncome, false))} — a rent burden of ${N(fmtPct(s.medianRent * 12 / Math.max(1, s.medianIncome), 0))} of income.</p>`);
  parts.push(`<p>Occupancy is ${N(fmtPct(1 - s.vacancy))} — ${fmtNum(Math.max(0, s.housingCapacity - s.population))} units spare out of ${fmtNum(s.housingCapacity)}. ${
    s.vacancy < 0.03 ? B('Below about 4% vacancy a housing market has no slack, and rents rise until demand is priced out.') : 'That is a reasonably slack market.'}</p>`);
  if (rt.d > 0.02) parts.push(`<p>Rents are ${W('up ' + (rt.d * 100).toFixed(0) + '%')} over the recent record while vacancy moved ${(vt.d * 100).toFixed(0)}%. The mechanism is direct: the rent index tracks the gap between household demand and available units.</p>`);
  const g = sim.world.g;
  let lotsRes = 0, upzonable = 0;
  for (let i = 0; i < GRID * GRID; i++) {
    if (g.kind[i] === K.EMPTY && (g.zone[i] === Z.RES_LOW || g.zone[i] === Z.RES_HIGH || g.zone[i] === Z.MIXED)) lotsRes++;
    if (g.zone[i] === Z.RES_LOW && g.land[i] > 0.5) upzonable++;
  }
  parts.push(`<p>Supply levers available right now:</p><ul>` +
    `<li>${N(lotsRes)} vacant lots are already zoned for housing — developers will build on them when the profit index (currently ${e.profit.res.toFixed(2)}) is positive.</li>` +
    `<li>${N(upzonable)} low-density parcels sit on land worth more than 0.50 — upzoning them to Residential High raises the height ceiling and lets redevelopment proceed.</li>` +
    (sim.policies.taxRes > 0.10 ? `<li>Residential tax at ${W(fmtPct(sim.policies.taxRes, 1))} is subtracted directly from developer profitability.</li>` : '') +
    `</ul>`);
  return { title: 'Housing market', html: parts.join('') };
}

function transitAnswer(sim) {
  const s = sim.stats;
  const worst = worstServedZones(sim, 4);
  const parts = [];
  parts.push(`<p>Public transport currently carries ${N(fmtPct(s.transitShare, 1))} of trips across ${sim.transit.lines.length} line${sim.transit.lines.length === 1 ? '' : 's'}, roughly ${fmtNum(s.transitRidership)} trips in the current hour.</p>`);
  if (worst.length) {
    parts.push(`<p>The strongest case for the next station is where population is high and transit access is low. Ranked by unserved demand:</p><ul>` +
      worst.map(w => `<li><b>${w.district}</b> — ${fmtNum(w.pop)} residents, transit access ${(w.transit * 100).toFixed(0)}%, average commute ${(w.commute || 0).toFixed(0)} min</li>`).join('') + `</ul>`);
    parts.push(`<p>A line only wins riders when it beats driving door-to-door. The mode-split model compares transit time — run time, plus half the headway of wait, plus access time — against the congested car time. Short headways and stops inside walking distance of dense blocks matter more than raw speed.</p>`);
  }
  parts.push(`<p>A subway costs about ${N(fmtMoney(42_000_000))} per kilometre plus ${fmtMoney(9_500_000)} a station, and ${fmtMoney(140_000)} per kilometre per month to run. Buses are roughly a hundredth of that but share the congestion they are meant to relieve.</p>`);
  return { title: 'Where transit pays', html: parts.join('') };
}

function jobsAnswer(sim) {
  const s = sim.stats, e = sim.economy;
  const ut = trend(sim.history.series.unemployment, 12);
  const parts = [];
  parts.push(`<p>Unemployment is ${N(fmtPct(s.unemployment, 1))}: a labour force of ${fmtNum(s.labourForce)} against ${fmtNum(s.jobsTotal)} jobs, of which ${fmtNum(s.employed)} are filled.</p>`);
  parts.push(`<p>Sector split — retail ${N(fmtNum(s.retailJobs))}, industry ${N(fmtNum(s.indJobs))}, offices ${N(fmtNum(s.officeJobs))}. Business conditions index ${N(e.businessHealth.toFixed(2) + '×')}.</p>`);
  if (ut.d > 0.03) parts.push(`<p>It is ${W('rising')} (${(ut.d * 100).toFixed(0)}% over the recent record). The model attributes that to some combination of: population growing faster than jobs, businesses shrinking under weak conditions, or workplaces losing accessibility as congestion rises.</p>`);
  parts.push(`<p>Jobs follow zoning and profitability. Current developer incentive by use: residential ${e.profit.res.toFixed(2)}, commercial ${e.profit.comm.toFixed(2)}, industrial ${e.profit.ind.toFixed(2)}, office ${e.profit.office.toFixed(2)}. A negative figure means nothing new will be built in that category no matter how much land you zone.</p>`);
  return { title: 'Employment', html: parts.join('') };
}

function taxAnswer(sim) {
  const s = sim.stats, p = sim.policies, b = sim.budget;
  const parts = [];
  parts.push(`<p>Current rates: residential ${N(fmtPct(p.taxRes, 1))}, commercial ${N(fmtPct(p.taxComm, 1))}, industrial ${N(fmtPct(p.taxInd, 1))}. They raise ${fmtMoney(b.breakdown.residentialTax || 0)}, ${fmtMoney(b.breakdown.commercialTax || 0)} and ${fmtMoney(b.breakdown.industrialTax || 0)} a month respectively.</p>`);
  parts.push(`<p>Raising residential tax by one point would add roughly ${N(fmtMoney((b.breakdown.residentialTax || 0) / Math.max(0.001, p.taxRes) * 0.01))} a month at today's population — but the same rate enters three other equations:</p><ul>` +
    `<li>Household demand to live here falls (coefficient 3.2), which slows migration.</li>` +
    `<li>Developer profitability falls (coefficient 1.4), which slows housing construction.</li>` +
    `<li>Land values fall (coefficient 0.30), which lowers rents and future tax take.</li></ul>`);
  parts.push(`<p>Business taxes work the same way through firm formation and the business-conditions index. Rather than guess at the net effect, run it: <b>What-If → Raise residential tax</b> forks the entire simulation, applies the change and fast-forwards it against an unchanged copy of the city.</p>`);
  return { title: 'Tax policy', html: parts.join('') };
}

function budgetAnswer(sim) {
  const b = sim.budget, s = sim.stats;
  const net = b.revenue - b.expense;
  const bd = b.breakdown || {};
  const rows = [['Roads', bd.roads], ['Services', bd.services], ['Utilities', bd.utilities], ['Transit', bd.transit], ['Parks', bd.parks], ['Administration', bd.administration]]
    .filter(r => r[1]).sort((a, c) => c[1] - a[1]);
  return {
    title: 'Budget position',
    html: `<p>Reserves stand at ${N(fmtMoney(b.treasury))}. Revenue ${N(fmtMoney(b.revenue))} against spending ${N(fmtMoney(b.expense))} — a monthly ${net >= 0 ? 'surplus' : 'deficit'} of ${(net >= 0 ? N : B)(fmtMoney(Math.abs(net)))}.</p>` +
      `<p>Largest spending lines:</p><ul>${rows.slice(0, 4).map(r => `<li>${r[0]} — ${fmtMoney(r[1])} (${fmtPct(r[1] / Math.max(1, b.expense), 0)})</li>`).join('')}</ul>` +
      `<p>${net < 0 ? `At this rate reserves last about ${W(Math.max(0, Math.floor(b.treasury / Math.abs(net))) + ' months')}.`
        : `At this rate you add ${N(fmtMoney(net * 12))} a year — enough for ${Math.floor(net * 12 / 42_000_000)} km of subway.`}</p>`,
  };
}

function happinessAnswer(sim) {
  const s = sim.stats;
  const p = s.happinessParts || {};
  const names = { commute: 'Commute times', pollution: 'Air quality', jobs: 'Employment', housing: 'Housing affordability', services: 'Public services', utilities: 'Utility reliability', parks: 'Green space', safety: 'Safety', taxes: 'Tax burden' };
  const weights = { commute: 0.15, pollution: 0.11, jobs: 0.16, housing: 0.14, services: 0.15, utilities: 0.12, parks: 0.06, safety: 0.07, taxes: 0.04 };
  const rows = Object.entries(p).map(([k, v]) => ({ k, v, w: weights[k] || 0, lost: (1 - v) * (weights[k] || 0) }))
    .sort((a, b) => b.lost - a.lost);
  return {
    title: 'What is driving approval',
    html: `<p>Approval is ${N(fmtPct(s.happiness))}. It is a weighted score; here is where the points are being lost, largest first:</p>` +
      `<ul>${rows.slice(0, 5).map(r => `<li><b>${names[r.k] || r.k}</b> scores ${(r.v * 100).toFixed(0)}% at weight ${(r.w * 100).toFixed(0)}% — costing ${(r.lost * 100).toFixed(1)} points</li>`).join('')}</ul>` +
      `<p>Fixing the top line item is always worth more than fixing the worst score, because weight matters as much as gap.</p>`,
  };
}

function environmentAnswer(sim) {
  const s = sim.stats;
  const rel = s.pollution / Math.max(0.0001, sim.fields.polMax || 1);
  let indPol = 0, trafficPol = 0;
  for (const b of sim.world.buildings) if (b && !b.demolished && !b.abandoned && b.zone === Z.IND) indPol += b.pollution;
  const g = sim.world.g;
  for (let i = 0; i < GRID * GRID; i++) if (g.kind[i] === K.ROAD) trafficPol += g.vol[i] / 2600;
  const tot = indPol + trafficPol || 1;
  return {
    title: 'Environment',
    html: `<p>Average pollution index ${N((rel * 100).toFixed(0))}, with the worst cell at ${(sim.fields.polMax || 0).toFixed(2)}. Roughly ${N(fmtPct(indPol / tot, 0))} of the emission load comes from industry and ${N(fmtPct(trafficPol / tot, 0))} from traffic.</p>` +
      `<p>Park provision is ${N((s.parkPerCapita || 0).toFixed(1) + ' m²')} per resident against a 9 m² target, and green cover feeds directly into land value and approval.</p>` +
      `<p>Levers: environmental regulation (currently ${fmtPct(sim.policies.envRegulation, 0)}) suppresses industrial demand but cuts emissions; EV adoption (${fmtPct(sim.policies.evAdoption, 0)}) scales traffic emissions down directly; and moving trips onto transit removes them altogether.</p>`,
  };
}

function utilityAnswer(sim) {
  const s = sim.stats;
  return {
    title: 'Utilities',
    html: `<p>Electricity demand is ${N(Math.round(s.powerDemand) + ' MW')} against ${N(Math.round(s.powerCapacity) + ' MW')} of capacity — ${((s.powerRatio || 0) * 100).toFixed(0)}% loaded.` +
      (s.powerRatio > 1 ? ` ${B('That is a deficit')}: ${fmtPct(s.blackoutFrac, 0)} of buildings are being shed, which cuts their output and their occupants' approval.` : ' Comfortable.') + `</p>` +
      `<p>Water ${((s.waterRatio || 0) * 100).toFixed(0)}% loaded, waste handling ${((s.wasteRatio || 0) * 100).toFixed(0)}%. Demand peaks in the evening for homes and midday for offices, and rises in hot and cold weather.</p>` +
      `<p>Hospitals, fire and police stations are never load-shed; everything else is.</p>`,
  };
}

function crimeAnswer(sim) {
  const s = sim.stats;
  return {
    title: 'Public safety',
    html: `<p>The crime index averages ${N((s.crime * 100).toFixed(1))} with police coverage reaching ${N(fmtPct(s.policeCover))} of residents.</p>` +
      `<p>In the model, crime rises with residential density and unemployment (currently ${fmtPct(s.unemployment, 1)}) and falls with police coverage. It then feeds back into land value and approval, so under-policing shows up in rents before it shows up in the crime figure.</p>` +
      `<p>${s.policeCover < 0.6 ? W('Coverage under 60% is the binding constraint — another precinct is the direct fix.') : 'Coverage is adequate; unemployment is the larger lever from here.'}</p>`,
  };
}

function adviceAnswer(sim) {
  const s = sim.stats, e = sim.economy;
  const items = [];
  if (s.powerRatio > 0.92) items.push([`Electricity is at ${(s.powerRatio * 100).toFixed(0)}% of capacity`, 'Build a power plant before the first brownout', 9]);
  if (s.waterRatio > 0.92) items.push([`Water is at ${(s.waterRatio * 100).toFixed(0)}% of capacity`, 'Build water works', 9]);
  if (s.vacancy < 0.02) items.push([`Housing occupancy is ${fmtPct(1 - s.vacancy)}`, 'Upzone or zone more residential land — rents are climbing', 8]);
  for (const g of serviceGaps(sim)) items.push([`${g.what} reaches only ${fmtPct(g.v)} of residents`, `Build a ${g.build}`, 7]);
  if (s.flow < 0.7) items.push([`Network is at ${fmtPct(s.flow)} of free-flow`, 'Upgrade the worst corridor or add transit', 7]);
  if ((s.parkPerCapita || 0) < 4) items.push([`Only ${(s.parkPerCapita || 0).toFixed(1)} m² of park per resident`, 'Parks are cheap approval and land value', 5]);
  if (sim.budget.revenue < sim.budget.expense) items.push(['The budget is in deficit', 'Raise a tax rate or cut the service level', 8]);
  if (e.profit.res > 0.35) items.push([`Housing developers want to build (profit index ${e.profit.res.toFixed(2)})`, 'Zone more residential land to let them', 6]);
  items.sort((a, b) => b[2] - a[2]);
  if (!items.length) return { title: 'Priorities', html: `<p>Nothing is flashing red. Approval ${N(fmtPct(s.happiness))}, budget ${sim.budget.revenue >= sim.budget.expense ? 'in surplus' : 'in deficit'}, network at ${fmtPct(s.flow)}. This is a good moment to invest reserves in transit or long-lead infrastructure.</p>` };
  return { title: 'What to do next', html: `<p>Ranked by urgency, from the current state of the city:</p><ul>${items.slice(0, 6).map(i => `<li><b>${i[0]}</b> — ${i[1]}</li>`).join('')}</ul>` };
}

function statusAnswer(sim) {
  const s = sim.stats;
  return {
    title: 'City status',
    html: `<p>${fmtNum(s.population)} residents, ${fmtNum(s.jobsTotal)} jobs, approval ${N(fmtPct(s.happiness))}. ` +
      `Commute ${s.commute.toFixed(1)} min, network at ${fmtPct(s.flow)}, housing ${fmtPct(1 - s.vacancy)} occupied, reserves ${fmtMoney(sim.budget.treasury)}.</p>` +
      `<p>I can go deeper on traffic, housing, transit, jobs, taxes, the budget, approval, the environment, utilities or safety — ask about any of those, or ask what to do next.</p>`,
  };
}
