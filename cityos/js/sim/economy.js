// Economy, housing market, development and the municipal budget.
// Demand for each land use is derived from the state of the city, drives
// construction and abandonment, and feeds back into jobs, rents and taxes.
import { GRID, CELL, K, Z, BT, BUILDING_SPEC, ROAD_SPEC, RC, UPKEEP, TAX_BASE } from '../core/defs.js';
import { RNG, clamp } from '../core/rng.js';
import { makeBuilding, floorHeight } from '../world/gen.js';
import { nearestRoad } from '../world/network.js';

const idx = (x, y) => y * GRID + x;
const BIZ_TAX_BASE = 0.30;   // share of business turnover reachable by city taxation
const inb = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID;

export class Economy {
  constructor(world, seed) {
    this.world = world;
    this.rng = new RNG((seed ^ 0x77aa) >>> 0);
    this.demand = { res: 0.2, comm: 0.15, ind: 0.1, office: 0.2 };   // household/business appetite to be here
    this.profit = { res: 0.2, comm: 0.15, ind: 0.1, office: 0.2 };   // developer incentive to build
    this.rentIndex = 1;
    this.priceIndex = 1;
    this.gdp = 0;
    this.businessHealth = 1;
    this.buildQueue = [];
    this.vacantLots = null;
    this.lotCursor = 0;
  }

  // ---------------------------------------------------------------- occupancy
  distribute(sim) {
    const w = this.world, g = w.g;
    let capacity = 0, jobsTotal = 0;
    const res = [], emp = [];
    for (const b of w.buildings) {
      if (!b || b.demolished) continue;
      if (b.construction !== undefined && b.construction < 1) continue;
      if (b.abandoned) { b.residents = 0; b.employed = 0; continue; }
      if (b.capacity > 0) { capacity += b.capacity; res.push(b); }
      if (b.jobs > 0) { jobsTotal += b.jobs; emp.push(b); }
    }
    sim.stats.housingCapacity = capacity;
    sim.stats.jobsTotal = jobsTotal;

    // --- households pick where to live by desirability, subject to capacity
    const pop = Math.min(sim.stats.population, capacity);
    sim.stats.population = pop;
    let wsum = 0;
    for (const b of res) {
      const i = idx(b.x, b.y);
      const pol = g.pol[i] / Math.max(0.001, sim.fields.polMax || 1);
      b._des = Math.max(0.03,
        0.30 + g.land[i] * 0.85 + sim.fields.svcAll[i] * 0.35 + sim.fields.transitAcc[i] * 0.25
        + g.green[i] * 0.20 - pol * 0.45 - g.crime[i] * 0.40 - (b.powered ? 0 : 0.5) - (b.watered ? 0 : 0.35)
      );
      wsum += b._des * b.capacity;
    }
    let placed = 0;
    for (const b of res) {
      const share = wsum > 0 ? (b._des * b.capacity) / wsum : 0;
      const want = Math.min(b.capacity, Math.round(pop * share * 1.18));
      b.residents = want;
      placed += want;
    }
    // fix rounding drift against real capacity
    let drift = pop - placed, guard = 0;
    while (Math.abs(drift) > 0 && guard++ < 4000 && res.length) {
      const b = res[(guard * 37) % res.length];
      if (drift > 0 && b.residents < b.capacity) { b.residents++; drift--; }
      else if (drift < 0 && b.residents > 0) { b.residents--; drift++; }
      else if (guard > 3500) break;
    }
    sim.stats.vacancy = capacity > 0 ? 1 - pop / capacity : 0;

    // --- jobs are filled from the labour force, best-connected first
    const labour = Math.round(pop * 0.58 * (1 - sim.policies.retirementDrag));
    sim.stats.labourForce = labour;
    const filled = Math.min(labour, jobsTotal);
    let jw = 0;
    for (const b of emp) {
      const i = idx(b.x, b.y);
      b._acc = 0.35 + sim.fields.transitAcc[i] * 0.5 + g.land[i] * 0.4 + (b.powered ? 0.25 : 0);
      jw += b._acc * b.jobs;
    }
    let jp = 0;
    for (const b of emp) {
      const share = jw > 0 ? (b._acc * b.jobs) / jw : 0;
      b.employed = Math.min(b.jobs, Math.round(filled * share * 1.12));
      jp += b.employed;
    }
    let jd = filled - jp; guard = 0;
    while (Math.abs(jd) > 0 && guard++ < 4000 && emp.length) {
      const b = emp[(guard * 53) % emp.length];
      if (jd > 0 && b.employed < b.jobs) { b.employed++; jd--; }
      else if (jd < 0 && b.employed > 0) { b.employed--; jd++; }
      else if (guard > 3500) break;
    }
    sim.stats.employed = filled;
    sim.stats.unemployment = labour > 0 ? clamp(Math.max(0.032, 1 - filled / labour), 0, 1) : 0;
    sim.stats.jobsVacant = Math.max(0, jobsTotal - filled);
  }

