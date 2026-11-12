import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getQuestion, QUESTIONS } from '@/data/questions';
import { useStore } from '@/lib/store';
import { diagnosticSet } from '@/lib/sessions';
import { fmtRange, rangeFromResponses, totalRange } from '@/lib/engine/scoring';
import { DIFFICULTIES, DIFFICULTY_NAME, DOMAINS, SECTION_NAME, SKILL } from '@/lib/taxonomy';
import { fmtDuration, pct } from '@/lib/util';
import type { Section } from '@/lib/types';
import { Logo } from '@/components/AppShell';
import { Pet } from '@/components/Pet';
import { SessionRunner } from '@/components/SessionRunner';
import { Badge, Card, PageHeader, Progress, toneForPct } from '@/components/ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function OnboardingPage() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name ?? '');
  const [current, setCurrent] = useState(profile.currentScore ? String(profile.currentScore) : '');
  const [target, setTarget] = useState(profile.targetScore);
  const [exam, setExam] = useState(profile.examDate ?? '');
  const [minutes, setMinutes] = useState(profile.dailyMinutes);
  const [rest, setRest] = useState<number[]>(profile.restDays);
  const [strong, setStrong] = useState<Section | 'unsure'>(profile.strongest ?? 'unsure');
  const [weak, setWeak] = useState<Section | 'unsure'>(profile.weakest ?? 'unsure');

  const finish = (to: string) => {
    const cs = Number(current);
    setProfile({ name: name.trim().slice(0, 24) || undefined, currentScore: cs >= 400 && cs <= 1600 ? Math.round(cs / 10) * 10 : undefined, targetScore: target, examDate: exam || undefined, dailyMinutes: minutes, restDays: rest, strongest: strong, weakest: weak, onboardedAt: Date.now() });
    router.push(to);
  };
  const pick = <T extends string>(v: T, cur: T, set: (x: T) => void, label: string) => <button type="button" key={v} aria-pressed={cur === v} onClick={() => set(v)} className={`chip !px-3 !py-1.5 ${cur === v ? 'border-brand bg-brand/15 text-ink' : ''}`}>{label}</button>;

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-6 flex items-center gap-3"><Logo size={36} /><div><div className="font-display text-xl font-bold">Stellify</div><div className="text-xs text-muted">Free Digital SAT prep that actually teaches you</div></div></div>
      <Progress value={((step + 1) / 4) * 100} className="mb-5" label="Setup progress" />
      <Card>
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4"><Pet mood="happy" size={110} /><div><h1 className="text-2xl font-bold">Meet Lumi, your study companion</h1><p className="mt-1 text-sm text-muted">Four quick questions, then a diagnostic that finds exactly what to work on. Every question here is optional.</p></div></div>
            <div className="flex gap-2 rounded-xl border border-ok/30 bg-ok/5 p-3 text-sm"><ShieldCheck className="mt-0.5 shrink-0 text-ok" size={18} /><span>No account needed. Your progress is stored only in this browser on this device. No ads, no tracking, nothing sold. You can export or erase everything in Settings.</span></div>
            <div><label className="label" htmlFor="ob-name">What should Lumi call you? (optional, a nickname is fine)</label><input id="ob-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Leave blank to stay anonymous" /></div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-5">
            <h1 className="text-xl font-bold">Where are you, and where are you headed?</h1>
            <div><label className="label" htmlFor="ob-cur">Current SAT or PSAT score, if you know it (optional)</label><input id="ob-cur" className="input max-w-[200px]" inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 1200" /></div>
            <div><label className="label" htmlFor="ob-target">Target score: <span className="text-ink">{target}</span></label><input id="ob-target" type="range" min={1000} max={1600} step={10} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="w-full accent-[rgb(var(--brand))]" /><div className="flex justify-between text-xs text-faint"><span>1000</span><span>1300</span><span>1600</span></div></div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <h1 className="text-xl font-bold">How much time do you have?</h1>
            <div><label className="label" htmlFor="ob-exam">Exam date (optional)</label><input id="ob-exam" type="date" className="input max-w-[220px]" value={exam} onChange={(e) => setExam(e.target.value)} /></div>
            <div><span className="label">Minutes you can study on a typical day</span><div className="flex flex-wrap gap-2">{[15, 30, 45, 60, 90, 120].map((m) => <button type="button" key={m} aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={`chip !px-3 !py-1.5 ${minutes === m ? 'border-brand bg-brand/15 text-ink' : ''}`}>{m} min</button>)}</div><p className="mt-1.5 text-xs text-faint">Be realistic. A plan you can keep beats an ambitious one you abandon.</p></div>
            <div><span className="label">Rest days (these never break your streak)</span><div className="flex flex-wrap gap-2">{DAYS.map((d, i) => <button type="button" key={d} aria-pressed={rest.includes(i)} onClick={() => setRest((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i]))} className={`chip !px-3 !py-1.5 ${rest.includes(i) ? 'border-brand bg-brand/15 text-ink' : ''}`}>{d}</button>)}</div></div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-5">
            <h1 className="text-xl font-bold">Strengths and weaknesses (optional)</h1>
            <div><span className="label">Strongest subject</span><div className="flex flex-wrap gap-2">{pick('math', strong, setStrong, 'Math')}{pick('rw', strong, setStrong, 'Reading & Writing')}{pick('unsure', strong, setStrong, 'Not sure')}</div></div>
            <div><span className="label">Weakest subject</span><div className="flex flex-wrap gap-2">{pick('math', weak, setWeak, 'Math')}{pick('rw', weak, setWeak, 'Reading & Writing')}{pick('unsure', weak, setWeak, 'Not sure')}</div></div>
            <p className="text-sm text-muted">Next is a 28-question diagnostic (about 40 minutes, untimed). It measures every domain so your plan starts in the right place.</p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {step > 0 && <button className="btn-ghost" onClick={() => setStep(step - 1)}>Back</button>}
          {step < 3 ? <button className="btn-primary" onClick={() => setStep(step + 1)}>Continue<ArrowRight size={16} /></button>
            : <><button className="btn-primary" onClick={() => finish('/diagnostic')}>Start the diagnostic<ArrowRight size={16} /></button><button className="btn-ghost" onClick={() => finish('/')}>Skip for now</button></>}
          {step < 3 && <button className="btn-quiet ml-auto" onClick={() => finish('/')}>Skip setup</button>}
        </div>
      </Card>
    </div>
  );
}

