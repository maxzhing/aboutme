'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, CalendarCheck, CheckCircle2, Clock, FileStack, Gauge, Loader2, Lock, Shuffle, Sparkles, Target, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { OFFICIAL } from '@/data/questions';
import { useStore } from '@/lib/store';
import { useOfficial, saveFullTest } from '@/lib/officialStore';
import { FULL_FORM, FULL_TESTS } from '@/lib/fullTest/registry';
import { remixForms, satCoverage } from '@/lib/fullTest/assemble';
import { REAL_SAT, REAL_SAT_BLEND, REMIX } from '@/lib/engine/mock';
import { analyzeTest } from '@/lib/engine/testPlan';
import { getQuestion, QUESTIONS } from '@/data/questions';
import { SECTION_NAME, SKILL } from '@/lib/taxonomy';
import { fmtDuration, pct } from '@/lib/util';
import type { MockAttempt, Section } from '@/lib/types';
import { Badge, Card, Progress, cn } from '@/components/ui';

const totalMinutes = (t: (typeof FULL_TESTS)[number]) => t.modules.reduce((s, m) => s + m.minutes, 0) + 10;
const fmtMin = (m: number) => `${Math.floor(m / 60)} h ${m % 60} min`;

/** Drop zone for one College Board paper practice test: booklet + scoring guide (+ answer explanations). */
export function FullTestImport() {
  const [busy, setBusy] = useState<{ step: string; done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string; warnings: string[] } | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useOfficial((s) => s.v);
  const run = async (list: FileList | File[]) => {
    const files = [...list].filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!files.length) return;
    setResult(null);
    try {
      const { importFullTest } = await import('@/lib/importFullTest');
      const r = await importFullTest(files, (step, done, total) => setBusy({ step, done, total }));
      await saveFullTest(r.test, r.items);
      const n = (s: Section) => r.test.modules.filter((m) => m.section === s).reduce((a, m) => a + m.qids.length, 0);
      setResult({ ok: true, text: `Imported ${r.test.name}: ${n('rw')} Reading & Writing and ${n('math')} Math questions${r.test.table ? ', with the College Board score conversion table' : ''}.`, warnings: r.warnings });
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message, warnings: [] });
    } finally { setBusy(null); }
  };
  return (
    <section className={cn('rounded-3xl border-2 border-dashed p-6 transition-colors sm:p-8', drag ? 'border-brand bg-brand/10' : 'border-line bg-surface')}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void run(e.dataTransfer.files); }} data-testid="fulltest-zone">
      <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand2-solid text-white"><FileStack size={20} /></span><h2 className="text-xl font-bold">Add a full official practice test</h2></div>
          <ol className="mt-4 space-y-2 text-sm text-muted">
            <li><b className="text-ink">1.</b> On the College Board&apos;s SAT paper practice tests page, download one test&apos;s three PDFs: the <b className="text-ink">practice test</b>, its <b className="text-ink">scoring guide</b> and its <b className="text-ink">answer explanations</b>.</li>
            <li><b className="text-ink">2.</b> Drop all three here at once. They are read on this device, with no API key and nothing uploaded.</li>
            <li><b className="text-ink">3.</b> Take the whole test under real timing and get a score from that test&apos;s own College Board conversion table.</li>
          </ol>
        </div>
        <div className="text-center">
          <input ref={input} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => e.target.files && void run(e.target.files)} data-testid="fulltest-input" />
          <button type="button" className="btn-primary !px-6 !py-3.5 text-base" disabled={!!busy} onClick={() => input.current?.click()}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}{busy ? 'Reading…' : 'Choose the 3 PDFs'}</button>
        </div>
      </div>
      {busy && <div className="mt-5"><div className="mb-1 flex justify-between text-xs text-muted"><span>{busy.step}</span><span>{pct(busy.done, busy.total)}%</span></div><Progress value={pct(busy.done, busy.total)} label="Import progress" /></div>}
      {result && !busy && (
        <div className={cn('mt-5 rounded-xl border p-3 text-sm', result.ok ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10')} role="status" data-testid="fulltest-result">
          <p className="flex items-start gap-2"><CheckCircle2 size={17} className={cn('mt-0.5 shrink-0', result.ok ? 'text-ok' : 'text-bad')} />{result.text}</p>
          {result.warnings.map((w) => <p key={w} className="mt-1 pl-6 text-xs text-muted">{w}</p>)}
        </div>
      )}
    </section>
  );
}

