import type { CalcLesson, LessonTutor } from '../calc/types';
import { MACRO_UNITS } from './units';
import { MACRO_A, MACRO_A_TUTOR } from './macroA';
import { MACRO_B, MACRO_B_TUTOR } from './macroB';
import { MACRO_C, MACRO_C_TUTOR } from './macroC';
import { MACRO_D, MACRO_D_TUTOR } from './macroD';

export { MACRO_UNITS };
/** AP Macroeconomics: every lesson in course order. */
export const MACRO_LESSONS: CalcLesson[] = [...MACRO_A, ...MACRO_B, ...MACRO_C, ...MACRO_D];
export const MACRO_TUTOR: Record<string, LessonTutor> = { ...MACRO_A_TUTOR, ...MACRO_B_TUTOR, ...MACRO_C_TUTOR, ...MACRO_D_TUTOR };
