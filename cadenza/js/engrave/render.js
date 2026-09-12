/* Cadenza — SVG renderer.
 *
 * Draw items arrive in staff spaces; the SVG viewBox is set in those same
 * units, so the whole page scales by changing one number and stroke widths stay
 * proportional.  Output is built as a string: for an orchestral page that is
 * an order of magnitude faster than constructing DOM nodes.
 */

import { GLYPHS, DYNAMIC_LETTERS, DYNAMIC_BY_ID } from './glyphs.js';
import { M, TEXT_FONT, TEXT_FONT_SANS } from './metrics.js';
import { strokeOutline, smoothPath } from './geom.js';

const r = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* A curly brace, generated to the height it needs. */
function bracePath(height) {
  const h = height / 2;
  const w = 0.95;
  const pts = [
    [w * 0.92, -h], [w * 0.34, -h * 0.78], [w * 0.30, -h * 0.36],
    [w * 0.62, -h * 0.12], [w * 0.86, 0],
    [w * 0.62, h * 0.12], [w * 0.30, h * 0.36], [w * 0.34, h * 0.78], [w * 0.92, h],
  ];
  const widths = [0.06, 0.2, 0.26, 0.2, 0.13, 0.2, 0.26, 0.2, 0.06];
  return strokeOutline(pts.map((p, i) => [p[0], p[1], widths[i]]));
}

function refAttrs(ref) {
  if (!ref) return '';
  let s = '';
  if (ref.eventId) s += ` data-ev="${ref.eventId}"`;
  if (ref.noteIndex !== undefined) s += ` data-n="${ref.noteIndex}"`;
  if (ref.measure !== undefined) s += ` data-m="${ref.measure}"`;
  if (ref.partIndex !== undefined) s += ` data-p="${ref.partIndex}"`;
  if (ref.voice !== undefined) s += ` data-v="${ref.voice}"`;
  if (ref.staff !== undefined) s += ` data-s="${ref.staff}"`;
  if (ref.kind) s += ` data-k="${ref.kind}"`;
  if (ref.id) s += ` data-id="${ref.id}"`;
  return s;
}

function glyphNode(name, x, y, o = {}) {
  const g = GLYPHS[name];
  if (!g) return '';
  const sc = o.scale && o.scale !== 1 ? ` scale(${r(o.scale)})` : '';
  const t = `translate(${r(x)},${r(y)})${sc}`;
  const rule = g.rule ? ` fill-rule="${g.rule}"` : '';
  return `<path class="g ${o.cls || ''}" transform="${t}" d="${g.d}"${rule}${refAttrs(o.ref)}/>`;
}

/** Dynamics are set from their individual letters. */
function dynamicNode(it) {
  const def = DYNAMIC_BY_ID[it.id];
  const letters = (def ? def.label : it.id).split('');
  const KERN = 0.09;
  let total = -KERN;
  for (const ch of letters) {
    const g = GLYPHS[DYNAMIC_LETTERS[ch]];
    total += (g ? g.w : 0.9) + KERN;
  }
  let x = it.x - total / 2;
  let out = `<g class="dyn"${refAttrs(it.ref)}>`;
  for (const ch of letters) {
    const name = DYNAMIC_LETTERS[ch];
    const g = GLYPHS[name];
    if (g) {
      out += `<path transform="translate(${r(x)},${r(it.y)})" d="${g.d}"/>`;
      x += g.w + KERN;
    } else {
      out += `<text x="${r(x)}" y="${r(it.y + 0.5)}" font-size="2.4" font-style="italic" font-weight="bold">${esc(ch)}</text>`;
      x += 1.0 + KERN;
    }
  }
  return out + '</g>';
}

function textNode(it) {
  const anchor = it.anchor || 'start';
  const style = it.italic ? ' font-style="italic"' : '';
  const weight = it.bold ? ' font-weight="600"' : '';
  const font = it.sans ? TEXT_FONT_SANS : TEXT_FONT;
  return `<text class="t ${it.cls || ''}" x="${r(it.x)}" y="${r(it.y)}" font-size="${r(it.size)}"` +
    ` text-anchor="${anchor}" font-family='${font}'${style}${weight}${refAttrs(it.ref)}>${esc(it.str)}</text>`;
}

