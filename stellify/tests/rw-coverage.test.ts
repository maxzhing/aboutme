import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '@/data/questions';
import { formatOf, genreOf, GENRE_TAGS, type Genre } from '@/data/questions/genres';
import { SKILL } from '@/lib/taxonomy';

const rw = QUESTIONS.filter((q) => q.section === 'rw');
const GENRES: Genre[] = ['literature', 'history-social', 'humanities', 'science'];

describe('Reading & Writing passage diversity', () => {
  it('every passage has a subject area, and every hand tag points at a real question', () => {
    expect(rw.filter((q) => !genreOf(q)).map((q) => q.id)).toEqual([]);
    for (const id of Object.keys(GENRE_TAGS)) expect(rw.some((q) => q.id === id), id).toBe(true);
  });
  it('each of the four domains draws on all four subject areas (at least 3 passages each)', () => {
    for (const d of ['ii', 'cs', 'eoi', 'sec']) for (const g of GENRES) {
      const n = rw.filter((q) => SKILL[q.skill].domain === d && genreOf(q) === g).length;
      expect(n, `${d} × ${g}`).toBeGreaterThanOrEqual(3);
    }
  });
  it('covers every passage format: paired texts, tables and graphs, and research notes', () => {
    const n = (f: string) => rw.filter((q) => formatOf(q) === f).length;
    expect(n('paired')).toBeGreaterThanOrEqual(15);
    expect(n('data')).toBeGreaterThanOrEqual(15);
    expect(n('notes')).toBeGreaterThanOrEqual(20);
  });
});
