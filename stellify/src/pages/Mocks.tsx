import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpenText, Calculator, ChevronUp, Clock, Coffee, Flag, LayoutGrid, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getQuestion, hasOfficial, OFFICIAL } from '@/data/questions';
import { REFERENCE } from '@/data/reference';
import { useStore } from '@/lib/store';
import { useOfficial } from '@/lib/officialStore';
import { formName, isOfficialForm, isOfficialLike, isCalibratedForm, LOWER_ROUTE_CAP, MOCK_FORMS, OFFICIAL_FORMS, officialModules, stageSection, stagesFor, summarizeMock } from '@/lib/engine/mock';
import { fmtRange } from '@/lib/engine/scoring';
import { DOMAIN, DOMAINS, SAT_STRUCTURE, SECTION_NAME, SKILL } from '@/lib/taxonomy';
import { fmtClock, fmtDuration, pct } from '@/lib/util';
import type { MockAttempt, ScoreRange, Section, SkillId } from '@/lib/types';
import { Explanation, QuestionMeta, QuestionView } from '@/components/Question';
import { isCorrect } from '@/lib/answers';
import { AnnotateButton } from '@/components/Highlight';
import { CalcPanel } from '@/components/Calculators';
import { RichText } from '@/components/RichText';
import { TestShell } from '@/components/TestShell';
import { OfficialTestsCard, TestPlanPanel } from '@/components/FullTests';
import { FULL_TESTS, fullTestOfForm } from '@/lib/fullTest/registry';
import { Badge, Card, Empty, Modal, PageHeader, Progress, Stat, cn, toneForPct } from '@/components/ui';
import { FatigueCard } from '@/components/Fatigue';

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
      <OfficialTestsCard begin={begin} />
      {/* the whole-library official tests only make sense before full practice tests are available */}
      {FULL_TESTS.length ? null : hasOfficial() ? <OfficialCard begin={begin} /> : <Card className="border-gold/40"><h2 className="font-bold">Use real College Board questions</h2><p className="mt-1 text-sm text-muted">Add a PDF from the free SAT Question Bank and take timed tests made only of official questions.</p><Link href="/official" className="btn-primary mt-3">Add official questions</Link></Card>}
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
          <li>• <b className="text-ink">Routing:</b> Module 1 mixes medium, hard and very hard questions. Your Module 1 answers are weighed by difficulty (a hard question right counts for more), and if that points to roughly a 570 section level or higher, Module 2 is the harder set; otherwise it is the easier set, which caps the section at {LOWER_ROUTE_CAP}. A simulation of thousands of test-takers checks that strong students are almost never sent to the easier set.</li>
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

/** Official College Board questions (from a private pack or imported in the app): timed tests by section. */
function OfficialCard({ begin }: { begin: (form: string, kind: MockAttempt['kind']) => void }) {
  useOfficial((s) => s.v);
  const rw = officialModules(OFFICIAL, 'rw'), math = officialModules(OFFICIAL, 'math');
  const n = (m: string[][]) => m[0].length + m[1].length;
  return (
    <Card className="border-gold/50" data-testid="official-card">
      <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">Official College Board questions</h2><Badge tone="gold">{OFFICIAL.length} in your library</Badge></div>
      <p className="mt-1 text-sm text-muted">Timed tests built only from real College Board questions, in real test order and at the real pace, with College Board&apos;s own explanations afterwards.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {n(rw) >= 4 && <button className="btn-primary" onClick={() => begin('cb1', 'section-rw')} data-testid="start-official">Reading &amp; Writing · {n(rw)} questions</button>}
        {rw[2].length >= 2 && <button className="btn-ghost" onClick={() => begin('cb2', 'module-rw')} data-testid="start-official-extra">Extra R&amp;W module · {rw[2].length}</button>}
        {n(math) >= 4 && <button className="btn-primary" onClick={() => begin('cb3', 'section-math')} data-testid="start-official-math">Math · {n(math)} questions</button>}
      </div>
      <Link href="/official" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">Add more official questions →</Link>
    </Card>
  );
}

