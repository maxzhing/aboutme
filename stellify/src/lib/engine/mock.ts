import type { Difficulty, MockAttempt, MockModuleResult, Question, ScoreRange, Section, SkillId } from '../types';
import { SAT_STRUCTURE } from '../taxonomy';
import { isCorrect } from '../answers';
import { rng, shuffle } from '../util';
import { rangeFromResponses, totalRange } from './scoring';

export const MOCK_FORMS = [
  { id: 'A', name: 'Practice Test A', blurb: 'Fixed form. Retake it later to measure improvement on identical questions.' },
  { id: 'B', name: 'Practice Test B', blurb: 'A second fixed form with a different Module 1.' },
  { id: 'mix', name: 'Fresh Mix', blurb: 'Assembled on the spot, preferring questions you have never seen.' },
];

/**
 * ROUTING MODEL (Stellify's own; not the College Board's proprietary algorithm).
 * Module 1 of each section is a broad mix of difficulty. If you answer at least 60% of it
 * correctly, Module 2 is the "upper" set (mostly hard and very hard questions); otherwise it is
 * the "lower" set (mostly medium and hard). Scores come from the IRT estimate in scoring.ts over
 * both modules; the lower route is capped at 650 for the section, mirroring the fact that an
 * easier second module limits the top of the score range on the real test.
 */
export const ROUTE_THRESHOLD = 0.6;
export const LOWER_ROUTE_CAP = 650;

type Kind = 'm1' | 'upper' | 'lower';
const QUOTA: Record<Section, Record<Kind, Record<Difficulty, number>>> = {
  rw: { m1: { medium: 9, hard: 12, 'very-hard': 6 }, upper: { medium: 2, hard: 10, 'very-hard': 15 }, lower: { medium: 11, hard: 13, 'very-hard': 3 } },
  math: { m1: { medium: 7, hard: 10, 'very-hard': 5 }, upper: { medium: 2, hard: 8, 'very-hard': 12 }, lower: { medium: 9, hard: 10, 'very-hard': 3 } },
};
const rep = (k: SkillId, n: number) => Array<SkillId>(n).fill(k);
/** Skill slots per module, following the official domain proportions and (for R&W) domain order. */
const RW_SLOTS: SkillId[] = [...rep('wic', 4), ...rep('tsp', 3), 'ctc', ...rep('cid', 2), ...rep('coet', 2), 'coeq', ...rep('inf', 2), ...rep('bnd', 4), ...rep('fss', 3), ...rep('tra', 3), ...rep('syn', 2)];
const MATH_FIXED: SkillId[] = ['lin1', 'linf', 'linf', 'lin2', 'sys', 'sys', 'ineq', 'ineq', 'equiv', 'equiv', 'nleq', 'nleq', 'nleq', 'nlf', 'nlf', 'nlf', 'trig', 'circ'];
const MATH_CHOICE: SkillId[][] = [['ratio', 'pct'], ['data1', 'data2'], ['prob', 'infer', 'claims'], ['area', 'lines']];
const ORDER: Difficulty[] = ['medium', 'hard', 'very-hard'];

export function buildModule(section: Section, kind: Kind, seed: string, bank: Question[], exclude: Set<string>, seen?: Set<string>): string[] {
  const rand = rng(`${seed}|${section}|${kind}`);
  const slots: SkillId[] = section === 'rw' ? [...RW_SLOTS] : [...MATH_FIXED, ...MATH_CHOICE.map((c) => c[Math.floor(rand() * c.length)])];
  const quota = { ...QUOTA[section][kind] };
  const used = new Set(exclude);
  const pool = shuffle(bank.filter((q) => q.section === section), rand);
  if (seen) pool.sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));
  const chosen: { slot: number; q: Question }[] = [];
  const order = shuffle(slots.map((_, i) => i), rand);
  for (const i of order) {
    const prefs = [...ORDER].sort((a, b) => quota[b] - quota[a]);
    let q: Question | undefined;
    for (const d of prefs) {
      if (quota[d] <= 0 && prefs.some((p) => quota[p] > 0)) continue;
      q = pool.find((c) => c.skill === slots[i] && c.difficulty === d && !used.has(c.id));
      if (q) break;
    }
    q ??= pool.find((c) => c.skill === slots[i] && !used.has(c.id)) ?? pool.find((c) => !used.has(c.id));
    if (!q) continue;
    used.add(q.id);
    quota[q.difficulty] -= 1;
    chosen.push({ slot: i, q });
  }
  const rank = (d: Difficulty) => ORDER.indexOf(d);
  if (section === 'math') return chosen.sort((a, b) => rank(a.q.difficulty) - rank(b.q.difficulty) || a.slot - b.slot).map((c) => c.q.id);
  // R&W: keep the test's domain order; within one skill, easier questions first
  return chosen.sort((a, b) => (slots[a.slot] === slots[b.slot] ? rank(a.q.difficulty) - rank(b.q.difficulty) || a.slot - b.slot : a.slot - b.slot)).map((c) => c.q.id);
}

export type StageId = 'rw1' | 'rw2' | 'break' | 'math1' | 'math2';
export const stagesFor = (kind: MockAttempt['kind']): StageId[] =>
  kind === 'full' ? ['rw1', 'rw2', 'break', 'math1', 'math2'] : kind === 'section-rw' ? ['rw1', 'rw2'] : ['math1', 'math2'];
export const stageSection = (st: StageId): Section => (st.startsWith('rw') ? 'rw' : 'math');
export const moduleMs = (section: Section) => SAT_STRUCTURE[section].minutesPerModule * 60_000;
export const BREAK_MS = SAT_STRUCTURE.breakMinutes * 60_000;