function DiagnosticResults() {
  const attempts = useStore((s) => s.attempts);
  const plan = useStore((s) => s.plan);
  const data = useMemo(() => {
    const diag = attempts.filter((a) => a.mode === 'diagnostic');
    const lastSession = diag[diag.length - 1]?.sessionId;
    const rows = diag.filter((a) => a.sessionId === lastSession).map((a) => ({ a, q: getQuestion(a.qid)! })).filter((r) => r.q);
    const sec = (s: Section) => { const x = rows.filter((r) => r.q.section === s); return { n: x.length, c: x.filter((r) => r.a.correct).length, ms: x.reduce((t, r) => t + r.a.ms, 0), target: x.reduce((t, r) => t + r.q.time * 1000, 0), range: rangeFromResponses(x.map((r) => ({ difficulty: r.q.difficulty, type: r.q.type, correct: r.a.correct }))) }; };
    return { rows, math: sec('math'), rw: sec('rw') };
  }, [attempts]);
  if (!data.rows.length) return null;
  const { rows, math, rw } = data;
  const total = totalRange(rw.range, math.range);
  const missed = rows.filter((r) => !r.a.correct);
  const pace = (s: typeof math) => (s.target ? s.ms / s.target : 0);
  const paceNote = (label: string, s: typeof math) => { const p = pace(s); return p === 0 ? '' : p > 1.25 ? `${label}: you used about ${Math.round(p * 100)}% of the target time. Accuracy first, but timed practice should be part of your plan.` : p < 0.6 ? `${label}: you worked very fast (about ${Math.round(p * 100)}% of target time). If you missed questions, slowing down will help more than anything.` : `${label}: your pace was on target (about ${Math.round(p * 100)}% of the allotted time).`; };
  return (
    <div className="mb-5 space-y-4" data-testid="diagnostic-results">
      <Card>
        <h2 className="text-xl font-bold">Your diagnostic results</h2>
        <p className="mt-1 text-sm text-muted">A 28-question diagnostic cannot produce a precise SAT score. The ranges below are Stellify&apos;s rough, unofficial estimate and are deliberately wide. For a real scaled score, take an official practice test in <Link href="/resources" className="underline">Bluebook</Link>.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {([['Reading & Writing', rw], ['Math', math]] as const).map(([label, s]) => (
            <div key={label} className="rounded-xl border border-line p-4"><div className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</div><div className="mt-1 font-display text-2xl font-bold">{s.c}/{s.n}</div><div className="text-sm text-muted">Estimated {fmtRange(s.range)}</div><div className="mt-1 text-xs text-faint">{fmtDuration(s.ms)} used</div></div>
          ))}
          <div className="rounded-xl border border-brand/40 bg-brand/10 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-faint">Estimated total range</div><div className="mt-1 font-display text-2xl font-bold">{fmtRange(total)}</div><div className="text-xs text-muted">Unofficial</div></div>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-semibold">By domain</h3>
          <ul className="mt-3 space-y-2.5">
            {DOMAINS.map((d) => { const x = rows.filter((r) => r.q.domain === d.id); const p = pct(x.filter((r) => r.a.correct).length, x.length); return (
              <li key={d.id}><div className="mb-1 flex justify-between text-sm"><span>{d.name}</span><span className="text-muted">{x.filter((r) => r.a.correct).length}/{x.length}</span></div><Progress value={p} tone={toneForPct(p)} label={d.name} /></li>
            ); })}
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold">By difficulty</h3>
          <ul className="mt-3 space-y-2.5">
            {DIFFICULTIES.map((d) => { const x = rows.filter((r) => r.q.difficulty === d); const p = pct(x.filter((r) => r.a.correct).length, x.length); return (
              <li key={d}><div className="mb-1 flex justify-between text-sm"><span>{DIFFICULTY_NAME[d]}</span><span className="text-muted">{x.filter((r) => r.a.correct).length}/{x.length}</span></div><Progress value={p} tone={toneForPct(p)} label={DIFFICULTY_NAME[d]} /></li>
            ); })}
          </ul>
          <h3 className="mt-5 font-semibold">Time management</h3>
          <p className="mt-1 text-sm text-muted">{paceNote(SECTION_NAME.rw, rw)}</p><p className="mt-1 text-sm text-muted">{paceNote(SECTION_NAME.math, math)}</p>
        </Card>
      </div>
      <Card>
        <h3 className="font-semibold">Skills to work on first</h3>
        {missed.length ? <div className="mt-2 flex flex-wrap gap-2">{[...new Set(missed.map((r) => r.q.skill))].map((k) => <Link key={k} href={`/learn/${k}`} className="chip !py-1 hover:text-ink">{SKILL[k].short} <Badge tone="bad">{missed.filter((r) => r.q.skill === k).length} missed</Badge></Link>)}</div> : <p className="mt-1 text-sm text-muted">You did not miss a single question. Head to the Hardest Questions set.</p>}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <Link href="/calendar" className="btn-primary">See your personalized {plan ? `${plan.days.length}-day` : ''} roadmap</Link>
          <Link href="/mistakes" className="btn-ghost">Review missed questions</Link>
          <Link href="/" className="btn-ghost">Go to the dashboard</Link>
        </div>
      </Card>
    </div>
  );
}

