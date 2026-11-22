import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getQuestion, QUESTIONS } from '@/data/questions';
import { useStore } from '@/lib/store';
import { FLAGS, GRADES, HARD_TOPICS, MATH_CLASSES, TEST_WHEN, emptyIntake, type Flag, type Grade, type Intake, type MathClass, type TestWhen } from '@/lib/model/intake';
import { PLACEMENT, PLACEMENT_LENGTH, nextPlacementQuestion, openPlacement, placementAnswers } from '@/lib/model/placement';
import { STAGE_INFO } from '@/lib/engine/coach';
import { SECTION_NAME, SKILL } from '@/lib/taxonomy';
import { Logo } from '@/components/AppShell';
import { QuestionView } from '@/components/Question';
import { CoachToday, FocusList, useCoach } from '@/components/Coach';
import { Card, PageHeader, Progress, cn } from '@/components/ui';
import { AccountChoice } from '@/components/Account';
import { accountMode, cloudAvailable, reconcile } from '@/lib/cloud';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const chip = (on: boolean) => cn('chip !px-3 !py-1.5 text-left', on && 'border-brand bg-brand/15 text-ink');

/**
 * Start here. No account, no name required: first the student's situation (six short screens, every answer used by
 * the plan and every one optional), then the adaptive placement check, then their plan and why it looks the way
 * it does. Nothing here is a template: two students with different answers get different plans.
 */
