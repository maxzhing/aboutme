import type { CalcLesson, CalcUnit, LessonTutor } from './calc/types';
import { CALC_LESSONS, CALC_TUTOR, CALC_UNITS } from './calc';
import { CSA_LESSONS, CSA_TUTOR, CSA_UNITS } from './csa';

/**
 * Registry of the AP self-study courses. Every course uses the same lesson model (notes, worked
 * examples, checked practice) and the same tutor layer, so one set of pages serves them all.
 */
export interface ApCourse {
  id: string;
  /** full course name, e.g. "AP Calculus BC" */
  name: string;
  /** short label for notes and badges */
  short: string;
  blurb: string;
  units: CalcUnit[];
  lessons: CalcLesson[];
  tutor: Record<string, LessonTutor>;
  /** how free-response answers are typed in this subject */
  answer: { placeholder: string; chips: string[]; help: string; exact?: boolean };
  lesson: Record<string, CalcLesson>;
  lessonsOfUnit: (n: number) => CalcLesson[];
  unitOf: (n: number) => CalcUnit | undefined;
}

type Spec = Omit<ApCourse, 'lesson' | 'lessonsOfUnit' | 'unitOf'>;
const make = (c: Spec): ApCourse => ({
  ...c,
  lesson: Object.fromEntries(c.lessons.map((l) => [l.id, l])),
  lessonsOfUnit: (n) => c.lessons.filter((l) => l.unit === n),
  unitOf: (n) => c.units.find((u) => u.n === n),
});

export const COURSES: Record<string, ApCourse> = {
  calc: make({
    id: 'calc', name: 'AP Calculus BC', short: 'Calc BC',
    blurb: 'Start from zero: a Math Toolkit unit, then all ten AP units in the College Board’s order. Every lesson explains the big idea in plain words, walks through every step and every problem, and ends with you teaching it back.',
    units: CALC_UNITS, lessons: CALC_LESSONS, tutor: CALC_TUTOR,
    answer: { placeholder: 'e.g. -1/4', chips: ['∞', '−∞', 'DNE'], help: 'Type numbers, fractions like -1/4, or ∞, −∞, DNE.' },
  }),
  csa: make({
    id: 'csa', name: 'AP Computer Science A', short: 'CSA',
    blurb: 'Learn Java from your very first variable to recursion, in the four units of the current College Board course. Every lesson traces real code step by step, explains why it behaves the way it does, and ends with you teaching it back.',
    units: CSA_UNITS, lessons: CSA_LESSONS, tutor: CSA_TUTOR,
    answer: { placeholder: 'exact output, e.g. 3.0', chips: ['true', 'false'], help: 'Type exactly what the code prints or returns (3 and 3.0 are different answers; spaces and capital letters are ignored).', exact: true },
  }),
};

export const COURSE_LIST = (): ApCourse[] => Object.values(COURSES);
export const courseOfLesson = (lessonId: string) => COURSE_LIST().find((c) => c.lesson[lessonId]);
export const lessonById = (lessonId: string) => courseOfLesson(lessonId)?.lesson[lessonId];
/** the slow walk-through for any practice problem in any course */
export const walkOf = (problemId: string): string[] | undefined => {
  for (const c of COURSE_LIST()) for (const t of Object.values(c.tutor)) if (t.walk[problemId]) return t.walk[problemId];
  return undefined;
};
