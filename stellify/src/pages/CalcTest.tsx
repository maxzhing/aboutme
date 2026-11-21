'use client';
import Link from 'next/link';
import { ArrowLeft, Calculator, Check, ClipboardCheck, Clock, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { calcCorrect, answerLabel, CALC_UNITS } from '@/data/calc';
import { CALC_EXAM, CALC_EXAMS, EXAM_PASS, type CalcExam, type ExamProblem } from '@/data/calc/exams';
import { useStore } from '@/lib/store';
import { pct } from '@/lib/util';
import { RichText } from '@/components/RichText';
import { Badge, Card, Empty, cn } from '@/components/ui';

const best = (a?: { score: number; total: number }[]) => (a?.length ? Math.max(...a.map((x) => x.score / x.total)) : null);

/** The fast track and every test, grouped the way the year-long course runs: Semester A, Semester B, finals. */
export function CalcTestsCard() {
  const tests = useStore((s) => s.calc?.tests) ?? {};
  const group = (k: string, list: CalcExam[]) => (
    <div key={k}>
      <h3 className="text-xs font-bold uppercase tracking-wide text-faint">{k}</h3>
      <ol className="mt-2 grid gap-2 sm:grid-cols-2">
        {list.map((e) => { const b = best(tests[e.id]); return (
          <li key={e.id}><Link href={`/calc/test/${e.id}`} className={cn('flex items-center gap-3 rounded-2xl border p-3 hover:border-brand/50', e.kind !== 'unit' ? 'border-gold/50 bg-gold/5' : 'border-line')} data-testid={`calc-test-${e.id}`}>
            <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', b !== null && b >= EXAM_PASS ? 'bg-[#047857] text-white' : 'bg-raised text-muted')}>{b !== null && b >= EXAM_PASS ? <Check size={18} /> : <ClipboardCheck size={18} />}</span>
            <span className="min-w-0 flex-1"><span className="block font-semibold">{e.title}</span><span className="block text-xs text-muted">{e.problems.length} hard problems · {e.minutes} min · {e.covers}</span></span>
            <span className="text-xs text-muted">{b !== null ? `best ${Math.round(b * 100)}%` : ''}</span>
          </Link></li>
        ); })}
      </ol>
    </div>
  );
  return (
    <Card id="tests" className="scroll-mt-24 space-y-5" data-testid="calc-tests">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><ClipboardCheck size={20} className="text-brand" />Fast track and tests</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">Built like a two-semester high-school Calculus BC course (MCPS runs it as AP BC Calculus A and B). <b>Fast track:</b> one unit a week. Do the unit’s lessons, then take its unit test; score 80% before the next unit. After Unit 5, take the Semester A exam; after Unit 10, the Semester B exam; then the cumulative finals. That is about 10 weeks of units plus 2 weeks of exams. Every test is hard, timed, has no hints, and has a no-calculator part and a calculator part, like the AP exam.</p>
      </div>
      {group('Semester A · Units 1–5', CALC_EXAMS.filter((e) => e.semester === 'A'))}
      {group('Semester B · Units 6–10', CALC_EXAMS.filter((e) => e.semester === 'B'))}
      {group('Cumulative finals', CALC_EXAMS.filter((e) => e.kind === 'final'))}
    </Card>
  );
}

/** One test: no-calculator part first, then calculator part; answers are graded only when you hand it in. */
export function CalcTestPage({ test }: { test: string }) {
  const exam = CALC_EXAM[test];
  if (!exam) return <Empty title="Test not found" body="That test does not exist." action={{ label: 'AP Calculus BC', href: '/calc' }} />;
  return <Test key={exam.id} exam={exam} />;
}

function Test({ exam }: { exam: CalcExam }) {
  const record = useStore((s) => s.calcTest);
  const history = useStore((s) => s.calc?.tests?.[exam.id]) ?? [];
  const parts = useMemo(() => [exam.problems.filter((p) => !p.calculator), exam.problems.filter((p) => p.calculator)], [exam]);
  const [ans, setAns] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (done) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [done]);
  const left = Math.max(0, exam.minutes * 60 - Math.floor((now - start) / 1000));
  const correct = exam.problems.filter((p) => calcCorrect(p, ans[p.id] ?? null));
  const submit = () => { if (done) return; setDone(true); record(exam.id, correct.length, exam.problems.length); window.scrollTo({ top: 0 }); };
  const unit = exam.unit !== undefined ? CALC_UNITS.find((u) => u.n === exam.unit) : undefined;
  let n = 0;
  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="calc-test">
      <Link href="/calc#tests" className="btn-quiet !px-2 text-sm"><ArrowLeft size={16} />AP Calculus BC</Link>
      <header>
        <p className="eyebrow">{exam.kind === 'unit' ? 'Unit test' : exam.kind === 'semester' ? 'Semester exam' : 'Cumulative final'}</p>
        <h1 className="mt-2 text-3xl font-bold">{exam.title}</h1>
        <p className="mt-1 text-sm text-muted">{exam.problems.length} problems · {exam.minutes} minutes · {exam.covers}{unit ? ` (${unit.title})` : ''}. No hints. Nothing is graded until you hand it in. Pass mark: {Math.round(EXAM_PASS * 100)}%.</p>
      </header>
      {done ? (
        <div className={cn('rounded-3xl border-2 p-5 text-center', correct.length / exam.problems.length >= EXAM_PASS ? 'border-ok/50 bg-ok/10' : 'border-warn/50 bg-warn/10')} data-testid="calc-test-result">
          <h2 className="font-display text-3xl font-bold">{correct.length}/{exam.problems.length} ({pct(correct.length, exam.problems.length)}%)</h2>
          <p className="mt-1 text-sm">{correct.length / exam.problems.length >= EXAM_PASS ? 'Passed. Move on to the next unit or exam.' : 'Not yet. Read every solution below, redo the lessons behind your misses, and take the test again in a day or two.'}</p>
          {history.length > 1 && <p className="mt-1 text-xs text-muted">Attempts: {history.map((h) => `${pct(h.score, h.total)}%`).join(' → ')}</p>}
          <button type="button" className="btn-ghost mt-3" onClick={() => { setAns({}); setDone(false); }}><RotateCcw size={15} />Take it again</button>
        </div>
      ) : (
        <div className="sticky top-16 z-10 flex items-center justify-between rounded-2xl border border-line bg-surface/95 px-4 py-2 text-sm backdrop-blur">
          <span className={cn('flex items-center gap-1.5 font-semibold', left < 300 && 'text-bad')}><Clock size={15} />{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} left</span>
          <span className="text-muted">{Object.keys(ans).filter((k) => ans[k]).length}/{exam.problems.length} answered</span>
        </div>
      )}
      {parts.map((list, k) => list.length > 0 && (
        <section key={k} className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">{k ? <><Calculator size={18} />Part 2: calculator allowed</> : <>Part 1: no calculator</>}</h2>
          {list.map((p) => <TestProblem key={p.id} p={p} i={++n} value={ans[p.id] ?? ''} onChange={(v) => setAns((a) => ({ ...a, [p.id]: v }))} done={done} />)}
        </section>
      ))}
      {!done && <button type="button" className="btn-primary w-full !py-3" onClick={submit} data-testid="calc-test-submit">Hand in the test</button>}
    </div>
  );
}

