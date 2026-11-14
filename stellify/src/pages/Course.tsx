'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Eye, Lock, NotebookPen, Play, RotateCcw, Star, Swords, Target, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SkillId } from '@/lib/types';
import { COURSES, CHAPTER, TRAP, type Chapter } from '@/data/courses';
import { VISUAL_LESSONS } from '@/data/visual-lessons';
import { chapterQuestions, chapterSet, passed } from '@/lib/course';
import { useStore } from '@/lib/store';
import { useSkillStats } from '@/lib/hooks';
import { isCorrect, LETTERS } from '@/lib/answers';
import { MASTERY_LEVELS } from '@/lib/engine/mastery';
import { DIFFICULTY_NAME, DOMAIN, SECTION_NAME, SKILL, SKILLS } from '@/lib/taxonomy';
import { sfx } from '@/lib/sfx';
import { uid } from '@/lib/util';
import { VisualView } from '@/components/Visuals';
import { Explanation, QuestionMeta, QuestionView } from '@/components/Question';
import { RichText } from '@/components/RichText';
import { Confetti } from '@/components/Confetti';
import { Badge, Card, Empty, PageHeader, Progress, cn } from '@/components/ui';

const stars = (c: number, t: number) => (t === 0 ? 0 : c === t ? 3 : passed(c, t) ? 2 : 1);

