import type { AppState, Difficulty, Question, Section, SkillId } from '../types';
import { DOMAIN, SKILL, SKILLS, skillsOfDomain } from '../taxonomy';
import { DAY, pct, rng, shuffle } from '../util';
import { computeAllSkillStats, type SkillStats } from './mastery';
import { dueIds } from './srs';

export interface SkillPriority { skill: SkillId; priority: number; stats: SkillStats; reason: string }

/**
 * Ranks skills by how much practice they need. Weak skills and skills that carry more weight on
 * the test rank higher; untouched skills get a nudge so nothing stays unexplored; skills not
 * seen for a while drift upward so strengths are maintained.
 */
export function rankSkills(s: AppState, getQ: (id: string) => Question | undefined, now: number, section?: Section): SkillPriority[] {
  const stats = computeAllSkillStats(s.attempts, getQ);
  return SKILLS.filter((k) => !section || k.section === section).map((k) => {
    const st = stats[k.id];
    const weight = DOMAIN[k.domain].weight / skillsOfDomain(k.domain).length;
    const weakness = 1 - st.score / 100;
    const stale = st.lastAt ? Math.min(1, (now - st.lastAt) / (14 * DAY)) : 0;
    const priority = weakness * (0.6 + weight * 4) + (st.n === 0 ? 0.25 : 0) + stale * 0.12 - (st.level === 4 ? 0.2 : 0);
    const reason = st.n === 0 ? `You have not practiced ${k.short} yet.`
      : st.n < 4 ? `Only ${st.n} attempt${st.n === 1 ? '' : 's'} so far in ${k.short}.`
      : `Your accuracy in ${k.short} is ${pct(st.correct, st.n)}%.`;
    return { skill: k.id, priority, stats: st, reason };
  }).sort((a, b) => b.priority - a.priority);
}

/** Difficulty to aim for, most preferred first, based on recent performance in the skill. */
export function targetDifficulties(st: SkillStats): Difficulty[] {
  if (st.n < 3 || st.recentAcc < 0.5) return ['medium', 'hard', 'very-hard'];
  if (st.recentAcc < 0.78) return ['hard', 'medium', 'very-hard'];
  return ['very-hard', 'hard', 'medium'];
}

export interface Pick { qid: string; reason: string }

/**
 * Smart practice set: roughly 20% spaced-repetition reviews that are due, 60% targeted at the
 * weakest skills at an appropriate difficulty, and 20% maintenance of stronger skills.
 * Questions answered correctly in the last two weeks are avoided while fresh ones remain.
 */
export function pickSmartSet(
  s: AppState, bank: Question[], getQ: (id: string) => Question | undefined, n: number, now: number,
  opts: { section?: Section; skill?: SkillId; seed?: string } = {},
): Pick[] {
  const rand = rng(opts.seed ?? `${now}`);
  const pool = bank.filter((q) => (!opts.section || q.section === opts.section) && (!opts.skill || q.skill === opts.skill));
  const last = new Map<string, { at: number; correct: boolean }>();
  for (const a of s.attempts) if (!a.abandoned) last.set(a.qid, { at: a.at, correct: a.correct });
  const fresh = (q: Question) => { const l = last.get(q.id); return !l ? 2 : l.correct && now - l.at < 14 * DAY ? 0 : 1; };
  const picks: Pick[] = [];
  const used = new Set<string>();
  const take = (q: Question | undefined, reason: string) => { if (q && !used.has(q.id) && picks.length < n) { used.add(q.id); picks.push({ qid: q.id, reason }); return true; } return false; };

  const due = dueIds(s.srs, now).map(getQ).filter((q): q is Question => !!q && pool.includes(q));
  for (const q of due.slice(0, Math.max(1, Math.round(n * 0.2)))) take(q, 'Spaced review: you missed or needed help with this before.');

  const ranked = rankSkills(s, getQ, now, opts.section).filter((r) => !opts.skill || r.skill === opts.skill);
  const fromSkill = (r: SkillPriority, reason: string) => {
    const prefs = targetDifficulties(r.stats);
    const cands = shuffle(pool.filter((q) => q.skill === r.skill && !used.has(q.id)), rand)
      .sort((a, b) => fresh(b) - fresh(a) || prefs.indexOf(a.difficulty) - prefs.indexOf(b.difficulty));
    return take(cands[0], reason);
  };
  const weak = ranked.slice(0, Math.max(3, Math.ceil(ranked.length / 3)));
  const strong = [...ranked].reverse().filter((r) => r.stats.n > 0).slice(0, Math.max(2, Math.ceil(ranked.length / 4)));
  const maintain = Math.round(n * 0.2);
  let guard = 0;
  while (picks.length < n - maintain && guard++ < n * 6) {
    const r = weak[(guard - 1) % weak.length];
    if (!fromSkill(r, r.reason)) { if (weak.every((w) => !pool.some((q) => q.skill === w.skill && !used.has(q.id)))) break; }
  }
  guard = 0;
  while (picks.length < n && strong.length && guard++ < n * 4) {
    const r = strong[(guard - 1) % strong.length];
    if (!fromSkill(r, `Keeping ${SKILL[r.skill].short} sharp.`)) { if (strong.every((w) => !pool.some((q) => q.skill === w.skill && !used.has(q.id)))) break; }
  }
  for (const q of shuffle(pool, rand).sort((a, b) => fresh(b) - fresh(a))) { if (picks.length >= n) break; take(q, 'Mixed practice.'); }
  return picks;
}

export interface Weakness { skill: SkillId; accuracy: number; n: number; message: string; href: string }

/** Biggest opportunities among skills with enough data to judge. */
export function findWeaknesses(s: AppState, getQ: (id: string) => Question | undefined, max = 3): Weakness[] {
  const stats = computeAllSkillStats(s.attempts, getQ);
  return SKILLS.map((k) => stats[k.id]).filter((st) => st.n >= 4 && st.level < 3)
    .sort((a, b) => a.score - b.score).slice(0, max)
    .map((st) => ({
      skill: st.skill, accuracy: pct(st.correct, st.n), n: st.n, href: `/learn/${st.skill}`,
      message: `Your ${SKILL[st.skill].name} accuracy is ${pct(st.correct, st.n)}% over ${st.n} questions. This is one of your biggest opportunities.`,
    }));
}
