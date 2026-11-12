import type { RawQuestion, SkillId } from '@/lib/types';
import { SKILL, SKILLS } from '@/lib/taxonomy';
import { tokenize, plain } from '@/lib/richtext';
import { parseNumeric } from '@/lib/answers';

const words = (s: string) => plain(s).trim().split(/\s+/).filter(Boolean).length;
const norm = (s: string) => plain(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const CLOZE: SkillId[] = ['tra', 'bnd', 'fss'];

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
    // the 20/40/40 mix applies to the SAT-level tiers; Beyond SAT questions are an extra tier on top
    const qs = every.filter((q) => q.d !== 'E');
    if (every.length - qs.length < 16) e.push(`${section}: only ${every.length - qs.length} Beyond SAT questions (need 16)`);
    if (qs.length < min) e.push(`${section}: ${qs.length} questions (need ${min})`);
    const share = (d: string) => qs.filter((q) => q.d === d).length / Math.max(1, qs.length);
    const target = { M: 0.2, H: 0.4, V: 0.4 } as const;
    for (const d of ['M', 'H', 'V'] as const) {
      if (Math.abs(share(d) - target[d]) > 0.04) e.push(`${section}: difficulty ${d} share ${(share(d) * 100).toFixed(1)}% (target ${target[d] * 100}%)`);
    }
    const mcq = every.filter((q) => q.choices);
    for (let i = 0; i < 4; i++) {
      const p = mcq.filter((q) => q.answer === i).length / Math.max(1, mcq.length);
      if (p < 0.19 || p > 0.31) e.push(`${section}: correct answer in position ${'ABCD'[i]} ${(p * 100).toFixed(1)}% of the time (want 19–31%)`);
    }
  }
  for (const s of SKILLS) {
    const qs = all.filter((q) => q.skill === s.id);
    for (const d of ['M', 'H', 'V'] as const) {
      if (!qs.some((q) => q.d === d)) e.push(`skill ${s.id} has no ${d} question`);
    }
  }
  return e;
}
