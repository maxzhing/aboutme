/* Cadenza — the layout engine.
 *
 * Turns a score document into positioned draw items.  The pipeline is the
 * classical one: build a rhythmic grid per measure so voices line up
 * vertically, give each grid column the room its duration deserves, break the
 * stream into systems, justify, then stack staves so nothing collides.
 *
 * Every item carries page coordinates in staff spaces; the renderer scales.
 */

import { M, PAGE_SIZES, MARGINS, idealSpace, TEXT_FONT } from './metrics.js';
import { GLYPHS, FLAG_GLYPHS, DYNAMIC_LETTERS, ARTICULATIONS, ORNAMENTS } from './glyphs.js';
import {
  CLEFS, staffPos, keySignatureLayout, neededAccidental, toMidi, keyAlterations,
} from '../core/theory.js';
import {
  TPQ, durationInfo, eventTicks, measureTicks, computeBeams, beamLevels, beatTicks,
} from '../core/rhythm.js';
import {
  timeSigAt, keySigAt, tempoAt, clefAt, tickAt, writtenFifths, soundingPitch, locateEvent,
  measureAccidentals, voiceStaffOf,
} from '../core/model.js';
import { bracketGroups, getInstrument } from '../core/instruments.js';

/* ------------------------------------------------------------ text metrics */

let measureCtx = null;
export function textWidth(str, size, font = TEXT_FONT, weight = '') {
  if (!str) return 0;
  if (typeof document !== 'undefined') {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    measureCtx.font = `${weight} ${size * 10}px ${font}`.trim();
    return measureCtx.measureText(str).width / 10;
  }
  return str.length * size * 0.5;
}

/* ------------------------------------------------------------------ items */

const item = (kind, o) => ({ kind, ...o });
const gl = (name, x, y, o = {}) => item('glyph', { name, x, y, ...o });

/* ------------------------------------------------------------------ staves */

/** Which staves are drawn, in order, for a full score or a single part. */
export function visibleStaves(score, partFilter) {
  const out = [];
  score.parts.forEach((part, partIndex) => {
    if (partFilter !== null && partFilter !== undefined && partIndex !== partFilter) return;
    if (!part.visible && partFilter === null) return;
    for (let s = 0; s < (part.staves || 1); s++) {
      out.push({ partIndex, part, staff: s, first: s === 0, last: s === (part.staves || 1) - 1 });
    }
  });
  return out;
}

const voiceStaff = voiceStaffOf;

/** Resolve a bar's accidentals, honouring the concert-pitch view. */
function resolveAccidentals(score, sv, mIdx, fifths, o) {
  return measureAccidentals(score, sv.part, mIdx, sv.staff, fifths,
    (p) => displayPitch(score, sv.part, p, o));
}

/* ------------------------------------------------- per-measure rhythm grid */

/**
 * Union of every onset in a measure across all staves, with the space each
 * column needs.  Sharing one grid is what keeps voices and parts aligned.
 */
function buildGrid(score, mIdx, staves, opts) {
  const ts = timeSigAt(score, mIdx);
  const total = measureTicks(ts);
  const cols = new Map();
  const touch = (tick) => {
    if (!cols.has(tick)) cols.set(tick, { tick, leftPad: 0, headW: 1.18, graceW: 0 });
    return cols.get(tick);
  };
  touch(0);

  for (const sv of staves) {
    const pm = sv.part.measures[mIdx];
    if (!pm) continue;
    const fifths = displayFifths(score, sv.part, mIdx, opts);
    const accMap = resolveAccidentals(score, sv, mIdx, fifths, opts);
    for (let v = 0; v < pm.voices.length; v++) {
      if (voiceStaff(sv.part, v) !== sv.staff) continue;
      let tick = 0;
      let graceRun = 0;
      for (const ev of pm.voices[v]) {
        if (ev.grace) { graceRun += 1; continue; }
        const col = touch(tick);
        if (graceRun) { col.graceW = Math.max(col.graceW, graceRun * 1.5 + 0.3); graceRun = 0; }
        const info = analyseEvent(ev, sv, score, mIdx, fifths, accMap, opts);
        col.leftPad = Math.max(col.leftPad, info.accWidth);
        col.headW = Math.max(col.headW, info.width);
        tick += eventTicks(ev);
      }
    }
  }

  const list = [...cols.values()].sort((a, b) => a.tick - b.tick);
  /* Distance from each column to the next: whichever is larger, the space the
   * duration asks for or the ink actually present. */
  for (let i = 0; i < list.length; i++) {
    const next = i + 1 < list.length ? list[i + 1].tick : total;
    const dur = next - list[i].tick;
    const ink = list[i].headW + M.noteGap + (i + 1 < list.length ? list[i + 1].leftPad + list[i + 1].graceW : 0);
    list[i].advance = Math.max(idealSpace(dur), ink);
    list[i].duration = dur;
  }
  const width = list.reduce((a, c) => a + c.advance, 0) + list[0].leftPad + list[0].graceW;
  return { columns: list, width, total, ts };
}

function displayFifths(score, part, mIdx, opts) {
  if (opts.concertPitch || opts.partFilter === null || opts.partFilter === undefined) {
    return opts.concertPitch ? keySigAt(score, mIdx).fifths : writtenFifths(score, part, mIdx);
  }
  return writtenFifths(score, part, mIdx);
}

function displayPitch(score, part, p, opts) {
  return opts.concertPitch ? soundingPitch(part, p) : p;
}

/** Width contributions of one event: accidentals on the left, heads on the right. */
function analyseEvent(ev, sv, score, mIdx, fifths, accMap, opts) {
  if (ev.type === 'rest') return { accWidth: 0, width: GLYPHS.restQuarter.w };
  const clef = clefAt(score, sv.part, mIdx, ev.staff ?? sv.staff);
  let accWidth = 0;
  let heads = 1.18;
  let seconds = false;
  const positions = [];
  ev.notes.forEach((n, ni) => {
    const p = displayPitch(score, sv.part, n.pitch, opts);
    const alter = accMap.get(ev.id + ':' + ni);
    if (alter !== null && alter !== undefined) accWidth = Math.max(accWidth, accGlyphFor(alter).w + M.accidentalGap);
    positions.push(staffPos(p, clef));
  });
  positions.sort((a, b) => a - b);
  for (let i = 1; i < positions.length; i++) if (positions[i] - positions[i - 1] === 1) seconds = true;
  if (seconds) heads = 1.18 * 2;
  if (ev.dots) heads += ev.dots * M.dotWidth;
  if (ev.duration === 'whole' || ev.duration === 'breve') heads = Math.max(heads, GLYPHS.noteheadWhole.w);
  if (ev.notes.length > 1) accWidth *= Math.min(2.2, 1 + ev.notes.length * 0.28);
  return { accWidth, width: heads };
}

function accGlyphFor(alter) {
  return alter === 1 ? GLYPHS.accidentalSharp
    : alter === -1 ? GLYPHS.accidentalFlat
      : alter === 0 ? GLYPHS.accidentalNatural
        : alter === 2 ? GLYPHS.accidentalDoubleSharp : GLYPHS.accidentalDoubleFlat;
}

function accNameFor(alter) {
  return alter === 1 ? 'accidentalSharp' : alter === -1 ? 'accidentalFlat'
    : alter === 0 ? 'accidentalNatural' : alter === 2 ? 'accidentalDoubleSharp' : 'accidentalDoubleFlat';
}

/* ----------------------------------------------------- measure furniture */

/** Width of the clef / key / time block at the head of a measure. */
function leadingBlock(score, mIdx, staves, opts, atSystemStart) {
  const blocks = [];
  let width = 0;
  const spec = score.measures[mIdx] || {};
  const showClef = atSystemStart || staves.some((sv) => {
    const cc = sv.part.measures[mIdx] && sv.part.measures[mIdx].clefChange;
    return cc && cc[sv.staff];
  });
  const prevKey = mIdx > 0 ? keySigAt(score, mIdx - 1) : null;
  const key = keySigAt(score, mIdx);
  const written = staves.map((sv) => displayFifths(score, sv.part, mIdx, opts));
  const writtenPrev = staves.map((sv) => (prevKey
    ? writtenFifthsFor(score, sv.part, prevKey.fifths, opts) : 0));
  const maxW = Math.max(0, ...written.map((f) => Math.abs(f)));
  const changed = !!spec.keySig && (!prevKey || prevKey.fifths !== key.fifths);
  const showKey = atSystemStart ? maxW > 0 : changed;
  let cancelCount = 0;
  if (!atSystemStart && changed) {
    for (let i = 0; i < written.length; i++) {
      const c = sameSign(writtenPrev[i], written[i])
        ? Math.max(0, Math.abs(writtenPrev[i]) - Math.abs(written[i]))
        : Math.abs(writtenPrev[i]);
      cancelCount = Math.max(cancelCount, c);
    }
  }
  const ts = timeSigAt(score, mIdx);
  const prevTs = mIdx > 0 ? timeSigAt(score, mIdx - 1) : null;
  const showTime = mIdx === 0 || (!!spec.timeSig && (!prevTs || prevTs.beats !== ts.beats || prevTs.beatType !== ts.beatType));

  if (showClef) { blocks.push({ type: 'clef' }); width += 3.4 + M.clefGap; }
  if (showKey || cancelCount) {
    const n = maxW;
    const w = cancelCount * 0.82 + n * (Math.max(...written) >= 0 ? M.keyAccWidth : M.keyAccWidthFlat);
    if (w > 0) { blocks.push({ type: 'key', cancelCount }); width += w + M.keyGap; }
  }
  if (showTime) { blocks.push({ type: 'time' }); width += timeSigWidth(ts) + M.timeGap; }
  if (width > 0) width += M.leadingPad;
  return { blocks, width, showClef, showKey: showKey || cancelCount > 0, showTime, cancelCount };
}

function timeSigWidth(ts) {
  if (ts.symbol === 'common' || ts.symbol === 'cut') return 1.5;
  return Math.max(String(ts.beats).length, String(ts.beatType).length) * 1.28;
}

/* --------------------------------------------------------- multi-bar rests */

/**
 * Group the timeline into drawing blocks.  Consecutive bars in which every
 * visible staff is silent collapse into one multi-bar rest, which is how parts
 * are printed and how a player reads a long tacet.
 */
