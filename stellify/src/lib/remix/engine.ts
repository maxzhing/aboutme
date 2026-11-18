import { genreOf } from '@/data/questions/genres';
import { CAUSE } from '../engine/mistakes';
import { DEFAULT_TIME, SKILL } from '../taxonomy';
import type { AnswerConfidence, Difficulty, ErrorCategory, Question, SkillId } from '../types';
import { rng } from '../util';
import { MATH_FAMILIES } from './math';
import { RW_FAMILIES, RW_MODES, type RwCtx } from './rw';
import { LEVEL_NAME, MODE_INFO, type Candidate, type RemixLevel, type RemixMeta, type RemixMode, type RemixQuestion } from './types';
import { grams, signature, validate, type ValidateContext } from './validate';

/**
 * The Remix engine: picks the generator for a question's skill, generates a candidate, runs the independent
 * validator, and retries with a fresh seed (up to MAX_ATTEMPTS) until one passes. Nothing that failed a
 * check is ever shown to a student; the failed attempts are kept on the item for reviewers.
 */
export const MAX_ATTEMPTS = 6;
/** a chain stops growing here, so a session stays focused and storage stays small */
export const MAX_CHAIN = 8;
export const MODES: RemixMode[] = ['number', 'context', 'representation', 'reverse', 'reasoning', 'challenge'];

const LEVEL_OF: Record<Difficulty, RemixLevel> = { medium: 3, hard: 4, 'very-hard': 5, elite: 5 };
/** The remix level that matches a question's own difficulty. */
export function levelFor(q: Question): RemixLevel {
  if ('remix' in q && (q as RemixQuestion).remix) return (q as RemixQuestion).remix.level;
  if (q.cbDifficulty) return q.cbDifficulty === 'Easy' ? 2 : q.cbDifficulty === 'Medium' ? 3 : 4;
  return LEVEL_OF[q.difficulty] ?? 3;
}
export const bump = (l: RemixLevel, by: number): RemixLevel => Math.min(5, Math.max(1, l + by)) as RemixLevel;
const DIFF_OF: Record<RemixLevel, Difficulty> = { 1: 'medium', 2: 'medium', 3: 'medium', 4: 'hard', 5: 'very-hard' };

export interface ModeOption { mode: RemixMode; ok: boolean; note: string }
/** Which transformations make sense for this question, and an honest note for each one that does not. */
export function modesFor(q: Question): ModeOption[] {
  const math = MATH_FAMILIES[q.skill];
  if (math) return MODES.map((m) => ({ mode: m, ok: true, note: math.exact ? MODE_INFO[m].blurb : `${MODE_INFO[m].blurb} Uses the ${math.name} family, the closest one Stellify can generate and check for this skill.` }));
  const rw = RW_MODES[q.skill];
  if (rw) return MODES.map((m) => ({ mode: m, ok: !!rw[m], note: rw[m] ?? `${MODE_INFO[m].name} does not fit ${SKILL[q.skill].name} questions, so it is not offered rather than faked.` }));
  return MODES.map((m) => ({ mode: m, ok: false, note: 'Remix Studio does not generate this kind of question yet.' }));
}
export function remixable(q: Question | undefined): { ok: boolean; reason?: string } {
  if (!q) return { ok: false, reason: 'That question could not be found.' };
  if (q.section !== 'math' && q.section !== 'rw') return { ok: false, reason: 'Remix Studio covers SAT Math and Reading & Writing questions.' };
  if (!MATH_FAMILIES[q.skill] && !RW_FAMILIES[q.skill]) return { ok: false, reason: `Remix Studio cannot generate ${SKILL[q.skill]?.name ?? 'this skill'} questions yet.` };
  return { ok: true };
}

