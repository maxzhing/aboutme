import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QUESTIONS } from '@/data/questions';
import type { MockAttempt, Question } from '@/lib/types';
import { initialState } from '@/lib/state';
import { classifyMath, classifyRW, keyAgrees, parseKeyCell, rwFromLines, scrub, positionalDifficulty, parseAnswerKey, parseBooklet, parseExplanations, parseScoreTable, docKind, testNumber, MOD_KEYS, type PPage } from '@/lib/fullTest/parse';
import { ability, calibratedScore, CB_CURVE, curveAt, missCosts, pointsPerQuestion, tableScore, type Resp } from '@/lib/fullTest/score';
import { buildSatModule, remixForms, satCoverage } from '@/lib/fullTest/assemble';
import { RW_SLOTS, advanceMock, scoreMock, startMock, REAL_SAT, REMIX, formName } from '@/lib/engine/mock';
import { registerFullTests, FULL_TESTS } from '@/lib/fullTest/registry';
import { analyzeTest, planFromTest } from '@/lib/engine/testPlan';
import { isCorrect } from '@/lib/answers';

describe('reading official practice-test files', () => {
  it('reads every kind of answer-key cell', () => {
    expect(parseKeyCell('B')).toEqual({ mcq: 1 });
    expect(parseKeyCell('15; -5')).toEqual({ spr: ['15', '-5'] });
    expect(parseKeyCell('361/8; 45.12; 45.13')).toEqual({ spr: ['361/8', '45.12', '45.13'] });
    expect(parseKeyCell('4,205')).toEqual({ spr: ['4205'] });
    expect(parseKeyCell('–24')).toEqual({ spr: ['-24'] });
    expect(parseKeyCell('QUESTION')).toBeNull();
  });

  it('checks a key against the College Board explanation, tolerating lost fraction layout', () => {
    expect(keyAgrees({ mcq: 0 }, 'Choice A is the best answer because …')).toBe(true);
    expect(keyAgrees({ mcq: 1 }, 'Choice A is the best answer because …')).toBe(false);
    expect(keyAgrees({ spr: ['3.75', '15/4'] }, 'The correct answer is 3 75. . Since')).toBe(true);
    expect(keyAgrees({ spr: ['1200'] }, 'The correct answer is 1 200, . Since')).toBe(true);
    expect(keyAgrees({ spr: ['9'] }, 'The correct answer is 12. Since')).toBe(false);
  });

  it('sorts Reading & Writing questions by the College Board question wording', () => {
    expect(classifyRW('Which choice completes the text with the most logical and precise word or phrase?', [])).toBe('wic');
    expect(classifyRW('Which choice completes the text with the most logical transition?', [])).toBe('tra');
    expect(classifyRW('Which choice best states the main purpose of the text?', [])).toBe('tsp');
    expect(classifyRW('Which choice most effectively uses data from the graph to complete the statement?', [])).toBe('coeq');
    expect(classifyRW('Which quotation from the poem most effectively illustrates the claim?', [])).toBe('coet');
    expect(classifyRW('Which choice most logically completes the text?', [])).toBe('inf');
    expect(classifyRW('Based on the texts, how would the author of Text 2 most likely respond?', [])).toBe('ctc');
    const sec = 'Which choice completes the text so that it conforms to the conventions of Standard English?';
    expect(classifyRW(sec, ['dry but', 'dry, but', 'dry', 'dry,'])).toBe('bnd');
    expect(classifyRW(sec, ['twofold: it', 'twofold. It', 'twofold it', 'twofold; it'])).toBe('bnd');
    expect(classifyRW(sec, ['runs', 'were running', 'have run', 'run'])).toBe('fss');
    expect(classifyRW('While researching a topic, a student has taken the following notes: … Which choice most effectively uses relevant information from the notes to accomplish this goal?', [], '', ['a', 'b'])).toBe('syn');
  });

  it('sorts Math questions from the question and explanation wording', () => {
    expect(classifyMath('', 'Point C is the center of the circle, so segment CA is a radius.')).toBe('circ');
    expect(classifyMath('', 'Adding the two equations of the given system eliminates y.')).toBe('sys');
    expect(classifyMath('', 'Listing the values in order, the median of the data set is the 5th value.')).toBe('data1');
    expect(classifyMath('', 'The survey estimate is 0.62, with a margin of error of 0.03.')).toBe('infer');
    expect(classifyMath('', 'This is an exponential model in which the amount halves every 3 hours.')).toBe('nlf');
    expect(classifyMath('', 'In right triangle PQR, sin P equals the opposite leg over the hypotenuse.')).toBe('trig');
  });

  it('estimates difficulty from position in thirds', () => {
    expect([0, 4, 5, 9, 10, 12].map((i) => positionalDifficulty(i, 13))).toEqual(['Easy', 'Easy', 'Medium', 'Hard', 'Hard', 'Hard']);
  });
});