function buildBlocks(score, staves, o) {
  const spannerEnds = new Set();
  for (const sp of score.spanners || []) { spannerEnds.add(sp.fromId); spannerEnds.add(sp.toId); }

  const silent = (m) => {
    for (const sv of staves) {
      const pm = sv.part.measures[m];
      if (!pm) return false;
      for (let v = 0; v < pm.voices.length; v++) {
        if (voiceStaff(sv.part, v) !== sv.staff) continue;
        for (const ev of pm.voices[v]) {
          if (ev.type !== 'rest') return false;
          if (ev.dynamic || spannerEnds.has(ev.id)) return false;
          if ((ev.texts && ev.texts.length) || (ev.articulations && ev.articulations.length)) return false;
          if (ev.figures && ev.figures.length) return false;
        }
      }
    }
    return true;
  };
  /* Anything a reader must see stops the run at that bar. */
  const interrupts = (m) => {
    const spec = score.measures[m] || {};
    if (spec.timeSig || spec.keySig || spec.tempo || spec.rehearsal) return true;
    if (spec.systemBreak || spec.pageBreak) return true;
    if (spec.barline && spec.barline !== 'normal' && spec.barline !== 'final') return true;
    for (const sv of staves) {
      const cc = sv.part.measures[m] && sv.part.measures[m].clefChange;
      if (cc && Object.keys(cc).length) return true;
    }
    return false;
  };

  const blocks = [];
  const enabled = !!o.multiBarRests;
  for (let m = 0; m < score.measures.length; m++) {
    if (!enabled || !silent(m)) { blocks.push({ index: m, last: m, count: 1 }); continue; }
    let end = m;
    while (end + 1 < score.measures.length && silent(end + 1) && !interrupts(end + 1)) end++;
    /* A run ends before a final barline so the closing bar keeps its own. */
    if (end > m) {
      blocks.push({ index: m, last: end, count: end - m + 1, multirest: true });
      m = end;
    } else {
      blocks.push({ index: m, last: m, count: 1 });
    }
  }
  return blocks;
}

/** A multi-bar rest takes a fixed width, growing only slightly with the count. */
function multirestWidth(count) {
  return 11 + Math.min(7, Math.log2(Math.max(1, count)) * 2.1);
}

/* ------------------------------------------------------------ main entry */

export function layoutScore(score, opts = {}) {
  const o = {
    partFilter: null,
    concertPitch: !!score.concertPitch,
    pageMode: 'page',
    pageWidth: null,
    showMeasureNumbers: true,
    showTitle: true,
    multiBarRests: false,
    spatiumMm: score.spatium || 1.75,
    ...opts,
  };
  const staves = visibleStaves(score, o.partFilter);
  if (!staves.length) return { pages: [], staves: [], index: new Map(), o };

  const page = PAGE_SIZES[score.pageSize] || PAGE_SIZES.letter;
  const sp = o.spatiumMm;
  const pageW = (o.pageMode === 'continuous' && o.pageWidth ? o.pageWidth : page.w / sp);
  const pageH = page.h / sp;
  const margin = {
    top: MARGINS.top / sp, bottom: MARGINS.bottom / sp,
    left: MARGINS.left / sp, right: MARGINS.right / sp,
  };

  /* Room for the instrument names printed beside the first system. */
  const showNames = o.partFilter === null || o.partFilter === undefined;
  let nameW = 0;
  if (showNames) {
    for (const sv of staves) {
      if (!sv.first) continue;
      nameW = Math.max(nameW, textWidth(sv.part.name, M.partNameSize) + 1.4);
      nameW = Math.max(nameW, textWidth(sv.part.abbrev, M.partNameSize) + 1.4);
    }
  }
  const bracketW = staves.length > 1 ? 1.6 : 0;

  /* --- measure widths --------------------------------------------------- */
  const blocks = buildBlocks(score, staves, o);
  const gridFor = (b) => (b.multirest
    ? { columns: [{ tick: 0, leftPad: 0, headW: 1.18, graceW: 0, advance: multirestWidth(b.count), duration: 0 }],
      width: multirestWidth(b.count), total: measureTicks(timeSigAt(score, b.index)), ts: timeSigAt(score, b.index) }
    : buildGrid(score, b.index, staves, o));
  for (const b of blocks) b.grid = gridFor(b);

  /* --- system breaking --------------------------------------------------- */
  const contentW = pageW - margin.left - margin.right;
  const systems = [];
  let cur = null;
  for (const b of blocks) {
    const m = b.index;
    const atStart = !cur || cur.measures.length === 0;
    const lead = leadingBlock(score, m, staves, o, atStart);
    const need = b.grid.width + lead.width + M.measurePadLeft + M.measurePadRight;
    const indent = (systems.length === 0 ? nameW + bracketW : (showNames ? nameW * 0.55 + bracketW : bracketW));
    if (!cur) cur = { measures: [], width: 0, indent };
    const avail = contentW - cur.indent;
    const entry = (l) => ({
      index: m, last: b.last, count: b.count, multirest: !!b.multirest,
      lead: l, grid: b.grid, natural: b.grid.width + l.width + M.measurePadLeft + M.measurePadRight,
    });
    if (cur.measures.length && cur.width + need > avail) {
      systems.push(cur);
      cur = { measures: [], width: 0, indent: showNames ? nameW * 0.55 + bracketW : bracketW };
      cur.measures.push(entry(leadingBlock(score, m, staves, o, true)));
      cur.width = cur.measures[0].natural;
    } else {
      cur.measures.push(entry(lead));
      cur.width += need;
    }
    if (score.measures[b.last].systemBreak && cur.measures.length) {
      systems.push(cur);
      cur = null;
    }
  }
  if (cur && cur.measures.length) systems.push(cur);

  /* --- justify ----------------------------------------------------------- */
  for (let i = 0; i < systems.length; i++) {
    const sys = systems[i];
    const avail = contentW - sys.indent;
    const isLast = i === systems.length - 1;
    /* Don't stretch a short final system across the page. */
    const stretch = isLast && sys.width < avail * 0.68 ? 1 : avail / sys.width;
    sys.scale = Math.max(0.82, stretch);
    let x = 0;
    for (const mm of sys.measures) {
      mm.x = x;
      mm.width = mm.natural * sys.scale;
      x += mm.width;
    }
    sys.totalWidth = x;
  }

  /* --- render each system into staff-local items ------------------------- */
  const built = systems.map((sys, i) => buildSystem(score, sys, staves, o, i === 0));

  /* --- paginate ---------------------------------------------------------- */
  const pages = [];
  const titleH = o.showTitle && score.title ? MARGINS.titleBlock / sp : 0;
  let pi = 0;
  let y = margin.top + titleH;
  let pageObj = { index: 0, width: pageW, height: pageH, items: [], systems: [] };
  if (o.showTitle) addTitleBlock(pageObj, score, pageW, margin, o);

  for (let i = 0; i < built.length; i++) {
    const sys = built[i];
    const forceBreak = i > 0 && score.measures[systems[i].measures[0].index]?.pageBreak;
    if (o.pageMode !== 'continuous' && (forceBreak || (y + sys.height > pageH - margin.bottom && pageObj.systems.length))) {
      pages.push(pageObj);
      pi++;
      pageObj = { index: pi, width: pageW, height: pageH, items: [], systems: [] };
      y = margin.top;
    }
    placeSystem(pageObj, sys, margin.left + systems[i].indent, y, systems[i], score, staves, o);
    pageObj.systems.push({
      y, height: sys.height, measures: systems[i].measures,
      x: margin.left + systems[i].indent, width: systems[i].totalWidth,
      staves: sys.staffY || [],
      top: y + sys.topPad,
    });
    y += sys.height + M.systemGap;
  }
  pages.push(pageObj);

  /* --- spanners need final coordinates, so they come last ---------------- */
  const index = new Map();
  for (const pg of pages) {
    for (const it of pg.items) if (it.ref && it.ref.eventId && !index.has(it.ref.eventId)) index.set(it.ref.eventId, { ...it.ref, x: it.x, y: it.y, page: pg.index });
  }
  drawSpanners(score, pages, o);

  return { pages, staves, index, opts: o, spatiumMm: sp, pageSize: page };
}

function addTitleBlock(page, score, pageW, margin, o) {
  const cx = pageW / 2;
  let y = margin.top - 6;
  if (score.title) {
    page.items.push(item('text', { x: cx, y, str: score.title, size: M.titleSize, anchor: 'middle', cls: 'title' }));
    y += M.titleSize * 0.95;
  }
  if (score.subtitle) {
    page.items.push(item('text', { x: cx, y, str: score.subtitle, size: M.subtitleSize, anchor: 'middle', cls: 'subtitle', italic: true }));
    y += M.subtitleSize * 1.2;
  }
  if (score.composer) {
    page.items.push(item('text', {
      x: pageW - margin.right, y: margin.top - 1.2, str: score.composer,
      size: M.composerSize, anchor: 'end', cls: 'composer',
    }));
  }
  if (score.lyricist) {
    page.items.push(item('text', {
      x: margin.left, y: margin.top - 1.2, str: score.lyricist,
      size: M.composerSize, anchor: 'start', cls: 'composer', italic: true,
    }));
  }
}

/* ---------------------------------------------------------- system build */

