import type { Attempt, Question, Section, SkillId } from '../types';
import { SKILLS } from '../taxonomy';
import { PER_TEST } from './insights';
import { pointsPerQuestion } from '../fullTest/score';
import { credit } from '../path/stars';

/**
 * Score Lever (N10): roughly how many scaled points an hour of study on each skill is worth.
 *
 *   accuracy  = (first-try credit + K·P0) / (first tries + K)          shrunk toward P0 when data is thin
 *   headroom  = max(0, target − accuracy)                              target 0.85 (0.90 for 1450+ goals)
 *   rate      = accuracy gained per focused hour: 0.06 below 60%, 0.04 to 80%, 0.025 above (diminishing returns)
 *   points/hr = questions per test × scaled points per extra right answer × rate     (while headroom remains)
 *   ceiling   = headroom × questions per test × points per question     (the most this skill can still add)
 *
 * The low–high range comes from the accuracy's 80% uncertainty and a ±40% allowance on the learning rate.
 * Under MIN_N first tries a skill says "needs a diagnostic" instead of a number. Every input is coarse and
 * the result is labelled an estimate wherever it is shown (METHODOLOGY.md).
 */
export const LEVER = { K: 4, P0: 0.6, MIN_N: 6, RATE_SPREAD: 0.4 } as const;

export interface Lever {
  skill: SkillId;
  section: Section;
  n: number;
  accuracy: number | null;
  /** points per study hour: low, mid and high; null when the skill needs a diagnostic */
  perHour: { low: number; mid: number; high: number } | null;
  /** the most points this skill could still add on one test */
  ceiling: number;
  confidence: 'low' | 'medium' | 'high' | null;
  needsDiagnostic: boolean;
  /** why, in plain words */
  why: string;
}

const rateAt = (acc: number) => (acc < 0.6 ? 0.06 : acc < 0.8 ? 0.04 : 0.025);

export function targetAccuracy(targetScore: number) { return targetScore >= 1450 ? 0.9 : 0.85; }

/** First tries only (later attempts at the same question are practice, not evidence). */
export function firstTries(attempts: Attempt[]) {
  const seen = new Set<string>();
  const out: Attempt[] = [];
  for (const a of attempts) {
    if (a.abandoned || seen.has(a.qid)) continue;
    seen.add(a.qid);
    out.push(a);
  }
  return out;
}

export function scoreLever(attempts: Attempt[], getQ: (id: string) => Question | undefined, opts: { targetScore: number; level?: Partial<Record<Section, number>> }): Lever[] {
  const by = new Map<SkillId, { c: number; n: number; missed: number }>();
  for (const a of firstTries(attempts)) {
    const q = getQ(a.qid);
    if (!q || (q as Question & { remix?: unknown }).remix) continue;
    const b = by.get(q.skill) ?? { c: 0, n: 0, missed: 0 };
    b.c += credit(a.correct, a.hints); b.n++; if (!a.correct) b.missed++;
    by.set(q.skill, b);
  }
  const target = targetAccuracy(opts.targetScore);
  const rows = SKILLS.map((s): Lever => {
    const b = by.get(s.id) ?? { c: 0, n: 0, missed: 0 };
    const perTest = PER_TEST[s.id];
    const pts = pointsPerQuestion(s.section, opts.level?.[s.section] ?? 550);
    if (b.n < LEVER.MIN_N) {
      return { skill: s.id, section: s.section, n: b.n, accuracy: b.n ? b.c / b.n : null, perHour: null, ceiling: Math.round(Math.max(0, target - LEVER.P0) * perTest * pts), confidence: null, needsDiagnostic: true,
        why: b.n ? `Only ${b.n} first ${b.n === 1 ? 'try' : 'tries'} so far; ${LEVER.MIN_N - b.n} more give an estimate.` : 'No answers yet: a short diagnostic set gives an estimate.' };
    }
    const acc = (b.c + LEVER.K * LEVER.P0) / (b.n + LEVER.K);
    const se = Math.sqrt((acc * (1 - acc)) / (b.n + LEVER.K));
    const z = 1.2816;
    const headroom = (a: number) => Math.max(0, target - a);
    const ph = (a: number, spread: number) => (headroom(a) > 0 ? perTest * pts * rateAt(a) * spread : 0);
    const mid = ph(acc, 1);
    const low = ph(Math.min(1, acc + z * se), 1 - LEVER.RATE_SPREAD);
    const high = ph(Math.max(0, acc - z * se), 1 + LEVER.RATE_SPREAD);
    const confidence = b.n >= 40 ? 'high' : b.n >= 15 ? 'medium' : 'low';
    return {
      skill: s.id, section: s.section, n: b.n, accuracy: b.c / b.n,
      perHour: { low: Math.round(low * 10) / 10, mid: Math.round(mid * 10) / 10, high: Math.round(high * 10) / 10 },
      ceiling: Math.round(headroom(acc) * perTest * pts), confidence, needsDiagnostic: false,
      why: `${b.n - b.missed} of ${b.n} right on first tries; about ${perTest.toFixed(1)} questions per test.`,
    };
  });
  return rows.sort((a, b) => (b.perHour?.mid ?? -1) - (a.perHour?.mid ?? -1) || b.ceiling - a.ceiling);
}
