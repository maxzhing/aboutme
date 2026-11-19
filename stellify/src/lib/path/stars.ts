import type { MasteryLevel } from '../engine/mastery';
import type { PathSetResult, PathState, SkillId } from '../types';
import { DAY } from '../util';

/**
 * Path star rules (METHODOLOGY.md; approved in PROPOSAL.md):
 *  ★1 Learned   — every chapter passed, OR the worked-example ladder finished, OR the skip check passed,
 *                 OR the skill reached Proficient (practice that strong shows it was learned).
 *  ★2 Practiced — the 6-question practice set passed on its FIRST attempt (≥ 4.5 credit), OR Proficient,
 *                 OR the skip check passed (≥ 4 of 5 credit). ★2 includes ★1.
 *  ★3 Retained  — (the 4-question hard set passed with ≥ 3 credit, OR Mastered) AND a correct answer on this
 *                 skill in a mixed Gauntlet at least 7 days after ★2 was earned.
 * Hints lower an answer's credit (1, .75, .5, .25 for 0–3 hints) but never block progress.
 * Stars once earned are kept, with the date they were earned.
 */
export const credit = (correct: boolean, hints: number) => (correct ? Math.max(0.25, 1 - 0.25 * Math.max(0, hints)) : 0);

export const SET_RULES = {
  practice: { n: 6, pass: 4.5 },
  hard: { n: 4, pass: 3 },
  check: { n: 5, pass: 4 },
  gauntlet: { n: 8, pass: 0 },
} as const;
export const RETENTION_DAYS = 7;

export interface StarInput {
  chaptersPassed: number;
  chaptersTotal: number;
  /** every worked-example family for this skill finished */
  workedDone: boolean;
  level: MasteryLevel;
  sets: PathSetResult[];
  retainedAt?: number;
}

export interface StarStatus {
  count: 0 | 1 | 2 | 3;
  learned: boolean;
  practiced: boolean;
  hardDone: boolean;
  retained: boolean;
  /** what the next star needs, in plain words */
  next: string;
}

/** Which stars a skill has earned right now, from its evidence (before merging with stars already kept). */
export function deriveStars(i: StarInput, kept: { 1?: number; 2?: number; 3?: number } = {}): StarStatus {
  const of = (k: PathSetResult['kind']) => i.sets.filter((s) => s.kind === k);
  const checkPassed = of('check').some((s) => s.passed);
  const firstPractice = of('practice').find((s) => s.first);
  const proficient = i.level >= 3;
  const learned = !!kept[1] || (i.chaptersTotal > 0 && i.chaptersPassed >= i.chaptersTotal) || i.workedDone || checkPassed || proficient;
  const practiced = !!kept[2] || !!firstPractice?.passed || proficient || checkPassed;
  const hardDone = of('hard').some((s) => s.passed) || i.level >= 4;
  const twoAt = kept[2];
  const retained = !!kept[3] || (hardDone && !!twoAt && !!i.retainedAt && i.retainedAt >= twoAt + RETENTION_DAYS * DAY);
  const count: StarStatus['count'] = retained && practiced ? 3 : practiced ? 2 : learned ? 1 : 0;
  const next = count === 3 ? 'All three stars. Reviews will keep it fresh.'
    : count === 2 ? (!hardDone ? 'Pass the 4-question hard set, then answer it right in a Gauntlet a week after ★2.'
      : twoAt && Date.now() < twoAt + RETENTION_DAYS * DAY ? `Come back after ${new Date(twoAt + RETENTION_DAYS * DAY).toLocaleDateString()} and get it right in a Gauntlet.`
      : 'Get this skill right in a Gauntlet (mixed review).')
    : count === 1 ? (firstPractice ? 'Reach Proficient through practice, or pass the skip check.' : 'Pass the 6-question practice set on your first try (4.5 credit or more), or reach Proficient.')
    : 'Finish the chapters or the worked examples, or pass the 5-question skip check.';
  return { count, learned, practiced, hardDone, retained, next };
}

/** Keeps earned stars: adds dates for newly earned stars and never removes one. */
export function keepStars(kept: { 1?: number; 2?: number; 3?: number } | undefined, st: StarStatus, now: number) {
  const k = { ...(kept ?? {}) };
  if (st.count >= 1 && !k[1]) k[1] = now;
  if (st.count >= 2 && !k[2]) k[2] = now;
  if (st.count >= 3 && !k[3]) k[3] = now;
  return k;
}

export const keptCount = (k?: { 1?: number; 2?: number; 3?: number }) => (k?.[3] ? 3 : k?.[2] ? 2 : k?.[1] ? 1 : 0);

export const emptyPath = (): PathState => ({ stars: {}, sets: [], worked: {}, retained: {} });

/** Scores a finished set. Gauntlets also record which skills passed their delayed retrieval check. */
export function scoreSet(kind: PathSetResult['kind'], rows: { qid: string; correct: boolean; hints: number; skill: SkillId }[], meta: { section: PathSetResult['section']; skill?: SkillId; at: number; previous: PathSetResult[] }): PathSetResult {
  const c = rows.reduce((t, r) => t + credit(r.correct, r.hints), 0);
  const bySkill: PathSetResult['bySkill'] = {};
  for (const r of rows) { const b = bySkill[r.skill] ?? { credit: 0, n: 0 }; b.credit += credit(r.correct, r.hints); b.n++; bySkill[r.skill] = b; }
  const rule = SET_RULES[kind];
  const first = !meta.previous.some((p) => p.kind === kind && p.skill === meta.skill);
  return { kind, section: meta.section, skill: meta.skill, at: meta.at, qids: rows.map((r) => r.qid), credit: Math.round(c * 100) / 100, n: rows.length, passed: kind === 'gauntlet' ? c > 0 : c >= rule.pass, first, bySkill: kind === 'gauntlet' ? bySkill : undefined };
}

/**
 * A Gauntlet answer counts as a delayed retrieval success for a skill when it was right without hints and
 * came at least RETENTION_DAYS after the skill's ★2.
 */
export function retentionFrom(rows: { correct: boolean; hints: number; skill: SkillId }[], stars: PathState['stars'], at: number): SkillId[] {
  const out = new Set<SkillId>();
  for (const r of rows) {
    const two = stars[r.skill]?.[2];
    if (r.correct && r.hints === 0 && two && at >= two + RETENTION_DAYS * DAY) out.add(r.skill);
  }
  return [...out];
}
