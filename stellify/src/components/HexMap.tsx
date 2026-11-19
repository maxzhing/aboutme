'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Section, SkillId } from '@/lib/types';
import { neighbourFor, pathOf, type PathSkill } from '@/lib/path/skills';
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

/* ── geometry of the map (CSS px) ────────────────────────────────────────── */
const R = 46;             // hexagon circumradius
const W3 = R * Math.sqrt(3); // a hexagon's width = the distance between touching neighbours in a row
const DEPTH = 16;         // how thick the 3D sides are
const TOP = 18;           // room above the face for the recommended step to rise
const LIFT = 14;          // how much higher the recommended step stands
const NODE_W = Math.ceil(W3) + 4, NODE_H = TOP + 2 * R + DEPTH;
const FACE_Y = TOP + R;   // face centre inside a node box
const PAD = 26;
const STAR = 'M0-10 2.9-3.1 10-3.1 4.3 1.2 6.5 8.1 0 3.8-6.5 8.1-4.3 1.2-10-3.1-2.9-3.1Z';
const centre = (h: { q: number; r: number }) => ({ x: W3 * (h.q + h.r / 2), y: 1.5 * R * h.r });
const touching = (a: PathSkill, b: PathSkill) => { const dq = a.hex.q - b.hex.q, dr = a.hex.r - b.hex.r; return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) === 1; };

/** One tall 3D hexagon tile: thick solid walls under a top face that carries the step's number, name and stars. */
function Node3D({ s, h, n }: { s: PathSkill; h: HexInfo; n: number }) {
  const cx = NODE_W / 2;
  const w = R * 0.866;
  const lines = s.label.split('|');
  const ty = FACE_Y - (lines.length > 1 ? 15 : 8);
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
        {h.recommended ? <text className="node-start" x={cx} y={ty - 12} textAnchor="middle" data-testid="start-bubble">{h.stars ? 'CONTINUE' : 'START HERE'}</text> : <text className="node-num" x={cx} y={ty - 12} textAnchor="middle">{n}</text>}
        <text className="node-text" x={cx} y={ty + 3} textAnchor="middle">{lines.map((l, i) => <tspan key={i} x={cx} dy={i ? 13 : 0}>{l}</tspan>)}</text>
        <g transform={`translate(${cx - 14},${FACE_Y + 23})`}>{[0, 1, 2].map((i) => <path key={i} d={STAR} transform={`translate(${i * 14},0) scale(.5)`} className={i < h.stars ? 'node-star on' : 'node-star off'} />)}</g>
        {h.due > 0 && <circle className="node-due" cx={cx + R * 0.56} cy={FACE_Y - R * 0.58} r={6} />}
      </g>
    </svg>
  );
}

/**
 * The Path as a map of grouped hexagon tiles (owner request, after hexagonal-thinking boards): each SAT domain is
 * one touching cluster in its colour, clusters branch out from related skills, and anything that touches is
 * related. Small arrows on shared edges show what builds on what. The map grows upward from the first skill.
 * Tiles are tall 3D hexagons; started ones take their domain colour, unstarted ones stay grey, and only the
 * recommended step stands taller, with one "Start here" tag. Arrow keys move to the touching tile in that
 * direction; Enter opens it. The map scrolls inside its own box and opens centred on the current step.
 */