export function OnboardingPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const [step, setStep] = useState(sp.get('step') === 'placement' ? 2 : 0);
  const [i, setI] = useState<Intake>(() => profile.intake ?? emptyIntake(Date.now()));
  const [exam, setExam] = useState(profile.examDate ?? '');
  const [target, setTarget] = useState(profile.targetScore);
  const [targetTouched, setTargetTouched] = useState(!!profile.intake);
  const [minutes, setMinutes] = useState(profile.dailyMinutes);
  const [rest, setRest] = useState<number[]>(profile.restDays);
  const [name, setName] = useState(profile.name ?? '');
  const set = (p: Partial<Intake>) => setI((x) => ({ ...x, ...p }));
  const toggle = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((x) => x !== v) : [...a, v]);
  const past = (i.past?.rw ?? 0) + (i.past?.math ?? 0);
  // a sensible default goal: about 100 points above a known score
  useEffect(() => { if (!targetTouched && past >= 400) setTarget(Math.min(1600, Math.round((past + 100) / 10) * 10)); }, [past, targetTouched]);

  const save = () => setProfile({ intake: { ...i, at: Date.now(), testWhen: exam ? 'date' : i.testWhen }, examDate: exam || undefined, targetScore: target, dailyMinutes: minutes, restDays: rest, name: name.trim().slice(0, 24) || undefined, currentScore: past >= 400 ? past : profile.currentScore, onboardedAt: profile.onboardedAt ?? Date.now() });
  const go = (n: number) => { if (n >= 2) save(); setStep(n); window.scrollTo(0, 0); };
  const STEPS = 2;

  // on the website, the first choice: a Google account (progress saved there) or guest (this device only)
  const [chooseAccount, setChooseAccount] = useState(() => step === 0 && cloudAvailable() && accountMode() === null);
  if (chooseAccount) return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6 flex items-center gap-3"><Logo size={36} /><div><div className="font-display text-xl font-bold">Stellify</div><div className="text-xs text-muted">Free Digital SAT prep, planned around you</div></div></div>
      <Card><AccountChoice onDone={async (mode) => {
        if (mode === 'google') {
          await reconcile();
          // a returning student: their account already has a plan, so go straight to it
          if (useStore.getState().profile.onboardedAt) { router.push('/'); return; }
        }
        setChooseAccount(false);
      }} /></Card>
    </div>
  );
  if (step === 2) return <PlacementStep onDone={() => router.push('/onboarding/plan')} />;
  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6 flex items-center gap-3"><Logo size={36} /><div><div className="font-display text-xl font-bold">Stellify</div><div className="text-xs text-muted">Free Digital SAT prep, planned around you</div></div></div>
      <Progress value={((step + 1) / (STEPS + 2)) * 100} className="mb-5" label="Setup progress" />
      <Card className="space-y-8">
        {step === 0 && (
          <div className="space-y-4 border-b border-line pb-5" data-testid="intake-welcome">
            <h1 className="text-2xl font-bold">Let’s find out what you need</h1>
            <p className="text-[15px] text-muted">Two short screens about you, then a 15-minute check that adapts to you (you can finish it later). Your plan is built from your answers. Skip anything you like.</p>
            <div className="flex gap-2 rounded-xl border border-ok/30 bg-ok/5 p-3 text-sm"><ShieldCheck className="mt-0.5 shrink-0 text-ok" size={18} /><span>{accountMode() === 'google' ? 'Signed in: your progress is saved to your account. No ads, no tracking. Export or erase it any time in Settings.' : 'No account needed. Everything stays in this browser on this device. No ads, no tracking. Export or erase it any time in Settings.'}</span></div>
          </div>
        )}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">Where are you in school?</h2>
            <div><span className="label">Grade</span><div className="flex flex-wrap gap-2">{GRADES.map((g) => <button type="button" key={g.id} aria-pressed={i.grade === g.id} onClick={() => set({ grade: g.id as Grade })} className={chip(i.grade === g.id)}>{g.label}</button>)}</div></div>
            <div><span className="label">Math class you are taking now (or took last)</span><div className="flex flex-wrap gap-2">{MATH_CLASSES.map((m) => <button type="button" key={m.id} aria-pressed={i.mathClass === m.id} onClick={() => set({ mathClass: m.id as MathClass })} className={chip(i.mathClass === m.id)}>{m.label}{m.sub && <span className="text-faint"> · {m.sub}</span>}</button>)}</div>
              <p className="mt-1.5 text-xs text-faint">Used to tell “not learned yet” apart from “needs practice”: topics your class has not reached start with a lesson.</p></div>
          </div>
        )}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">Your scores and your test</h2>
            <div><span className="label">Have you taken the SAT or PSAT?</span><div className="flex flex-wrap gap-2">{([['none', 'Not yet'], ['psat', 'The PSAT'], ['sat', 'The SAT']] as const).map(([v, l]) => <button type="button" key={v} aria-pressed={i.taken === v} onClick={() => set({ taken: v })} className={chip(i.taken === v)}>{l}</button>)}</div></div>
            {(i.taken === 'psat' || i.taken === 'sat') && (
              <div className="grid gap-3 sm:grid-cols-2">
                {(['rw', 'math'] as const).map((k) => <div key={k}><label className="label" htmlFor={`ob-${k}`}>{SECTION_NAME[k]} score (if you know it)</label><input id={`ob-${k}`} className="input" inputMode="numeric" placeholder="e.g. 520" value={i.past?.[k] ?? ''} onChange={(e) => { const v = Number(e.target.value.replace(/\D/g, '').slice(0, 3)); set({ past: { ...i.past, [k]: v >= 160 && v <= 800 ? Math.round(v / 10) * 10 : undefined } }); }} /></div>)}
                <p className="text-xs text-faint sm:col-span-2">Section scores, 160–800 for the PSAT or 200–800 for the SAT. They set your starting point; the check fine-tunes it.</p>
              </div>
            )}
            <div><span className="label">When is your test?</span><div className="flex flex-wrap gap-2">{TEST_WHEN.map((t) => <button type="button" key={t.id} aria-pressed={!exam && i.testWhen === t.id} onClick={() => { setExam(''); set({ testWhen: t.id as TestWhen }); }} className={chip(!exam && i.testWhen === t.id)}>{t.label}</button>)}</div>
              <div className="mt-3"><label className="label" htmlFor="ob-exam">Or the exact date, if you are registered</label><input id="ob-exam" type="date" className="input max-w-[220px]" value={exam} onChange={(e) => setExam(e.target.value)} /></div></div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold">Your goal, your time, and what feels hard</h1>
            <div><label className="label" htmlFor="ob-target">Goal score: <span className="text-ink">{target}</span></label><input id="ob-target" type="range" min={600} max={1600} step={10} value={target} onChange={(e) => { setTarget(Number(e.target.value)); setTargetTouched(true); }} className="w-full accent-[rgb(var(--brand))]" /><div className="flex justify-between text-xs text-faint"><span>600</span><span>1100</span><span>1600</span></div>
              <p className="mt-1 text-xs text-faint">{past >= 400 ? `Set to about 100 points above your ${past}. Not sure what you need? Check the middle 50% range for the schools you like.` : 'Not sure? The check will tell you where you are, and your plan will say how realistic this goal is.'}</p></div>
            <div><span className="label">Minutes you can study on a typical day</span><div className="flex flex-wrap gap-2">{[15, 20, 30, 45, 60, 90].map((m) => <button type="button" key={m} aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={chip(minutes === m)}>{m} min</button>)}</div><p className="mt-1.5 text-xs text-faint">Be honest: a plan you keep beats one you drop. Short days get short, focused tasks.</p></div>
            <div><span className="label">Days off each week</span><div className="flex flex-wrap gap-2">{DAYS.map((d, n) => <button type="button" key={d} aria-pressed={rest.includes(n)} onClick={() => setRest((r) => toggle(r, n))} className={chip(rest.includes(n))}>{d}</button>)}</div></div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">What feels hard right now?</h2>
            <p className="text-sm text-muted">Pick any that apply. The check tests these first, and they start a little lower in your plan until the check says otherwise.</p>
            {(['math', 'rw'] as const).map((sec) => <div key={sec}><span className="label">{SECTION_NAME[sec]}</span><div className="flex flex-wrap gap-2">{HARD_TOPICS.filter((t) => t.section === sec).map((t) => <button type="button" key={t.id} aria-pressed={i.hard.includes(t.id)} onClick={() => set({ hard: toggle(i.hard, t.id) })} className={chip(i.hard.includes(t.id))} data-testid={`hard-${t.id}`}>{t.label}</button>)}</div></div>)}
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold">Anything else we should plan around?</h2>
            <ul className="space-y-2">{FLAGS.map((f) => <li key={f.id}><button type="button" aria-pressed={i.flags.includes(f.id)} onClick={() => set({ flags: toggle(i.flags, f.id as Flag) })} className={cn(chip(i.flags.includes(f.id)), 'w-full !justify-start')}><span>{f.label}</span><span className="ml-auto pl-3 text-xs text-faint">{f.usedFor}</span></button></li>)}</ul>
            <div><label className="label" htmlFor="ob-name">A nickname for your study companion to use (optional)</label><input id="ob-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Leave blank to stay anonymous" /></div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {step > 0 && <button className="btn-ghost" onClick={() => go(step - 1)}>Back</button>}
          {step < 1 ? <button className="btn-primary" onClick={() => go(step + 1)} data-testid="intake-next">{'Continue'}<ArrowRight size={16} /></button>
            : <><button className="btn-primary" onClick={() => go(2)} data-testid="intake-to-placement">Take the 15-minute check<ArrowRight size={16} /></button><button className="btn-ghost" onClick={() => { save(); router.push('/onboarding/plan'); }}>Skip the check: plan from my answers</button></>}
          {step === 0 && <button className="btn-quiet ml-auto" onClick={() => { setProfile({ onboardedAt: Date.now() }); router.push('/'); }}>Skip setup</button>}
        </div>
      </Card>
    </div>
  );
}

