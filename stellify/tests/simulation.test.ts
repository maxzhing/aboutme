import { describe, expect, it } from 'vitest';
import { simulationStudy } from '@/lib/engine/simulate';
import { QUESTIONS } from '@/data/questions';

/**
 * Validates the timed tests' routing and scoring with simulated students whose true ability is known,
 * answering under a different item model than the one the app scores with (see simulate.ts). This checks
 * internal validity only; how Stellify's scale relates to real SAT scores cannot be checked without real students.
 */
describe.each([['A', 'rw'], ['A', 'math'], ['B', 'rw'], ['B', 'math']] as const)('Practice Test %s · %s', (form, section) => {
  const r = simulationStudy(form, section, QUESTIONS, 300);
  it('routes by ability: strong students to the harder Module 2, weak ones to the easier one', () => {
    expect(r.misrouted.strongLower).toBeLessThanOrEqual(0.08);
    expect(r.misrouted.weakUpper).toBeLessThanOrEqual(0.05);
    const ups = r.upperByBand.map((b) => b.upper);
    for (let i = 1; i < ups.length; i++) expect(ups[i]).toBeGreaterThanOrEqual(ups[i - 1]); // never less likely to go up when stronger
  });
  it('recovers the true score closely, and its 80% ranges are honest (not too narrow)', () => {
    expect(r.r).toBeGreaterThanOrEqual(0.9);
    expect(r.rmse).toBeLessThanOrEqual(65);
    expect(Math.abs(r.bias)).toBeLessThanOrEqual(30);
    expect(r.coverage).toBeGreaterThanOrEqual(0.75);
    expect(r.coverage).toBeLessThanOrEqual(0.97);
  });
});
