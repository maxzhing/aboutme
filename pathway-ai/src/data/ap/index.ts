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

export function apCourseName(id: string): string {
  return AP_COURSE_BY_ID.get(id)?.name ?? id;
}

/** Total unit count across the catalog, used in empty states and stats. */
export const AP_UNIT_COUNT = AP_COURSES.reduce((n, c) => n + c.units.length, 0);
