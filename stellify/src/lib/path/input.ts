import { COURSES } from '@/data/courses';
import { getQuestion } from '@/data/questions';
import { workedFamilyIds } from '@/data/worked';
import { computeAllSkillStats } from '../engine/mastery';
import { scoreLever } from '../engine/lever';
import type { AppState, Section, SkillId } from '../types';
import { SKILLS } from '../taxonomy';
import type { EngineInput } from './next';
import { emptyPath } from './stars';
import { buildCoach, coachPriority } from '../engine/coach';

export const CHAPTER_IDS: Partial<Record<SkillId, string[]>> = Object.fromEntries(SKILLS.map((k) => [k.id, (COURSES[k.id] ?? []).map((c) => c.id)]));

/** Builds the next-step engine's input from saved state (the engine itself stays pure). */
export function engineInput(s: AppState, now: number, section?: Section, level?: Partial<Record<Section, number>>): EngineInput {
  const stats = computeAllSkillStats(s.attempts, getQuestion);
  // the coach steers the Path once it knows something about the student; with nothing known, the route starts at the beginning
  const coach = buildCoach(s, { now, getQ: getQuestion, days: 1 });
  return {
    now, section, attempts: s.attempts, getQ: getQuestion, srs: s.srs, mistakes: s.mistakes, chapters: s.chapters,
    chapterIds: CHAPTER_IDS, path: s.path ?? emptyPath(), workedFamilies: workedFamilyIds(),
    levels: Object.fromEntries(SKILLS.map((k) => [k.id, stats[k.id].level])) as EngineInput['levels'],
    lever: scoreLever(s.attempts, getQuestion, { targetScore: s.profile.targetScore, level }),
    examDate: s.profile.examDate,
    quickStars: s.lessonStars ?? {},
    priority: coach.hasData ? coachPriority(coach) : undefined,
  };
}