function buildSystem(score, sys, staves, o, isFirst) {
  const staffItems = staves.map(() => []);
  const extents = staves.map(() => ({ top: 0, bottom: M.staffHeight }));
  const crossWork = [];
  const crossParts = new Set();

  for (let si = 0; si < staves.length; si++) {
    const sv = staves[si];
    const out = staffItems[si];
    for (const mm of sys.measures) {
      const res = layoutMeasureStaff(score, mm, sv, si, o, sys);
      out.push(...res.items);
      extents[si].top = Math.min(extents[si].top, res.top);
      extents[si].bottom = Math.max(extents[si].bottom, res.bottom);
      if ((res.crossChords && res.crossChords.length) || (res.pendingBeams && res.pendingBeams.length)) {
        crossWork.push({ si, sv, out, res });
        crossParts.add(sv.partIndex);
      }
    }
    /* Lift tempo marks clear of anything reaching above the top staff. */
    const tempos = out.filter((i) => i.kind === 'tempo');
    if (tempos.length) {
      const ink = Math.min(0, ...out
        .filter((i) => i.kind !== 'tempo' && i.y !== undefined)
        .map((i) => i.y));
      const y = Math.min(M.tempoY, ink - 1.3);
      for (const t of tempos) t.y = y;
      extents[si].top = Math.min(extents[si].top, y - M.tempoSize);
    }
    /* Align every dynamic on this staff, and tell the hairpins where to go. */
    const dyns = out.filter((i) => i.kind === 'dynamic');
    const figs = out.filter((i) => i.cls === 'figure');
    const figBottom = figs.length ? Math.max(...figs.map((f) => f.y)) + 1.5 : -Infinity;
    const line = dyns.length
      ? Math.max(M.dynamicY, figBottom, ...dyns.map((d) => d.minY || 0))
      : Math.max(M.hairpinY, figBottom);
    for (const d of dyns) d.y = line;
    for (const a of out) if (a.kind === 'anchor') a.meta.dynLine = line;
    if (dyns.length) extents[si].bottom = Math.max(extents[si].bottom, line + 1.4);
  }

  /* Stack staves, honouring what each one actually occupies. */
  const ys = [];
  let y = 0;
  for (let si = 0; si < staves.length; si++) {
    if (si > 0) {
      const samePart = staves[si].partIndex === staves[si - 1].partIndex;
      /* Cross-staff writing lives in the gap, so widen it a little. */
      const cross = samePart && crossParts.has(staves[si].partIndex);
      const gap = samePart ? (cross ? M.crossStaffGap : M.graceStaffGap) : M.staffGap;
      y = ys[si - 1] + Math.max(
        M.staffHeight + gap,
        extents[si - 1].bottom + gap * 0.55 - extents[si].top,
      );
    }
    ys.push(y);
  }

  /* Now that the staves are placed, move the cross-staff notes onto their
   * neighbour and beam the groups that span both. */
  if (crossWork.length) {
    const indexOf = (partIndex, staff) =>
      staves.findIndex((k) => k.partIndex === partIndex && k.staff === staff);
    for (const w of crossWork) {
      for (const c of w.res.crossChords || []) {
        const to = indexOf(w.sv.partIndex, c.crossTo);
        if (to < 0) continue;
        shiftChord(c, ys[to] - ys[w.si]);
      }
      for (const pb of w.res.pendingBeams || []) {
        const shifts = new Set(pb.members.map((c) => c.staffShift || 0));
        const r = shifts.size > 1
          ? layoutCrossBeam(pb.members, pb.events, pb.indices, pb.ts)
          : layoutBeam(pb.members, pb.events, pb.indices, pb.ts, pb.multi, pb.voice);
        w.out.push(...r.items);
        for (const c of pb.members) {
          if (c.beamed || !c.flagCount) continue;
          w.out.push(item('path', {
            d: FLAG_GLYPHS[c.dir === 1 ? 'up' : 'down'](c.flagCount),
            x: c.stemX + (c.dir === 1 ? -M.stem / 2 : M.stem / 2), y: c.stemEndY, cls: 'flag',
          }));
        }
        extents[w.si].top = Math.min(extents[w.si].top, 0);
      }
    }
  }

  const height = ys[ys.length - 1] + Math.max(M.staffHeight, extents[extents.length - 1].bottom)
    - Math.min(0, extents[0].top);
  return { staffItems, ys, extents, height, topPad: -Math.min(0, extents[0].top), sys };
}

/** Move an already-laid-out chord (and everything attached to it) vertically. */
function shiftChord(c, dy) {
  if (!dy) return;
  for (const it of c.items) {
    if (it.y !== undefined) it.y += dy;
    if (it.y1 !== undefined) { it.y1 += dy; it.y2 += dy; }
    if (it.kind === 'beam' || it.kind === 'curve') it.ty = (it.ty || 0) + dy;
    if (it.meta) {
      if (it.meta.notes) for (const n of it.meta.notes) n.y += dy;
      if (it.meta.stemEndY !== undefined && it.meta.stemEndY !== null) it.meta.stemEndY += dy;
      it.meta.staffShift = (it.meta.staffShift || 0) + dy;
    }
  }
  for (const n of c.notes || []) n.y += dy;
  if (c.stemEndY !== null && c.stemEndY !== undefined) c.stemEndY += dy;
  c.top += dy;
  c.bottom += dy;
  c.staffShift = (c.staffShift || 0) + dy;
}

/**
 * Beam a group whose notes are split between two staves.  The beam runs
 * through the gap between them and each chord's stem points at it, so notes
 * above the beam get down-stems and notes below get up-stems.
 */
function layoutCrossBeam(members, events, indices, ts) {
  const items = [];
  const shifts = members.map((c) => c.staffShift || 0);
  const upper = Math.min(...shifts);
  const lower = Math.max(...shifts);
  /* Halfway between the lower edge of the upper staff and the top of the lower. */
  const mid = (upper + M.staffHeight + lower) / 2;

  const pts = members.map((c) => {
    const ys = c.notes.map((n) => n.y);
    return {
      c,
      x: c.x + c.headW / 2,
      hi: Math.min(...ys),
      lo: Math.max(...ys),
      centre: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
  });

  /* A gentle slope following the outer chords, kept inside the gap. */
  const first = pts[0];
  const last = pts[pts.length - 1];
  const dx = Math.max(0.01, last.x - first.x);
  let slope = ((last.centre - first.centre) * 0.2) / dx;
  slope = Math.max(-0.12, Math.min(0.12, slope));
  let intercept = mid - slope * ((first.x + last.x) / 2);
  const beamAt = (x) => slope * x + intercept;
  /* Keep at least a little stem on every chord. */
  const minStem = 1.1;
  for (const p of pts) {
    const y = beamAt(p.x);
    if (p.lo < y && y - p.lo < minStem) intercept += minStem - (y - p.lo);
    if (p.hi > y && p.hi - y < minStem) intercept -= minStem - (p.hi - y);
  }

  const levels = beamLevels(events, indices, 0, ts);
  const maxBeams = Math.max(...levels.map((l) => l.beams));
  const step = M.beam + M.beamGap;
  for (let level = 1; level <= maxBeams; level++) {
    let run = [];
    const flush = () => {
      if (run.length > 1) emitBeam(items, run[0].x, run[run.length - 1].x, level, 1, beamAt, step);
      else if (run.length === 1) {
        const k = pts.indexOf(run[0]);
        const back = k === pts.length - 1;
        emitBeam(items, back ? run[0].x - 1.05 : run[0].x, back ? run[0].x : run[0].x + 1.05,
          level, 1, beamAt, step);
      }
      run = [];
    };
    for (let k = 0; k < pts.length; k++) {
      const has = levels[k].beams >= level;
      const linked = k > 0 && (levels[k].continued || 0) >= level && levels[k - 1].beams >= level;
      if (!has) { flush(); continue; }
      if (run.length && !linked) flush();
      run.push(pts[k]);
    }
    flush();
  }

  let top = Infinity;
  let bottom = -Infinity;
  for (const p of pts) {
    const y = beamAt(p.x);
    /* Point the stem at the beam from whichever side the chord sits on. */
    const above = p.centre < y;
    const dir = above ? -1 : 1;
    const anchor = above ? p.lo : p.hi;
    p.c.beamed = true;
    p.c.dir = dir;
    p.c.stemEndY = y;
    if (p.c.stemItem) {
      p.c.stemItem.x1 = p.x;
      p.c.stemItem.x2 = p.x;
      p.c.stemItem.y1 = anchor - dir * 0.06;
      p.c.stemItem.y2 = y;
    }
    top = Math.min(top, p.hi - 0.6, y - 0.6);
    bottom = Math.max(bottom, p.lo + 0.6, y + 0.6 + (maxBeams - 1) * step);
  }
  return { items, top, bottom };
}

function placeSystem(page, built, x0, y0, sys, score, staves, o) {
  const top = y0 + built.topPad;
  built.ys.forEach((sy, si) => {
    const sv = staves[si];
    const y = top + sy;
    built.staffY = built.staffY || [];
    built.staffY[si] = { partIndex: sv.partIndex, staff: sv.staff, y, index: si };
    /* staff lines, drawn per measure run so breaks are clean */
    const lineEnd = x0 + sys.totalWidth;
    for (let l = 0; l < 5; l++) {
      page.items.push(item('line', {
        x1: x0, y1: y + l, x2: lineEnd, y2: y + l, w: M.staffLine, cls: 'staffline',
      }));
    }
    for (const it of built.staffItems[si]) {
      page.items.push(offsetItem(it, x0, y));
    }
  });

  /* barlines, brackets, names, measure numbers */
  const firstY = top + built.ys[0];
  const lastY = top + built.ys[built.ys.length - 1] + M.staffHeight;
  drawBarlines(page, score, sys, staves, built, x0, top, o, built.extents[0]);
  drawBrackets(page, score, staves, x0, firstY, lastY, built, top);
  if (o.partFilter === null || o.partFilter === undefined) {
    drawPartNames(page, score, staves, built, x0, top, sys, o);
  }
  if (o.showMeasureNumbers) {
    const m0 = sys.measures[0];
    if (m0.index > 0) {
      page.items.push(item('text', {
        x: x0 + m0.x + 0.2, y: firstY - 1.3, str: String(m0.index + 1),
        size: M.measureNumSize, cls: 'measnum', anchor: 'start', italic: true,
      }));
    }
  }
}

function offsetItem(it, dx, dy) {
  const c = { ...it };
  if (c.x !== undefined) c.x += dx;
  if (c.y !== undefined) c.y += dy;
  if (c.x1 !== undefined) { c.x1 += dx; c.x2 += dx; }
  if (c.y1 !== undefined) { c.y1 += dy; c.y2 += dy; }
  /* Beams and ties carry baked path data, so they move by transform. */
  if (c.kind === 'beam' || c.kind === 'curve') { c.tx = (c.tx || 0) + dx; c.ty = (c.ty || 0) + dy; }
  if (c.meta) {
    c.meta = { ...c.meta, staffTop: dy };
    if (c.meta.notes) c.meta.notes = c.meta.notes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }));
    if (c.meta.stemX !== undefined && c.meta.stemX !== null) c.meta.stemX += dx;
    if (c.meta.stemEndY !== undefined && c.meta.stemEndY !== null) c.meta.stemEndY += dy;
    if (c.meta.x0 !== undefined) c.meta.x0 += dx;
    if (c.meta.x1 !== undefined) c.meta.x1 += dx;
  }
  return c;
}

/* ------------------------------------------------------------ barlines */

