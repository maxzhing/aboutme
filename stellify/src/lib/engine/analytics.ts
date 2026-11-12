import type { AppState, Attempt, Difficulty, DomainId, Question, Section } from '../types';
import { DIFFICULTIES, DOMAINS } from '../taxonomy';
import { addDays, dateKey, pct } from '../util';
import { sectionEstimate, totalRange } from './scoring';

const scored = (a: Attempt[]) => a.filter((x) => !x.abandoned);

export function overview(s: AppState, getQ: (id: string) => Question | undefined) {
  const rows = scored(s.attempts).map((a) => ({ a, q: getQ(a.qid) })).filter((r): r is { a: Attempt; q: Question } => !!r.q);
  const acc = (f: (r: { a: Attempt; q: Question }) => boolean) => { const x = rows.filter(f); return { n: x.length, correct: x.filter((r) => r.a.correct).length, pct: pct(x.filter((r) => r.a.correct).length, x.length) }; };
  const bySection = { math: acc((r) => r.q.section === 'math'), rw: acc((r) => r.q.section === 'rw') } as Record<Section, ReturnType<typeof acc>>;
  const byDifficulty = Object.fromEntries(DIFFICULTIES.map((d) => [d, acc((r) => r.q.difficulty === d)])) as Record<Difficulty, ReturnType<typeof acc>>;
  const byDomain = Object.fromEntries(DOMAINS.map((d) => [d.id, acc((r) => r.q.domain === d.id)])) as Record<DomainId, ReturnType<typeof acc>>;
  const time = (sec: Section) => {
    const x = rows.filter((r) => r.q.section === sec);
    const avg = x.length ? x.reduce((t, r) => t + r.a.ms, 0) / x.length : 0;
    const expected = x.length ? x.reduce((t, r) => t + r.q.time * 1000, 0) / x.length : 0;
    return { avg, expected, ratio: expected ? avg / expected : 0 };
  };
  const rw = sectionEstimate('rw', s.attempts, getQ);
  const math = sectionEstimate('math', s.attempts, getQ);
  return {
    total: rows.length, all: acc(() => true), bySection, byDifficulty, byDomain,
    time: { math: time('math'), rw: time('rw') },
    hintRate: rows.length ? rows.filter((r) => r.a.hints > 0).length / rows.length : 0,
    abandoned: s.attempts.filter((a) => a.abandoned).length,
    estimate: { rw, math, total: totalRange(rw, math) },
    unique: new Set(rows.map((r) => r.q.id)).size,
  };
}

/** Per-day series for the last `days` days: minutes studied, questions, accuracy. */
export function dailySeries(s: AppState, days = 14, today = dateKey()) {
  return Array.from({ length: days }, (_, i) => {
    const k = addDays(today, i - days + 1);
    const a = s.activity[k];
    return { date: k, label: k.slice(5).replace('-', '/'), minutes: a ? Math.round(a.ms / 60_000) : 0, questions: a?.questions ?? 0, accuracy: a && a.questions ? pct(a.correct, a.questions) : null as number | null, xp: a?.xp ?? 0 };
  });
}

export const weekMinutes = (s: AppState, today = dateKey()) => dailySeries(s, 7, today).reduce((t, d) => t + d.minutes, 0);

/** Accuracy in consecutive blocks of 20 questions: improvement over time independent of the calendar. */
export function accuracyBlocks(s: AppState, size = 20) {
  const a = scored(s.attempts);
  const out: { label: string; accuracy: number; n: number }[] = [];
  for (let i = 0; i < a.length; i += size) {
    const b = a.slice(i, i + size);
    if (b.length >= Math.min(size, 5)) out.push({ label: `${i + 1}–${i + b.length}`, accuracy: pct(b.filter((x) => x.correct).length, b.length), n: b.length });
  }
  return out;
}

/** Estimated total score after each study day (needs enough data in both sections). */
export function scoreTrend(s: AppState, getQ: (id: string) => Question | undefined) {
  const days = [...new Set(scored(s.attempts).map((a) => dateKey(a.at)))].sort().slice(-12);
  const out: { date: string; label: string; low: number; mid: number; high: number }[] = [];
  for (const d of days) {
    const upTo = s.attempts.filter((a) => dateKey(a.at) <= d);
    const t = totalRange(sectionEstimate('rw', upTo, getQ), sectionEstimate('math', upTo, getQ));
    if (t) out.push({ date: d, label: d.slice(5).replace('-', '/'), ...t });
  }
  return out;
}
