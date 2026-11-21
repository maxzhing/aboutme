import { describe, expect, it } from 'vitest';
import { CALC_EXAMS } from '@/data/calc/exams';
import { CHEM_EXAMS } from '@/data/chem/exams';
import { calcCorrect } from '@/data/calc';
import { KITS } from '@/data/kits';

describe('Calculus BC unit tests, semester exams and finals', () => {
  const all = [...CALC_EXAMS, ...CHEM_EXAMS].flatMap((e) => e.problems);
  it('every unit from 1 to 10 has a test, and there are two semester exams and cumulative finals', () => {
    expect(CALC_EXAMS.filter((e) => e.kind === 'unit').map((e) => e.unit)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(CALC_EXAMS.filter((e) => e.kind === 'semester')).toHaveLength(2);
    expect(CALC_EXAMS.filter((e) => e.kind === 'final').length).toBeGreaterThanOrEqual(2);
  });
  it('problem ids are unique', () => { expect(new Set(all.map((p) => p.id)).size).toBe(all.length); });
  it('every Calc BC test mixes calculator and no-calculator problems, like the AP exam', () => {
    for (const e of CALC_EXAMS) expect(e.problems.some((p) => !p.calculator), e.id).toBe(true);
  });
  it('AP Chemistry: a test per unit 1-9, two semester exams, a final, and every exam id resolves in the kit', () => {
    expect(CHEM_EXAMS.filter((e) => e.kind === 'unit').map((e) => e.unit)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(CHEM_EXAMS.filter((e) => e.kind === 'semester')).toHaveLength(2);
    expect(CHEM_EXAMS.filter((e) => e.kind === 'final')).toHaveLength(1);
    for (const k of Object.values(KITS)) { expect(k.groups.flatMap((g) => g.list).length, k.id).toBe(k.exams.length); for (const e of k.exams) expect(k.exam[e.id]).toBe(e); }
  });
  it('every keyed answer is accepted, and every numeric answer passes its independent check', () => {
    for (const p of all) {
      if (typeof p.answer === 'number') { expect(p.choices?.length, p.id).toBe(4); expect(p.answer).toBeLessThan(4); }
      else { expect(calcCorrect(p, p.answer[0]), p.id).toBe(true); expect(p.check, `${p.id} needs a check()`).toBeTypeOf('function'); }
      if (p.check) expect(p.check(), p.id).toBe(true);
      expect(p.solution.length, p.id).toBeGreaterThanOrEqual(2);
    }
  });
  it('every problem is solved like a tutor would: what it asks, full steps, and the trap', () => {
    for (const p of all) {
      expect(p.ask.length, `${p.id} ask`).toBeGreaterThanOrEqual(60);
      expect(p.trap.length, `${p.id} trap`).toBeGreaterThanOrEqual(30);
      for (const s of p.solution) expect(s.length, `${p.id} step too thin: ${s.slice(0, 40)}`).toBeGreaterThanOrEqual(40);
      expect(p.solution.join(' ').length, `${p.id} solution`).toBeGreaterThanOrEqual(220);
    }
  });
});

for (const kit of Object.values(KITS)) describe(`${kit.name} guided free-response workouts and formula anatomy`, () => {
  const FRQS = kit.original;
  it('ids are unique and every part has steps, a full-credit note and a trap', () => {
    expect(FRQS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(kit.frqs.map((f) => f.id)).size).toBe(kit.frqs.length);
    for (const f of FRQS) { expect(f.units.every((u) => kit.units.some((x) => x.n === u)), f.id).toBe(true); for (const p of f.parts) {
      expect(p.steps.length, `${f.id}${p.label}`).toBeGreaterThan(0);
      expect(p.write.length).toBeGreaterThan(30); expect(p.trap.length).toBeGreaterThan(20);
    } }
  });
  it('every step accepts its own keyed answer and passes its independent check', () => {
    for (const f of FRQS) for (const p of f.parts) for (const s of p.steps) {
      const fake = { id: 'x', q: '', answer: s.answer, hint: '', solution: [], level: 3 as const };
      expect(calcCorrect(fake, s.answer[0]), `${f.id} ${s.prompt}`).toBe(true);
      if (s.check) expect(s.check(), `${f.id} ${s.prompt}`).toBe(true);
      expect(s.explain.length, `${f.id}${p.label} explanation is too thin`).toBeGreaterThanOrEqual(160);
      expect(s.hint.length, `${f.id}${p.label} hint`).toBeGreaterThan(15);
      if (s.formula) expect(kit.formula[s.formula], `${f.id} formula ${s.formula}`).toBeDefined();
    }
  });
  it('numeric steps carry an independent check (at least 90%)', () => {
    const num = FRQS.flatMap((f) => f.parts.flatMap((p) => p.steps)).filter((s) => /^-?[\d.]/.test(s.answer[0]));
    expect(num.filter((s) => s.check).length / num.length).toBeGreaterThanOrEqual(0.9);
  });
  it('every formula is taken apart piece by piece, with several uses and a trap', () => {
    expect(new Set(kit.formulas.map((f) => f.id)).size).toBe(kit.formulas.length);
    for (const fm of kit.formulas) { expect(fm.parts.length, fm.id).toBeGreaterThanOrEqual(2); expect(fm.ways.length, fm.id).toBeGreaterThanOrEqual(1); expect(fm.trap.length).toBeGreaterThan(20); }
  });
});

describe('chemistry answer leniency', () => {
  const P = (answer: string[], lastDigit?: boolean) => ({ id: 'x', q: '', answer, hint: '', solution: [], level: 3 as const, lastDigit });
  it('a chemistry key with 3+ significant figures accepts ±1 in the last digit, and nothing wider', () => {
    expect(calcCorrect(P(['35.7'], true), '35.8')).toBe(true);
    expect(calcCorrect(P(['12.44'], true), '12.45')).toBe(true);
    expect(calcCorrect(P(['12.44'], true), '12.46')).toBe(false);
    expect(calcCorrect(P(['0.294'], true), '0.293')).toBe(true);
    expect(calcCorrect(P(['0.294'], true), '0.292')).toBe(false);
    expect(calcCorrect(P(['8'], true), '9')).toBe(false);
    expect(calcCorrect(P(['2.5'], true), '2.6')).toBe(false);
  });
  it('Calc BC stays strict', () => {
    expect(calcCorrect(P(['35.7']), '35.8')).toBe(false);
    expect(calcCorrect(P(['1.34']), '1.336')).toBe(true);
  });
  it('every chemistry lesson and exam problem carries the leniency flag', async () => {
    const { CHEM_LESSONS } = await import('@/data/chem');
    for (const l of CHEM_LESSONS) for (const p of l.practice) expect(p.lastDigit, p.id).toBe(true);
    for (const e of CHEM_EXAMS) for (const p of e.problems) expect(p.lastDigit, p.id).toBe(true);
  });
});
