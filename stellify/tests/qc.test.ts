import { describe, expect, it } from 'vitest';
import { choiceFlags, duplicates, jaccard } from '@/lib/engine/qc';
import { QC_REVIEWED } from '@/data/qcReviewed';
import { QUESTIONS } from '@/data/questions';
import type { Question } from '@/lib/types';

describe('question quality control', () => {
  const flags = [...duplicates(QUESTIONS), ...QUESTIONS.flatMap(choiceFlags)];
  const key = (f: { kind: string; qid: string; other?: string }) => `${f.kind}|${f.qid}|${f.other ?? ''}`;
  it('every flag on the bank has been reviewed by a person (fixed, or kept with a reason)', () => {
    const open = flags.filter((f) => !QC_REVIEWED[key(f)]);
    expect(open.map((f) => `${key(f)}: ${f.detail}`)).toEqual([]);
  });
  it('reviewed notes do not go stale: each still matches a current flag', () => {
    for (const k of Object.keys(QC_REVIEWED)) expect(flags.some((f) => key(f) === k), k).toBe(true);
  });
  it('catches identical choices, a length giveaway and near-duplicate questions', () => {
    const base = QUESTIONS.find((q) => q.section === 'rw' && q.type === 'mcq')!;
    const bad: Question = { ...base, id: 'qc-test', choices: ['Short.', 'Short.', 'A much longer and very carefully hedged answer choice that clearly stands out from the rest here.', 'Tiny.'], answer: 2 };
    const kinds = choiceFlags(bad).map((f) => f.kind);
    expect(kinds).toContain('similar-choices');
    expect(kinds).toContain('length-tell');
    expect(duplicates([base, { ...base, id: 'qc-copy' }]).length).toBe(1);
    expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1);
  });
});
