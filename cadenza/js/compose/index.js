/* Cadenza — writing a piece.
 *
 * Given a key, a character and a length, this produces a real score: a
 * progression that goes somewhere and closes, a tune shaped over it, and an
 * accompaniment that suits the character asked for.  It is composition by
 * rule, not by imitation — nothing is copied from anywhere, and the rules are
 * the ordinary ones about function, phrase and line that a first-year harmony
 * class would recognise.
 *
 * The result goes through the same engraver the transcriber uses, so what
 * comes out is an editable score with beams, rests, ties and accidentals
 * decided the same way they are everywhere else in the program.
 */

import { plan as harmonicPlan, chordPitches, keyPitches, rng, MODE_NAMES } from './harmony.js';
import { melody, cellsFor } from './melody.js';
import { voiceChord, layOut, TEXTURES } from './texture.js';
import { buildParts } from '../transcribe/build.js';
import { beatTicks, measureTicks } from '../core/rhythm.js';
import { INSTRUMENTS } from '../core/instruments.js';

/* What a character actually means, in things the generator can act on. */
export const CHARACTERS = [
  {
    id: 'classical', name: 'Classical',
    tip: 'Balanced four-bar phrases, an Alberti bass, cadences you can hear coming.',
    texture: 'alberti', sevenths: false, busy: 'walking', bpm: [96, 126],
    modes: ['major', 'minor'], timeSig: { beats: 4, beatType: 4, symbol: 'common' },
  },
  {
    id: 'romantic', name: 'Romantic',
    tip: 'Broken chords under a singing line, richer harmony, slower to unfold.',
    texture: 'arpeggio', sevenths: true, busy: 'calm', bpm: [64, 92],
    modes: ['major', 'minor'], timeSig: { beats: 4, beatType: 4, symbol: 'common' },
  },
  {
    id: 'waltz', name: 'Waltz',
    tip: 'Three to a bar, bass on one, chords on two and three.',
    texture: 'waltz', sevenths: false, busy: 'walking', bpm: [138, 172],
    modes: ['major', 'minor'], timeSig: { beats: 3, beatType: 4, symbol: null },
  },
  {
    id: 'hymn', name: 'Chorale',
    tip: 'Four parts moving together, one chord to a beat, strict voice leading.',
    texture: 'chorale', sevenths: false, busy: 'calm', bpm: [68, 88],
    modes: ['major', 'minor'], timeSig: { beats: 4, beatType: 4, symbol: 'common' },
    strict: true, voices: 4,
  },
  {
    id: 'folk', name: 'Folk',
    tip: 'Modal, tune-led, plain chords underneath.',
    texture: 'block', sevenths: false, busy: 'walking', bpm: [104, 132],
    modes: ['major', 'dorian', 'mixolydian', 'minor'],
    timeSig: { beats: 4, beatType: 4, symbol: 'common' },
  },
  {
    id: 'jazz', name: 'Jazz',
    tip: 'Sevenths throughout, a walking bass, a line that syncopates.',
    texture: 'walking', sevenths: true, busy: 'lively', bpm: [108, 148],
    modes: ['major', 'minor', 'mixolydian'], timeSig: { beats: 4, beatType: 4, symbol: 'common' },
  },
  {
    id: 'calm', name: 'Quiet',
    tip: 'Slow harmony, sustained chords, a line with room around it.',
    texture: 'sustained', sevenths: true, busy: 'calm', bpm: [58, 76],
    modes: ['major', 'minor'], timeSig: { beats: 4, beatType: 4, symbol: 'common' },
    harmonicRhythm: 0.5, rest: 0.5,
  },
];

export const characterById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];

/* Key signatures.  A mode borrows the signature of the major it sits inside. */
const MAJOR_FIFTHS = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 5: -1, 10: -2, 3: -3, 8: -4, 1: -5 };
const MINOR_FIFTHS = { 9: 0, 4: 1, 11: 2, 6: 3, 1: 4, 8: 5, 3: 6, 2: -1, 7: -2, 0: -3, 5: -4, 10: -5 };

export function fifthsFor(tonic, mode) {
  const pc = ((tonic % 12) + 12) % 12;
  if (mode === 'minor') return MINOR_FIFTHS[pc] ?? 0;
  if (mode === 'dorian') return MAJOR_FIFTHS[((pc - 2) + 12) % 12] ?? 0;
  if (mode === 'mixolydian') return MAJOR_FIFTHS[((pc - 7) + 12) % 12] ?? 0;
  return MAJOR_FIFTHS[pc] ?? 0;
}

const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const tonicName = (pc) => NAMES[((pc % 12) + 12) % 12];

const instrument = (id) => INSTRUMENTS.find((i) => i.id === id) || INSTRUMENTS[0];

/** A comfortable register for a tune on this instrument. */
function singingRange(inst) {
  const [lo, hi] = inst.range;
  const centre = Math.round((lo + hi) / 2);
  return [Math.max(lo, centre - 9), Math.min(hi, centre + 14)];
}

/**
 * Write a piece.
 *
 * Returns { score, description, harmony } — the score ready to edit, and an
 * account of what was written, so the panel can say what it did rather than
 * present it as magic.
 */