/** A skill's full course: its chapters in order, progress, the skill exam, and the traps you have fallen for. */
export function CoursePage({ skill }: { skill: SkillId }) {
  const info = SKILL[skill];
  const chapters = COURSES[skill];
  const done = useStore((s) => s.chapters) ?? {};
  const traps = useStore((s) => s.traps) ?? {};
  const attempts = useStore((s) => s.attempts);
  const st = useSkillStats()[skill];
  const passedN = chapters.filter((c) => done[c.id]?.passedAt).length;
  const next = chapters.find((c) => !done[c.id]?.passedAt);
  const mine = Object.entries(traps).filter(([id]) => TRAP[id]?.skill === skill).sort((a, b) => b[1].n - a[1].n);
  const examIds = useMemo(() => {
    const solved = new Set(attempts.filter((a) => a.correct).map((a) => a.qid));
    // two of the hardest unsolved questions from each chapter
    return chapters.flatMap((c) => chapterQuestions(c).filter((q) => q.difficulty !== 'medium' && !solved.has(q.id)).sort((a, b) => ['elite', 'very-hard', 'hard'].indexOf(a.difficulty) - ['elite', 'very-hard', 'hard'].indexOf(b.difficulty)).slice(0, 2).map((q) => q.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill, attempts.length]);
  return (
    <div className="mx-auto max-w-4xl" data-testid="course">
      <PageHeader eyebrow={`${SECTION_NAME[info.section]} · ${DOMAIN[info.domain].name} · Full course`} title={`${VISUAL_LESSONS[skill].icon} ${info.name}`}
        subtitle={`${chapters.length} chapters. Each one teaches a piece of this skill step by step with pictures, shows the method, works a hard problem in front of you, names the traps, then tests you on hard questions.`}
        actions={<><Link href={`/learn/${skill}?view=quick`} className="btn-ghost" data-testid="quick-lesson"><Zap size={16} />5-min quick lesson</Link><Link href={`/learn/${skill}?view=notes`} className="btn-ghost"><BookOpen size={16} />Full notes</Link></>} />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1"><div className="flex justify-between text-sm font-semibold"><span>Course progress</span><span className="text-muted" data-testid="course-progress">{passedN} of {chapters.length} chapters passed</span></div><Progress value={(passedN / chapters.length) * 100} className="mt-2" tone={passedN === chapters.length ? 'ok' : 'brand'} label="Course progress" /></div>
          <Badge tone={st.level >= 3 ? 'ok' : 'brand'}>{MASTERY_LEVELS[st.level]}</Badge>
          {next ? <Link href={`/learn/${skill}/${next.id}`} className="btn-primary" data-testid="course-continue"><Play size={16} />{passedN ? 'Continue' : 'Start'}: Chapter {next.n}</Link> : <span className="text-sm font-semibold text-ok">Course complete ✓</span>}
        </div>
      </Card>
      <ol className="space-y-3">
        {chapters.map((c) => { const r = done[c.id]; const pool = chapterQuestions(c).length; const isNext = next?.id === c.id; return (
          <li key={c.id}>
            <Link href={`/learn/${skill}/${c.id}`} className={cn('card flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-brand/60', isNext && 'border-brand/60 bg-brand/5')} data-testid={`chapter-${c.id}`}>
              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full font-display text-lg font-bold', r?.passedAt ? 'bg-ok text-white' : isNext ? 'bg-[#6A4BF0] text-white' : 'bg-raised text-muted')}>{r?.passedAt ? <Check size={20} /> : c.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{c.title}</span>
                <span className="block text-sm text-muted">{c.goal}</span>
                <span className="mt-1 block text-xs text-faint">{c.teach.length} picture lessons · {c.method.length}-step method · {c.traps.length} traps · {pool} practice question{pool === 1 ? '' : 's'}</span>
              </span>
              <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                {r && <span className="flex gap-0.5" aria-label={`${stars(r.best, r.total)} of 3 stars`}>{[1, 2, 3].map((x) => <Star key={x} size={14} className={x <= stars(r.best, r.total) ? 'fill-gold text-gold' : 'text-line'} />)}</span>}
                <span className="text-xs text-muted">{r ? `best ${r.best}/${r.total}` : isNext ? 'Up next' : 'Not started'}</span>
              </span>
            </Link>
          </li>
        ); })}
      </ol>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-bold"><Swords size={18} className="text-bad" />Skill exam</h2>
          <p className="mt-1 text-sm text-muted">The two hardest questions you have not solved from every chapter, timed like the real test. Take it once you have passed the chapters.</p>
          {examIds.length ? <Link href={`/practice/session?mode=custom&ids=${examIds.join(',')}&back=/learn/${skill}`} className="btn-primary mt-3" data-testid="skill-exam">Start the exam · {examIds.length} questions</Link> : <p className="mt-3 text-sm font-semibold text-ok">You have solved every hard question in this skill.</p>}
        </Card>
        <Card data-testid="course-traps">
          <h2 className="flex items-center gap-2 font-bold"><Target size={18} className="text-warn" />Traps that have caught you here</h2>
          {mine.length ? <ul className="mt-2 space-y-2">{mine.slice(0, 4).map(([id, t]) => <li key={id} className="text-sm"><b>{TRAP[id].name}</b> <span className="text-muted">×{t.n}</span><div className="text-xs text-muted">Fix: {TRAP[id].fix}</div></li>)}</ul>
            : <p className="mt-1 text-sm text-muted">None yet. When you miss a question, tell Stellify which trap got you and it will keep track, so you can drill exactly that.</p>}
          <Link href="/mistakes" className="mt-3 inline-block text-sm font-semibold text-brand2 hover:underline">All your traps →</Link>
        </Card>
      </div>
    </div>
  );
}

type Step =
  | { t: 'intro' } | { t: 'teach'; i: number } | { t: 'method' } | { t: 'walk' } | { t: 'traps' } | { t: 'practice'; i: number } | { t: 'done' };

/**
 * One chapter, step by step: goal → picture lessons → the method → a worked hard problem revealed one
 * step at a time → the traps → three hard practice questions with full explanations → result.
 */
export function ChapterPage({ skill, chapter }: { skill: string; chapter: string }) {
  const ch = CHAPTER[chapter];
  if (!ch || ch.skill !== skill) return <Empty title="Chapter not found" body="That chapter does not exist." action={{ label: 'Back to the curriculum', href: '/learn' }} />;
  return <ChapterPlayer key={ch.id} ch={ch} />;
}

function ChapterPlayer({ ch }: { ch: Chapter }) {
  const router = useRouter();
  const attempts = useStore((s) => s.attempts);
  const answer = useStore((s) => s.answer);
  const finish = useStore((s) => s.finishChapter);
  const mistakes = useStore((s) => s.mistakes);
  const setCat = useStore((s) => s.setMistakeCategory);
  const [round, setRound] = useState(0);
  // the question set is fixed for each pass, so it does not change as you answer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const set = useMemo(() => chapterSet(ch, useStore.getState().attempts), [ch, round]);
  const steps = useMemo<Step[]>(() => [
    { t: 'intro' }, ...ch.teach.map((_, i) => ({ t: 'teach' as const, i })), { t: 'method' },
    ...(set.walk ? [{ t: 'walk' as const }] : []), { t: 'traps' }, ...set.practice.map((_, i) => ({ t: 'practice' as const, i })), { t: 'done' },
  ], [ch, set]);
  const [k, setK] = useState(0);
  const [methodSeen, setMethodSeen] = useState(1);
  const [walkN, setWalkN] = useState(0);
  const [guess, setGuess] = useState<string | null>(null);
  const [ans, setAns] = useState<Record<string, string | null>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [fire, setFire] = useState(0);
  const session = useRef(uid());
  const shownAt = useRef(Date.now());
  const step = steps[k];
  const all = COURSES[ch.skill];
  const nextCh = all[ch.n];
  const correct = set.practice.filter((q) => checked[q.id] && isCorrect(q, ans[q.id] ?? null)).length;

  useEffect(() => { shownAt.current = Date.now(); window.scrollTo({ top: 0 }); }, [k]);
  useEffect(() => {
    if (step.t !== 'done') return;
    finish(ch.id, correct, set.practice.length);
    if (passed(correct, set.practice.length)) { setFire(Date.now()); sfx('win'); }
    useStore.setState((s) => ({ events: s.events.filter((e) => e.type !== 'xp') }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.t]);

  const blocked = (step.t === 'method' && methodSeen < ch.method.length) || (step.t === 'walk' && walkN < (set.walk?.steps.length ?? 0))
    || (step.t === 'practice' && !checked[set.practice[step.i].id]);
  const go = (d: number) => { const n = Math.max(0, Math.min(steps.length - 1, k + d)); if (d > 0 && blocked) return; setK(n); sfx('tap'); };
  const check = (id: string) => {
    const q = set.practice.find((x) => x.id === id)!;
    const a = ans[id] ?? null;
    if (a === null || a === '' || checked[id]) return;
    answer({ qid: id, answer: a, ms: Date.now() - shownAt.current, hints: 0, mode: 'lesson', sessionId: session.current });
    setChecked((c) => ({ ...c, [id]: true }));
    if (isCorrect(q, a)) { sfx('correct'); setFire(Date.now()); } else sfx('wrong');
  };
  const restart = () => { setRound((r) => r + 1); setK(steps.findIndex((s) => s.t === 'practice') > 0 ? 1 : 0); setAns({}); setChecked({}); setWalkN(0); setGuess(null); setMethodSeen(1); };

  let body: React.ReactNode;
  if (step.t === 'intro') body = (
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-brand2">{SKILL[ch.skill].short} · Chapter {ch.n} of {all.length}</p>
      <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{ch.title}</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted"><b className="text-ink">By the end:</b> {ch.goal}</p>
      <ol className="mx-auto mt-6 grid max-w-2xl gap-2 text-left text-sm sm:grid-cols-5">
        {[['🖼️', `${ch.teach.length} picture lessons`], ['🧭', `${ch.method.length}-step method`], ['✍️', 'worked hard problem'], ['🪤', `${ch.traps.length} traps to dodge`], ['⚔️', `${set.practice.length} hard questions`]].map(([i, t], n) => <li key={t} className="rounded-xl border border-line p-2.5 text-center"><div className="text-2xl" aria-hidden>{i}</div><div className="mt-1 text-xs font-semibold"><span className="text-faint">{n + 1}. </span>{t}</div></li>)}
      </ol>
    </div>
  );
  else if (step.t === 'teach') { const idea = ch.teach[step.i]; body = (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-brand2">Lesson {step.i + 1} of {ch.teach.length}</p>
      <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">{idea.title}</h2>
      <p className="mt-1.5 text-[15px] text-muted"><RichText text={idea.text} /></p>
      <div className="mt-4 rounded-2xl border border-line bg-raised/40 p-3 sm:p-5"><VisualView v={idea.visual} /></div>
      {idea.try && <p className="mt-3 text-center text-sm font-semibold text-brand2">👆 {idea.try}</p>}
    </div>
  ); }
  else if (step.t === 'method') body = (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-brand2">🧭 The method</p>
      <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">Do it in this order, every time</h2>
      <p className="mt-1 text-sm text-muted">Read each step, then reveal the next. You will use exactly these steps on the hard problem next.</p>
      <ol className="mt-4 space-y-2" data-testid="method">
        {ch.method.slice(0, methodSeen).map((m, i) => <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-xl border border-line bg-surface p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#6A4BF0] text-sm font-bold text-white">{i + 1}</span><span className="pt-0.5"><RichText text={m} /></span></motion.li>)}
      </ol>
      {methodSeen < ch.method.length && <button type="button" className="btn-ghost mt-3" onClick={() => setMethodSeen(methodSeen + 1)} data-testid="method-next">Next step ({methodSeen}/{ch.method.length})</button>}
    </div>
  );
  else if (step.t === 'walk' && set.walk) { const q = set.walk; const all_ = walkN >= q.steps.length; body = (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-brand2">✍️ Worked example · {DIFFICULTY_NAME[q.difficulty]}</p>
      <p className="mt-1 text-sm text-muted">Pick what you think first (it is not graded), then reveal the solution one step at a time and compare with the method.</p>
      <div className="mt-3"><QuestionView q={q} answer={guess} onAnswer={(v) => !all_ && setGuess(v)} locked={all_} reveal={all_} /></div>
      <ol className="mt-4 space-y-2" data-testid="walk-steps">
        {q.steps.slice(0, walkN).map((s, i) => <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3 rounded-xl border p-3 text-[15px]', i === q.steps.length - 1 ? 'border-ok/50 bg-ok/10' : 'border-line bg-raised/40')}><b className="shrink-0 text-brand2">Step {i + 1}</b><span><RichText text={s} /></span></motion.li>)}
      </ol>
      {!all_ ? <button type="button" className="btn-primary mt-3" onClick={() => setWalkN(walkN + 1)} data-testid="walk-next"><Eye size={16} />{walkN === 0 ? 'Show step 1' : `Show step ${walkN + 1} of ${q.steps.length}`}</button>
        : q.type === 'mcq' && <div className="mt-3 rounded-xl border border-line p-3.5 text-sm"><b>Why the other choices fail</b><ul className="mt-1.5 space-y-1.5">{q.choices!.map((c, i) => i === q.answer ? null : <li key={i} className="flex gap-2"><span className="font-bold text-bad">{LETTERS[i]}</span><span><RichText text={q.why[i]} /></span></li>)}</ul>{guess !== null && <p className={cn('mt-2 font-semibold', isCorrect(q, guess) ? 'text-ok' : 'text-bad')}>Your guess was {LETTERS[Number(guess)]}: {isCorrect(q, guess) ? 'right!' : 'see why above.'}</p>}</div>}
    </div>
  ); }
  else if (step.t === 'traps') body = (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-bad">🪤 The traps</p>
      <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">How this topic steals points, and the fix</h2>
      <p className="mt-1 text-sm text-muted">Wrong answers on the SAT are built from these. Learn to recognize them on sight.</p>
      <div className="mt-4 space-y-3" data-testid="traps">
        {ch.traps.map((t, i) => (
          <div key={t.id} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[180px_1fr_1fr]">
            <div className="font-bold"><span className="mr-1.5 text-bad">#{i + 1}</span>{t.name}</div>
            <div className="rounded-xl border border-bad/30 bg-bad/5 p-2.5 text-sm"><div className="text-[11px] font-black uppercase tracking-wide text-bad">✗ Looks like</div><RichText text={t.looks} /></div>
            <div className="rounded-xl border border-ok/30 bg-ok/5 p-2.5 text-sm"><div className="text-[11px] font-black uppercase tracking-wide text-ok">✓ The fix</div><RichText text={t.fix} /></div>
          </div>
        ))}
      </div>
    </div>
  );
  else if (step.t === 'practice') { const q = set.practice[step.i]; const done = !!checked[q.id]; body = (
    <div data-testid="chapter-practice" data-qid={q.id}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-widest text-bad">⚔️ Hard question {step.i + 1} of {set.practice.length}</p><QuestionMeta q={q} /></div>
      <QuestionView q={q} answer={ans[q.id] ?? null} onAnswer={(v) => !done && setAns((a) => ({ ...a, [q.id]: v }))} locked={done} reveal={done} />
      {!done ? <button type="button" className="btn-primary mt-4" disabled={!ans[q.id]} onClick={() => check(q.id)} data-testid="chapter-check">Check my answer</button>
        : <div className="mt-4"><Explanation q={q} answer={ans[q.id] ?? null} category={mistakes[q.id]?.category} onCategory={(c) => setCat(q.id, c)} /></div>}
    </div>
  ); }
  else { const tot = set.practice.length; const ok = passed(correct, tot); const s_ = stars(correct, tot); body = (
    <div className="text-center" data-testid="chapter-done">
      <h2 className="font-display text-2xl font-bold">{ok ? 'Chapter passed!' : 'Not passed yet'}</h2>
      <div className="mt-3 flex justify-center gap-2" data-testid="chapter-stars" data-stars={s_}>{[1, 2, 3].map((n) => <motion.span key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.12 * n, type: 'spring' }}><Star size={40} className={n <= s_ ? 'fill-gold text-gold' : 'text-line'} /></motion.span>)}</div>
      <p className="mt-3 text-lg font-semibold" data-testid="chapter-score">{correct} of {tot} hard questions right</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{ok ? `+50 XP the first time you pass. ${correct < tot ? 'The one you missed is in your Mistake Bucket and will come back.' : 'Perfect run.'}` : 'You need 2 of 3 to pass. Go over the traps again and retry with new questions; the ones you missed are saved in your Mistake Bucket.'}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {ok && nextCh && <Link href={`/learn/${ch.skill}/${nextCh.id}`} className="btn-primary" data-testid="next-chapter">Next: Chapter {nextCh.n}<ArrowRight size={16} /></Link>}
        <button type="button" className={ok ? 'btn-ghost' : 'btn-primary'} onClick={restart} data-testid="retry-chapter"><RotateCcw size={16} />{ok ? 'Practice again with new questions' : 'Retry with new questions'}</button>
        <Link href={`/learn/${ch.skill}`} className="btn-ghost">Back to the course</Link>
        <Link href={`/notes`} className="btn-quiet"><NotebookPen size={15} />Notebook</Link>
      </div>
    </div>
  ); }

  const label: Record<Step['t'], string> = { intro: 'Start', teach: 'Lessons', method: 'Method', walk: 'Worked example', traps: 'Traps', practice: 'Hard questions', done: 'Result' };
  return (
    <div className="mx-auto max-w-4xl" data-testid="chapter-player">
      <Confetti fire={fire} count={step.t === 'done' ? 70 : 22} />
      <div className="mb-3 flex items-center gap-3">
        <button type="button" className="btn-quiet !px-2" onClick={() => router.push(`/learn/${ch.skill}`)} aria-label="Back to the course"><X size={20} /></button>
        <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={k} aria-label="Chapter progress">
          {steps.slice(1).map((s, i) => <span key={i} title={label[s.t]} className={cn('h-2.5 flex-1 rounded-full transition-colors', i < k ? (s.t === 'practice' ? 'bg-bad' : s.t === 'traps' ? 'bg-warn' : s.t === 'walk' ? 'bg-ok' : 'bg-gradient-to-r from-brand to-brand2') : 'bg-raised')} />)}
        </div>
        <span className="hidden text-xs font-semibold text-muted sm:inline">{label[step.t]}</span>
      </div>
      <div className="card min-h-[420px] overflow-x-clip p-5 sm:p-7">
        <AnimatePresence mode="wait"><motion.div key={`${round}-${k}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.16 }}>{body}</motion.div></AnimatePresence>
      </div>
      {step.t !== 'done' && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" className="btn-ghost" onClick={() => go(-1)} disabled={k === 0}><ArrowLeft size={16} />Back</button>
          {blocked && <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex"><Lock size={13} />{step.t === 'practice' ? 'Answer to continue' : 'Reveal every step to continue'}</span>}
          <button type="button" className="btn-primary !px-6 !py-3 text-base" onClick={() => go(1)} disabled={blocked} data-testid="chapter-next">{step.t === 'intro' ? 'Start' : k === steps.length - 2 ? 'See my result' : 'Continue'}<ArrowRight size={18} /></button>
        </div>
      )}
      {step.t === 'intro' && <p className="mt-4 text-center text-xs text-faint">Other chapters: {all.map((c) => <Link key={c.id} href={`/learn/${c.skill}/${c.id}`} className={cn('mx-1 hover:underline', c.id === ch.id && 'font-bold text-ink')}>{c.n}</Link>)} · <Link href={`/learn/${ch.skill}`} className="hover:underline">course overview</Link></p>}
      {step.t === 'done' && <CheckCircle2 className="hidden" aria-hidden />}
    </div>
  );
}

/** Skills ordered for "what to study next" lists. */
export const skillOrder = SKILLS.map((s) => s.id);
