import type { RawQuestion, SkillId } from '@/lib/types';
import { DOMAINS, SKILL, SKILLS } from '@/lib/taxonomy';
import { tokenize, plain } from '@/lib/richtext';
import { parseNumeric } from '@/lib/answers';

const words = (s: string) => plain(s).trim().split(/\s+/).filter(Boolean).length;
const norm = (s: string) => plain(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const CLOZE: SkillId[] = ['tra', 'bnd', 'fss'];

/**
 * College Board Reading and Writing question specifications.
 * Official stem wording for each skill, as used in the Student Question Bank and the Digital SAT.
 */
const Q = `["“'][^"”']+["”']`;
export const OFFICIAL_STEMS: Partial<Record<SkillId, RegExp[]>> = {
  cid: [/^Which choice best states the main idea of the text\?$/, /^According to the text, .+\?$/, /^Based on the text, .+\?$/, /^What does the text most strongly suggest about .+\?$/],
  coet: [/^Which quotation from .+ most effectively illustrates the claim\?$/, /^Which finding, if true, would most directly (support|weaken) .+\?$/, /^Which quotation from .+ would most directly support the claim made in the text\?$/],
  coeq: [/^Which choice most effectively uses data from the (table|graph) to complete the (statement|text|example)\?$/, /^Which choice best describes data from the (table|graph) that support .+\?$/, /^Which choice uses data from the (table|graph) to most effectively support .+\?$/],
  inf: [/^Which choice most logically completes the text\?$/],
  wic: [/^Which choice completes the text with the most logical and precise word or phrase\?$/, new RegExp(`^As used in the text, what does the word ${Q} most nearly mean\\?$`)],
  tsp: [/^Which choice best describes the function of the underlined (sentence|portion) in the text as a whole\?$/, /^Which choice best describes the overall structure of the text\?$/, /^Which choice best states the main purpose of the text\?$/, /^Which choice best describes the function of the (first|second|third|fourth|last) sentence in the overall structure of the text\?$/],
  ctc: [/^Based on the texts, .+(\?|\.\.\.|…)?$/],
  tra: [/^Which choice completes the text with the most logical transition\?$/],
  syn: [/^While researching a topic, a student has taken the following notes\. The student wants to .+\. Which choice most effectively uses relevant information from the notes to accomplish this goal\?$/],
  bnd: [/^Which choice completes the text so that it conforms to the conventions of Standard English\?$/],
  fss: [/^Which choice completes the text so that it conforms to the conventions of Standard English\?$/],
};

/** Passage length rule from the R&W section specifications: 25–150 words (each text of a pair). */
export const PASSAGE_WORDS = { min: 25, max: 150 } as const;

/** Checks every Reading and Writing question against the College Board question specifications. */
export function cbSpecChecks(q: RawQuestion): string[] {
  const e: string[] = [];
  if (SKILL[q.skill]?.section !== 'rw') return e;
  // 1. skill alignment: the stem must be the official wording for the tested skill
  const stems = OFFICIAL_STEMS[q.skill];
  if (stems && !stems.some((r) => r.test(q.stem.trim()))) e.push(`stem is not the official College Board wording for ${q.skill}: "${q.stem.slice(0, 70)}"`);
  // 2. appropriate length: 25–150 words per text (rhetorical synthesis notes count as the text)
  const texts = q.skill === 'syn' ? [(q.notes ?? []).join(' ')] : q.skill === 'ctc' ? (q.passage ?? '').split(/\*\*Text 2\*\*|Text 2\b/) : [q.passage ?? ''];
  texts.forEach((t, i) => {
    const n = words(t.replace(/\*\*Text 1\*\*|Text 1\b/, ''));
    if (n < PASSAGE_WORDS.min || n > PASSAGE_WORDS.max) e.push(`${texts.length > 1 ? `text ${i + 1}` : 'passage'} is ${n} words (spec: ${PASSAGE_WORDS.min}–${PASSAGE_WORDS.max})`);
  });
  // 3. no unintentional clues: the key must not stand out as by far the longest choice
  if (q.choices && typeof q.answer === 'number') {
    const len = q.choices.map(words);
    const others = len.filter((_, i) => i !== q.answer);
    if (len[q.answer] > 1.6 * Math.max(...others) && len[q.answer] - Math.max(...others) >= 4) e.push('length clue: the correct choice is much longer than every distractor');
    // answer-choice parallelism: all four choices should be the same kind of thing
    if (q.skill === 'wic' && len.some((n) => n > 4)) e.push('words-in-context choices should be single words or short phrases');
    if (Math.max(...len) > 4 * Math.max(1, Math.min(...len)) && Math.max(...len) - Math.min(...len) > 12) e.push('choices are not parallel in length or form');
  }
  return e;
}

/** Per-question validation. Returns a list of problems (empty = valid). */
export function validateQuestion(q: RawQuestion, renderMath?: (tex: string) => void): string[] {
  const e: string[] = [];
  const skill = SKILL[q.skill];
  if (!/^[a-z0-9-]+$/.test(q.id)) e.push('id must be lowercase alphanumeric/hyphen');
  if (!skill) return [...e, `unknown skill "${q.skill}"`];
  if (!['M', 'H', 'V', 'E'].includes(q.d)) e.push('invalid difficulty');
  if (!q.sub || q.sub.length < 3) e.push('missing subskill');
  if (!q.stem || q.stem.length < 12) e.push('missing stem');

  const isMcq = Array.isArray(q.choices);
  if (isMcq) {
    const c = q.choices!;
    if (c.length !== 4) e.push(`expected 4 choices, found ${c.length}`);
    if (new Set(c.map(norm)).size !== c.length && new Set(c.map((x) => x.trim())).size !== c.length) e.push('duplicate answer choices');
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) e.push('mcq answer must be an index 0–3');
    if (q.why.length !== 4) e.push(`need a rationale for each of the 4 choices, found ${q.why.length}`);
  } else {
    if (!Array.isArray(q.answer) || q.answer.length === 0) e.push('spr needs at least one accepted answer');
    else {
      const vals = q.answer.map(parseNumeric);
      if (vals.some((v) => v === null)) e.push('spr accepted answers must be numeric');
      else if (vals.some((v) => Math.abs((v as number) - (vals[0] as number)) > 1e-3)) e.push('spr accepted answers are not equivalent');
    }
    if (q.why.length < 2) e.push('spr needs at least two explained common wrong answers');
  }
  q.why.forEach((w, i) => { if (!w || w.length < 25) e.push(`rationale ${i + 1} is missing or too thin`); });
  if (new Set(q.why).size !== q.why.length) e.push('rationales must be distinct');

  if (!q.steps || q.steps.length < 2) e.push('solution needs at least two steps');
  else if (q.steps.join(' ').length < 90) e.push('solution is too thin to teach anything');
  for (const f of ['concept', 'strategy', 'trap', 'remember'] as const) {
    if (!q[f] || q[f].length < 20) e.push(`"${f}" is missing or too thin`);
  }

  if (skill.section === 'rw') {
    e.push(...cbSpecChecks(q));
    if (q.skill === 'syn') {
      if (!q.notes || q.notes.length < 3) e.push('rhetorical synthesis needs at least 3 notes');
    } else {
      if (!q.passage) e.push('reading & writing question needs a passage');
      else {
        const n = words(q.passage);
        if (n < 20 || n > 175) e.push(`passage length ${n} words is outside the 20–175 range`);
        if (CLOZE.includes(q.skill) && !/_{5,}/.test(q.passage)) e.push('this skill requires a blank (______) in the passage');
        if (q.skill === 'ctc' && !(q.passage.includes('Text 1') && q.passage.includes('Text 2'))) e.push('cross-text question needs Text 1 and Text 2');
      }
    }
    if (q.skill === 'coeq' && !q.figure) e.push('quantitative evidence question needs a table or graph');
    if (!isMcq) e.push('reading & writing questions are multiple choice');
  } else {
    if (typeof q.check !== 'function') e.push('math question is missing its independent check()');
    else {
      try { if (q.check() !== true) e.push('independent check() did not confirm the keyed answer'); }
      catch (err) { e.push(`check() threw: ${(err as Error).message}`); }
    }
  }

  if (q.figure) {
    const f = q.figure;
    if (f.kind === 'table' && f.rows.some((row) => row.length !== f.headers.length)) e.push('table row width does not match headers');
    if ((f.kind === 'bar') && f.series.some((s) => s.values.length !== f.categories.length)) e.push('bar series length mismatch');
    if ((f.kind === 'line') && f.series.some((s) => s.values.length !== f.x.length)) e.push('line series length mismatch');
  }

  if (renderMath) {
    const all = [q.passage, q.stem, ...(q.choices ?? []), ...(q.notes ?? []), ...q.steps, ...q.why, q.concept, q.strategy, q.trap, q.remember, q.desmos, q.alt].filter(Boolean) as string[];
    for (const s of all) {
      for (const t of tokenize(s)) {
        if (t.t === 'math' || t.t === 'dmath') {
          try { renderMath(t.v); } catch (err) { e.push(`KaTeX error in "${t.v}": ${(err as Error).message.slice(0, 80)}`); }
        }
      }
      // a stray unescaped dollar sign means broken math delimiters
      if ((s.replace(/\\\$/g, '').match(/\$/g) ?? []).length % 2 !== 0) e.push(`unbalanced $ in: ${s.slice(0, 50)}…`);
    }
  }
  return e;
}

