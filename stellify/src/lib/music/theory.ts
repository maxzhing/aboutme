/**
 * Stellify's music-theory engine. Every answer in AP Music Theory is computed or double-checked here,
 * so the course never relies on a hand-typed key. Pitches keep their spelling (F♯ and G♭ are different
 * notes on paper), which is what AP Music Theory grades.
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];
/** semitones above C for each letter */
const STEP = [0, 2, 4, 5, 7, 9, 11];

export interface Pitch { /** letter index, C = 0 … B = 6 */ L: number; /** −2 … +2 */ acc: number; /** scientific octave (middle C = C4) */ oct: number }

const ACC_IN: Record<string, number> = { '': 0, n: 0, '♮': 0, '#': 1, '♯': 1, s: 1, '##': 2, x: 2, '𝄪': 2, '♯♯': 2, b: -1, '♭': -1, bb: -2, '♭♭': -2, '𝄫': -2 };

/** "F#4", "Bb3", "C♯5", "Ebb4", "Fx4" → Pitch. Octave is optional (defaults to 4). */
export function parse(s: string): Pitch {
  const m = /^([A-Ga-g])(n|♮|##|#|♯♯|♯|x|𝄪|bb|b|♭♭|♭|𝄫|s)?(-?\d)?$/.exec(s.trim());
  if (!m) throw new Error(`Not a pitch: ${s}`);
  return { L: LETTERS.indexOf(m[1].toUpperCase() as Letter), acc: ACC_IN[m[2] ?? ''], oct: m[3] === undefined ? 4 : Number(m[3]) };
}
const P = (p: Pitch | string): Pitch => (typeof p === 'string' ? parse(p) : p);

const ACC_OUT: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' };
const ACC_SHOW: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };
/** ASCII spelling with octave: "F#4" */
export const spell = (p: Pitch | string) => { const q = P(p); return `${LETTERS[q.L]}${ACC_OUT[q.acc]}${q.oct}`; };
/** display name: "F♯4", or "F♯" with octave = false */
export const show = (p: Pitch | string, octave = true) => { const q = P(p); return `${LETTERS[q.L]}${ACC_SHOW[q.acc]}${octave ? q.oct : ''}`; };
/** pitch-class name without octave, ASCII: "F#" */
export const pc = (p: Pitch | string) => { const q = P(p); return `${LETTERS[q.L]}${ACC_OUT[q.acc]}`; };
export const midi = (p: Pitch | string) => { const q = P(p); return 12 * (q.oct + 1) + STEP[q.L] + q.acc; };
/** diatonic step number (staff position): C4 = 28, D4 = 29 … */
export const dia = (p: Pitch | string) => { const q = P(p); return q.oct * 7 + q.L; };
export const fromDia = (d: number, acc = 0): Pitch => ({ L: ((d % 7) + 7) % 7, acc, oct: Math.floor(d / 7) });
export const same = (a: Pitch | string, b: Pitch | string) => spell(a) === spell(b);
/** semitone class 0–11 */
export const chroma = (p: Pitch | string) => ((midi(p) % 12) + 12) % 12;
export const freq = (p: Pitch | string) => 440 * 2 ** ((midi(p) - 69) / 12);

/* ── intervals ───────────────────────────────────────────────────────── */

export type Quality = 'P' | 'M' | 'm' | 'A' | 'd' | 'AA' | 'dd';
export interface Interval { q: Quality; n: number }
const PERFECT = new Set([1, 4, 5]);
/** semitones of the major or perfect version of each simple interval number */
const REF = [0, 0, 2, 4, 5, 7, 9, 11];

export function parseInterval(s: string): Interval {
  const m = /^(AA|dd|P|M|m|A|d)(\d+)$/.exec(s.trim());
  if (!m) throw new Error(`Not an interval: ${s}`);
  return { q: m[1] as Quality, n: Number(m[2]) };
}
const simpleN = (n: number) => ((n - 1) % 7) + 1;
function semisOf(iv: Interval): number {
  const s = simpleN(iv.n), oct = Math.floor((iv.n - 1) / 7);
  const base = REF[s] + 12 * oct;
  if (PERFECT.has(s)) return base + ({ P: 0, A: 1, AA: 2, d: -1, dd: -2 } as Record<string, number>)[iv.q];
  return base + ({ M: 0, m: -1, A: 1, AA: 2, d: -2, dd: -3 } as Record<string, number>)[iv.q];
}

