import type { Difficulty, QuestionType, ScoreRange, Section } from '../types';
import { clamp, round10 } from '../util';

/**
 * Scores for official tests.
 *
 * 1. An official practice test imported with its scoring guide is scored exactly the way the
 *    College Board scores it: the number of correct answers in a section (its raw score) is looked
 *    up in that test's own raw-score conversion table, which gives a lower and upper section score.
 *
 * 2. The adaptive "Real SAT" built from your official questions has no printed table (no one has
 *    ever taken that exact combination), so it uses an item-response model tied to the College
 *    Board's scale: ability is estimated from which questions you got right and how hard they
 *    are (harder questions count for more, as on the digital SAT), converted to the raw score you
 *    would be expected to earn on a typical official form, and read through CB_CURVE.
 *
 * CB_CURVE is the average of the raw-score conversion tables in the College Board's scoring
 * guides for its free paper SAT Practice Tests 4–10 (midpoint of each printed range). The seven
 * forms differ by about 25–40 points at the same raw score, which is the honest precision of (2).
 */
export const CB_CURVE: Record<Section, number[]> = {
  rw: [200, 209, 209, 209, 209, 213, 219, 226, 234, 241, 253, 261, 271, 281, 291, 301, 319, 333, 343, 353, 360, 366, 374, 383, 390, 397, 406, 410, 419, 429, 439, 446, 451, 459, 469, 479, 487, 497, 506, 514, 523, 531, 541, 551, 561, 571, 581, 591, 601, 613, 623, 633, 643, 654, 664, 674, 687, 699, 709, 720, 730, 741, 751, 761, 774, 788, 798],
  math: [200, 210, 211, 214, 218, 223, 229, 240, 255, 276, 299, 318, 331, 341, 351, 361, 366, 374, 379, 389, 395, 404, 406, 416, 426, 436, 446, 456, 468, 481, 492, 502, 514, 525, 538, 548, 559, 571, 582, 592, 605, 618, 632, 642, 659, 674, 689, 708, 725, 741, 759, 772, 786, 791, 798],
};

/** Score from an official conversion table: the printed range, and its midpoint. */
export function tableScore(table: [number, number][], raw: number): ScoreRange {
  const [low, high] = table[clamp(Math.round(raw), 0, table.length - 1)];
  return { low, high, mid: round10((low + high) / 2) };
}

export type Level = 'Easy' | 'Medium' | 'Hard' | 'VeryHard';
/** Item difficulty on the ability scale. Official questions use the College Board's label. */
const B: Record<Level, number> = { Easy: -1.0, Medium: 0.0, Hard: 1.15, VeryHard: 2.0 };
const A = 1.25;
const guess = (t: QuestionType) => (t === 'mcq' ? 0.12 : 0);
export const levelOf = (q: { cbDifficulty?: 'Easy' | 'Medium' | 'Hard'; difficulty: Difficulty }): Level =>
  q.cbDifficulty ?? (q.difficulty === 'medium' ? 'Medium' : q.difficulty === 'hard' ? 'Hard' : 'VeryHard');
const p = (theta: number, level: Level, type: QuestionType) => { const c = guess(type); return c + (1 - c) / (1 + Math.exp(-A * (theta - B[level]))); };

export interface Resp { level: Level; type: QuestionType; correct: boolean }

export function ability(responses: Resp[]): { theta: number; se: number } {
  const grid: [number, number][] = [];
  for (let t = -4; t <= 4.5001; t += 0.05) {
    let ll = -(t ** 2) / (2 * 3 ** 2);
    for (const r of responses) { const q = clamp(p(t, r.level, r.type), 1e-6, 1 - 1e-6); ll += Math.log(r.correct ? q : 1 - q); }
    grid.push([t, ll]);
  }
  const max = Math.max(...grid.map((g) => g[1]));
  let sw = 0, sm = 0;
  for (const [t, ll] of grid) { const w = Math.exp(ll - max); sw += w; sm += w * t; }
  const mean = sm / sw;
  let sv = 0;
  for (const [t, ll] of grid) sv += Math.exp(ll - max) * (t - mean) ** 2;
  return { theta: mean, se: Math.sqrt(sv / sw) };
}

/** A typical official form: Easy, Medium and Hard in equal thirds; about a quarter of Math is student-produced. */
const REFERENCE: Record<Section, Resp[]> = {
  rw: Array.from({ length: 66 }, (_, i) => ({ level: (['Easy', 'Medium', 'Hard'] as Level[])[i % 3], type: 'mcq', correct: true })),
  math: Array.from({ length: 54 }, (_, i) => ({ level: (['Easy', 'Medium', 'Hard'] as Level[])[i % 3], type: i % 4 === 3 ? 'spr' : 'mcq', correct: true })),
};
export const expectedRaw = (section: Section, theta: number) => REFERENCE[section].reduce((s, r) => s + p(theta, r.level, r.type), 0);
/** Reads the averaged College Board curve at a (fractional) raw score. */
export function curveAt(section: Section, raw: number): number {
  const c = CB_CURVE[section], x = clamp(raw, 0, c.length - 1), i = Math.floor(x);
  return i >= c.length - 1 ? c[c.length - 1] : c[i] + (c[i + 1] - c[i]) * (x - i);
}
export const scaleAt = (section: Section, theta: number) => clamp(round10(curveAt(section, expectedRaw(section, theta))), 200, 800);

/** Calibrated section score for any set of answered questions (at least 8). */
export function calibratedScore(section: Section, responses: Resp[], cap = 800): ScoreRange | null {
  if (responses.length < 8) return null;
  if (responses.every((r) => r.correct) && cap >= 800) return { low: 790, mid: 800, high: 800 };
  const { theta, se } = ability(responses);
  const half = Math.max(0.12, se * 0.6);
  const mid = Math.min(cap, scaleAt(section, theta));
  return { mid, low: Math.min(mid, Math.max(200, scaleAt(section, theta - half))), high: Math.max(mid, Math.min(cap, scaleAt(section, theta + half))) };
}

/** About how many scaled points one more correct answer is worth near a given section score. */
export function pointsPerQuestion(section: Section, score: number): number {
  const c = CB_CURVE[section];
  let i = c.findIndex((v) => v >= score);
  if (i < 0) i = c.length - 1;
  const a = Math.max(0, i - 3), b = Math.min(c.length - 1, i + 3);
  return Math.max(5, Math.round((c[b] - c[a]) / (b - a)));
}
