/* Cadenza — toolbar iconography.
 *
 * Musical buttons reuse the engraving glyphs, so the palette shows exactly the
 * shapes that will appear on the page.  Interface icons are plain strokes.
 */

import { GLYPHS, FLAG_GLYPHS } from '../engrave/glyphs.js';
import { durationInfo } from '../core/rhythm.js';

/** A small note picture for a duration button. */
export function noteIcon(durationId, dots = 0, { size = 26 } = {}) {
  const info = durationInfo(durationId);
  const head = info.ticks >= 3840 * 2 ? 'noteheadBreve'
    : info.ticks >= 3840 ? 'noteheadWhole'
      : info.ticks >= 1920 ? 'noteheadHalf' : 'noteheadBlack';
  const g = GLYPHS[head];
  const stemH = 3.3;
  let d = `<path d="${g.d}" transform="translate(0,0)"/>`;
  if (info.stem) {
    const sx = g.w - 0.06;
    d += `<path d="M${sx - 0.06},0 h0.12 v${-stemH} h-0.12 Z"/>`;
    if (info.beams) {
      d += `<path transform="translate(${sx},${-stemH})" d="${FLAG_GLYPHS.up(info.beams)}"/>`;
    }
  }
  for (let i = 0; i < dots; i++) d += `<circle cx="${g.w + 0.42 + i * 0.5}" cy="-0.5" r="0.17"/>`;
  const top = info.stem ? -stemH - (info.beams ? 0.5 : 0.3) : -0.7;
  const w = g.w + 0.9 + dots * 0.55;
  const h = 0.7 - top;
  return `<svg viewBox="${-0.15} ${top} ${w} ${h}" width="${(w / h) * size}" height="${size}" fill="currentColor">${d}</svg>`;
}

/** A single engraving glyph, scaled to fit a button. */
export function glyphIcon(name, { size = 24, pad = 0.18, box = null } = {}) {
  const g = GLYPHS[name];
  if (!g) return '';
  const b = box || GLYPH_BOX[name] || { x: 0, y: -1.2, w: g.w, h: 2.4 };
  const w = b.w + pad * 2;
  const h = b.h + pad * 2;
  const rule = g.rule ? ` fill-rule="${g.rule}"` : '';
  return `<svg viewBox="${b.x - pad} ${b.y - pad} ${w} ${h}" width="${(w / h) * size}" height="${size}"` +
    ` fill="currentColor"><path d="${g.d}"${rule}/></svg>`;
}

/* Drawing boxes for glyphs whose ink extends past the nominal advance. */
const GLYPH_BOX = {
  accidentalSharp: { x: 0, y: -1.35, w: 0.96, h: 2.7 },
  accidentalFlat: { x: 0, y: -1.9, w: 1.0, h: 3.2 },
  accidentalNatural: { x: 0, y: -1.6, w: 0.76, h: 3.2 },
  accidentalDoubleSharp: { x: 0, y: -0.6, w: 1.04, h: 1.2 },
  accidentalDoubleFlat: { x: 0, y: -1.9, w: 1.74, h: 3.2 },
  articStaccato: { x: -0.3, y: -0.3, w: 0.6, h: 0.6 },
  articStaccatissimo: { x: -0.25, y: -0.55, w: 0.5, h: 1.0 },
  articTenuto: { x: -0.5, y: -0.25, w: 1.0, h: 0.5 },
  articAccent: { x: -0.7, y: -0.5, w: 1.4, h: 1.0 },
  articMarcato: { x: -0.5, y: -0.6, w: 1.0, h: 1.1 },
  fermata: { x: -1.1, y: -1.3, w: 2.2, h: 1.6 },
  ornamentTrill: { x: -0.2, y: -1.1, w: 1.7, h: 1.8 },
  ornamentMordent: { x: -1.0, y: -0.55, w: 2.0, h: 1.1 },
  ornamentMordentLower: { x: -1.0, y: -0.55, w: 2.0, h: 1.6 },
  ornamentTurn: { x: -1.05, y: -0.5, w: 2.1, h: 1.1 },
  restWhole: { x: -0.1, y: -0.3, w: 1.5, h: 1.1 },
  restHalf: { x: -0.1, y: -0.8, w: 1.5, h: 1.1 },
  restQuarter: { x: -0.1, y: -1.6, w: 1.3, h: 3.4 },
  restEighth: { x: -0.1, y: -1.1, w: 1.3, h: 2.6 },
  rest16th: { x: -0.1, y: -1.9, w: 1.3, h: 3.4 },
  rest32nd: { x: -0.1, y: -2.7, w: 1.3, h: 4.2 },
  rest64th: { x: -0.1, y: -3.5, w: 1.3, h: 5.0 },
  gClef: { x: -0.2, y: -4.6, w: 3.0, h: 7.6 },
  fClef: { x: -0.1, y: -1.3, w: 3.0, h: 4.2 },
  cClef: { x: -0.1, y: -2.2, w: 2.2, h: 4.4 },
  percClef: { x: -0.1, y: -1.2, w: 1.2, h: 2.4 },
  segno: { x: 0, y: -1.4, w: 1.7, h: 2.6 },
  coda: { x: -0.2, y: -1.2, w: 2.1, h: 2.4 },
  timeSigCommon: { x: -0.8, y: -1.2, w: 1.6, h: 2.4 },
  timeSigCut: { x: -0.8, y: -1.5, w: 1.6, h: 3.0 },
};

