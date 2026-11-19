import type { SkillId } from './types';
import type { PackItem } from '@/data/pack';

/**
 * Reads a PDF exported from the College Board's free SAT Suite Question Bank (with answers and
 * explanations) entirely in the browser and turns every question into a PackItem.
 *
 * Reading & Writing questions are rebuilt as text. Math questions, and any question with a table,
 * graph or underlined portion, keep the exact page image of the question and of the explanation, so
 * nothing is lost to text extraction. Nothing leaves the device.
 */

// pdf.js 3.x (legacy build) as a classic bundle; the worker source is embedded in the page by the build.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFJS = any;
let lib: PDFJS | null = null;
export async function pdfjs(): Promise<PDFJS> {
  if (lib) return lib;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore no bundled types for the legacy entry
  lib = (await import('pdfjs-dist/legacy/build/pdf.js')) as PDFJS;
  const src = document.getElementById('pdf-worker')?.textContent;
  // the single-file build carries the worker inline; the hosted web build serves it as a file next to the app
  lib.GlobalWorkerOptions.workerSrc = src ? URL.createObjectURL(new Blob([src], { type: 'text/javascript' })) : 'assets/pdf.worker.min.js';
  return lib;
}

interface Line { page: number; text: string; x: number; top: number; bottom: number; right: number }
const SCALE = 2;

const MATH_SKILLS: [string, SkillId][] = [
  ['Nonlinear equations', 'nleq'], ['Nonlinear functions', 'nlf'], ['Linear equations in two', 'lin2'], ['Systems of two', 'sys'],
  ['Linear inequalities', 'ineq'], ['Linear functions', 'linf'], ['Linear equations in', 'lin1'], ['Equivalent expressions', 'equiv'],
  ['Ratios, rates', 'ratio'], ['Percentages', 'pct'], ['One-variable data', 'data1'], ['Two-variable data', 'data2'],
  ['Probability', 'prob'], ['Inference from sample', 'infer'], ['Evaluating statistical', 'claims'], ['Area and volume', 'area'],
  ['Lines, angles', 'lines'], ['Right triangles', 'trig'], ['Circles', 'circ'],
];
const RW_SKILLS: [string, SkillId][] = [
  ['Central Ideas', 'cid'], ['Command of', 'coet'], ['Inferences', 'inf'], ['Words in', 'wic'], ['Text Structure', 'tsp'],
  ['Cross', 'ctc'], ['Rhetorical', 'syn'], ['Transitions', 'tra'], ['Boundaries', 'bnd'], ['Form, Structure', 'fss'],
];

const tidy = (s: string) => s.replace(/\*\s*\*/g, '').replace(/\b(km|cm|mm|m|ft|in|mi) 2\b/g, '$1²').replace(/\b(km|cm|mm|m|ft|in) 3\b/g, '$1³').replace(/\s+/g, ' ').replace(/ﬂ/g, 'fl').replace(/ﬁ/g, 'fi').replace(/_{3,}/g, '______').replace(/\s+([,.;:!?])/g, '$1').trim();
/** Joins wrapped lines; a line ending in a hyphen is glued to the next ("long-" + "headed"). */
const join = (parts: string[]) => parts.reduce((acc, p) => (acc.endsWith('-') ? acc + p : acc ? `${acc} ${p}` : p), '');