describe('cleaning imported Reading and Writing text (made-up text, same damage as seen in real imports)', () => {
  it('removes leaked page furniture and keeps everything else', () => {
    expect(scrub('The bridge opened in 1932. Do not turn to any other module in the test. Engineers praised it.', 'passage')).toBe('The bridge opened in 1932. Engineers praised it.');
    expect(scrub('a slow decline of important reading and writing skills. Each passage or pair', 'other')).toBe('a slow decline');
    expect(scrub('.,  ______, Glass frogs are nearly transparent.', 'passage')).toBe('Glass frogs are nearly transparent.');
    expect(scrub('The poem ends quietly.\n©2019 by A. Writer', 'passage')).toBe('The poem ends quietly.');
    expect(scrub('a cutting- edge design', 'other')).toBe('a cutting-edge design');
    // a choice may rightly start with punctuation, and "pre- and post-" is not a broken word
    expect(scrub(', and', 'other')).toBe(', and');
    expect(scrub('pre- and post-war housing', 'other')).toBe('pre- and post-war housing');
  });
  it('gives up on text it cannot cut cleanly, so the exact page image is used instead', () => {
    expect(scrub('The trail is steep ©2020 by B. Author Which choice best states', 'other')).toBeNull();
    expect(scrub('If you finish before time is called, you may', 'other')).toBeNull();
  });
  it('keeps the hyphen of a compound split across lines', () => {
    const L = (text: string, i: number) => ({ page: 1, x: 40, top: 100 + i * 12, bottom: 110 + i * 12, right: 300, text, h: 10 });
    const lines = ['Art groups such as the Vietnam-', 'based collective show new work', 'each spring in small galleries.', 'Which choice best states the main idea of the text?', 'A) One', 'B) Two', 'C) Three', 'D) Four'].map(L);
    lines[3] = { ...lines[3], top: lines[3].top + 20, bottom: lines[3].bottom + 20 };
    const t = rwFromLines(lines, 300);
    expect(t.passage).toContain('Vietnam-based');
    expect(t.clean).toBe(true);
  });
});

describe('questions that span both columns (made-up page, same layout as the cut-off questions)', () => {
  const it_ = (x: number, y: number, s: string, w = s.length * 5, h = 10) => ({ x, y, w, h, s });
  const page = (wideRow: boolean): PPage => ({ n: 1, width: 612, height: 792, items: [
    it_(40, 40, 'Module'), it_(90, 40, '1'), it_(200, 60, 'Math', 40, 20), it_(200, 75, '22 QUESTIONS'),
    it_(40, 120, '1'), it_(60, 140, 'The table shows the number of tickets sold.'),
    wideRow ? it_(60, 170, 'Day Monday Tuesday Wednesday Thursday Friday Saturday Sunday Total', 420) : it_(60, 170, 'Day Monday Tuesday'),
    it_(60, 200, 'How many tickets were sold on Friday?'), it_(60, 230, 'A) 12'),
    it_(40, 300, '2'), it_(60, 320, 'What is the value of x?'), it_(60, 340, 'A) 4'),
    it_(320, 400, '3'), it_(340, 420, 'Which expression is equivalent?'), it_(340, 440, 'A) 2x'),
  ] });
  it('widens the crop of a question whose table runs across the gutter, and keeps the next questions intact', () => {
    const b = parseBooklet([page(true)]);
    const qs = b.modules[0].questions;
    expect(qs.map((q) => q.num)).toEqual([1, 2, 3]);
    expect(qs[0].parts[0].box.x1).toBe(612 - 18);
    expect(qs[1].parts[0].box.x1).toBeLessThan(306);
    expect(qs[2].parts[0].box.x0).toBeGreaterThan(306);
  });
  it('leaves ordinary one-column questions alone', () => {
    const qs = parseBooklet([page(false)]).modules[0].questions;
    expect(qs.every((q) => q.parts[0].box.x1 <= 306 || q.parts[0].box.x0 > 306)).toBe(true);
  });
});

