'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, Eye, GraduationCap, Lightbulb, Lock, NotebookPen, Play, RotateCcw, Sparkles, Target, TriangleAlert, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CALC_LESSON, CALC_LESSONS, CALC_UNITS, PASS, answerLabel, calcCorrect, lessonsOfUnit, type CalcLesson, type CalcProblem, type Note } from '@/data/calc';
import { useStore } from '@/lib/store';
import { useLevel } from '@/lib/hooks';
import { sfx } from '@/lib/sfx';
import { dateKey, daysBetween, pct, rng, shuffle } from '@/lib/util';
import { RichText } from '@/components/RichText';
import { Pet } from '@/components/Pet';
import { Confetti } from '@/components/Confetti';
import { Badge, Card, Empty, Progress, Ring, cn } from '@/components/ui';

const UNIT_GRADIENT = ['from-[#3B82F6] to-[#06B6D4]', 'from-[#6366F1] to-[#A855F7]', 'from-[#8B5CF6] to-[#D946EF]', 'from-[#EC4899] to-[#F43F5E]', 'from-[#F59E0B] to-[#F97316]', 'from-[#10B981] to-[#14B8A6]', 'from-[#0EA5E9] to-[#6366F1]', 'from-[#22C55E] to-[#0EA5E9]', 'from-[#A855F7] to-[#EC4899]', 'from-[#F43F5E] to-[#F59E0B]'];
const UnitTile = ({ n, size = 48 }: { n: number; size?: number }) => (
  <span className={cn('relative inline-grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br font-display font-bold text-white ring-1 ring-inset ring-white/25 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.6)]', UNIT_GRADIENT[n - 1])} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden>{n}</span>
);

