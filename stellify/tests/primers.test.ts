import { describe, expect, it } from 'vitest';
import { PRIMERS } from '../src/data/primers';
import { GLOSSARY, termsIn } from '../src/data/glossary';
import { CHAPTERS } from '../src/data/courses';
import { SKILLS } from '../src/lib/taxonomy';
import { plain } from '../src/lib/richtext';

describe('beginner support', () => {
  it('every SAT skill has a start-from-zero primer with a worked tiny example', () => {
    for (const s of SKILLS) {
      const p = PRIMERS[s.id];
      expect(p, s.id).toBeTruthy();
      expect(p.tiny.steps.length).toBeGreaterThan(0);
      expect(p.what.length).toBeGreaterThan(40);
    }
  });
  it('tiny math examples are right', () => {
    const want: Record<string, number> = { lin1: 8, linf: 2 * 4 + 3, sys: 7, equiv: 0, nleq: 7, nlf: 9, ratio: 6, pct: 24, data1: (7 + 8 + 8 + 9 + 10) / 5, data2: 5 * 4 + 60, area: 24, lines: 180 - 50 - 60, trig: Math.sqrt(5 ** 2 + 12 ** 2) };
    for (const [k, v] of Object.entries(want)) if (v) expect(Number(PRIMERS[k as keyof typeof PRIMERS].tiny.answer.replace(/[^\d.]/g, '')), k).toBe(v);
  });
  it('every chapter gets at least one word to know, and every glossary entry has an example', () => {
    for (const g of GLOSSARY) expect(g.example.length, g.term).toBeGreaterThan(5);
    const none = CHAPTERS.filter((c) => !termsIn(plain([c.goal, ...c.teach.map((t) => t.text), ...c.method].join(' ')), SKILLS.find((k) => k.id === c.skill)!.section).length).map((c) => c.id);
    expect(none).toEqual([]);
  });
});