export function composePiece(opts = {}) {
  const {
    character = 'classical',
    tonic = 0,
    mode = null,
    bars = 16,
    ensemble = 'piano',
    melodyInstrument = 'violin',
    seed = Math.floor(Math.random() * 1e9),
    title = 'New piece',
    composer = '',
    bpm = null,
  } = opts;

  const style = characterById(character);
  const r = rng(seed);
  const chosenMode = mode && style.modes.includes(mode) ? mode
    : style.modes[Math.floor(r() * style.modes.length)];
  const ts = style.timeSig;
  const beatsPerBar = ts.beats * (4 / ts.beatType) / (ts.beatType === 8 ? 3 : 1) || ts.beats;
  const perBeat = beatTicks(ts);
  const barTicks = measureTicks(ts);

  /* Four-bar phrases, and a whole number of them. */
  const phraseBars = 4;
  const phrases = Math.max(2, Math.round(bars / phraseBars));
  const totalBars = phrases * phraseBars;

  const harmony = harmonicPlan(phrases, phraseBars, chosenMode, r, {
    sevenths: style.sevenths,
    harmonicRhythm: style.harmonicRhythm || 1,
  });

  /* One chord per bar, stretched or repeated to fill the phrase. */
  const perBar = [];
  for (const ph of harmony) {
    const n = ph.chords.length;
    for (let b = 0; b < phraseBars; b++) {
      const chord = ph.chords[Math.min(n - 1, Math.floor((b / phraseBars) * n))];
      perBar.push({ ...chord, pitches: chordPitches(chord, tonic), close: ph.close });
    }
  }

  const scale = keyPitches(tonic, chosenMode);
  const melodyInst = ensemble === 'piano' ? instrument('piano') : instrument(melodyInstrument);
  const range = ensemble === 'piano'
    ? [Math.max(60, 60), 84]
    : singingRange(melodyInst);

  const tune = melody(perBar, {
    scaleTones: scale,
    range,
    beatsPerBar: ts.beats,
    cells: cellsFor(ts.beats, style.busy),
    r,
    rest: style.rest || 0,
  });

  /* The accompaniment, voiced so the hand moves as little as it can. */
  const accompaniment = [];
  let previous = null;
  perBar.forEach((chord, bar) => {
    const voicing = voiceChord(chord.pitches, {
      range: style.texture === 'chorale' ? [48, 76] : [40, 64],
      previous,
      size: style.voices || (chord.seventh ? 4 : 3),
      strict: !!style.strict,
    });
    previous = voicing;
    const laid = layOut(style.texture, voicing, ts.beats, { r, last: bar === perBar.length - 1 });
    for (const n of laid) {
      accompaniment.push({ midi: n.midi, beat: bar * ts.beats + n.beat, beats: n.beats });
    }
  });

  /* Into the shape the engraver wants: one entry per simultaneity. */
  const toChords = (notes, staff, voice) => {
    const byStart = new Map();
    for (const n of notes) {
      const startTicks = Math.round(n.beat * perBeat);
      const endTicks = startTicks + Math.max(1, Math.round(n.beats * perBeat));
      const key = startTicks + ':' + endTicks;
      if (!byStart.has(key)) {
        byStart.set(key, { startTicks, endTicks, staff, voice, notes: [], confidence: 1 });
      }
      byStart.get(key).notes.push({ midi: n.midi, confidence: 1 });
    }
    return [...byStart.values()].sort((a, b) => a.startTicks - b.startTicks);
  };

  const fifths = fifthsFor(tonic, chosenMode);
  const tempo = bpm || Math.round(style.bpm[0] + r() * (style.bpm[1] - style.bpm[0]));

  /* Divisions per beat, so the engraver writes the values the cells imply. */
  const divisions = new Map();
  const allBeats = [...tune, ...accompaniment];
  for (const n of allBeats) {
    const b = Math.floor(n.beat);
    const d = n.beats < 0.5 ? 4 : n.beats < 1 ? 2 : 1;
    divisions.set(b, Math.max(divisions.get(b) || 1, d));
  }

  let parts;
  if (ensemble === 'piano') {
    parts = [{
      instrumentId: 'piano', staves: 2,
      chords: [...toChords(tune, 0, 0), ...toChords(accompaniment, 1, 0)],
    }];
  } else {
    parts = [
      { instrumentId: melodyInst.id, staves: 1, chords: toChords(tune, 0, 0) },
      { instrumentId: 'piano', staves: 2, chords: toChords(accompaniment, 1, 0) },
    ];
  }

  const built = buildParts(parts, {
    plan: { perBeat, divisions },
    timeSig: ts,
    bpm: tempo,
    fifths,
    mode: chosenMode === 'minor' ? 'minor' : 'major',
    title,
    composer,
  });

  /* The engraver puts parts in score order, which is not the order they were
   * handed over in, so the caller is told where each ended up rather than left
   * to assume. */
  const partIndex = (id) => built.score.parts.findIndex((p) => p.instrumentId === id);

  return {
    score: built.score,
    harmony: perBar,
    seed,
    melodyPart: ensemble === 'piano' ? partIndex('piano') : partIndex(melodyInst.id),
    accompanimentPart: partIndex('piano'),
    description: {
      key: `${tonicName(tonic)} ${MODE_NAMES[chosenMode] || chosenMode}`,
      character: style.name,
      texture: TEXTURES[style.texture],
      bars: totalBars,
      phrases,
      tempo,
      timeSig: `${ts.beats}/${ts.beatType}`,
      progression: harmony.map((ph) => ph.chords.map((c) => c.roman).join(' – ')),
      cadences: harmony.map((ph) => ph.close),
    },
  };
}

export { TEXTURES, MODE_NAMES };
