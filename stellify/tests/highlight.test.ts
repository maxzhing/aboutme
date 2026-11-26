import { describe, expect, it } from 'vitest';
import { addTextMark, cutRange, findBands, markAt, selectBoxes, trimRange, type Mark } from '@/lib/highlight';

const m = (id: string, s: number, e: number, c: Mark['c'] = 'yellow', note?: string): Mark => ({ id, c, s, e, note });

describe('text marks', () => {
  it('a new mark replaces what it covers and trims or splits what it overlaps', () => {
    let marks = addTextMark([], m('a', 0, 10));
    marks = addTextMark(marks, m('b', 4, 6, 'blue'));
    expect(marks.map((x) => [x.id, x.s, x.e, x.c])).toEqual([['a', 0, 4, 'yellow'], ['b', 4, 6, 'blue'], ['a~', 6, 10, 'yellow']]);
    marks = addTextMark(marks, m('c', 2, 8, 'pink'));
    expect(marks.map((x) => [x.s, x.e, x.c])).toEqual([[0, 2, 'yellow'], [2, 8, 'pink'], [8, 10, 'yellow']]);
  });
  it('removing a range trims marks and keeps their notes', () => {
    const marks = cutRange([m('a', 0, 10, 'yellow', 'key claim'), m('b', 12, 20)], 5, 15);
    expect(marks.map((x) => [x.s, x.e, x.note])).toEqual([[0, 5, 'key claim'], [15, 20, undefined]]);
  });
  it('finds the mark under a click and trims white space from a selection', () => {
    const marks = [m('a', 3, 7), m('b', 9, 12)];
    expect(markAt(marks, 3)?.id).toBe('a');
    expect(markAt(marks, 7)).toBeUndefined();
    expect(markAt(marks, 11)?.id).toBe('b');
    expect(trimRange('  the cat  ', 0, 11)).toEqual([2, 9]);
  });
});

describe('image marks', () => {
  // a 100 × 60 white page with two printed lines (rows 10–17 and 30–37) and a dotted divider at x = 97
  const w = 100, h = 60;
  const page = () => {
    const g = new Uint8Array(w * h).fill(255);
    for (const [y0, y1, x0, x1] of [[10, 18, 5, 80], [30, 38, 5, 50]]) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x += 2) g[y * w + x] = 20;
    for (let y = 0; y < h; y += 2) g[y * w + 97] = 40;
    return g;
  };
  it('finds each printed line and ignores the column divider', () => {
    const bands = findBands(page(), w, h);
    expect(bands).toHaveLength(2);
    expect(bands[0].x1).toBeLessThan(0.85); // the line ends where its text ends, not at the divider
    expect(bands[0].y0).toBeCloseTo(8 / 60, 2);
    expect(bands[1].x1).toBeLessThan(0.55);
  });
  it('a drag selects like text: rest of the first line, then the last line up to the pointer', () => {
    const bands = findBands(page(), w, h);
    const one = selectBoxes(bands, { x: 0.3, y: 0.23 }, { x: 0.6, y: 0.23 });
    expect(one).toHaveLength(1);
    expect(one[0][0]).toBeCloseTo(0.3); expect(one[0][2]).toBeCloseTo(0.3);
    const two = selectBoxes(bands, { x: 0.3, y: 0.55 }, { x: 0.5, y: 0.23 }); // dragged upward
    expect(two).toHaveLength(2);
    expect(two[0][0]).toBeCloseTo(0.5); // starts where the upper end of the drag was
    expect(two[1][0]).toBeCloseTo(bands[1].x0);
    expect(two[1][0] + two[1][2]).toBeCloseTo(0.3);
  });
  it('falls back to the dragged rectangle where there is no text', () => {
    expect(selectBoxes([], { x: 0.1, y: 0.1 }, { x: 0.4, y: 0.3 })).toEqual([[0.1, 0.1, 0.30000000000000004, 0.19999999999999998]]);
  });
});
