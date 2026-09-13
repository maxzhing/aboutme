/* Cadenza — finding the beat, and fitting what was played to it.
 *
 * A list of notes with times in seconds is not yet music.  Someone played
 * them at some tempo, in some metre, and a little ahead of or behind the beat
 * as players do.  This works out the pulse, then writes the performance onto
 * it — but only as far as the evidence goes.  Snapping every onset to the
 * nearest sixteenth turns a triplet into a limp, and turns a phrase that was
 * deliberately held back into a wrong rhythm.  So each beat gets the coarsest
 * division that actually accounts for what happened inside it, and anything
 * that fits no division is kept as it was and marked uncertain rather than
 * forced.
 */

import { TPQ } from '../core/rhythm.js';

const MIN_PERIOD = 0.22;   // ~272 bpm
const MAX_PERIOD = 1.5;    // 40 bpm
const PREFERRED = 0.5;     // 120 bpm: where listeners hear the beat by default

/** A smooth curve that peaks wherever notes begin. */
function pulseTrain(events, duration, rate = 200) {
  const n = Math.max(1, Math.ceil(duration * rate));
  const out = new Float64Array(n);
  const spread = Math.round(0.02 * rate);
  for (const e of events) {
    const c = Math.round(e.time * rate);
    for (let k = -spread * 2; k <= spread * 2; k++) {
      const i = c + k;
      if (i < 0 || i >= n) continue;
      out[i] += e.weight * Math.exp(-(k * k) / (2 * spread * spread));
    }
  }
  return { curve: out, rate };
}

/**
 * How strongly the performance repeats at each candidate period.
 *
 * Autocorrelation alone prefers short periods, since every beat is also a
 * half-beat; the preference curve pulls the answer back towards the rate a
 * listener would tap, which is what a tempo marking is supposed to mean.
 */
function tempogram({ curve, rate }) {
  const lo = Math.round(MIN_PERIOD * rate);
  const hi = Math.min(Math.round(MAX_PERIOD * rate), Math.floor(curve.length / 2));
  const out = [];
  for (let lag = lo; lag <= hi; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < curve.length; i++) sum += curve[i] * curve[i + lag];
    const period = lag / rate;
    const bias = Math.exp(-Math.pow(Math.log(period / PREFERRED) / 0.9, 2) / 2);
    out.push({ period, score: (sum / (curve.length - lag)) * bias });
  }
  return out;
}

/** How well a pulse of this period and phase lines up with the attacks. */
function alignment(events, period, phase, sigma = 0.05) {
  let hit = 0;
  let total = 0;
  for (const e of events) {
    const k = Math.round((e.time - phase) / period);
    const d = e.time - (phase + k * period);
    hit += e.weight * Math.exp(-(d * d) / (2 * sigma * sigma));
    total += e.weight;
  }
  return total ? hit / total : 0;
}

/**
 * The share of beats that carry a note.
 *
 * A pulse at twice the real tempo lines up with every attack just as well as
 * the real one — it simply has an empty beat between each pair.  Counting the
 * empty ones is what tells the two apart, and it is why a slow piece is not
 * written out at double speed.
 */
function occupancy(events, period, phase) {
  if (!events.length) return 0;
  const index = (t) => Math.round((t - phase) / period);
  const first = index(events[0].time);
  const last = index(events[events.length - 1].time);
  const span = Math.max(1, last - first + 1);
  const filled = new Set();
  for (const e of events) {
    const k = index(e.time);
    if (Math.abs(e.time - (phase + k * period)) < period * 0.25) filled.add(k);
  }
  return Math.min(1, filled.size / span);
}

/** Where the first beat falls, given a period. */
function bestPhase(events, period) {
  let best = { phase: 0, score: -1 };
  const steps = 48;
  for (let i = 0; i < steps; i++) {
    const phase = (i / steps) * period;
    const score = alignment(events, period, phase);
    if (score > best.score) best = { phase, score };
  }
  /* Refine against the onsets themselves so the grid starts on a real note. */
  for (const e of events) {
    const k = Math.round((e.time - best.phase) / period);
    const phase = e.time - k * period;
    const score = alignment(events, period, phase);
    if (score > best.score) best = { phase, score };
  }
  return best;
}

/**
 * Estimate the pulse.
 * Returns { period, bpm, phase, confidence }.
 */
