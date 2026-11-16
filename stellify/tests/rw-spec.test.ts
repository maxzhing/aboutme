import { describe, expect, it } from 'vitest';
import { ALL_RAW } from '@/data/questions/all';
import { DISTRACTORS, TRAPS } from '@/data/questions/distractors';
import { OFFICIAL_STEMS, PASSAGE_WORDS, cbSpecChecks, validateBank } from '@/data/questions/rules';
import { DOMAINS, SKILL } from '@/lib/taxonomy';

const rw = ALL_RAW.filter((q) => SKILL[q.skill].section === 'rw');

describe('Reading & Writing bank meets the College Board question specifications', () => {
  it('passes every item-level specification check', () => {
    const failures = rw.flatMap((q) => cbSpecChecks(q).map((e) => `${q.id}: ${e}`));
    expect(failures).toEqual([]);
  });

  it('uses only official stem wording and 25–150-word passages', () => {
    expect(PASSAGE_WORDS).toEqual({ min: 25, max: 150 });
    for (const s of ['cid', 'coet', 'coeq', 'inf', 'wic', 'tsp', 'ctc', 'tra', 'syn', 'bnd', 'fss'] as const) expect(OFFICIAL_STEMS[s], s).toBeDefined();
  });

  it('represents the four content domains in Digital SAT proportions', () => {
    expect(validateBank(ALL_RAW).filter((e) => e.startsWith('rw:'))).toEqual([]);
    for (const d of DOMAINS.filter((x) => x.section === 'rw')) {
      const share = rw.filter((q) => SKILL[q.skill].domain === d.id).length / rw.length;
      expect(Math.abs(share - d.weight), d.name).toBeLessThanOrEqual(0.03);
    }
  });

  it('tags every distractor with the reasoning error it represents', () => {
    for (const q of rw) {
      const tags = DISTRACTORS[q.id];
      expect(tags, `${q.id} has no distractor analysis`).toBeDefined();
      expect(tags.length, q.id).toBe(4);
      tags.forEach((t, i) => {
        if (i === q.answer) expect(t, `${q.id}: the key must not be tagged`).toBeNull();
        else expect(t && TRAPS[t], `${q.id} choice ${'ABCD'[i]}`).toBeTruthy();
      });
    }
    for (const id of Object.keys(DISTRACTORS)) expect(rw.some((q) => q.id === id), `tags for unknown question ${id}`).toBe(true);
  });
});