/** The adaptive placement check, one question at a time, no feedback until the end (it is a measurement). */
export function PlacementStep({ onDone }: { onDone: () => void }) {
  const attempts = useStore((s) => s.attempts);
  const intake = useStore((s) => s.profile.intake);
  const answerQ = useStore((s) => s.answer);
  const setProfile = useStore((s) => s.setProfile);
  const finishDiagnostic = useStore((s) => s.finishDiagnostic);
  const diagnosticAt = useStore((s) => s.profile.diagnosticAt);
  const router = useRouter();
  // a check left half-way resumes where it stopped
  const sessionId = useRef(openPlacement(attempts, diagnosticAt)?.sessionId ?? `${PLACEMENT.sessionPrefix}${Date.now()}`).current;
  const [answer, setAnswer] = useState<string | null>(null);
  const [fast, setFast] = useState(false);
  const shownAt = useRef(Date.now());
  const n = placementAnswers(attempts, sessionId).length;
  const q = useMemo(() => nextPlacementQuestion({ bank: QUESTIONS, attempts, sessionId, intake, getQ: getQuestion, now: Date.now() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attempts.length, intake?.notTaught?.length]);
  useEffect(() => { shownAt.current = Date.now(); setAnswer(null); }, [q?.id]);
  const finish = () => { finishDiagnostic(); onDone(); };
  useEffect(() => { if (!q && n > 0) finish(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q, n]);
  const submit = (notLearned = false) => {
    if (!q) return;
    const ms = Date.now() - shownAt.current;
    if (notLearned) {
      answerQ({ qid: q.id, answer: null, ms, hints: 0, mode: 'diagnostic', sessionId, abandoned: true });
      const i = intake ?? emptyIntake(Date.now());
      setProfile({ intake: { ...i, notTaught: [...new Set([...(i.notTaught ?? []), q.skill])] } });
    } else {
      answerQ({ qid: q.id, answer, ms, hints: 0, mode: 'diagnostic', sessionId });
      setFast(answer !== null && ms < 5000);
    }
    window.scrollTo(0, 0);
  };
  if (!q) return <div className="card mx-auto max-w-2xl p-8 text-center">Building your plan…</div>;
  return (
    <div className="mx-auto max-w-3xl" data-testid="placement">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Placement check</h1>
        <span className="text-sm text-muted" data-num>Question {n + 1} of {PLACEMENT_LENGTH}</span>
        <span className="ml-auto flex flex-wrap gap-2">{n > 0 && n < PLACEMENT_LENGTH && <button className="btn-ghost" onClick={() => router.push('/')} data-testid="placement-later">Save and finish later</button>}<button className="btn-quiet" onClick={finish} data-testid="placement-stop">{n ? 'Stop here and see my plan' : 'Skip the check'}</button></span>
      </div>
      <Progress value={(n / PLACEMENT_LENGTH) * 100} className="mb-4" label="Placement progress" />
      {fast && <p className="mb-3 rounded-xl border border-warn/30 bg-warn/5 px-4 py-2 text-sm" role="status">That was quick. A guess tells us less than a real try, so take your time: there is no clock here.</p>}
      <div className="card p-5" data-testid="question-card" data-qid={q.id}>
        <QuestionView q={q} answer={answer} onAnswer={setAnswer} hlScope={sessionId} number={n + 1} />
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <button className="btn-primary" disabled={answer === null || answer === ''} onClick={() => submit()} data-testid="placement-next">Next<ArrowRight size={16} /></button>
          <button className="btn-ghost" onClick={() => submit(true)} data-testid="placement-not-learned">I have not learned this yet</button>
        </div>
      </div>
      <p className="mt-3 text-xs text-faint">No hints and no answers during the check: it measures where you are. You will see every explanation afterwards in the Mistake Bucket. Use scratch paper and a calculator for Math, as on test day.</p>
    </div>
  );
}

/** After set-up: where the student is, what the plan will do and why, and the first day. */
export function PlanReadyPage() {
  const plan = useCoach(7);
  const st = STAGE_INFO[plan.stage];
  const est = plan.estimate;
  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="plan-ready">
      <PageHeader eyebrow="Your plan" title={plan.hasData ? 'Here is where you are, and the plan' : 'Your starting plan'} subtitle={plan.hasData ? 'Built from your answers. It changes as you work: every morning it re-plans from your latest results.' : 'We know very little yet, so this is a starting point. The placement check makes it yours.'} />
      {plan.hasData && (
        <Card>
          <div className="grid gap-3 sm:grid-cols-3">
            {([['Reading and Writing', est.rw], ['Math', est.math], ['Total', est.total]] as const).map(([l, b]) => <div key={l} className={cn('rounded-xl border p-4', l === 'Total' ? 'border-brand/40 bg-brand/10' : 'border-line')}><div className="text-xs font-semibold uppercase tracking-wide text-faint">{l}</div><div className="mt-1 font-display text-2xl font-bold" data-num>{b.low}–{b.high}</div></div>)}
          </div>
          <p className="mt-3 text-xs text-faint">A rough, unofficial range from a short check (80% band). It narrows as you practise. For a real score, take an official practice test in Bluebook.</p>
          <h2 className="mt-5 text-lg font-semibold">Stage: {st.name}</h2>
          <p className="text-[15px] text-muted">{st.blurb}</p>
          {plan.notes.map((x) => <p key={x} className="mt-2 rounded-xl border border-warn/30 bg-warn/5 px-4 py-2 text-sm">{x}</p>)}
          {plan.projection.high > 0 && <p className="mt-2 text-sm text-muted">If you keep to the plan, a realistic gain {plan.horizon.known ? 'by test day' : 'over the next two months'} is roughly +{plan.projection.low} to +{plan.projection.high} points. That is our model’s estimate, not a promise.</p>}
        </Card>
      )}
      <Card>
        <h2 className="text-lg font-semibold">What the plan works on first</h2>
        <p className="mb-3 text-sm text-muted">Chosen where an hour of work should add the most points for you: how often each skill is tested, how much you are missing, and whether you have learned it yet.</p>
        <FocusList plan={plan} max={5} />
        {plan.strengths.length > 0 && <p className="mt-4 text-sm text-muted">Already strong: {plan.strengths.map((k) => SKILL[k].short).join(', ')}. These come back now and then so they stay strong.</p>}
      </Card>
      <CoachToday plan={plan} />
      <div className="flex flex-wrap gap-2"><Link href="/" className="btn-primary">Go to my dashboard<ArrowRight size={16} /></Link><Link href="/calendar" className="btn-ghost">See the next two weeks</Link><Link href="/onboarding" className="btn-quiet">Change my answers</Link></div>
    </div>
  );
}

/** The old diagnostic address: now the placement check (to retake it) and the plan. */
export function DiagnosticPage() {
  const router = useRouter();
  const done = useStore((s) => s.profile.diagnosticAt);
  const [running, setRunning] = useState(false);
  if (running) return <PlacementStep onDone={() => router.push('/onboarding/plan')} />;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Start here" title="Placement check" subtitle="16 questions across all eight SAT domains that get easier or harder as you go, so they find your level in about 15 minutes. No clock and no hints; every explanation is waiting afterwards." />
      <Card>
        <ul className="space-y-1.5 text-sm text-muted"><li>• Say “I have not learned this yet” when a topic is new: it is useful, not a failure.</li><li>• Stop whenever you like; your plan uses whatever you answered.</li><li>• Your plan re-plans from the results straight away.</li></ul>
        <div className="mt-4 flex flex-wrap gap-2"><button className="btn-primary" onClick={() => setRunning(true)} data-testid="placement-begin">{done ? 'Retake the placement check' : 'Begin the placement check'}</button><Link href="/onboarding" className="btn-ghost">Answer the start-up questions</Link></div>
      </Card>
    </div>
  );
}