describe('scoring official tests', () => {
  it('uses the printed conversion table exactly', () => {
    const table: [number, number][] = [[200, 200], [200, 210], [230, 250]];
    expect(tableScore(table, 2)).toEqual({ low: 230, high: 250, mid: 240 });
    expect(tableScore(table, 9)).toEqual({ low: 230, high: 250, mid: 240 });
  });

  it('has an averaged College Board curve from 200 to about 800 that never falls', () => {
    expect(CB_CURVE.rw).toHaveLength(67);
    expect(CB_CURVE.math).toHaveLength(55);
    for (const c of Object.values(CB_CURVE)) { expect(c[0]).toBe(200); expect(c[c.length - 1]).toBeGreaterThan(790); c.slice(1).forEach((v, i) => expect(v).toBeGreaterThanOrEqual(c[i])); }
    expect(curveAt('rw', 33)).toBe(CB_CURVE.rw[33]);
  });

  const resp = (n: number, correct: number, level: Resp['level'] = 'Medium'): Resp[] => Array.from({ length: n }, (_, i) => ({ level, type: 'mcq', correct: i < correct }));
  it('gives higher scores for more correct answers, and more credit for harder questions', () => {
    const scores = [10, 20, 30, 40, 50].map((c) => calibratedScore('rw', resp(54, c))!.mid);
    scores.slice(1).forEach((s, i) => expect(s).toBeGreaterThan(scores[i]));
    // same 27 correct out of 54: right on Medium questions is worth more than right on Easy ones
    const easyRight = [...resp(27, 27, 'Easy'), ...resp(27, 0, 'Hard')], mediumRight = [...resp(27, 27, 'Medium'), ...resp(27, 0, 'Hard')];
    expect(calibratedScore('rw', mediumRight)!.mid).toBeGreaterThan(calibratedScore('rw', easyRight)!.mid);
    expect(calibratedScore('math', resp(44, 44, 'Hard'))!.mid).toBe(800);
    expect(calibratedScore('math', resp(44, 44, 'Easy'), 650)!.mid).toBeLessThanOrEqual(650);
  });

  it('makes a miss on an easier question cost more than a miss on a harder one, like the real test', () => {
    // a mid-scale student: every easy question right, most medium ones, a third of the hard ones
    const form: Resp[] = [...resp(18, 18, 'Easy'), ...resp(18, 12, 'Medium'), ...resp(18, 6, 'Hard')];
    const missEasy = form.map((r, i) => (i === 0 ? { ...r, correct: false } : r));
    const missHard = form.map((r, i) => (i === 36 ? { ...r, correct: false } : r));
    expect(ability(missEasy).theta).toBeLessThan(ability(missHard).theta);
    const both = form.map((r, i) => (i === 0 || i === 36 ? { ...r, correct: false } : r));
    const [easyCost, hardCost] = [missCosts('rw', both)[0], missCosts('rw', both)[36]];
    expect(easyCost).toBeGreaterThan(hardCost);
    // the same number right, a different pattern: missing easy ones scores lower than missing hard ones
    const easyMissed = form.map((r, i) => (i < 6 ? { ...r, correct: false } : r));
    const hardMissed = form.map((r, i) => (i >= 36 && i < 42 ? { ...r, correct: false } : r));
    expect(calibratedScore('rw', easyMissed)!.mid).toBeLessThan(calibratedScore('rw', hardMissed)!.mid);
  });

  it('matches the official curve near the middle of the scale', () => {
    // a student who gets half of a typical form right should land near the curve at half the raw score
    const half: Resp[] = [...resp(22, 18, 'Easy'), ...resp(22, 11, 'Medium'), ...resp(22, 4, 'Hard')];
    expect(Math.abs(calibratedScore('rw', half)!.mid - CB_CURVE.rw[33])).toBeLessThanOrEqual(40);
  });

  it('values one more correct answer at the curve’s local slope', () => {
    expect(pointsPerQuestion('math', 600)).toBeGreaterThanOrEqual(10);
    expect(pointsPerQuestion('rw', 200)).toBeGreaterThanOrEqual(5);
  });
});