export function estimateBeat(events, duration, opts = {}) {
  const { fixedBpm = null } = opts;
  if (!events.length) return { period: PREFERRED, bpm: 120, phase: 0, confidence: 0 };
  if (fixedBpm) {
    const period = 60 / fixedBpm;
    const { phase, score } = bestPhase(events, period);
    return { period, bpm: fixedBpm, phase, confidence: score };
  }

  const grid = tempogram(pulseTrain(events, duration));
  let peak = grid[0];
  for (const g of grid) if (g.score > peak.score) peak = g;

  /* A pulse and its half and double all correlate; decide between them by how
   * well each explains where the notes actually fell. */
  const options = [peak.period / 2, peak.period, peak.period * 2]
    .filter((p) => p >= MIN_PERIOD && p <= MAX_PERIOD);
  let best = null;
  for (const period of options) {
    const { phase, score } = bestPhase(events, period);
    const bias = Math.exp(-Math.pow(Math.log(period / PREFERRED) / 0.9, 2) / 2);
    const full = occupancy(events, period, phase);
    const total = score * (0.55 + 0.45 * bias) * (0.65 + 0.35 * full);
    if (!best || total > best.total) best = { period, phase, score, total };
  }

  const bpm = Math.round((60 / best.period) * 10) / 10;
  return { period: best.period, bpm, phase: best.phase, confidence: best.score };
}

/* ------------------------------------------------------------------ metre */

const METRES = [
  { beats: 4, ts: { beats: 4, beatType: 4, symbol: 'common' }, compound: false },
  { beats: 3, ts: { beats: 3, beatType: 4, symbol: null }, compound: false },
  { beats: 2, ts: { beats: 2, beatType: 4, symbol: null }, compound: false },
  { beats: 2, ts: { beats: 6, beatType: 8, symbol: null }, compound: true },
  { beats: 3, ts: { beats: 9, beatType: 8, symbol: null }, compound: true },
  { beats: 4, ts: { beats: 12, beatType: 8, symbol: null }, compound: true },
];

/**
 * Choose a time signature.
 *
 * Downbeats are heavier and carry more notes than the beats around them, so
 * the bar length is the one whose first beat stands out most from the rest.
 */
export function estimateMetre(events, beat, compound) {
  const accent = new Map();
  let longest = 0;
  let lowest = Infinity;
  let highest = -Infinity;
  for (const e of events) {
    longest = Math.max(longest, e.length || 0);
    lowest = Math.min(lowest, e.low === undefined ? 60 : e.low);
    highest = Math.max(highest, e.low === undefined ? 60 : e.low);
  }
  const range = Math.max(1, highest - lowest);
  for (const e of events) {
    const b = Math.round((e.time - beat.phase) / beat.period);
    if (b < 0) continue;
    /* Three things mark a downbeat: more notes struck, longer notes, and the
     * bass moving.  Loudness alone is not enough — a performance played evenly
     * still has a metre, and it shows up in these. */
    const len = longest > 0 ? Math.min(1, (e.length || 0) / longest) : 0;
    const bass = e.low === undefined ? 0 : 1 - (e.low - lowest) / range;
    const w = e.weight * (1 + 0.6 * len + 0.45 * bass);
    accent.set(b, (accent.get(b) || 0) + w);
  }
  const beatsSeen = Math.max(0, ...accent.keys()) + 1;

  let best = null;
  for (const m of METRES) {
    if (m.compound !== compound) continue;
    if (beatsSeen < m.beats * 2) continue;
    const buckets = new Array(m.beats).fill(0);
    const counts = new Array(m.beats).fill(0);
    for (let b = 0; b < beatsSeen; b++) {
      buckets[b % m.beats] += accent.get(b) || 0;
      counts[b % m.beats]++;
    }
    const mean = buckets.map((v, i) => v / (counts[i] || 1));
    const rest = mean.slice(1).reduce((a, v) => a + v, 0) / Math.max(1, m.beats - 1);
    const contrast = rest > 0 ? mean[0] / rest : 1;
    /* Music comes in whole bars.  A bar length that leaves a fragment over at
     * the end is usually the wrong bar length. */
    const over = beatsSeen % m.beats;
    const whole = over === 0 ? 1 : 1 - Math.min(over, m.beats - over) / m.beats * 0.35;
    /* Four beats wins ties: it is what most music is in, and a bar of four
     * read as two bars of two is a worse error than the other way round. */
    const common = m.beats === 4 ? 1.15 : m.beats === 3 ? 1 : 0.95;
    const score = contrast * whole * common;
    if (!best || score > best.score) best = { ...m, score, contrast };
  }
  const fallback = METRES.find((m) => m.compound === compound && m.beats === 4) || METRES[0];
  const chosen = best || { ...fallback, contrast: 1 };
  return {
    timeSig: chosen.ts,
    beatsPerBar: chosen.beats,
    confidence: Math.max(0, Math.min(1, (chosen.contrast - 1) / 0.6)),
  };
}

