// City events. Every one has a mechanical consequence somewhere else in the
// simulation — a closed road, a burnt-out building, a power deficit, a demand
// shock — never just a line in a feed.
import { GRID, K, Z, BT, RC } from '../core/defs.js';
import { RNG, clamp } from '../core/rng.js';

const idx = (x, y) => y * GRID + x;

let EV_ID = 1;

export class EventSystem {
  constructor(world, seed) {
    this.world = world;
    this.rng = new RNG((seed ^ 0xbeef) >>> 0);
    this.active = [];
    this.feed = [];
    this.lastRoll = -1;
  }

  log(sim, kind, title, opts = {}) {
    const e = {
      id: EV_ID++, kind, title, day: sim.day, minute: sim.minuteOfDay,
      stamp: sim.timeLabelShort(), ...opts,
    };
    this.feed.unshift(e);
    if (this.feed.length > 140) this.feed.length = 140;
    return e;
  }

  dailyRoll(sim) {
    const rng = this.rng;
    const p = sim.policies;
    // base hazard rates, modulated by the state of the city
    const roll = [
      { t: 'accident', p: 0.30 + sim.traffic.overloaded * 1.2 + (sim.weather.rain > 0.3 ? 0.25 : 0) },
      { t: 'fire', p: 0.13 + (1 - sim.stats.fireCover) * 0.35 },
      { t: 'outage', p: sim.stats.powerRatio > 0.94 ? 0.30 : 0.04 },
      { t: 'crime', p: 0.05 + sim.stats.crime * 0.35 },
      { t: 'downturn', p: 0.020 * (sim.economy.businessHealth > 1.25 ? 2 : 1) },
      { t: 'boom', p: 0.024 * (sim.stats.happiness > 0.7 ? 2 : 0.6) },
      { t: 'company', p: 0.030 * clamp(sim.stats.officeJobs / Math.max(1, sim.stats.population) * 8, 0.2, 2.2) },
      { t: 'infra', p: 0.035 + (sim.stats.waterRatio > 0.95 ? 0.1 : 0) },
      { t: 'flood', p: sim.weather.type === 'storm' ? 0.28 : 0 },
      { t: 'roadworks', p: 0.12 },
    ];
    for (const r of roll) if (rng.next() < r.p * 0.55) this.trigger(sim, r.t);
    // resolve running events
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      e.remaining -= 1;
      if (e.remaining <= 0) { this.resolve(sim, e); this.active.splice(i, 1); }
    }
  }

  hourly(sim) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      if (e.hourly) e.hourly(sim, e);
      if (e.hourRemaining !== undefined) {
        e.hourRemaining -= 1;
        if (e.hourRemaining <= 0) { this.resolve(sim, e); this.active.splice(i, 1); }
      }
    }
  }

  pickCongestedRoad(sim) {
    const g = this.world.g;
    let best = -1, bestV = 0;
    for (let k = 0; k < 500; k++) {
      const i = this.rng.int(0, GRID * GRID - 1);
      if (g.kind[i] !== K.ROAD || g.tunnel[i]) continue;
      const v = sim.traffic.congestionAt(i) * this.rng.float(0.5, 1.5);
      if (v > bestV) { bestV = v; best = i; }
    }
    return best;
  }
  pickBuilding(filter) {
    for (let k = 0; k < 600; k++) {
      const b = this.world.buildings[this.rng.int(0, this.world.buildings.length - 1)];
      if (!b || b.demolished || b.construction < 1) continue;
      if (filter && !filter(b)) continue;
      return b;
    }
    return null;
  }

  trigger(sim, type) {
    const rng = this.rng;
    switch (type) {
      case 'accident': {
        const cell = this.pickCongestedRoad(sim);
        if (cell < 0) return;
        sim.traffic.closeRoad(cell, true);
        const mins = rng.int(25, 90);
        const e = { id: EV_ID++, type, cell, hourRemaining: Math.ceil(mins / 60), title: 'Traffic accident', severity: 'warn' };
        this.active.push(e);
        sim.dirtySurface.add(cell);
        this.log(sim, 'accident', `Collision blocking ${sim.roadName(cell)}`, { severity: 'warn', cell, focus: cell,
          why: `${sim.roadName(cell)} was carrying ${Math.round(sim.traffic.vol[cell])} vehicles an hour against a capacity of ${Math.round(sim.net.cap[cell] || 0)}` +
            (sim.weather.rain > 0.3 ? ', on a wet road' : '') + `. Crash risk rises with saturation, and this corridor was over it.`,
          who: `Everyone routed through it for the next ${Math.ceil(mins / 60)} hour${mins > 60 ? 's' : ''} — the assignment will push them onto parallel streets, which will slow too.`,
          action: 'Nothing, this hour. If this road keeps appearing here, it is under-built: upgrade it a class or give the trips a transit alternative.' });
        break;
      }
      case 'fire': {
        const b = this.pickBuilding(bb => !bb.abandoned && bb.zone !== Z.PARK);
        if (!b) return;
        const cover = sim.fields.svcFire[idx(b.x, b.y)];
        b.onFire = 1;
        const hours = Math.max(1, Math.round(rng.float(2, 7) * (1 - cover * 0.7)));
        this.active.push({ id: EV_ID++, type, building: b.id, hourRemaining: hours, severity: 'bad', cover });
        sim.dirtyBuildings.add(b.id);
        this.log(sim, 'fire', `Fire at ${b.name}`, { severity: 'bad', building: b.id, focus: idx(b.x, b.y),
          why: `Fire coverage at this block is ${Math.round(cover * 100)}%. Response time scales with coverage, so this one will burn for about ${hours} hour${hours === 1 ? '' : 's'}.` +
            (cover < 0.35 ? ' Below 35% coverage a fire has a real chance of gutting the building outright.' : ''),
          who: `${b.residents ? b.residents.toLocaleString() + ' residents' : ''}${b.residents && b.employed ? ' and ' : ''}${b.employed ? b.employed.toLocaleString() + ' workers' : ''}${!b.residents && !b.employed ? 'The building itself' : ''} in ${sim.districtName(b.district)}.`,
          action: cover < 0.6 ? 'Build a fire station within reach of this district — coverage here is the direct cause.' : 'Coverage is adequate here; this one was luck.' });
        break;
      }
      case 'outage': {
        const hours = rng.int(2, 9);
        this.active.push({ id: EV_ID++, type, hourRemaining: hours, severity: 'bad', drop: rng.float(0.15, 0.45) });
        sim.mods.powerLoss += 0.3;
        this.log(sim, 'outage', `Power outage — grid overloaded`, { severity: 'bad',
          why: `Demand was ${Math.round(sim.stats.powerDemand)} MW against ${Math.round(sim.stats.powerCapacity)} MW of generation. A grid this close to its ceiling fails when anything moves — a hot evening, a plant down for maintenance.`,
          who: `${Math.round(sim.stats.blackoutFrac * 100)}% of buildings lose supply for the next ${hours} hours. Dark buildings lose output and their residents lose approval.`,
          action: 'Build generation. A power plant adds 3,120 MW for $62M; the outage costs more than that in approval if it repeats.' });
        break;
      }
      case 'crime': {
        const b = this.pickBuilding(bb => bb.zone === Z.COMM || bb.zone === Z.RES_HIGH);
        if (!b) return;
        this.log(sim, 'crime', `Break-in reported near ${b.name}`, { severity: 'warn', building: b.id, focus: idx(b.x, b.y),
          why: `The crime field here is fed by unemployment (${(sim.stats.unemployment * 100).toFixed(1)}%), density and police coverage, which stands at ${Math.round(sim.stats.policeCover * 100)}% city-wide.`,
          who: `${sim.districtName(b.district)} — crime pulls down land value and approval across the whole surrounding block, not just this address.`,
          action: 'A police station covers a fixed radius. Jobs work too: unemployment is the larger term in the field.' });
        sim.mods.happiness = Math.max(-0.14, sim.mods.happiness - 0.010);
        break;
      }
      case 'downturn': {
        const days = rng.int(40, 130);
        this.active.push({ id: EV_ID++, type, remaining: days, severity: 'bad' });
        sim.mods.economy -= 0.30; sim.mods.commDemand -= 0.25; sim.mods.indDemand -= 0.20;
        this.log(sim, 'economy', `Regional economic downturn begins`, { severity: 'bad',
          why: `A regional contraction knocks 30% off business health and cuts commercial and industrial demand. It will run about ${days} days.`,
          who: `Every firm in the city. Expect job losses, weaker retail rents and falling tax revenue on ${sim.stats.jobsTotal.toLocaleString()} jobs.`,
          action: 'Cutting business tax raises developer incentive while it lasts. Test it in the What-If simulator before you commit the revenue.' });
        break;
      }
      case 'boom': {
        const days = rng.int(30, 90);
        this.active.push({ id: EV_ID++, type, remaining: days, severity: 'good' });
        sim.mods.migration += 0.28; sim.mods.resDemand += 0.22;
        this.log(sim, 'economy', `Population boom — people are moving in`, { severity: 'good',
          why: `Inbound migration pressure is up 28% for the next ${days} days, on top of the ${(sim.stats.happiness * 100).toFixed(0)}% approval that attracted it.`,
          who: `Renters first. Vacancy is ${(sim.stats.vacancy * 100).toFixed(1)}% — below about 4% the market has no slack and rents climb.`,
          action: 'Zone housing now, ahead of the arrivals. Supply built after the fact arrives too late to hold rents down.' });
        break;
      }
      case 'company': {
        // A major employer opens: upgrade an office into a headquarters.
        const b = this.pickBuilding(bb => bb.zone === Z.OFFICE && bb.floors > 6);
        if (!b) return;
        const added = Math.round(b.jobs * rng.float(0.35, 0.9));
        b.jobs += added;
        b.name = b.name.replace(/^\S+/, ['Novatech', 'Helios', 'Vertex', 'Kestrel', 'Aurelia', 'Monolith'][rng.int(0, 5)]);
        b.hq = true;
        sim.dirtyBuildings.add(b.id);
        this.log(sim, 'economy', `${b.name} opens HQ — ${added.toLocaleString()} new jobs`, { severity: 'good', building: b.id, focus: idx(b.x, b.y),
          why: `A major employer chose a ${b.floors}-storey office in ${sim.districtName(b.district)}. Office-heavy cities attract these; the odds scale with how much office floorspace you have already built.`,
          who: `${added.toLocaleString()} new positions against ${Math.round(sim.stats.labourForce * sim.stats.unemployment).toLocaleString()} people currently out of work.`,
          action: 'Check the commute into this district — a jobs cluster with no transit is how corridors get saturated.' });
        break;
      }
      case 'infra': {
        const b = this.pickBuilding(bb => bb.type === BT.WATER_PLANT || bb.type === BT.POWER || bb.type === BT.WASTE);
        if (!b) return;
        b.offline = true;
        sim.dirtyBuildings.add(b.id);
        this.active.push({ id: EV_ID++, type, building: b.id, hourRemaining: rng.int(4, 20), severity: 'bad' });
        this.log(sim, 'infra', `${b.name} offline — equipment failure`, { severity: 'bad', building: b.id, focus: idx(b.x, b.y),
          why: `Utility plants fail at a base rate that rises when the network runs near capacity. Water is at ${Math.round(sim.stats.waterRatio * 100)}% and power at ${Math.round(sim.stats.powerRatio * 100)}% of capacity.`,
          who: `This plant's whole share of supply is gone until it is repaired. With no spare headroom, that shortfall lands directly on buildings.`,
          action: 'Redundancy is the fix: capacity above peak demand means one plant going down is an inconvenience, not an outage.' });
        break;
      }
      case 'flood': {
        const g = this.world.g;
        const closed = [];
        for (let k = 0; k < 900 && closed.length < 14; k++) {
          const i = rng.int(0, GRID * GRID - 1);
          if (g.kind[i] !== K.ROAD) continue;
          if (sim.fields.waterDist[i] > 3) continue;
          sim.traffic.closeRoad(i, true); closed.push(i); sim.dirtySurface.add(i);
        }
        if (!closed.length) return;
        this.active.push({ id: EV_ID++, type, cells: closed, hourRemaining: rng.int(4, 14), severity: 'bad' });
        this.log(sim, 'flood', `Flooding on ${closed.length} waterfront road segments`, { severity: 'bad', focus: closed[0],
          why: `The storm put ${closed.length} road cells within three cells of water under water. Low-lying waterfront road floods first, every time.`,
          who: `Anyone whose route crosses the waterfront. Traffic reassigns around the closures, so the effect reaches inland corridors too.`,
          action: 'Roads this close to water will flood again. A parallel inland route, or transit that does not use them, is the durable answer.' });
        break;
      }
      case 'roadworks': {
        const g = this.world.g;
        const cells = [];
        let start = -1;
        for (let k = 0; k < 400 && start < 0; k++) {
          const i = rng.int(0, GRID * GRID - 1);
          if (g.kind[i] === K.ROAD && !g.tunnel[i] && g.road[i] !== RC.HIGHWAY) start = i;
        }
        if (start < 0) return;
        cells.push(start);
        sim.traffic.closeRoad(start, true); sim.dirtySurface.add(start);
        this.active.push({ id: EV_ID++, type, cells, remaining: rng.int(3, 12), severity: 'info' });
        this.log(sim, 'construction', `Roadworks begin on ${sim.roadName(start)}`, { severity: 'info', focus: start,
          why: 'Scheduled resurfacing. The segment is closed to traffic while the work runs.',
          who: `The ${Math.round(sim.traffic.vol[start])} vehicles an hour that used it, now reassigned onto neighbouring streets.`,
          action: 'Nothing to do — it reopens on its own. Watch whether the detour saturates anything.' });
        break;
      }
    }
  }

  resolve(sim, e) {
    switch (e.type) {
      case 'accident': sim.traffic.closeRoad(e.cell, false); sim.dirtySurface.add(e.cell);
        this.log(sim, 'accident', `Road cleared on ${sim.roadName(e.cell)}`, { severity: 'info', focus: e.cell,
          why: 'The wreck has been recovered and the segment is carrying traffic again.',
          who: 'Traffic reassigns back over the next few hours.' }); break;
      case 'fire': {
        const b = this.world.buildings[e.building];
        if (b) {
          b.onFire = 0;
          const destroyed = e.cover < 0.35 && this.rng.bool(0.55);
          if (destroyed) {
            b.abandoned = true; b.condition = 0.05; b.residents = 0; b.employed = 0;
            this.log(sim, 'fire', `${b.name} gutted by fire`, { severity: 'bad', building: b.id, focus: idx(b.x, b.y),
              why: `Fire coverage at this block was only ${Math.round(e.cover * 100)}%. The building is a shell: condition 5%, abandoned, no residents and no jobs.`,
              who: `Everyone who lived or worked here has been displaced, and the surrounding land value falls with an abandoned lot in the middle of it.`,
              action: 'Demolish the shell and let the block redevelop, and put fire cover here before it happens again.' });
          } else {
            b.condition = clamp(b.condition - 0.25, 0.05, 1);
            this.log(sim, 'fire', `Fire at ${b.name} extinguished`, { severity: 'info', building: b.id, focus: idx(b.x, b.y),
              why: `Crews reached it in time. The building lost 25 points of condition and is now at ${Math.round(b.condition * 100)}%.`,
              who: `Its occupants stay put. Damage repair costs the city $40,000.`,
              action: 'Condition decays faster from here. It will need redevelopment sooner than the block around it.' });
          }
          sim.dirtyBuildings.add(b.id);
          if (!sim.mode.unlimited) sim.budget.treasury -= 40000;
        }
        break;
      }
      case 'outage': sim.mods.powerLoss = Math.max(0, sim.mods.powerLoss - 0.3);
        this.log(sim, 'outage', `Power restored`, { severity: 'good',
          why: `Generation is back to ${Math.round(sim.stats.powerCapacity)} MW against demand of ${Math.round(sim.stats.powerDemand)} MW.`,
          who: 'Every building that was being shed is drawing power again.',
          action: sim.stats.powerRatio > 0.9 ? 'The grid is still above 90% of capacity. This will happen again.' : '' }); break;
      case 'downturn': sim.mods.economy += 0.30; sim.mods.commDemand += 0.25; sim.mods.indDemand += 0.20;
        this.log(sim, 'economy', `The downturn has run its course`, { severity: 'good',
          why: 'Business health, commercial demand and industrial demand return to their underlying levels.',
          who: `Firms across the city. Employment stands at ${((1 - sim.stats.unemployment) * 100).toFixed(1)}%.`,
          action: 'Zoned land that sat empty through the downturn will start building now.' }); break;
      case 'boom': sim.mods.migration -= 0.28; sim.mods.resDemand -= 0.22;
        this.log(sim, 'economy', `Migration surge is levelling off`, { severity: 'info',
          why: 'Inbound migration pressure returns to what the city itself earns through jobs, rent and approval.',
          who: `The ${Math.round(sim.stats.population).toLocaleString()} people now here. Vacancy settled at ${(sim.stats.vacancy * 100).toFixed(1)}%.`,
          action: '' }); break;
      case 'infra': { const b = this.world.buildings[e.building]; if (b) { b.offline = false; sim.dirtyBuildings.add(b.id); }
        this.log(sim, 'infra', `Utility service restored`, { severity: 'good', building: e.building,
          why: `${b ? b.name : 'The plant'} is back in service and contributing its full capacity again.`,
          who: 'Everyone downstream of the shortfall.', action: '' }); break; }
      case 'flood': for (const c of e.cells) { sim.traffic.closeRoad(c, false); sim.dirtySurface.add(c); }
        this.log(sim, 'flood', `Floodwaters have receded`, { severity: 'good', focus: e.cells[0],
          why: `All ${e.cells.length} closed waterfront segments are open again.`,
          who: 'Traffic reassigns back onto the waterfront over the next few hours.', action: '' }); break;
      case 'roadworks': for (const c of e.cells) { sim.traffic.closeRoad(c, false); sim.dirtySurface.add(c); }
        this.log(sim, 'construction', `Roadworks complete`, { severity: 'good', focus: e.cells[0],
          why: `${sim.roadName(e.cells[0])} is resurfaced and open.`,
          who: 'The traffic that had been detouring around it.', action: '' }); break;
    }
  }
}