/** AP Calculus BC home: the whole self-study plan, unit by unit, with progress and pacing. */
export function CalcHomePage() {
  const calc = useStore((s) => s.calc) ?? { done: {}, answers: {} };
  const setExam = useStore((s) => s.setCalcExam);
  const [open, setOpen] = useState<number | null>(1);
  const done = CALC_LESSONS.filter((l) => calc.done[l.id] && calc.done[l.id].score / calc.done[l.id].total >= PASS);
  const next = CALC_LESSONS.find((l) => !done.includes(l));
  const totalWeeks = CALC_UNITS.reduce((s, u) => s + u.weeks, 0);
  const today = dateKey();
  const daysLeft = calc.examDate ? daysBetween(today, calc.examDate) : null;
  const weeksLeft = daysLeft !== null ? Math.max(1, Math.floor(daysLeft / 7)) : null;
  // weeks of material still ahead (written lessons count as done when mastered)
  const unitsLeft = CALC_UNITS.filter((u) => { const ls = lessonsOfUnit(u.n); return !ls.length || ls.some((l) => !done.includes(l)); });
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
            <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">AP Calculus BC</h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/90">The whole course in ten units, in the College Board’s order: lessons with full notes, worked examples, and practice with hints and complete solutions. Pass each lesson at {Math.round(PASS * 100)}% before moving on.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {next ? <Link href={`/calc/${next.id}`} className="btn !bg-white !px-5 !py-3 text-[15px] !text-[#2A2470] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] hover:-translate-y-px" data-testid="calc-continue"><Play size={17} />{done.length ? 'Continue' : 'Start'}: {next.unit}.{next.n} {next.title}</Link> : <span className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold">All written lessons mastered ✓</span>}
              <a href="#plan" className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20"><CalendarDays size={16} />Study plan</a>
            </div>
          </div>
          <div className="text-center">
            <Ring value={pct(done.length, CALC_LESSONS.length)} size={104} stroke={8} label="Lessons mastered"><div className="leading-tight"><div className="font-display text-2xl font-bold">{done.length}/{CALC_LESSONS.length}</div><div className="text-[10px] font-semibold text-white/90">lessons</div></div></Ring>
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
          <label className="text-sm"><span className="label">AP exam date</span><input type="date" className="input !w-44" value={calc.examDate ?? ''} onChange={(e) => setExam(e.target.value || undefined)} data-testid="calc-exam" /></label>
        </div>
        {weeksLeft !== null && (
          <div className={cn('mt-4 rounded-2xl border p-4 text-sm', weeksNeeded <= weeksLeft ? 'border-ok/40 bg-ok/10' : 'border-warn/40 bg-warn/10')} data-testid="calc-pace">
            <b>{weeksLeft} weeks until your exam.</b> You have about {weeksNeeded} weeks of work left (including review). {weeksNeeded <= weeksLeft ? `Comfortable pace: about ${Math.max(1, Math.ceil((CALC_LESSONS.length - done.length) / Math.max(1, weeksLeft - 3)))} lessons a week on the written units, and you will have spare weeks.` : `You need to speed up: plan about ${Math.ceil((weeksNeeded / weeksLeft) * 10) / 10}× the normal pace, or study 5–6 days a week.`}
          </div>
        )}
        <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(() => { let w = 1; return CALC_UNITS.map((u) => { const from = w; w += u.weeks; return (
            <li key={u.n} className="rounded-xl border border-line bg-raised/40 p-3 text-xs"><div className="font-bold text-ink">Weeks {from}{u.weeks > 1 ? `–${w - 1}` : ''}</div><div className="mt-0.5 text-muted">Unit {u.n}: {u.title}</div></li>
          ); }); })()}
          <li className="rounded-xl border border-gold/40 bg-gold/5 p-3 text-xs"><div className="font-bold text-ink">Weeks {totalWeeks + 1}–{totalWeeks + 3}</div><div className="mt-0.5 text-muted">Full practice exams and review of your weakest units</div></li>
        </ol>
      </Card>

      <div className="space-y-3">
        {CALC_UNITS.map((u) => { const ls = lessonsOfUnit(u.n); const m = ls.filter((l) => done.includes(l)).length; const isOpen = open === u.n; return (
          <section key={u.n} className="card overflow-hidden p-0" data-testid={`calc-unit-${u.n}`}>
            <button type="button" className="flex w-full items-center gap-4 p-4 text-left sm:p-5" onClick={() => setOpen(isOpen ? null : u.n)} aria-expanded={isOpen}>
              <UnitTile n={u.n} />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold leading-snug">{u.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{u.examWeight} of the exam · about {u.weeks} week{u.weeks > 1 ? 's' : ''} · {ls.length ? `${m}/${ls.length} lessons mastered` : `${u.topics.length} topics`}</span>
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
                        <Link href={`/calc/${l.id}`} className={cn('flex items-center gap-3 rounded-2xl border p-3 transition-all hover:-translate-y-0.5 hover:border-brand/60', next?.id === l.id ? 'border-brand/50 bg-brand/5' : 'border-line')} data-testid={`calc-lesson-${l.id}`}>
                          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-sm font-bold', ok ? 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white' : next?.id === l.id ? 'bg-gradient-to-br from-[#6A4BF0] to-[#1F6FE5] text-white' : 'bg-raised text-muted')}>{ok ? <Check size={18} /> : `${l.unit}.${l.n}`}</span>
                          <span className="min-w-0 flex-1"><span className="block font-semibold">{l.title}</span><span className="block truncate text-xs text-muted">{l.examples.length} worked examples · {l.practice.length} practice problems</span></span>
                          <span className="text-xs text-muted">{r ? `best ${r.score}/${r.total}` : next?.id === l.id ? 'Up next' : ''}</span>
                        </Link>
                      </li>
                    ); })}
                    <li><Link href={`/calc/review/${u.n}`} className="flex items-center gap-3 rounded-2xl border border-dashed border-gold/50 p-3 hover:bg-gold/5" data-testid={`calc-review-${u.n}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/15 text-gold"><Target size={18} /></span><span className="flex-1"><span className="block font-semibold">Unit {u.n} review</span><span className="block text-xs text-muted">Mixed problems from every lesson, no hints until you answer</span></span><ArrowRight size={16} className="text-muted" /></Link></li>
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

function NoteBlock({ n }: { n: Note }) {
  if (n.k === 'p') return <p className="leading-relaxed"><RichText text={n.t} /></p>;
  if (n.k === 'formula') return <div className="overflow-x-auto rounded-2xl border border-brand/30 bg-brand/5 px-4 py-3 text-center text-[17px]"><RichText block text={`$$${n.t}$$`} /></div>;
  if (n.k === 'rule') return <div className="rounded-2xl border-2 border-brand/40 bg-gradient-to-br from-brand/10 to-transparent p-4"><div className="text-[11px] font-black uppercase tracking-wide text-brand2">Definition / theorem</div><div className="mt-0.5 font-bold">{n.title}</div><p className="mt-1.5 leading-relaxed"><RichText text={n.t} /></p></div>;
  if (n.k === 'tip') return <div className="flex gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-3.5"><Lightbulb size={18} className="mt-0.5 shrink-0 text-gold" /><p className="leading-relaxed"><b className="text-gold">Teacher’s tip. </b><RichText text={n.t} /></p></div>;
  if (n.k === 'warn') return <div className="flex gap-3 rounded-2xl border border-bad/40 bg-bad/5 p-3.5"><TriangleAlert size={18} className="mt-0.5 shrink-0 text-bad" /><p className="leading-relaxed"><b className="text-bad">Common mistake. </b><RichText text={n.t} /></p></div>;
  return <ul className="space-y-1.5 pl-1">{n.items.map((it, i) => <li key={i} className="flex gap-2.5"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span className="leading-relaxed"><RichText text={it} /></span></li>)}</ul>;
}

/** One practice problem: answer, optional hint, then the full solution. Records the first answer. */
function Problem({ p, i, hints = true, onDone }: { p: CalcProblem; i: number; hints?: boolean; onDone?: (correct: boolean) => void }) {
  const record = useStore((s) => s.calcAnswer);
  const [val, setVal] = useState<string>('');
  const [checked, setChecked] = useState<null | boolean>(null);
  const [hint, setHint] = useState(false);
  const mcq = typeof p.answer === 'number';
  const submit = () => {
    if (!val || checked !== null) return;
    const ok = calcCorrect(p, val);
    setChecked(ok); record(p.id, ok); onDone?.(ok); sfx(ok ? 'correct' : 'wrong');
  };
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5" data-testid={`calc-problem-${p.id}`}>
      <div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-xs font-bold text-bg">{i}</span><Badge tone={p.level === 3 ? 'bad' : p.level === 2 ? 'warn' : 'ok'}>{p.level === 3 ? 'Hard' : p.level === 2 ? 'AP level' : 'Warm-up'}</Badge></div>
      <div className="text-[16px] leading-relaxed"><RichText text={p.q} /></div>
      {mcq ? (
        <div className="mt-3 grid gap-2">{p.choices!.map((c, k) => { const sel = val === String(k); const right = checked !== null && k === p.answer; const wrong = checked === false && sel; return (
          <button key={k} type="button" disabled={checked !== null} onClick={() => setVal(String(k))} data-choice={'ABCDE'[k]} className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors', right ? 'border-ok bg-ok/10' : wrong ? 'border-bad bg-bad/10' : sel ? 'border-brand bg-brand/10 ring-1 ring-brand' : 'border-line hover:border-brand/50')}>
            <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-bold', right ? 'border-ok bg-ok text-white' : wrong ? 'border-bad bg-bad text-white' : 'border-line text-muted')}>{right ? <Check size={14} /> : wrong ? <X size={14} /> : 'ABCDE'[k]}</span><span><RichText text={c} /></span>
          </button>
        ); })}</div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className={cn('input !w-44 text-lg font-semibold', checked === true && 'border-ok bg-ok/10', checked === false && 'border-bad bg-bad/10')} value={val} disabled={checked !== null} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="e.g. -1/4" aria-label="Your answer" data-testid="calc-input" />
          {checked === null && ['∞', '−∞', 'DNE'].map((t) => <button key={t} type="button" className="chip !px-3 !py-1.5 text-sm hover:text-ink" onClick={() => setVal(t)}>{t}</button>)}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {checked === null && <button type="button" className="btn-primary" disabled={!val} onClick={submit} data-testid="calc-check">Check</button>}
        {checked === null && hints && !hint && <button type="button" className="btn-ghost" onClick={() => setHint(true)}><Lightbulb size={15} />Hint</button>}
      </div>
      {hint && checked === null && <p className="mt-3 rounded-xl border border-gold/40 bg-gold/5 p-3 text-sm"><b className="text-gold">Hint: </b><RichText text={p.hint} /></p>}
      {checked !== null && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('mt-3 rounded-xl border p-3.5 text-[15px]', checked ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10')} data-testid="calc-solution">
          <b className={checked ? 'text-ok' : 'text-bad'}>{checked ? 'Correct!' : `Not quite. The answer is ${answerLabel(p)}.`}</b>
          <ol className="mt-2 list-decimal space-y-1 pl-5">{p.solution.map((s, k) => <li key={k}><RichText text={s} /></li>)}</ol>
          {!checked && <button type="button" className="btn-quiet mt-2 !px-2 text-sm" onClick={() => { setVal(''); setChecked(null); setHint(false); }}><RotateCcw size={14} />Try it again (your first answer still counts)</button>}
        </motion.div>
      )}
    </div>
  );
}

/** A lesson taught like a class: the teacher’s intro, goals, notes, worked examples, practice, mastery check. */
export function CalcLessonPage({ lesson }: { lesson: string }) {
  const l = CALC_LESSON[lesson];
  if (!l) return <Empty title="Lesson not found" body="That calculus lesson does not exist." action={{ label: 'AP Calculus BC', href: '/calc' }} />;
  return <Lesson key={l.id} l={l} />;
}

function Lesson({ l }: { l: CalcLesson }) {
  const level = useLevel().level;
  const finish = useStore((s) => s.calcFinish);
  const saveNote = useStore((s) => s.saveNote);
  const [shown, setShown] = useState<Record<number, number>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [fire, setFire] = useState(0);
  const idx = CALC_LESSONS.findIndex((x) => x.id === l.id);
  const prev = CALC_LESSONS[idx - 1], next = CALC_LESSONS[idx + 1];
  const score = Object.values(results).filter(Boolean).length, n = Object.keys(results).length, total = l.practice.length;
  const complete = n === total;
  const passed = complete && score / total >= PASS;
  const onDone = (id: string, ok: boolean) => setResults((r) => {
    const nr = { ...r, [id]: ok };
    if (Object.keys(nr).length === total) { const s = Object.values(nr).filter(Boolean).length; finish(l.id, s, total); if (s / total >= PASS) { setFire(Date.now()); sfx('win'); } }
    return nr;
  });
  const save = () => {
    const body = [l.goals.map((g) => `• ${g}`).join('\n'), ...l.notes.map((x) => (x.k === 'list' ? x.items.map((i) => `• ${i}`).join('\n') : x.k === 'rule' ? `${x.title}: ${x.t}` : x.t)), `Remember:\n${l.remember.map((x) => `• ${x}`).join('\n')}`].join('\n\n');
    saveNote({ title: `Calc BC ${l.unit}.${l.n}: ${l.title}`, body, topic: 'calc', kind: 'lesson' }); setSaved(true);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6" data-testid="calc-lesson">
      <Confetti fire={fire} count={60} />
      <div className="flex items-center justify-between gap-2 text-sm"><Link href="/calc" className="btn-quiet !px-2"><ArrowLeft size={16} />AP Calculus BC</Link><span className="text-muted">Unit {l.unit} · Lesson {l.n} of {lessonsOfUnit(l.unit).length}</span></div>
      <header>
        <p className="eyebrow">Unit {l.unit} · {CALC_UNITS[l.unit - 1].title}</p>
        <h1 className="mt-3 text-[30px] font-bold leading-tight sm:text-[40px]">{l.unit}.{l.n} {l.title}</h1>
      </header>

      <section className="flex gap-4 rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/10 to-brand2/5 p-4 sm:p-5">
        <div className="shrink-0"><Pet mood="study" level={level} size={72} /></div>
        <div><div className="text-xs font-bold uppercase tracking-wide text-brand2">Your teacher says</div><p className="mt-1 text-[15px] leading-relaxed">{l.intro}</p></div>
      </section>

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
        <p className="text-sm text-muted">Cover the steps and try each one first. Then reveal one step at a time.</p>
        {l.examples.map((e, k) => { const s = shown[k] ?? 0; return (
          <div key={k} className="card p-4 sm:p-5" data-testid={`calc-example-${k}`}>
            <div className="text-[16px] leading-relaxed"><b className="text-brand2">Example {k + 1}. </b><RichText text={e.q} /></div>
            <ol className="mt-3 space-y-2">{e.steps.slice(0, s).map((st, j) => <motion.li key={j} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3 rounded-xl border p-3', j === e.steps.length - 1 ? 'border-ok/40 bg-ok/10' : 'border-line bg-raised/40')}><b className="shrink-0 text-brand2">Step {j + 1}</b><span><RichText text={st} /></span></motion.li>)}</ol>
            {s < e.steps.length ? <button type="button" className="btn-ghost mt-3 !py-1.5 text-sm" onClick={() => setShown({ ...shown, [k]: s + 1 })} data-testid="calc-step"><Eye size={15} />{s === 0 ? 'Show step 1' : `Show step ${s + 1} of ${e.steps.length}`}</button> : <p className="mt-2 text-sm font-semibold text-ok">Answer: <RichText text={e.a} /></p>}
          </div>
        ); })}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="flex items-center gap-2 text-xl font-bold"><GraduationCap size={20} className="text-brand" />Practice</h2><span className="text-sm text-muted" data-testid="calc-score">{n}/{total} answered · {score} right first try</span></div>
        <Progress value={pct(n, total)} tone={passed ? 'ok' : 'brand'} label="Practice progress" />
        <p className="text-sm text-muted">Type numbers, fractions like -1/4, or ∞, −∞, DNE. Your first answer to each problem is the one that counts.</p>
        {l.practice.map((p, i) => <Problem key={p.id} p={p} i={i + 1} onDone={(ok) => onDone(p.id, ok)} />)}
      </section>

      {complete && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('rounded-3xl border-2 p-5 text-center', passed ? 'border-ok/50 bg-ok/10' : 'border-warn/50 bg-warn/10')} data-testid="calc-result">
          <h2 className="font-display text-2xl font-bold">{passed ? 'Lesson mastered!' : 'Almost there'}</h2>
          <p className="mt-1">{score} of {total} right on the first try ({pct(score, total)}%). {passed ? '+60 XP. On to the next lesson.' : `You need ${Math.round(PASS * 100)}% to pass. Reread the notes on what you missed, then come back tomorrow and try again.`}</p>
        </motion.section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="font-bold">What you must remember</h2><ul className="mt-2 space-y-1.5">{l.remember.map((x) => <li key={x} className="flex gap-2 text-sm"><span className="font-bold text-gold">★</span><RichText text={x} /></li>)}</ul></Card>
        <Card className="border-brand/30"><h2 className="font-bold">Teacher’s check-in</h2><p className="mt-2 text-sm leading-relaxed text-muted">{l.checkIn}</p><Link href="/tutor" className="mt-3 inline-block text-sm font-semibold text-brand2 hover:underline">Stuck? Ask the tutor →</Link></Card>
      </div>

      <nav className="flex flex-wrap justify-between gap-2" aria-label="Lesson navigation">
        {prev ? <Link href={`/calc/${prev.id}`} className="btn-ghost"><ArrowLeft size={16} />{prev.unit}.{prev.n} {prev.title}</Link> : <span />}
        {next ? <Link href={`/calc/${next.id}`} className={passed ? 'btn-primary' : 'btn-ghost'} data-testid="calc-next">{next.unit}.{next.n} {next.title}<ArrowRight size={16} /></Link> : <Link href={`/calc/review/${l.unit}`} className="btn-primary">Unit {l.unit} review<ArrowRight size={16} /></Link>}
      </nav>
    </div>
  );
}

/** Unit review: two harder problems from every lesson, shuffled, hints off. */
export function CalcReviewPage({ unit }: { unit: string }) {
  const u = CALC_UNITS[Number(unit) - 1];
  const [seed, setSeed] = useState(() => Date.now());
  const [res, setRes] = useState<Record<string, boolean>>({});
  const set = useMemo(() => { const rand = rng(seed); return shuffle(lessonsOfUnit(Number(unit)).flatMap((l) => shuffle(l.practice.filter((p) => p.level >= 2), rand).slice(0, 2)), rand); }, [unit, seed]);
  if (!u || !set.length) return <Empty title="No review yet" body="This unit’s lessons have not been written yet." action={{ label: 'AP Calculus BC', href: '/calc' }} />;
  const score = Object.values(res).filter(Boolean).length, n = Object.keys(res).length;
  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="calc-review">
      <Link href="/calc" className="btn-quiet !px-2 text-sm"><ArrowLeft size={16} />AP Calculus BC</Link>
      <header className="flex flex-wrap items-center gap-4"><UnitTile n={u.n} size={60} /><div><p className="eyebrow">Unit review</p><h1 className="mt-2 text-3xl font-bold">Unit {u.n}: {u.title}</h1></div></header>
      <p className="text-sm text-muted">{set.length} mixed problems, two from each lesson, in random order. No hints: answer first, then read the solution. Aim for 80% before moving to the next unit.</p>
      <Progress value={pct(n, set.length)} label="Review progress" />
      {set.map((p, i) => <Problem key={`${seed}-${p.id}`} p={p} i={i + 1} hints={false} onDone={(ok) => setRes((r) => ({ ...r, [p.id]: ok }))} />)}
      {n === set.length && <div className={cn('rounded-3xl border-2 p-5 text-center', score / n >= 0.8 ? 'border-ok/50 bg-ok/10' : 'border-warn/50 bg-warn/10')} data-testid="calc-review-result"><h2 className="font-display text-2xl font-bold">{score}/{n} ({pct(score, n)}%)</h2><p className="mt-1 text-sm">{score / n >= 0.8 ? 'Ready for the next unit.' : 'Go back to the lessons where you missed problems, then take a new review.'}</p><button type="button" className="btn-ghost mt-3" onClick={() => { setSeed(Date.now()); setRes({}); }}><RotateCcw size={15} />New review set</button></div>}
    </div>
  );
}
