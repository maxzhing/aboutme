import Link from 'next/link';
import { ArrowLeft, Calculator, Check, X } from 'lucide-react';
import { useState } from 'react';
import { PACK_CALC_SAMPLE, type CalcSampleMc } from '@/data/pack';
import { Empty, PageHeader, cn } from '@/components/ui';

/**
 * The College Board's AP Calculus sample questions from the student's private pack, exactly as printed, with the
 * College Board's own key and free-response rubrics. Personal builds only: the public build has none of these.
 */
export function CalcOfficialPage() {
  const { mc, frq } = PACK_CALC_SAMPLE;
  const [exam, setExam] = useState<'AB' | 'BC'>('AB');
  if (!mc.length && !frq.length) return <Empty page title="No official sample questions here" body="These come only with a personal copy that includes them." action={{ label: 'Back to AP Calculus', href: '/calc' }} />;
  const list = mc.filter((q) => q.exam === exam), frqs = frq.filter((q) => q.exam === exam);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="AP Calculus · College Board" title="Official sample exam questions" subtitle="From the College Board's AP Calculus AB and BC sample questions, exactly as printed, with the College Board's answer key and scoring rubrics. For your own study only; do not share."
        actions={<Link href="/calc" className="btn-ghost"><ArrowLeft size={16} />AP Calculus</Link>} />
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Exam">{(['AB', 'BC'] as const).map((e) => <button key={e} type="button" role="tab" aria-selected={exam === e} className={cn('btn-ghost', exam === e && 'border-brand bg-brand/10')} onClick={() => setExam(e)}>Calculus {e}</button>)}</div>
      <h2 className="mb-2 text-lg font-bold">Multiple choice ({list.length})</h2>
      <div className="space-y-4">{list.map((q) => <OfficialMc key={q.id} q={q} />)}</div>
      <h2 className="mb-2 mt-8 text-lg font-bold">Free response ({frqs.length})</h2>
      <div className="space-y-4">{frqs.map((q) => <OfficialFrq key={q.id} img={q.image} rubric={q.rubric} title={`Free response ${q.n}`} calculator={q.calculator} source={q.source} />)}</div>
    </div>
  );
}

function OfficialMc({ q }: { q: CalcSampleMc }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <section className="card p-4" aria-label={`Question ${q.n}`} data-testid="official-calc-mc">
      <p className="mb-2 flex items-center gap-2 text-xs text-muted">{q.calculator ? <><Calculator size={14} />Calculator allowed</> : 'No calculator'} · {q.source}</p>
      <img src={q.image} alt={`College Board AP Calculus ${q.exam} sample question ${q.n}, as printed`} className="w-full rounded-lg bg-white" />
      <div className="mt-3 flex flex-wrap gap-2">
        {'ABCD'.split('').map((l, i) => (
          <button key={l} type="button" disabled={pick !== null} onClick={() => setPick(i)} className={cn('btn-ghost min-w-12', pick !== null && i === q.answer && 'border-ok bg-ok/10', pick === i && i !== q.answer && 'border-bad bg-bad/10')}>{l}</button>
        ))}
      </div>
      {pick !== null && <p className={cn('mt-2 flex items-center gap-1.5 text-sm font-semibold', pick === q.answer ? 'text-ok' : 'text-bad')}>{pick === q.answer ? <Check size={16} /> : <X size={16} />}{pick === q.answer ? 'Correct.' : `Not this one.`} The College Board's key is {'ABCD'[q.answer]}.</p>}
    </section>
  );
}

function OfficialFrq({ img, rubric, title, calculator, source }: { img: string; rubric: string[]; title: string; calculator: boolean; source: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card p-4" aria-label={title}>
      <p className="mb-2 text-xs text-muted">{calculator ? 'Calculator allowed' : 'No calculator'} · {source}</p>
      <img src={img} alt={`${title}, as printed`} className="w-full rounded-lg bg-white" />
      <p className="mt-3 text-sm text-muted">Write a full solution on paper first, with justifications, then score it with the official rubric.</p>
      <button type="button" className="btn-ghost mt-2" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? 'Hide' : 'Show'} the College Board scoring rubric</button>
      {open && <div className="mt-3 space-y-2">{rubric.map((r, i) => <img key={i} src={r} alt={`Scoring rubric, page ${i + 1}`} className="w-full rounded-lg bg-white" />)}</div>}
    </section>
  );
}
