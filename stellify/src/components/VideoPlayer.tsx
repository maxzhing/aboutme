import { AnimatePresence, motion } from 'framer-motion';
import { Captions, Check, ChevronLeft, ChevronRight, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlotItem, Scene, Video } from '@/data/videos/types';
import type { Tone } from '@/data/visual-lessons';
import { RichText } from './RichText';
import { SkillIcon } from './SkillIcon';
import { cn } from './ui';

const C: Record<Tone, string> = { brand: 'rgb(var(--brand))', brand2: 'rgb(var(--brand2))', ok: 'rgb(var(--ok))', warn: 'rgb(var(--warn))', bad: 'rgb(var(--bad))', gold: 'rgb(var(--gold))', muted: 'rgb(var(--muted))' };
const INK = 'rgb(var(--ink))', LINE = 'rgb(var(--line))', MUTED = 'rgb(var(--muted))';
/** Labels get a halo in the background colour, so they stay readable where they cross a line. */
const HALO = { stroke: 'rgb(var(--surface))', strokeWidth: 4, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

/** Seconds a beat stays on screen without a voice: reading speed plus a moment to look at the picture. */
export const beatSeconds = (say: string) => 1.1 + say.split(/\s+/).filter(Boolean).length / 2.6;

export interface Beat { scene: number; b: number; say: string }
export const beatsOf = (v: Video): Beat[] => v.scenes.flatMap((s, scene) => s.say.map((say, b) => ({ scene, b, say })));

const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode: setting just isn't remembered */ } },
};
export const watchedVideos = (): Record<string, number> => { try { return JSON.parse(store.get('stellify-videos-watched') ?? '{}'); } catch { return {}; } };
const markWatched = (skill: string) => store.set('stellify-videos-watched', JSON.stringify({ ...watchedVideos(), [skill]: Date.now() }));

const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
function pickVoice(): SpeechSynthesisVoice | undefined {
  const vs = window.speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
  const rank = (v: SpeechSynthesisVoice) => (/natural|neural|premium|enhanced/i.test(v.name) ? 0 : /google|samantha|aria|jenny|guy|daniel/i.test(v.name) ? 1 : v.localService ? 2 : 3) + (/en-us/i.test(v.lang) ? 0 : 0.5);
  return vs.sort((a, b) => rank(a) - rank(b))[0];
}

/**
 * Plays one video lesson: narration beat by beat (spoken by the browser's voice when it has one, always captioned),
 * each beat revealing the next part of the picture. Pause-and-try scenes stop the video until the student answers.
 */
