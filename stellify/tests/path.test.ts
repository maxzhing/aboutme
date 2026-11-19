import { describe, expect, it } from 'vitest';
import { PATH, PATH_SKILLS, pathOf } from '../src/lib/path/skills';
import { credit, deriveStars, keepStars, retentionFrom, scoreSet, RETENTION_DAYS } from '../src/lib/path/stars';
import { nextStep, todayPlan, formatFor, skillStars, upcomingSkills, type EngineInput, REVIEW_CAP } from '../src/lib/path/next';
import { scoreLever, firstTries, LEVER } from '../src/lib/engine/lever';
import { getQuestion, QUESTIONS } from '../src/data/questions';
import { emptyPath } from '../src/lib/path/stars';
import { SKILLS } from '../src/lib/taxonomy';
import type { Attempt, SkillId, SrsCard } from '../src/lib/types';
import { DAY } from '../src/lib/util';

const NOW = Date.parse('2026-11-19T15:00:00');
const qOf = (skill: SkillId, i = 0) => QUESTIONS.filter((q) => q.skill === skill)[i];
const att = (qid: string, correct: boolean, at = NOW - DAY, extra: Partial<Attempt> = {}): Attempt => ({ id: `${qid}-${at}-${Math.random()}`, qid, at, answer: '0', correct, ms: 60000, hints: 0, mode: 'bank', sessionId: 's', ...extra });

function input(over: Partial<EngineInput> = {}): EngineInput {
  return {
    now: NOW, attempts: [], getQ: getQuestion, srs: {}, mistakes: {}, chapters: {},
    chapterIds: Object.fromEntries(SKILLS.map((k) => [k.id, [`${k.id}-1`, `${k.id}-2`, `${k.id}-3`]])),
    path: emptyPath(), workedFamilies: {}, levels: Object.fromEntries(SKILLS.map((k) => [k.id, 0])) as EngineInput['levels'],
    lever: [], ...over,
  };
}

describe('Path order', () => {
  it('has 19 math and 11 reading and writing skills', () => {
    expect(pathOf('math')).toHaveLength(19);
    expect(pathOf('rw')).toHaveLength(11);
  });
  it('is exactly the Learn curriculum order, so the Path and the lessons never disagree', () => {
    for (const sec of ['math', 'rw'] as const) {
      expect([...pathOf(sec)].sort((a, b) => a.order - b.order).map((s) => s.id)).toEqual(SKILLS.filter((k) => k.section === sec).map((k) => k.id));
    }
  });
  it('every prerequisite comes earlier in that order', () => {
    for (const s of PATH_SKILLS) for (const p of s.prereqs) { expect(PATH[p].order, `${p} before ${s.id}`).toBeLessThan(s.order); expect(PATH[p].section).toBe(s.section); }
  });
});

describe('star rules', () => {
  const base = { chaptersPassed: 0, chaptersTotal: 3, workedDone: false, level: 0 as const, sets: [] };
  it('credit falls with hints but never reaches zero for a right answer', () => {
    expect([0, 1, 2, 3].map((h) => credit(true, h))).toEqual([1, 0.75, 0.5, 0.25]);
    expect(credit(false, 0)).toBe(0);
  });
  it('★1 from chapters, worked examples or a passed skip check', () => {
    expect(deriveStars(base).count).toBe(0);
    expect(deriveStars({ ...base, chaptersPassed: 3 }).count).toBe(1);
    expect(deriveStars({ ...base, workedDone: true }).count).toBe(1);
  });
  it('the skip check earns ★1 and ★2 together', () => {
    const check = scoreSet('check', [1, 1, 1, 1, 0].map((c, i) => ({ qid: `q${i}`, correct: !!c, hints: 0, skill: 'lin1' as SkillId })), { section: 'math', skill: 'lin1', at: NOW, previous: [] });
    expect(check.passed).toBe(true);
    expect(deriveStars({ ...base, sets: [check] }).count).toBe(2);
  });
  it('★2 counts only the first practice set; Proficient also earns it', () => {
    const rows = (ok: number) => Array.from({ length: 6 }, (_, i) => ({ qid: `q${i}`, correct: i < ok, hints: 0, skill: 'lin1' as SkillId }));
    const fail = scoreSet('practice', rows(3), { section: 'math', skill: 'lin1', at: NOW, previous: [] });
    const pass = scoreSet('practice', rows(6), { section: 'math', skill: 'lin1', at: NOW, previous: [fail] });
    expect(fail.first).toBe(true);
    expect(pass.first).toBe(false);
    expect(deriveStars({ ...base, chaptersPassed: 3, sets: [fail, pass] }).count).toBe(1);
    expect(deriveStars({ ...base, level: 3 }).count).toBe(2);
  });
  it('hints lower credit: six right with two hints each is 3.0 credit, below the 4.5 pass mark', () => {
    const r = scoreSet('practice', Array.from({ length: 6 }, (_, i) => ({ qid: `q${i}`, correct: true, hints: 2, skill: 'lin1' as SkillId })), { section: 'math', skill: 'lin1', at: NOW, previous: [] });
    expect(r.credit).toBe(3);
    expect(r.passed).toBe(false);
  });
  it('★3 needs the hard set (or Mastered) and a Gauntlet success at least 7 days after ★2', () => {
    const two = NOW - 10 * DAY;
    expect(deriveStars({ ...base, level: 4, retainedAt: two + 3 * DAY }, { 1: two, 2: two }).count).toBe(2);
    expect(deriveStars({ ...base, level: 4, retainedAt: two + RETENTION_DAYS * DAY }, { 1: two, 2: two }).count).toBe(3);
    expect(deriveStars({ ...base, level: 3, retainedAt: NOW }, { 1: two, 2: two }).count).toBe(2);
  });
  it('a Gauntlet records retention only for right, hint-free answers a week after ★2', () => {
    const stars = { lin1: { 2: NOW - 8 * DAY }, sys: { 2: NOW - 2 * DAY } };
    const got = retentionFrom([{ correct: true, hints: 0, skill: 'lin1' }, { correct: true, hints: 0, skill: 'sys' }, { correct: true, hints: 1, skill: 'lin1' }], stars, NOW);
    expect(got).toEqual(['lin1']);
  });
  it('stars once earned are kept, even if the evidence later drops', () => {
    const kept = keepStars(undefined, deriveStars({ ...base, level: 3 }), NOW);
    expect(kept[2]).toBe(NOW);
    expect(deriveStars({ ...base, level: 1 }, kept).count).toBe(2);
  });
});

