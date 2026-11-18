import {
  same, CHORD_WORDS, checkSatb, chord, dia, errorsOnly, identify, ivName, ivWords, midi, parseRoman, pc, romanOf, scale, show, simpleName, spell, transpose,
  type ChordQ, type Issue, type Key, type Satb, type ScaleKind,
} from './theory';

/**
 * Hands-on tasks: the student writes on a staff and the engine grades it. Every task carries a model
 * answer, and a test checks that each model answer passes its own grader.
 */
export type Clef = 'treble' | 'bass' | 'alto';
export type MusicTask =
  | { kind: 'chord'; clef: Clef; given?: string[]; model: string[]; maxNotes?: number; grade: (v: string[]) => string | null }
  | { kind: 'line'; clef: Clef; slots: number; fifths?: number; model: string[]; grade: (v: string[]) => string | null }
  | { kind: 'keysig'; clef: Clef; fifths: number; model: string[]; grade: (v: string[]) => string | null }
  | { kind: 'satb'; key: Key; fifths: number; romans: string[]; given?: Satb[]; model: Satb[]; grade: (v: Satb[]) => Issue[] };

const list = (ps: string[]) => ps.map((p) => show(p)).join(', ');
const nameChord = (notes: string[]) => {
  const id = identify(notes);
  if (!id) return null;
  const inv = ['root position', 'first inversion', 'second inversion', 'third inversion'][id.inversion];
  return `${show(id.root, false)} ${CHORD_WORDS[id.q]}${id.q.length === 1 ? ' triad' : ' chord'} in ${inv}`;
};

/** Write one given pitch on the staff (reading and writing notes in a clef). */
export function noteTask(target: string, clef: Clef = 'treble'): MusicTask {
  return {
    kind: 'chord', clef, model: [target], maxNotes: 1,
    grade: (v) => {
      if (v.length !== 1) return 'Write exactly one note.';
      if (same(v[0], target)) return null;
      if (pc(v[0]) === pc(target)) return `Right letter, wrong octave: you wrote ${show(v[0])}. Find ${show(target)} by counting lines and spaces from the clef.`;
      if (v[0][0] === target[0] && v[0].slice(-1) === target.slice(-1)) return `Right line or space, but check the accidental: you wrote ${show(v[0])}.`;
      return `You wrote ${show(v[0])}, not ${show(target)}.`;
    },
  };
}

/** Write an exact melody, one note per slot (e.g. a motive transformed). */
export function melodyTask(model: string[], clef: Clef = 'treble', why = ''): MusicTask {
  return {
    kind: 'line', clef, slots: model.length, model,
    grade: (v) => {
      for (let i = 0; i < model.length; i++) {
        if (!v[i]) return `Write a note in every slot (slot ${i + 1} is empty).`;
        if (!same(v[i], model[i])) return `Note ${i + 1} should be ${show(model[i])}, not ${show(v[i])}.${why ? ' ' + why : ''}`;
      }
      return v.length === model.length ? null : 'Remove the extra notes at the end.';
    },
  };
}

/** Write a note an interval above (or below) a given note. */
export function intervalTask(from: string, iv: string, clef: Clef = 'treble', down = false): MusicTask {
  const target = spell(transpose(from, iv, down));
  return {
    kind: 'chord', clef, given: [from], model: [target], maxNotes: 2,
    grade: (v) => {
      if (v.length !== 1) return v.length ? 'Write just one new note.' : 'Write a note on the staff first.';
      const n = v[0];
      if (down ? dia(n) >= dia(from) : dia(n) <= dia(from)) return `Your note must be ${down ? 'below' : 'above'} ${show(from)}.`;
      let got: string;
      try { got = ivName(from, n); } catch { return `${show(n)} is too far from ${show(from)} to name.`; }
      if (got === iv) return null;
      const want = ivWords(iv);
      if (got.slice(1) !== iv.slice(1)) return `${show(n)} makes a ${ivWords(got)}. Count letter names: a ${want.split(' ').pop()} spans ${iv.slice(1)} letters, counting ${show(from, false)} as 1.`;
      return `Right size, wrong quality: ${show(n)} makes a ${ivWords(got)}. Adjust the accidental to make it ${want}.`;
    },
  };
}

/** Build a triad or seventh chord on a root, in a given inversion. */
export function chordTask(root: string, q: ChordQ, inversion = 0, clef: Clef = 'treble'): MusicTask {
  const tones = chord(root, q).map(spell);
  // a close-position model voicing with the right bass
  const model: string[] = [];
  const ordered = [...tones.slice(inversion), ...tones.slice(0, inversion)];
  for (const t of ordered) { let p = t; while (model.length && dia(p) <= dia(model[model.length - 1])) p = p.replace(/-?\d$/, (o) => String(Number(o) + 1)); model.push(p); }
  // keep the model voicing comfortably on the staff
  const low = { treble: 'A4', bass: 'E3', alto: 'D4' }[clef];
  while (dia(model[0]) > dia(low)) model.forEach((p, i) => { model[i] = p.replace(/-?\d$/, (o) => String(Number(o) - 1)); });
  return {
    kind: 'chord', clef, model, maxNotes: 6,
    grade: (v) => {
      if (v.length < tones.length) return `A ${q.length === 1 ? 'triad' : 'seventh chord'} needs ${tones.length} different notes; you have ${v.length}.`;
      const wrong = v.filter((n) => !tones.some((t) => pc(t) === pc(n)));
      if (wrong.length) return `${list(wrong)} ${wrong.length > 1 ? 'are' : 'is'} not in the chord. It is spelled ${tones.map((t) => show(t, false)).join('–')}.`;
      const got = identify(v);
      if (!got || got.q !== q) return `Those notes do not spell a ${CHORD_WORDS[q]} chord on ${show(root, false)}.`;
      if (got.inversion !== inversion) return `You built ${nameChord(v)}. For ${['root position', 'first inversion', 'second inversion', 'third inversion'][inversion]}, put ${show(tones[inversion], false)} at the bottom.`;
      return null;
    },
  };
}

