import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { GraphDemo } from '@/data/desmos';
import { affineInY, expFit, findExtrema, findRoots, fmt, linearFit, parseRelation, quadFit, type Relation } from '@/lib/mathexpr';

const COLORS = ['#8B6EFF', '#38A0FF', '#34D399', '#FBBF24'];
const W = 560, H = 400, PAD = 34;
type Curve = { i: number; f: (x: number) => number; domain?: [number, number]; op: string };
type Poi = { x: number; y: number; kind: string };

const niceStep = (span: number) => { const raw = span / 8, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p; };

/**
 * A Desmos-style graphing surface built for the lessons: explicit and implicit equations,
 * inequalities, sliders, restrictions, tables, regression, and clickable points of interest
 * (intersections, zeros, maximums and minimums). No network access needed.
 */
export function Grapher({ demo, editable = true }: { demo: GraphDemo; editable?: boolean }) {
  const [exprs, setExprs] = useState(demo.exprs);
  const [vals, setVals] = useState<Record<string, number>>(Object.fromEntries((demo.sliders ?? []).map((s) => [s.name, s.value])));
  const [view, setView] = useState(demo.view);
  const [fit, setFit] = useState(demo.regression ?? 'linear');
  const [picked, setPicked] = useState<number | null>(null);
  const [xmin, xmax, ymin, ymax] = view;
  const X = (x: number) => PAD + ((x - xmin) / (xmax - xmin)) * (W - PAD - 8);
  const Y = (y: number) => H - PAD - ((y - ymin) / (ymax - ymin)) * (H - PAD - 8);

  const model = useMemo(() => {
    const parsed: ({ rel: Relation } | { err: string })[] = exprs.map((e) => { if (!e.trim()) return { err: '' }; try { return { rel: parseRelation(e) }; } catch (er) { return { err: (er as Error).message }; } });
    const curves: Curve[] = [];
    const implicit: { i: number; F: (x: number, y: number) => number }[] = [];
    const verticals: { i: number; c: number }[] = [];
    parsed.forEach((p, i) => {
      if (!('rel' in p)) return;
      const r = p.rel;
      if (r.kind === 'explicit') curves.push({ i, f: (x) => r.f(x, vals), domain: r.domain, op: r.op });
      else if (r.kind === 'vertical') verticals.push({ i, c: r.c(vals) });
      else { const F = (x: number, y: number) => r.F(x, y, vals); const g = affineInY(F); if (g) curves.push({ i, f: g, op: '=' }); else implicit.push({ i, F }); }
    });
    const inDom = (c: Curve, x: number) => !c.domain || (x >= c.domain[0] && x <= c.domain[1]);
    const pois: Poi[] = [];
    const add = (x: number, y: number, kind: string) => { if (Number.isFinite(y) && y >= ymin && y <= ymax && !pois.some((p) => Math.abs(p.x - x) < (xmax - xmin) / 300 && Math.abs(p.y - y) < (ymax - ymin) / 300)) pois.push({ x, y, kind }); };
    const show = demo.show ?? [];
    for (const c of curves) {
      if (c.op !== '=') continue;
      if (show.includes('roots')) for (const x of findRoots(c.f, xmin, xmax)) if (inDom(c, x)) add(x, 0, 'Zero');
      if (show.includes('extrema')) for (const x of findExtrema(c.f, xmin, xmax)) if (inDom(c, x)) add(x, c.f(x), 'Maximum / minimum');
      if (show.includes('yint') && xmin <= 0 && xmax >= 0) add(0, c.f(0), 'y-intercept');
    }
    if (show.includes('intersections')) {
      for (let a = 0; a < curves.length; a++) for (let b = a + 1; b < curves.length; b++) for (const x of findRoots((t) => curves[a].f(t) - curves[b].f(t), xmin, xmax)) if (inDom(curves[a], x) && inDom(curves[b], x)) add(x, curves[a].f(x), 'Intersection');
      for (const im of implicit) for (const c of curves) for (const x of findRoots((t) => im.F(t, c.f(t)), xmin, xmax, 3000)) add(x, c.f(x), 'Intersection');
      for (const v of verticals) for (const c of curves) add(v.c, c.f(v.c), 'Intersection');
    }
    return { parsed, curves, implicit, verticals, pois: pois.sort((p, q) => p.x - q.x) };
  }, [exprs, vals, xmin, xmax, ymin, ymax, demo.show]);

  const paths = model.curves.map((c) => {
    const N = 480; let d = ''; let pen = false; let prev = NaN;
    for (let k = 0; k <= N; k++) {
      const x = xmin + ((xmax - xmin) * k) / N, y = c.f(x);
      const ok = Number.isFinite(y) && (!c.domain || (x >= c.domain[0] && x <= c.domain[1])) && Math.abs(y - prev) < (ymax - ymin) * 4 || (Number.isFinite(y) && !pen && (!c.domain || (x >= c.domain[0] && x <= c.domain[1])));
      if (ok && y > ymin - (ymax - ymin) * 3 && y < ymax + (ymax - ymin) * 3) { d += `${pen ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`; pen = true; } else pen = false;
      prev = y;
    }
    return { c, d };
  });
  const segs = model.implicit.map((im) => {
    const n = 90; let d = '';
    const gx = (i: number) => xmin + ((xmax - xmin) * i) / n, gy = (j: number) => ymin + ((ymax - ymin) * j) / n;
    const v: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => im.F(gx(i), gy(j))));
    const lerp = (a: number, b: number, fa: number, fb: number) => a + ((b - a) * fa) / (fa - fb);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const c = [v[i][j], v[i + 1][j], v[i + 1][j + 1], v[i][j + 1]];
      if (!c.every(Number.isFinite)) continue;
      const pts: [number, number][] = [];
      if (c[0] * c[1] < 0) pts.push([lerp(gx(i), gx(i + 1), c[0], c[1]), gy(j)]);
      if (c[1] * c[2] < 0) pts.push([gx(i + 1), lerp(gy(j), gy(j + 1), c[1], c[2])]);
      if (c[3] * c[2] < 0) pts.push([lerp(gx(i), gx(i + 1), c[3], c[2]), gy(j + 1)]);
      if (c[0] * c[3] < 0) pts.push([gx(i), lerp(gy(j), gy(j + 1), c[0], c[3])]);
      for (let k = 0; k + 1 < pts.length; k += 2) d += `M${X(pts[k][0]).toFixed(1)} ${Y(pts[k][1]).toFixed(1)}L${X(pts[k + 1][0]).toFixed(1)} ${Y(pts[k + 1][1]).toFixed(1)}`;
    }
    return { i: im.i, d };
  });
  const reg = demo.table && demo.regression ? (fit === 'linear' ? linearFit(demo.table) : fit === 'quadratic' ? quadFit(demo.table) : expFit(demo.table)) : null;
  const regPath = reg ? Array.from({ length: 201 }, (_, k) => { const x = xmin + ((xmax - xmin) * k) / 200; return `${k ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(reg.f(x)).toFixed(1)}`; }).join('') : '';
  const sx = niceStep(xmax - xmin), sy = niceStep(ymax - ymin);
  const ticks = (lo: number, hi: number, step: number) => { const out: number[] = []; for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(Math.round(t / step) * step); return out; };
  const zoom = (k: number) => { const cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2; setView([cx - ((xmax - xmin) / 2) * k, cx + ((xmax - xmin) / 2) * k, cy - ((ymax - ymin) / 2) * k, cy + ((ymax - ymin) / 2) * k]); };
  const first = model.curves.find((c) => c.op === '=');
  const rows = demo.showTable && first ? ticks(Math.max(xmin, -4), Math.min(xmax, 6), 1).slice(0, 9) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_250px]">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Graph of ${exprs.filter(Boolean).join('; ') || 'data points'}. ${model.pois.map((p) => `${p.kind} at (${fmt(p.x)}, ${fmt(p.y)})`).join('. ')}`}>
          <defs><clipPath id="plot"><rect x={PAD} y={8} width={W - PAD - 8} height={H - PAD - 8} /></clipPath></defs>
          {ticks(xmin, xmax, sx).map((t) => <g key={`x${t}`}><line x1={X(t)} x2={X(t)} y1={8} y2={H - PAD} stroke="rgb(var(--line))" strokeWidth={t === 0 ? 0 : 1} opacity="0.7" /><text x={X(t)} y={H - PAD + 14} textAnchor="middle" fontSize="10" fill="rgb(var(--muted))">{fmt(t)}</text></g>)}
          {ticks(ymin, ymax, sy).map((t) => <g key={`y${t}`}><line y1={Y(t)} y2={Y(t)} x1={PAD} x2={W - 8} stroke="rgb(var(--line))" strokeWidth={t === 0 ? 0 : 1} opacity="0.7" /><text x={PAD - 5} y={Y(t) + 3} textAnchor="end" fontSize="10" fill="rgb(var(--muted))">{fmt(t)}</text></g>)}
          <g clipPath="url(#plot)">
            {ymin <= 0 && ymax >= 0 && <line x1={PAD} x2={W - 8} y1={Y(0)} y2={Y(0)} stroke="rgb(var(--ink))" strokeWidth="1.3" opacity="0.6" />}
            {xmin <= 0 && xmax >= 0 && <line y1={8} y2={H - PAD} x1={X(0)} x2={X(0)} stroke="rgb(var(--ink))" strokeWidth="1.3" opacity="0.6" />}
            {paths.filter((p) => p.c.op !== '=').map(({ c }) => {
              const above = c.op.startsWith('>'); let d = '';
              for (let k = 0; k <= 120; k++) { const x = xmin + ((xmax - xmin) * k) / 120; d += `${k ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(Math.max(ymin - 50, Math.min(ymax + 50, c.f(x)))).toFixed(1)}`; }
              d += `L${X(xmax)} ${above ? 8 : H - PAD}L${X(xmin)} ${above ? 8 : H - PAD}Z`;
              return <path key={`s${c.i}`} d={d} fill={COLORS[c.i % 4]} opacity="0.16" />;
            })}
            {paths.map(({ c, d }) => <path key={c.i} d={d} fill="none" stroke={COLORS[c.i % 4]} strokeWidth="2.6" strokeDasharray={c.op === '<' || c.op === '>' ? '7 6' : undefined} strokeLinejoin="round" />)}
            {segs.map((s) => <path key={`i${s.i}`} d={s.d} fill="none" stroke={COLORS[s.i % 4]} strokeWidth="2.6" strokeLinecap="round" />)}
            {model.verticals.map((v) => <line key={`v${v.i}`} x1={X(v.c)} x2={X(v.c)} y1={8} y2={H - PAD} stroke={COLORS[v.i % 4]} strokeWidth="2.6" />)}
            {reg && <path d={regPath} fill="none" stroke={COLORS[0]} strokeWidth="2.4" />}
            {demo.table?.map((p, i) => <circle key={`t${i}`} cx={X(p[0])} cy={Y(p[1])} r="5" fill="rgb(var(--ink))" stroke="rgb(var(--surface))" strokeWidth="1.5" />)}
          </g>
          {model.pois.map((p, i) => (
            <g key={i} tabIndex={0} role="button" aria-label={`${p.kind}: (${fmt(p.x)}, ${fmt(p.y)})`} onClick={() => setPicked(picked === i ? null : i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPicked(picked === i ? null : i); }} className="cursor-pointer outline-none">
              <circle cx={X(p.x)} cy={Y(p.y)} r="11" fill="transparent" />
              <circle cx={X(p.x)} cy={Y(p.y)} r={picked === i ? 6.5 : 5} fill={picked === i ? '#FDE047' : 'rgb(var(--muted))'} stroke="rgb(var(--surface))" strokeWidth="2" />
              {picked === i && <g><rect x={Math.min(X(p.x) + 8, W - 128)} y={Math.max(Y(p.y) - 30, 10)} width="120" height="22" rx="6" fill="rgb(var(--ink))" /><text x={Math.min(X(p.x) + 8, W - 128) + 60} y={Math.max(Y(p.y) - 30, 10) + 15} textAnchor="middle" fontSize="12" fontWeight="700" fill="rgb(var(--bg))">({fmt(p.x)}, {fmt(p.y)})</text></g>}
            </g>
          ))}
        </svg>
        <div className="flex items-center gap-1 border-t border-line px-2 py-1.5">
          <button className="btn-quiet !p-1.5" onClick={() => zoom(0.7)} aria-label="Zoom in"><Plus size={16} /></button>
          <button className="btn-quiet !p-1.5" onClick={() => zoom(1.4)} aria-label="Zoom out"><Minus size={16} /></button>
          <button className="btn-quiet !p-1.5" onClick={() => { setView(demo.view); setExprs(demo.exprs); setVals(Object.fromEntries((demo.sliders ?? []).map((s) => [s.name, s.value]))); }} aria-label="Reset graph"><RotateCcw size={15} /></button>
          <span className="ml-auto text-xs text-faint">Click a gray dot to read its coordinates</span>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        {exprs.map((e, i) => (
          <div key={i}>
            <div className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[i % 4] }} />
              <input className="input !py-1.5 font-mono text-[13px]" value={e} readOnly={!editable} onChange={(ev) => setExprs((x) => x.map((v, k) => (k === i ? ev.target.value : v)))} aria-label={`Expression ${i + 1}`} spellCheck={false} /></div>
            {'err' in model.parsed[i] && (model.parsed[i] as { err: string }).err && <p className="mt-0.5 pl-5 text-xs text-bad">{(model.parsed[i] as { err: string }).err}</p>}
          </div>
        ))}
        {editable && exprs.length < 4 && !demo.table && <button className="btn-ghost w-full !py-1.5" onClick={() => setExprs((x) => [...x, ''])}><Plus size={14} />Add expression</button>}
        {(demo.sliders ?? []).map((s) => (
          <div key={s.name}><label className="flex justify-between text-xs font-semibold" htmlFor={`sl-${s.name}`}><span>{s.name} = {fmt(vals[s.name])}</span><span className="text-faint">{s.min} to {s.max}</span></label>
            <input id={`sl-${s.name}`} type="range" min={s.min} max={s.max} step={s.step} value={vals[s.name]} onChange={(e) => setVals((v) => ({ ...v, [s.name]: Number(e.target.value) }))} className="w-full accent-[rgb(var(--brand))]" /></div>
        ))}
        {reg && (
          <div className="rounded-xl border border-line p-3">
            <div className="mb-1.5 flex flex-wrap gap-1.5">{(['linear', 'quadratic', 'exponential'] as const).map((t) => <button key={t} aria-pressed={fit === t} onClick={() => setFit(t)} className={`chip ${fit === t ? 'border-brand bg-brand/15 text-ink' : ''}`}>{t}</button>)}</div>
            <div className="font-mono text-[13px]">{reg.label}</div>
          </div>
        )}
        {model.pois.length > 0 && <div className="rounded-xl border border-line p-3"><div className="mb-1 text-xs font-bold uppercase tracking-wide text-faint">Points of interest</div><ul className="space-y-0.5">{model.pois.map((p, i) => <li key={i} className="flex justify-between gap-2"><span className="text-muted">{p.kind}</span><span className="font-mono">({fmt(p.x)}, {fmt(p.y)})</span></li>)}</ul></div>}
        {rows.length > 0 && first && <table className="w-full border-collapse text-center font-mono text-[13px]"><thead><tr><th className="border border-line bg-raised px-2 py-1">x</th><th className="border border-line bg-raised px-2 py-1">y</th>{demo.table && <th className="border border-line bg-raised px-2 py-1">data</th>}</tr></thead><tbody>{rows.map((x) => { const given = demo.table?.find((p) => p[0] === x); return <tr key={x}><td className="border border-line px-2 py-0.5">{fmt(x)}</td><td className="border border-line px-2 py-0.5">{fmt(first.f(x))}</td>{demo.table && <td className={`border border-line px-2 py-0.5 ${given ? (Math.abs(given[1] - first.f(x)) < 1e-6 ? 'text-ok' : 'text-bad') : ''}`}>{given ? given[1] : ''}</td>}</tr>; })}</tbody></table>}
      </div>
    </div>
  );
}