function drawBarlines(page, score, sys, staves, built, x0, top, o, topExtent) {
  const spans = [];
  let i = 0;
  while (i < staves.length) {
    let j = i;
    while (j + 1 < staves.length && staves[j + 1].partIndex === staves[i].partIndex) j++;
    spans.push([i, j]);
    i = j + 1;
  }
  const yTop = (si) => top + built.ys[si];
  const yBot = (si) => top + built.ys[si] + M.staffHeight;

  const drawAt = (x, style, isEnd) => {
    for (const [a, b] of spans) {
      const y1 = yTop(a);
      const y2 = yBot(b);
      if (style === 'final') {
        page.items.push(item('line', { x1: x - M.barlineThick / 2 - M.barlineGap - M.barlineThin, y1, x2: x - M.barlineThick / 2 - M.barlineGap - M.barlineThin, y2, w: M.barlineThin, cls: 'barline' }));
        page.items.push(item('line', { x1: x - M.barlineThick / 2, y1, x2: x - M.barlineThick / 2, y2, w: M.barlineThick, cls: 'barline' }));
      } else if (style === 'double') {
        page.items.push(item('line', { x1: x - 0.45, y1, x2: x - 0.45, y2, w: M.barlineThin, cls: 'barline' }));
        page.items.push(item('line', { x1: x, y1, x2: x, y2, w: M.barlineThin, cls: 'barline' }));
      } else if (style === 'repeat-end' || style === 'repeat-both') {
        page.items.push(item('line', { x1: x - M.barlineThick / 2, y1, x2: x - M.barlineThick / 2, y2, w: M.barlineThick, cls: 'barline' }));
        page.items.push(item('line', { x1: x - M.barlineThick - M.barlineGap, y1, x2: x - M.barlineThick - M.barlineGap, y2, w: M.barlineThin, cls: 'barline' }));
        for (let s = a; s <= b; s++) {
          page.items.push(item('dot', { x: x - M.barlineThick - M.barlineGap - 0.55, y: yTop(s) + 1.5, r: M.repeatDotR, cls: 'barline' }));
          page.items.push(item('dot', { x: x - M.barlineThick - M.barlineGap - 0.55, y: yTop(s) + 2.5, r: M.repeatDotR, cls: 'barline' }));
        }
      } else if (style === 'repeat-start') {
        page.items.push(item('line', { x1: x + M.barlineThick / 2, y1, x2: x + M.barlineThick / 2, y2, w: M.barlineThick, cls: 'barline' }));
        page.items.push(item('line', { x1: x + M.barlineThick + M.barlineGap, y1, x2: x + M.barlineThick + M.barlineGap, y2, w: M.barlineThin, cls: 'barline' }));
        for (let s = a; s <= b; s++) {
          page.items.push(item('dot', { x: x + M.barlineThick + M.barlineGap + 0.55, y: yTop(s) + 1.5, r: M.repeatDotR, cls: 'barline' }));
          page.items.push(item('dot', { x: x + M.barlineThick + M.barlineGap + 0.55, y: yTop(s) + 2.5, r: M.repeatDotR, cls: 'barline' }));
        }
      } else if (style === 'dashed') {
        page.items.push(item('line', { x1: x, y1, x2: x, y2, w: M.barlineThin, cls: 'barline', dash: '0.6 0.5' }));
      } else {
        page.items.push(item('line', { x1: x, y1, x2: x, y2, w: M.barlineThin, cls: 'barline' }));
      }
    }
  };

  /* Opening barline of the system joins all staves. */
  if (staves.length > 1) {
    const y1 = yTop(0);
    const y2 = yBot(staves.length - 1);
    page.items.push(item('line', { x1: x0, y1, x2: x0, y2, w: M.barlineThin, cls: 'barline' }));
  }
  for (const mm of sys.measures) {
    const spec = score.measures[mm.last === undefined ? mm.index : mm.last] || {};
    const startSpec = score.measures[mm.index] || {};
    const x = x0 + mm.x + mm.width;
    drawAt(x, spec.barline || 'normal', true);
    if (startSpec.barline === 'repeat-start' || startSpec.barline === 'repeat-both') {
      drawAt(x0 + mm.x, 'repeat-start', false);
    }
    if (startSpec.rehearsal) {
      page.items.push(item('rehearsal', {
        x: x0 + mm.x + 0.4,
        y: yTop(0) + Math.min(-2.4, (topExtent ? topExtent.top : 0) - 1.0),
        str: startSpec.rehearsal, size: M.rehearsalSize,
        ref: { measure: mm.index, kind: 'rehearsal' },
      }));
    }
  }
}

function drawBrackets(page, score, staves, x0, firstY, lastY, built, top) {
  if (staves.length < 2) return;
  /* A brace joins the staves of one keyboard instrument. */
  let i = 0;
  while (i < staves.length) {
    let j = i;
    while (j + 1 < staves.length && staves[j + 1].partIndex === staves[i].partIndex) j++;
    if (j > i) {
      const y1 = top + built.ys[i];
      const y2 = top + built.ys[j] + M.staffHeight;
      page.items.push(item('brace', { x: x0 - 0.85, y1, y2, cls: 'brace' }));
    }
    i = j + 1;
  }
  /* Square brackets join instrument families. */
  const parts = [];
  const seen = new Set();
  for (const sv of staves) {
    if (seen.has(sv.partIndex)) continue;
    seen.add(sv.partIndex);
    parts.push(sv.part);
  }
  if (parts.length < 2) return;
  const groups = bracketGroups(parts);
  const staffOfPart = (pi) => staves.findIndex((s) => s.part === parts[pi]);
  const lastStaffOfPart = (pi) => {
    let last = -1;
    staves.forEach((s, k) => { if (s.part === parts[pi]) last = k; });
    return last;
  };
  for (const g of groups) {
    const a = staffOfPart(g.start);
    const b = lastStaffOfPart(g.end);
    if (a < 0 || b < 0) continue;
    const y1 = top + built.ys[a] - 0.25;
    const y2 = top + built.ys[b] + M.staffHeight + 0.25;
    page.items.push(item('bracket', { x: x0 - 1.5, y1, y2, cls: 'bracket' }));
  }
}

function drawPartNames(page, score, staves, built, x0, top, sys, o) {
  const isFirstSystem = sys.measures[0].index === 0;
  const seen = new Set();
  for (let si = 0; si < staves.length; si++) {
    const sv = staves[si];
    if (seen.has(sv.partIndex)) continue;
    seen.add(sv.partIndex);
    let last = si;
    for (let k = si; k < staves.length; k++) if (staves[k].partIndex === sv.partIndex) last = k;
    const y = (top + built.ys[si] + top + built.ys[last] + M.staffHeight) / 2;
    const str = isFirstSystem ? sv.part.name : sv.part.abbrev;
    page.items.push(item('text', {
      x: x0 - (staves.length > 1 ? 2.2 : 1.4), y: y + M.partNameSize * 0.34, str,
      size: M.partNameSize, anchor: 'end', cls: 'partname',
      ref: { partIndex: sv.partIndex, kind: 'partname' },
    }));
  }
}

export { buildGrid, leadingBlock, voiceStaff, displayFifths, displayPitch, accNameFor, accGlyphFor };

/* ======================================================================== */
/*  Measure contents                                                         */
/* ======================================================================== */

const posY = (pos) => (8 - pos) * 0.5;

