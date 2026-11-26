import type { CalcLesson, LessonTutor } from '../calc/types';
import { CSA_UNITS } from './units';
import { CSA1, CSA1_TUTOR } from './unit1';
import { CSA2, CSA2_TUTOR } from './unit2';
import { CSA3, CSA3_TUTOR } from './unit3';
import { CSA4A, CSA4A_TUTOR } from './unit4a';
import { CSA4B, CSA4B_TUTOR } from './unit4b';

export { CSA_UNITS };
/** AP Computer Science A: every lesson in course order. */
export const CSA_LESSONS: CalcLesson[] = [...CSA1, ...CSA2, ...CSA3, ...CSA4A, ...CSA4B];
export const CSA_TUTOR: Record<string, LessonTutor> = { ...CSA1_TUTOR, ...CSA2_TUTOR, ...CSA3_TUTOR, ...CSA4A_TUTOR, ...CSA4B_TUTOR };
