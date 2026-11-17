import type { SkillId } from '../types';

/**
 * Pure parsers for the College Board's free paper SAT practice tests (the "digital SAT in
 * nondigital format" PDFs): the test booklet, the scoring guide (answer key and raw-score
 * conversion table) and the answer explanations. They work on positioned text items, so the same
 * code runs in the browser (pdf.js) and in the tests (pdf.js in Node). Coordinates are PDF points
 * at scale 1 with the origin at the top left; `y` is the text baseline.
 */
export interface PItem { x: number; y: number; w: number; h: number; s: string }
export interface PPage { n: number; width: number; height: number; items: PItem[] }
export interface Line { page: number; x: number; top: number; bottom: number; right: number; text: string; h: number }
export type ModKey = 'rw1' | 'rw2' | 'math1' | 'math2';
export const MOD_KEYS: ModKey[] = ['rw1', 'rw2', 'math1', 'math2'];
export type DocKind = 'booklet' | 'scoring' | 'answers' | 'unknown';

const pageText = (p: PPage) => p.items.map((i) => i.s).join(' ').replace(/\s+/g, ' ');

/** Which of the three practice-test PDFs this is. */
export function docKind(pages: PPage[]): DocKind {
  const head = pages.slice(0, 3).map(pageText).join(' ');
  if (/Scoring Your( Paper)? SAT/i.test(head) || /Raw Score Conversion Table/i.test(pages.map(pageText).join(' '))) return 'scoring';
  if (/ANSWER EXPLANATIONS/i.test(head)) return 'answers';
  const all = pages.slice(0, 8).map(pageText).join(' ');
  if (/\b\d+\s+QUESTIONS\b/.test(all) && /Module/.test(all)) return 'booklet';
  return 'unknown';
}