function layoutMeasureStaff(score, mm, sv, staffIndex, o, sys) {
  const items = [];
  let top = 0;
  let bottom = M.staffHeight;
  const grow = (t, b) => { top = Math.min(top, t); bottom = Math.max(bottom, b); };

  const clefId = clefAt(score, sv.part, mm.index, sv.staff);
  const clef = CLEFS[clefId] || CLEFS.treble;
  const fifths = displayFifths(score, sv.part, mm.index, o);
  const ts = mm.grid.ts;
  const spec = score.measures[mm.index] || {};

  /* --- clef / key / time ------------------------------------------------ */
  let x = mm.x + M.measurePadLeft;
  const lead = mm.lead;
  if (lead.showClef) {
    const c = clefGlyph(clef);
    items.push(gl(c.name, x, posY(c.pos), { scale: c.scale, cls: 'clef', ref: { measure: mm.index, partIndex: sv.partIndex, staff: sv.staff, kind: 'clef' } }));
    grow(posY(c.pos) + c.top, posY(c.pos) + c.bottom);
    x += 3.4 + M.clefGap;
  }
  if (lead.showKey) {
    const prevKey = mm.index > 0 ? keySigAt(score, mm.index - 1) : { fifths: 0 };
    const prevW = o.concertPitch ? prevKey.fifths : writtenFifthsFor(score, sv.part, prevKey.fifths, o);
    if (lead.cancelCount > 0 && prevW !== fifths) {
      const cancels = keySignatureLayout(prevW, clef).slice(sameSign(prevW, fifths) ? Math.abs(fifths) : 0);
      for (const c of cancels) {
        items.push(gl('accidentalNatural', x, posY(c.pos), { cls: 'keysig' }));
        x += 0.82;
      }
      if (cancels.length) x += 0.2;
    }
    for (const a of keySignatureLayout(fifths, clef)) {
      items.push(gl(accNameFor(a.alter), x, posY(a.pos), {
        cls: 'keysig', ref: { measure: mm.index, partIndex: sv.partIndex, kind: 'keysig' },
      }));
      x += fifths > 0 ? M.keyAccWidth : M.keyAccWidthFlat;
      grow(posY(a.pos) - 1.5, posY(a.pos) + 1.5);
    }
    x += M.keyGap;
  }
  if (lead.showTime) {
    const tw = timeSigWidth(ts);
    items.push(...timeSigItems(ts, x, tw, { measure: mm.index, partIndex: sv.partIndex, kind: 'timesig' }));
    x += tw + M.timeGap;
  }
  if (lead.width > 0) x += M.leadingPad;

  /* --- a multi-bar rest replaces the contents of the block --------------- */
  if (mm.multirest) {
    const left = x + 0.6;
    const right = mm.x + mm.width - M.measurePadRight - 0.6;
    const barTop = 1.5;
    const barBottom = 2.5;
    const serif = 0.19;
    items.push(item('rect', { x: left, y: barTop, w: Math.max(2, right - left), h: barBottom - barTop, cls: 'multirest' }));
    items.push(item('rect', { x: left, y: 1.0, w: serif, h: 2.0, cls: 'multirest' }));
    items.push(item('rect', { x: right - serif, y: 1.0, w: serif, h: 2.0, cls: 'multirest' }));
    const label = String(mm.count);
    const digitW = 1.12;
    let dx = (left + right) / 2 - (label.length * digitW) / 2 + digitW / 2;
    for (const ch of label) {
      items.push(gl('timeSig' + ch, dx, -1.5, { scale: 0.86, cls: 'multirest-num' }));
      dx += digitW;
    }
    grow(-3.0, M.staffHeight);
    items.push(item('anchor', {
      x: left, y: 2,
      ref: { measure: mm.index, partIndex: sv.partIndex, staff: sv.staff, kind: 'multirest' },
      meta: { top, bottom, isRest: true, dir: 1, notes: [] },
    }));
    if (!mm.noteArea) {
      mm.noteArea = { start: left, end: right };
      mm.columns = [{ tick: 0, x: left }];
    }
    return { items, top, bottom, crossChords: [], pendingBeams: [] };
  }

  /* --- column positions -------------------------------------------------- */
  const noteStart = x;
  const avail = mm.x + mm.width - M.measurePadRight - noteStart;
  const natural = mm.grid.width;
  const k = natural > 0 ? Math.max(0.5, avail / natural) : 1;
  const colX = new Map();
  let cx = noteStart + mm.grid.columns[0].leftPad * k + mm.grid.columns[0].graceW * k;
  for (const col of mm.grid.columns) {
    colX.set(col.tick, cx);
    cx += col.advance * k;
  }
  const measureRight = mm.x + mm.width;
  if (!mm.noteArea) {
    mm.noteArea = { start: noteStart, end: measureRight - M.measurePadRight };
    mm.columns = [...colX.entries()].map(([tick, x]) => ({ tick, x }));
  }

  /* --- tempo / rehearsal text (first staff of the system only) ---------- */
  if (staffIndex === 0 && spec.tempo) {
    const t = spec.tempo;
    const label = (t.text ? t.text + '  ' : '') + unitGlyphText(t.unit) + ' = ' + Math.round(t.bpm);
    items.push(item('tempo', {
      x: noteStart - 0.6, y: M.tempoY, str: label, bpm: t.bpm, unit: t.unit, text: t.text,
      size: M.tempoSize, ref: { measure: mm.index, kind: 'tempo' },
    }));
    grow(M.tempoY - M.tempoSize, bottom);
  }

  /* --- voices ------------------------------------------------------------ */
  const pm = sv.part.measures[mm.index];
  if (!pm) return { items, top, bottom };
  const voicesHere = [];
  for (let v = 0; v < pm.voices.length; v++) if (voiceStaff(sv.part, v) === sv.staff) voicesHere.push(v);
  const multi = voicesHere.length > 1;
  /* If another voice is writing onto this staff, its notes fill the bar; an
   * extra whole-bar rest here would be redundant. */
  let receivesCross = false;
  for (let v = 0; v < pm.voices.length; v++) {
    if (voiceStaff(sv.part, v) === sv.staff) continue;
    for (const ev of pm.voices[v]) {
      if (ev.staff !== null && ev.staff !== undefined && ev.staff === sv.staff) { receivesCross = true; break; }
    }
    if (receivesCross) break;
  }

  const crossChords = [];
  const pendingBeams = [];
  /* A cross-staff note is written on its neighbour's staff; we lay it out here
   * and shift it once the staves have been stacked. */
  const staffOf = (ev) => (ev.staff === null || ev.staff === undefined ? sv.staff : ev.staff);
  const clefCache = new Map([[sv.staff, clef]]);
  const clefForStaff = (st) => {
    if (!clefCache.has(st)) {
      clefCache.set(st, CLEFS[clefAt(score, sv.part, mm.index, st)] || clef);
    }
    return clefCache.get(st);
  };

  const accMap = resolveAccidentals(score, sv, mm.index, fifths, o);

  for (const v of voicesHere) {
    const voice = pm.voices[v];
    const chords = [];
    let tick = 0;
    let pendingGrace = [];
    for (let i = 0; i < voice.length; i++) {
      const ev = voice[i];
      if (ev.grace) { pendingGrace.push(ev); continue; }
      const bx = colX.get(tick) ?? noteStart;
      const target = staffOf(ev);
      const ctx = {
        x: bx, clef: clefForStaff(target), fifths, accMap, o, score, sv, ts, tick,
        voiceIndex: v, multi, measure: mm.index, k, measureRight,
        crossTo: target === sv.staff ? null : target,
        isFullMeasure: ev.type === 'rest' && (ev.fullMeasure || voice.length === 1),
        hideRest: receivesCross && voice.every((e) => e.type === 'rest'),
      };
      if (pendingGrace.length) {
        let gx = bx - 0.5;
        for (let gi = pendingGrace.length - 1; gi >= 0; gi--) {
          gx -= 1.45;
          const gc = layoutChord(pendingGrace[gi], { ...ctx, x: gx, grace: true });
          chords.push(gc);
          items.push(...gc.items);
          grow(gc.top, gc.bottom);
        }
        pendingGrace = [];
      }
      const c = layoutChord(ev, ctx);
      c.index = i;
      c.tick = tick;
      c.crossTo = ctx.crossTo;
      chords.push(c);
      items.push(...c.items);
      if (c.crossTo === null) grow(c.top, c.bottom);
      else crossChords.push(c);
      tick += eventTicks(ev);
    }

    /* beams */
    const real = chords.filter((c) => !c.grace);
    const flat = voice.filter((e) => !e.grace);
    const groups = computeBeams(flat, ts);
    for (const g of groups) {
      const members = g.map((idx) => real[idx]).filter(Boolean);
      if (members.length < 2) continue;
      if (members.some((c) => c.crossTo !== null)) {
        /* Wait until the staves are placed: the beam spans both of them. */
        pendingBeams.push({ members, events: flat, indices: g, ts, multi, voice: v });
        continue;
      }
      const r = layoutBeam(members, flat, g, ts, multi, v);
      items.push(...r.items);
      grow(r.top, r.bottom);
    }
    for (const c of real) {
      if (!c.beamed && c.flagCount > 0 && !pendingBeams.some((b) => b.members.includes(c))) {
        const flag = item('path', {
          d: FLAG_GLYPHS[c.dir === 1 ? 'up' : 'down'](c.flagCount),
          x: c.stemX + (c.dir === 1 ? -M.stem / 2 : M.stem / 2), y: c.stemEndY, cls: 'flag',
        });
        items.push(flag);
        if (c.crossTo !== null) c.items.push(flag);
        else grow(Math.min(top, c.stemEndY - 0.4), Math.max(bottom, c.stemEndY + 0.4));
      }
    }

    /* tuplet brackets */
    items.push(...layoutTuplets(chords, multi));

    /* marks that sit outside the staff */
    for (const c of real) {
      const r = layoutMarks(c, multi, ts);
      items.push(...r.items);
      if (c.crossTo !== null) c.items.push(...r.items);
      else grow(r.top, r.bottom);
    }
  }

  return { items, top, bottom, crossChords, pendingBeams };
}

function sameSign(a, b) { return (a >= 0 && b >= 0) || (a <= 0 && b <= 0); }

function writtenFifthsFor(score, part, concertFifths, o) {
  if (o.concertPitch) return concertFifths;
  const t = part.transpose || { chromatic: 0 };
  if (!t.chromatic) return concertFifths;
  let f = concertFifths - ((t.chromatic % 12) * 7) % 12;
  while (f > 7) f -= 12;
  while (f < -7) f += 12;
  return f;
}

function clefGlyph(clef) {
  if (clef.sign === 'G') return { name: 'gClef', pos: (clef.line - 1) * 2, scale: 1, top: -4.4, bottom: 2.9 };
  if (clef.sign === 'F') return { name: 'fClef', pos: (clef.line - 1) * 2, scale: 1, top: -1.2, bottom: 2.7 };
  if (clef.sign === 'C') return { name: 'cClef', pos: (clef.line - 1) * 2, scale: 1, top: -2.1, bottom: 2.1 };
  return { name: 'percClef', pos: 4, scale: 1, top: -1.1, bottom: 1.1 };
}

function unitGlyphText(unit) {
  return { whole: '\u{1D15D}', half: '\u{1D15E}', quarter: '\u{1D15F}', 'quarter.': '\u{1D15F}·', eighth: '\u{1D160}' }[unit] || '\u{1D15F}';
}

function timeSigItems(ts, x, width, ref) {
  const out = [];
  if (ts.symbol === 'common') {
    out.push(gl('timeSigCommon', x + 0.7, 2, { cls: 'timesig', ref }));
    return out;
  }
  if (ts.symbol === 'cut') {
    out.push(gl('timeSigCut', x + 0.7, 2, { cls: 'timesig', ref }));
    return out;
  }
  const topStr = String(ts.beats);
  const botStr = String(ts.beatType);
  const digitW = 1.25;
  const place = (str, y) => {
    let dx = x + (width - str.length * digitW) / 2 + digitW / 2;
    for (const ch of str) {
      out.push(gl('timeSig' + ch, dx, y, { cls: 'timesig', ref }));
      dx += digitW;
    }
  };
  place(topStr, 1);
  place(botStr, 3);
  return out;
}

/* --------------------------------------------------------------- chords */