  // ---------------------------------------------------------------- demand
  updateDemand(sim) {
    const s = sim.stats, p = sim.policies;
    const bl = this.baseline || { retail: 0.08, ind: 0.06, office: 0.11, jobsRatio: 1 };
    const jobsRatio = s.labourForce > 0 ? s.jobsTotal / s.labourForce : 1;
    const vacancy = s.vacancy;
    const rentBurden = this.rentIndex * 1200 * 12 / Math.max(18000, s.medianIncome || 42000);

    const res = clamp(
      (jobsRatio / Math.max(0.2, bl.jobsRatio) - 1) * 1.5
      + (0.055 - vacancy) * 5.0
      + (s.happiness - 0.55) * 1.1
      - (rentBurden - 0.30) * 1.4
      - p.taxRes * 3.2
      + sim.mods.resDemand, -1, 1);

    const retailPerCap = s.population > 0 ? s.retailJobs / s.population : 0;
    const comm = clamp(
      (bl.retail - retailPerCap) / Math.max(0.01, bl.retail) * 0.9
      + (s.happiness - 0.5) * 0.7
      + (this.businessHealth - 1) * 1.4
      - p.taxComm * 3.0
      + sim.mods.commDemand, -1, 1);

    const indPerCap = s.population > 0 ? s.indJobs / s.population : 0;
    const ind = clamp(
      (bl.ind - indPerCap) / Math.max(0.01, bl.ind) * 0.9
      + (0.06 - s.unemployment) * 3.2
      - p.taxInd * 2.8
      - p.envRegulation * 0.9
      + sim.mods.indDemand, -1, 1);

    const officePerCap = s.population > 0 ? s.officeJobs / s.population : 0;
    const office = clamp(
      (bl.office - officePerCap) / Math.max(0.01, bl.office) * 0.9
      + (s.educationLevel - 0.5) * 0.9
      - p.taxComm * 2.6
      + sim.mods.commDemand * 0.7, -1, 1);

    const k = 0.18;
    this.demand.res += (res - this.demand.res) * k;
    this.demand.comm += (comm - this.demand.comm) * k;
    this.demand.ind += (ind - this.demand.ind) * k;
    this.demand.office += (office - this.demand.office) * k;

    // Developers respond to scarcity and price, not to household comfort:
    // tight vacancy and high rents make building MORE attractive, not less.
    const scarcity = clamp((0.055 - vacancy) * 7 + (this.rentIndex - 1) * 0.7, -1, 1.4);
    const pRes = clamp(scarcity * 0.75 + res * 0.35 - p.taxRes * 1.4 + (p.densityBonus ? 0.2 : 0), -1, 1);
    const pComm = clamp(comm * 0.6 + (this.businessHealth - 1) * 1.2 + Math.min(0.5, s.population / Math.max(1, s.retailJobs) / 14) * 0.3, -1, 1);
    const pInd = clamp(ind * 0.7 + (this.businessHealth - 1) * 0.9, -1, 1);
    const pOff = clamp(office * 0.65 + (this.businessHealth - 1) * 1.4, -1, 1);
    this.profit.res += (pRes - this.profit.res) * k;
    this.profit.comm += (pComm - this.profit.comm) * k;
    this.profit.ind += (pInd - this.profit.ind) * k;
    this.profit.office += (pOff - this.profit.office) * k;
  }

