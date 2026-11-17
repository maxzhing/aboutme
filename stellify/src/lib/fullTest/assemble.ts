import type { Question, Section, SkillId } from '../types';
import { rng, shuffle } from '../util';
import { MATH_CHOICE, MATH_FIXED, RW_SLOTS } from '../engine/mock';
import { levelOf, type Level } from './score';

/**
 * Builds the modules of a "Real SAT": the digital SAT's structure (Reading & Writing 2 × 27
 * questions, Math 2 × 22), the College Board's domain blueprint (the same skill slots as every
 * Stellify mock), the real test's order, and multistage routing (Module 2 is harder or easier
 * depending on Module 1).
 *
 * Every slot takes an official College Board question when one exists for that skill, preferring
 * questions you have not seen and keeping questions from full practice tests you have not taken
 * yet for last. Only when no official question is left for a skill is the slot filled with one of
 * Stellify's own hard or very hard questions for that skill.
 */
export type Route = 'm1' | 'upper' | 'lower';
const WANT: Record<Section, Record<Route, Record<'Easy' | 'Medium' | 'Hard', number>>> = {
  rw: { m1: { Easy: 7, Medium: 10, Hard: 10 }, upper: { Easy: 2, Medium: 8, Hard: 17 }, lower: { Easy: 10, Medium: 12, Hard: 5 } },
  math: { m1: { Easy: 6, Medium: 8, Hard: 8 }, upper: { Easy: 1, Medium: 6, Hard: 15 }, lower: { Easy: 8, Medium: 10, Hard: 4 } },
};
const RANK: Level[] = ['Easy', 'Medium', 'Hard', 'VeryHard'];
const band = (q: Question): 'Easy' | 'Medium' | 'Hard' => { const l = levelOf(q); return l === 'VeryHard' ? 'Hard' : l; };

export interface SatPools { official: Question[]; bank: Question[]; seen: Set<string>; untakenTests: Set<string> }

export function slotsFor(section: Section, rand: () => number): SkillId[] {
  return section === 'rw' ? [...RW_SLOTS] : [...MATH_FIXED, ...MATH_CHOICE.map((c) => c[Math.floor(rand() * c.length)])];
}

export function buildSatModule(section: Section, route: Route, seed: string, pools: SatPools, used: Set<string>): string[] {
  const rand = rng(`${seed}|${section}|${route}`);
  const slots = slotsFor(section, rand);
  const want = { ...WANT[section][route] };
  // official tiers: unseen, then seen, then questions saved for full tests you have not taken
  const tier = (q: Question) => (q.test && pools.untakenTests.has(q.test) ? 2 : pools.seen.has(q.id) ? 1 : 0);
  const official = shuffle(pools.official.filter((q) => q.section === section), rand).sort((a, b) => tier(a) - tier(b));
  const fill = shuffle(pools.bank.filter((q) => q.section === section && (q.difficulty === 'hard' || q.difficulty === 'very-hard')), rand)
    .sort((a, b) => Number(pools.seen.has(a.id)) - Number(pools.seen.has(b.id)));
  const chosen: { slot: number; q: Question }[] = [];
  const order = shuffle(slots.map((_, i) => i), rand);
  for (const i of order) {
    const skill = slots[i];
    const free = (q: Question) => q.skill === skill && !used.has(q.id);
    let q: Question | undefined;
    const cands = official.filter(free);
    if (cands.length) {
      const best = tier(cands[0]);
      const top = cands.filter((c) => tier(c) === best);
      // within the best tier, take the difficulty this module still needs most
      const needs = (Object.keys(want) as ('Easy' | 'Medium' | 'Hard')[]).sort((a, b) => want[b] - want[a]);
      q = needs.map((d) => top.find((c) => band(c) === d)).find(Boolean) ?? top[0];
    } else {
      // no official question left for this skill: a Stellify hard question (easier routes prefer "hard" over "very hard")
      const f = fill.filter(free);
      q = (route === 'lower' ? f.find((c) => c.difficulty === 'hard') : undefined) ?? f[0];
    }
    if (!q) continue;
    used.add(q.id);
    want[band(q)] = (want[band(q)] ?? 0) - 1;
    chosen.push({ slot: i, q });
  }
  const r = (q: Question) => RANK.indexOf(levelOf(q));
  if (section === 'math') return chosen.sort((a, b) => r(a.q) - r(b.q) || a.slot - b.slot).map((c) => c.q.id);
  // Reading & Writing keeps the test's order of question types; easier first within a type
  return chosen.sort((a, b) => (slots[a.slot] === slots[b.slot] ? r(a.q) - r(b.q) || a.slot - b.slot : a.slot - b.slot)).map((c) => c.q.id);
}

/** How a Real SAT section would be made up from what you have: official questions per skill vs the blueprint. */
export function satCoverage(section: Section, official: Question[]) {
  const need = new Map<SkillId, number>();
  const rand = rng('coverage');
  for (const k of [...slotsFor(section, rand), ...slotsFor(section, rand)]) need.set(k, (need.get(k) ?? 0) + 1);
  let fromOfficial = 0, total = 0;
  const gaps: { skill: SkillId; have: number; need: number }[] = [];
  for (const [skill, n] of need) {
    const have = official.filter((q) => q.section === section && q.skill === skill).length;
    fromOfficial += Math.min(have, n); total += n;
    if (have < n) gaps.push({ skill, have, need: n });
  }
  return { fromOfficial, total, gaps };
}
