import { describe, expect, it } from 'vitest';
import { ALL_RAW } from '@/data/questions/all';
import { getQuestion, QUESTIONS } from '@/data/questions';
import { validateBank, validateQuestion } from '@/data/questions/rules';
import { isCorrect, sprMatches } from '@/lib/answers';
import { initialState } from '@/lib/state';
import { applyAttempt, resolveMistake } from '@/lib/engine/attempt';
import { computeSkillStats } from '@/lib/engine/mastery';
import { rangeFromResponses, sectionEstimate } from '@/lib/engine/scoring';
import { schedule } from '@/lib/engine/srs';
import { pickSmartSet, rankSkills } from '@/lib/engine/adaptive';
import { generatePlan, todaysMission } from '@/lib/engine/plan';
import { advanceMock, buildModule, LOWER_ROUTE_CAP, routeFor, scoreMock, stagesFor, startMock, summarizeMock } from '@/lib/engine/mock';
import { computeStreak } from '@/lib/engine/streak';
import { detectPatterns, resolveProgress } from '@/lib/engine/mistakes';
import { offlineTutor } from '@/lib/engine/tutor';
import { weeklyReport } from '@/lib/engine/report';
import { levelFromXp, xpForLevel } from '@/lib/engine/xp';
import { compile, findRoots, parseRelation } from '@/lib/mathexpr';
import { buildSession, dailyQuestion, diagnosticSet } from '@/lib/sessions';
import { search } from '@/lib/search';
import { tokenize } from '@/lib/richtext';
import { LESSON } from '@/data/lessons';
import { SKILLS } from '@/lib/taxonomy';
import { DAY, addDays, dateKey } from '@/lib/util';
import type { AppState, Question } from '@/lib/types';

const T0 = new Date(2026, 10, 2, 10, 0, 0).getTime(); // a Monday
const right = (q: Question) => (q.type === 'mcq' ? String(q.answer) : (q.answer as string[])[0]);
const wrong = (q: Question) => (q.type === 'mcq' ? String(((q.answer as number) + 1) % 4) : '999999');
const answer = (s: AppState, q: Question, ok: boolean, at: number, extra: Partial<{ ms: number; hints: number }> = {}) =>
  applyAttempt(s, { qid: q.id, answer: ok ? right(q) : wrong(q), ms: extra.ms ?? 60_000, hints: extra.hints ?? 0, mode: 'bank', sessionId: 't' }, at, getQuestion);

describe('question bank', () => {
  it('has at least 300 validated questions, 150 per section', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(300);
    expect(QUESTIONS.filter((q) => q.section === 'math').length).toBeGreaterThanOrEqual(150);
    expect(QUESTIONS.filter((q) => q.section === 'rw').length).toBeGreaterThanOrEqual(150);
    expect(QUESTIONS.length).toBe(ALL_RAW.length); // nothing unvalidated slipped out of, or into, production
  });
  it('passes every per-question rule (structure, explanations, independent math checks)', () => {
    const failures = ALL_RAW.flatMap((q) => validateQuestion(q).map((e) => `${q.id}: ${e}`));
    expect(failures).toEqual([]);
  });
  it('passes bank-level rules: no duplicates, 20/40/40 difficulty, balanced answer positions, every skill at every level', () => {
    expect(validateBank(ALL_RAW)).toEqual([]);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });
  it('has a complete explanation for every question and every distractor', () => {
    for (const q of QUESTIONS) {
      expect(q.steps.length).toBeGreaterThanOrEqual(2);
      expect(q.hints).toHaveLength(3);
      if (q.type === 'mcq') expect(q.why).toHaveLength(4); else expect(q.why.length).toBeGreaterThanOrEqual(2);
      for (const f of [q.concept, q.strategy, q.trap, q.remember]) expect(f.length).toBeGreaterThan(19);
      expect(q.validation).toBe('validated');
      expect(q.source).toMatch(/not an official/i);
    }
  });
  it('has a lesson for every skill', () => { for (const k of SKILLS) expect(LESSON[k.id].rules.length).toBeGreaterThan(2); });
});

