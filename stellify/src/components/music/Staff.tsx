'use client';
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { GLYPHS, type GlyphName } from '@/lib/music/glyphs';
import type { StaffEvent, Tone } from '@/lib/music/score';
import { dia, fromDia, keySigPositions, midi, parse, show, sigAccidentals, spell, type Pitch, type Satb, type Voice } from '@/lib/music/theory';

/**
 * Engraved music notation drawn as SVG (Bravura glyph outlines, no web fonts), so it works offline,
 * scales crisply, and follows the theme. Accidentals follow real engraving rules: the key signature
 * applies to every octave, an accidental lasts until the bar line, and naturals cancel it.
 */

export const S = 10; // one staff space in SVG units
export type Clef = 'treble' | 'bass' | 'alto';
export type StaffClef = Clef | 'grand';
const TOP: Record<Clef, string> = { treble: 'F5', bass: 'A3', alto: 'G4' };
const CLEF_GLYPH: Record<Clef, { g: GlyphName; at: string }> = { treble: { g: 'gClef', at: 'G4' }, bass: { g: 'fClef', at: 'F3' }, alto: { g: 'cClef', at: 'C4' } };
export { keySigPositions };

const ACC_GLYPH: Record<number, GlyphName> = { [-2]: 'accidentalDoubleFlat', [-1]: 'accidentalFlat', 0: 'accidentalNatural', 1: 'accidentalSharp', 2: 'accidentalDoubleSharp' };
const HEAD: Record<string, GlyphName> = { w: 'noteheadWhole', h: 'noteheadHalf', q: 'noteheadBlack', '8': 'noteheadBlack', '16': 'noteheadBlack' };
const REST: Record<string, GlyphName> = { w: 'restWhole', h: 'restHalf', q: 'restQuarter', '8': 'rest8th', '16': 'rest16th' };
const SPACE: Record<string, number> = { w: 5.2, h: 4.2, q: 3.4, '8': 2.8, '16': 2.5 };

export function Glyph({ name, x, y, scale = 1, className, fill }: { name: GlyphName; x: number; y: number; scale?: number; className?: string; fill?: string }) {
  return <path d={GLYPHS[name].d} transform={`translate(${x} ${y}) scale(${S * scale})`} className={className} fill={fill ?? 'currentColor'} />;
}
const gw = (name: GlyphName, scale = 1) => (GLYPHS[name].x1 - GLYPHS[name].x0) * S * scale;

const TONE: Record<Tone, string> = { ok: 'rgb(var(--ok))', bad: 'rgb(var(--bad))', accent: 'rgb(var(--accent))', given: 'rgb(var(--muted))', muted: 'rgb(var(--faint))' };
export type { StaffEvent, Tone };

export interface Layout { clef: StaffClef; fifths?: number; time?: [number, number] | 'C' | 'cut'; events: StaffEvent[]; slots?: number; minWidth?: number }

/** staff geometry shared by the display and the editors */
export function geometry(clef: StaffClef, fifths: number, time?: Layout['time'], ext?: { top: number; bottom: number; labelAt: number; aboveAt: number }) {
  const padTop = ext?.top ?? 6 * S;
  const staffs: Clef[] = clef === 'grand' ? ['treble', 'bass'] : [clef];
  const gap = 8 * S; // between the bottom line of the treble staff and the top line of the bass staff
  const tops = staffs.map((_, i) => padTop + i * (4 * S + gap));
  const yOf = (p: Pitch | string, staff = 0) => tops[staff] + (dia(TOP[staffs[staff]]) - dia(p)) * (S / 2);
  const pitchAt = (y: number, staff = 0) => fromDia(Math.round(dia(TOP[staffs[staff]]) - (y - tops[staff]) / (S / 2)));
  const left = clef === 'grand' ? 2.2 * S : 0.8 * S;
  const clefX = left + 0.8 * S;
  const sigX = clefX + 3.4 * S;
  const sigW = Math.abs(fifths) * 1.15 * S + (fifths ? 0.6 * S : 0);
  const timeX = sigX + sigW;
  const bodyX = timeX + (time ? 2.6 * S : 0.4 * S) + 1.2 * S;
  const height = tops[tops.length - 1] + 4 * S + (ext?.bottom ?? 7 * S);
  const labelY = tops[tops.length - 1] + 4 * S + (ext?.labelAt ?? 5.2 * S);
  const aboveY = tops[0] - (ext?.aboveAt ?? 2.6 * S);
  return { staffs, tops, yOf, pitchAt, left, clefX, sigX, timeX, bodyX, height, labelY, aboveY };
}

