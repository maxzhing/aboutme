import { describe, expect, it } from 'vitest';
import { ALL_RAW } from '@/data/questions/all';

// A backslash before a quote ("\"at least 30\"") or a control character (a lost "\b" from "\bar") shows up as
// literal junk in the explanation; both have happened when text was moved between string styles.
describe('question text hygiene', () => {
  it('no question text has a stray backslash before a quote or a control character', () => {
    const bad: string[] = [];
    for (const q of ALL_RAW) {
      const texts = [q.stem, q.passage ?? '', ...(q.choices ?? []), ...q.steps, ...q.why, q.concept, q.strategy, q.trap, q.remember];
      if (texts.some((t) => /\\["'`]|[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(t))) bad.push(q.id);
    }
    expect(bad).toEqual([]);
  });
});
