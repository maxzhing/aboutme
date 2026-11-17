import type { PackItem } from '@/data/pack';
import type { SkillId } from './types';
import { pdfjs } from './importPdf';
import type { FullTest } from './fullTest/registry';
import {
  choiceNotes, classifyMath, keyAgrees, classifyRW, docKind, parseAnswerKey, parseBooklet, parseExplanations, parseScoreTable,
  positionalDifficulty, rwFromLines, testNumber, type Box, type Line, type ModKey, type PPage,
} from './fullTest/parse';

/**
 * Imports one of the College Board's free paper SAT practice tests entirely in the browser:
 * the test booklet, its scoring guide (answer key and score conversion table) and, optionally,
 * its answer explanations. No API key and no upload: pdf.js reads the files on this device.
 *
 * Reading & Writing questions are rebuilt as text when the scan reads cleanly; Math questions and
 * any question with a table, graph or underlining keep the exact page image. Skills are sorted
 * automatically from the College Board's question wording (R&W) and explanation text (Math), and
 * difficulty is estimated from position, since these booklets do not print it.
 */
export interface FullTestImport { test: FullTest; items: PackItem[]; warnings: string[] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;
const MOD_NAME: Record<ModKey, string> = { rw1: 'Reading and Writing Module 1', rw2: 'Reading and Writing Module 2', math1: 'Math Module 1', math2: 'Math Module 2' };
const RENDER = 1.7;

async function readPages(doc: Doc): Promise<PPage[]> {
  const pages: PPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) {
      if (!it.str) continue;
      const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
      items.push({ x, y, w: it.width ?? 0, h: Math.max(4, Math.hypot(it.transform[2], it.transform[3])), s: it.str });
    }
    pages.push({ n, width: vp.width, height: vp.height, items });
  }
  return pages;
}

/** Renders pages on demand (a few at a time) and crops boxes from them into one stacked JPEG. */
function cropper(doc: Doc, scale: number) {
  const cache = new Map<number, HTMLCanvasElement>();
  const render = async (n: number) => {
    if (cache.has(n)) return cache.get(n)!;
    if (cache.size > 3) cache.delete(cache.keys().next().value as number);
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    cache.set(n, c);
    return c;
  };
  /** last row (from the bottom) that has real ink, so empty column space is not kept */
  const inkBottom = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let y = h - 1; y > 0; y--) {
      let dark = 0;
      for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4; if (data[i] + data[i + 1] + data[i + 2] < 420) dark++; }
      if (dark > 3) return Math.min(h, y + 10);
    }
    return h;
  };
  return async (parts: { page: number; box: Box }[]): Promise<string | undefined> => {
    if (!parts.length) return undefined;
    const pieces: HTMLCanvasElement[] = [];
    for (const { page, box } of parts) {
      const src = await render(page);
      const x0 = Math.max(0, Math.floor(box.x0 * scale)), y0 = Math.max(0, Math.floor(box.y0 * scale));
      const w = Math.min(src.width - x0, Math.ceil((box.x1 - box.x0) * scale)), h = Math.min(src.height - y0, Math.ceil((box.y1 - box.y0) * scale));
      if (w < 8 || h < 8) continue;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(src, x0, y0, w, h, 0, 0, w, h);
      const keep = inkBottom(ctx, w, h);
      const t = document.createElement('canvas');
      t.width = w; t.height = keep;
      t.getContext('2d')!.drawImage(c, 0, 0);
      pieces.push(t);
    }
    if (!pieces.length) return undefined;
    const out = document.createElement('canvas');
    out.width = Math.max(...pieces.map((p) => p.width)); out.height = pieces.reduce((s, p) => s + p.height, 0);
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
    let y = 0;
    for (const p of pieces) { ctx.drawImage(p, 0, y); y += p.height; }
    return out.toDataURL('image/jpeg', 0.74);
  };
}

/** Boxes around explanation lines, one per page. */
function lineBoxes(lines: Line[]): { page: number; box: Box }[] {
  const pages = [...new Set(lines.map((l) => l.page))];
  return pages.map((page) => {
    const on = lines.filter((l) => l.page === page);
    return { page, box: { x0: Math.min(...on.map((l) => l.x)) - 6, y0: Math.min(...on.map((l) => l.top)) - 4, x1: Math.max(...on.map((l) => l.right)) + 6, y1: Math.max(...on.map((l) => l.bottom)) + 4 } };
  });
}

