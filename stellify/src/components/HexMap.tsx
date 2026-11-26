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

/* ── geometry of the map (CSS px) ────────────────────────────────────────── */
const R = 46;             // hexagon circumradius
const W3 = R * Math.sqrt(3); // a hexagon's width = the distance between touching neighbours in a row
const DEPTH = 16;         // how thick the 3D sides are
const TOP = 18;           // room above the face for the recommended step to rise
const LIFT = 14;          // how much higher the recommended step stands
const NODE_W = Math.ceil(W3) + 4, NODE_H = TOP + 2 * R + DEPTH;
const FACE_Y = TOP + R;   // face centre inside a node box
const STAR = 'M0-10 2.9-3.1 10-3.1 4.3 1.2 6.5 8.1 0 3.8-6.5 8.1-4.3 1.2-10-3.1-2.9-3.1Z';

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

const SHORT_DOMAIN: Partial<Record<PathSkill['domain'], string>> = { psda: 'Data & problem-solving', geo: 'Geometry & trig', sec: 'Conventions', eoi: 'Expression of ideas' };
const PER_ROW = 3;         // tiles per row inside a cluster
const COLW = Math.ceil(W3 * (PER_ROW + 0.5)); // a cluster's width (fits a 320px phone)

/** Tile centres inside one unit's cluster: rows of three, snaking so each step touches the next. */
function clusterLayout(n: number, startRight: boolean) {
  return Array.from({ length: n }, (_, k) => {
    const row = Math.floor(k / PER_ROW), pos = k % PER_ROW;
    const ltr = (row % 2 === 0) !== startRight;
    const c = ltr ? pos : PER_ROW - 1 - pos;
    return { x: W3 / 2 + c * W3 + (row % 2 ? W3 / 2 : 0), y: FACE_Y + row * 1.5 * R };
  });
}

/**
 * The Path (owner request): grouped hexagon tiles laid along a path you go down. Each SAT domain is one compact
 * cluster of touching 3D tiles in its colour, snaking in step order so each step touches the next; a dotted
 * trail and the unit's name lead from one cluster to the next. No arrows: step numbers show the order. Only the
 * recommended tile is highlighted and stands higher than the rest, with "START HERE" on it. Arrow keys move to
 * the previous or next step; Enter opens it. The path scrolls in its own box and opens at the current step.
 */
export function LessonPath({ section, info, selected, onSelect }: { section: Section; info: Record<string, HexInfo>; selected?: SkillId; onSelect: (s: SkillId) => void }) {
  const skills = [...pathOf(section)].sort((a, b) => a.order - b.order);
  const rec = skills.find((s) => info[s.id]?.recommended)?.id;
  const [focusId, setFocusId] = useState<SkillId>(selected ?? rec ?? skills[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (selected) setFocusId(selected); }, [selected]);
  useEffect(() => {
    const el = refs.current[rec ?? skills[0].id], b = box.current;
    if (!el || !b) return;
    const r = el.getBoundingClientRect(), rb = b.getBoundingClientRect();
    b.scrollTop += r.top - rb.top - (rb.height - r.height) / 2;
    // on a computer the map is not its own scroll box: bring the student's step into view on the page itself
    const r2 = el.getBoundingClientRect();
    if (r2.top < 0 || r2.bottom > window.innerHeight) el.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, rec]);
  const move = (i: number, e: KeyboardEvent<HTMLButtonElement>) => {
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const to = skills[Math.max(0, Math.min(skills.length - 1, i + d))];
    setFocusId(to.id); refs.current[to.id]?.focus();
  };
  const units: { domain: PathSkill['domain']; items: { s: PathSkill; i: number }[] }[] = [];
  skills.forEach((s, i) => { const last = units[units.length - 1]; if (last?.domain === s.domain) last.items.push({ s, i }); else units.push({ domain: s.domain, items: [{ s, i }] }); });
  // each cluster starts on the side where the previous one ended, so the trail stays short
  let startRight = false;
  const layouts = units.map((u) => { const l = clusterLayout(u.items.length, startRight); const last = l[l.length - 1]; startRight = last.x > COLW / 2; return l; });
  return (
    <div ref={box} className="ladder-box" data-testid="ladder-box">
      <div className="mx-auto" style={{ maxWidth: COLW }} role="group" aria-label={`${section === 'math' ? 'Math' : 'Reading and Writing'} path: ${skills.length} steps in lesson order, in clusters by topic. Use the arrow keys to move to the previous or next step, Enter to open it.`} data-testid="lesson-path">
        {units.map((u, ui) => {
          const l = layouts[ui];
          const rows = Math.ceil(u.items.length / PER_ROW);
          const height = (rows - 1) * 1.5 * R + NODE_H;
          const got = u.items.reduce((t, x) => t + (info[x.s.id]?.stars ?? 0), 0);
          const prevEnd = ui > 0 ? layouts[ui - 1][layouts[ui - 1].length - 1].x : null;
          return (
            <section key={u.domain} aria-label={`Unit ${ui + 1}: ${DOMAIN[u.domain].name}`}>
              {/* the trail from the previous cluster, with this unit's name on it */}
              <div className="relative flex justify-center" style={{ height: ui ? 74 : 44 }}>
                {prevEnd !== null && (
                  <svg className="pointer-events-none absolute inset-0 overflow-visible" width={COLW} height={74} aria-hidden>
                    <path d={`M${prevEnd} -12 C${prevEnd} 34 ${l[0].x} 40 ${l[0].x} 86`} className="path-trail" />
                  </svg>
                )}
                <span className={cn('path-unit-pill', `dom-${u.domain}`, ui ? 'self-center' : 'self-start')} data-testid={`unit-${u.domain}`}>Unit {ui + 1} · {SHORT_DOMAIN[u.domain] ?? DOMAIN[u.domain].name}<span className="opacity-85" data-num> · {got}/{u.items.length * 3}</span></span>
              </div>
              <div className="relative" style={{ height }}>
                {u.items.map(({ s, i }, k) => {
                  const h = info[s.id];
                  const p = l[k];
                  return (
                    <button key={s.id} ref={(el) => { refs.current[s.id] = el; }} type="button" tabIndex={focusId === s.id ? 0 : -1} onClick={() => { setFocusId(s.id); onSelect(s.id); }} onKeyDown={(e) => move(i, e)}
                      aria-label={hexLabel(s, h, i + 1, skills.length)} aria-pressed={selected === s.id}
                      className={cn('node', `dom-${s.domain}`, `node-${h.state}`, h.recommended && 'node-rec', selected === s.id && 'node-selected')}
                      style={{ position: 'absolute', left: p.x - NODE_W / 2, top: p.y - FACE_Y, zIndex: h.recommended ? 100 : k + 1 }}
                      data-testid={`node-${s.id}`} data-state={h.state} data-recommended={h.recommended || undefined} data-rank={h.rank}>
                      <Node3D s={s} h={h} n={i + 1} />
                    </button>
                  );
                })}
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
