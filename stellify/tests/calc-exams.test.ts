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
