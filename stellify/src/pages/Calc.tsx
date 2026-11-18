'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Piano, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, Eye, GraduationCap, Image as ImageIcon, Languages, Lightbulb, Lock, MessageCircleQuestion, NotebookPen, Play, Presentation, RotateCcw, Sparkles, Sprout, Target, TriangleAlert, Wrench, X } from 'lucide-react';
import { createContext, useContext, useMemo, useState } from 'react';
import { PASS, answerLabel, calcCorrect, noteText, type CalcLesson, type CalcProblem, type LessonTutor, type Note } from '@/data/calc';
import { KeysNote, ListenButton, Score, TaskView, TryIt } from '@/components/music/MusicBits';
import { COURSES, courseOfLesson, lessonById, walkOf, type ApCourse } from '@/data/apCourses';

/** the course a page is showing; inner components read it instead of threading props */
const CourseCtx = createContext<ApCourse>(COURSES.calc);
const useCourse = () => useContext(CourseCtx);
import { useStore } from '@/lib/store';
import { useLevel } from '@/lib/hooks';
import { sfx } from '@/lib/sfx';
import { dateKey, daysBetween, pct, rng, shuffle } from '@/lib/util';
import { RichText } from '@/components/RichText';
import { HighlightText, MarkNotes } from '@/components/Highlight';
import { Pet } from '@/components/Pet';
import { Confetti } from '@/components/Confetti';
import { Badge, Card, Empty, Progress, Ring, cn } from '@/components/ui';

const UNIT_COLOR = ['#475569', '#1D4ED8', '#4338CA', '#6D28D9', '#BE185D', '#B45309', '#047857', '#0369A1', '#15803D', '#7E22CE', '#B91C1C'];
const UnitTile = ({ n, size = 48 }: { n: number; size?: number }) => (
  <span className={cn('relative inline-grid shrink-0 place-items-center rounded-2xl font-display font-bold text-white')} style={{ width: size, height: size, fontSize: size * 0.42, background: UNIT_COLOR[n] ?? UNIT_COLOR[1] }} aria-hidden>{n}</span>
);

/** Course home: the whole self-study plan, unit by unit, with progress and pacing. */
export function CourseHomePage({ course: cid }: { course: string }) {
  const course = COURSES[cid];
  if (!course) return <Empty title="Course not found" body="That course does not exist." action={{ label: 'Dashboard', href: '/' }} />;
  return <CourseCtx.Provider value={course}><CourseHome /></CourseCtx.Provider>;
}

