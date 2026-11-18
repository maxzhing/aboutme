'use client';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, WifiOff } from 'lucide-react';
import { compile } from '@/lib/mathexpr';
import { Grapher } from './Grapher';
import { cn } from './ui';

/**
 * Calculators for practice and mock exams.
 *
 * Online, Stellify embeds Desmos's own College Board calculators (the graphing and scientific versions built
 * for the SAT) straight from desmos.com, so students learn the exact tool they will use in Bluebook. Desmos
 * is a separate service: it needs an internet connection, and nothing typed into it is seen or stored by
 * Stellify. Offline, or if Desmos cannot load, Stellify's own grapher and scientific calculator take over.
 */
export const DESMOS = {
  graphing: 'https://www.desmos.com/testing/collegeboard/graphing',
  scientific: 'https://www.desmos.com/testing/collegeboard/scientific',
} as const;
export type CalcKind = 'desmos-graphing' | 'desmos-scientific' | 'graphing' | 'scientific';
const TABS: { id: CalcKind; label: string; online: boolean }[] = [
  { id: 'desmos-graphing', label: 'Desmos graphing', online: true },
  { id: 'desmos-scientific', label: 'Desmos scientific', online: true },
  { id: 'graphing', label: 'Built-in grapher', online: false },
  { id: 'scientific', label: 'Built-in scientific', online: false },
];

export function useOnline() {
  const [on, setOn] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return on;
}

/** One embedded Desmos calculator, with an honest fallback when it cannot load. */
export function DesmosFrame({ kind, height = 460, onFail }: { kind: 'graphing' | 'scientific'; height?: number; onFail?: () => void }) {
  const online = useOnline();
  const [state, setState] = useState<'loading' | 'ready' | 'slow'>('loading');
  useEffect(() => {
    setState('loading');
    const t = setTimeout(() => setState((s) => (s === 'loading' ? 'slow' : s)), 12000);
    return () => clearTimeout(t);
  }, [kind]);
  if (!online) return <Offline onFail={onFail} />;
  return (
    <div className="space-y-1.5">
      <div className="relative overflow-hidden rounded-xl border border-line bg-white" style={{ height }}>
        {state !== 'ready' && <div className="absolute inset-0 grid place-items-center text-sm text-muted" aria-hidden>Loading Desmos…</div>}
        <iframe key={kind} title={kind === 'graphing' ? 'Desmos graphing calculator (College Board version)' : 'Desmos scientific calculator (College Board version)'} src={DESMOS[kind]}
          className="relative h-full w-full" onLoad={() => setState('ready')} allow="clipboard-write" referrerPolicy="no-referrer" data-testid={`desmos-${kind}`} />
      </div>
      {state === 'slow' && <p className="text-xs text-warn">Desmos is taking a long time to load. If it stays blank, use the built-in calculator{onFail && <> (<button className="underline" onClick={onFail}>switch now</button>)</>}.</p>}
      <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-faint">The {kind} calculator from desmos.com, the version built for the SAT. Needs internet; Stellify does not see what you type in it.
        <a className="inline-flex items-center gap-0.5 underline" href={DESMOS[kind]} target="_blank" rel="noopener noreferrer">Open in a new tab<ExternalLink size={11} /></a></p>
    </div>
  );
}
function Offline({ onFail }: { onFail?: () => void }) {
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/5 p-4 text-sm" role="status" data-testid="desmos-offline">
      <div className="flex items-center gap-2 font-semibold"><WifiOff size={16} className="text-warn" />You are offline, so Desmos cannot load.</div>
      <p className="mt-1 text-muted">Stellify&apos;s built-in grapher and scientific calculator work without a connection.</p>
      {onFail && <button className="btn-ghost mt-2 !py-1.5" onClick={onFail}>Use the built-in calculator</button>}
    </div>
  );
}

/** The calculator panel used in practice and mock exams: Desmos when online, the built-in tools otherwise. */
export function CalcPanel({ initial = 'desmos-graphing', height = 460 }: { initial?: CalcKind; height?: number }) {
  const online = useOnline();
  const [kind, setKind] = useState<CalcKind>(() => (online ? initial : initial === 'desmos-scientific' ? 'scientific' : 'graphing'));
  const fallback = () => setKind(kind === 'desmos-scientific' ? 'scientific' : 'graphing');
  return (
    <div className="space-y-2" data-testid="calc-tools">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Calculator">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={kind === t.id} onClick={() => setKind(t.id)} className={cn('chip !py-1 text-xs', kind === t.id && 'border-brand bg-brand/15 text-ink', t.online && !online && 'opacity-60')} title={t.online && !online ? 'Needs an internet connection' : undefined}>{t.label}</button>)}
      </div>
      {kind === 'desmos-graphing' && <DesmosFrame kind="graphing" height={height} onFail={fallback} />}
      {kind === 'desmos-scientific' && <DesmosFrame kind="scientific" height={height} onFail={fallback} />}
      {kind === 'graphing' && <><Grapher demo={{ exprs: ['y = x'], view: [-10, 10, -10, 10], show: ['intersections', 'roots', 'extrema'] }} /><p className="text-[11px] text-faint">Stellify&apos;s own grapher (works offline). On test day Bluebook has Desmos built in.</p></>}
      {kind === 'scientific' && <ScientificCalc />}
    </div>
  );
}

