import { parseNumeric } from '../../lib/answers';
import type { ListenSpec, StaffSpec } from '../../lib/music/score';
import type { MusicTask } from '../../lib/music/tasks';

/**
 * AP Calculus BC self-study course. Original lessons and problems, organized by the ten units of
 * the AP Calculus BC course. Every numeric answer has an independent check() that is run in tests.
 */
export type Note =
  | { k: 'p'; t: string }        // explanation paragraph
  | { k: 'rule'; title: string; t: string }  // boxed definition / theorem
  | { k: 'formula'; t: string }  // display formula (LaTeX)
  | { k: 'tip'; t: string }      // teacher's tip
  | { k: 'warn'; t: string }     // common mistake
  | { k: 'list'; items: string[] }
  /* music notation, sound and hands-on practice (AP Music Theory) */
  | { k: 'staff'; staff: StaffSpec; caption?: string; listen?: ListenSpec }
  | { k: 'keys'; notes: string[]; caption: string }
  | { k: 'try'; prompt: string; task: MusicTask };

/** the plain text of a note, for saving to the notebook and for searching */
export const noteText = (n: Note): string => (n.k === 'list' ? n.items.join(' ') : n.k === 'rule' ? `${n.title}: ${n.t}` : n.k === 'staff' ? n.caption ?? n.staff.label : n.k === 'keys' ? n.caption : n.k === 'try' ? n.prompt : n.t);

export interface Example { q: string; steps: string[]; a: string; staff?: StaffSpec; listen?: ListenSpec }

export interface CalcProblem {
  id: string;
  q: string;
  /** mcq: choice index. free response: accepted answers, numbers/fractions or 'inf', '-inf', 'dne'. */
  answer: number | string[];
  choices?: string[];
  hint: string;
  solution: string[];
  /** independent numerical verification of the keyed answer */
  check?: () => boolean;
  level: 1 | 2 | 3; // 1 warm-up, 2 standard AP, 3 hard
  /** notation shown with the question */
  staff?: StaffSpec;
  /** something to listen to (aural questions) */
  listen?: ListenSpec;
  /** a hands-on task: the student writes the answer on a staff and the music engine grades it */
  task?: MusicTask;
}

export interface CalcLesson {
  id: string;
  unit: number;
  n: number;
  title: string;
  /** the teacher's opening: what we are doing today and why it matters */
  intro: string;
  goals: string[];
  notes: Note[];
  examples: Example[];
  practice: CalcProblem[];
  remember: string[];
  /** the teacher's sign-off: how to know you are ready, what to do next */
  checkIn: string;
}

/**
 * The tutor layer: everything a complete beginner needs to truly understand a lesson, and then to teach it.
 * Written for a student who is meeting the idea for the first time.
 */
export interface LessonTutor {
  /** the big idea in everyday words, a few short paragraphs */
  bigIdea: string[];
  /** one everyday picture that makes the idea stick */
  picture: { title: string; t: string };
  /** new words, explained simply */
  words: { term: string; means: string }[];
  /** earlier math this lesson leans on, each with a quick refresher; lesson = id of a lesson that teaches it */
  tools: { name: string; refresher: string; lesson?: string }[];
  /** for each worked example, one plain-words reason per step (same lengths as the steps) */
  why: string[][];
  /** slow, complete walk-throughs for every practice problem, keyed by problem id */
  walk: Record<string, string[]>;
  /** teach it back: a mini lesson plan, questions a student will ask (with answers), and the key points to hit */
  teach: { plan: string[]; questions: { q: string; a: string }[]; keyPoints: string[] };
}

export interface CalcUnit { n: number; title: string; weeks: number; examWeight: string; topics: string[]; summary: string }

/* ── answer checking ── */
const KEY: Record<string, string> = { infinity: 'inf', '∞': 'inf', '+inf': 'inf', '+∞': 'inf', '+infinity': 'inf', '-infinity': '-inf', '-∞': '-inf', '−∞': '-inf', 'doesnotexist': 'dne', dne: 'dne' };
export function normalizeCalc(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '').replace(/−/g, '-').replace(/[$%,]/g, '');
  return KEY[s] ?? s;
}
export function calcCorrect(p: CalcProblem, input: string | null, exact = false): boolean {
  if (input === null || input === '') return false;
  if (typeof p.answer === 'number') return input === String(p.answer);
  const got = normalizeCalc(input);
  // exact mode (program output): 3 and 3.0 are different answers
  if (exact) return p.answer.some((a) => normalizeCalc(a) === got);
  return p.answer.some((a) => {
    const want = normalizeCalc(a);
    if (want === got) return true;
    const x = parseNumeric(got), y = parseNumeric(want);
    return x !== null && y !== null && Math.abs(x - y) < 1e-3 * Math.max(1, Math.abs(y));
  });
}
export const answerLabel = (p: CalcProblem) => (typeof p.answer === 'number' ? 'ABCDE'[p.answer] : p.answer[0] === 'inf' ? '∞' : p.answer[0] === '-inf' ? '−∞' : p.answer[0] === 'dne' ? 'does not exist' : p.answer[0]);

/* ── numerical helpers for check() ── */
export const near = (a: number, b: number, eps = 1e-4) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(b));
/** two-sided limit estimate (both sides must agree) */
export const lim = (f: (x: number) => number, a: number) => { const l = f(a - 1e-6), r = f(a + 1e-6); return Math.abs(l - r) < 1e-3 * Math.max(1, Math.abs(l)) ? (l + r) / 2 : NaN; };
export const limL = (f: (x: number) => number, a: number) => f(a - 1e-7);
export const limR = (f: (x: number) => number, a: number) => f(a + 1e-7);
export const limInf = (f: (x: number) => number, sign = 1) => f(sign * 1e7);
/** central-difference derivative */
export const d = (f: (x: number) => number, x: number, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);
export const BIG = 1e5;
/** second derivative by central differences */
export const d2 = (f: (x: number) => number, x: number, h = 1e-4) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
/** definite integral by composite Simpson's rule */
export function integ(f: (x: number) => number, a: number, b: number, n = 4000): number {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}
/** partial sum of a series term(n) for n = from..to */
export const series = (term: (n: number) => number, from: number, to: number) => { let s = 0; for (let n = from; n <= to; n++) s += term(n); return s; };
export const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
/** y(x1) for y' = f(x, y), y(x0) = y0, by classical Runge–Kutta */
export function ode(f: (x: number, y: number) => number, x0: number, y0: number, x1: number, n = 2000): number {
  const h = (x1 - x0) / n;
  let x = x0, y = y0;
  for (let i = 0; i < n; i++) {
    const k1 = f(x, y), k2 = f(x + h / 2, y + (h / 2) * k1), k3 = f(x + h / 2, y + (h / 2) * k2), k4 = f(x + h, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    x += h;
  }
  return y;
}
/** Euler's method with n steps of size h */
export function euler(f: (x: number, y: number) => number, x0: number, y0: number, h: number, n: number): number {
  let x = x0, y = y0;
  for (let i = 0; i < n; i++) { y += h * f(x, y); x += h; }
  return y;
}