/** Groups positioned text items into lines, top to bottom. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLines(page: number, items: any[], viewport: any): Line[] {
  const rows: { y: number; h: number; parts: { x: number; w: number; s: string }[] }[] = [];
  for (const it of items) {
    if (!it.str) continue;
    const [x, y] = viewport.convertToViewportPoint(it.transform[4], it.transform[5]);
    const h = Math.max(6, Math.hypot(it.transform[2], it.transform[3]) * SCALE);
    const w = (it.width ?? 0) * SCALE;
    const row = rows.find((r) => Math.abs(r.y - y) < r.h * 0.45);
    if (row) row.parts.push({ x, w, s: it.str }); else rows.push({ y, h, parts: [{ x, w, s: it.str }] });
  }
  return rows.map((r) => {
    r.parts.sort((a, b) => a.x - b.x);
    let text = '', end = -1e9;
    for (const p of r.parts) { if (!p.s) continue; text += text && p.x - end > r.h * 0.12 && !text.endsWith(' ') && !p.s.startsWith(' ') ? ` ${p.s}` : p.s; end = p.x + p.w; }
    const right = Math.max(...r.parts.map((p) => p.x + p.w));
    return { page, text: text.replace(/\s+/g, ' ').trim(), x: r.parts[0].x, top: r.y - r.h * 0.95, bottom: r.y + r.h * 0.3, right };
  }).filter((l) => l.text).sort((a, b) => a.top - b.top);
}

/** Splits lines into paragraphs using vertical gaps; short lines inside a paragraph (verse) keep their breaks. */
function paragraphs(lines: Line[], width: number): string[] {
  if (!lines.length) return [];
  const gaps = lines.slice(1).map((l, i) => (l.page === lines[i].page ? l.top - lines[i].top : 0)).filter((g) => g > 0).sort((a, b) => a - b);
  const lineH = lines.reduce((a, l) => a + (l.bottom - l.top), 0) / lines.length;
  const step = Math.min(gaps[Math.floor(gaps.length / 3)] ?? lineH * 1.2, lineH * 1.25);
  const out: string[][] = [[]];
  lines.forEach((l, i) => {
    const prev = lines[i - 1];
    if (prev && l.page === prev.page && l.top - prev.top > step * 1.55) out.push([]);
    const cur = out[out.length - 1];
    const verse = prev && cur.length && prev.right - prev.x < width * 0.62 && /^[A-Z“"‘']/.test(l.text) && l.top - prev.top <= step * 1.55;
    if (verse) cur.push('\n' + l.text); else cur.push(l.text);
  });
  return out.filter((p) => p.length).map((p) => tidy(join(p).replace(/ \n/g, '\n')).replace(/ ?\n ?/g, '\n'));
}

function inferSub(skill: SkillId, stem: string, choices: string[], answer: number, passage: string): string | undefined {
  const c = choices[answer] ?? '';
  const all = choices.join(' ');
  if (skill === 'bnd') {
    if (/\b(however|therefore|though|thus|for example|for instance|rather|even so|instead|moreover|consequently|indeed|nevertheless)\b/i.test(all)) return 'Transition punctuation';
    if ((passage.match(/;/g) ?? []).length >= 1 && /;\s*and\b/.test(passage)) return 'Lists';
    if (c.includes('—')) return 'Dashes';
    if (c.includes(':')) return 'Colons';
    if (c.includes(';')) return 'Semicolons';
    if (/\.\s+[A-Z]/.test(c)) return 'Sentence boundaries';
    if (/,\s*(and|but|so|or|yet)\b/.test(c)) return 'Coordination and subordination';
    if (!/[,;:.—]/.test(c.replace(/\*/g, ''))) return 'Commas';
    return /,/.test(all) ? 'Nonessential and essential clauses' : 'Commas';
  }
  if (skill === 'fss') {
    const words = choices.map((x) => x.replace(/[*.,;:]/g, '').trim().toLowerCase());
    if (choices.every((x) => x.split(' ').length >= 6)) return 'Modifiers';
    if (words.some((a) => words.some((b) => a === `${b}s` || a === `${b}es`))) return 'Subject-verb agreement';
    if (/\b(its|it’s|their|they’re|them|they)\b/i.test(all)) return 'Pronoun agreement and clarity';
    if (/[’']s\b|s[’']/.test(all)) return 'Possessives and apostrophes';
    if (choices.some((x) => /\b(has|have|had|was|were|is|are)\b/.test(x)) && choices.every((x) => x.split(' ').length <= 3)) return 'Verb tense and forms';
    return choices.some((x) => /ing$|^to /.test(x.trim())) ? 'Verb tense and forms' : 'Subject-verb agreement';
  }
  if (skill === 'coet') return /weaken/i.test(stem) ? 'Weakening a claim' : /quotation/i.test(stem) ? 'Illustrating a claim with a quotation' : 'Supporting a claim';
  if (skill === 'coeq') return /complete the (statement|text)/i.test(stem) ? 'Completing a statement with data' : 'Data that supports a claim';
  if (skill === 'cid') return /main idea/i.test(stem) ? 'Main idea' : /suggest/i.test(stem) ? 'Implied ideas' : 'Supporting details';
  if (skill === 'inf') return 'Logical conclusions';
  if (skill === 'tsp') return /function|underlined/i.test(stem) ? 'Function of a sentence' : /structure/i.test(stem) ? 'Passage organization' : 'Author\'s purpose';
  if (skill === 'wic') return /most nearly mean/i.test(stem) ? 'Secondary meanings' : 'Vocabulary in context';
  if (skill === 'ctc') return 'How one author would respond';
  if (skill === 'syn') return /similar|differen/i.test(stem) ? 'Emphasizing similarities or differences' : /unfamiliar|audience/i.test(stem) ? 'Audience awareness' : 'Maintaining rhetorical purpose';
  return undefined;
}

export interface ImportResult { items: PackItem[]; images: number; skipped: string[] }

export async function importCollegeBoardPdf(file: File, onProgress?: (done: number, total: number) => void): Promise<ImportResult> {
  const p = await pdfjs();
  const doc = await p.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const lines: Line[] = [];
  let width = 1200;
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: SCALE });
    width = vp.width;
    const tc = await page.getTextContent();
    await page.getOperatorList(); // loads the fonts so their real names (…-Italic) can be read
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const italic = (f: string) => { try { return page.commonObjs.has(f) && /italic|oblique/i.test((page.commonObjs.get(f) as any)?.name ?? ''); } catch { return false; } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lines.push(...toLines(n, tc.items.map((it: any) => (it.str?.trim() && italic(it.fontName) ? { ...it, str: it.str.replace(/^(\s*)(.*?)(\s*)$/, '$1*$2*$3') } : it)), vp));
    onProgress?.(n, doc.numPages * 2);
  }
  const content = width * 0.82;
  const canvases = new Map<number, HTMLCanvasElement>();
  const render = async (n: number) => {
    if (canvases.has(n)) return canvases.get(n)!;
    if (canvases.size > 2) canvases.delete(canvases.keys().next().value as number);
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: SCALE });
    const c = document.createElement('canvas');
    c.width = vp.width; c.height = vp.height;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    canvases.set(n, c);
    return c;
  };
  /** Crops the page area covered by the given lines (across pages) into one stacked image. */
  const crop = async (ls: Line[]): Promise<string | undefined> => {
    if (!ls.length) return undefined;
    const pages = [...new Set(ls.map((l) => l.page))];
    const parts: { c: HTMLCanvasElement; y0: number; y1: number }[] = [];
    for (const pg of pages) {
      const on = ls.filter((l) => l.page === pg);
      parts.push({ c: await render(pg), y0: Math.max(0, Math.min(...on.map((l) => l.top)) - 14), y1: Math.max(...on.map((l) => l.bottom)) + 18 });
    }
    const x0 = Math.max(0, Math.min(...ls.map((l) => l.x)) - 16), x1 = Math.min(width, Math.max(...ls.map((l) => l.right)) + 16);
    const out = document.createElement('canvas');
    out.width = Math.round(x1 - x0); out.height = Math.round(parts.reduce((s, q) => s + (q.y1 - q.y0), 0));
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
    let y = 0;
    for (const q of parts) { const h = q.y1 - q.y0; ctx.drawImage(q.c, x0, q.y0, x1 - x0, h, 0, y, x1 - x0, h); y += h; }
    return out.toDataURL('image/jpeg', 0.84);
  };

  const starts = lines.map((l, i) => (/^Question ID [0-9a-f]{6,}/.test(l.text) ? i : -1)).filter((i) => i >= 0);
  const items: PackItem[] = [];
  const skipped: string[] = [];
  let images = 0;
  for (let k = 0; k < starts.length; k++) {
    const block = lines.slice(starts[k], starts[k + 1] ?? lines.length);
    const id = block[0].text.match(/Question ID ([0-9a-f]+)/)![1];
    try {
      const idAt = block.findIndex((l) => l.text === `ID: ${id}`);
      const ansAt = block.findIndex((l) => l.text.startsWith(`ID: ${id} Answer`));
      if (idAt < 0 || ansAt < 0) throw new Error('no answer section');
      const header = block.slice(0, idAt).map((l) => l.text).join(' ').replace(/\s+/g, ' ');
      const math = /\bMath\b/.test(header) && !/Reading and Writing/.test(header);
      const skill = (math ? MATH_SKILLS : RW_SKILLS).find(([k2]) => header.includes(k2))?.[1];
      if (!skill) throw new Error('unknown skill');
      const body = block.slice(idAt + 1, ansAt);
      const tail = block.slice(ansAt + 1);
      const keyLine = tail.find((l) => /^Correct Answer:/.test(l.text))?.text ?? '';
      const key = keyLine.replace(/^Correct Answer:\s*/, '').trim();
      const ratAt = tail.findIndex((l) => /^Rationale/.test(l.text));
      const diffAt = tail.findIndex((l) => /^Question Difficulty:/.test(l.text));
      const cbDifficulty = diffAt >= 0 ? tail[diffAt].text.replace(/^Question Difficulty:\s*/, '') : undefined;
      const ratLines = tail.slice(ratAt + 1, diffAt >= 0 ? diffAt : undefined);
      const rationale = paragraphs(ratLines, content).join('\n\n');
      const choiceAt = body.findIndex((l) => /^A\.\s/.test(l.text));
      const mcq = /^[A-D]$/.test(key) && choiceAt >= 0;
      const answer: number | string[] = mcq ? 'ABCD'.indexOf(key) : key.split(/\s*,\s*|\s+or\s+/).map((s) => s.trim()).filter(Boolean);
      // text rebuild for plain Reading & Writing questions
      const pre = choiceAt >= 0 ? body.slice(0, choiceAt) : body;
      const paras = paragraphs(pre, content);
      const stem = paras[paras.length - 1] ?? '';
      const choices: string[] = [];
      if (choiceAt >= 0) {
        let cur: string[] | null = null;
        for (const l of body.slice(choiceAt)) {
          const m = l.text.match(/^([A-D])\.\s+(.*)/);
          if (m) { cur = [m[2]]; choices.push(''); } else if (cur) cur.push(l.text);
          if (cur) choices[choices.length - 1] = tidy(join(cur));
        }
      }
      const figureLike = /\b(table|graph|chart|figure|underlined|scatterplot|bar)\b/i.test(stem) || paras.some((x) => /^\d[\d.,%\s]+$/.test(x));
      const split = rationale.split(/(?=Choice [A-D] is (?:the best answer|incorrect|correct))/);
      const why = ['', '', '', ''];
      for (const part of split) { const m = part.match(/^Choice ([A-D]) is/); if (m) why['ABCD'.indexOf(m[1])] = part.trim(); }
      const textOk = !math && mcq && !figureLike && choices.length === 4 && stem.length > 15 && why.every(Boolean);
      const finalSkill: SkillId = skill === 'coet' && figureLike ? 'coeq' : skill;
      const d: 'M' | 'H' = cbDifficulty === 'Hard' ? 'H' : 'M';
      if (textOk) {
        const notesAt = paras.findIndex((x) => /following notes/i.test(x));
        let passage = paras.slice(0, -1).join('\n\n'), notes: string[] | undefined;
        if (notesAt >= 0) { notes = paras.slice(notesAt + 1, -1).join('\n').split(/\n?•\s*/).map((x) => tidy(x)).filter(Boolean); passage = ''; }
        items.push({ id: `cb-${id}`, skill, d, cbDifficulty, passage, notes, stem: notes ? `${paras[notesAt]} ${stem}` : stem, choices, answer, why, rationale, sub: inferSub(finalSkill, stem, choices, answer as number, passage), imported: Date.now() });
      } else {
        const image = await crop(body);
        const rationaleImage = math ? await crop(ratLines) : undefined;
        images++;
        items.push({
          id: `cb-${id}`, skill: finalSkill, d, cbDifficulty, passage: '', stem: math ? 'Answer the question shown above.' : 'Answer the question shown above.',
          choices: mcq ? ['A', 'B', 'C', 'D'] : [], answer, why: mcq ? (why.every(Boolean) ? why : ['A', 'B', 'C', 'D'].map((x) => `See the College Board explanation for choice ${x}.`)) : [], rationale,
          image, rationaleImage, sub: mcq ? inferSub(finalSkill, stem, choices, answer as number, '') : undefined, imported: Date.now(),
        });
      }
    } catch (e) {
      skipped.push(`${id}: ${(e as Error).message}`);
    }
    onProgress?.(doc.numPages + Math.round(((k + 1) / starts.length) * doc.numPages), doc.numPages * 2);
  }
  return { items, images, skipped };
}
