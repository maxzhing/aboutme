/* Cadenza — the harmony a piece is built on.
 *
 * Chords are not picked at random from the ones that fit the key.  Tonal music
 * moves in one direction — away from the tonic, through a preparation, to a
 * dominant, and back — and a progression that ignores that sounds like a list
 * of chords rather than a sentence.  So each chord is chosen for what it does
 * rather than for what it is called:
 *
 *   tonic         where the phrase rests            I   vi  iii
 *   predominant   what prepares the dominant        IV  ii
 *   dominant      what wants to resolve             V   vii°
 *
 * and the phrase endings are written first, because those are what make a
 * phrase a phrase.  A four-bar antecedent stops on the dominant, asking a
 * question; its consequent answers it with a full close.  Everything between
 * is filled in afterwards, moving forward through the functions.
 *
 * Nothing here knows about notes yet.  A chord is a set of scale degrees; what
 * those become depends on the key, and where they are played depends on the
 * texture.
 */

/* Scale steps from the tonic, in semitones. */
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

export const MODE_NAMES = {
  major: 'major',
  minor: 'minor',
  dorian: 'Dorian',
  mixolydian: 'Mixolydian',
};

const TONIC = [0, 5, 2];        // I, vi, iii
const PREDOMINANT = [3, 1];     // IV, ii
const DOMINANT = [4, 6];        // V, vii

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** A small, seedable random source, so a piece can be made again exactly. */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const pick = (list, r) => list[Math.floor(r() * list.length) % list.length];

/**
 * The chord on a scale degree.
 *
 * Built by stacking thirds inside the scale, which is what makes it belong to
 * the key without anything having to check that it does.  In the minor the
 * seventh degree is raised wherever the chord is acting as a dominant: the
 * flat seventh of the natural minor has no leading note, and a cadence without
 * a leading note does not close.
 */
export function chordOn(degree, mode, opts = {}) {
  const { seventh = false, raiseLeading = true } = opts;
  const scale = SCALES[mode] || SCALES.major;
  const steps = seventh ? [0, 2, 4, 6] : [0, 2, 4];
  const tones = steps.map((s) => {
    const i = (degree + s) % 7;
    let semi = scale[i];
    /* The leading note, where the harmony needs one. */
    const minorish = mode === 'minor' || mode === 'dorian';
    if (raiseLeading && minorish && i === 6 && (degree === 4 || degree === 6)) semi = 11;
    return semi;
  });
  const third = ((tones[1] - tones[0]) + 12) % 12;
  const fifth = ((tones[2] - tones[0]) + 12) % 12;
  const quality = third === 3 && fifth === 6 ? 'diminished'
    : third === 4 && fifth === 8 ? 'augmented'
      : third === 3 ? 'minor' : 'major';
  const numeral = quality === 'major' || quality === 'augmented'
    ? ROMAN[degree] : ROMAN[degree].toLowerCase();
  return {
    degree,
    tones,
    quality,
    seventh,
    roman: numeral + (quality === 'diminished' ? '°' : '') + (seventh ? '7' : ''),
  };
}

const functionOf = (degree) => (TONIC.includes(degree) ? 'tonic'
  : PREDOMINANT.includes(degree) ? 'predominant' : 'dominant');

/** Where a chord of this function may go next. */
function successors(fn, r) {
  if (fn === 'tonic') return r() < 0.55 ? PREDOMINANT : (r() < 0.6 ? DOMINANT : TONIC);
  if (fn === 'predominant') return r() < 0.75 ? DOMINANT : PREDOMINANT;
  return r() < 0.85 ? TONIC : DOMINANT;
}

/**
 * A phrase's worth of chords, ending where the phrase should end.
 *
 * `close` is what the last bar has to be: a full close for a consequent, the
 * dominant for an antecedent, a deceptive turn where a piece wants one more
 * phrase before it finishes.  The ending is placed first and the way there is
 * filled in backwards from it, because the cadence is the point of the phrase
 * and everything before it is approach.
 */
