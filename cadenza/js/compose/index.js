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
import { melody, cellsFor, ornament, compound } from './melody.js';
import { layOutForm, sectionKey } from './form.js';
import { voiceChord, layOut, TEXTURES } from './texture.js';
import { buildParts } from '../transcribe/build.js';
import { beatTicks } from '../core/rhythm.js';
import { tempoText } from '../core/model.js';
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
    id: 'ballade', name: 'Ballade',
    tip: 'A slow lyrical idea, a storm that interrupts it from a third away, and '
      + 'an ending in the storm\u2019s key rather than its own. Needs 32 bars or more.',
    texture: 'wide', sevenths: true, busy: 'walking', bpm: [58, 78],
    modes: ['major', 'minor'], timeSig: { beats: 4, beatType: 4, symbol: 'common' },
    colour: 1, ornament: 0.45, compound: 0.22, complexity: 'elaborate',
    form: 'ballade',
    arc: ['p', 'mp', 'mf', 'f', 'ff', 'mf', 'p', 'pp'],
  },
  {
    id: 'impression', name: 'Impressionist',
    tip: 'Extended chords moved in parallel, modal colour, running figuration '
      + 'and almost no cadence.',
    texture: 'filigree', sevenths: true, busy: 'calm', bpm: [64, 88],
    modes: ['dorian', 'mixolydian', 'major'],
    timeSig: { beats: 4, beatType: 4, symbol: 'common' },
    colour: 0.9, plane: true, ornament: 0.3, complexity: 'complex',
    harmonicRhythm: 0.5, arc: ['pp', 'p', 'mp', 'p', 'mf', 'mp', 'p', 'pp'],
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
    complexity = 'moderate',
    seed = Math.floor(Math.random() * 1e9),
    title = 'New piece',
    composer = '',
    bpm = null,
    form = undefined,   // undefined: whatever the character does; null: no form
  } = opts;

  const style = characterById(character);
  const r = rng(seed);
  const chosenMode = mode && style.modes.includes(mode) ? mode
    : style.modes[Math.floor(r() * style.modes.length)];
  const ts = style.timeSig;
  const perBeat = beatTicks(ts);

  /* Four-bar phrases, and a whole number of them. */
  const phraseBars = 4;
  const phrases = Math.max(2, Math.round(bars / phraseBars));
  const totalBars = phrases * phraseBars;

  /* A piece is either one character from beginning to end, or a sequence of
   * them.
   *
   * Where a form applies, each section gets its own key, tempo, texture, pace
   * and loudness, and the contrast between them is what makes the piece feel
   * larger than its bar count.  Where none does, there is exactly one section
   * covering the whole piece — everything below reads the same way either
   * way, so the sectional path is the only path and cannot quietly rot. */
  const formId = form === undefined ? style.form : form;
  const sections = (formId ? layOutForm(formId, totalBars, phraseBars) : null) || [{
    index: 0, from: 0, bars: totalBars, phrases, key: 'home',
    tempo: 1, name: '', last: true,
  }];

  /* The harmony, section by section.  Each one closes properly, so the seam
   * between two sections is a cadence rather than a splice. */
  const harmony = [];
  const perBar = [];
  for (const sec of sections) {
    const key = sectionKey(tonic, chosenMode, sec.key);
    sec.tonic = key.tonic;
    sec.keyMode = key.mode;
    sec.fifths = fifthsFor(key.tonic, key.mode);
    sec.scale = keyPitches(key.tonic, key.mode);
    sec.chordsFrom = perBar.length;
    const progression = harmonicPlan(sec.phrases, phraseBars, key.mode, r, {
      sevenths: style.sevenths,
      harmonicRhythm: style.harmonicRhythm || 1,
      colour: sec.colour !== undefined ? sec.colour : (style.colour || 0),
      planeRuns: !!style.plane,
    });
    for (const ph of progression) {
      harmony.push({ ...ph, section: sec.index });
      const n = ph.chords.length;
      for (let b = 0; b < phraseBars; b++) {
        const chord = ph.chords[Math.min(n - 1, Math.floor((b / phraseBars) * n))];
        perBar.push({
          ...chord,
          pitches: chordPitches(chord, key.tonic),
          close: ph.close,
          section: sec.index,
        });
      }
    }
  }

  const melodyInst = ensemble === 'piano' ? instrument('piano') : instrument(melodyInstrument);
  const range = ensemble === 'piano' ? [60, 84] : singingRange(melodyInst);
  const asked = style.complexity || complexity;

  /* The tune, section by section for the same reason.
   *
   * A phrase of the Presto has no business being a variation of one from the
   * Andantino, and a melody written straight across the seam would make it
   * one.  Each section states its own idea, develops it and climaxes inside
   * itself; the sections are related by key and character, not by motif. */
  const tune = [];
  for (const sec of sections) {
    const level = sec.complexity || asked;
    let line = melody(perBar.slice(sec.chordsFrom, sec.chordsFrom + sec.bars), {
      scaleTones: sec.scale,
      range,
      beatsPerBar: ts.beats,
      cells: cellsFor(ts.beats, sec.busy || style.busy, level),
      r,
      rest: style.rest || 0,
      barsPerPhrase: phraseBars,
      complexity: level,
    });

    /* A line that implies two voices, then the decoration written out.  Both
     * happen after the line exists, because both are things done *to* a
     * melody — deciding them while choosing the notes would leave neither
     * recognisable. */
    if (style.compound) {
      line = compound(line, { scaleTones: sec.scale, r, amount: style.compound, drop: 12 });
    }
    const decoration = sec.ornament !== undefined ? sec.ornament : style.ornament;
    if (decoration) {
      const chordAt = (beat) => {
        const bar = sec.chordsFrom + Math.floor(beat / ts.beats);
        return (perBar[Math.min(perBar.length - 1, Math.max(0, bar))] || {}).pitches;
      };
      line = ornament(line, {
        scaleTones: sec.scale, chordAt, r, amount: decoration, minLength: 1,
      });
    }

    const offset = sec.from * ts.beats;
    for (const n of line) tune.push({ ...n, beat: n.beat + offset, section: sec.index });
  }

  /* The accompaniment, in the texture its own section asked for, voiced so the
   * hand moves as little as it can. */
  const accompaniment = [];
  let previous = null;
  perBar.forEach((chord, bar) => {
    const sec = sections[chord.section] || sections[0];
    const texture = sec.texture || style.texture;
    const voicing = voiceChord(chord.pitches, {
      range: texture === 'chorale' ? [48, 76] : [40, 64],
      previous,
      size: style.voices || (chord.seventh ? 4 : 3),
      strict: !!style.strict,
    });
    previous = voicing;
    const laid = layOut(texture, voicing, ts.beats, {
      r, last: bar === sec.from + sec.bars - 1,
    });
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

  const tempo = bpm || Math.round(style.bpm[0] + r() * (style.bpm[1] - style.bpm[0]));

  /* Which key each bar is written in.  A section in another key is spelled in
   * that key: the engraver is handed the question, not an answer fixed at the
   * first bar. */
  const fifthsAt = (measureIndex) => {
    let here = sections[0];
    for (const sec of sections) if (measureIndex >= sec.from) here = sec;
    return here.fifths;
  };

  /* Divisions per beat, so the engraver writes the values the cells imply. */
  const divisions = new Map();
  for (const n of [...tune, ...accompaniment]) {
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
    fifths: fifthsAt,
    mode: sections[0].keyMode === 'minor' ? 'minor' : 'major',
    title,
    composer,
  });

  /* The tempo and key each section arrives in, written where it arrives.
   *
   * A section that is twice the speed of the one before it is the whole point
   * of the form, and a reader is told about it the way a reader is always
   * told: a mark over the first bar.  The key signature only changes when the
   * accidentals do — F major and A minor share one, and printing a redundant
   * signature there would say something untrue about the music. */
  for (const sec of sections) {
    const spec = built.score.measures[sec.from];
    if (!spec) continue;
    const here = Math.round(tempo * (sec.tempo || 1));
    if (sec.from > 0 || sec.name) {
      spec.tempo = { bpm: here, unit: 'quarter', text: sec.name || tempoText(here) };
    }
    if (sec.from > 0 && sec.fifths !== fifthsAt(sec.from - 1)) {
      spec.keySig = { fifths: sec.fifths, mode: sec.keyMode === 'minor' ? 'minor' : 'major' };
    }
    if (sec.from > 0) built.score.measures[sec.from - 1].barline = 'double';
  }

  /* The shape of the piece as sound.
   *
   * A dynamic mark at the head of every phrase, following the arc of the
   * section it belongs to: quiet at the opening, building to the phrase that
   * carries the climax, receding afterwards.  Without this a piece is played
   * at one loudness throughout, which is the difference between the notes of a
   * piece and a performance of it — and the arc has to agree with where the
   * tune puts its high point, or the two pull against each other. */
  const ORDER = ['pppp', 'ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ffff'];
  const top = built.score.parts[0];
  for (const sec of top ? sections : []) {
    const arc = sec.arc || style.arc;
    if (!arc || !arc.length) continue;
    const loudest = arc.reduce((a, b) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a));
    const peak = arc.indexOf(loudest);
    /* Where the tune climaxes, which melody() decides the same way. */
    const climax = sec.phrases > 2 ? sec.phrases - 2 : sec.phrases - 1;
    for (let ph = 0; ph < sec.phrases; ph++) {
      const measure = top.measures[sec.from + ph * phraseBars];
      if (!measure) continue;
      const voice = (measure.voices || []).find((v) => v.some((e) => e.type === 'note'));
      const first = voice && voice.find((e) => e.type === 'note');
      if (!first) continue;
      const at = ph <= climax
        ? Math.round((ph / Math.max(1, climax)) * peak)
        : peak + Math.round(((ph - climax) / Math.max(1, sec.phrases - 1 - climax))
          * (arc.length - 1 - peak));
      first.dynamic = arc[Math.max(0, Math.min(arc.length - 1, at))];
    }
  }

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
      complexity: style.complexity || complexity,
      dynamics: style.arc ? style.arc.filter((d, i, a) => a.indexOf(d) === i).join(' – ') : null,
      /* A sectional piece has several textures, and saying it has one would
       * be false about the very thing the form exists to do. */
      texture: [...new Set(sections.map((sec) => TEXTURES[sec.texture || style.texture]))]
        .join(' → '),
      bars: totalBars,
      phrases,
      tempo,
      timeSig: `${ts.beats}/${ts.beatType}`,
      /* What shape the piece is in, if it is in one.  A ballade that ends in
       * another key is a fact about the piece, not a bug, and the panel says
       * so rather than leaving a reader to wonder. */
      sections: sections.length > 1 ? sections.map((sec) => ({
        /* An unnamed section is marked with the ordinary tempo word, which is
         * what the score itself shows over its first bar. */
        name: sec.name || tempoText(Math.round(tempo * (sec.tempo || 1))),
        from: sec.from + 1,
        bars: sec.bars,
        key: `${tonicName(sec.tonic)} ${MODE_NAMES[sec.keyMode] || sec.keyMode}`,
        tempo: Math.round(tempo * (sec.tempo || 1)),
        texture: TEXTURES[sec.texture || style.texture],
      })) : null,
      endsIn: sections.length > 1
        ? `${tonicName(sections[sections.length - 1].tonic)} `
          + `${MODE_NAMES[sections[sections.length - 1].keyMode]
            || sections[sections.length - 1].keyMode}`
        : null,
      progression: harmony.map((ph) => ph.chords.map((c) => c.roman).join(' – ')),
      cadences: harmony.map((ph) => ph.close),
      phraseSections: harmony.map((ph) => ph.section),
    },
  };
}

export { TEXTURES, MODE_NAMES };