function Lines({ g, width, fifths, time }: { g: ReturnType<typeof geometry>; width: number; fifths: number; time?: Layout['time'] }) {
  return (
    <g>
      {g.staffs.map((c, i) => (
        <g key={i}>
          {[0, 1, 2, 3, 4].map((l) => <line key={l} x1={g.left} x2={width - 0.5} y1={g.tops[i] + l * S} y2={g.tops[i] + l * S} stroke="currentColor" strokeWidth={0.13 * S} />)}
          <Glyph name={CLEF_GLYPH[c].g} x={g.clefX} y={g.yOf(CLEF_GLYPH[c].at, i)} />
          {keySigPositions(fifths, c).map((p, k) => <Glyph key={k} name={fifths > 0 ? 'accidentalSharp' : 'accidentalFlat'} x={g.sigX + k * 1.15 * S} y={g.yOf(p, i)} />)}
          {time && (time === 'C' || time === 'cut'
            ? <Glyph name={time === 'C' ? 'timeSigCommon' : 'timeSigCutCommon'} x={g.timeX} y={g.tops[i] + 2 * S} />
            : [String(time[0]), String(time[1])].map((num, row) => { const digits = num.split(''); const w = digits.reduce((s, d) => s + gw(`timeSig${d}` as GlyphName), 0); let x = g.timeX + (2 * S - w) / 2; return digits.map((d, k) => { const el = <Glyph key={`${row}-${k}`} name={`timeSig${d}` as GlyphName} x={x} y={g.tops[i] + (row ? 3 : 1) * S} />; x += gw(`timeSig${d}` as GlyphName); return el; }); }))}
        </g>
      ))}
      {/* system line, brace and final bar */}
      <line x1={g.left} x2={g.left} y1={g.tops[0]} y2={g.tops[g.tops.length - 1] + 4 * S} stroke="currentColor" strokeWidth={0.16 * S} />
      {g.staffs.length > 1 && <Brace x={g.left - 0.4 * S} y0={g.tops[0]} y1={g.tops[1] + 4 * S} />}
    </g>
  );
}
function Brace({ x, y0, y1 }: { x: number; y0: number; y1: number }) {
  const m = (y0 + y1) / 2, w = 1.4 * S;
  return <path d={`M${x} ${y0} C${x - w} ${y0 + (m - y0) * 0.25} ${x} ${m - (m - y0) * 0.35} ${x - w} ${m} C${x} ${m + (y1 - m) * 0.35} ${x - w} ${y1 - (y1 - m) * 0.25} ${x} ${y1} C${x - w * 0.55} ${y1 - (y1 - m) * 0.25} ${x + w * 0.35} ${m + (y1 - m) * 0.35} ${x - w} ${m} C${x + w * 0.35} ${m - (m - y0) * 0.35} ${x - w * 0.55} ${y0 + (m - y0) * 0.25} ${x} ${y0}Z`} fill="currentColor" />;
}

/** Roman numeral with stacked figured-bass numbers, e.g. "V65/V". */
export function RomanText({ label, x, y, size = 1.55 }: { label: string; x: number; y: number; size?: number }) {
  const m = /^([^\d/]*)(\d*)(\/.*)?$/.exec(label);
  const fs = S * size;
  if (!m) return <text x={x} y={y} fontSize={fs} textAnchor="middle" fill="currentColor">{label}</text>;
  const [, base, figs, sec] = m;
  const stacked = figs.length === 2;
  const pretty = (t: string) => t.replace(/o/g, '°');
  const CW: Record<string, number> = { I: 0.34, i: 0.3, V: 0.7, v: 0.56, '/': 0.4, '°': 0.44, 'ø': 0.62, '+': 0.62, ' ': 0.3 };
  const textW = (t: string) => [...pretty(t)].reduce((w, ch) => w + (CW[ch] ?? 0.64), 0) * fs;
  const baseW = textW(base) + (figs ? fs * 0.06 : 0);
  const figW = figs ? fs * 0.62 : 0;
  const secW = sec ? textW(sec) : 0;
  const x0 = x - (baseW + figW + secW) / 2;
  return (
    <g fill="currentColor" fontFamily="'Sora Variable', Inter, ui-sans-serif, sans-serif" fontWeight={600}>
      <text x={x0} y={y} fontSize={fs}>{pretty(base)}</text>
      {figs && (stacked
        ? <><text x={x0 + baseW + 1} y={y - fs * 0.42} fontSize={fs * 0.62}>{figs[0]}</text><text x={x0 + baseW + 1} y={y + fs * 0.2} fontSize={fs * 0.62}>{figs[1]}</text></>
        : <text x={x0 + baseW + 1} y={y - fs * 0.42} fontSize={fs * 0.62}>{figs}</text>)}
      {sec && <text x={x0 + baseW + figW + 1} y={y} fontSize={fs}>{pretty(sec)}</text>}
    </g>
  );
}

interface Placed { p: Pitch; staff: number; tone?: Tone; voice?: Voice }

