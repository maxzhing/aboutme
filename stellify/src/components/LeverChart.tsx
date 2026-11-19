'use client';
import Link from 'next/link';
import type { Lever } from '@/lib/engine/lever';
import { PATH } from '@/lib/path/skills';

/**
 * Score Lever (N10): a ranked bar per skill, the bar at the middle estimate and a hairline across the
 * low–high range, labelled directly (no legend). Skills without enough answers are listed, not charted.
 */
export function LeverChart({ rows, limit = 8 }: { rows: Lever[]; limit?: number }) {
  const shown = rows.filter((r) => r.perHour && r.perHour.mid > 0).slice(0, limit);
  const needs = rows.filter((r) => r.needsDiagnostic);
  const max = Math.max(1, ...shown.map((r) => r.perHour!.high));
  return (
    <section className="card p-5" aria-labelledby="lever-h" data-testid="lever">
      <h2 id="lever-h" className="text-[22px]">Score Lever</h2>
      <p className="mt-1 text-[14px] text-muted">Estimated scaled points gained per hour of study, from your first tries. The bar is the middle estimate; the line shows the likely range. <Link href="/methodology#score-lever" className="text-accent underline">How this is estimated</Link></p>
      {shown.length === 0 ? (
        <p className="mt-4 text-[15px]" data-testid="lever-empty">No estimate yet: each skill needs at least 6 first tries. A practice set on any skill is the quickest way to get one.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {shown.map((r) => {
            const p = r.perHour!;
            return (
              <li key={r.skill} data-testid="lever-row">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[15px]">
                  <Link href={`/path${PATH[r.skill].section === 'rw' ? '/rw' : ''}?skill=${r.skill}`} className="font-medium hover:underline">{PATH[r.skill].title}</Link>
                  <span className="text-muted" data-num>{p.low}–{p.high} points per hour <span className="text-faint">· {r.confidence} confidence · n = {r.n}</span></span>
                </div>
                <div className="relative mt-1.5 h-3" aria-hidden>
                  <div className="absolute inset-y-0 left-0 rounded-sm bg-accent/80" style={{ width: `${(p.mid / max) * 100}%` }} />
                  <div className="absolute top-1/2 h-px -translate-y-1/2 bg-ink" style={{ left: `${(p.low / max) * 100}%`, width: `${((p.high - p.low) / max) * 100}%` }} />
                  <div className="absolute top-0 h-3 w-px bg-ink" style={{ left: `${(p.low / max) * 100}%` }} />
                  <div className="absolute top-0 h-3 w-px bg-ink" style={{ left: `${(p.high / max) * 100}%` }} />
                </div>
                <p className="mt-1 text-[13px] text-faint">{r.why} Up to about {r.ceiling} points left in this skill.</p>
              </li>
            );
          })}
        </ol>
      )}
      {needs.length > 0 && <p className="mt-4 border-t border-line pt-3 text-[14px] text-muted"><b className="font-medium text-ink">Needs a diagnostic:</b> {needs.map((r) => PATH[r.skill].title).join(', ')}.</p>}
    </section>
  );
}