/** Official full tests and the adaptive SAT-style test, with how each will be scored. */
export function OfficialTestsCard({ begin }: { begin: (form: string, kind: MockAttempt['kind']) => void }) {
  useOfficial((s) => s.v);
  const mocks = useStore((s) => s.mocks);
  const cover = useMemo(() => ({ rw: satCoverage('rw', OFFICIAL), math: satCoverage('math', OFFICIAL) }), [OFFICIAL.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const remixes = useMemo(() => remixForms(OFFICIAL, QUESTIONS), [OFFICIAL.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const taken = (formId: string) => mocks.some((m) => m.formId === formId && m.completedAt);
  const best = (formId: string) => mocks.filter((m) => m.formId === formId && m.completedAt && m.kind === 'full' && m.scores).sort((a, b) => b.scores!.total.mid - a.scores!.total.mid)[0];
  return (
    <div className="space-y-4" data-testid="official-tests">
      {FULL_TESTS.length > 0 && (
        <Card className="border-gold/50">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">Official full practice tests</h2><Badge tone="gold"><BadgeCheck size={13} />College Board</Badge></div>
          <p className="mt-1 text-sm text-muted">The College Board&apos;s own practice tests, exactly as printed: two Reading &amp; Writing modules, a 10-minute break, two Math modules, at their real time limits. Your score comes from each test&apos;s official raw-score conversion table.</p>
          <ul className="mt-3 divide-y divide-line">
            {FULL_TESTS.map((t) => { const b = best(FULL_FORM + t.id); const n = t.modules.reduce((s, m) => s + m.qids.length, 0); return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3" data-testid={`fulltest-${t.id}`}>
                <div className="w-full sm:w-auto sm:min-w-0 sm:flex-1"><div className="font-semibold">{t.name}</div><div className="text-xs text-muted">{n} questions · {fmtMin(totalMinutes(t))}{t.table ? ' · official score table' : ''}{b ? ` · best ${b.scores!.total.mid}` : ''}</div></div>
                <button className="btn-primary" onClick={() => begin(FULL_FORM + t.id, 'full')} data-testid={`start-fulltest-${t.id}`}><Lock size={15} />Take the full test</button>
                <button className="btn-ghost !px-3" onClick={() => begin(FULL_FORM + t.id, 'section-rw')}>R&amp;W only</button>
                <button className="btn-ghost !px-3" onClick={() => begin(FULL_FORM + t.id, 'section-math')}>Math only</button>
              </li>
            ); })}
          </ul>
        </Card>
      )}
      {remixes.length > 0 && (
        <Card className="border-ok/50" data-testid="remix-card">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">Original practice tests</h2><Badge tone="ok"><Shuffle size={13} />{remixes.length} new tests</Badge></div>
          <p className="mt-1 text-sm text-muted">New full-length SATs made by remixing every official question you have (all the practice tests and your Question Bank questions) the way the College Board builds the digital SAT: official skill mix and order, a harder or easier Module 2 depending on Module 1, real time limits. No question appears in two of these tests, so each one is new to you, even after the official tests.</p>
          <ul className="mt-3 divide-y divide-line">
            {remixes.map((f) => { const id = REMIX + f.n; const b = best(id); return (
              <li key={id} className="flex flex-wrap items-center gap-3 py-3" data-testid={`remix-${f.n}`}>
                <div className="w-full sm:w-auto sm:min-w-0 sm:flex-1"><div className="font-semibold">Original Remix Test {f.n}{taken(id) && <span className="ml-2 text-xs font-normal text-ok">taken</span>}</div><div className="text-xs text-muted">98 questions · 2 h 24 min · {Math.round(f.officialShare * 100)}% official College Board questions{b ? ` · best ${b.scores!.total.mid}` : ''}</div></div>
                <button className="btn-primary" onClick={() => begin(id, 'full')} data-testid={`start-remix-${f.n}`}><Lock size={15} />Take the full test</button>
                <button className="btn-ghost !px-3" onClick={() => begin(id, 'section-rw')}>R&amp;W only</button>
                <button className="btn-ghost !px-3" onClick={() => begin(id, 'section-math')}>Math only</button>
              </li>
            ); })}
          </ul>
        </Card>
      )}
      {OFFICIAL.length > 0 && (
        <Card className="border-brand/50" data-testid="realsat-card">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">Adaptive SAT-style test: new every time</h2><Badge tone="brand"><Sparkles size={13} />Adaptive</Badge></div>
          <p className="mt-1 text-sm text-muted">Shuffled fresh each time you start, preferring official questions you have not seen yet. Built the way the College Board builds the digital SAT: 27 + 27 Reading &amp; Writing and 22 + 22 Math questions in the official skill proportions and order, with Module 2 harder or easier depending on how Module 1 went. Real time limits (32 and 35 minutes per module, 10-minute break).</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(['rw', 'math'] as Section[]).map((sec) => { const c = cover[sec]; const p = pct(c.fromOfficial, c.total); return (
              <div key={sec} className="rounded-xl border border-line p-3" data-testid={`realsat-cover-${sec}`}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{SECTION_NAME[sec]}</span><span className="text-muted">{p}% official</span></div>
                <Progress value={p} tone="gold" className="mt-1.5" label={`${SECTION_NAME[sec]} official share`} />
                <p className="mt-1.5 text-xs text-muted">{c.gaps.length ? `Not enough official questions yet for ${c.gaps.slice(0, 3).map((g) => SKILL[g.skill].short).join(', ')}${c.gaps.length > 3 ? ` and ${c.gaps.length - 3} more` : ''}: those slots use Stellify's hard questions for the same skill.` : 'Every slot can use an official question.'}</p>
              </div>
            ); })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => begin(REAL_SAT, 'full')} data-testid="start-realsat"><Lock size={15} />Full test · 2 h 24 min</button>
            <button className="btn-ghost" onClick={() => begin(REAL_SAT, 'section-rw')}>R&amp;W · 64 min</button>
            <button className="btn-ghost" onClick={() => begin(REAL_SAT, 'section-math')}>Math · 70 min</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-raised/60 p-3">
            <p className="min-w-[14rem] flex-1 text-sm text-muted"><b className="text-ink">Blend:</b> about half official College Board questions and half Stellify original questions written to the same specifications, for even more variety.</p>
            <button className="btn-ghost" onClick={() => begin(REAL_SAT_BLEND, 'full')} data-testid="start-blend"><Shuffle size={15} />Blended full test</button>
          </div>
          <p className="mt-3 text-xs text-faint">Gives an <b>unofficial estimated range</b>, not an SAT score: harder questions count for more, and ability is placed on the College Board scale through the average conversion table of Practice Tests 4–10. It reproduces those official tables closely for the same answers, but it has never been checked against real SAT results.</p>
        </Card>
      )}
    </div>
  );
}

/** Personalized plan from a completed test: points at stake by skill, pacing, and a one-click study plan. */
export function TestPlanPanel({ mock }: { mock: MockAttempt }) {
  const router = useRouter();
  const adopt = useStore((s) => s.adoptTestPlan);
  const plan = useStore((s) => s.plan);
  const report = useMemo(() => analyzeTest(mock, getQuestion, mock.scores ? { rw: mock.scores.rw.mid ? mock.scores.rw : null, math: mock.scores.math.mid ? mock.scores.math : null } : undefined), [mock]);
  const adopted = plan?.basis.includes(report.headline) && plan.createdAt >= (mock.completedAt ?? 0);
  return (
    <Card className="border-brand/40" data-testid="test-plan">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-bold"><Target size={19} className="text-brand" />Your personalized study plan</h2>{report.gain > 0 && <Badge tone="brand">≈ +{report.gain} points available</Badge>}</div>
      <p className="mt-1 text-sm text-muted" data-testid="plan-headline">{report.headline}</p>
      {report.focus.length > 0 && (
        <ol className="mt-4 space-y-3">
          {report.focus.map((f, i) => (
            <li key={f.skill} className="rounded-xl border border-line p-3" data-testid="plan-focus">
              <div className="flex flex-wrap items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span><span className="font-semibold">{SKILL[f.skill].name}</span><Badge tone="bad">{f.missed} of {f.total} missed</Badge><Badge tone="brand">≈ {f.points} points</Badge></div>
              <p className="mt-1.5 text-sm text-muted">{f.trap ? <>Most of your wrong answers fell for <b className="text-ink">{f.trap.label.toLowerCase()}</b>: {f.trap.tip} </> : null}{f.slow ? `${f.slow} of these took much longer than the test's pace. ` : ''}{f.blanks ? `${f.blanks} left blank. ` : ''}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <Link href={`/learn/${f.skill}`} className="btn-ghost !py-1.5">Lesson</Link>
                <Link href={`/practice/session?mode=custom&ids=${f.missedIds.join(',')}&back=/mocks`} className="btn-ghost !py-1.5">Redo my misses</Link>
                <Link href={`/practice/session?mode=skill&skill=${f.skill}&n=8&diff=hard,very-hard`} className="btn-ghost !py-1.5">Hard practice</Link>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {report.timing.map((t) => (
          <div key={t.section} className="rounded-xl bg-raised/60 p-3 text-sm" data-testid="plan-timing">
            <div className="flex items-center gap-1.5 font-semibold"><Clock size={14} />{SECTION_NAME[t.section]}: {fmtDuration(t.msUsed)} of {fmtDuration(t.msAllowed)}</div>
            <p className="mt-1 text-muted">{t.note}</p>
          </div>
        ))}
      </div>
      {report.strengths.length > 0 && <p className="mt-3 flex items-start gap-1.5 text-sm text-muted"><Gauge size={15} className="mt-0.5 shrink-0 text-ok" />Strong: {report.strengths.map((k) => SKILL[k].short).join(', ')}.</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {adopted ? <span className="flex items-center gap-1.5 text-sm font-semibold text-ok" data-testid="plan-adopted"><CheckCircle2 size={16} />This is now your study plan.</span>
          : <button className="btn-primary" onClick={() => adopt(mock.id)} data-testid="adopt-plan"><CalendarCheck size={16} />Make this my study plan</button>}
        <button className="btn-ghost" onClick={() => router.push('/calendar')}>Open the calendar</button>
        <span className="text-xs text-faint">Day by day until your exam date (or four weeks): lessons, official practice, redoing your misses, and a full test each week.</span>
      </div>
    </Card>
  );
}