function CourseHome() {
  const course = useCourse();
  const { lessons, units } = course;
  const calc = useStore((s) => s.calc) ?? { done: {}, answers: {} };
  const setExam = useStore((s) => s.setCalcExam);
  const examDate = course.id === 'calc' ? calc.examDate : calc.examDates?.[course.id];
  const done = lessons.filter((l) => calc.done[l.id] && calc.done[l.id].score / calc.done[l.id].total >= PASS);
  const next = lessons.find((l) => !done.includes(l));
  const [open, setOpen] = useState<number | null>(() => next?.unit ?? 1);
  const totalWeeks = units.reduce((s, u) => s + u.weeks, 0);
  const today = dateKey();
  const daysLeft = examDate ? daysBetween(today, examDate) : null;
  const weeksLeft = daysLeft !== null ? Math.max(1, Math.floor(daysLeft / 7)) : null;
  // weeks of material still ahead (written lessons count as done when mastered)
  const unitsLeft = units.filter((u) => { const ls = course.lessonsOfUnit(u.n); return !ls.length || ls.some((l) => !done.includes(l)); });
  const weeksNeeded = unitsLeft.reduce((s, u) => s + u.weeks, 0) + 3; // + 3 weeks of full-exam review
  const answered = Object.values(calc.answers);
  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="calc-home">
      <section className="card-hero p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="hidden sm:block"><Pet mood="study" size={120} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/95">Self-study course · with your teacher</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{course.name}</h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/90">{course.blurb} Pass each lesson at {Math.round(PASS * 100)}% before moving on.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {next ? <Link href={`/${course.id}/${next.id}`} className="btn !bg-white !px-5 !py-3 text-[15px] !text-[#2A2470] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] hover:-translate-y-px" data-testid="calc-continue"><Play size={17} />{done.length ? 'Continue' : 'Start'}: {next.unit}.{next.n} {next.title}</Link> : <span className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold">All lessons mastered ✓</span>}
              <a href="#plan" className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20"><CalendarDays size={16} />Study plan</a>
              {course.id === 'music' && <Link href="/music/studio" className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20" data-testid="open-studio"><Piano size={16} />Music Studio</Link>}
            </div>
          </div>
          <div className="text-center">
            <Ring value={pct(done.length, lessons.length)} size={104} stroke={8} label="Lessons mastered"><div className="leading-tight"><div className="font-display text-2xl font-bold">{done.length}/{lessons.length}</div><div className="text-[10px] font-semibold text-white/90">lessons</div></div></Ring>
            <p className="mt-2 text-xs font-semibold text-white/90">{answered.length ? `${pct(answered.filter((a) => a.correct).length, answered.length)}% first-try accuracy` : 'No problems yet'}</p>
          </div>
        </div>
      </section>

      <Card id="plan" className="scroll-mt-24">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold"><CalendarDays size={20} className="text-brand" />Your study plan</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">The course takes about {totalWeeks} weeks of lessons plus 3 weeks of full-exam review. Enter your AP exam date and the plan tells you how fast to go.</p>
          </div>
          <label className="text-sm"><span className="label">AP exam date</span><input type="date" className="input !w-44" value={examDate ?? ''} onChange={(e) => setExam(e.target.value || undefined, course.id)} data-testid="calc-exam" /></label>
        </div>
        {weeksLeft !== null && (
          <div className={cn('mt-4 rounded-2xl border p-4 text-sm', weeksNeeded <= weeksLeft ? 'border-ok/40 bg-ok/10' : 'border-warn/40 bg-warn/10')} data-testid="calc-pace">
            <b>{weeksLeft} weeks until your exam.</b> You have about {weeksNeeded} weeks of work left (including review). {weeksNeeded <= weeksLeft ? `Comfortable pace: about ${Math.max(1, Math.ceil((lessons.length - done.length) / Math.max(1, weeksLeft - 3)))} lessons a week on the written units, and you will have spare weeks.` : `You need to speed up: plan about ${Math.ceil((weeksNeeded / weeksLeft) * 10) / 10}× the normal pace, or study 5–6 days a week.`}
          </div>
        )}
        <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(() => { let w = 1; return units.map((u) => { const from = w; w += u.weeks; return (
            <li key={u.n} className="rounded-xl border border-line bg-raised/40 p-3 text-xs"><div className="font-bold text-ink">Weeks {from}{u.weeks > 1 ? `–${w - 1}` : ''}</div><div className="mt-0.5 text-muted">{u.n ? `Unit ${u.n}` : 'Toolkit'}: {u.title}</div></li>
          ); }); })()}
          <li className="rounded-xl border border-gold/40 bg-gold/5 p-3 text-xs"><div className="font-bold text-ink">Weeks {totalWeeks + 1}–{totalWeeks + 3}</div><div className="mt-0.5 text-muted">Full practice exams and review of your weakest units</div></li>
        </ol>
      </Card>

      <div className="space-y-3">
        {units.map((u) => { const ls = course.lessonsOfUnit(u.n); const m = ls.filter((l) => done.includes(l)).length; const isOpen = open === u.n; return (
          <section key={u.n} className="card overflow-hidden p-0" data-testid={`calc-unit-${u.n}`}>
            <button type="button" className="flex w-full items-center gap-4 p-4 text-left sm:p-5" onClick={() => setOpen(isOpen ? null : u.n)} aria-expanded={isOpen}>
              <UnitTile n={u.n} />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold leading-snug">{u.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{u.n ? (u.examWeight ? `${u.examWeight} of the exam` : 'On the AP exam') : 'Start here if you are new · not on the exam'} · about {u.weeks} week{u.weeks > 1 ? 's' : ''} · {ls.length ? `${m}/${ls.length} lessons mastered` : `${u.topics.length} topics`}</span>
              </span>
              {ls.length ? <Progress value={pct(m, ls.length)} className="!w-24 hidden sm:block" tone={m === ls.length ? 'ok' : 'brand'} label={`Unit ${u.n} progress`} /> : <Badge>Lessons coming</Badge>}
              <ChevronDown size={18} className={cn('shrink-0 text-muted transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="border-t border-line px-4 pb-5 pt-4 sm:px-5">
                <p className="text-sm text-muted">{u.summary}</p>
                {ls.length ? (
                  <ol className="mt-4 space-y-2">
                    {ls.map((l) => { const r = calc.done[l.id]; const ok = done.includes(l); return (
                      <li key={l.id}>
                        <Link href={`/${course.id}/${l.id}`} className={cn('flex items-center gap-3 rounded-2xl border p-3 transition-all hover:-translate-y-0.5 hover:border-accent/50', next?.id === l.id ? 'border-brand/50 bg-brand/5' : 'border-line')} data-testid={`calc-lesson-${l.id}`}>
                          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-sm font-bold', ok ? 'bg-[#047857] text-white' : next?.id === l.id ? 'bg-brand-solid text-white' : 'bg-raised text-muted')}>{ok ? <Check size={18} /> : `${l.unit}.${l.n}`}</span>
                          <span className="min-w-0 flex-1"><span className="block font-semibold">{l.title}</span><span className="block truncate text-xs text-muted">{l.examples.length} worked examples · {l.practice.length} practice problems</span></span>
                          <span className="text-xs text-muted">{r ? `best ${r.score}/${r.total}` : next?.id === l.id ? 'Up next' : ''}</span>
                        </Link>
                      </li>
                    ); })}
                    <li><Link href={`/${course.id}/review/${u.n}`} className="flex items-center gap-3 rounded-2xl border border-dashed border-gold/50 p-3 hover:bg-gold/5" data-testid={`calc-review-${u.n}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/15 text-gold"><Target size={18} /></span><span className="flex-1"><span className="block font-semibold">{u.n ? `Unit ${u.n}` : 'Toolkit'} review</span><span className="block text-xs text-muted">Mixed problems from every lesson, no hints until you answer</span></span><ArrowRight size={16} className="text-muted" /></Link></li>
                  </ol>
                ) : (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-faint">What this unit covers</h3>
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{u.topics.map((t) => <li key={t} className="flex gap-2 text-sm"><Lock size={14} className="mt-0.5 shrink-0 text-faint" />{t}</li>)}</ul>
                    <p className="mt-3 text-xs text-faint">Full lessons for this unit have not been written yet. The topics are listed so you can plan; in the meantime, the AI tutor can explain any of them.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        ); })}
      </div>
    </div>
  );
}

/** The tutor's plain-words opening: the big idea, an everyday picture, new words and the tools from earlier math. */
function TutorIntro({ t }: { t: LessonTutor }) {
  return (
    <>
      <Card className="space-y-3 border-ok/30" data-testid="calc-bigidea">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Sprout size={20} className="text-ok" />The big idea, in plain words</h2>
        <div className="space-y-3 text-[15.5px] leading-relaxed">{t.bigIdea.map((p, i) => <p key={i}><RichText text={p} /></p>)}</div>
        <div className="flex gap-3 rounded-2xl border border-brand2/30 bg-brand2/5 p-4">
          <ImageIcon size={20} className="mt-0.5 shrink-0 text-brand2" />
          <div><div className="text-[11px] font-black uppercase tracking-wide text-brand2">Picture it</div><div className="font-bold">{t.picture.title}</div><p className="mt-1 leading-relaxed"><RichText text={t.picture.t} /></p></div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="calc-words">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Languages size={18} className="text-brand" />Words to know</h2>
          <dl className="mt-3 space-y-2.5">{t.words.map((w) => <div key={w.term} className="rounded-xl border border-line bg-raised/40 p-3"><dt className="font-bold"><RichText text={w.term} /></dt><dd className="mt-0.5 text-sm leading-relaxed text-muted"><RichText text={w.means} /></dd></div>)}</dl>
        </Card>
        <Card data-testid="calc-tools">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Wrench size={18} className="text-gold" />Tools you will use</h2>
          <p className="mt-1 text-xs text-muted">Math from before that this lesson leans on. If one looks unfamiliar, review it first.</p>
          <ul className="mt-3 space-y-2.5">{t.tools.map((x) => { const ref = x.lesson ? lessonById(x.lesson) : undefined; const refCourse = x.lesson ? courseOfLesson(x.lesson) : undefined; return (
            <li key={x.name} className="rounded-xl border border-line bg-raised/40 p-3"><div className="font-bold"><RichText text={x.name} /></div><p className="mt-0.5 text-sm leading-relaxed text-muted"><RichText text={x.refresher} /></p>{ref && refCourse && <Link href={`/${refCourse.id}/${ref.id}`} className="mt-1 inline-block text-xs font-semibold text-accent hover:underline">Review {ref.unit}.{ref.n} {ref.title} →</Link>}</li>
          ); })}</ul>
        </Card>
      </div>
    </>
  );
}

/** Teach it back: the best proof of understanding. A plan, the questions students ask, and a self-check. */
function TeachBack({ l, t }: { l: CalcLesson; t: LessonTutor }) {
  const saved = useStore((s) => s.calc?.teach?.[l.id] ?? '');
  const setTeach = useStore((s) => s.setCalcTeach);
  const [text, setText] = useState(saved);
  const [ticks, setTicks] = useState<boolean[]>(() => t.teach.keyPoints.map(() => false));
  const all = ticks.every(Boolean);
  return (
    <section className="card space-y-4 border-brand2/40 p-5 sm:p-6" data-testid="calc-teach">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><Presentation size={20} className="text-brand2" />Now you teach it</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">The real test of understanding is explaining it to someone else. Teach today’s lesson to a friend, a parent, or an empty chair, out loud, using this plan.</p>
      </div>
      <ol className="space-y-2">{t.teach.plan.map((p, i) => <li key={i} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand2/15 text-sm font-bold text-brand2">{i + 1}</span><span className="pt-0.5 leading-relaxed"><RichText text={p} /></span></li>)}</ol>
      <div>
        <h3 className="flex items-center gap-2 font-bold"><MessageCircleQuestion size={17} className="text-gold" />Questions your student will ask</h3>
        <div className="mt-2 space-y-2">{t.teach.questions.map((q, i) => (
          <details key={i} className="group rounded-xl border border-line bg-raised/40 p-3" data-testid="calc-teach-q">
            <summary className="cursor-pointer list-none font-semibold"><span className="mr-1 text-gold">“</span><RichText text={q.q} /><span className="text-gold">”</span><span className="ml-2 text-xs font-normal text-brand2 group-open:hidden">How to answer</span></summary>
            <p className="mt-2 leading-relaxed text-muted"><RichText text={q.a} /></p>
          </details>
        ))}</div>
      </div>
      <div>
        <h3 className="font-bold">Your turn: explain it in your own words</h3>
        <textarea className="input mt-2 min-h-[120px] w-full leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} onBlur={() => setTeach(l.id, text)} placeholder="Write your explanation as if your friend has never heard of this. Use an example." data-testid="calc-teach-text" />
        <p className="mt-3 text-sm font-semibold">Check yourself: did your explanation…</p>
        <ul className="mt-1.5 space-y-1.5">{t.teach.keyPoints.map((k, i) => (
          <li key={i}><label className="flex cursor-pointer gap-2.5 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand-solid))]" checked={ticks[i]} onChange={() => setTicks(ticks.map((v, j) => (j === i ? !v : v)))} data-testid="calc-teach-point" /><span className="leading-relaxed"><RichText text={k} /></span></label></li>
        ))}</ul>
        {all && <p className="mt-3 rounded-xl border border-ok/40 bg-ok/10 p-3 text-sm font-semibold text-ok" data-testid="calc-teach-done">You hit every key point. You could teach this lesson.</p>}
      </div>
    </section>
  );
}

function NoteBlock({ n }: { n: Note }) {
  if (n.k === 'staff') return <Score spec={n.staff} listen={n.listen} caption={n.caption} />;
  if (n.k === 'keys') return <KeysNote notes={n.notes} caption={n.caption} />;
  if (n.k === 'try') return <TryIt prompt={n.prompt} task={n.task} />;
  if (n.k === 'p') return <div className="leading-relaxed"><RichText text={n.t} block={n.t.includes('~~~')} /></div>;
  if (n.k === 'formula') return (
    // formulas separated by \qquad wrap onto their own lines on narrow screens instead of scrolling
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-1 rounded-2xl border border-brand/30 bg-brand/5 px-3 py-3 text-center text-[15px] sm:px-4 sm:text-[17px]">
      {n.t.split(/\\qquad/).map((f, i) => <div key={i} className="max-w-full overflow-x-auto rounded-md" tabIndex={0} role="group" aria-label="Formula (scroll sideways if it is cut off)"><RichText block text={`$$${f.trim()}$$`} /></div>)}
    </div>
  );
  if (n.k === 'rule') return <div className="rounded-2xl border-2 border-brand/40 bg-brand/[.07] p-4"><div className="text-[11px] font-black uppercase tracking-wide text-brand2">Definition / theorem</div><div className="mt-0.5 font-bold">{n.title}</div><p className="mt-1.5 leading-relaxed"><RichText text={n.t} /></p></div>;
  if (n.k === 'tip') return <div className="flex gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-3.5"><Lightbulb size={18} className="mt-0.5 shrink-0 text-gold" /><p className="leading-relaxed"><b className="text-gold">Teacher’s tip. </b><RichText text={n.t} /></p></div>;
  if (n.k === 'warn') return <div className="flex gap-3 rounded-2xl border border-bad/40 bg-bad/5 p-3.5"><TriangleAlert size={18} className="mt-0.5 shrink-0 text-bad" /><p className="leading-relaxed"><b className="text-bad">Common mistake. </b><RichText text={n.t} /></p></div>;
  return <ul className="space-y-1.5 pl-1">{n.items.map((it, i) => <li key={i} className="flex gap-2.5"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span className="leading-relaxed"><RichText text={it} /></span></li>)}</ul>;
}

/** One practice problem: answer, optional hint, then the full solution. Records the first answer. */
function Problem({ p, i, hints = true, onDone }: { p: CalcProblem; i: number; hints?: boolean; onDone?: (correct: boolean) => void }) {
  const walk = walkOf(p.id);
  const course = useCourse();
  const record = useStore((s) => s.calcAnswer);
  const [val, setVal] = useState<string>('');
  const [checked, setChecked] = useState<null | boolean>(null);
  const [hint, setHint] = useState(false);
  const mcq = typeof p.answer === 'number';
  const submit = () => {
    if (!val || checked !== null) return;
    const ok = calcCorrect(p, val, course.answer.exact);
    setChecked(ok); record(p.id, ok); onDone?.(ok); sfx(ok ? 'correct' : 'wrong');
  };
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5" data-testid={`calc-problem-${p.id}`}>
      <div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-xs font-bold text-bg">{i}</span><Badge tone={p.level === 3 ? 'bad' : p.level === 2 ? 'warn' : 'ok'}>{p.level === 3 ? 'Hard' : p.level === 2 ? 'AP level' : 'Warm-up'}</Badge></div>
      <HighlightText hkey={`ap|${p.id}|q`} className="text-[16px] leading-relaxed"><RichText text={p.q} /></HighlightText>
      <MarkNotes prefix={`ap|${p.id}|`} />
      {p.staff && <div className="mt-3"><Score spec={p.staff} listen={p.listen} play={!p.task} /></div>}
      {!p.staff && p.listen && <div className="mt-3"><ListenButton spec={p.listen} label="Listen" /></div>}
      {p.task ? (
        <div className="mt-3"><TaskView key={p.id} task={p.task} quiet onDone={(ok) => { if (checked !== null) return; setChecked(ok); record(p.id, ok); onDone?.(ok); sfx(ok ? 'correct' : 'wrong'); }} /></div>
      ) : mcq ? (
        <div className="mt-3 grid gap-2">{p.choices!.map((c, k) => { const sel = val === String(k); const right = checked !== null && k === p.answer; const wrong = checked === false && sel; return (
          <button key={k} type="button" disabled={checked !== null} onClick={() => setVal(String(k))} data-choice={'ABCDE'[k]} className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors', right ? 'border-ok bg-ok/10' : wrong ? 'border-bad bg-bad/10' : sel ? 'border-brand bg-brand/10 ring-1 ring-brand' : 'border-line hover:border-brand/50')}>
            <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-bold', right ? 'border-ok bg-ok text-white' : wrong ? 'border-bad bg-bad text-white' : 'border-line text-muted')}>{right ? <Check size={14} /> : wrong ? <X size={14} /> : 'ABCDE'[k]}</span><span><RichText text={c} /></span>
          </button>
        ); })}</div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className={cn('input !w-44 text-lg font-semibold', checked === true && 'border-ok bg-ok/10', checked === false && 'border-bad bg-bad/10')} value={val} disabled={checked !== null} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder={course.answer.placeholder} aria-label="Your answer" data-testid="calc-input" />
          {checked === null && course.answer.chips.map((t) => <button key={t} type="button" className="chip !px-3 !py-1.5 text-sm hover:text-ink" onClick={() => setVal(t)}>{t}</button>)}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {checked === null && !p.task && <button type="button" className="btn-primary" disabled={!val} onClick={submit} data-testid="calc-check">Check</button>}
        {checked === null && hints && !hint && <button type="button" className="btn-ghost" onClick={() => setHint(true)}><Lightbulb size={15} />Hint</button>}
      </div>
      {hint && checked === null && <p className="mt-3 rounded-xl border border-gold/40 bg-gold/5 p-3 text-sm"><b className="text-gold">Hint: </b><RichText text={p.hint} /></p>}
      {checked !== null && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('mt-3 rounded-xl border p-3.5 text-[15px]', checked ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10')} data-testid="calc-solution">
          <b className={checked ? 'text-ok' : 'text-bad'}>{checked ? (p.task ? 'Correct! The engine checked every note.' : 'Correct!') : p.task ? 'Here is how to work it out (keep fixing your staff above until it is right).' : `Not quite. The answer is ${answerLabel(p)}.`}</b>
          {walk ? (
            <>
              <div className="mt-2 text-xs font-bold uppercase tracking-wide text-faint">Step by step with your tutor</div>
              <ol className="mt-1.5 space-y-2" data-testid="calc-walk">{walk.map((s, k) => <li key={k} className="flex gap-2.5"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/10 text-xs font-bold">{k + 1}</span><span className="leading-relaxed"><RichText text={s} /></span></li>)}</ol>
            </>
          ) : <ol className="mt-2 list-decimal space-y-1 pl-5">{p.solution.map((s, k) => <li key={k}><RichText text={s} /></li>)}</ol>}
          {!checked && !p.task && <button type="button" className="btn-quiet mt-2 !px-2 text-sm" onClick={() => { setVal(''); setChecked(null); setHint(false); }}><RotateCcw size={14} />Try it again (your first answer still counts)</button>}
        </motion.div>
      )}
    </div>
  );
}

/** A lesson taught like a class: the teacher’s intro, goals, notes, worked examples, practice, mastery check. */
export function CourseLessonPage({ course: cid, lesson }: { course: string; lesson: string }) {
  const course = COURSES[cid];
  const l = course?.lesson[lesson];
  if (!course || !l) return <Empty title="Lesson not found" body="That lesson does not exist." action={{ label: course?.name ?? 'Dashboard', href: course ? `/${course.id}` : '/' }} />;
  return <CourseCtx.Provider value={course}><Lesson key={l.id} l={l} /></CourseCtx.Provider>;
}

function Lesson({ l }: { l: CalcLesson }) {
  const level = useLevel().level;
  const course = useCourse();
  const tutor = course.tutor[l.id];
  const lessons = course.lessons;
  const finish = useStore((s) => s.calcFinish);
  const saveNote = useStore((s) => s.saveNote);
  const [shown, setShown] = useState<Record<number, number>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [fire, setFire] = useState(0);
  const idx = lessons.findIndex((x) => x.id === l.id);
  const prev = lessons[idx - 1], next = lessons[idx + 1];
  const score = Object.values(results).filter(Boolean).length, n = Object.keys(results).length, total = l.practice.length;
  const complete = n === total;
  const passed = complete && score / total >= PASS;
  const onDone = (id: string, ok: boolean) => setResults((r) => {
    const nr = { ...r, [id]: ok };
    if (Object.keys(nr).length === total) { const s = Object.values(nr).filter(Boolean).length; finish(l.id, s, total); if (s / total >= PASS) { setFire(Date.now()); sfx('win'); } }
    return nr;
  });
  const save = () => {
    const body = [...(tutor ? [`The big idea: ${tutor.bigIdea.join(' ')}`, tutor.words.map((w) => `• ${w.term}: ${w.means}`).join('\n')] : []), l.goals.map((g) => `• ${g}`).join('\n'), ...l.notes.map((x) => (x.k === 'list' ? x.items.map((i) => `• ${i}`).join('\n') : noteText(x))), `Remember:\n${l.remember.map((x) => `• ${x}`).join('\n')}`].join('\n\n');
    saveNote({ title: `${course.short} ${l.unit}.${l.n}: ${l.title}`, body, topic: course.id, kind: 'lesson' }); setSaved(true);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6" data-testid="calc-lesson">
      <Confetti fire={fire} count={60} />
      <div className="flex items-center justify-between gap-2 text-sm"><Link href={`/${course.id}`} className="btn-quiet !px-2"><ArrowLeft size={16} />{course.name}</Link><span className="text-muted">{l.unit ? `Unit ${l.unit}` : 'Toolkit'} · Lesson {l.n} of {course.lessonsOfUnit(l.unit).length}</span></div>
      <header>
        <p className="eyebrow">{l.unit ? `Unit ${l.unit}` : 'Start here'} · {course.unitOf(l.unit)?.title}</p>
        <h1 className="mt-3 text-[30px] font-bold leading-tight sm:text-[40px]">{l.unit}.{l.n} {l.title}</h1>
      </header>

      <section className="flex gap-4 rounded-3xl border border-brand/30 bg-brand/[.07] p-4 sm:p-5">
        <div className="shrink-0"><Pet mood="study" level={level} size={72} /></div>
        <div><div className="text-xs font-bold uppercase tracking-wide text-brand2">Your teacher says</div><p className="mt-1 text-[15px] leading-relaxed">{l.intro}</p></div>
      </section>

      {tutor && <TutorIntro t={tutor} />}

      <Card>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Target size={18} className="text-brand" />Today’s goals</h2>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{l.goals.map((g) => <li key={g} className="flex gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-ok" />{g}</li>)}</ul>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-xl font-bold"><BookOpen size={20} className="text-brand" />Lesson notes</h2><button type="button" className="btn-ghost !py-1.5 text-sm" disabled={saved} onClick={save} data-testid="calc-save"><NotebookPen size={15} />{saved ? 'Saved to notebook' : 'Save notes'}</button></div>
        <div className="space-y-4 text-[15.5px]">{l.notes.map((x, i) => <NoteBlock key={i} n={x} />)}</div>
      </Card>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Sparkles size={20} className="text-gold" />Worked examples</h2>
        <p className="text-sm text-muted">Cover the steps and try each one first. Then reveal one step at a time; each step says what we do and why.</p>
        {l.examples.map((e, k) => { const s = shown[k] ?? 0; const why = tutor?.why[k]; return (
          <div key={k} className="card p-4 sm:p-5" data-testid={`calc-example-${k}`}>
            <div className="text-[16px] leading-relaxed"><b className="text-brand2">Example {k + 1}. </b><RichText text={e.q} /></div>
            {e.staff && <div className="mt-3"><Score spec={e.staff} listen={e.listen} /></div>}
            {!e.staff && e.listen && <div className="mt-3"><ListenButton spec={e.listen} /></div>}
            <ol className="mt-3 space-y-2">{e.steps.slice(0, s).map((st, j) => <motion.li key={j} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3 rounded-xl border p-3', j === e.steps.length - 1 ? 'border-ok/40 bg-ok/10' : 'border-line bg-raised/40')}><b className="shrink-0 text-brand2">Step {j + 1}</b><span className="min-w-0"><RichText text={st} />{why?.[j] && <span className="mt-1.5 block text-[14px] leading-relaxed text-muted" data-testid="calc-why"><b className="text-gold">Why: </b><RichText text={why[j]} /></span>}</span></motion.li>)}</ol>
            {s < e.steps.length ? <button type="button" className="btn-ghost mt-3 !py-1.5 text-sm" onClick={() => setShown({ ...shown, [k]: s + 1 })} data-testid="calc-step"><Eye size={15} />{s === 0 ? 'Show step 1' : `Show step ${s + 1} of ${e.steps.length}`}</button> : <p className="mt-2 text-sm font-semibold text-ok">Answer: <RichText text={e.a} /></p>}
          </div>
        ); })}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="flex items-center gap-2 text-xl font-bold"><GraduationCap size={20} className="text-brand" />Practice</h2><span className="text-sm text-muted" data-testid="calc-score">{n}/{total} answered · {score} right first try</span></div>
        <Progress value={pct(n, total)} tone={passed ? 'ok' : 'brand'} label="Practice progress" />
        <p className="text-sm text-muted">{course.answer.help} Your first answer to each problem is the one that counts.</p>
        {l.practice.map((p, i) => <Problem key={p.id} p={p} i={i + 1} onDone={(ok) => onDone(p.id, ok)} />)}
      </section>

      {complete && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('rounded-3xl border-2 p-5 text-center', passed ? 'border-ok/50 bg-ok/10' : 'border-warn/50 bg-warn/10')} data-testid="calc-result">
          <h2 className="font-display text-2xl font-bold">{passed ? 'Lesson mastered!' : 'Almost there'}</h2>
          <p className="mt-1">{score} of {total} right on the first try ({pct(score, total)}%). {passed ? '+60 XP. On to the next lesson.' : `You need ${Math.round(PASS * 100)}% to pass. Reread the notes on what you missed, then come back tomorrow and try again.`}</p>
        </motion.section>
      )}

      {tutor && <TeachBack l={l} t={tutor} />}

      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="font-bold">What you must remember</h2><ul className="mt-2 space-y-1.5">{l.remember.map((x) => <li key={x} className="flex gap-2 text-sm"><span className="font-bold text-gold">★</span><RichText text={x} /></li>)}</ul></Card>
        <Card className="border-brand/30"><h2 className="font-bold">Teacher’s check-in</h2><p className="mt-2 text-sm leading-relaxed text-muted">{l.checkIn}</p><Link href="/tutor" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">Stuck? Ask the tutor →</Link></Card>
      </div>

      <nav className="flex flex-wrap justify-between gap-2" aria-label="Lesson navigation">
        {prev ? <Link href={`/${course.id}/${prev.id}`} className="btn-ghost"><ArrowLeft size={16} />{prev.unit}.{prev.n} {prev.title}</Link> : <span />}
        {next ? <Link href={`/${course.id}/${next.id}`} className={passed ? 'btn-primary' : 'btn-ghost'} data-testid="calc-next">{next.unit}.{next.n} {next.title}<ArrowRight size={16} /></Link> : <Link href={`/${course.id}/review/${l.unit}`} className="btn-primary">Unit {l.unit} review<ArrowRight size={16} /></Link>}
      </nav>
    </div>
  );
}

/** Unit review: two harder problems from every lesson, shuffled, hints off. */
export function CourseReviewPage({ course: cid, unit }: { course: string; unit: string }) {
  const course = COURSES[cid];
  if (!course) return <Empty title="Course not found" body="That course does not exist." action={{ label: 'Dashboard', href: '/' }} />;
  return <CourseCtx.Provider value={course}><Review unit={unit} /></CourseCtx.Provider>;
}

function Review({ unit }: { unit: string }) {
  const course = useCourse();
  const u = course.unitOf(Number(unit));
  const [seed, setSeed] = useState(() => Date.now());
  const [res, setRes] = useState<Record<string, boolean>>({});
  const set = useMemo(() => { const rand = rng(seed); return shuffle(course.lessonsOfUnit(Number(unit)).flatMap((l) => shuffle(l.practice.filter((p) => p.level >= 2), rand).slice(0, 2)), rand); }, [course, unit, seed]);
  if (!u || !set.length) return <Empty title="No review yet" body="This unit’s lessons have not been written yet." action={{ label: course.name, href: `/${course.id}` }} />;
  const score = Object.values(res).filter(Boolean).length, n = Object.keys(res).length;
  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="calc-review">
      <Link href={`/${course.id}`} className="btn-quiet !px-2 text-sm"><ArrowLeft size={16} />{course.name}</Link>
      <header className="flex flex-wrap items-center gap-4"><UnitTile n={u.n} size={60} /><div><p className="eyebrow">Unit review</p><h1 className="mt-2 text-3xl font-bold">{u.n ? `Unit ${u.n}` : 'Toolkit'}: {u.title}</h1></div></header>
      <p className="text-sm text-muted">{set.length} mixed problems, two from each lesson, in random order. No hints: answer first, then read the solution. Aim for 80% before moving to the next unit.</p>
      <Progress value={pct(n, set.length)} label="Review progress" />
      {set.map((p, i) => <Problem key={`${seed}-${p.id}`} p={p} i={i + 1} hints={false} onDone={(ok) => setRes((r) => ({ ...r, [p.id]: ok }))} />)}
      {n === set.length && <div className={cn('rounded-3xl border-2 p-5 text-center', score / n >= 0.8 ? 'border-ok/50 bg-ok/10' : 'border-warn/50 bg-warn/10')} data-testid="calc-review-result"><h2 className="font-display text-2xl font-bold">{score}/{n} ({pct(score, n)}%)</h2><p className="mt-1 text-sm">{score / n >= 0.8 ? 'Ready for the next unit.' : 'Go back to the lessons where you missed problems, then take a new review.'}</p><button type="button" className="btn-ghost mt-3" onClick={() => { setSeed(Date.now()); setRes({}); }}><RotateCcw size={15} />New review set</button></div>}
    </div>
  );
}
