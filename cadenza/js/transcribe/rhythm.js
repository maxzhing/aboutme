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

/* The same list in order of how complicated they are to read, which is the
 * order they are tried in when choosing a grid for a whole phrase. */
const BY_SIMPLICITY = [1, 2, 3, 4, 6, 8, 12, 16];

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
 * How readable a transcription should try to be.
 *
 * The setting that matters is `gain`: how much better a finer grid has to
 * explain the playing before it is worth the extra complication on the page.
 * At the simple end a division has to earn its place convincingly, so a phrase
 * of quavers comes out as quavers; at the precise end small departures are
 * preserved, which is what an expressive performance needs and what makes a
 * plain one look fussy.
 */
export const STYLES = [
  {
    id: 'simple',
    label: 'Simple',
    tip: 'Conventional rhythms, repeated patterns kept consistent, few ties or tuplets.',
    gain: 0.24, tolerance: 0.24, strength: 1, fill: 0.52, merge: true, normalise: true,
  },
  {
    id: 'balanced',
    label: 'Balanced',
    tip: 'The default. Keeps expressive timing that means something, still writes conventionally.',
    gain: 0.14, tolerance: 0.19, strength: 1, fill: 0.40, merge: true, normalise: true,
  },
  {
    id: 'precise',
    label: 'Precise',
    tip: 'Keeps more of how it was actually played. For rubato and free playing.',
    gain: 0.06, tolerance: 0.14, strength: 0.85, fill: 0.28, merge: false, normalise: false,
  },
];

export const styleById = (id) => STYLES.find((s) => s.id === id) || STYLES[1];

/** The share of attacks a division lands on, within tolerance. */
function gridFit(positions, d, tol) {
  if (!positions.length) return 1;
  let hits = 0;
  for (const b of positions) {
    const pos = b * d;
    if (Math.abs(pos - Math.round(pos)) <= tol) hits++;
  }
  return hits / positions.length;
}

/**
 * One grid for the whole phrase.
 *
 * A finer division always explains at least as much as a coarser one, so left
 * to itself the search would always end at the finest available and write a
 * run of quavers as a scatter of demisemiquavers and ties.  The rule is that a
 * finer grid has to explain a good deal more of the playing than the grid
 * already chosen — not merely as much — before it is adopted.  That is the
 * whole of "do not invent complexity", expressed as one number.
 */
function chooseGrid(positions, allowed, tol, gain) {
  const ordered = BY_SIMPLICITY.filter((d) => allowed.includes(d));
  if (!ordered.length) return { division: 4, fit: 0 };
  let best = ordered[0];
  let bestFit = gridFit(positions, best, tol);
  for (const d of ordered.slice(1)) {
    const fit = gridFit(positions, d, tol);
    if (fit > bestFit + gain) { best = d; bestFit = fit; }
  }
  return { division: best, fit: bestFit };
}

/**
 * Fit the notes to the pulse.
 *
 * The phrase decides the grid, not each beat on its own.  A beat is allowed to
 * depart from it — a bar of triplets in a piece of quavers is a real thing —
 * but only when the phrase's own grid plainly cannot account for what happened
 * in that beat and another division plainly can.  Anything less than that and
 * the beat falls in with its neighbours, because a rhythm written five
 * different ways in five bars is wrong even when each bar is defensible.
 */
