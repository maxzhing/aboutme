import type { CalcLesson, CalcUnit, LessonTutor } from './calc/types';
import { CALC_LESSONS, CALC_TUTOR, CALC_UNITS } from './calc';
import { CSA_LESSONS, CSA_TUTOR, CSA_UNITS } from './csa';
import { MICRO_LESSONS, MICRO_TUTOR, MICRO_UNITS } from './micro';
import { MACRO_LESSONS, MACRO_TUTOR, MACRO_UNITS } from './macro';
import { STATS_LESSONS, STATS_TUTOR, STATS_UNITS } from './stats';

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
  micro: make({
    id: 'micro', name: 'AP Microeconomics', short: 'Micro',
    blurb: 'How people, firms and markets make choices: all six College Board units, from opportunity cost to monopoly, labor markets and externalities. Every lesson works through real numbers and graphs step by step, and ends with you teaching it back.',
    units: MICRO_UNITS, lessons: MICRO_LESSONS, tutor: MICRO_TUTOR,
    answer: { placeholder: 'e.g. 2.5', chips: [], help: 'Type a number. No $ or % signs needed (they are ignored if you type them).' },
  }),
  macro: make({
    id: 'macro', name: 'AP Macroeconomics', short: 'Macro',
    blurb: 'How whole economies work: all six College Board units, from GDP and unemployment to the AD-AS model, money and the Fed, the Phillips curve, growth and exchange rates. Every lesson works through real numbers step by step, and ends with you teaching it back.',
    units: MACRO_UNITS, lessons: MACRO_LESSONS, tutor: MACRO_TUTOR,
    answer: { placeholder: 'e.g. -60', chips: [], help: 'Type a number. Use a minus sign for decreases or deficits. No $ or % signs needed (they are ignored if you type them).' },
  }),
  stats: make({
    id: 'stats', name: 'AP Statistics', short: 'Stats',
    blurb: 'Learn to reason with data: all nine College Board units, from describing distributions and designing studies to probability, confidence intervals, t tests, chi-square and regression inference. Every answer is double-checked by an independent statistics engine, every step is explained in plain words, and every lesson ends with you teaching it back.',
    units: STATS_UNITS, lessons: STATS_LESSONS, tutor: STATS_TUTOR,
    answer: { placeholder: 'e.g. 0.125', chips: [], help: 'Type a number, rounded as the question asks. Probabilities and proportions are decimals like 0.25 (a % sign is ignored if you type one).' },
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
