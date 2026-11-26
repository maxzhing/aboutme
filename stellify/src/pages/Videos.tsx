import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Clapperboard, GraduationCap, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { VIDEO, VIDEOS } from '@/data/videos';
import { DOMAINS, SECTION_NAME, SKILL, skillsOfDomain } from '@/lib/taxonomy';
import type { SkillId } from '@/lib/types';
import { beatSeconds, beatsOf, VideoFrame, VideoPlayer, watchedVideos } from '@/components/VideoPlayer';
import { shotsOf, type VideoTiming } from '@/data/videos/types';
import TIMING from '@/data/videos/timing.json';
import { LessonVideo } from '@/components/LessonVideo';
import { NarratedLesson } from '@/components/NarratedLesson';
import { approved, audioSrc, manifestOf, WALKTHROUGHS } from '@/data/narrated';
import type { Video } from '@/data/videos/types';
import { useSearchParams } from 'next/navigation';
import { SkillIcon } from '@/components/SkillIcon';
import { Empty, PageHeader } from '@/components/ui';

const minutes = (skill: SkillId) => { const v = VIDEO[skill]; return v ? Math.max(1, Math.round(beatsOf(v).reduce((t, b) => t + beatSeconds(b.say), 0) / 60)) : 0; };

/** Video lessons: one short narrated, animated video per SAT skill, the same skills as the lessons. */
export function VideosPage() {
  const watched = watchedVideos();
  const done = VIDEOS.filter((v) => watched[v.skill]).length;
  return (
    <div>
      <PageHeader eyebrow="Learn" title="Video Lessons"
        subtitle={`A short narrated video for every SAT skill: the idea, a worked question, the trap to avoid, and a question for you to try mid-video (the video stops and waits for your answer). Captions and chapters included; an animated version works offline. ${done} of ${VIDEOS.length} watched.`} />
      <WalkthroughList />
      <div className="space-y-5">
        {DOMAINS.map((d) => { const ks = skillsOfDomain(d.id).filter((k) => VIDEO[k.id]); return ks.length ? (
          <section key={d.id} aria-label={d.name} className="card overflow-hidden p-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line bg-raised/40 px-5 py-3"><h2 className="text-lg font-bold">{d.name}</h2><span className="text-xs text-muted">{SECTION_NAME[d.section]}</span></div>
            <ul className="grid gap-2 p-3 sm:grid-cols-2">
              {ks.map((k) => { const v = VIDEO[k.id]!; return (
                <li key={k.id}>
                  <Link href={`/videos/${k.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:border-brand hover:bg-brand/5" data-testid={`video-${k.id}`}>
                    <span className="relative shrink-0"><SkillIcon skill={k.id} size={48} /><span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-brand-solid text-white"><Play size={12} className="ml-0.5" /></span></span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold leading-snug">{v.title}</span><span className="block text-xs text-muted">{minutes(k.id)} min · {v.hook}</span></span>
                    {watched[k.id] && <CheckCircle2 size={18} className="shrink-0 text-ok" aria-label="Watched" />}
                  </Link>
                </li>
              ); })}
            </ul>
          </section>
        ) : null; })}
      </div>
    </div>
  );
}

export function VideoPage({ skill }: { skill: string }) {
  const v = VIDEO[skill as SkillId];
  const [score, setScore] = useState<{ right: number; total: number } | null>(null);
  const [animated, setAnimated] = useState<null | 'offline' | 'chosen'>(null);
  const timing = (TIMING as Record<string, VideoTiming>)[skill];
  const preview = useSearchParams().get('preview') === '1';
  const narrated = manifestOf(`v-${skill}`);
  const [narratedFailed, setNarratedFailed] = useState(false);
  const useNarrated = !!narrated && (approved(`v-${skill}`) || preview) && !narratedFailed && animated !== 'chosen';
  if (!v) return <Empty page title="Video not found" body="There is no video lesson for that skill yet." action={{ label: 'All video lessons', href: '/videos' }} />;
  const info = SKILL[v.skill];
  const i = VIDEOS.indexOf(v), next = VIDEOS[i + 1];
  return (
    <div>
      <PageHeader eyebrow={`Video lesson · ${SECTION_NAME[info.section]}`} title={info.name} subtitle={v.hook}
        actions={<Link href="/videos" className="btn-ghost"><ArrowLeft size={16} />All videos</Link>} />
      {useNarrated
        ? <NarratedLesson key={v.skill} video={v} timing={narrated!} src={audioSrc(narrated!.audio)} practiceHref={`/learn/${v.skill}`} onFail={() => setNarratedFailed(true)} onDone={setScore} />
        : timing && !animated
        ? <LessonVideo key={v.skill} video={v} timing={timing} onFail={() => setAnimated('offline')} onDone={setScore} />
        : <VideoPlayer key={v.skill} video={v} onDone={setScore} />}
      {timing && (animated === 'offline'
        ? <p className="mt-3 text-sm text-muted" data-testid="video-offline-note">The video file could not be loaded (it needs an internet connection), so this is the animated version, which works offline. <button type="button" className="font-semibold text-accent hover:underline" onClick={() => setAnimated(null)}>Try the video again</button></p>
        : <p className="mt-3 text-xs text-muted">{animated ? <button type="button" className="font-semibold text-accent hover:underline" onClick={() => setAnimated(null)}>Back to the video</button> : <button type="button" className="font-semibold text-accent hover:underline" onClick={() => setAnimated('chosen')} data-testid="use-animated">Use the interactive animated version instead (works offline)</button>}</p>)}
      <div className="mt-5 flex flex-wrap gap-2" data-testid="video-after">
        <Link href={`/practice/session?mode=skill&skill=${v.skill}&n=8`} className={score ? 'btn-primary' : 'btn-ghost'}>Practice this skill<ArrowRight size={16} /></Link>
        <Link href={`/learn/${v.skill}`} className="btn-ghost"><GraduationCap size={16} />Full course</Link>
        {next && <Link href={`/videos/${next.skill}`} className="btn-ghost"><Clapperboard size={16} />Next video: {SKILL[next.skill].short}</Link>}
      </div>
      {(!timing || animated) && <p className="mt-4 text-xs text-muted">Keys: Space plays and pauses, the arrow keys step one sentence, C turns captions on and off. In this version the voice is your browser’s built-in speech, so it sounds different on different devices.</p>}
    </div>
  );
}

/**
 * Used only by scripts/videos/render.mjs to film a video: one 1280 × 720 frame over the whole page, moved from shot
 * to shot by the script (window.__shot). Not linked from anywhere in the app.
 */
export function VideoRenderPage({ skill }: { skill: string }) {
  const v = VIDEO[skill as SkillId];
  const [i, setI] = useState(0);
  useEffect(() => { (window as unknown as { __shot: (n: number) => void }).__shot = setI; }, []);
  if (!v) return null;
  const shots = shotsOf(v);
  return createPortal(<div className="fixed inset-0 z-[1000] bg-surface"><VideoFrame video={v} shot={shots[i]} /></div>, document.body);
}

function WalkthroughList() {
  const preview = typeof location !== 'undefined' && /[?&]preview=1/.test(location.hash + location.search);
  const list = WALKTHROUGHS.filter((w) => manifestOf(w.id) && (approved(w.id) || preview));
  if (!list.length) return null;
  return (
    <section aria-label="Hard-problem walkthroughs" className="card mb-5 p-0" data-testid="walkthrough-list">
      <div className="border-b border-line bg-raised/40 px-5 py-3"><h2 className="text-lg font-bold">Hard-problem walkthroughs</h2><p className="text-xs text-muted">One problem, built to be challenging, solved step by step: try it first, read it like the test-writer, solve it, see the trap.</p></div>
      <ul className="grid gap-2 p-3 sm:grid-cols-2">
        {list.map((w) => (
          <li key={w.id}><Link href={`/videos/w/${w.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:border-brand hover:bg-brand/5" data-testid={`walkthrough-${w.id}`}>
            <SkillIcon skill={w.skill} size={44} />
            <span className="min-w-0 flex-1"><span className="block font-semibold leading-snug">{w.title}</span><span className="block text-xs text-muted">{SKILL[w.skill].name} · {Math.round(manifestOf(w.id)!.duration / 60)} min</span></span>
          </Link></li>
        ))}
      </ul>
    </section>
  );
}

/** One hard-problem walkthrough: its scenes load only now. */
export function WalkthroughPage({ id }: { id: string }) {
  const w = WALKTHROUGHS.find((x) => x.id === id);
  const m = w && manifestOf(w.id);
  const preview = useSearchParams().get('preview') === '1';
  const [video, setVideo] = useState<Video | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (w) void w.load().then(setVideo); }, [w]);
  if (!w || !m || !(approved(w.id) || preview)) return <Empty page title="Walkthrough not available yet" body="This lesson is still being reviewed." action={{ label: 'All video lessons', href: '/videos' }} />;
  return (
    <div>
      <PageHeader eyebrow={`Hard-problem walkthrough · ${SECTION_NAME[SKILL[w.skill].section]}`} title={w.title} subtitle="Built to be challenging. Try it first, then follow every step." actions={<Link href="/videos" className="btn-ghost"><ArrowLeft size={16} />All videos</Link>} />
      {failed ? <p className="card p-5 text-sm">The narration could not be loaded (it needs an internet connection the first time). <Link href={`/learn/${w.skill}`} className="font-semibold text-accent hover:underline">Open the {SKILL[w.skill].name} course instead</Link>.</p>
        : video ? <NarratedLesson video={video} timing={m} src={audioSrc(m.audio)} practiceHref={`/learn/${w.skill}`} onFail={() => setFailed(true)} />
        : <p className="card p-8 text-center text-sm text-muted">Loading the lesson…</p>}
      <p className="mt-4 text-xs text-muted">SAT® is a trademark registered by the College Board, which is not affiliated with Stellify and does not endorse this lesson. The problem is original.</p>
    </div>
  );
}