const emptyModule = (section: Section, module: 1 | 2, qids: string[], route?: 'upper' | 'lower'): MockModuleResult => ({
  section, module, route, qids, answers: {}, flagged: [], msUsed: 0, msAllowed: moduleMs(section), perQuestionMs: {},
});

export function seedFor(formId: string, startedAt: number) { return formId === 'mix' ? `mix-${startedAt}` : `stellify-form-${formId}`; }

export function startMock(id: string, formId: string, kind: MockAttempt['kind'], bank: Question[], now: number, seen: Set<string>): MockAttempt {
  const first = stageSection(stagesFor(kind)[0]);
  const qids = buildModule(first, 'm1', seedFor(formId, now), bank, new Set(), formId === 'mix' ? seen : undefined);
  return { id, formId, kind, startedAt: now, modules: [emptyModule(first, 1, qids)], cursor: { stage: 0, index: 0, msLeft: moduleMs(first) } };
}

export function routeFor(m1: MockModuleResult, getQ: (id: string) => Question | undefined): 'upper' | 'lower' {
  const correct = m1.qids.filter((id) => { const q = getQ(id); return q && isCorrect(q, m1.answers[id] ?? null); }).length;
  return correct / m1.qids.length >= ROUTE_THRESHOLD ? 'upper' : 'lower';
}

/** Advances to the next stage after a module (or the break) ends. Returns the updated attempt and whether it is finished. */
export function advanceMock(mock: MockAttempt, bank: Question[], getQ: (id: string) => Question | undefined, seen: Set<string>): { mock: MockAttempt; finished: boolean } {
  const stages = stagesFor(mock.kind);
  const cur = mock.cursor!;
  const nextStage = cur.stage + 1;
  if (nextStage >= stages.length) return { mock: { ...mock, cursor: undefined }, finished: true };
  const next = stages[nextStage];
  if (next === 'break') return { mock: { ...mock, cursor: { stage: nextStage, index: 0, msLeft: 0, breakMsLeft: BREAK_MS } }, finished: false };
  const section = stageSection(next);
  const used = new Set(mock.modules.flatMap((m) => m.qids));
  const seed = seedFor(mock.formId, mock.startedAt);
  let mod: MockModuleResult;
  if (next.endsWith('1')) mod = emptyModule(section, 1, buildModule(section, 'm1', seed, bank, used, mock.formId === 'mix' ? seen : undefined));
  else {
    const m1 = mock.modules.find((m) => m.section === section && m.module === 1)!;
    const route = routeFor(m1, getQ);
    mod = emptyModule(section, 2, buildModule(section, route, seed, bank, used, mock.formId === 'mix' ? seen : undefined), route);
  }
  return { mock: { ...mock, modules: [...mock.modules, mod], cursor: { stage: nextStage, index: 0, msLeft: moduleMs(section) } }, finished: false };
}

export function scoreMock(mock: MockAttempt, getQ: (id: string) => Question | undefined) {
  const section = (sec: Section): ScoreRange | null => {
    const mods = mock.modules.filter((m) => m.section === sec);
    if (!mods.length) return null;
    const responses = mods.flatMap((m) => m.qids.map((id) => ({ q: getQ(id), a: m.answers[id] ?? null })))
      .filter((r) => r.q).map((r) => ({ difficulty: r.q!.difficulty, type: r.q!.type, correct: isCorrect(r.q!, r.a) }));
    const lower = mods.some((m) => m.module === 2 && m.route === 'lower');
    return rangeFromResponses(responses, lower ? LOWER_ROUTE_CAP : 800);
  };
  const rw = section('rw'), math = section('math');
  return { rw, math, total: totalRange(rw, math) };
}

export interface MockSummary {
  total: number; correct: number; unanswered: number; msUsed: number; msAllowed: number;
  bySection: Record<string, { total: number; correct: number; unanswered: number; msUsed: number; msAllowed: number }>;
  byDomain: Record<string, { total: number; correct: number }>;
  bySkill: Record<string, { total: number; correct: number }>;
  rows: { qid: string; section: Section; module: number; answer: string | null; correct: boolean; ms: number; flagged: boolean }[];
}

export function summarizeMock(mock: MockAttempt, getQ: (id: string) => Question | undefined): MockSummary {
  const out: MockSummary = { total: 0, correct: 0, unanswered: 0, msUsed: 0, msAllowed: 0, bySection: {}, byDomain: {}, bySkill: {}, rows: [] };
  for (const m of mock.modules) {
    const sec = (out.bySection[m.section] ??= { total: 0, correct: 0, unanswered: 0, msUsed: 0, msAllowed: 0 });
    sec.msUsed += m.msUsed; sec.msAllowed += m.msAllowed; out.msUsed += m.msUsed; out.msAllowed += m.msAllowed;
    for (const id of m.qids) {
      const q = getQ(id);
      if (!q) continue;
      const a = m.answers[id] ?? null;
      const ok = isCorrect(q, a);
      const blank = a === null || a === '';
      out.total++; sec.total++;
      if (ok) { out.correct++; sec.correct++; }
      if (blank) { out.unanswered++; sec.unanswered++; }
      const d = (out.byDomain[q.domain] ??= { total: 0, correct: 0 }); d.total++; if (ok) d.correct++;
      const k = (out.bySkill[q.skill] ??= { total: 0, correct: 0 }); k.total++; if (ok) k.correct++;
      out.rows.push({ qid: id, section: m.section, module: m.module, answer: a, correct: ok, ms: m.perQuestionMs[id] ?? 0, flagged: m.flagged.includes(id) });
    }
  }
  return out;
}
