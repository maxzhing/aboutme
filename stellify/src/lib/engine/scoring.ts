import type { Attempt, Difficulty, Question, QuestionType, ScoreRange, Section } from '../types';
import { clamp, round10 } from '../util';

/**
 * Stellify score estimate (UNOFFICIAL).
 *
 * A three-parameter logistic item-response model with fixed, hand-set item parameters:
 *   P(correct | θ) = c + (1 − c) / (1 + e^(−a(θ − b)))
 * b depends only on the question's difficulty label, c is the guessing floor (multiple choice
 * only). Ability θ is estimated as the posterior mean on a grid with a wide normal prior, then
 * mapped linearly to the 200–800 section scale. Reported ranges are 80% ranges that include both the
 * statistical uncertainty and an explicit allowance for the model itself (MODEL_SD). This is not the College Board's scoring method and has not been calibrated on real
 * test-takers; treat it as a rough guide and use Bluebook practice tests for real scores.
 */
const A = 1.15;
const B: Record<Difficulty, number> = { medium: 0, hard: 1.1, 'very-hard': 2.2, elite: 3.1 };
const guess = (t: QuestionType) => (t === 'mcq' ? 0.22 : 0.02);

export interface Response { difficulty: Difficulty; type: QuestionType; correct: boolean }
/** How many of these questions a student at ability θ would be expected to get right (difficulty-adjusted baseline). */
export const expectedCorrect = (theta: number, rs: Pick<Response, 'difficulty' | 'type'>[]) =>
  rs.reduce((t, r) => { const c = guess(r.type); return t + c + (1 - c) / (1 + Math.exp(-A * (theta - B[r.difficulty]))); }, 0);

export function estimateTheta(responses: Response[]): { theta: number; se: number } {
  let sw = 0, sm = 0, sv = 0;
  const grid: [number, number][] = [];
  for (let t = -3; t <= 4.5001; t += 0.05) {
    let ll = -((t - 0.3) ** 2) / (2 * 1.6 ** 2);
    for (const r of responses) {
      const c = guess(r.type);
      const p = clamp(c + (1 - c) / (1 + Math.exp(-A * (t - B[r.difficulty]))), 1e-6, 1 - 1e-6);
      ll += Math.log(r.correct ? p : 1 - p);
    }
    grid.push([t, ll]);
  }
  const max = Math.max(...grid.map((g) => g[1]));
  for (const [t, ll] of grid) { const w = Math.exp(ll - max); sw += w; sm += w * t; }
  const mean = sm / sw;
  for (const [t, ll] of grid) { const w = Math.exp(ll - max); sv += w * (t - mean) ** 2; }
  return { theta: mean, se: Math.sqrt(sv / sw) };
}

export const thetaToScore = (theta: number) => clamp(round10(500 + 100 * theta), 200, 800);

/** No section estimate below this many independent first-try answers: fewer cannot separate skill from luck. */
export const MIN_RESPONSES = 20;
/**
 * The model's own uncertainty, in ability units (about 40 scaled points). The item parameters are hand-set
 * and have never been fitted to real students' SAT results, so every range is widened by this much on top
 * of the statistical uncertainty.
 */
export const MODEL_SD = 0.4;
const Z80 = 1.2816; // ranges are 80% ranges: the middle 80% of plausible scores
export type Confidence = 'low' | 'medium' | 'high';
export const CONFIDENCE_NAME: Record<Confidence, string> = { low: 'Low confidence', medium: 'Medium confidence', high: 'High confidence' };

export function rangeFromTheta(theta: number, se: number, cap = 800): ScoreRange {
  const half = Z80 * Math.sqrt(se * se + MODEL_SD * MODEL_SD);
  const mid = Math.min(cap, thetaToScore(theta));
  return { mid, low: Math.min(mid, clamp(thetaToScore(theta - half), 200, cap)), high: Math.max(mid, Math.min(cap, thetaToScore(theta + half))) };
}
/** How much to trust an estimate: enough answers, spread over more than one day. */
export const confidenceOf = (n: number, days: number): Confidence => (n >= 60 && days >= 3 ? 'high' : n >= 35 && days >= 2 ? 'medium' : 'low');

export function rangeFromResponses(responses: Response[], cap = 800, min = MIN_RESPONSES): ScoreRange | null {
  if (responses.length < Math.max(1, min)) return null;
  const { theta, se } = estimateTheta(responses);
  return rangeFromTheta(theta, se, cap);
}

export interface SectionStatus {
  section: Section;
  /** first-try answers used (most recent 80) */
  n: number;
  /** different study days those answers came from */
  days: number;
  /** answers still needed before an estimate is shown (0 when there are enough) */
  need: number;
  range: ScoreRange | null;
  confidence: Confidence | null;
  byDifficulty: Record<Difficulty, { n: number; correct: number }>;
}

/**
 * Section estimate from practice history. Only each question's FIRST attempt counts (a second try after
 * reading the explanation measures memory, not skill), an answer counts as right only if no hint was used
 * (there are no hints on test day), and the most recent 80 such answers are used so the estimate follows
 * improvement.
 */
export function sectionStatus(section: Section, attempts: Attempt[], getQ: (id: string) => Question | undefined): SectionStatus {
  const first = new Map<string, Attempt>();
  for (const a of attempts) if (!a.abandoned && !first.has(a.qid)) first.set(a.qid, a);
  const rows = [...first.values()].sort((x, y) => x.at - y.at)
    .map((a) => ({ a, q: getQ(a.qid) })).filter((r): r is { a: Attempt; q: Question } => !!r.q && r.q.section === section).slice(-80);
  const byDifficulty = { medium: { n: 0, correct: 0 }, hard: { n: 0, correct: 0 }, 'very-hard': { n: 0, correct: 0 }, elite: { n: 0, correct: 0 } } as SectionStatus['byDifficulty'];
  const responses = rows.map((r) => {
    const correct = r.a.correct && r.a.hints === 0;
    byDifficulty[r.q.difficulty].n++;
    if (correct) byDifficulty[r.q.difficulty].correct++;
    return { difficulty: r.q.difficulty, type: r.q.type, correct };
  });
  const n = rows.length, days = new Set(rows.map((r) => new Date(r.a.at).toDateString())).size;
  const range = rangeFromResponses(responses);
  return { section, n, days, need: Math.max(0, MIN_RESPONSES - n), range, confidence: range ? confidenceOf(n, days) : null, byDifficulty };
}
export const sectionEstimate = (section: Section, attempts: Attempt[], getQ: (id: string) => Question | undefined): ScoreRange | null =>
  sectionStatus(section, attempts, getQ).range;

/**
 * Total = sum of the two sections. Their uncertainties are independent, so they combine as the square
 * root of the sum of squares, not by adding the two ranges end to end.
 */
export function totalRange(rw: ScoreRange | null, math: ScoreRange | null): ScoreRange | null {
  if (!rw || !math) return null;
  const mid = rw.mid + math.mid;
  const down = Math.hypot(rw.mid - rw.low, math.mid - math.low), up = Math.hypot(rw.high - rw.mid, math.high - math.mid);
  return { mid, low: Math.max(400, round10(mid - down)), high: Math.min(1600, round10(mid + up)) };
}
const ORDER: Confidence[] = ['low', 'medium', 'high'];
export const lowerConfidence = (a: Confidence | null, b: Confidence | null): Confidence | null => (a && b ? ORDER[Math.min(ORDER.indexOf(a), ORDER.indexOf(b))] : null);

export const fmtRange = (r: ScoreRange | null) => (r ? (r.low === r.high ? `${r.mid}` : `${r.low}–${r.high}`) : '—');
