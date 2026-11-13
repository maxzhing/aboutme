'use client';
import { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Seg, Tone, Visual } from '@/data/visual-lessons';
import { RichText } from './RichText';
import { cn } from './ui';

/**
 * Lesson pictures. Every visual is drawn in SVG or styled HTML from a small data spec, so the
 * lessons stay inside the single offline file. Most of them are interactive: drag a slider,
 * flip a toggle, lift a phrase out of a sentence, reveal the next step.
 */
const C: Record<Tone, string> = { brand: 'rgb(var(--brand))', brand2: 'rgb(var(--brand2))', ok: 'rgb(var(--ok))', warn: 'rgb(var(--warn))', bad: 'rgb(var(--bad))', gold: 'rgb(var(--gold))', muted: 'rgb(var(--muted))' };
const SEG: Record<Tone, string> = {
  brand: 'bg-brand/15 decoration-brand', brand2: 'bg-brand2/15 decoration-brand2', ok: 'bg-ok/15 decoration-ok', warn: 'bg-warn/20 decoration-warn',
  bad: 'bg-bad/15 decoration-bad', gold: 'bg-gold/20 decoration-gold', muted: 'bg-raised decoration-faint',
};
const BOX: Record<Tone, string> = {
  brand: 'border-brand/50 bg-brand/10', brand2: 'border-brand2/50 bg-brand2/10', ok: 'border-ok/50 bg-ok/10', warn: 'border-warn/50 bg-warn/10',
  bad: 'border-bad/50 bg-bad/10', gold: 'border-gold/50 bg-gold/10', muted: 'border-line bg-raised/50',
};
const DOT: Record<Tone, string> = { brand: 'bg-brand', brand2: 'bg-brand2', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', gold: 'bg-gold', muted: 'bg-faint' };

const n2 = (x: number) => String(Math.round(x * 100) / 100);
const sg = (x: number) => (x < 0 ? `- ${n2(-x)}` : `+ ${n2(x)}`);
const INK = 'rgb(var(--ink))', LINE = 'rgb(var(--line))', MUTED = 'rgb(var(--muted))';

function Slider({ label, value, min, max, step = 1, onChange, show }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; show?: string }) {
  return (
    <label className="flex items-center gap-3 text-xs font-semibold text-muted">
      <span className="w-28 shrink-0">{label} <b className="text-ink">{show ?? n2(value)}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 min-w-0 flex-1 cursor-pointer accent-[#6A4BF0]" aria-label={label} />
    </label>
  );
}
const Readout = ({ children, tone = 'brand' }: { children: React.ReactNode; tone?: Tone }) => <div className={cn('rounded-xl border px-3 py-2 text-center text-sm font-semibold', BOX[tone])} aria-live="polite">{children}</div>;
const Pills = <T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) => (
  <div className="flex flex-wrap justify-center gap-1.5">{options.map((o) => <button key={o} type="button" onClick={() => onChange(o)} aria-pressed={value === o} className={cn('rounded-full border px-3 py-1 text-xs font-bold', value === o ? 'border-brand bg-brand/15 text-ink' : 'border-line text-muted hover:text-ink')}><RichText text={o} /></button>)}</div>
);

/* ── Coordinate plane ─────────────────────────────────────────────────────── */
const R = 8, S = 150 / R;
const px = (x: number) => 150 + x * S, py = (y: number) => 150 - y * S;
function curve(f: (x: number) => number) {
  let d = '', pen = false;
  for (let i = 0; i <= 320; i++) {
    const x = -R + (i * 2 * R) / 320, y = f(x);
    if (!isFinite(y) || Math.abs(y) > R * 2.5) { pen = false; continue; }
    d += `${pen ? 'L' : 'M'}${px(x).toFixed(1)} ${py(y).toFixed(1)} `; pen = true;
  }
  return d;
}
function Plane({ children, label }: { children: React.ReactNode; label: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-[300px] rounded-xl border border-line bg-surface" role="img" aria-label={label}>
      <defs><clipPath id={id}><rect x="0" y="0" width="300" height="300" /></clipPath></defs>
      {Array.from({ length: 2 * R + 1 }, (_, i) => i - R).map((t) => <g key={t}><line x1={px(t)} x2={px(t)} y1="0" y2="300" stroke={LINE} strokeWidth={t === 0 ? 0 : 0.6} /><line y1={py(t)} y2={py(t)} x1="0" x2="300" stroke={LINE} strokeWidth={t === 0 ? 0 : 0.6} /></g>)}
      <line x1="0" x2="300" y1="150" y2="150" stroke={MUTED} strokeWidth="1.4" /><line y1="0" y2="300" x1="150" x2="150" stroke={MUTED} strokeWidth="1.4" />
      {[-6, -4, -2, 2, 4, 6].map((t) => <g key={t} fontSize="9" fill={MUTED}><text x={px(t)} y="162" textAnchor="middle">{t}</text><text x="144" y={py(t) + 3} textAnchor="end">{t}</text></g>)}
      <g clipPath={`url(#${id})`}>{children}</g>
    </svg>
  );
}
const Pt = ({ x, y, tone = 'gold' }: { x: number; y: number; tone?: Tone }) => <circle cx={px(x)} cy={py(y)} r="5" fill={C[tone]} stroke="rgb(var(--surface))" strokeWidth="1.5" />;

