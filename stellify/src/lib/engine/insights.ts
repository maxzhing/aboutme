import type { Attempt, Question, Section, SkillId } from '../types';
import { SKILLS } from '../taxonomy';
import { computeAllSkillStats, type MasteryLevel } from './mastery';
import { MATH_CHOICE, MATH_FIXED, RW_SLOTS } from './mock';
import { pointsPerQuestion } from '../fullTest/score';
import type { Confidence } from './scoring';
import type { TrendPoint } from './analytics';

/** About how many questions of each skill a full digital SAT has (both modules), from the test blueprint. */
export const PER_TEST: Record<SkillId, number> = (() => {
  const out = Object.fromEntries(SKILLS.map((s) => [s.id, 0])) as Record<SkillId, number>;
  for (const k of RW_SLOTS) out[k] += 2;
  for (const k of MATH_FIXED) out[k] += 2;
  for (const group of MATH_CHOICE) for (const k of group) out[k] += 2 / group.length;
  return out;
})();

/** Wilson score interval for a proportion (z = 1.2816 gives an 80% interval). */
export function wilson(correct: number, n: number, z = 1.2816): [number, number] {
  if (!n) return [0, 1];
  const p = correct / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

export interface SkillHeat {
  skill: SkillId; section: Section;
  n: number; correct: number;
  /** difficulty-weighted mastery 0–100 (shrunk toward 50 when data is thin); null with no data */
  mastery: number | null;
  level: MasteryLevel;
  /** 80% interval for the true accuracy on this skill */
  ci: [number, number] | null;
  confidence: Confidence | null;
  /** recent accuracy against the attempts just before them */
  trend: 'up' | 'down' | 'flat' | null;
  delta: number | null;
  perTest: number;
}

/** Every SAT skill: mastery, sample size, how sure we are, and which way it is heading. */
export function skillHeat(attempts: Attempt[], getQ: (id: string) => Question | undefined): SkillHeat[] {
  const stats = computeAllSkillStats(attempts, getQ);
  const bySkill = new Map<SkillId, boolean[]>();
  for (const a of attempts) {
    if (a.abandoned) continue;
    const q = getQ(a.qid);
    if (!q) continue;
    bySkill.set(q.skill, [...(bySkill.get(q.skill) ?? []), a.correct && a.hints < 3]);
  }
  return SKILLS.map((s) => {
    const st = stats[s.id];
    const seq = bySkill.get(s.id) ?? [];
    const ci = st.n ? wilson(st.correct, st.n) : null;
    const half = ci ? (ci[1] - ci[0]) / 2 : 1;
    const confidence: Confidence | null = !st.n ? null : st.n >= 25 && half <= 0.12 ? 'high' : st.n >= 12 && half <= 0.18 ? 'medium' : 'low';
    let trend: SkillHeat['trend'] = null, delta: number | null = null;
    if (seq.length >= 10) {
      const k = Math.min(8, Math.floor(seq.length / 2));
      const acc = (xs: boolean[]) => xs.filter(Boolean).length / xs.length;
      delta = acc(seq.slice(-k)) - acc(seq.slice(-2 * k, -k));
      trend = delta >= 0.15 ? 'up' : delta <= -0.15 ? 'down' : 'flat';
    }
    return { skill: s.id, section: s.section, n: st.n, correct: st.correct, mastery: st.n ? st.score : null, level: st.level, ci, confidence, trend, delta, perTest: PER_TEST[s.id] };
  });
}

export interface Opportunity { skill: SkillId; section: Section; from: number; to: number; extraRight: number; points: number }
/**
 * Where the points are: for each measured skill, raising its accuracy to 85% would add about
 * (questions per test × accuracy gained) right answers, each worth the scaled points one more right
 * answer is worth near the student's current section level. A rough guide to where effort pays most.
 */
export function opportunities(heat: SkillHeat[], level: Partial<Record<Section, number>>, target = 0.85): Opportunity[] {
  return heat.filter((h) => h.n >= 4).map((h) => {
    const from = h.correct / h.n;
    const extraRight = Math.max(0, target - from) * h.perTest;
    return { skill: h.skill, section: h.section, from, to: target, extraRight, points: Math.round(extraRight * pointsPerQuestion(h.section, level[h.section] ?? 500)) };
  }).filter((o) => o.points > 0).sort((a, b) => b.points - a.points);
}

export interface Forecast { perWeek: number; se: number; clear: boolean; days: number; projection?: { date: string; low: number; mid: number; high: number } }
/**
 * Is the estimate really moving? A straight line through the day-by-day estimates (needs at least 4 days
 * spanning two weeks). The trend counts as clear only when it is more than twice its own uncertainty, and
 * only then is it projected to the exam date, with a range that widens the further ahead it looks.
 */
export function forecast(trend: TrendPoint[], series: 'total' | 'rw' | 'math', examDate?: string, now = Date.now()): Forecast | null {
  const pts = trend.filter((t) => t[series]).map((t) => ({ x: Date.parse(`${t.date}T12:00:00`) / 864e5, y: t[series]!.mid, half: (t[series]!.high - t[series]!.low) / 2 }));
  if (pts.length < 4) return null;
  const span = pts[pts.length - 1].x - pts[0].x;
  if (span < 14) return null;
  const mx = pts.reduce((t, p) => t + p.x, 0) / pts.length, my = pts.reduce((t, p) => t + p.y, 0) / pts.length;
  const sxx = pts.reduce((t, p) => t + (p.x - mx) ** 2, 0), sxy = pts.reduce((t, p) => t + (p.x - mx) * (p.y - my), 0);
  const slope = sxy / sxx, icpt = my - slope * mx;
  const resid = pts.reduce((t, p) => t + (p.y - (icpt + slope * p.x)) ** 2, 0) / Math.max(1, pts.length - 2);
  const se = Math.sqrt(resid / sxx);
  const clear = Math.abs(slope) > 2 * se && Math.abs(slope * 7) >= 3;
  const out: Forecast = { perWeek: Math.round(slope * 7), se: Math.round(se * 7 * 10) / 10, clear, days: Math.round(span) };
  if (clear && examDate) {
    const ex = Date.parse(`${examDate}T12:00:00`) / 864e5, today = now / 864e5, last = pts[pts.length - 1];
    const ahead = ex - last.x;
    if (ex > today && ahead <= 120) {
      const [lo, hi] = series === 'total' ? [400, 1600] : [200, 800];
      const mid = Math.round((last.y + slope * ahead) / 10) * 10;
      const half = last.half + 1.2816 * se * ahead;
      out.projection = { date: examDate, mid: Math.min(hi, Math.max(lo, mid)), low: Math.max(lo, Math.round((mid - half) / 10) * 10), high: Math.min(hi, Math.round((mid + half) / 10) * 10) };
    }
  }
  return out;
}
