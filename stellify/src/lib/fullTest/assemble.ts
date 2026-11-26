import type { Question, Section, SkillId } from '../types';
import { rng, shuffle } from '../util';
import { MATH_CHOICE, MATH_FIXED, RW_SLOTS } from '../engine/mock';
import { levelOf, type Level } from './score';
import { SKILL } from '../taxonomy';

/**
 * Builds the modules of an adaptive SAT-style test: the digital SAT's structure (Reading & Writing 2 × 27
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

export interface SatPools {
  official: Question[]; bank: Question[]; seen: Set<string>; untakenTests: Set<string>;
  /** share of slots (0–1) given to Stellify original questions instead of official ones ("Blend") */
  mixOriginal?: number;
}

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
  const originals = pools.mixOriginal ? shuffle(pools.bank.filter((q) => q.section === section && q.difficulty !== 'elite'), rand).sort((a, b) => Number(pools.seen.has(a.id)) - Number(pools.seen.has(b.id))) : [];
  const chosen: { slot: number; q: Question }[] = [];
  const order = shuffle(slots.map((_, i) => i), rand);
  for (const i of order) {
    const skill = slots[i];
    const free = (q: Question) => q.skill === skill && !used.has(q.id);
    let q: Question | undefined;
    const cands = official.filter(free);
    // Blend: some slots take a Stellify original question of the same skill, at the difficulty the module needs
    if (pools.mixOriginal && rand() < pools.mixOriginal) {
      const orig = originals.filter(free);
      const needs = (Object.keys(want) as ('Easy' | 'Medium' | 'Hard')[]).sort((a, b) => want[b] - want[a]);
      q = needs.map((d) => orig.find((c) => band(c) === d)).find(Boolean) ?? orig[0];
    }
    if (q) { /* chosen above */ } else if (cands.length) {
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
    // a skill with nothing left borrows from its College Board domain, so modules stay full length
    if (!q) {
      const dom = (c: Question) => c.domain === SKILL[skill].domain && !used.has(c.id);
      q = official.find(dom) ?? fill.find(dom) ?? official.find((c) => !used.has(c.id)) ?? fill.find((c) => !used.has(c.id));
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

/** How an adaptive SAT-style test section would be made up from what you have: official questions per skill vs the blueprint. */
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

/**
 * Original practice tests ("Remix Tests"): fixed, full-length adaptive forms assembled from the whole
 * official library on the College Board blueprint. Each form has its own Module 1 and both possible
 * Module 2s, and no question appears in two forms, so every remix is new to you even after the
 * official tests. Forms are deterministic for a given library, so a remix can be retaken to measure
 * progress. Forms stop once official questions run out for most slots.
 */
export interface RemixForm { n: number; modules: Record<Section, Record<Route, string[]>>; officialShare: number }
let remixCache: { key: string; forms: RemixForm[] } | null = null;
export function remixForms(official: Question[], bank: Question[], max = 12): RemixForm[] {
  const key = `${official.length}:${official[0]?.id ?? ''}:${official[official.length - 1]?.id ?? ''}:${bank.length}`;
  if (remixCache?.key === key) return remixCache.forms;
  const forms: RemixForm[] = [];
  const used = new Set<string>();
  const isOfficial = new Set(official.map((q) => q.id));
  if (official.length >= 40) for (let n = 1; n <= max; n++) {
    const pools: SatPools = { official, bank, seen: new Set(), untakenTests: new Set() };
    const trial = new Set(used);
    const modules = { rw: {}, math: {} } as RemixForm['modules'];
    for (const sec of ['rw', 'math'] as Section[]) for (const route of ['m1', 'upper', 'lower'] as Route[]) modules[sec][route] = buildSatModule(sec, route, `remix-${n}`, pools, trial);
    const all = (['rw', 'math'] as Section[]).flatMap((sec) => (['m1', 'upper', 'lower'] as Route[]).flatMap((r) => modules[sec][r]));
    const officialShare = all.filter((id) => isOfficial.has(id)).length / Math.max(1, all.length);
    const full = (['rw', 'math'] as Section[]).every((sec) => (['m1', 'upper', 'lower'] as Route[]).every((r) => modules[sec][r].length === (sec === 'rw' ? 27 : 22)));
    if (officialShare < 0.75 || !full) break;
    for (const id of all) used.add(id);
    forms.push({ n, modules, officialShare });
  }
  remixCache = { key, forms };
  return forms;
}
