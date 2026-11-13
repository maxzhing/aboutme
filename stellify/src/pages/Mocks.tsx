import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calculator, Clock, Coffee, Flag, LayoutGrid } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getQuestion, hasOfficial, OFFICIAL } from '@/data/questions';
import { REFERENCE } from '@/data/reference';
import { useStore } from '@/lib/store';
import { formName, isOfficialForm, LOWER_ROUTE_CAP, MOCK_FORMS, OFFICIAL_FORMS, officialModules, ROUTE_THRESHOLD, stageSection, stagesFor, summarizeMock } from '@/lib/engine/mock';
import { fmtRange } from '@/lib/engine/scoring';
import { DOMAIN, DOMAINS, SAT_STRUCTURE, SECTION_NAME, SKILL } from '@/lib/taxonomy';
import { fmtClock, fmtDuration, pct } from '@/lib/util';
import type { MockAttempt, Section, SkillId } from '@/lib/types';
import { Explanation, QuestionMeta, QuestionView } from '@/components/Question';
import { Grapher } from '@/components/Grapher';
import { RichText } from '@/components/RichText';
import { TestShell } from '@/components/TestShell';
import { Badge, Card, Empty, Modal, PageHeader, Progress, Stat, cn, toneForPct } from '@/components/ui';

const KIND_NAME: Record<MockAttempt['kind'], string> = { full: 'Full-length', 'section-rw': 'Reading & Writing only', 'section-math': 'Math only', 'module-rw': 'One Reading & Writing module' };