/** Draw noteheads (with seconds displaced), ledger lines, accidentals, dots, stems and flags for one chord. */
function NoteGroup({ g, x, notes, dur, dots = 0, accs, stemDir, stemEnd, flagged = true, tone }: {
  g: ReturnType<typeof geometry>; x: number; notes: Placed[]; dur: string; dots?: number; accs: (number | null)[]; stemDir?: 'up' | 'down' | null; stemEnd?: number; flagged?: boolean; tone?: Tone;
}): ReactNode {
  const head = HEAD[dur];
  const hw = gw(head);
  const order = notes.map((n, i) => ({ ...n, i })).sort((a, b) => dia(a.p) - dia(b.p) || a.staff - b.staff);
  // seconds: alternate noteheads to the other side of the stem
  const shift: number[] = new Array(notes.length).fill(0);
  let prev: { d: number; s: number; shifted: boolean } | null = null;
  const up = stemDir !== 'down';
  for (const n of up ? order : [...order].reverse()) {
    const d = dia(n.p);
    if (prev && prev.s === n.staff && Math.abs(d - prev.d) === 1 && !prev.shifted) { shift[n.i] = up ? hw - 0.1 * S : -(hw - 0.1 * S); prev = { d, s: n.staff, shifted: true }; }
    else prev = { d, s: n.staff, shifted: false };
  }
  const els: ReactNode[] = [];
  // ledger lines
  for (const n of notes) {
    const top = g.tops[n.staff], y = g.yOf(n.p, n.staff);
    const xs = x + (shift[notes.indexOf(n)] < 0 ? shift[notes.indexOf(n)] : 0) - 0.4 * S, xe = x + hw + Math.max(0, shift[notes.indexOf(n)]) + 0.4 * S;
    for (let ly = top - S; ly >= y - 0.1; ly -= S) els.push(<line key={`l${n.staff}${ly}${xs}`} x1={xs} x2={xe} y1={ly} y2={ly} stroke="currentColor" strokeWidth={0.16 * S} />);
    for (let ly = top + 5 * S; ly <= y + 0.1; ly += S) els.push(<line key={`l${n.staff}${ly}${xs}`} x1={xs} x2={xe} y1={ly} y2={ly} stroke="currentColor" strokeWidth={0.16 * S} />);
  }
  // accidentals: columns from the notehead outward, a sixth apart in each column
  const cols: number[][] = [];
  const accOrder = order.filter((n) => accs[n.i] !== null).reverse();
  for (const n of accOrder) {
    const y = g.yOf(n.p, n.staff);
    let c = cols.findIndex((col) => col.every((cy) => Math.abs(cy - y) >= 3 * S));
    if (c < 0) { cols.push([]); c = cols.length - 1; }
    cols[c].push(y);
    const gname = ACC_GLYPH[accs[n.i]!];
    const minShift = Math.min(0, ...shift);
    els.push(<Glyph key={`a${n.i}`} name={gname} x={x + minShift - 0.35 * S - gw(gname) - c * 1.25 * S} y={y} fill={TONE[(n.tone ?? tone) as Tone] ?? undefined} />);
  }
  for (const n of order) {
    const y = g.yOf(n.p, n.staff);
    const fill = n.tone ?? tone ? TONE[(n.tone ?? tone)!] : undefined;
    els.push(<Glyph key={`h${n.i}`} name={head} x={x + shift[n.i]} y={y} fill={fill} />);
    for (let k = 0; k < dots; k++) {
      const onLine = Math.round((y - g.tops[n.staff]) / (S / 2)) % 2 === 0;
      els.push(<Glyph key={`d${n.i}${k}`} name="augmentationDot" x={x + hw + Math.max(0, ...shift) + 0.45 * S + k * 0.6 * S} y={onLine ? y - S / 2 : y} fill={fill} />);
    }
  }
  if (stemDir && dur !== 'w') {
    const ys = notes.map((n) => g.yOf(n.p, n.staff));
    const lo = Math.max(...ys), hi = Math.min(...ys);
    const sx = stemDir === 'up' ? x + hw - 0.06 * S : x + 0.06 * S;
    const end = stemEnd ?? (stemDir === 'up' ? hi - 3.5 * S : lo + 3.5 * S);
    const fill = tone ? TONE[tone] : 'currentColor';
    els.push(<line key="stem" x1={sx} x2={sx} y1={stemDir === 'up' ? lo : hi} y2={end} stroke={fill} strokeWidth={0.12 * S} />);
    if (flagged && (dur === '8' || dur === '16')) {
      const f: GlyphName = `flag${dur === '8' ? '8th' : '16th'}${stemDir === 'up' ? 'Up' : 'Down'}` as GlyphName;
      els.push(<Glyph key="flag" name={f} x={sx - 0.06 * S} y={end} fill={fill} />);
    }
  }
  return <g>{els}</g>;
}

/** Plan the horizontal layout and accidentals of a sequence of events. */
/** vertical room a display staff needs: enough for its highest and lowest notes and its text, no more */
function extentsOf(l: Layout) {
  const staffs: Clef[] = l.clef === 'grand' ? ['treble', 'bass'] : [l.clef];
  const topD = dia(TOP[staffs[0]]), botD = dia(TOP[staffs[staffs.length - 1]]) - 8;
  let up = 0, down = 0;
  for (const e of l.events) {
    const ps = e.satb ? Object.values(e.satb).filter((x): x is string => !!x) : e.notes ?? [];
    for (const p of ps) {
      const onTop = l.clef !== 'grand' || (e.satb ? (e.satb.S === p || e.satb.A === p) : midi(p) >= 60);
      const onBottom = l.clef !== 'grand' || !onTop;
      if (onTop) up = Math.max(up, (dia(p) - topD) * (S / 2) + (e.dur && e.dur !== 'w' && dia(p) < topD - 4 ? 3.5 * S - 2 * S : 0));
      if (onBottom) down = Math.max(down, (botD - dia(p)) * (S / 2));
    }
  }
  const above = l.events.some((e) => e.above), label = l.events.some((e) => e.label);
  const aboveAt = Math.max(2.6 * S, up + 1.8 * S);
  const top = Math.max(2.4 * S, up + 1.4 * S, above ? aboveAt + 1.6 * S : 0);
  const labelAt = Math.max(5.2 * S, down + 3.4 * S);
  const bottom = Math.max(2.4 * S, down + 1.4 * S, label ? labelAt + 1.6 * S : 0);
  return { top, bottom, labelAt, aboveAt };
}

