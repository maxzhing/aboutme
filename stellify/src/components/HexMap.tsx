'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Section, SkillId } from '@/lib/types';
import { DIRS, hexCenter, neighbourFor, pathOf, PATH, type PathSkill } from '@/lib/path/skills';
import type { HexState } from '@/lib/path/next';
import { cn } from './ui';

export interface HexInfo { state: HexState; stars: number; due: number; recommended: boolean; /** 0 = recommended next, 1–2 = the steps after it (they stand less tall) */ rank?: number }
/** How far each ranked hex rises out of the map, in SVG units: taller means sooner. */
export const LIFT = [16, 8, 4];
const SIZE = 50;
const BASE = 6;
const MARK = 24; // room above the map for the raised hex and its marker

/** A pointy-top hexagon with softly rounded corners, as an SVG path. `rc` is the corner radius. */
export function roundHex(cx: number, cy: number, r: number, rc = r * 0.2) {
  const v = [0, 1, 2, 3, 4, 5].map((i) => { const a = (Math.PI / 180) * (60 * i - 30); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const t = rc / r; // side length equals the circumradius for a regular hexagon
  const at = (a: number[], b: number[], k: number) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const f = (p: number[]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  let d = `M${f(at(v[0], v[1], t))}`;
  for (let i = 0; i < 6; i++) {
    const a = v[(i + 1) % 6], prev = v[i], next = v[(i + 2) % 6];
    d += ` L${f(at(a, prev, t))} Q${f(a)} ${f(at(a, next, t))}`;
  }
  return `${d} Z`;
}
const STAR = 'M0-10 2.9-3.1 10-3.1 4.3 1.2 6.5 8.1 0 3.8-6.5 8.1-4.3 1.2-10-3.1-2.9-3.1Z';
export { STAR as STAR_PATH };

/** The words a screen reader hears for a hex (and the tooltip). */
export function hexLabel(s: PathSkill, h: HexInfo) {
  const state = { 'not-started': 'not started', 'in-progress': 'in progress', proficient: 'proficient', mastered: 'mastered' }[h.state];
  return `${s.title}, ${h.stars} of 3 stars, ${state}${h.due ? `, ${h.due} review${h.due === 1 ? '' : 's'} due` : ''}${h.recommended ? ', recommended next' : ''}`;
}

function Hex({ s, h, cx, cy, selected, tabIndex, onPick, onKey, refFn }: { s: PathSkill; h: HexInfo; cx: number; cy: number; selected: boolean; tabIndex: number; onPick: () => void; onKey: (e: KeyboardEvent<SVGGElement>) => void; refFn: (el: SVGGElement | null) => void }) {
  const r = SIZE - 2;
  const ls = s.label.split('|');
  return (
    <g ref={refFn} role="button" tabIndex={tabIndex} aria-label={hexLabel(s, h)} aria-pressed={selected} data-testid={`hex-${s.id}`} data-state={h.state} data-recommended={h.recommended || undefined} data-rank={h.rank}
      className={cn('hex', `dom-${s.domain}`, `hex-${h.state}`, h.recommended && 'hex-rec', h.rank !== undefined && 'hex-lifted', selected && 'hex-selected')} onClick={onPick} onKeyDown={onKey}
      style={{ ['--lift' as string]: `${h.rank !== undefined ? LIFT[h.rank] : 0}px` }}>
      <title>{hexLabel(s, h)}</title>
      <path className="hex-under" d={roundHex(cx, cy + BASE, r)} />
      <path className="hex-base" d={roundHex(cx, cy + BASE, r)} />
      <g className="hex-face"><g className="hex-press">
        <path className="hex-under" d={roundHex(cx, cy, r)} />
        <path className="hex-top" d={roundHex(cx, cy, r)} />
        <text className="hex-text" x={cx} y={cy - (ls.length > 1 ? 13 : 6)} textAnchor="middle">{ls.map((l, i) => <tspan key={i} x={cx} dy={i ? 13 : 0}>{l}</tspan>)}</text>
        <g className="hex-stars" aria-hidden>{[0, 1, 2].map((i) => <path key={i} d={STAR} transform={`translate(${cx - 13 + i * 13},${cy + 19}) scale(.5)`} className={i < h.stars ? 'on' : 'off'} />)}</g>
        {h.due > 0 && <circle className="hex-due" cx={cx + 26} cy={cy - 26} r={5} aria-hidden />}
        {h.recommended && (
          <g className="hex-marker" aria-hidden transform={`translate(${cx},${cy - r - 9})`}>
            <circle r={12} />
            <path className="hex-marker-arrow" d="M0 -6 V5 M-4.5 0.5 L0 5.5 L4.5 0.5" />
          </g>
        )}
      </g></g>
    </g>
  );
}

export function HexMap({ section, info, selected, onSelect }: { section: Section; info: Record<string, HexInfo>; selected?: SkillId; onSelect: (s: SkillId) => void }) {
  const skills = pathOf(section);
  const rec = skills.find((s) => info[s.id]?.recommended)?.id;
  const [focusId, setFocusId] = useState<SkillId>(selected ?? rec ?? skills[0].id);
  const refs = useRef<Record<string, SVGGElement | null>>({});
  useEffect(() => { if (selected) setFocusId(selected); }, [selected]);
  const pts = skills.map((s) => ({ s, ...hexCenter(s.hex, SIZE) }));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const pad = SIZE + 8;
  const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad - MARK, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad + BASE + MARK];
  const drawOrder = [...pts].sort((a, b) => (info[b.s.id]?.rank ?? 9) - (info[a.s.id]?.rank ?? 9) || a.y - b.y);
  const move = (from: PathSkill, e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(from.id); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const to = neighbourFor(from, e.key as 'ArrowLeft');
    if (to) { setFocusId(to.id); refs.current[to.id]?.focus(); }
  };
  // faint constellation lines between neighbouring skills that both have ★2 or more
  const lit = (id: SkillId) => (info[id]?.stars ?? 0) >= 2;
  const edges: [PathSkill, PathSkill][] = [];
  for (const s of skills) for (const [dq, dr] of DIRS) {
    const n = skills.find((x) => x.hex.q === s.hex.q + dq && x.hex.r === s.hex.r + dr);
    if (n && s.id < n.id && lit(s.id) && lit(n.id)) edges.push([s, n]);
  }
  return (
    <svg viewBox={vb.join(' ')} className="hexmap mx-auto block h-auto w-full max-w-[640px]" role="group" aria-label={`${section === 'math' ? 'Math' : 'Reading and Writing'} skills map. Use the arrow keys to move between neighbouring skills, Enter to open one.`} data-testid="hexmap">
      {drawOrder.map(({ s, x, y }) => <Hex key={s.id} s={s} h={info[s.id]} cx={x} cy={y} selected={selected === s.id} tabIndex={focusId === s.id ? 0 : -1}
        onPick={() => { setFocusId(s.id); onSelect(s.id); }} onKey={(e) => move(s, e)} refFn={(el) => { refs.current[s.id] = el; }} />)}
      <g aria-hidden className="hex-constellation">{edges.map(([a, b]) => { const A = hexCenter(a.hex, SIZE), B = hexCenter(b.hex, SIZE); const t0 = 0.43, t1 = 0.57; return <line key={a.id + b.id} x1={A.x + (B.x - A.x) * t0} y1={A.y + (B.y - A.y) * t0} x2={A.x + (B.x - A.x) * t1} y2={A.y + (B.y - A.y) * t1} />; })}</g>
    </svg>
  );
}

/** Phones: the same hexes as a vertical zigzag in route order. */
export function HexZigzag({ section, info, selected, onSelect }: { section: Section; info: Record<string, HexInfo>; selected?: SkillId; onSelect: (s: SkillId) => void }) {
  const skills = [...pathOf(section)].sort((a, b) => a.order - b.order);
  return (
    <ol className="hexzig relative mx-auto max-w-[360px]" aria-label={`${section === 'math' ? 'Math' : 'Reading and Writing'} skills in route order`} data-testid="hexzig">
      {skills.map((s, i) => {
        const h = info[s.id];
        return (
          <li key={s.id} className={cn('flex items-center gap-3', i % 2 ? 'flex-row-reverse text-right' : '')}>
            <button type="button" onClick={() => onSelect(s.id)} aria-label={hexLabel(s, h)} aria-pressed={selected === s.id} className={cn('hex-btn shrink-0', `dom-${s.domain}`, `hex-${h.state}`, h.recommended && 'hex-rec', h.rank !== undefined && 'hex-lifted')} data-testid={`zig-${s.id}`}
              style={{ ['--lift' as string]: `${h.rank !== undefined ? LIFT[h.rank] / 2 : 0}px` }}>
              <svg viewBox="-30 -40 60 76" width="64" height="81" aria-hidden className="block overflow-visible">
                <path className="hex-under" d={roundHex(0, BASE, 27)} /><path className="hex-base" d={roundHex(0, BASE, 27)} />
                <g className="hex-face"><g className="hex-press"><path className="hex-under" d={roundHex(0, 0, 27)} /><path className="hex-top" d={roundHex(0, 0, 27)} />
                  <g className="hex-stars">{[0, 1, 2].map((k) => <path key={k} d={STAR} transform={`translate(${-11 + k * 11},4) scale(.45)`} className={k < h.stars ? 'on' : 'off'} />)}</g>
                  {h.due > 0 && <circle className="hex-due" cx={15} cy={-15} r={4} />}
                </g></g>
              </svg>
            </button>
            <span className="min-w-0 py-2"><span className="block font-medium leading-tight">{PATH[s.id].title}</span><span className="block text-[13px] text-muted">{h.stars} of 3 stars{h.recommended ? ' · next' : ''}{h.due ? ` · ${h.due} due` : ''}</span></span>
          </li>
        );
      })}
    </ol>
  );
}

/** A small row of SVG stars with the count spoken. */
export function Stars({ n, size = 14, className }: { n: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => <svg key={i} width={size} height={size} viewBox="-11 -11 22 22" aria-hidden><path d={STAR} strokeWidth="1.6" strokeLinejoin="round" style={i < n ? { fill: 'rgb(var(--star))', stroke: 'rgb(var(--star-edge))' } : { fill: 'none', stroke: 'rgb(var(--faint))' }} /></svg>)}
    </span>
  );
}