  // Developer incentive by zone — what actually gets built.
  profitFor(zone) {
    switch (zone) {
      case Z.RES_LOW: case Z.RES_HIGH: return this.profit.res;
      case Z.COMM: return this.profit.comm;
      case Z.OFFICE: return this.profit.office;
      case Z.IND: return this.profit.ind;
      case Z.MIXED: return (this.profit.res + this.profit.comm) / 2;
      default: return -1;
    }
  }

  // ---------------------------------------------------------------- housing market
  updateHousing(sim) {
    const s = sim.stats;
    // Rents chase the gap between demand and supply, and the chase gets weaker
    // the further rents have already run ahead of incomes.
    const stretch = clamp((this.rentIndex - 1) * 0.55, 0, 0.85);
    const pressure = clamp((0.058 - s.vacancy) * 4.5 + this.demand.res * 1.6, -0.7, 1.1) * (1 - stretch);
    this.rentIndex = clamp(this.rentIndex * (1 + pressure * 0.0022), 0.5, 4.5);
    this.priceIndex = clamp(this.priceIndex * (1 + pressure * 0.0028 - 0.0002), 0.45, 6);
    const g = this.world.g;
    for (const b of this.world.buildings) {
      if (!b || b.demolished || b.capacity <= 0) continue;
      const i = idx(b.x, b.y);
      const target = (520 + g.land[i] * 2650) * this.rentIndex;
      b.rent = Math.round(b.rent * 0.9 + target * 0.1);
      b.value = Math.round((300000 + g.land[i] * 1_150_000) * b.w * b.h * Math.sqrt(b.floors) * this.priceIndex / 10);
    }
    s.medianRent = Math.round(1100 * this.rentIndex);
    s.affordability = clamp(1 - (s.medianRent * 12) / Math.max(18000, s.medianIncome || 42000) / 0.32 * 0.5, 0, 1);
  }

