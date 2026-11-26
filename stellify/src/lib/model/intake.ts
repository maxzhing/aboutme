import type { Section, SkillId } from '../types';
import { SKILLS } from '../taxonomy';
import { clamp } from '../util';

/**
 * The questions a student answers before anything else: their situation, not their name. Every answer here is
 * used somewhere (see `usedFor`), and the plan says which answers shaped it. Nothing is required.
 */
export type Grade = 'g8' | 'g9' | 'g10' | 'g11' | 'g12' | 'other';
export type MathClass = 'prealg' | 'alg1' | 'geo' | 'alg2' | 'precalc' | 'calc' | 'other';
export type TestWhen = 'date' | 'month' | '1-3' | '3-6' | '6+' | 'unsure';
export type Flag = 'time' | 'careless' | 'anxiety' | 'ell' | 'accommodations' | 'lost';
export interface Intake {
  v: 1;
  at: number;
  grade?: Grade;
  mathClass?: MathClass;
  taken?: 'none' | 'psat' | 'sat';
  past?: { rw?: number; math?: number };
  testWhen?: TestWhen;
  /** days a week the student can study */
  daysPerWeek?: number;
  /** plain-language topics that feel hard (ids from HARD_TOPICS) */
  hard: string[];
  flags: Flag[];
  /** skills the student said "I have not learned this yet" to during the placement check */
  notTaught?: SkillId[];
}

export const GRADES: { id: Grade; label: string }[] = [
  { id: 'g8', label: '8th grade or younger' }, { id: 'g9', label: '9th grade' }, { id: 'g10', label: '10th grade' },
  { id: 'g11', label: '11th grade' }, { id: 'g12', label: '12th grade' }, { id: 'other', label: 'Something else' },
];
export const MATH_CLASSES: { id: MathClass; label: string; sub: string }[] = [
  { id: 'prealg', label: 'Pre-algebra or Math 8', sub: 'not Algebra 1 yet' },
  { id: 'alg1', label: 'Algebra 1', sub: 'or Integrated Math 1' },
  { id: 'geo', label: 'Geometry', sub: 'or Integrated Math 2' },
  { id: 'alg2', label: 'Algebra 2', sub: 'or Integrated Math 3' },
  { id: 'precalc', label: 'Precalculus', sub: 'or trigonometry' },
  { id: 'calc', label: 'Calculus or beyond', sub: '' },
  { id: 'other', label: 'Not sure / other', sub: '' },
];
export const TEST_WHEN: { id: TestWhen; label: string; days: number }[] = [
  { id: 'month', label: 'Within a month', days: 28 },
  { id: '1-3', label: 'In 1 to 3 months', days: 60 },
  { id: '3-6', label: 'In 3 to 6 months', days: 120 },
  { id: '6+', label: 'More than 6 months away', days: 180 },
  { id: 'unsure', label: 'Not sure yet', days: 60 },
];

/** What feels hard, in a student's words, mapped to the skills behind it. */
export const HARD_TOPICS: { id: string; section: Section; label: string; skills: SkillId[] }[] = [
  { id: 'equations', section: 'math', label: 'Solving equations', skills: ['lin1', 'sys', 'ineq'] },
  { id: 'lines', section: 'math', label: 'Slopes, lines and graphs', skills: ['linf', 'lin2'] },
  { id: 'quadratics', section: 'math', label: 'Quadratics, exponents and polynomials', skills: ['equiv', 'nleq', 'nlf'] },
  { id: 'word', section: 'math', label: 'Word problems, percents and ratios', skills: ['ratio', 'pct'] },
  { id: 'data', section: 'math', label: 'Charts, data, statistics and probability', skills: ['data1', 'data2', 'prob', 'infer', 'claims'] },
  { id: 'geometry', section: 'math', label: 'Geometry and trig: triangles, circles, angles', skills: ['area', 'lines', 'trig', 'circ'] },
  { id: 'main', section: 'rw', label: 'Working out what a passage is mainly saying', skills: ['cid', 'inf'] },
  { id: 'evidence', section: 'rw', label: 'Picking evidence, or reading a graph in a passage', skills: ['coet', 'coeq'] },
  { id: 'vocab', section: 'rw', label: 'Vocabulary: what a word means in context', skills: ['wic'] },
  { id: 'purpose', section: 'rw', label: 'Why the author wrote it; comparing two texts', skills: ['tsp', 'ctc'] },
  { id: 'grammar', section: 'rw', label: 'Grammar and punctuation', skills: ['bnd', 'fss'] },
  { id: 'transitions', section: 'rw', label: 'Transition words and combining notes', skills: ['tra', 'syn'] },
];

