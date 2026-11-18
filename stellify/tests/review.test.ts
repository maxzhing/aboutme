import { describe, expect, it } from 'vitest';
import { dueIds, schedule } from '@/lib/engine/srs';
import { CAUSE, diagnose } from '@/lib/engine/mistakes';
import { DISTRACTORS, type TrapCode } from '@/data/questions/distractors';
import { getQuestion, QUESTIONS } from '@/data/questions';
import type { SrsCard } from '@/lib/types';

const T0 = 1_700_000_000_000, DAY = 86_400_000;
const run = (seq: [boolean, 'sure' | 'unsure' | 'guess' | undefined][]) => seq.reduce<SrsCard | undefined>((c, [ok, conf]) => schedule(c, ok, ok, T0, conf), undefined)!;

describe('confidence-based review scheduling', () => {
  it('a sure right answer waits longer than an unsure one; a lucky guess comes back soon', () => {
    const sure = run([[true, 'sure'], [true, 'sure'], [true, 'sure']]);
    const unsure = run([[true, 'unsure'], [true, 'unsure'], [true, 'unsure']]);
    expect(sure.interval).toBeGreaterThan(unsure.interval);
    expect(run([[true, 'sure'], [true, 'sure'], [true, 'guess']]).interval).toBe(2);
  });
  it('wrong while sure flags a misconception, reviewed first, cleared by two sure right answers', () => {
    let c = run([[true, 'sure'], [false, 'sure']]);
    expect(c.misconception).toBe(true);
    expect(c.ease).toBeLessThan(run([[true, 'sure'], [false, 'unsure']]).ease);
    c = schedule(c, true, true, T0, 'sure');
    expect(c.misconception).toBe(true);
    c = schedule(c, true, true, T0, 'sure');
    expect(c.misconception).toBe(false);
    const cards = { a: { ...run([[false, undefined]]), due: T0 - 5 * DAY }, b: { ...run([[false, 'sure']]), due: T0 - DAY } };
    expect(dueIds(cards, T0)[0]).toBe('b');
  });
  it('an inconsistent record keeps a card close even after a right answer', () => {
    const c = run([[true, 'sure'], [false, undefined], [true, 'sure'], [false, undefined], [true, 'sure'], [true, 'sure']]);
    expect(c.interval).toBeLessThanOrEqual(4);
    expect(c.hist).toBe('SxSxSS');
  });
  it('without a confidence answer it still behaves like plain spaced repetition', () => {
    const c = run([[true, undefined], [true, undefined], [true, undefined]]);
    expect(c.interval).toBeGreaterThan(5);
  });
});

describe('mistake diagnosis', () => {
  const math = QUESTIONS.find((q) => q.section === 'math' && q.type === 'mcq')!;
  it('blank and very slow answers point to time pressure', () => {
    expect(diagnose(math, { ms: 10_000, answer: null }).category).toBe('time');
    const slow = diagnose(math, { ms: math.time * 1000 * 2.5, answer: '0' });
    expect(slow.category).toBe('time'); expect(slow.why[0]).toMatch(/You spent \d+ s/);
  });
  it('a fast miss on a skill you know is a slip; on a skill you are learning, a gap', () => {
    expect(diagnose(math, { ms: 3000, answer: '0', skill: { n: 10, acc: 0.9 } }).category).toBe('careless');
    expect(CAUSE[diagnose(math, { ms: 3000, answer: '0', skill: { n: 10, acc: 0.3 } }).category]).toBe('Conceptual gap');
  });
  it('a numeric near miss or sign flip is a calculation slip', () => {
    const spr = QUESTIONS.find((q) => q.type === 'spr' && /^-?\d+$/.test((q.answer as string[])[0]) && Number((q.answer as string[])[0]) > 5)!;
    const k = Number((spr.answer as string[])[0]);
    expect(diagnose(spr, { ms: spr.time * 1000, answer: String(-k) }).category).toBe('calculation');
  });
  it('names the trap behind the chosen wrong answer, and treats a sure miss as a misconception', () => {
    const find = (code: TrapCode) => Object.entries(DISTRACTORS).map(([id, tags]) => ({ id, i: tags.indexOf(code) })).find((x) => x.i >= 0 && getQuestion(x.id));
    const d = find('detail')!;
    const q = getQuestion(d.id)!;
    const r = diagnose(q, { ms: q.time * 1000, answer: String(d.i) });
    expect(r.category).toBe('misread'); expect(r.why[0]).toContain('Mistakes a detail for the main point');
    const sure = diagnose(q, { ms: q.time * 1000, answer: String(d.i), confidence: 'sure' });
    expect(sure.why[0]).toContain('You were sure');
    const g = find('agreement')!;
    expect(diagnose(getQuestion(g.id)!, { ms: 40_000, answer: String(g.i) }).category).toBe('grammar');
  });
});
