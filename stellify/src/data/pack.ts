import type { Figure, SkillId } from '@/lib/types';

/**
 * Optional private question pack. The public build has none. A personal build made with
 * `node scripts/build.mjs --pack private/pack.json` inlines the questions from a file the student
 * owns (see scripts/make-pack.py). Pack questions are official College Board items: they are
 * labelled as such everywhere, used only for the student's own study, and never committed.
 */
export interface PackItem {
  id: string; skill: SkillId; sub?: string; d: 'M' | 'H'; cbDifficulty?: string; passage: string; figure?: Figure; stem: string;
  /** four choices for multiple choice; empty for a student-produced response */
  choices: string[]; answer: number | string[]; why: string[]; note?: string; notes?: string[];
  /** questions imported in the app keep the exact page image for math, tables, graphs and underlining */
  image?: string; rationaleImage?: string; rationale?: string; imported?: number;
  /** where the question comes from, e.g. "SAT Practice Test 4 · Math Module 1 · Question 13" */
  source?: string;
  /** the full practice test this question belongs to (see FullTest) */
  test?: string;
  /** difficulty estimated from the question's position (the printed tests do not label difficulty) */
  estimated?: boolean;
}
/** A complete official practice test: its modules in order and the College Board's score conversion table. */
export interface PackTest {
  id: string; number: number | null; name: string;
  modules: { mod: 'rw1' | 'rw2' | 'math1' | 'math2'; section: 'rw' | 'math'; module: 1 | 2; minutes: number; qids: string[] }[];
  /** index = raw score (number correct in the section); value = [lower, upper] section score */
  table?: { rw: [number, number][]; math: [number, number][] };
  imported?: number;
}
type Pack = PackItem[] | { items: PackItem[]; tests?: PackTest[] };
declare const __PACK__: Pack | null | undefined;
/** A personal build embeds the pack as a JSON block in the page (fast to parse); see scripts/build.mjs. */
function packFromPage(): Pack | null {
  try {
    const el = typeof document !== 'undefined' ? document.getElementById('stellify-pack') : null;
    return el?.textContent ? (JSON.parse(el.textContent) as Pack) : null;
  } catch { return null; }
}
const PACK: Pack = (typeof __PACK__ !== 'undefined' && __PACK__) || packFromPage() || [];
export const PACK_RAW: PackItem[] = Array.isArray(PACK) ? PACK : PACK.items;
export const PACK_TESTS: PackTest[] = Array.isArray(PACK) ? [] : PACK.tests ?? [];
