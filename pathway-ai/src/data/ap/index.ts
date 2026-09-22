import type { APCourse, APUnit } from '@/domain/types';
import { AP_SCIENCE } from './science';
import { AP_MATH } from './math';
import { AP_HUMANITIES } from './humanities';
import { AP_SOCIAL } from './social';
import { AP_ARTS } from './arts';

export const AP_COURSES: APCourse[] = [...AP_MATH, ...AP_SCIENCE, ...AP_SOCIAL, ...AP_HUMANITIES, ...AP_ARTS];

export const AP_COURSE_BY_ID = new Map(AP_COURSES.map((c) => [c.id, c]));

export const AP_FAMILIES = Array.from(new Set(AP_COURSES.map((c) => c.family))).sort();

export const AP_UNIT_BY_ID = new Map<string, APUnit>(
  AP_COURSES.flatMap((c) => c.units.map((u) => [u.id, u] as const)),
);

/**
 * Resolves a loosely-entered course name to a catalog course.
 *
 * Students type "AP US History", "APUSH" or "ap calc ab" rather than the
 * catalog id, so anything that reads `currentCourses` has to match on the name
 * as well as the id — otherwise a student's real schedule silently does not
 * register with the planner or the study tools.
 */
export function resolveAPCourse(nameOrId?: string): APCourse | undefined {
  if (!nameOrId) return undefined;
  const direct = AP_COURSE_BY_ID.get(nameOrId);
  if (direct) return direct;
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .replace(/\bap\b/g, '')
      .replace(/\bunited states\b/g, 'us')
      .replace(/\bmodern\b/g, '')
      .replace(/[^a-z0-9]/g, '');
  const target = normalise(nameOrId);
  if (!target) return undefined;
  return AP_COURSES.find((c) => {
    const candidate = normalise(c.name);
    return candidate === target || candidate.startsWith(target) || target.startsWith(candidate);
  });
}

/** Catalog courses among a list of loosely-entered course names or ids. */
export function resolveAPCourses(entries: readonly string[]): APCourse[] {
  const out: APCourse[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const course = resolveAPCourse(entry);
    if (course && !seen.has(course.id)) {
      seen.add(course.id);
      out.push(course);
    }
  }
  return out;
}

export function apCourseName(id: string): string {
  return AP_COURSE_BY_ID.get(id)?.name ?? id;
}

/** Total unit count across the catalog, used in empty states and stats. */
export const AP_UNIT_COUNT = AP_COURSES.reduce((n, c) => n + c.units.length, 0);