describe('answer checking', () => {
  it('accepts equivalent student-produced responses under SAT rounding rules', () => {
    for (const ok of ['2/3', '.6666', '.6667', '0.666', '0.667']) expect(sprMatches(ok, '2/3')).toBe(true);
    for (const bad of ['0.66', '.67', '0.6', '3/2', '']) expect(sprMatches(bad, '2/3')).toBe(false);
    expect(sprMatches('3.5', '7/2')).toBe(true);
    expect(sprMatches('-18', '-18')).toBe(true);
    expect(sprMatches('18', '-18')).toBe(false);
  });
  it('marks the keyed answer correct and others incorrect for every question', () => {
    for (const q of QUESTIONS) { expect(isCorrect(q, right(q))).toBe(true); expect(isCorrect(q, wrong(q))).toBe(false); expect(isCorrect(q, null)).toBe(false); }
  });
});

describe('attempts, XP, mistakes and resolution', () => {
  const q = getQuestion('m-nleq-12')!;
  it('saves a wrong answer to the Mistake Bucket and schedules it for review', () => {
    const r = answer(initialState(), q, false, T0);
    expect(r.correct).toBe(false);
    expect(r.state.mistakes[q.id]).toMatchObject({ count: 1, status: 'unresolved', redoCorrect: false });
    expect(r.state.srs[q.id].due).toBeGreaterThan(T0);
    expect(r.state.pet.xp).toBe(3);
  });
  it('awards more XP for harder questions, none for rapid guesses, little for repeats', () => {
    const med = getQuestion('m-lin1-01')!;
    const a = answer(initialState(), q, true, T0);
    const b = answer(initialState(), med, true, T0);
    expect(a.state.pet.xp).toBeGreaterThan(b.state.pet.xp);
    expect(answer(initialState(), q, false, T0, { ms: 1500 }).state.pet.xp).toBe(0);
    const again = answer(a.state, q, true, T0 + 60_000);
    expect(again.state.pet.xp - a.state.pet.xp).toBeLessThan(a.state.pet.xp / 2);
    expect(answer(initialState(), q, true, T0, { hints: 3 }).state.pet.xp).toBeLessThan(a.state.pet.xp);
  });
  it('allows resolving a mistake only after a clean redo and two new related questions', () => {
    let s = answer(initialState(), q, false, T0).state;
    expect(resolveMistake(s, q.id, T0 + 1, getQuestion).ok).toBe(false);
    s = answer(s, q, true, T0 + 1000).state;
    expect(resolveProgress(s.mistakes[q.id])).toMatchObject({ redo: true, related: 0, ready: false });
    const related = QUESTIONS.filter((x) => x.skill === q.skill && x.id !== q.id).slice(0, 2);
    s = answer(s, related[0], true, T0 + 2000).state;
    expect(resolveMistake(s, q.id, T0 + 2500, getQuestion).ok).toBe(false);
    const r = answer(s, related[1], true, T0 + 3000);
    expect(r.events.some((e) => e.type === 'ready')).toBe(true);
    const done = resolveMistake(r.state, q.id, T0 + 4000, getQuestion);
    expect(done.ok).toBe(true);
    expect(done.state.mistakes[q.id].status).toBe('resolved');
    expect(done.state.achievements['fix-1']).toBeTruthy();
  });
  it('a redo that needed hints does not count', () => {
    let s = answer(initialState(), q, false, T0).state;
    s = answer(s, q, true, T0 + 1000, { hints: 1 }).state;
    expect(s.mistakes[q.id].redoCorrect).toBe(false);
  });
  it('detects recurring error patterns', () => {
    let s = initialState();
    for (const x of QUESTIONS.filter((k) => k.skill === 'bnd').slice(0, 5)) s = answer(s, x, false, T0).state;
    const p = detectPatterns(s.mistakes, getQuestion);
    expect(p.length).toBeGreaterThan(0);
    expect(p[0].skill).toBe('bnd');
  });
  it('unlocks the first achievement after ten questions and levels the pet', () => {
    let s = initialState();
    QUESTIONS.slice(0, 10).forEach((x, i) => { s = answer(s, x, true, T0 + i * 1000).state; });
    expect(s.achievements['first-10']).toBeTruthy();
    expect(s.achievements['perfect-10']).toBeTruthy();
    expect(levelFromXp(s.pet.xp).level).toBeGreaterThan(1);
    expect(xpForLevel(5)).toBeGreaterThan(xpForLevel(2));
  });
});