/** Stellify questions dressed up as official ones, to stand in for a real pack in tests. */
const fakeOfficial = (n: number, filter: (q: Question) => boolean = () => true): Question[] =>
  QUESTIONS.filter(filter).slice(0, n).map((q, i) => ({ ...q, id: `cbx-${q.id}`, official: true, cbDifficulty: (['Easy', 'Medium', 'Hard'] as const)[i % 3] }));

describe('the Real SAT built from official questions', () => {
  it('follows the digital SAT structure and takes official questions first', () => {
    const official = fakeOfficial(400);
    const used = new Set<string>();
    const pools = { official, bank: QUESTIONS, seen: new Set<string>(), untakenTests: new Set<string>() };
    const rw = buildSatModule('rw', 'm1', 's', pools, used);
    const math = buildSatModule('math', 'm1', 's', pools, used);
    expect(rw).toHaveLength(27);
    expect(math).toHaveLength(22);
    expect(new Set([...rw, ...math]).size).toBe(49);
    const byId = new Map([...official, ...QUESTIONS].map((q) => [q.id, q]));
    // the blueprint's skill counts are kept
    const count = (ids: string[], k: string) => ids.filter((id) => byId.get(id)!.skill === k).length;
    for (const k of new Set(RW_SLOTS)) expect(count(rw, k), k).toBe(RW_SLOTS.filter((x) => x === k).length);
    // official whenever the skill has one; otherwise only hard or very hard Stellify questions
    for (const id of [...rw, ...math]) {
      const q = byId.get(id)!;
      if (!q.official) { expect(['hard', 'very-hard']).toContain(q.difficulty); expect(official.some((o) => o.skill === q.skill && !used.has(o.id))).toBe(false); }
    }
  });

  it('saves questions from untaken full tests for last', () => {
    const official = fakeOfficial(300).map((q, i) => ({ ...q, test: i % 2 ? 'pt9' : undefined }));
    const ids = buildSatModule('rw', 'm1', 's', { official, bank: QUESTIONS, seen: new Set(), untakenTests: new Set(['pt9']) }, new Set());
    const reserved = ids.filter((id) => official.find((q) => q.id === id)?.test === 'pt9');
    const free = official.filter((q) => !q.test && q.section === 'rw');
    // a reserved question is only used for a skill with no unreserved official question left
    for (const id of reserved) { const sk = official.find((q) => q.id === id)!.skill; expect(free.filter((q) => q.skill === sk).every((q) => ids.includes(q.id))).toBe(true); }
  });

  it('reports how much of each section official questions cover', () => {
    const c = satCoverage('math', fakeOfficial(30, (q) => q.section === 'math'));
    expect(c.total).toBe(44);
    expect(c.fromOfficial).toBeLessThanOrEqual(30);
    expect(c.gaps.length).toBeGreaterThan(0);
  });

  it('runs through both sections with routing and scores on the calibrated scale', () => {
    const official = fakeOfficial(500);
    const byId = new Map([...official, ...QUESTIONS].map((q) => [q.id, q]));
    const getQ = (id: string) => byId.get(id);
    let mock = startMock('m', REAL_SAT, 'full', QUESTIONS, 1, new Set(), official);
    for (let guard = 0; guard < 6 && mock.cursor; guard++) {
      const mod = mock.modules[mock.modules.length - 1];
      for (const id of mod.qids) { const q = getQ(id)!; mod.answers[id] = q.type === 'mcq' ? String(q.answer) : (q.answer as string[])[0]; }
      const r = advanceMock(mock, QUESTIONS, getQ, new Set(), official);
      mock = r.mock;
      if (r.finished) break;
    }
    expect(mock.modules.map((m) => m.qids.length)).toEqual([27, 27, 22, 22]);
    expect(mock.modules.filter((m) => m.module === 2).every((m) => m.route === 'upper')).toBe(true);
    const sc = scoreMock(mock, getQ);
    expect(sc.rw!.mid).toBe(800);
    expect(sc.total!.mid).toBe(1600);
  });
});

