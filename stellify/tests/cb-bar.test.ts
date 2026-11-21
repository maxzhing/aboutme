import { describe, expect, it } from 'vitest';
import { ALL_RAW } from '@/data/questions/all';
import { cbBarIssues } from '@/data/questions/rules';

/**
 * DECISIONS 36: hard and very hard Reading and Writing questions are being rewritten up to the College Board’s
 * hard level. This number only ever goes down: lower it whenever questions are rewritten, never raise it.
 * New questions must meet the bar, so adding one below it fails this test.
 */
const MAX_BELOW_BAR = 167;

describe('College Board hard bar', () => {
  it('the number of hard questions below the College Board hard level never grows', () => {
    const below = ALL_RAW.filter((q) => cbBarIssues(q).length > 0);
    expect(below.length).toBeLessThanOrEqual(MAX_BELOW_BAR);
  });
});
