/** Prints the landing page's sample question (a real, original bank question) as JSON, typeset. Used by build-web.mjs. */
import { getQuestion } from '../src/data/questions';
import { typeset } from '../src/lib/typeset';
const q = getQuestion(process.argv[2] ?? 'r-bnd-06')!;
const t = (s: string) => typeset(s).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/_{5,}/g, ' ______ ');
process.stdout.write(JSON.stringify({ id: q.id, passage: t(q.passage ?? ''), stem: t(q.stem), choices: (q.choices ?? []).map(t), answer: q.answer, why: q.why.map(t), skill: q.skill }));