function layoutChord(ev, ctx) {
  const items = [];
  const grace = !!ctx.grace;
  const scale = grace ? 0.62 : 1;
  const info = durationInfo(ev.duration);
  let top = 0;
  let bottom = M.staffHeight;
  const grow = (t, b) => { top = Math.min(top, t); bottom = Math.max(bottom, b); };

  if (ev.type === 'rest') {
    if (ctx.hideRest) {
      return {
        items, top, bottom, ev, x: ctx.x, isRest: true, grace, flagCount: 0, dir: 1,
        tuplet: ev.tuplet, notes: [], crossTo: null,
      };
    }
    const restName = ctx.isFullMeasure ? 'restWhole' : {
      breve: 'restBreve', whole: 'restWhole', half: 'restHalf', quarter: 'restQuarter',
      eighth: 'restEighth', '16th': 'rest16th', '32nd': 'rest32nd', '64th': 'rest64th',
      '128th': 'rest128th',
    }[ev.duration] || 'restQuarter';
    /* Whole rests hang from the fourth line; half rests sit on the third. */
    let ry = restName === 'restWhole' ? 1 : restName === 'restHalf' ? 2 : 2;
    if (ctx.multi) ry += ctx.voiceIndex % 2 === 0 ? -1 : 1;
    const rx = ctx.isFullMeasure
      ? (ctx.x + ctx.measureRight) / 2 - GLYPHS.restWhole.w / 2
      : ctx.x;
    items.push(gl(restName, rx, ry, {
      cls: 'rest', ref: { eventId: ev.id, measure: ctx.measure, partIndex: ctx.sv.partIndex, voice: ctx.voiceIndex, kind: 'rest' },
    }));
    if (!ctx.isFullMeasure) {
      let dx = rx + GLYPHS[restName].w + 0.28;
      for (let d = 0; d < (ev.dots || 0); d++) {
        items.push(item('dot', { x: dx, y: ry - 0.5, r: M.dotR, cls: 'dot' }));
        dx += M.dotWidth;
      }
    }
    grow(Math.min(0, ry - 2), Math.max(M.staffHeight, ry + 2));
    items.push(item('anchor', {
      x: rx, y: ry, ref: { eventId: ev.id, measure: ctx.measure, partIndex: ctx.sv.partIndex, voice: ctx.voiceIndex, kind: 'rest', staff: ctx.sv.staff },
      meta: { top, bottom, isRest: true, tuplet: ev.tuplet, dir: 1 },
    }));
    return { items, top, bottom, ev, x: rx, isRest: true, grace, flagCount: 0, dir: 1, tuplet: ev.tuplet, notes: [] };
  }

  /* --- pitches and staff positions --------------------------------------- */
  const notes = ev.notes.map((n, ni) => {
    const p = displayPitch(ctx.score, ctx.sv.part, n.pitch, ctx.o);
    const pos = staffPos(p, ctx.clef);
    const resolved = ctx.accMap ? ctx.accMap.get(ev.id + ':' + ni) : null;
    const alter = resolved === undefined ? null : resolved;
    return { n, ni, p, pos, y: posY(pos), alter, head: n.head || 'normal' };
  }).sort((a, b) => a.pos - b.pos);

  /* --- stem direction ---------------------------------------------------- */
  let dir;
  if (ctx.multi) dir = ctx.voiceIndex % 2 === 0 ? 1 : -1;
  else if (ev.stemDir === 'up') dir = 1;
  else if (ev.stemDir === 'down') dir = -1;
  else {
    const lo = notes[0].pos;
    const hi = notes[notes.length - 1].pos;
    const far = Math.abs(hi - 4) >= Math.abs(4 - lo) ? hi : lo;
    dir = far >= 4 ? -1 : 1;
  }

  /* --- seconds are displaced to the far side of the stem ----------------- */
  const headW = (info.ticks >= TPQ * 4 ? GLYPHS.noteheadWhole.w : GLYPHS.noteheadBlack.w) * scale;
  let displaced = false;
  const order = dir === 1 ? notes : [...notes].reverse();
  let prevPos = null;
  let prevDisp = false;
  for (const nd of order) {
    nd.displaced = prevPos !== null && Math.abs(nd.pos - prevPos) === 1 && !prevDisp;
    if (nd.displaced) displaced = true;
    prevDisp = nd.displaced;
    prevPos = nd.pos;
  }
  const anyDisp = displaced;
  const baseX = ctx.x + (anyDisp && dir === -1 ? headW : 0);
  for (const nd of notes) {
    nd.x = baseX + (nd.displaced ? dir * headW : 0);
  }

  /* --- accidentals ------------------------------------------------------- */
  const accs = notes.filter((n) => n.alter !== null);
  if (accs.length) {
    const cols = [];
    const ordered = [...accs].sort((a, b) => a.pos - b.pos).reverse();
    for (const a of ordered) {
      const g = accGlyphFor(a.alter);
      let c = 0;
      while (c < cols.length && cols[c].some((o) => Math.abs(o.pos - a.pos) < 5.6)) c++;
      if (!cols[c]) cols[c] = [];
      cols[c].push(a);
      a.accCol = c;
      a.accW = g.w * scale;
    }
    const colW = cols.map((c) => Math.max(...c.map((a) => a.accW)) + M.accidentalGap);
    for (const a of accs) {
      let off = 0;
      for (let c = 0; c <= a.accCol; c++) off += colW[c];
      const ax = ctx.x - off;
      items.push(gl(accNameFor(a.alter), ax, a.y, {
        scale, cls: 'accidental',
        ref: { eventId: ev.id, noteIndex: a.ni, measure: ctx.measure, partIndex: ctx.sv.partIndex, kind: 'accidental' },
      }));
      grow(a.y - 1.6 * scale, a.y + 1.6 * scale);
    }
  }

  /* --- noteheads and ledger lines ---------------------------------------- */
  const headName = ev.type === 'note' && notes[0].head === 'x' ? 'noteheadX'
    : info.ticks >= TPQ * 8 ? 'noteheadBreve'
      : info.ticks >= TPQ * 4 ? 'noteheadWhole'
        : info.ticks >= TPQ * 2 ? 'noteheadHalf' : 'noteheadBlack';
  const ledgerSet = new Set();
  for (const nd of notes) {
    items.push(gl(headName, nd.x, nd.y, {
      scale, cls: 'notehead' + (nd.n.parenthesized ? ' paren' : ''),
      ref: {
        eventId: ev.id, noteIndex: nd.ni, measure: ctx.measure, partIndex: ctx.sv.partIndex,
        voice: ctx.voiceIndex, staff: ctx.sv.staff, kind: 'note', midi: toMidi(nd.p),
      },
    }));
    for (let p = 10; p <= nd.pos; p += 2) ledgerSet.add(p);
    for (let p = -2; p >= nd.pos; p -= 2) ledgerSet.add(p);
    grow(nd.y - 0.6, nd.y + 0.6);
  }
  const lx0 = Math.min(...notes.map((n) => n.x));
  const lx1 = Math.max(...notes.map((n) => n.x)) + headW;
  for (const p of ledgerSet) {
    const y = posY(p);
    items.push(item('line', {
      x1: lx0 - M.ledgerExtend * scale, y1: y, x2: lx1 + M.ledgerExtend * scale, y2: y,
      w: M.ledger, cls: 'ledger',
    }));
  }

  /* --- dots -------------------------------------------------------------- */
  if (ev.dots) {
    const dotX0 = lx1 + 0.32;
    for (const nd of notes) {
      let dy = nd.pos % 2 === 0 ? nd.y - 0.5 : nd.y;
      let dx = dotX0;
      for (let d = 0; d < ev.dots; d++) {
        items.push(item('dot', { x: dx, y: dy, r: M.dotR * scale, cls: 'dot' }));
        dx += M.dotWidth * scale;
      }
    }
  }

  /* --- stem -------------------------------------------------------------- */
  let stemX = null;
  let stemEndY = null;
  let stemItem = null;
  let flagCount = info.beams;
  if (info.stem) {
    const topN = notes[notes.length - 1];
    const botN = notes[0];
    stemX = dir === 1 ? baseX + headW - M.stem / 2 * scale : baseX + M.stem / 2 * scale;
    const anchorY = dir === 1 ? botN.y : topN.y;
    const tipFrom = dir === 1 ? topN.y : botN.y;
    let len = (grace ? 2.4 : M.stemLength) * scale;
    if (flagCount > 2) len += (flagCount - 2) * 0.72;
    stemEndY = tipFrom - dir * len;
    /* Notes outside the staff have their stems drawn back to the middle line,
     * but a very remote note keeps a plain stem rather than a flagpole. */
    if (!grace) {
      const cap = 5.2;
      if (dir === 1 && stemEndY > 2) stemEndY = Math.max(Math.min(stemEndY, 2), tipFrom - cap);
      if (dir === -1 && stemEndY < 2) stemEndY = Math.min(Math.max(stemEndY, 2), tipFrom + cap);
    }
    stemItem = item('line', {
      x1: stemX, y1: anchorY - dir * 0.06, x2: stemX, y2: stemEndY, w: M.stem * scale, cls: 'stem',
    });
    items.push(stemItem);
    grow(Math.min(stemEndY, top), Math.max(stemEndY, bottom));
  } else {
    flagCount = 0;
  }

  /* --- tremolo ----------------------------------------------------------- */
  if (ev.tremolo && stemX !== null) {
    const midY = (notes[dir === 1 ? 0 : notes.length - 1].y + stemEndY) / 2;
    for (let t = 0; t < ev.tremolo; t++) {
      const ty = midY + dir * t * 0.5 - 0.2;
      items.push(item('tremolo', { x: stemX, y: ty, cls: 'tremolo' }));
    }
  }

  /* --- arpeggio ---------------------------------------------------------- */
  if (ev.arpeggio) {
    const y0 = notes[0].y + 0.6;
    const y1 = notes[notes.length - 1].y - 0.6;
    items.push(item('arpeggio', { x: lx0 - 0.9, y1, y2: y0, cls: 'arpeggio' }));
  }

  /* --- grace-note slash --------------------------------------------------- */
  if (grace && ev.grace && ev.grace.slash && stemX !== null) {
    items.push(item('line', {
      x1: stemX - 0.42, y1: stemEndY + dir * 0.7, x2: stemX + 0.55, y2: stemEndY + dir * 1.45,
      w: 0.1, cls: 'gracedash',
    }));
  }

  items.push(item('anchor', {
    x: baseX, y: notes[0].y,
    ref: {
      eventId: ev.id, measure: ctx.measure, partIndex: ctx.sv.partIndex,
      voice: ctx.voiceIndex, staff: ctx.sv.staff, kind: 'note',
    },
    meta: {
      top, bottom, dir, stemX, stemEndY, headW, x0: lx0, x1: lx1, grace,
      notes: notes.map((n) => ({ ni: n.ni, x: n.x, y: n.y, pos: n.pos, tie: n.n.tie })),
      tuplet: ev.tuplet, ev,
    },
  }));

  return {
    items, top, bottom, ev, dir, stemX, stemEndY, stemItem, notes, headW, grace,
    flagCount, beamed: false, x: baseX, x0: lx0, x1: lx1, headName,
    tuplet: ev.tuplet, isRest: false,
  };
}

/* ---------------------------------------------------------------- beams */

function layoutBeam(members, events, indices, ts, multi, voiceIndex) {
  const items = [];
  let top = 0;
  let bottom = M.staffHeight;

  /* One direction for the whole group, set by the note furthest from centre. */
  let dir;
  if (multi) dir = voiceIndex % 2 === 0 ? 1 : -1;
  else {
    let extreme = 4;
    let best = -1;
    for (const c of members) {
      for (const n of c.notes) {
        const d = Math.abs(n.pos - 4);
        if (d > best) { best = d; extreme = n.pos; }
      }
    }
    dir = extreme > 4 ? -1 : 1;
  }

  const pts = members.map((c) => {
    const ys = c.notes.map((n) => n.y);
    const outer = dir === 1 ? Math.min(...ys) : Math.max(...ys);
    const inner = dir === 1 ? Math.max(...ys) : Math.min(...ys);
    const x = dir === 1 ? c.x + c.headW - M.stem / 2 : c.x + M.stem / 2;
    return { c, x, outer, inner };
  });

  const levelsPre = beamLevels(events, indices, 0, ts);
  const maxBeams = Math.max(...levelsPre.map((l) => l.beams));
  const step = M.beam + M.beamGap;
  /* The shortest stem in the group sets the beam's distance from the notes;
   * extra beams need extra room so the innermost one clears the noteheads. */
  const shortest = Math.max(2.75, 1.5 + (maxBeams - 1) * step);

  const first = pts[0];
  const last = pts[pts.length - 1];
  /* A beam takes up roughly half the interval it spans, never more than a
   * third of the staff, and stays gentle over a long group. */
  let rise = (last.outer - first.outer) * 0.55;
  rise = Math.max(-2.6, Math.min(2.6, rise));
  if (Math.abs(last.outer - first.outer) < 0.26) rise = 0;
  const dx = Math.max(0.01, last.x - first.x);
  let slope = rise / dx;
  const maxSlope = 0.32;
  slope = Math.max(-maxSlope, Math.min(maxSlope, slope));

  /* Slide the beam until the tightest stem is exactly `shortest`. */
  let intercept = dir === 1 ? Infinity : -Infinity;
  for (const p of pts) {
    const c = p.outer - dir * shortest - slope * p.x;
    intercept = dir === 1 ? Math.min(intercept, c) : Math.max(intercept, c);
  }
  const beamAt = (x) => slope * x + intercept;

  const levels = levelsPre;

  for (let level = 1; level <= maxBeams; level++) {
    let run = [];
    const flush = () => {
      if (!run.length) return;
      if (run.length > 1) {
        emitBeam(items, run[0].x, run[run.length - 1].x, level, dir, beamAt, step);
      } else {
        /* A lone secondary beam becomes a stub pointing at the beat. */
        const k = pts.indexOf(run[0]);
        const backwards = k === pts.length - 1 || (k > 0 && levels[k - 1].beams >= level);
        const w = 1.05;
        const x1 = backwards ? run[0].x - w : run[0].x;
        const x2 = backwards ? run[0].x : run[0].x + w;
        emitBeam(items, x1, x2, level, dir, beamAt, step);
      }
      run = [];
    };
    for (let k = 0; k < pts.length; k++) {
      const has = levels[k].beams >= level;
      const linked = k > 0 && (levels[k].continued || 0) >= level && levels[k - 1].beams >= level;
      if (!has) { flush(); continue; }
      if (run.length && !linked) flush();
      run.push(pts[k]);
    }
    flush();
  }

  /* Retarget every stem at the beam. */
  for (const p of pts) {
    const y = beamAt(p.x) + (dir === 1 ? 0 : 0);
    p.c.beamed = true;
    p.c.stemEndY = y;
    p.c.dir = dir;
    if (p.c.stemItem) {
      p.c.stemItem.x1 = p.x;
      p.c.stemItem.x2 = p.x;
      p.c.stemItem.y1 = p.inner - dir * 0.06;
      p.c.stemItem.y2 = y;
    }
    top = Math.min(top, y - 0.6);
    bottom = Math.max(bottom, y + 0.6 + (maxBeams - 1) * step);
  }
  return { items, top, bottom };
}

