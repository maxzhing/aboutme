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
  const { sevenths = false, harmonicRhythm = 1, colour = 0, planeRuns = false } = opts;
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

  let chords = degrees.map((d, i) => {
    /* A seventh on the dominant sharpens the cadence; elsewhere it is colour
     * and is used more sparingly. */
    const isCadential = i === slots - 2 && close !== 'half';
    const wantSeventh = sevenths && (isCadential || (d === 4 && r() < 0.6) || r() < 0.25);
    return chordOn(d, mode, { seventh: wantSeventh });
  });

  if (colour <= 0) return chords;

  /* ---- colour -----------------------------------------------------------
   *
   * The diatonic frame is now in place and stays in place: every substitution
   * below keeps the chord's job in the phrase and changes only its colour, so
   * the progression still goes somewhere.  Chromaticism that ignores function
   * is not richer, it is merely harder to follow. */

  /* Tonicisation.  For one chord's length the music behaves as though some
   * other note were the tonic — the commonest way a Romantic phrase gets its
   * colour without leaving the key at all. */
  for (let i = 2; i < chords.length - 1; i++) {
    const target = degrees[i];
    if (target === 0 || chords[i].chromatic) continue;
    if (r() > colour * 0.55) continue;
    const prev = degrees[i - 1];
    if (prev === target) continue;
    /* Never the opening chord: a phrase has to say what key it is in before it
     * can afford to lean away from it, and a piece that begins on a secondary
     * dominant has told the listener nothing to lean away from. */
    if (i - 1 === 0) continue;
    chords[i - 1] = secondaryOf(target, mode);
  }

  /* Mixture: the major key reaching into its own minor.  Applied to what
   * prepares the dominant, where the darkening is heard as expression rather
   * than as a mistake. */
  if (mode === 'major' || mode === 'mixolydian') {
    for (let i = 0; i < chords.length - 1; i++) {
      if (chords[i].chromatic) continue;
      if (functionOf(degrees[i]) !== 'predominant') continue;
      if (r() > colour * 0.5) continue;
      chords[i] = pick([BORROWED.iv, BORROWED.bVI, BORROWED.bVII], r);
    }
  }

  /* The approach to the last cadence, where a piece can afford its strongest
   * preparation: a Neapolitan leaning on the dominant, or an augmented sixth
   * pulling onto it from both sides at once. */
  if (close !== 'half' && slots >= 3 && r() < colour * 0.45) {
    chords[slots - 3] = r() < 0.5 ? neapolitan()
      : augmentedSixth(pick(['german', 'german', 'french', 'italian'], r));
  }

  /* Sevenths, ninths and added sixths on what is left. */
  for (let i = 0; i < chords.length; i++) {
    if (chords[i].chromatic || chords[i].seventh) continue;
    if (r() > colour * 0.45) continue;
    chords[i] = extend(chords[i], mode, pick(['ninth', 'sixth', 'ninth'], r));
  }

  /* Parallel motion: a run of chords treated as one thickened line.  Only
   * where the character asks for it, and never across the cadence. */
  if (planeRuns && slots >= 4 && r() < colour * 0.5) {
    const at = 1 + Math.floor(r() * Math.max(1, slots - 3));
    const dir = r() < 0.5 ? 1 : -1;
    const base = chords[at];
    for (let k = 1; k < Math.min(3, slots - 1 - at); k++) {
      chords[at + k] = planing(base, dir * k, mode);
    }
  }

  return chords;
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
/* appended to harmony.js */

/* --------------------------------------------------------- chromatic colour
 *
 * Diatonic triads are the grammar; these are the vocabulary that makes a piece
 * sound like the nineteenth century rather than a harmony exercise.  Every one
 * of them is a standard device with a standard behaviour, and each is defined
 * by where its notes sit above the tonic, so a key change is a transposition
 * and nothing else.
 */

/** A chord given directly as semitones above the tonic. */
const sonority = (tones, roman, quality, fn, opts = {}) => ({
  tones, roman, quality, function: fn, chromatic: true, ...opts,
});