export function VideoPlayer({ video, onDone }: { video: Video; onDone?: (score: { right: number; total: number }) => void }) {
  const beats = useMemo(() => beatsOf(video), [video]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [rate, setRate] = useState(() => Number(store.get('stellify-video-rate')) || 1);
  const [voice, setVoice] = useState(() => canSpeak() && store.get('stellify-video-voice') !== 'off');
  const [cc, setCc] = useState(() => store.get('stellify-video-cc') !== 'off');
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [ended, setEnded] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const beat = beats[i];
  const scene = video.scenes[beat.scene];
  const lastOfScene = beat.b === scene.say.length - 1;
  /** A pause-and-try scene holds on its last sentence until the student answers and presses Continue. */
  const hold = scene.k === 'quiz' && lastOfScene;

  const total = useMemo(() => beats.reduce((t, b) => t + beatSeconds(b.say), 0), [beats]);
  const elapsed = useMemo(() => beats.slice(0, i).reduce((t, b) => t + beatSeconds(b.say), 0), [beats, i]);
  const quizzes = video.scenes.map((s, n) => [s, n] as const).filter(([s]) => s.k === 'quiz');
  const right = quizzes.filter(([s, n]) => s.k === 'quiz' && picked[n] === s.answer).length;

  const stopVoice = () => { if (canSpeak()) window.speechSynthesis.cancel(); };
  const finish = useCallback(() => {
    setPlaying(false); setEnded(true); markWatched(video.skill);
    onDone?.({ right, total: quizzes.length });
  }, [video.skill, onDone, right, quizzes.length]);
  const next = useCallback(() => { if (i + 1 < beats.length) setI(i + 1); else finish(); }, [i, beats.length, finish]);

  // play the current beat: speak it (or wait its reading time), then move on
  useEffect(() => {
    window.clearTimeout(timer.current);
    stopVoice();
    if (!playing) return;
    const after = hold ? () => undefined : next;
    const wait = (beatSeconds(beat.say) * 1000) / rate;
    if (voice && canSpeak()) {
      const u = new SpeechSynthesisUtterance(beat.say);
      const v = pickVoice(); if (v) u.voice = v;
      u.rate = Math.min(2, 0.98 * rate); u.pitch = 1.02;
      let done = false;
      const go = () => { if (done) return; done = true; window.clearTimeout(timer.current); timer.current = window.setTimeout(after, 380 / rate); };
      u.onend = go; u.onerror = go;
      window.speechSynthesis.speak(u);
      // some browsers never fire onend: never get stuck on a beat
      timer.current = window.setTimeout(go, wait * 1.8 + 2500);
    } else timer.current = window.setTimeout(after, wait);
    return () => { window.clearTimeout(timer.current); };
  }, [i, playing, hold, voice, rate, beat.say, next]);
  useEffect(() => () => { window.clearTimeout(timer.current); stopVoice(); }, []);

  const play = () => { if (ended) { setI(0); setPicked({}); setEnded(false); } setStarted(true); setPlaying(true); };
  const toggle = () => (playing ? setPlaying(false) : play());
  const jump = (n: number) => { setEnded(false); setI(Math.max(0, Math.min(beats.length - 1, n))); };
  const jumpScene = (s: number) => jump(beats.findIndex((b) => b.scene === s));
  const answer = (choice: number) => { setPicked((p) => ({ ...p, [beat.scene]: choice })); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); jump(i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); jump(i - 1); }
      else if (e.key === 'c') setCc((v) => { store.set('stellify-video-cc', v ? 'off' : 'on'); return !v; });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return (
    <div className="space-y-3" data-testid="video-player">
      <div ref={stage} className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm [&:fullscreen]:rounded-none">
        <div className="relative flex min-h-[360px] flex-col sm:aspect-video sm:min-h-0">
          <div className="flex items-center gap-2 border-b border-line/70 px-4 py-2 text-xs text-muted">
            <SkillIcon skill={video.skill} size={22} />
            <span className="truncate font-semibold">{video.title}</span>
            <span className="ml-auto shrink-0">Part {beat.scene + 1} of {video.scenes.length}</span>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-4 sm:px-8">
            <AnimatePresence mode="wait">
              <motion.div key={beat.scene} className="w-full max-w-3xl" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
                <SceneView scene={scene} b={beat.b} picked={picked[beat.scene]} onPick={answer} onContinue={hold ? () => { setPlaying(true); setStarted(true); next(); } : undefined} />
              </motion.div>
            </AnimatePresence>
            {!started && (
              <button type="button" onClick={play} className="absolute inset-0 grid place-items-center bg-surface/80 backdrop-blur-sm" data-testid="video-start" aria-label={`Play ${video.title}`}>
                <span className="flex flex-col items-center gap-3">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-solid text-white shadow-lg transition-transform hover:scale-105"><Play size={36} className="ml-1" /></span>
                  <span className="text-lg font-bold">{video.title}</span>
                  <span className="text-sm text-muted">About {Math.max(1, Math.round(total / 60))} minutes · {quizzes.length} pause-and-try questions</span>
                </span>
              </button>
            )}
            {ended && (
              <div className="absolute inset-0 grid place-items-center bg-surface/95 p-6 text-center" data-testid="video-ended">
                <div>
                  <Check size={40} className="mx-auto text-ok" />
                  <p className="mt-2 text-xl font-bold">Video complete</p>
                  <p className="mt-1 text-sm text-muted">You got {right} of {quizzes.length} pause-and-try questions right.</p>
                  <button type="button" className="btn-ghost mt-4" onClick={play}><RotateCcw size={16} />Watch again</button>
                </div>
              </div>
            )}
          </div>
          {cc && started && !ended && (
            <div className="border-t border-line/70 bg-raised/60 px-4 py-2.5 text-center text-sm leading-snug sm:text-base" aria-live="polite" data-testid="video-caption">{beat.say}</div>
          )}
        </div>
      </div>

      <div className="flex gap-0.5" role="group" aria-label="Parts of this video">
        {video.scenes.map((s, n) => {
          const bs = beats.filter((b) => b.scene === n);
          const w = bs.reduce((t, b) => t + beatSeconds(b.say), 0);
          const fill = n < beat.scene ? 1 : n > beat.scene ? 0 : (beat.b + 1) / bs.length;
          return (
            <button key={n} type="button" onClick={() => jumpScene(n)} style={{ flexGrow: w }} className="group h-3 min-w-[10px] basis-0 rounded-full bg-raised py-0" aria-label={`Part ${n + 1}: ${sceneName(s)}`} title={sceneName(s)}>
              <span className={cn('block h-full rounded-full transition-all', s.k === 'quiz' ? 'bg-gold' : 'bg-brand-solid')} style={{ width: `${fill * 100}%` }} />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" onClick={toggle} data-testid="video-play" aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : ended ? 'Replay' : started ? 'Resume' : 'Play'}</button>
        <button type="button" className="btn-ghost px-2.5" onClick={() => jump(i - 1)} aria-label="Previous sentence"><ChevronLeft size={16} /></button>
        <button type="button" className="btn-ghost px-2.5" onClick={() => (i + 1 < beats.length ? jump(i + 1) : finish())} aria-label="Next sentence" data-testid="video-next"><ChevronRight size={16} /></button>
        <span className="text-xs tabular-nums text-muted">{fmt(elapsed / rate)} / {fmt(total / rate)}</span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {canSpeak() && <button type="button" className="btn-ghost px-2.5" onClick={() => setVoice((v) => { store.set('stellify-video-voice', v ? 'off' : 'on'); return !v; })} aria-pressed={voice} aria-label={voice ? 'Turn the voice off' : 'Turn the voice on'}>{voice ? <Volume2 size={16} /> : <VolumeX size={16} />}<span className="hidden sm:inline">Voice</span></button>}
          <button type="button" className="btn-ghost px-2.5" onClick={() => setCc((v) => { store.set('stellify-video-cc', v ? 'off' : 'on'); return !v; })} aria-pressed={cc} aria-label="Captions"><Captions size={16} /><span className="hidden sm:inline">Captions</span></button>
          <label className="flex items-center gap-1 text-xs text-muted">Speed
            <select className="rounded-lg border border-line bg-surface px-1.5 py-1 text-xs" value={rate} onChange={(e) => { const r = Number(e.target.value); setRate(r); store.set('stellify-video-rate', String(r)); }}>
              {[0.75, 1, 1.25, 1.5, 1.75].map((r) => <option key={r} value={r}>{r}×</option>)}
            </select>
          </label>
          <button type="button" className="btn-ghost px-2.5" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen?.())} aria-label="Full screen"><Maximize size={16} /></button>
        </span>
      </div>
      {!canSpeak() && <p className="text-xs text-muted">This browser has no built-in voice, so the narration plays as captions.</p>}
    </div>
  );
}

export const sceneName = (s: Scene) => (s.k === 'quiz' ? 'Pause and try' : s.k === 'recap' ? 'Recap' : s.k === 'title' ? s.title : s.k === 'choices' ? 'Worked question' : s.k === 'versus' ? s.head ?? 'The trap' : ('head' in s && s.head) || 'Idea');

const pop = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } };

