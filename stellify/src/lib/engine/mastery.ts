import type { Attempt, Difficulty, Question, SkillId } from '../types';
import { SKILLS } from '../taxonomy';
import { dateKey } from '../util';

export const MASTERY_LEVELS = ['Not Started', 'Learning', 'Developing', 'Proficient', 'Mastered'] as const;
export type MasteryLevel = 0 | 1 | 2 | 3 | 4;

export interface SkillStats {
  skill: SkillId;
  n: number;
  correct: number;
  acc: number;
  recentAcc: number;
  byDiff: Record<Difficulty, { n: number; correct: number }>;
  avgMs: number;
  hintRate: number;
  level: MasteryLevel;
  /** 0–100, shrunk toward 50 when there is little data */
  score: number;
  lastAt: number;
  days: number;
  /** what is still needed to reach the next level */
  next: string;
}

const W: Record<Difficulty, number> = { medium: 1, hard: 1.4, 'very-hard': 1.8, elite: 2.2 };
const WINDOW = 12;

/**
 * Mastery requires consistency: enough attempts, sustained recent accuracy, success on hard and
 * very hard questions, and work on more than one day. One lucky answer never grants mastery.
 * An attempt that needed all three hints counts as not yet independent.
 */
export function computeSkillStats(skill: SkillId, attempts: Attempt[], getQ: (id: string) => Question | undefined): SkillStats {
  const rows = attempts
    .filter((a) => !a.abandoned)
    .map((a) => ({ a, q: getQ(a.qid) }))
    .filter((r): r is { a: Attempt; q: Question } => !!r.q && r.q.skill === skill);
  const byDiff: SkillStats['byDiff'] = { medium: { n: 0, correct: 0 }, hard: { n: 0, correct: 0 }, 'very-hard': { n: 0, correct: 0 }, elite: { n: 0, correct: 0 } };
  let wn = 0, wc = 0, ms = 0, hints = 0;
  const ok = (r: { a: Attempt }) => r.a.correct && r.a.hints < 3;
  for (const r of rows) {
    byDiff[r.q.difficulty].n++;
    if (ok(r)) byDiff[r.q.difficulty].correct++;
    wn += W[r.q.difficulty];
    if (ok(r)) wc += W[r.q.difficulty];
    ms += r.a.ms;
    if (r.a.hints > 0) hints++;
  }
  const n = rows.length;
  const correct = rows.filter(ok).length;
  const recent = rows.slice(-WINDOW);
  const recentAcc = recent.length ? recent.filter(ok).length / recent.length : 0;
  const days = new Set(rows.map((r) => dateKey(r.a.at))).size;
  const vh = byDiff['very-hard'].correct + byDiff.elite.correct;
  const hardPlus = byDiff.hard.correct + vh;

  let level: MasteryLevel = 0;
  let next = 'Answer your first question in this skill.';
  if (n > 0) {
    level = 1;
    next = n < 4 ? `Answer ${4 - n} more question${4 - n === 1 ? '' : 's'}.` : 'Raise your recent accuracy to at least 50%.';
    if (n >= 4 && recentAcc >= 0.5) {
      level = 2;
      next = n < 8 ? `Answer ${8 - n} more question${8 - n === 1 ? '' : 's'} with at least 70% recent accuracy.`
        : recentAcc < 0.7 ? 'Raise your recent accuracy to at least 70%.'
        : 'Get at least 2 hard or very hard questions right.';
      if (n >= 8 && recentAcc >= 0.7 && hardPlus >= 2) {
        level = 3;
        next = n < 12 ? `Answer ${12 - n} more question${12 - n === 1 ? '' : 's'} at 85%+ recent accuracy.`
          : recentAcc < 0.85 ? 'Raise your recent accuracy to at least 85%.'
          : vh < 2 ? 'Get at least 2 very hard questions right.'
          : hardPlus < 4 ? 'Get at least 4 hard or very hard questions right.'
          : 'Practice this skill on a second day to confirm it sticks.';
        if (n >= 12 && recentAcc >= 0.85 && vh >= 2 && hardPlus >= 4 && days >= 2) { level = 4; next = 'Mastered. Keep it fresh with occasional review.'; }
      }
    }
  }
  const PRIOR = 3;
  const score = Math.round(((wc + 0.5 * PRIOR) / (wn + PRIOR)) * 100);
  return {
    skill, n, correct, acc: n ? correct / n : 0, recentAcc, byDiff,
    avgMs: n ? ms / n : 0, hintRate: n ? hints / n : 0, level, score: n ? score : 50,
    lastAt: rows.length ? rows[rows.length - 1].a.at : 0, days, next,
  };
}

export const computeAllSkillStats = (attempts: Attempt[], getQ: (id: string) => Question | undefined) =>
  Object.fromEntries(SKILLS.map((s) => [s.id, computeSkillStats(s.id, attempts, getQ)])) as Record<SkillId, SkillStats>;
