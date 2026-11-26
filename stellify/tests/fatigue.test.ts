import { describe, expect, it } from 'vitest';
import { fatigueCurve, targetSeconds, FATIGUE } from '../src/lib/engine/fatigue';
import { getQuestion, QUESTIONS } from '../src/data/questions';
import type { MockAttempt } from '../src/lib/types';

const rw = QUESTIONS.filter((q) => q.section === 'rw' && q.type === 'mcq').slice(0, 27);
const mod = (rightUntil: number): MockAttempt => ({ id: `m${rightUntil}${Math.random()}`, formId: 'f', startedAt: 0, completedAt: 1, kind: 'module-rw',
  modules: [{ section: 'rw', module: 1, qids: rw.map((q) => q.id), answers: Object.fromEntries(rw.map((q, i) => [q.id, i < rightUntil ? String(q.answer) : String((Number(q.answer) + 1) % 4)])), flagged: [], msUsed: 0, msAllowed: 0, perQuestionMs: Object.fromEntries(rw.map((q, i) => [q.id, (60 + i) * 1000])) }] });

describe('fatigue and pacing curve', () => {
  it('target pacing is about 71 s (R&W) and 95 s (Math) per question', () => {
    expect(targetSeconds('rw')).toBe(71);
    expect(targetSeconds('math')).toBe(95);
  });
  it('says nothing under the minimum number of modules', () => {
    const r = fatigueCurve([mod(20), mod(20)], [], getQuestion, 'rw');
    expect(r.modules).toBe(2);
    expect(r.verdict).toBe('not-enough-data');
  });
  it('a late collapse across enough modules is a possible drop; steady work is not', () => {
    expect(fatigueCurve(Array.from({ length: FATIGUE.MIN_MODULES }, () => mod(18)), [], getQuestion, 'rw').verdict).toBe('possible-drop');
    const steady = Array.from({ length: 3 }, () => mod(27));
    expect(fatigueCurve(steady, [], getQuestion, 'rw').verdict).toBe('no-clear-drop');
  });
  it('reports pace by position', () => {
    const r = fatigueCurve([mod(27)], [], getQuestion, 'rw');
    expect(r.pace[0]).toEqual({ position: 1, seconds: 60, n: 1 });
    expect(r.pace).toHaveLength(27);
  });
});
