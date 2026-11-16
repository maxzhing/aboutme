import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { CALC_LESSONS, CALC_UNITS, calcCorrect, normalizeCalc, type CalcLesson } from '@/data/calc';
import { parseNumeric } from '@/lib/answers';
import { tokenize } from '@/lib/richtext';

const texts = (l: CalcLesson) => [
  l.intro, ...l.goals,
  ...l.notes.flatMap((n) => (n.k === 'list' ? n.items : n.k === 'rule' ? [n.title, n.t] : n.k === 'formula' ? [`$$${n.t}$$`] : [n.t])),
  ...l.examples.flatMap((e) => [e.q, ...e.steps, e.a]),
  ...l.practice.flatMap((p) => [p.q, p.hint, ...p.solution, ...(p.choices ?? [])]),
  ...l.remember, l.checkIn,
];

describe('AP Calculus BC course', () => {
  it('outlines all ten units', () => {
    expect(CALC_UNITS.map((u) => u.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const u of CALC_UNITS) expect(u.topics.length, `unit ${u.n}`).toBeGreaterThanOrEqual(5);
  });

  it('has complete lessons with notes, examples and practice', () => {
    expect(CALC_LESSONS.length).toBeGreaterThanOrEqual(15);
    const ids = new Set<string>();
    for (const l of CALC_LESSONS) {
      expect(l.goals.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.notes.length, l.id).toBeGreaterThanOrEqual(5);
      expect(l.examples.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.practice.length, l.id).toBeGreaterThanOrEqual(6);
      for (const p of l.practice) {
        expect(ids.has(p.id), p.id).toBe(false);
        ids.add(p.id);
        expect(p.solution.length, p.id).toBeGreaterThanOrEqual(1);
        expect(p.hint.length, p.id).toBeGreaterThan(5);
        if (typeof p.answer === 'number') {
          expect(p.choices?.length, p.id).toBeGreaterThanOrEqual(3);
          expect(p.answer).toBeLessThan(p.choices!.length);
        } else {
          expect(p.answer.some((a) => parseNumeric(a) !== null || ['inf', '-inf', 'dne'].includes(normalizeCalc(a))), `${p.id} needs a typeable answer`).toBe(true);
        }
      }
    }
  });

  it('verifies the keyed answers with independent numerical checks', () => {
    const all = CALC_LESSONS.flatMap((l) => l.practice);
    let checked = 0;
    for (const p of all) if (p.check) { expect(p.check(), p.id).toBe(true); checked++; }
    const free = all.filter((p) => typeof p.answer !== 'number');
    // a few free-response items are read from a given table rather than computed
    expect(checked).toBeGreaterThanOrEqual(free.length - 6);
  });

  it('renders every formula', () => {
    for (const l of CALC_LESSONS) for (const s of texts(l)) for (const t of tokenize(s)) {
      if (t.t === 'math' || t.t === 'dmath') expect(() => katex.renderToString(t.v, { throwOnError: true, displayMode: t.t === 'dmath' }), `${l.id}: ${t.v}`).not.toThrow();
    }
  });

  it('accepts equivalent answers and rejects wrong ones', () => {
    const p = { id: 'x', q: '', answer: ['-1/4', '-0.25'], hint: 'hint text', solution: [], level: 1 as const };
    expect(calcCorrect(p, '-1/4')).toBe(true);
    expect(calcCorrect(p, '−0.25')).toBe(true);
    expect(calcCorrect(p, '0.25')).toBe(false);
    const inf = { ...p, answer: ['inf'] };
    expect(calcCorrect(inf, '∞')).toBe(true);
    expect(calcCorrect(inf, 'infinity')).toBe(true);
    expect(calcCorrect(inf, '−∞')).toBe(false);
    expect(calcCorrect({ ...p, answer: ['dne'] }, 'DNE')).toBe(true);
    expect(calcCorrect({ ...p, answer: 2, choices: ['a', 'b', 'c'] }, '2')).toBe(true);
  });
});