export function quantise(notes, beat, opts = {}) {
  const style = opts.style || STYLES[1];
  const {
    division = null,
    strength = style.strength,
    tolerance = style.tolerance,
    gain = style.gain,
    divisionWeights = null,
  } = opts;

  const toBeats = (t) => (t - beat.phase) / beat.period;
  const allowed = division ? [division] : DIVISIONS;
  /* A player who works in triplets gets a little more latitude for them. */
  const latitude = (d) => tolerance * (1 + ((divisionWeights && divisionWeights[d]) || 0) * 0.5);

  const attacks = [...new Set(notes.map((n) => Math.round(toBeats(n.start) * 1e4) / 1e4))]
    .sort((a, b) => a - b);
  const global = chooseGrid(attacks, allowed, tolerance, gain);

  const byBeat = new Map();
  for (const n of notes) {
    const idx = Math.max(0, Math.floor(toBeats(n.start) + 1e-9));
    if (!byBeat.has(idx)) byBeat.set(idx, []);
    byBeat.get(idx).push(n);
  }

  /* Where the phrase's grid does not fit a beat, that beat may use its own —
   * but the alternative has to fit where the phrase's grid does not, and it is
   * tried in order of simplicity so a beat never becomes more complicated than
   * it has to be. */
  const beatDivision = new Map();
  for (const [idx, group] of byBeat) {
    const local = group.map((n) => toBeats(n.start) - idx);
    const worst = (d) => Math.max(...local.map((p) => Math.abs(p * d - Math.round(p * d))));
    if (worst(global.division) <= latitude(global.division)) {
      beatDivision.set(idx, { division: global.division, error: worst(global.division) });
      continue;
    }
    let chosen = global.division;
    let chosenErr = worst(global.division);
    for (const d of BY_SIMPLICITY.filter((x) => allowed.includes(x))) {
      const err = worst(d);
      if (err <= latitude(d)) { chosen = d; chosenErr = err; break; }
      if (err < chosenErr) { chosen = d; chosenErr = err; }
    }
    beatDivision.set(idx, { division: chosen, error: chosenErr });
  }

  const out = [];
  for (const n of notes) {
    const raw = toBeats(n.start);
    const idx = Math.max(0, Math.floor(raw + 1e-9));
    const d = (beatDivision.get(idx) || { division: global.division }).division;
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

  /* Lengths, on the same grid as the attacks.
   *
   * Giving releases a finer grid of their own is what turns a run of quavers
   * into dotted semiquavers tied to demisemiquavers: the attacks are right and
   * the ends are measured to a precision nobody played to.  A note ends where
   * the grid says, and if that is the next attack it is simply a quaver. */
  for (const n of out) {
    const raw = toBeats(n.end);
    let d = n.division;
    /* A note much shorter than one step of the grid is a real silence, not a
     * rounding error, and writing it as a full step would throw that silence
     * away.  Only then is the grid refined, and only by halving it, so a
     * staccato quaver becomes a semiquaver and a rest rather than anything
     * stranger. */
    const played = raw - n.beats;
    while (played > 0 && played < 0.62 / d && d < 16) d *= 2;
    let snapped = Math.round(raw * d) / d;
    if (snapped <= n.beats + 1e-9) snapped = n.beats + 1 / d;
    n.endBeats = raw + (snapped - raw) * strength;
    if (n.endBeats <= n.beats + 1e-9) n.endBeats = n.beats + 1 / d;
    n.endDivision = d;
    n.division = Math.max(n.division, 0);
    n.endTicks = Math.max(n.startTicks + Math.round(TPQ / (d * 2)), Math.round(n.endBeats * TPQ));
  }

  const tally = new Map();
  for (const { division: d } of beatDivision.values()) tally.set(d, (tally.get(d) || 0) + 1);
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  return {
    notes: out,
    grid: global,
    compound: ranked.length > 0 && ranked[0][0] % 3 === 0 && ranked[0][0] > 1,
    divisions: ranked,
  };
}

/**
 * Make a repeated rhythm look repeated.
 *
 * A run of evenly spaced notes is one rhythmic idea, and a reader should see
 * one value repeated rather than four values that happen to add up.  Where
 * consecutive attacks are evenly spaced, the notes between them are given the
 * length that most of them already have — which is the length the player was
 * playing.  Nothing moves: the attacks stay where they were quantised to, and
 * only the written lengths are made consistent with each other.
 */
export function normaliseRuns(notes, tolerance = 0.2) {
  const byLine = new Map();
  for (const n of notes) {
    const key = n.staff !== undefined ? `${n.staff}:${n.voice}` : 'all';
    if (!byLine.has(key)) byLine.set(key, []);
    byLine.get(key).push(n);
  }
  for (const line of byLine.values()) {
    const heads = [];
    const seen = new Map();
    for (const n of line.sort((a, b) => a.beats - b.beats)) {
      if (!seen.has(n.beats)) { seen.set(n.beats, []); heads.push(n.beats); }
      seen.get(n.beats).push(n);
    }
    if (heads.length < 3) continue;
    let i = 0;
    while (i < heads.length - 2) {
      const step = heads[i + 1] - heads[i];
      if (step <= 0) { i++; continue; }
      let j = i + 1;
      while (j < heads.length - 1 && Math.abs((heads[j + 1] - heads[j]) - step) < step * 0.12) j++;
      if (j - i >= 2) {
        /* An even run.  Whatever most of its notes last, they all last. */
        const lengths = [];
        for (let k = i; k <= j; k++) {
          for (const n of seen.get(heads[k])) lengths.push(Math.round((n.endBeats - n.beats) * 48));
        }
        lengths.sort((a, b) => a - b);
        const counts = new Map();
        for (const l of lengths) counts.set(l, (counts.get(l) || 0) + 1);
        let modal = lengths[0];
        let most = 0;
        for (const [l, c] of counts) if (c > most || (c === most && l > modal)) { most = c; modal = l; }
        const want = modal / 48;
        /* Only where the note was already close to that length: a genuinely
         * held note in the middle of a run keeps its length. */
        for (let k = i; k <= j; k++) {
          for (const n of seen.get(heads[k])) {
            const had = n.endBeats - n.beats;
            if (Math.abs(had - want) <= Math.max(step * 0.5, tolerance)) {
              n.endBeats = n.beats + want;
              n.endTicks = Math.round(n.endBeats * TPQ);
              n.patterned = true;
            }
          }
        }
        i = j;
      } else i++;
    }
  }
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
