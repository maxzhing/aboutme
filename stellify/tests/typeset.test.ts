import { describe, expect, it } from 'vitest';
import { typeset } from '../src/lib/typeset';

describe('typeset', () => {
  it('curls double quotes', () => expect(typeset('He said "yes" and "no."')).toBe('He said “yes” and “no.”'));
  it('curls apostrophes and single quotes', () => {
    expect(typeset("don't")).toBe('don’t');
    expect(typeset("the students' notes")).toBe('the students’ notes');
    expect(typeset("'Up-Hill' by Rossetti")).toBe('‘Up-Hill’ by Rossetti');
    expect(typeset("the '90s")).toBe('the ’90s');
  });
  it('turns number ranges into en dashes but keeps ISO dates', () => {
    expect(typeset('25-150 words')).toBe('25–150 words');
    expect(typeset('Practice Tests 4-10')).toBe('Practice Tests 4–10');
    expect(typeset('checked on 2026-11-18')).toBe('checked on 2026-11-18');
  });
  it('uses a real minus for a lone negative number', () => {
    expect(typeset('the slope is -3')).toBe('the slope is −3');
    expect(typeset('(-2, 5)')).toBe('(−2, 5)');
  });
  it('leaves hyphenated words alone', () => expect(typeset('well-known, two-variable')).toBe('well-known, two-variable'));
  it('ellipsis', () => expect(typeset('wait...')).toBe('wait…'));
});
