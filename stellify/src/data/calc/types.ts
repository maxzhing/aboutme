import { parseNumeric } from '../../lib/answers';

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
  | { k: 'list'; items: string[] };

export interface Example { q: string; steps: string[]; a: string }

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

export interface CalcUnit { n: number; title: string; weeks: number; examWeight: string; topics: string[]; summary: string }

/* ── answer checking ── */
const KEY: Record<string, string> = { infinity: 'inf', '∞': 'inf', '+inf': 'inf', '+∞': 'inf', '+infinity': 'inf', '-infinity': '-inf', '-∞': '-inf', '−∞': '-inf', 'doesnotexist': 'dne', dne: 'dne' };
export function normalizeCalc(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '').replace(/−/g, '-');
  return KEY[s] ?? s;
}
export function calcCorrect(p: CalcProblem, input: string | null): boolean {
  if (input === null || input === '') return false;
  if (typeof p.answer === 'number') return input === String(p.answer);
  const got = normalizeCalc(input);
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
