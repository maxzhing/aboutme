import { describe, expect, it } from 'vitest';
import { cleanEvents, deriveEvents, type ItemEvent } from '../src/lib/psych/events';
import { correlation, itemStats, MIN_DECIDE } from '../src/lib/psych/stats';
import { itemExport, submitItemData } from '../src/lib/psych/export';
import { difficultyOf, lifecycleOf, countsForStudent, bandFromP } from '../src/data/itemLifecycle';
import { FLAGS } from '../src/lib/flags';
import { getQuestion, QUESTIONS } from '../src/data/questions';
import type { Attempt } from '../src/lib/types';

const ev = (o: Partial<ItemEvent>): ItemEvent => ({ item_id: 'x', person: 'p1', session_id: 's', chosen_option: '0', correct: true, time_ms: 40000, position_in_session: 1, context: 'practice', skill_id: 'lin1', device_class: 'desktop', timestamp: 1, hints: 0, abandoned: false, ...o });

describe('events', () => {
  const q1 = QUESTIONS[0].id, q2 = QUESTIONS[1].id;
  const at = (qid: string, correct: boolean, t: number, extra: Partial<Attempt> = {}): Attempt => ({ id: `${qid}${t}`, qid, at: t, answer: '1', correct, ms: 30000, hints: 0, mode: 'bank', sessionId: 's1', ...extra });
  it('keeps first attempts only, with position in the session', () => {
    const e = deriveEvents({ attempts: [at(q1, false, 1), at(q2, true, 2), at(q1, true, 3)], mocks: [] }, getQuestion, { person: 'p', device: 'phone' });
    expect(e.map((x) => [x.item_id, x.correct, x.position_in_session])).toEqual([[q1, false, 1], [q2, true, 2]]);
    expect(e[0].device_class).toBe('phone');
  });
  it('takes module and position from mock exams', () => {
    const mock = { id: 'm1', formId: 'f', startedAt: 0, kind: 'full' as const, modules: [{ section: 'rw' as const, module: 2 as const, qids: [q2, q1], answers: {}, flagged: [], msUsed: 0, msAllowed: 0, perQuestionMs: {} }] };
    const e = deriveEvents({ attempts: [at(q1, true, 1, { mode: 'mock', sessionId: 'm1' })], mocks: [mock] }, getQuestion, { person: 'p', device: 'desktop' });
    expect(e[0].context).toBe('module2');
    expect(e[0].position_in_session).toBe(2);
  });
  it('cleaning drops rapid guesses, abandoned and hinted answers, and reports each', () => {
    const r = cleanEvents([ev({ time_ms: 1200 }), ev({ abandoned: true }), ev({ hints: 1 }), ev({})]);
    expect(r.events).toHaveLength(1);
    expect(r.report).toEqual({ kept: 1, rapid: 1, abandoned: 1, hinted: 1, notCounted: 0 });
  });
  it('a rapid guess is also anything under 10% of the item median (with 10+ responses)', () => {
    const many = Array.from({ length: 12 }, (_, i) => ev({ person: `p${i}`, time_ms: 100000 }));
    const r = cleanEvents([...many, ev({ person: 'fast', time_ms: 8000 })]);
    expect(r.report.rapid).toBe(1);
  });
});

describe('item statistics', () => {
  it('correlation matches a hand calculation', () => {
    // by hand: means .5 and .55; Σdxdy = .5, Σdx² = 1, Σdy² = .29, so r = .5 / √.29 = .9285
    expect(correlation([1, 0, 1, 0], [0.9, 0.2, 0.7, 0.4])).toBeCloseTo(0.9285, 3);
    expect(correlation([1, 1, 1], [0.1, 0.5, 0.9])).toBeNull();
  });
  const info = () => ({ key: '0', choices: 4, tags: [null, 'Goes beyond the text', 'Reverses', 'Unused tag'] });
  // 150 people: strong people (high rest score) answer the item right; a second item gives everyone a rest score
  function pool(keyGoesToWeak: boolean) {
    const out: ItemEvent[] = [];
    for (let i = 0; i < 150; i++) {
      const strong = i % 3 === 0;
      const right = keyGoesToWeak ? !strong : strong || i % 2 === 0;
      out.push(ev({ item_id: 'A', person: `p${i}`, correct: right, chosen_option: right ? '0' : i % 4 === 1 ? '1' : '2' }));
      for (let k = 0; k < 4; k++) out.push(ev({ item_id: `B${k}`, person: `p${i}`, correct: strong || k === 0 }));
    }
    return out;
  }
  it('flags nothing under the minimum sample', () => {
    const s = itemStats(pool(false).filter((e) => Number(e.person.slice(1)) < 30), info).find((x) => x.item === 'A')!;
    expect(s.n).toBeLessThan(MIN_DECIDE);
    expect(s.status).toBe('insufficient');
    expect(s.flags).toEqual([]);
  });
  it('a healthy item discriminates positively; an unchosen tagged option is flagged for a tag check', () => {
    const s = itemStats(pool(false), info).find((x) => x.item === 'A')!;
    expect(s.n).toBe(150);
    expect(s.rpb!).toBeGreaterThan(0.1);
    expect(s.flags.map((f) => f.kind)).toEqual(['tag-unused']);
    expect(s.options.find((o) => o.key)!.option).toBe('A');
  });
  it('a negative point-biserial is URGENT (check the key), and the top third preferring a distractor is "ambiguous"', () => {
    const s = itemStats(pool(true), info).find((x) => x.item === 'A')!;
    expect(s.rpb!).toBeLessThan(0);
    expect(s.flags[0]).toMatchObject({ kind: 'urgent-key', urgent: true });
    expect(s.flags.some((f) => f.kind === 'ambiguous')).toBe(true);
  });
});

describe('lifecycle, export and the collection switch', () => {
  it('every bank item is live with its author difficulty until calibrated', () => {
    const q = QUESTIONS[0];
    expect(lifecycleOf(q.id)).toBe('live');
    expect(countsForStudent(q.id)).toBe(true);
    expect(difficultyOf(q)).toBe(q.difficulty);
    expect(bandFromP(0.8)).toBe('medium');
    expect(bandFromP(0.2)).toBe('elite');
  });
  it('an export carries no profile, a fresh random id per file, and cleaned events only', () => {
    const attempts: Attempt[] = [{ id: 'a', qid: QUESTIONS[0].id, at: 1, answer: '0', correct: true, ms: 50000, hints: 0, mode: 'bank', sessionId: 's' }];
    const a = itemExport({ attempts, mocks: [] }, getQuestion, 400), b = itemExport({ attempts, mocks: [] }, getQuestion, 400);
    expect(a.person).not.toBe(b.person);
    expect(Object.keys(a)).toEqual(['app', 'schema', 'exportedAt', 'person', 'events', 'cleaning']);
    expect(a.events).toHaveLength(1);
    expect(a.events[0].device_class).toBe('phone');
  });
  it('collection is off: nothing is sent, even with consent', async () => {
    expect(FLAGS.collect).toBe(false);
    expect(FLAGS.collectEndpoint).toBe('');
    const r = await submitItemData(true, itemExport({ attempts: [], mocks: [] }, getQuestion));
    expect(r.sent).toBe(false);
  });
});