/* ----------------------------------------------------------- quantisation */

/* Divisions of one beat we are willing to write down, simplest first. */
const DIVISIONS = [1, 2, 4, 3, 8, 6, 16, 12];

export const GRID_PRESETS = [
  { id: 'auto', label: 'Automatic', division: null },
  { id: '4', label: 'Quarter', division: 1 },
  { id: '8', label: 'Eighth', division: 2 },
  { id: '8t', label: 'Eighth triplet', division: 3 },
  { id: '16', label: 'Sixteenth', division: 4 },
  { id: '16t', label: 'Sixteenth triplet', division: 6 },
  { id: '32', label: 'Thirty-second', division: 8 },
];

/**
 * Fit the notes to the pulse.
 *
 * Each beat is examined on its own and given the simplest division that
 * accounts for every attack inside it.  A beat with notes a third of the way
 * through is a triplet beat whatever its neighbours are doing, and a beat
 * whose notes fit nowhere keeps its measured timing and says so, because a
 * wrong rhythm written confidently is harder to repair than a right one
 * written in an awkward place.
 */
export function quantise(notes, beat, opts = {}) {
  const {
    division = null,      // force a division, or null to choose per beat
    strength = 1,         // 0 leaves the performance alone, 1 fits it fully
    tolerance = 0.16,     // how far off a grid point an attack may be, in divisions
    divisionWeights = null,   // divisions this player has needed before
  } = opts;
  /* A player who works in triplets gets a little more latitude for them, so a
   * beat that is nearly but not quite in threes is read the way they play
   * rather than as a stumble.  It is latitude, not a decision: a beat that is
   * plainly in twos still comes out in twos. */
  const latitude = (d) => tolerance * (1 + ((divisionWeights && divisionWeights[d]) || 0) * 0.5);

  const toBeats = (t) => (t - beat.phase) / beat.period;
  const allowed = division ? [division] : DIVISIONS;

  /* The simplest division that accounts for every attack inside one beat. */
  const fitBeat = (group, idx, scale = 1) => {
    let chosen = allowed[allowed.length - 1];
    let chosenErr = Infinity;
    for (const d of allowed) {
      let worst = 0;
      for (const n of group) {
        const pos = (toBeats(n.start) - idx) * d;
        worst = Math.max(worst, Math.abs(pos - Math.round(pos)));
      }
      if (worst <= latitude(d) * scale) return { division: d, error: worst };
      if (worst < chosenErr) { chosen = d; chosenErr = worst; }
    }
    return { division: chosen, error: chosenErr };
  };

  const byBeat = new Map();
  for (const n of notes) {
    const idx = Math.max(0, Math.floor(toBeats(n.start) + 1e-9));
    if (!byBeat.has(idx)) byBeat.set(idx, []);
    byBeat.get(idx).push(n);
  }

  const beatDivision = new Map();
  for (const [idx, group] of byBeat) beatDivision.set(idx, fitBeat(group, idx));

  /* A division that appears in one beat and nowhere else is more often a
   * stumble than a triplet, so a beat is allowed to fall in with its
   * neighbours when their division explains it nearly as well. */
  const tally = new Map();
  for (const { division: d } of beatDivision.values()) tally.set(d, (tally.get(d) || 0) + 1);
  for (const [idx, info] of beatDivision) {
    if ((tally.get(info.division) || 0) > 1) continue;
    for (const [d, count] of [...tally].sort((a, b) => b[1] - a[1])) {
      if (count < 2 || d === info.division) continue;
      const alt = fitBeat(byBeat.get(idx), idx, 1.6);
      if (alt.division === d) { beatDivision.set(idx, alt); break; }
      let worst = 0;
      for (const n of byBeat.get(idx)) {
        const pos = (toBeats(n.start) - idx) * d;
        worst = Math.max(worst, Math.abs(pos - Math.round(pos)));
      }
      if (worst <= tolerance * 1.6) { beatDivision.set(idx, { division: d, error: worst }); break; }
    }
  }

  const out = [];
  for (const n of notes) {
    const raw = toBeats(n.start);
    const idx = Math.max(0, Math.floor(raw + 1e-9));
    const d = (beatDivision.get(idx) || { division: 4 }).division;
    const snapped = Math.round(raw * d) / d;
    const drift = Math.abs(raw - snapped) * d;
    const beats = Math.max(0, raw + (snapped - raw) * strength);
    out.push({
      ...n,
      beats,
      startTicks: Math.round(beats * TPQ),
      division: d,
      rhythmConfidence: Math.max(0, Math.min(1, 1 - (drift / tolerance) * 0.8)),
    });
  }

  /* Lengths, fitted the same way.  Where a note is released needs its own
   * division: a beat holding one staccato quaver has a single attack, so its
   * attacks are fitted to the beat itself, but writing the note as filling the
   * whole beat would lose the silence the player left after it. */
  /* Releases are written no finer than this.  Where a note stops is not a
   * rhythmic event the way an attack is — a player lets go when the next note
   * needs the finger — so reading a release to the nearest thirty-second finds
   * a rhythm nobody played, and reading it as a triplet is worse still. */
  const releaseLimit = (beatDiv) => Math.max(beatDiv, 4);
  for (const n of out) {
    const raw = toBeats(n.end);
    let d = n.division;
    let snapped = Math.round(raw * d) / d;
    if (Math.abs(raw - snapped) * d > tolerance) {
      const limit = releaseLimit(n.division);
      let bestErr = Math.abs(raw - snapped) * d;
      for (const cand of allowed) {
        if (cand > limit) continue;
        const s = Math.round(raw * cand) / cand;
        const err = Math.abs(raw - s) * cand;
        if (err <= tolerance) { d = cand; snapped = s; bestErr = err; break; }
        if (err < bestErr) { d = cand; snapped = s; bestErr = err; }
      }
    }
    const step = 1 / Math.max(d, n.division);
    if (snapped <= n.beats + 1e-9) snapped = n.beats + step;
    n.endBeats = Math.max(n.beats + step * 0.5, raw + (snapped - raw) * strength);
    n.endDivision = Math.max(d, n.division);
    n.endTicks = Math.max(n.startTicks + Math.round((TPQ * step) / 2),
      Math.round(n.endBeats * TPQ));
  }

  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  return {
    notes: out,
    /* Compound metre is a property of how the beat divides, not of the tempo. */
    compound: ranked.length > 0 && ranked[0][0] % 3 === 0 && ranked[0][0] > 1,
    divisions: ranked,
  };
}

