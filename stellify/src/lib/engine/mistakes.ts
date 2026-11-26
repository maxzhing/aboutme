import type { AnswerConfidence, ErrorCategory, Mistake, Question, SkillId } from '../types';
import { DISTRACTORS, TRAPS, type TrapCode } from '@/data/questions/distractors';
import { SKILL } from '../taxonomy';
import { parseNumeric } from '../answers';

export const ERROR_CATEGORIES: { id: ErrorCategory; label: string; tip: string }[] = [
  { id: 'concept', label: 'Conceptual misunderstanding', tip: 'Re-read the lesson for this skill before trying similar questions.' },
  { id: 'calculation', label: 'Calculation error', tip: 'Write each step on its own line and check by substituting your answer back.' },
  { id: 'misread', label: 'Misreading', tip: 'Re-read the final sentence of the question before you answer.' },
  { id: 'grammar', label: 'Grammar confusion', tip: 'Name the rule being tested before looking at the choices.' },
  { id: 'inference', label: 'Incorrect inference', tip: 'Point to the exact words in the text that prove your choice.' },
  { id: 'time', label: 'Time pressure', tip: 'Flag and move on sooner; come back with a fresh look.' },
  { id: 'careless', label: 'Careless mistake', tip: 'Slow down for five seconds before you submit.' },
  { id: 'strategy', label: 'Incorrect strategy', tip: 'Compare your approach with the "fastest reliable method" in the explanation.' },
];
export const CATEGORY_LABEL = Object.fromEntries(ERROR_CATEGORIES.map((c) => [c.id, c.label])) as Record<ErrorCategory, string>;

const INFERENCE_SKILLS: SkillId[] = ['inf', 'cid', 'coet', 'coeq', 'ctc', 'tsp'];

/** The four plain causes students see; each detailed category belongs to one. */
export type Cause = 'Conceptual gap' | 'Misreading' | 'Careless or calculation slip' | 'Time pressure';
export const CAUSE: Record<ErrorCategory, Cause> = {
  concept: 'Conceptual gap', grammar: 'Conceptual gap', inference: 'Conceptual gap', strategy: 'Conceptual gap',
  misread: 'Misreading', calculation: 'Careless or calculation slip', careless: 'Careless or calculation slip', time: 'Time pressure',
};
const GRAMMAR_TRAPS: TrapCode[] = ['run-on', 'fragment', 'punctuation', 'agreement', 'tense', 'pronoun', 'possessive', 'modifier', 'parallelism'];
const TRAP_CAUSE: Partial<Record<TrapCode, ErrorCategory>> = {
  'main-idea': 'misread', detail: 'misread', purpose: 'misread', 'wrong-text': 'misread',
  beyond: 'inference', reversed: 'inference', qualifier: 'inference', causation: 'inference', 'off-target': 'inference', data: 'inference',
  literal: 'concept', meaning: 'concept', logic: 'concept', goal: 'strategy',
  ...Object.fromEntries(GRAMMAR_TRAPS.map((t) => [t, 'grammar'])),
};

export interface DiagnoseInput {
  ms: number; answer: string | null;
  confidence?: AnswerConfidence;
  /** the student's record on this skill before this answer */
  skill?: { n: number; acc: number };
}
const secs = (ms: number) => `${Math.round(ms / 1000)} s`;

/**
 * Why was this question missed? A rule-based diagnosis from the evidence the app has: time spent against
 * the typical time, how sure the student said they were, their record on this skill, a near-miss numeric
 * answer, and which trap the chosen wrong answer represents. It returns the most likely cause and the
 * reasons, in plain words; the student can always relabel it.
 */
