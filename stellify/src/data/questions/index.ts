import type { Difficulty, Question, RawQuestion, Section, SkillId } from '@/lib/types';
import { DEFAULT_TIME, SKILL } from '@/lib/taxonomy';
import manifest from './validated.json';
import { ALL_RAW } from './all';
import { contentHash } from './hash';
import { PACK_RAW, type PackItem } from '@/data/pack';
import { LESSON } from '@/data/lessons';
import { hacksFor } from '@/data/hacks';

export { contentHash };

const DIFF: Record<RawQuestion['d'], Difficulty> = { M: 'medium', H: 'hard', V: 'very-hard', E: 'elite' };

export function normalize(q: RawQuestion, validated: boolean): Question {
  const skill = SKILL[q.skill];
  const difficulty = DIFF[q.d];
  const section: Section = skill.section;
  const body = q.steps.length > 1 ? q.steps.slice(0, -1) : q.steps.slice(0, 1);
  const { d: _d, time, ...rest } = q;
  void _d;
  return {
    ...rest,
    section,
    domain: skill.domain,
    difficulty,
    type: q.choices ? 'mcq' : 'spr',
    time: time ?? DEFAULT_TIME[section][difficulty],
    hints: [
      q.concept,
      q.strategy,
      `${body.join(' ')} Now carry out the final step yourself.`,
    ],
    source: 'Stellify Original (SAT-calibrated, not an official College Board question)',
    license: 'Original work — free for personal educational use',
    validation: validated ? 'validated' : 'unvalidated',
    created: '2026-11-12',
  };
}

const VALID = (manifest as { ids: Record<string, string> }).ids;

/** Every authored question, validated or not (used only by the validation tooling). */
export const ALL_QUESTIONS: Question[] = ALL_RAW.map((q) => normalize(q, VALID[q.id] === contentHash(q)));

/** Production bank: only questions whose current content passed validation. */
export const QUESTIONS: Question[] = ALL_QUESTIONS.filter((q) => q.validation === 'validated');

/**
 * Official College Board questions from the student's own private pack (personal builds only; empty
 * in the public build). They resolve by id for tests, review and the Mistake Bucket, but are kept
 * out of QUESTIONS so the original bank, its statistics and adaptive practice stay unchanged.
 */
/** Splits the College Board's rationale for the right answer into sentences, so it can be revealed one step at a time. */
function officialSteps(text: string): string[] {
  const parts = text.replace(/^Choice [A-D] is the best answer(?: because)?[.,]?\s*/, '').split(/(?<=[.!?”"])\s+(?=[A-Z“"])/).map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : [text];
}

/** Turns one official College Board question (from a private pack or an in-app import) into an app question. */
export function officialQuestion(p: PackItem): Question {
  const skill = SKILL[p.skill], lesson = LESSON[p.skill], hack = hacksFor(p.skill, p.sub)[0];
  const concept = lesson.intro, strategy = hack ? `${hack.title}: ${hack.test}` : lesson.shortcuts[0];
  const mcq = p.choices.length === 4 && typeof p.answer === 'number';
  const key = mcq ? `choice ${'ABCD'[p.answer as number]}` : (p.answer as string[]).join(' or ');
  const difficulty: Difficulty = p.d === 'M' ? 'medium' : 'hard';
  const why = mcq ? p.why : p.why.length >= 2 ? p.why : ['See the College Board explanation for this question.', 'Compare your work with each step of the explanation.'];
  const body = p.rationaleImage ? ['Work it out yourself first, then compare with the College Board explanation below.'] : officialSteps(mcq ? p.why[p.answer as number] : p.rationale ?? p.why.join(' '));
  return {
    id: p.id, skill: p.skill, sub: p.sub ?? 'Official question', passage: p.passage || undefined, notes: p.notes, figure: p.figure, stem: p.stem,
    choices: mcq ? p.choices : undefined, answer: p.answer,
    steps: [...body, ...(p.note ? [p.note] : []), `The answer is ${key}.`], why,
    concept, strategy, trap: lesson.mistakes[0], remember: lesson.shortcuts[0],
    section: skill.section, domain: skill.domain, difficulty, type: mcq ? 'mcq' : 'spr', time: DEFAULT_TIME[skill.section][difficulty],
    hints: [concept, strategy, 'Eliminate the choices you can rule out for a definite reason, then compare what is left word by word.'],
    source: p.source ? `Official College Board question · ${p.source}${p.estimated ? '' : ` (${p.cbDifficulty ?? 'rated'} difficulty)`} · explanation by the College Board` : `Official College Board question (${p.cbDifficulty ?? 'rated'} difficulty)${p.imported ? ', imported by you' : ', from your own practice file'} · explanation by the College Board`,
    license: 'Copyright College Board. For your personal study only; do not share or publish.',
    validation: 'validated', created: '2026-11-15',
    image: p.image, rationaleImage: p.rationaleImage, official: true, test: p.test,
    cbDifficulty: p.cbDifficulty === 'Easy' || p.cbDifficulty === 'Medium' || p.cbDifficulty === 'Hard' ? p.cbDifficulty : p.d === 'H' ? 'Hard' : 'Medium',
  };
}

/**
 * Official College Board questions: the student's private pack (personal builds) plus any they import
 * in the app. Kept apart from QUESTIONS so the original bank and its statistics stay unchanged.
 */
export const OFFICIAL: Question[] = PACK_RAW.map(officialQuestion);
export const hasOfficial = () => OFFICIAL.length > 0;

const BY_ID = new Map([...QUESTIONS, ...OFFICIAL].map((q) => [q.id, q]));
/** Adds imported official questions to the running app. Returns how many were new. */
export function registerOfficial(items: PackItem[]): number {
  let n = 0;
  for (const p of items) { if (BY_ID.has(p.id)) continue; const q = officialQuestion(p); OFFICIAL.push(q); BY_ID.set(q.id, q); n++; }
  return n;
}
/** Removes questions imported in the app (pack questions stay). */
export function unregisterImported(ids: string[]) {
  const drop = new Set(ids);
  for (let i = OFFICIAL.length - 1; i >= 0; i--) if (drop.has(OFFICIAL[i].id)) { BY_ID.delete(OFFICIAL[i].id); OFFICIAL.splice(i, 1); }
}
export const getQuestion = (id: string): Question | undefined => BY_ID.get(id);
export const questionsBySkill = (skill: SkillId) => QUESTIONS.filter((q) => q.skill === skill);
export const questionsBySection = (section: Section) => QUESTIONS.filter((q) => q.section === section);

export const BANK_STATS = {
  total: QUESTIONS.length,
  math: QUESTIONS.filter((q) => q.section === 'math').length,
  rw: QUESTIONS.filter((q) => q.section === 'rw').length,
};