/** Onset events for the beat estimator, one per simultaneity. */
export function attackEvents(notes) {
  const groups = [];
  for (const n of [...notes].sort((a, b) => a.start - b.start)) {
    const last = groups[groups.length - 1];
    if (last && n.start - last.time < 0.045) {
      last.weight += n.velocity / 127;
      last.time = (last.time * last.count + n.start) / (last.count + 1);
      last.low = Math.min(last.low, n.midi);
      last.length = Math.max(last.length, n.end - n.start);
      last.count++;
    } else {
      groups.push({
        time: n.start,
        weight: n.velocity / 127,
        low: n.midi,
        length: n.end - n.start,
        count: 1,
      });
    }
  }
  return groups;
}

/**
 * Convert quantised positions from beats to ticks.
 *
 * The beat is whatever the player was feeling — a quarter in 4/4, a dotted
 * quarter in 6/8 — so this is done once the metre is known rather than
 * assuming every beat is a quarter note.
 */
export function toTicks(notes, ticksPerBeat) {
  for (const n of notes) {
    n.startTicks = Math.max(0, Math.round(n.beats * ticksPerBeat));
    const fine = Math.max(n.division, n.endDivision || n.division);
    n.endTicks = Math.max(n.startTicks + Math.round(ticksPerBeat / (fine * 2)),
      Math.round(n.endBeats * ticksPerBeat));
  }
  return notes;
}
