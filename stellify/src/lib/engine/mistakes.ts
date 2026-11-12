import type { ErrorCategory, Mistake, Question, SkillId } from '../types';
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

/** First guess at why a question was missed. The student can always re-label it. */
export function autoCategory(q: Question, ms: number, answer: string | null): ErrorCategory {
  if (answer === null || answer === '') return 'time';
  if (ms < q.time * 1000 * 0.3) return 'careless';
  if (ms > q.time * 1000 * 1.9) return 'time';
  if (q.section === 'rw') {
    if (q.domain === 'sec') return 'grammar';
    if (INFERENCE_SKILLS.includes(q.skill)) return 'inference';
    return q.skill === 'wic' ? 'concept' : 'strategy';
  }
  if (q.type === 'spr' && answer) {
    const v = parseNumeric(answer);
    const k = parseNumeric((q.answer as string[])[0]);
    if (v !== null && k !== null && (Math.abs(v + k) < 1e-9 || Math.abs(v - k) <= Math.max(1, Math.abs(k) * 0.1))) return 'calculation';
  }
  return 'concept';
}

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
