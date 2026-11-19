import type { SkillId } from '@/lib/types';
import type { WorkedFamily } from './types';
import { WORKED_MATH } from './math';

/** Worked-example problem families (N11), by skill. Each family is a backward-fading ladder of four rungs. */
export const WORKED: WorkedFamily[] = [...WORKED_MATH];
export const WORKED_BY_SKILL: Partial<Record<SkillId, WorkedFamily[]>> = WORKED.reduce((m, f) => { (m[f.skill] ??= []).push(f); return m; }, {} as Partial<Record<SkillId, WorkedFamily[]>>);
export const workedFamilyIds = (): Partial<Record<SkillId, string[]>> => Object.fromEntries(Object.entries(WORKED_BY_SKILL).map(([k, v]) => [k, v!.map((f) => f.id)]));
export type { WorkedFamily } from './types';
