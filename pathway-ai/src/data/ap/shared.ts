import type { APCourse, APUnit, GradeLevel } from '@/domain/types';
import { SRC, unverified } from '@/data/provenance';

export type UnitInput = Omit<APUnit, 'courseId' | 'id'> & { id?: string };

export interface CourseInput extends Omit<APCourse, 'provenance' | 'units' | 'studyResources'> {
  units: UnitInput[];
  studyResources?: APCourse['studyResources'];
}

export const G = (...grades: number[]) => grades as GradeLevel[];

/**
 * Builds an AP course record. Unit structures are summarised from public course
 * descriptions and shipped as `unverified` — College Board revises courses, so
 * the UI always links to the official CED rather than claiming authority.
 */
export function course(input: CourseInput): APCourse {
  return {
    ...input,
    units: input.units.map((u) => ({
      ...u,
      id: u.id ?? `${input.id}-u${u.number}`,
      courseId: input.id,
    })),
    studyResources: [
      { label: 'Official Course and Exam Description', url: 'https://apcentral.collegeboard.org/courses', kind: 'official' },
      { label: 'AP Students course page', url: 'https://apstudents.collegeboard.org/course-index-page', kind: 'official' },
      { label: 'Pathway AI practice questions', kind: 'in-app' },
      ...(input.studyResources ?? []),
    ],
    provenance: unverified([SRC.collegeBoardAPCED, SRC.collegeBoardAP]),
  };
}
