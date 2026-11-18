'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { getQuestion } from '@/data/questions';
import { useStore } from '@/lib/store';
import { SKILL } from '@/lib/taxonomy';
import { plain } from '@/lib/richtext';
import { LEVEL_NAME, MODE_INFO, STATUS_NAME, type RemixQuestion, type ReviewStatus } from '@/lib/remix/types';
import { QuestionView } from './Question';
import { RichText } from './RichText';
import { Badge, Card, Tabs, cn } from './ui';

const FLAGS = ['Wording unclear', 'Answer key wrong', 'Weak distractors', 'More than one answer', 'Off skill', 'Too easy for its level', 'Too hard for its level', 'Explanation unclear', 'Unnatural passage'];
const words = (q: RemixQuestion) => new Set(plain(`${q.passage ?? ''} ${q.stem} ${(q.choices ?? []).join(' ')}`).toLowerCase().split(/\W+/).filter((w) => w.length > 2));
const jac = (a: Set<string>, b: Set<string>) => { let k = 0; for (const x of a) if (b.has(x)) k++; return k / (a.size + b.size - k || 1); };

/** Near duplicates: two variations of the same original whose wording overlaps heavily. */
export function nearDuplicates(items: RemixQuestion[], threshold = 0.75): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const sets = new Map(items.map((q) => [q.id, words(q)]));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.remix.originId !== b.remix.originId || a.skill !== b.skill) continue;
    if (jac(sets.get(a.id)!, sets.get(b.id)!) >= threshold) { out.set(a.id, [...(out.get(a.id) ?? []), b.id]); out.set(b.id, [...(out.get(b.id) ?? []), a.id]); }
  }
  return out;
}

/**
 * Reviewer view of every question Remix Studio generated on this device: its status, validation report,
 * origin and chain, earlier rejected attempts and near duplicates. A reviewer can approve, reject or mark it
 * for review with a note and flags. The question's content is never edited here.
 */
