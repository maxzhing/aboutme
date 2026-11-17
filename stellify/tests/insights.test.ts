import { describe, expect, it } from 'vitest';
import { forecast, opportunities, PER_TEST, skillHeat, wilson, type SkillHeat } from '@/lib/engine/insights';
import type { TrendPoint } from '@/lib/engine/analytics';
import { SKILLS } from '@/lib/taxonomy';
import { getQuestion, QUESTIONS } from '@/data/questions';
import type { Attempt } from '@/lib/types';

describe('skill heatmap', () => {
  it('per-test counts match the digital SAT: 54 Reading & Writing and 44 Math questions', () => {
    const sum = (sec: string) => SKILLS.filter((s) => s.section === sec).reduce((t, s) => t + PER_TEST[s.id], 0);
    expect(sum('rw')).toBeCloseTo(54);
    expect(sum('math')).toBeCloseTo(44);
  });
  it('the 80% interval narrows with more data and stays within 0–1', () => {
    const [a, b] = wilson(6, 10), [c, d] = wilson(60, 100);
    expect(b - a).toBeGreaterThan(d - c);
    expect(a).toBeGreaterThanOrEqual(0); expect(b).toBeLessThanOrEqual(1);
    expect(wilson(0, 0)).toEqual([0, 1]);
  });
  it('reports sample size, confidence and a trend only when there is enough data', () => {
    const qs = QUESTIONS.filter((q) => q.skill === 'bnd').slice(0, 14);
    const at = (i: number, correct: boolean): Attempt => ({ id: `a${i}`, qid: qs[i].id, at: 1_700_000_000_000 + i * 60_000, correct, ms: 40_000, hints: 0, mode: 'practice', sessionId: 's', answer: '0' } as unknown as Attempt);
    // early misses, then a run of right answers: improving
    const attempts = qs.map((_, i) => at(i, i >= 6));
    const h = skillHeat(attempts, getQuestion).find((x) => x.skill === 'bnd')!;
    expect(h.n).toBe(14); expect(h.trend).toBe('up'); expect(h.confidence).toBe('medium');
    const few = skillHeat(attempts.slice(0, 5), getQuestion).find((x) => x.skill === 'bnd')!;
    expect(few.trend).toBeNull(); expect(few.confidence).toBe('low');
    expect(skillHeat([], getQuestion).every((x) => x.mastery === null && x.confidence === null)).toBe(true);
  });
  it('ranks opportunities by questions per test times accuracy still to gain', () => {
    const mk = (skill: SkillHeat['skill'], correct: number, n: number): SkillHeat => ({ skill, section: SKILLS.find((s) => s.id === skill)!.section, n, correct, mastery: 50, level: 1, ci: null, confidence: 'low', trend: null, delta: null, perTest: PER_TEST[skill] });
    const ops = opportunities([mk('bnd', 4, 10), mk('ctc', 4, 10), mk('wic', 9, 10)], { rw: 600 });
    expect(ops[0].skill).toBe('bnd'); // 8 boundary questions per test vs 2 cross-text ones, same accuracy
    expect(ops.find((o) => o.skill === 'wic')).toBeUndefined(); // already above 85%
    expect(ops[0].extraRight).toBeCloseTo(0.45 * PER_TEST.bnd);
  });
});

describe('forecast', () => {
  const day = (i: number) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
  const pt = (i: number, mid: number): TrendPoint => ({ date: day(i), label: '', total: { low: mid - 80, mid, high: mid + 80 }, confidence: 'medium' });
  it('needs at least four days spanning two weeks', () => {
    expect(forecast([pt(0, 1100), pt(3, 1120), pt(6, 1130)], 'total')).toBeNull();
    expect(forecast([pt(0, 1100), pt(2, 1120), pt(4, 1130), pt(6, 1140)], 'total')).toBeNull();
  });
  it('calls a steady climb clear and projects it, with a range that widens', () => {
    const f = forecast([0, 4, 8, 12, 16, 20].map((i) => pt(i, 1100 + i * 3 + (i % 8 === 0 ? 4 : -4))), 'total', day(40), Date.UTC(2026, 9, 21))!;
    expect(f.clear).toBe(true);
    expect(f.perWeek).toBeGreaterThan(15);
    expect(f.projection!.mid).toBeGreaterThan(1160);
    expect(f.projection!.high - f.projection!.low).toBeGreaterThan(160);
  });
  it('does not call noise a trend', () => {
    const f = forecast([1150, 1100, 1160, 1090, 1170, 1120].map((m, i) => pt(i * 4, m)), 'total', day(40))!;
    expect(f.clear).toBe(false);
    expect(f.projection).toBeUndefined();
  });
});
