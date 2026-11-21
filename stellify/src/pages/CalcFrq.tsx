'use client';
import Link from 'next/link';
import { ArrowLeft, Calculator, Check, Eye, Lightbulb, NotebookPen, PenLine, TriangleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { calcCorrect } from '@/data/calc';
import { CALC_FRQ, CALC_FRQS, type Frq, type FrqPart, type FrqStep } from '@/data/calc/frq';
import { useStore } from '@/lib/store';
import { pct } from '@/lib/util';
import { RichText } from '@/components/RichText';
import { Badge, Card, Empty, cn } from '@/components/ui';

/** The list of guided free-response workouts on the course home. */
export function CalcFrqCard() {
  const done = useStore((s) => s.calc?.frq) ?? {};
  return (
    <Card id="frq" className="scroll-mt-24 space-y-4" data-testid="calc-frq-list">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><NotebookPen size={20} className="text-brand" />Work it out: guided free response</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">Full multi-part free-response problems, the kind that decide whether you pass. You work every detail yourself, one step at a time, and each step is checked before you go on. After each part you see exactly what to write to earn full credit, and the mistake that usually costs points.</p>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {CALC_FRQS.map((f) => { const r = done[f.id]; const steps = f.parts.reduce((s, p) => s + p.steps.length, 0); return (
          <li key={f.id}><Link href={`/calc/frq/${f.id}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:border-brand/50" data-testid={`calc-frq-${f.id}`}>
            <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', r ? 'bg-[#047857] text-white' : 'bg-raised text-muted')}>{r ? <Check size={18} /> : <PenLine size={18} />}</span>
            <span className="min-w-0 flex-1"><span className="block font-semibold">{f.title}</span><span className="block text-xs text-muted">Units {f.units.join(', ')} · {f.parts.length} parts · {steps} steps · {f.calculator ? 'calculator' : 'no calculator'}</span></span>
            <span className="text-xs text-muted">{r ? `${pct(r.firstTry, r.total)}% first try` : ''}</span>
          </Link></li>
        ); })}
      </ol>
    </Card>
  );
}

export function CalcFrqPage({ frq }: { frq: string }) {
  const f = CALC_FRQ[frq];
  if (!f) return <Empty title="Workout not found" body="That free-response workout does not exist." action={{ label: 'AP Calculus BC', href: '/calc' }} />;
  return <Workout key={f.id} f={f} />;
}

function Workout({ f }: { f: Frq }) {
  const record = useStore((s) => s.calcFrq);
  const [part, setPart] = useState(0);
  const [firsts, setFirsts] = useState<boolean[]>([]);
  const total = f.parts.reduce((s, p) => s + p.steps.length, 0);
  const finished = part >= f.parts.length;
  const next = (fr: boolean[]) => {
    const all = [...firsts, ...fr]; setFirsts(all);
    if (part + 1 >= f.parts.length) record(f.id, all.filter(Boolean).length, total);
    setPart(part + 1);
  };
  const idx = CALC_FRQS.findIndex((x) => x.id === f.id), after = CALC_FRQS[idx + 1];
  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="calc-frq">
      <Link href="/calc#frq" className="btn-quiet !px-2 text-sm"><ArrowLeft size={16} />AP Calculus BC</Link>
      <header>
        <p className="eyebrow">Guided free response · Units {f.units.join(', ')}</p>
        <h1 className="mt-2 text-3xl font-bold">{f.title}</h1>
        <div className="mt-2 flex gap-2">{f.calculator ? <Badge><Calculator size={12} className="mr-1 inline" />Calculator allowed</Badge> : <Badge>No calculator</Badge>}<Badge>{f.parts.length} parts · {total} steps</Badge></div>
      </header>
      <div className="rounded-2xl border border-line bg-raised/40 p-4 text-[16px] leading-relaxed"><RichText text={f.setup} /></div>
      {f.parts.slice(0, part + 1).map((p, k) => <Part key={p.label} p={p} active={k === part} onDone={next} />)}
      {finished && (
        <div className="rounded-3xl border-2 border-ok/50 bg-ok/10 p-5 text-center" data-testid="calc-frq-done">
          <h2 className="font-display text-2xl font-bold">Workout complete: {firsts.filter(Boolean).length}/{total} steps right on the first try</h2>
          <p className="mt-1 text-sm">{firsts.filter(Boolean).length / total >= 0.8 ? 'Strong. Try it again in a few days without looking at the hints.' : 'Go back over the parts you missed and read the full-credit notes again; then redo this workout tomorrow.'}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-ghost" onClick={() => { setPart(0); setFirsts([]); }}>Start over</button>
            {after && <Link href={`/calc/frq/${after.id}`} className="btn-primary">Next: {after.title}</Link>}
          </div>
        </div>
      )}
    </div>
  );
}

function Part({ p, active, onDone }: { p: FrqPart; active: boolean; onDone: (firsts: boolean[]) => void }) {
  const [step, setStep] = useState(0);
  const [firsts, setFirsts] = useState<boolean[]>([]);
  const complete = step >= p.steps.length;
  return (
    <section className={cn('rounded-2xl border bg-surface p-4 sm:p-5', active ? 'border-brand/50' : 'border-line')} data-testid={`calc-frq-part-${p.label}`}>
      <h2 className="flex gap-2 text-lg font-bold"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink text-sm text-bg">{p.label}</span><span><RichText text={p.q} /></span></h2>
      <ol className="mt-3 space-y-3">
        {p.steps.slice(0, step + 1).map((s, k) => <Step key={k} s={s} n={k + 1} onDone={(first) => { setFirsts((f) => [...f, first]); setStep(k + 1); }} done={k < step} />)}
      </ol>
      {complete && (
        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-ok/40 bg-ok/10 p-3 text-[15px]"><b className="flex items-center gap-1.5 text-ok"><PenLine size={15} />What to write for full credit</b><div className="mt-1"><RichText text={p.write} /></div></div>
          <div className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-[15px]"><b className="flex items-center gap-1.5 text-warn"><TriangleAlert size={15} />Where students lose points</b><div className="mt-1"><RichText text={p.trap} /></div></div>
          {active && <button type="button" className="btn-primary" onClick={() => onDone(firsts)} data-testid="calc-frq-next-part">Next part</button>}
        </div>
      )}
    </section>
  );
}

function Step({ s, n, onDone, done }: { s: FrqStep; n: number; onDone: (firstTry: boolean) => void; done: boolean }) {
  const [val, setVal] = useState('');
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'open' | 'wrong' | 'right' | 'shown'>(done ? 'right' : 'open');
  const [hint, setHint] = useState(false);
  const fake = { id: 'step', q: '', answer: s.answer, hint: s.hint, solution: [], level: 3 as const };
  const check = () => {
    if (!val.trim()) return;
    if (calcCorrect(fake, val)) { setState('right'); onDone(tries === 0); }
    else { setTries((t) => t + 1); setState('wrong'); }
  };
  const settled = state === 'right' || state === 'shown';
  return (
    <li className="rounded-xl border border-line p-3" data-testid="calc-frq-step">
      <p className="text-[15px]"><b className="mr-1 text-faint">Step {n}.</b><RichText text={s.prompt} /></p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input className={cn('input !w-44 font-semibold', state === 'right' && 'border-ok bg-ok/10', state === 'wrong' && 'border-bad bg-bad/10')} value={val} disabled={settled} onChange={(e) => { setVal(e.target.value); if (state === 'wrong') setState('open'); }} onKeyDown={(e) => e.key === 'Enter' && check()} placeholder="your result" aria-label={`Step ${n} answer`} />
        {!settled && <button type="button" className="btn-primary" disabled={!val.trim()} onClick={check} data-testid="calc-frq-check">Check</button>}
        {!settled && !hint && <button type="button" className="btn-ghost" onClick={() => setHint(true)}><Lightbulb size={15} />Hint</button>}
        {!settled && tries >= 2 && <button type="button" className="btn-ghost" onClick={() => { setState('shown'); setVal(s.answer[0]); onDone(false); }}><Eye size={15} />Show me</button>}
      </div>
      {state === 'wrong' && <p className="mt-2 flex items-center gap-1.5 text-sm text-bad"><X size={14} />Not yet. Recheck your work{tries >= 2 ? ', or use “Show me” and study the step.' : ' and try again.'}</p>}
      {hint && !settled && <p className="mt-2 rounded-lg border border-gold/40 bg-gold/5 p-2 text-sm"><b className="text-gold">Hint: </b><RichText text={s.hint} /></p>}
      {settled && <p className={cn('mt-2 rounded-lg p-2 text-sm', state === 'right' ? 'bg-ok/10' : 'bg-raised')}><b>{state === 'right' ? 'Correct. ' : `The result is ${s.answer[0]}. `}</b><RichText text={s.explain} /></p>}
    </li>
  );
}