function emitBeam(items, x1, x2, level, dir, beamAt, step) {
  const off = (level - 1) * step * dir;
  const y1 = beamAt(x1) + off;
  const y2 = beamAt(x2) + off;
  const t = M.beam * dir;
  items.push(item('beam', {
    d: `M${r3(x1)},${r3(y1)}L${r3(x2)},${r3(y2)}L${r3(x2)},${r3(y2 + t)}L${r3(x1)},${r3(y1 + t)}Z`,
    cls: 'beam',
  }));
}

const r3 = (n) => Math.round(n * 1000) / 1000;

/* -------------------------------------------------------------- tuplets */

function layoutTuplets(chords, multi) {
  const items = [];
  const groups = new Map();
  for (const c of chords) {
    if (!c.tuplet) continue;
    if (!groups.has(c.tuplet.id)) groups.set(c.tuplet.id, []);
    groups.get(c.tuplet.id).push(c);
  }
  for (const [, g] of groups) {
    if (g.length < 2) continue;
    const dir = g.find((c) => !c.isRest)?.dir || 1;
    const above = dir === 1;
    const xs0 = Math.min(...g.map((c) => (c.x0 !== undefined ? c.x0 : c.x)));
    const xs1 = Math.max(...g.map((c) => (c.x1 !== undefined ? c.x1 : c.x + 1.1)));
    const y = above
      ? Math.min(...g.map((c) => Math.min(c.stemEndY ?? 0, c.top))) - 1.0
      : Math.max(...g.map((c) => Math.max(c.stemEndY ?? M.staffHeight, c.bottom))) + 1.0;
    const allBeamed = g.every((c) => c.beamed || c.isRest) && g.some((c) => c.beamed);
    const label = String(g[0].tuplet.actual);
    const mid = (xs0 + xs1) / 2;
    const lw = textWidth(label, M.tupletSize, TEXT_FONT, 'bold') + 0.6;
    if (!allBeamed && xs1 - xs0 > lw + 0.8) {
      const hook = above ? 0.62 : -0.62;
      items.push(item('line', { x1: xs0, y1: y + hook, x2: xs0, y2: y, w: 0.1, cls: 'tuplet' }));
      items.push(item('line', { x1: xs0, y1: y, x2: mid - lw / 2, y2: y, w: 0.1, cls: 'tuplet' }));
      items.push(item('line', { x1: mid + lw / 2, y1: y, x2: xs1, y2: y, w: 0.1, cls: 'tuplet' }));
      items.push(item('line', { x1: xs1, y1: y + hook, x2: xs1, y2: y, w: 0.1, cls: 'tuplet' }));
    }
    items.push(item('text', {
      x: mid, y: y + (above ? 0.5 : 0.62), str: label, size: M.tupletSize,
      anchor: 'middle', cls: 'tupletnum', italic: true, bold: true,
    }));
  }
  return items;
}

/* ---------------------------------------------------- marks around notes */

function layoutMarks(c, multi, ts) {
  const items = [];
  const ev = c.ev;
  let top = 0;
  let bottom = M.staffHeight;
  const grow = (t, b) => { top = Math.min(top, t); bottom = Math.max(bottom, b); };
  const cx = c.isRest ? c.x + 0.6 : (c.x0 + c.x1) / 2;

  /* Articulations go opposite the stem, clear of the staff if need be. */
  if (ev.articulations && ev.articulations.length) {
    const stemUp = c.dir === 1;
    const noteTop = c.notes.length ? Math.min(...c.notes.map((n) => n.y)) : 2;
    const noteBot = c.notes.length ? Math.max(...c.notes.map((n) => n.y)) : 2;
    for (const id of ev.articulations) {
      const def = ARTICULATIONS.find((a) => a.id === id);
      if (!def) continue;
      const forceAbove = def.above;
      const above = forceAbove || !stemUp;
      let y;
      if (above) {
        y = Math.min(noteTop, stemUp ? c.stemEndY : noteTop) - M.articGap - 0.2;
        if (!def.inside) y = Math.min(y, -0.4);
        while (aboveTaken(items, y)) y -= M.articStep;
      } else {
        y = Math.max(noteBot, stemUp ? noteBot : c.stemEndY) + M.articGap + 0.2;
        if (!def.inside) y = Math.max(y, M.staffHeight + 0.4);
        while (belowTaken(items, y)) y += M.articStep;
      }
      const name = def.id === 'fermata' && !above ? 'fermataBelow' : def.glyph;
      items.push(gl(name, cx, y, {
        centered: true, cls: 'artic',
        ref: { eventId: ev.id, kind: 'articulation', id: def.id },
      }));
      grow(y - 1.2, y + 1.2);
    }
  }

  if (ev.ornaments && ev.ornaments.length) {
    let y = Math.min(-0.8, (c.dir === 1 ? c.stemEndY : Math.min(...c.notes.map((n) => n.y))) - 1.3);
    for (const id of ev.ornaments) {
      const def = ORNAMENTS.find((x) => x.id === id);
      if (!def) continue;
      items.push(gl(def.glyph, cx, y, { centered: true, cls: 'ornament', ref: { eventId: ev.id, kind: 'ornament', id } }));
      grow(y - 1.3, bottom);
      y -= 1.5;
    }
  }

  if (ev.dynamic) {
    const noteBot = c.notes && c.notes.length ? Math.max(...c.notes.map((n) => n.y)) : M.staffHeight;
    const stemBot = c.dir === -1 && c.stemEndY !== null ? c.stemEndY : -Infinity;
    const minY = Math.max(M.dynamicY, noteBot + 1.75, stemBot + 1.3) + (multi && c.dir === -1 ? 1.4 : 0);
    items.push(item('dynamic', {
      x: cx, y: minY, minY, id: ev.dynamic, cls: 'dynamic',
      ref: { eventId: ev.id, kind: 'dynamic' },
    }));
    grow(top, minY + 1.4);
  }

  /* Figured bass: a stack under the staff, read from the top down. */
  if (ev.figures && ev.figures.length) {
    ev.figures.forEach((f, i) => {
      items.push(item('text', {
        x: cx, y: M.figureY + i * M.figureLine, str: prettyFigure(f),
        size: M.figureSize, anchor: 'middle', cls: 'figure',
        ref: { eventId: ev.id, kind: 'figure', line: i },
      }));
    });
    grow(top, M.figureY + (ev.figures.length - 1) * M.figureLine + 1.0);
  }

  if (ev.chordSymbol) {
    items.push(item('text', {
      x: cx, y: M.chordY, str: ev.chordSymbol, size: M.chordSize, anchor: 'middle',
      cls: 'chordsym', bold: true, ref: { eventId: ev.id, kind: 'chordSymbol' },
    }));
    grow(M.chordY - M.chordSize, bottom);
  }
  if (ev.roman) {
    items.push(item('text', {
      x: cx, y: M.staffHeight + 7.4, str: ev.roman, size: M.chordSize * 0.92, anchor: 'middle',
      cls: 'roman', ref: { eventId: ev.id, kind: 'roman' },
    }));
    grow(top, M.staffHeight + 7.8);
  }

  for (const t of ev.texts || []) {
    const below = t.placement === 'below';
    const y = below ? M.staffHeight + 3.2 : -2.0;
    items.push(item('text', {
      x: cx, y, str: t.content, size: M.expressionSize, anchor: 'middle',
      cls: 'expression ' + (t.style || ''), italic: t.style !== 'technique',
      ref: { eventId: ev.id, kind: 'text' },
    }));
    grow(below ? top : y - M.expressionSize, below ? y + 0.8 : bottom);
  }

  for (const l of ev.lyrics || []) {
    const y = M.lyricY + (l.verse || 0) * M.lyricLine;
    items.push(item('text', {
      x: cx, y, str: l.text + (l.syllabic === 'begin' || l.syllabic === 'middle' ? ' -' : ''),
      size: M.lyricSize, anchor: 'middle', cls: 'lyric',
      ref: { eventId: ev.id, kind: 'lyric', verse: l.verse },
    }));
    grow(top, y + 0.9);
  }

  for (const f of ev.fingerings || []) {
    const nd = c.notes.find((n) => n.ni === f.note) || c.notes[0];
    if (!nd) continue;
    const y = nd.y - 1.25;
    items.push(item('text', {
      x: nd.x + c.headW / 2, y, str: f.text, size: M.fingeringSize, anchor: 'middle',
      cls: 'fingering', ref: { eventId: ev.id, kind: 'fingering', note: f.note },
    }));
    grow(y - 1, bottom);
  }

  return { items, top, bottom };
}