/** Write a diatonic chord from a Roman numeral in a key. */
export function romanTask(roman: string, k: Key, clef: Clef = 'treble'): MusicTask {
  const r = parseRoman(roman, k);
  const base = chordTask(spell(r.root), r.q, r.inversion, clef);
  return {
    ...base,
    grade: (v: string[]) => {
      const msg = base.kind === 'chord' ? base.grade(v) : null;
      if (msg) return msg;
      const got = romanOf(v, k);
      return got === roman ? null : `You wrote ${got ?? 'a chord'}, not ${roman}.`;
    },
  } as MusicTask;
}

/** Write a scale, one note per slot, ascending. */
export function scaleTask(tonic: string, kind: ScaleKind, clef: Clef = 'treble'): MusicTask {
  const model = scale(tonic, kind).map(spell);
  return {
    kind: 'line', clef, slots: 8, model,
    grade: (v) => {
      const notes = v.filter(Boolean);
      if (notes.length < 8 || v.length !== 8 || v.some((n) => !n)) return `Write all eight notes, one in each slot (you have ${notes.length}).`;
      if (pc(v[0]) !== pc(model[0])) return `Start on the tonic, ${show(model[0], false)}.`;
      for (let i = 1; i < 8; i++) {
        if (dia(v[i]) !== dia(v[i - 1]) + 1) return `Note ${i + 1}: each note should be the next letter name up (after ${show(v[i - 1], false)} comes ${'CDEFGAB'[(('CDEFGAB'.indexOf(v[i - 1][0]) + 1) % 7)]}).`;
        if (pc(v[i]) !== pc(model[i])) return `Note ${i + 1} should be ${show(model[i], false)}, not ${show(v[i], false)}. Check the step from ${show(v[i - 1], false)}: it must be a ${simpleName(ivName(model[i - 1], model[i])) === 'm2' ? 'half step' : simpleName(ivName(model[i - 1], model[i])) === 'A2' ? 'step and a half (augmented 2nd)' : 'whole step'}.`;
      }
      return null;
    },
  };
}

/** Write a key signature, accidental by accidental, in the standard order and positions. */
export function keySigTask(fifths: number, clef: Clef, positions: string[]): MusicTask {
  return {
    kind: 'keysig', clef, fifths, model: positions,
    grade: (v) => {
      const w = v.filter(Boolean);
      if (w.length !== positions.length || v.length !== positions.length) return `This key has ${positions.length} ${fifths > 0 ? 'sharp' : 'flat'}${positions.length === 1 ? '' : 's'}; write ${positions.length === 1 ? 'it' : 'them'} left to right with no gaps (you wrote ${w.length}).`;
      for (let i = 0; i < positions.length; i++) {
        if (v[i][0] !== positions[i][0]) return `Accidental ${i + 1} should be on ${positions[i][0]}. The order of ${fifths > 0 ? 'sharps is F C G D A E B' : 'flats is B E A D G C F'}.`;
        if (v[i] !== positions[i]) return `Accidental ${i + 1} (${positions[i][0]}) is on the right letter but in the wrong octave. Use the standard spot on the staff, shown in the answer.`;
      }
      return null;
    },
  };
}

/** Four-part writing graded by the voice-leading checker (errors only; style warnings are shown, not counted). */
export function satbTask(k: Key, fifths: number, romans: string[], model: Satb[], given?: Satb[]): MusicTask {
  return { kind: 'satb', key: k, fifths, romans, given, model, grade: (v) => errorsOnly(checkSatb(romans.map((_, i) => ({ ...(given?.[i] ?? {}), ...(v[i] ?? {}) })), k, romans)) };
}

/** text form of a model answer, for the "the answer is …" line */
export function modelText(t: MusicTask): string {
  if (t.kind === 'satb') return t.model.map((c, i) => `${t.romans[i]}: ${['S', 'A', 'T', 'B'].map((v) => show(c[v as 'S']!)).join(' ')}`).join(' | ');
  return list(t.model);
}
/** a task's model answer must pass its own grader */
export function modelPasses(t: MusicTask): boolean {
  if (t.kind === 'satb') return t.grade(t.model.map((c, i) => Object.fromEntries(Object.entries(c).filter(([v]) => !t.given?.[i]?.[v as 'S'])))).length === 0;
  return t.grade(t.kind === 'chord' ? t.model.filter((n) => !t.given?.includes(n)) : t.model) === null;
}
export const sortPitches = (v: string[]) => [...v].sort((a, b) => midi(a) - midi(b));
