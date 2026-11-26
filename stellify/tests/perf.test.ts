import { describe, expect, it } from 'vitest';
import { getQuestion, QUESTIONS } from '@/data/questions';
import { initialState } from '@/lib/state';
import { overview, scoreTrend, sessionHistory } from '@/lib/engine/analytics';
import { skillHeat } from '@/lib/engine/insights';
import { labelCheck } from '@/lib/engine/qc';
import { applyAttempt } from '@/lib/engine/attempt';
import { rng } from '@/lib/util';
import type { AppState, Attempt } from '@/lib/types';

/** A heavy user: 20,000 answers over 150 days (about 130 a day). Analytics must stay fast and the save small enough. */
function bigState(n = 20_000): AppState {
  const r = rng('perf');
  const start = Date.UTC(2026, 0, 1);
  const attempts: Attempt[] = Array.from({ length: n }, (_, i) => {
    const q = QUESTIONS[Math.floor(r() * QUESTIONS.length)];
    const at = start + Math.floor((i / n) * 150) * 864e5 + (i % 130) * 60_000;
    return { id: `a${i}`, qid: q.id, at, answer: '0', correct: r() < 0.55 + (i / n) * 0.25, ms: 30_000 + Math.floor(r() * 90_000), hints: r() < 0.1 ? 1 : 0, mode: 'bank', sessionId: `s${Math.floor(i / 20)}` } as Attempt;
  });
  return { ...initialState(), attempts };
}
const time = (f: () => unknown) => { const t = performance.now(); f(); return performance.now() - t; };

describe('performance with a large history', () => {
  const s = bigState();
  it('computes every analytics view quickly', () => {
    const t = {
      overview: time(() => overview(s, getQuestion)),
      heatmap: time(() => skillHeat(s.attempts, getQuestion)),
      trend: time(() => scoreTrend(s, getQuestion)),
      sessions: time(() => sessionHistory(s, getQuestion)),
      labels: time(() => labelCheck(s.attempts, getQuestion)),
      answer: time(() => applyAttempt(s, { qid: QUESTIONS[0].id, answer: '1', ms: 40_000, hints: 0, mode: 'bank', sessionId: 'x' }, Date.UTC(2026, 6, 1), getQuestion)),
    };
    console.log('ms', Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v)])));
    // generous ceilings for slow test machines; on a laptop each is far below
    expect(t.overview).toBeLessThan(1500);
    expect(t.heatmap).toBeLessThan(1500);
    expect(t.trend).toBeLessThan(3000);
    expect(t.sessions).toBeLessThan(1500);
    expect(t.answer).toBeLessThan(500); // recording one answer must feel instant
  });
  it('keeps the saved data a manageable size', () => {
    const mb = JSON.stringify(s).length / 1e6;
    console.log('saved state MB', mb.toFixed(2));
    expect(mb).toBeLessThan(6);
  });
});
