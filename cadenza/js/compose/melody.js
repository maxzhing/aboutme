/* Cadenza — the tune.
 *
 * A melody is not a walk through the chord tones.  What makes a line sound
 * composed rather than generated is the shape of it: it moves mostly by step,
 * it fills a leap by turning back, it saves its highest note for one place and
 * goes there once, and it arrives at the cadence by step rather than landing
 * on the tonic from nowhere.  Those are the rules here, and they are applied
 * as costs rather than prohibitions, so the line has somewhere to go when they
 * conflict.
 *
 * The harmony decides which notes are available; this decides which of them
 * the tune actually wants.  Chord tones fall on strong beats, and the notes
 * between them are passing and neighbour notes — the same distinction a
 * listener makes without being told.
 */

const pcOf = (midi) => ((midi % 12) + 12) % 12;

/** Every pitch of a set within a range, nearest first to a given centre. */
function candidates(pitchClasses, lo, hi) {
  const out = [];
  for (let m = lo; m <= hi; m++) if (pitchClasses.includes(pcOf(m))) out.push(m);
  return out;
}

/**
 * What it costs for the line to go from `from` to `to` at this moment.
 *
 * Every term is a way a tune can go wrong.  Steps are free, leaps are not, a
 * leap that follows a leap in the same direction is worse still, and a note
 * that is not in the chord on a beat that carries the harmony is worst of all
 * unless it is passing between two notes that are.
 */
function cost(from, to, prev, ctx) {
  const { chordTones, scaleTones, strong, centre, climax, atClimax, span } = ctx;
  const leap = Math.abs(to - from);
  let c = 0;

  if (leap === 0) c += 2.5;                       // a repeated note says nothing
  else if (leap <= 2) c += 0;                     // stepwise: the default
  else if (leap <= 4) c += 1.2;
  else if (leap <= 7) c += 2.6;
  else if (leap <= 12) c += 5;
  else c += 14;                                   // more than an octave: almost never

  /* A leap is answered by a step the other way; two leaps the same way run the
   * line out of range and out of shape. */
  if (prev !== null) {
    const before = from - prev;
    const now = to - from;
    if (Math.abs(before) > 2 && Math.sign(now) === Math.sign(before)) c += 2.2;
    if (Math.abs(before) > 4 && Math.abs(now) > 2) c += 2;
    if (Math.abs(before) > 2 && Math.abs(now) <= 2
      && Math.sign(now) !== Math.sign(before)) c -= 1.4;   // the answered leap
  }

  const inChord = chordTones.includes(pcOf(to));
  if (strong && !inChord) c += 3.2;
  if (!strong && !inChord) {
    /* Off the beat, a non-chord note has to be going somewhere: passing or
     * neighbouring, which both mean stepwise on the way in. */
    c += leap <= 2 ? 0.4 : 3.5;
  }
  if (!scaleTones.includes(pcOf(to))) c += 6;     // outside the key

  /* Stay in the middle of the voice unless heading for the climax. */
  c += Math.abs(to - centre) * 0.09;
  if (atClimax) c -= Math.max(0, 6 - Math.abs(to - climax)) * 1.6;
  else if (to > climax) c += 5;                   // the top note happens once
  if (span && (to < span[0] || to > span[1])) c += 20;
  return c;
}

/**
 * Write a melody over a chord plan.
 *
 * `cells` are the rhythmic shapes available, each a list of beat lengths
 * adding up to one bar.  A phrase picks a few and repeats them, because a tune
 * whose rhythm never repeats has no shape to remember.
 */
export function melody(chords, opts) {
  const {
    scaleTones, range, beatsPerBar, cells, r,
    climaxAt = 0.68, lift = 7, rest = 0,
  } = opts;
  const [lo, hi] = range;
  const centre = Math.round((lo + hi) / 2);
  const climax = Math.min(hi, centre + lift);

  /* One rhythm for the phrase, with a variation for its second half: the ear
   * hears the repeat and the change against it. */
  const shape = [];
  const a = cells[Math.floor(r() * cells.length)];
  const b = cells[Math.floor(r() * cells.length)];
  for (let i = 0; i < chords.length; i++) shape.push(i % 4 === 3 ? b : (i % 2 ? a : a));

  const notes = [];
  let prev = null;
  let current = null;
  chords.forEach((chord, bar) => {
    const chordTones = chord.pitches;
    const cell = shape[bar];
    let at = 0;
    cell.forEach((len, k) => {
      const strong = at === 0 || (beatsPerBar === 4 && at === 2);
      const last = bar === chords.length - 1 && k === cell.length - 1;
      const atClimax = bar === Math.round(chords.length * climaxAt) && k === 0;

      /* A rest in the texture: only between phrases, never mid-gesture. */
      if (rest > 0 && k === cell.length - 1 && bar % 4 === 3 && r() < rest) {
        at += len;
        return;
      }

      let choose = candidates(scaleTones, lo, hi);
      if (last) {
        /* The last note is the tonic, reached by step wherever possible. */
        const tonicPc = chordTones[0];
        choose = choose.filter((m) => pcOf(m) === tonicPc);
      }
      let best = null;
      let bestCost = Infinity;
      for (const cand of choose) {
        const from = current === null ? centre : current;
        let c = cost(from, cand, prev, {
          chordTones, scaleTones, strong, centre, climax, atClimax, span: range,
        });
        if (last) c += Math.abs(cand - (current === null ? centre : current)) > 2 ? 4 : 0;
        /* A little noise so two pieces in the same key are not the same piece. */
        c += r() * 0.9;
        if (c < bestCost) { bestCost = c; best = cand; }
      }
      if (best === null) best = centre;
      notes.push({ midi: best, beat: bar * beatsPerBar + at, beats: len });
      prev = current;
      current = best;
      at += len;
    });
  });
  return notes;
}

/** Rhythmic cells, by how busy the music should be, each adding to one bar. */
export function cellsFor(beatsPerBar, busy) {
  const whole = [[beatsPerBar]];
  if (beatsPerBar === 3) {
    const calm = [[3], [2, 1], [1, 2]];
    const walking = [[1, 1, 1], [2, 1], [1, 0.5, 0.5, 1]];
    const lively = [[1, 0.5, 0.5, 1], [0.5, 0.5, 1, 1], [1, 1, 0.5, 0.5]];
    return busy === 'calm' ? calm : busy === 'lively' ? lively : walking;
  }
  const calm = [[4], [2, 2], [3, 1]];
  const walking = [[2, 1, 1], [1, 1, 2], [1, 1, 1, 1], [2, 2]];
  const lively = [
    [1, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, 1, 1], [1, 1, 0.5, 0.5, 1], [0.5, 0.5, 0.5, 0.5, 2],
  ];
  return busy === 'calm' ? calm : busy === 'lively' ? lively : walking.concat(whole);
}
