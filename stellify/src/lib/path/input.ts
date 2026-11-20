import { COURSES } from '@/data/courses';
import { getQuestion } from '@/data/questions';
import { workedFamilyIds } from '@/data/worked';
import { computeAllSkillStats } from '../engine/mastery';
import { scoreLever } from '../engine/lever';
import type { AppState, Section, SkillId } from '../types';
import { SKILLS } from '../taxonomy';
import type { EngineInput } from './next';
import { emptyPath } from './stars';
import { estimateAbilities, testAccuracy } from '../model/ability';
import { pathOf } from './skills';

export const CHAPTER_IDS: Partial<Record<SkillId, string[]>> = Object.fromEntries(SKILLS.map((k) => [k.id, (COURSES[k.id] ?? []).map((c) => c.id)]));

/** Builds the next-step engine's input from saved state (the engine itself stays pure). */
export function engineInput(s: AppState, now: number, section?: Section, level?: Partial<Record<Section, number>>): EngineInput {
  const stats = computeAllSkillStats(s.attempts, getQuestion);
  // the Path is a route, in order: its next step is the first skill along it that the student has not secured yet
  // (no ★2, and not clearly strong in their answers), so "Start here" sits where the student actually is
  const ab = estimateAbilities(s.attempts, getQuestion, now, s.profile.intake);
  const strong = (k: SkillId) => ab.skills[k].n >= 2 && testAccuracy(ab.skills[k].theta) >= 0.85;
  const secured = (k: SkillId) => (s.path?.stars?.[k]?.[2] ?? 0) > 0 || strong(k);
  const route = [...pathOf('math'), ...pathOf('rw')].sort((a, b) => a.order - b.order).map((p) => p.id);
  const priority = route.filter((k) => !secured(k));
  return {
    now, section, attempts: s.attempts, getQ: getQuestion, srs: s.srs, mistakes: s.mistakes, chapters: s.chapters,
    chapterIds: CHAPTER_IDS, path: s.path ?? emptyPath(), workedFamilies: workedFamilyIds(),
    levels: Object.fromEntries(SKILLS.map((k) => [k.id, stats[k.id].level])) as EngineInput['levels'],
    lever: scoreLever(s.attempts, getQuestion, { targetScore: s.profile.targetScore, level }),
    examDate: s.profile.examDate,
    quickStars: s.lessonStars ?? {},
    priority,
  };
}
