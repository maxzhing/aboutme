import type { Difficulty, Question, RawQuestion, Section, SkillId } from '@/lib/types';
import { DEFAULT_TIME, SKILL } from '@/lib/taxonomy';
import manifest from './validated.json';
import { ALL_RAW } from './all';
import { contentHash } from './hash';
import { PACK_RAW } from '@/data/pack';
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

export const OFFICIAL: Question[] = PACK_RAW.map((p) => {
  const skill = SKILL[p.skill], lesson = LESSON[p.skill], hack = hacksFor(p.skill)[0];
  const concept = lesson.intro, strategy = hack ? `${hack.title}: ${hack.test}` : lesson.shortcuts[0];
  const letter = 'ABCD'[p.answer];
  const difficulty: Difficulty = p.d === 'M' ? 'medium' : 'hard';
  return {
    id: p.id, skill: p.skill, sub: p.sub ?? 'Official question', passage: p.passage, figure: p.figure, stem: p.stem, choices: p.choices, answer: p.answer,
    steps: [...officialSteps(p.why[p.answer]), ...(p.note ? [p.note] : []), `The answer is choice ${letter}.`], why: p.why,
    concept, strategy, trap: lesson.mistakes[0], remember: lesson.shortcuts[0],
    section: skill.section, domain: skill.domain, difficulty, type: 'mcq', time: DEFAULT_TIME[skill.section][difficulty],
    hints: [concept, strategy, 'Eliminate the choices you can rule out for a definite reason, then compare what is left word by word.'],
    source: `Official College Board question (${p.cbDifficulty ?? 'rated'} difficulty), from your own practice file · rationale by the College Board`,
    license: 'Copyright College Board. For your personal study only; do not share or publish.',
    validation: 'validated', created: '2026-11-13',
  };
});
export const hasOfficial = OFFICIAL.length > 0;

const BY_ID = new Map([...QUESTIONS, ...OFFICIAL].map((q) => [q.id, q]));
export const getQuestion = (id: string): Question | undefined => BY_ID.get(id);
export const questionsBySkill = (skill: SkillId) => QUESTIONS.filter((q) => q.skill === skill);
export const questionsBySection = (section: Section) => QUESTIONS.filter((q) => q.section === section);

export const BANK_STATS = {
  total: QUESTIONS.length,
  math: QUESTIONS.filter((q) => q.section === 'math').length,
  rw: QUESTIONS.filter((q) => q.section === 'rw').length,
};
