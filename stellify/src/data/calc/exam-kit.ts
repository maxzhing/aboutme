import type { CalcProblem } from './types';

/**
 * A test problem: always hard, and marked as calculator or no-calculator like the AP exam's two parts.
 * Each one is solved the way a tutor would solve it at the board:
 * - `ask`: what the question is really asking, and what to notice before writing anything;
 * - `solution`: steps that each say what to do, why, and the arithmetic in full;
 * - `trap`: the mistake that costs most students the point.
 */
export interface ExamProblem extends CalcProblem { calculator: boolean; ask: string; trap: string; formula?: string }

/** X(id, calculator?, question, answer, hint, what it asks, steps, trap, extra) */
export const X = (id: string, calculator: boolean, q: string, answer: number | string[], hint: string, ask: string, solution: string[], trap: string, extra: Partial<ExamProblem> = {}): ExamProblem =>
  ({ id, level: 3, calculator, q, answer, hint, ask, solution, trap, ...extra });
