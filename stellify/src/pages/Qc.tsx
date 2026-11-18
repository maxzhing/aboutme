'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ALL_QUESTIONS, QUESTIONS, getQuestion } from '@/data/questions';
import { QC_REVIEWED } from '@/data/qcReviewed';
import { choiceFlags, duplicates, FLAG_NAME, labelCheck, type Flag, type FlagKind } from '@/lib/engine/qc';
import { useStore } from '@/lib/store';
import { DIFFICULTY_NAME, SECTION_NAME } from '@/lib/taxonomy';
import { Badge, Card, PageHeader, Stat, Tabs, cn } from '@/components/ui';

const keyOf = (f: Flag) => `${f.kind}|${f.qid}|${f.other ?? ''}`;

/**
 * Internal review dashboard: automatic quality flags on the whole question bank, how the difficulty
 * labels behave on this student's answers, and student reports. Each flag links to the question and can
 * be marked as reviewed with a note. Flags are reasons to look, not verdicts.
 */
export function QcPage() {
  const reports = useStore((s) => s.reports);
  const attempts = useStore((s) => s.attempts);
  const mine = useStore((s) => s.qcReviewed) ?? {};
  const review = useStore((s) => s.reviewFlag);
  const [show, setShow] = useState<'open' | 'reviewed' | 'all'>('open');
  const [note, setNote] = useState<Record<string, string>>({});
  const flags = useMemo<Flag[]>(() => {
    const out = [...duplicates(QUESTIONS), ...QUESTIONS.flatMap(choiceFlags)];
    for (const r of reports) out.push({ kind: 'reported', qid: r.qid, detail: `“${r.reason}”${r.detail ? `: ${r.detail}` : ''} (${new Date(r.at).toLocaleDateString()})` });
    return out;
  }, [reports]);
  const labels = useMemo(() => labelCheck(attempts, getQuestion), [attempts]);
  const reviewedNote = (f: Flag) => mine[keyOf(f)]?.note ?? QC_REVIEWED[keyOf(f)]?.note;
  const open = flags.filter((f) => !reviewedNote(f));
  const list = show === 'open' ? open : show === 'reviewed' ? flags.filter((f) => reviewedNote(f)) : flags;
  const failing = ALL_QUESTIONS.length - QUESTIONS.length;
  const kinds = Object.keys(FLAG_NAME) as FlagKind[];
  return (
    <div className="space-y-4" data-testid="qc-page">
      <PageHeader eyebrow="For reviewers" title="Question quality control" subtitle="Automatic checks on every Stellify question. A flag is a reason to look, not a verdict: open the question, decide, and mark it reviewed with a note." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Questions served" value={QUESTIONS.length} sub={`of ${ALL_QUESTIONS.length} written`} />
        <Stat label="Fail automated checks" value={failing} sub="answers re-derived, math renders; failing ones are never served" />
        <Stat label="Open flags" value={open.length} sub={`${flags.length - open.length} reviewed`} />
        <Stat label="Student reports" value={reports.length} sub="from the report button on each question" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Flags</h2>
          <Tabs label="Which flags" value={show} onChange={setShow} tabs={[{ id: 'open', label: `Open (${open.length})` }, { id: 'reviewed', label: 'Reviewed' }, { id: 'all', label: 'All' }]} />
        </div>
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">{kinds.map((k) => <li key={k}><Badge tone={flags.some((f) => f.kind === k && !reviewedNote(f)) ? 'warn' : 'default'}>{FLAG_NAME[k]}: {flags.filter((f) => f.kind === k).length}</Badge></li>)}</ul>
        {list.length ? (
          <ul className="mt-3 divide-y divide-line" data-testid="qc-flags">
            {list.map((f) => {
              const k = keyOf(f), done = reviewedNote(f);
              return (
                <li key={k} className="py-2.5 text-sm" data-testid="qc-flag" data-kind={f.kind}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={done ? 'ok' : 'warn'}>{FLAG_NAME[f.kind]}</Badge>
                    <Link href={`/practice/session?mode=single&ids=${f.qid}`} className="font-mono text-xs text-brand2 hover:underline">{f.qid}</Link>
                    {f.other && <><span className="text-faint">and</span><Link href={`/practice/session?mode=single&ids=${f.other}`} className="font-mono text-xs text-brand2 hover:underline">{f.other}</Link></>}
                  </div>
                  <p className="mt-1 text-muted">{f.detail}</p>
                  {done ? (
                    <p className="mt-1 text-xs"><span className="font-semibold text-ok">Reviewed:</span> {done}{mine[k] && <button type="button" className="ml-2 text-brand2 hover:underline" onClick={() => review(k, null)}>Reopen</button>}</p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <input className="input !h-8 min-w-[12rem] flex-1 !py-1 text-xs" placeholder="Why it is fine (or what you fixed)" value={note[k] ?? ''} onChange={(e) => setNote((n) => ({ ...n, [k]: e.target.value }))} aria-label={`Review note for ${f.qid}`} />
                      <button type="button" className="btn-ghost !px-2.5 !py-1 text-xs" disabled={!note[k]?.trim()} onClick={() => review(k, note[k].trim())} data-testid="qc-mark">Mark reviewed</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : <p className="mt-3 text-sm text-muted">{show === 'open' ? 'No open flags.' : 'Nothing here.'}</p>}
      </Card>
      <Card>
        <h2 className="font-semibold">Do the difficulty labels behave?</h2>
        <p className="mt-0.5 text-xs text-muted">On your own first tries: accuracy for each label against what the scoring model expects at your estimated level. Flagged when, with 15+ answers, they differ by more than 20 points. One person&apos;s answers are a weak signal; re-labelling single questions needs many students&apos; data.</p>
        {labels.length ? (
          <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[460px] text-sm" data-testid="qc-labels">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-faint"><th className="pb-1.5 font-semibold">Section</th><th className="pb-1.5 font-semibold">Label</th><th className="pb-1.5 font-semibold">Answers</th><th className="pb-1.5 font-semibold">Right</th><th className="pb-1.5 font-semibold">Expected</th><th className="pb-1.5 font-semibold" /></tr></thead>
            <tbody className="divide-y divide-line">{labels.map((r) => (
              <tr key={`${r.section}-${r.difficulty}`}><td className="py-1.5 pr-3">{SECTION_NAME[r.section]}</td><td className="py-1.5 pr-3">{DIFFICULTY_NAME[r.difficulty]}</td><td className="py-1.5 pr-3 tabular-nums">{r.n}</td><td className="py-1.5 pr-3 tabular-nums">{Math.round(r.observed * 100)}%</td><td className="py-1.5 pr-3 tabular-nums text-muted">{Math.round(r.expected * 100)}%</td><td className={cn('py-1.5 text-xs', r.flag ? 'font-semibold text-warn' : 'text-faint')}>{r.flag ? 'Check this label' : r.n < 15 ? 'Too few answers to judge' : 'Behaves as expected'}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="mt-2 text-sm text-muted">Answer some questions first.</p>}
      </Card>
    </div>
  );
}
