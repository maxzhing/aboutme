/* Cadenza — what the other hand is doing.
 *
 * The same progression is a hymn, a waltz or a nocturne depending only on how
 * its chords are laid out in time, so the texture is kept separate from the
 * harmony that feeds it.  Two things matter and both are easy to get wrong.
 *
 * The first is register: a chord written wherever its notes happen to fall
 * will jump about the keyboard between bars.  So each chord is voiced near the
 * last one — the same notes, arranged to move as little as possible — which is
 * what a player's hand does without being asked.
 *
 * The second is the bass.  The lowest note is the one that says which chord
 * this is, so it follows the root except where an inversion makes a smoother
 * line, and it never leaps where it could step.
 */

const pcOf = (midi) => ((midi % 12) + 12) % 12;

/**
 * Put a chord where the hand already is.
 *
 * Every arrangement of the chord's notes inside the range is tried, and the
 * one that moves least from the previous chord wins.  Parallel octaves and
 * fifths between the outer parts are given a cost rather than a ban: they are
 * a fault in four-part writing and unremarkable in a guitar strum, and the
 * caller says which this is.
 */
export function voiceChord(pitches, opts) {
  const { range, previous = null, size = 3, bass = null, strict = false } = opts;
  const [lo, hi] = range;
  const pool = [];
  for (let m = lo; m <= hi; m++) if (pitches.includes(pcOf(m))) pool.push(m);
  if (!pool.length) return [];

  /* The bass first: the root, low, and near where the last one was. */
  const rootPc = bass === null ? pitches[0] : bass;
  const prevBass = previous && previous.length ? previous[0] : lo + 7;
  /* Two or three places the bass could go, not one.  Fixing the bass before
   * looking at the upper parts is what makes parallels unavoidable: once the
   * outer pair has been committed to, no arrangement of the middle can undo
   * the fifths between them. */
  const bassOptions = (pool.filter((m) => pcOf(m) === rootPc && m <= lo + 24).length
    ? pool.filter((m) => pcOf(m) === rootPc && m <= lo + 24) : pool)
    .sort((a, b) => Math.abs(a - prevBass) - Math.abs(b - prevBass))
    .slice(0, 3);

  /* Then every reasonable arrangement of the rest, scored.  Searching beats
   * patching: a voicing with a parallel fifth in it cannot always be repaired
   * by swapping two notes, but there is nearly always another arrangement of
   * the same chord that never had one. */
  const wanted = pitches.filter((pc) => pc !== rootPc);
  const need = Math.max(1, Math.min(size - 1, wanted.length));

  const parallelWith = (before, after) => {
    if (!before || before.length < 2 || after.length < 2) return 0;
    let count = 0;
    /* Outer parts are what a listener follows, so those are what is checked. */
    const pairs = [[0, before.length - 1, 0, after.length - 1]];
    for (const [i0, i1, j0, j1] of pairs) {
      const was = ((before[i1] - before[i0]) % 12 + 12) % 12;
      const now = ((after[j1] - after[j0]) % 12 + 12) % 12;
      const moved = after[j1] !== before[i1] && after[j0] !== before[i0];
      const sameWay = Math.sign(after[j1] - before[i1]) === Math.sign(after[j0] - before[i0]);
      if (was === now && (now === 0 || now === 7) && moved && sameWay) count++;
    }
    return count;
  };

  let best = null;
  let bestCost = Infinity;
  let low = bassOptions[0];
  let choices = [];
  const walk = (i, acc) => {
    if (i === choices.length) {
      const voicing = [low, ...acc].sort((a, b) => a - b);
      let cost = 0;
      acc.forEach((m, k) => {
        const was = previous && previous[k + 1] !== undefined ? previous[k + 1] : m;
        cost += Math.abs(m - was);
      });
      cost += Math.abs(low - prevBass) * 0.5;
      /* Voices crossing or piling up in one octave. */
      for (let k = 1; k < voicing.length; k++) {
        const gap = voicing[k] - voicing[k - 1];
        if (gap === 0) cost += 8;
        if (gap > 12) cost += (gap - 12) * 0.4;
      }
      if (strict) cost += parallelWith(previous, voicing) * 60;
      if (cost < bestCost) { bestCost = cost; best = voicing; }
      return;
    }
    for (const m of choices[i]) {
      if (acc.includes(m)) continue;
      walk(i + 1, acc.concat(m));
    }
  };

  for (const option of bassOptions) {
    low = option;
    choices = wanted.slice(0, need).map((pc, i) => {
      const target = previous && previous[i + 1] !== undefined ? previous[i + 1] : low + 5 + i * 4;
      return pool.filter((m) => pcOf(m) === pc && m > low)
        .sort((a, b) => Math.abs(a - target) - Math.abs(b - target))
        .slice(0, 3);
    });
    if (choices.some((c) => !c.length)) continue;
    walk(0, []);
  }
  return best || [bassOptions[0], ...pool.filter((m) => m > bassOptions[0]).slice(0, need)];
}