/** Wraps the argument of sin/cos/tan so the calculator can work in degrees. */
export function toRadians(src: string): string {
  let s = src, i = 0;
  const re = /(sin|cos|tan)\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const open = m.index + m[0].length - 1;
    let depth = 0, close = -1;
    for (let j = open; j < s.length; j++) { if (s[j] === '(') depth++; else if (s[j] === ')') { depth--; if (depth === 0) { close = j; break; } } }
    if (close < 0) break;
    const inner = s.slice(open + 1, close);
    s = `${s.slice(0, open + 1)}(pi/180)*(${inner})${s.slice(close)}`;
    re.lastIndex = open + 1;
    if (++i > 50) break;
  }
  return s;
}
/** Evaluates a scientific-calculator line. `ans` is the previous result. */
export function evaluateLine(line: string, ans: number, degrees: boolean): { value?: number; error?: string } {
  const src = line.trim().replace(/\bans\b/gi, `(${ans})`).replace(/√\(/g, 'sqrt(').replace(/√(\d+(?:\.\d+)?)/g, 'sqrt($1)');
  if (!src) return {};
  try {
    const c = compile(degrees ? toRadians(src) : src);
    if (c.vars.size) return { error: `Unknown name: ${[...c.vars].join(', ')}` };
    const v = c.fn({});
    if (!Number.isFinite(v)) return { error: 'Undefined (for example, division by zero)' };
    return { value: Math.abs(v) < 1e-12 ? 0 : v };
  } catch (e) { return { error: (e as Error).message || 'Check the expression' }; }
}
const show = (v: number) => (Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-6 && v !== 0) ? v.toExponential(6) : String(Math.round(v * 1e10) / 1e10));
const KEYS = ['7', '8', '9', '/', 'sqrt(', '4', '5', '6', '*', '^', '1', '2', '3', '-', '(', '0', '.', 'pi', '+', ')', 'sin(', 'cos(', 'tan(', 'ln(', 'log('];

/** A small, offline scientific calculator built on Stellify's expression parser. */
export function ScientificCalc() {
  const [line, setLine] = useState('');
  const [deg, setDeg] = useState(true);
  const [hist, setHist] = useState<{ q: string; a: string }[]>([]);
  const ans = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const preview = evaluateLine(line, ans.current, deg);
  const run = () => {
    const r = evaluateLine(line, ans.current, deg);
    if (r.value === undefined) return;
    ans.current = r.value;
    setHist((h) => [...h.slice(-7), { q: line, a: show(r.value!) }]);
    setLine('');
  };
  const press = (k: string) => { setLine((l) => l + k); input.current?.focus(); };
  return (
    <div className="rounded-xl border border-line p-3" data-testid="sci-calc">
      <div className="mb-2 min-h-[3rem] space-y-0.5 text-right font-mono text-xs text-muted" aria-live="polite">
        {hist.map((h, i) => <div key={i}><span className="text-faint">{h.q} =</span> <b className="text-ink">{h.a}</b></div>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex gap-2">
        <input ref={input} value={line} onChange={(e) => setLine(e.target.value)} aria-label="Expression" placeholder="e.g. 3^2 + sqrt(16)" className="input flex-1 font-mono" data-testid="sci-input" inputMode="decimal" autoComplete="off" />
        <button className="btn-primary !px-3" type="submit" data-testid="sci-equals">=</button>
      </form>
      <div className="mt-1 h-4 text-right font-mono text-xs" data-testid="sci-preview">{preview.value !== undefined ? <span className="text-muted">= {show(preview.value)}</span> : preview.error && line ? <span className="text-faint">{preview.error}</span> : null}</div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {KEYS.map((k) => <button key={k} type="button" className="btn-ghost !px-0 !py-1.5 font-mono text-sm" onClick={() => press(k)}>{k === 'sqrt(' ? '√' : k === 'pi' ? 'π' : k.replace('(', '')}</button>)}
        <button type="button" className="btn-ghost !px-0 !py-1.5 text-xs" onClick={() => press('ans')}>ans</button>
        <button type="button" className="btn-ghost !px-0 !py-1.5 text-xs" onClick={() => setLine((l) => l.slice(0, -1))} aria-label="Delete last character">⌫</button>
        <button type="button" className="btn-ghost !px-0 !py-1.5 text-xs" onClick={() => setLine('')}>clear</button>
        <button type="button" className={cn('btn-ghost col-span-2 !px-0 !py-1.5 text-xs', deg && 'border-brand')} aria-pressed={deg} onClick={() => setDeg(!deg)}>{deg ? 'Degrees' : 'Radians'}</button>
      </div>
      <p className="mt-2 text-[11px] text-faint">Works offline. Type with the keyboard or the keys; Enter evaluates. Trig uses {deg ? 'degrees' : 'radians'}.</p>
    </div>
  );
}
