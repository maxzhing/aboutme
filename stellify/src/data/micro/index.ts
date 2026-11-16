import type { CalcLesson, LessonTutor } from '../calc/types';
import { MICRO_UNITS } from './units';
import { MICRO_A, MICRO_A_TUTOR } from './microA';
import { MICRO_B, MICRO_B_TUTOR } from './microB';
import { MICRO_C, MICRO_C_TUTOR } from './microC';

export { MICRO_UNITS };
/** AP Microeconomics: every lesson in course order. */
export const MICRO_LESSONS: CalcLesson[] = [...MICRO_A, ...MICRO_B, ...MICRO_C];
export const MICRO_TUTOR: Record<string, LessonTutor> = { ...MICRO_A_TUTOR, ...MICRO_B_TUTOR, ...MICRO_C_TUTOR };
