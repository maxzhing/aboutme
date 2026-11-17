import type { CalcLesson, LessonTutor } from '../calc/types';
import { STATS_UNITS } from './units';
import { STATS_A, STATS_A_TUTOR } from './statsA';
import { STATS_B, STATS_B_TUTOR } from './statsB';
import { STATS_C, STATS_C_TUTOR } from './statsC';
import { STATS_D, STATS_D_TUTOR } from './statsD';

export { STATS_UNITS };
/** AP Statistics: every lesson in course order. */
export const STATS_LESSONS: CalcLesson[] = [...STATS_A, ...STATS_B, ...STATS_C, ...STATS_D];
export const STATS_TUTOR: Record<string, LessonTutor> = { ...STATS_A_TUTOR, ...STATS_B_TUTOR, ...STATS_C_TUTOR, ...STATS_D_TUTOR };
