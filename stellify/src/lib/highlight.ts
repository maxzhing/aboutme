/**
 * Highlighting, as on the real Digital SAT: pure logic shared by the text and image highlighters
 * (no DOM here, so it can be unit-tested).
 *
 * - Text marks are character ranges [s, e) in the text of one block (a passage, a stem).
 * - Image marks are boxes on an official page image, in fractions of its width and height, snapped
 *   to the printed lines that findBands() detects in the image's pixels.
 */
export type MarkColor = 'yellow' | 'blue' | 'pink' | 'underline';
/** x, y, width, height as fractions of the image */
export type Box = [number, number, number, number];
export interface Mark { id: string; c: MarkColor; s?: number; e?: number; boxes?: Box[]; note?: string; text?: string }
export const MARK_COLORS: { c: MarkColor; label: string }[] = [
  { c: 'yellow', label: 'Yellow' }, { c: 'blue', label: 'Blue' }, { c: 'pink', label: 'Pink' }, { c: 'underline', label: 'Underline' },
];

/** Removes [s, e) from every text mark: marks inside it disappear, marks across its edges are trimmed or split. */
export function cutRange(marks: Mark[], s: number, e: number): Mark[] {
  const out: Mark[] = [];
  for (const m of marks) {
    if (m.s === undefined || m.e === undefined || m.e <= s || m.s >= e) { out.push(m); continue; }
    if (m.s < s) out.push({ ...m, e: s, text: m.text?.slice(0, s - m.s) });
    if (m.e > e) out.push({ ...m, id: m.s < s ? `${m.id}~` : m.id, s: e, text: m.text?.slice(e - m.s) });
  }
  return out;
}
/** Lays a new text mark on top: whatever it covers takes its color. */
export const addTextMark = (marks: Mark[], mark: Mark): Mark[] =>
  [...cutRange(marks, mark.s!, mark.e!), mark].sort((a, b) => (a.s ?? 0) - (b.s ?? 0));
/** The text mark under a character offset, if any. */
export const markAt = (marks: Mark[], offset: number): Mark | undefined =>
  marks.find((m) => m.s !== undefined && m.e !== undefined && m.s <= offset && offset < m.e);
/** Narrows [s, e) so it does not start or end on white space. */
export function trimRange(full: string, s: number, e: number): [number, number] {
  while (s < e && /\s/.test(full[s])) s++;
  while (e > s && /\s/.test(full[e - 1])) e--;
  return [s, e];
}

/** A printed line (or a figure) found in a page image, in fractions of the image. */
export interface Band { y0: number; y1: number; x0: number; x1: number }

/**
 * Finds the printed lines in a grayscale page image (0 = black, 255 = white), the way a reader's eye
 * does: rows with ink form a line; lines that touch (a descender meeting the next line's ascender) are
 * split where the ink is thinnest; thin vertical rules (the booklet's column divider) are ignored when
 * measuring how wide each line is.
 */
export function findBands(gray: ArrayLike<number>, w: number, h: number): Band[] {
  if (w < 4 || h < 4) return [];
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ink[i] = gray[i] < 160 ? 1 : 0;
  // ignore thin, tall rules: a column inked through much of the page while its neighbours are not
  const col = new Int32Array(w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) col[x] += ink[y * w + x];
  for (let x = 0; x < w; x++) {
    const nb = Math.max(x >= 3 ? col[x - 3] : 0, x + 3 < w ? col[x + 3] : 0);
    if (col[x] > 0.3 * h && nb < 0.3 * col[x]) for (let y = 0; y < h; y++) ink[y * w + x] = 0;
  }
  const row = new Int32Array(h);
  for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) n += ink[y * w + x]; row[y] = n; }
  const t1 = Math.max(1, Math.floor(0.002 * w));
  const raw: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    if (row[y] <= t1) continue;
    const y0 = y;
    while (y < h && (row[y] > t1 || (y + 1 < h && row[y + 1] > t1))) y++;
    raw.push([y0, y]);
  }
  const hs = raw.map(([a, b]) => b - a).filter((d) => d >= 6 && d <= 60).sort((a, b) => a - b);
  const L = hs.length ? hs[Math.floor(hs.length / 2)] : 20;
  const lines: [number, number][] = [];
  for (const [y0, y1] of raw) {
    if (y1 - y0 < 3) continue; // a horizontal rule, not a line of text
    if (y1 - y0 > 1.6 * L && y1 - y0 < 6 * L) {
      let mx = 0; for (let y = y0; y < y1; y++) mx = Math.max(mx, row[y]);
      let last = y0, prev = y0;
      for (let y = y0 + Math.floor(0.6 * L); y < y1 - Math.floor(0.4 * L); y++) {
        let localMin = Infinity; for (let k = Math.max(y0, y - 2); k < Math.min(y1, y + 3); k++) localMin = Math.min(localMin, row[k]);
        if (row[y] <= 0.15 * mx && row[y] === localMin && y - last >= 0.6 * L) { lines.push([prev, y]); prev = y; last = y; }
      }
      lines.push([prev, y1]);
    } else lines.push([y0, y1]);
  }
  const out: Band[] = [];
  for (const [y0, y1] of lines) {
    let x0 = w, x1 = -1;
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) if (ink[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    if (x1 < 0) continue;
    out.push({ y0: Math.max(0, y0 - 2) / h, y1: Math.min(h, y1 + 2) / h, x0: Math.max(0, x0 - 2) / w, x1: Math.min(w, x1 + 3) / w });
  }
  return out;
}

/**
 * The boxes a drag from a to b selects, like selecting text: the rest of the first line from where you
 * started, every line in between, and the last line up to where you stopped. Points are fractions of
 * the image. With no lines found, the dragged rectangle itself.
 */
export function selectBoxes(bands: Band[], a: { x: number; y: number }, b: { x: number; y: number }): Box[] {
  const near = (y: number) => {
    let best = -1, d = Infinity;
    bands.forEach((band, i) => { const dist = y < band.y0 ? band.y0 - y : y > band.y1 ? y - band.y1 : 0; if (dist < d) { d = dist; best = i; } });
    return d <= 0.04 ? best : -1;
  };
  let i = near(a.y), j = near(b.y);
  if (i < 0 || j < 0) {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return [[x, y, Math.max(0.01, Math.abs(a.x - b.x)), Math.max(0.015, Math.abs(a.y - b.y))]];
  }
  let p = a, q = b;
  if (i > j || (i === j && a.x > b.x)) { [i, j] = [j, i]; [p, q] = [b, a]; }
  const box = (band: Band, x0: number, x1: number): Box => {
    const l = Math.min(Math.max(x0, band.x0), band.x1), r = Math.max(Math.min(x1, band.x1), band.x0);
    return [l, band.y0, Math.max(0.006, r - l), band.y1 - band.y0];
  };
  if (i === j) return [box(bands[i], p.x, q.x)];
  const out: Box[] = [box(bands[i], p.x, 1)];
  for (let k = i + 1; k < j; k++) out.push(box(bands[k], 0, 1));
  out.push(box(bands[j], 0, q.x));
  return out;
}
/** Does a point (fractions of the image) fall inside one of a mark's boxes? */
export const hitBoxes = (m: Mark, x: number, y: number) => (m.boxes ?? []).some(([bx, by, bw, bh]) => x >= bx && x <= bx + bw && y >= by && y <= by + bh);
