import type { Question } from './types';

/** Parse a student-produced response: integers, decimals and fractions such as "-7/2" or ".25". */
export function parseNumeric(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, '').replace(/−/g, '-');
  if (!s) return null;
  if (/^-?\d*\.?\d+$/.test(s) || /^-?\d+\.$/.test(s)) return Number(s);
  const m = s.match(/^(-?\d+)\/(\d+)$/);
  if (m) {
    const den = Number(m[2]);
    return den === 0 ? null : Number(m[1]) / den;
  }
  return null;
}

/**
 * Digital SAT grid-in rule: a non-terminating decimal must be rounded or truncated
 * at the fourth digit (e.g. 2/3 → .6666, .6667, 0.666, 0.667; not 0.67).
 */
export function sprMatches(input: string, key: string): boolean {
  const v = parseNumeric(input);
  const k = parseNumeric(key);
  if (v === null || k === null) return false;
  if (Math.abs(v - k) < 1e-9) return true;
  const s = input.trim().replace(/−/g, '-').replace(/^-/, '');
  if (s.includes('/') || !s.includes('.')) return false;
  const [intPart, decPart = ''] = s.split('.');
  const dec = decPart.length;
  if (dec < Math.max(1, 4 - intPart.length)) return false;
  const p = 10 ** dec;
  const rounded = Math.round(Math.abs(k) * p) / p;
  const truncated = Math.floor(Math.abs(k) * p + 1e-9) / p;
  const av = Math.abs(v);
  return Math.sign(v) === Math.sign(k) && (Math.abs(av - rounded) < 1e-9 || Math.abs(av - truncated) < 1e-9);
}

export function isCorrect(q: Pick<Question, 'type' | 'answer'>, answer: string | null): boolean {
  if (answer === null || answer === '') return false;
  if (q.type === 'mcq') return Number(answer) === q.answer;
  return (q.answer as string[]).some((k) => sprMatches(answer, k));
}

export const LETTERS = ['A', 'B', 'C', 'D'];

export function displayAnswer(q: Pick<Question, 'type' | 'answer' | 'choices'>, answer: string | null): string {
  if (answer === null || answer === '') return 'No answer';
  if (q.type === 'mcq') return LETTERS[Number(answer)] ?? '—';
  return answer;
}

export const correctAnswerLabel = (q: Pick<Question, 'type' | 'answer'>) =>
  q.type === 'mcq' ? LETTERS[q.answer as number] : (q.answer as string[]).join(' or ');
