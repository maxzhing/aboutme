/**
 * The exam kit of each course that has one: unit tests, semester exams and finals, guided free-response workouts,
 * and the formula anatomy page. Calc BC and AP Chemistry share the same pages; this tells each page which course it shows.
 */
import { CALC_UNITS } from './calc';
import { CALC_EXAMS, type CalcExam } from './calc/exams';
import { CALC_FRQS, type Frq } from './calc/frq';
import { CALC_FORMULAS, type Formula } from './calc/formulas';
import type { CalcUnit } from './calc/types';
import { CHEM_UNITS } from './chem';
import { CHEM_EXAMS } from './chem/exams';
import { CHEM_FRQS } from './chem/frq';
import { CHEM_FORMULAS } from './chem/formulas';
import { PACK_CALC_FRQS } from './pack';

export type KitId = 'calc' | 'chem';
export type Kit = {
  id: KitId;
  name: string;
  units: CalcUnit[];
  exams: CalcExam[];
  exam: Record<string, CalcExam>;
  groups: { title: string; list: CalcExam[] }[];
  testsIntro: string;
  /** true: the AP exam allows a calculator on every question (AP Chemistry since 2023), so a test is one part */
  calculatorThroughout: boolean;
  /** official College Board questions from the student's private pack (personal build only, Calc BC only) */
  official: Frq[];
  original: Frq[];
  frqs: Frq[];
  frq: Record<string, Frq>;
  frqIntro: string;
  formulas: Formula[];
  formula: Record<string, Formula>;
};

const byId = <T extends { id: string }>(a: T[]) => Object.fromEntries(a.map((x) => [x.id, x])) as Record<string, T>;

function kit(k: Omit<Kit, 'exam' | 'frqs' | 'frq' | 'formula'>): Kit {
  const frqs = [...k.official, ...k.original];
  return { ...k, exam: byId(k.exams), frqs, frq: byId(frqs), formula: byId(k.formulas) };
}

export const KITS: Record<KitId, Kit> = {
  calc: kit({
    id: 'calc', name: 'AP Calculus BC', units: CALC_UNITS, exams: CALC_EXAMS,
    groups: [
      { title: 'Semester A · Units 1–5', list: CALC_EXAMS.filter((e) => e.semester === 'A') },
      { title: 'Semester B · Units 6–10', list: CALC_EXAMS.filter((e) => e.semester === 'B') },
      { title: 'Cumulative finals', list: CALC_EXAMS.filter((e) => e.kind === 'final') },
    ],
    calculatorThroughout: false,
    testsIntro: 'Built like a two-semester high-school Calculus BC course (MCPS runs it as AP BC Calculus A and B). **Fast track:** one unit a week. Do the unit’s lessons, then take its unit test; score 80% before the next unit. After Unit 5, take the Semester A exam; after Unit 10, the Semester B exam; then the cumulative finals. That is about 10 weeks of units plus 2 weeks of exams. Every test is hard, timed, has no hints, and has a no-calculator part and a calculator part, like the AP exam.',
    official: PACK_CALC_FRQS as Frq[], original: CALC_FRQS,
    frqIntro: 'Full multi-part free-response problems, the kind that decide whether you pass. You work every detail yourself, one step at a time, and each step is checked before you go on. After each part you see exactly what to write to earn full credit, and the mistake that usually costs points.',
    formulas: CALC_FORMULAS,
  }),
  chem: kit({
    id: 'chem', name: 'AP Chemistry', units: CHEM_UNITS, exams: CHEM_EXAMS,
    groups: [
      { title: 'Semester A · Units 1–5', list: CHEM_EXAMS.filter((e) => e.semester === 'A') },
      { title: 'Semester B · Units 6–9', list: CHEM_EXAMS.filter((e) => e.semester === 'B') },
      { title: 'Cumulative final', list: CHEM_EXAMS.filter((e) => e.kind === 'final') },
    ],
    testsIntro: 'Built like a two-semester high-school AP Chemistry course. **Fast track:** one unit a week. Do the unit’s lessons, then take its unit test; score 80% before the next unit. After Unit 5, take the Semester A exam; after Unit 9, the Semester B exam; then the cumulative final. That is about 9 weeks of units plus 2 weeks of exams. Every test is timed and has no hints. A calculator is allowed on every problem, as it is on both sections of the AP Chemistry exam (since 2023); many multiple-choice problems are still built so that estimating beats punching numbers.',
    calculatorThroughout: true,
    official: [], original: CHEM_FRQS,
    frqIntro: 'Full multi-part free-response problems built like the long AP Chemistry questions: lab data, a calculation, then a claim you have to justify. You work every number yourself, one step at a time, and each step is checked before you go on. After each part you see what a full-credit answer says, and the mistake that usually costs the point.',
    formulas: CHEM_FORMULAS,
  }),
};

export const isKit = (id: string): id is KitId => id === 'calc' || id === 'chem';