function Plot({ mode }: { mode: Extract<Visual, { kind: 'plot' }>['mode'] }) {
  const init: Record<string, [number, number, number]> = { line: [1.5, -2, 0], standard: [3, 4, 0], perp: [2, 0, 0], system: [-1, 3, 0], ineq: [1, -1, 0], parabola: [1, 1, -4], disc: [2, -3, 0], exp: [2, 1.4, 0], circle: [1, -1, 4], fit: [3, 0, 0] };
  const [[a, b, c], set] = useState(init[mode]);
  const [op, setOp] = useState<'≥' | '≤' | '>' | '<'>('≥');
  const A = (v: number) => set([v, b, c]), B = (v: number) => set([a, v, c]), Cc = (v: number) => set([a, b, v]);
  let art: React.ReactNode = null, controls: React.ReactNode = null, read: React.ReactNode = null, tone: Tone = 'brand';
  const stroke = { fill: 'none', strokeWidth: 3, strokeLinecap: 'round' as const };
  if (mode === 'line') {
    art = <><path d={curve((x) => a * x + b)} stroke={C.brand} {...stroke} /><path d={`M${px(0)} ${py(b)} H${px(1)} V${py(b + a)}`} stroke={C.gold} strokeWidth="2.5" fill="none" strokeDasharray="4 3" /><Pt x={0} y={b} /></>;
    controls = <><Slider label="slope m =" value={a} min={-4} max={4} step={0.5} onChange={A} /><Slider label="intercept b =" value={b} min={-6} max={6} onChange={B} /></>;
    read = <RichText text={`$y = ${n2(a)}x ${sg(b)}$ · starts at ${n2(b)}, changes by ${n2(a)} for every +1 in $x$`} />;
  } else if (mode === 'standard') {
    art = <><path d={curve((x) => (12 - a * x) / b)} stroke={C.brand} {...stroke} /><Pt x={12 / a} y={0} tone="ok" /><Pt x={0} y={12 / b} /></>;
    controls = <><Slider label="A =" value={a} min={2} max={6} onChange={A} /><Slider label="B =" value={b} min={2} max={6} onChange={B} /></>;
    read = <RichText text={`$${a}x + ${b}y = 12$ · slope $-\\frac{A}{B} = -\\frac{${a}}{${b}}$ · $x$-intercept $\\frac{12}{${a}}$, $y$-intercept $\\frac{12}{${b}}$`} />;
  } else if (mode === 'perp') {
    art = <><path d={curve((x) => a * x)} stroke={C.brand} {...stroke} /><path d={curve((x) => -x / a)} stroke={C.gold} {...stroke} /><rect x={px(0) - 0} y={py(0) - 9} width="9" height="9" fill="none" stroke={INK} strokeWidth="1.2" transform={`rotate(${-Math.atan(a) * 180 / Math.PI} ${px(0)} ${py(0)})`} /></>;
    controls = <Slider label="slope m =" value={a} min={0.5} max={4} step={0.5} onChange={A} />;
    read = <RichText text={`Slopes $${n2(a)}$ and $-\\frac{1}{${n2(a)}} = ${n2(-1 / a)}$ · product is always $-1$`} />;
  } else if (mode === 'system') {
    const same = a === 1, x0 = same ? 0 : (1 - b) / (a - 1);
    art = <><path d={curve((x) => x + 1)} stroke={C.brand} {...stroke} /><path d={curve((x) => a * x + b)} stroke={C.gold} {...stroke} />{!same && <Pt x={x0} y={x0 + 1} tone="ok" />}</>;
    controls = <><Slider label="gold slope =" value={a} min={-2} max={3} step={0.5} onChange={A} /><Slider label="gold intercept =" value={b} min={-5} max={5} onChange={B} /></>;
    tone = same ? (b === 1 ? 'gold' : 'bad') : 'ok';
    read = same ? (b === 1 ? 'Same line twice: infinitely many solutions' : 'Same slope, different intercept: parallel, no solution') : <RichText text={`Different slopes: exactly one solution, $(${n2(x0)}, ${n2(x0 + 1)})$`} />;
  } else if (mode === 'ineq') {
    const up = op === '≥' || op === '>', strict = op === '>' || op === '<';
    const y1 = a * -R + b, y2 = a * R + b, edge = up ? 3 * R : -3 * R;
    const origin = up ? (strict ? 0 > b : 0 >= b) : (strict ? 0 < b : 0 <= b);
    art = <><path d={`M${px(-R)} ${py(y1)} L${px(R)} ${py(y2)} L${px(R)} ${py(edge)} L${px(-R)} ${py(edge)} Z`} fill={C.brand} opacity="0.2" /><path d={curve((x) => a * x + b)} stroke={C.brand} {...stroke} strokeDasharray={strict ? '7 6' : undefined} /><Pt x={0} y={0} tone={origin ? 'ok' : 'bad'} /></>;
    controls = <><Pills value={op} options={['≥', '≤', '>', '<'] as const} onChange={setOp} /><Slider label="slope =" value={a} min={-3} max={3} step={0.5} onChange={A} /><Slider label="intercept =" value={b} min={-5} max={5} onChange={B} /></>;
    tone = origin ? 'ok' : 'bad';
    read = <RichText text={`$y ${op === '≥' ? '\\ge' : op === '≤' ? '\\le' : op} ${n2(a)}x ${sg(b)}$ · ${strict ? 'dashed' : 'solid'} line · test $(0,0)$: ${origin ? 'true, so shade its side' : 'false, so shade the other side'}`} />;
  } else if (mode === 'parabola') {
    const roots = c === 0 ? 1 : (a > 0) === (c < 0) ? 2 : 0;
    art = <><path d={curve((x) => a * (x - b) ** 2 + c)} stroke={C.brand} {...stroke} /><line x1={px(b)} x2={px(b)} y1="0" y2="300" stroke={C.gold} strokeDasharray="4 4" /><Pt x={b} y={c} /></>;
    controls = <><Pills value={a > 0 ? 'opens up' : 'opens down'} options={['opens up', 'opens down'] as const} onChange={(v) => A(v === 'opens up' ? Math.abs(a) : -Math.abs(a))} /><Slider label="h =" value={b} min={-5} max={5} onChange={B} /><Slider label="k =" value={c} min={-6} max={6} onChange={Cc} /></>;
    read = <RichText text={`$y = ${a < 0 ? '-' : ''}(x ${sg(-b)})^2 ${sg(c)}$ · vertex $(${b}, ${c})$ · ${roots} $x$-intercept${roots === 1 ? '' : 's'}`} />;
  } else if (mode === 'disc') {
    const D = a * a - 4 * b; tone = D > 0 ? 'ok' : D === 0 ? 'gold' : 'bad';
    art = <><path d={curve((x) => x * x + a * x + b)} stroke={C.brand} {...stroke} />{D >= 0 && [(-a - Math.sqrt(D)) / 2, (-a + Math.sqrt(D)) / 2].map((x, i) => <Pt key={i} x={x} y={0} tone="ok" />)}</>;
    controls = <><Slider label="b =" value={a} min={-6} max={6} onChange={A} /><Slider label="c =" value={b} min={-6} max={8} onChange={B} /></>;
    read = <RichText text={`$x^2 ${sg(a)}x ${sg(b)} = 0$ · $b^2 - 4ac = ${D}$ → ${D > 0 ? 'two real solutions' : D === 0 ? 'exactly one real solution' : 'no real solutions'}`} />;
  } else if (mode === 'exp') {
    const p = Math.round((b - 1) * 100);
    art = <><path d={curve((x) => a * b ** x)} stroke={C.brand} {...stroke} /><Pt x={0} y={a} /></>;
    controls = <><Slider label="start a =" value={a} min={1} max={5} onChange={A} /><Slider label="factor b =" value={b} min={0.5} max={1.8} step={0.1} onChange={B} /></>;
    tone = b > 1 ? 'ok' : b < 1 ? 'bad' : 'gold';
    read = <RichText text={`$y = ${a}(${n2(b)})^x$ · starts at ${a} · ${p === 0 ? 'stays constant' : `${p > 0 ? 'grows' : 'shrinks'} ${Math.abs(p)}% each step`}`} />;
  } else if (mode === 'circle') {
    art = <><circle cx={px(a)} cy={py(b)} r={c * S} fill={C.brand} fillOpacity="0.12" stroke={C.brand} strokeWidth="3" /><line x1={px(a)} y1={py(b)} x2={px(a + c)} y2={py(b)} stroke={C.gold} strokeWidth="2.5" /><Pt x={a} y={b} /></>;
    controls = <><Slider label="center x: h =" value={a} min={-4} max={4} onChange={A} /><Slider label="center y: k =" value={b} min={-4} max={4} onChange={B} /><Slider label="radius r =" value={c} min={1} max={5} onChange={Cc} /></>;
    read = <RichText text={`$(x ${sg(-a)})^2 + (y ${sg(-b)})^2 = ${c * c}$ · center $(${a}, ${b})$, radius $${c}$ (signs flip, radius is squared)`} />;
  } else {
    const pts: [number, number][] = [[-6, -4.6], [-4, -1.4], [-2, -1.6], [0, 2.4], [2, 1.6], [4, 5.2], [6, 5]];
    const f = (x: number) => 0.8 * x + 1, [x, y] = pts[a], res = y - f(x);
    art = <><path d={curve(f)} stroke={C.brand} {...stroke} strokeWidth={2.5} />{pts.map(([u, v], i) => <circle key={i} cx={px(u)} cy={py(v)} r="4.5" fill={i === a ? C.gold : MUTED} />)}<line x1={px(x)} x2={px(x)} y1={py(y)} y2={py(f(x))} stroke={res >= 0 ? C.ok : C.bad} strokeWidth="3" /></>;
    controls = <Slider label="point #" value={a} min={0} max={6} onChange={A} show={String(a + 1)} />;
    tone = res >= 0 ? 'ok' : 'bad';
    read = <RichText text={`actual ${n2(y)} − predicted ${n2(f(x))} = residual $${n2(res)}$ · the point is ${res >= 0 ? 'above' : 'below'} the line`} />;
  }
  return <div className="space-y-3"><Plane label={`Interactive graph: ${mode}`}>{art}</Plane><div className="mx-auto max-w-md space-y-2">{controls}</div><Readout tone={tone}>{read}</Readout></div>;
}