export function RemixReview() {
  const remix = useStore((s) => s.remix);
  const act = useStore((s) => s.remixReview);
  const items = useMemo(() => Object.values(remix?.items ?? {}).sort((a, b) => b.remix.createdAt - a.remix.createdAt), [remix]);
  const dups = useMemo(() => nearDuplicates(items), [items]);
  const [tab, setTab] = useState<'all' | ReviewStatus>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, string[]>>({});
  const count = (st: ReviewStatus) => items.filter((q) => q.remix.status === st).length;
  const list = tab === 'all' ? items : items.filter((q) => q.remix.status === tab);
  const stepOf = (q: RemixQuestion) => { const c = remix?.chains[q.remix.chainId]; return c ? `step ${c.steps.indexOf(q.id) + 1} of ${c.steps.length}` : 'chain removed'; };
  return (
    <Card data-testid="remix-review">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Generated questions (Remix Studio)</h2>
        <Tabs label="Status" value={tab} onChange={setTab} tabs={[{ id: 'all', label: `All (${items.length})` }, ...(['auto-validated', 'needs-review', 'approved', 'rejected'] as ReviewStatus[]).map((st) => ({ id: st, label: `${STATUS_NAME[st]} (${count(st)})` }))]} />
      </div>
      <p className="mt-1 text-xs text-muted">Every generated question passed the independent validator before a student saw it (“Automatically validated”). AI-written Reading &amp; Writing starts as “Needs review”. Decisions are saved with this device&apos;s data; a rejected question stops counting toward mastery. Content is never edited here.</p>
      {list.length ? <ul className="mt-3 divide-y divide-line">{list.map((q) => {
        const m = q.remix, origin = getQuestion(m.originId), d = dups.get(q.id), passed = m.validation.checks.filter((c) => c.pass).length;
        return (
          <li key={q.id} className="py-2.5 text-sm" data-testid="remix-review-item">
            <button className="flex w-full flex-wrap items-center gap-2 text-left" onClick={() => setOpen(open === q.id ? null : q.id)} aria-expanded={open === q.id}>
              <Badge tone={m.status === 'rejected' ? 'bad' : m.status === 'needs-review' ? 'warn' : m.status === 'approved' ? 'ok' : 'brand'}>{STATUS_NAME[m.status]}</Badge>
              <span className="font-mono text-xs text-faint">{q.id}</span>
              <span className="font-medium">{SKILL[q.skill]?.short}</span>
              <span className="text-muted">{MODE_INFO[m.mode].name} · {LEVEL_NAME[m.level]} · {m.method === 'ai' ? 'AI' : 'local'} · {passed}/{m.validation.checks.length} checks</span>
              {m.rejected.length > 0 && <Badge>{m.rejected.length} rejected attempt{m.rejected.length === 1 ? '' : 's'}</Badge>}
              {d && <Badge tone="warn">Near duplicate of {d.length}</Badge>}
              {m.review?.flags.map((f) => <Badge key={f} tone="bad">{f}</Badge>)}
            </button>
            {open === q.id && (
              <div className="mt-3 space-y-3 rounded-xl border border-line p-3">
                <p className="text-xs text-muted">From <Link className="font-mono text-brand2 hover:underline" href={`/practice/session?mode=single&ids=${m.originId}`}>{m.originId}</Link>{origin ? ` (${SKILL[origin.skill]?.short} · ${origin.sub})` : ' (original not on this device)'}{m.parentId ? <>, via <span className="font-mono">{m.parentId}</span></> : ''} · {stepOf(q)} · made {new Date(m.createdAt).toLocaleString()} · family {m.family}</p>
                <p className="text-sm"><b>How it differs:</b> {m.differs}</p>
                {m.smart && <p className="text-sm text-muted"><b className="text-ink">Smart Remix reason:</b> {m.smart}</p>}
                <QuestionView q={q} answer={typeof q.answer === 'number' ? String(q.answer) : q.answer[0]} onAnswer={() => {}} locked reveal hlScope="qc" />
                <div><div className="text-xs font-bold uppercase tracking-wide text-faint">Worked solution</div><ol className="mt-1 list-decimal space-y-1 pl-5">{q.steps.map((st, i) => <li key={i}><RichText text={st} /></li>)}</ol></div>
                <div><div className="text-xs font-bold uppercase tracking-wide text-faint">Hints</div><ol className="mt-1 list-decimal space-y-1 pl-5 text-muted">{q.hints.map((h, i) => <li key={i}><RichText text={h} /></li>)}</ol></div>
                <div><div className="text-xs font-bold uppercase tracking-wide text-faint">Validation ({m.validation.method})</div>
                  <ul className="mt-1 grid gap-0.5 text-xs sm:grid-cols-2">{m.validation.checks.map((c) => <li key={c.name} className="flex gap-1.5">{c.pass ? <Check size={13} className="mt-0.5 shrink-0 text-ok" /> : <X size={13} className="mt-0.5 shrink-0 text-bad" />}<span>{c.name}{c.detail ? <span className="text-faint"> · {c.detail}</span> : null}</span></li>)}</ul></div>
                {m.rejected.length > 0 && <details className="text-xs text-muted"><summary className="cursor-pointer">Attempts rejected before this one</summary><ul className="mt-1 list-disc space-y-0.5 pl-4">{m.rejected.map((r, i) => <li key={i}>{r}</li>)}</ul></details>}
                {d && <p className="text-xs text-warn">Wording overlaps heavily with {d.map((x) => <span key={x} className="font-mono">{x} </span>)}from the same original.</p>}
                {m.review && <p className="text-xs"><b>Last decision:</b> {STATUS_NAME[m.status]} on {new Date(m.review.at).toLocaleString()}{m.review.note ? `: “${m.review.note}”` : ''}</p>}
                <div className="space-y-2 border-t border-line pt-3">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Flags">{FLAGS.map((f) => { const on = (flags[q.id] ?? m.review?.flags ?? []).includes(f); return <button key={f} type="button" aria-pressed={on} onClick={() => setFlags((x) => { const cur = x[q.id] ?? m.review?.flags ?? []; return { ...x, [q.id]: on ? cur.filter((y) => y !== f) : [...cur, f] }; })} className={cn('chip !py-1 text-xs', on && 'border-bad bg-bad/10 text-ink')}>{f}</button>; })}</div>
                  <input className="input !py-1.5 text-sm" placeholder="Reviewer note (what you checked, or what is wrong)" value={note[q.id] ?? ''} onChange={(e) => setNote((n) => ({ ...n, [q.id]: e.target.value }))} aria-label={`Review note for ${q.id}`} />
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary !py-1.5" onClick={() => act(q.id, 'approved', note[q.id]?.trim() ?? '', flags[q.id] ?? [])} data-testid="remix-approve">Approve</button>
                    <button className="btn-ghost !py-1.5" onClick={() => act(q.id, 'needs-review', note[q.id]?.trim() ?? '', flags[q.id] ?? m.review?.flags ?? [])}>Needs review</button>
                    <button className="btn-ghost !py-1.5 text-bad" onClick={() => act(q.id, 'rejected', note[q.id]?.trim() ?? '', flags[q.id] ?? m.review?.flags ?? [])} data-testid="remix-reject">Reject</button>
                  </div>
                </div>
              </div>
            )}
          </li>
        );
      })}</ul> : <p className="mt-3 text-sm text-muted">{items.length ? 'Nothing with this status.' : 'No questions generated on this device yet. Open Remix Studio to make some.'}</p>}
    </Card>
  );
}
