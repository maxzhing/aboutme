import type { CalcProblem } from '../calc/types';
import type { ClefName, ListenSpec, StaffEvent, StaffSpec } from '../../lib/music/score';
import { modelPasses, modelText, type MusicTask } from '../../lib/music/tasks';
import type { Satb } from '../../lib/music/theory';

/** a free-response or multiple-choice problem */
export const P = (id: string, level: 1 | 2 | 3, q: string, answer: number | string[], hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, hint, solution, ...extra });
/** multiple choice: four choices, the keyed index, and (when the fact is computable) an engine check */
export const MC = (id: string, level: 1 | 2 | 3, q: string, choices: [string, string, string, string], answer: 0 | 1 | 2 | 3, hint: string, solution: string[], extra: Partial<CalcProblem> = {}): CalcProblem => ({ id, level, q, answer, choices, hint, solution, ...extra });
/** a hands-on task: the student writes on the staff; the engine grades it and checks the model answer */
export const TASK = (id: string, level: 1 | 2 | 3, q: string, task: MusicTask, hint: string, solution: string[]): CalcProblem => ({ id, level, q, answer: [modelText(task)], hint, solution, task, check: () => modelPasses(task) });

/** accepted spellings for a typed note name: "F#" → F#, F♯, F sharp */
export function NOTE(n: string, suffix = ''): string[] {
  const L = n[0], acc = n.slice(1);
  const sym = acc.replace(/##/g, '𝄪').replace(/#/g, '♯').replace(/bb/g, '𝄫').replace(/b/g, '♭');
  const word = { '': 'natural', '#': 'sharp', b: 'flat', '##': 'double sharp', bb: 'double flat' }[acc] ?? '';
  const forms = acc ? [`${L}${acc}`, `${L}${sym}`, `${L} ${word}`] : [L, `${L} natural`, `${L}♮`];
  return suffix ? [...forms.map((f) => `${f} ${suffix}`), ...forms] : forms;
}

/* notation shorthands */
export const notes = (clef: ClefName, ns: (string | string[])[], label: string, o: { fifths?: number; dur?: StaffEvent['dur']; labels?: string[]; above?: string[]; time?: StaffSpec['time'] } = {}): StaffSpec => ({
  clef, fifths: o.fifths ?? 0, time: o.time, label,
  // separate chords or intervals each get their own measure, so accidentals never carry over from one example to the next
  events: ns.map((n, i) => ({ notes: Array.isArray(n) ? n : [n], dur: o.dur ?? 'w', label: o.labels?.[i], above: o.above?.[i], bar: ns.some(Array.isArray) && i < ns.length - 1 })),
});
export const sig = (clef: ClefName, fifths: number, label: string): StaffSpec => ({ clef, fifths, label, events: [] });
export const satb = (fifths: number, chords: Satb[], romans: string[], label: string, dur: StaffEvent['dur'] = 'h'): StaffSpec => ({
  clef: 'grand', fifths, label, events: chords.map((c, i) => ({ satb: c, dur, label: romans[i] })),
});
/** play a key-establishing tonic chord, then something */
export const inKey = (tonicChord: string[], steps: (string | string[])[], beats?: number[], tempo = 76): ListenSpec => ({ steps: [tonicChord, ...steps], beats: [2, ...(beats ?? steps.map(() => 1))], tempo });
export const hear = (steps: (string | string[])[], beats?: number[], tempo = 76, arpeggiate = false): ListenSpec => ({ steps, beats, tempo, arpeggiate });
export const chords = (cs: Satb[]): string[][] => cs.map((c) => (['B', 'T', 'A', 'S'] as const).map((v) => c[v]).filter((x): x is string => !!x));
