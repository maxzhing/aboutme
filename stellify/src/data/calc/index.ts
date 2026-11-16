import type { CalcLesson, CalcProblem } from './types';
import { CALC_UNITS } from './units';
import { UNIT1 } from './unit1';
import { UNIT2 } from './unit2';
import { UNIT3 } from './unit3';
import { UNIT4 } from './unit4';
import { UNIT5 } from './unit5';
import { UNIT6 } from './unit6';
import { UNIT7 } from './unit7';
import { UNIT8 } from './unit8';
import { UNIT9 } from './unit9';
import { UNIT10 } from './unit10';

export * from './types';
export { CALC_UNITS };

/** Every written lesson, in course order. All ten units are written. */
export const CALC_LESSONS: CalcLesson[] = [...UNIT1, ...UNIT2, ...UNIT3, ...UNIT4, ...UNIT5, ...UNIT6, ...UNIT7, ...UNIT8, ...UNIT9, ...UNIT10];
export const CALC_LESSON: Record<string, CalcLesson> = Object.fromEntries(CALC_LESSONS.map((l) => [l.id, l]));
export const lessonsOfUnit = (n: number) => CALC_LESSONS.filter((l) => l.unit === n);
export const CALC_PROBLEM: Record<string, CalcProblem> = Object.fromEntries(CALC_LESSONS.flatMap((l) => l.practice.map((p) => [p.id, p])));
/** Lessons needed to pass a lesson: three quarters of its practice right. */
export const PASS = 0.75;