  // ---------------------------------------------------------------- development
  collectLots(sim) {
    const g = this.world.g;
    const lots = [];
    for (let y = 1; y < GRID - 1; y++) for (let x = 1; x < GRID - 1; x++) {
      const i = idx(x, y);
      if (g.kind[i] !== K.EMPTY) continue;
      if (g.zone[i] === Z.NONE) continue;
      let road = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (inb(x + dx, y + dy) && g.kind[idx(x + dx, y + dy)] === K.ROAD) { road = true; break; }
      }
      if (!road) continue;
      // A green belt freezes development beyond the outer ring.
      if (sim.policies.greenBelt) {
        const d = Math.max(Math.abs(x - GRID / 2), Math.abs(y - GRID / 2)) / (GRID / 2);
        if (d > 0.78) continue;
      }
      lots.push(i);
    }
    lots.sort((a, b) => g.land[b] - g.land[a]);
    this.vacantLots = lots;
    this.lotCursor = 0;
  }

  demandFor(zone) {
    switch (zone) {
      case Z.RES_LOW: case Z.RES_HIGH: return this.demand.res;
      case Z.COMM: return this.demand.comm;
      case Z.OFFICE: return this.demand.office;
      case Z.IND: return this.demand.ind;
      case Z.MIXED: return (this.demand.res + this.demand.comm) / 2;
      case Z.PARK: case Z.CIVIC: return 0;
      default: return -1;
    }
  }

  dailyDevelopment(sim) {
    const g = this.world.g;
    if (!this.vacantLots || sim.day % 7 === 0) this.collectLots(sim);
    const rng = this.rng;
    const budget = 14;               // construction starts examined per day
    let started = 0;
    for (let n = 0; n < 220 && started < budget && this.vacantLots.length; n++) {
      const i = this.vacantLots[(this.lotCursor++) % this.vacantLots.length];
      const x = i % GRID, y = (i / GRID) | 0;
      if (g.kind[i] !== K.EMPTY) continue;
      const zone = g.zone[i];
      const dem = this.profitFor(zone);
      if (dem <= 0.04) continue;
      // higher land value + stronger demand -> more likely to break ground
      if (!rng.bool(clamp(dem * 0.9 * (0.35 + g.land[i]), 0, 0.95))) continue;
      this.startConstruction(sim, x, y, zone);
      started++;
    }
    // progress sites
    for (let k = this.buildQueue.length - 1; k >= 0; k--) {
      const s = this.buildQueue[k];
      const b = this.world.buildings[s.b];
      if (!b) { this.buildQueue.splice(k, 1); continue; }
      b.construction = Math.min(1, b.construction + 1 / s.days);
      if (b.construction >= 1) {
        b.form = BUILDING_SPEC[b.type].form;
        b.built = sim.day;
        sim.dirtyBuildings.add(b.id);
        this.buildQueue.splice(k, 1);
        const homes = Math.round(b.capacity || 0), jobs = Math.round(b.jobs || 0);
        sim.log('construction', `${b.name} completed in ${sim.districtName(b.district)}`, {
          building: b.id, focus: b.y * GRID + b.x, severity: b.playerBuilt ? 'good' : 'info',
          why: `${b.floors} floors finished after ${s.days} days of construction. It starts empty and fills as people and firms find it.`,
          who: homes || jobs
            ? `Room for ${homes ? homes.toLocaleString() + ' residents' : ''}${homes && jobs ? ' and ' : ''}${jobs ? jobs.toLocaleString() + ' jobs' : ''}.`
            : 'It contributes to the district rather than housing anyone directly.',
          action: b.playerBuilt ? 'Watch the objective metric it was meant to move.' : '' });
      } else sim.dirtyBuildings.add(b.id);
    }
  }

  startConstruction(sim, x, y, zone) {
    const g = this.world.g, rng = this.rng;
    const district = this.world.districts[g.dist[idx(x, y)]];
    const land = g.land[idx(x, y)];
    const type = this.pickType(zone, land, rng);
    const spec = BUILDING_SPEC[type];
    // find a footprint that fits
    let w = 1, h = 1;
    const maxW = type === BT.TOWER_OFF || type === BT.TOWER_RES ? 3 : (type === BT.MALL || type === BT.FACTORY || type === BT.WAREHOUSE) ? 3 : 2;
    for (let tw = maxW; tw >= 1; tw--) {
      for (let th = maxW; th >= 1; th--) {
        let ok = true;
        for (let j = 0; j < th && ok; j++) for (let i2 = 0; i2 < tw; i2++) {
          const nx = x + i2, ny = y + j;
          if (!inb(nx, ny) || g.kind[idx(nx, ny)] !== K.EMPTY || g.zone[idx(nx, ny)] !== zone) { ok = false; break; }
        }
        if (ok) { w = tw; h = th; tw = 0; break; }
      }
      if (w > 1 || h > 1) break;
    }
    const floors = Math.max(1, Math.round(spec.floors[0] + (spec.floors[1] - spec.floors[0]) * clamp(land * rng.float(0.7, 1.3), 0, 1)));
    const rot = this.faceRoad(x, y, w, h);
    const b = makeBuilding(this.world.buildings.length, type, x, y, w, h, floors, rot, zone, district, rng, g);
    b.construction = 0.02;
    b.form = 'construction';
    b.litProb = 0.9;
    this.world.buildings.push(b);
    for (let j = 0; j < h; j++) for (let i2 = 0; i2 < w; i2++) {
      const ii = idx(x + i2, y + j);
      g.kind[ii] = K.BUILDING; g.bld[ii] = b.id;
    }
    const days = clamp(Math.round(3 + floors * 0.9 + w * h), 4, 60);
    this.buildQueue.push({ b: b.id, days });
    sim.dirtyBuildings.add(b.id);
    sim.dirtySurface.add(idx(x, y));
    return b;
  }

  pickType(zone, land, rng) {
    switch (zone) {
      case Z.RES_LOW: return rng.bool(0.7) ? BT.HOUSE : BT.ROWHOUSE;
      case Z.RES_HIGH: return land > 0.6 && rng.bool(0.45) ? BT.TOWER_RES : BT.APARTMENT;
      case Z.COMM: return rng.weighted([[BT.SHOP, 5], [BT.RESTAURANT, 3], [BT.MALL, 1.2], [BT.PARKING, 0.5]]);
      case Z.OFFICE: return land > 0.58 && rng.bool(0.42) ? BT.TOWER_OFF : BT.OFFICE;
      case Z.IND: return rng.bool(0.5) ? BT.FACTORY : BT.WAREHOUSE;
      case Z.MIXED: return rng.weighted([[BT.SHOP, 3], [BT.APARTMENT, 4], [BT.RESTAURANT, 2], [BT.OFFICE, 2]]);
      case Z.PARK: return rng.bool(0.7) ? BT.PARK_S : BT.PLAZA;
      default: return BT.HOUSE;
    }
  }

  faceRoad(x, y, w, h) {
    const g = this.world.g;
    let best = 0, bestN = -1;
    const dirs = [[0, 1, 0], [Math.PI / 2, 0, 1], [Math.PI, -1, 0], [-Math.PI / 2, 0, -1]];
    for (const [rot, dx, dy] of dirs) {
      let n = 0;
      for (let k = 0; k < Math.max(w, h); k++) {
        const nx = x + (dx > 0 ? w : dx < 0 ? -1 : k), ny = y + (dy > 0 ? h : dy < 0 ? -1 : k);
        if (inb(nx, ny) && g.kind[idx(nx, ny)] === K.ROAD) n++;
      }
      if (n > bestN) { bestN = n; best = rot; }
    }
    return best;
  }

  // Redevelopment: when demand and land values are high, owners tear down and
  // build bigger. This is how a land-constrained city keeps growing.
  dailyRedevelopment(sim) {
    const g = this.world.g, rng = this.rng, bs = this.world.buildings;
    if (!bs.length) return;
    let examined = 0, changed = 0;
    for (let k = 0; k < 260 && changed < 6; k++) {
      const b = bs[(sim.day * 131 + k * 7919) % bs.length];
      if (!b || b.demolished || b.abandoned || b.construction < 1) continue;
      if (b.landmark || b.zone === Z.CIVIC || b.zone === Z.PARK) continue;
      examined++;
      // Redevelopment follows the zoning on the ground today, not the zoning the
      // building was born under — that is what makes upzoning a real lever.
      const zoneNow = g.zone[idx(b.x, b.y)] || b.zone;
      if (zoneNow === Z.CIVIC || zoneNow === Z.PARK) continue;
      const dem = this.profitFor(zoneNow);
      if (dem < 0.16) continue;
      const land = g.land[idx(b.x, b.y)];
      if (land < 0.42) continue;
      const spec = BUILDING_SPEC[b.type];
      let type = b.type, maxF = spec.floors[1];
      // stock that no longer matches its zoning converts outright
      if (zoneNow === Z.RES_HIGH && (b.type === BT.HOUSE || b.type === BT.ROWHOUSE)) { type = BT.APARTMENT; maxF = BUILDING_SPEC[type].floors[1]; }
      else if (zoneNow === Z.RES_HIGH && b.type === BT.APARTMENT && land > 0.66 && b.floors > 10) { type = BT.TOWER_RES; maxF = BUILDING_SPEC[type].floors[1]; }
      else if (zoneNow === Z.OFFICE && b.type === BT.OFFICE && land > 0.62 && b.floors > 8) { type = BT.TOWER_OFF; maxF = BUILDING_SPEC[type].floors[1]; }
      else if (zoneNow === Z.OFFICE && (b.type === BT.HOUSE || b.type === BT.ROWHOUSE || b.type === BT.SHOP)) { type = BT.OFFICE; maxF = BUILDING_SPEC[type].floors[1]; }
      else if (zoneNow === Z.COMM && (b.type === BT.HOUSE || b.type === BT.ROWHOUSE)) { type = BT.SHOP; maxF = BUILDING_SPEC[type].floors[1]; }
      else if (zoneNow === Z.IND && (b.type === BT.HOUSE || b.type === BT.ROWHOUSE || b.type === BT.SHOP)) { type = BT.WAREHOUSE; maxF = BUILDING_SPEC[type].floors[1]; }
      // Zoning sets the ceiling; land value decides how close to it you build.
      const potential = Math.round(maxF * clamp(0.34 + land * 0.92, 0.22, 1));
      if (b.floors >= potential * 0.92 && type === b.type) continue;
      if (b.age < 6) continue;
      if (!rng.bool(clamp(dem * 0.5, 0.05, 0.5))) continue;
      const newFloors = Math.max(b.floors + 1, Math.round(b.floors + (potential - b.floors) * rng.float(0.4, 0.9)));
      const ns = BUILDING_SPEC[type];
      b.type = type; b.form = ns.form; b.zone = zoneNow;
      b.floors = Math.max(1, Math.min(maxF, newFloors));
      b.height = floorHeight(type) * b.floors + (ns.form === 'tower' ? 6 : 0);
      const area = b.w * b.h;
      b.capacity = Math.round(ns.res * area * b.floors);
      b.jobs = Math.round(ns.jobs * area * b.floors);
      b.powerDemand = ns.power * area * b.floors * 0.1;
      b.waterDemand = ns.water * area * b.floors * 0.1;
      b.wasteOut = ns.waste * area * b.floors * 0.06;
      b.pollution = ns.pol * area * (ns.form === 'factory' ? b.floors : 1);
      b.condition = 1; b.age = 0;
      b.construction = 0.35; b.form = 'construction';
      this.buildQueue.push({ b: b.id, days: clamp(Math.round(4 + b.floors * 0.7), 5, 40) });
      sim.dirtyBuildings.add(b.id);
      changed++;
    }
  }

  // ---------------------------------------------------------------- decay
  dailyDecay(sim) {
    const g = this.world.g, rng = this.rng;
    for (const b of this.world.buildings) {
      if (!b || b.demolished || b.construction < 1) continue;
      const i = idx(b.x, b.y);
      b.age++;
      const stress = (b.powered ? 0 : 0.5) + (b.watered ? 0 : 0.3) + g.crime[i] * 0.3
        + (b.capacity > 0 && b.residents === 0 ? 0.25 : 0)
        + (b.jobs > 0 && b.employed === 0 ? 0.25 : 0)
        + Math.max(0, -this.demandFor(b.zone)) * 0.35;
      b.condition = clamp(b.condition + 0.010 - stress * 0.011, 0, 1);
      if (!b.abandoned && b.condition < 0.10 && rng.bool(0.05)) {
        b.abandoned = true; b.residents = 0; b.employed = 0;
        sim.dirtyBuildings.add(b.id);
        sim.log('decline', `${b.name} has been abandoned`, { building: b.id, bad: true });
      } else if (b.abandoned && b.condition > 0.42) {
        b.abandoned = false;
        sim.dirtyBuildings.add(b.id);
      }
    }
  }

  // ---------------------------------------------------------------- budget
  monthly(sim) {
    const s = sim.stats, p = sim.policies, w = this.world, g = w.g;
    let comRev = 0, indRev = 0, offRev = 0;
    let retailJobs = 0, indJobs = 0, officeJobs = 0;
    for (const b of w.buildings) {
      if (!b || b.demolished || b.abandoned || b.construction < 1) continue;
      const i = idx(b.x, b.y);
      const access = 0.5 + sim.fields.transitAcc[i] * 0.3 + Math.min(0.4, sim.fields.popDens[i] / 12);
      if (b.zone === Z.COMM || b.zone === Z.MIXED) {
        b.revenue = Math.round(b.employed * 5200 * access * this.businessHealth);
        comRev += b.revenue; retailJobs += b.employed;
        b.visitors = Math.round(b.employed * 22 * access);
      } else if (b.zone === Z.IND) {
        b.revenue = Math.round(b.employed * 6100 * (0.7 + sim.traffic.flowIndex * 0.6) * this.businessHealth);
        indRev += b.revenue; indJobs += b.employed;
      } else if (b.zone === Z.OFFICE) {
        b.revenue = Math.round(b.employed * 8600 * access * this.businessHealth);
        offRev += b.revenue; officeJobs += b.employed;
      }
    }
    s.retailJobs = retailJobs; s.indJobs = indJobs; s.officeJobs = officeJobs;

    const incomeBase = s.medianIncome || 42000;
    const resRev = s.population * (incomeBase / 12) * p.taxRes * TAX_BASE;
    const cRev = (comRev + offRev) * p.taxComm * BIZ_TAX_BASE;
    const iRev = indRev * p.taxInd * BIZ_TAX_BASE;
    const fees = s.population * 6.5;
    // Congestion charging is levied on the car trips the traffic model assigns.
    const charge = p.congestionCharge ? (sim.traffic.carTrips || 0) * 9 * 30 * 2.4 : 0;
    const bikeCost = p.bikeNetwork * s.population * 1.3;

    let roadCost = 0;
    for (let i = 0; i < GRID * GRID; i++) if (g.kind[i] === K.ROAD) roadCost += (ROAD_SPEC[g.road[i]] || ROAD_SPEC[RC.STREET]).maint;
    let serviceCost = 0, utilCost = 0, parksCost = 0;
    for (const b of w.buildings) {
      if (!b || b.demolished) continue;
      const up = UPKEEP[b.type];
      if (!up) continue;
      const scale = b.w * b.h / 4;
      if (b.type === BT.POWER || b.type === BT.WATER_PLANT || b.type === BT.WASTE) utilCost += up * Math.max(0.5, scale);
      else if (b.zone === Z.PARK) parksCost += up * b.w * b.h;
      else serviceCost += up * Math.max(0.6, scale) * (1 + p.serviceLevel * 0.55);
    }
    const transitCost = sim.transit.totalOpCost();

    const calib = sim.taxCalib === undefined ? 1 : sim.taxCalib;
    const revenue = (resRev + cRev + iRev + fees) * calib + charge;
    const admin = s.population * 34 * (1 + p.serviceLevel * 0.4);
    const expense = roadCost + serviceCost + utilCost + transitCost + parksCost + admin + bikeCost;
    sim.budget.revenue = Math.round(revenue);
    sim.budget.expense = Math.round(expense);
    sim.budget.breakdown = {
      residentialTax: Math.round(resRev * calib), commercialTax: Math.round(cRev * calib), industrialTax: Math.round(iRev * calib), fees: Math.round(fees * calib),
      roads: Math.round(roadCost), services: Math.round(serviceCost), utilities: Math.round(utilCost),
      transit: Math.round(transitCost + bikeCost), parks: Math.round(parksCost), administration: Math.round(admin),
      congestionCharge: Math.round(charge),
    };
    if (!sim.mode.unlimited) sim.budget.treasury += revenue - expense;
    this.gdp = (comRev + indRev + offRev) * 12 + s.population * incomeBase * 0.55;
    s.gdp = this.gdp;
    // business cycle drifts and responds to conditions
    const target = clamp(1 + (0.06 - s.unemployment) * 1.2 + sim.traffic.flowIndex * 0.25 - p.taxComm * 1.4 + sim.mods.economy, 0.45, 1.7);
    this.businessHealth += (target - this.businessHealth) * 0.16;
    s.businessHealth = this.businessHealth;
  }

  // Migration: the city grows or shrinks based on how good a place it is.
  migrate(sim) {
    const s = sim.stats;
    const bl = this.baseline || { retail: 0.08, ind: 0.06, office: 0.11, jobsRatio: 1 };
    const jobsRatio = s.labourForce > 0 ? s.jobsTotal / s.labourForce : 1;
    const pull = clamp(
      (jobsRatio - 1) * 0.55
      + (s.happiness - 0.55) * 1.5
      + (s.affordability - 0.5) * 0.7
      - s.unemployment * 2.2
      + sim.mods.migration, -0.9, 0.9);
    const room = Math.max(0, s.housingCapacity - s.population);
    let change = Math.round(s.population * pull * 0.012 + (pull > 0 ? Math.min(room * 0.05, 400) * pull : 0));
    if (change > 0) change = Math.min(change, room);
    s.population = Math.max(0, s.population + change);
    s.netMigration = change;
  }
}