function TestProblem({ p, i, value, onChange, done }: { p: ExamProblem; i: number; value: string; onChange: (v: string) => void; done: boolean }) {
  const ok = calcCorrect(p, value || null);
  return (
    <div className={cn('rounded-2xl border bg-surface p-4 sm:p-5', done ? (ok ? 'border-ok/50' : 'border-bad/50') : 'border-line')} data-testid={`calc-test-problem-${p.id}`}>
      <div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-xs font-bold text-bg">{i}</span>{p.calculator && <Badge>Calculator</Badge>}</div>
      <div className="text-[16px] leading-relaxed"><RichText text={p.q} /></div>
      {typeof p.answer === 'number' ? (
        <div className="mt-3 grid gap-2">{p.choices!.map((c, k) => { const sel = value === String(k); const right = done && k === p.answer; return (
          <button key={k} type="button" disabled={done} onClick={() => onChange(String(k))} className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left', right ? 'border-ok bg-ok/10' : done && sel ? 'border-bad bg-bad/10' : sel ? 'border-brand bg-brand/10 ring-1 ring-brand' : 'border-line hover:border-brand/50')}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-sm font-bold">{'ABCD'[k]}</span><span><RichText text={c} /></span>
          </button>
        ); })}</div>
      ) : (
        <input className="input mt-3 !w-48 text-lg font-semibold" value={value} disabled={done} onChange={(e) => onChange(e.target.value)} placeholder="e.g. -1/4 or 2.828" aria-label="Your answer" />
      )}
      {done && (
        <div className={cn('mt-3 rounded-xl border p-3.5 text-[15px]', ok ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10')}>
          <b className={ok ? 'text-ok' : 'text-bad'}>{ok ? <><Check size={14} className="inline" /> Correct.</> : <><X size={14} className="inline" /> The answer is {answerLabel(p)}.</>}</b>
          <div className="mt-3 rounded-lg bg-surface/70 p-3"><div className="text-xs font-bold uppercase tracking-wide text-muted">What the question is really asking</div><div className="mt-1"><RichText text={p.ask} /></div></div>
          <div className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Step by step</div>
          <ol className="mt-1 list-decimal space-y-2 pl-5">{p.solution.map((s, k) => <li key={k}><RichText text={s} /></li>)}</ol>
          <div className="mt-3 rounded-lg border border-warn/40 bg-warn/10 p-3"><div className="text-xs font-bold uppercase tracking-wide text-warn">The trap</div><div className="mt-1"><RichText text={p.trap} /></div></div>
        </div>
      )}
    </div>
  );
}