describe('mastery', () => {
  const pool = QUESTIONS.filter((x) => x.skill === 'nleq');
  it('does not grant mastery for one correct answer', () => {
    const s = answer(initialState(), pool.find((x) => x.difficulty === 'medium')!, true, T0).state;
    expect(computeSkillStats('nleq', s.attempts, getQuestion).level).toBe(1);
  });
  it('requires volume, accuracy, hard questions and more than one day', () => {
    let s = initialState();
    const order = [...pool].sort((a, b) => a.difficulty.localeCompare(b.difficulty)).slice(0, 14);
    order.forEach((x, i) => { s = answer(s, x, true, T0 + i * 1000).state; });
    expect(computeSkillStats('nleq', s.attempts, getQuestion).level).toBe(3); // same day → not yet mastered
    s = answer(s, pool[pool.length - 1], true, T0 + DAY + 5000).state;
    expect(computeSkillStats('nleq', s.attempts, getQuestion).level).toBe(4);
  });
});

describe('score estimate', () => {
  const mk = (correct: boolean, d: Question['difficulty'], n: number) => Array.from({ length: n }, () => ({ difficulty: d, type: 'mcq' as const, correct }));
  it('needs enough data and orders performances sensibly', () => {
    expect(rangeFromResponses(mk(true, 'hard', 5))).toBeNull();
    const hi = rangeFromResponses(mk(true, 'very-hard', 20))!, lo = rangeFromResponses(mk(false, 'medium', 20))!, mid = rangeFromResponses([...mk(true, 'hard', 10), ...mk(false, 'hard', 10)])!;
    expect(hi.mid).toBeGreaterThan(mid.mid); expect(mid.mid).toBeGreaterThan(lo.mid);
    for (const r of [hi, lo, mid]) { expect(r.low).toBeLessThanOrEqual(r.mid); expect(r.high).toBeGreaterThanOrEqual(r.mid); expect(r.low).toBeGreaterThanOrEqual(200); expect(r.high).toBeLessThanOrEqual(800); }
    expect(rangeFromResponses(mk(true, 'very-hard', 30), LOWER_ROUTE_CAP)!.high).toBeLessThanOrEqual(LOWER_ROUTE_CAP);
  });
  it('gives a narrower range with more data', () => {
    const few = rangeFromResponses([...mk(true, 'hard', 5), ...mk(false, 'hard', 5)])!, many = rangeFromResponses([...mk(true, 'hard', 40), ...mk(false, 'hard', 40)])!;
    expect(many.high - many.low).toBeLessThanOrEqual(few.high - few.low);
  });
  it('estimates a section from practice history', () => {
    let s = initialState();
    QUESTIONS.filter((x) => x.section === 'math').slice(0, 12).forEach((x, i) => { s = answer(s, x, i % 3 !== 0, T0 + i * 1000).state; });
    expect(sectionEstimate('math', s.attempts, getQuestion)).not.toBeNull();
    expect(sectionEstimate('rw', s.attempts, getQuestion)).toBeNull();
  });
});

describe('spaced repetition', () => {
  it('pushes correct cards out at growing intervals and resets on a miss', () => {
    let c = schedule(undefined, false, false, T0);
    expect(c.interval).toBe(1);
    c = schedule(c, true, true, T0); const a = c.interval;
    c = schedule(c, true, true, T0); const b = c.interval;
    c = schedule(c, true, true, T0);
    expect(b).toBeGreaterThan(a); expect(c.interval).toBeGreaterThan(b);
    expect(schedule(c, false, false, T0).interval).toBe(1);
  });
});

