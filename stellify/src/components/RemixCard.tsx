'use client';
import Link from 'next/link';
import { Wand2 } from 'lucide-react';
import type { RemixSummary } from '@/lib/remix/analytics';
import { Card, Progress } from './ui';

/** Remix Studio progress. Kept apart from bank accuracy and score estimates, and says so. */
export function RemixCard({ r, title = 'Remix Studio' }: { r: RemixSummary; title?: string }) {
  return (
    <Card data-testid="remix-card">
      <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-1.5 font-semibold"><Wand2 size={16} className="text-brand" />{title}</h2><Link href="/remix" className="btn-quiet !py-1 text-sm">Open</Link></div>
      {r.n === 0 ? <p className="mt-2 text-sm text-muted">No remixes answered yet. Remix a missed question to practice the same idea in new ways.</p> : <>
        <p className="mt-2 text-sm"><b>{r.n}</b> generated question{r.n === 1 ? '' : 's'} from <b>{r.originals}</b> original{r.originals === 1 ? '' : 's'} · <b>{r.pct}%</b> right on the first try.</p>
        {r.afterMiss.n > 0 && <p className="mt-1 text-sm">After missing a question, you got its first remix right <b>{r.afterMiss.fixed} of {r.afterMiss.n}</b> times.</p>}
        <ul className="mt-3 space-y-2">{r.byMode.map((m) => <li key={m.mode} className="text-sm"><div className="flex justify-between"><span>{m.name}</span><span className="tabular-nums text-muted">{m.pct}% · {m.n}</span></div><Progress value={m.pct} tone={m.pct >= 70 ? 'ok' : m.pct >= 50 ? 'warn' : 'bad'} label={`${m.name} accuracy`} /></li>)}</ul>
      </>}
      <p className="mt-3 text-[11px] text-faint">Generated questions have no calibrated difficulty, so they are counted here and in skill mastery (at most one per original per day), never in your score estimate or bank accuracy.</p>
    </Card>
  );
}
