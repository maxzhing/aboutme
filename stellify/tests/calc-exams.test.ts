import { describe, expect, it } from 'vitest';
import { CALC_EXAMS } from '@/data/calc/exams';
import { calcCorrect } from '@/data/calc';

describe('Calculus BC unit tests, semester exams and finals', () => {
  const all = CALC_EXAMS.flatMap((e) => e.problems);
  it('every unit from 1 to 10 has a test, and there are two semester exams and cumulative finals', () => {
    expect(CALC_EXAMS.filter((e) => e.kind === 'unit').map((e) => e.unit)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(CALC_EXAMS.filter((e) => e.kind === 'semester')).toHaveLength(2);
    expect(CALC_EXAMS.filter((e) => e.kind === 'final').length).toBeGreaterThanOrEqual(2);
  });
  it('problem ids are unique', () => { expect(new Set(all.map((p) => p.id)).size).toBe(all.length); });
  it('every test mixes calculator and no-calculator problems', () => {
    for (const e of CALC_EXAMS) expect(e.problems.some((p) => !p.calculator), e.id).toBe(true);
  });
  it('every keyed answer is accepted, and every numeric answer passes its independent check', () => {
    for (const p of all) {
      if (typeof p.answer === 'number') { expect(p.choices?.length, p.id).toBe(4); expect(p.answer).toBeLessThan(4); }
      else { expect(calcCorrect(p, p.answer[0]), p.id).toBe(true); expect(p.check, `${p.id} needs a check()`).toBeTypeOf('function'); }
      if (p.check) expect(p.check(), p.id).toBe(true);
      expect(p.solution.length, p.id).toBeGreaterThanOrEqual(2);
    }
  });
});

import { CALC_FRQS } from '@/data/calc/frq';
describe('Calculus BC guided free-response workouts', () => {
  it('ids are unique and every part has steps, a full-credit note and a trap', () => {
    expect(new Set(CALC_FRQS.map((f) => f.id)).size).toBe(CALC_FRQS.length);
    for (const f of CALC_FRQS) for (const p of f.parts) {
      expect(p.steps.length, `${f.id}${p.label}`).toBeGreaterThan(0);
      expect(p.write.length).toBeGreaterThan(30); expect(p.trap.length).toBeGreaterThan(20);
    }
  });
  it('every step accepts its own keyed answer and passes its independent check', () => {
    for (const f of CALC_FRQS) for (const p of f.parts) for (const s of p.steps) {
      const fake = { id: 'x', q: '', answer: s.answer, hint: '', solution: [], level: 3 as const };
      expect(calcCorrect(fake, s.answer[0]), `${f.id} ${s.prompt}`).toBe(true);
      if (s.check) expect(s.check(), `${f.id} ${s.prompt}`).toBe(true);
    }
  });
});