describe('adaptive practice', () => {
  it('returns the requested number of unique questions and targets the weakest skill', () => {
    let s = initialState();
    QUESTIONS.filter((x) => x.skill === 'bnd').slice(0, 6).forEach((x, i) => { s = answer(s, x, false, T0 + i * 1000).state; });
    QUESTIONS.filter((x) => x.skill === 'lin1').slice(0, 6).forEach((x, i) => { s = answer(s, x, true, T0 + 10_000 + i * 1000).state; });
    const now = T0 + 2 * DAY;
    expect(rankSkills(s, getQuestion, now, 'rw')[0].skill).toBe('bnd');
    const picks = pickSmartSet(s, QUESTIONS, getQuestion, 10, now, { seed: 'x' });
    expect(picks).toHaveLength(10);
    expect(new Set(picks.map((p) => p.qid)).size).toBe(10);
    expect(picks.some((p) => /Spaced review/.test(p.reason))).toBe(true);
    expect(picks.filter((p) => getQuestion(p.qid)!.skill === 'bnd').length).toBeGreaterThan(0);
    expect(picks.some((p) => /sharp/.test(p.reason))).toBe(true); // strong skills are not abandoned
    expect(pickSmartSet(s, QUESTIONS, getQuestion, 8, now, { section: 'math', seed: 'y' }).every((p) => getQuestion(p.qid)!.section === 'math')).toBe(true);
  });
});

describe('study plan', () => {
  it('builds a 30-day plan that respects rest days and the daily time budget', () => {
    const s: AppState = { ...initialState(), profile: { ...initialState().profile, dailyMinutes: 30, restDays: [0, 3], diagnosticAt: T0 } };
    const plan = generatePlan(s, getQuestion, T0);
    expect(plan.days).toHaveLength(30);
    for (const d of plan.days) {
      const dow = new Date(d.date + 'T12:00:00').getDay();
      if ([0, 3].includes(dow)) { expect(d.rest).toBe(true); expect(d.tasks).toHaveLength(0); }
      const flexible = d.tasks.filter((t) => t.kind !== 'mock' && t.kind !== 'diagnostic' && t.kind !== 'timed');
      expect(flexible.reduce((t, x) => t + x.minutes, 0)).toBeLessThanOrEqual(35);
    }
    expect(new Set(plan.days.map((d) => d.week))).toEqual(new Set([1, 2, 3, 4]));
    expect(plan.days.some((d) => d.tasks.some((t) => t.kind === 'mock'))).toBe(true);
  });
  it('shortens the plan when the exam is sooner and starts with the diagnostic', () => {
    const s: AppState = { ...initialState(), profile: { ...initialState().profile, examDate: addDays(dateKey(T0), 12) } };
    const plan = generatePlan(s, getQuestion, T0);
    expect(plan.days).toHaveLength(12);
    expect(plan.days[0].tasks[0].kind).toBe('diagnostic');
    expect(todaysMission({ ...s, plan }, getQuestion, T0).fromPlan).toBe(true);
    expect(todaysMission(s, getQuestion, T0).tasks[0].kind).toBe('diagnostic');
  });
});