describe('original remix tests and the blend', () => {
  const official = fakeOfficial(700);
  const byId = new Map([...official, ...QUESTIONS].map((q) => [q.id, q]));
  it('builds complete, non-overlapping full-length forms from the official library', () => {
    const forms = remixForms(official, QUESTIONS);
    expect(forms.length).toBeGreaterThanOrEqual(2);
    const all: string[] = [];
    for (const f of forms) {
      for (const sec of ['rw', 'math'] as const) for (const r of ['m1', 'upper', 'lower'] as const) {
        expect(f.modules[sec][r], `${f.n} ${sec} ${r}`).toHaveLength(sec === 'rw' ? 27 : 22);
        all.push(...f.modules[sec][r]);
      }
      expect(f.officialShare).toBeGreaterThanOrEqual(0.75);
    }
    expect(new Set(all).size).toBe(all.length);
    // the same library always gives the same forms, so a remix can be retaken
    expect(remixForms([...official], QUESTIONS).map((f) => f.modules.rw.m1)).toEqual(forms.map((f) => f.modules.rw.m1));
    expect(formName(REMIX + '2')).toBe('Original Remix Test 2');
  });

  it('runs a remix test with routing into its own harder Module 2', () => {
    const f = remixForms(official, QUESTIONS)[0];
    let mock = startMock('r', REMIX + '1', 'section-math', QUESTIONS, 1, new Set(), official);
    expect(mock.modules[0].qids).toEqual(f.modules.math.m1);
    const mod = mock.modules[0];
    for (const id of mod.qids) { const q = byId.get(id)!; mod.answers[id] = q.type === 'mcq' ? String(q.answer) : (q.answer as string[])[0]; }
    mock = advanceMock(mock, QUESTIONS, (id) => byId.get(id), new Set(), official).mock;
    expect(mock.modules[1].route).toBe('upper');
    expect(mock.modules[1].qids).toEqual(f.modules.math.upper);
  });

  it('blends Stellify original questions into about half of a module', () => {
    const ids = buildSatModule('rw', 'm1', 'b', { official, bank: QUESTIONS, seen: new Set(), untakenTests: new Set(), mixOriginal: 0.5 }, new Set());
    expect(ids).toHaveLength(27);
    const originals = ids.filter((id) => !byId.get(id)!.official).length;
    expect(originals).toBeGreaterThanOrEqual(6);
    expect(originals).toBeLessThanOrEqual(21);
  });
});