/** Dynamics are drawn from their letters, like the score. */
export function dynamicIcon(id, { size = 22 } = {}) {
  const letters = String(id).split('');
  const map = { p: 'dynamicP', f: 'dynamicF', m: 'dynamicM', s: 'dynamicS', z: 'dynamicZ', r: 'dynamicR' };
  let x = 0;
  let d = '';
  for (const ch of letters) {
    const g = GLYPHS[map[ch]];
    if (!g) continue;
    d += `<path transform="translate(${x},0)" d="${g.d}"/>`;
    x += g.w + 0.09;
  }
  const w = Math.max(0.8, x) + 0.3;
  const h = 3.0;
  return `<svg viewBox="-0.15 -1.5 ${w} ${h}" width="${(w / h) * size}" height="${size}" fill="currentColor">${d}</svg>`;
}

/* -------------------------------------------------------- interface icons */

const S = (body, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const UI = {
  new: S('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
  open: S('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  save: S('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'),
  export: S('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>'),
  print: S('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>'),
  undo: S('<path d="M3 7v6h6"/><path d="M3.5 13a9 9 0 1 0 2.2-9.3L3 7"/>'),
  redo: S('<path d="M21 7v6h-6"/><path d="M20.5 13a9 9 0 1 1-2.2-9.3L21 7"/>'),
  play: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 4h3.4v16H7zM13.6 4H17v16h-3.4z"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M6 6h12v12H6z" rx="1"/></svg>`,
  rewind: `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M6 5h2.2v14H6zM20 5v14L9.5 12z"/></svg>`,
  metronome: S('<path d="M12 3 8 20h8z"/><path d="M6 20h12"/><path d="M15.5 8 8.8 15"/>'),
  loop: S('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
  countin: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  zoomIn: S('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M11 8v6M8 11h6"/>'),
  zoomOut: S('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8 11h6"/>'),
  keyboard: S('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M7 6v7M12 6v7M17 6v7"/>'),
  midi: S('<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1"/><circle cx="15.5" cy="10" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="9.5" cy="14.5" r="1"/><circle cx="14.5" cy="14.5" r="1"/>'),
  help: S('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 1 1 3.4 2.5c-.6.2-.9.8-.9 1.4v.6"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/>'),
  trash: S('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  insertBar: S('<path d="M4 4v16M20 4v16"/><path d="M12 8v8M8 12h8"/>'),
  deleteBar: S('<path d="M4 4v16M20 4v16"/><path d="M8 12h8"/>'),
  clef: S('<path d="M6 4v16M18 4v16M6 12h12"/>'),
  tie: S('<path d="M5 10c3 5 11 5 14 0" />'),
  slur: S('<path d="M4 14c4-7 12-7 16 0"/>'),
  cresc: S('<path d="M21 6 3 12l18 6"/>'),
  dim: S('<path d="M3 6l18 6-18 6"/>'),
  text: S('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'),
  lyric: S('<path d="M4 5h16M4 12h10M4 19h16"/>'),
  chord: S('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  tempo: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
  voice: S('<path d="M4 18V9M9 18V5M14 18v-7M19 18V8"/>'),
  concert: S('<path d="M4 12h16M12 4v16"/>'),
  eye: S('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'),
  parts: S('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>'),
  grace: S('<circle cx="8" cy="16" r="2.5"/><path d="M10.5 16V6M10.5 6l5 3"/><path d="M5 12l8-5"/>'),
  tuplet: S('<path d="M4 14h16"/><path d="M4 14v-3M20 14v-3"/><path d="M10 9h4"/>'),
  arpeggio: S('<path d="M10 20c-3-2-3-5 0-7s3-5 0-7"/><path d="M16 4v16"/>'),
  tremolo: S('<path d="M5 13l14-4M5 17l14-4"/>'),
  octave: S('<path d="M4 8h4v8H4zM12 12h8M12 8h8M12 16h8"/>'),
  pedal: S('<path d="M6 18V8M6 8h5a3 3 0 0 1 0 6H6"/><path d="M16 8v10"/>'),
  wand: S('<path d="m15 4 5 5L9 20l-5-5z"/><path d="M18 2l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>'),
  audio: S('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M16 9a5 5 0 0 1 0 6M19.5 6.5a9 9 0 0 1 0 11"/>'),
  xml: S('<path d="M9 8 5 12l4 4M15 8l4 4-4 4M13 6l-2 12"/>'),
  image: S('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
  crossUp: S('<path d="M4 7h16M4 17h16"/><path d="M12 20V9M12 9l-3 3M12 9l3 3"/>'),
  crossDown: S('<path d="M4 7h16M4 17h16"/><path d="M12 4v11M12 15l-3-3M12 15l3 3"/>'),
  figures: S('<path d="M4 5h16"/><path d="M7 10h3M8.5 10v5M7 15h3"/><path d="M14 10h3v2.5h-3V15h3"/>'),
  multirest: S('<path d="M3 12h18" stroke-width="4"/><path d="M4 8v8M20 8v8" stroke-width="1.6"/>'),
  close: S('<path d="M18 6 6 18M6 6l12 12"/>'),
};
