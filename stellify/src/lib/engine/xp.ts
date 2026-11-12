import type { Difficulty, Question } from '../types';

export const LEVEL_TIERS = [
  { level: 1, title: 'Beginner', form: 'Stardust' },
  { level: 5, title: 'Growing', form: 'Spark' },
  { level: 10, title: 'Advanced', form: 'Flare' },
  { level: 20, title: 'Expert', form: 'Comet' },
  { level: 30, title: 'Legendary', form: 'Nova' },
  { level: 50, title: 'Ultimate', form: 'Supernova' },
];
export const MAX_LEVEL = 60;

/** Total XP required to reach a level (level 1 = 0 XP). */
export const xpForLevel = (level: number) => Math.round(60 * Math.pow(Math.max(0, level - 1), 1.6));

export function levelFromXp(xp: number) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const tier = [...LEVEL_TIERS].reverse().find((t) => level >= t.level)!;
  const nextTier = LEVEL_TIERS.find((t) => t.level > level);
  return { level, into: xp - base, span: next - base, progress: (xp - base) / (next - base), tier, nextTier };
}

const BASE: Record<Difficulty, number> = { medium: 10, hard: 16, 'very-hard': 24, elite: 34 };

export interface XpContext {
  correct: boolean;
  ms: number;
  hints: number;
  /** this question was answered correctly before, within the last 7 days */
  recentRepeat: boolean;
  /** this question was previously missed and is now answered correctly */
  redemption: boolean;
  abandoned?: boolean;
}

/**
 * XP rewards learning quality rather than volume:
 * rapid guesses earn nothing, hints reduce the reward, re-answering a question you just
 * got right is worth little, and fixing an old mistake earns a bonus.
 */
export function attemptXp(q: Pick<Question, 'difficulty' | 'type'>, c: XpContext): { xp: number; note?: string } {
  if (c.abandoned) return { xp: 0 };
  const rapid = c.ms < (q.type === 'mcq' ? 5000 : 4000);
  if (!c.correct) return rapid ? { xp: 0, note: 'Rapid guess: no XP' } : { xp: 3, note: 'Effort XP — review the explanation' };
  if (rapid) return { xp: 2, note: 'Answered very quickly' };
  let xp = BASE[q.difficulty];
  xp *= Math.max(0.4, 1 - 0.2 * c.hints);
  if (c.recentRepeat) return { xp: Math.max(1, Math.round(xp * 0.25)), note: 'Repeat question: reduced XP' };
  if (c.redemption) return { xp: Math.round(xp * 1.25), note: 'Redemption bonus: you fixed a past mistake' };
  return { xp: Math.round(xp) };
}

export const XP_REWARD = { lesson: 40, masteryUp: 60, mastered: 150, mockFull: 300, mockSection: 120, mistakeResolved: 30, diagnostic: 150, dailyBonus: 15, vocabSession: 15 };
export const coinsFor = (xp: number) => Math.round(xp / 2);