/** 8-word runs of every passage a remix must not copy (the bank plus any official material on this device). */
export function buildCorpus(questions: Iterable<Question>): Set<string> {
  const out = new Set<string>();
  for (const q of questions) {
    if ('remix' in q) continue;
    for (const g of grams(`${q.passage ?? ''} ${(q.notes ?? []).join(' ')}`)) out.add(g);
  }
  return out;
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const ORIGINAL = 'Stellify Remix Studio (generated original practice; not an official College Board question)';

export interface GenerateArgs {
  /** the question being remixed (the original, or the previous step of a chain) */
  parent: Question;
  /** the original the chain started from */
  originId: string;
  chainId: string;
  mode: RemixMode;
  level: RemixLevel;
  /** signatures of variations already made from this original (never repeated) */
  previous?: string[];
  corpus?: Set<string>;
  seed?: string;
  now?: number;
  smart?: string;
  /** a candidate from the optional AI path; validated exactly like a local one */
  aiCandidate?: Candidate | null;
}
export type GenerateResult = { ok: true; question: RemixQuestion; attempts: number } | { ok: false; reason: string; rejected: string[] };

/** Builds the question the student sees from a candidate that passed validation. */
export function toQuestion(c: Candidate, meta: RemixMeta): RemixQuestion {
  const skill = SKILL[c.skill];
  const difficulty = DIFF_OF[c.level];
  return {
    id: `gx-${hash(`${meta.originId}|${signature(c)}`)}`, skill: c.skill, sub: c.sub, section: skill.section, domain: skill.domain, difficulty,
    type: Array.isArray(c.choices) ? 'mcq' : 'spr', time: DEFAULT_TIME[skill.section][difficulty],
    passage: c.passage, notes: c.notes, figure: c.figure, stem: c.stem, choices: c.choices, answer: c.answer,
    steps: c.steps, why: c.why, concept: c.concept, strategy: c.strategy, trap: c.trap, remember: c.remember, hints: c.hints,
    source: ORIGINAL, license: 'Original generated work, free for personal educational use',
    validation: meta.validation.ok ? 'validated' : 'unvalidated', created: new Date(meta.createdAt).toISOString().slice(0, 10), remix: meta,
  };
}

function rwCtx(p: Question): RwCtx {
  return { genre: genreOf(p) ?? undefined, sub: p.sub, passage: `${p.passage ?? ''} ${(p.notes ?? []).join(' ')}`, answerText: typeof p.answer === 'number' && p.choices ? p.choices[p.answer] : undefined };
}

/** Generate → validate → retry. Returns a validated question or an honest reason it could not make one. */
export function generate(a: GenerateArgs): GenerateResult {
  const { parent, mode, level } = a;
  const can = remixable(parent);
  if (!can.ok) return { ok: false, reason: can.reason!, rejected: [] };
  const opt = modesFor(parent).find((m) => m.mode === mode);
  if (!opt?.ok) return { ok: false, reason: opt?.note ?? 'That transformation is not available here.', rejected: [] };
  const now = a.now ?? Date.now();
  const previous = a.previous ?? [];
  const vctx: ValidateContext = { originText: parent.passage, corpus: a.corpus, previous, allowedSkills: [parent.skill] };
  const rejected: string[] = [];
  const tryOne = (c: Candidate | null, method: RemixMeta['method']): RemixQuestion | null => {
    if (!c) { rejected.push(`${method}: the generator could not build a well-formed question with these values`); return null; }
    const v = validate(c, vctx);
    if (!v.ok) { rejected.push(`${method}: ${v.checks.filter((k) => !k.pass).map((k) => `${k.name}${k.detail ? ` (${k.detail})` : ''}`).join('; ')}`); return null; }
    const meta: RemixMeta = {
      v: 1, originId: a.originId, parentId: parent.id === a.originId ? undefined : parent.id, chainId: a.chainId, mode, level: c.level, method, family: c.family, createdAt: now,
      validation: v, rejected: [...rejected],
      // AI-written Reading & Writing passes the structural checks but its prose still deserves a human look
      status: method === 'ai' && parent.section === 'rw' ? 'needs-review' : 'auto-validated',
      differs: c.differs, smart: a.smart,
    };
    return toQuestion(c, meta);
  };
  if (a.aiCandidate !== undefined) {
    const q = tryOne(a.aiCandidate, 'ai');
    if (q) return { ok: true, question: q, attempts: 1 };
  }
  const seed = a.seed ?? `${a.chainId}-${now}`;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const r = rng(`${seed}-${i}`);
    let c: Candidate | null = null;
    try {
      const m = MATH_FAMILIES[parent.skill];
      c = m ? m.family(r, level, mode, parent.skill) : RW_FAMILIES[parent.skill]!.family(r, level, mode, rwCtx(parent));
    } catch (e) { rejected.push(`local: generator error (${(e as Error).message})`); continue; }
    const q = tryOne(c, 'local');
    if (q) return { ok: true, question: q, attempts: i + 1 + (a.aiCandidate !== undefined ? 1 : 0) };
  }
  return { ok: false, reason: `No variation passed every check after ${MAX_ATTEMPTS} tries, so none is shown. Try another transformation or level.`, rejected };
}