/** Tempo marks mix a note glyph with text, so they get their own composer. */
function tempoNode(it) {
  const noteGlyph = { whole: 'noteheadWhole', half: 'noteheadHalf' }[it.unit] || 'noteheadBlack';
  const dotted = String(it.unit).endsWith('.');
  const stem = it.unit !== 'whole';
  let x = it.x;
  let out = `<g class="tempo"${refAttrs(it.ref)}>`;
  if (it.text) {
    out += `<text x="${r(x)}" y="${r(it.y)}" font-size="${r(it.size)}" font-family='${TEXT_FONT}' font-weight="600" font-style="italic">${esc(it.text)}</text>`;
    x += textWidthApprox(it.text, it.size) + 0.9;
  }
  const gy = it.y - 0.45;
  const scale = 0.82;
  out += `<path transform="translate(${r(x)},${r(gy)}) scale(${scale})" d="${GLYPHS[noteGlyph].d}"/>`;
  if (stem) {
    const sx = x + GLYPHS[noteGlyph].w * scale - 0.06;
    out += `<path d="M${r(sx - 0.06)},${r(gy)}h0.12v-2.7h-0.12Z"/>`;
    if (it.unit === 'eighth') {
      out += `<path transform="translate(${r(sx)},${r(gy - 2.7)}) scale(0.8)" d="${GLYPHS.noteheadBlack.d}" opacity="0"/>`;
    }
  }
  x += GLYPHS[noteGlyph].w * scale;
  if (dotted) { out += `<circle cx="${r(x + 0.24)}" cy="${r(gy)}" r="0.15"/>`; x += 0.55; }
  out += `<text x="${r(x + 0.35)}" y="${r(it.y)}" font-size="${r(it.size)}" font-family='${TEXT_FONT}' font-weight="600">= ${Math.round(it.bpm)}</text>`;
  return out + '</g>';
}

function textWidthApprox(s, size) {
  return String(s).length * size * 0.48;
}