function plan(l: Layout, fit = false) {
  const fifths = l.fifths ?? 0;
  const g = geometry(l.clef, fifths, l.time, fit ? extentsOf(l) : undefined);
  const keyAcc = new Map(sigAccidentals(fifths).map((a) => [a[0], a[1] === '#' ? 1 : -1]));
  let measure = new Map<string, number>();
  let x = g.bodyX;
  const out: { e: StaffEvent; x: number; placed: Placed[]; accs: (number | null)[]; barX?: number }[] = [];
  for (const e of l.events) {
    const placed: Placed[] = e.satb
      ? (['S', 'A', 'T', 'B'] as Voice[]).filter((v) => e.satb![v]).map((v) => ({ p: parse(e.satb![v]!), staff: v === 'S' || v === 'A' ? 0 : 1, voice: v, tone: e.noteTones?.[e.satb![v]!] }))
      : (e.notes ?? []).map((n) => ({ p: parse(n), staff: l.clef === 'grand' ? (midi(n) >= 60 ? 0 : 1) : 0, tone: e.noteTones?.[n] }));
    // an accidental is shown when the written note differs from what the key signature / measure implies
    const accs = placed.map((n) => {
      const key = `${n.p.L}-${n.p.oct}`;
      const current = measure.has(key) ? measure.get(key)! : keyAcc.get('CDEFGAB'[n.p.L]) ?? 0;
      if (n.p.acc === current) return null;
      return n.p.acc;
    });
    placed.forEach((n) => measure.set(`${n.p.L}-${n.p.oct}`, n.p.acc));
    const cols = accs.filter((a) => a !== null).length;
    x += cols ? Math.min(cols, 3) * 1.25 * S : 0;
    out.push({ e, x, placed, accs });
    x += SPACE[e.dur ?? 'w'] * S + (e.dots ? 0.8 * S : 0) + (e.label && e.label.length > 3 ? 1.2 * S : 0);
    if (e.bar) { out[out.length - 1].barX = x - 0.6 * S; x += 0.8 * S; measure = new Map(); }
  }
  // fixed slots (editors): evenly spaced columns
  if (l.slots) {
    const step = 6.2 * S;
    out.forEach((o, i) => { o.x = g.bodyX + 1.6 * S + i * step; });
    x = g.bodyX + 1.6 * S + l.slots * step;
  }
  const width = Math.max(l.minWidth ?? 0, x + 1.2 * S);
  return { g, out, width };
}