describe('next-step engine', () => {
  const due = (ids: string[], misconception = false): Record<string, SrsCard> => Object.fromEntries(ids.map((id) => [id, { due: NOW - DAY, interval: 1, ease: 2.3, reps: 0, lapses: 1, misconception }]));
  const math = QUESTIONS.filter((q) => q.section === 'math').slice(0, 10).map((q) => q.id);

  it('1. due reviews come first, capped at one block a day', () => {
    const s = nextStep(input({ srs: due(math) }));
    expect(s.kind).toBe('review');
    expect(s.href).toContain(`n=${REVIEW_CAP}`);
    expect(s.reason).toMatch(/10 questions are due/);
    const reviewed = Array.from({ length: REVIEW_CAP }, (_, i) => att(math[i], true, NOW - 60000, { mode: 'review' }));
    expect(nextStep(input({ srs: due(math), attempts: reviewed })).kind).not.toBe('review');
  });
  it('2. confident errors come next, at most 3', () => {
    const s = nextStep(input({ srs: due(math.slice(0, 5), true), attempts: Array.from({ length: REVIEW_CAP }, (_, i) => att(math[i], true, NOW - 60000, { mode: 'review' })) }));
    expect(s.kind).toBe('confident');
    expect(s.title).toBe('Fix 3 confident errors');
  });
  it('3. an unfinished chapter beats starting something new', () => {
    const s = nextStep(input({ chapters: { 'sys-1': { best: 3, total: 3, at: NOW, passedAt: NOW } } }));
    expect(s.kind).toBe('chapter');
    expect(s.skill).toBe('sys');
    expect(s.href).toBe('/learn/sys/sys-2');
  });
  it('4. the biggest Score Lever skill with prerequisites met, with a plain reason', () => {
    // lin1 has ★1 (all chapters), so its dependents are open; give sys many misses
    const chapters = Object.fromEntries(['lin1-1', 'lin1-2', 'lin1-3', 'lin2-1', 'lin2-2', 'lin2-3'].map((c) => [c, { best: 3, total: 3, at: NOW, passedAt: NOW }]));
    const sysQs = QUESTIONS.filter((q) => q.skill === 'sys').slice(0, 8);
    const attempts = sysQs.map((q, i) => att(q.id, i < 2, NOW - 2 * DAY));
    const lever = scoreLever(attempts, getQuestion, { targetScore: 1400 });
    const s = nextStep(input({ chapters, attempts, lever, section: 'math' }));
    expect(s.priority).toBe(4);
    expect(s.skill).toBe('sys');
    expect(s.reason).toMatch(/missed 6 of 8/);
  });
  it('a skill whose prerequisites have no star is not recommended by the lever', () => {
    const sysQs = QUESTIONS.filter((q) => q.skill === 'sys').slice(0, 8);
    const attempts = sysQs.map((q) => att(q.id, false, NOW - 2 * DAY));
    const s = nextStep(input({ attempts, lever: scoreLever(attempts, getQuestion, { targetScore: 1400 }), section: 'math' }));
    expect(s.skill).not.toBe('sys');
  });
  it('5. otherwise, curriculum order', () => {
    const s = nextStep(input({ section: 'math' }));
    expect(s.priority).toBe(5);
    expect(s.skill).toBe('lin1');
    expect(s.kind).toBe('chapter');
    expect(nextStep(input({ section: 'rw' })).skill).toBe('cid');
  });
  it('format: worked examples after 2+ conceptual misses, a Gauntlet for proficient skills', () => {
    const qs = QUESTIONS.filter((q) => q.skill === 'lin1').slice(0, 2);
    const mistakes = Object.fromEntries(qs.map((q) => [q.id, { qid: q.id, firstAt: NOW - DAY, lastAt: NOW - DAY, count: 1, answers: ['1'], lastMs: 1, category: 'concept' as const, relatedCorrect: [] }]));
    expect(formatFor(input({ mistakes: mistakes as unknown as EngineInput["mistakes"], workedFamilies: { lin1: ['w-lin1-a'] } }), 'lin1').kind).toBe('worked');
    const two = { 1: NOW - 9 * DAY, 2: NOW - 9 * DAY };
    const path = { ...emptyPath(), stars: { lin1: two }, sets: [scoreSet('hard', [1, 1, 1, 1].map((c, i) => ({ qid: `h${i}`, correct: !!c, hints: 0, skill: 'lin1' as SkillId })), { section: 'math', skill: 'lin1', at: NOW - 5 * DAY, previous: [] })] };
    expect(formatFor(input({ path }), 'lin1').kind).toBe('gauntlet');
    expect(skillStars(input({ path }), 'lin1').count).toBe(2);
  });
  it('today: at most three items, about 15 minutes, review first when due', () => {
    const plan = todayPlan(input({ srs: due(math) }));
    expect(plan.length).toBeLessThanOrEqual(3);
    expect(plan[0].kind).toBe('review');
    expect(plan.reduce((t, p) => t + p.minutes, 0)).toBeLessThanOrEqual(30);
    expect(plan.every((p) => p.reason.length > 10)).toBe(true);
  });
  it('upcoming skills: the recommended one first, then distinct next steps (the map raises them in this order)', () => {
    const up = upcomingSkills(input({ section: 'math' }), 3);
    expect(up[0]).toBe('lin1');
    expect(new Set(up).size).toBe(up.length);
    expect(up.length).toBe(3);
    // reviews never take the map's spotlight: the raised hex is always a skill
    const due = Object.fromEntries(QUESTIONS.slice(0, 5).map((q) => [q.id, { due: NOW - DAY, interval: 1, ease: 2.3, reps: 0, lapses: 1 }]));
    expect(upcomingSkills(input({ section: 'math', srs: due }), 1)[0]).toBe('lin1');
  });
  it('is deterministic', () => {
    const i = input({ srs: due(math.slice(0, 2)) });
    expect(JSON.stringify(nextStep(i))).toBe(JSON.stringify(nextStep(i)));
  });
});

