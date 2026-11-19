'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Section, SkillId } from '@/lib/types';
import { pathOf, type PathSkill } from '@/lib/path/skills';
import type { HexState } from '@/lib/path/next';
import { DOMAIN } from '@/lib/taxonomy';
import { cn } from './ui';

export interface HexInfo { state: HexState; stars: number; due: number; recommended: boolean; /** 0 = recommended next */ rank?: number }

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

/** The words a screen reader hears for a step (and its tooltip). */
export function hexLabel(s: PathSkill, h: HexInfo, n: number, total: number) {
  const state = { 'not-started': 'not started', 'in-progress': 'in progress', proficient: 'proficient', mastered: 'mastered' }[h.state];
  return `Step ${n} of ${total}: ${s.title}, ${h.stars} of 3 stars, ${state}${h.due ? `, ${h.due} review${h.due === 1 ? '' : 's'} due` : ''}${h.recommended ? ', recommended next' : ''}`;
}

/* ── geometry of the climb (CSS px) ──────────────────────────────────────── */
const COL = 288;          // column width: fits a 320px phone
const R = 48;             // hexagon circumradius
const DX = Math.round(R * 0.866 * 10) / 10; // half a hexagon's width: the sideways step to a touching neighbour
const DY = R * 1.5;       // the upward step to a touching neighbour
const DEPTH = 16;         // how thick the 3D sides are
const TOP = 20;           // room above the face for the recommended step to rise
const LIFT = 14;          // how much higher the recommended step stands
const NODE_W = Math.ceil(2 * DX) + 6, NODE_H = TOP + 2 * R + DEPTH;
const FACE_Y = TOP + R;   // face centre inside a node box
const XMIN = DX + 4, XMAX = COL - DX - 4;
const STAR = 'M0-10 2.9-3.1 10-3.1 4.3 1.2 6.5 8.1 0 3.8-6.5 8.1-4.3 1.2-10-3.1-2.9-3.1Z';

/**
 * A unit is one touching chain of hexagons that climbs and drifts one way: Unit 1 up to the right, Unit 2 up to
 * the left, and so on. Each step is a grid neighbour of the one before; at the edge of the column the chain
 * doubles back one step, then carries on.
 */
export function unitXs(ui: number, n: number): number[] {
  const dir = ui % 2 === 0 ? 1 : -1;
  let x = dir > 0 ? XMIN : XMAX;
  const xs = [x];
  for (let k = 1; k < n; k++) {
    x = x + dir * DX <= XMAX && x + dir * DX >= XMIN ? x + dir * DX : x - dir * DX;
    xs.push(Math.round(x * 10) / 10);
  }
  return xs;
}

/** One tall 3D hexagon step: thick solid walls under a top face that carries the step's number, name and stars. */
function Node3D({ s, h, n }: { s: PathSkill; h: HexInfo; n: number }) {
  const cx = NODE_W / 2;
  const w = R * 0.866;
  const lines = s.label.split('|');
  const ty = FACE_Y - (lines.length > 1 ? 16 : 9);
  return (
    <svg width={NODE_W} height={NODE_H} viewBox={`0 0 ${NODE_W} ${NODE_H}`} aria-hidden className="node-svg block overflow-visible">
      <g className="node-walls">
        <path className="node-side" d={roundHex(cx, FACE_Y + DEPTH, R)} />
        <rect className="node-side" x={cx - w} y={FACE_Y} width={2 * w} height={DEPTH} />
        <path className="node-shade" d={roundHex(cx, FACE_Y + DEPTH, R)} />
        <rect className="node-shade" x={cx - w} y={FACE_Y} width={2 * w} height={DEPTH} />
        {h.recommended && <rect className="node-riser node-side" x={cx - w} y={FACE_Y - LIFT} width={2 * w} height={LIFT + 1} />}
      </g>
      <g className="node-face">
        <path className="node-top" d={roundHex(cx, FACE_Y, R)} />
        <path className="node-shine" d={roundHex(cx, FACE_Y - 1.5, R * 0.84)} />
        <text className="node-num" x={cx} y={ty - 13} textAnchor="middle">{n}</text>
        <text className="node-text" x={cx} y={ty + 3} textAnchor="middle">{lines.map((l, i) => <tspan key={i} x={cx} dy={i ? 13 : 0}>{l}</tspan>)}</text>
        <g transform={`translate(${cx - 14},${FACE_Y + 24})`}>{[0, 1, 2].map((i) => <path key={i} d={STAR} transform={`translate(${i * 14},0) scale(.5)`} className={i < h.stars ? 'node-star on' : 'node-star off'} />)}</g>
        {h.due > 0 && <circle className="node-due" cx={cx + R * 0.58} cy={FACE_Y - R * 0.6} r={6} />}
      </g>
    </svg>
  );
}

/**
 * The Path as a climb: each unit (one SAT domain) is a touching chain of tall 3D hexagons, climbed from the
 * bottom up and drifting one way, with a small arrow on every shared edge pointing to the next step. Units sit
 * on their own floor label and are joined by a short trail. Started steps take their domain colour, unstarted
 * ones stay grey, and only the recommended step stands taller, with one "Start here" tag. Arrow keys climb up
 * and down; Enter opens a step. The climb scrolls inside its own box and opens at the current step.
 */
