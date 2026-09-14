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
  const { chordTones, scaleTones, strong, centre, climax, atClimax, span, pull = 0.2 } = ctx;
  const leap = Math.abs(to - from);
  let c = 0;

  if (leap === 0) c += 3.6;                       // a repeated note says nothing
  else if (leap <= 2) c += 0;                     // stepwise: the default
  else if (leap <= 4) c += 2.2;
  else if (leap <= 7) c += 4.5;
  else if (leap <= 12) c += 8;
  else c += 18;                                   // more than an octave: almost never

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
  c += Math.abs(to - centre) * pull;
  if (atClimax) c -= Math.max(0, 6 - Math.abs(to - climax)) * 1.6;
  else if (to > climax) c += 5;                   // the top note happens once
  if (span && (to < span[0] || to > span[1])) c += 20;
  return c;
}

/* ------------------------------------------------------------------ shape */

/* Where a phrase goes.  A tune that has no plan beyond "the next note should
 * sound all right" wanders; one with a shape arrives somewhere. */
const CONTOURS = {
  arch: (t) => Math.sin(Math.PI * t),
  rise: (t) => t,
  fall: (t) => 1 - t,
  wave: (t) => (Math.sin(Math.PI * 2 * t) + 1) / 2,
  level: () => 0.5,
};

/**
 * How a phrase treats the motif it was given.
 *
 * This is what separates a piece from a stream of plausible notes.  A tune
 * states an idea, answers it, does something to it, and brings it back — and a
 * listener recognises all four without being told, because the intervals and
 * the rhythm are the same idea each time.  Generating every bar afresh gives
 * music with no memory, which is the commonest reason a generated tune sounds
 * generated however correct each note is.
 */
const DEVELOPMENTS = {
  state: { transpose: 0, invert: false, keepRhythm: true },
  answer: { transpose: 0, invert: false, keepRhythm: true },
  sequence: { transpose: 1, invert: false, keepRhythm: true },
  sequenceDown: { transpose: -1, invert: false, keepRhythm: true },
  invert: { transpose: 0, invert: true, keepRhythm: true },
  free: { transpose: 0, invert: false, keepRhythm: false },
};

/** The plan for a piece of this many phrases. */
function developmentPlan(phrases, r) {
  const out = ['state', 'answer'];
  for (let i = 2; i < phrases; i++) {
    const last = i === phrases - 1;
    if (last) out.push('answer');                       // the idea comes back to close
    else if (i % 2 === 0) out.push(r() < 0.6 ? 'sequence' : 'invert');
    else out.push(r() < 0.5 ? 'sequenceDown' : 'free');
  }
  return out.slice(0, phrases);
}

/**
 * Write a melody over a chord plan.
 *
 * The chords say what is available; the contour says where the phrase is
 * going; the motif says what the tune is made of.  Each note is then the
 * cheapest one that satisfies all three, which is why the line holds together
 * locally as well as over the phrase.
 */
