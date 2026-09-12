/* Cadenza — durations, meter and beam grouping.
 *
 * Everything is measured in ticks.  960 per quarter divides evenly by 2, 3, 5
 * and 7, so triplets, quintuplets and septuplets all land on whole numbers
 * down to 64th notes.
 */

export const TPQ = 960;
export const TPW = TPQ * 4;

export const DURATIONS = [
  { id: 'breve', ticks: TPW * 2, beams: 0, stem: false, label: 'Breve' },
  { id: 'whole', ticks: TPW, beams: 0, stem: false, label: 'Whole' },
  { id: 'half', ticks: TPW / 2, beams: 0, stem: true, label: 'Half' },
  { id: 'quarter', ticks: TPW / 4, beams: 0, stem: true, label: 'Quarter' },
  { id: 'eighth', ticks: TPW / 8, beams: 1, stem: true, label: 'Eighth' },
  { id: '16th', ticks: TPW / 16, beams: 2, stem: true, label: 'Sixteenth' },
  { id: '32nd', ticks: TPW / 32, beams: 3, stem: true, label: 'Thirty-second' },
  { id: '64th', ticks: TPW / 64, beams: 4, stem: true, label: 'Sixty-fourth' },
  { id: '128th', ticks: TPW / 128, beams: 5, stem: true, label: 'Hundred-twenty-eighth' },
];

const BY_ID = Object.fromEntries(DURATIONS.map((d) => [d.id, d]));

export function durationInfo(id) {
  return BY_ID[id] || BY_ID.quarter;
}

/** Ticks occupied by a duration, including dots and any tuplet ratio. */
export function durationTicks(id, dots = 0, tuplet = null) {
  const base = durationInfo(id).ticks;
  let t = base * (2 - Math.pow(2, -dots));
  if (tuplet) t = (t * tuplet.normal) / tuplet.actual;
  return Math.round(t);
}

/** The largest single (possibly dotted) duration that fits exactly in `ticks`. */
export function durationForTicks(ticks) {
  for (const d of DURATIONS) {
    for (let dots = 0; dots <= 2; dots++) {
      if (Math.round(d.ticks * (2 - Math.pow(2, -dots))) === ticks) {
        return { id: d.id, dots };
      }
    }
  }
  return null;
}

/**
 * Split an arbitrary span into notatable durations, respecting the beat grid
 * so that ties break where a reader expects them to.
 */
export function splitIntoDurations(ticks, startTick, timeSig) {
  const out = [];
  let pos = startTick;
  let left = ticks;
  const beat = beatTicks(timeSig);
  let guard = 0;
  while (left > 0 && guard++ < 64) {
    /* Never cross the next beat boundary with a note that started mid-beat. */
    const toBeat = beat - (pos % beat) || beat;
    let span = Math.min(left, pos % beat === 0 ? left : toBeat);
    let chosen = null;
    while (span > 0) {
      chosen = durationForTicks(span);
      if (chosen && (pos % span === 0 || span <= beat)) break;
      chosen = null;
      span -= 1;
      /* Step down to the next representable value rather than scanning. */
      const next = DURATIONS.find((d) => d.ticks <= span);
      span = next ? Math.min(span, next.ticks * 2 - 1) : 0;
    }
    if (!chosen) {
      const d = DURATIONS.find((x) => x.ticks <= left);
      if (!d) break;
      chosen = { id: d.id, dots: 0 };
      span = d.ticks;
    }
    out.push(chosen);
    pos += span;
    left -= span;
  }
  return out;
}

/* ------------------------------------------------------------- time signature */

export function timeSig(beats, beatType, symbol = null) {
  return { beats, beatType, symbol };
}

export function measureTicks(ts) {
  return Math.round((TPW * ts.beats) / ts.beatType);
}

export function isCompound(ts) {
  return ts.beatType >= 8 && ts.beats % 3 === 0 && ts.beats > 3;
}

/** Length of one felt beat: a dotted value in compound meters. */
export function beatTicks(ts) {
  const unit = TPW / ts.beatType;
  return isCompound(ts) ? unit * 3 : unit;
}

export function beatCount(ts) {
  return measureTicks(ts) / beatTicks(ts);
}

