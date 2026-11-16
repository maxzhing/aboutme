import type { CalcLesson, CalcProblem } from './types';
import { CALC_UNITS } from './units';
import { UNIT1 } from './unit1';
import { UNIT2 } from './unit2';

export * from './types';
export { CALC_UNITS };

/** Every written lesson, in course order. Units without lessons yet appear in the plan as outlines. */
export const CALC_LESSONS: CalcLesson[] = [...UNIT1, ...UNIT2];
export const CALC_LESSON: Record<string, CalcLesson> = Object.fromEntries(CALC_LESSONS.map((l) => [l.id, l]));
export const lessonsOfUnit = (n: number) => CALC_LESSONS.filter((l) => l.unit === n);
export const CALC_PROBLEM: Record<string, CalcProblem> = Object.fromEntries(CALC_LESSONS.flatMap((l) => l.practice.map((p) => [p.id, p])));
/** Lessons needed to pass a lesson: three quarters of its practice right. */
export const PASS = 0.75;
