/**
 * Synthetic students for the study simulator (scripts/sim/run.ts).
 *
 * Nothing here is data about real students. It is a stated model, used to compare two versions of the app's own
 * decision code under the same assumptions. Every number below is an assumption; METHODOLOGY.md lists them.
 *
 * Ability is on a logit scale where 0 is about a 500 section score. Each skill has its own ability: the section
 * ability plus a personal offset, with a few deliberate "holes" (real weaknesses) and, for younger students,
 * topics they have not been taught yet.
 */
import type { Question, Section, SkillId } from '../../src/lib/types';
import { SKILLS } from '../../src/lib/taxonomy';
import { PER_TEST } from '../../src/lib/engine/insights';
import { clamp, rng } from '../../src/lib/util';

export type Grade = 8 | 9 | 10 | 11 | 12;
export interface Student {
  id: number;
  grade: Grade;
  /** math class now (drives which topics were taught) */
  mathClass: 'prealg' | 'alg1' | 'geo' | 'alg2' | 'precalc' | 'calc';
  ell: boolean;
  /** seconds per question relative to the test's pace (1 = on pace) */
  pace: number;
  minutes: number;
  restDays: number[];
  /** days until the test, or null for "not registered yet" */
  examIn: number | null;
  target: number;
  /** what the student says feels hard, when asked (with some noise: students misjudge themselves) */
  saysHard: SkillId[];
  /** the student's own sense of their weaker section; can be wrong */
  saysWeak: Section | 'unsure';
  /** knows a past PSAT/SAT score (noisy) */
  pastScore?: { rw: number; math: number };
  theta: Record<SkillId, number>;
  start: Record<SkillId, number>;
  /** practice and lessons done per skill (for diminishing returns) */
  practiced: Record<SkillId, number>;
  lessons: Record<SkillId, number>;
}

/** Item difficulty by tier, in the same logit units. The bank has no "easy" tier; the real test does (about -1.2). */
export const TIER_B: Record<string, number> = { easy: -1.2, medium: -0.4, hard: 0.4, 'very-hard': 1.2, elite: 2.0 };
const sig = (x: number) => 1 / (1 + Math.exp(-x));
/** probability the student actually knows how to do it (no guessing) */
export const know = (theta: number, b: number) => sig(1.7 * (theta - b));
/** probability of a correct answer: four-choice questions can be guessed */
export const pCorrect = (theta: number, q: Pick<Question, 'type' | 'difficulty'>) => {
  const k = know(theta, TIER_B[q.difficulty] ?? 0.4);
  return q.type === 'mcq' ? 0.25 + 0.75 * k : k;
};

/** Expected accuracy on a real test's spread of difficulty (easy, medium, medium-hard, hard), 80% multiple choice. */
export const testAccuracy = (theta: number) => {
  const bs = [-1.2, -0.4, 0.4, 1.2];
  const k = bs.reduce((t, b) => t + know(theta, b), 0) / bs.length;
  return 0.2 + 0.8 * k;
};
/** Section score from skill abilities: raw accuracy weighted by how often each skill appears on a test. */
export function sectionScore(theta: Record<SkillId, number>, section: Section) {
  const ks = SKILLS.filter((k) => k.section === section);
  const w = ks.reduce((t, k) => t + PER_TEST[k.id], 0);
  const raw = ks.reduce((t, k) => t + PER_TEST[k.id] * testAccuracy(theta[k.id]), 0) / w;
  return clamp(Math.round((200 + 750 * (raw - 0.2)) / 10) * 10, 200, 800);
}
export const totalScore = (theta: Record<SkillId, number>) => sectionScore(theta, 'rw') + sectionScore(theta, 'math');

/** Points a skill could still add on a real test: how often it appears times the accuracy still missing. */
export const opportunity = (theta: Record<SkillId, number>, k: SkillId) => PER_TEST[k] * (1 - testAccuracy(theta[k]));

const ADV: SkillId[] = ['equiv', 'nleq', 'nlf'];
const TRIG: SkillId[] = ['trig', 'circ'];

