/* Cadenza — core music theory.
 *
 * Pitch is stored the way notation needs it: a diatonic step, an octave and a
 * chromatic alteration.  That keeps F-sharp and G-flat distinct (they sit on
 * different staff lines) while still mapping cleanly onto MIDI for playback.
 */

export const STEP_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** Semitones above C for each diatonic step. */
export const STEP_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

/** Build a pitch. `step` 0..6 = C..B, `alter` in semitones (-2..2). */
export function pitch(step, octave, alter = 0) {
  return { step, octave, alter };
}

export function pitchFromName(name) {
  const m = /^([A-Ga-g])(bb|##|[b#x]?)(-?\d+)$/.exec(name.trim());
  if (!m) return null;
  const step = STEP_NAMES.indexOf(m[1].toUpperCase());
  const alter = { '': 0, '#': 1, '##': 2, x: 2, b: -1, bb: -2 }[m[2]];
  return pitch(step, parseInt(m[3], 10), alter);
}

export function pitchName(p, { unicode = false } = {}) {
  const acc = unicode
    ? { '-2': '♭♭', '-1': '♭', 0: '', 1: '♯', 2: '♯♯' }
    : { '-2': 'bb', '-1': 'b', 0: '', 1: '#', 2: '##' };
  return STEP_NAMES[p.step] + (acc[String(p.alter)] || '') + p.octave;
}

/** Diatonic ordinal: counts letter names across octaves. C4 -> 28. */
export function diatonic(p) {
  return p.octave * 7 + p.step;
}

export function fromDiatonic(dia, alter = 0) {
  return pitch(((dia % 7) + 7) % 7, Math.floor(dia / 7), alter);
}

/** MIDI note number. C4 (middle C) is 60. */
export function toMidi(p) {
  return (p.octave + 1) * 12 + STEP_SEMITONES[p.step] + p.alter;
}

/** Concert frequency in Hz for a MIDI number (A4 = 440 by default). */
export function midiToFreq(midi, a4 = 440) {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function samePitch(a, b) {
  return a.step === b.step && a.octave === b.octave && a.alter === b.alter;
}

/* ---------------------------------------------------------------- key sigs */

/* Order accidentals appear in a signature. */
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];  // B E A D G C F

/** Which steps are altered by a signature of `fifths`, and by how much. */
export function keyAlterations(fifths) {
  const alt = [0, 0, 0, 0, 0, 0, 0];
  if (fifths > 0) for (let i = 0; i < fifths; i++) alt[SHARP_ORDER[i]] = 1;
  else for (let i = 0; i < -fifths; i++) alt[FLAT_ORDER[i]] = -1;
  return alt;
}

export const MAJOR_KEYS = {
  '-7': 'Cb', '-6': 'Gb', '-5': 'Db', '-4': 'Ab', '-3': 'Eb', '-2': 'Bb',
  '-1': 'F', 0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#',
};
export const MINOR_KEYS = {
  '-7': 'ab', '-6': 'eb', '-5': 'bb', '-4': 'f', '-3': 'c', '-2': 'g',
  '-1': 'd', 0: 'a', 1: 'e', 2: 'b', 3: 'f#', 4: 'c#', 5: 'g#', 6: 'd#', 7: 'a#',
};

export function keyName(fifths, mode = 'major') {
  const t = mode === 'minor' ? MINOR_KEYS[String(fifths)] : MAJOR_KEYS[String(fifths)];
  if (!t) return '?';
  const root = t[0].toUpperCase() + (t.slice(1).replace('b', '♭').replace('#', '♯'));
  return root + ' ' + (mode === 'minor' ? 'minor' : 'major');
}

/* ------------------------------------------------------------------ clefs */

/* `line` counts staff lines from the bottom (1..5).  `octave` shifts the
 * sounding register (e.g. -1 for the tenor "treble 8vb" clef). */
export const CLEFS = {
  treble:     { id: 'treble',     sign: 'G', line: 2, octave: 0,  name: 'Treble' },
  treble8vb:  { id: 'treble8vb',  sign: 'G', line: 2, octave: -1, name: 'Treble 8vb' },
  treble8va:  { id: 'treble8va',  sign: 'G', line: 2, octave: 1,  name: 'Treble 8va' },
  bass:       { id: 'bass',       sign: 'F', line: 4, octave: 0,  name: 'Bass' },
  bass8vb:    { id: 'bass8vb',    sign: 'F', line: 4, octave: -1, name: 'Bass 8vb' },
  alto:       { id: 'alto',       sign: 'C', line: 3, octave: 0,  name: 'Alto' },
  tenor:      { id: 'tenor',      sign: 'C', line: 4, octave: 0,  name: 'Tenor' },
  soprano:    { id: 'soprano',    sign: 'C', line: 1, octave: 0,  name: 'Soprano' },
  mezzo:      { id: 'mezzo',      sign: 'C', line: 2, octave: 0,  name: 'Mezzo-soprano' },
  baritone:   { id: 'baritone',   sign: 'F', line: 3, octave: 0,  name: 'Baritone' },
  percussion: { id: 'percussion', sign: 'perc', line: 3, octave: 0, name: 'Percussion' },
};

/* Diatonic ordinal of the pitch each clef sign names, at its home octave. */
const CLEF_SIGN_PITCH = {
  G: diatonic(pitch(4, 4)), // G4
  F: diatonic(pitch(3, 3)), // F3
  C: diatonic(pitch(0, 4)), // C4
  perc: diatonic(pitch(1, 4)),
};

/**
 * Vertical staff position of a pitch, in half-spaces above the bottom line.
 * The bottom line is 0, the space above it 1, and so on; the top line is 8.
 */
export function staffPos(p, clef) {
  const c = typeof clef === 'string' ? CLEFS[clef] : clef;
  if (!c || c.sign === 'perc') return 4;
  const refLine = (c.line - 1) * 2;
  const refDia = CLEF_SIGN_PITCH[c.sign] + c.octave * 7;
  return refLine + (diatonic(p) - refDia);
}

/** Inverse of staffPos: which diatonic ordinal sits at this staff position. */
export function diatonicAtPos(pos, clef) {
  const c = typeof clef === 'string' ? CLEFS[clef] : clef;
  if (!c || c.sign === 'perc') return diatonic(pitch(1, 4));
  const refLine = (c.line - 1) * 2;
  const refDia = CLEF_SIGN_PITCH[c.sign] + c.octave * 7;
  return refDia + (pos - refLine);
}

/** Staff positions for the accidentals of a key signature, in drawing order. */
export function keySignatureLayout(fifths, clef) {
  const c = typeof clef === 'string' ? CLEFS[clef] : clef;
  if (!c || c.sign === 'perc' || fifths === 0) return [];
  /* Positions in treble clef; other clefs are a rigid transposition of these,
   * except that anything pushed above the top line drops an octave (this is
   * what produces the familiar low first sharp of the tenor clef). */
  const TREBLE_SHARPS = [8, 5, 9, 6, 3, 7, 4];
  const TREBLE_FLATS = [4, 7, 3, 6, 2, 5, 1];
  const OFFSET = { G: 0, F: -2, C: c.line === 3 ? -1 : 1 };
  const off = OFFSET[c.sign] ?? 0;
  const sharp = fifths > 0;
  const n = Math.abs(fifths);
  const base = sharp ? TREBLE_SHARPS : TREBLE_FLATS;
  const steps = sharp ? SHARP_ORDER : FLAT_ORDER;
  const out = [];
  for (let i = 0; i < n; i++) {
    let pos = base[i] + off;
    if (pos > 8) pos -= 7;
    out.push({ pos, alter: sharp ? 1 : -1, step: steps[i] });
  }
  return out;
}

/* ------------------------------------------------------- accidental policy */

/**
 * Decide which accidental glyph (if any) a note needs, given the key and the
 * accidentals already seen in this measure.  `state` maps "step:octave" to the
 * alteration currently in force; mutate it as you walk the measure.
 */
export function neededAccidental(p, fifths, state, forced) {
  const key = p.step + ':' + p.octave;
  const keyAlt = keyAlterations(fifths)[p.step];
  const current = key in state ? state[key] : keyAlt;
  if (forced === 'none') return null;
  if (forced === 'show' || p.alter !== current) {
    state[key] = p.alter;
    return p.alter;
  }
  return null;
}

/* ------------------------------------------------------------ transposition */

const SEMI_TO_STEP = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };

