import { describe, expect, it } from 'vitest';
import { DRILL, LAB } from '../src/data/desmosLab';
import { compile, linearFit, parseRelation } from '../src/lib/mathexpr';

describe('Desmos Lab content: every answer recomputed', () => {
  const f = (s: string) => { const c = compile(s); return (x: number, p: Record<string, number> = {}) => c.fn({ x, ...p }); };
  it('techniques', () => {
    expect(f('3(2x - 5) + 4')(6)).toBe(f('2(x + 7) - 1')(6));
    const ok = (x: number, y: number) => y > 2 * x - 1 && y <= -x + 5;
    const pts = [[2, 4], [1, 3], [3, 1], [0, 6]];
    expect(pts.map(([x, y]) => ok(x, y))).toEqual([false, true, false, false]);
    expect(f('x^2 + k')(0, { k: 4 })).toBe(4); // vertex touches y = 4
    const fit = linearFit([[1, 3], [2, 5], [3, 7.2], [4, 8.9], [5, 11]]);
    expect(Math.round(fit.m * 8 + fit.b)).toBe(17);
    expect(f('x^2 - 6x + 5')(3)).toBe(-4);
    const g = f('x^3 - 2x - 5');
    const closest = ['1.5', '2.09', '2.5', '3'].map(Number).reduce((a, b) => (Math.abs(g(b)) < Math.abs(g(a)) ? b : a));
    expect(closest).toBe(2.09);
    expect(Math.round(Math.sqrt(5000) * 10) / 10).toBe(70.7);
    expect(LAB.find((t) => t.id === 'window')!.exercise.answer).toEqual(['70.7']);
    for (const t of LAB) for (const s of t.exercise.targets ?? []) expect(() => parseRelation(s)).not.toThrow();
  });
  it('drill', () => {
    expect(4 * (9 - 3)).toBe(2 * 9 + 6);
    expect(5 ** 2).toBe(3 * 5 + 10);
    expect(f('2x^2 - 8x + 3')(2)).toBe(-5);
    expect(Math.sqrt(2 * 4 + 1)).toBe(4 - 1);
    expect(3 * 3 - 2).toBe(-3 + 10);
    expect(DRILL.map((d) => d.answer[0])).toEqual(['9', '5', '-5', '4', '7']);
  });
});
