import { describe, expect, it } from 'vitest';
import { WORKED } from '../src/data/worked';
import { matches } from '../src/lib/worked';

/** Independent recomputation of every final answer from each problem's params (not the generator's code). */
const SOLVE: Record<string, (p: (number | string)[]) => number> = {
  'w-lin1-distribute': ([a, b, c, d, e]) => ((e as number) + (a as number) * (b as number) - (c as number)) / ((a as number) - (d as number)),
  'w-sys-eliminate': ([a, b, c, d, e]) => { const x = ((c as number) + (e as number)) / ((a as number) + (d as number)); return ((c as number) - (a as number) * x) / (b as number); },
  'w-linf-two-points': ([p, q, r, s, t]) => { const m = ((s as number) - (q as number)) / ((r as number) - (p as number)); return m * (t as number) + (q as number) - m * (p as number); },
  'w-ineq-flip': ([a, b, c, strict]) => { const bound = ((a as number) - (c as number)) / (b as number); return strict ? Math.ceil(bound) - 1 : Math.floor(bound); },
  'w-nlf-vertex': ([b]) => -(b as number) / 2,
  'w-pct-successive': ([p0, a, b]) => ((p0 as number) * (1 + (a as number) / 100) * (1 - (b as number) / 100) / (p0 as number) - 1) * 100,
  'w-ratio-rate': ([pages, mins, hours]) => ((pages as number) / (mins as number)) * 60 * eval(String(hours)),
  'w-data1-mean': ([n, mean, v]) => ((n as number) * eval(String(mean)) + eval(String(v))) / ((n as number) + 1),
  'w-prob-conditional': ([nb, aib]) => (aib as number) / (nb as number),
  'w-area-scale': ([k, vol]) => (vol as number) * eval(String(k)) ** 3,
  'w-trig-cos-from-sin': ([o, h, H]) => { const opp = ((o as number) / (h as number)) * (H as number); return Math.sqrt((H as number) ** 2 - opp ** 2) / (H as number); },
  'w-circ-standard': ([D, E, F]) => Math.sqrt(((D as number) / 2) ** 2 + ((E as number) / 2) ** 2 - (F as number)),
};

describe('worked-example families (N11)', () => {
  it('has 12 math families, each a four-rung ladder of three-step problems', () => {
    expect(WORKED).toHaveLength(12);
    for (const f of WORKED) {
      expect(f.rungs, f.id).toHaveLength(4);
      for (const p of f.rungs) {
        expect(p.steps.length, f.id).toBeGreaterThanOrEqual(3);
        for (const st of p.steps) { expect(st.answer.length).toBeGreaterThan(0); expect(st.why.length).toBeGreaterThan(10); expect(st.ask.length).toBeGreaterThan(0); }
        expect(p.final).toEqual(p.steps[p.steps.length - 1].answer);
      }
      // the four problems are different problems
      expect(new Set(f.rungs.map((p) => p.prompt)).size).toBe(4);
    }
  });
  it('every final answer matches an independent recomputation from the problem’s numbers', () => {
    for (const f of WORKED) {
      const solve = SOLVE[f.id];
      expect(solve, `no independent check for ${f.id}`).toBeTruthy();
      for (const p of f.rungs) {
        const want = solve(p.params);
        expect(matches(String(Math.round(want * 1e6) / 1e6), p.final), `${f.id}: ${p.prompt} → ${want}, keyed ${p.final}`).toBe(true);
      }
    }
  });
  it('the answer checker accepts equivalent forms and rejects wrong ones', () => {
    expect(matches('4/5', ['0.8'])).toBe(true);
    expect(matches('.8', ['4/5'])).toBe(true);
    expect(matches('x = 7', ['7'])).toBe(true);
    expect(matches('−12', ['-12'])).toBe(true);
    expect(matches('8%', ['8'])).toBe(true);
    expect(matches('1,800', ['1800'])).toBe(true);
    expect(matches('12/13', ['12/13', '0.9231'])).toBe(true);
    expect(matches('7', ['-7'])).toBe(false);
    expect(matches('', ['0'])).toBe(false);
  });
});
