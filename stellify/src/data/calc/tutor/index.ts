import type { LessonTutor } from '../types';
import { TUTOR0 } from './t0';
import { TUTOR1A } from './t1a';
import { TUTOR1B } from './t1b';
import { TUTOR2 } from './t2';
import { TUTOR3 } from './t3';
import { TUTOR4 } from './t4';
import { TUTOR5 } from './t5';
import { TUTOR6A } from './t6a';
import { TUTOR6B } from './t6b';

/** The tutor layer for every lesson, by lesson id. */
export const CALC_TUTOR: Record<string, LessonTutor> = { ...TUTOR0, ...TUTOR1A, ...TUTOR1B, ...TUTOR2, ...TUTOR3, ...TUTOR4, ...TUTOR5, ...TUTOR6A, ...TUTOR6B };