/** The interval from a to b, measured from the lower note. Returns e.g. { q: 'm', n: 6 }. */
export function interval(a: Pitch | string, b: Pitch | string): Interval {
  let lo = P(a), hi = P(b);
  if (dia(hi) < dia(lo) || (dia(hi) === dia(lo) && midi(hi) < midi(lo))) [lo, hi] = [hi, lo];
  const n = dia(hi) - dia(lo) + 1;
  const s = simpleN(n), oct = Math.floor((n - 1) / 7);
  const diff = midi(hi) - midi(lo) - (REF[s] + 12 * oct);
  let q: Quality;
  if (PERFECT.has(s)) q = (({ 0: 'P', 1: 'A', 2: 'AA', [-1]: 'd', [-2]: 'dd' }) as Record<number, Quality>)[diff];
  else q = (({ 0: 'M', [-1]: 'm', 1: 'A', 2: 'AA', [-2]: 'd', [-3]: 'dd' }) as Record<number, Quality>)[diff];
  if (!q) throw new Error(`Interval too altered: ${spell(lo)}–${spell(hi)}`);
  return { q, n };
}
/** "m6", "P5", "A4" (compound intervals keep their size: "M10") */
export const ivName = (a: Pitch | string, b: Pitch | string) => { const i = interval(a, b); return `${i.q}${i.n}`; };
/** the simple version of an interval name: "M10" → "M3" */
export const simpleName = (s: string) => { const i = parseInterval(s); return `${i.q}${simpleN(i.n)}`; };
const QNAME: Record<Quality, string> = { P: 'perfect', M: 'major', m: 'minor', A: 'augmented', d: 'diminished', AA: 'doubly augmented', dd: 'doubly diminished' };
const ORD = ['', 'unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'octave'];
export const ivWords = (s: string) => { const i = parseInterval(s); return `${QNAME[i.q]} ${i.n <= 8 ? ORD[i.n] : `${i.n}th`}`; };
export const semitones = (s: string) => semisOf(parseInterval(s));

/** The note an interval above (or below, with down = true) a pitch, correctly spelled. */
export function transpose(p: Pitch | string, iv: string, down = false): Pitch {
  const a = P(p), i = parseInterval(iv);
  const d = dia(a) + (down ? -(i.n - 1) : i.n - 1);
  const t = fromDia(d);
  const want = midi(a) + (down ? -semisOf(i) : semisOf(i));
  t.acc = want - midi(t);
  if (t.acc < -2 || t.acc > 2) throw new Error(`Cannot spell ${iv} from ${spell(a)}`);
  return t;
}
/** Inversion of a simple interval: M3 ↔ m6, P4 ↔ P5, A4 ↔ d5. */
export function invert(iv: string): string {
  const i = parseInterval(iv);
  const n = 9 - simpleN(i.n);
  const q = ({ P: 'P', M: 'm', m: 'M', A: 'd', d: 'A', AA: 'dd', dd: 'AA' } as Record<Quality, Quality>)[i.q];
  return `${q}${n}`;
}
/** consonant above the bass in common-practice style (P4 counts as a dissonance there) */
export const isConsonant = (iv: string) => ['P1', 'P5', 'M3', 'm3', 'M6', 'm6'].includes(simpleName(iv));

/* ── scales and keys ─────────────────────────────────────────────────── */

export type Mode = 'major' | 'minor';
export interface Key { tonic: string; mode: Mode }
const STEPS: Record<string, string[]> = {
  major: ['M2', 'M2', 'm2', 'M2', 'M2', 'M2', 'm2'],
  natural: ['M2', 'm2', 'M2', 'M2', 'm2', 'M2', 'M2'],
  harmonic: ['M2', 'm2', 'M2', 'M2', 'm2', 'A2', 'm2'],
  melodic: ['M2', 'm2', 'M2', 'M2', 'M2', 'M2', 'm2'],
  ionian: ['M2', 'M2', 'm2', 'M2', 'M2', 'M2', 'm2'],
  dorian: ['M2', 'm2', 'M2', 'M2', 'M2', 'm2', 'M2'],
  phrygian: ['m2', 'M2', 'M2', 'M2', 'm2', 'M2', 'M2'],
  lydian: ['M2', 'M2', 'M2', 'm2', 'M2', 'M2', 'm2'],
  mixolydian: ['M2', 'M2', 'm2', 'M2', 'M2', 'm2', 'M2'],
  aeolian: ['M2', 'm2', 'M2', 'M2', 'm2', 'M2', 'M2'],
  locrian: ['m2', 'M2', 'M2', 'm2', 'M2', 'M2', 'M2'],
};
export type ScaleKind = keyof typeof STEPS;
/** Eight notes, tonic to tonic, ascending (melodic minor is the ascending form). */
export function scale(tonic: Pitch | string, kind: ScaleKind = 'major'): Pitch[] {
  const out = [P(tonic)];
  for (const s of STEPS[kind]) out.push(transpose(out[out.length - 1], s));
  return out;
}
/** Descending melodic minor = natural minor descending. */
export const melodicDown = (tonic: Pitch | string) => scale(tonic, 'natural').reverse();
/** Major pentatonic (scale degrees 1 2 3 5 6) and whole-tone and chromatic collections, by semitone pattern. */
export const pentatonic = (tonic: Pitch | string) => { const s = scale(tonic, 'major'); return [s[0], s[1], s[2], s[4], s[5], s[7]]; };
export const minorPentatonic = (tonic: Pitch | string) => { const s = scale(tonic, 'natural'); return [s[0], s[2], s[3], s[4], s[6], s[7]]; };

export const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
/** Signature as a count on the circle of fifths: +3 = three sharps, −2 = two flats. */
export function fifthsOf(k: Key): number {
  const t = P(k.tonic);
  // walk around the circle from C (major) or A (minor)
  const start = k.mode === 'major' ? 'C4' : 'A4';
  let p = P(start);
  for (let f = 0; f <= 7; f++) { if (pc(p) === pc(t)) return f; p = transpose(p, 'P5'); }
  p = P(start);
  for (let f = 0; f >= -7; f--) { if (pc(p) === pc(t)) return f; p = transpose(p, 'P4'); }
  throw new Error(`No standard key signature for ${k.tonic} ${k.mode}`);
}
/** letters carrying an accidental in a signature, in the order they are written: e.g. +3 → F♯ C♯ G♯ */
export const sigAccidentals = (fifths: number): string[] => (fifths >= 0 ? SHARP_ORDER.slice(0, fifths).map((l) => `${l}#`) : FLAT_ORDER.slice(0, -fifths).map((l) => `${l}b`));
export function keyFromFifths(fifths: number, mode: Mode): Key {
  let p = P(mode === 'major' ? 'C4' : 'A4');
  for (let i = 0; i < Math.abs(fifths); i++) p = transpose(p, fifths > 0 ? 'P5' : 'P4');
  return { tonic: pc(p), mode };
}
export const relative = (k: Key): Key => (k.mode === 'major' ? { tonic: pc(transpose(k.tonic + '4', 'm3', true)), mode: 'minor' } : { tonic: pc(transpose(k.tonic + '4', 'm3')), mode: 'major' });
export const parallel = (k: Key): Key => ({ tonic: k.tonic, mode: k.mode === 'major' ? 'minor' : 'major' });
export const keyName = (k: Key) => `${show(k.tonic, false)} ${k.mode}`;
/** apply a key signature to a written letter: what the note sounds as when no accidental is written */
export const inKey = (letter: string, fifths: number) => { const acc = sigAccidentals(fifths).find((a) => a[0] === letter); return acc ?? letter; };

export const DEGREE_NAMES = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading tone'];
/** solfège (movable do; minor uses do-based minor: do re me fa sol le te/ti) */
export const SOLFEGE_MAJOR = ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti'];
export const SOLFEGE_MINOR = ['do', 're', 'me', 'fa', 'sol', 'le', 'te'];

/** The scale degree (1–7) of a pitch in a key, using the harmonic-minor leading tone in minor. */
export function degreeOf(p: Pitch | string, k: Key): number | null {
  const s = scale(k.tonic + '4', k.mode === 'major' ? 'major' : 'natural').slice(0, 7).map(pc);
  const i = s.indexOf(pc(p));
  if (i >= 0) return i + 1;
  if (k.mode === 'minor' && pc(p) === pc(transpose(k.tonic + '4', 'M7'))) return 7; // raised 7 (leading tone)
  if (k.mode === 'minor' && pc(p) === pc(transpose(k.tonic + '4', 'M6'))) return 6; // raised 6 (melodic minor)
  return null;
}

/* ── chords ──────────────────────────────────────────────────────────── */

export type TriadQ = 'M' | 'm' | 'd' | 'A';
export type SeventhQ = 'MM7' | 'Mm7' | 'mm7' | 'hd7' | 'fd7';
export type ChordQ = TriadQ | SeventhQ;
const SHAPE: Record<ChordQ, string[]> = {
  M: ['M3', 'P5'], m: ['m3', 'P5'], d: ['m3', 'd5'], A: ['M3', 'A5'],
  MM7: ['M3', 'P5', 'M7'], Mm7: ['M3', 'P5', 'm7'], mm7: ['m3', 'P5', 'm7'], hd7: ['m3', 'd5', 'm7'], fd7: ['m3', 'd5', 'd7'],
};
export const CHORD_WORDS: Record<ChordQ, string> = { M: 'major', m: 'minor', d: 'diminished', A: 'augmented', MM7: 'major seventh', Mm7: 'dominant seventh (major-minor)', mm7: 'minor seventh', hd7: 'half-diminished seventh', fd7: 'fully diminished seventh' };
/** root-position chord, root first: chord('D4', 'm') → D4 F4 A4 */
export const chord = (root: Pitch | string, q: ChordQ): Pitch[] => [P(root), ...SHAPE[q].map((iv) => transpose(root, iv))];

/** Inversion figures (figured bass) as AP uses them. */
export const TRIAD_FIG = ['', '6', '64'];
export const SEVENTH_FIG = ['7', '65', '43', '42'];

export interface ChordId { root: Pitch; q: ChordQ; inversion: number; figure: string }
/**
 * Name the chord a set of pitches spells (any voicing, doublings allowed). Returns null if the
 * pitches are not a tertian triad or seventh chord. The bass (lowest note) sets the inversion.
 */
export function identify(notes: (Pitch | string)[]): ChordId | null {
  const ps = notes.map(P);
  if (!ps.length) return null;
  const bass = ps.reduce((a, b) => (midi(b) < midi(a) || (midi(b) === midi(a) && dia(b) < dia(a)) ? b : a));
  const classes = [...new Map(ps.map((p) => [pc(p), p])).values()];
  for (const r of classes) {
    for (const q of Object.keys(SHAPE) as ChordQ[]) {
      const want = chord({ ...r, oct: 4 }, q).map(pc);
      if (want.length === classes.length && classes.every((c) => want.includes(pc(c)))) {
        const inv = want.indexOf(pc(bass));
        return { root: { ...r }, q, inversion: inv, figure: (want.length === 3 ? TRIAD_FIG : SEVENTH_FIG)[inv] };
      }
    }
  }
  return null;
}
/** Allow an incomplete chord (missing fifth) when matching against an expected chord. */
export function matchesChord(notes: (Pitch | string)[], root: Pitch | string, q: ChordQ, allowNoFifth = true): boolean {
  const want = chord(P(root), q).map(pc);
  const have = new Set(notes.map((n) => pc(n)));
  if (![...have].every((h) => want.includes(h))) return false;
  const missing = want.filter((w) => !have.has(w));
  if (!missing.length) return true;
  return allowNoFifth && missing.length === 1 && missing[0] === want[2] && want.length >= 3 && have.has(want[1]);
}

/* ── Roman numerals ──────────────────────────────────────────────────── */

const RN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
export interface Roman { degree: number; q: ChordQ; figure: string; /** secondary target degree, e.g. V/V → 5 */ of?: number }

/** the diatonic chord on a degree; minor uses the harmonic-minor leading tone for V and vii° (AP convention) */
export function diatonicChord(k: Key, degree: number, seventh = false): { root: Pitch; q: ChordQ } {
  let sc = scale(k.tonic + '4', k.mode === 'major' ? 'major' : 'natural').slice(0, 7);
  if (k.mode === 'minor' && (degree === 5 || degree === 7)) sc = scale(k.tonic + '4', 'harmonic').slice(0, 7);
  const tones = [0, 2, 4, 6].slice(0, seventh ? 4 : 3).map((s) => { const p = sc[(degree - 1 + s) % 7]; return p; });
  // re-stack upward from the root
  const root = tones[0];
  const stacked = [root, ...tones.slice(1).map((t, i) => { let x = { ...t }; while (dia(x) <= dia(root) + 2 * i) x = { ...x, oct: x.oct + 1 }; return x; })];
  const id = identify(stacked)!;
  return { root, q: id.q };
}

/** "V65", "ii6", "viio7", "V7/V", "viiø7", "Cad64" style strings → chord in a key. */
export function parseRoman(s: string, k: Key): { root: Pitch; q: ChordQ; inversion: number } {
  const [main, target] = s.split('/');
  let key = k;
  if (target) {
    const t = parseRoman(target, k);
    key = { tonic: pc(t.root), mode: t.q === 'm' ? 'minor' : 'major' };
  }
  const m = /^(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(o|°|ø|\+)?(7|65|43|42|6|64)?$/.exec(main);
  if (!m) throw new Error(`Not a Roman numeral: ${s}`);
  const degree = RN.indexOf(m[1].toUpperCase()) + 1;
  const upper = m[1] === m[1].toUpperCase();
  const fig = m[3] ?? '';
  const seventh = ['7', '65', '43', '42'].includes(fig);
  const sc = scale(key.tonic + '4', key.mode === 'major' ? 'major' : 'harmonic');
  // the root: in minor, VI and III and VII (upper case, no °) use the natural-minor degree; vii° uses the leading tone
  let root = sc[degree - 1];
  if (key.mode === 'minor') {
    const nat = scale(key.tonic + '4', 'natural')[degree - 1];
    if (degree === 7 && upper) root = nat; // VII (subtonic)
    else if (degree !== 7) root = nat;
  }
  let q: ChordQ;
  const mark = m[2];
  if (seventh) {
    if (mark === 'ø') q = 'hd7';
    else if (mark === 'o' || mark === '°') q = 'fd7';
    else if (upper) q = degree === 5 || target || (key.mode === 'minor' && degree === 7) ? 'Mm7' : 'MM7';
    else q = 'mm7';
    // diatonic sevenths keep their key quality (IV7 in major is MM7, V7 is Mm7)
    if (!mark && !target) { const d = diatonicChord(key, degree, true); if ((upper && (d.q === 'MM7' || d.q === 'Mm7')) || (!upper && d.q === 'mm7')) q = d.q; }
  } else q = mark === 'o' || mark === '°' ? 'd' : mark === '+' ? 'A' : upper ? 'M' : 'm';
  const inversion = seventh ? SEVENTH_FIG.indexOf(fig) : TRIAD_FIG.indexOf(fig);
  return { root: { ...root, oct: 4 }, q, inversion };
}

/** The Roman numeral of a chord in a key (diatonic chords and applied V / vii° chords). */
export function romanOf(notes: (Pitch | string)[], k: Key): string | null {
  const id = identify(notes);
  if (!id) return null;
  const fig = id.figure;
  const tri = id.q.length === 1;
  const sym = (q: ChordQ) => (q === 'd' ? 'o' : q === 'A' ? '+' : q === 'hd7' ? 'ø' : q === 'fd7' ? 'o' : '');
  const caseOf = (q: ChordQ, n: string) => (['M', 'A', 'MM7', 'Mm7'].includes(q) ? n : n.toLowerCase());
  const deg = degreeOf(id.root, k);
  if (deg) {
    const want = diatonicChord(k, deg, !tri);
    if (pc(want.root) === pc(id.root) && want.q === id.q) {
      const f = fig === '7' && !tri ? '7' : fig;
      return `${caseOf(id.q, RN[deg - 1])}${sym(id.q)}${f}`;
    }
    // minor-key alternates: subtonic VII, and v / iv borrowed from natural minor
    if (k.mode === 'minor') {
      const nat = scale(k.tonic + '4', 'natural')[deg - 1];
      if (pc(nat) === pc(id.root) && (id.q === 'M' || id.q === 'm' || id.q === 'Mm7')) return `${caseOf(id.q, RN[deg - 1])}${fig}`;
    }
  }
  // secondary dominants and leading-tone chords
  for (let t = 2; t <= 7; t++) {
    const target = diatonicChord(k, t);
    if (target.q === 'd' || target.q === 'A') continue;
    const dom = transpose(target.root, 'P5');
    const lt = transpose(target.root, 'm2', true);
    if (pc(id.root) === pc(dom) && (id.q === 'M' || id.q === 'Mm7')) return `V${tri ? fig : fig}/${caseOf(target.q, RN[t - 1])}`;
    if (pc(id.root) === pc(lt) && (id.q === 'd' || id.q === 'fd7' || id.q === 'hd7')) return `vii${sym(id.q)}${fig}/${caseOf(target.q, RN[t - 1])}`;
  }
  return null;
}

/* ── SATB voice leading ──────────────────────────────────────────────── */

export type Voice = 'S' | 'A' | 'T' | 'B';
export const VOICES: Voice[] = ['S', 'A', 'T', 'B'];
export const VOICE_NAME: Record<Voice, string> = { S: 'soprano', A: 'alto', T: 'tenor', B: 'bass' };
/** comfortable AP ranges */
export const RANGE: Record<Voice, [string, string]> = { S: ['C4', 'G5'], A: ['G3', 'D5'], T: ['C3', 'G4'], B: ['E2', 'D4'] };
export type Satb = Partial<Record<Voice, string>>;
export interface Issue { level: 'error' | 'warn'; at: number; to?: number; voices?: Voice[]; rule: string; msg: string }

/**
 * Check four-part writing against the common-practice rules AP Music Theory grades:
 * chord spelling and inversion, ranges, spacing, crossing, overlap, parallel and direct perfect
 * intervals, doubling, the leading tone, chordal sevenths and augmented seconds.
 */
export function checkSatb(chords: Satb[], k: Key, romans?: string[]): Issue[] {
  const out: Issue[] = [];
  const lt = transpose(k.tonic + '4', 'M7'); // the leading tone (raised 7 in minor)
  chords.forEach((c, i) => {
    const missing = VOICES.filter((v) => !c[v]);
    if (missing.length) { out.push({ level: 'error', at: i, voices: missing, rule: 'complete', msg: `Chord ${i + 1}: write a note for the ${missing.map((v) => VOICE_NAME[v]).join(', ')}.` }); return; }
    const notes = VOICES.map((v) => P(c[v]!));
    for (const v of VOICES) { const [lo, hi] = RANGE[v]; const m = midi(c[v]!); if (m < midi(lo) || m > midi(hi)) out.push({ level: 'error', at: i, voices: [v], rule: 'range', msg: `Chord ${i + 1}: the ${VOICE_NAME[v]} (${show(c[v]!)}) is outside its range, ${show(lo)}–${show(hi)}.` }); }
    for (let j = 0; j < 3; j++) { const hi = VOICES[j], lo = VOICES[j + 1]; if (midi(c[hi]!) < midi(c[lo]!)) out.push({ level: 'error', at: i, voices: [hi, lo], rule: 'crossing', msg: `Chord ${i + 1}: the ${VOICE_NAME[hi]} is below the ${VOICE_NAME[lo]} (voice crossing).` }); }
    if (midi(c.S!) - midi(c.A!) > 12) out.push({ level: 'error', at: i, voices: ['S', 'A'], rule: 'spacing', msg: `Chord ${i + 1}: more than an octave between soprano and alto.` });
    if (midi(c.A!) - midi(c.T!) > 12) out.push({ level: 'error', at: i, voices: ['A', 'T'], rule: 'spacing', msg: `Chord ${i + 1}: more than an octave between alto and tenor.` });
    if (midi(c.T!) - midi(c.B!) > 19) out.push({ level: 'warn', at: i, voices: ['T', 'B'], rule: 'spacing', msg: `Chord ${i + 1}: more than a twelfth between tenor and bass; keep the voices closer.` });
    const rn = romans?.[i];
    if (rn) {
      const want = parseRoman(rn, k);
      const seventh = want.q.length > 1;
      const tones = chord(want.root, want.q);
      const foreign = notes.filter((n) => !tones.some((t) => pc(t) === pc(n)));
      if (foreign.length) out.push({ level: 'error', at: i, rule: 'spelling', msg: `Chord ${i + 1}: ${rn} is spelled ${tones.map((t) => show(t, false)).join('–')}; ${[...new Set(foreign.map((f) => show(f, false)))].join(' and ')} ${foreign.length > 1 ? 'do' : 'does'} not belong.` });
      else {
        const has = new Set(notes.map((n) => pc(n)));
        if (!has.has(pc(tones[0]))) out.push({ level: 'error', at: i, rule: 'root', msg: `Chord ${i + 1}: the root (${show(tones[0], false)}) is missing.` });
        if (!has.has(pc(tones[1]))) out.push({ level: 'error', at: i, rule: 'third', msg: `Chord ${i + 1}: the third (${show(tones[1], false)}) is missing.` });
        if (seventh && !has.has(pc(tones[3]))) out.push({ level: 'error', at: i, rule: 'seventh', msg: `Chord ${i + 1}: the seventh (${show(tones[3], false)}) is missing.` });
        if (pc(c.B!) !== pc(tones[want.inversion])) out.push({ level: 'error', at: i, voices: ['B'], rule: 'inversion', msg: `Chord ${i + 1}: ${rn} needs ${show(tones[want.inversion], false)} in the bass.` });
        if (!has.has(pc(tones[2])) && want.inversion !== 0) out.push({ level: 'warn', at: i, rule: 'fifth', msg: `Chord ${i + 1}: only leave out the fifth in a root-position chord.` });
      }
      const ltCount = notes.filter((n) => pc(n) === pc(lt)).length;
      if (ltCount > 1) out.push({ level: 'error', at: i, rule: 'doubling', msg: `Chord ${i + 1}: the leading tone (${show(lt, false)}) is doubled. Never double the leading tone.` });
      if (seventh) { const sev = pc(tones[3]); if (notes.filter((n) => pc(n) === sev).length > 1) out.push({ level: 'error', at: i, rule: 'doubling', msg: `Chord ${i + 1}: the chordal seventh is doubled.` }); }
    }
  });
  for (let i = 0; i + 1 < chords.length; i++) {
    const a = chords[i], b = chords[i + 1];
    if (VOICES.some((v) => !a[v] || !b[v])) continue;
    // overlap: a voice moves past where the neighbouring voice just was
    for (let j = 0; j < 3; j++) {
      const hi = VOICES[j], lo = VOICES[j + 1];
      if (midi(b[lo]!) > midi(a[hi]!) || midi(b[hi]!) < midi(a[lo]!)) out.push({ level: 'error', at: i, to: i + 1, voices: [hi, lo], rule: 'overlap', msg: `Chords ${i + 1}–${i + 2}: the ${VOICE_NAME[hi]} and ${VOICE_NAME[lo]} overlap (one moves past where the other just was).` });
    }
    // parallel (consecutive) perfect fifths and octaves/unisons, and direct perfect intervals in the outer voices
    for (let x = 0; x < 4; x++) for (let y = x + 1; y < 4; y++) {
      const u = VOICES[x], l = VOICES[y];
      if (midi(a[u]!) === midi(b[u]!) || midi(a[l]!) === midi(b[l]!)) continue; // a common tone or a held note is never a parallel
      let n1: string, n2: string;
      try { n1 = simpleName(ivName(a[l]!, a[u]!)); n2 = simpleName(ivName(b[l]!, b[u]!)); } catch { continue; }
      const kind = (n: string) => (n === 'P5' ? 'fifths' : n === 'P1' ? 'octaves' : null);
      if (kind(n1) && kind(n1) === kind(n2)) out.push({ level: 'error', at: i, to: i + 1, voices: [u, l], rule: 'parallels', msg: `Chords ${i + 1}–${i + 2}: parallel ${kind(n1)} between the ${VOICE_NAME[u]} and ${VOICE_NAME[l]}.` });
      else if (u === 'S' && l === 'B' && kind(n2)) {
        const sUp = midi(b.S!) - midi(a.S!), bUp = midi(b.B!) - midi(a.B!);
        if (Math.sign(sUp) === Math.sign(bUp) && Math.abs(sUp) > 2) out.push({ level: 'error', at: i, to: i + 1, voices: ['S', 'B'], rule: 'direct', msg: `Chords ${i + 1}–${i + 2}: direct ${kind(n2)} in the outer voices (both move the same way into a perfect interval while the soprano leaps).` });
      }
    }
    // melodic augmented seconds and leaps larger than an octave
    for (const v of VOICES) {
      try {
        if (midi(a[v]!) === midi(b[v]!)) continue;
        const iv = ivName(a[v]!, b[v]!);
        if (simpleName(iv) === 'A2' || iv === 'A4') out.push({ level: 'error', at: i, to: i + 1, voices: [v], rule: 'melodic', msg: `Chords ${i + 1}–${i + 2}: the ${VOICE_NAME[v]} moves by an ${ivWords(iv)}, which is hard to sing.` });
        else if (Math.abs(midi(b[v]!) - midi(a[v]!)) > 12) out.push({ level: 'error', at: i, to: i + 1, voices: [v], rule: 'melodic', msg: `Chords ${i + 1}–${i + 2}: the ${VOICE_NAME[v]} leaps more than an octave.` });
      } catch { /* very altered interval: ignore */ }
    }
    // tendency tones out of a dominant-function chord
    if (romans?.[i] && romans?.[i + 1]) {
      const r1 = parseRoman(romans[i], k), r2 = parseRoman(romans[i + 1], k);
      const d2 = degreeOf(r2.root, k);
      const resolves = !romans[i].includes('/') && /^(V|vii)/.test(romans[i]) && !romans[i + 1].includes('/') && (d2 === 1 || d2 === 6);
      if (resolves) {
        for (const v of VOICES) if (pc(a[v]!) === pc(lt) && !(pc(b[v]!) === pc(k.tonic) && midi(b[v]!) > midi(a[v]!))) {
          const outer = v === 'S' || v === 'B';
          out.push({ level: outer ? 'error' : 'warn', at: i, to: i + 1, voices: [v], rule: 'leading-tone', msg: outer ? `Chords ${i + 1}–${i + 2}: the leading tone in the ${VOICE_NAME[v]} must rise to the tonic.` : `Chords ${i + 1}–${i + 2}: the leading tone in the ${VOICE_NAME[v]} would normally rise to the tonic (an inner voice may drop only to complete the tonic chord).` });
        }
      }
      // a chordal seventh resolves down by step (unless the same chord simply changes inversion)
      const sameChord = pc(r1.root) === pc(r2.root) && r1.q === r2.q;
      if (r1.q.length > 1 && !sameChord) {
        const sev = pc(chord(r1.root, r1.q)[3]);
        for (const v of VOICES) if (pc(a[v]!) === sev) {
          const step = midi(a[v]!) - midi(b[v]!);
          if (step !== 1 && step !== 2) out.push({ level: 'error', at: i, to: i + 1, voices: [v], rule: 'seventh', msg: `Chords ${i + 1}–${i + 2}: the chordal seventh (${show(a[v]!, false)}) in the ${VOICE_NAME[v]} must resolve down by step.` });
        }
      }
    }
  }
  return out;
}
export const errorsOnly = (xs: Issue[]) => xs.filter((x) => x.level === 'error');

/* ── rhythm and meter ────────────────────────────────────────────────── */

/** note values in quarter-note beats */
export const DUR: Record<string, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };
export const durBeats = (d: string, dots = 0) => { let v = DUR[d], add = v; for (let i = 0; i < dots; i++) { add /= 2; v += add; } return v; };
/** meter classification: simple/compound × duple/triple/quadruple */
export function meterOf(top: number, bottom: number): { kind: 'simple' | 'compound'; beats: number; type: 'duple' | 'triple' | 'quadruple'; beatNote: string } {
  const compound = top % 3 === 0 && top > 3;
  const beats = compound ? top / 3 : top;
  const type = beats === 2 ? 'duple' : beats === 3 ? 'triple' : 'quadruple';
  const beatNote = compound ? `dotted ${({ 2: 'whole', 4: 'half', 8: 'quarter', 16: 'eighth' } as Record<number, string>)[bottom]}` : ({ 2: 'half', 4: 'quarter', 8: 'eighth', 16: 'sixteenth' } as Record<number, string>)[bottom];
  return { kind: compound ? 'compound' : 'simple', beats, type, beatNote };
}
/** total length of a measure in quarter-note beats */
export const measureBeats = (top: number, bottom: number) => (top * 4) / bottom;

/* ── transposing instruments ─────────────────────────────────────────── */

/** written → concert pitch for common transposing instruments */
export const TRANSPOSE: Record<string, { iv: string; down: boolean; label: string }> = {
  'Bb clarinet': { iv: 'M2', down: true, label: 'sounds a major 2nd lower than written' },
  'Bb trumpet': { iv: 'M2', down: true, label: 'sounds a major 2nd lower than written' },
  'F horn': { iv: 'P5', down: true, label: 'sounds a perfect 5th lower than written' },
  'Eb alto saxophone': { iv: 'M6', down: true, label: 'sounds a major 6th lower than written' },
  'Bb tenor saxophone': { iv: 'M9', down: true, label: 'sounds a major 9th lower than written' },
};
export const concertPitch = (written: string, instrument: string) => { const t = TRANSPOSE[instrument]; return transpose(written, t.iv, t.down); };

/* ── key-signature layout ────────────────────────────────────────────── */

const SHARP_POS: Record<'treble' | 'bass' | 'alto', string[]> = { treble: ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'], bass: ['F3', 'C3', 'G3', 'D3', 'A2', 'E3', 'B2'], alto: ['F4', 'C4', 'G4', 'D4', 'A3', 'E4', 'B3'] };
const FLAT_POS: Record<'treble' | 'bass' | 'alto', string[]> = { treble: ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4'], bass: ['B2', 'E3', 'A2', 'D3', 'G2', 'C3', 'F2'], alto: ['B3', 'E4', 'A3', 'D4', 'G3', 'C4', 'F3'] };
/** where each accidental of a key signature is written on a clef, in order (e.g. +2 treble → F#5, C#5) */
export const keySigPositions = (fifths: number, clef: 'treble' | 'bass' | 'alto'): string[] =>
  (fifths >= 0 ? SHARP_POS[clef].slice(0, fifths).map((p) => `${p[0]}#${p.slice(1)}`) : FLAT_POS[clef].slice(0, -fifths).map((p) => `${p[0]}b${p.slice(1)}`));