/** Bank-level validation: duplicates, coverage and distribution. */
export function validateBank(all: RawQuestion[], opts: { minPerSection?: number } = {}): string[] {
  const e: string[] = [];
  const min = opts.minPerSection ?? 150;
  const seen = new Set<string>();
  const stems = new Map<string, string>();
  for (const q of all) {
    if (seen.has(q.id)) e.push(`duplicate id ${q.id}`);
    seen.add(q.id);
    const key = norm((q.passage ?? '') + ' ' + (q.notes ?? []).join(' ') + ' ' + q.stem + ' ' + (q.choices ?? []).join(' '));
    if (stems.has(key)) e.push(`duplicate content: ${q.id} and ${stems.get(key)}`);
    stems.set(key, q.id);
  }
  for (const section of ['math', 'rw'] as const) {
    const every = all.filter((q) => SKILL[q.skill]?.section === section);
    // the 15/40/45 mix (±5 points) applies to the SAT-level tiers; Beyond SAT questions are an extra tier on top.
    // It was 20/40/40 until the owner asked for many more questions at the College Board's hard level (DECISIONS 35).
    const qs = every.filter((q) => q.d !== 'E');
    if (every.length - qs.length < 16) e.push(`${section}: only ${every.length - qs.length} Beyond SAT questions (need 16)`);
    if (qs.length < min) e.push(`${section}: ${qs.length} questions (need ${min})`);
    const share = (d: string) => qs.filter((q) => q.d === d).length / Math.max(1, qs.length);
    const target = { M: 0.15, H: 0.4, V: 0.45 } as const;
    for (const d of ['M', 'H', 'V'] as const) {
      if (Math.abs(share(d) - target[d]) > 0.05) e.push(`${section}: difficulty ${d} share ${(share(d) * 100).toFixed(1)}% (target ${target[d] * 100}%)`);
    }
    const mcq = every.filter((q) => q.choices);
    for (let i = 0; i < 4; i++) {
      const p = mcq.filter((q) => q.answer === i).length / Math.max(1, mcq.length);
      if (p < 0.19 || p > 0.31) e.push(`${section}: correct answer in position ${'ABCD'[i]} ${(p * 100).toFixed(1)}% of the time (want 19–31%)`);
    }
  }
  // the four R&W content domains should appear in roughly the proportions of the Digital SAT
  const rw = all.filter((q) => SKILL[q.skill]?.section === 'rw');
  for (const dom of DOMAINS.filter((x) => x.section === 'rw')) {
    const share = rw.filter((q) => SKILL[q.skill].domain === dom.id).length / Math.max(1, rw.length);
    if (Math.abs(share - dom.weight) > 0.03) e.push(`rw: ${dom.name} is ${(share * 100).toFixed(1)}% of the bank (Digital SAT ≈ ${dom.weight * 100}%)`);
  }
  for (const s of SKILLS) {
    const qs = all.filter((q) => q.skill === s.id);
    for (const d of ['M', 'H', 'V'] as const) {
      if (!qs.some((q) => q.d === d)) e.push(`skill ${s.id} has no ${d} question`);
    }
  }
  return e;
}
