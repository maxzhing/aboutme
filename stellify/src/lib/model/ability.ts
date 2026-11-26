import type { Attempt, Question, Section, SkillId } from '../types';
import { SKILLS } from '../taxonomy';
import { PER_TEST } from '../engine/insights';
import { DAY, clamp } from '../util';
import { priorsFromIntake, type Intake } from './intake';

/**
 * The student model: an estimated ability for every skill, with how sure we are.
 *
 * Ability is on a logit scale where 0 is roughly a 500 section score and 1 unit is roughly 110 points. Each answer
 * moves the estimate by how surprising it was for the question's difficulty tier, using a one-parameter logistic
 * model with guessing on four-choice questions. Skills borrow strength from their section (a student who is strong
 * in Algebra is probably not hopeless in Geometry), so a skill with one or two answers still gets a sensible
 * estimate instead of "not enough data". What the student told us (a past score, their math class, what feels hard)
 * sets the starting point and is then outweighed by answers.
 *
 * Pure and deterministic; tested in tests/model.test.ts. The tier difficulties are deliberately coarse: when the
 * maintainer's item statistics calibrate a question, that number should replace its tier here.
 */
export const TIER_B: Record<string, number> = { medium: -0.5, hard: 0.3, 'very-hard': 1.0, elite: 1.8 };
const SLOPE = 1.6;
const GRID = Array.from({ length: 121 }, (_, i) => -3 + i * 0.05);
const HALF_LIFE = 21 * DAY;
/** how far a skill may sit from its section before evidence says so */
const SKILL_SD = 0.6;
const sig = (x: number) => 1 / (1 + Math.exp(-x));

export const pKnow = (theta: number, b: number) => sig(SLOPE * (theta - b));
export const pRight = (theta: number, q: Pick<Question, 'type' | 'difficulty'>) => {
  const k = pKnow(theta, TIER_B[q.difficulty] ?? 0.3);
  return q.type === 'mcq' ? 0.25 + 0.75 * k : k;
};

/** Expected accuracy across a real test's spread of difficulty. */
export const testAccuracy = (theta: number) => {
  const k = [-1.2, -0.4, 0.4, 1.2].reduce((t, b) => t + pKnow(theta, b), 0) / 4;
  return 0.2 + 0.8 * k;
};
/** Section score on the 200–800 scale implied by an ability, and back. Approximate by design. */
export const thetaToSection = (theta: number) => clamp(Math.round((500 + 110 * theta) / 10) * 10, 200, 800);
export const sectionToTheta = (score: number) => clamp((score - 500) / 110, -3, 3);

export interface SkillAbility { skill: SkillId; theta: number; sd: number; n: number; correct: number; notTaught: boolean; saidHard: boolean }
export interface SectionAbility { theta: number; sd: number; n: number }
export interface Abilities {
  skills: Record<SkillId, SkillAbility>;
  sections: Record<Section, SectionAbility>;
  /** where the starting point came from, for the explanation */
  basis: string[];
}

interface Obs { q: Question; correct: boolean; w: number }

/** First tries only (a repeat measures memory of that question), recent answers weighted more, rapid guesses dropped. */
export function observations(attempts: Attempt[], getQ: (id: string) => Question | undefined, now: number): Obs[] {
  const seen = new Set<string>();
  const out: Obs[] = [];
  for (const a of attempts) {
    if (a.abandoned || seen.has(a.qid)) continue;
    seen.add(a.qid);
    const q = getQ(a.qid);
    if (!q || (q as Question & { remix?: unknown }).remix) continue;
    // a wrong answer in under 4 seconds on a real question is a click-through, not evidence of anything
    if (!a.correct && a.answer !== null && a.ms > 0 && a.ms < 4000) continue;
    const hintPenalty = a.hints > 0 ? 0.5 : 1;
    out.push({ q, correct: a.correct && a.hints === 0, w: hintPenalty * Math.pow(0.5, Math.max(0, now - a.at) / HALF_LIFE) });
  }
  return out;
}

function posterior(mu: number, sd: number, obs: Obs[]) {
  let best = -Infinity;
  const logp = GRID.map((t) => {
    let lp = -((t - mu) ** 2) / (2 * sd * sd);
    for (const o of obs) { const p = clamp(pRight(t, o.q), 1e-4, 1 - 1e-4); lp += o.w * (o.correct ? Math.log(p) : Math.log(1 - p)); }
    if (lp > best) best = lp;
    return lp;
  });
  const w = logp.map((l) => Math.exp(l - best));
  const z = w.reduce((a, b) => a + b, 0);
  const mean = GRID.reduce((t, x, i) => t + x * w[i], 0) / z;
  const v = GRID.reduce((t, x, i) => t + (x - mean) ** 2 * w[i], 0) / z;
  return { theta: mean, sd: Math.sqrt(v) };
}

export function estimateAbilities(attempts: Attempt[], getQ: (id: string) => Question | undefined, now: number, intake?: Intake): Abilities {
  const pri = priorsFromIntake(intake);
  const obs = observations(attempts, getQ, now);
  const sections = {} as Record<Section, SectionAbility>;
  for (const sec of ['rw', 'math'] as Section[]) {
    const o = obs.filter((x) => x.q.section === sec);
    const p = posterior(pri.section[sec].mu, pri.section[sec].sd, o);
    sections[sec] = { ...p, n: o.length };
  }
  const skills = {} as Record<SkillId, SkillAbility>;
  for (const k of SKILLS) {
    const o = obs.filter((x) => x.q.skill === k.id);
    const off = pri.skill[k.id] ?? 0;
    const sdPrior = Math.sqrt(SKILL_SD ** 2 + sections[k.section].sd ** 2);
    const p = posterior(sections[k.section].theta + off, sdPrior, o);
    skills[k.id] = { skill: k.id, theta: p.theta, sd: p.sd, n: o.length, correct: o.filter((x) => x.correct).length, notTaught: pri.notTaught.includes(k.id), saidHard: pri.saidHard.includes(k.id) };
  }
  return { skills, sections, basis: pri.basis };
}

/** Section score estimate with an 80% band, from the abilities. */
export function sectionBand(a: Abilities, sec: Section) {
  const s = a.sections[sec];
  return { mid: thetaToSection(s.theta), low: thetaToSection(s.theta - 1.28 * s.sd), high: thetaToSection(s.theta + 1.28 * s.sd) };
}

/**
 * Expected points (on the 400–1600 total) from raising a skill by `delta`, given how often it appears on a test.
 * One question is worth roughly 10 points on a section near the middle of the scale.
 */
export function skillPoints(theta: number, skill: SkillId, delta = 0.3) {
  return PER_TEST[skill] * (testAccuracy(theta + delta) - testAccuracy(theta)) * 10;
}

/**
 * Whether a question is within reach: at least a 25% chance the student knows how to do it. Questions far above
 * a student's level teach very little and cost confidence, so practice, review and mistake redos hold them back
 * until the skill catches up (they stay saved and return later).
 */
export const REACH = 0.25;
// optimistic by one standard deviation: a question is only held back when we are fairly sure it is out of reach,
// never after one or two answers
export const withinReach = (a: Abilities, q: Pick<Question, 'skill' | 'difficulty'>) => pKnow(a.skills[q.skill].theta + a.skills[q.skill].sd, TIER_B[q.difficulty] ?? 0.3) >= REACH;
