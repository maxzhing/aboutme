import type { Difficulty, Question, RawQuestion, Section, SkillId } from '@/lib/types';
import { DEFAULT_TIME, SKILL } from '@/lib/taxonomy';
import manifest from './validated.json';
import { ALL_RAW } from './all';
import { contentHash } from './hash';

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

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const getQuestion = (id: string): Question | undefined => BY_ID.get(id);
export const questionsBySkill = (skill: SkillId) => QUESTIONS.filter((q) => q.skill === skill);
export const questionsBySection = (section: Section) => QUESTIONS.filter((q) => q.section === section);

export const BANK_STATS = {
  total: QUESTIONS.length,
  math: QUESTIONS.filter((q) => q.section === 'math').length,
  rw: QUESTIONS.filter((q) => q.section === 'rw').length,
};