// ───────────────────────── Smart Remix ─────────────────────────
export interface SmartInput {
  question: Question;
  /** the student's latest attempt on this question, if any */
  last?: { correct: boolean; confidence?: AnswerConfidence; ms?: number };
  /** the diagnosed (or student-chosen) cause if it is in the Mistake Bucket */
  mistake?: ErrorCategory;
  /** the student's record on this skill */
  skill?: { n: number; acc: number };
  /** results of earlier steps in this chain, oldest first */
  chain?: { mode: RemixMode; level: RemixLevel; correct?: boolean }[];
}
export interface SmartPick { mode: RemixMode; level: RemixLevel; reason: string }
/** Chooses the transformation most likely to help, and says why in plain words. */
export function smartPick(s: SmartInput): SmartPick {
  const ok = new Set(modesFor(s.question).filter((m) => m.ok).map((m) => m.mode));
  const first = (...ms: RemixMode[]) => ms.find((m) => ok.has(m)) ?? 'number';
  const base = levelFor(s.question);
  const done = (s.chain ?? []).filter((c) => c.correct !== undefined);
  const lastStep = done[done.length - 1];
  if (lastStep) {
    if (!lastStep.correct) return { mode: first('number', 'context'), level: bump(lastStep.level, -1), reason: `You missed the last ${MODE_INFO[lastStep.mode].name.toLowerCase()}, so this one keeps the same idea one level easier (${LEVEL_NAME[bump(lastStep.level, -1)]}) to rebuild it.` };
    const streak = [...done].reverse().findIndex((c) => !c.correct);
    if ((streak === -1 ? done.length : streak) >= 2) return { mode: first('challenge', 'reasoning', 'reverse'), level: bump(lastStep.level, 1), reason: `Two right in a row, so the next step is harder (${LEVEL_NAME[bump(lastStep.level, 1)]}).` };
    const fresh = MODES.filter((m) => ok.has(m) && !done.some((c) => c.mode === m) && m !== 'challenge');
    if (fresh.length) return { mode: fresh[0], level: lastStep.level, reason: `You got the ${MODE_INFO[lastStep.mode].name.toLowerCase()} right; a ${MODE_INFO[fresh[0]].name.toLowerCase()} checks the same idea from a new angle.` };
  }
  if (s.last && !s.last.correct) {
    const cause = s.mistake ? CAUSE[s.mistake] : undefined;
    if (cause === 'Misreading') return { mode: first('representation', 'context'), level: base, reason: 'You missed this one by misreading it, so the same idea comes in a different form: you will have to read what is actually asked.' };
    if (cause === 'Careless or calculation slip') return { mode: 'number', level: base, reason: 'This looked like a slip rather than a gap, so here is the same method with new values. Check each step before you choose.' };
    if (cause === 'Time pressure') return { mode: 'number', level: bump(base, -1), reason: 'You ran short of time here, so this version is one level easier, to make the method quicker.' };
    return { mode: 'number', level: bump(base, -1), reason: `You missed this one${cause ? ' and it looks like a gap in the method' : ''}, so here is the same concept with new values, one level easier (${LEVEL_NAME[bump(base, -1)]}), to rebuild it step by step.` };
  }
  if (s.last?.correct && s.last.confidence && s.last.confidence !== 'sure') return { mode: 'number', level: base, reason: `You got this right but said you were ${s.last.confidence === 'guess' ? 'guessing' : 'unsure'}. A fresh version shows whether you really know it.` };
  if (s.last?.correct && s.skill && s.skill.n >= 5 && s.skill.acc >= 0.8) return { mode: first('challenge'), level: bump(base, 1), reason: `You are strong on ${SKILL[s.question.skill].name} (${Math.round(s.skill.acc * 100)}% over ${s.skill.n} questions), so this is a harder application.` };
  if (s.last?.correct) return { mode: first('reverse', 'reasoning', 'representation', 'context'), level: base, reason: 'You know the forward method; this asks you to use the idea in a different way, which tests whether you understand why it works.' };
  return { mode: 'number', level: base, reason: 'You have not answered this question yet, so the first remix keeps everything the same except the details.' };
}
export type { SkillId };
