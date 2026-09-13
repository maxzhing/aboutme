/* Cadenza — reading the harmony, without rewriting the music.
 *
 * Harmonic analysis earns its place in a transcriber in exactly one way: as a
 * tie-break.  When the recording is equally consistent with two readings, the
 * one that fits the harmony around it is the better guess.  When the recording
 * is not equally consistent with them, the recording wins, every time.
 *
 * So nothing in this file changes a note.  It reads what was found and says
 * what it amounts to — the chord, its inversion, its degree in the key, and
 * which notes are not chord tones and what kind of non-chord tone each is.
 * That is worth having for its own sake, as chord symbols and roman numerals on
 * the page, and it is what the refinement loop consults when two corrections
 * are otherwise tied.
 *
 * The distinction matters because it is where transcribers usually go wrong.
 * A system that "cleans up" a diminished chord into a dominant seventh because
 * dominants are commoner has stopped transcribing and started composing.
 */

import { detectKey } from './build.js';

const PC = (m) => ((m % 12) + 12) % 12;

/* Chord qualities, as intervals above the root, commonest first so that a set
 * matching more than one is read the ordinary way. */
const QUALITIES = [
  { id: 'maj', label: '', degrees: [0, 4, 7] },
  { id: 'min', label: 'm', degrees: [0, 3, 7] },
  { id: 'dom7', label: '7', degrees: [0, 4, 7, 10] },
  { id: 'maj7', label: 'maj7', degrees: [0, 4, 7, 11] },
  { id: 'min7', label: 'm7', degrees: [0, 3, 7, 10] },
  { id: 'dim', label: '°', degrees: [0, 3, 6] },
  { id: 'halfdim7', label: 'ø7', degrees: [0, 3, 6, 10] },
  { id: 'dim7', label: '°7', degrees: [0, 3, 6, 9] },
  { id: 'aug', label: '+', degrees: [0, 4, 8] },
  { id: 'sus4', label: 'sus4', degrees: [0, 5, 7] },
  { id: 'sus2', label: 'sus2', degrees: [0, 2, 7] },
  { id: 'min6', label: 'm6', degrees: [0, 3, 7, 9] },
  { id: 'maj6', label: '6', degrees: [0, 4, 7, 9] },
  { id: 'minmaj7', label: 'mMaj7', degrees: [0, 3, 7, 11] },
  { id: 'fifth', label: '5', degrees: [0, 7] },
];

const NAMES_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const NAMES_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

/**
 * Name the chord a set of sounding pitches makes.
 *
 * Every root is tried and the quality that accounts for the most of what is
 * sounding wins; notes it cannot account for are returned rather than ignored,
 * because those are the ones worth knowing about.  The bass decides the
 * inversion, which is why it is taken from the lowest sounding pitch and not
 * from the root.
 */
