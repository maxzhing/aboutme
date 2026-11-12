import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ChevronDown, Circle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getQuestion } from '@/data/questions';
import { useStore } from '@/lib/store';
import { CATEGORY_LABEL, detectPatterns, ERROR_CATEGORIES, resolveProgress } from '@/lib/engine/mistakes';
import { displayAnswer } from '@/lib/answers';
import { DIFFICULTIES, DIFFICULTY_NAME, SECTION_NAME, SKILL } from '@/lib/taxonomy';
import { DAY, fmtDuration } from '@/lib/util';
import type { Difficulty, ErrorCategory } from '@/lib/types';
import { Explanation, QuestionView } from '@/components/Question';
import { Badge, Card, Empty, PageHeader, Stat, Tabs } from '@/components/ui';

type Filter = 'unresolved' | 'all' | 'recent' | 'repeated' | 'math' | 'rw' | 'resolved';

export function MistakesPage() {
  const mistakes = useStore((s) => s.mistakes);
  const attempts = useStore((s) => s.attempts);
  const resolve = useStore((s) => s.resolve);
  const setCat = useStore((s) => s.setMistakeCategory);
  const [filter, setFilter] = useState<Filter>('unresolved');
  const [diff, setDiff] = useState<Difficulty | ''>('');
  const [cat, setCatFilter] = useState<ErrorCategory | ''>('');
  const [open, setOpen] = useState<string | null>(null);
  const now = Date.now();
  const all = useMemo(() => Object.values(mistakes).map((m) => ({ m, q: getQuestion(m.qid)! })).filter((x) => x.q).sort((a, b) => b.m.lastAt - a.m.lastAt), [mistakes]);
  const patterns = useMemo(() => detectPatterns(mistakes, getQuestion), [mistakes]);
  const open_ = all.filter((x) => x.m.status === 'unresolved');
  const ready = open_.filter((x) => resolveProgress(x.m).ready);
  const list = all.filter(({ m, q }) =>
    (filter === 'all' || (filter === 'unresolved' && m.status === 'unresolved') || (filter === 'resolved' && m.status === 'resolved') || (filter === 'recent' && now - m.lastAt < 7 * DAY) || (filter === 'repeated' && m.count >= 2) || (filter === 'math' && q.section === 'math') || (filter === 'rw' && q.section === 'rw'))
    && (!diff || q.difficulty === diff) && (!cat || m.category === cat));
  const count = (f: Filter) => all.filter(({ m, q }) => f === 'all' || (f === 'unresolved' && m.status === 'unresolved') || (f === 'resolved' && m.status === 'resolved') || (f === 'recent' && now - m.lastAt < 7 * DAY) || (f === 'repeated' && m.count >= 2) || (f === 'math' && q.section === 'math') || (f === 'rw' && q.section === 'rw')).length;

  if (!all.length) return <div><PageHeader eyebrow="Performance" title="Mistake Bucket" /><Empty title="Your Mistake Bucket is empty" body="Every question you answer incorrectly is saved here automatically, with your answer, the time you spent and a likely cause, so nothing you miss is ever lost." action={{ label: 'Start practicing', href: '/practice/smart' }} /></div>;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Performance" title="Mistake Bucket" subtitle="Every miss is saved automatically. A mistake is resolved only after you answer the original question correctly without hints and get two new related questions right."
        actions={<Link href="/practice/session?mode=mistakes&n=8" className={`btn-primary ${open_.length ? '' : 'pointer-events-none opacity-50'}`} data-testid="daily-review">Start today&apos;s mistake review</Link>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Unresolved" value={<span data-testid="unresolved-count">{open_.length}</span>} />
        <Stat label="Ready to resolve" value={ready.length} sub="practice completed" />
        <Stat label="Resolved" value={all.length - open_.length} />
        <Stat label="Repeated" value={all.filter((x) => x.m.count >= 2).length} sub="missed more than once" />
      </div>
      {patterns.map((p) => (
        <div key={p.key} className="flex flex-wrap items-center gap-3 rounded-2xl border border-warn/40 bg-warn/10 p-4" role="alert">
          <AlertTriangle className="shrink-0 text-warn" size={20} /><p className="min-w-0 flex-1 text-sm">{p.message}</p>
          <Link href={p.href} className="btn-ghost !py-1.5">Open lesson</Link><Link href={`/practice/session?mode=skill&skill=${p.skill}&n=6`} className="btn-ghost !py-1.5">Practice</Link>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Tabs label="Filter mistakes" value={filter} onChange={setFilter} tabs={(['unresolved', 'all', 'recent', 'repeated', 'math', 'rw', 'resolved'] as Filter[]).map((f) => ({ id: f, label: { unresolved: 'Unresolved', all: 'All', recent: 'Recent', repeated: 'Repeated', math: 'Math', rw: 'Reading & Writing', resolved: 'Resolved' }[f], count: count(f) }))} />
        <select className="input !w-auto" value={diff} onChange={(e) => setDiff(e.target.value as Difficulty | '')} aria-label="Filter by difficulty"><option value="">Any difficulty</option>{DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_NAME[d]}</option>)}</select>
        <select className="input !w-auto" value={cat} onChange={(e) => setCatFilter(e.target.value as ErrorCategory | '')} aria-label="Filter by error type"><option value="">Any error type</option>{ERROR_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      </div>
      <ul className="space-y-2">
        {list.map(({ m, q }) => { const p = resolveProgress(m); const tries = attempts.filter((a) => a.qid === q.id && !a.abandoned); return (
          <li key={m.qid} className="card p-0" data-testid="mistake-row">
            <div className="flex flex-wrap items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5"><Badge tone="brand">{SECTION_NAME[q.section]}</Badge><Link href={`/learn/${q.skill}`} className="chip hover:text-ink">{SKILL[q.skill].short}</Link><Badge tone={(q.difficulty === 'very-hard' || q.difficulty === 'elite') ? 'bad' : q.difficulty === 'hard' ? 'warn' : 'ok'}>{DIFFICULTY_NAME[q.difficulty]}</Badge>{m.count >= 2 && <Badge tone="bad">Missed {m.count}×</Badge>}{m.status === 'resolved' && <Badge tone="ok">Resolved</Badge>}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted"><span>{q.sub}</span><span>{new Date(m.lastAt).toLocaleDateString()}</span><span>Time spent {fmtDuration(m.lastMs)}</span><span>Your answer: <b className="text-ink">{displayAnswer(q, m.answers[m.answers.length - 1])}</b></span><span>{tries.length} attempt{tries.length === 1 ? '' : 's'} ({tries.filter((a) => a.correct).length} correct)</span></div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <label className="sr-only" htmlFor={`cat-${m.qid}`}>Error category</label>
                  <select id={`cat-${m.qid}`} className="rounded-lg border border-line bg-surface px-2 py-1 text-xs" value={m.category} onChange={(e) => setCat(m.qid, e.target.value as ErrorCategory)}>{ERROR_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                  <span className="text-faint">{m.categoryBy === 'auto' ? 'suggested automatically' : 'set by you'}</span>
                  {m.status === 'unresolved' && <><span className="inline-flex items-center gap-1">{p.redo ? <CheckCircle2 size={14} className="text-ok" /> : <Circle size={14} className="text-faint" />}Redo correct</span><span className="inline-flex items-center gap-1">{p.related >= p.needed ? <CheckCircle2 size={14} className="text-ok" /> : <Circle size={14} className="text-faint" />}Related practice {p.related}/{p.needed}</span></>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {m.status === 'unresolved' && (p.ready
                  ? <button className="btn-primary !py-1.5" onClick={() => resolve(m.qid)} data-testid="resolve">Mark resolved</button>
                  : <Link href={`/practice/session?mode=mistakes&ids=${m.qid}&n=3`} className="btn-primary !py-1.5" data-testid="fix-it">Fix it</Link>)}
                <button className="btn-ghost !py-1.5" onClick={() => setOpen(open === m.qid ? null : m.qid)} aria-expanded={open === m.qid}>Explanation<ChevronDown size={15} className={open === m.qid ? 'rotate-180' : ''} /></button>
              </div>
            </div>
            {open === m.qid && <div className="space-y-4 border-t border-line p-4"><QuestionView q={q} answer={m.answers[m.answers.length - 1]} onAnswer={() => {}} locked reveal /><Explanation q={q} answer={m.answers[m.answers.length - 1]} category={m.category} onCategory={(c) => setCat(m.qid, c)} /></div>}
          </li>
        ); })}
        {!list.length && <li className="card p-8 text-center text-sm text-muted">No mistakes match these filters{filter === 'unresolved' ? '. Everything here has been resolved.' : '.'}</li>}
      </ul>
      <p className="text-xs text-faint">Error categories: {ERROR_CATEGORIES.map((c) => CATEGORY_LABEL[c.id]).join(' · ')}.</p>
    </div>
  );
}