export function diagnose(q: Question, d: DiagnoseInput): { category: ErrorCategory; why: string[] } {
  const typical = q.time * 1000;
  const knows = d.skill && d.skill.n >= 4 && d.skill.acc >= 0.7;
  const struggling = d.skill && d.skill.n >= 4 && d.skill.acc < 0.5;
  const skillLine = d.skill && d.skill.n >= 4 ? `you get ${Math.round(d.skill.acc * 100)}% of ${SKILL[q.skill].short} questions right` : '';
  if (d.answer === null || d.answer === '') return { category: 'time', why: ['You left it blank: on test day, always guess (there is no penalty).'] };
  if (d.ms > typical * 1.9) return { category: 'time', why: [`You spent ${secs(d.ms)}; a typical solve takes about ${secs(typical)}.`, 'Long struggles cost time for other questions: flag it and come back.'] };
  if (q.type === 'spr') {
    const v = parseNumeric(d.answer), k = parseNumeric((q.answer as string[])[0]);
    if (v !== null && k !== null && (Math.abs(v + k) < 1e-9 || Math.abs(v - k) <= Math.max(1, Math.abs(k) * 0.1))) return { category: 'calculation', why: [Math.abs(v + k) < 1e-9 ? 'Your answer has the right size but the wrong sign.' : `Your answer (${d.answer}) is close to the right one: the method was likely fine, with a slip along the way.`] };
  }
  const trap = q.type === 'mcq' ? DISTRACTORS[q.id]?.[Number(d.answer)] : null;
  if (d.confidence === 'sure') {
    const why = ['You were sure, so this looks like a rule or idea that needs fixing, not a slip.'];
    if (trap) why.push(`Your choice is a classic “${TRAPS[trap].label}” trap: ${TRAPS[trap].tip}`);
    return { category: trap ? TRAP_CAUSE[trap] ?? 'concept' : 'concept', why };
  }
  if (d.ms < typical * 0.35) {
    if (knows) return { category: 'careless', why: [`You answered in ${secs(d.ms)} (typical: ${secs(typical)})`, `and ${skillLine}, so this was most likely a slip, not a gap.`] };
    return { category: 'concept', why: [`You answered in ${secs(d.ms)} (typical: ${secs(typical)})${d.confidence === 'guess' ? ' and said you guessed' : ''}.`, skillLine ? `Since ${skillLine}, it is most likely a gap to learn, not a slip.` : 'A very fast miss on a skill you are still building usually means a guess.'] };
  }
  if (trap) {
    const cat = TRAP_CAUSE[trap] ?? 'concept';
    return { category: knows && cat !== 'grammar' ? 'misread' : cat, why: [`Your choice is a “${TRAPS[trap].label}” trap: ${TRAPS[trap].tip}`, ...(knows ? [`Since ${skillLine}, re-reading carefully is the likely fix.`] : [])] };
  }
  if (struggling) return { category: 'concept', why: [`Right now ${skillLine}: review the lesson before more practice.`] };
  if (knows) return { category: q.section === 'math' ? 'calculation' : 'misread', why: [`${skillLine[0].toUpperCase()}${skillLine.slice(1)}, so a slip or a misread question is more likely than a gap.`] };
  if (q.section === 'rw') return { category: q.domain === 'sec' ? 'grammar' : INFERENCE_SKILLS.includes(q.skill) ? 'inference' : q.skill === 'wic' ? 'concept' : 'strategy', why: ['Not enough history on this skill yet to say more; based on what the question tests.'] };
  return { category: 'concept', why: ['Not enough history on this skill yet to say more.'] };
}

/** First guess at why a question was missed (kept for callers that only have timing). */
export const autoCategory = (q: Question, ms: number, answer: string | null): ErrorCategory => diagnose(q, { ms, answer }).category;

export const RELATED_NEEDED = 2;

/** A mistake can be resolved only after redoing it correctly AND getting new related questions right. */
export function resolveProgress(m: Mistake) {
  const related = Math.min(RELATED_NEEDED, m.relatedCorrect.length);
  return { redo: m.redoCorrect, related, needed: RELATED_NEEDED, ready: m.redoCorrect && related >= RELATED_NEEDED };
}

export interface MistakePattern { key: string; skill: SkillId; sub?: string; count: number; message: string; href: string }

/** Recurring-error detection across unresolved mistakes. */
export function detectPatterns(mistakes: Record<string, Mistake>, getQ: (id: string) => Question | undefined): MistakePattern[] {
  const bySub = new Map<string, { skill: SkillId; sub: string; count: number }>();
  const bySkill = new Map<SkillId, number>();
  for (const m of Object.values(mistakes)) {
    if (m.status === 'resolved') continue;
    const q = getQ(m.qid);
    if (!q) continue;
    const k = `${q.skill}|${q.sub}`;
    const e = bySub.get(k) ?? { skill: q.skill, sub: q.sub, count: 0 };
    e.count += 1;
    bySub.set(k, e);
    bySkill.set(q.skill, (bySkill.get(q.skill) ?? 0) + 1);
  }
  const out: MistakePattern[] = [];
  for (const [k, e] of bySub) {
    if (e.count >= 3) out.push({
      key: k, skill: e.skill, sub: e.sub, count: e.count, href: `/learn/${e.skill}`,
      message: `You have missed ${e.count} questions involving ${e.sub.toLowerCase()} (${SKILL[e.skill].short}). Review this lesson before continuing.`,
    });
  }
  for (const [skill, count] of bySkill) {
    if (count >= 4 && !out.some((p) => p.skill === skill)) out.push({
      key: skill, skill, count, href: `/learn/${skill}`,
      message: `${count} unresolved mistakes in ${SKILL[skill].name}. A focused lesson and practice set will help.`,
    });
  }
  return out.sort((a, b) => b.count - a.count);
}