export function makeStudents(n: number, seed = 'stellify-sim-v1'): Student[] {
  const r = rng(seed);
  const normal = () => { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const out: Student[] = [];
  for (let id = 0; id < n; id++) {
    const grade = pick([8, 9, 10, 10, 11, 11, 11, 12] as const);
    const mathClass = grade <= 8 ? pick(['prealg', 'alg1'] as const) : grade === 9 ? pick(['alg1', 'geo'] as const) : grade === 10 ? pick(['geo', 'alg2'] as const) : pick(['alg2', 'precalc', 'calc'] as const);
    const g = normal();
    const math = clamp(0.5 + 0.8 * g + 0.35 * normal() + (grade - 10.5) * 0.15, -2.6, 2.6);
    const rw = clamp(0.5 + 0.8 * g + 0.35 * normal() + (grade - 10.5) * 0.12, -2.6, 2.6);
    const ell = r() < 0.15;
    const theta = {} as Record<SkillId, number>;
    for (const k of SKILLS) theta[k.id] = (k.section === 'math' ? math : rw) + 0.45 * normal();
    // two to four real holes, anywhere
    const holes = [...SKILLS].sort(() => r() - 0.5).slice(0, 2 + Math.floor(r() * 3));
    for (const k of holes) theta[k.id] -= 0.8 + 0.6 * r();
    // not taught yet: Algebra 2 topics before Algebra 2, trigonometry and circles before Geometry
    if (['prealg', 'alg1', 'geo'].includes(mathClass)) for (const k of ADV) theta[k] -= 1.1;
    if (['prealg', 'alg1'].includes(mathClass)) for (const k of TRIG) theta[k] -= 1.1;
    if (ell) for (const k of ['wic', 'inf', 'coet', 'cid', 'tsp'] as SkillId[]) theta[k] -= 0.5;
    for (const k of SKILLS) theta[k.id] = clamp(theta[k.id], -3, 3);
    // what they say is hard: their true weakest four, with one swapped for a random skill a third of the time
    const weakest = [...SKILLS].sort((a, b) => theta[a.id] - theta[b.id]).slice(0, 4).map((k) => k.id);
    if (r() < 0.33) weakest[3] = pick(SKILLS).id;
    const sr = sectionScore(theta, 'rw'), sm = sectionScore(theta, 'math');
    const saysWeak = r() < 0.2 ? 'unsure' : Math.abs(sr - sm) < 30 ? pick(['math', 'rw', 'unsure'] as const) : sr < sm ? 'rw' : 'math';
    const pastScore = r() < 0.45 ? { rw: clamp(Math.round((sr + 40 * normal()) / 10) * 10, 200, 800), math: clamp(Math.round((sm + 40 * normal()) / 10) * 10, 200, 800) } : undefined;
    const now = sr + sm;
    const target = clamp(Math.round((now + 80 + r() * 220) / 10) * 10, 800, 1600);
    out.push({
      id, grade, mathClass, ell, pace: clamp(1 + 0.25 * normal() + (ell ? 0.2 : 0), 0.7, 1.8),
      minutes: pick([15, 20, 30, 30, 45, 45, 60, 90] as const), restDays: pick([[0], [0, 6], [6], [0, 3], []] as number[][]),
      examIn: pick([10, 21, 30, 45, 60, 90, null] as const), target,
      saysHard: weakest, saysWeak, pastScore,
      theta, start: { ...theta },
      practiced: Object.fromEntries(SKILLS.map((k) => [k.id, 0])) as Record<SkillId, number>,
      lessons: Object.fromEntries(SKILLS.map((k) => [k.id, 0])) as Record<SkillId, number>,
    });
  }
  return out;
}

/**
 * Learning, as assumed here:
 *  - a practice question with an explanation moves the skill most when the student has a fair chance
 *    (knowing probability near 0.7) and hardly at all when it is far too hard or trivially easy;
 *  - returns diminish as a skill gets more practice;
 *  - a lesson helps most when the skill is weak, and less each time it is repeated.
 */
export const LEARN = { practice: 0.009, lesson: 0.14, sweet: 0.7, width: 0.24, halfPractice: 40 } as const;
export function practiceGain(st: Student, skill: SkillId, b: number, weight = 1) {
  const k = know(st.theta[skill], b);
  const fit = Math.exp(-(((k - LEARN.sweet) / LEARN.width) ** 2));
  const g = weight * LEARN.practice * fit / (1 + st.practiced[skill] / LEARN.halfPractice);
  st.practiced[skill] += 1;
  st.theta[skill] = Math.min(3, st.theta[skill] + g);
  return k;
}
export function lessonGain(st: Student, skill: SkillId, weight = 1) {
  const g = weight * LEARN.lesson * sig(-1.5 * st.theta[skill]) / (1 + st.lessons[skill]);
  st.lessons[skill] += 1;
  st.theta[skill] = Math.min(3, st.theta[skill] + g);
}