export function readChord(midis, opts = {}) {
  const { fifths = 0 } = opts;
  if (!midis.length) return null;
  const sorted = [...midis].sort((a, b) => a - b);
  const bass = PC(sorted[0]);
  const set = [...new Set(sorted.map(PC))];
  if (set.length === 1) {
    return { root: set[0], quality: 'unison', label: NAMES_SHARP[set[0]], bass, inversion: 0, extra: [], fit: 1 };
  }

  let best = null;
  for (let root = 0; root < 12; root++) {
    for (const q of QUALITIES) {
      const tones = q.degrees.map((d) => PC(root + d));
      const covered = set.filter((p) => tones.includes(p));
      const missing = tones.filter((t) => !set.includes(t));
      const extra = set.filter((p) => !tones.includes(p));
      /* Explaining more of what is sounding counts for more than being a
       * tidier chord; an unexplained note is a real cost. */
      const fit = covered.length / set.length - extra.length * 0.22 - missing.length * 0.12
        + (tones.includes(bass) ? 0.05 : 0);
      if (!best || fit > best.fit) {
        best = { root, quality: q.id, label: q.label, tones, extra, missing, fit };
      }
    }
  }
  if (!best || best.fit < 0.34) {
    return { root: null, quality: 'unclear', label: '', bass, inversion: null, extra: set, fit: best ? best.fit : 0 };
  }
  const names = fifths < 0 ? NAMES_FLAT : NAMES_SHARP;
  const inversion = best.tones.indexOf(bass);
  return {
    root: best.root,
    quality: best.quality,
    label: names[best.root] + best.label + (inversion > 0 ? '/' + names[bass] : ''),
    bass,
    inversion: inversion < 0 ? null : inversion,
    tones: best.tones,
    extra: best.extra,
    fit: Math.max(0, Math.min(1, best.fit)),
  };
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MAJOR_DEGREE = [0, 2, 4, 5, 7, 9, 11];

/** The chord's degree in the key, written the way an analyst writes it. */
export function romanNumeral(chord, tonic, mode = 'major') {
  if (!chord || chord.root === null) return '';
  const step = MAJOR_DEGREE.indexOf(PC(chord.root - tonic));
  if (step < 0) return '';
  const minorish = chord.quality.startsWith('min') || chord.quality.startsWith('dim')
    || chord.quality === 'halfdim7';
  let text = minorish ? ROMAN[step].toLowerCase() : ROMAN[step];
  if (chord.quality === 'dim' || chord.quality === 'dim7') text += '°';
  if (chord.quality === 'halfdim7') text += 'ø';
  if (chord.quality === 'aug') text += '+';
  if (chord.quality.endsWith('7')) text += '7';
  if (chord.inversion === 1) text += '6';
  if (chord.inversion === 2) text += chord.quality.endsWith('7') ? '4/3' : '6/4';
  if (chord.inversion === 3) text += '4/2';
  return text;
}

/* The kinds of note that are not chord tones, and what makes each one. */
const NCT = {
  passing: 'passing note',
  neighbour: 'neighbour note',
  suspension: 'suspension',
  anticipation: 'anticipation',
  chromatic: 'chromatic note',
  free: 'non-chord tone',
};

/**
 * Classify a note that is not part of the chord under it.
 *
 * `before` and `after` are the pitches this line moves from and to.  A note
 * approached and left by step in the same direction is passing; by step and
 * back is a neighbour; held over from the previous chord is a suspension; taken
 * early from the next is an anticipation.
 */
export function classifyTone(midi, chord, { before = null, after = null, previousChord = null, nextChord = null } = {}) {
  if (!chord || !chord.tones) return { kind: 'free', label: NCT.free };
  if (chord.tones.includes(PC(midi))) return { kind: 'chord', label: 'chord tone' };
  const stepTo = after !== null && Math.abs(after - midi) <= 2;
  const stepFrom = before !== null && Math.abs(midi - before) <= 2;
  if (stepFrom && stepTo) {
    const rising = midi > before && after > midi;
    const falling = midi < before && after < midi;
    if (rising || falling) return { kind: 'passing', label: NCT.passing };
    if (before === after) return { kind: 'neighbour', label: NCT.neighbour };
  }
  if (previousChord && previousChord.tones && previousChord.tones.includes(PC(midi)) && stepTo) {
    return { kind: 'suspension', label: NCT.suspension };
  }
  if (nextChord && nextChord.tones && nextChord.tones.includes(PC(midi))) {
    return { kind: 'anticipation', label: NCT.anticipation };
  }
  if (!stepFrom && !stepTo) return { kind: 'free', label: NCT.free };
  return { kind: 'chromatic', label: NCT.chromatic };
}

/**
 * Read the harmony of a whole performance.
 *
 * Segments are the stretches between changes of sounding pitch set, merged
 * where a change is only a passing note.  Each gets a chord, a degree, and a
 * list of the notes it does not account for.
 */
export function analyseHarmony(notes, opts = {}) {
  const { minSpan = 0.12 } = opts;
  if (!notes.length) return { key: { fifths: 0, mode: 'major', tonic: 0 }, segments: [] };
  const key = opts.key || detectKey(notes.map((n) => ({
    midi: n.midi, startTicks: Math.round(n.start * 960), endTicks: Math.round(n.end * 960),
  })));

  const edges = new Set([0]);
  for (const n of notes) { edges.add(n.start); edges.add(n.end); }
  const points = [...edges].sort((a, b) => a - b);
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (to - from < 1e-6) continue;
    const mid = (from + to) / 2;
    const sounding = notes.filter((n) => n.start <= mid && n.end > mid);
    if (!sounding.length) continue;
    const chord = readChord(sounding.map((n) => n.midi), { fifths: key.fifths });
    const last = segments[segments.length - 1];
    /* A moment too short to be heard as a harmony belongs to its neighbour. */
    if (last && (to - from < minSpan || sameChord(last.chord, chord))) {
      last.to = to;
      last.notes = [...new Set(last.notes.concat(sounding))];
      continue;
    }
    segments.push({ from, to, chord, notes: sounding.slice(), bass: Math.min(...sounding.map((n) => n.midi)) });
  }

  segments.forEach((seg, i) => {
    seg.roman = romanNumeral(seg.chord, key.tonic, key.mode);
    const prev = segments[i - 1];
    const next = segments[i + 1];
    seg.tones = seg.notes.map((n) => {
      const line = seg.notes.filter((o) => o !== n);
      return {
        midi: n.midi,
        ...classifyTone(n.midi, seg.chord, {
          before: prev ? nearestOf(prev.notes, n.midi) : null,
          after: next ? nearestOf(next.notes, n.midi) : null,
          previousChord: prev ? prev.chord : null,
          nextChord: next ? next.chord : null,
        }),
        withinChord: line.length,
      };
    });
  });

  return { key, segments };
}

const sameChord = (a, b) => !!a && !!b && a.root === b.root && a.quality === b.quality && a.bass === b.bass;

function nearestOf(list, midi) {
  let best = null;
  let d = Infinity;
  for (const n of list) {
    const gap = Math.abs(n.midi - midi);
    if (gap < d) { d = gap; best = n.midi; }
  }
  return best;
}

/**
 * How well a pitch fits the harmony sounding at a moment.
 *
 * Used only to break ties between corrections the recording supports equally.
 * The number is small on purpose: it is a nudge, not a vote.
 */
export function harmonyFitter(analysis) {
  if (!analysis || !analysis.segments.length) return () => 0;
  return (time, midi) => {
    const seg = analysis.segments.find((s) => s.from <= time && s.to > time);
    if (!seg || !seg.chord || !seg.chord.tones) return 0;
    if (seg.chord.tones.includes(PC(midi))) return 1;
    const scale = MAJOR_DEGREE.map((d) => PC(analysis.key.tonic + d));
    return scale.includes(PC(midi)) ? 0.4 : 0;
  };
}
