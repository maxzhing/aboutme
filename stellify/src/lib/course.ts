import type { Attempt, Question } from './types';
import type { Chapter } from '@/data/courses';
import { OFFICIAL, QUESTIONS } from '@/data/questions';

const RANK: Record<string, number> = { elite: 4, 'very-hard': 3, hard: 2, medium: 1 };
const official = (q: Question) => q.id.startsWith('cb-');

/** Every question that practices a chapter: the student's official questions first (personal copy), then the bank. */
export function chapterQuestions(ch: Chapter): Question[] {
  return [...OFFICIAL, ...QUESTIONS].filter((q) => q.skill === ch.skill && ch.subs.includes(q.sub));
}

/**
 * Picks the worked example and the practice set for one pass through a chapter.
 * Worked example: an official question from the student's own file if there is one (its College Board
 * rationale revealed sentence by sentence), otherwise the hardest original question, unseen if possible.
 * Practice: questions not yet answered correctly come first, official questions before original ones,
 * hardest first; a short pool is topped up with other hard questions from the same skill.
 */
export function chapterSet(ch: Chapter, attempts: Attempt[], n = 3): { walk?: Question; practice: Question[] } {
  const seen = new Set(attempts.map((a) => a.qid));
  const solved = new Set(attempts.filter((a) => a.correct).map((a) => a.qid));
  const pool = chapterQuestions(ch);
  // the worked example is a real College Board question when the personal copy has one for this chapter
  const walk = pool.filter((q) => official(q) && q.steps.length >= 3).sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)) || a.id.localeCompare(b.id))[0] ?? pool.filter((q) => !official(q) && q.type === 'mcq' && q.difficulty !== 'medium')
    .sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)) || RANK[b.difficulty] - RANK[a.difficulty] || b.steps.length - a.steps.length || a.id.localeCompare(b.id))[0]
    ?? pool.find((q) => !official(q));
  const order = (a: Question, b: Question) => Number(solved.has(a.id)) - Number(solved.has(b.id)) || Number(official(b)) - Number(official(a)) || RANK[b.difficulty] - RANK[a.difficulty] || a.id.localeCompare(b.id);
  const practice = pool.filter((q) => q.id !== walk?.id).sort(order).slice(0, n);
  if (practice.length < n) {
    const extra = [...OFFICIAL, ...QUESTIONS].filter((q) => q.skill === ch.skill && q.difficulty !== 'medium' && q.id !== walk?.id && !practice.includes(q)).sort(order);
    practice.push(...extra.slice(0, n - practice.length));
  }
  return { walk, practice };
}

export const passed = (correct: number, total: number) => total > 0 && correct / total >= 2 / 3;
