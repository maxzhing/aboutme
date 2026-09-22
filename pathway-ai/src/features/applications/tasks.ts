import type { ApplicationTask } from '@/domain/types';

/** Section 29 — the standard application checklist applied to every college. */
export const APPLICATION_TASKS: ApplicationTask[] = [
  { id: 'common-app', label: 'Common Application (or institutional application)', standard: true, group: 'core' },
  { id: 'supplements', label: 'Supplemental essays', standard: true, group: 'essays' },
  { id: 'testing', label: 'SAT / ACT scores sent (or a decision not to submit)', standard: true, group: 'testing' },
  { id: 'transcript', label: 'Official transcript requested', standard: true, group: 'core' },
  { id: 'recommendations', label: 'Recommendation letters requested', standard: true, group: 'recommendations' },
  { id: 'activities', label: 'Activities list finalised', standard: true, group: 'core' },
  { id: 'additional', label: 'Additional materials (portfolio, audition, resume)', standard: true, group: 'other' },
  { id: 'financial-aid', label: 'Financial aid forms (FAFSA / CSS Profile)', standard: true, group: 'financial' },
  { id: 'scholarships', label: 'Institutional scholarship applications', standard: true, group: 'financial' },
];

export const TASK_GROUPS: { id: ApplicationTask['group']; label: string }[] = [
  { id: 'core', label: 'Core application' },
  { id: 'essays', label: 'Essays' },
  { id: 'testing', label: 'Testing' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'financial', label: 'Financial' },
  { id: 'other', label: 'Other' },
];
