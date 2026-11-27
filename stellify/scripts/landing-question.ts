/**
 * Prints the landing page's sample question (a real, original bank question) as JSON, typeset, with the same full
 * explanation the app shows after you answer: steps, why the answer is right, why each other choice fails (with its
 * trap), the concept, the fastest method, the common trap and what to remember. Used by build-web.mjs.
 */
import { getQuestion } from '../src/data/questions';
import { DISTRACTORS, TRAPS } from '../src/data/questions/distractors';
import { DIFFICULTY_NAME, SKILL } from '../src/lib/taxonomy';
import { typeset } from '../src/lib/typeset';
const q = getQuestion(process.argv[2] ?? 'r-inf-06')!;
const t = (s: string) => typeset(s ?? '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/_{5,}/g, ' ______ ');
const tags = DISTRACTORS[q.id] ?? {};
process.stdout.write(JSON.stringify({
  id: q.id, passage: t(q.passage ?? ''), stem: t(q.stem), choices: (q.choices ?? []).map(t), answer: q.answer,
  why: q.why.map(t), steps: q.steps.map(t), concept: t(q.concept), strategy: t(q.strategy), trap: t(q.trap), remember: t(q.remember),
  traps: (q.choices ?? []).map((_, i) => (tags[i] ? TRAPS[tags[i]!].label : '')),
  skill: SKILL[q.skill].name, difficulty: DIFFICULTY_NAME[q.difficulty],
}));