/**
 * The dominant seventh of another degree.
 *
 * Tonicisation: for one chord's length the music behaves as though some other
 * note were the tonic, which is the commonest way a Romantic phrase gets its
 * colour without leaving the key.  V/V, V/vi and V/IV account for most of it.
 */
export function secondaryOf(degree, mode) {
  const scale = SCALES[mode] || SCALES.major;
  const target = scale[degree % 7];
  const root = (target + 7) % 12;
  return sonority(
    [root, (root + 4) % 12, (root + 7) % 12, (root + 10) % 12],
    `V7/${ROMAN[degree % 7]}`, 'dominant seventh', 'dominant',
    { resolvesTo: degree },
  );
}

/**
 * The Neapolitan: a major triad on the flattened second, almost always in
 * first inversion, almost always walking into the dominant.  A minor-key
 * device that major keys borrow when they want the shadow.
 */
export const neapolitan = () =>
  sonority([1, 5, 8], '♭II', 'major', 'predominant', { prefersInversion: 1 });

/**
 * The augmented sixth.  Two voices a sixth apart pull outward onto the
 * dominant — the most decisive way of arriving at one.  German, French and
 * Italian differ only in what fills the middle.
 */
export function augmentedSixth(kind = 'german') {
  const base = [8, 0];                 // ♭6 and the tonic
  const top = 6;                       // the sharpened fourth: the sixth itself
  const middle = kind === 'french' ? [2] : kind === 'italian' ? [] : [3];
  const names = { german: 'Ger+6', french: 'Fr+6', italian: 'It+6' };
  return sonority([...base, ...middle, top].sort((a, b) => a - b),
    names[kind] || 'Ger+6', 'augmented sixth', 'predominant');
}

/**
 * Chords borrowed from the parallel mode.
 *
 * A major key reaching into its own minor — the flattened sixth, the minor
 * subdominant, the flattened seventh — is the sound of harmony darkening
 * without the key changing.
 */
export const BORROWED = {
  iv: sonority([5, 8, 0], 'iv', 'minor', 'predominant'),
  bVI: sonority([8, 0, 3], '♭VI', 'major', 'tonic'),
  bVII: sonority([10, 2, 5], '♭VII', 'major', 'predominant'),
  bIII: sonority([3, 7, 10], '♭III', 'major', 'tonic'),
  iiDim: sonority([2, 5, 8], 'ii°', 'diminished', 'predominant'),
};

/**
 * Chromatic mediants: a major triad a third away sharing one note with the
 * tonic.  They do not belong to the key and do not need to — the shared note
 * is the whole justification, and the sudden change of light is the point.
 */
export const MEDIANTS = {
  III: sonority([4, 8, 11], 'III', 'major', 'tonic'),
  VI: sonority([9, 1, 4], 'VI', 'major', 'tonic'),
  bVI: sonority([8, 0, 3], '♭VI', 'major', 'tonic'),
  bIII: sonority([3, 7, 10], '♭III', 'major', 'tonic'),
};

/** An added sixth or ninth on a diatonic chord: colour without function. */
export function extend(chord, mode, kind) {
  const scale = SCALES[mode] || SCALES.major;
  const root = chord.tones[0];
  const add = kind === 'ninth' ? 2 : kind === 'sixth' ? 9 : 5;
  const tones = [...new Set([...chord.tones, (root + add) % 12])].sort((a, b) => a - b);
  const mark = kind === 'ninth' ? '9' : kind === 'sixth' ? '6' : 'sus4';
  return { ...chord, tones, roman: chord.roman.replace(/7$/, '') + mark, extended: kind };
}

/**
 * Parallel harmony — every voice moving in the same direction by the same
 * interval, the chord treated as a thickened melody rather than as a function.
 * It is the sound that separates the turn of the twentieth century from
 * everything before it, and it is the one device here that deliberately
 * ignores where a chord is supposed to resolve.
 */
export function planing(chord, steps, mode) {
  const scale = SCALES[mode] || SCALES.major;
  const shift = scale[((steps % 7) + 7) % 7] + (steps < 0 ? -12 : 0);
  return {
    ...chord,
    tones: chord.tones.map((t) => ((t + shift) % 12 + 12) % 12),
    roman: chord.roman + (steps > 0 ? '↑' : '↓'),
    planed: true,
  };
}
