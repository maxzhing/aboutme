'use client';
import { Check, Eye, Hand, Pause, Piano as PianoIcon, Play, RotateCcw, TriangleAlert, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ListenSpec, StaffSpec } from '@/lib/music/score';
import { listenOf } from '@/lib/music/score';
import { canPlay, playChord, playSeq, stopAll } from '@/lib/music/synth';
import { modelText, sortPitches, type MusicTask } from '@/lib/music/tasks';
import { checkSatb, midi, show, type Issue, type Satb } from '@/lib/music/theory';
import { keySigPositions, SatbPad, Staff, StaffPad } from './Staff';
import { RichText } from '@/components/RichText';
import { cn } from '@/components/ui';

/** A play button for an aural example. */
export function ListenButton({ spec, label = 'Listen', className, primary }: { spec: ListenSpec; label?: string; className?: string; primary?: boolean }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopAll(), []);
  if (!canPlay()) return <p className="text-xs text-muted">Sound is not available in this browser.</p>;
  return (
    <button type="button" className={cn(primary ? 'btn-primary' : 'btn-ghost !py-1.5 text-sm', className)} data-testid="listen"
      onClick={() => { if (playing) { stopAll(); setPlaying(false); return; } const secs = playSeq(spec.steps, spec); setPlaying(true); window.setTimeout(() => setPlaying(false), Math.max(400, secs * 1000)); }}>
      {playing ? <Pause size={15} /> : <Volume2 size={15} />}{playing ? 'Stop' : spec.label ?? label}
    </button>
  );
}

/** Notation with an optional play button. */
export function Score({ spec, listen, caption, play = true }: { spec: StaffSpec; listen?: ListenSpec; caption?: string; play?: boolean }) {
  const hasNotes = spec.events.some((e) => (e.notes?.length ?? 0) > 0 || e.satb);
  return (
    <figure className="space-y-2" data-testid="score">
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface px-2 py-1"><Staff {...spec} maxWidth={760} /></div>
      {(caption || (play && hasNotes)) && (
        <figcaption className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {play && hasNotes && <ListenButton spec={listen ?? listenOf(spec)} label="Play it" />}
          {caption && <span className="leading-relaxed"><RichText text={caption} /></span>}
        </figcaption>
      )}
    </figure>
  );
}

