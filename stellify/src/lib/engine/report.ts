import type { AppState, Question, SkillId } from '../types';
import { SKILL, SKILLS } from '../taxonomy';
import { DAY, pct } from '../util';
import { rankSkills } from './adaptive';
import { computeAllSkillStats, MASTERY_LEVELS } from './mastery';
import { detectPatterns } from './mistakes';

export interface WeeklyReport {
  from: number; to: number; questions: number; accuracy: number; prevQuestions: number; prevAccuracy: number; minutes: number;
  improved: { skill: SkillId; from: number; to: number }[];
  declined: { skill: SkillId; from: number; to: number }[];
  mastered: SkillId[]; weak: SkillId[]; patterns: string[]; nextSteps: string[]; headline: string;
}

/** Deterministic weekly report built only from the student's recorded attempts. */
export function weeklyReport(s: AppState, getQ: (id: string) => Question | undefined, now: number): WeeklyReport {
  const from = now - 7 * DAY, prevFrom = now - 14 * DAY;
  const inRange = (a: number, b: number) => s.attempts.filter((x) => !x.abandoned && x.at >= a && x.at < b);
  const cur = inRange(from, now + 1), prev = inRange(prevFrom, from);
  const acc = (rows: typeof cur, skill?: SkillId) => {
    const r = skill ? rows.filter((x) => getQ(x.qid)?.skill === skill) : rows;
    return { n: r.length, pct: pct(r.filter((x) => x.correct).length, r.length) };
  };
  const improved: WeeklyReport['improved'] = [], declined: WeeklyReport['declined'] = [];
  for (const k of SKILLS) {
    const a = acc(prev, k.id), b = acc(cur, k.id);
    if (a.n >= 3 && b.n >= 3) {
      if (b.pct - a.pct >= 10) improved.push({ skill: k.id, from: a.pct, to: b.pct });
      else if (a.pct - b.pct >= 10) declined.push({ skill: k.id, from: a.pct, to: b.pct });
    }
  }
  const stats = computeAllSkillStats(s.attempts, getQ);
  const before = computeAllSkillStats(s.attempts.filter((x) => x.at < from), getQ);
  const mastered = SKILLS.filter((k) => stats[k.id].level === 4 && before[k.id].level < 4).map((k) => k.id);
  const ranked = rankSkills(s, getQ, now).filter((r) => r.stats.n >= 3 && r.stats.level < 3);
  const weak = ranked.slice(0, 4).map((r) => r.skill);
  const patterns = detectPatterns(s.mistakes, getQ).slice(0, 3).map((p) => p.message);
  const minutes = Math.round(Object.entries(s.activity).filter(([k]) => new Date(k).getTime() >= from - DAY).reduce((t, [, v]) => t + v.ms, 0) / 60_000);
  const c = acc(cur), p = acc(prev);
  const nextSteps: string[] = [];
  if (!cur.length) nextSteps.push('No questions were answered this week. A single 15-minute smart practice session is enough to restart.');
  for (const k of weak.slice(0, 2)) nextSteps.push(`Review the ${SKILL[k].name} lesson, then do a focused set (currently ${MASTERY_LEVELS[stats[k].level]}; ${stats[k].next})`);
  const open = Object.values(s.mistakes).filter((m) => m.status === 'unresolved').length;
  if (open) nextSteps.push(`Work through the Mistake Bucket: ${open} unresolved mistake${open === 1 ? '' : 's'}.`);
  if (cur.length >= 40 && !s.mocks.some((m) => (m.completedAt ?? 0) >= from)) nextSteps.push('Take a timed module or a full mock to test your skills under time pressure.');
  if (!nextSteps.length) nextSteps.push('Keep going with Smart Practice; it will keep targeting your weakest skills.');
  const headline = !cur.length ? 'A quiet week. Your progress is saved and ready when you are.'
    : p.n >= 5 && c.pct > p.pct ? `Accuracy rose from ${p.pct}% to ${c.pct}% on ${c.n} questions.`
    : p.n >= 5 && c.pct < p.pct ? `You answered ${c.n} questions at ${c.pct}% (last week: ${p.pct}%). Harder questions often cause a dip; check the weak skills below.`
    : `You answered ${c.n} questions this week at ${c.pct}% accuracy.`;
  return { from, to: now, questions: c.n, accuracy: c.pct, prevQuestions: p.n, prevAccuracy: p.pct, minutes, improved, declined, mastered, weak, patterns, nextSteps, headline };
}