/** Read-only notation: a staff with clef, key and time signature and a sequence of notes, chords or rests. */
export function Staff({ clef = 'treble', fifths = 0, time, events, label, className, maxWidth, finalBar = true }: Layout & { label: string; className?: string; maxWidth?: number; finalBar?: boolean }) {
  const { g, out, width } = useMemo(() => plan({ clef, fifths, time, events }, true), [clef, fifths, time, events]);
  // a fixed engraving size (about 14 px per staff space) that shrinks to fit narrow screens
  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${width} ${g.height}`} width={width * 1.45} height={g.height * 1.45} className="mx-auto block h-auto text-ink" style={{ maxWidth: maxWidth ? `min(100%, ${maxWidth}px)` : '100%' }} role="img" aria-label={label}>
        <Lines g={g} width={width} fifths={fifths} time={time} />
        {finalBar && <><line x1={width - 1.1 * S} x2={width - 1.1 * S} y1={g.tops[0]} y2={g.tops[g.tops.length - 1] + 4 * S} stroke="currentColor" strokeWidth={0.13 * S} /><line x1={width - 0.45 * S} x2={width - 0.45 * S} y1={g.tops[0]} y2={g.tops[g.tops.length - 1] + 4 * S} stroke="currentColor" strokeWidth={0.5 * S} /></>}
        <Events g={g} out={out} clef={clef} />
      </svg>
    </figure>
  );
}

function Events({ g, out, clef }: { g: ReturnType<typeof geometry>; out: ReturnType<typeof plan>['out']; clef: StaffClef }) {
  const els: ReactNode[] = [];
  // beam groups
  const groups: number[][] = [];
  let cur: number[] = [];
  out.forEach((o, i) => { const short = o.e.dur === '8' || o.e.dur === '16'; if (short && !o.e.rest && (o.e.beam || cur.length)) { cur.push(i); if (!o.e.beam) { groups.push(cur); cur = []; } } else if (cur.length) { groups.push(cur); cur = []; } });
  if (cur.length) groups.push(cur);
  const beamed = new Map<number, { dir: 'up' | 'down'; end: number }>();
  for (const grp of groups) {
    if (grp.length < 2) continue;
    const ys = grp.flatMap((i) => out[i].placed.map((n) => g.yOf(n.p, n.staff)));
    const mid = g.tops[0] + 2 * S;
    const avg = ys.reduce((a, b) => a + b, 0) / ys.length;
    const dir = out[grp[0]].e.stem ?? (avg > mid ? 'up' : 'down');
    const end = dir === 'up' ? Math.min(...ys) - 3.5 * S : Math.max(...ys) + 3.5 * S;
    grp.forEach((i) => beamed.set(i, { dir, end }));
    const hw = gw('noteheadBlack');
    const x1 = out[grp[0]].x + (dir === 'up' ? hw - 0.06 * S : 0.06 * S) - 0.06 * S, x2 = out[grp[grp.length - 1]].x + (dir === 'up' ? hw - 0.06 * S : 0.06 * S) + 0.06 * S;
    const t = 0.5 * S, sgn = dir === 'up' ? 1 : -1;
    els.push(<path key={`beam${grp[0]}`} d={`M${x1} ${end} L${x2} ${end} L${x2} ${end + sgn * t} L${x1} ${end + sgn * t}Z`} fill="currentColor" />);
    // a second beam joins neighbouring sixteenths
    grp.forEach((i, k) => {
      if (out[i].e.dur !== '16') return;
      const j = grp[k + 1];
      const xa = out[i].x + (dir === 'up' ? hw - 0.12 * S : 0);
      if (j !== undefined && out[j].e.dur === '16') { const xb = out[j].x + (dir === 'up' ? hw : 0.12 * S); els.push(<path key={`b2${i}`} d={`M${xa} ${end + sgn * 0.8 * S} L${xb} ${end + sgn * 0.8 * S} L${xb} ${end + sgn * 1.3 * S} L${xa} ${end + sgn * 1.3 * S}Z`} fill="currentColor" />); }
      else if (k > 0 && out[grp[k - 1]].e.dur !== '16') els.push(<path key={`b2${i}`} d={`M${xa - 1.1 * S} ${end + sgn * 0.8 * S} L${xa + 0.12 * S} ${end + sgn * 0.8 * S} L${xa + 0.12 * S} ${end + sgn * 1.3 * S} L${xa - 1.1 * S} ${end + sgn * 1.3 * S}Z`} fill="currentColor" />);
    });
  }
  out.forEach((o, i) => {
    const e = o.e, dur = e.dur ?? 'w';
    if (e.rest) {
      for (let s = 0; s < g.tops.length; s++) els.push(<Glyph key={`r${i}${s}`} name={REST[dur]} x={o.x} y={g.tops[s] + (dur === 'w' ? 1 : 2) * S} fill={e.tone ? TONE[e.tone] : undefined} />);
      if (e.dots) els.push(<Glyph key={`rd${i}`} name="augmentationDot" x={o.x + gw(REST[dur]) + 0.4 * S} y={g.tops[0] + 1.5 * S} />);
    } else if (e.satb) {
      const byVoice = (v: Voice) => o.placed.filter((n) => n.voice === v);
      (['S', 'A', 'T', 'B'] as Voice[]).forEach((v) => {
        const ns = byVoice(v); if (!ns.length) return;
        const idx = o.placed.indexOf(ns[0]);
        // when two voices share a staff, a unison or second is drawn side by side
        const other = byVoice(v === 'S' ? 'A' : v === 'A' ? 'S' : v === 'T' ? 'B' : 'T')[0];
        const close = other && Math.abs(dia(other.p) - dia(ns[0].p)) <= 1 && (v === 'A' || v === 'B');
        els.push(<g key={`v${i}${v}`}><NoteGroup g={g} x={o.x + (close ? gw(HEAD[dur]) : 0)} notes={ns} dur={dur} dots={e.dots} accs={[o.accs[idx]]} stemDir={v === 'S' || v === 'T' ? 'up' : 'down'} tone={ns[0].tone ?? e.tone} /></g>);
      });
    } else if (o.placed.length) {
      const b = beamed.get(i);
      const ys = o.placed.map((n) => g.yOf(n.p, n.staff));
      const mid = g.tops[o.placed[0].staff] + 2 * S;
      const far = ys.reduce((a, y) => (Math.abs(y - mid) > Math.abs(a - mid) ? y : a), ys[0]);
      const dir = b?.dir ?? e.stem ?? (far >= mid ? 'up' : 'down');
      els.push(<g key={`n${i}`}><NoteGroup g={g} x={o.x} notes={o.placed} dur={dur} dots={e.dots} accs={o.accs} stemDir={dir} stemEnd={b?.end} flagged={!b} tone={e.tone} /></g>);
    }
    const labelY = g.labelY;
    if (e.label) els.push(<g key={`lab${i}`} className={e.tone === 'bad' ? 'text-bad' : undefined}><RomanText label={e.label} x={o.x + gw(HEAD[dur]) / 2} y={labelY} /></g>);
    if (e.above) els.push(<text key={`ab${i}`} x={o.x + gw(HEAD[dur]) / 2} y={g.aboveY} fontSize={S * 1.3} textAnchor="middle" fill="currentColor" fontWeight={600}>{e.above}</text>);
    if (o.barX) els.push(<line key={`bar${i}`} x1={o.barX} x2={o.barX} y1={g.tops[0]} y2={g.tops[g.tops.length - 1] + 4 * S} stroke="currentColor" strokeWidth={0.13 * S} />);
  });
  void clef;
  return <g>{els}</g>;
}

/* ─────────────────────────── editors ─────────────────────────── */

export const ACC_TOOLS: { acc: number; label: string; key: string; glyph: GlyphName }[] = [
  { acc: -2, label: 'Double flat', key: 'd', glyph: 'accidentalDoubleFlat' },
  { acc: -1, label: 'Flat', key: 'f', glyph: 'accidentalFlat' },
  { acc: 0, label: 'Natural (no accidental)', key: 'n', glyph: 'accidentalNatural' },
  { acc: 1, label: 'Sharp', key: 's', glyph: 'accidentalSharp' },
  { acc: 2, label: 'Double sharp', key: 'x', glyph: 'accidentalDoubleSharp' },
];

export function AccidentalBar({ value, onChange, tools = [-2, -1, 0, 1, 2], disabled }: { value: number; onChange: (a: number) => void; tools?: number[]; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Accidental for the next note">
      {ACC_TOOLS.filter((t) => tools.includes(t.acc)).map((t) => (
        <button key={t.acc} type="button" role="radio" aria-checked={value === t.acc} disabled={disabled} onClick={() => onChange(t.acc)} title={`${t.label} (key ${t.key.toUpperCase()})`} aria-label={t.label}
          className={`grid h-10 w-11 place-items-center rounded-xl border text-ink transition-colors ${value === t.acc ? 'border-accent bg-accent/15' : 'border-line bg-surface hover:border-accent/50'}`}>
          <svg viewBox="-1 -22 22 30" width="22" height="30" aria-hidden><Glyph name={t.glyph} x={(20 - gw(t.glyph)) / 2} y={0} /></svg>
        </button>
      ))}
    </div>
  );
}

export interface PadProps {
  clef: Clef;
  /** chord: one column of stacked notes; line: one note per slot; keysig: accidentals only */
  mode: 'chord' | 'line' | 'keysig';
  value: string[];
  onChange: (v: string[]) => void;
  slots?: number;
  /** notes that are part of the question and cannot be changed (chord mode) */
  given?: string[];
  fifths?: number;
  disabled?: boolean;
  tones?: Record<string, Tone>;
  label: string;
  /** keysig mode: which accidental is written */
  sigAcc?: 1 | -1;
  maxNotes?: number;
}

/**
 * A staff you write on: click (or use the arrow keys and Enter) to place notes. Accidentals come from
 * the accidental bar (or keys S, F, N, X, D). Clicking a note again removes it.
 */
export function StaffPad({ clef, mode, value, onChange, slots = mode === 'chord' ? 1 : 8, given = [], fifths = 0, disabled, tones, label, sigAcc = 1, maxNotes = 7 }: PadProps) {
  const [acc, setAcc] = useState(mode === 'keysig' ? sigAcc : 0);
  const [hover, setHover] = useState<{ d: number; slot: number } | null>(null);
  const [cursor, setCursor] = useState<{ d: number; slot: number }>(() => ({ d: dia(clef === 'bass' ? 'D3' : clef === 'alto' ? 'C4' : 'B4'), slot: 0 }));
  const [focused, setFocused] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const id = useId();
  const g = geometry(clef, mode === 'keysig' ? 0 : fifths);
  const topD = dia(TOP[clef]);
  const minD = topD - 8 - 6, maxD = topD + 6;
  const step = mode === 'keysig' ? 1.5 * S : 6.2 * S;
  const x0 = mode === 'keysig' ? g.sigX + 0.6 * S : g.bodyX + 2.4 * S;
  const width = mode === 'chord' ? x0 + 9 * S : x0 + slots * step + 1.2 * S;
  const slotX = (i: number) => (mode === 'chord' ? x0 + 1.6 * S : x0 + i * step);

  const put = (d: number, slot: number) => {
    if (disabled) return;
    const p = spell({ ...fromDia(d), acc: mode === 'keysig' ? sigAcc : acc });
    if (mode === 'chord') {
      const at = value.findIndex((v) => dia(v) === d);
      if (given.some((v) => dia(v) === d)) return;
      if (at >= 0) onChange(value[at] === p ? value.filter((_, k) => k !== at) : value.map((v, k) => (k === at ? p : v)));
      else if (value.length + given.length < maxNotes) onChange([...value, p]);
    } else {
      const next = [...value];
      while (next.length < slot) next.push('');
      next[slot] = next[slot] === p ? '' : p;
      while (next.length && !next[next.length - 1]) next.pop();
      onChange(next);
    }
  };
  const locate = (ev: React.MouseEvent) => {
    const svg = svgRef.current; if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM(); if (!m) return null;
    const q = pt.matrixTransform(m.inverse());
    const d = Math.max(minD, Math.min(maxD, Math.round(topD - (q.y - g.tops[0]) / (S / 2))));
    const slot = mode === 'chord' ? 0 : Math.max(0, Math.min(slots - 1, Math.round((q.x - x0 - (mode === 'keysig' ? 0 : 0.8 * S)) / step)));
    return { d, slot };
  };
  const onKey = (e: KeyboardEvent) => {
    if (disabled) return;
    const tool = ACC_TOOLS.find((t) => t.key === e.key.toLowerCase());
    if (tool && mode !== 'keysig') { setAcc(tool.acc); e.preventDefault(); return; }
    if (e.key === 'ArrowUp') setCursor((c) => ({ ...c, d: Math.min(maxD, c.d + 1) }));
    else if (e.key === 'ArrowDown') setCursor((c) => ({ ...c, d: Math.max(minD, c.d - 1) }));
    else if (e.key === 'ArrowRight' && mode !== 'chord') setCursor((c) => ({ ...c, slot: Math.min(slots - 1, c.slot + 1) }));
    else if (e.key === 'ArrowLeft' && mode !== 'chord') setCursor((c) => ({ ...c, slot: Math.max(0, c.slot - 1) }));
    else if (e.key === 'Enter' || e.key === ' ') put(cursor.d, cursor.slot);
    else if ((e.key === 'Backspace' || e.key === 'Delete') && value.length) { onChange(value.slice(0, -1)); }
    else return;
    e.preventDefault();
  };
  const ghost = focused ? cursor : hover;
  const notesNow = mode === 'chord' ? [...given, ...value] : value;
  const accsFor = (p: string) => { const q = parse(p); const keyAcc = sigAccidentals(fifths).find((a) => a[0] === 'CDEFGAB'[q.L]); const cur = keyAcc ? (keyAcc[1] === '#' ? 1 : -1) : 0; return q.acc === cur ? null : q.acc; };
  const placedChord: Placed[] = notesNow.filter(Boolean).map((p) => ({ p: parse(p), staff: 0, tone: given.includes(p) ? 'given' : tones?.[p] }));
  return (
    <div className="space-y-2">
      {mode !== 'keysig' && <AccidentalBar value={acc} onChange={setAcc} disabled={disabled} />}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-2">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${g.height}`} width={width * 1.7} height={g.height * 1.7} className="mx-auto block h-auto touch-manipulation text-ink outline-none" style={{ maxWidth: '100%', cursor: disabled ? 'default' : 'pointer' }}
          role="application" aria-roledescription="staff editor" aria-label={`${label}. Use the up and down arrow keys to choose a line or space${mode !== 'chord' ? ', left and right to choose a slot' : ''}, then Enter to place or remove a note.${mode !== 'keysig' ? ' Keys S, F, N, X and D choose sharp, flat, natural, double sharp and double flat.' : ''}`}
          tabIndex={disabled ? -1 : 0} aria-describedby={`${id}-read`} onKeyDown={onKey} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onMouseMove={(e) => setHover(locate(e))} onMouseLeave={() => setHover(null)} onClick={(e) => { const l = locate(e); if (l) { setCursor(l); put(l.d, l.slot); } }} data-testid="staff-pad">
          <Lines g={g} width={width} fifths={mode === 'keysig' ? 0 : fifths} />
          {mode === 'chord' && placedChord.length > 0 && <NoteGroup g={g} x={slotX(0)} notes={placedChord} dur="w" accs={placedChord.map((n) => accsFor(spell(n.p)))} />}
          {mode === 'line' && value.map((p, i) => p && <NoteGroup key={i} g={g} x={slotX(i)} notes={[{ p: parse(p), staff: 0, tone: tones?.[p] ?? tones?.[`${i}`] }]} dur="w" accs={[accsFor(p)]} />)}
          {mode === 'keysig' && value.map((p, i) => p && <Glyph key={i} name={parse(p).acc > 0 ? 'accidentalSharp' : 'accidentalFlat'} x={slotX(i)} y={g.yOf(p)} fill={tones?.[`${i}`] ? TONE[tones[`${i}`]] : undefined} />)}
          {!disabled && ghost && (() => {
            const p: Pitch = { ...fromDia(ghost.d), acc: mode === 'keysig' ? sigAcc : acc };
            const x = slotX(ghost.slot);
            const y = g.yOf(p);
            return (
              <g opacity={0.45} className="text-accent" pointerEvents="none">
                {mode === 'keysig' ? <Glyph name={sigAcc > 0 ? 'accidentalSharp' : 'accidentalFlat'} x={x} y={y} /> : <>
                  {y < g.tops[0] - 0.1 && Array.from({ length: Math.floor((g.tops[0] - y + 0.1) / S) }, (_, k) => <line key={k} x1={x - 0.4 * S} x2={x + gw('noteheadWhole') + 0.4 * S} y1={g.tops[0] - (k + 1) * S} y2={g.tops[0] - (k + 1) * S} stroke="currentColor" strokeWidth={0.16 * S} />)}
                  {y > g.tops[0] + 4 * S + 0.1 && Array.from({ length: Math.floor((y - g.tops[0] - 4 * S + 0.1) / S) }, (_, k) => <line key={k} x1={x - 0.4 * S} x2={x + gw('noteheadWhole') + 0.4 * S} y1={g.tops[0] + (5 + k) * S} y2={g.tops[0] + (5 + k) * S} stroke="currentColor" strokeWidth={0.16 * S} />)}
                  <Glyph name="noteheadWhole" x={x} y={y} />
                  {acc !== 0 && <Glyph name={ACC_GLYPH[acc]} x={x - 0.35 * S - gw(ACC_GLYPH[acc])} y={y} />}
                </>}
                {focused && mode !== 'chord' && <rect x={x - 1.8 * S} y={g.tops[0] - 5 * S} width={step - 0.4 * S} height={14 * S} rx={S} fill="currentColor" opacity={0.12} />}
              </g>
            );
          })()}
        </svg>
      </div>
      <p id={`${id}-read`} className="text-sm text-muted" aria-live="polite" data-testid="staff-readout">
        {mode === 'keysig' ? (value.filter(Boolean).length ? `Written: ${value.filter(Boolean).map((p) => show(p)).join(', ')}` : 'Nothing written yet.') : notesNow.filter(Boolean).length ? `Your notes: ${(mode === 'chord' ? [...notesNow].sort((a, b) => midi(a) - midi(b) || dia(a) - dia(b)) : notesNow).map((p) => (p ? show(p) : '—')).join(', ')}` : 'No notes yet. Click the staff to write one.'}
      </p>
    </div>
  );
}

