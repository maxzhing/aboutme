import type { ListenSpec } from './score';
import { CHORD_WORDS, chord, ivWords, scale, semitones, spell, transpose, type ChordQ, type ScaleKind } from './theory';

/**
 * Ear-training questions generated on the fly. Every question is built from the theory engine, so
 * the keyed answer is always what is actually played.
 */
export type EarKind = 'interval' | 'triad' | 'seventh' | 'cadence' | 'scale';
export interface EarQ { kind: EarKind; prompt: string; listen: ListenSpec; choices: string[]; answer: number; explain: string; /** what was played, for tests */ meta: Record<string, string> }

const pick = <T,>(xs: readonly T[], r: () => number) => xs[Math.floor(r() * xs.length)];
function shuffle<T>(xs: T[], r: () => number): T[] { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** the correct choice plus three distinct distractors, shuffled */
function options(correct: string, pool: string[], r: () => number, near?: (x: string) => number): { choices: string[]; answer: number } {
  const others = pool.filter((x) => x !== correct);
  const ordered = near ? [...others].sort((a, b) => near(a) - near(b) || (r() < 0.5 ? -1 : 1)).slice(0, 5) : others;
  const choices = shuffle([correct, ...shuffle(ordered, r).slice(0, 3)], r);
  return { choices, answer: choices.indexOf(correct) };
}

const IVS = ['m2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
const ROOTS = ['C4', 'D4', 'E4', 'F4', 'G4', 'A3', 'Bb3', 'Eb4', 'Ab3', 'B3'];
const TRIADS: ChordQ[] = ['M', 'm', 'd', 'A'];
const SEVENTHS: ChordQ[] = ['MM7', 'Mm7', 'mm7', 'hd7', 'fd7'];
const SCALES: { kind: ScaleKind; name: string }[] = [
  { kind: 'major', name: 'Major' }, { kind: 'natural', name: 'Natural minor' }, { kind: 'harmonic', name: 'Harmonic minor' }, { kind: 'melodic', name: 'Melodic minor (ascending)' },
  { kind: 'dorian', name: 'Dorian' }, { kind: 'phrygian', name: 'Phrygian' }, { kind: 'lydian', name: 'Lydian' }, { kind: 'mixolydian', name: 'Mixolydian' },
];
/** four-part progressions in C major (MIDI), transposed at random; each ends with the named cadence */
const CADENCES: { name: string; explain: string; prog: number[][] }[] = [
  { name: 'Perfect authentic cadence', explain: 'It ends V – I with the tonic on top: complete and final.', prog: [[48, 60, 67, 76], [53, 60, 69, 77], [43, 59, 67, 74], [48, 60, 64, 72]] },
  { name: 'Half cadence', explain: 'It stops on V, so it sounds open, like a comma.', prog: [[48, 60, 67, 76], [53, 65, 69, 74], [55, 59, 67, 74]] },
  { name: 'Plagal cadence', explain: 'IV moves to I: the soft "Amen" ending.', prog: [[48, 60, 67, 76], [43, 59, 67, 74], [48, 60, 64, 72], [53, 60, 69, 77], [48, 60, 67, 76]] },
  { name: 'Deceptive cadence', explain: 'V moves to vi instead of I: the ear expected home and got a minor chord.', prog: [[48, 60, 67, 76], [53, 60, 69, 77], [43, 59, 67, 74], [45, 60, 64, 72]] },
];

export function makeEar(kind: EarKind, r: () => number = Math.random): EarQ {
  if (kind === 'interval') {
    const iv = pick(IVS, r), root = pick(ROOTS, r);
    const top = spell(transpose(root, iv));
    const name = ivWords(iv);
    const o = options(name, IVS.map(ivWords), r, (x) => Math.abs(semitones(IVS[IVS.map(ivWords).indexOf(x)]) - semitones(iv)));
    return { kind, prompt: 'Which interval do you hear? (first one note, then the other, then both together)', listen: { steps: [root, top, [root, top]], beats: [1, 1, 2], tempo: 72 }, ...o, explain: `${name}: ${semitones(iv)} half steps (${spell(root).replace(/\d/, '')} up to ${top.replace(/\d/, '')}).`, meta: { root, top, iv } };
  }
  if (kind === 'triad' || kind === 'seventh') {
    const q = pick(kind === 'triad' ? TRIADS : SEVENTHS, r), root = pick(ROOTS.slice(0, 7), r);
    const notes = chord(root, q).map(spell);
    const name = CHORD_WORDS[q].replace(/^\w/, (c) => c.toUpperCase());
    const pool = (kind === 'triad' ? TRIADS : SEVENTHS).map((x) => CHORD_WORDS[x].replace(/^\w/, (c) => c.toUpperCase()));
    const o = options(name, pool, r);
    return { kind, prompt: `Which ${kind === 'triad' ? 'triad' : 'seventh chord'} quality do you hear?`, listen: { steps: [notes], beats: [3], tempo: 70, arpeggiate: true }, ...o, explain: `${name}: ${notes.map((n) => n.replace(/\d/, '')).join('–')}.`, meta: { root, q } };
  }
  if (kind === 'cadence') {
    const c = pick(CADENCES, r), shift = Math.floor(r() * 10) - 4;
    const steps = c.prog.map((ch) => ch.map((m) => m + shift));
    const o = options(c.name, CADENCES.map((x) => x.name), r);
    return { kind, prompt: 'How does this phrase end?', listen: { steps, beats: c.prog.map((_, i) => (i === c.prog.length - 1 ? 2.5 : 1)), tempo: 66 }, ...o, explain: c.explain, meta: { cadence: c.name } };
  }
  const s = pick(SCALES, r), tonic = pick(['C4', 'D4', 'E4', 'F4', 'G4', 'A3'], r);
  const notes = scale(tonic, s.kind).map(spell);
  const o = options(s.name, SCALES.map((x) => x.name), r);
  return { kind: 'scale', prompt: 'Which scale or mode do you hear (ascending)?', listen: { steps: notes, tempo: 112 }, ...o, explain: `${s.name} on ${tonic.replace(/\d/, '')}: ${notes.map((n) => n.replace(/\d/, '')).join(' ')}.`, meta: { tonic, kind: s.kind } };
}
export const EAR_KINDS: { id: EarKind; label: string }[] = [{ id: 'interval', label: 'Intervals' }, { id: 'triad', label: 'Triads' }, { id: 'seventh', label: 'Seventh chords' }, { id: 'cadence', label: 'Cadences' }, { id: 'scale', label: 'Scales and modes' }];