export function melody(chords, opts) {
  const {
    scaleTones, range, beatsPerBar, cells, r,
    barsPerPhrase = 4, lift = 7, rest = 0, complexity = 'moderate',
  } = opts;
  const [lo, hi] = range;
  const centre = Math.round((lo + hi) / 2);
  const phrases = Math.max(1, Math.round(chords.length / barsPerPhrase));
  const climaxPhrase = phrases > 2 ? phrases - 2 : phrases - 1;
  const develop = developmentPlan(phrases, r);

  /* The rhythmic idea: one bar's worth, plus a second for variety.  A busier
   * setting gets more of them and allows notes to arrive off the beat. */
  const pickCell = () => cells[Math.floor(r() * cells.length)];
  const motifRhythm = [pickCell(), pickCell()];
  const varied = complexity === 'complex' ? [pickCell(), pickCell()] : motifRhythm;

  /* Filled in by the first phrase and imitated by the rest. */
  let motifIntervals = null;

  const notes = [];
  let prev = null;
  let current = null;
  let highest = -Infinity;

  for (let ph = 0; ph < phrases; ph++) {
    const how = DEVELOPMENTS[develop[ph]] || DEVELOPMENTS.free;
    const contourName = ph === climaxPhrase ? 'arch'
      : ph === phrases - 1 ? 'fall'
        : ['arch', 'rise', 'wave'][Math.floor(r() * 3)];
    const contour = CONTOURS[contourName];
    /* The high point belongs to one phrase; the others stay below it. */
    /* Only the climax phrase gets the whole compass.  The gap between that and
     * what the other phrases may reach is what makes the high note sound like
     * an arrival rather than another note near the top. */
    const reach = ph === climaxPhrase ? lift : lift * 0.4;
    const phraseIntervals = [];
    let step = 0;
    /* One moment is the high point of the phrase, not a region of it. */
    const peakBar = Math.max(0, barsPerPhrase - 2);
    /* How high this phrase is allowed to go.  Only the climax phrase may reach
     * the top of the line's compass; the others stay under it, which is what
     * makes the climax a climax rather than simply another high note.  Judging
     * this against the highest note written so far cannot work: if the tune
     * happens to open high, it can then never rise. */
    const ceiling = centre + Math.round(reach) + (ph === climaxPhrase ? 1 : 0);
    let phraseTop = -Infinity;

    for (let b = 0; b < barsPerPhrase; b++) {
      const bar = ph * barsPerPhrase + b;
      if (bar >= chords.length) break;
      const chord = chords[bar];
      const chordTones = chord.pitches;
      const source = how.keepRhythm ? (b % 4 === 3 ? varied[1] : motifRhythm[b % 2]) : pickCell();
      const cell = source;
      let at = 0;

      cell.forEach((len, k) => {
        const strong = at === 0 || (beatsPerBar === 4 && at === 2);
        const last = bar === chords.length - 1 && k === cell.length - 1;
        const through = (b * beatsPerBar + at) / (barsPerPhrase * beatsPerBar);
        const wanted = centre + Math.round(contour(through) * reach - reach * 0.2);

        /* A breath at the end of a phrase, never inside a gesture. */
        if (rest > 0 && b === barsPerPhrase - 1 && k === cell.length - 1 && r() < rest) {
          at += len;
          step++;
          return;
        }

        let choose = candidates(scaleTones, lo, hi);
        if (last) choose = choose.filter((m) => pcOf(m) === chordTones[0]);

        /* What the motif did at this point in its phrase, if anything. */
        let want = null;
        if (motifIntervals && how.keepRhythm && motifIntervals[step] !== undefined) {
          const iv = motifIntervals[step];
          want = how.invert ? -iv : iv;
        }

        let best = null;
        let bestCost = Infinity;
        const from = current === null ? centre : current;
        for (const cand of choose) {
          let c = cost(from, cand, prev, {
            chordTones, scaleTones, strong, centre: wanted, climax: centre + lift,
            atClimax: ph === climaxPhrase && b === peakBar && k === 0, span: range,
            /* The phrase that carries the climax has to be able to get there:
             * a shape that only nudges cannot lift a line ten semitones inside
             * four bars, and the arrival is the whole point of the phrase. */
            pull: ph === climaxPhrase ? 0.6 : 0.2,
          });
          /* The top note is reached once.  Without this the contour simply
           * parks the tune on its ceiling and leaves it there. */
          if (cand > ceiling) c += (cand - ceiling) * 3.5;
          /* Do not sit on the phrase's high note — but going *above* it must
           * stay free, or the line can never climb: each new top would bar the
           * next, and the tune would ratchet downwards for the whole piece. */
          if (cand === phraseTop) c += 2.2;
          /* Follow the idea: the same interval, up or turned upside down.  It
           * is a pull rather than a rule, so the harmony still wins where the
           * two disagree. */
          if (want !== null) {
            /* A pull towards the shape of the idea, not an instruction: where
             * the motif leapt and the line here should not, the line wins. */
            const moved = cand - from;
            const asked = Math.max(-5, Math.min(5, want));
            c += Math.min(5, Math.abs(moved - asked)) * 0.6;
          }
          if (complexity === 'simple') c += Math.abs(cand - from) > 4 ? 2 : 0;
          if (complexity === 'complex' && !chordTones.includes(pcOf(cand))) c -= 0.5;
          c += r() * (complexity === 'complex' ? 1.3 : 0.8);
          if (c < bestCost) { bestCost = c; best = cand; }
        }
        /* Nothing was chosen — fall back to the nearest note of the key, never
         * to a raw pitch: the fallback is the one place a tune can pick up a
         * note that does not belong to the key it is in. */
        if (best === null) {
          const inKey = candidates(scaleTones, lo, hi);
          best = inKey.length
            ? inKey.reduce((a, m) => (Math.abs(m - centre) < Math.abs(a - centre) ? m : a))
            : centre;
        }

        notes.push({ midi: best, beat: bar * beatsPerBar + at, beats: len });
        highest = Math.max(highest, best);
        phraseTop = Math.max(phraseTop, best);
        if (current !== null) phraseIntervals[step] = best - current;
        prev = current;
        current = best;
        at += len;
        step++;
      });
    }

    /* The first phrase is the idea; everything after it refers back. */
    if (ph === 0) motifIntervals = phraseIntervals;
  }
  return notes;
}

/**
 * Rhythmic cells, each adding up to exactly one bar.
 *
 * `busy` is the character's own pace; `complexity` is what the writer asked
 * for on top of it.  At the simple end the cells are plain and few, so a
 * phrase repeats recognisably; at the complex end they include dotted figures
 * and notes that arrive off the beat, which is where a tune stops sounding
 * like an exercise.  Nothing here is shorter than a semiquaver, because the
 * point is interest rather than difficulty.
 */
export function cellsFor(beatsPerBar, busy, complexity = 'moderate') {
  let list;
  if (beatsPerBar === 3) {
    const calm = [[3], [2, 1], [1, 2]];
    const walking = [[1, 1, 1], [2, 1], [1, 0.5, 0.5, 1]];
    const lively = [[1, 0.5, 0.5, 1], [0.5, 0.5, 1, 1], [1, 1, 0.5, 0.5]];
    list = busy === 'calm' ? calm : busy === 'lively' ? lively : walking;
    if (complexity === 'complex') {
      list = list.concat([[0.5, 1, 1, 0.5], [1.5, 0.5, 1], [0.5, 0.5, 0.5, 0.5, 1]]);
    }
    if (complexity === 'simple') list = list.slice(0, 2);
    return list;
  }
  const calm = [[4], [2, 2], [3, 1]];
  const walking = [[2, 1, 1], [1, 1, 2], [1, 1, 1, 1], [2, 2]];
  const lively = [
    [1, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, 1, 1], [1, 1, 0.5, 0.5, 1], [0.5, 0.5, 0.5, 0.5, 2],
  ];
  list = busy === 'calm' ? calm : busy === 'lively' ? lively : walking.concat([[4]]);
  if (complexity === 'complex') {
    list = list.concat([
      [1.5, 0.5, 1, 1],            // dotted, then the answer
      [0.5, 1, 1, 1, 0.5],         // arriving off the beat
      [1, 1.5, 0.5, 1],
      [0.5, 0.5, 1, 0.5, 0.5, 1],
      [1.5, 1.5, 1],
    ]);
  }
  if (complexity === 'simple') list = list.filter((c) => c.length <= 3).slice(0, 3);
  return list.length ? list : [[beatsPerBar]];
}