const WHITE = [0, 2, 4, 5, 7, 9, 11];
const NAMES = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
/** A playable piano keyboard. Highlighted keys show a scale or chord; click a key to hear it. */
export function Keyboard({ from = 48, octaves = 2, highlight = [], onKey, labels = true, label = 'Piano keyboard' }: { from?: number; octaves?: number; highlight?: (string | number)[]; onKey?: (midi: number) => void; labels?: boolean; label?: string }) {
  const hi = new Set(highlight.map((h) => (typeof h === 'number' ? h : midi(h))));
  const [down, setDown] = useState<number | null>(null);
  const whites: number[] = [], blacks: number[] = [];
  for (let m = from; m < from + 12 * octaves + 1; m++) (WHITE.includes(((m % 12) + 12) % 12) ? whites : blacks).push(m);
  const W = 30, H = 120;
  const xOf = (m: number) => whites.indexOf(m) * W;
  const press = (m: number) => { playChord([m], 1.1); setDown(m); window.setTimeout(() => setDown(null), 220); onKey?.(m); };
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${whites.length * W + 1} ${H + 2}`} className="block h-auto w-full max-w-[640px] select-none" role="group" aria-label={label}>
        {whites.map((m) => (
          <g key={m}>
            <rect x={xOf(m) + 0.5} y={0.5} width={W - 1} height={H} rx={4} fill={down === m ? 'rgb(var(--accent) / .45)' : hi.has(m) ? 'rgb(var(--accent) / .28)' : '#fff'} stroke="rgb(var(--line))" className="cursor-pointer" onClick={() => press(m)} role="button" tabIndex={0} aria-label={`${NAMES[m % 12]}${Math.floor(m / 12) - 1}${hi.has(m) ? ', highlighted' : ''}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(m); } }} />
            {labels && <text x={xOf(m) + W / 2} y={H - 9} textAnchor="middle" fontSize={11} fontWeight={hi.has(m) ? 700 : 500} fill={hi.has(m) ? 'rgb(var(--ink))' : '#64748b'} pointerEvents="none">{NAMES[m % 12]}{m % 12 === 0 ? Math.floor(m / 12) - 1 : ''}</text>}
          </g>
        ))}
        {blacks.map((m) => { const x = xOf(m - 1) + W * 0.68; return (
          <rect key={m} x={x} y={0.5} width={W * 0.64} height={H * 0.62} rx={3} fill={down === m ? 'rgb(var(--accent))' : hi.has(m) ? 'rgb(var(--accent))' : '#1e2233'} stroke={hi.has(m) ? 'rgb(var(--ink))' : 'none'} className="cursor-pointer" onClick={() => press(m)} role="button" tabIndex={0} aria-label={`${NAMES[m % 12]}${Math.floor(m / 12) - 1}${hi.has(m) ? ', highlighted' : ''}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(m); } }} />
        ); })}
      </svg>
    </div>
  );
}

/** A hands-on task: write on the staff, then check. Calls onDone once with the first result. */
export function TaskView({ task, onDone, practice = false, quiet = false }: { task: MusicTask; onDone?: (ok: boolean) => void; practice?: boolean; /** hide the success box (the parent shows its own) */ quiet?: boolean }) {
  const [v, setV] = useState<string[]>([]);
  const [sv, setSv] = useState<Satb[]>([]);
  const [res, setRes] = useState<null | { ok: boolean; msg?: string; issues?: Issue[] }>(null);
  const [first, setFirst] = useState(true);
  const [show, setShow] = useState(false);
  const warns = useMemo(() => (task.kind === 'satb' && res ? checkSatb(task.romans.map((_, i) => ({ ...(task.given?.[i] ?? {}), ...(sv[i] ?? {}) })), task.key, task.romans).filter((x) => x.level === 'warn') : []), [task, sv, res]);
  const check = () => {
    let r: { ok: boolean; msg?: string; issues?: Issue[] };
    if (task.kind === 'satb') { const issues = task.grade(sv); r = { ok: !issues.length, issues }; }
    else { const msg = task.grade(task.kind === 'chord' ? v : v); r = { ok: msg === null, msg: msg ?? undefined }; }
    setRes(r);
    if (first) { setFirst(false); onDone?.(r.ok); }
  };
  const hearIt = () => {
    if (task.kind === 'satb') playSeq(task.romans.map((_, i) => { const c = { ...(task.given?.[i] ?? {}), ...(sv[i] ?? {}) }; return (['B', 'T', 'A', 'S'] as const).map((x) => c[x]).filter((x): x is string => !!x); }), { tempo: 60, beats: task.romans.map(() => 1.5) });
    else if (task.kind === 'chord') playSeq([sortPitches([...(task.given ?? []), ...v])], { arpeggiate: true, beats: [2] });
    else if (task.kind === 'line') playSeq(v.filter(Boolean), { tempo: 120 });
  };
  const flagged = res?.issues ? [...new Set(res.issues.flatMap((x) => [x.at, ...(x.to !== undefined ? [x.to] : [])]))] : [];
  const reset = () => { setRes(null); };
  const locked = !!res?.ok;
  return (
    <div className="space-y-3" data-testid="music-task">
      {task.kind === 'chord' && <StaffPad clef={task.clef} mode="chord" value={v} onChange={(x) => { setV(x); reset(); }} given={task.given} maxNotes={task.maxNotes} disabled={locked} label="Write your answer on this staff" />}
      {task.kind === 'line' && <StaffPad clef={task.clef} mode="line" slots={task.slots} fifths={task.fifths} value={v} onChange={(x) => { setV(x); reset(); }} disabled={locked} label="Write one note in each slot, left to right" />}
      {task.kind === 'keysig' && <StaffPad clef={task.clef} mode="keysig" slots={Math.max(7, task.model.length)} sigAcc={task.fifths >= 0 ? 1 : -1} value={v} onChange={(x) => { setV(x); reset(); }} disabled={locked} label={`Write the key signature: click where each ${task.fifths >= 0 ? 'sharp' : 'flat'} goes, in order`} />}
      {task.kind === 'satb' && <SatbPad value={sv} onChange={(x) => { setSv(x); reset(); }} romans={task.romans} fifths={task.fifths} given={task.given} flagged={res && !res.ok ? flagged : []} disabled={locked} label="Write the four voices for each chord" />}
      <div className="flex flex-wrap gap-2">
        {!locked && <button type="button" className="btn-primary" onClick={check} disabled={task.kind === 'satb' ? !sv.length : !v.filter(Boolean).length} data-testid="task-check"><Check size={16} />Check my writing</button>}
        {task.kind !== 'keysig' && <button type="button" className="btn-ghost" onClick={hearIt} disabled={task.kind === 'satb' ? !sv.length : !v.filter(Boolean).length}><Play size={15} />Hear it</button>}
        {(task.kind === 'chord' ? v.length : task.kind === 'satb' ? sv.length : v.length) > 0 && !locked && <button type="button" className="btn-quiet" onClick={() => { setV([]); setSv([]); reset(); }}><RotateCcw size={15} />Clear</button>}
        {(res && !res.ok) || practice ? <button type="button" className="btn-quiet" onClick={() => setShow(!show)} data-testid="task-show"><Eye size={15} />{show ? 'Hide' : 'Show'} a model answer</button> : null}
      </div>
      {res && !(quiet && res.ok) && (
        <div className={cn('rounded-xl border p-3 text-[15px]', res.ok ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10')} data-testid="task-result" aria-live="polite">
          <b className={res.ok ? 'text-ok' : 'text-bad'}>{res.ok ? 'Correct! The engine checked every note.' : 'Not yet.'}</b>
          {res.msg && <p className="mt-1">{res.msg}</p>}
          {res.issues && res.issues.length > 0 && <ul className="mt-1.5 space-y-1">{res.issues.map((x, i) => <li key={i} className="flex gap-2"><TriangleAlert size={15} className="mt-1 shrink-0 text-bad" />{x.msg}</li>)}</ul>}
          {!res.ok && <p className="mt-1.5 text-sm text-muted">Fix it and check again{first ? '' : ' (your first try is the one that counts for your score)'}.</p>}
        </div>
      )}
      {warns.length > 0 && <div className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm" data-testid="task-warn"><b className="text-warn">Style notes</b> (not errors, but a reader would notice):<ul className="mt-1 space-y-1">{warns.map((w, i) => <li key={i}>• {w.msg}</li>)}</ul></div>}
      {show && <ModelAnswer task={task} />}
    </div>
  );
}

export function ModelAnswer({ task }: { task: MusicTask }) {
  if (task.kind === 'satb') return <Score spec={{ clef: 'grand', fifths: task.fifths, label: `Model answer: ${modelText(task)}`, events: task.model.map((c, i) => ({ satb: c, dur: 'h', label: task.romans[i] })) }} caption="One correct answer (others are possible)." />;
  if (task.kind === 'keysig') return <Score spec={{ clef: task.clef, fifths: task.fifths, label: `The key signature: ${modelText(task)}`, events: [] }} play={false} caption={`Written in order: ${task.model.map((p) => show(p)).join(', ')}.`} />;
  if (task.kind === 'line') return <Score spec={{ clef: task.clef, label: `Model answer: ${modelText(task)}`, events: task.model.map((n) => ({ notes: [n], dur: 'w' })) }} caption={`Model answer: ${modelText(task)}`} />;
  return <Score spec={{ clef: task.clef, label: `Model answer: ${modelText(task)}`, events: [{ notes: sortPitches(task.model.concat(task.given?.filter((g) => !task.model.includes(g)) ?? [])), dur: 'w' }] }} caption={`Model answer: ${sortPitches([...(task.given ?? []), ...task.model.filter((m) => !task.given?.includes(m))]).map((p) => show(p)).join(', ')}`} />;
}

/** A "try it yourself" box inside lesson notes: ungraded practice with the same tools. */
export function TryIt({ prompt, task }: { prompt: string; task: MusicTask }) {
  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/[.06] p-4" data-testid="try-it">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-accent"><Hand size={15} />Try it yourself</div>
      <p className="mt-1 leading-relaxed"><RichText text={prompt} /></p>
      <div className="mt-3"><TaskView task={task} practice /></div>
    </div>
  );
}

export function KeysNote({ notes, caption }: { notes: string[]; caption: string }) {
  return (
    <figure className="space-y-2 rounded-2xl border border-line bg-raised/40 p-3">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-muted"><PianoIcon size={15} />On the keyboard</div>
      <Keyboard from={Math.min(...notes.map((n) => midi(n))) - (((Math.min(...notes.map((n) => midi(n))) % 12) + 12) % 12)} octaves={Math.max(1, Math.ceil((Math.max(...notes.map((n) => midi(n))) - Math.min(...notes.map((n) => midi(n))) + 1) / 12))} highlight={notes} label={caption} />
      <figcaption className="text-sm leading-relaxed text-muted"><RichText text={caption} /></figcaption>
    </figure>
  );
}
export { keySigPositions };
