import type { AppState, Attempt, Difficulty, DomainId, Question, Section } from '../types';
import { DIFFICULTIES, DOMAINS } from '../taxonomy';
import { addDays, dateKey, pct } from '../util';
import { estimateTheta, expectedCorrect, lowerConfidence, sectionStatus, totalRange, type Confidence } from './scoring';
import type { ScoreRange } from '../types';

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
  const rwS = sectionStatus('rw', s.attempts, getQ), mathS = sectionStatus('math', s.attempts, getQ);
  const rw = rwS.range, math = mathS.range;
  return {
    total: rows.length, all: acc(() => true), bySection, byDifficulty, byDomain,
    time: { math: time('math'), rw: time('rw') },
    hintRate: rows.length ? rows.filter((r) => r.a.hints > 0).length / rows.length : 0,
    abandoned: s.attempts.filter((a) => a.abandoned).length,
    estimate: { rw, math, total: totalRange(rw, math), status: { rw: rwS, math: mathS }, confidence: lowerConfidence(rwS.confidence, mathS.confidence) },
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

export interface TrendPoint { date: string; label: string; total?: ScoreRange; rw?: ScoreRange; math?: ScoreRange; confidence: Confidence | null }
/** The estimate as it stood at the end of each study day (last 12 days with practice). A section appears once it has enough data. */
export function scoreTrend(s: AppState, getQ: (id: string) => Question | undefined): TrendPoint[] {
  const days = [...new Set(scored(s.attempts).map((a) => dateKey(a.at)))].sort().slice(-12);
  const out: TrendPoint[] = [];
  for (const d of days) {
    const upTo = s.attempts.filter((a) => dateKey(a.at) <= d);
    const rw = sectionStatus('rw', upTo, getQ), math = sectionStatus('math', upTo, getQ);
    if (!rw.range && !math.range) continue;
    out.push({ date: d, label: d.slice(5).replace('-', '/'), rw: rw.range ?? undefined, math: math.range ?? undefined, total: totalRange(rw.range, math.range) ?? undefined, confidence: lowerConfidence(rw.confidence, math.confidence) ?? rw.confidence ?? math.confidence });
  }
  return out;
}

export interface SessionRow { id: string; at: number; mode: string; n: number; correct: number; expected: number | null }
/**
 * Recent practice sessions with a difficulty-adjusted result: how many you got right compared with how
 * many your current estimate predicts for those exact questions (harder sets predict fewer).
 */
export function sessionHistory(s: AppState, getQ: (id: string) => Question | undefined, limit = 8): SessionRow[] {
  const rows = scored(s.attempts).map((a) => ({ a, q: getQ(a.qid) })).filter((r): r is { a: Attempt; q: Question } => !!r.q);
  const theta = (sec: Section) => {
    const st = sectionStatus(sec, s.attempts, getQ);
    if (!st.range) return null;
    const first = new Map<string, { difficulty: Difficulty; type: Question['type']; correct: boolean }>();
    for (const r of rows) if (r.q.section === sec && !first.has(r.q.id)) first.set(r.q.id, { difficulty: r.q.difficulty, type: r.q.type, correct: r.a.correct && r.a.hints === 0 });
    return estimateTheta([...first.values()].slice(-80)).theta;
  };
  const th = { rw: theta('rw'), math: theta('math') };
  const by = new Map<string, typeof rows>();
  for (const r of rows) { const k = r.a.sessionId ?? dateKey(r.a.at); by.set(k, [...(by.get(k) ?? []), r]); }
  return [...by.entries()].map(([id, rs]) => {
    const known = rs.every((r) => th[r.q.section] !== null);
    return {
      id, at: rs[rs.length - 1].a.at, mode: rs[0].a.mode ?? 'practice', n: rs.length, correct: rs.filter((r) => r.a.correct).length,
      expected: known ? Math.round(rs.reduce((t, r) => t + expectedCorrect(th[r.q.section]!, [{ difficulty: r.q.difficulty, type: r.q.type }]), 0) * 10) / 10 : null,
    };
  }).sort((x, y) => y.at - x.at).slice(0, limit);
}
