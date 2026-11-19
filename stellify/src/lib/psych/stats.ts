import type { ItemEvent } from './events';

/**
 * Classical item statistics (METHODOLOGY.md). Every number carries its sample size; nothing is decided under
 * MIN_DECIDE responses, and a statistic is called stable at STABLE responses.
 *
 *  p                percent correct (first attempts, cleaned)
 *  r_pb             corrected point-biserial: the correlation between getting this item right and the person's
 *                   proportion correct on their OTHER items (so the item does not correlate with itself)
 *  options          how often each option was chosen, overall and by ability third (low / middle / high)
 *  time             response-time quartiles in ms
 *
 * Flags (thresholds justified in METHODOLOGY.md):
 *  p < .10 or p > .95           review: too hard or too easy to tell students apart
 *  r_pb < .10                   review: weak discrimination
 *  r_pb < 0                     URGENT: check the answer key (stronger students get it wrong more often)
 *  a distractor beats the key among the top third        ambiguous: a second defensible answer?
 *  a misconception-tagged option nobody picks            tag check: the tag may not match real thinking
 */
export const MIN_DECIDE = 100;
export const STABLE = 200;

export type FlagKind = 'urgent-key' | 'low-discrimination' | 'too-hard' | 'too-easy' | 'ambiguous' | 'tag-unused';
export interface ItemFlag { kind: FlagKind; urgent: boolean; text: string }
export interface OptionRow { option: string; all: number; low: number; mid: number; high: number; key: boolean; tag?: string | null }
export interface ItemStat {
  item: string;
  n: number;
  p: number | null;
  rpb: number | null;
  options: OptionRow[];
  time: { q1: number; median: number; q3: number } | null;
  status: 'insufficient' | 'provisional' | 'stable';
  flags: ItemFlag[];
}

const quart = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const q = (f: number) => { const i = (s.length - 1) * f, lo = Math.floor(i), hi = Math.ceil(i); return Math.round(s[lo] + (s[hi] - s[lo]) * (i - lo)); };
  return { q1: q(0.25), median: q(0.5), q3: q(0.75) };
};

/** Pearson correlation; null when either side has no variance. */
export function correlation(x: number[], y: number[]): number | null {
  const n = x.length;
  if (n < 2) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

export function itemStats(events: ItemEvent[], info: (id: string) => { key: string | null; choices: number; tags?: (string | null)[] } | undefined): ItemStat[] {
  // each person's totals, so the rest score can leave out the item being analysed
  const tot = new Map<string, { right: number; n: number }>();
  for (const e of events) { const t = tot.get(e.person) ?? { right: 0, n: 0 }; t.n++; if (e.correct) t.right++; tot.set(e.person, t); }
  const rest = (e: ItemEvent) => { const t = tot.get(e.person)!; return t.n > 1 ? (t.right - Number(e.correct)) / (t.n - 1) : null; };
  const byItem = new Map<string, ItemEvent[]>();
  for (const e of events) byItem.set(e.item_id, [...(byItem.get(e.item_id) ?? []), e]);
  const out: ItemStat[] = [];
  for (const [item, rows] of byItem) {
    const meta = info(item);
    const n = rows.length;
    const p = n ? rows.filter((r) => r.correct).length / n : null;
    const paired = rows.map((r) => [Number(r.correct), rest(r)] as const).filter((x): x is readonly [number, number] => x[1] !== null);
    const rpb = paired.length >= 2 ? correlation(paired.map((x) => x[0]), paired.map((x) => x[1])) : null;
    // ability thirds among this item's responders, by rest score
    const ranked = rows.map((r) => ({ r, a: rest(r) ?? 0 })).sort((a, b) => a.a - b.a);
    const third = (i: number) => (i < ranked.length / 3 ? 'low' : i < (2 * ranked.length) / 3 ? 'mid' : 'high') as 'low' | 'mid' | 'high';
    const opts = new Map<string, OptionRow>();
    const keyOpt = meta?.key ?? null;
    const label = (o: string | null) => (o === null ? 'blank' : meta && meta.choices ? 'ABCD'[Number(o)] ?? o : o);
    if (meta?.choices) for (let i = 0; i < meta.choices; i++) opts.set('ABCD'[i], { option: 'ABCD'[i], all: 0, low: 0, mid: 0, high: 0, key: String(i) === keyOpt, tag: meta.tags?.[i] });
    ranked.forEach(({ r }, i) => {
      const k = meta?.choices ? label(r.chosen_option) : r.correct ? 'right' : 'wrong';
      const row = opts.get(k) ?? { option: k, all: 0, low: 0, mid: 0, high: 0, key: meta?.choices ? false : k === 'right' };
      row.all++; row[third(i)]++;
      opts.set(k, row);
    });
    const flags: ItemFlag[] = [];
    if (n >= MIN_DECIDE && p !== null) {
      if (rpb !== null && rpb < 0) flags.push({ kind: 'urgent-key', urgent: true, text: `Point-biserial ${rpb.toFixed(2)} is negative: stronger students miss it more often. Check the answer key.` });
      else if (rpb !== null && rpb < 0.1) flags.push({ kind: 'low-discrimination', urgent: false, text: `Point-biserial ${rpb.toFixed(2)} is below .10: it barely separates stronger from weaker students.` });
      if (p < 0.1) flags.push({ kind: 'too-hard', urgent: false, text: `Only ${(p * 100).toFixed(0)}% correct.` });
      if (p > 0.95) flags.push({ kind: 'too-easy', urgent: false, text: `${(p * 100).toFixed(0)}% correct.` });
      const key = [...opts.values()].find((o) => o.key);
      const rival = [...opts.values()].filter((o) => !o.key && o.option !== 'blank').sort((a, b) => b.high - a.high)[0];
      if (key && rival && rival.high > key.high) flags.push({ kind: 'ambiguous', urgent: false, text: `Among the top third, ${rival.option} (${rival.high}) was chosen more often than the key ${key.option} (${key.high}).` });
      for (const o of opts.values()) if (!o.key && o.tag && o.all === 0) flags.push({ kind: 'tag-unused', urgent: false, text: `Option ${o.option} is tagged “${o.tag}” but no one chose it.` });
    }
    out.push({ item, n, p, rpb, options: [...opts.values()], time: quart(rows.map((r) => r.time_ms)), status: n < MIN_DECIDE ? 'insufficient' : n < STABLE ? 'provisional' : 'stable', flags });
  }
  return out.sort((a, b) => Number(b.flags.some((f) => f.urgent)) - Number(a.flags.some((f) => f.urgent)) || b.flags.length - a.flags.length || b.n - a.n);
}
