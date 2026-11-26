import type { Attempt, PathSetKind, PathState, Question, Section, SkillId, SrsCard } from '../types';
import { rng, shuffle } from '../util';
import { PATH, pathOf } from './skills';
import { SET_RULES, RETENTION_DAYS } from './stars';
import { DAY } from '../util';

const RANK: Record<string, number> = { medium: 1, hard: 2, 'very-hard': 3, elite: 4 };

/**
 * Chooses the questions for a Path set. Unseen questions first; Beyond-SAT ("elite") questions only in the
 * hard set. Official questions (personal copies) are never used, so a set means the same thing for everyone.
 *  practice — 6: two medium, two hard, two very hard (falling back to whatever the skill has)
 *  hard     — 4: hard or harder, hardest first
 *  check    — 5: one medium, two hard, two very hard (the skip-ahead check)
 *  gauntlet — 8: interleaved, from skills with ★2 (oldest ★2 first, so the 7-day retrieval check comes due),
 *             never two of the same skill in a row
 *  confident — the student's confident errors (at most 3)
 */
export function pickSet(kind: PathSetKind | 'confident', o: { skill?: SkillId; section?: Section; seed: string }, bank: Question[], attempts: Attempt[], path: PathState, srs: Record<string, SrsCard>, now: number): string[] {
  const seen = new Set(attempts.map((a) => a.qid));
  const rand = rng(o.seed);
  const pool = (skill: SkillId) => shuffle(bank.filter((q) => q.skill === skill && !q.official && !(q as Question & { remix?: unknown }).remix), rand)
    .sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));
  const take = (qs: Question[], plan: string[][]) => {
    const out: Question[] = [];
    for (const diffs of plan) {
      const q = qs.find((x) => diffs.includes(x.difficulty) && !out.includes(x)) ?? qs.find((x) => x.difficulty !== 'elite' && !out.includes(x));
      if (q) out.push(q);
    }
    return out.map((q) => q.id);
  };
  if (kind === 'confident') {
    return Object.entries(srs).filter(([id, c]) => c.misconception && (!o.section || bank.find((q) => q.id === id)?.section === o.section)).sort((a, b) => a[1].due - b[1].due).slice(0, 3).map(([id]) => id);
  }
  if (kind === 'gauntlet') {
    const section = o.section ?? (o.skill ? PATH[o.skill].section : 'math');
    const eligible = pathOf(section).filter((s) => path.stars[s.id]?.[2])
      .sort((a, b) => Number(!!path.retained[a.id]) - Number(!!path.retained[b.id]) || (path.stars[a.id]![2]! - path.stars[b.id]![2]!));
    // retention-due skills first, then fill with any started skill in the section
    const due = eligible.filter((s) => !path.retained[s.id] && now >= path.stars[s.id]![2]! + RETENTION_DAYS * DAY);
    const skills = [...new Set([...due, ...eligible, ...pathOf(section)].map((s) => s.id))].slice(0, 8);
    const picks: Question[] = [];
    for (let round = 0; picks.length < SET_RULES.gauntlet.n && round < 3; round++) {
      for (const k of skills) {
        if (picks.length >= SET_RULES.gauntlet.n) break;
        const q = pool(k).find((x) => x.difficulty !== 'elite' && x.difficulty !== 'medium' && !picks.includes(x)) ?? pool(k).find((x) => !picks.includes(x));
        if (q && picks[picks.length - 1]?.skill !== q.skill) picks.push(q);
      }
    }
    return picks.map((q) => q.id);
  }
  const skill = o.skill!;
  const qs = pool(skill);
  if (kind === 'hard') return qs.filter((q) => RANK[q.difficulty] >= 2).sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)) || RANK[b.difficulty] - RANK[a.difficulty]).slice(0, SET_RULES.hard.n).map((q) => q.id);
  if (kind === 'check') return take(qs, [['medium'], ['hard'], ['hard'], ['very-hard'], ['very-hard']]);
  return take(qs, [['medium'], ['medium'], ['hard'], ['hard'], ['very-hard'], ['very-hard']]);
}