describe('mock exams', () => {
  it('builds modules of the official length with no repeats inside a form', () => {
    const used = new Set<string>();
    for (const sec of ['rw', 'math'] as const) for (const kind of ['m1', 'upper'] as const) {
      const ids = buildModule(sec, kind, 'seed', QUESTIONS, used);
      expect(ids).toHaveLength(sec === 'rw' ? 27 : 22);
      for (const id of ids) { expect(used.has(id)).toBe(false); used.add(id); expect(getQuestion(id)!.section).toBe(sec); }
    }
  });
  it('makes the upper route harder than the lower route', () => {
    const vh = (ids: string[]) => ids.filter((id) => getQuestion(id)!.difficulty === 'very-hard').length;
    expect(vh(buildModule('math', 'upper', 's', QUESTIONS, new Set()))).toBeGreaterThan(vh(buildModule('math', 'lower', 's', QUESTIONS, new Set())) + 5);
  });
  it('routes on module 1 performance and walks through every stage of a full test', () => {
    let m = startMock('id', 'A', 'full', QUESTIONS, T0, new Set());
    expect(stagesFor('full')).toEqual(['rw1', 'rw2', 'break', 'math1', 'math2']);
    m.modules[0].answers = Object.fromEntries(m.modules[0].qids.map((id) => [id, right(getQuestion(id)!)]));
    expect(routeFor(m.modules[0], getQuestion)).toBe('upper');
    m = advanceMock(m, QUESTIONS, getQuestion, new Set()).mock;
    expect(m.modules[1]).toMatchObject({ section: 'rw', module: 2, route: 'upper' });
    m = advanceMock(m, QUESTIONS, getQuestion, new Set()).mock; // break
    expect(m.cursor!.breakMsLeft).toBe(10 * 60_000);
    m = advanceMock(m, QUESTIONS, getQuestion, new Set()).mock; // math 1, left blank
    expect(routeFor(m.modules[2], getQuestion)).toBe('lower');
    m = advanceMock(m, QUESTIONS, getQuestion, new Set()).mock;
    expect(m.modules[3].route).toBe('lower');
    const end = advanceMock(m, QUESTIONS, getQuestion, new Set());
    expect(end.finished).toBe(true);
    expect(new Set(m.modules.flatMap((x) => x.qids)).size).toBe(27 + 27 + 22 + 22);
    const sc = scoreMock(m, getQuestion);
    expect(sc.rw!.mid).toBeGreaterThan(sc.math!.mid);
    expect(sc.math!.high).toBeLessThanOrEqual(LOWER_ROUTE_CAP);
    expect(sc.total!.mid).toBe(sc.rw!.mid + sc.math!.mid);
    const sum = summarizeMock(m, getQuestion);
    expect(sum.total).toBe(98); expect(sum.unanswered).toBe(98 - 27);
  });
  it('gives fixed forms the same questions every time', () => {
    expect(startMock('a', 'A', 'full', QUESTIONS, 1, new Set()).modules[0].qids).toEqual(startMock('b', 'A', 'full', QUESTIONS, 999, new Set()).modules[0].qids);
    expect(startMock('a', 'A', 'full', QUESTIONS, 1, new Set()).modules[0].qids).not.toEqual(startMock('b', 'B', 'full', QUESTIONS, 1, new Set()).modules[0].qids);
  });
});

describe('streaks', () => {
  const day = (n: number) => ({ ms: n, questions: 3, correct: 2, xp: 10, lessons: 0 });
  it('does not break on planned rest days', () => {
    const fri = '2026-11-06', sat = '2026-11-07', mon = '2026-11-09';
    const act = { [fri]: day(1), [sat]: day(1), [mon]: day(1) };
    expect(computeStreak(act, [0], mon).current).toBe(3);
    expect(computeStreak(act, [], mon).current).toBe(1);
    expect(computeStreak(act, [], mon).best).toBe(2);
  });
});

describe('offline tutor', () => {
  const q = getQuestion('r-bnd-06')!;
  const base = { state: initialState(), bank: QUESTIONS, getQ: getQuestion };
  it('gives progressive hints without revealing the answer', () => {
    const h1 = offlineTutor({ ...base, mode: 'hint', question: q, hintsGiven: 0 });
    const h3 = offlineTutor({ ...base, mode: 'hint', question: q, hintsGiven: 2 });
    expect(h1.hintsGiven).toBe(1); expect(h3.hintsGiven).toBe(3);
    expect(h1.text).not.toEqual(h3.text);
    expect(offlineTutor({ ...base, mode: 'teach', question: q }).text).not.toContain('Correct answer');
  });
  it('explains the exact distractor the student chose', () => {
    const s = answer(initialState(), q, false, T0).state;
    const r = offlineTutor({ ...base, state: s, mode: 'mistake', question: q, answer: wrong(q) });
    expect(r.text).toContain(q.why[Number(wrong(q))]);
    expect(r.text).toContain('Correct answer');
  });
  it('answers general questions from the reference material and admits when it cannot', () => {
    expect(offlineTutor({ ...base, mode: 'ask', message: 'When do I use a semicolon?' }).text).toMatch(/semicolon/i);
    expect(offlineTutor({ ...base, mode: 'ask', message: 'what does ephemeral mean' }).text).toMatch(/short time/);
    expect(offlineTutor({ ...base, mode: 'ask', message: 'zzqx blorp' }).text).toMatch(/will not guess/);
  });
  it('walks through the validated steps in Socratic mode', () => {
    const a = offlineTutor({ ...base, mode: 'socratic', question: q, socraticStep: 0 });
    const b = offlineTutor({ ...base, mode: 'socratic', question: q, socraticStep: a.socraticStep });
    expect(b.text).toContain(q.steps[0]);
  });
});

