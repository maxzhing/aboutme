/**
 * Render-time typography for prose (DESIGN.md): curly quotes and apostrophes, en dashes in number ranges,
 * a real minus sign before a lone negative number, and a single-character ellipsis. Authors keep typing plain
 * ASCII. This runs only on prose tokens: never on math (KaTeX already sets a true minus), code, or anything a
 * student types.
 */
const OPENER = /[\s([{—–/-]/;

export function typeset(src: string): string {
  if (!src) return src;
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i], prev = i ? src[i - 1] : '', next = src[i + 1] ?? '';
    if (c === '"') { out += !prev || OPENER.test(prev) ? '“' : '”'; continue; }
    if (c === "'") {
      // apostrophe or closing quote after a letter, digit or punctuation; opening quote at a word start
      const opening = (!prev || OPENER.test(prev) || prev === '“') && /[A-Za-z0-9]/.test(next);
      // a year or decade abbreviation ('90s) takes an apostrophe even at a word start
      const elided = /\d/.test(next) && /^\d\ds\b/.test(src.slice(i + 1, i + 4));
      out += opening && !elided ? '‘' : '’';
      continue;
    }
    out += c;
  }
  return out
    // number ranges: 25-150 → 25–150 (but never inside an ISO date like 2026-11-19)
    .replace(/(^|[^\d-])(\d[\d,.]*)-(\d[\d,.]*)(?![\d-])/g, (m, pre, a, b) => `${pre}${a}–${b}`)
    // a lone negative number: " -3" → " −3"
    .replace(/(^|[\s(=:,‘“])-(?=\d)/g, '$1−')
    .replace(/\.\.\./g, '…');
}

/** True when rendered prose still contains a straight quote (used by the content linter). */
export const hasStraightQuote = (s: string) => /["']/.test(s);