export const FLAGS: { id: Flag; label: string; usedFor: string }[] = [
  { id: 'time', label: 'I run out of time', usedFor: 'adds timed sets earlier and more often' },
  { id: 'careless', label: 'I make careless mistakes', usedFor: 'adds mistake redos and a check-your-work routine' },
  { id: 'anxiety', label: 'I get nervous on tests', usedFor: 'adds the calm plan and short timed sets before full ones' },
  { id: 'ell', label: 'English is not my first language', usedFor: 'adds vocabulary and more reading practice' },
  { id: 'accommodations', label: 'I have extended time or other accommodations', usedFor: 'keeps pacing work at your approved time' },
  { id: 'lost', label: 'I do not know where to start', usedFor: 'starts with short lessons before any practice set' },
];

/** Topics taught in each math class: earlier classes have not met these yet. */
const NOT_YET: Record<MathClass, SkillId[]> = {
  prealg: ['sys', 'ineq', 'equiv', 'nleq', 'nlf', 'trig', 'circ', 'infer', 'lin2'],
  alg1: ['equiv', 'nleq', 'nlf', 'trig', 'circ'],
  geo: ['nleq', 'nlf'],
  alg2: [], precalc: [], calc: [], other: [],
};
const GRADE_MU: Record<Grade, number> = { g8: -0.5, g9: -0.3, g10: -0.1, g11: 0.1, g12: 0.15, other: 0 };

export const emptyIntake = (now: number): Intake => ({ v: 1, at: now, hard: [], flags: [] });

export interface Priors {
  section: Record<Section, { mu: number; sd: number }>;
  /** offset of each skill from its section, in ability units */
  skill: Partial<Record<SkillId, number>>;
  notTaught: SkillId[];
  saidHard: SkillId[];
  basis: string[];
}

/** Turns intake answers into the model's starting point. Without an intake, every skill starts at an average level with wide uncertainty. */
export function priorsFromIntake(i?: Intake): Priors {
  const basis: string[] = [];
  const section = { rw: { mu: 0, sd: 1.1 }, math: { mu: 0, sd: 1.1 } };
  if (i?.grade) { section.rw.mu = section.math.mu = GRADE_MU[i.grade]; }
  if (i?.past?.rw) { section.rw = { mu: clamp((i.past.rw - 500) / 110, -3, 3), sd: 0.5 }; basis.push(`your past Reading and Writing score (${i.past.rw})`); }
  if (i?.past?.math) { section.math = { mu: clamp((i.past.math - 500) / 110, -3, 3), sd: 0.5 }; basis.push(`your past Math score (${i.past.math})`); }
  const skill: Partial<Record<SkillId, number>> = {};
  const saidHard = [...new Set((i?.hard ?? []).flatMap((h) => HARD_TOPICS.find((t) => t.id === h)?.skills ?? []))];
  for (const k of saidHard) skill[k] = (skill[k] ?? 0) - 0.45;
  if (saidHard.length) basis.push('the topics you said feel hard');
  const notTaught = [...new Set([...(i?.mathClass ? NOT_YET[i.mathClass] : []), ...(i?.notTaught ?? [])])];
  for (const k of notTaught) skill[k] = (skill[k] ?? 0) - 0.9;
  if (i?.mathClass && NOT_YET[i.mathClass].length) basis.push('the math class you are in');
  if (i?.flags.includes('ell')) for (const k of ['wic', 'inf', 'cid'] as SkillId[]) skill[k] = (skill[k] ?? 0) - 0.25;
  return { section, skill, notTaught: notTaught.filter((k) => SKILLS.some((s) => s.id === k)), saidHard, basis };
}

/** Days until the test from an exam date or the rough answer to "when is your test?" */
export function horizonDays(examDate: string | undefined, testWhen: TestWhen | undefined, daysUntil: (d: string) => number): { days: number; known: boolean } {
  if (examDate) { const d = daysUntil(examDate); if (d >= 0) return { days: d, known: true }; }
  return { days: TEST_WHEN.find((t) => t.id === testWhen)?.days ?? 60, known: false };
}
