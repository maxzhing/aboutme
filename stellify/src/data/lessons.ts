import type { SkillId } from '@/lib/types';
import { LESSONS_MATH, type Lesson } from './lessons-math';
import { LESSONS_RW } from './lessons-rw';

export type { Lesson };
export const LESSONS: Lesson[] = [...LESSONS_MATH, ...LESSONS_RW];
export const LESSON = Object.fromEntries(LESSONS.map((l) => [l.skill, l])) as Record<SkillId, Lesson>;
