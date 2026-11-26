import type { CalcLesson, CalcProblem } from './types';
import { EXAM_STYLE, EXAM_STYLE_WALK } from './exam-style';
import { CALC_UNITS } from './units';
import { UNIT0 } from './unit0';
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

import { CALC_TUTOR } from './tutor';

export * from './types';
export { CALC_UNITS, CALC_TUTOR };

/** Every written lesson, in course order. All ten units are written. */
const BASE: CalcLesson[] = [...UNIT0, ...UNIT1, ...UNIT2, ...UNIT3, ...UNIT4, ...UNIT5, ...UNIT6, ...UNIT7, ...UNIT8, ...UNIT9, ...UNIT10];
// each unit's last lesson ends with three hard, AP-exam-style multiple-choice questions (data/calc/exam-style.ts)
const lastOfUnit = new Set([...new Set(BASE.map((l) => l.unit))].map((u) => BASE.filter((l) => l.unit === u).at(-1)!.id));
export const CALC_LESSONS: CalcLesson[] = BASE.map((l) => (lastOfUnit.has(l.id) && EXAM_STYLE[l.unit] ? { ...l, practice: [...l.practice, ...EXAM_STYLE[l.unit]] } : l));
export const CALC_LESSON: Record<string, CalcLesson> = Object.fromEntries(CALC_LESSONS.map((l) => [l.id, l]));
export const lessonsOfUnit = (n: number) => CALC_LESSONS.filter((l) => l.unit === n);
export const CALC_PROBLEM: Record<string, CalcProblem> = Object.fromEntries(CALC_LESSONS.flatMap((l) => l.practice.map((p) => [p.id, p])));
/** Lessons needed to pass a lesson: three quarters of its practice right. */
export const PASS = 0.75;
/** the slow walk-through for a practice problem, when its lesson has one */
// the tutor layer's walk-throughs for the exam-style questions
for (const l of CALC_LESSONS) if (lastOfUnit.has(l.id) && EXAM_STYLE[l.unit] && CALC_TUTOR[l.id]) CALC_TUTOR[l.id].walk = { ...CALC_TUTOR[l.id].walk, ...Object.fromEntries(EXAM_STYLE[l.unit].map((p) => [p.id, EXAM_STYLE_WALK[p.id]])) };
export const CALC_WALK: Record<string, string[]> = Object.assign({}, ...Object.values(CALC_TUTOR).map((t) => t.walk));
export const unitOf = (n: number) => CALC_UNITS.find((u) => u.n === n);
