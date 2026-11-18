import type { Figure, Question, SkillId } from '../types';

/**
 * Remix Studio: transforms a question into genuinely different questions testing the same concept.
 * Every generated question carries a machine-checkable SPEC of what it asks, and must pass the independent
 * validator (validate.ts) before a student sees it.
 */
export type RemixMode = 'number' | 'context' | 'representation' | 'reverse' | 'reasoning' | 'challenge';
export type RemixLevel = 1 | 2 | 3 | 4 | 5;
export const LEVEL_NAME: Record<RemixLevel, string> = { 1: 'Foundation', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Advanced SAT Challenge' };
export const LEVEL_MEANS: Record<RemixLevel, string> = {
  1: 'One step, friendly numbers, the concept in its plainest form.',
  2: 'One or two steps, a little more to read or compute.',
  3: 'Typical SAT: two or three steps, plausible traps.',
  4: 'Several steps or constraints, distractors built on real misconceptions.',
  5: 'Hardest SAT style: combined ideas, unfamiliar setting, subtle traps (never beyond the SAT).',
};
export const MODE_INFO: Record<RemixMode, { name: string; blurb: string; example: string; effect: 'preserve' | 'increase' }> = {
  number: { name: 'Number Remix', blurb: 'Same concept, new values: proves you know the method, not the answer.', example: '4x + 8 = 28 → 7x − 6 = 43', effect: 'preserve' },
  context: { name: 'Context Remix', blurb: 'The same idea in a new situation or subject.', example: 'an equation → a subscription fee problem', effect: 'preserve' },
  representation: { name: 'Representation Remix', blurb: 'The same idea shown another way: graph, table, equation or words.', example: 'solve an equation → read an x-intercept from a table', effect: 'preserve' },
  reverse: { name: 'Reverse Remix', blurb: 'Work backward from the answer to what must be true.', example: 'solve 3x + 5 = 20 → which equation has solution 5?', effect: 'preserve' },
  reasoning: { name: 'Reasoning Remix', blurb: 'A different kind of thinking: spot an error, compare methods, judge a claim.', example: 'solve it → find the step where a student went wrong', effect: 'preserve' },
  challenge: { name: 'Challenge Remix', blurb: 'A harder application: more steps, more constraints, subtler traps.', example: 'solve for x → find the value of 3x − 2 without solving first', effect: 'increase' },
};

/** What a math question asks, in plain expressions the validator can solve on its own. */
export type MathSpec =
  /** solve an equation in x; the answer is `ask` evaluated at the chosen root */
  | { t: 'solve'; eq: string; ask?: string; root?: 'only' | 'positive' | 'negative' | 'max' | 'min' | 'sum' | 'product'; choiceExprs?: string[] }
  /** a 2×2 linear system in x and y; the answer is `ask` at its unique solution */
  | { t: 'system'; eqs: [string, string]; ask: string; choiceExprs?: string[] }
  /** the value of an expression (a rate, a percent, an area…) */
  | { t: 'eval'; expr: string; choiceExprs?: string[] }
  /** choose the equation/system that satisfies a test */
  | { t: 'pick'; choiceEqs: string[]; test: { kind: 'root'; x: number } | { kind: 'roots'; xs: number[] } | { kind: 'oneroot' } | { kind: 'points'; pts: [number, number][] } | { kind: 'sys'; x: number; y: number } | { kind: 'nosolution' } }
  /** choice i is a set of equations (indexes into eqs); the right one is exactly the set satisfied by every point */
  | { t: 'pickset'; eqs: string[]; pts: [number, number][]; options: number[][] }
  /** find the first wrong step: lines[0] is the problem, choice i is lines[i + 1] */
  | { t: 'steps'; lines: string[] };

/** What a Reading & Writing question asks, as tags the validator can check. */
export type RwSpec =
  /** each choice carries a tag; exactly one must carry `want` (roles, senses, relations, agents…) */
  | { t: 'tags'; kind: string; tags: string[]; want: string; avoid?: string[] }
  /** each choice is a statement about a table; the key must be true AND cover what the claim needs */
  | { t: 'data'; rows: { name: string; a: number; b: number }[]; stmts: { rows: string[]; claims: { row: string; dir: 'up' | 'down' }[]; relevant: boolean }[] }
  /** notes synthesis: the key must use every required fact tag; every sentence must use only facts in the notes */
  | { t: 'facts'; notes: { id: string; tag: string }[]; choiceFacts: string[][]; requires: string[] }
  /** punctuation / grammar: the set of acceptable marks or forms is derived from the sentence structure */
  | { t: 'grammar'; structure: string; options: string[]; valid: string[] };

export type Spec = MathSpec | RwSpec;

/** A question before validation. */
export interface Candidate {
  skill: SkillId; sub: string; level: RemixLevel; mode: RemixMode; family: string;
  passage?: string; notes?: string[]; figure?: Figure;
  stem: string; choices?: string[]; answer: number | string[];
  steps: string[]; why: string[]; concept: string; strategy: string; trap: string; remember: string;
  hints: [string, string, string];
  spec: Spec;
  /** how this question differs from the one it came from */
  differs: string;
  /** for a table or plotted figure: the function of x behind each column after the first (or behind the points) */
  figureFns?: string[];
}

export interface Check { name: string; pass: boolean; detail?: string }
export interface Validation { ok: boolean; checks: Check[]; method: 'deterministic' | 'tags' | 'structural' }

export type ReviewStatus = 'generated' | 'auto-validated' | 'needs-review' | 'approved' | 'rejected';
export const STATUS_NAME: Record<ReviewStatus, string> = {
  generated: 'Generated', 'auto-validated': 'Automatically validated', 'needs-review': 'Needs review', approved: 'Approved by a reviewer', rejected: 'Rejected by a reviewer',
};

export interface RemixMeta {
  v: 1;
  originId: string;
  parentId?: string;
  chainId: string;
  mode: RemixMode;
  level: RemixLevel;
  method: 'local' | 'ai';
  family: string;
  createdAt: number;
  validation: Validation;
  /** failed attempts before this one passed, with the reason (kept for reviewers) */
  rejected: string[];
  status: ReviewStatus;
  review?: { at: number; note: string; flags: string[] };
  differs: string;
  /** why Smart Remix picked this transformation, if it did */
  smart?: string;
}
/** A generated question, stored and served like any other question (id starts with "gx-"). */
export type RemixQuestion = Question & { remix: RemixMeta };
/** A remix chain: one original and the variations made from it, in order. */
export interface RemixChain { id: string; originId: string; steps: string[]; createdAt: number; updatedAt: number; saved?: boolean }
/** Everything Remix Studio keeps in the student's saved state. Version 1. */
export interface RemixState { v: 1; items: Record<string, RemixQuestion>; chains: Record<string, RemixChain> }
export const emptyRemix = (): RemixState => ({ v: 1, items: {}, chains: {} });
export const isRemix = (q: Question | undefined): q is RemixQuestion => !!q && 'remix' in q && !!(q as RemixQuestion).remix;