/** Transpose by a chromatic interval, choosing a sensible spelling. */
export function transpose(p, semitones, diatonicSteps = null) {
  const midi = toMidi(p) + semitones;
  if (diatonicSteps === null) {
    /* Spell the result using the simplest name for the new pitch class. */
    const pc = ((midi % 12) + 12) % 12;
    let step = SEMI_TO_STEP[pc];
    let alter = 0;
    if (step === undefined) {
      step = SEMI_TO_STEP[(pc - 1 + 12) % 12];
      alter = 1;
    }
    const octave = Math.floor(midi / 12) - 1 - (STEP_SEMITONES[step] + alter > 11 ? 1 : 0);
    return pitch(step, octave, alter);
  }
  const dia = diatonic(p) + diatonicSteps;
  const base = fromDiatonic(dia);
  const natural = (base.octave + 1) * 12 + STEP_SEMITONES[base.step];
  return pitch(base.step, base.octave, midi - natural);
}

/** Shift by whole octaves, preserving spelling. */
export function octaveShift(p, n) {
  return pitch(p.step, p.octave + n, p.alter);
}

/* --------------------------------------------------------- chord detection */

const CHORD_SHAPES = [
  { iv: [0, 4, 7], suffix: '' }, { iv: [0, 3, 7], suffix: 'm' },
  { iv: [0, 3, 6], suffix: 'dim' }, { iv: [0, 4, 8], suffix: 'aug' },
  { iv: [0, 5, 7], suffix: 'sus4' }, { iv: [0, 2, 7], suffix: 'sus2' },
  { iv: [0, 4, 7, 10], suffix: '7' }, { iv: [0, 4, 7, 11], suffix: 'maj7' },
  { iv: [0, 3, 7, 10], suffix: 'm7' }, { iv: [0, 3, 6, 10], suffix: 'm7b5' },
  { iv: [0, 3, 6, 9], suffix: 'dim7' }, { iv: [0, 4, 7, 9], suffix: '6' },
  { iv: [0, 3, 7, 9], suffix: 'm6' }, { iv: [0, 4, 7, 14], suffix: 'add9' },
];

/** Best-effort chord symbol for a set of pitches ("Cmaj7", "F#m", ...). */
export function detectChord(pitches) {
  if (!pitches || pitches.length < 3) return null;
  const midis = [...new Set(pitches.map(toMidi))].sort((a, b) => a - b);
  const pcs = [...new Set(midis.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b);
  for (let rot = 0; rot < pcs.length; rot++) {
    const root = pcs[rot];
    const iv = pcs.map((p) => ((p - root) % 12 + 12) % 12).sort((a, b) => a - b);
    for (const shape of CHORD_SHAPES) {
      const want = shape.iv.map((x) => x % 12).sort((a, b) => a - b);
      if (want.length === iv.length && want.every((v, i) => v === iv[i])) {
        const low = pitches.reduce((a, b) => (toMidi(a) <= toMidi(b) ? a : b));
        const rootName = STEP_NAMES[SEMI_TO_STEP[root] ?? SEMI_TO_STEP[(root - 1 + 12) % 12]] +
          (SEMI_TO_STEP[root] === undefined ? '♯' : '');
        const bass = ((toMidi(low) % 12) + 12) % 12;
        return rootName + shape.suffix + (bass !== root ? '/' + STEP_NAMES[low.step] : '');
      }
    }
  }
  return null;
}
