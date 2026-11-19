import type { Attempt, Difficulty, MockAttempt, Question, Section } from '../types';
import { difficultyOf } from '@/data/itemLifecycle';
import { SAT_STRUCTURE } from '../taxonomy';

/**
 * Fatigue and pacing curve (N6). For every finished mock module, each question is compared with what was
 * expected given its difficulty: the student's own first-try accuracy at that difficulty outside mocks, shrunk
 * toward a typical value (PRIOR) when there is little data. Positions are grouped into the first, middle and last
 * third of the module. A late drop is only reported when there are at least MIN_MODULES modules and the last
 * third falls at least DROP below the first third AFTER adjusting for difficulty, and then only as "possible".
 * Target pacing: total module time ÷ questions (32 min / 27 ≈ 71 s, 35 min / 22 ≈ 95 s; see SAT_STRUCTURE).
 */
export const FATIGUE = { MIN_MODULES: 3, DROP: 0.1, K: 6 } as const;
const PRIOR: Record<Difficulty, number> = { medium: 0.7, hard: 0.55, 'very-hard': 0.4, elite: 0.25 };
export const targetSeconds = (s: Section) => Math.round((SAT_STRUCTURE[s].minutesPerModule * 60) / SAT_STRUCTURE[s].questionsPerModule);

export interface FatigueBucket { label: 'first third' | 'middle third' | 'last third'; n: number; observed: number; expected: number; diff: number }
export interface FatigueResult {
  section: Section;
  modules: number;
  buckets: FatigueBucket[];
  /** seconds per question at each position (average over modules), against the target */
  pace: { position: number; seconds: number; n: number }[];
  target: number;
  verdict: 'not-enough-data' | 'possible-drop' | 'no-clear-drop';
}

export function fatigueCurve(mocks: MockAttempt[], attempts: Attempt[], getQ: (id: string) => Question | undefined, section: Section): FatigueResult {
  // expected accuracy by difficulty, from first tries outside mocks
  const seen = new Set<string>(); const tally = new Map<Difficulty, { c: number; n: number }>();
  for (const a of attempts) {
    if (a.abandoned || a.mode === 'mock' || seen.has(a.qid)) continue;
    seen.add(a.qid);
    const q = getQ(a.qid); if (!q || q.section !== section) continue;
    const d = difficultyOf(q); const t = tally.get(d) ?? { c: 0, n: 0 }; t.n++; if (a.correct) t.c++; tally.set(d, t);
  }
  const expect = (d: Difficulty) => { const t = tally.get(d) ?? { c: 0, n: 0 }; return (t.c + FATIGUE.K * PRIOR[d]) / (t.n + FATIGUE.K); };
  const labels: FatigueBucket['label'][] = ['first third', 'middle third', 'last third'];
  const acc = labels.map(() => ({ n: 0, obs: 0, exp: 0 }));
  const paceMap = new Map<number, { ms: number; n: number }>();
  let modules = 0;
  for (const m of mocks) {
    if (!m.completedAt) continue;
    for (const mod of m.modules) {
      if (mod.section !== section || !mod.qids.length) continue;
      modules++;
      mod.qids.forEach((qid, i) => {
        const q = getQ(qid); if (!q) return;
        const b = acc[Math.min(2, Math.floor((i / mod.qids.length) * 3))];
        const a = mod.answers[qid] ?? null;
        const right = a !== null && (q.type === 'mcq' ? String(q.answer) === a : (q.answer as string[]).some((x) => x.replace(/\s/g, '') === a.replace(/\s/g, '')));
        b.n++; b.obs += right ? 1 : 0; b.exp += expect(difficultyOf(q));
        const ms = mod.perQuestionMs[qid]; if (ms) { const p = paceMap.get(i + 1) ?? { ms: 0, n: 0 }; p.ms += ms; p.n++; paceMap.set(i + 1, p); }
      });
    }
  }
  const buckets = acc.map((b, k) => ({ label: labels[k], n: b.n, observed: b.n ? b.obs / b.n : 0, expected: b.n ? b.exp / b.n : 0, diff: b.n ? (b.obs - b.exp) / b.n : 0 }));
  const verdict = modules < FATIGUE.MIN_MODULES ? 'not-enough-data' : buckets[2].diff - buckets[0].diff <= -FATIGUE.DROP ? 'possible-drop' : 'no-clear-drop';
  const pace = [...paceMap].sort((a, b) => a[0] - b[0]).map(([position, p]) => ({ position, seconds: Math.round(p.ms / p.n / 1000), n: p.n }));
  return { section, modules, buckets, pace, target: targetSeconds(section), verdict };
}
