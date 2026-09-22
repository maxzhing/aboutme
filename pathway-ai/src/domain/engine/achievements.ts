import type { Achievement } from '@/domain/types';
import { todayISO, addDays } from '@/lib/date';
import type { EngineContext } from './context';

/* ==========================================================================
   Achievements — section 37
   Deliberately tasteful: they reward consistency and genuine work, never
   volume of activities or anything that would encourage résumé padding.
   ========================================================================== */

interface Definition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: Achievement['category'];
  progress: (ctx: EngineContext) => { current: number; target: number };
}

const DEFINITIONS: Definition[] = [
  {
    id: 'first-diagnostic',
    name: 'Baseline set',
    description: 'Completed your first practice session. Now there is something to measure against.',
    icon: 'flag',
    category: 'testing',
    progress: (ctx) => ({ current: Math.min(ctx.account.practiceSessions.length, 1), target: 1 }),
  },
  {
    id: 'first-sat-practice',
    name: 'First question answered',
    description: 'You started. That is the hard part.',
    icon: 'spark',
    category: 'testing',
    progress: (ctx) => ({ current: Math.min(ctx.account.attempts.length, 1), target: 1 }),
  },
  {
    id: 'hundred-questions',
    name: '100 questions',
    description: 'Enough practice for the weakness data to mean something.',
    icon: 'stack',
    category: 'testing',
    progress: (ctx) => ({ current: Math.min(ctx.account.attempts.length, 100), target: 100 }),
  },
  {
    id: 'reviewed-mistakes',
    name: 'Learned from twenty',
    description: 'Reviewed the explanation on twenty questions you got wrong. This is where improvement actually comes from.',
    icon: 'lens',
    category: 'testing',
    progress: (ctx) => ({
      current: Math.min(ctx.account.attempts.filter((a) => a.correct === false && a.viewedExplanation).length, 20),
      target: 20,
    }),
  },
  {
    id: 'ap-unit-mastered',
    name: 'Unit finished',
    description: 'Took an AP unit to full completion.',
    icon: 'check',
    category: 'academics',
    progress: (ctx) => ({
      current: Math.min(Object.values(ctx.account.apUnitProgress).filter((p) => p >= 100).length, 1),
      target: 1,
    }),
  },
  {
    id: 'ap-five-units',
    name: 'Five units down',
    description: 'Five AP units completed. Steady coverage beats cramming.',
    icon: 'layers',
    category: 'academics',
    progress: (ctx) => ({
      current: Math.min(Object.values(ctx.account.apUnitProgress).filter((p) => p >= 100).length, 5),
      target: 5,
    }),
  },
  {
    id: 'seven-day-streak',
    name: 'Seven days running',
    description: 'Showed up seven days in a row. Consistency is the whole game.',
    icon: 'flame',
    category: 'consistency',
    progress: (ctx) => ({ current: Math.min(currentStreak(ctx), 7), target: 7 }),
  },
  {
    id: 'thirty-day-streak',
    name: 'A month of showing up',
    description: 'Thirty consecutive days. Very few students manage this.',
    icon: 'crown',
    category: 'consistency',
    progress: (ctx) => ({ current: Math.min(currentStreak(ctx), 30), target: 30 }),
  },
  {
    id: 'first-college-saved',
    name: 'First college researched',
    description: 'Started building a list rather than a wish.',
    icon: 'bookmark',
    category: 'colleges',
    progress: (ctx) => ({ current: Math.min(ctx.account.collegeList.length, 1), target: 1 }),
  },
  {
    id: 'balanced-list',
    name: 'A list, not a lottery',
    description: 'Your college list includes options where admission is more predictable and cost is manageable.',
    icon: 'balance',
    category: 'colleges',
    progress: (ctx) => {
      const hasAccessible = ctx.account.collegeList.length >= 5;
      return { current: hasAccessible ? 1 : 0, target: 1 };
    },
  },
  {
    id: 'activity-documented',
    name: 'Written down while fresh',
    description: 'Recorded a personal note on why an activity matters to you. Future-you will be grateful.',
    icon: 'pen',
    category: 'activities',
    progress: (ctx) => ({
      current: Math.min(ctx.profile.activities.filter((a) => a.personalConnection).length, 1),
      target: 1,
    }),
  },
  {
    id: 'three-year-commitment',
    name: 'Three years deep',
    description: 'Stayed with one activity for three years or more.',
    icon: 'roots',
    category: 'activities',
    progress: (ctx) => ({
      current: Math.min(ctx.profile.activities.filter((a) => a.gradesInvolved.length >= 3).length, 1),
      target: 1,
    }),
  },
  {
    id: 'first-project',
    name: 'Finished something',
    description: 'Marked a project as complete. Finishing is rarer than starting.',
    icon: 'trophy',
    category: 'projects',
    progress: (ctx) => ({
      current: Math.min(ctx.account.savedItems.filter((s) => s.targetType === 'project' && s.status === 'completed').length, 1),
      target: 1,
    }),
  },
  {
    id: 'checklist-complete',
    name: 'One application ready',
    description: 'Completed every checklist item for one college.',
    icon: 'seal',
    category: 'colleges',
    progress: (ctx) => {
      const best = Math.max(0, ...ctx.account.collegeList.map((e) => Object.values(e.checklist).filter(Boolean).length));
      return { current: Math.min(best, 9), target: 9 };
    },
  },
];

export function currentStreak(ctx: EngineContext): number {
  const days = new Set(ctx.account.activityLog);
  let streak = 0;
  let cursor = todayISO();
  // Allow today to be missing without breaking a streak built yesterday.
  if (!days.has(cursor)) cursor = addDays(cursor, -1);
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeAchievements(ctx: EngineContext): Achievement[] {
  return DEFINITIONS.map((def) => {
    const progress = def.progress(ctx);
    const earnedAt = ctx.account.achievements[def.id];
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      progress,
      earnedAt: earnedAt ?? (progress.current >= progress.target ? new Date().toISOString() : undefined),
    };
  });
}

/** Achievement ids newly satisfied but not yet recorded, for the store to grant. */
export function newlyEarned(ctx: EngineContext): string[] {
  return computeAchievements(ctx)
    .filter((a) => a.progress && a.progress.current >= a.progress.target && !ctx.account.achievements[a.id])
    .map((a) => a.id);
}
