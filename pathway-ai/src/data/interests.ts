import type { InterestSubject } from '@/domain/types';

/**
 * The interest taxonomy used by onboarding, Student DNA and every matcher.
 * `strengthKeys` connects an interest to the academic-strength axes so a
 * student who loves physics is read as quantitative, not just "sciencey".
 */
export const INTERESTS: InterestSubject[] = [
  { id: 'mathematics', name: 'Mathematics', cluster: 'STEM', strengthKeys: ['quantitative', 'abstract-reasoning'] },
  { id: 'computer-science', name: 'Computer Science', cluster: 'STEM', strengthKeys: ['quantitative', 'building', 'abstract-reasoning'] },
  { id: 'biology', name: 'Biology', cluster: 'STEM', strengthKeys: ['scientific', 'memory-systems'] },
  { id: 'chemistry', name: 'Chemistry', cluster: 'STEM', strengthKeys: ['scientific', 'quantitative'] },
  { id: 'physics', name: 'Physics', cluster: 'STEM', strengthKeys: ['quantitative', 'scientific', 'abstract-reasoning'] },
  { id: 'engineering', name: 'Engineering', cluster: 'STEM', strengthKeys: ['quantitative', 'building', 'scientific'] },
  { id: 'environmental-science', name: 'Environmental Science', cluster: 'STEM', strengthKeys: ['scientific', 'systems-thinking'] },
  { id: 'statistics', name: 'Statistics & Data', cluster: 'STEM', strengthKeys: ['quantitative', 'analysis'] },
  { id: 'astronomy', name: 'Astronomy & Space', cluster: 'STEM', strengthKeys: ['scientific', 'quantitative'] },
  { id: 'robotics', name: 'Robotics', cluster: 'STEM', strengthKeys: ['building', 'quantitative'] },

  { id: 'business', name: 'Business', cluster: 'Professional', strengthKeys: ['analysis', 'communication', 'leadership'] },
  { id: 'economics', name: 'Economics', cluster: 'Social Sciences', strengthKeys: ['quantitative', 'analysis', 'systems-thinking'] },
  { id: 'finance', name: 'Finance', cluster: 'Professional', strengthKeys: ['quantitative', 'analysis'] },
  { id: 'entrepreneurship', name: 'Entrepreneurship', cluster: 'Professional', strengthKeys: ['building', 'leadership', 'communication'] },
  { id: 'marketing', name: 'Marketing & Media', cluster: 'Professional', strengthKeys: ['communication', 'creative'] },

  { id: 'psychology', name: 'Psychology', cluster: 'Social Sciences', strengthKeys: ['analysis', 'scientific', 'communication'] },
  { id: 'political-science', name: 'Political Science', cluster: 'Social Sciences', strengthKeys: ['writing', 'analysis', 'communication'] },
  { id: 'sociology', name: 'Sociology & Anthropology', cluster: 'Social Sciences', strengthKeys: ['writing', 'analysis'] },
  { id: 'international-relations', name: 'International Affairs', cluster: 'Social Sciences', strengthKeys: ['writing', 'languages', 'analysis'] },
  { id: 'geography', name: 'Geography & Urban Studies', cluster: 'Social Sciences', strengthKeys: ['systems-thinking', 'analysis'] },

  { id: 'history', name: 'History', cluster: 'Humanities', strengthKeys: ['writing', 'memory-systems', 'analysis'] },
  { id: 'english', name: 'English & Literature', cluster: 'Humanities', strengthKeys: ['writing', 'analysis'] },
  { id: 'philosophy', name: 'Philosophy', cluster: 'Humanities', strengthKeys: ['abstract-reasoning', 'writing'] },
  { id: 'languages', name: 'World Languages', cluster: 'Humanities', strengthKeys: ['languages', 'memory-systems'] },
  { id: 'classics', name: 'Classics', cluster: 'Humanities', strengthKeys: ['languages', 'writing'] },
  { id: 'journalism', name: 'Journalism & Writing', cluster: 'Humanities', strengthKeys: ['writing', 'communication'] },

  { id: 'music', name: 'Music', cluster: 'Arts', strengthKeys: ['creative', 'performance', 'discipline'] },
  { id: 'art', name: 'Visual Art', cluster: 'Arts', strengthKeys: ['creative', 'craft'] },
  { id: 'design', name: 'Design', cluster: 'Arts', strengthKeys: ['creative', 'building', 'craft'] },
  { id: 'theater', name: 'Theater & Film', cluster: 'Arts', strengthKeys: ['creative', 'performance', 'communication'] },
  { id: 'architecture', name: 'Architecture', cluster: 'Arts', strengthKeys: ['creative', 'building', 'quantitative'] },
  { id: 'creative-writing', name: 'Creative Writing', cluster: 'Arts', strengthKeys: ['writing', 'creative'] },

  { id: 'medicine', name: 'Medicine & Health', cluster: 'Health', strengthKeys: ['scientific', 'memory-systems', 'service'] },
  { id: 'public-health', name: 'Public Health', cluster: 'Health', strengthKeys: ['analysis', 'service', 'systems-thinking'] },
  { id: 'neuroscience', name: 'Neuroscience', cluster: 'Health', strengthKeys: ['scientific', 'analysis'] },
  { id: 'nutrition-sports', name: 'Sports Science & Nutrition', cluster: 'Health', strengthKeys: ['scientific', 'discipline'] },

  { id: 'law', name: 'Law', cluster: 'Professional', strengthKeys: ['writing', 'analysis', 'communication'] },
  { id: 'education', name: 'Education & Teaching', cluster: 'Professional', strengthKeys: ['communication', 'service', 'leadership'] },
  { id: 'community-service', name: 'Community Service', cluster: 'Other', strengthKeys: ['service', 'leadership'] },
  { id: 'athletics', name: 'Athletics', cluster: 'Other', strengthKeys: ['discipline', 'leadership', 'performance'] },
];

export const INTEREST_BY_ID = new Map(INTERESTS.map((i) => [i.id, i]));

export const INTEREST_CLUSTERS = [
  'STEM',
  'Social Sciences',
  'Humanities',
  'Arts',
  'Professional',
  'Health',
  'Other',
] as const;

export function interestName(id: string): string {
  return INTEREST_BY_ID.get(id)?.name ?? id;
}

/** Human labels for the derived strength axes. */
export const STRENGTH_LABELS: Record<string, string> = {
  quantitative: 'Quantitative reasoning',
  scientific: 'Scientific reasoning',
  'abstract-reasoning': 'Abstract & logical reasoning',
  writing: 'Writing & argument',
  languages: 'Languages',
  communication: 'Communication',
  analysis: 'Analysis & research',
  building: 'Building & making',
  creative: 'Creative work',
  craft: 'Craft & visual skill',
  performance: 'Performance',
  leadership: 'Leadership',
  service: 'Service & community',
  discipline: 'Sustained discipline',
  'memory-systems': 'Detail & recall',
  'systems-thinking': 'Systems thinking',
};

export const STRENGTH_KEYS = Object.keys(STRENGTH_LABELS);
