'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Eye, Hand, Star, Swords, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SkillId } from '@/lib/types';
import { SKILL, SKILLS, DIFFICULTY_NAME } from '@/lib/taxonomy';
import { LESSON } from '@/data/lessons';
import { VISUAL_LESSONS, type Idea } from '@/data/visual-lessons';
import { CHECKS, type QuickCheck } from '@/data/checks';
import { hacksFor } from '@/data/hacks';
import { questionsBySkill } from '@/data/questions';
import { useStore } from '@/lib/store';
import { useLevel } from '@/lib/hooks';
import { isCorrect } from '@/lib/answers';
import { sfx } from '@/lib/sfx';
import { uid } from '@/lib/util';
import { VisualView } from './Visuals';
import { QuestionView } from './Question';
import { RichText } from './RichText';
import { Pet } from './Pet';
import { Confetti } from './Confetti';
import { cn } from './ui';

type Step =
  | { t: 'intro' }
  | { t: 'idea'; idea: Idea; n: number }
  | { t: 'check'; check: QuickCheck; n: number }
  | { t: 'example' }
  | { t: 'boss' }
  | { t: 'done' };

export const starsFor = (points: number) => (points >= 3 ? 3 : points === 2 ? 2 : 1);

/**
 * The interactive lesson: one picture and one idea per screen, a quick check after each of the
 * first ideas, a worked example to try before revealing, then a real Hard question as the boss.
 * Stars: one point per quick check answered right first time, one for beating the boss.
 */
