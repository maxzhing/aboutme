import { expect, it } from 'vitest';
import { MUSIC_LESSONS, MUSIC_TUTOR } from '@/data/music';
import { ivName, ivWords, pc, simpleName, spell, transpose } from '@/lib/music/theory';

/**
 * Lesson text is written by hand, so this scans it for interval statements ("C3 up to D4 is a major 9th",
 * "a major 3rd above F is A", "A4 down a perfect 5th is D4") and checks each one with the theory engine.
 */
const strs = (o: unknown, out: string[] = []): string[] => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach((x) => strs(x, out)); else if (o && typeof o === 'object') Object.values(o).forEach((x) => strs(x, out)); return out; };
const norm = (n: string) => n.replace(/♯/g, '#').replace(/♭/g, 'b');
const QQ: Record<string, string> = { major: 'M', minor: 'm', perfect: 'P', augmented: 'A', diminished: 'd' };
const ORD: Record<string, string> = { '2nd': '2', '3rd': '3', '4th': '4', '5th': '5', '6th': '6', '7th': '7', octave: '8', '9th': '9', '10th': '10' };

it('every interval statement in the lesson text agrees with the engine', () => {
  const text = [
    ...strs(MUSIC_LESSONS.map((l) => ({ intro: l.intro, notes: l.notes.map((n) => (n.k === 'try' ? n.prompt : n.k === 'staff' ? n.caption ?? '' : n)), ex: l.examples.map((e) => [e.q, e.steps, e.a]), pr: l.practice.map((p) => [p.q, p.hint, p.solution, p.choices ?? []]), rem: l.remember }))),
    ...strs(MUSIC_TUTOR),
  ];
  const Q = '(major|minor|perfect|augmented|diminished)';
  const NO = '([A-G][♯♭#b]?[0-9])', NP = '([A-G](?:♯|♭|#|b)?)(?![0-9a-z])';
  const withOctaves = new RegExp(`${NO}\\s*(?:up\\s+)?(?:to|and)\\s+${NO}\\s+(?:is|are|makes|spans)\\s+(?:a|an)\\s+(?:compound\\s+)?${Q}\\s+(\\d+)(?:st|nd|rd|th)`, 'g');
  const aboveBelow = new RegExp(`${Q} (2nd|3rd|4th|5th|6th|7th|octave|9th|10th) (above|below) ${NP}(?: \\(?[a-z ]*\\)?)? is ${NP}`, 'g');
  const upDown = new RegExp(`${NO}\\s+(up|down)\\s+(?:a|an)\\s+${Q}\\s+(\\d+)(?:st|nd|rd|th)\\s+is\\s+${NO}`, 'g');
  const pair = new RegExp(`${NP}(?:–| to | up to )${NP} is (?:a|an) ${Q} (2nd|3rd|4th|5th|6th|7th)`, 'g');
  const upDownPc = new RegExp(`${NP} (up|down) (?:a|an) ${Q} (2nd|3rd|4th|5th|6th|7th) is ${NP}`, 'g');
  const LET = 'CDEFGAB';
  const wrong: string[] = [];
  let n = 0;
  for (const s of text) {
    for (const m of s.matchAll(withOctaves)) {
      n++; const [, a, b, q, num] = m; const got = ivName(norm(a), norm(b)); const words = ivWords(got), simple = ivWords(simpleName(got));
      if (!words.startsWith(q) || !(words.includes(num) || simple.includes(num) || (num === '8' && words.includes('octave')))) wrong.push(`${m[0]} (engine: ${got})`);
    }
    for (const m of s.matchAll(aboveBelow)) {
      n++; const [, q, num, dir, from, to] = m; const p = transpose(norm(from) + '4', QQ[q] + ORD[num], dir === 'below');
      if (pc(p) !== norm(to)) wrong.push(`${m[0]} (engine: ${pc(p)})`);
    }
    for (const m of s.matchAll(upDown)) {
      n++; const [, from, dir, q, num, to] = m; const p = spell(transpose(norm(from), QQ[q] + num, dir === 'down'));
      if (p !== spell(norm(to))) wrong.push(`${m[0]} (engine: ${p})`);
    }
    for (const m of s.matchAll(pair)) {
      n++; const [, a, b, q, num] = m; const lo = norm(a) + '4';
      const hi = norm(b) + (LET.indexOf(norm(b)[0]) <= LET.indexOf(norm(a)[0]) ? '5' : '4');
      const got = ivName(lo, hi);
      if (got !== QQ[q] + ORD[num]) wrong.push(`${m[0]} (engine: ${got})`);
    }
    for (const m of s.matchAll(upDownPc)) {
      n++; const [, from, dir, q, num, to] = m; const p = transpose(norm(from) + '4', QQ[q] + ORD[num], dir === 'down');
      if (pc(p) !== norm(to)) wrong.push(`${m[0]} (engine: ${pc(p)})`);
    }
  }
  expect(wrong).toEqual([]);
  expect(n).toBeGreaterThanOrEqual(60);
});