function SceneView({ scene: s, b, picked, onPick, onContinue }: { scene: Scene; b: number; picked?: number; onPick: (n: number) => void; onContinue?: () => void }) {
  const Head = ({ t }: { t?: string }) => (t ? <h3 className="mb-3 text-center text-lg font-bold sm:text-xl"><RichText text={t} /></h3> : null);
  switch (s.k) {
    case 'title': return (
      <div className="py-6 text-center">
        <motion.h2 {...pop} className="text-2xl font-black leading-tight sm:text-4xl"><RichText text={s.title} /></motion.h2>
        {s.sub && <motion.p {...pop} transition={{ delay: 0.25, duration: 0.4 }} className="mx-auto mt-3 max-w-xl text-base text-muted sm:text-lg"><RichText text={s.sub} /></motion.p>}
      </div>
    );
    case 'lines': return (
      <div><Head t={s.head} />
        <div className="mx-auto max-w-xl space-y-2">
          {s.rows.slice(0, b + 1).map(([m, note], n) => (
            <motion.div key={n} {...pop} className={cn('flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border px-4 py-2.5', n === b ? 'border-brand/60 bg-brand/10' : 'border-line bg-raised/40 opacity-80')}>
              <span className="text-lg sm:text-xl"><RichText text={m} /></span>
              {note && <span className="text-sm text-muted"><RichText text={note} /></span>}
            </motion.div>
          ))}
        </div>
      </div>
    );
    case 'passage': return <div><Head t={s.head} /><Marked text={s.text} lit={b} /></div>;
    case 'choices': {
      const crossed = s.cross.slice(0, Math.max(0, b));
      const reveal = b > s.cross.length;
      return (
        <div className="mx-auto max-w-2xl">
          {s.passage && <p className="mb-3 rounded-xl bg-raised/50 p-3 text-sm leading-relaxed sm:text-base"><RichText text={s.passage} /></p>}
          <p className="mb-3 font-semibold"><RichText text={s.stem} /></p>
          <div className="grid gap-2 sm:grid-cols-2">
            {s.choices.map((c, n) => {
              const out = crossed.includes(n), win = reveal && n === s.answer;
              return (
                <div key={n} className={cn('rounded-xl border px-3 py-2 transition-all duration-500', win ? 'border-ok bg-ok/10 ring-2 ring-ok/40' : out ? 'border-line' : 'border-line bg-raised/30')}>
                  <span className={cn('font-semibold', out && 'text-muted line-through decoration-bad decoration-2')}>{'ABCD'[n]}) <RichText text={c} /></span>
                  {(out || win) && s.notes[n] && <motion.span {...pop} className={cn('mt-1 block text-xs', win ? 'text-ok' : 'text-bad')}><RichText text={s.notes[n]} /></motion.span>}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case 'plot': return (
      <div><Head t={s.head} />
        <PlotView s={s} b={b} />
        {s.caption?.[b] && <motion.p key={b} {...pop} className="mt-2 text-center text-base"><RichText text={s.caption[b]} /></motion.p>}
      </div>
    );
    case 'tiles': return (
      <div><Head t={s.head} />
        <div className={cn('grid gap-3', s.items.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
          {s.items.map(([h, body], n) => (
            <motion.div key={n} initial={{ opacity: 0, scale: 0.92 }} animate={n <= b ? { opacity: 1, scale: 1 } : { opacity: 0.12, scale: 0.96 }} transition={{ duration: 0.35 }} className={cn('rounded-xl border p-3', n === b ? 'border-brand/60 bg-brand/10' : 'border-line bg-raised/40')}>
              <p className="font-bold"><RichText text={h} /></p><p className="mt-1 text-sm text-muted"><RichText text={body} /></p>
            </motion.div>
          ))}
        </div>
      </div>
    );
    case 'versus': return (
      <div><Head t={s.head} />
        <div className="grid gap-3 sm:grid-cols-2">
          <motion.div {...pop} className="rounded-xl border-2 border-bad/50 bg-bad/5 p-4"><p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-bad"><X size={14} />{s.badLabel ?? 'The trap'}</p><p className="text-base sm:text-lg"><RichText text={s.bad} /></p></motion.div>
          {b >= 1 && <motion.div {...pop} className="rounded-xl border-2 border-ok/50 bg-ok/5 p-4"><p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-ok"><Check size={14} />{s.goodLabel ?? 'The fix'}</p><p className="text-base sm:text-lg"><RichText text={s.good} /></p></motion.div>}
        </div>
      </div>
    );
    case 'quiz': {
      const done = picked !== undefined;
      return (
        <div className="mx-auto max-w-2xl" data-testid="video-quiz">
          <p className="mb-2 text-center text-xs font-black uppercase tracking-widest text-gold">Pause and try</p>
          {s.passage && <p className="mb-3 rounded-xl bg-raised/50 p-3 text-sm leading-relaxed sm:text-base"><RichText text={s.passage} /></p>}
          <p className="mb-3 font-semibold"><RichText text={s.q} /></p>
          <div className="grid gap-2 sm:grid-cols-2">
            {s.choices.map((c, n) => (
              <button key={n} type="button" disabled={done} onClick={() => onPick(n)} data-testid={`video-choice-${n}`}
                className={cn('rounded-xl border px-3 py-2 text-left font-semibold transition-colors', !done && 'border-line bg-raised/30 hover:border-brand hover:bg-brand/10', done && n === s.answer && 'border-ok bg-ok/10', done && n === picked && n !== s.answer && 'border-bad bg-bad/10', done && n !== s.answer && n !== picked && 'border-line opacity-50')}>
                {'ABCD'[n]}) <RichText text={c} />
              </button>
            ))}
          </div>
          {done && <motion.p {...pop} className={cn('mt-3 rounded-xl p-3 text-sm', picked === s.answer ? 'bg-ok/10' : 'bg-bad/10')} data-testid="video-quiz-why"><b>{picked === s.answer ? 'Right. ' : `Not quite: it is ${'ABCD'[s.answer]}. `}</b><RichText text={s.why} /></motion.p>}
          {done && onContinue && <div className="mt-3 text-center"><button type="button" className="btn-primary" onClick={onContinue} data-testid="video-continue">Continue<ChevronRight size={16} /></button></div>}
          {!done && b === s.say.length - 1 && <p className="mt-3 text-center text-xs text-muted">The video waits for your answer.</p>}
        </div>
      );
    }
    case 'table': return (
      <div><Head t={s.head} />
        <div className="mx-auto max-w-2xl overflow-x-auto">
          <table className="w-full border-collapse text-center text-sm sm:text-base">
            <thead><tr>{s.headers.map((h, c) => <th key={c} className="border border-line bg-raised/60 px-2 py-1.5 font-bold"><RichText text={h} /></th>)}</tr></thead>
            <tbody>{s.rows.map((row, r) => <tr key={r}>{row.map((v, c) => { const on = (s.lit[b] ?? []).some(([a, z]) => a === r && z === c); return <td key={c} className={cn('border border-line px-2 py-1.5 transition-colors duration-500', c === 0 && 'font-semibold', on && 'bg-gold/25 font-bold ring-2 ring-inset ring-gold')}><RichText text={String(v)} /></td>; })}</tr>)}</tbody>
          </table>
        </div>
        {s.note?.[b] && <motion.p key={b} {...pop} className="mt-3 text-center text-base"><RichText text={s.note[b]} /></motion.p>}
      </div>
    );
    case 'recap': return (
      <div>
        <h3 className="mb-3 text-center text-lg font-bold sm:text-xl">Remember</h3>
        <ul className="mx-auto max-w-xl space-y-2">
          {s.points.slice(0, b + 1).map((p, n) => <motion.li key={n} {...pop} className="flex gap-2.5 rounded-xl border border-line bg-raised/40 px-4 py-2.5"><Check size={18} className="mt-0.5 shrink-0 text-ok" /><span><RichText text={p} /></span></motion.li>)}
        </ul>
      </div>
    );
  }
}

/** `{{text|tone|label}}` marks; marks 1..lit are highlighted, the newest one pulses. */
function Marked({ text, lit }: { text: string; lit: number }) {
  const parts = text.split(/(\{\{[^}]+\}\})/);
  let k = 0;
  return (
    <p className="mx-auto max-w-2xl rounded-xl bg-raised/40 p-4 text-base leading-loose sm:text-lg">
      {parts.map((p, n) => {
        const m = p.match(/^\{\{([^|}]+)\|?([a-z0-9]*)\|?([^}]*)\}\}$/);
        if (!m) return <RichText key={n} text={p} />;
        const idx = ++k, on = idx <= lit, tone = (m[2] || 'brand') as Tone;
        return (
          <span key={n} className="relative inline">
            <motion.span animate={on ? { backgroundColor: `color-mix(in srgb, ${C[tone]} 22%, transparent)` } : { backgroundColor: 'rgba(0,0,0,0)' }} transition={{ duration: 0.4 }} className={cn('rounded px-0.5', on && 'font-semibold')} style={on ? { boxShadow: `inset 0 -2px 0 ${C[tone]}` } : undefined}><RichText text={m[1]} /></motion.span>
            {on && m[3] && <motion.sup {...pop} className="ml-0.5 whitespace-nowrap rounded px-1 text-[11px] font-bold" style={{ color: C[tone] }}>{m[3]}</motion.sup>}
          </span>
        );
      })}
    </p>
  );
}

function PlotView({ s, b }: { s: Extract<Scene, { k: 'plot' }>; b: number }) {
  const [x0, x1, y0, y1] = s.win;
  const W = 400, H = 240, pad = 14;
  // geometry keeps true shapes (one scale); graphs use the whole frame
  const uniform = s.axes === false || s.square;
  const kx0 = (W - 2 * pad) / (x1 - x0), ky0 = (H - 2 * pad) / (y1 - y0);
  const k = Math.min(kx0, ky0), kx = uniform ? k : kx0, ky = uniform ? k : ky0;
  const ox = (W - kx * (x1 - x0)) / 2, oy = (H - ky * (y1 - y0)) / 2;
  const px = (x: number) => ox + (x - x0) * kx, py = (y: number) => H - oy - (y - y0) * ky;
  const curve = (f: (x: number) => number, a = x0, z = x1) => {
    let d = '', pen = false;
    for (let n = 0; n <= 160; n++) {
      const x = a + ((z - a) * n) / 160, y = f(x);
      if (!Number.isFinite(y) || y < y0 - (y1 - y0) || y > y1 + (y1 - y0)) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${px(x).toFixed(1)} ${py(y).toFixed(1)}`; pen = true;
    }
    return d;
  };
  const step = (r: number) => (r <= 12 ? 1 : r <= 30 ? 5 : r <= 120 ? 10 : 50);
  const ticks = (a: number, z: number) => { const st = step(z - a), out: number[] = []; for (let t = Math.ceil(a / st) * st; t <= z; t += st) out.push(t); return out; };
  const draw = { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: 1.1, ease: 'easeInOut' as const } };
  const fade = { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.4 } };
  const item = (it: PlotItem, n: number) => {
    const col = C[it.tone ?? 'brand'];
    switch (it.t) {
      case 'fn': return <motion.path key={n} {...draw} d={curve(it.f, it.from ?? x0, it.to ?? x1)} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round" strokeDasharray={it.dash ? '7 6' : undefined} />;
      case 'shade': { const top = it.side === 'above'; const d = `${curve(it.f)} L${px(x1)} ${top ? 0 : H} L${px(x0)} ${top ? 0 : H} Z`; return <motion.path key={n} initial={{ opacity: 0 }} animate={{ opacity: 0.18 }} transition={{ duration: 0.6 }} d={d} fill={col} />; }
      case 'pt': return <motion.g key={n} {...fade} style={{ transformOrigin: `${px(it.x)}px ${py(it.y)}px` }}><circle cx={px(it.x)} cy={py(it.y)} r={5.5} fill={col} stroke="rgb(var(--surface))" strokeWidth={1.6} />{it.label && <text x={px(it.x) + 8} y={py(it.y) - 8} fontSize={13} fontWeight={700} fill={INK} {...HALO}>{it.label}</text>}</motion.g>;
      case 'seg': return <motion.g key={n}><motion.path {...draw} d={`M${px(it.a[0])} ${py(it.a[1])} L${px(it.b[0])} ${py(it.b[1])}`} stroke={col} strokeWidth={2.6} strokeDasharray={it.dash ? '6 5' : undefined} fill="none" />{it.label && <motion.text {...fade} x={(px(it.a[0]) + px(it.b[0])) / 2 + 6} y={(py(it.a[1]) + py(it.b[1])) / 2 - 6} fontSize={13} fontWeight={700} fill={col} {...HALO}>{it.label}</motion.text>}</motion.g>;
      case 'poly': return <motion.path key={n} {...draw} d={`M${it.pts.map(([x, y]) => `${px(x)} ${py(y)}`).join(' L')} Z`} stroke={col} strokeWidth={2.6} fill={it.fill ? col : 'none'} fillOpacity={it.fill ? 0.15 : 0} strokeLinejoin="round" />;
      case 'circle': return <motion.circle key={n} {...draw} cx={px(it.c[0])} cy={py(it.c[1])} r={it.r * k} stroke={col} strokeWidth={2.6} fill={it.fill ? col : 'none'} fillOpacity={it.fill ? 0.12 : 0} />;
      case 'text': return <motion.text key={n} {...fade} x={px(it.x)} y={py(it.y)} fontSize={it.size ?? 13} fontWeight={700} fill={it.tone ? col : INK} textAnchor="middle" {...HALO}>{it.s}</motion.text>;
      case 'bar': { const w = (it.w ?? 0.7) * kx; return <motion.g key={n}><motion.rect initial={{ height: 0, y: py(0) }} animate={{ height: Math.abs(it.h) * ky, y: py(Math.max(0, it.h)) }} transition={{ duration: 0.6 }} x={px(it.x) - w / 2} width={w} fill={col} fillOpacity={0.75} rx={2} />{it.label && <motion.text {...fade} x={px(it.x)} y={py(it.h) - 6} fontSize={12} fontWeight={700} fill={INK} textAnchor="middle" {...HALO}>{it.label}</motion.text>}</motion.g>; }
      case 'arc': {
        const r = it.r * k, a = (-it.from * Math.PI) / 180, z = (-it.to * Math.PI) / 180;
        const cx = px(it.c[0]), cy = py(it.c[1]);
        const big = Math.abs(it.to - it.from) > 180 ? 1 : 0;
        const mid = (a + z) / 2;
        return <motion.g key={n}><motion.path {...draw} d={`M${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)} A${r} ${r} 0 ${big} 0 ${cx + r * Math.cos(z)} ${cy + r * Math.sin(z)}`} stroke={col} strokeWidth={2.2} fill="none" />{it.label && <motion.text {...fade} x={cx + (r + 12) * Math.cos(mid)} y={cy + (r + 12) * Math.sin(mid) + 4} fontSize={13} fontWeight={700} fill={col} textAnchor="middle" {...HALO}>{it.label}</motion.text>}</motion.g>;
      }
    }
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-xl" role="img" aria-label={s.head ?? 'Diagram'}>
      {s.axes !== false && <g>
        {ticks(x0, x1).map((t) => <line key={`x${t}`} x1={px(t)} x2={px(t)} y1={py(y0)} y2={py(y1)} stroke={LINE} strokeWidth={0.6} />)}
        {ticks(y0, y1).map((t) => <line key={`y${t}`} y1={py(t)} y2={py(t)} x1={px(x0)} x2={px(x1)} stroke={LINE} strokeWidth={0.6} />)}
        {y0 <= 0 && y1 >= 0 && <line x1={px(x0)} x2={px(x1)} y1={py(0)} y2={py(0)} stroke={MUTED} strokeWidth={1.4} />}
        {x0 <= 0 && x1 >= 0 && <line y1={py(y0)} y2={py(y1)} x1={px(0)} x2={px(0)} stroke={MUTED} strokeWidth={1.4} />}
        {ticks(x0, x1).filter((t) => t !== 0 && t % (step(x1 - x0) * 2) === 0).map((t) => <text key={`lx${t}`} x={px(t)} y={Math.min(H - 2, py(Math.max(y0, Math.min(y1, 0))) + 13)} fontSize={10} fill={MUTED} textAnchor="middle">{t}</text>)}
        {ticks(y0, y1).filter((t) => t !== 0 && t % (step(y1 - y0) * 2) === 0).map((t) => <text key={`ly${t}`} x={Math.max(10, px(Math.max(x0, Math.min(x1, 0))) - 5)} y={py(t) + 3.5} fontSize={10} fill={MUTED} textAnchor="end">{t}</text>)}
      </g>}
      {s.items.map((it, n) => ((it.at ?? 0) <= b ? item(it, n) : null))}
    </svg>
  );
}
