import { describe, expect, it } from 'vitest';
import { VOCAB } from '@/data/vocabulary';

describe('vocabulary', () => {
  it('has a substantial list with no duplicates', () => {
    expect(VOCAB.length).toBeGreaterThanOrEqual(280);
    expect(new Set(VOCAB.map((v) => v.w)).size).toBe(VOCAB.length);
  });
  it('uses every word, in exactly its listed form, in its example sentence, so quizzes can blank it out', () => {
    for (const v of VOCAB) {
      expect(new RegExp(`\\b${v.w}\\b`).test(v.ex), `${v.w}: ${v.ex}`).toBe(true);
      expect(v.def.length).toBeGreaterThan(5);
      expect(v.syn.length).toBeGreaterThanOrEqual(1);
    }
  });
});