describe('an official full test', () => {
  it('runs in the printed order and timing and is scored with its own table', () => {
    const official = fakeOfficial(120);
    const byId = new Map(official.map((q) => [q.id, q]));
    const rw = official.filter((q) => q.section === 'rw').slice(0, 20), math = official.filter((q) => q.section === 'math').slice(0, 16);
    const table = { rw: Array.from({ length: 21 }, (_, r) => [200 + r * 20, 220 + r * 20] as [number, number]), math: Array.from({ length: 17 }, (_, r) => [200 + r * 30, 220 + r * 30] as [number, number]) };
    registerFullTests([{ id: 'ptT', number: 99, name: 'SAT Practice Test 99', table, modules: [
      { mod: 'rw1', section: 'rw', module: 1, minutes: 39, qids: rw.slice(0, 10).map((q) => q.id) }, { mod: 'rw2', section: 'rw', module: 2, minutes: 39, qids: rw.slice(10).map((q) => q.id) },
      { mod: 'math1', section: 'math', module: 1, minutes: 43, qids: math.slice(0, 8).map((q) => q.id) }, { mod: 'math2', section: 'math', module: 2, minutes: 43, qids: math.slice(8).map((q) => q.id) },
    ] }]);
    let mock = startMock('f', 'ft-ptT', 'full', QUESTIONS, 1, new Set(), official);
    expect(mock.modules[0].msAllowed).toBe(39 * 60_000);
    let k = 0;
    for (let guard = 0; guard < 6 && mock.cursor; guard++) {
      const mod = mock.modules[mock.modules.length - 1];
      for (const id of mod.qids) { const q = byId.get(id)!; if (k++ % 2 === 0) mod.answers[id] = q.type === 'mcq' ? String(q.answer) : (q.answer as string[])[0]; }
      const r = advanceMock(mock, QUESTIONS, (id) => byId.get(id), new Set(), official);
      mock = r.mock;
      if (r.finished) break;
    }
    expect(mock.modules.map((m) => m.msAllowed / 60_000)).toEqual([39, 39, 43, 43]);
    const sc = scoreMock(mock, (id) => byId.get(id));
    const raw = (sec: 'rw' | 'math') => mock.modules.filter((m) => m.section === sec).flatMap((m) => m.qids).filter((id) => isCorrect(byId.get(id)!, mock.modules.find((m) => m.qids.includes(id))!.answers[id] ?? null)).length;
    // scored by difficulty like the real test; the printed table (right answers only) is kept for comparison
    expect(sc.table!.rw).toEqual(tableScore(table.rw, raw('rw')));
    expect(sc.table!.math).toEqual(tableScore(table.math, raw('math')));
    expect(sc.math!.mid).toBeGreaterThanOrEqual(200); // (this fixture's Reading and Writing modules are empty)
    FULL_TESTS.splice(FULL_TESTS.findIndex((t) => t.id === 'ptT'), 1);
  });
});

describe('the personalized study plan', () => {
  const official = fakeOfficial(200);
  const byId = new Map(official.map((q) => [q.id, q]));
  const rw = official.filter((q) => q.section === 'rw').slice(0, 27), math = official.filter((q) => q.section === 'math').slice(0, 22);
  const mod = (section: 'rw' | 'math', qs: Question[], wrong: (q: Question, i: number) => boolean) => ({
    section, module: 1 as const, qids: qs.map((q) => q.id), flagged: [], msUsed: 10 * 60_000, msAllowed: 32 * 60_000, perQuestionMs: {},
    answers: Object.fromEntries(qs.map((q, i) => [q.id, wrong(q, i) ? (q.type === 'mcq' ? String(((q.answer as number) + 1) % 4) : '99999') : q.type === 'mcq' ? String(q.answer) : (q.answer as string[])[0]])),
  });
  const mock: MockAttempt = { id: 'x', formId: REAL_SAT, kind: 'full', startedAt: 0, completedAt: 1, modules: [mod('rw', rw, (q) => q.skill === rw[0].skill), mod('math', math, (_q, i) => i < 6)] };

  it('ranks missed skills by the points at stake and spots pacing problems', () => {
    const r = analyzeTest(mock, (id) => byId.get(id), { rw: { low: 500, mid: 510, high: 520 }, math: { low: 500, mid: 510, high: 520 } });
    expect(r.focus.length).toBeGreaterThan(0);
    r.focus.slice(1).forEach((f, i) => expect(f.points).toBeLessThanOrEqual(r.focus[i].points));
    expect(r.focus.some((f) => f.skill === rw[0].skill)).toBe(true);
    expect(r.gain).toBe(r.focus.reduce((s, f) => s + f.points, 0));
    expect(r.timing.find((t) => t.section === 'rw')!.note).toMatch(/time left|slow down/);
  });

  it('plans every day to the exam: lessons, official practice, redoing misses, and a weekly full test', () => {
    const now = new Date(2026, 10, 17).getTime();
    const r = analyzeTest(mock, (id) => byId.get(id));
    const s = initialState();
    const plan = planFromTest(r, { ...s.profile, examDate: '2026-12-15', dailyMinutes: 45, restDays: [0] }, official, new Set(), { href: '/mocks', title: 'Full test: SAT Practice Test 5 (official)' }, 'Real SAT', now);
    expect(plan.days[0].date).toBe('2026-11-18');
    expect(plan.days[plan.days.length - 1].date).toBe('2026-12-14');
    const tasks = plan.days.flatMap((d) => d.tasks);
    expect(tasks.some((t) => t.kind === 'lesson')).toBe(true);
    expect(tasks.some((t) => t.kind === 'mistakes' && t.href.includes('mode=custom'))).toBe(true);
    expect(tasks.filter((t) => t.kind === 'mock').length).toBeGreaterThanOrEqual(3);
    for (const d of plan.days) if (!d.tasks.some((t) => t.kind === 'mock')) expect(d.tasks.reduce((m, t) => m + t.minutes, 0)).toBeLessThanOrEqual(50 + 35);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
    expect(plan.days.filter((d) => new Date(d.date + 'T12:00').getDay() === 0).every((d) => d.rest)).toBe(true);
  });
});