/** Module directions, in Stellify's own words, covering what the test-day directions cover. */
const DIRECTIONS: Record<Section, string[]> = {
  rw: [
    'Each question has a short passage (sometimes two passages, or a table or graph) and four answer choices. Choose the single best answer, based only on what the passage says.',
    'Every question is multiple choice. There is no penalty for guessing, so answer every question.',
    'You can move back and forth within this module, mark questions for review, cross out choices, and highlight words or add notes (select the words, or use Highlights & Notes in the top bar).',
    'When time runs out, the module ends and your answers are saved. Answers from a finished module cannot be changed.',
  ],
  math: [
    'Most questions are multiple choice. Some ask you to type your own answer: enter one correct answer as a number, fraction or decimal (a negative sign is fine). If a decimal does not fit, round or cut it off at the fourth digit; do not enter symbols such as % or $.',
    'A calculator (Desmos graphing and scientific when you are online, Stellify\'s built-in tools offline) and a reference sheet are open to you at any time from the top bar.',
    'Unless a question says otherwise, figures are drawn to scale, all variables are real numbers, and a function is defined for every real number where it makes sense.',
    'You can move back and forth within this module and mark questions for review. When time runs out, the module ends and your answers are saved.',
  ],
};

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
  const [dirs, setDirs] = useState(() => mod.module === 1 && mock.cursor!.index === 0 && mod.qids.every((id) => !mod.answers[id])); // at the start of each section
  const [nav, setNav] = useState(false);
  const [five, setFive] = useState(false);
  const warned = useRef(mock.cursor!.msLeft <= 5 * 60_000);
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
    const id = setInterval(() => {
      setTick((n) => n + 1);
      if (!warned.current && left() <= 5 * 60_000) { warned.current = true; setFive(true); }
      if (left() <= 0) submit(); else if (Date.now() - saved.current > 10_000) { update({ msLeft: left() }); saved.current = Date.now(); }
    }, 500);
    const onHide = () => update({ msLeft: Math.max(0, left()) });
    window.addEventListener('pagehide', onHide);
    return () => { clearInterval(id); window.removeEventListener('pagehide', onHide); };
  });

  const answered = mod.qids.filter((id) => mod.answers[id]).length;
  const ms = Math.max(0, left());
  return (
    <div className="space-y-3">
      <header className="card flex flex-wrap items-center gap-3 !rounded-xl p-3">
        <div className="min-w-[11rem] flex-1"><div className="font-display font-bold">{SECTION_NAME[mod.section]} · Module {mod.module} of {stagesFor(mock.kind).filter((st) => st !== 'break' && stageSection(st) === mod.section).length}</div><div className="text-xs text-muted">Question {idx + 1} of {mod.qids.length} · {answered} answered</div></div>
        <button onClick={() => setSettings({ showTimer: !showTimer })} className={cn('chip !py-1.5 font-mono text-sm', ms < 5 * 60_000 && 'border-bad text-bad')} aria-label="Time remaining (click to hide or show)"><Clock size={14} />{showTimer || ms < 5 * 60_000 ? fmtClock(ms) : 'Hidden'}</button>
        <button className="btn-ghost !px-2.5 !py-1.5" onClick={() => setDirs(true)} data-testid="open-directions"><BookOpenText size={15} />Directions</button>
        {mod.section === 'math' && <><button className="btn-ghost !px-2.5 !py-1.5" aria-pressed={tool === 'calc'} onClick={() => setTool(tool === 'calc' ? null : 'calc')} data-testid="toggle-calc"><Calculator size={15} />Calculator</button><button className="btn-ghost !px-2.5 !py-1.5" onClick={() => setTool('ref')}>Reference</button></>}
        <AnnotateButton />
        <button className="btn-ghost !px-2.5 !py-1.5" onClick={() => { flush(); router.push('/mocks'); }}>Save &amp; exit</button>
      </header>
      {five && <div role="alert" className="flex items-center gap-3 rounded-xl border border-warn/50 bg-warn/10 p-3 text-sm" data-testid="five-minutes"><Clock size={16} className="text-warn" /><span className="flex-1"><b>5 minutes left in this module.</b> The timer stays visible now. Make sure every question has an answer: there is no penalty for guessing.</span><button className="btn-quiet !p-1" aria-label="Dismiss" onClick={() => setFive(false)}><X size={15} /></button></div>}
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
        <div className={cn(tool === 'calc' && 'grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]')}>
        {tool === 'calc' && (
          <Card className="lg:sticky lg:top-3" data-testid="calc-panel">
            <div className="mb-2 flex items-center justify-between"><h2 className="flex items-center gap-1.5 text-sm font-semibold"><Calculator size={15} />Calculator</h2><button className="btn-quiet !p-1" aria-label="Close calculator" onClick={() => setTool(null)}><X size={16} /></button></div>
            {/* the panel stays mounted while open, so Desmos keeps its expressions as the student moves between questions */}
            <CalcPanel height={520} />
          </Card>
        )}
        <Card className="space-y-4" data-testid="mock-question" data-qid={q.id}>
          <div className="flex items-center justify-between gap-2"><span className="text-xs text-faint">{mod.section === 'math' ? 'Math' : DOMAIN[q.domain].name}</span><button className={cn('btn-quiet !py-1', mod.flagged.includes(q.id) && 'text-warn')} aria-pressed={mod.flagged.includes(q.id)} onClick={() => update({ flag: q.id })}><Flag size={15} />Mark for review</button></div>
          <QuestionView q={q} number={idx + 1} hlScope={mock.id} answer={mod.answers[q.id] ?? null} onAnswer={(v) => update({ answer: [q.id, v] })} eliminated={elim[q.id]} onEliminate={(i) => setElim((e) => ({ ...e, [q.id]: (e[q.id] ?? []).includes(i) ? e[q.id].filter((x) => x !== i) : [...(e[q.id] ?? []), i] }))} />
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button className="btn-ghost" disabled={idx === 0} onClick={() => go(idx - 1)}>Back</button>
            {idx < mod.qids.length - 1 ? <button className="btn-primary" onClick={() => go(idx + 1)} data-testid="mock-next">Next</button> : <button className="btn-primary" onClick={() => { flush(); setReview(true); }} data-testid="mock-review">Review &amp; submit</button>}
            <div className="relative ml-auto">
              <button className="btn-ghost" aria-expanded={nav} aria-controls="q-nav" onClick={() => setNav(!nav)} data-testid="q-nav-toggle">Question {idx + 1} of {mod.qids.length}<ChevronUp size={15} className={cn('transition-transform', !nav && 'rotate-180')} /></button>
              {nav && (
                <div id="q-nav" className="absolute bottom-full right-0 z-20 mb-2 w-[min(92vw,360px)] rounded-2xl border border-line bg-surface p-3 shadow-card" data-testid="q-nav">
                  <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted"><span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-brand bg-brand/30" />Answered</span><span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-dashed border-line" />Unanswered</span><span className="flex items-center gap-1"><Flag size={11} className="fill-warn text-warn" />For review</span></div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {mod.qids.map((id, i) => <button key={id} onClick={() => { go(i); setNav(false); }} className={cn('relative grid h-9 place-items-center rounded-lg border text-sm font-bold', mod.answers[id] ? 'border-brand bg-brand/20' : 'border-dashed border-line text-muted', i === idx && 'ring-2 ring-brand2 ring-offset-1 ring-offset-surface')} aria-label={`Question ${i + 1}, ${mod.answers[id] ? 'answered' : 'unanswered'}${mod.flagged.includes(id) ? ', marked for review' : ''}${i === idx ? ', current' : ''}`} aria-current={i === idx ? 'true' : undefined}>{i + 1}{mod.flagged.includes(id) && <Flag size={10} className="absolute -right-1 -top-1 fill-warn text-warn" />}</button>)}
                  </div>
                  <button className="btn-quiet mt-2 w-full justify-center text-sm" onClick={() => { flush(); setNav(false); setReview(true); }}><LayoutGrid size={15} />Go to the review page</button>
                </div>
              )}
            </div>
          </div>
        </Card>
        </div>
      )}
      <Modal open={tool === 'ref'} onClose={() => setTool(null)} title="Reference sheet" wide><ul className="space-y-2 text-sm">{REFERENCE.filter((e) => e.cat === 'Geometry' || e.cat === 'Trigonometry').map((e) => <li key={e.id}><b>{e.title}.</b> <RichText text={e.body} /></li>)}</ul></Modal>
      <Modal open={dirs} onClose={() => setDirs(false)} title={`${SECTION_NAME[mod.section]} · Module ${mod.module}: directions`}>
        <div data-testid="directions">
          <p className="text-sm font-semibold">{mod.qids.length} questions · {Math.round(mod.msAllowed / 60_000)} minutes{mod.module === 2 ? ' · your Module 1 answers are saved and locked' : ''}</p>
          <ul className="mt-2 space-y-2 text-sm text-muted">{DIRECTIONS[mod.section].map((d) => <li key={d}>• {d}</li>)}</ul>
          <p className="mt-3 text-xs text-faint">The clock is already running, just as on test day. Reopen these from Directions in the top bar.</p>
          <button className="btn-primary mt-3" onClick={() => setDirs(false)} data-testid="close-directions">Got it</button>
        </div>
      </Modal>
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
    <TestShell key={mock.id} title={`${formName(mock.formId)} · ${KIND_NAME[mock.kind]}`} official={isOfficialLike(mock.formId)}>
      {stage === 'break' ? <BreakStage key="break" mock={mock} /> : <ModuleStage key={`${mock.id}-${mock.cursor.stage}`} mock={mock} />}
    </TestShell>
  );
}