describe('Score Lever', () => {
  it('says "needs a diagnostic" under the minimum sample', () => {
    const q = qOf('lin1');
    const l = scoreLever([att(q.id, false)], getQuestion, { targetScore: 1400 }).find((x) => x.skill === 'lin1')!;
    expect(l.needsDiagnostic).toBe(true);
    expect(l.perHour).toBeNull();
    expect(LEVER.MIN_N).toBe(6);
  });
  it('ranks a weak, heavily tested skill above a strong one, with a low–high range', () => {
    const weak = QUESTIONS.filter((q) => q.skill === 'nlf').slice(0, 10).map((q, i) => att(q.id, i < 3));
    const strong = QUESTIONS.filter((q) => q.skill === 'circ').slice(0, 10).map((q, i) => att(q.id, i < 9));
    const ls = scoreLever([...weak, ...strong], getQuestion, { targetScore: 1400 });
    const w = ls.find((x) => x.skill === 'nlf')!, s = ls.find((x) => x.skill === 'circ')!;
    expect(w.perHour!.mid).toBeGreaterThan(s.perHour!.mid);
    expect(w.perHour!.low).toBeLessThanOrEqual(w.perHour!.mid);
    expect(w.perHour!.high).toBeGreaterThanOrEqual(w.perHour!.mid);
    expect(w.ceiling).toBeGreaterThan(s.ceiling);
  });
  it('uses first tries only', () => {
    const q = qOf('lin1');
    expect(firstTries([att(q.id, false, 1), att(q.id, true, 2)])).toHaveLength(1);
  });
});

describe('one star system', () => {
  it('the 5-minute quick lesson with 2+ stars earns ★1 on the Path (and so on Learn)', () => {
    const base = { chaptersPassed: 0, chaptersTotal: 3, workedDone: false, level: 0 as const, sets: [] };
    expect(deriveStars({ ...base, quickStars: 1 }).count).toBe(0);
    expect(deriveStars({ ...base, quickStars: 2 }).count).toBe(1);
  });
});