// The College Board's own PDFs are copyrighted and never committed; this runs when a local copy exists.
const CB = join(__dirname, '..', 'private', 'cb');
describe.skipIf(!existsSync(CB))('the College Board practice tests 4–10 (local copies)', async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js' as string);
  const pagesOf = async (file: string): Promise<PPage[]> => {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), isEvalSupported: false, verbosity: 0 }).promise;
    const out: PPage[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      out.push({ n, width: vp.width, height: vp.height, items: tc.items.filter((i: any) => i.str).map((i: any) => { const [x, y] = vp.convertToViewportPoint(i.transform[4], i.transform[5]); return { x, y, w: i.width ?? 0, h: Math.max(4, Math.hypot(i.transform[2], i.transform[3])), s: i.str }; }) });
    }
    return out;
  };
  for (const t of [4, 5, 6, 7, 8, 9, 10]) {
    it(`Practice Test ${t}: every question, key, explanation and score`, async () => {
      const dir = join(CB, `t${t}`);
      if (!existsSync(dir)) return;
      const [book, score, ans] = await Promise.all([`sat-practice-test-${t}-digital.pdf`, `scoring-sat-practice-test-${t}-digital.pdf`, `sat-practice-test-${t}-answers-digital.pdf`].map((f) => pagesOf(join(dir, f))));
      expect([docKind(book), docKind(score), docKind(ans)]).toEqual(['booklet', 'scoring', 'answers']);
      expect(testNumber(score)).toBe(t);
      const b = parseBooklet(book);
      expect(b.modules.map((m) => `${m.mod}:${m.questions.length}`)).toEqual(['rw1:33', 'rw2:33', 'math1:27', 'math2:27']);
      for (const m of b.modules) expect(m.questions.map((q) => q.num)).toEqual(Array.from({ length: m.count }, (_, i) => i + 1));
      expect(b.minutes).toEqual({ rw1: 39, rw2: 39, math1: 43, math2: 43 });
      const key = parseAnswerKey(score)!, table = parseScoreTable(score)!, ex = parseExplanations(ans);
      expect(MOD_KEYS.map((m) => key[m].length)).toEqual([33, 33, 27, 27]);
      expect(table.rw).toHaveLength(67);
      expect(table.math).toHaveLength(55);
      expect(ex.size).toBe(120);
      for (const m of MOD_KEYS) key[m].forEach((k, i) => expect(keyAgrees(k, ex.get(`${m}-${i + 1}`)!.text), `${m} ${i + 1}`).toBe(true));
    }, 120_000);
  }
});
