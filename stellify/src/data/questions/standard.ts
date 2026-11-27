/**
 * The Stellify question standard: the owner's 15 rules (2026-11-27), made checkable.
 *
 * A difficulty ladder is kept (owner's choice): rules 1–8 apply to every original question; rules 9–15, the features
 * of College Board hard questions, apply to the hard tiers (H, V, E). Rules a computer can measure are measured;
 * rules that need judgment (a teacher's check, a bias check, outside knowledge) must be recorded in `meta.review`,
 * and the reviewer is named honestly (an AI teacher pass is recorded as one, never as a person).
 */
import type { RawQuestion } from '@/lib/types';
import { SKILL } from '@/lib/taxonomy';
import { DISTRACTORS } from './distractors';
import { CB_BAR, passageComplexity } from './rules';

export type RuleId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export const RULES: Record<RuleId, string> = {
  1: 'Hard tiers match College Board hard questions (all hard-question rules below pass)',
  2: 'Reading and Writing passages come from a real, checked source; keyed answers avoid absolute words',
  3: 'All needed information is given; one defensible answer; no trick wording or double negatives',
  4: 'Each wrong choice is a realistic student mistake',
  5: 'Real-world settings give enough context; no outside specialist knowledge',
  6: 'Choices match in grammar, length and format',
  7: 'A teacher check of the math, grammar or reading logic',
  8: 'A bias and clarity check',
  9: 'Hard passages: long, complex sentences and demanding vocabulary',
  10: 'Hard reasoning: a claim or hypothesis plus evidence, and a precise logical step',
  11: 'Hard grammar: the error is hidden behind an interruption',
  12: 'Hard math: two or more topics combined',
  13: 'Hard math: abstract constants instead of only numbers',
  14: 'Hard math: an extra final step (the twist)',
  15: 'Hard math: every wrong choice is the result of a specific, predictable mistake',
};

export interface Issue { rule: RuleId; msg: string }