/** The practice test number ("SAT Practice Test #4"), if the file names it. */
export function testNumber(pages: PPage[]): number | null {
  const t = pages.slice(0, 3).map(pageText).join(' ');
  const m = t.match(/Practice\s*Test\s*#?\s*(\d{1,2})\b/i) ?? t.match(/Test\s*#\s*(\d{1,2})\b/i);
  return m ? Number(m[1]) : null;
}

/** Groups items into lines (top to bottom), joining words left to right. */
export function toLines(page: number, items: PItem[]): Line[] {
  const rows: { y: number; h: number; parts: PItem[] }[] = [];
  for (const it of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (!it.s.trim()) continue;
    const row = rows.find((r) => Math.abs(r.y - it.y) < Math.max(2, Math.min(r.h, it.h) * 0.45));
    if (row) row.parts.push(it); else rows.push({ y: it.y, h: it.h, parts: [it] });
  }
  return rows.map((r) => {
    r.parts.sort((a, b) => a.x - b.x);
    let text = '', end = -1e9;
    for (const p of r.parts) { const gap = p.x - end; text += text && gap > r.h * 0.12 && !text.endsWith(' ') && !p.s.startsWith(' ') ? ` ${p.s}` : p.s; end = p.x + p.w; }
    return { page, x: r.parts[0].x, top: r.y - r.h * 0.8, bottom: r.y + r.h * 0.25, right: Math.max(...r.parts.map((p) => p.x + p.w)), text: text.replace(/\s+/g, ' ').trim(), h: r.h };
  }).filter((l) => l.text).sort((a, b) => a.top - b.top);
}

// ─── Scoring guide ──────────────────────────────────────────────────────────

export interface KeyEntry { mcq?: number; spr?: string[] }
const SPR_TOKEN = /^[-–−]?(\d+(,\d{3})*(\.\d+)?|\.\d+|\d+\/\d+)$/;
const cleanSpr = (s: string) => s.replace(/[–−]/g, '-').replace(/,(?=\d{3}\b)/g, '').trim();

/** Reads one answer cell: "B", "9", "15; -5", "361/8; 45.12; 45.13". */
export function parseKeyCell(cell: string): KeyEntry | null {
  const t = cell.trim();
  if (/^[A-D]$/.test(t)) return { mcq: 'ABCD'.indexOf(t) };
  const parts = t.split(/\s*;\s*|\s+or\s+/).map(cleanSpr).filter(Boolean);
  return parts.length && parts.every((p) => SPR_TOKEN.test(p)) ? { spr: parts } : null;
}

/** Text size relative to the standard 10.5-point guide: some guides print these pages much smaller. */
function scaleOf(page: PPage): number {
  const hs = page.items.filter((i) => /^\d{1,3}$/.test(i.s.trim())).map((i) => i.h).sort((a, b) => a - b);
  return hs.length ? hs[Math.floor(hs.length / 2)] / 10.5 : 1;
}
function rowsOf(items: PItem[], tol: number): PItem[][] {
  const rows: { y: number; items: PItem[] }[] = [];
  for (const it of [...items].sort((a, b) => a.y - b.y)) {
    const r = rows.find((x) => Math.abs(x.y - it.y) < tol);
    if (r) r.items.push(it); else rows.push({ y: it.y, items: [it] });
  }
  return rows.map((r) => r.items.sort((a, b) => a.x - b.x));
}

/** The answer key page: four columns (R&W Module 1, R&W Module 2, Math Module 1, Math Module 2). */
export function parseAnswerKey(pages: PPage[]): Record<ModKey, KeyEntry[]> | null {
  // the guides also print a miniature sample worksheet (with example answers): use the full-size page
  for (const page of fullSize(pages.filter((p) => /Answer Key/i.test(pageText(p)) && /QUESTION\s*#/.test(pageText(p))))) {
    const r = keyFromPage(page);
    if (r) return r;
  }
  return null;
}
/** Candidate pages, largest printed text first. */
const fullSize = (ps: PPage[]) => [...ps].sort((a, b) => scaleOf(b) - scaleOf(a));

function keyFromPage(page: PPage): Record<ModKey, KeyEntry[]> | null {
  const f = scaleOf(page);
  const heads = page.items.filter((i) => /QUESTION\s*#/.test(i.s)).sort((a, b) => a.x - b.x);
  if (heads.length < 4) return null;
  const out: Record<ModKey, KeyEntry[]> = { rw1: [], rw2: [], math1: [], math2: [] };
  const below = page.items.filter((i) => i.y > heads[0].y + 2 * f && i.s.trim());
  for (const items of rowsOf(below, 1.2 * f)) {
    // the question number is the item nearest each "QUESTION #" header; the answer runs to the next number
    const nums = heads.map((h) => items.filter((i) => /^\d{1,2}$/.test(i.s.trim()) && Math.abs(i.x - h.x) < 12 * f).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0]);
    nums.forEach((nItem, col) => {
      if (!nItem) return;
      const next = nums.slice(col + 1).find(Boolean)?.x ?? Infinity;
      const cell = items.filter((i) => i !== nItem && i.x > nItem.x && i.x < next).map((i) => i.s.trim()).join(' ');
      const entry = parseKeyCell(cell);
      if (entry) out[MOD_KEYS[col]][Number(nItem.s) - 1] = entry;
    });
  }
  const ok = MOD_KEYS.every((k) => out[k].length >= 10 && Array.from({ length: out[k].length }, (_, i) => out[k][i]).every(Boolean));
  return ok ? out : null;
}

export interface ScoreTable { rw: [number, number][]; math: [number, number][] }

/** The raw-score conversion table: for each raw score, the lower and upper section score. */
export function parseScoreTable(pages: PPage[]): ScoreTable | null {
  for (const page of fullSize(pages.filter((p) => /Raw Score Conversion Table/i.test(pageText(p))))) {
    const r = tableFromPage(page);
    if (r) return r;
  }
  return null;
}

function tableFromPage(page: PPage): ScoreTable | null {
  const f = scaleOf(page);
  const title = page.items.find((i) => /Raw Score Conversion Table/i.test(i.s))!;
  const raws = page.items.filter((i) => /RAW SCORE/i.test(i.s) && i.y > title.y).sort((a, b) => a.x - b.x);
  // the right half of the table starts at its own RAW SCORE column
  const split = raws.length >= 2 ? raws[raws.length - 1].x - 10 * f : page.width / 2;
  const nums = page.items.filter((i) => i.y > title.y + 6 * f && /^\d{1,3}$/.test(i.s.trim()));
  const rw: [number, number][] = [], math: [number, number][] = [];
  for (const items of rowsOf(nums, 1.2 * f)) {
    for (const half of [items.filter((i) => i.x < split), items.filter((i) => i.x >= split)]) {
      const v = half.map((i) => Number(i.s));
      if (v.length < 3 || v[0] > 66 || v.slice(1).some((s) => s < 200 || s > 800 || s % 10)) continue;
      rw[v[0]] = [v[1], v[2]];
      if (v.length >= 5) math[v[0]] = [v[3], v[4]];
    }
  }
  // every raw score present, ranges well formed, and scores rising (the printed tables have rare one-row dips)
  const mid = (x: [number, number]) => (x[0] + x[1]) / 2;
  const valid = (t: [number, number][]) => t.length > 30 && Array.from({ length: t.length }, (_, i) => t[i]).every((x, i) => x && x[0] <= x[1] && (i === 0 || mid(x) >= mid(t[i - 1]) - 20)) && mid(t[t.length - 1]) > mid(t[0]) + 300;
  return valid(rw) && valid(math) ? { rw, math } : null;
}

// ─── Test booklet ───────────────────────────────────────────────────────────

export interface Box { x0: number; y0: number; x1: number; y1: number }
/** One question; `parts` has more than one entry when the question continues into the next column or page. */
export interface BookletQuestion { mod: ModKey; num: number; parts: { page: number; box: Box }[]; lines: Line[] }
export interface BookletModule { mod: ModKey; count: number; questions: BookletQuestion[] }
export interface Booklet { modules: BookletModule[]; minutes: Partial<Record<ModKey, number>> }

/** Scan artifacts: column rules, dotted separators, very large OCR blobs. */
const junk = (i: PItem) => i.h > 30 || /^[-~.·…\s]{4,}$/.test(i.s) || !i.s.trim();

const word = (i: PItem) => /[A-Za-z0-9]/.test(i.s);
const bodyOf = (p: PPage) => p.items.filter((i) => !junk(i) && i.y > p.height * 0.1 && i.y < p.height * 0.94 && !/^(Module|CONTINUE|CO NTI N U E|STOP)$/i.test(i.s.trim()));
/** Number-like items standing alone on their line, with no words further left in the lines just below. */
function numberCandidates(col: PItem[]): PItem[] {
  return col.filter((n) => /^\d{1,2}$/.test(n.s.trim())
    && !col.some((o) => o !== n && word(o) && Math.abs(o.y - n.y) < 3 && Math.abs(o.x - n.x) < 220)
    && !col.some((o) => o !== n && word(o) && o.y > n.y - 4 && o.y < n.y + 60 && o.x < n.x - 3)).sort((a, b) => a.y - b.y);
}

export function parseBooklet(pages: PPage[]): Booklet {
  const modules: BookletModule[] = [];
  const minutes: Partial<Record<ModKey, number>> = {};
  let section: 'rw' | 'math' | null = null, cur: BookletModule | null = null;
  // Question numbers sit at one x position per column (left and right pages differ slightly).
  // Learn those positions first, so axis labels and numbers inside figures are never taken for questions.
  const numX = new Map<string, number>();
  {
    const votes = new Map<string, Map<number, number>>();
    for (const p of pages) for (const [c, c0, c1] of [[0, 0, p.width / 2], [1, p.width / 2, p.width]] as const) {
      for (const n of numberCandidates(bodyOf(p).filter((i) => i.x >= c0 && i.x < c1))) {
        const key = `${p.n % 2}-${c}`, x = Math.round(n.x / 3) * 3;
        const v = votes.get(key) ?? new Map<number, number>(); v.set(x, (v.get(x) ?? 0) + 1); votes.set(key, v);
      }
    }
    for (const [key, v] of votes) { const best = [...v].sort((a, b) => b[1] - a[1])[0]; if (best && best[1] >= 3) numX.set(key, best[0]); }
  }
  for (const p of pages) {
    const txt = pageText(p);
    for (const m of txt.matchAll(/(Reading and Writing|Math),\s*Module\s*(\d)\s*:\s*(\d+)\s*minutes/gi)) minutes[`${/math/i.test(m[1]) ? 'math' : 'rw'}${m[2]}` as ModKey] = Number(m[3]);
    const items = p.items.filter((i) => !junk(i));
    const head = items.filter((i) => i.y < p.height * 0.12);
    const modNo = (() => { const k = head.findIndex((i) => /^Module$/.test(i.s.trim())); const d = head.find((i) => /^[12]$/.test(i.s.trim()) && (k < 0 || i.y > head[k].y)); return k >= 0 && d ? Number(d.s) : null; })();
    const title = items.find((i) => i.h > 15 && /^(Reading and Writing|Math)$/.test(i.s.trim()));
    if (title) {
      section = /Math/.test(title.s) ? 'math' : 'rw';
      const count = Number(txt.match(/(\d+)\s*QUESTIONS/)?.[1] ?? 0);
      const mod = `${section}${modNo ?? (modules.filter((m) => m.mod.startsWith(section!)).length + 1)}` as ModKey;
      cur = { mod, count, questions: [] };
      modules.push(cur);
    }
    // a module runs from its title page to its STOP page (some scanned pages have no readable header)
    if (!cur || /No Test Material On This Page/i.test(txt)) continue;
    const body = bodyOf(p);
    const mid = p.width / 2;
    for (const [c0, c1] of [[0, mid], [mid, p.width]] as const) {
      const col = body.filter((i) => i.x >= c0 && i.x < c1);
      const nx = numX.get(`${p.n % 2}-${c0 === 0 ? 0 : 1}`);
      const starts = numberCandidates(col).filter((n) => nx === undefined || Math.abs(n.x - nx) <= 6);
      const accepted: PItem[] = [];
      // numbers run in order; one unreadable number is tolerated so the rest of the module is not lost
      for (const n of starts) { const last = accepted.length ? Number(accepted[accepted.length - 1].s) : cur.questions[cur.questions.length - 1]?.num ?? 0; const v = Number(n.s); if (v > last && v <= last + 2) accepted.push(n); }
      const x0 = c0 === 0 ? Math.max(0, Math.min(...col.filter(word).map((i) => i.x)) - 8) : mid + 4;
      const x1 = c0 === 0 ? mid - 4 : p.width - 18;
      // text above the first number in a column continues the previous question
      const firstTop = accepted.length ? accepted[0].y - accepted[0].h - 6 : p.height * 0.94;
      const carry = col.filter((i) => i.y < firstTop && word(i));
      const prev = cur.questions[cur.questions.length - 1];
      if (prev && carry.length && !/^STOP$/i.test(carry[carry.length - 1].s.trim())) {
        const y0 = Math.min(...carry.map((i) => i.y - i.h)) - 4;
        prev.parts.push({ page: p.n, box: { x0, y0, x1, y1: firstTop } });
        prev.lines.push(...toLines(p.n, col.filter((i) => i.y < firstTop)));
      }
      accepted.forEach((n, k) => {
        const next = accepted[k + 1];
        const y0 = n.y - n.h - 3, y1 = next ? next.y - next.h - 6 : p.height * 0.94;
        const inside = col.filter((i) => i !== n && i.y > y0 && i.y <= y1 + 1);
        cur!.questions.push({ mod: cur!.mod, num: Number(n.s), parts: [{ page: p.n, box: { x0: Math.max(x0, n.x - 8), y0, x1, y1 } }], lines: toLines(p.n, inside) });
      });
    }
    if (p.items.some((i) => /^STOP$/i.test(i.s.trim()))) cur = null;
  }
  return { modules, minutes };
}

// ─── Answer explanations ────────────────────────────────────────────────────

export interface Explanation { mod: ModKey; num: number; lines: Line[]; text: string }

export function parseExplanations(pages: PPage[]): Map<string, Explanation> {
  const out = new Map<string, Explanation>();
  let mod: ModKey | null = null, cur: Explanation | null = null;
  for (const p of pages) {
    const lines = toLines(p.n, p.items.filter((i) => i.s.trim()));
    for (const l of lines) {
      const hm = l.text.match(/(READING AND WRITING|MATH)\s*:\s*MODULE\s*(\d)/i);
      if (hm) {
        const m = `${/MATH/i.test(hm[1]) ? 'math' : 'rw'}${hm[2]}` as ModKey;
        if (m !== mod) { mod = m; cur = null; }
        continue;
      }
      if (/SAT PRACTICE TEST\s*#\s*\d+\s*ANSWER EXPLANATIONS/i.test(l.text) || /^\d{1,3}$/.test(l.text) || l.top > p.height * 0.95) continue;
      const q = l.text.match(/^QUESTION\s+(\d+)$/i);
      if (q && mod) { cur = { mod, num: Number(q[1]), lines: [], text: '' }; out.set(`${mod}-${cur.num}`, cur); continue; }
      if (cur) cur.lines.push(l);
    }
  }
  for (const e of out.values()) e.text = e.lines.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim();
  return out;
}

/** Whether a key entry matches what the College Board's explanation says is correct. */
export function keyAgrees(k: KeyEntry, explanation: string): boolean {
  if (k.mcq !== undefined) {
    const m = explanation.match(/Choice ([A-D]) is (?:the best answer|correct)/);
    return !m || 'ABCD'.indexOf(m[1]) === k.mcq;
  }
  // stacked fractions, split decimals ("4 51.") and thousands ("2 850,") lose their layout in the text,
  // so compare digits only, and skip explanations whose number did not survive at all
  const m = explanation.match(/The correct answer is (?:either )?([-–−]?\s?\d[\d .,/]*)/);
  if (!m) return true;
  const digits = (x: string) => x.replace(/\D/g, '');
  const said = digits(m[1]);
  return k.spr!.some((a) => digits(a) === said || digits(a.split('/')[0]) === said || said.startsWith(digits(a)));
}

/** Splits an explanation into the College Board's note on each choice. */
export function choiceNotes(text: string): string[] {
  const why = ['', '', '', ''];
  for (const part of text.split(/(?=Choice [A-D] is (?:the best answer|correct|incorrect))/)) {
    const m = part.match(/^Choice ([A-D]) is/);
    if (m) why['ABCD'.indexOf(m[1])] += (why['ABCD'.indexOf(m[1])] ? ' ' : '') + part.trim();
  }
  return why;
}

// ─── Reading & Writing text rebuild ─────────────────────────────────────────

export interface RwText { passage: string; notes?: string[]; stem: string; choices: string[]; clean: boolean; figure: boolean }

const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/_{3,}/g, '______').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').trim();
const glue = (parts: string[]) => parts.reduce((a, p) => (a.endsWith('-') && !a.endsWith(' -') ? a.slice(0, -1) + p : a ? `${a} ${p}` : p), '');

/** Rebuilds passage, stem and choices from the lines of one booklet question. */
export function rwFromLines(lines: Line[], colWidth: number): RwText {
  const at = lines.findIndex((l) => /^A\)\s*/.test(l.text));
  const pre = at >= 0 ? lines.slice(0, at) : lines;
  const choices: string[] = [];
  if (at >= 0) {
    let curr: string[] | null = null;
    for (const l of lines.slice(at)) {
      const m = l.text.match(/^([A-D])\)\s*(.*)/);
      if (m) { curr = [m[2]]; choices.push(''); } else if (curr) curr.push(l.text);
      if (curr) choices[choices.length - 1] = tidy(glue(curr));
    }
  }
  // paragraphs from vertical gaps; short lines inside a paragraph (poetry) keep their breaks
  const steps = pre.slice(1).map((l, i) => l.top - pre[i].top).filter((g) => g > 0).sort((a, b) => a - b);
  const step = steps[Math.floor(steps.length / 3)] ?? 12;
  const paras: string[][] = [[]];
  pre.forEach((l, i) => {
    const prev = pre[i - 1];
    const gap = prev ? l.top - prev.top : 0;
    if (prev && gap > step * 1.4) paras.push([]);
    else if (prev && /^Text [12]$/.test(prev.text)) paras.push([]);
    if (/^Text [12]$/.test(l.text)) { if (paras[paras.length - 1].length) paras.push([]); paras[paras.length - 1].push(`**${l.text}**`); paras.push([]); return; }
    if (/^•/.test(l.text) && paras[paras.length - 1].length) paras.push([]);
    const cur = paras[paras.length - 1];
    const verse = prev && cur.length && prev.right - prev.x < colWidth * 0.6 && /^[A-Z“"‘']/.test(l.text) && gap <= step * 1.4;
    cur.push(verse ? `\n${l.text}` : l.text);
  });
  const ps = paras.filter((p) => p.length).map((p) => tidy(glue(p).replace(/ \n/g, '\n')).replace(/ ?\n ?/g, '\n'));
  let stem = ps[ps.length - 1] ?? '';
  // when no gap separates the question from the passage, split at the last question opener
  if (!/[?]$/.test(stem) || stem.length > 260) {
    const m = [...stem.matchAll(/(?:^|[.!?”"]\s+)((?:Which|What|According to|Based on|It can most reasonably|How|Why)\b[^]*?\?)\s*$/g)].pop();
    if (m && m.index !== undefined) { const cut = stem.length - m[1].length; ps.splice(ps.length - 1, 1, stem.slice(0, cut).trim(), m[1]); stem = m[1]; }
  }
  let passage = ps.slice(0, -1).join('\n\n').replace(/\*\*Text ([12])\*\*\n\n/g, '**Text $1**\n');
  let notes: string[] | undefined;
  const ni = ps.findIndex((x) => /following notes/i.test(x));
  if (ni >= 0) {
    notes = ps.slice(ni + 1, -1).flatMap((x) => x.split(/\n?•\s*/)).map((x) => tidy(x)).filter(Boolean);
    stem = `${ps[ni]} ${stem}`;
    passage = '';
  }
  const all = [passage, stem, ...choices, ...(notes ?? [])].join(' ');
  const clean = choices.length === 4 && choices.every((c) => c.length > 0) && stem.length > 12 && !/[~|\\{}<>^¢§¤]|�/.test(all) && (passage.length > 40 || (notes?.length ?? 0) >= 2);
  const figure = /\b(table|graph|chart|figure|underlined|scatterplot|map|diagram|bar)\b/i.test(stem) || ps.some((x) => /^[\d.,%$\s-]+$/.test(x));
  return { passage, notes, stem, choices, clean, figure };
}

// ─── Sorting questions into the official skills ─────────────────────────────

/** Choices that differ only in punctuation, or in a joining word plus punctuation, test sentence boundaries. */
const stripPunct = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !['and', 'but', 'or', 'so', 'yet', 'nor', 'while'].includes(w)).join('');

/** Reading & Writing: the College Board writes one fixed question stem per skill. */
export function classifyRW(stem: string, choices: string[], passage = '', notes?: string[]): SkillId | null {
  const s = stem.replace(/\s+/g, ' ');
  if (notes?.length || /following notes|accomplish this goal/i.test(s)) return 'syn';
  if (/precise word or phrase|most nearly mean/i.test(s)) return 'wic';
  if (/logical transition/i.test(s)) return 'tra';
  if (/conventions of Standard English/i.test(s)) return choices.length === 4 && choices.every((c) => stripPunct(c) === stripPunct(choices[0])) ? 'bnd' : 'fss';
  if (/Based on the texts|Text 1|Text 2/i.test(s) || /\*\*Text 2\*\*|Text 2\b/.test(passage)) return 'ctc';
  if (/main purpose|overall structure|function of the underlined|best describes the function/i.test(s)) return 'tsp';
  if (/data from the (table|graph)|data in the (table|graph)|(table|graph) to complete|describes data/i.test(s)) return 'coeq';
  if (/quotation|most directly (support|weaken|undermine|challenge)|finding, if true|would most (strongly|directly)|most effectively illustrates/i.test(s)) return 'coet';
  if (/\b(graph|table|chart)\b/i.test(s)) return 'coeq';
  if (/Which (response|statement|example|finding|quotation)\b/i.test(s)) return 'coet';
  if (/most logically completes the text|reasonably be inferred|can be inferred/i.test(s)) return 'inf';
  if (/main idea|According to the text|Based on the text|best describes|suggests? about|most strongly suggest|best supported|does the text (say|indicate)|the text (says|indicates)/i.test(s)) return 'cid';
  if (choices.length === 4 && choices.every((c) => stripPunct(c) === stripPunct(choices[0]))) return 'bnd';
  return null;
}

const MATH_RULES: [SkillId, RegExp, number][] = [
  ['data1', /bar graph|histogram|dot plot|box plot|frequency table/gi, 4],
  ['data2', /line graph|data points|model for the data|scatterplot/gi, 4],
  ['sys', /given system|the system/gi, 3],
  ['lin1', /linear equation in one variable|no solution|infinitely many solutions/gi, 3],
  ['nlf', /function of the form|exponential/gi, 3],
  ['circ', /\bcircles?\b|\bradius\b|\bdiameter\b|\barcs?\b|\bsectors?\b|circumference|central angle|inscribed/gi, 3],
  ['trig', /\bsin\b|\bcos\b|\btan\b|sine|cosine|tangent|hypotenuse|right triangle|pythagorean|\bradians?\b/gi, 3],
  ['lines', /\btriangles?\b|\bangles?\b|parallel lines|transversal|vertical angles|isosceles|equilateral|congruent|similar triangles/gi, 2],
  ['area', /\barea\b|\bvolume\b|surface area|perimeter|\bcubes?\b|cylinder|sphere|\bcones?\b|prism|pyramid|rectangular/gi, 2],
  ['prob', /probability|at random|selected at random|chosen at random/gi, 4],
  ['infer', /margin of error|random sample|\bsample\b|\bsurvey/gi, 4],
  ['claims', /experiment|random assignment|randomly assigned|observational|\bcause|conclusion can be drawn/gi, 3],
  ['data1', /\bmean\b|\bmedian\b|\bmode\b|\brange of\b|standard deviation|outlier|dot plot|histogram|frequency|data set/gi, 2],
  ['data2', /scatterplot|line of best fit|best fit|correlation|model[s]? the data|predicted/gi, 3],
  ['pct', /percent|%/gi, 2],
  ['ratio', /\bratio\b|proportional|convert|conversion|density/gi, 3],
  ['ratio', /\brate\b|\bper\b/gi, 0.5],
  ['sys', /system of (two )?(linear )?equations|solution \(x, y\) to the (given )?system|solutions? to the system/gi, 3],
  ['ineq', /inequalit/gi, 3],
  ['equiv', /equivalent|factor|expand|simplif|rational exponent|which expression/gi, 2],
  ['nleq', /quadratic equation|discriminant|zero product|real solutions|solutions? to the (given )?equation|exponent property/gi, 2],
  ['nlf', /exponential|quadratic function|vertex|parabola|polynomial|\bgrowth\b|\bdecay\b|x-intercepts?|\bzeros\b|quadratic|\bsquared?\b|minimum value|maximum value/gi, 2],
  ['linf', /linear function|\bslope\b|y-intercept|rate of change|f\s*\(\s*x\s*\)\s*=\s*mx|increases by|decreases by/gi, 2],
  ['lin2', /linear equation in two|equation of (a|the) line|xy-plane|standard form|in terms of x and y/gi, 2],
  ['lin1', /linear equation|solve for|value of x|one variable|how many solutions/gi, 1],
];

/** Math: keyword evidence from the question and the College Board explanation. */
export function classifyMath(question: string, explanation: string): SkillId {
  const lead = explanation.slice(0, 500);
  const score = new Map<SkillId, number>();
  for (const [k, re, w] of MATH_RULES) {
    const n = (question.match(re)?.length ?? 0) + (explanation.match(re)?.length ?? 0) * 0.5 + (lead.match(re)?.length ?? 0);
    if (n) score.set(k, n * w);
  }
  const best = [...score].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : 'lin1';
}

/**
 * Difficulty is not printed in these booklets. Within each Reading & Writing question type, and
 * within each Math module, the College Board orders questions from easier to harder, so the
 * position gives an estimate: the first third Easy, the middle third Medium, the last third Hard.
 */
export function positionalDifficulty(index: number, count: number): 'Easy' | 'Medium' | 'Hard' {
  const r = count <= 1 ? 0.5 : index / (count - 1);
  return r < 0.34 ? 'Easy' : r < 0.67 ? 'Medium' : 'Hard';
}
