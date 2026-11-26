'use client';
import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, TriangleAlert, Upload } from 'lucide-react';
import { Card, PageHeader, cn } from '@/components/ui';
import { getQuestion } from '@/data/questions';
import { DISTRACTORS, TRAPS } from '@/data/questions/distractors';
import { isItemExport, itemExport, type ItemExport } from '@/lib/psych/export';
import { itemStats, MIN_DECIDE, STABLE, type ItemStat } from '@/lib/psych/stats';
import { snapshot, useStore } from '@/lib/store';

const info = (id: string) => {
  const q = getQuestion(id);
  if (!q) return undefined;
  return { key: q.type === 'mcq' ? String(q.answer) : null, choices: q.choices?.length ?? 0, tags: DISTRACTORS[id]?.map((t) => (t ? TRAPS[t].label : null)) };
};

/**
 * Maintainer dashboard: load one or many anonymous item-data files (Settings → Export anonymous item data),
 * pool them, and review flagged items. Everything happens in this browser; files are never uploaded.
 */
export function MaintainerPage() {
  const [files, setFiles] = useState<ItemExport[]>([]);
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const reviewed = useStore((s) => s.qcReviewed) ?? {};
  const reviewFlag = useStore((s) => s.reviewFlag);
  const events = useMemo(() => files.flatMap((f) => f.events), [files]);
  const stats = useMemo(() => itemStats(events, info), [events]);
  const people = new Set(events.map((e) => e.person)).size;
  const flagged = stats.filter((s) => s.flags.some((f) => !reviewed[`item:${s.item}:${f.kind}`]));
  const load = async (list: FileList | null) => {
    if (!list) return;
    const got: ItemExport[] = []; let bad = 0;
    for (const f of [...list]) { try { const j = JSON.parse(await f.text()); if (isItemExport(j)) got.push(j); else bad++; } catch { bad++; } }
    setFiles((x) => [...x, ...got.filter((g) => !x.some((y) => y.person === g.person))]);
    setMsg(`${got.length} file${got.length === 1 ? '' : 's'} added${bad ? `; ${bad} could not be read as Stellify item data` : ''}.`);
  };
  return (
    <div className="mx-auto max-w-5xl" data-testid="maintainer">
      <PageHeader eyebrow="For maintainers" title="Item statistics" subtitle={`Pool anonymous item-data files and check how each question behaves. Nothing is uploaded. No decision is made under ${MIN_DECIDE} responses; statistics are called stable at ${STABLE}.`} />
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn-primary cursor-pointer"><Upload size={16} aria-hidden />Add item-data files<input type="file" accept="application/json,.json" multiple className="sr-only" onChange={(e) => { void load(e.target.files); e.target.value = ''; }} data-testid="maintainer-files" /></label>
          <button type="button" className="btn-ghost" onClick={() => { setFiles((x) => [...x, itemExport(snapshot(), getQuestion, window.innerWidth)]); setMsg('This device’s answers added (anonymised, cleaned).'); }} data-testid="maintainer-own">Add this device’s answers</button>
          {files.length > 0 && <button type="button" className="btn-quiet" onClick={() => { setFiles([]); setMsg(''); }}>Clear</button>}
        </div>
        {msg && <p className="mt-3 text-[14px] text-muted" role="status">{msg}</p>}
        <p className="mt-3 text-[14px] text-muted" data-num data-testid="maintainer-summary">{files.length} file{files.length === 1 ? '' : 's'} · {people} people · {events.length} cleaned first attempts · {stats.length} items · {stats.filter((s) => s.n >= MIN_DECIDE).length} items with {MIN_DECIDE}+ responses</p>
      </Card>
      {files.length === 0 ? (
        <Card><h2 className="text-[20px]">No data loaded</h2><p className="mt-1 text-[15px] text-muted">Ask students or teachers for their files (Settings → Export anonymous item data), or add this device’s answers to see how the page works. One student’s data cannot calibrate anything: every statistic needs many people.</p></Card>
      ) : (
        <>
          <section aria-labelledby="flags-h" className="mb-6">
            <h2 id="flags-h" className="mb-2 text-[22px]">Flag queue</h2>
            {flagged.length === 0 ? <p className="text-[15px] text-muted" data-testid="no-flags">No open flags. {stats.every((s) => s.n < MIN_DECIDE) ? `No item has ${MIN_DECIDE} responses yet, so nothing can be flagged.` : ''}</p> : (
              <ul className="space-y-3">{flagged.map((s) => <FlagCard key={s.item} s={s} reviewed={reviewed} onReview={(kind, note) => reviewFlag(`item:${s.item}:${kind}`, note)} />)}</ul>
            )}
          </section>
          <section aria-labelledby="items-h">
            <h2 id="items-h" className="mb-2 text-[22px]">All items</h2>
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-raised/60"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">n</th><th className="px-3 py-2">Percent correct</th><th className="px-3 py-2">Point-biserial</th><th className="px-3 py-2">Median time</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"><span className="sr-only">Details</span></th></tr></thead>
                <tbody className="divide-y divide-line">
                  {stats.map((s) => (
                    <Fragment key={s.item}>
                      <tr className={cn(s.flags.some((f) => f.urgent) && 'bg-bad/5')}>
                        <td className="px-3 py-2 font-mono text-[13px]">{s.item}</td><td className="px-3 py-2">{s.n}</td>
                        <td className="px-3 py-2">{s.p === null ? '—' : `${Math.round(s.p * 100)}%`}</td><td className="px-3 py-2">{s.rpb === null ? '—' : s.rpb.toFixed(2)}</td>
                        <td className="px-3 py-2">{s.time ? `${Math.round(s.time.median / 1000)} s` : '—'}</td>
                        <td className="px-3 py-2">{{ insufficient: `Too few (under ${MIN_DECIDE})`, provisional: 'Provisional', stable: 'Stable' }[s.status]}</td>
                        <td className="px-3 py-2"><button type="button" className="btn-quiet !min-h-[32px] !px-2" aria-expanded={open === s.item} onClick={() => setOpen(open === s.item ? null : s.item)}>Options<ChevronDown size={14} aria-hidden /></button></td>
                      </tr>
                      {open === s.item && <tr><td colSpan={7} className="bg-raised/30 px-3 py-3"><OptionTable s={s} /></td></tr>}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function OptionTable({ s }: { s: ItemStat }) {
  return (
    <table className="w-full text-left text-[13px]" data-testid="option-table">
      <caption className="mb-1 text-left text-faint">Choices by ability third (by score on the person’s other items), n = {s.n}</caption>
      <thead><tr><th className="py-1">Option</th><th>All</th><th>Low</th><th>Middle</th><th>High</th><th>Misconception tag</th></tr></thead>
      <tbody>{s.options.map((o) => <tr key={o.option} className={cn(o.key && 'font-semibold')}><td className="py-1">{o.option}{o.key ? ' (key)' : ''}</td><td>{o.all}</td><td>{o.low}</td><td>{o.mid}</td><td>{o.high}</td><td>{o.tag ?? '—'}</td></tr>)}</tbody>
    </table>
  );
}

function FlagCard({ s, reviewed, onReview }: { s: ItemStat; reviewed: Record<string, { note: string }>; onReview: (kind: string, note: string) => void }) {
  const [note, setNote] = useState('');
  const q = getQuestion(s.item);
  return (
    <li className="card p-4" data-testid="item-flag">
      <p className="flex flex-wrap items-center gap-2 font-medium">{s.flags.some((f) => f.urgent) && <span className="inline-flex items-center gap-1 text-bad"><TriangleAlert size={16} aria-hidden />Urgent</span>}<span className="font-mono text-[13px]">{s.item}</span><span className="text-[14px] text-muted">n = {s.n} · {s.status}</span></p>
      {q && <p className="mt-1 line-clamp-2 text-[14px] text-muted">{q.stem}</p>}
      <ul className="mt-2 space-y-1 text-[14px]">{s.flags.filter((f) => !reviewed[`item:${s.item}:${f.kind}`]).map((f) => <li key={f.kind}>{f.text}</li>)}</ul>
      <div className="mt-3"><OptionTable s={s} /></div>
      <div className="mt-3 flex flex-wrap gap-2">
        <input className="input max-w-md flex-1" placeholder="What you checked, and what you decided" value={note} onChange={(e) => setNote(e.target.value)} aria-label={`Review note for ${s.item}`} />
        <button type="button" className="btn-ghost" disabled={!note.trim()} onClick={() => { for (const f of s.flags) onReview(f.kind, note.trim()); setNote(''); }}>Mark reviewed</button>
      </div>
    </li>
  );
}
