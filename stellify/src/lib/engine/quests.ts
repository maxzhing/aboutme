import type { AppState, Question } from '../types';
import { dateKey, rng } from '../util';

export interface Quest { id: string; icon: string; title: string; goal: number; progress: number; xp: number; href: string; done: boolean; claimed: boolean }
export const CHEST = { id: 'chest', xp: 40 };

type Def = { id: string; icon: string; title: string; goal: number; xp: number; href: string; count: (c: Ctx) => number };
interface Ctx { s: AppState; day: string; today: AppState['attempts']; getQ: (id: string) => Question | undefined }

const bestRun = (c: Ctx) => { let best = 0, run = 0; for (const a of c.today) { run = a.correct ? run + 1 : 0; best = Math.max(best, run); } return best; };
const hardRight = (c: Ctx) => c.today.filter((a) => a.correct && c.getQ(a.qid)?.difficulty !== 'medium').length;

/** Three slots: volume, depth, and precision. One quest per slot each day, chosen by the date. */
const SLOTS: Def[][] = [
  [
    { id: 'answer10', icon: '⚡', title: 'Answer 10 questions', goal: 10, xp: 20, href: '/practice/session?mode=smart&n=10', count: (c) => c.s.activity[c.day]?.questions ?? 0 },
    { id: 'correct8', icon: '✅', title: 'Get 8 questions right', goal: 8, xp: 25, href: '/practice/session?mode=smart&n=10', count: (c) => c.s.activity[c.day]?.correct ?? 0 },
  ],
  [
    { id: 'lesson1', icon: '📘', title: 'Finish 1 interactive lesson', goal: 1, xp: 25, href: '/learn', count: (c) => c.s.activity[c.day]?.lessons ?? 0 },
    { id: 'hard3', icon: '🔥', title: 'Get 3 Hard or tougher questions right', goal: 3, xp: 30, href: '/practice/hard', count: hardRight },
  ],
  [
    { id: 'combo4', icon: '🎯', title: 'Get 4 right in a row', goal: 4, xp: 25, href: '/practice/session?mode=smart&n=8', count: bestRun },
    { id: 'daily', icon: '🌟', title: 'Solve the daily challenge', goal: 1, xp: 20, href: '/daily', count: (c) => (c.s.daily[c.day] ? 1 : 0) },
    { id: 'fix1', icon: '🧹', title: 'Clear 1 mistake from your bucket', goal: 1, xp: 30, href: '/mistakes', count: (c) => Object.values(c.s.mistakes).filter((m) => m.resolvedAt && dateKey(m.resolvedAt) === c.day).length },
  ],
];

/** Today's quest board. Pure: progress is derived from the day's real activity, never stored. */
export function dailyQuests(s: AppState, getQ: (id: string) => Question | undefined, now: number): Quest[] {
  const day = dateKey(now), rand = rng(`quests-${day}`);
  const ctx: Ctx = { s, day, getQ, today: s.attempts.filter((a) => !a.abandoned && dateKey(a.at) === day) };
  const claimed = s.quests?.[day] ?? [];
  const hasMistakes = Object.values(s.mistakes).some((m) => m.status === 'unresolved' || (m.resolvedAt && dateKey(m.resolvedAt) === day));
  return SLOTS.map((slot) => {
    const pool = slot.filter((d) => d.id !== 'fix1' || hasMistakes);
    const d = pool[Math.floor(rand() * pool.length)];
    const progress = Math.min(d.goal, d.count(ctx));
    return { id: d.id, icon: d.icon, title: d.title, goal: d.goal, xp: d.xp, href: d.href, progress, done: progress >= d.goal, claimed: claimed.includes(d.id) };
  });
}