const plain = (s: string) => s.replace(/\$[^$]*\$/g, ' x ').replace(/[*_`#>]/g, ' ');
const words = (s: string) => plain(s).trim().split(/\s+/).filter(Boolean).length;
const isHard = (q: RawQuestion) => q.d !== 'M';
const isMath = (q: RawQuestion) => SKILL[q.skill]?.section === 'math';
const ABSOLUTE = /\b(always|never|all|none|only|every|entirely|completely|impossible|certainly|must|cannot|no one|nothing)\b/i;
const TRICK = /\bNOT\b|\bEXCEPT\b|\bLEAST\b|\bnot\b[^.?]*\bnot\b|\bnot un|\bnever\b[^.?]*\bnot\b/;
const URL = /^https:\/\/\S+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const GRAMMAR = new Set(['bnd', 'fss']);
const REASONING = new Set(['coet', 'coeq', 'inf']);

function parity(q: RawQuestion): string[] {
  const c = q.choices; if (!c || c.length !== 4 || typeof q.answer !== 'number') return [];
  const out: string[] = [];
  const key = q.answer, len = c.map(words), others = len.filter((_, i) => i !== key);
  if (Math.max(...len) >= 5) {
    if (len[key] > Math.max(...others) && len[key] >= 1.3 * Math.max(...others)) out.push(`the answer is much longer than every other choice (${len[key]} vs at most ${Math.max(...others)} words)`);
    if (len[key] < Math.min(...others) && len[key] <= 0.7 * Math.min(...others)) out.push(`the answer is much shorter than every other choice (${len[key]} vs at least ${Math.min(...others)} words)`);
  }
  const ends = new Set(c.map((x) => (/[.!?]$/.test(x.trim()) ? '.' : /[,;:—-]$/.test(x.trim()) ? ',' : '')));
  if (ends.size > 1) out.push('choices end differently (some with punctuation, some without)');
  const math = new Set(c.map((x) => x.includes('$')));
  if (math.size > 1) out.push('some choices are math and some are text');
  if (!isMath(q) && !GRAMMAR.has(q.skill)) {
    const caps = new Set(c.map((x) => /^[A-Z]/.test(x.trim().replace(/^[“"‘']/, ''))));
    if (caps.size > 1) out.push('some choices start with a capital letter and some do not');
  }
  return out;
}

/** Every way a question falls short of the standard (empty = it meets it). */
export function standardIssues(q: RawQuestion): Issue[] {
  const e: Issue[] = [];
  const m = q.meta ?? {};
  const hard = isHard(q), math = isMath(q);
  const keyText = q.choices && typeof q.answer === 'number' ? q.choices[q.answer] : '';

  // 2. sourcing (Reading and Writing) and non-absolute keys
  if (!math) {
    const src = m.source;
    if (!src) e.push({ rule: 2, msg: 'no real source recorded for the passage' });
    else {
      if (!src.cite || src.cite.length < 12) e.push({ rule: 2, msg: 'the citation is missing or too short' });
      if (!URL.test(src.url)) e.push({ rule: 2, msg: 'the source has no checkable https link' });
      if (!DATE.test(src.checked)) e.push({ rule: 2, msg: 'the source has no date it was checked' });
    }
    if (keyText && ABSOLUTE.test(plain(keyText)) && !GRAMMAR.has(q.skill) && q.skill !== 'wic') e.push({ rule: 2, msg: `the keyed answer uses an absolute word ("${plain(keyText).match(ABSOLUTE)![0]}")` });
  }
  // 3. one defensible answer, no trick wording
  if (TRICK.test(q.stem)) e.push({ rule: 3, msg: 'the question uses NOT/EXCEPT/LEAST or a double negative' });
  if (math && !q.check) e.push({ rule: 3, msg: 'no independent check that the keyed answer is the only right one' });
  // 4. realistic wrong answers
  if (q.choices && typeof q.answer === 'number') {
    if (math) {
      const mk = m.mistakes;
      if (!mk || mk.length !== 4) e.push({ rule: 4, msg: 'the mistake behind each wrong choice is not recorded' });
      else q.choices.forEach((_, i) => { if (i !== q.answer && !(mk[i] && mk[i]!.length >= 12)) e.push({ rule: 4, msg: `choice ${'ABCD'[i]} has no recorded mistake` }); });
    } else {
      const tags = DISTRACTORS[q.id];
      q.choices.forEach((_, i) => { if (i !== q.answer && !tags?.[i]) e.push({ rule: 4, msg: `choice ${'ABCD'[i]} is not tagged with the reasoning error it represents` }); });
    }
    q.why.forEach((w, i) => { if (i !== q.answer && words(w) < 8) e.push({ rule: 4, msg: `the explanation of choice ${'ABCD'[i]} is too thin to name the mistake` }); });
  }
  // 5, 7, 8. the judgment checks, recorded
  const r = m.review;
  if (!r) for (const rule of [5, 7, 8] as RuleId[]) e.push({ rule, msg: 'not reviewed yet' });
  else {
    if (!r.teacher || r.teacher.length < 20) e.push({ rule: 7, msg: 'the teacher check is not described' });
    if (!r.bias || r.bias.length < 20) e.push({ rule: 8, msg: 'the bias and clarity check is not described' });
    if (!DATE.test(r.date)) e.push({ rule: 7, msg: 'the review has no date' });
  }
  // 6. choice parity
  for (const p of parity(q)) e.push({ rule: 6, msg: p });

  if (hard) {
    if (!math) {
      // 9. complex passages (synthesis notes and the two grammar skills are measured differently)
      if (q.passage && q.skill !== 'syn' && !GRAMMAR.has(q.skill)) {
        const lit = /^The following text is (from|adapted from)/.test(q.passage.trim());
        const c = passageComplexity(q.passage.replace(/^The following text[^\n]*\n+/, ''));
        const [w, l] = lit ? [CB_BAR.litWordsPerSentence, CB_BAR.litLongWordPct] : [CB_BAR.wordsPerSentence, CB_BAR.longWordPct];
        if (c.wordsPerSentence < w) e.push({ rule: 9, msg: `sentences average ${c.wordsPerSentence.toFixed(1)} words (College Board hard: ${w}+)` });
        if (c.longWordPct < l) e.push({ rule: 9, msg: `${c.longWordPct.toFixed(1)}% long words (College Board hard: ${l}%+)` });
      }
      // 10. claim + evidence + a precise step
      if (REASONING.has(q.skill) && q.passage && !/\b(hypothes|argue|claim|propos|suggest|contend|conclud|predict|theor|maintain)/i.test(q.passage) && !q.figure) e.push({ rule: 10, msg: 'no hypothesis or claim for the evidence to bear on' });
      if (q.skill === 'coeq' && !q.figure && !/\|/.test(q.passage ?? '')) e.push({ rule: 10, msg: 'a data question without a table or graph' });
      // 11. hidden grammar errors
      if (GRAMMAR.has(q.skill)) {
        if (!m.hides) e.push({ rule: 11, msg: 'the interruption hiding the error is not recorded' });
        else if (!plain(q.passage ?? '').includes(plain(m.hides).slice(0, 25))) e.push({ rule: 11, msg: 'the recorded interruption is not in the passage' });
      }
    } else {
      // 12. combined topics
      if (!m.concepts || m.concepts.length < 2) e.push({ rule: 12, msg: 'does not record two or more combined topics' });
      // 13. abstract constants
      const tex = (q.stem.match(/\$[^$]+\$/g) ?? []).join(' ').replace(/\\[a-zA-Z]+/g, ' ');
      // any single letter other than the usual variables (x, y, z), function names (f, g) and e, i counts as a constant
      if (!/(^|[^a-zA-Z\\])[a-dh-wA-Z]([^a-zA-Z]|$)/.test(tex.replace(/\b[a-z]{2,}\b/g, ' '))) e.push({ rule: 13, msg: 'uses only numbers (no constant such as a, b, c or k)' });
      // 14. the twist
      if (!m.twist || m.twist.length < 12) e.push({ rule: 14, msg: 'no extra final step recorded' });
      // 15. engineered distractors: covered by the recorded mistakes (rule 4) plus their exactness
      if (m.mistakes && q.choices) q.choices.forEach((_, i) => { if (i !== q.answer && m.mistakes![i] && !/\b(forget|forgot|drop|flip|sign|wrong|instead|stop|square|swap|revers|miss|add|subtract|multipl|divid|confus|treat|use|solve|answer|only|both|half|double|split|assum|pick|match|keep|copy|misread|read|count|ignor|round|scale|factor|check|skip|cancel|invert|mix)/i.test(m.mistakes![i]!)) e.push({ rule: 15, msg: `the mistake for choice ${'ABCD'[i]} does not name a specific error` }); });
    }
    // 1. hard means all of the hard-question rules pass
    if (e.some((x) => x.rule >= 9)) e.push({ rule: 1, msg: 'below College Board hard level (see the rules above)' });
  }
  return e;
}
