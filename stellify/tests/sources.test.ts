import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_RAW } from '@/data/questions/all';

/** Every quotation in a question that cites a saved public-domain source must appear in that source word for word. */
const DIR = join(__dirname, '../content/sources');
const norm = (s: string) => s.replace(/[‘’`]/g, "'").replace(/[“”]/g, '"').replace(/--/g, '—').replace(/\s+/g, ' ').trim();
const texts = new Map(readdirSync(DIR).filter((f) => f.endsWith('.txt')).map((f) => {
  const t = readFileSync(join(DIR, f), 'utf8');
  return [t.split('\n')[0].trim(), norm(t)] as const;
}));

describe('quotations match their sources', () => {
  const quoted = ALL_RAW.filter((q) => q.meta?.source && texts.has(q.meta.source.url));
  it('every cited source text is saved', () => {
    const missing = ALL_RAW.filter((q) => q.meta?.source?.url.includes('wikisource.org') && !texts.has(q.meta.source.url)).map((q) => q.id);
    expect(missing).toEqual([]);
    expect(quoted.length).toBeGreaterThan(10);
  });
  it('each quoted line or sentence appears in the source exactly (apart from typographic quotes and line breaks)', () => {
    const bad: string[] = [];
    for (const q of quoted) {
      const src = texts.get(q.meta!.source!.url)!;
      for (const c of q.choices ?? []) {
        if (!/^[“"]/.test(c.trim())) continue;
        // strip the outer quotation marks; " / " marks a line break in poetry
        const body = c.trim().replace(/^[“"]/, '').replace(/[”"]$/, '');
        for (const part of body.split(' / ')) {
          const p = norm(part).replace(/^'|'$/g, '').replace(/[,;:]$/, '');
          // a quotation that contains an inner quotation (”...“) is checked piece by piece
          for (const piece of p.split(/"\s*[a-z ,]+\s*"|'(?=[A-Z])|(?<=[;,])'/).map((x) => x.replace(/^["']|["']$/g, '').trim()).filter((x) => x.length > 8)) {
            if (!src.includes(piece) && !src.toLowerCase().includes(piece.toLowerCase())) bad.push(`${q.id}: "${piece.slice(0, 70)}"`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('literary excerpts match their sources', () => {
  const excerpts = ALL_RAW.filter((q) => q.meta?.source && texts.has(q.meta.source.url) && /^The following text is from/.test(q.passage ?? ''));
  it('each excerpt after its context line is copied from the source exactly', () => {
    expect(excerpts.length).toBeGreaterThan(10);
    // compared without letter case: an opening word printed in capitals (“BUCK did not read”) is set in normal type
    const bad = excerpts.filter((q) => !texts.get(q.meta!.source!.url)!.toLowerCase().includes(norm(q.passage!.split('\n\n').slice(1).join(' ')).toLowerCase())).map((q) => q.id);
    expect(bad).toEqual([]);
  });
  it('every phrase quoted in the steps and explanations appears in the excerpt', () => {
    const bad: string[] = [];
    for (const q of excerpts) {
      // a quotation inside an explanation uses single marks for the text's double ones
      const flat = (x: string) => norm(x).replace(/"/g, "'").toLowerCase();
      const body = flat(q.passage!.split('\n\n').slice(1).join(' '));
      for (const t of [...(q.why ?? []), ...(q.steps ?? [])]) {
        for (const m of t.matchAll(/“([^”]+)”/g)) {
          const phrase = flat(m[1]).replace(/[.,;:!?']+$/, '');
          if (!body.includes(phrase)) bad.push(`${q.id}: “${m[1]}”`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