export function LessonPath({ section, info, selected, onSelect }: { section: Section; info: Record<string, HexInfo>; selected?: SkillId; onSelect: (s: SkillId) => void }) {
  const skills = [...pathOf(section)].sort((a, b) => a.order - b.order);
  const rec = skills.find((s) => info[s.id]?.recommended)?.id;
  const [focusId, setFocusId] = useState<SkillId>(selected ?? rec ?? skills[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (selected) setFocusId(selected); }, [selected]);
  const cs = skills.map((s) => ({ s, ...centre(s.hex) }));
  const minX = Math.min(...cs.map((c) => c.x)), maxX = Math.max(...cs.map((c) => c.x));
  const minY = Math.min(...cs.map((c) => c.y)), maxY = Math.max(...cs.map((c) => c.y));
  const width = maxX - minX + NODE_W + 2 * PAD, height = maxY - minY + NODE_H + 2 * PAD;
  const at = (s: PathSkill) => { const c = centre(s.hex); return { x: c.x - minX + NODE_W / 2 + PAD, y: c.y - minY + FACE_Y + PAD }; };
  // open centred on the current step: scroll the map's own box (never the page)
  useEffect(() => {
    const b = box.current, target = skills.find((s) => s.id === (rec ?? skills[0].id));
    if (!b || !target) return;
    const p = at(target);
    b.scrollLeft = p.x - b.clientWidth / 2;
    b.scrollTop = p.y - b.clientHeight / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, rec]);
  const move = (s: PathSkill, e: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const to = neighbourFor(s, e.key as 'ArrowLeft');
    if (to) { setFocusId(to.id); refs.current[to.id]?.focus(); }
  };
  // arrows: from a skill to the touching skill that builds on it (prerequisite) or branches out from it
  const arrows: { from: PathSkill; to: PathSkill; branch: boolean }[] = [];
  for (const s of skills) for (const l of [...s.prereqs, ...s.branch]) { const f = skills.find((x) => x.id === l); if (f && touching(f, s)) arrows.push({ from: f, to: s, branch: !s.prereqs.includes(l) }); }
  const domains = [...new Set(skills.map((s) => s.domain))];
  const drawOrder = [...skills].sort((a, b) => at(a).y - at(b).y || at(a).x - at(b).x); // lower tiles drawn last, in front
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-2" aria-label="Clusters on the map" data-testid="map-legend">
        {domains.map((d) => { const ks = skills.filter((s) => s.domain === d); const got = ks.reduce((t, s) => t + (info[s.id]?.stars ?? 0), 0); return (
          <li key={d} className={cn('legend-chip', `dom-${d}`)} data-testid={`unit-${d}`}><span className="legend-dot" aria-hidden />{DOMAIN[d].name}<span className="opacity-80" data-num>· {got}/{ks.length * 3}</span></li>
        ); })}
      </ul>
      <div ref={box} className="ladder-box map-box" data-testid="ladder-box">
        <div className="relative mx-auto" style={{ width, height }} role="group" aria-label={`${section === 'math' ? 'Math' : 'Reading and Writing'} map: ${skills.length} skills in clusters by domain; touching skills are related. Use the arrow keys to move to a touching skill, Enter to open it.`} data-testid="lesson-path">
          {drawOrder.map((s, z) => {
            const h = info[s.id];
            const p = at(s);
            const i = skills.indexOf(s);
            return (
              <button key={s.id} ref={(el) => { refs.current[s.id] = el; }} type="button" tabIndex={focusId === s.id ? 0 : -1} onClick={() => { setFocusId(s.id); onSelect(s.id); }} onKeyDown={(e) => move(s, e)}
                aria-label={hexLabel(s, h, i + 1, skills.length)} aria-pressed={selected === s.id}
                className={cn('node', `dom-${s.domain}`, `node-${h.state}`, h.recommended && 'node-rec', selected === s.id && 'node-selected')}
                style={{ position: 'absolute', left: p.x - NODE_W / 2, top: p.y - FACE_Y, zIndex: z + 1 }}
                data-testid={`node-${s.id}`} data-state={h.state} data-recommended={h.recommended || undefined} data-rank={h.rank}>
                <Node3D s={s} h={h} n={i + 1} />
              </button>
            );
          })}
          <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: skills.length + 5 }} width={width} height={height} aria-hidden>
            {arrows.map(({ from, to, branch }) => {
              const a = at(from), b = at(to);
              const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
              return <g key={from.id + to.id} transform={`translate(${(a.x + b.x) / 2},${(a.y + b.y) / 2}) rotate(${ang})`} className={cn('path-step-arrow', branch && 'path-step-branch')}><circle r={9.5} /><path d="M-3 -4.5 L2.5 0 L-3 4.5" /></g>;
            })}
          </svg>
        </div>
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
