import type { PracticeQuestion } from '@/domain/types';

export type QInput = Omit<PracticeQuestion, 'original' | 'exam'> & {
  exam?: PracticeQuestion['exam'];
};

/**
 * All practice items in this app are written for Pathway AI. No College Board
 * material is reproduced. Items are labelled as practice questions everywhere
 * they appear, and `original: true` is asserted on every record.
 */
export const sat = (q: Omit<QInput, 'satSection'> & { satSection: 'math' | 'reading-writing' }): PracticeQuestion => ({
  ...q,
  exam: 'SAT',
  original: true,
});

export const ap = (q: QInput & { courseId: string }): PracticeQuestion => ({
  ...q,
  exam: 'AP',
  original: true,
});

/** Convenience for four-option multiple choice. */
export function choices(
  texts: [string, string, string, string],
  whys: [string?, string?, string?, string?] = [],
): PracticeQuestion['choices'] {
  return texts.map((text, i) => ({
    id: String.fromCharCode(65 + i),
    text,
    ...(whys[i] ? { why: whys[i] as string } : {}),
  }));
}