/* ── Sentences, flows, comparisons, tiles ─────────────────────────────────── */
function Sentence({ segs, lift, liftLabel }: { segs: Seg[]; lift?: number[]; liftLabel?: string }) {
  const [out, setOut] = useState(false);
  const legend = [...new Map(segs.filter((s) => s[1] && s[2]).map((s) => [s[2]!, s[1]!])).entries()];
  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-line bg-surface p-4 text-center font-serif text-lg leading-[2.1] sm:text-xl">
        {segs.map(([t, tone], i) => {
          const gone = out && lift?.includes(i);
          return <span key={i} className={cn('transition-all duration-300', tone && cn('rounded-md px-1 py-0.5 underline decoration-2 underline-offset-4', SEG[tone]), gone && 'opacity-20 line-through')}>{t}</span>;
        })}
      </p>
      {legend.length > 0 && <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">{legend.map(([label, tone]) => <span key={label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted"><span className={cn('h-2.5 w-2.5 rounded-full', DOT[tone])} />{label}</span>)}</div>}
      {lift && <div className="text-center"><button type="button" className="btn-ghost !py-1.5 text-sm" onClick={() => setOut(!out)} aria-pressed={out}>{out ? 'Put it back' : liftLabel ?? 'Lift it out'}</button>{out && <p className="mt-2 text-sm font-semibold text-ok">What is left still works as a sentence. ✓</p>}</div>}
    </div>
  );
}
function Flow({ nodes }: { nodes: [string, string?, Tone?][] }) {
  return (
    <div className="flex flex-col items-stretch gap-1.5 md:flex-row md:items-center md:justify-center">
      {nodes.map(([t, sub, tone = 'brand'], i) => (
        <div key={i} className="contents">
          {i > 0 && <ChevronRight className="mx-auto shrink-0 rotate-90 text-faint md:rotate-0" size={22} aria-hidden />}
          <div className={cn('min-w-0 flex-1 rounded-xl border-2 p-3 text-center md:max-w-[210px]', BOX[tone])}>
            <div className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs font-bold text-bg">{i + 1}</div>
            <div className="text-sm font-bold leading-snug"><RichText text={t} /></div>{sub && <div className="mt-1 text-xs text-muted"><RichText text={sub} /></div>}
          </div>
        </div>
      ))}
    </div>
  );
}
function Compare({ bad, good, badLabel = 'Trap', goodLabel = 'Fix' }: { bad: string; good: string; badLabel?: string; goodLabel?: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border-2 border-bad/40 bg-bad/5 p-3.5"><div className="mb-1 text-xs font-black uppercase tracking-wide text-bad">✗ {badLabel}</div><div className="text-[15px]"><RichText text={bad} /></div></div>
      <div className="rounded-xl border-2 border-ok/40 bg-ok/5 p-3.5"><div className="mb-1 text-xs font-black uppercase tracking-wide text-ok">✓ {goodLabel}</div><div className="text-[15px]"><RichText text={good} /></div></div>
    </div>
  );
}
function Tiles({ items }: { items: [string, string, string][] }) {
  return (
    <div className={cn('grid gap-2.5', items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
      {items.map(([icon, title, text]) => <div key={title} className="rounded-xl border border-line bg-surface p-3 text-center"><div className="text-3xl leading-none" aria-hidden>{icon}</div><div className="mt-1.5 text-sm font-bold"><RichText text={title} /></div><div className="mt-0.5 text-xs text-muted"><RichText text={text} /></div></div>)}
    </div>
  );
}
function Steps({ lines }: { lines: [string, string][] }) {
  const [n, setN] = useState(1);
  return (
    <div className="space-y-2">
      {lines.slice(0, n).map(([m, note], i) => (
        <div key={i} className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border px-3.5 py-2.5', i === lines.length - 1 ? BOX.ok : 'border-line bg-surface')}>
          <span className="text-lg"><RichText text={m} /></span><span className="text-xs font-semibold text-muted"><RichText text={note} /></span>
        </div>
      ))}
      <div className="text-center">{n < lines.length ? <button type="button" className="btn-ghost !py-1.5 text-sm" onClick={() => setN(n + 1)}>Show the next step ({n}/{lines.length})</button> : <button type="button" className="text-xs font-semibold text-muted hover:text-ink" onClick={() => setN(1)}>Replay</button>}</div>
    </div>
  );
}
function Meter({ left, right, words, zone }: { left: string; right: string; words: [string, number][]; zone?: [number, number] }) {
  return (
    <div className="px-2">
      <div className="relative h-36">
        <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand2/60 via-gold/60 to-bad/70" />
        {zone && <div className="absolute top-1/2 h-9 -translate-y-1/2 rounded-lg border-2 border-ok bg-ok/15" style={{ left: `${zone[0]}%`, width: `${zone[1] - zone[0]}%` }} />}
        {words.map(([w, v], i) => <div key={w} className="absolute -translate-x-1/2 text-center" style={{ left: `${v}%`, top: i % 2 ? '66%' : '2%' }}><div className={cn('whitespace-nowrap rounded-md border bg-surface px-1.5 py-0.5 text-xs font-bold', zone && v >= zone[0] && v <= zone[1] ? 'border-ok text-ok' : 'border-line')}>{w}</div><div className={cn('mx-auto h-4 w-px bg-faint', i % 2 && 'hidden')} /></div>)}
      </div>
      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-faint"><span>{left}</span><span>{right}</span></div>
    </div>
  );
}

/* ── Number and data pictures ─────────────────────────────────────────────── */
function NumLine({ center }: { center: number }) {
  const [d, setD] = useState(3);
  const [op, setOp] = useState<'=' | '<' | '>'>('=');
  const X = (v: number) => 160 + (v - center) * 20;
  const lo = center - d, hi = center + d;
  return (
    <div className="space-y-3">
      <svg viewBox="0 0 320 78" className="mx-auto w-full max-w-md" role="img" aria-label="Number line">
        <line x1="6" x2="314" y1="40" y2="40" stroke={MUTED} strokeWidth="1.5" />
        {Array.from({ length: 15 }, (_, i) => center - 7 + i).map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1="35" y2="45" stroke={MUTED} /><text x={X(t)} y="62" fontSize="10" textAnchor="middle" fill={MUTED}>{t}</text></g>)}
        {op === '<' && <line x1={X(lo)} x2={X(hi)} y1="40" y2="40" stroke={C.brand} strokeWidth="6" strokeLinecap="round" />}
        {op === '>' && <><line x1="6" x2={X(lo)} y1="40" y2="40" stroke={C.brand} strokeWidth="6" /><line x1={X(hi)} x2="314" y1="40" y2="40" stroke={C.brand} strokeWidth="6" /></>}
        <path d={`M${X(center)} 22 H${X(hi)} M${X(center)} 22 H${X(lo)}`} stroke={C.gold} strokeWidth="2" strokeDasharray="3 3" /><text x={X(center + d / 2)} y="16" fontSize="10" textAnchor="middle" fill={C.gold} fontWeight="700">{d}</text><text x={X(center - d / 2)} y="16" fontSize="10" textAnchor="middle" fill={C.gold} fontWeight="700">{d}</text>
        <circle cx={X(center)} cy="40" r="4" fill={C.gold} />
        {[lo, hi].map((v) => <circle key={v} cx={X(v)} cy="40" r="6" fill={op === '=' ? C.brand : 'rgb(var(--surface))'} stroke={C.brand} strokeWidth="2.5" />)}
      </svg>
      <Pills value={op} options={['=', '<', '>'] as const} onChange={setOp} />
      <div className="mx-auto max-w-md"><Slider label="distance =" value={d} min={1} max={6} onChange={setD} /></div>
      <Readout><RichText text={`$|x - ${center}| ${op} ${d}$ means ${op === '=' ? `$x = ${lo}$ or $x = ${hi}$` : op === '<' ? `$${lo} < x < ${hi}$ (inside)` : `$x < ${lo}$ or $x > ${hi}$ (outside)`}: “distance from ${center}”`} /></Readout>
    </div>
  );
}
function Tape({ a, b, names }: { a: number; b: number; names: [string, string] }) {
  const [k, setK] = useState(5);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">{([[a, names[0], 'bg-brand'], [b, names[1], 'bg-gold']] as const).map(([n, name, col]) => <div key={name} className="flex items-center gap-2"><span className="w-16 shrink-0 text-right text-xs font-bold text-muted">{name}</span><div className="flex flex-1 gap-1">{Array.from({ length: n }, (_, i) => <div key={i} className={cn('grid h-10 flex-1 place-items-center rounded-md text-sm font-bold text-white', col)} style={{ maxWidth: 64 }}>{k}</div>)}</div><b className="w-10 text-sm">{n * k}</b></div>)}</div>
      <div className="mx-auto max-w-md"><Slider label="one part =" value={k} min={1} max={12} onChange={setK} /></div>
      <Readout><RichText text={`Ratio $${a}:${b}$ → ${a + b} equal parts. Total ${(a + b) * k} ÷ ${a + b} = ${k} per part, so ${a * k} and ${b * k}.`} /></Readout>
    </div>
  );
}
function Percent() {
  const [u, setU] = useState(20), [d, setD] = useState(20);
  const mid = 100 * (1 + u / 100), end = mid * (1 - d / 100);
  const bar = (v: number, label: string, col: string) => <div className="flex items-center gap-2"><span className="w-24 shrink-0 text-right text-xs font-bold text-muted">{label}</span><div className="h-8 flex-1 rounded-md bg-raised"><div className={cn('grid h-8 place-items-center rounded-md text-sm font-bold text-white transition-all', col)} style={{ width: `${Math.min(100, (v / 150) * 100)}%` }}>{n2(v)}</div></div></div>;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">{bar(100, 'start', 'bg-faint')}{bar(mid, `up ${u}%`, 'bg-ok')}{bar(end, `then down ${d}%`, 'bg-brand')}</div>
      <div className="mx-auto max-w-md space-y-2"><Slider label="increase %" value={u} min={0} max={50} step={5} onChange={setU} /><Slider label="decrease %" value={d} min={0} max={50} step={5} onChange={setD} /></div>
      <Readout tone={end === 100 ? 'gold' : 'brand'}><RichText text={`$100 \\times ${n2(1 + u / 100)} \\times ${n2(1 - d / 100)} = ${n2(end)}$ · net change ${n2(end - 100)}%, not ${u - d}%`} /></Readout>
    </div>
  );
}
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function Dots({ values, outlier }: { values: number[]; outlier: number }) {
  const [on, setOn] = useState(false);
  const data = on ? [...values, outlier] : values, max = Math.max(...values, outlier) + 1;
  const X = (v: number) => 14 + (v / max) * 292, seen: Record<number, number> = {};
  return (
    <div className="space-y-3">
      <svg viewBox="0 0 320 120" className="mx-auto w-full max-w-md" role="img" aria-label="Dot plot with mean and median">
        <line x1="8" x2="312" y1="92" y2="92" stroke={MUTED} />
        {Array.from({ length: Math.floor(max / 2) + 1 }, (_, i) => i * 2).map((t) => <text key={t} x={X(t)} y="108" fontSize="9" textAnchor="middle" fill={MUTED}>{t}</text>)}
        {data.map((v, i) => { seen[v] = (seen[v] ?? 0) + 1; return <circle key={i} cx={X(v)} cy={92 - seen[v] * 13 + 5} r="5.5" fill={on && i === data.length - 1 ? C.bad : C.brand2} />; })}
        <line x1={X(median(data))} x2={X(median(data))} y1="14" y2="92" stroke={C.gold} strokeWidth="2.5" /><text x={X(median(data))} y="10" fontSize="10" textAnchor="middle" fill={C.gold} fontWeight="700">median</text>
        <path d={`M${X(mean(data))} 92 l-7 12 h14 z`} fill={C.brand} style={{ transition: 'all .4s' }} /><text x={X(mean(data))} y="118" fontSize="10" textAnchor="middle" fill={C.brand} fontWeight="700">mean</text>
      </svg>
      <div className="text-center"><button type="button" className="btn-ghost !py-1.5 text-sm" onClick={() => setOn(!on)} aria-pressed={on}>{on ? 'Remove the outlier' : `Add an outlier (${outlier})`}</button></div>
      <Readout tone={on ? 'bad' : 'brand'}>mean {n2(mean(data))} · median {n2(median(data))}{on ? ' · the mean got dragged, the median barely moved' : ''}</Readout>
    </div>
  );
}
function Spread() {
  const base = [-2, -1.5, -1, -0.5, -0.5, 0, 0, 0.5, 0.5, 1, 1.5, 2];
  const [s, setS] = useState(1), [shift, setShift] = useState(0);
  const data = base.map((b) => 10 + shift + b * s), sd = Math.sqrt(mean(data.map((v) => (v - mean(data)) ** 2)));
  return (
    <div className="space-y-3">
      <svg viewBox="0 0 320 70" className="mx-auto w-full max-w-md" role="img" aria-label="Dot plot whose spread can be changed">
        <line x1="8" x2="312" y1="50" y2="50" stroke={MUTED} />{[0, 5, 10, 15, 20].map((t) => <text key={t} x={10 + t * 15} y="65" fontSize="9" textAnchor="middle" fill={MUTED}>{t}</text>)}
        {data.map((v, i) => <circle key={i} cx={10 + v * 15} cy={40 - (i % 3) * 11} r="5" fill={C.brand2} style={{ transition: 'all .3s' }} />)}
        <line x1={10 + mean(data) * 15} x2={10 + mean(data) * 15} y1="4" y2="50" stroke={C.gold} strokeWidth="2" strokeDasharray="3 3" />
      </svg>
      <div className="mx-auto max-w-md space-y-2"><Slider label="stretch ×" value={s} min={0.5} max={3} step={0.5} onChange={setS} /><Slider label="add to all" value={shift} min={-3} max={3} onChange={setShift} /></div>
      <Readout>mean {n2(mean(data))} · standard deviation {n2(sd)} · adding moves the center only; stretching changes the spread</Readout>
    </div>
  );
}
function TableViews({ headers, rows, views }: Extract<Visual, { kind: 'table' }>) {
  const [v, setV] = useState(0);
  const has = (list: [number, number][], r: number, c: number) => list.some(([a, b]) => a === r && b === c);
  return (
    <div className="space-y-3">
      <Pills value={views[v].label} options={views.map((x) => x.label)} onChange={(l) => setV(views.findIndex((x) => x.label === l))} />
      <div className="overflow-x-auto"><table className="mx-auto border-collapse text-sm">
        <thead><tr>{headers.map((h, i) => <th key={i} className="border border-line bg-raised px-3 py-1.5 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className={cn('border border-line px-3 py-1.5 text-center transition-colors', c === 0 && 'text-left font-semibold', has(views[v].num, r, c) && 'bg-ok/30 font-black', has(views[v].den, r, c) && !has(views[v].num, r, c) && 'bg-brand/20 font-bold')}>{cell}</td>)}</tr>)}</tbody>
      </table></div>
      <Readout><RichText text={views[v].text} /></Readout>
    </div>
  );
}
function Sample() {
  const sizes = [25, 100, 400, 1600];
  const [i, setI] = useState(1);
  const moe = 100 / Math.sqrt(sizes[i]) / 2 * 2, lo = 42 - moe, hi = 42 + moe;
  return (
    <div className="space-y-3">
      <svg viewBox="0 0 320 64" className="mx-auto w-full max-w-md" role="img" aria-label="Estimate with margin of error">
        <line x1="10" x2="310" y1="40" y2="40" stroke={MUTED} />{[0, 20, 40, 60, 80, 100].map((t) => <text key={t} x={10 + t * 3} y="58" fontSize="9" textAnchor="middle" fill={MUTED}>{t}%</text>)}
        <rect x={10 + lo * 3} width={(hi - lo) * 3} y="28" height="24" rx="6" fill={C.brand} opacity="0.3" style={{ transition: 'all .3s' }} />
        <circle cx={10 + 42 * 3} cy="40" r="6" fill={C.gold} /><text x={10 + 42 * 3} y="18" fontSize="11" textAnchor="middle" fill={C.gold} fontWeight="700">42%</text>
      </svg>
      <div className="mx-auto max-w-md"><Slider label="sample size" value={i} min={0} max={3} onChange={setI} show={String(sizes[i])} /></div>
      <Readout>Sample says 42% ± {n2(moe)}%. Plausible for the whole population: {n2(lo)}% to {n2(hi)}%. Bigger sample, smaller margin.</Readout>
    </div>
  );
}

/* ── Geometry ─────────────────────────────────────────────────────────────── */
function Shape({ mode }: { mode: Extract<Visual, { kind: 'shape' }>['mode'] }) {
  const init: Record<string, [number, number]> = { trig: [35, 0], similar: [2, 0], arc: [90, 0], angles: [65, 0], tri: [60, 50], box: [2, 3], special: [0, 0], cyl: [2, 4] };
  const [[a, b], set] = useState(init[mode]);
  const A = (v: number) => set([v, b]), B = (v: number) => set([a, v]);
  const rad = (d: number) => (d * Math.PI) / 180;
  const T = (x: number, y: number, t: string, fill = INK, size = 12) => <text x={x} y={y} fontSize={size} textAnchor="middle" fill={fill} fontWeight="700">{t}</text>;
  let art: React.ReactNode, controls: React.ReactNode = null, read: React.ReactNode;
  if (mode === 'trig') {
    const H = 200, x2 = 40 + H * Math.cos(rad(a)), y2 = 190 - H * Math.sin(rad(a));
    art = <><path d={`M40 190 H${x2} V${y2} Z`} fill={C.brand} fillOpacity="0.1" stroke={INK} strokeWidth="2" /><rect x={x2 - 10} y="180" width="10" height="10" fill="none" stroke={INK} /><path d={`M72 190 A32 32 0 0 0 ${40 + 32 * Math.cos(rad(a))} ${190 - 32 * Math.sin(rad(a))}`} fill="none" stroke={C.gold} strokeWidth="3" />{T(84, 180, 'θ', C.gold)}{T((40 + x2) / 2, 206, 'adjacent', C.brand2)}{T(x2 + 30, (190 + y2) / 2, 'opposite', C.ok)}{T((40 + x2) / 2 - 44, (190 + y2) / 2 - 14, 'hypotenuse', C.brand)}</>;
    controls = <Slider label="angle θ =" value={a} min={15} max={75} step={5} onChange={A} show={`${a}°`} />;
    read = <RichText text={`$\\sin ${a}^\\circ = \\frac{\\text{opp}}{\\text{hyp}} = ${n2(Math.sin(rad(a)))}$ · $\\cos ${a}^\\circ = ${n2(Math.cos(rad(a)))}$ · and $\\cos ${90 - a}^\\circ = ${n2(Math.cos(rad(90 - a)))}$: the same as $\\sin ${a}^\\circ$`} />;
  } else if (mode === 'similar') {
    const w = 36 * a, h = 24 * a;
    art = <><rect x="24" y={196 - 24} width="36" height="24" fill={C.gold} fillOpacity="0.3" stroke={C.gold} strokeWidth="2" /><rect x="110" y={196 - h} width={w} height={h} fill={C.brand} fillOpacity="0.15" stroke={C.brand} strokeWidth="2" style={{ transition: 'all .3s' }} />{Array.from({ length: Math.floor(a) ** 2 }, (_, i) => <rect key={i} x={110 + (i % Math.floor(a)) * 36} y={196 - 24 - Math.floor(i / Math.floor(a)) * 24} width="36" height="24" fill="none" stroke={C.brand} strokeOpacity="0.5" strokeDasharray="3 3" />)}{T(42, 212, '3 × 2')}{T(110 + w / 2, 212, `${3 * a} × ${2 * a}`)}</>;
    controls = <Slider label="scale factor k =" value={a} min={1} max={3} step={0.5} onChange={A} />;
    read = <RichText text={`Every length × ${a} · perimeter × ${a} · area × $${a}^2 = ${n2(a * a)}$ · volume would be × $${a}^3 = ${n2(a ** 3)}$`} />;
  } else if (mode === 'arc') {
    const ex = 160 + 80 * Math.cos(rad(a)), ey = 115 - 80 * Math.sin(rad(a));
    art = <><circle cx="160" cy="115" r="80" fill="none" stroke={LINE} strokeWidth="2" />{a >= 360 ? <circle cx="160" cy="115" r="80" fill={C.brand} fillOpacity="0.2" stroke={C.gold} strokeWidth="5" /> : <><path d={`M160 115 L240 115 A80 80 0 ${a > 180 ? 1 : 0} 0 ${ex} ${ey} Z`} fill={C.brand} fillOpacity="0.2" /><path d={`M240 115 A80 80 0 ${a > 180 ? 1 : 0} 0 ${ex} ${ey}`} fill="none" stroke={C.gold} strokeWidth="5" strokeLinecap="round" /><path d={`M240 115 L160 115 L${ex} ${ey}`} fill="none" stroke={INK} strokeWidth="1.5" /></>}<circle cx="160" cy="115" r="3.5" fill={INK} />{T(160, 212, `${a}° = ${n2(a / 180)}π radians`, C.gold)}</>;
    controls = <Slider label="central angle =" value={a} min={30} max={360} step={15} onChange={A} show={`${a}°`} />;
    read = <RichText text={`The slice is $\\frac{${a}}{360}$ of the circle, so arc $= \\frac{${a}}{360} \\cdot 2\\pi r$ and sector area $= \\frac{${a}}{360} \\cdot \\pi r^2$`} />;
  } else if (mode === 'angles') {
    const dx = 62 / Math.tan(rad(a)), mark = (x: number, y: number, big: boolean, t: number) => T(x, y, `${t}°`, big ? C.gold : C.brand, 11);
    art = <><line x1="20" x2="300" y1="70" y2="70" stroke={INK} strokeWidth="2" /><line x1="20" x2="300" y1="160" y2="160" stroke={INK} strokeWidth="2" /><line x1={160 + dx * 1.5 - (45 / 62) * dx - 0} y1="10" x2={160 - dx * 1.5 + (45 / 62) * dx} y2="220" stroke={C.muted} strokeWidth="2" />
      {[[160 + 45 / 62 * dx * 0 + (45 * dx) / 62 * 1, 70], [160 - (45 * dx) / 62, 160]].map(([x, y], i) => <g key={i}>{mark(x + 30, y - 8, false, a)}{mark(x - 30, y - 8, true, 180 - a)}{mark(x - 30, y + 18, false, a)}{mark(x + 30, y + 18, true, 180 - a)}</g>)}</>;
    controls = <Slider label="angle =" value={a} min={40} max={140} step={5} onChange={A} show={`${a}°`} />;
    read = `Parallel lines cut by one line make only two angle sizes: ${a}° and ${180 - a}°. Same color = equal. Different colors add to 180°.`;
  } else if (mode === 'tri') {
    const c = 180 - a - b, base = 200, hgt = (base * Math.tan(rad(a)) * Math.tan(rad(b))) / (Math.tan(rad(a)) + Math.tan(rad(b))), tx = 50 + hgt / Math.tan(rad(a)), k = Math.min(1, 150 / hgt);
    const ax = 50, bx = 50 + base * k, ty = 190 - hgt * k, txx = 50 + (tx - 50) * k;
    art = <><path d={`M${ax} 190 L${bx} 190 L${txx} ${ty} Z`} fill={C.brand} fillOpacity="0.1" stroke={INK} strokeWidth="2" /><line x1={bx} x2={bx + 60} y1="190" y2="190" stroke={INK} strokeWidth="2" strokeDasharray="5 4" />{T(ax + 26, 182, `${a}°`, C.brand)}{T(bx - 26, 182, `${b}°`, C.ok)}{T(txx, ty + 26, `${c}°`, C.brand2)}{T(bx + 34, 182, `${a + c}°`, C.gold)}</>;
    controls = <><Slider label="left angle =" value={a} min={30} max={90} step={5} onChange={A} show={`${a}°`} /><Slider label="right angle =" value={b} min={30} max={70} step={5} onChange={B} show={`${b}°`} /></>;
    read = `${a}° + ${b}° + ${c}° = 180° · the outside (gold) angle = the two far inside angles: ${a}° + ${c}° = ${a + c}°`;
  } else if (mode === 'box') {
    const cell = (x: number, y: number, w: number, h: number, t: string, tone: Tone) => <g><rect x={x} y={y} width={w} height={h} fill={C[tone]} fillOpacity="0.2" stroke={C[tone]} strokeWidth="2" />{T(x + w / 2, y + h / 2 + 4, t)}</g>;
    art = <>{cell(80, 50, 100, 100, 'x²', 'brand')}{cell(180, 50, 16 * a + 12, 100, `${a}x`, 'gold')}{cell(80, 150, 100, 12 * b + 10, `${b}x`, 'gold')}{cell(180, 150, 16 * a + 12, 12 * b + 10, `${a * b}`, 'ok')}{T(130, 40, 'x')}{T(186 + 8 * a, 40, `${a}`)}{T(66, 104, 'x')}{T(66, 160 + 6 * b, `${b}`)}</>;
    controls = <><Slider label="p =" value={a} min={1} max={6} onChange={A} /><Slider label="q =" value={b} min={1} max={6} onChange={B} /></>;
    read = <RichText text={`$(x + ${a})(x + ${b}) = x^2 + ${a + b}x + ${a * b}$ · the middle number is the sum, the last is the product`} />;
  } else if (mode === 'cyl') {
    const rx = a * 18, h = b * 22, top = 200 - h;
    art = <><path d={`M${160 - rx} ${top} V200 A${rx} ${rx / 3} 0 0 0 ${160 + rx} 200 V${top}`} fill={C.brand} fillOpacity="0.15" stroke={INK} strokeWidth="2" /><ellipse cx="160" cy={top} rx={rx} ry={rx / 3} fill={C.brand} fillOpacity="0.25" stroke={INK} strokeWidth="2" /><line x1="160" x2={160 + rx} y1={top} y2={top} stroke={C.gold} strokeWidth="2.5" />{T(160 + rx / 2, top - 6, `r = ${a}`, C.gold, 11)}{T(160 + rx + 26, 200 - h / 2, `h = ${b}`, C.ok, 11)}</>;
    controls = <><Slider label="radius r =" value={a} min={1} max={4} onChange={A} /><Slider label="height h =" value={b} min={1} max={6} onChange={B} /></>;
    read = <RichText text={`$V = \\pi r^2 h = \\pi \\cdot ${a}^2 \\cdot ${b} = ${a * a * b}\\pi$ · doubling $r$ multiplies the volume by 4; doubling $h$ only by 2`} />;
  } else {
    art = <><path d="M30 190 H130 V90 Z" fill={C.brand} fillOpacity="0.12" stroke={INK} strokeWidth="2" />{T(80, 208, '1')}{T(142, 144, '1')}{T(66, 132, '√2', C.brand)}{T(52, 184, '45°', C.gold, 10)}{T(118, 118, '45°', C.gold, 10)}
      <path d="M180 190 H290 V126.5 Z" fill={C.ok} fillOpacity="0.12" stroke={INK} strokeWidth="2" />{T(235, 208, '√3')}{T(300, 162, '1')}{T(226, 148, '2', C.ok)}{T(212, 185, '30°', C.gold, 10)}{T(279, 146, '60°', C.gold, 10)}</>;
    read = <RichText text={`45-45-90: sides $1 : 1 : \\sqrt{2}$ · 30-60-90: sides $1 : \\sqrt{3} : 2$ (shortest side faces the 30° angle)`} />;
  }
  return <div className="space-y-3"><svg viewBox="0 0 320 224" className="mx-auto w-full max-w-sm" role="img" aria-label={`Interactive figure: ${mode}`}>{art}</svg><div className="mx-auto max-w-md space-y-2">{controls}</div><Readout>{read}</Readout></div>;
}

export function VisualView({ v }: { v: Visual }) {
  switch (v.kind) {
    case 'sentence': return <Sentence segs={v.segs} lift={v.lift} liftLabel={v.liftLabel} />;
    case 'flow': return <Flow nodes={v.nodes} />;
    case 'plot': return <Plot mode={v.mode} />;
    case 'steps': return <Steps lines={v.lines} />;
    case 'compare': return <Compare bad={v.bad} good={v.good} badLabel={v.badLabel} goodLabel={v.goodLabel} />;
    case 'tiles': return <Tiles items={v.items} />;
    case 'meter': return <Meter left={v.left} right={v.right} words={v.words} zone={v.zone} />;
    case 'numline': return <NumLine center={v.center} />;
    case 'tape': return <Tape a={v.a} b={v.b} names={v.names} />;
    case 'percent': return <Percent />;
    case 'dots': return <Dots values={v.values} outlier={v.outlier} />;
    case 'spread': return <Spread />;
    case 'table': return <TableViews {...v} />;
    case 'sample': return <Sample />;
    case 'shape': return <Shape mode={v.mode} />;
  }
}
