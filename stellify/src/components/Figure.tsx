import type { Figure as Fig } from '@/lib/types';
import { RichText } from './RichText';

const COLORS = ['rgb(var(--brand))', 'rgb(var(--brand2))', 'rgb(var(--ok))', 'rgb(var(--warn))'];
const niceMax = (m: number) => { const p = Math.pow(10, Math.floor(Math.log10(m || 1))); return Math.ceil(m / p / (m / p <= 2 ? 0.5 : m / p <= 5 ? 1 : 2)) * p * (m / p <= 2 ? 0.5 : m / p <= 5 ? 1 : 2); };

/** Accessible tables and simple SVG charts for data questions. */
export function Figure({ figure }: { figure: Fig }) {
  if (figure.kind === 'table') {
    return (
      <figure className="my-3 overflow-x-auto">
        {figure.title && <figcaption className="mb-1.5 text-center text-sm font-semibold">{figure.title}</figcaption>}
        <table className="mx-auto min-w-[60%] border-collapse text-sm">
          <thead><tr>{figure.headers.map((h, i) => <th key={i} scope="col" className="border border-line bg-raised px-3 py-1.5 text-center font-semibold"><RichText text={h} /></th>)}</tr></thead>
          <tbody>{figure.rows.map((row, r) => <tr key={r}>{row.map((c, i) => <td key={i} className={`border border-line px-3 py-1.5 ${i === 0 && typeof c === 'string' && !c.startsWith('$') ? 'text-left font-medium' : 'text-center'}`}><RichText text={String(c)} /></td>)}</tr>)}</tbody>
        </table>
        {figure.note && <p className="mt-1 text-center text-xs text-muted">{figure.note}</p>}
      </figure>
    );
  }
  const W = 460, H = 250, L = 46, R = 12, T = 14, B = 44;
  const pw = W - L - R, ph = H - T - B;
  const axis = (yMax: number, yMin = 0) => {
    const ticks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
    return ticks.map((t) => { const y = T + ph - ((t - yMin) / (yMax - yMin)) * ph; return <g key={t}><line x1={L} x2={W - R} y1={y} y2={y} stroke="rgb(var(--line))" strokeDasharray={t === yMin ? undefined : '3 4'} /><text x={L - 6} y={y + 4} textAnchor="end" fontSize="11" fill="rgb(var(--muted))">{Math.round(t * 100) / 100}</text></g>; });
  };
  const frame = (children: React.ReactNode, desc: string, legend?: string[]) => (
    <figure className="my-3">
      {figure.title && <figcaption className="mb-1 text-center text-sm font-semibold">{figure.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-lg" role="img" aria-label={desc}>
        {children}
        {'yLabel' in figure && figure.yLabel && <text transform={`translate(12 ${T + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="rgb(var(--muted))">{figure.yLabel}</text>}
        {'xLabel' in figure && figure.xLabel && <text x={L + pw / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="rgb(var(--muted))">{figure.xLabel}</text>}
      </svg>
      {legend && legend.length > 1 && <div className="mt-1 flex justify-center gap-4 text-xs text-muted">{legend.map((n, i) => <span key={n} className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % 4] }} />{n}</span>)}</div>}
    </figure>
  );
  if (figure.kind === 'bar') {
    const max = niceMax(Math.max(...figure.series.flatMap((s) => s.values)));
    const gw = pw / figure.categories.length, bw = Math.min(34, (gw - 14) / figure.series.length);
    const desc = `Bar chart. ${figure.categories.map((c, i) => `${c}: ${figure.series.map((s) => `${s.name} ${s.values[i]}`).join(', ')}`).join('. ')}`;
    return frame(<>
      {axis(max)}
      {figure.categories.map((c, i) => <g key={c}>
        {figure.series.map((s, j) => { const h = (s.values[i] / max) * ph; const x = L + gw * i + (gw - bw * figure.series.length) / 2 + bw * j; return <g key={s.name}><rect x={x} y={T + ph - h} width={bw - 2} height={h} rx="3" fill={COLORS[j % 4]} /><text x={x + (bw - 2) / 2} y={T + ph - h - 4} textAnchor="middle" fontSize="10" fill="rgb(var(--ink))">{s.values[i]}</text></g>; })}
        <text x={L + gw * i + gw / 2} y={T + ph + 15} textAnchor="middle" fontSize="11" fill="rgb(var(--muted))">{c}</text>
      </g>)}
    </>, desc, figure.series.map((s) => s.name));
  }
  if (figure.kind === 'line') {
    const all = figure.series.flatMap((s) => s.values), max = niceMax(Math.max(...all));
    const X = (i: number) => L + (pw * i) / Math.max(1, figure.x.length - 1), Y = (v: number) => T + ph - (v / max) * ph;
    return frame(<>
      {axis(max)}
      {figure.x.map((x, i) => <text key={i} x={X(i)} y={T + ph + 15} textAnchor="middle" fontSize="11" fill="rgb(var(--muted))">{x}</text>)}
      {figure.series.map((s, j) => <g key={s.name}><polyline fill="none" stroke={COLORS[j % 4]} strokeWidth="2.5" points={s.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} />{s.values.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r="3.5" fill={COLORS[j % 4]} />)}</g>)}
    </>, `Line chart. ${figure.series.map((s) => `${s.name}: ${s.values.join(', ')}`).join('. ')}`, figure.series.map((s) => s.name));
  }
  const xs = figure.points.map((p) => p[0]), ys = figure.points.map((p) => p[1]);
  const xMax = niceMax(Math.max(...xs)), yMax = niceMax(Math.max(...ys));
  const X = (v: number) => L + (v / xMax) * pw, Y = (v: number) => T + ph - (v / yMax) * ph;
  return frame(<>
    {axis(yMax)}
    {Array.from({ length: 5 }, (_, i) => (xMax * i) / 4).map((t) => <text key={t} x={X(t)} y={T + ph + 15} textAnchor="middle" fontSize="11" fill="rgb(var(--muted))">{Math.round(t * 100) / 100}</text>)}
    {figure.fit && <line x1={X(0)} y1={Y(figure.fit.b)} x2={X(xMax)} y2={Y(figure.fit.m * xMax + figure.fit.b)} stroke="rgb(var(--brand))" strokeWidth="2" />}
    {figure.points.map((p, i) => <circle key={i} cx={X(p[0])} cy={Y(p[1])} r="4" fill="rgb(var(--brand2))" />)}
  </>, `Scatterplot with ${figure.points.length} points.`);
}
