import type { CalcLesson, LessonTutor } from '../calc/types';
import { MUSIC_UNITS } from './units';
import { MUSIC_A, MUSIC_A_TUTOR } from './musicA';
import { MUSIC_B, MUSIC_B_TUTOR } from './musicB';
import { MUSIC_C, MUSIC_C_TUTOR } from './musicC';
import { MUSIC_D, MUSIC_D_TUTOR } from './musicD';

export { MUSIC_UNITS };
/** AP Music Theory: every lesson in course order (the College Board's unit order). */
export const MUSIC_LESSONS: CalcLesson[] = [...MUSIC_A, ...MUSIC_B, ...MUSIC_C, ...MUSIC_D].sort((a, b) => a.unit - b.unit || a.n - b.n);
export const MUSIC_TUTOR: Record<string, LessonTutor> = { ...MUSIC_A_TUTOR, ...MUSIC_B_TUTOR, ...MUSIC_C_TUTOR, ...MUSIC_D_TUTOR };
