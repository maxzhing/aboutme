import type { SkillId } from '@/lib/types';
import { SKILLS } from '@/lib/taxonomy';
import type { Idea } from './visual-lessons';
import { COURSES_MATH } from './courses-math';
import { COURSES_RW } from './courses-rw';

/** Authoring shape: traps are [name, what it looks like, the fix]. */
export interface RawChapter { title: string; goal: string; subs: string[]; teach: Idea[]; method: string[]; traps: [string, string, string][] }
export interface Trap { id: string; name: string; looks: string; fix: string; chapter: string; skill: SkillId }
export interface Chapter extends Omit<RawChapter, 'traps'> { id: string; skill: SkillId; n: number; traps: Trap[] }

const RAW = { ...COURSES_MATH, ...COURSES_RW } as Record<SkillId, RawChapter[]>;

/** Full step-by-step course for every skill, chapter by chapter. */
export const COURSES = Object.fromEntries(SKILLS.map((k) => [k.id, (RAW[k.id] ?? []).map((c, i): Chapter => {
  const id = `${k.id}-${i + 1}`;
  return { ...c, id, skill: k.id, n: i + 1, traps: c.traps.map(([name, looks, fix], j) => ({ id: `${id}.${j + 1}`, name, looks, fix, chapter: id, skill: k.id })) };
})])) as Record<SkillId, Chapter[]>;

export const CHAPTERS: Chapter[] = SKILLS.flatMap((k) => COURSES[k.id]);
export const CHAPTER: Record<string, Chapter> = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));
export const TRAP: Record<string, Trap> = Object.fromEntries(CHAPTERS.flatMap((c) => c.traps.map((t) => [t.id, t])));

/** The chapter that teaches a question's subtopic (falls back to the skill's first chapter). */
export const chapterFor = (skill: SkillId, sub: string): Chapter | undefined =>
  COURSES[skill]?.find((c) => c.subs.includes(sub)) ?? COURSES[skill]?.[0];
