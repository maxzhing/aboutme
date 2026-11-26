'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, Play, Square, WifiOff, X } from 'lucide-react';
import { useOnline, DESMOS } from '@/components/Calculators';
import { Grapher } from '@/components/Grapher';
import { RichText } from '@/components/RichText';
import { Card, PageHeader, cn } from '@/components/ui';
import { DECIDE, DRILL, LAB, type LabTechnique } from '@/data/desmosLab';
import { FLAGS } from '@/lib/flags';
import { parseRelation } from '@/lib/mathexpr';
import { matches } from '@/lib/worked';

/** Two relations are the same graph if they have the same kind, sign and values at sample points. */
export function sameRelation(a: string, b: string, params: Record<string, number> = {}): boolean {
  try {
    const A = parseRelation(a), B = parseRelation(b);
    if (A.kind !== 'explicit' || B.kind !== 'explicit') return a.replace(/\s/g, '') === b.replace(/\s/g, '');
    if (A.op !== B.op) return false;
    const p = { k: 1.3, ...params };
    return [-3.7, -1.2, 0.4, 1.9, 4.6].every((x) => { const u = A.f(x, p), v = B.f(x, p); return Math.abs(u - v) <= 1e-6 * Math.max(1, Math.abs(v)); });
  } catch { return false; }
}

function Stopwatch({ label }: { label: string }) {
  const [start, setStart] = useState<number | null>(null);
  const [secs, setSecs] = useState<number | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { if (start === null) return; const t = setInterval(() => tick((x) => x + 1), 250); return () => clearInterval(t); }, [start]);
  const shown = start !== null ? (Date.now() - start) / 1000 : secs;
  return (
    <span className="inline-flex items-center gap-2 text-[13px]">
      {start === null ? <button type="button" className="btn-quiet !min-h-[32px] !px-2" onClick={() => { setStart(Date.now()); setSecs(null); }} aria-label={`Start timing: ${label}`}><Play size={14} aria-hidden />Time it</button>
        : <button type="button" className="btn-quiet !min-h-[32px] !px-2" onClick={() => { setSecs((Date.now() - start) / 1000); setStart(null); }} aria-label={`Stop timing: ${label}`}><Square size={13} aria-hidden />Stop</button>}
      {shown !== null && <span data-num>{shown.toFixed(1)} s</span>}
    </span>
  );
}