export function DiagnosticPage() {
  const done = useStore((s) => s.profile.diagnosticAt);
  const hasDiag = useStore((s) => s.attempts.some((a) => a.mode === 'diagnostic'));
  const finishDiagnostic = useStore((s) => s.finishDiagnostic);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const qids = useMemo(() => diagnosticSet(QUESTIONS), []);

  if (running) return (<div>{finished && <DiagnosticResults />}<SessionRunner qids={qids} mode="diagnostic" feedback="end" hints={false} title="Diagnostic" backHref="/" onComplete={() => { finishDiagnostic(); setFinished(true); window.scrollTo(0, 0); }} completeHref="/calendar" completeLabel="See my roadmap" /></div>);
  return (
    <div>
      <PageHeader eyebrow="Start here" title="Diagnostic" subtitle="28 questions across all eight domains: 14 Reading & Writing and 14 Math, at mixed difficulty. Untimed, but your pace is measured. No hints, and feedback comes at the end with a full explanation of every question." />
      {done && hasDiag && <DiagnosticResults />}
      <Card>
        <ul className="space-y-1.5 text-sm text-muted">
          <li>• Plan for about 40 minutes without interruptions.</li>
          <li>• Use scratch paper and a calculator for Math, as on test day.</li>
          <li>• Guessing is fine; unanswered questions count as incorrect.</li>
          <li>• Your results create a personalized 30-day study plan and seed the Mistake Bucket.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2"><button className="btn-primary" onClick={() => setRunning(true)}>{done ? 'Retake the diagnostic' : 'Begin the diagnostic'}</button><Link href="/resources" className="btn-ghost">Prefer an official full-length test? Use Bluebook</Link></div>
      </Card>
    </div>
  );
}