export function phrase(bars, mode, close, r, opts = {}) {
  const { sevenths = false, harmonicRhythm = 1 } = opts;
  const slots = Math.max(2, Math.round(bars * harmonicRhythm));
  const degrees = new Array(slots).fill(0);

  if (close === 'half') {
    degrees[slots - 1] = 4;                       // ends on V, question unanswered
    degrees[slots - 2] = pick(PREDOMINANT, r);
  } else if (close === 'deceptive') {
    degrees[slots - 1] = 5;                       // V–vi, the answer withheld
    degrees[slots - 2] = 4;
    if (slots > 2) degrees[slots - 3] = pick(PREDOMINANT, r);
  } else if (close === 'plagal') {
    degrees[slots - 1] = 0;
    degrees[slots - 2] = 3;
  } else {
    degrees[slots - 1] = 0;                       // full close
    degrees[slots - 2] = 4;
    if (slots > 2) degrees[slots - 3] = pick(PREDOMINANT, r);
  }

  /* The opening is the tonic more often than not — a phrase has to say where
   * it is before it can go anywhere. */
  degrees[0] = r() < 0.75 ? 0 : pick(TONIC, r);

  const fixed = new Set([0, slots - 1, slots - 2, close === 'deceptive' && slots > 2 ? slots - 3 : -1]);
  for (let i = 1; i < slots - 2; i++) {
    if (fixed.has(i)) continue;
    const from = functionOf(degrees[i - 1]);
    let next = pick(successors(from, r), r);
    /* Do not sit on the same chord twice unless the harmony is deliberately
     * slow; repetition is the texture's job, not the harmony's. */
    if (next === degrees[i - 1] && r() < 0.8) next = pick(successors(from, r), r);
    degrees[i] = next;
  }

  /* A chord repeated across a bar line is the harmony standing still while
   * pretending to move.  Where that happens, the earlier of the two changes to
   * another chord doing the same job — never the later one, because the later
   * one is usually part of the cadence. */
  for (let i = 1; i < slots; i++) {
    if (degrees[i] !== degrees[i - 1] || fixed.has(i - 1)) continue;
    const family = functionOf(degrees[i - 1]) === 'tonic' ? TONIC
      : functionOf(degrees[i - 1]) === 'predominant' ? PREDOMINANT : DOMINANT;
    const other = family.filter((d) => d !== degrees[i]);
    if (other.length) degrees[i - 1] = pick(other, r);
  }

  return degrees.map((d, i) => {
    /* A seventh on the dominant sharpens the cadence; elsewhere it is colour
     * and is used more sparingly. */
    const isCadential = i === slots - 2 && close !== 'half';
    const wantSeventh = sevenths && (isCadential || (d === 4 && r() < 0.6) || r() < 0.25);
    return chordOn(d, mode, { seventh: wantSeventh });
  });
}

/**
 * The whole piece's harmony, as a list of phrases.
 *
 * Periods: an antecedent that asks and a consequent that answers.  A piece of
 * more than two phrases keeps asking until the last one, which is the only
 * place a full close belongs — a cadence in the middle stops the piece there
 * whatever comes after it.
 */
export function plan(phrases, barsPerPhrase, mode, r, opts = {}) {
  const out = [];
  for (let i = 0; i < phrases; i++) {
    const last = i === phrases - 1;
    const close = last ? 'authentic'
      : i % 2 === 0 ? 'half'
        : (i === phrases - 2 ? 'deceptive' : 'authentic');
    out.push({ close, chords: phrase(barsPerPhrase, mode, close, r, opts) });
  }
  return out;
}

/** The pitch classes of a chord, in the key. */
export const chordPitches = (chord, tonic) => chord.tones.map((t) => (tonic + t) % 12);

/** Every pitch class the key contains. */
export const keyPitches = (tonic, mode) =>
  (SCALES[mode] || SCALES.major).map((s) => (tonic + s) % 12);
