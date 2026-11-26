import type { Attempt, Difficulty, Question, Section } from '../types';
import { DISTRACTORS } from '@/data/questions/distractors';
import { estimateTheta, expectedCorrect } from './scoring';

/**
 * Question quality control: automatic flags for a reviewer. Every flag is a reason to look, not a
 * verdict; the dashboard links each one to the question so a person can decide.
 */
export type FlagKind = 'duplicate' | 'similar-choices' | 'length-tell' | 'untagged-distractor' | 'label' | 'reported';
export const FLAG_NAME: Record<FlagKind, string> = {
  duplicate: 'Possible duplicate',
  'similar-choices': 'Two choices nearly the same (ambiguity risk)',
  'length-tell': 'Right answer stands out by length (weak distractors)',
  'untagged-distractor': 'Wrong choice with no named reasoning error',
  label: 'Difficulty label disagrees with results',
  reported: 'Reported by a student',
};
export interface Flag { kind: FlagKind; qid: string; other?: string; detail: string }

/** Content tokens: words of 3+ letters, plus every number and symbol inside math, so formulas count too. */
const words = (s: string) => {
  const math = [...s.matchAll(/\$([^$]*)\$/g)].flatMap((m) => m[1].match(/\\[a-z]+|\d+(?:\.\d+)?|[a-z]|[=<>+\-*/^]/gi) ?? []).map((t, i) => `m${i}:${t}`);
  const text = s.replace(/\$[^$]*\$/g, ' ').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  return new Set([...text, ...math]);
};
const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n / (a.size + b.size - n);
}
const plain = (s: string) => s.replace(/\$[^$]*\$/g, 'x').replace(/[*_]/g, '').trim();

/** Questions whose passage and stem share most of their words with another question's. */
export function duplicates(bank: Question[], threshold = 0.6): Flag[] {
  const sets = bank.map((q) => ({ q, w: words(`${q.passage ?? ''} ${(q.notes ?? []).join(' ')} ${q.stem}`) }));
  const out: Flag[] = [];
  for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
    if (sets[i].q.section !== sets[j].q.section || sets[i].w.size < 8) continue;
    const sim = jaccard(sets[i].w, sets[j].w);
    if (sim >= threshold) out.push({ kind: 'duplicate', qid: sets[i].q.id, other: sets[j].q.id, detail: `${Math.round(sim * 100)}% of the words in the passage and question are shared with ${sets[j].q.id}.` });
  }
  return out;
}

/** Choice-level checks on one question: near-identical choices, a length giveaway, untagged distractors. */
export function choiceFlags(q: Question): Flag[] {
  if (q.type !== 'mcq' || !q.choices) return [];
  const out: Flag[] = [];
  const key = q.answer as number;
  // identical choices are always a defect
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (norm(q.choices[i]) === norm(q.choices[j])) out.push({ kind: 'similar-choices', qid: q.id, detail: `Choices ${'ABCD'[i]} and ${'ABCD'[j]} are identical.` });
  // near-identical wording is an ambiguity risk in reading questions; grammar items legitimately differ only by
  // punctuation, and math choices by a sign or a digit, so those are not compared
  if (q.section === 'rw' && q.domain !== 'sec') {
    const sets = q.choices.map(words);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      if (sets[i].size < 4 || sets[j].size < 4) continue;
      const sim = jaccard(sets[i], sets[j]);
      if (sim >= 0.8) out.push({ kind: 'similar-choices', qid: q.id, detail: `Choices ${'ABCD'[i]} and ${'ABCD'[j]} share ${Math.round(sim * 100)}% of their words${i === key || j === key ? ', and one of them is the key' : ''}.` });
    }
  }
  const len = q.choices.map((c) => plain(c).split(/\s+/).length);
  const others = len.filter((_, i) => i !== key);
  if (len[key] >= 8 && len[key] > 1.6 * Math.max(...others)) out.push({ kind: 'length-tell', qid: q.id, detail: `The key has ${len[key]} words; no other choice has more than ${Math.max(...others)}. Test-wise students pick the longest choice.` });
  if (q.section === 'rw') {
    const tags = DISTRACTORS[q.id];
    const missing = q.choices.map((_, i) => i).filter((i) => i !== key && !tags?.[i]);
    if (missing.length) out.push({ kind: 'untagged-distractor', qid: q.id, detail: `Choice${missing.length > 1 ? 's' : ''} ${missing.map((i) => 'ABCD'[i]).join(', ')} ${missing.length > 1 ? 'have' : 'has'} no named reasoning error, so the app cannot explain the trap.` });
  }
  return out;
}

export interface LabelRow { section: Section; difficulty: Difficulty; n: number; observed: number; expected: number; flag: boolean }
/**
 * Do the difficulty labels behave as labels should, on this student's own first tries? For each section
 * and label: observed accuracy against what the scoring model expects at the student's ability. A label
 * is flagged when, with at least 15 answers, the two differ by more than 20 points. One student's data
 * is a weak signal; many students' data would be needed to re-label individual questions.
 */
export function labelCheck(attempts: Attempt[], getQ: (id: string) => Question | undefined): LabelRow[] {
  const first = new Map<string, Attempt>();
  for (const a of attempts) if (!a.abandoned && !first.has(a.qid)) first.set(a.qid, a);
  const rows = [...first.values()].map((a) => ({ a, q: getQ(a.qid) })).filter((r): r is { a: Attempt; q: Question } => !!r.q);
  const out: LabelRow[] = [];
  for (const section of ['rw', 'math'] as Section[]) {
    const sec = rows.filter((r) => r.q.section === section);
    if (!sec.length) continue;
    const theta = estimateTheta(sec.map((r) => ({ difficulty: r.q.difficulty, type: r.q.type, correct: r.a.correct && r.a.hints === 0 }))).theta;
    for (const d of ['medium', 'hard', 'very-hard', 'elite'] as Difficulty[]) {
      const xs = sec.filter((r) => r.q.difficulty === d);
      if (!xs.length) continue;
      const observed = xs.filter((r) => r.a.correct && r.a.hints === 0).length / xs.length;
      const expected = expectedCorrect(theta, xs.map((r) => ({ difficulty: d, type: r.q.type }))) / xs.length;
      out.push({ section, difficulty: d, n: xs.length, observed, expected, flag: xs.length >= 15 && Math.abs(observed - expected) > 0.2 });
    }
  }
  return out;
}
