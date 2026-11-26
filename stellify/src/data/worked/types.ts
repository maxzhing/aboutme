import type { SkillId } from '@/lib/types';

/**
 * A worked-example problem family (N11): one problem type taught by backward fading.
 *  rung 1 — fully worked, each step with a "why this step?" self-explanation prompt
 *  rung 2 — a new problem with the last step left for the student
 *  rung 3 — a new problem with the last two (or more) steps left for the student
 *  rung 4 — an independent problem
 * Steps are short lines; a blanked step is answered by typing its result, checked against `answer`.
 */
export interface WorkedStep {
  /** what is done (shown when worked) */ do: string;
  /** the result line, in math */ result: string;
  /** the model answer to “why this step?” */ why: string;
  /** what the student types when this step is blank */ ask: string;
  /** accepted answers when this step is blank */ answer: string[];
}
export interface WorkedProblem { /** the numbers the problem was built from (tests recompute every answer from these) */ params: (number | string)[]; prompt: string; steps: WorkedStep[]; /** final answer, accepted forms */ final: string[] }
export interface WorkedFamily {
  id: string;
  skill: SkillId;
  title: string;
  /** the idea the family teaches, in one sentence */
  idea: string;
  /** four problems: worked, last-step blank, more blanks, independent */
  rungs: [WorkedProblem, WorkedProblem, WorkedProblem, WorkedProblem];
  /** how many trailing steps are blank on rung 2 and rung 3 */
  fade: number[];
}