export function MocksPage() {
  const router = useRouter();
  const active = useStore((s) => s.activeMock);
  const mocks = useStore((s) => s.mocks);
  const start = useStore((s) => s.startMock);
  const abandon = useStore((s) => s.abandonMock);
  const begin = (form: string, kind: MockAttempt['kind']) => { if (active && !confirm('You have a mock exam in progress. Starting a new one discards it.')) return; start(form, kind); router.push('/mocks/run'); };
  const done = [...mocks].filter((m) => m.completedAt).sort((a, b) => b.completedAt! - a.completedAt!);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Performance" title="Mock Exams" subtitle="A full Digital SAT simulation: Reading & Writing (2 modules, 27 questions and 32 minutes each), a 10-minute break, then Math (2 modules, 22 questions and 35 minutes each). Your first-module result decides how hard the second module is." />
      {active && (
        <Card className="border-brand/50">
          <h2 className="font-bold">Exam in progress</h2>
          <p className="mt-1 text-sm text-muted">{formName(active.formId)} · {KIND_NAME[active.kind]} · your answers and remaining time are saved.</p>
          <div className="mt-3 flex gap-2"><Link href="/mocks/run" className="btn-primary">Resume</Link><button className="btn-ghost" onClick={() => { if (confirm('Discard this exam? Your answers so far will not be saved.')) abandon(); }}>Discard</button></div>
        </Card>
      )}
      {hasOfficial && <OfficialCard begin={begin} />}
      <div className="grid gap-4 md:grid-cols-3">
        {MOCK_FORMS.map((f) => (
          <Card key={f.id} className="flex flex-col">
            <h2 className="text-lg font-bold">{f.name}</h2>
            <p className="mt-1 flex-1 text-sm text-muted">{f.blurb}</p>
            <div className="mt-4 space-y-2">
              <button className="btn-primary w-full" onClick={() => begin(f.id, 'full')} data-testid={`start-mock-${f.id}`}>Full test · 2 h 14 min</button>
              <div className="flex gap-2"><button className="btn-ghost flex-1 !px-2" onClick={() => begin(f.id, 'section-rw')}>R&amp;W · 64 min</button><button className="btn-ghost flex-1 !px-2" onClick={() => begin(f.id, 'section-math')}>Math · 70 min</button></div>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="font-semibold">How routing and scoring work here</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>• <b className="text-ink">Routing:</b> Module 1 mixes medium, hard and very hard questions. If you answer at least {Math.round(ROUTE_THRESHOLD * 100)}% of it correctly (17 of 27 in Reading &amp; Writing, 14 of 22 in Math), Module 2 is the harder set; otherwise it is the easier set.</li>
          <li>• <b className="text-ink">Scores:</b> each section gets an estimated range from Stellify&apos;s own item-response model. The easier route is capped at {LOWER_ROUTE_CAP} for the section, as an easier second module limits the top of the scale on the real test.</li>
          <li>• <b className="text-ink">Honesty note:</b> this is Stellify&apos;s documented model, not the College Board&apos;s proprietary adaptive algorithm or scoring, and the questions are original rather than official. Forms draw on the same bank as regular practice, so questions you have already seen may appear (Fresh Mix avoids them where it can). For official scores, use <Link href="/resources" className="underline">Bluebook practice tests</Link>.</li>
        </ul>
      </Card>
      <Card>
        <h2 className="font-semibold">Completed exams</h2>
        {done.length ? (
          <ul className="mt-2 divide-y divide-line">
            {done.map((m, i) => { const prev = done.slice(i + 1).find((x) => x.kind === m.kind); const delta = prev?.scores && m.scores ? m.scores.total.mid - prev.scores.total.mid : null; return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{formName(m.formId)} · {KIND_NAME[m.kind]}</div><div className="text-xs text-muted">{new Date(m.completedAt!).toLocaleString()}</div></div>
                {m.scores && <Badge tone="brand">{m.kind === 'full' ? fmtRange(m.scores.total) : fmtRange(m.kind === 'section-rw' ? m.scores.rw : m.scores.math)}</Badge>}
                {delta !== null && <Badge tone={delta >= 0 ? 'ok' : 'warn'}>{delta >= 0 ? '+' : ''}{delta} vs previous</Badge>}
                <Link href={`/mocks/results?id=${m.id}`} className="btn-ghost !py-1.5">Report</Link>
              </li>
            ); })}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">No completed exams yet. Your first one becomes the baseline for measuring improvement.</p>}
      </Card>
    </div>
  );
}

/** Shown only in a personal build that carries the student's own official question pack. */
function OfficialCard({ begin }: { begin: (form: string, kind: MockAttempt['kind']) => void }) {
  const attempts = useStore((s) => s.attempts);
  const mods = useMemo(() => officialModules(OFFICIAL), []);
  const solved = new Set(attempts.filter((a) => a.correct).map((a) => a.qid));
  const mins = (n: number) => Math.round((n * 32) / 27);
  const groups: [string, string[]][] = [['Boundaries', ['bnd']], ['Form, structure & sense', ['fss']], ['Command of evidence', ['coet', 'coeq']], ['Central ideas', ['cid']], ['Inferences', ['inf']], ['Craft & structure', ['wic', 'tsp', 'ctc']]];
  return (
    <Card className="border-gold/50" data-testid="official-card">
      <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">Official College Board questions</h2><Badge tone="gold">from your own file</Badge></div>
      <p className="mt-1 text-sm text-muted">{OFFICIAL.length} real Reading &amp; Writing questions from the practice file you supplied, in real test order with the College Board&apos;s own answer explanations. {OFFICIAL.filter((q) => solved.has(q.id)).length} of {OFFICIAL.length} answered correctly so far.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button className="btn-primary" onClick={() => begin('cb1', 'section-rw')} data-testid="start-official">Practice test · {mods[0].length + mods[1].length} questions · {mins(mods[0].length) + mins(mods[1].length)} min</button>
        <button className="btn-ghost" onClick={() => begin('cb2', 'module-rw')} data-testid="start-official-extra">Extra module · {mods[2].length} questions · {mins(mods[2].length)} min</button>
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-faint">Or practice untimed, with the explanation after each question</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {groups.map(([label, ks]) => { const ids = OFFICIAL.filter((q) => ks.includes(q.skill)).sort((a, b) => Number(solved.has(a.id)) - Number(solved.has(b.id))).map((q) => q.id); return ids.length ? <Link key={label} href={`/practice/session?mode=custom&ids=${ids.slice(0, 12).join(',')}&back=/mocks`} className="chip !py-1 hover:text-ink">{label} ({ids.length})</Link> : null; })}
      </div>
      <p className="mt-3 text-xs text-faint">These questions are the College Board&apos;s copyrighted work. They are in this copy of the app for your own study only; please do not share or publish this file. The score range shown after a test is still Stellify&apos;s unofficial estimate.</p>
    </Card>
  );
}

function ModuleStage({ mock }: { mock: MockAttempt }) {
  const router = useRouter();
  const update = useStore((s) => s.mockUpdate);
  const next = useStore((s) => s.mockNext);
  const showTimer = useStore((s) => s.settings.showTimer);
  const setSettings = useStore((s) => s.setSettings);
  const mod = mock.modules[mock.modules.length - 1];
  const [idx, setIdx] = useState(Math.min(mock.cursor!.index, mod.qids.length - 1));
  const [review, setReview] = useState(false);
  const [tool, setTool] = useState<'ref' | 'calc' | null>(null);
  const [elim, setElim] = useState<Record<string, number[]>>({});
  const [, setTick] = useState(0);
  const base = useRef({ at: Date.now(), left: mock.cursor!.msLeft });
  const qAt = useRef(Date.now());
  const saved = useRef(Date.now());
  const submitted = useRef(false);
  const left = () => base.current.left - (Date.now() - base.current.at);
  const q = getQuestion(mod.qids[idx])!;

  const flush = (to?: number) => { update({ addMs: [q.id, Date.now() - qAt.current], msLeft: Math.max(0, left()), ...(to !== undefined ? { index: to } : {}) }); qAt.current = Date.now(); saved.current = Date.now(); };
  const submit = () => { if (submitted.current) return; submitted.current = true; flush(); const r = next(); if (r.finished) router.replace(`/mocks/results?id=${r.id}`); };
  const go = (n: number) => { const t = Math.max(0, Math.min(mod.qids.length - 1, n)); flush(t); setIdx(t); setReview(false); };

  useEffect(() => {
    const id = setInterval(() => { setTick((n) => n + 1); if (left() <= 0) submit(); else if (Date.now() - saved.current > 10_000) { update({ msLeft: left() }); saved.current = Date.now(); } }, 500);
    const onHide = () => update({ msLeft: Math.max(0, left()) });
    window.addEventListener('pagehide', onHide);
    return () => { clearInterval(id); window.removeEventListener('pagehide', onHide); };
  });

  const answered = mod.qids.filter((id) => mod.answers[id]).length;
  const ms = Math.max(0, left());
  return (
    <div className="space-y-3">
      <header className="card flex flex-wrap items-center gap-3 !rounded-xl p-3">
        <div className="min-w-0 flex-1"><div className="font-display font-bold">{SECTION_NAME[mod.section]} · Module {mod.module} of {stagesFor(mock.kind).filter((st) => st !== 'break' && stageSection(st) === mod.section).length}</div><div className="text-xs text-muted">Question {idx + 1} of {mod.qids.length} · {answered} answered</div></div>
        <button onClick={() => setSettings({ showTimer: !showTimer })} className={cn('chip !py-1.5 font-mono text-sm', ms < 5 * 60_000 && 'border-bad text-bad')} aria-label="Time remaining (click to hide or show)"><Clock size={14} />{showTimer || ms < 5 * 60_000 ? fmtClock(ms) : 'Hidden'}</button>
        {mod.section === 'math' && <><button className="btn-ghost !px-2.5 !py-1.5" onClick={() => setTool('calc')}><Calculator size={15} />Graphing</button><button className="btn-ghost !px-2.5 !py-1.5" onClick={() => setTool('ref')}>Reference</button></>}
        <button className="btn-ghost !px-2.5 !py-1.5" onClick={() => { flush(); router.push('/mocks'); }}>Save &amp; exit</button>
      </header>
      {review ? (
        <Card>
          <h2 className="text-lg font-bold">Check your work</h2>
          <p className="mt-1 text-sm text-muted">{mod.qids.length - answered} unanswered · {mod.flagged.length} marked for review. You can return to any question until time runs out or you submit this module.</p>
          <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-9">
            {mod.qids.map((id, i) => <button key={id} onClick={() => go(i)} className={cn('relative grid h-10 place-items-center rounded-lg border text-sm font-bold', mod.answers[id] ? 'border-brand bg-brand/20' : 'border-dashed border-line text-muted')} aria-label={`Question ${i + 1}, ${mod.answers[id] ? 'answered' : 'unanswered'}${mod.flagged.includes(id) ? ', marked for review' : ''}`}>{i + 1}{mod.flagged.includes(id) && <Flag size={11} className="absolute -right-1 -top-1 fill-warn text-warn" />}</button>)}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4"><button className="btn-ghost" onClick={() => setReview(false)}>Back to questions</button><button className="btn-primary" data-testid="submit-module" onClick={() => { if (answered === mod.qids.length || confirm(`${mod.qids.length - answered} question(s) are unanswered. Submit this module anyway?`)) submit(); }}>Submit module {mod.module}</button></div>
        </Card>
      ) : (
        <Card className="space-y-4" data-testid="mock-question" data-qid={q.id}>
          <div className="flex items-center justify-between gap-2"><span className="text-xs text-faint">{mod.section === 'math' ? 'Math' : DOMAIN[q.domain].name}</span><button className={cn('btn-quiet !py-1', mod.flagged.includes(q.id) && 'text-warn')} aria-pressed={mod.flagged.includes(q.id)} onClick={() => update({ flag: q.id })}><Flag size={15} />Mark for review</button></div>
          <QuestionView q={q} number={idx + 1} answer={mod.answers[q.id] ?? null} onAnswer={(v) => update({ answer: [q.id, v] })} eliminated={elim[q.id]} onEliminate={(i) => setElim((e) => ({ ...e, [q.id]: (e[q.id] ?? []).includes(i) ? e[q.id].filter((x) => x !== i) : [...(e[q.id] ?? []), i] }))} />
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button className="btn-ghost" disabled={idx === 0} onClick={() => go(idx - 1)}>Back</button>
            {idx < mod.qids.length - 1 ? <button className="btn-primary" onClick={() => go(idx + 1)} data-testid="mock-next">Next</button> : <button className="btn-primary" onClick={() => { flush(); setReview(true); }} data-testid="mock-review">Review &amp; submit</button>}
            <button className="btn-quiet ml-auto" onClick={() => { flush(); setReview(true); }}><LayoutGrid size={15} />All questions</button>
          </div>
        </Card>
      )}
      <Modal open={tool === 'ref'} onClose={() => setTool(null)} title="Reference sheet" wide><ul className="space-y-2 text-sm">{REFERENCE.filter((e) => e.cat === 'Geometry' || e.cat === 'Trigonometry').map((e) => <li key={e.id}><b>{e.title}.</b> <RichText text={e.body} /></li>)}</ul></Modal>
      <Modal open={tool === 'calc'} onClose={() => setTool(null)} title="Graphing calculator" wide><Grapher demo={{ exprs: ['y = x'], view: [-10, 10, -10, 10], show: ['intersections', 'roots', 'extrema'] }} /><p className="mt-2 text-xs text-faint">A basic four-function calculator on your device is also fine; the real test provides Desmos.</p></Modal>
    </div>
  );
}

function BreakStage({ mock }: { mock: MockAttempt }) {
  const next = useStore((s) => s.mockNext);
  const update = useStore((s) => s.mockUpdate);
  const base = useRef({ at: Date.now(), left: mock.cursor!.breakMsLeft ?? 0 });
  const [, setTick] = useState(0);
  const left = () => base.current.left - (Date.now() - base.current.at);
  useEffect(() => { const id = setInterval(() => { setTick((n) => n + 1); if (left() <= 0) next(); else if (Math.round(left() / 1000) % 15 === 0) update({ breakMsLeft: left() }); }, 1000); return () => clearInterval(id); });
  return (
    <Card className="mx-auto mt-10 max-w-lg text-center">
      <Coffee className="mx-auto text-brand" size={36} />
      <h1 className="mt-3 text-2xl font-bold">Break</h1>
      <p className="mt-1 text-sm text-muted">Reading &amp; Writing is finished. On test day you get 10 minutes here. Stand up, drink some water, and do not think about the first section.</p>
      <div className="my-5 font-mono text-4xl font-bold">{fmtClock(Math.max(0, left()))}</div>
      <button className="btn-primary" onClick={() => next()} data-testid="end-break">Resume testing: Math</button>
    </Card>
  );
}

export function MockRunPage() {
  const router = useRouter();
  const mock = useStore((s) => s.activeMock);
  useEffect(() => { if (!mock) router.replace('/mocks'); }, [mock, router]);
  if (!mock?.cursor) return null;
  const stage = stagesFor(mock.kind)[mock.cursor.stage];
  return (
    <TestShell key={mock.id} title={`${formName(mock.formId)} · ${KIND_NAME[mock.kind]}`} official={isOfficialForm(mock.formId)}>
      {stage === 'break' ? <BreakStage key="break" mock={mock} /> : <ModuleStage key={`${mock.id}-${mock.cursor.stage}`} mock={mock} />}
    </TestShell>
  );
}

export function MockResultsPage() {
  const id = useSearchParams().get('id');
  const mocks = useStore((s) => s.mocks);
  const mistakes = useStore((s) => s.mistakes);
  const setCat = useStore((s) => s.setMistakeCategory);
  const [open, setOpen] = useState<string | null>(null);
  const [only, setOnly] = useState(false);
  const mock = mocks.find((m) => m.id === id) ?? [...mocks].reverse().find((m) => m.completedAt);
  const sum = useMemo(() => (mock ? summarizeMock(mock, getQuestion) : null), [mock]);
  if (!mock || !sum) return <Empty title="No exam report found" body="Complete a mock exam to see a full performance report." action={{ label: 'Mock exams', href: '/mocks' }} />;
  const prev = [...mocks].filter((m) => m.completedAt && m.kind === mock.kind && m.completedAt < (mock.completedAt ?? 0)).sort((a, b) => b.completedAt! - a.completedAt!)[0];
  const sc = mock.scores;
  const sections = [...new Set(mock.modules.map((m) => m.section))] as Section[];
  const skills = Object.entries(sum.bySkill).map(([k, v]) => ({ skill: k as SkillId, ...v, p: pct(v.correct, v.total) })).sort((a, b) => a.p - b.p);
  const priorities = skills.filter((s) => s.correct < s.total).slice(0, 5);
  const rows = sum.rows.filter((r) => !only || !r.correct);
  return (
    <div className="space-y-4" data-testid="mock-results">
      <PageHeader eyebrow="Mock exam report" title={`${formName(mock.formId)} · ${KIND_NAME[mock.kind]}`} subtitle={mock.completedAt ? `Completed ${new Date(mock.completedAt).toLocaleString()}` : undefined} actions={<Link href="/mocks" className="btn-ghost">All mock exams</Link>} />
      <div className="grid gap-3 sm:grid-cols-3">
        {mock.kind === 'full' && sc && <div className="card border-brand/40 bg-brand/10 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-faint">Estimated total range</div><div className="mt-1 font-display text-3xl font-bold" data-testid="mock-total">{fmtRange(sc.total)}</div><div className="text-xs text-muted">Unofficial estimate{prev?.scores ? ` · ${sc.total.mid - prev.scores.total.mid >= 0 ? '+' : ''}${sc.total.mid - prev.scores.total.mid} vs your previous exam` : ''}</div></div>}
        {sections.map((sec) => { const b = sum.bySection[sec]; const route = mock.modules.find((m) => m.section === sec && m.module === 2)?.route; return (
          <div key={sec} className="card p-4"><div className="text-xs font-semibold uppercase tracking-wide text-faint">{SECTION_NAME[sec]}</div><div className="mt-1 font-display text-2xl font-bold">{sc ? fmtRange(sec === 'rw' ? sc.rw : sc.math) : '—'}</div><div className="text-xs text-muted">{b.correct}/{b.total} correct · {b.unanswered} unanswered</div><div className="mt-1 text-xs text-muted">Module 2: {route === 'upper' ? 'harder set' : route === 'lower' ? 'easier set' : '—'} · {fmtDuration(b.msUsed)} of {SAT_STRUCTURE[sec].minutesPerModule * 2} min used</div></div>
        ); })}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accuracy" value={`${pct(sum.correct, sum.total)}%`} sub={`${sum.correct}/${sum.total}`} />
        <Stat label="Unanswered" value={sum.unanswered} sub={sum.unanswered ? 'never leave blanks: there is no penalty for guessing' : 'none left blank'} />
        <Stat label="Time used" value={fmtDuration(sum.msUsed)} sub={`of ${fmtDuration(sum.msAllowed)}`} />
        <Stat label="Flagged" value={sum.rows.filter((r) => r.flagged).length} sub="marked for review" />
      </div>
      <p className="text-xs text-faint" data-testid="lock-report">{mock.locked ? 'Taken locked in (full screen)' : 'Taken without full screen'} · {mock.breaks ? `left the test window ${mock.breaks} time${mock.breaks === 1 ? '' : 's'}` : 'never left the test window'}.</p>
      <p className="text-xs text-faint">{isOfficialForm(mock.formId) ? 'The questions are official College Board questions from your own file, but the range is Stellify’s own estimate from this set, not a College Board score.' : 'Ranges come from Stellify’s own model and original questions. They are not College Board scores.'}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="font-semibold">Domain performance</h2><ul className="mt-3 space-y-2.5">{DOMAINS.filter((d) => sum.byDomain[d.id]).map((d) => { const x = sum.byDomain[d.id]; const p = pct(x.correct, x.total); return <li key={d.id}><div className="mb-1 flex justify-between text-sm"><span>{d.name}</span><span className="text-muted">{x.correct}/{x.total}</span></div><Progress value={p} tone={toneForPct(p)} label={d.name} /></li>; })}</ul></Card>
        <Card><h2 className="font-semibold">Recommended study priorities</h2>{priorities.length ? <ul className="mt-2 divide-y divide-line">{priorities.map((s) => <li key={s.skill} className="flex items-center gap-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate">{SKILL[s.skill].short}</span><Badge tone={toneForPct(s.p)}>{s.correct}/{s.total}</Badge><Link href={`/learn/${s.skill}`} className="text-brand2 hover:underline">Lesson</Link><Link href={`/practice/session?mode=skill&skill=${s.skill}&n=6`} className="text-brand2 hover:underline">Practice</Link></li>)}</ul> : <p className="mt-2 text-sm text-muted">A perfect paper. Try Fresh Mix or the Hardest Questions set.</p>}<Link href="/mistakes" className="mt-3 inline-block text-sm font-semibold text-brand2 hover:underline">Every miss is now in your Mistake Bucket →</Link></Card>
      </div>
      <Card><h2 className="font-semibold">Skill performance</h2><div className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">{skills.map((s) => <div key={s.skill} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate">{SKILL[s.skill].short}</span><Progress value={s.p} tone={toneForPct(s.p)} className="!w-24" label={SKILL[s.skill].short} /><span className="w-10 text-right tabular-nums text-muted">{s.correct}/{s.total}</span></div>)}</div></Card>
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Answer key and explanations</h2><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand))]" />Show only missed</label></div>
        <ul className="divide-y divide-line">
          {rows.map((r) => { const q = getQuestion(r.qid)!; const n = sum.rows.indexOf(r) + 1; return (
            <li key={r.qid}>
              <button className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-raised/50" onClick={() => setOpen(open === r.qid ? null : r.qid)} aria-expanded={open === r.qid}>
                <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white', r.correct ? 'bg-ok' : r.answer ? 'bg-bad' : 'bg-faint')}>{n}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{SECTION_NAME[r.section]} M{r.module} · {SKILL[q.skill].short}</span>
                <span className="text-xs text-faint">{fmtDuration(r.ms)}</span><span className="text-xs font-semibold text-brand2">{open === r.qid ? 'Hide' : 'Explain'}</span>
              </button>
              {open === r.qid && <div className="space-y-4 pb-4"><QuestionMeta q={q} /><QuestionView q={q} answer={r.answer} onAnswer={() => {}} locked reveal /><Explanation q={q} answer={r.answer} category={mistakes[q.id]?.category} onCategory={(c) => setCat(q.id, c)} /></div>}
            </li>
          ); })}
        </ul>
      </Card>
    </div>
  );
}

export const mockStageSection = stageSection;
