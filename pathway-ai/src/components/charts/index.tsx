import { useId, useMemo } from 'react';

/* ==========================================================================
   Hand-rolled SVG charts.
   Every chart is labelled, has an accessible text alternative, and uses the
   token series colours so light and dark both work.
   ========================================================================== */

const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)'];

/* ------------------------------------------------------------ Progress ring */

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  label,
  sublabel,
  tone = 'var(--accent)',
  ariaLabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  tone?: string;
  ariaLabel?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={ariaLabel ?? `${Math.round(clamped)} percent`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-inset)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset var(--dur-5) var(--ease-out)' }}
        />
      </svg>
      {label ? (
        <div className="absolute col center items-center" style={{ inset: 0 }} aria-hidden="true">
          <span className="w-700 mono" style={{ fontSize: size / 4 }}>
            {label}
          </span>
          {sublabel ? <span className="t-2xs faint">{sublabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Sparkline */

export function LineChart({
  series,
  height = 180,
  yMin,
  yMax,
  yLabel,
  xLabels,
  ariaLabel,
  showDots = true,
}: {
  series: { name: string; points: { x: number; y: number }[] }[];
  height?: number;
  yMin?: number;
  yMax?: number;
  yLabel?: string;
  xLabels?: string[];
  ariaLabel: string;
  showDots?: boolean;
}) {
  const id = useId();
  const all = series.flatMap((s) => s.points);
  if (!all.length) return <p className="t-sm subtle">No data yet.</p>;

  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const width = 640;
  const minY = yMin ?? Math.min(...all.map((p) => p.y));
  const maxY = yMax ?? Math.max(...all.map((p) => p.y));
  const spanY = maxY - minY || 1;
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const spanX = maxX - minX || 1;

  const sx = (x: number) => padL + ((x - minX) / spanX) * (width - padL - padR);
  const sy = (y: number) => padT + (1 - (y - minY) / spanY) * (height - padT - padB);

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => minY + (spanY * i) / ticks);

  return (
    <figure className="col g-2">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-labelledby={id}>
        <title id={id}>{ariaLabel}</title>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={width - padR} y1={sy(t)} y2={sy(t)} stroke="var(--grid)" strokeWidth="1" />
            <text x={padL - 8} y={sy(t) + 4} textAnchor="end" fontSize="10" fill="var(--text-faint)" className="mono">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {series.map((s, si) => {
          const d = s.points
            .slice()
            .sort((a, b) => a.x - b.x)
            .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
            .join(' ');
          return (
            <g key={s.name}>
              <path
                d={d}
                fill="none"
                stroke={SERIES[si % SERIES.length]}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {showDots
                ? s.points.map((p, i) => (
                    <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3.5" fill="var(--surface)" stroke={SERIES[si % SERIES.length]} strokeWidth="2" />
                  ))
                : null}
            </g>
          );
        })}
        {xLabels?.map((l, i) => {
          const step = (width - padL - padR) / Math.max(1, xLabels.length - 1);
          return (
            <text key={i} x={padL + step * i} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--text-faint)">
              {l}
            </text>
          );
        })}
      </svg>
      {yLabel ? <figcaption className="t-2xs faint ta-center">{yLabel}</figcaption> : null}
    </figure>
  );
}

/* ----------------------------------------------------------------- Bar chart */

export function BarChart({
  data,
  ariaLabel,
  maxValue,
  unit = '%',
  height = 8,
  format,
}: {
  data: { label: string; value: number; tone?: string; note?: string }[];
  ariaLabel: string;
  maxValue?: number;
  unit?: string;
  height?: number;
  /** Overrides the default `round(value) + unit` readout — currency, time, etc. */
  format?: (value: number) => string;
}) {
  const max = maxValue ?? (format ? Math.max(...data.map((d) => d.value), 1) : Math.max(100, ...data.map((d) => d.value)));
  return (
    <div className="col g-3" role="img" aria-label={ariaLabel}>
      {data.map((d) => (
        <div key={d.label} className="col g-1">
          <div className="row between t-xs">
            <span className="w-500">{d.label}</span>
            <span className="mono subtle">{format ? format(d.value) : `${Math.round(d.value)}${unit}`}</span>
          </div>
          <div className="bar" style={{ height }}>
            <div
              className="bar-fill"
              style={{ width: `${(d.value / max) * 100}%`, background: d.tone ?? 'var(--accent)' }}
            />
          </div>
          {d.note ? <span className="t-2xs faint">{d.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- Radar chart */

export function RadarChart({
  axes,
  size = 240,
  ariaLabel,
}: {
  axes: { label: string; value: number }[];
  size?: number;
  ariaLabel: string;
}) {
  const id = useId();
  const center = size / 2;
  const radius = center - 42;
  const count = axes.length;
  const points = useMemo(
    () =>
      axes.map((a, i) => {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const r = (Math.max(0, Math.min(100, a.value)) / 100) * radius;
        return { x: center + Math.cos(angle) * r, y: center + Math.sin(angle) * r, angle, label: a.label, value: a.value };
      }),
    [axes, center, count, radius],
  );
  if (count < 3) return <p className="t-sm subtle">Need at least three dimensions to chart.</p>;

  const polygon = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <figure className="col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-labelledby={id}>
        <title id={id}>{ariaLabel}</title>
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={axes
              .map((_, i) => {
                const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
                return `${(center + Math.cos(angle) * radius * scale).toFixed(1)},${(center + Math.sin(angle) * radius * scale).toFixed(1)}`;
              })
              .join(' ')}
            fill="none"
            stroke="var(--grid)"
            strokeWidth="1"
          />
        ))}
        {axes.map((_, i) => {
          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + Math.cos(angle) * radius}
              y2={center + Math.sin(angle) * radius}
              stroke="var(--grid)"
              strokeWidth="1"
            />
          );
        })}
        <polygon points={polygon} fill="color-mix(in srgb, var(--accent) 22%, transparent)" stroke="var(--accent)" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />
        ))}
        {points.map((p, i) => {
          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
          const lx = center + Math.cos(angle) * (radius + 20);
          const ly = center + Math.sin(angle) * (radius + 20);
          return (
            <text
              key={i}
              x={lx}
              y={ly}
              textAnchor={Math.abs(Math.cos(angle)) < 0.2 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end'}
              dominantBaseline="middle"
              fontSize="9.5"
              fill="var(--text-subtle)"
            >
              {p.label.length > 16 ? `${p.label.slice(0, 15)}…` : p.label}
            </text>
          );
        })}
      </svg>
    </figure>
  );
}

/* --------------------------------------------------------------- Scatter map */

export interface ScatterPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  tone?: string;
  size?: number;
}