export function LessonPath({ section, info, selected, onSelect }: { section: Section; info: Record<string, HexInfo>; selected?: SkillId; onSelect: (s: SkillId) => void }) {
  const skills = [...pathOf(section)].sort((a, b) => a.order - b.order);
  const rec = skills.find((s) => info[s.id]?.recommended)?.id;
  const [focusId, setFocusId] = useState<SkillId>(selected ?? rec ?? skills[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (selected) setFocusId(selected); }, [selected]);
  // open at the current step: scroll the climb's own box (never the page) so the recommended step is centred
  useEffect(() => {
    const el = refs.current[rec ?? skills[0].id], b = box.current;
    if (!el || !b) return;
    const r = el.getBoundingClientRect(), rb = b.getBoundingClientRect();
    b.scrollTop += r.top - rb.top - (rb.height - r.height) / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, rec]);
  const move = (i: number, e: KeyboardEvent<HTMLButtonElement>) => {
    const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const to = skills[Math.max(0, Math.min(skills.length - 1, i + d))];
    setFocusId(to.id); refs.current[to.id]?.focus();
  };
  const units: { domain: PathSkill['domain']; items: { s: PathSkill; i: number }[] }[] = [];
  skills.forEach((s, i) => { const last = units[units.length - 1]; if (last?.domain === s.domain) last.items.push({ s, i }); else units.push({ domain: s.domain, items: [{ s, i }] }); });
  return (
    <div ref={box} className="ladder-box" data-testid="ladder-box">
      {/* DOM order is lesson order (step 1 first); the column is reversed so step 1 sits at the bottom */}
      <div className="lesson-path mx-auto flex flex-col-reverse" style={{ maxWidth: COL }} role="group" aria-label={`${section === 'math' ? 'Math' : 'Reading and Writing'} path: ${skills.length} steps in lesson order, climbed from the bottom. Use the arrow keys to climb up or down, Enter to open a step.`} data-testid="lesson-path">
        {units.map((u, ui) => {
          const n = u.items.length;
          const got = u.items.reduce((t, x) => t + (info[x.s.id]?.stars ?? 0), 0);
          const xs = unitXs(ui, n);
          const height = (n - 1) * DY + NODE_H;
          const boxTop = (k: number) => (n - 1 - k) * DY;
          const cy = (k: number) => boxTop(k) + FACE_Y;
          const recK = u.items.findIndex((x) => info[x.s.id]?.recommended);
          return (
            <section key={u.domain} className="flex flex-col-reverse" aria-label={`Unit ${ui + 1}: ${DOMAIN[u.domain].name}`}>
              <div className={cn('path-unit', `dom-${u.domain}`)} data-testid={`unit-${u.domain}`}>
                <span className="min-w-0"><span className="block text-[12px] font-semibold uppercase tracking-[0.1em]">Unit {ui + 1}{ui === 0 ? ' · start at the bottom' : ''}</span><span className="block font-display text-[19px] leading-tight">{DOMAIN[u.domain].name}</span></span>
                <span className="shrink-0 text-[13px]" data-num>{got} of {n * 3} stars</span>
              </div>
              <div className="relative mb-4 mt-1" style={{ height }}>
                <div className={cn('path-unit-bg', `dom-${u.domain}`)} aria-hidden />
                <svg className={cn('pointer-events-none absolute inset-0 overflow-visible', `dom-${u.domain}`)} width={COL} height={height} aria-hidden>
                  {/* a short trail from the floor label up to the first step, and from the last step up to the next unit */}
                  <path d={`M${xs[0]} ${height + 22} L${xs[0]} ${cy(0) + R}`} className={cn('path-trail', (info[u.items[0].s.id]?.stars ?? 0) >= 1 && 'path-trail-done')} />
                  {ui < units.length - 1 && <path d={`M${xs[n - 1]} ${cy(n - 1) - R} L${xs[n - 1]} -26`} className={cn('path-trail', (info[u.items[n - 1].s.id]?.stars ?? 0) >= 1 && 'path-trail-done')} />}
                </svg>
                {u.items.map(({ s, i }, k) => {
                  const h = info[s.id];
                  return (
                    <button key={s.id} ref={(el) => { refs.current[s.id] = el; }} type="button" tabIndex={focusId === s.id ? 0 : -1} onClick={() => { setFocusId(s.id); onSelect(s.id); }} onKeyDown={(e) => move(i, e)}
                      aria-label={hexLabel(s, h, i + 1, skills.length)} aria-pressed={selected === s.id}
                      className={cn('node absolute', `dom-${s.domain}`, `node-${h.state}`, h.recommended && 'node-rec', selected === s.id && 'node-selected')}
                      style={{ position: "absolute", left: xs[k] - NODE_W / 2, top: boxTop(k), zIndex: n - k + 1 }}
                      data-testid={`node-${s.id}`} data-state={h.state} data-recommended={h.recommended || undefined} data-rank={h.rank}>
                      <Node3D s={s} h={h} n={i + 1} />
                    </button>
                  );
                })}
                {/* arrows on the shared edges, pointing to the next step; drawn above every step */}
                <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: n + 5 }} width={COL} height={height} aria-hidden>
                  {u.items.slice(1).map((_, k) => {
                    const x0 = xs[k], x1 = xs[k + 1], y0 = cy(k), y1 = cy(k + 1);
                    const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
                    return <g key={k} transform={`translate(${(x0 + x1) / 2},${(y0 + y1) / 2}) rotate(${ang})`} className="path-step-arrow"><circle r={9.5} /><path d="M-3 -4.5 L2.5 0 L-3 4.5" /></g>;
                  })}
                </svg>
                {recK >= 0 && (
                  <span className={cn('path-bubble absolute', xs[recK] <= COL / 2 ? 'path-bubble-right' : 'path-bubble-left')} style={{ top: cy(recK) - LIFT - 14, zIndex: n + 6, ...(xs[recK] <= COL / 2 ? { left: xs[recK] + DX + 10 } : { right: COL - xs[recK] + DX + 10 }) }} aria-hidden data-testid="start-bubble">
                    {info[u.items[recK].s.id].stars ? 'Continue' : 'Start here'}
                  </span>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
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