export async function importFullTest(files: File[], onProgress?: (step: string, done: number, total: number) => void): Promise<FullTestImport> {
  const lib = await pdfjs();
  const docs: { kind: ReturnType<typeof docKind>; doc: Doc; pages: PPage[]; name: string }[] = [];
  for (const [i, f] of files.entries()) {
    onProgress?.(`Reading ${f.name}`, i, files.length + 2);
    const doc = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()), isEvalSupported: false }).promise;
    const pages = await readPages(doc);
    docs.push({ kind: docKind(pages), doc, pages, name: f.name });
  }
  const booklet = docs.find((d) => d.kind === 'booklet'), scoring = docs.find((d) => d.kind === 'scoring'), answers = docs.find((d) => d.kind === 'answers');
  if (!booklet) throw new Error('No test booklet found. Add the practice test PDF itself (the one with the questions).');
  if (!scoring) throw new Error('No scoring guide found. Add the "Scoring Your SAT Practice Test" PDF: it has the answer key.');
  const warnings: string[] = [];
  if (!answers) warnings.push('No answer explanations file was added, so questions will show the correct answer without the College Board explanation.');
  const number = testNumber(scoring.pages) ?? testNumber(booklet.pages) ?? (answers ? testNumber(answers.pages) : null);
  const key = parseAnswerKey(scoring.pages);
  if (!key) throw new Error('The answer key in the scoring guide could not be read.');
  const table = parseScoreTable(scoring.pages) ?? undefined;
  if (!table) warnings.push('The score conversion table could not be read; scores will use Stellify\'s calibrated estimate instead.');
  const book = parseBooklet(booklet.pages);
  const expl = answers ? parseExplanations(answers.pages) : new Map();
  const testId = number ? `pt${number}` : `ptx${Date.now().toString(36)}`;
  const name = number ? `SAT Practice Test ${number}` : 'SAT Practice Test';

  const crop = cropper(booklet.doc, RENDER);
  const cropExpl = answers ? cropper(answers.doc, 1.55) : null;
  const items: PackItem[] = [];
  const modules: FullTest['modules'] = [];
  const total = book.modules.reduce((s, m) => s + m.questions.length, 0);
  let done = 0;
  for (const m of book.modules) {
    const section = m.mod.startsWith('rw') ? 'rw' as const : 'math' as const;
    if (m.questions.length !== m.count) warnings.push(`${MOD_NAME[m.mod]}: found ${m.questions.length} of ${m.count} questions.`);
    const qids: string[] = [];
    // R&W difficulty is estimated within each run of one question type; Math within the module
    const rwSkills: (SkillId | null)[] = [];
    const rwTexts = m.questions.map((q) => (section === 'rw' ? rwFromLines(q.lines, q.parts[0].box.x1 - q.parts[0].box.x0) : null));
    for (const [i, q] of m.questions.entries()) {
      const t = rwTexts[i];
      rwSkills.push(t ? classifyRW(t.stem, t.choices, t.passage, t.notes) : null);
    }
    for (let i = 0; i < rwSkills.length; i++) if (section === 'rw' && !rwSkills[i]) rwSkills[i] = rwSkills[i - 1] ?? rwSkills.find(Boolean) ?? 'cid';
    for (const [i, q] of m.questions.entries()) {
      onProgress?.(`Building ${MOD_NAME[m.mod]}`, files.length + done / total, files.length + 2);
      done++;
      const k = key[m.mod][q.num - 1];
      if (!k) { warnings.push(`${MOD_NAME[m.mod]} question ${q.num}: no answer in the key, skipped.`); continue; }
      const e = expl.get(`${m.mod}-${q.num}`);
      if (e && !keyAgrees(k, e.text)) warnings.push(`${MOD_NAME[m.mod]} question ${q.num}: the answer key and the explanation disagree; the key is used.`);
      const id = `${testId}-${m.mod}-${String(q.num).padStart(2, '0')}`;
      const source = `${name} · ${MOD_NAME[m.mod]} · Question ${q.num}`;
      const mcq = k.mcq !== undefined;
      const answer: number | string[] = mcq ? k.mcq! : k.spr!;
      const rationale = e?.text ?? '';
      let skill: SkillId, cbDifficulty: 'Easy' | 'Medium' | 'Hard';
      if (section === 'rw') {
        skill = rwSkills[i]!;
        let a = i, b = i;
        while (a > 0 && rwSkills[a - 1] === skill) a--;
        while (b < rwSkills.length - 1 && rwSkills[b + 1] === skill) b++;
        cbDifficulty = positionalDifficulty(i - a, b - a + 1);
      } else {
        skill = classifyMath(q.lines.map((l) => l.text).join(' '), rationale);
        cbDifficulty = positionalDifficulty(i, m.questions.length);
      }
      const base = { id, skill, d: cbDifficulty === 'Hard' ? 'H' as const : 'M' as const, cbDifficulty, source, test: testId, estimated: true, imported: Date.now(), rationale: rationale || undefined };
      const why = mcq && rationale ? choiceNotes(rationale) : ['', '', '', ''];
      const t = rwTexts[i];
      if (t && mcq && t.clean && !t.figure && why.every(Boolean)) {
        items.push({ ...base, passage: t.passage, notes: t.notes, stem: t.stem, choices: t.choices, answer, why });
      } else {
        const image = await crop(q.parts);
        const rationaleImage = section === 'math' && e && cropExpl ? await cropExpl(lineBoxes(e.lines)) : undefined;
        items.push({
          ...base, passage: '', stem: 'Answer the question shown above.', choices: mcq ? ['A', 'B', 'C', 'D'] : [], answer, image, rationaleImage,
          why: mcq ? (why.every(Boolean) ? why : ['A', 'B', 'C', 'D'].map((x) => `See the College Board explanation for choice ${x}.`)) : (rationale ? [rationale] : []),
        });
      }
      qids.push(id);
    }
    modules.push({ mod: m.mod, section, module: m.mod.endsWith('1') ? 1 : 2, minutes: book.minutes[m.mod] ?? (section === 'rw' ? 39 : 43), qids });
  }
  if (modules.length < 4) warnings.push(`Only ${modules.length} of 4 modules were found in the booklet.`);
  if (!items.length) throw new Error('No questions could be read from the booklet.');
  onProgress?.('Done', files.length + 2, files.length + 2);
  return { test: { id: testId, number, name, modules, table, imported: Date.now() }, items, warnings };
}
