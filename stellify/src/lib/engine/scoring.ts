import type { Attempt, Difficulty, Question, QuestionType, ScoreRange, Section } from '../types';
import { clamp, round10 } from '../util';

/**
 * Stellify score estimate (UNOFFICIAL).
 *
 * A three-parameter logistic item-response model with fixed, hand-set item parameters:
 *   P(correct | θ) = c + (1 − c) / (1 + e^(−a(θ − b)))
 * b depends only on the question's difficulty label, c is the guessing floor (multiple choice
 * only). Ability θ is estimated as the posterior mean on a grid with a wide normal prior, then
 * mapped linearly to the 200–800 section scale. The reported range widens when there is little
 * data. This is not the College Board's scoring method and has not been calibrated on real
 * test-takers; treat it as a rough guide and use Bluebook practice tests for real scores.
 */
const A = 1.15;
const B: Record<Difficulty, number> = { medium: 0, hard: 1.1, 'very-hard': 2.2 };
const guess = (t: QuestionType) => (t === 'mcq' ? 0.22 : 0.02);

export interface Response { difficulty: Difficulty; type: QuestionType; correct: boolean }

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

export function rangeFromResponses(responses: Response[], cap = 800): ScoreRange | null {
  if (responses.length < 8) return null;
  const { theta, se } = estimateTheta(responses);
  const half = Math.max(0.3, se * 1.1);
  const mid = Math.min(cap, thetaToScore(theta));
  return { mid, low: Math.min(mid, clamp(thetaToScore(theta - half), 200, cap)), high: Math.max(mid, Math.min(cap, thetaToScore(theta + half))) };
}

/** Section estimate from practice history: latest attempt per question, most recent 80 questions. */
export function sectionEstimate(section: Section, attempts: Attempt[], getQ: (id: string) => Question | undefined): ScoreRange | null {
  const latest = new Map<string, Attempt>();
  for (const a of attempts) if (!a.abandoned) latest.set(a.qid, a);
  const rows = [...latest.values()].sort((x, y) => x.at - y.at).slice(-200)
    .map((a) => ({ a, q: getQ(a.qid) })).filter((r) => r.q && r.q.section === section).slice(-80);
  return rangeFromResponses(rows.map((r) => ({ difficulty: r.q!.difficulty, type: r.q!.type, correct: r.a.correct && r.a.hints < 3 })));
}

export const totalRange = (rw: ScoreRange | null, math: ScoreRange | null): ScoreRange | null =>
  rw && math ? { low: rw.low + math.low, mid: rw.mid + math.mid, high: rw.high + math.high } : null;

export const fmtRange = (r: ScoreRange | null) => (r ? (r.low === r.high ? `${r.mid}` : `${r.low}–${r.high}`) : '—');