export function ScatterChart({
  points,
  xLabel,
  yLabel,
  ariaLabel,
  height = 420,
  onSelect,
  selectedId,
}: {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  ariaLabel: string;
  height?: number;
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  const id = useId();
  const width = 680;
  const pad = { l: 52, r: 18, t: 18, b: 44 };
  if (!points.length) return <p className="t-sm subtle">No colleges to plot with the current filters.</p>;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sx = (x: number) => pad.l + ((x - minX) / (maxX - minX || 1)) * (width - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - minY) / (maxY - minY || 1)) * (height - pad.t - pad.b);

  return (
    <figure className="col g-2">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-labelledby={id}>
        <title id={id}>{ariaLabel}</title>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={`h${f}`}
            x1={pad.l}
            x2={width - pad.r}
            y1={pad.t + f * (height - pad.t - pad.b)}
            y2={pad.t + f * (height - pad.t - pad.b)}
            stroke="var(--grid)"
          />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={`v${f}`}
            y1={pad.t}
            y2={height - pad.b}
            x1={pad.l + f * (width - pad.l - pad.r)}
            x2={pad.l + f * (width - pad.l - pad.r)}
            stroke="var(--grid)"
          />
        ))}
        {points.map((p) => {
          const selected = p.id === selectedId;
          return (
            <g key={p.id} transform={`translate(${sx(p.x)},${sy(p.y)})`}>
              <circle
                r={selected ? (p.size ?? 7) + 3 : p.size ?? 7}
                fill={p.tone ?? 'var(--accent)'}
                fillOpacity={selected ? 0.95 : 0.7}
                stroke="var(--surface)"
                strokeWidth="1.5"
                style={{ cursor: onSelect ? 'pointer' : undefined }}
                onClick={() => onSelect?.(p.id)}
                tabIndex={onSelect ? 0 : undefined}
                role={onSelect ? 'button' : undefined}
                aria-label={`${p.label}: ${xLabel} ${Math.round(p.x)}, ${yLabel} ${Math.round(p.y)}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(p.id);
                  }
                }}
              />
              {selected ? (
                <text y={-14} textAnchor="middle" fontSize="11" fontWeight="650" fill="var(--text)">
                  {p.label}
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={(width + pad.l) / 2} y={height - 10} textAnchor="middle" fontSize="11" fill="var(--text-subtle)">
          {xLabel} →
        </text>
        <text
          x={-(height - pad.b) / 2}
          y={14}
          textAnchor="middle"
          fontSize="11"
          fill="var(--text-subtle)"
          transform="rotate(-90)"
        >
          {yLabel} →
        </text>
      </svg>
    </figure>
  );
}

/* --------------------------------------------------------------- Mini spark */

export function Sparkline({ values, width = 90, height = 26, tone = 'var(--accent)' }: { values: number[]; width?: number; height?: number; tone?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (values.length - 1)) * width).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <path d={d} fill="none" stroke={tone} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export { SERIES };
