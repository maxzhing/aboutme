'use client';
import { DISTRACTORS, TRAPS } from '@/data/questions/distractors';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Eye, Lock, NotebookPen, Play, RotateCcw, Star, Swords, Target, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SkillId } from '@/lib/types';
import { COURSES, CHAPTER, TRAP, type Chapter } from '@/data/courses';
import { VISUAL_LESSONS } from '@/data/visual-lessons';
import { hacksFor } from '@/data/hacks';
import { GRAMMAR } from '@/data/grammar';
import { LESSON } from '@/data/lessons';
import { SkillIcon } from '@/components/SkillIcon';
import { Ring } from '@/components/ui';
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
      <section className="card-hero mb-6 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-start gap-5">
          <SkillIcon skill={skill} size={76} className="!rounded-3xl ring-white/40" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/95">{SECTION_NAME[info.section]} · {DOMAIN[info.domain].name} · Full course</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{info.name}</h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/85">{VISUAL_LESSONS[skill].hook}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {next ? <Link href={`/learn/${skill}/${next.id}`} className="btn !bg-white !px-5 !py-3 text-[15px] !text-[#2A2470] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] hover:-translate-y-px" data-testid="course-continue"><Play size={17} />{passedN ? 'Continue' : 'Start'}: Chapter {next.n}</Link> : <span className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold">Course complete ✓</span>}
              <Link href={`/learn/${skill}?view=quick`} className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20" data-testid="quick-lesson"><Zap size={16} />5-min quick lesson</Link>
              <Link href={`/learn/${skill}?view=notes`} className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20"><BookOpen size={16} />Full notes</Link>
            </div>
          </div>
          <div className="hidden text-center sm:block">
            <Ring value={(passedN / chapters.length) * 100} size={96} stroke={8} label="Course progress"><div className="leading-tight"><div className="font-display text-2xl font-bold">{passedN}/{chapters.length}</div><div className="text-[10px] font-semibold text-white/80">chapters</div></div></Ring>
            <div className="mt-2 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{MASTERY_LEVELS[st.level]}</div>
          </div>
        </div>
        <p className="relative mt-5 text-sm text-white/80" data-testid="course-progress">{passedN} of {chapters.length} chapters passed · every chapter: pictures → method → cheat sheet → worked examples → traps → 3 hard questions</p>
      </section>
      <ol className="relative space-y-3 before:absolute before:bottom-8 before:left-[42px] before:top-8 before:w-0.5 before:bg-gradient-to-b before:from-brand/50 before:via-line before:to-line">
        {chapters.map((c) => { const r = done[c.id]; const pool = chapterQuestions(c).length; const isNext = next?.id === c.id; return (
          <li key={c.id}>
            <Link href={`/learn/${skill}/${c.id}`} className={cn('card flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-brand/60', isNext && 'border-brand/60 bg-brand/5')} data-testid={`chapter-${c.id}`}>
              <span className={cn('relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold ring-4 ring-surface', r?.passedAt ? 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white' : isNext ? 'bg-gradient-to-br from-[#6A4BF0] to-[#1F6FE5] text-white shadow-[0_8px_20px_-8px_rgba(106,75,240,0.9)]' : 'bg-raised text-muted')}>{r?.passedAt ? <Check size={22} /> : c.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{c.title}</span>
                <span className="block text-sm text-muted">{c.goal}</span>
                <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-muted"><span className="chip">🖼️ {c.teach.length} pictures</span><span className="chip">🧭 {c.method.length}-step method</span><span className="chip">🪤 {c.traps.length} traps</span><span className="chip">⚔️ {pool} questions{chapterQuestions(c).some((q) => q.official) ? ' · official' : ''}</span></span>
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
  | { t: 'intro' } | { t: 'teach'; i: number } | { t: 'method' } | { t: 'sheet' } | { t: 'walk'; n: 1 | 2 } | { t: 'traps' } | { t: 'practice'; i: number } | { t: 'done' };

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
  // everything else the app knows about this chapter's topics: hacks, grammar rules, and the skill's key rules
  const sheet = useMemo(() => {
    const hacks = [...new Map(ch.subs.flatMap((s) => hacksFor(ch.skill, s)).map((h) => [h.id, h])).values()];
    const rules = GRAMMAR.filter((g) => g.skill === ch.skill && g.subs.some((s) => ch.subs.includes(s)));
    return [...hacks.map((h) => ({ kind: 'hack' as const, h })), ...rules.map((g) => ({ kind: 'rule' as const, g }))];
  }, [ch]);
  const steps = useMemo<Step[]>(() => [
    { t: 'intro' }, ...ch.teach.map((_, i) => ({ t: 'teach' as const, i })), { t: 'method' }, ...(sheet.length ? [{ t: 'sheet' as const }] : []),
    ...(set.walk ? [{ t: 'walk' as const, n: 1 as const }] : []), ...(set.walk2 ? [{ t: 'walk' as const, n: 2 as const }] : []), { t: 'traps' }, ...set.practice.map((_, i) => ({ t: 'practice' as const, i })), { t: 'done' },
  ], [ch, set, sheet.length]);
  const [k, setK] = useState(0);
  const [methodSeen, setMethodSeen] = useState(1);
  const [walkS, setWalkS] = useState<Record<number, number>>({});
  const [guessS, setGuessS] = useState<Record<number, string | null>>({});
  const wq = (n: 1 | 2) => (n === 1 ? set.walk : set.walk2);
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

  const blocked = (step.t === 'method' && methodSeen < ch.method.length) || (step.t === 'walk' && (walkS[step.n] ?? 0) < (wq(step.n)?.steps.length ?? 0))
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
  const restart = () => { setRound((r) => r + 1); setK(steps.findIndex((s) => s.t === 'practice') > 0 ? 1 : 0); setAns({}); setChecked({}); setWalkS({}); setGuessS({}); setMethodSeen(1); };

  let body: React.ReactNode;
  if (step.t === 'intro') body = (
    <div className="text-center">
      <SkillIcon skill={ch.skill} size={72} className="mx-auto mb-4" />
      <p className="eyebrow">{SKILL[ch.skill].short} · Chapter {ch.n} of {all.length}</p>
      <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-[40px]">{ch.title}</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted"><b className="text-ink">By the end:</b> {ch.goal}</p>
      <ol className="mx-auto mt-7 grid max-w-3xl grid-cols-2 gap-2 text-left text-sm sm:grid-cols-3 md:grid-cols-6">
        {[['🖼️', `${ch.teach.length} picture lessons`], ['🧭', `${ch.method.length}-step method`], ['📋', 'cheat sheet'], ['✍️', `${set.walk2 ? 2 : 1} worked example${set.walk2 ? 's' : ''}`], ['🪤', `${ch.traps.length} traps to dodge`], ['⚔️', `${set.practice.length} hard questions`]].map(([i, t], n) => <li key={t} className="rounded-xl border border-line p-2.5 text-center"><div className="text-2xl" aria-hidden>{i}</div><div className="mt-1 text-xs font-semibold"><span className="text-faint">{n + 1}. </span>{t}</div></li>)}
      </ol>
    </div>
  );
  else if (step.t === 'teach') { const idea = ch.teach[step.i]; body = (
    <div>
      <p className="eyebrow">🖼️ Lesson {step.i + 1} of {ch.teach.length}</p>
      <h2 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-[32px]">{idea.title}</h2>
      <p className="mt-2.5 max-w-3xl text-base leading-relaxed text-muted sm:text-[17px]"><RichText text={idea.text} /></p>
      <div className="mt-5 rounded-3xl border border-line bg-gradient-to-b from-raised/60 to-raised/20 p-3 shadow-inner sm:p-6"><VisualView v={idea.visual} /></div>
      {idea.try && <p className="mt-3 text-center text-sm font-semibold text-brand2">👆 {idea.try}</p>}
    </div>
  ); }
  else if (step.t === 'method') body = (
    <div>
      <p className="eyebrow">🧭 The method</p>
      <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Do it in this order, every time</h2>
      <p className="mt-1 text-sm text-muted">Read each step, then reveal the next. You will use exactly these steps on the hard problem next.</p>
      <ol className="mt-4 space-y-2" data-testid="method">
        {ch.method.slice(0, methodSeen).map((m, i) => <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-xl border border-line bg-surface p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#6A4BF0] text-sm font-bold text-white">{i + 1}</span><span className="pt-0.5"><RichText text={m} /></span></motion.li>)}
      </ol>
      {methodSeen < ch.method.length && <button type="button" className="btn-ghost mt-3" onClick={() => setMethodSeen(methodSeen + 1)} data-testid="method-next">Next step ({methodSeen}/{ch.method.length})</button>}
    </div>
  );
  else if (step.t === 'sheet') body = (
    <div data-testid="cheat-sheet">
      <p className="eyebrow">📋 Cheat sheet</p>
      <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Everything to know for this topic</h2>
      <p className="mt-1 text-[15px] text-muted">The rules and quick tests for this chapter in one place. Save it to your notebook if you want it later.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {sheet.map((x) => x.kind === 'hack' ? (
          <div key={x.h.id} className="rounded-2xl border border-gold/40 bg-gold/5 p-4">
            <div className="text-[11px] font-black uppercase tracking-wide text-gold">⚡ Hack</div>
            <h3 className="mt-0.5 font-bold">{x.h.title}</h3>
            <p className="mt-1 text-sm text-muted"><RichText text={x.h.what} /></p>
            <p className="mt-2 rounded-xl bg-surface/80 p-2.5 text-sm"><b className="text-brand2">The test:</b> <RichText text={x.h.test} /></p>
            <p className="mt-2 text-xs text-muted"><b className="text-ink">Example:</b> <RichText text={x.h.example} /></p>
          </div>
        ) : (
          <div key={x.g.id} className="rounded-2xl border border-line bg-raised/40 p-4">
            <div className="text-[11px] font-black uppercase tracking-wide text-brand2">📏 Rule</div>
            <h3 className="mt-0.5 font-bold">{x.g.title}</h3>
            <p className="mt-1 text-sm">{x.g.rule}</p>
            <div className="mt-2 grid gap-1.5 text-[13px]">{x.g.correct.slice(0, 2).map((c) => <div key={c} className="rounded-lg bg-ok/10 px-2.5 py-1.5 font-serif">✓ {c}</div>)}{x.g.incorrect.slice(0, 1).map((c) => <div key={c} className="rounded-lg bg-bad/10 px-2.5 py-1.5 font-serif">✗ {c}</div>)}</div>
            <p className="mt-2 text-xs text-muted"><b className="text-bad">Trap:</b> {x.g.trap}</p>
          </div>
        ))}
      </div>
      <SaveSheet ch={ch} sheet={sheet} />
    </div>
  );
  else if (step.t === 'walk' && wq(step.n)) { const n = step.n; const q = wq(n)!; const walkN = walkS[n] ?? 0; const guess = guessS[n] ?? null; const setWalkN = (v: number) => setWalkS((x) => ({ ...x, [n]: v })); const setGuess = (v: string) => setGuessS((x) => ({ ...x, [n]: v })); const all_ = walkN >= q.steps.length; body = (
    <div>
      <p className="eyebrow">✍️ Worked example {set.walk2 ? `${n} of 2` : ''} · {q.official ? 'Official College Board question' : DIFFICULTY_NAME[q.difficulty]}</p>
      <p className="mt-1 text-sm text-muted">Pick what you think first (it is not graded), then reveal the solution one step at a time and compare with the method.</p>
      <div className="mt-3"><QuestionView q={q} answer={guess} onAnswer={(v) => !all_ && setGuess(v)} locked={all_} reveal={all_} /></div>
      <ol className="mt-4 space-y-2" data-testid="walk-steps">
        {q.steps.slice(0, walkN).map((s, i) => <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3 rounded-xl border p-3 text-[15px]', i === q.steps.length - 1 ? 'border-ok/50 bg-ok/10' : 'border-line bg-raised/40')}><b className="shrink-0 text-brand2">Step {i + 1}</b><span><RichText text={s} /></span></motion.li>)}
      </ol>
      {!all_ ? <button type="button" className="btn-primary mt-3" onClick={() => setWalkN(walkN + 1)} data-testid="walk-next"><Eye size={16} />{walkN === 0 ? 'Show step 1' : `Show step ${walkN + 1} of ${q.steps.length}`}</button>
        : q.type === 'mcq' && <div className="mt-3 rounded-xl border border-line p-3.5 text-sm"><b>Why the other choices fail</b><ul className="mt-1.5 space-y-1.5">{q.choices!.map((c, i) => i === q.answer ? null : <li key={i} className="flex gap-2"><span className="font-bold text-bad">{LETTERS[i]}</span><span>{DISTRACTORS[q.id]?.[i] && <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-bad" title={TRAPS[DISTRACTORS[q.id][i]!].tip}>Trap: {TRAPS[DISTRACTORS[q.id][i]!].label}</span>}<RichText text={q.why[i]} /></span></li>)}</ul>{guess !== null && <p className={cn('mt-2 font-semibold', isCorrect(q, guess) ? 'text-ok' : 'text-bad')}>Your guess was {LETTERS[Number(guess)]}: {isCorrect(q, guess) ? 'right!' : 'see why above.'}</p>}</div>}
    </div>
  ); }
  else if (step.t === 'traps') body = (
    <div>
      <p className="eyebrow !border-bad/30 !bg-bad/10 !text-bad">🪤 The traps</p>
      <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">How this topic steals points, and the fix</h2>
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

  const label: Record<Step['t'], string> = { intro: 'Start', teach: 'Lessons', method: 'Method', sheet: 'Cheat sheet', walk: 'Worked example', traps: 'Traps', practice: 'Hard questions', done: 'Result' };
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
      <div className="card min-h-[460px] overflow-x-clip p-5 sm:p-9">
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

/** Saves the chapter's method, traps and rules to the notebook. */
function SaveSheet({ ch, sheet }: { ch: Chapter; sheet: ({ kind: 'hack'; h: { title: string; test: string } } | { kind: 'rule'; g: { title: string; rule: string } })[] }) {
  const save = useStore((s) => s.saveNote);
  const [done, setDone] = useState(false);
  const body = [`Method:\n${ch.method.map((m, i) => `${i + 1}. ${m}`).join('\n')}`, `Traps:\n${ch.traps.map((t) => `• ${t.name}: ${t.fix}`).join('\n')}`, ...sheet.map((x) => (x.kind === 'hack' ? `• ${x.h.title}: ${x.h.test}` : `• ${x.g.title}: ${x.g.rule}`))].join('\n\n');
  return <button type="button" className="btn-ghost mt-4" disabled={done} onClick={() => { save({ title: `${SKILL[ch.skill].short}: ${ch.title}`, body, topic: ch.skill, kind: 'lesson' }); setDone(true); }} data-testid="save-sheet"><NotebookPen size={16} />{done ? 'Saved to your notebook' : 'Save this cheat sheet to my notebook'}</button>;
}

/** Skills ordered for "what to study next" lists. */
export const skillOrder = SKILLS.map((s) => s.id);
