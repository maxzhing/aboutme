import type { CalcLesson, LessonTutor } from '../calc/types';
import { CHEM_UNITS } from './units';
import { CHEM_A, CHEM_A_TUTOR } from './chemA';
import { CHEM_B, CHEM_B_TUTOR } from './chemB';
import { CHEM_C, CHEM_C_TUTOR } from './chemC';
import { CHEM_D, CHEM_D_TUTOR } from './chemD';

export { CHEM_UNITS };
/** AP Chemistry: every lesson in course order. */
export const CHEM_LESSONS: CalcLesson[] = [...CHEM_A, ...CHEM_B, ...CHEM_C, ...CHEM_D]
  .map((l) => ({ ...l, practice: l.practice.map((p) => ({ ...p, lastDigit: true })) }));
export const CHEM_TUTOR: Record<string, LessonTutor> = { ...CHEM_A_TUTOR, ...CHEM_B_TUTOR, ...CHEM_C_TUTOR, ...CHEM_D_TUTOR };
