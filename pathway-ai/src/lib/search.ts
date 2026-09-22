/* ==========================================================================
   Lightweight fuzzy search used by global search and the command palette.
   ========================================================================== */

export interface Scored<T> {
  item: T;
  score: number;
  /** Matched character indices in the primary field, for highlighting. */
  matches?: number[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Subsequence match with bonuses for prefix, word-boundary and contiguous hits.
 * Returns null when the needle is not a subsequence of the haystack.
 */
export function fuzzyScore(needle: string, haystack: string): { score: number; matches: number[] } | null {
  const n = normalize(needle);
  const h = normalize(haystack);
  if (!n) return { score: 0, matches: [] };
  if (n.length > h.length) return null;

  const exact = h.indexOf(n);
  if (exact === 0) return { score: 1000 - h.length, matches: range(0, n.length) };
  if (exact > 0) {
    const boundary = /[\s\-_/(]/.test(h[exact - 1]);
    return { score: (boundary ? 800 : 620) - exact - h.length * 0.1, matches: range(exact, exact + n.length) };
  }

  let hi = 0;
  let score = 0;
  let streak = 0;
  const matches: number[] = [];
  for (let ni = 0; ni < n.length; ni++) {
    const ch = n[ni];
    let found = -1;
    while (hi < h.length) {
      if (h[hi] === ch) {
        found = hi;
        break;
      }
      hi++;
    }
    if (found === -1) return null;
    matches.push(found);
    const atBoundary = found === 0 || /[\s\-_/(]/.test(h[found - 1]);
    score += 10 + (atBoundary ? 14 : 0) + streak * 6;
    streak = streak + 1;
    hi = found + 1;
  }
  return { score: score - h.length * 0.35, matches };
}

export interface SearchField<T> {
  get: (item: T) => string | string[] | undefined;
  weight: number;
}

export function searchItems<T>(
  query: string,
  items: readonly T[],
  fields: SearchField<T>[],
  limit = 50,
): Scored<T>[] {
  const q = query.trim();
  if (!q) return items.slice(0, limit).map((item) => ({ item, score: 0 }));
  const out: Scored<T>[] = [];
  for (const item of items) {
    let best = -Infinity;
    let bestMatches: number[] | undefined;
    let isPrimary = true;
    for (const field of fields) {
      const raw = field.get(item);
      const values = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
      for (const value of values) {
        if (!value) continue;
        const res = fuzzyScore(q, value);
        if (res && res.score * field.weight > best) {
          best = res.score * field.weight;
          if (isPrimary) bestMatches = res.matches;
        }
      }
      isPrimary = false;
    }
    if (best > -Infinity) out.push({ item, score: best, matches: bestMatches });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i < to; i++) out.push(i);
  return out;
}

/** Splits a string into matched/unmatched runs for highlight rendering. */
export function highlightRuns(text: string, matches?: number[]): { text: string; hit: boolean }[] {
  if (!matches || !matches.length) return [{ text, hit: false }];
  const set = new Set(matches);
  const runs: { text: string; hit: boolean }[] = [];
  let buf = '';
  let hit = set.has(0);
  for (let i = 0; i < text.length; i++) {
    const isHit = set.has(i);
    if (isHit !== hit) {
      if (buf) runs.push({ text: buf, hit });
      buf = '';
      hit = isHit;
    }
    buf += text[i];
  }
  if (buf) runs.push({ text: buf, hit });
  return runs;
}