/** Is the difference between two estimates bigger than their uncertainty? */
function changeNote(now: ScoreRange, before: ScoreRange) {
  const d = now.mid - before.mid;
  const noise = Math.hypot((now.high - now.low) / 2, (before.high - before.low) / 2);
  return `${d >= 0 ? '+' : ''}${d} vs your previous exam${Math.abs(d) < noise ? ' (within the uncertainty, so not a clear change yet)' : ''}`;
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
  const ft = fullTestOfForm(mock.formId);
  const scored = !!ft || isCalibratedForm(mock.formId);
  return (
    <div className="space-y-4" data-testid="mock-results">
      <PageHeader eyebrow="Mock exam report" title={`${formName(mock.formId)} · ${KIND_NAME[mock.kind]}`} subtitle={mock.completedAt ? `Completed ${new Date(mock.completedAt).toLocaleString()}` : undefined} actions={<Link href="/mocks" className="btn-ghost">All mock exams</Link>} />
      {mock.completedAt && <div className="grid gap-4 lg:grid-cols-2">{[...new Set(mock.modules.map((m) => m.section))].map((sec) => <FatigueCard key={sec} section={sec} />)}</div>}
      <div className="grid gap-3 sm:grid-cols-3">
        {mock.kind === 'full' && sc && (scored ? (
          ft?.table ? (
            <div className="card border-gold/50 bg-gold/10 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-faint">Practice-test score · College Board conversion table</div><div className="mt-1 font-display text-4xl font-bold" data-testid="mock-total">{sc.total.mid}</div><div className="text-xs text-muted" data-testid="mock-total-range">Range {sc.total.low}–{sc.total.high} of 400–1600{prev?.scores ? ` · ${sc.total.mid - prev.scores.total.mid >= 0 ? '+' : ''}${sc.total.mid - prev.scores.total.mid} vs your previous exam` : ''}</div><div className="mt-1 text-xs text-faint">A practice-test score, not an official SAT score.</div></div>
          ) : (
            <div className="card border-brand/40 bg-brand/10 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-faint">Estimated total · unofficial 80% range</div><div className="mt-1 font-display text-3xl font-bold" data-testid="mock-total">{fmtRange(sc.total)}</div><div className="text-xs text-muted" data-testid="mock-total-range">Most likely near {sc.total.mid} of 400–1600{prev?.scores ? ` · ${changeNote(sc.total, prev.scores.total)}` : ''}</div><div className="mt-1 text-xs text-faint">A Stellify estimate on the College Board scale, not an SAT score.</div></div>
          )
        ) : <div className="card border-brand/40 bg-brand/10 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-faint">Estimated total range</div><div className="mt-1 font-display text-3xl font-bold" data-testid="mock-total">{fmtRange(sc.total)}</div><div className="text-xs text-muted">Unofficial estimate{prev?.scores ? ` · ${sc.total.mid - prev.scores.total.mid >= 0 ? '+' : ''}${sc.total.mid - prev.scores.total.mid} vs your previous exam` : ''}</div></div>)}
        {sections.map((sec) => { const b = sum.bySection[sec]; const route = mock.modules.find((m) => m.section === sec && m.module === 2)?.route; return (
          <div key={sec} className="card p-4"><div className="text-xs font-semibold uppercase tracking-wide text-faint">{SECTION_NAME[sec]}</div><div className="mt-1 font-display text-2xl font-bold" data-testid={`mock-score-${sec}`}>{sc ? (ft?.table ? (sec === 'rw' ? sc.rw : sc.math)?.mid : fmtRange(sec === 'rw' ? sc.rw : sc.math)) : '—'}</div>{sc && ft?.table && <div className="text-xs text-muted">Range {(sec === 'rw' ? sc.rw : sc.math)?.low}–{(sec === 'rw' ? sc.rw : sc.math)?.high} of 200–800</div>}{sc && !ft?.table && <div className="text-xs text-muted">{scored ? 'Estimated 80% range' : 'Stellify estimate'} of 200–800</div>}<div className="text-xs text-muted">{b.correct}/{b.total} correct · {b.unanswered} unanswered</div><div className="mt-1 text-xs text-muted">Module 2: {route === 'upper' ? 'harder set' : route === 'lower' ? 'easier set' : ft ? 'as printed' : '—'} · {fmtDuration(b.msUsed)} of {Math.round(b.msAllowed / 60_000)} min used</div></div>
        ); })}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accuracy" value={`${pct(sum.correct, sum.total)}%`} sub={`${sum.correct}/${sum.total}`} />
        <Stat label="Unanswered" value={sum.unanswered} sub={sum.unanswered ? 'never leave blanks: there is no penalty for guessing' : 'none left blank'} />
        <Stat label="Time used" value={fmtDuration(sum.msUsed)} sub={`of ${fmtDuration(sum.msAllowed)}`} />
        <Stat label="Flagged" value={sum.rows.filter((r) => r.flagged).length} sub="marked for review" />
      </div>
      <Card data-testid="module-report">
        <h2 className="font-semibold">Module by module</h2>
        <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-faint"><th className="pb-1.5 font-semibold">Module</th><th className="pb-1.5 font-semibold">Set</th><th className="pb-1.5 font-semibold">Right</th><th className="pb-1.5 font-semibold">Blank</th><th className="pb-1.5 font-semibold">Time used</th><th className="pb-1.5 font-semibold">Pace per question</th><th className="pb-1.5 font-semibold">Flagged</th></tr></thead>
          <tbody className="divide-y divide-line">
            {mock.modules.map((m) => {
              const right = m.qids.filter((id) => { const q = getQuestion(id); return q && isCorrect(q, m.answers[id] ?? null); }).length;
              const blank = m.qids.filter((id) => !m.answers[id]).length;
              const per = m.msUsed / Math.max(1, m.qids.length), allowed = m.msAllowed / Math.max(1, m.qids.length);
              return (
                <tr key={`${m.section}-${m.module}`}>
                  <td className="py-1.5 pr-3 font-medium">{SECTION_NAME[m.section]} {m.module}</td>
                  <td className="py-1.5 pr-3 text-muted">{m.module === 1 ? 'Mixed' : m.route === 'upper' ? 'Harder set' : m.route === 'lower' ? `Easier set (caps at ${LOWER_ROUTE_CAP})` : 'As printed'}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{right}/{m.qids.length}</td>
                  <td className={cn('py-1.5 pr-3 tabular-nums', blank ? 'text-bad' : 'text-muted')}>{blank}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{fmtDuration(m.msUsed)} of {Math.round(m.msAllowed / 60_000)} min</td>
                  <td className={cn('py-1.5 pr-3 tabular-nums', per > allowed * 1.05 ? 'text-warn' : 'text-muted')}>{fmtDuration(per)} vs {fmtDuration(allowed)} allowed</td>
                  <td className="py-1.5 tabular-nums text-muted">{m.flagged.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <p className="mt-1.5 text-xs text-faint">Module 2 is chosen from Module 1: the harder set opens the top of the scale; the easier set caps the section at {LOWER_ROUTE_CAP}.</p>
      </Card>
      <p className="text-xs text-faint" data-testid="lock-report">{mock.locked ? 'Taken locked in (full screen)' : 'Taken without full screen'} · {mock.breaks ? `left the test window ${mock.breaks} time${mock.breaks === 1 ? '' : 's'}` : 'never left the test window'}.</p>
      <p className="text-xs text-faint" data-testid="score-note">{ft?.table ? `Scored exactly as the College Board scores ${ft.name}: your number of correct answers in each section, read from that test's official raw-score conversion table. The College Board reports practice-test scores as these ranges; the large number is the middle of the range.` : ft || isCalibratedForm(mock.formId) ? 'An unofficial estimate. Harder questions count for more (item-response scoring), and ability is placed on the College Board scale through the average conversion table of Practice Tests 4–10. On those seven official tests this method reproduces the College Board’s own tables to within about 30 points for the same answers, but it has never been checked against real SAT results, so read the 80% range rather than a single number.' : isOfficialForm(mock.formId) ? 'The questions are official College Board questions from your own file, but the range is Stellify’s own estimate from this set, not a College Board score.' : 'Ranges come from Stellify’s own model and original questions. They are not College Board scores.'}</p>
      <TestPlanPanel mock={mock} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="font-semibold">Domain performance</h2><ul className="mt-3 space-y-2.5">{DOMAINS.filter((d) => sum.byDomain[d.id]).map((d) => { const x = sum.byDomain[d.id]; const p = pct(x.correct, x.total); return <li key={d.id}><div className="mb-1 flex justify-between text-sm"><span>{d.name}</span><span className="text-muted">{x.correct}/{x.total}</span></div><Progress value={p} tone={toneForPct(p)} label={d.name} /></li>; })}</ul></Card>
        <Card><h2 className="font-semibold">Recommended study priorities</h2>{priorities.length ? <ul className="mt-2 divide-y divide-line">{priorities.map((s) => <li key={s.skill} className="flex items-center gap-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate">{SKILL[s.skill].short}</span><Badge tone={toneForPct(s.p)}>{s.correct}/{s.total}</Badge><Link href={`/learn/${s.skill}`} className="text-accent hover:underline">Lesson</Link><Link href={`/practice/session?mode=skill&skill=${s.skill}&n=6`} className="text-accent hover:underline">Practice</Link></li>)}</ul> : <p className="mt-2 text-sm text-muted">A perfect paper. Try Fresh Mix or the Hardest Questions set.</p>}<Link href="/mistakes" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">Every miss is now in your Mistake Bucket →</Link></Card>
      </div>
      <Card><h2 className="font-semibold">Skill performance</h2><div className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">{skills.map((s) => <div key={s.skill} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate">{SKILL[s.skill].short}</span><Progress value={s.p} tone={toneForPct(s.p)} className="!w-24" label={SKILL[s.skill].short} /><span className="w-10 text-right tabular-nums text-muted">{s.correct}/{s.total}</span></div>)}</div></Card>
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Answer key and explanations</h2><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand))]" />Show only missed</label></div>
        <ul className="divide-y divide-line">
          {rows.map((r) => { const q = getQuestion(r.qid)!; const n = sum.rows.indexOf(r) + 1; return (
            <li key={r.qid}>
              <button className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-raised/50" onClick={() => setOpen(open === r.qid ? null : r.qid)} aria-expanded={open === r.qid}>
                <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white', r.correct ? 'bg-ok' : r.answer ? 'bg-bad' : 'bg-faint')}>{n}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{SECTION_NAME[r.section]} M{r.module} · {SKILL[q.skill].short}</span>{isCalibratedForm(mock.formId) && <Badge tone={q.official ? 'gold' : 'default'}>{q.official ? 'Official' : 'Stellify'}</Badge>}
                <span className="text-xs text-faint">{fmtDuration(r.ms)}</span><span className="text-xs font-semibold text-brand2">{open === r.qid ? 'Hide' : 'Explain'}</span>
              </button>
              {open === r.qid && <div className="space-y-4 pb-4"><QuestionMeta q={q} /><QuestionView q={q} answer={r.answer} onAnswer={() => {}} locked reveal hlScope={mock.id} /><Explanation q={q} answer={r.answer} category={mistakes[q.id]?.category} onCategory={(c) => setCat(q.id, c)} /></div>}
            </li>
          ); })}
        </ul>
      </Card>
    </div>
  );
}

export const mockStageSection = stageSection;
