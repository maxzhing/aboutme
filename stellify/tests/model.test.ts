import { describe, expect, it } from 'vitest';
import { QUESTIONS, getQuestion } from '@/data/questions';
import { initialState } from '@/lib/state';
import type { AppState, Attempt, Question, SkillId } from '@/lib/types';
import { DOMAINS, SKILLS } from '@/lib/taxonomy';
import { estimateAbilities, pKnow, sectionBand, TIER_B, withinReach } from '@/lib/model/ability';
import { emptyIntake, priorsFromIntake, type Intake } from '@/lib/model/intake';
import { PLACEMENT_LENGTH, nextPlacementQuestion } from '@/lib/model/placement';
import { buildCoach, coachPriority, markDone } from '@/lib/engine/coach';
import { pickSmartSet } from '@/lib/engine/adaptive';
import { buildSession } from '@/lib/sessions';
import { addDays, dateKey, parseDateKey } from '@/lib/util';
import { engineInput } from '@/lib/path/input';
import { nextStep } from '@/lib/path/next';
import { pathOf } from '@/lib/path/skills';

const NOW = parseDateKey('2026-09-07') + 16 * 3_600_000; // a Monday afternoon
let n = 0;
const att = (q: Question, correct: boolean, at = NOW - 2 * 86_400_000, mode: Attempt['mode'] = 'bank', sessionId = 's'): Attempt =>
  ({ id: `a${n++}`, qid: q.id, at, answer: correct ? String(q.answer) : null, correct, ms: 60_000, hints: 0, mode, sessionId });
const intake = (p: Partial<Intake>): Intake => ({ ...emptyIntake(NOW - 7_200_000), ...p });
const state = (p: Partial<AppState['profile']> = {}, attempts: Attempt[] = []): AppState => {
  const s = initialState();
  return { ...s, attempts, profile: { ...s.profile, onboardedAt: NOW - 7_200_000, ...p } };
};

describe('student model', () => {
  it('starts everyone near average with wide uncertainty, and moves with evidence', () => {
    const none = estimateAbilities([], getQuestion, NOW);
    expect(Math.abs(none.sections.math.theta)).toBeLessThan(0.05);
    expect(none.sections.math.sd).toBeGreaterThan(0.9);
    const hard = QUESTIONS.filter((q) => q.section === 'math' && q.difficulty === 'hard').slice(0, 10);
    const up = estimateAbilities(hard.map((q) => att(q, true)), getQuestion, NOW);
    const down = estimateAbilities(hard.map((q) => att(q, false)), getQuestion, NOW);
    expect(up.sections.math.theta).toBeGreaterThan(0.5);
    expect(down.sections.math.theta).toBeLessThan(-0.3);
    expect(up.sections.math.sd).toBeLessThan(none.sections.math.sd);
  });

  it('uses what the student said: a past score, topics that feel hard, and topics not taught yet', () => {
    const p = priorsFromIntake(intake({ past: { math: 650 }, hard: ['grammar'], mathClass: 'alg1' }));
    expect(p.section.math.mu).toBeGreaterThan(1);
    expect(p.skill.bnd).toBeLessThan(0);
    expect(p.notTaught).toEqual(expect.arrayContaining(['trig', 'circ', 'nleq']));
    const ab = estimateAbilities([], getQuestion, NOW, intake({ mathClass: 'alg1' }));
    expect(ab.skills.trig.theta).toBeLessThan(ab.skills.lin1.theta - 0.5);
    expect(sectionBand(ab, 'math').low).toBeLessThan(sectionBand(ab, 'math').high);
  });

  it('ignores click-through guesses: a wrong answer in under 4 seconds is not evidence', () => {
    const q = QUESTIONS.find((x) => x.section === 'math' && x.difficulty === 'medium')!;
    const fast = { ...att(q, false), answer: '0', ms: 1500 };
    expect(estimateAbilities([fast], getQuestion, NOW).skills[q.skill].n).toBe(0);
  });
});

describe('placement check', () => {
  const run = (rightAnswers: boolean) => {
    const attempts: Attempt[] = [];
    const asked: Question[] = [];
    for (let k = 0; k < 30; k++) {
      const q = nextPlacementQuestion({ bank: QUESTIONS, attempts, sessionId: 'placement-1', getQ: getQuestion, now: NOW });
      if (!q) break;
      asked.push(q);
      attempts.push(att(q, rightAnswers, NOW, 'diagnostic', 'placement-1'));
    }
    return asked;
  };
  it('asks 16 questions, two per SAT domain, alternating sections, never Beyond SAT', () => {
    const qs = run(true);
    expect(qs).toHaveLength(PLACEMENT_LENGTH);
    for (const d of DOMAINS) expect(qs.filter((q) => q.domain === d.id)).toHaveLength(2);
    qs.forEach((q, i) => expect(q.section).toBe(i % 2 === 0 ? 'rw' : 'math'));
    expect(qs.some((q) => q.difficulty === 'elite')).toBe(false);
  });
  it('adapts: right answers lead to harder questions than wrong answers', () => {
    const rank = (qs: Question[]) => qs.slice(8).reduce((t, q) => t + TIER_B[q.difficulty], 0);
    expect(rank(run(true))).toBeGreaterThan(rank(run(false)));
  });
});