export function LessonPlayer({ skill, onExit }: { skill: SkillId; onExit: () => void }) {
  const info = SKILL[skill], vl = VISUAL_LESSONS[skill], lesson = LESSON[skill];
  const attempts = useStore((s) => s.attempts);
  const answer = useStore((s) => s.answer);
  const completeLesson = useStore((s) => s.completeLesson);
  const setLessonStars = useStore((s) => s.setLessonStars);
  const level = useLevel().level;
  const equipped = useStore((s) => s.pet.equipped);

  const boss = useMemo(() => {
    const seen = new Set(attempts.map((a) => a.qid));
    const pool = questionsBySkill(skill).filter((q) => q.type === 'mcq');
    const rank = (d: string) => (d === 'hard' ? 0 : d === 'very-hard' ? 1 : d === 'medium' ? 2 : 3);
    return [...pool].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)) || rank(a.difficulty) - rank(b.difficulty))[0];
    // The boss is chosen once per visit so it does not change after you answer it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill]);

  const steps = useMemo<Step[]>(() => {
    const out: Step[] = [{ t: 'intro' }];
    vl.ideas.forEach((idea, i) => { out.push({ t: 'idea', idea, n: i }); if (CHECKS[skill][i]) out.push({ t: 'check', check: CHECKS[skill][i], n: i }); });
    if (lesson.examples[0]) out.push({ t: 'example' });
    if (boss) out.push({ t: 'boss' });
    out.push({ t: 'done' });
    return out;
  }, [vl, lesson, boss, skill]);

  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [shown, setShown] = useState(false);
  const [bossAns, setBossAns] = useState<string | null>(null);
  const [bossDone, setBossDone] = useState<boolean | null>(null);
  const [fire, setFire] = useState(0);
  const [firstTime, setFirstTime] = useState(false);
  const session = useRef(uid());
  const bossStart = useRef(0);
  const step = steps[i];

  const checkPoints = Object.entries(picked).filter(([n, v]) => CHECKS[skill][Number(n)].answer === v).length;
  const points = checkPoints + (bossDone ? 1 : 0);
  const stars = starsFor(points);

  useEffect(() => { if (step.t === 'boss' && !bossStart.current) bossStart.current = Date.now(); }, [step.t]);
  useEffect(() => {
    if (step.t !== 'done') return;
    setFirstTime(!useStore.getState().lessonsDone[skill]);
    completeLesson(skill); setLessonStars(skill, stars); setFire(Date.now()); sfx('win');
    // the finish screen announces the XP itself, so the pop-up would only cover it
    useStore.setState((st) => ({ events: st.events.filter((e) => e.type !== 'xp') }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.t]);

  const blocked = (step.t === 'check' && picked[step.n] === undefined) || (step.t === 'boss' && bossDone === null);
  const next = () => { if (!blocked && i < steps.length - 1) { setI(i + 1); sfx('tap'); } };
  const back = () => i > 0 && setI(i - 1);
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLInputElement)) next(); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  });

  const pick = (n: number, v: number, right: number) => {
    if (picked[n] !== undefined) return;
    setPicked({ ...picked, [n]: v });
    if (v === right) { sfx('correct'); setFire(Date.now()); } else sfx('wrong');
  };
  const submitBoss = () => {
    if (!boss || bossAns === null || bossDone !== null) return;
    const ok = isCorrect(boss, bossAns);
    answer({ qid: boss.id, answer: bossAns, ms: Date.now() - bossStart.current, hints: 0, mode: 'lesson', sessionId: session.current });
    setBossDone(ok);
    if (ok) { sfx('combo'); setFire(Date.now()); } else sfx('wrong');
  };

  const idx = SKILLS.findIndex((k) => k.id === skill);
  const nextSkill = SKILLS[idx + 1];
  const hack = hacksFor(skill)[0];
  const ideaCount = vl.ideas.length;

  let body: React.ReactNode;
  if (step.t === 'intro') {
    body = (
      <div className="text-center">
        <div className="mx-auto flex items-end justify-center gap-2"><Pet mood="study" level={level} equipped={equipped} size={110} /><span className="mb-6 text-6xl" aria-hidden>{vl.icon}</span></div>
        <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{info.name}</h2>
        <p className="mx-auto mt-2 max-w-lg text-muted">{vl.hook}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold">
          <span className="chip">🖼️ {ideaCount} picture ideas</span><span className="chip">⚡ 2 quick checks</span><span className="chip">✍️ 1 worked example</span><span className="chip">⚔️ 1 boss question</span><span className="chip">about 5 min</span>
        </div>
      </div>
    );
  } else if (step.t === 'idea') {
    body = (
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-brand2">Idea {step.n + 1} of {ideaCount}</p>
        <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">{step.idea.title}</h2>
        <p className="mt-1.5 text-[15px] text-muted"><RichText text={step.idea.text} /></p>
        <div className="mt-4 rounded-2xl border border-line bg-raised/40 p-3 sm:p-5"><VisualView v={step.idea.visual} /></div>
        {step.idea.try && <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-brand2"><Hand size={16} aria-hidden />{step.idea.try}</p>}
      </div>
    );
  } else if (step.t === 'check') {
    const c = step.check, mine = picked[step.n], answered = mine !== undefined, right = mine === c.answer;
    body = (
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gold">⚡ Quick check</p>
        <h2 className="mt-2 text-lg font-semibold sm:text-xl"><RichText text={c.q} /></h2>
        <div className="mt-4 grid gap-2.5" role="radiogroup" aria-label="Quick check choices">
          {c.options.map((o, k) => (
            <button key={k} type="button" role="radio" aria-checked={mine === k} disabled={answered} onClick={() => pick(step.n, k, c.answer)} data-testid={`check-option-${k}`}
              className={cn('flex min-h-[52px] items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-[15px] font-medium transition-all', !answered && 'border-line bg-surface hover:-translate-y-0.5 hover:border-brand/60',
                answered && k === c.answer && 'border-ok bg-ok/10', answered && mine === k && k !== c.answer && 'border-bad bg-bad/10', answered && k !== c.answer && mine !== k && 'border-line opacity-55')}>
              <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-bold', answered && k === c.answer ? 'border-ok bg-ok text-white' : answered && mine === k ? 'border-bad bg-bad text-white' : 'border-line text-muted')}>{answered && k === c.answer ? <Check size={15} /> : answered && mine === k ? <X size={15} /> : String.fromCharCode(65 + k)}</span>
              <RichText text={o} />
            </button>
          ))}
        </div>
        {answered && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('mt-4 rounded-xl border p-3.5 text-sm', right ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10')} role="status" data-testid="check-feedback"><b className={right ? 'text-ok' : 'text-bad'}>{right ? 'Yes!' : 'Not quite.'}</b> <RichText text={c.why} /></motion.div>}
      </div>
    );
  } else if (step.t === 'example') {
    const e = lesson.examples[0];
    body = (
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-brand2">✍️ Your turn first</p>
        <h2 className="mt-2 text-lg font-semibold"><RichText text={e.q} /></h2>
        <p className="mt-1 text-sm text-muted">Work it out on paper or in your head. Then compare.</p>
        {shown
          ? <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="prose-q mt-4 rounded-xl border border-ok/40 bg-ok/5 p-4"><b className="text-ok">Solution.</b> <RichText text={e.a} /></motion.div>
          : <button type="button" className="btn-ghost mt-4" onClick={() => setShown(true)}><Eye size={16} />I tried it. Show the solution</button>}
        {hack && shown && <div className="mt-3 rounded-xl border border-gold/40 bg-gold/5 p-3.5 text-sm"><b className="text-gold">Hack · {hack.title}.</b> {hack.test}</div>}
      </div>
    );
  } else if (step.t === 'boss' && boss) {
    body = (
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-bad"><Swords size={15} aria-hidden />Boss question · {DIFFICULTY_NAME[boss.difficulty]} · counts toward your mastery</p>
        <div className="mt-3"><QuestionView q={boss} answer={bossAns} onAnswer={(v) => bossDone === null && setBossAns(v)} locked={bossDone !== null} reveal={bossDone !== null} /></div>
        {bossDone === null
          ? <button type="button" className="btn-primary mt-4" disabled={bossAns === null} onClick={submitBoss} data-testid="boss-submit">Check my answer</button>
          : <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('mt-4 rounded-xl border p-4', bossDone ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10')} role="status" data-testid="boss-feedback">
              <b className={cn('font-display text-lg', bossDone ? 'text-ok' : 'text-bad')}>{bossDone ? 'Boss defeated!' : 'The boss wins this round.'}</b>
              <ol className="prose-q mt-2 list-decimal space-y-1 pl-5 text-sm">{boss.steps.map((s, k) => <li key={k}><RichText text={s} /></li>)}</ol>
              <p className="mt-2 text-sm"><b className="text-bad">Trap:</b> <RichText text={boss.trap} /></p>
              {!bossDone && <p className="mt-2 text-xs text-muted">Saved to your Mistake Bucket so you can beat it later.</p>}
            </motion.div>}
      </div>
    );
  } else {
    body = (
      <div className="text-center" data-testid="lesson-done">
        <Pet mood="celebrate" level={level} equipped={equipped} size={120} className="mx-auto" />
        <h2 className="mt-1 font-display text-2xl font-bold">Lesson complete!</h2>
        <div className="mt-3 flex justify-center gap-2" aria-label={`${stars} of 3 stars`} data-testid="lesson-stars" data-stars={stars}>
          {[1, 2, 3].map((n) => <motion.span key={n} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15 * n, type: 'spring', stiffness: 260 }}><Star size={44} className={n <= stars ? 'fill-gold text-gold' : 'text-line'} /></motion.span>)}
        </div>
        {firstTime && <p className="mt-3 inline-block rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-sm font-bold text-gold" data-testid="lesson-xp">+40 XP · +20 Stardust</p>}
        <p className="mt-3 text-sm text-muted">{checkPoints} of 2 quick checks right first time · boss {bossDone ? 'defeated' : 'not beaten yet'}{stars < 3 ? ' · replay any time for 3 stars' : ''}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={`/practice/session?mode=lesson&skill=${skill}&diff=hard&n=6`} className="btn-primary">Practice 6 Hard questions<ArrowRight size={16} /></Link>
          {nextSkill && <Link href={`/learn/${nextSkill.id}`} className="btn-ghost">Next lesson: {nextSkill.short}</Link>}
          <button type="button" className="btn-ghost" onClick={onExit}>Full notes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl" data-testid="lesson-player">
      <Confetti fire={fire} count={step.t === 'done' ? 70 : 26} />
      <div className="mb-4 flex items-center gap-3">
        <button type="button" className="btn-quiet !px-2" onClick={onExit} aria-label="Leave the lesson"><X size={20} /></button>
        <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length - 1} aria-valuenow={i} aria-label="Lesson progress">
          {steps.slice(1).map((s, k) => <span key={k} className={cn('h-2.5 flex-1 rounded-full transition-colors duration-300', k < i ? (s.t === 'check' ? 'bg-gold' : s.t === 'boss' ? 'bg-bad' : 'bg-gradient-to-r from-brand to-brand2') : 'bg-raised')} />)}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-gold" aria-label={`${points} points so far`}><Star size={16} className="fill-gold" />{points}</span>
      </div>
      <div className="card min-h-[420px] p-5 sm:p-7">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }}>{body}</motion.div>
        </AnimatePresence>
      </div>
      {step.t !== 'done' && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" className="btn-ghost" onClick={back} disabled={i === 0}><ArrowLeft size={16} />Back</button>
          <button type="button" className="btn-primary !px-6 !py-3 text-base" onClick={next} disabled={blocked} data-testid="lesson-next">{step.t === 'intro' ? 'Start' : i === steps.length - 2 ? 'Finish' : 'Continue'}<ArrowRight size={18} /></button>
        </div>
      )}
    </div>
  );
}