/**
 * Lay one chord out across one bar.
 *
 * Returns [{ midi, beat, beats }] with beats measured from the start of the
 * bar.  Every pattern fills the bar exactly; nothing here decides harmony.
 */
export function layOut(style, voicing, beatsPerBar, opts = {}) {
  const { r = Math.random, last = false } = opts;
  const out = [];
  const add = (midi, beat, beats) => out.push({ midi, beat, beats });
  const [bass, ...upper] = voicing;
  const chord = upper.length ? upper : [bass];

  switch (style) {
    case 'block':
      for (const m of voicing) add(m, 0, beatsPerBar);
      break;

    case 'chorale': {
      /* One chord to a beat, so the part-writing is audible. */
      for (let b = 0; b < beatsPerBar; b++) for (const m of voicing) add(m, b, 1);
      break;
    }

    case 'waltz': {
      add(bass, 0, 1);
      for (let b = 1; b < beatsPerBar; b++) for (const m of chord) add(m, b, 1);
      break;
    }

    case 'alberti': {
      /* Low, high, middle, high — the figure that keeps a chord sounding while
       * leaving the tune room above it.  In quavers, because the pattern has
       * to divide the bar into values that can be written. */
      const order = [bass, chord[chord.length - 1], chord[0], chord[chord.length - 1]];
      const step = 0.5;
      const count = Math.round(beatsPerBar / step);
      for (let i = 0; i < count; i++) {
        const m = order[i % order.length];
        add(m === undefined ? bass : m, i * step, step);
      }
      break;
    }

    case 'arpeggio': {
      /* Up and back down, in quavers.  Dividing the bar by however many notes
       * the chord happens to have is what produces durations no one can read:
       * five notes to a bar is a quintuplet, and nobody asked for one. */
      const step = 0.5;
      const count = Math.round(beatsPerBar / step);
      const cycle = [bass, ...chord];
      const span = Math.max(1, cycle.length * 2 - 2);
      for (let i = 0; i < count; i++) {
        const k = i % span;
        const m = cycle[k < cycle.length ? k : span - k];
        add(m === undefined ? bass : m, i * step, step);
      }
      break;
    }

    case 'walking': {
      /* One note a beat, mostly stepping: a bass line rather than a chord. */
      const tones = voicing.slice();
      for (let b = 0; b < beatsPerBar; b++) {
        const m = b === 0 ? bass : tones[Math.min(tones.length - 1, b % tones.length)];
        add(m, b, 1);
      }
      break;
    }

    case 'wide': {
      /* The left hand of a nocturne or a ballade: a low bass note, then the
       * chord climbing away above it across two octaves and settling back.
       * The hand is open and moving the whole time, which is what keeps the
       * texture alive under a slow tune — a block chord under the same melody
       * sounds like an accompaniment, this sounds like the piece. */
      const step = 0.5;
      const count = Math.round(beatsPerBar / step);
      /* Each note lasts exactly its own step.  Letting them overlap to sound
       * more sustained seems harmless and is not: a note eight tenths of a
       * beat long starting every half beat is a duration no notation can
       * express, and the engraver has to write it as a tie between values
       * nobody can read.  Sustain belongs to the pedal and the instrument,
       * not to the written length. */
      const spread = [bass];
      for (const m of chord) spread.push(m);
      for (const m of chord) if (m + 12 <= 84) spread.push(m + 12);
      const span = Math.max(2, spread.length);
      for (let i = 0; i < count; i++) {
        const k = i % (span * 2 - 2);
        const m = spread[k < span ? k : span * 2 - 2 - k];
        add(m === undefined ? bass : m, i * step, step);
      }
      break;
    }

    case 'filigree': {
      /* Faster and lighter: the same idea in semiquavers, high enough to
       * shimmer rather than to support. */
      const step = 0.25;
      const count = Math.round(beatsPerBar / step);
      const line = [bass, ...chord, ...chord.map((m) => m + 12).filter((m) => m <= 88)];
      for (let i = 0; i < count; i++) {
        const k = i % Math.max(1, line.length);
        add(line[k] === undefined ? bass : line[k], i * step, step);
      }
      break;
    }

    case 'sustained':
    default:
      for (const m of voicing) add(m, 0, beatsPerBar);
      break;
  }

  /* The last bar of a piece is held, whatever the pattern was doing. */
  if (last) {
    return voicing.map((m) => ({ midi: m, beat: 0, beats: beatsPerBar }));
  }
  return out;
}

export const TEXTURES = {
  wide: 'Wide broken chords',
  filigree: 'Running figuration',
  block: 'Block chords',
  chorale: 'Four-part chorale',
  waltz: 'Waltz accompaniment',
  alberti: 'Alberti bass',
  arpeggio: 'Broken chords',
  walking: 'Walking bass',
  sustained: 'Sustained chords',
};