function itemNode(it) {
  switch (it.kind) {
    case 'anchor':
      return '';
    case 'glyph': {
      const g = GLYPHS[it.name];
      if (!g) return '';
      const x = it.centered ? it.x - (g.w || 1) / 2 : it.x;
      return glyphNode(it.name, x, it.y, it);
    }
    case 'line': {
      const dash = it.dash ? ` stroke-dasharray="${it.dash}"` : '';
      return `<line class="l ${it.cls || ''}" x1="${r(it.x1)}" y1="${r(it.y1)}" x2="${r(it.x2)}" y2="${r(it.y2)}"` +
        ` stroke-width="${r(it.w)}"${dash}${refAttrs(it.ref)}/>`;
    }
    case 'rect':
      return `<rect class="r ${it.cls || ''}" x="${r(it.x)}" y="${r(it.y)}" width="${r(it.w)}" height="${r(it.h)}"${refAttrs(it.ref)}/>`;
    case 'dot':
      return `<circle class="d ${it.cls || ''}" cx="${r(it.x)}" cy="${r(it.y)}" r="${r(it.r)}"${refAttrs(it.ref)}/>`;
    case 'path':
      return `<path class="g ${it.cls || ''}" transform="translate(${r(it.x)},${r(it.y)})" d="${it.d}"${refAttrs(it.ref)}/>`;
    case 'beam':
    case 'curve': {
      const tr = (it.tx || it.ty) ? ` transform="translate(${r(it.tx || 0)},${r(it.ty || 0)})"` : '';
      return `<path class="${it.cls || ''}" d="${it.d}"${tr}${refAttrs(it.ref)}/>`;
    }
    case 'text':
      return textNode(it);
    case 'dynamic':
      return dynamicNode(it);
    case 'tempo':
      return tempoNode(it);
    case 'brace': {
      const h = it.y2 - it.y1;
      return `<path class="brace" transform="translate(${r(it.x)},${r((it.y1 + it.y2) / 2)})" d="${bracePath(h)}"/>`;
    }
    case 'bracket': {
      const t = M.bracketThick;
      const h = it.y2 - it.y1;
      const tip = 0.62;
      return `<path class="bracket" d="M${r(it.x)},${r(it.y1)}h${r(t)}v${r(h)}h${r(-t)}Z"/>` +
        `<path class="bracket" d="M${r(it.x + t)},${r(it.y1)}c${r(-0.1)},${r(-tip * 0.7)} ${r(0.5)},${r(-tip)} ${r(1.1)},${r(-tip * 1.05)}` +
        `c${r(-0.75)},${r(tip * 0.34)} ${r(-0.9)},${r(tip * 0.5)} ${r(-1.1)},${r(tip * 0.62)}Z"/>` +
        `<path class="bracket" d="M${r(it.x + t)},${r(it.y2)}c${r(-0.1)},${r(tip * 0.7)} ${r(0.5)},${r(tip)} ${r(1.1)},${r(tip * 1.05)}` +
        `c${r(-0.75)},${r(-tip * 0.34)} ${r(-0.9)},${r(-tip * 0.5)} ${r(-1.1)},${r(-tip * 0.62)}Z"/>`;
    }
    case 'rehearsal': {
      const w = textWidthApprox(it.str, it.size) + 1.0;
      return `<g class="rehearsal"${refAttrs(it.ref)}>` +
        `<rect x="${r(it.x - 0.3)}" y="${r(it.y - it.size * 0.92)}" width="${r(w)}" height="${r(it.size * 1.25)}" fill="none" stroke-width="0.13"/>` +
        `<text x="${r(it.x + w / 2 - 0.3)}" y="${r(it.y)}" font-size="${r(it.size)}" text-anchor="middle" font-family='${TEXT_FONT}' font-weight="700">${esc(it.str)}</text></g>`;
    }
    case 'tremolo':
      return `<path class="tremolo" d="M${r(it.x - 0.62)},${r(it.y + 0.36)}L${r(it.x + 0.62)},${r(it.y - 0.06)}` +
        `L${r(it.x + 0.62)},${r(it.y + 0.34)}L${r(it.x - 0.62)},${r(it.y + 0.76)}Z"/>`;
    case 'arpeggio': {
      let d = '';
      const n = Math.max(1, Math.round((it.y2 - it.y1) / 1.0));
      for (let i = 0; i < n; i++) d += `<path class="g arpeggio" transform="translate(${r(it.x)},${r(it.y1 + i)})" d="${GLYPHS.arpeggio.d}"/>`;
      return d;
    }
    default:
      return '';
  }
}

/** Render one page model to an SVG string. */
export function renderPageSVG(page, opts = {}) {
  const { spatium = 8, cls = '', showFrame = true } = opts;
  const w = page.width * spatium;
  const h = page.height * spatium;
  let body = '';
  for (const it of page.items) body += itemNode(it);
  const frame = showFrame ? `<rect class="pagebg" x="0" y="0" width="${r(page.width)}" height="${r(page.height)}"/>` : '';
  return `<svg class="score-page ${cls}" data-page="${page.index}" width="${Math.round(w)}" height="${Math.round(h)}"` +
    ` viewBox="0 0 ${r(page.width)} ${r(page.height)}" xmlns="http://www.w3.org/2000/svg">` +
    `${frame}<g class="ink">${body}</g><g class="overlay"></g></svg>`;
}

/** Standalone SVG (for export): carries its own styling. */
export function renderPageStandalone(page, opts = {}) {
  const svg = renderPageSVG(page, { ...opts, showFrame: false });
  const style = `<style>
    .ink{fill:#000;stroke:none}
    .l{stroke:#000;stroke-linecap:butt}
    line.ledger,line.staffline{stroke:#000}
    text{fill:#000}
    .rehearsal rect{stroke:#000}
    path.slur,path.tie,path.beam{fill:#000}
  </style>`;
  return svg.replace('<g class="ink">', style + '<g class="ink">');
}

export { bracePath };