/**
 * Four-part writing on a grand staff: choose a voice, then click in a chord's column. Soprano and alto
 * are written on the treble staff, tenor and bass on the bass staff.
 */
export function SatbPad({ value, onChange, romans, fifths, given = [], disabled, flagged = [], label, time }: {
  value: Satb[]; onChange: (v: Satb[]) => void; romans: string[]; fifths: number; given?: Satb[]; disabled?: boolean; flagged?: number[]; label: string; time?: Layout['time'];
}) {
  const [voice, setVoice] = useState<Voice>('S');
  const [acc, setAcc] = useState(0);
  const [hover, setHover] = useState<{ d: number; slot: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const n = romans.length;
  const g = geometry('grand', fifths, time);
  const step = 7 * S;
  const x0 = g.bodyX + 2 * S;
  const width = x0 + n * step + 1.2 * S;
  const staffOf = (v: Voice) => (v === 'S' || v === 'A' ? 0 : 1);
  const keyAcc = (L: number) => { const a = sigAccidentals(fifths).find((s) => s[0] === 'CDEFGAB'[L]); return a ? (a[1] === '#' ? 1 : -1) : 0; };
  const merged = romans.map((_, i) => ({ ...(given[i] ?? {}), ...(value[i] ?? {}) }));
  const put = (d: number, slot: number) => {
    if (disabled || given[slot]?.[voice]) return;
    const base = fromDia(d);
    // with a key signature, "natural" on the bar means "as the key signature says"
    const a = acc === 0 ? keyAcc(base.L) : acc;
    const p = spell({ ...base, acc: a });
    const next = romans.map((_, i) => ({ ...(value[i] ?? {}) }));
    next[slot][voice] = next[slot][voice] === p ? undefined : p;
    if (!next[slot][voice]) delete next[slot][voice];
    onChange(next);
  };
  const locate = (ev: React.MouseEvent) => {
    const svg = svgRef.current; if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM(); if (!m) return null;
    const q = pt.matrixTransform(m.inverse());
    const s = staffOf(voice);
    const top = dia(s ? 'A3' : 'F5');
    const d = Math.max(top - 16, Math.min(top + 6, Math.round(top - (q.y - g.tops[s]) / (S / 2))));
    const slot = Math.max(0, Math.min(n - 1, Math.round((q.x - x0) / step)));
    return { d, slot };
  };
  const [cursor, setCursor] = useState({ d: dia('E5'), slot: 0 });
  const onKey = (e: KeyboardEvent) => {
    if (disabled) return;
    const tool = ACC_TOOLS.find((t) => t.key === e.key.toLowerCase());
    if (tool) { setAcc(tool.acc); e.preventDefault(); return; }
    const vk = ({ '1': 'S', '2': 'A', '3': 'T', '4': 'B' } as Record<string, Voice>)[e.key];
    if (vk) { setVoice(vk); setCursor((c) => ({ ...c, d: dia(vk === 'S' ? 'E5' : vk === 'A' ? 'G4' : vk === 'T' ? 'C4' : 'C3') })); e.preventDefault(); return; }
    if (e.key === 'ArrowUp') setCursor((c) => ({ ...c, d: c.d + 1 }));
    else if (e.key === 'ArrowDown') setCursor((c) => ({ ...c, d: c.d - 1 }));
    else if (e.key === 'ArrowRight') setCursor((c) => ({ ...c, slot: Math.min(n - 1, c.slot + 1) }));
    else if (e.key === 'ArrowLeft') setCursor((c) => ({ ...c, slot: Math.max(0, c.slot - 1) }));
    else if (e.key === 'Enter' || e.key === ' ') put(cursor.d, cursor.slot);
    else return;
    e.preventDefault();
  };
  const [focused, setFocused] = useState(false);
  const ghost = focused ? cursor : hover;
  const events: StaffEvent[] = merged.map((c, i) => ({ satb: c, dur: 'h', label: romans[i], tone: flagged.includes(i) ? 'bad' : undefined, noteTones: Object.fromEntries((['S', 'A', 'T', 'B'] as Voice[]).filter((v) => given[i]?.[v]).map((v) => [given[i]![v]!, 'given' as Tone])) }));
  const { out } = plan({ clef: 'grand', fifths, events, slots: n, time });
  out.forEach((o, i) => { o.x = x0 + i * step; });
  const VOICE_LABEL: Record<Voice, string> = { S: 'Soprano', A: 'Alto', T: 'Tenor', B: 'Bass' };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Voice to write">
          {(['S', 'A', 'T', 'B'] as Voice[]).map((v, k) => <button key={v} type="button" role="radio" aria-checked={voice === v} disabled={disabled} onClick={() => setVoice(v)} title={`${VOICE_LABEL[v]} (key ${k + 1})`} className={`rounded-xl border px-3 py-2 text-sm font-bold ${voice === v ? 'border-accent bg-accent/15 text-ink' : 'border-line bg-surface text-muted hover:border-accent/50'}`} data-testid={`voice-${v}`}>{VOICE_LABEL[v]}</button>)}
        </div>
        <AccidentalBar value={acc} onChange={setAcc} disabled={disabled} tools={[-1, 0, 1]} />
      </div>
      <p className="text-xs text-muted">{fifths ? 'The key signature applies automatically: choose ♮ for a note as the key says, or ♯ / ♭ to raise or lower it.' : 'Choose ♯ or ♭ before clicking for an altered note.'} Stems up: soprano and tenor; stems down: alto and bass.</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-2">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${g.height}`} width={width * 1.4} height={g.height * 1.4} className="mx-auto block h-auto text-ink outline-none" style={{ maxWidth: '100%', cursor: disabled ? 'default' : 'pointer' }}
          role="application" aria-roledescription="four-part writing editor" aria-label={`${label}. Keys 1 to 4 choose soprano, alto, tenor or bass; arrows move; Enter places or removes a note.`}
          tabIndex={disabled ? -1 : 0} onKeyDown={onKey} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onMouseMove={(e) => setHover(locate(e))} onMouseLeave={() => setHover(null)} onClick={(e) => { const l = locate(e); if (l) { setCursor(l); put(l.d, l.slot); } }} data-testid="satb-pad">
          <Lines g={g} width={width} fifths={fifths} time={time} />
          {flagged.map((i) => <rect key={i} x={x0 + i * step - 1.8 * S} y={g.tops[0] - 4 * S} width={step - 1.2 * S} height={g.tops[1] + 9 * S - g.tops[0]} rx={S} fill="rgb(var(--bad))" opacity={0.08} />)}
          <Events g={g} out={out} clef="grand" />
          {!disabled && ghost && (() => {
            const s = staffOf(voice);
            const p: Pitch = { ...fromDia(ghost.d), acc: 0 };
            return <g opacity={0.45} className="text-accent" pointerEvents="none"><Glyph name="noteheadHalf" x={x0 + ghost.slot * step + (voice === 'A' || voice === 'B' ? 0 : 0)} y={g.yOf(p, s)} />{focused && <rect x={x0 + ghost.slot * step - 1.8 * S} y={g.tops[0] - 4 * S} width={step - 1.2 * S} height={g.tops[1] + 9 * S - g.tops[0]} rx={S} fill="currentColor" opacity={0.12} />}</g>;
          })()}
        </svg>
      </div>
      <p className="text-sm text-muted" aria-live="polite" data-testid="satb-readout">{merged.map((c, i) => `${i + 1}. ${romans[i]}: ${(['S', 'A', 'T', 'B'] as Voice[]).map((v) => `${v} ${c[v] ? show(c[v]!) : '—'}`).join(', ')}`).join(' · ')}</p>
    </div>
  );
}