export const TIME_SIG_PRESETS = [
  { beats: 4, beatType: 4, symbol: 'common', label: 'Common time (4/4)' },
  { beats: 2, beatType: 2, symbol: 'cut', label: 'Cut time (2/2)' },
  { beats: 2, beatType: 4, label: '2/4' },
  { beats: 3, beatType: 4, label: '3/4' },
  { beats: 4, beatType: 4, label: '4/4' },
  { beats: 5, beatType: 4, label: '5/4' },
  { beats: 6, beatType: 4, label: '6/4' },
  { beats: 3, beatType: 8, label: '3/8' },
  { beats: 6, beatType: 8, label: '6/8' },
  { beats: 7, beatType: 8, label: '7/8' },
  { beats: 9, beatType: 8, label: '9/8' },
  { beats: 12, beatType: 8, label: '12/8' },
  { beats: 2, beatType: 2, label: '2/2' },
  { beats: 3, beatType: 2, label: '3/2' },
];

/* ---------------------------------------------------------- beam grouping */

/**
 * Tick offsets at which a new beam group starts.  Follows the usual
 * conventions: halves in 4/4, one group per dotted beat in compound meters,
 * one per beat otherwise.
 */
export function beamGroups(ts) {
  const total = measureTicks(ts);
  const groups = [];
  let size;
  if (isCompound(ts)) {
    size = beatTicks(ts);
  } else if (ts.beatType === 4 && ts.beats % 2 === 0 && ts.beats >= 4) {
    size = TPQ * 2; // 4/4, 6/4 -> beam in half-bar units
  } else if (ts.beatType === 2) {
    size = TPQ * 2;
  } else if (ts.beatType === 8) {
    size = (TPW / 8) * 3;
  } else {
    size = beatTicks(ts);
  }
  for (let t = 0; t < total; t += size) groups.push({ start: t, end: Math.min(t + size, total) });
  return groups;
}

/**
 * Assign beam membership to a voice's events.
 * Returns an array of groups, each a list of event indices to beam together.
 */
export function computeBeams(events, ts) {
  const groups = beamGroups(ts);
  const result = [];
  let current = [];
  let currentGroup = -1;

  const flush = () => {
    if (current.length > 1) result.push(current);
    current = [];
  };

  let tick = 0;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const len = eventTicks(ev);
    const info = durationInfo(ev.duration);
    const beamable = ev.type === 'note' && info.beams > 0 && !ev.grace;
    const g = groups.findIndex((x) => tick >= x.start && tick < x.end);
    if (!beamable || g !== currentGroup) flush();
    if (beamable) {
      currentGroup = g;
      current.push(i);
    } else {
      currentGroup = -1;
    }
    tick += len;
  }
  flush();
  return result;
}

export function eventTicks(ev) {
  /* A whole-bar rest is drawn as a semibreve whatever the meter, so its length
   * is the bar's, not the one its written value would imply. */
  if (ev.fullMeasure && ev.barTicks) return ev.barTicks;
  return durationTicks(ev.duration, ev.dots || 0, ev.tuplet || null);
}

/**
 * How many beams each note in a group carries, and where secondary beams
 * break.  Secondary beams break at the next lower metric level so that 16ths
 * inside a beat stay visually grouped.
 */
export function beamLevels(events, indices, startTick, ts) {
  const beat = beatTicks(ts);
  const sub = beat / 2;
  const levels = [];
  let tick = startTick;
  for (let k = 0; k < indices.length; k++) {
    const idx = indices[k];
    const ev = events[idx];
    levels.push({ index: idx, beams: durationInfo(ev.duration).beams, tick });
    tick += eventTicks(ev);
  }
  for (let k = 0; k < levels.length; k++) {
    const prev = levels[k - 1];
    const cur = levels[k];
    cur.breakBefore = 1;
    if (prev) {
      const shared = Math.min(prev.beams, cur.beams);
      /* Beams above the first only continue while we stay inside a subdivision. */
      const crossesBeat = Math.floor(cur.tick / beat) !== Math.floor(prev.tick / beat);
      const crossesSub = Math.floor(cur.tick / sub) !== Math.floor(prev.tick / sub);
      cur.continued = crossesBeat ? 1 : crossesSub ? Math.min(shared, 2) : shared;
    }
  }
  return levels;
}

/* ----------------------------------------------------------------- tuplets */

export const TUPLET_PRESETS = [
  { actual: 3, normal: 2, label: 'Triplet' },
  { actual: 5, normal: 4, label: 'Quintuplet' },
  { actual: 6, normal: 4, label: 'Sextuplet' },
  { actual: 7, normal: 4, label: 'Septuplet' },
  { actual: 9, normal: 8, label: 'Nonuplet' },
  { actual: 2, normal: 3, label: 'Duplet' },
  { actual: 4, normal: 3, label: 'Quadruplet' },
];
