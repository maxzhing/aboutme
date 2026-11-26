import type { AppState, Difficulty, Question, Section, SkillId } from '../types';
import { DOMAIN, SKILL, SKILLS, skillsOfDomain } from '../taxonomy';
import { DAY, pct, rng, shuffle } from '../util';
import { computeAllSkillStats, type SkillStats } from './mastery';
import { dueIds } from './srs';
import { TIER_B, estimateAbilities, pKnow, withinReach } from '../model/ability';
import { buildCoach, coachPriority } from './coach';

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
  if (st.n < 3 || st.recentAcc < 0.5) return ['medium', 'hard', 'very-hard', 'elite'];
  if (st.recentAcc < 0.78) return ['hard', 'very-hard', 'medium', 'elite'];
  if (st.recentAcc < 0.9) return ['very-hard', 'elite', 'hard', 'medium'];
  return ['elite', 'very-hard', 'hard', 'medium'];
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
  // Difficulty follows the student: each skill's questions are aimed at about a 70% chance of knowing how, from
  // the student model. "High challenge" (the default) only leaves out medium questions the student would almost
  // certainly get right; it no longer hands a beginner nothing but hard questions.
  const high = s.settings.challenge !== 'standard';
  const ab = estimateAbilities(s.attempts, getQ, now, s.profile.intake);
  const tooEasy = (q: Question) => high && q.difficulty === 'medium' && pKnow(ab.skills[q.skill].theta, TIER_B.medium) > 0.92;
  // a set can end short: a few questions at the right level teach more than a full set padded with impossible ones
  const pool = bank.filter((q) => (!opts.section || q.section === opts.section) && (!opts.skill || q.skill === opts.skill) && !tooEasy(q) && withinReach(ab, q));
  const last = new Map<string, { at: number; correct: boolean }>();
  for (const a of s.attempts) if (!a.abandoned) last.set(a.qid, { at: a.at, correct: a.correct });
  const fresh = (q: Question) => { const l = last.get(q.id); return !l ? 2 : l.correct && now - l.at < 14 * DAY ? 0 : 1; };
  const picks: Pick[] = [];
  const used = new Set<string>();
  const take = (q: Question | undefined, reason: string) => { if (q && !used.has(q.id) && picks.length < n) { used.add(q.id); picks.push({ qid: q.id, reason }); return true; } return false; };

  const due = dueIds(s.srs, now).map(getQ).filter((q): q is Question => !!q && pool.includes(q));
  for (const q of due.slice(0, Math.max(1, Math.round(n * 0.2)))) take(q, 'Spaced review: you missed or needed help with this before.');

  // the same order as the student's plan (lib/engine/coach.ts), so Smart Practice and the plan never disagree
  const plan = buildCoach(s, { now, getQ, days: 1 });
  const order = plan.hasData ? coachPriority(plan) : [];
  const at = (k: SkillId) => { const i = order.indexOf(k); return i < 0 ? 99 : i; };
  const ranked = rankSkills(s, getQ, now, opts.section).filter((r) => !opts.skill || r.skill === opts.skill)
    .sort((a, b) => (order.length ? at(a.skill) - at(b.skill) : 0));
  const fromSkill = (r: SkillPriority, reason: string) => {
    const th = ab.skills[r.skill].theta;
    const prefs = (['medium', 'hard', 'very-hard', 'elite'] as Difficulty[]).sort((a, b) => Math.abs(pKnow(th, TIER_B[a]) - 0.7) - Math.abs(pKnow(th, TIER_B[b]) - 0.7));
    // the right level matters more than novelty: a missed easy question beats an unseen one that is far too hard,
    // but a question answered correctly in the last two weeks only comes back when nothing else fits
    const cost = (q: Question) => Math.abs(pKnow(th, TIER_B[q.difficulty]) - 0.7) + (fresh(q) === 0 ? 1 : fresh(q) === 1 ? 0.12 : 0);
    const cands = shuffle(pool.filter((q) => q.skill === r.skill && !used.has(q.id)), rand)
      .sort((a, b) => cost(a) - cost(b) || prefs.indexOf(a.difficulty) - prefs.indexOf(b.difficulty));
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
  // practising one skill on purpose always gives something to work on: if everything in it is above the student's
  // level, use its most reachable questions (at least four), so the estimate can move and the student is never stuck
  if (opts.skill && picks.length < Math.min(n, 4)) {
    const th = ab.skills[opts.skill].theta;
    const extra = bank.filter((q) => q.skill === opts.skill && !used.has(q.id) && !q.official).sort((a, b) => pKnow(th, TIER_B[b.difficulty]) - pKnow(th, TIER_B[a.difficulty]) || fresh(b) - fresh(a));
    for (const q of extra) { if (picks.length >= Math.min(n, 4)) break; take(q, `The most approachable ${SKILL[opts.skill].short} questions: work through each explanation, even when you miss.`); }
  }
  for (const q of shuffle(pool, rand).sort((a, b) => fresh(b) - fresh(a))) { if (picks.length >= n) break; take(q, 'Mixed practice.'); }
  return picks;
}

export interface Weakness { skill: SkillId; accuracy: number; n: number; message: string; href: string }

/** Biggest opportunities among skills with enough data to judge. */
export function findWeaknesses(s: AppState, getQ: (id: string) => Question | undefined, max = 3): Weakness[] {
  const stats = computeAllSkillStats(s.attempts, getQ);
  return SKILLS.map((k) => stats[k.id]).filter((st) => st.n >= 4 && st.level < 3 && st.correct / st.n < 0.7)
    .sort((a, b) => a.score - b.score).slice(0, max)
    .map((st) => ({
      skill: st.skill, accuracy: pct(st.correct, st.n), n: st.n, href: `/learn/${st.skill}`,
      message: `Your ${SKILL[st.skill].name} accuracy is ${pct(st.correct, st.n)}% over ${st.n} questions. This is one of your biggest opportunities.`,
    }));
}
