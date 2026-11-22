import { CircleHelp, ListVideo } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTDOWN_SECONDS, shotsOf, type Video, type VideoTiming } from '@/data/videos/types';
import { markWatched, SceneView, sceneName } from './VideoPlayer';
import { cn } from './ui';

/** Where the rendered video files are published (the hosted web build); the offline single file streams from here. */
export const VIDEO_HOST = 'https://maxzhing.github.io/aboutme/sat/';
export const videoSrc = (skill: string, kind: 'mp4' | 'jpg' = 'mp4') =>
  (typeof location !== 'undefined' && location.protocol === 'file:' ? VIDEO_HOST : '') + `videos/${skill}.${kind}`;

const vttTime = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x.toFixed(3).padStart(6, '0')}`; };
/** Captions for the rendered video, built from the same script and timing the video was made from. */
export function captionsVtt(video: Video, t: VideoTiming): string {
  const shots = shotsOf(video);
  const cues = shots.map((s, i) => ({ s, from: t.starts[i], to: i + 1 < shots.length ? t.starts[i + 1] : t.duration })).filter((c) => c.s.say);
  return `WEBVTT\n\n${cues.map((c, n) => `${n + 1}\n${vttTime(c.from)} --> ${vttTime(Math.max(c.from + 0.5, c.to - 0.2))}\n${c.s.say}`).join('\n\n')}\n`;
}

/**
 * The real video: an MP4 with a recorded voice, captions and chapters. At each pause-and-try question the video stops
 * by itself and the question becomes clickable over it; answering continues the video after its own answer.
 * If the file cannot be loaded (offline, or not published yet), `onFail` switches to the animated version.
 */
export function LessonVideo({ video, timing, onFail, onDone }: { video: Video; timing: VideoTiming; onFail: () => void; onDone?: (score: { right: number; total: number }) => void }) {
  const el = useRef<HTMLVideoElement>(null);
  const shots = useMemo(() => shotsOf(video), [video]);
  const vtt = useMemo(() => URL.createObjectURL(new Blob([captionsVtt(video, timing)], { type: 'text/vtt' })), [video, timing]);
  useEffect(() => () => URL.revokeObjectURL(vtt), [vtt]);
  const quizzes = useMemo(() => shots.map((s, i) => ({ s, i })).filter(({ s }) => s.phase === 'countdown').map(({ s, i }) => ({ scene: s.scene, at: timing.starts[i], reveal: timing.starts[i + 1], after: i + 2 < shots.length ? timing.starts[i + 2] : timing.duration })), [shots, timing]);
  const chapters = useMemo(() => video.scenes.map((sc, n) => ({ n, name: sceneName(sc), at: timing.starts[shots.findIndex((s) => s.scene === n)] })), [video, shots, timing]);
  const [open, setOpen] = useState<number | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const handled = useRef<Set<number>>(new Set());
  const [now, setNow] = useState(0);

  const onTime = () => {
    const v = el.current; if (!v) return;
    setNow(v.currentTime);
    for (const q of quizzes) {
      if (handled.current.has(q.scene) || open !== null) continue;
      if (v.currentTime >= q.at - 0.05 && v.currentTime < q.at + COUNTDOWN_SECONDS - 0.5) { v.pause(); setOpen(q.scene); }
    }
  };
  const resume = (to: number) => {
    if (open !== null) handled.current.add(open);
    setOpen(null);
    const v = el.current; if (!v) return;
    v.currentTime = to; void v.play().catch(() => undefined);
  };
  const quiz = open !== null ? quizzes.find((q) => q.scene === open)! : null;
  const total = quizzes.length, right = quizzes.filter((q) => { const s = video.scenes[q.scene]; return s.k === 'quiz' && picked[q.scene] === s.answer; }).length;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="space-y-3" data-testid="lesson-video">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black shadow-sm">
        <video ref={el} className="block aspect-video w-full" controls playsInline preload="metadata" poster={videoSrc(video.skill, 'jpg')}
          onTimeUpdate={onTime} onError={onFail} onEnded={() => { markWatched(video.skill); onDone?.({ right, total }); }} data-testid="lesson-video-el">
          <source src={videoSrc(video.skill)} type="video/mp4" onError={onFail} />
          <track kind="captions" src={vtt} srcLang="en" label="English" default />
        </video>
        {quiz && (() => { const s = video.scenes[quiz.scene]; return (
          <div className="absolute inset-0 overflow-y-auto bg-surface/95 p-4 sm:p-8" data-testid="video-pause-quiz">
            <SceneView scene={s} b={s.say.length - 1} picked={picked[quiz.scene]} onPick={(n) => setPicked((p) => ({ ...p, [quiz.scene]: n }))} onContinue={() => resume(quiz.after)} />
            {picked[quiz.scene] === undefined && <p className="mt-3 text-center"><button type="button" className="text-sm font-semibold text-accent hover:underline" onClick={() => resume(quiz.reveal)}>Skip: show me the answer</button></p>}
          </div>
        ); })()}
      </div>
      <nav aria-label="Chapters" className="flex flex-wrap gap-1.5">
        <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-muted"><ListVideo size={14} />Chapters</span>
        {chapters.map((c, i) => { const active = now >= c.at && (i + 1 >= chapters.length || now < chapters[i + 1].at); return (
          <button key={c.n} type="button" onClick={() => { setOpen(null); const v = el.current; if (v) { v.currentTime = c.at; void v.play().catch(() => undefined); } }}
            className={cn('rounded-full border px-2.5 py-1 text-xs', active ? 'border-brand bg-brand/10 font-semibold' : 'border-line hover:border-brand', video.scenes[c.n].k === 'quiz' && 'text-gold')}>
            {video.scenes[c.n].k === 'quiz' && <CircleHelp size={12} className="mr-1 inline" />}{fmt(c.at)} · {c.name}
          </button>
        ); })}
      </nav>
    </div>
  );
}