describe('sessions, search and utilities', () => {
  it('builds sessions from parameters', () => {
    const s = initialState();
    expect(buildSession({ mode: 'skill', skill: 'tra', diff: 'very-hard', n: '4' }, s, QUESTIONS, getQuestion, T0).qids.every((id) => getQuestion(id)!.skill === 'tra' && getQuestion(id)!.difficulty === 'very-hard')).toBe(true);
    expect(buildSession({ mode: 'hard', section: 'rw', n: '6' }, s, QUESTIONS, getQuestion, T0).qids).toHaveLength(6);
    expect(buildSession({ mode: 'single', ids: 'm-lin1-01,nope' }, s, QUESTIONS, getQuestion, T0).qids).toEqual(['m-lin1-01']);
    expect(buildSession({ mode: 'mistakes' }, s, QUESTIONS, getQuestion, T0).qids).toEqual([]);
    const m = answer(s, getQuestion('r-fss-06')!, false, T0).state;
    const fix = buildSession({ mode: 'mistakes', n: '6' }, m, QUESTIONS, getQuestion, T0 + 1000);
    expect(fix.qids[0]).toBe('r-fss-06'); expect(fix.qids).toHaveLength(3);
  });
  it('has a substantial, balanced diagnostic and a deterministic daily challenge', () => {
    const d = diagnosticSet(QUESTIONS);
    expect(d).toHaveLength(28); expect(new Set(d).size).toBe(28);
    expect(d.filter((id) => getQuestion(id)!.section === 'math')).toHaveLength(14);
    expect(new Set(d.map((id) => getQuestion(id)!.domain)).size).toBe(8);
    expect(dailyQuestion(QUESTIONS, '2026-11-12').id).toBe(dailyQuestion(QUESTIONS, '2026-11-12').id);
  });
  it('searches lessons, rules, formulas, words and questions', () => {
    const kinds = (q: string) => search(q, { notes: [], mistakes: {} }).map((h) => h.kind);
    expect(kinds('semicolon')).toContain('Grammar rule');
    expect(kinds('discriminant')).toContain('Formula');
    expect(kinds('ephemeral')).toContain('Vocabulary');
    expect(kinds('inferences')).toContain('Lesson');
    expect(search('zzzzqq', { notes: [], mistakes: {} })).toEqual([]);
  });
  it('evaluates and graphs expressions', () => {
    expect(compile('2x^2 - 3x + 1').fn({ x: -2 })).toBe(15);
    expect(compile('3(2x-5)+4').fn({ x: 6 })).toBe(25);
    expect(compile('-x^2').fn({ x: 3 })).toBe(-9);
    expect(compile('sqrt(x+10)').fn({ x: 6 })).toBe(4);
    expect(parseRelation('y = 2x + 1').kind).toBe('explicit');
    expect(parseRelation('x^2 + y^2 = 25').kind).toBe('implicit');
    expect(parseRelation('x = 3').kind).toBe('vertical');
    expect(parseRelation('y > 2x - 1')).toMatchObject({ kind: 'explicit', op: '>' });
    expect(() => parseRelation('y = 2x +')).toThrow();
    const r = findRoots((x) => x * x - 5 * x - 14, -10, 10);
    expect(r[0]).toBeCloseTo(-2, 4); expect(r[1]).toBeCloseTo(7, 4);
  });
  it('tokenizes math, blanks and escaped dollar signs', () => {
    expect(tokenize(String.raw`Cost \$45 and $x^2$ then ______`).map((t) => t.t)).toEqual(['text', 'math', 'text', 'blank']);
  });
  it('produces a weekly report from recorded attempts only', () => {
    expect(weeklyReport(initialState(), getQuestion, T0).questions).toBe(0);
    let s = initialState();
    QUESTIONS.slice(0, 8).forEach((x, i) => { s = answer(s, x, i > 2, T0 - DAY + i * 1000).state; });
    const r = weeklyReport(s, getQuestion, T0);
    expect(r.questions).toBe(8); expect(r.accuracy).toBe(63); expect(r.nextSteps.length).toBeGreaterThan(0);
  });
});