describe('coach', () => {
  const placed = (skillsWrong: SkillId[]) => SKILLS.flatMap((k) => QUESTIONS.filter((q) => q.skill === k.id && q.difficulty === 'hard').slice(0, 2).map((q) => att(q, !skillsWrong.includes(k.id))));
  it('gives different students different plans, led by their own weak skills', () => {
    const a = buildCoach(state({ intake: intake({}) }, placed(['circ', 'trig', 'area'])), { now: NOW, getQ: getQuestion, bank: QUESTIONS });
    const b = buildCoach(state({ intake: intake({}) }, placed(['bnd', 'fss', 'tra'])), { now: NOW, getQ: getQuestion, bank: QUESTIONS });
    expect(coachPriority(a).slice(0, 3)).not.toEqual(coachPriority(b).slice(0, 3));
    expect(coachPriority(a).slice(0, 6)).toEqual(expect.arrayContaining(['circ']));
    expect(coachPriority(b).slice(0, 6)).toEqual(expect.arrayContaining(['bnd']));
  });

  it('stays inside the student’s minutes and rest days, and never plans past test day', () => {
    const exam = addDays(dateKey(NOW), 10);
    const p = buildCoach(state({ intake: intake({}), dailyMinutes: 30, restDays: [0, 6], examDate: exam }, placed([])), { now: NOW, getQ: getQuestion, bank: QUESTIONS });
    for (const d of p.days) {
      expect(d.date <= exam).toBe(true);
      const dow = new Date(parseDateKey(d.date)).getDay();
      if (dow === 0 || dow === 6) expect(d.rest || d.testDay).toBe(true);
      if (!d.rest) expect(d.tasks.reduce((t, x) => t + x.minutes, 0)).toBeLessThanOrEqual(30 + 3);
    }
    expect(p.days.at(-1)!.testDay).toBe(true);
    expect(p.days.flatMap((d) => d.tasks).some((t) => t.kind === 'mock')).toBe(false); // 30 minutes a day: no 2-hour tests
  });

  it('keeps today put while the student works, and ticks tasks off from what they did', () => {
    const base = state({ intake: intake({}), dailyMinutes: 45, restDays: [] }, placed(['ratio', 'pct']));
    const p1 = buildCoach(base, { now: NOW, getQ: getQuestion, bank: QUESTIONS });
    const practice = p1.days[0].tasks.find((t) => t.kind === 'practice')!;
    expect(practice).toBeTruthy();
    const qs = QUESTIONS.filter((q) => q.skill === practice.skill).slice(0, 8).map((q) => att(q, true, NOW + 60_000));
    const later = { ...base, attempts: [...base.attempts, ...qs] };
    const p2 = buildCoach(later, { now: NOW + 3_600_000, getQ: getQuestion, bank: QUESTIONS });
    expect(p2.days[0].tasks.map((t) => t.title)).toEqual(p1.days[0].tasks.map((t) => t.title));
    expect(markDone(p2, later, NOW + 3_600_000, getQuestion).days[0].tasks.find((t) => t.id === practice.id)!.done).toBe(true);
  });

  it('says so when the goal is out of reach for the time available', () => {
    const p = buildCoach(state({ intake: intake({ past: { rw: 400, math: 400 } }), targetScore: 1500, dailyMinutes: 15, examDate: addDays(dateKey(NOW), 20) }), { now: NOW, getQ: getQuestion, bank: QUESTIONS });
    expect(p.notes.join(' ')).toMatch(/goal of 1500/);
  });

  it('keeps the Path in route order: it starts at the first skill along the route the student has not secured', () => {
    const s = state({ intake: intake({}) }, placed(['circ', 'trig']));
    const i = engineInput(s, NOW, 'math');
    const step = nextStep({ ...i, srs: {}, mistakes: {} });
    const firstWeak = pathOf('math').sort((a, b) => a.order - b.order).find((p) => p.id === 'circ' || p.id === 'trig')!.id;
    expect(step.skill).toBe(firstWeak); // every earlier skill was answered right, so the route moves past it
    const fresh = engineInput(state({}), NOW, 'math');
    expect(nextStep(fresh).skill).toBe(pathOf('math').sort((a, b) => a.order - b.order)[0].id); // nothing known: the very start
  });
});

describe('questions at the right level', () => {
  it('never hands a struggling student a question far out of reach in practice, review or redos', () => {
    const wrong = QUESTIONS.filter((q) => q.section === 'math' && q.difficulty !== 'medium').slice(0, 40).map((q) => att(q, false));
    const s = { ...state({ intake: intake({ past: { math: 300, rw: 300 } }) }, wrong) };
    const ab = estimateAbilities(s.attempts, getQuestion, NOW, s.profile.intake);
    const set = pickSmartSet(s, QUESTIONS, getQuestion, 10, NOW, { section: 'math' }).map((p) => getQuestion(p.qid)!);
    for (const q of set) expect(withinReach(ab, q)).toBe(true);
    expect(set.every((q) => pKnow(ab.skills[q.skill].theta, TIER_B[q.difficulty]) >= 0.25)).toBe(true);
    const redo = buildSession({ mode: 'mistakes', n: '10' }, s, QUESTIONS, getQuestion, NOW).qids.map((id) => getQuestion(id)!);
    for (const q of redo) expect(withinReach(ab, q)).toBe(true);
  });
});
