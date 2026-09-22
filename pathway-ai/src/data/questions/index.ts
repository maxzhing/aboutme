import type { PracticeQuestion } from '@/domain/types';
import { SAT_MATH_QUESTIONS } from './satMath';
import { SAT_VERBAL_QUESTIONS } from './satVerbal';
import { AP_QUESTIONS } from './apQuestions';

export const SAT_QUESTIONS: PracticeQuestion[] = [...SAT_MATH_QUESTIONS, ...SAT_VERBAL_QUESTIONS];
export { AP_QUESTIONS };

export const ALL_QUESTIONS: PracticeQuestion[] = [...SAT_QUESTIONS, ...AP_QUESTIONS];

export const QUESTION_BY_ID = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

export const SAT_MATH_DOMAINS = [
  'Algebra',
  'Advanced Math',
  'Problem Solving and Data Analysis',
  'Geometry and Trigonometry',
] as const;

export const SAT_VERBAL_DOMAINS = [
  'Information and Ideas',
  'Craft and Structure',
  'Expression of Ideas',
  'Standard English Conventions',
] as const;

export function questionsForCourse(courseId: string): PracticeQuestion[] {
  return AP_QUESTIONS.filter((q) => q.courseId === courseId);
}

export function questionsForUnit(unitId: string): PracticeQuestion[] {
  return AP_QUESTIONS.filter((q) => q.unitId === unitId);
}
