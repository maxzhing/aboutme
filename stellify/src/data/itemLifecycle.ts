import type { Difficulty } from '@/lib/types';

/**
 * Item life cycle: draft → pretest → calibrated → live → flagged → retired.
 * Every validated bank question is "live" with its author's difficulty unless listed here. A "calibrated" entry
 * records the empirical difficulty from real responses (with its sample size), which then replaces the author tag
 * everywhere difficulty is used, including Module 2 routing. Nothing is calibrated yet: that needs ~200+ first
 * attempts per item from many students (METHODOLOGY.md).
 */
export type Lifecycle = 'draft' | 'pretest' | 'calibrated' | 'live' | 'flagged' | 'retired';
export interface LifecycleEntry { state: Lifecycle; /** empirical difficulty once calibrated */ difficulty?: Difficulty; p?: number; n?: number; note?: string; at?: string }

export const LIFECYCLE: Record<string, LifecycleEntry> = {};

export const lifecycleOf = (id: string): Lifecycle => LIFECYCLE[id]?.state ?? 'live';
/** Pretest, draft and retired items never count toward a student's stats or score estimate. */
export const countsForStudent = (id: string) => !['pretest', 'draft', 'retired'].includes(lifecycleOf(id));
/** Empirical difficulty when calibrated, otherwise the author's tag. */
export function difficultyOf(q: { id: string; difficulty: Difficulty }): Difficulty {
  const e = LIFECYCLE[q.id];
  return e?.state === 'calibrated' && e.difficulty ? e.difficulty : q.difficulty;
}
/** Maps a percent correct to a difficulty band (used when an item is calibrated). */
export const bandFromP = (p: number): Difficulty => (p >= 0.7 ? 'medium' : p >= 0.5 ? 'hard' : p >= 0.25 ? 'very-hard' : 'elite');