function Technique({ t }: { t: LabTechnique }) {
  const e = t.exercise;
  const [typed, setTyped] = useState<string[]>(() => (e.targets ?? []).map(() => ''));
  const [graphed, setGraphed] = useState(!e.targets);
  const [bad, setBad] = useState(false);
  const [ans, setAns] = useState('');
  const [pick, setPick] = useState<number | null>(null);
  const [result, setResult] = useState<'right' | 'wrong' | null>(null);
  const tryGraph = () => {
    const t0 = e.targets ?? [];
    const ok = t0.every((target) => typed.some((x) => sameRelation(x, target)));
    setBad(!ok); setGraphed(ok);
  };
  const check = () => setResult(e.choices ? (pick === e.correct ? 'right' : 'wrong') : matches(ans, e.answer ?? []) ? 'right' : 'wrong');
  return (
    <section className="card p-0" aria-labelledby={`lab-${t.id}`} data-testid={`lab-${t.id}`}>
      <h2 id={`lab-${t.id}`} className="border-b border-line px-5 py-3 text-[21px]">{t.title}</h2>
      <div className="grid gap-px bg-line sm:grid-cols-2">
        <div className="bg-surface p-4"><div className="flex items-center justify-between"><h3 className="font-sans text-[14px] font-semibold uppercase tracking-wide text-muted">The algebra way</h3><Stopwatch label={`${t.title}, algebra`} /></div><ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px]">{t.algebra.map((s) => <li key={s}><RichText text={s} /></li>)}</ol></div>
        <div className="bg-surface p-4"><div className="flex items-center justify-between"><h3 className="font-sans text-[14px] font-semibold uppercase tracking-wide text-muted">The Desmos way</h3><Stopwatch label={`${t.title}, Desmos`} /></div><ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px]">{t.desmos.map((s) => <li key={s}><RichText text={s} /></li>)}</ol></div>
      </div>
      <p className="border-y border-line bg-raised/40 px-5 py-2.5 text-[14px]"><b className="font-medium">When not to use Desmos:</b> {t.notWhen}</p>
      <div className="p-5">
        <p className="text-[15px] font-medium"><RichText text={e.prompt} /></p>
        {e.targets && (
          <div className="mt-3 space-y-2">
            <p className="text-[14px] text-muted">Type what you would enter in Desmos, one line each:</p>
            {typed.map((v, k) => <input key={k} className="input max-w-md" aria-label={`Expression ${k + 1}`} value={v} placeholder={k ? 'second expression' : 'e.g. y = …'} onChange={(ev) => { const n = [...typed]; n[k] = ev.target.value; setTyped(n); setBad(false); }} data-testid="lab-expr" />)}
            <button type="button" className="btn-ghost" onClick={tryGraph} data-testid="lab-graph">Graph it</button>
            {bad && <p className="text-[14px] text-bad" role="status">Those do not match the problem yet. Check each side and the inequality signs.</p>}
          </div>
        )}
        {graphed && (
          <div className="mt-3" data-testid="lab-graphed">
            {e.targets && <p className="flex items-center gap-1.5 text-[14px] text-ok"><Check size={15} aria-hidden />That is the right graph. Now read the answer from it.</p>}
            <div className="mt-2"><Grapher demo={{ exprs: e.targets ? typed : [], ...e.demo }} /></div>
          </div>
        )}
        {graphed && (
          <div className="mt-3">
            {e.choices ? (
              <div role="radiogroup" aria-label={e.ask} className="flex flex-wrap gap-2">{e.choices.map((c, k) => <button key={c} type="button" role="radio" aria-checked={pick === k} className={cn('chip !py-1.5 !text-[15px]', pick === k && '!border-ink !text-ink')} onClick={() => setPick(k)}>{c}</button>)}</div>
            ) : <label className="block text-[14px]">Your answer ({e.ask}): <input className="input mt-1 max-w-[160px]" value={ans} onChange={(ev) => setAns(ev.target.value)} data-testid="lab-answer" /></label>}
            <button type="button" className="btn-primary mt-2" onClick={check} data-testid="lab-check">Check</button>
            {result && <p className={cn('mt-2 flex items-center gap-1.5 text-[15px] font-medium', result === 'right' ? 'text-ok' : 'text-bad')} role="status" data-testid="lab-result">{result === 'right' ? <><Check size={16} aria-hidden />Correct.</> : <><X size={16} aria-hidden />Not yet. Look at the graph again{t.id === 'window' ? ' and zoom out' : ''}.</>}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

export function DesmosLabPage({ embedded = false }: { embedded?: boolean }) {
  const online = useOnline();
  const [choice, setChoice] = useState<Record<number, string>>({});
  const [drill, setDrill] = useState<{ start: number | null; end: number | null; method: Record<number, string>; ans: Record<number, string> }>({ start: null, end: null, method: {}, ans: {} });
  const started = useRef<number | null>(null);
  const score = DRILL.filter((d, i) => matches(drill.ans[i] ?? '', d.answer)).length;
  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="desmos-lab">
      {!embedded && <PageHeader eyebrow="Learn" title="Desmos Lab" subtitle="Seven techniques that save time on SAT Math, each beside the algebra way, with a timer for both. You practise on Stellify’s built-in grapher, which works offline and can check what you type." actions={<Link href="/desmos" className="btn-ghost">Desmos Masterclass</Link>} />}
      <Card>
        {online ? <p className="text-[15px]">Try the same steps in the real calculator: <a className="inline-flex items-center gap-1 text-accent underline" href={DESMOS.graphing} target="_blank" rel="noreferrer">Desmos (College Board version)<ExternalLink size={13} aria-hidden /></a>. It needs an internet connection.</p>
          : <p className="flex items-center gap-2 text-[15px]" data-testid="lab-offline"><WifiOff size={16} aria-hidden />You are offline, so the real Desmos cannot load. Everything on this page still works on the built-in grapher.</p>}
        <p className="mt-2 text-[13px] text-faint">Bluebook’s Desmos is a College Board version of the public calculator; menus can differ slightly. {FLAGS.desmosApi ? '' : 'Checking your graph inside Desmos itself would need a Desmos API key, so this Lab checks your work on the built-in grapher instead.'}</p>
      </Card>
      {LAB.map((t) => <Technique key={t.id} t={t} />)}
      <section className="card p-5" aria-labelledby="decide-h" data-testid="lab-decide">
        <h2 id="decide-h" className="text-[21px]">Algebra, Desmos, or backsolve?</h2>
        <ul className="mt-3 space-y-3">{DECIDE.map((d, i) => (
          <li key={i} className="border-b border-line pb-3 last:border-0">
            <p className="text-[15px]"><RichText text={d.q} /></p>
            <div className="mt-1.5 flex flex-wrap gap-2">{(['algebra', 'desmos', 'backsolve'] as const).map((m) => <button key={m} type="button" className={cn('chip !py-1', choice[i] === m && '!border-ink !text-ink')} aria-pressed={choice[i] === m} onClick={() => setChoice({ ...choice, [i]: m })}>{{ algebra: 'Algebra', desmos: 'Desmos', backsolve: 'Backsolve' }[m]}</button>)}</div>
            {choice[i] && <p className={cn('mt-1 text-[14px]', choice[i] === d.best ? 'text-ok' : 'text-muted')}>{choice[i] === d.best ? 'Good call. ' : `Usually best: ${d.best}. `}<RichText text={d.why} /></p>}
          </li>
        ))}</ul>
      </section>
      <section className="card p-5" aria-labelledby="drill-h" data-testid="lab-drill">
        <h2 id="drill-h" className="text-[21px]">Timed drill: choose your method</h2>
        <p className="mt-1 text-[14px] text-muted">Five questions. Pick a method, solve, and type the answer. The clock runs from your first answer.</p>
        <ol className="mt-3 space-y-3">{DRILL.map((d, i) => (
          <li key={i}>
            <p className="text-[15px]">{i + 1}. <RichText text={d.q} /></p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {(['algebra', 'desmos', 'backsolve'] as const).map((m) => <button key={m} type="button" className={cn('chip !py-1', drill.method[i] === m && '!border-ink !text-ink')} aria-pressed={drill.method[i] === m} onClick={() => setDrill({ ...drill, method: { ...drill.method, [i]: m } })}>{m}</button>)}
              <input className="input max-w-[120px]" aria-label={`Answer ${i + 1}`} value={drill.ans[i] ?? ''} onChange={(e) => { if (started.current === null) started.current = Date.now(); setDrill({ ...drill, start: started.current, ans: { ...drill.ans, [i]: e.target.value } }); }} data-testid={`drill-${i}`} />
            </div>
          </li>
        ))}</ol>
        <button type="button" className="btn-primary mt-3" onClick={() => setDrill({ ...drill, end: Date.now() })} data-testid="drill-done">I’m done</button>
        {drill.end && <p className="mt-2 text-[15px]" role="status" data-testid="drill-result" data-num>{score} of {DRILL.length} right{drill.start ? ` in ${Math.round((drill.end - drill.start) / 1000)} seconds` : ''}. Methods most students find fastest: {DRILL.map((d) => d.best).join(', ')}.</p>}
      </section>
    </div>
  );
}
