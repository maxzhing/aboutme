import { MotionConfig, motion } from 'framer-motion';
import { Captions, ChevronLeft, ChevronRight, FileText, Footprints, Gauge, Pause, Play, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { shotsOf, type Shot, type Video, type VideoTiming } from '@/data/videos/types';
import { markWatched, plainLabel, SceneView, sceneName } from './VideoPlayer';
import { RichText } from './RichText';
import type { Scene } from '@/data/videos/types';
import { SkillIcon } from './SkillIcon';
import { cn } from './ui';

/**
 * The animated lesson: the scene timeline drawn live in the page (sharp text and vector graphics at any size),
 * driven by ONE narration audio track. The picture follows the audio's clock, so voice and animation stay in sync at
 * any speed and after any seek. About 1 MB per lesson. Nothing plays until the student presses Play (no autoplay,
 * and iOS needs a tap before audio can start).
 *
 * Pause-and-try questions stop the lesson until the student answers. "Try it first" pauses are silent in the track and
 * can be skipped. With reduced motion (system setting, or the Step-through button) the lesson stops after each
 * narration line and animations are switched off.
 */
const ls = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* storage blocked: only a convenience */ } },
};
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const prefersReduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

export function NarratedLesson({ id, video, timing, src, practiceHref, watchSkill, onFail, onDone }: {
  /** the lesson id: resume position is kept per lesson (M6) */ id: string;
  /** set only for a skill's own video, which marks the skill watched */ watchSkill?: boolean;
  video: Video; timing: VideoTiming; src: string; practiceHref: string;
  onFail?: () => void; onDone?: (score: { right: number; total: number }) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const shots = useMemo(() => shotsOf(video), [video]);
  const posKey = `stellify-lesson-pos-${id}`;
  const box = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [rate, setRate] = useState(() => Number(ls.get('stellify-video-rate')) || 1);
  const [cc, setCc] = useState(() => ls.get('stellify-video-cc') !== 'off');
  const [transcript, setTranscript] = useState(false);
  const [stepMode, setStepMode] = useState(prefersReduced);
  const [dataSaver] = useState(() => ls.get('stellify-data-saver') === 'on');
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [open, setOpen] = useState<number | null>(null); // shot index we are holding on (question or try-it-first)
  const handled = useRef<Set<number>>(new Set());
  const stopAt = useRef<number | null>(null);

  const shotAt = useCallback((x: number) => { let i = 0; while (i + 1 < timing.starts.length && timing.starts[i + 1] <= x + 1e-3) i++; return i; }, [timing]);
  const i = shotAt(t);
  const shot: Shot = shots[i];
  const scene = video.scenes[shot.scene];
  const endOf = (n: number) => (n + 1 < timing.starts.length ? timing.starts[n + 1] : timing.duration);
  const quizzes = video.scenes.map((s, n) => [s, n] as const).filter(([s]) => s.k === 'quiz');
  const right = quizzes.filter(([s, n]) => s.k === 'quiz' && picked[n] === s.answer).length;

  // resume where this student left off (this device only)
  useEffect(() => { const p = Number(ls.get(posKey)); if (p > 0 && p < timing.duration - 3) { setT(p); if (audio.current) audio.current.currentTime = p; } }, [posKey, timing.duration]);
  useEffect(() => { if (audio.current) audio.current.playbackRate = rate; }, [rate]);

  const seek = (x: number, play = playing) => {
    const a = audio.current; if (!a) return;
    a.currentTime = Math.max(0, Math.min(timing.duration - 0.05, x)); setT(a.currentTime); setEnded(false); setOpen(null); stopAt.current = null;
    if (play) void a.play().catch(() => undefined);
  };
  const play = () => {
    const a = audio.current; if (!a) return;
    if (ended) { seek(0, true); setPicked({}); handled.current.clear(); return; }
    setStarted(true); setOpen(null);
    void a.play().catch(() => onFail?.());
  };
  const pause = () => audio.current?.pause();

  // the clock: the audio's own position, read every frame while playing
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const a = audio.current; if (!a) return;
      const now = a.currentTime; setT(now);
      const n = shotAt(now), s = shots[n];
      // hold on a question, or on a try-it-first pause once its prompt has been read
      if (s.phase === 'countdown' && !handled.current.has(n)) {
        const sc = video.scenes[s.scene];
        if (sc.k === 'quiz' || (sc.k === 'pause' && sc.hold)) { a.pause(); a.currentTime = timing.starts[n] + 0.05; setOpen(n); return; }
      }
      if (stopAt.current !== null && now >= stopAt.current) { a.pause(); stopAt.current = null; return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, shotAt, shots, timing, video]);
  // step-through mode: stop at the end of each spoken line
  useEffect(() => { if (stepMode && playing && stopAt.current === null && shot.phase !== 'countdown') stopAt.current = endOf(i) - 0.02; }, [stepMode, playing, i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (started) ls.set(posKey, String(Math.floor(t))); }, [Math.floor(t / 5)]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (n: number) => setPicked((p) => ({ ...p, [shot.scene]: n }));
  const continueAfterQuiz = () => { if (open === null) return; handled.current.add(open); const after = shots.findIndex((s, n) => n > open && s.phase !== 'reveal'); seek(after < 0 ? timing.duration - 0.1 : timing.starts[after], true); };
  const skipToAnswer = () => { if (open === null) return; handled.current.add(open); seek(timing.starts[open + 1] ?? timing.starts[open], true); };
  const skipPause = () => { handled.current.add(i); seek(endOf(i), true); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!box.current?.contains(document.activeElement)) return; // shortcuts only inside the player (WCAG 2.1.4)
      if (el?.closest('input, textarea, select, [contenteditable]')) return;
      if ((e.key === ' ' && !el?.closest('button, a')) || e.key === 'k') { e.preventDefault(); if (playing) pause(); else play(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); seek(endOf(i)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(timing.starts[Math.max(0, i - (t - timing.starts[i] < 1.5 ? 1 : 0))]); }
      else if (e.key === 'c') setCc((v) => { ls.set('stellify-video-cc', v ? 'off' : 'on'); return !v; });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const chapters = video.scenes.map((sc, n) => ({ n, name: sceneName(sc), at: timing.starts[shots.findIndex((s) => s.scene === n)], end: n + 1 < video.scenes.length ? timing.starts[shots.findIndex((s) => s.scene === n + 1)] : timing.duration }));
  const holdQuiz = open !== null && video.scenes[shots[open].scene].k === 'quiz';
  const holdPause = open !== null && video.scenes[shots[open].scene].k === 'pause';
  const inPause = scene.k === 'pause' && shot.phase === 'countdown';

  return (
    <MotionConfig reducedMotion={stepMode ? 'always' : 'user'}>
      <div ref={box} className="space-y-3 [&_.katex]:whitespace-nowrap" data-testid="narrated-lesson">
        <audio ref={audio} src={src} preload={dataSaver ? 'none' : 'metadata'} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onSeeked={(e) => setT(e.currentTarget.currentTime)} onTimeUpdate={(e) => { if (e.currentTarget.paused) setT(e.currentTarget.currentTime); }} onError={() => onFail?.()}
          onEnded={() => { setPlaying(false); setEnded(true); if (watchSkill) markWatched(video.skill); ls.set(posKey, '0'); onDone?.({ right, total: quizzes.length }); }} data-testid="lesson-audio" />
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <div className="relative flex min-h-[380px] flex-col sm:min-h-[440px]">
            <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2 text-xs text-muted">
              <SkillIcon skill={video.skill} size={22} />
              <span className="truncate font-semibold">{plainLabel(video.title)}</span>
              <span className="ml-auto shrink-0">{chapters[shot.scene].name}</span>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-5 sm:px-8">
              <motion.div key={shot.scene} className="w-full max-w-3xl" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                <SceneView scene={scene} b={shot.b} picked={picked[shot.scene]} onPick={answer}
                  phase={holdQuiz ? undefined : shot.phase === 'say' ? undefined : shot.phase}
                  onContinue={holdQuiz ? continueAfterQuiz : holdPause ? () => { if (open !== null) { handled.current.add(open); seek(endOf(open), true); } } : inPause ? skipPause : undefined} />
                {holdQuiz && picked[shot.scene] === undefined && <p className="mt-3 text-center"><button type="button" className="text-sm font-semibold text-accent hover:underline" onClick={skipToAnswer}>Skip: show me the answer</button></p>}
              </motion.div>
              {!started && (
                <button type="button" onClick={play} className="absolute inset-0 grid place-items-center bg-surface/85 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[rgb(var(--brand-solid))]" data-testid="lesson-start" aria-label={`Play the lesson: ${plainLabel(video.title)}`}>
                  <span className="flex flex-col items-center gap-3 px-6 text-center">
                    <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-solid text-white shadow-lg"><Play size={36} className="ml-1" /></span>
                    <span className="text-lg font-bold">{plainLabel(video.title)}</span>
                    <span className="text-sm text-muted">{fmt(timing.duration)} · narrated, with captions{t > 0 ? ` · resumes at ${fmt(t)}` : ''}</span>
                  </span>
                </button>
              )}
              {ended && (
                <div className="absolute inset-0 grid place-items-center bg-surface/95 p-6 text-center" data-testid="lesson-end">
                  <div className="space-y-3">
                    <p className="text-xl font-bold">Lesson complete</p>
                    {quizzes.length > 0 && <p className="text-sm text-muted">You got {right} of {quizzes.length} pause-and-try question{quizzes.length === 1 ? '' : 's'} right.</p>}
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link href={practiceHref} className="btn-primary" data-testid="lesson-practice">Open this skill's practice set<ChevronRight size={16} /></Link>
                      <button type="button" className="btn-ghost" onClick={play}><RotateCcw size={16} />Watch again</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {cc && started && !ended && shot.say && <p className="border-t border-line/70 bg-raised/60 px-4 py-2.5 text-center text-sm leading-snug sm:text-base" data-testid="lesson-caption">{shot.say}</p>}
          </div>
        </div>

        <div className="relative h-3 rounded-full bg-raised" aria-hidden>
          <div className="absolute inset-y-0 left-0 rounded-full bg-brand-solid" style={{ width: `${(t / timing.duration) * 100}%` }} />
          {chapters.slice(1).map((c) => <span key={c.n} className="absolute inset-y-0 w-0.5 bg-surface" style={{ left: `${(c.at / timing.duration) * 100}%` }} />)}
        </div>
        <input type="range" min={0} max={timing.duration} step={0.1} value={t} onChange={(e) => seek(Number(e.target.value))} className="w-full accent-[rgb(var(--brand-solid))]" aria-label="Position in the lesson" aria-valuetext={`${fmt(t)} of ${fmt(timing.duration)}`} />

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={() => (playing ? pause() : play())} data-testid="lesson-play">{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : ended ? 'Replay' : started ? 'Resume' : 'Play'}</button>
          <button type="button" className="btn-ghost px-2.5" onClick={() => seek(timing.starts[Math.max(0, i - 1)])} aria-label="Previous line"><ChevronLeft size={16} /></button>
          <button type="button" className="btn-ghost px-2.5" onClick={() => seek(endOf(i))} aria-label="Next line" data-testid="lesson-next"><ChevronRight size={16} /></button>
          <span className="text-xs tabular-nums text-muted">{fmt(t)} / {fmt(timing.duration)}</span>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <button type="button" className={cn('btn-ghost px-2.5', cc && 'border-brand')} onClick={() => setCc((v) => { ls.set('stellify-video-cc', v ? 'off' : 'on'); return !v; })} aria-pressed={cc} aria-label="Captions"><Captions size={16} /><span className="hidden sm:inline" aria-hidden>Captions</span></button>
            <button type="button" className={cn('btn-ghost px-2.5', transcript && 'border-brand')} onClick={() => setTranscript((v) => !v)} aria-pressed={transcript} aria-controls="lesson-transcript" aria-label="Transcript" data-testid="lesson-transcript-toggle"><FileText size={16} /><span className="hidden sm:inline" aria-hidden>Transcript</span></button>
            <button type="button" className={cn('btn-ghost px-2.5', stepMode && 'border-brand')} onClick={() => setStepMode((v) => !v)} aria-pressed={stepMode} title="Stop after each line, no motion" aria-label="Step-through: stop after each line, no motion"><Footprints size={16} /><span className="hidden sm:inline" aria-hidden>Step-through</span></button>
            <label className="flex items-center gap-1 text-xs text-muted"><Gauge size={14} aria-hidden /><span className="sr-only">Speed</span>
              <select className="rounded-lg border border-line bg-surface px-1.5 py-1 text-xs" value={rate} onChange={(e) => { const r = Number(e.target.value); setRate(r); ls.set('stellify-video-rate', String(r)); }}>
                {[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => <option key={r} value={r}>{r}×</option>)}
              </select>
            </label>
          </span>
        </div>

        <nav aria-label="Chapters" className="flex flex-wrap gap-1.5">
          {chapters.map((c) => { const active = t >= c.at - 1e-3 && t < c.end; return (
            <button key={c.n} type="button" onClick={() => seek(c.at, true)} className={cn('rounded-full border px-2.5 py-1 text-xs', active ? 'border-brand bg-brand/10 font-semibold' : 'border-line hover:border-brand')} aria-current={active ? 'step' : undefined}>
              {fmt(c.at)} · {c.name}
            </button>
          ); })}
        </nav>

        {transcript && (
          <section id="lesson-transcript" aria-label="Transcript" className="card max-h-80 overflow-y-auto p-4" data-testid="lesson-transcript">
            <h3 className="mb-2 text-sm font-bold">Transcript</h3>
            <ol className="space-y-1.5 text-sm">
              {shots.map((s, n) => {
                const first = n === shots.findIndex((x) => x.scene === s.scene);
                const line = shots.slice(0, n).filter((x) => x.say).length;
                return (
                  <li key={n}>
                    {first && <OnScreen scene={video.scenes[s.scene]} />}
                    {s.say && <button type="button" onClick={() => seek(timing.starts[n], true)} className={cn('w-full rounded px-1 text-left hover:bg-raised', n === i && 'bg-brand/10 font-semibold')}><span className="mr-2 tabular-nums text-muted">{String(line).padStart(3, '0')} · {fmt(timing.starts[n])}</span>{s.say}</button>}
                  </li>
                );
              })}
            </ol>
          </section>
        )}
        <p className="text-xs text-muted">The narration is computer-generated (Kokoro, an open text-to-speech voice). Keys: Space plays and pauses, the arrows step one line, C turns captions on and off.</p>
      </div>
    </MotionConfig>
  );
}

/** What a scene shows, written out for the transcript (and for anyone who cannot see the animation). */
function OnScreen({ scene: s }: { scene: Scene }) {
  const strip = (t: string) => t.replace(/\{\{([^|}]+)[^}]*\}\}/g, '$1');
  const box = (children: React.ReactNode) => <div className="my-1.5 rounded-lg border border-line bg-raised/40 p-2 text-[13px] leading-relaxed"><span className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-muted">On screen</span>{children}</div>;
  switch (s.k) {
    case 'passage': return box(<p className="whitespace-pre-line"><RichText text={strip(s.text)} /></p>);
    case 'pause': return box(<>{s.passage && <p className="whitespace-pre-line"><RichText text={s.passage} /></p>}{s.stem && <p className="whitespace-pre-line"><RichText text={s.stem} /></p>}{s.choices?.map((c, n) => <p key={n}>{'ABCD'[n]}) <RichText text={c} /></p>)}</>);
    case 'choices': return box(<>{s.passage && <p><RichText text={s.passage} /></p>}<p><RichText text={s.stem} /></p>{s.choices.map((c, n) => <p key={n}>{'ABCD'[n]}) <RichText text={c} />{n === s.answer ? ' (the answer)' : s.notes[n] ? `: ${''}` : ''}{s.notes[n] && <span className="text-muted"> {plainLabel(s.notes[n])}</span>}</p>)}</>);
    case 'morph': return box(<>{s.steps.map((st, n) => <p key={n} className="flex flex-wrap gap-x-1">{st.tokens.map(([k, tex]) => <span key={k} className="whitespace-nowrap"><RichText text={`$${tex}$`} /></span>)}{st.note && <span className="text-muted"> ({plainLabel(st.note)})</span>}</p>)}</>);
    case 'lines': return box(<>{s.rows.map(([m, note], n) => <p key={n}><RichText text={m} />{note && <span className="text-muted"> ({plainLabel(note)})</span>}</p>)}</>);
    case 'tiles': return box(<>{s.items.map(([h, b], n) => <p key={n}><b><RichText text={h} /></b>: <RichText text={b} /></p>)}</>);
    case 'versus': return box(<><p><b>{s.badLabel ?? 'The trap'}:</b> <RichText text={s.bad} /></p><p><b>{s.goodLabel ?? 'The fix'}:</b> <RichText text={s.good} /></p></>);
    case 'plot': return box(<p>{s.alt ?? s.head ?? 'A diagram.'}{s.caption?.length ? <> <RichText text={s.caption.filter(Boolean).join(' ')} /></> : null}</p>);
    case 'recap': return box(<>{s.points.map((p, n) => <p key={n}><RichText text={p} /></p>)}</>);
    default: return null;
  }
}