/** Spell a figure with real accidental signs: "#6" reads as a sharp then 6. */
function prettyFigure(f) {
  return String(f)
    .replace(/#/g, '\u266F').replace(/\bb/g, '\u266D').replace(/n/g, '\u266E')
    .replace(/-/g, '\u266D').replace(/\+/g, '\u266F');
}

function aboveTaken(items, y) {
  return items.some((i) => i.cls === 'artic' && Math.abs(i.y - y) < 0.6);
}
function belowTaken(items, y) {
  return items.some((i) => i.cls === 'artic' && Math.abs(i.y - y) < 0.6);
}

/* ------------------------------------------------------------- spanners */

/** A lens-shaped curve: thin at the ends, full thickness in the middle. */
function curvePath(x1, y1, x2, y2, bulge, thick) {
  const dx = x2 - x1;
  const k = Math.min(Math.abs(dx) * 0.32, 3.2);
  const c1x = x1 + Math.max(k, 0.45);
  const c2x = x2 - Math.max(k, 0.45);
  const c1y = y1 + bulge;
  const c2y = y2 + bulge;
  const t = thick * (bulge < 0 ? 1 : -1);
  return `M${r3(x1)},${r3(y1)}C${r3(c1x)},${r3(c1y)} ${r3(c2x)},${r3(c2y)} ${r3(x2)},${r3(y2)}` +
    `C${r3(c2x)},${r3(c2y + t)} ${r3(c1x)},${r3(c1y + t)} ${r3(x1)},${r3(y1)}Z`;
}

function collectAnchors(pages) {
  const map = new Map();
  pages.forEach((pg, pi) => {
    for (const it of pg.items) {
      if (it.kind !== 'anchor') continue;
      map.set(it.ref.eventId, { ...it, page: pi, pageObj: pg });
    }
  });
  return map;
}

function drawSpanners(score, pages, o) {
  const anchors = collectAnchors(pages);
  drawTies(score, pages, anchors, o);
  for (const sp of score.spanners || []) {
    const a = anchors.get(sp.fromId);
    const b = anchors.get(sp.toId);
    if (!a || !b) continue;
    if (sp.type === 'slur') drawSlur(a, b, sp);
    else if (sp.type === 'cresc' || sp.type === 'dim') drawHairpin(a, b, sp);
    else if (sp.type === 'octave-up' || sp.type === 'octave-down') drawOctave(a, b, sp);
    else if (sp.type === 'pedal') drawPedal(a, b, sp);
    else if (sp.type === 'bracket') drawTextLine(a, b, sp);
  }
}

function drawTies(score, pages, anchors, o) {
  for (let pi = 0; pi < score.parts.length; pi++) {
    if (o.partFilter !== null && o.partFilter !== undefined && pi !== o.partFilter) continue;
    const part = score.parts[pi];
    for (let m = 0; m < part.measures.length; m++) {
      const pm = part.measures[m];
      for (let v = 0; v < pm.voices.length; v++) {
        const voice = pm.voices[v];
        for (let i = 0; i < voice.length; i++) {
          const ev = voice[i];
          if (ev.type !== 'note') continue;
          for (const n of ev.notes) {
            if (n.tie !== 'start' && n.tie !== 'both') continue;
            const target = findTieTarget(part, m, v, i, n);
            if (!target) continue;
            const a = anchors.get(ev.id);
            const b = anchors.get(target.event.id);
            if (!a || !b) continue;
            const an = (a.meta.notes || []).find((x) => x.pos !== undefined && sameMidiNote(x, a, n));
            const bn = (b.meta.notes || []).find((x) => x.pos !== undefined && sameMidiNote(x, b, target.note));
            if (!an || !bn) continue;
            const up = an.pos >= 4 ? -1 : 1;
            const bulge = up === -1 ? -0.95 : 0.95;
            const y1 = an.y + (up === -1 ? -0.52 : 0.52);
            const y2 = bn.y + (up === -1 ? -0.52 : 0.52);
            const sameLine = a.page === b.page && Math.abs(a.y - b.y) < 0.01 && b.x > a.x;
            const hw = a.meta.headW || 1.18;
            if (sameLine) {
              a.pageObj.items.push(item('curve', {
                d: curvePath(an.x + hw * 0.72, y1, bn.x + hw * 0.26, y2, bulge, M.tieThick), cls: 'tie',
              }));
            } else {
              a.pageObj.items.push(item('curve', {
                d: curvePath(an.x + hw * 0.72, y1, an.x + hw * 0.72 + 2.1, y1 + 0.15 * -bulge, bulge * 0.8, M.tieThick), cls: 'tie',
              }));
              b.pageObj.items.push(item('curve', {
                d: curvePath(bn.x - 2.1, y2 + 0.15 * -bulge, bn.x + hw * 0.26, y2, bulge * 0.8, M.tieThick), cls: 'tie',
              }));
            }
          }
        }
      }
    }
  }
}

function sameMidiNote(laid, anchor, modelNote) {
  const ev = anchor.meta.ev;
  if (!ev) return false;
  const mn = ev.notes[laid.ni];
  return mn === modelNote || (mn && modelNote && mn.pitch.step === modelNote.pitch.step
    && mn.pitch.octave === modelNote.pitch.octave && mn.pitch.alter === modelNote.pitch.alter);
}

function findTieTarget(part, m, v, i, note) {
  const scan = (voice, from) => {
    for (let k = from; k < voice.length; k++) {
      if (voice[k].grace) continue;
      if (voice[k].type !== 'note') return null;
      const match = voice[k].notes.find((x) =>
        x.pitch.step === note.pitch.step && x.pitch.octave === note.pitch.octave
        && x.pitch.alter === note.pitch.alter && (x.tie === 'stop' || x.tie === 'both'));
      return match ? { event: voice[k], note: match } : null;
    }
    return null;
  };
  const here = scan(part.measures[m].voices[v], i + 1);
  if (here) return here;
  const next = part.measures[m + 1];
  if (!next || !next.voices[v]) return null;
  return scan(next.voices[v], 0);
}

function drawSlur(a, b, sp) {
  const sameLine = a.page === b.page && Math.abs(a.y - b.y) < 0.01;
  const up = sp.placement === 'above' || (sp.placement === 'auto' && (a.meta.dir === -1 || a.meta.dir === undefined));
  const dirSign = up ? -1 : 1;
  const span = Math.abs((sameLine ? b.x : a.x + 6) - a.x);
  const bulge = dirSign * Math.min(2.6, 0.85 + span * 0.075);
  const yOf = (an) => {
    const ys = (an.meta.notes || []).map((n) => n.y);
    if (!ys.length) return an.y;
    return up ? Math.min(...ys) - 0.75 : Math.max(...ys) + 0.75;
  };
  const hw = a.meta.headW || 1.18;
  if (sameLine) {
    a.pageObj.items.push(item('curve', {
      d: curvePath(a.x + hw * 0.5, yOf(a), b.x + hw * 0.5, yOf(b), bulge, M.slurThick), cls: 'slur',
    }));
  } else {
    a.pageObj.items.push(item('curve', { d: curvePath(a.x + hw * 0.5, yOf(a), a.x + 6, yOf(a) + bulge * 0.35, bulge * 0.8, M.slurThick), cls: 'slur' }));
    b.pageObj.items.push(item('curve', { d: curvePath(b.x - 5, yOf(b) + bulge * 0.35, b.x + hw * 0.5, yOf(b), bulge * 0.8, M.slurThick), cls: 'slur' }));
  }
}

function drawHairpin(a, b, sp) {
  const sameLine = a.pageObj === b.pageObj && Math.abs(anchorStaffY(a) - anchorStaffY(b)) < 0.01;
  const baseY = anchorStaffY(a) + (a.meta.dynLine ?? M.hairpinY);
  const x1 = a.x - 0.3;
  const x2 = sameLine ? b.x + (b.meta.headW || 1.18) + 0.3 : x1 + 7;
  const h = 0.62;
  const grow = sp.type === 'cresc';
  const push = (pg, ax, bx, yBase) => {
    if (grow) {
      pg.items.push(item('line', { x1: ax, y1: yBase, x2: bx, y2: yBase - h, w: M.hairpinThick, cls: 'hairpin' }));
      pg.items.push(item('line', { x1: ax, y1: yBase, x2: bx, y2: yBase + h, w: M.hairpinThick, cls: 'hairpin' }));
    } else {
      pg.items.push(item('line', { x1: ax, y1: yBase - h, x2: bx, y2: yBase, w: M.hairpinThick, cls: 'hairpin' }));
      pg.items.push(item('line', { x1: ax, y1: yBase + h, x2: bx, y2: yBase, w: M.hairpinThick, cls: 'hairpin' }));
    }
  };
  push(a.pageObj, x1, x2, baseY);
}

function anchorStaffY(a) {
  return a.meta.staffTop || 0;
}

function drawOctave(a, b, sp) {
  const up = sp.type === 'octave-up';
  const y = anchorStaffY(a) + (up ? -3.4 : M.staffHeight + 3.4);
  const label = up ? '8va' : '8vb';
  const x2 = (a.pageObj === b.pageObj) ? b.x + 1.2 : a.x + 8;
  a.pageObj.items.push(item('text', { x: a.x - 0.4, y: y + 0.55, str: label, size: 1.9, anchor: 'start', cls: 'octave', italic: true }));
  a.pageObj.items.push(item('line', { x1: a.x + 2.0, y1: y, x2, y2: y, w: 0.1, cls: 'octave', dash: '0.7 0.5' }));
  a.pageObj.items.push(item('line', { x1: x2, y1: y, x2, y2: y + (up ? 0.75 : -0.75), w: 0.1, cls: 'octave' }));
}

function drawPedal(a, b, sp) {
  const y = anchorStaffY(a) + M.staffHeight + 4.0;
  const x2 = (a.pageObj === b.pageObj) ? b.x + 1.0 : a.x + 8;
  a.pageObj.items.push(item('text', { x: a.x - 0.3, y: y + 0.5, str: 'Ped.', size: 2.0, anchor: 'start', cls: 'pedal', italic: true }));
  a.pageObj.items.push(item('line', { x1: a.x + 2.5, y1: y, x2, y2: y, w: 0.1, cls: 'pedal' }));
  a.pageObj.items.push(item('line', { x1: x2, y1: y, x2, y2: y - 0.8, w: 0.1, cls: 'pedal' }));
}

function drawTextLine(a, b, sp) {
  const y = anchorStaffY(a) - 2.6;
  const x2 = (a.pageObj === b.pageObj) ? b.x + 1.0 : a.x + 8;
  if (sp.label) a.pageObj.items.push(item('text', { x: a.x, y: y - 0.3, str: sp.label, size: 1.9, anchor: 'start', cls: 'textline', italic: true }));
  a.pageObj.items.push(item('line', { x1: a.x, y1: y, x2, y2: y, w: 0.1, cls: 'textline', dash: '0.6 0.4' }));
}
