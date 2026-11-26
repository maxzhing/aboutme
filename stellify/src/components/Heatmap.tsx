'use client';
import Link from 'next/link';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { Forecast, Opportunity, SkillHeat } from '@/lib/engine/insights';
import { DOMAINS, SKILL } from '@/lib/taxonomy';
import { CONFIDENCE_NAME } from '@/lib/engine/scoring';
import { cn } from './ui';

const tone = (m: number) => (m < 50 ? 'bad' : m < 70 ? 'warn' : m < 85 ? 'brand2' : 'ok');
const TILE: Record<string, string> = {
  bad: 'border-bad/50 bg-bad/15', warn: 'border-warn/50 bg-warn/15', brand2: 'border-brand2/50 bg-brand2/15', ok: 'border-ok/50 bg-ok/20',
};
const LEGEND: [string, string][] = [['bad', 'under 50%'], ['warn', '50–69%'], ['brand2', '70–84%'], ['ok', '85%+']];

/**
 * Every SAT skill at a glance: color = difficulty-weighted mastery, a dashed border = too little data to
 * be sure, ± = how far the true accuracy could be from what we have seen (80%), arrow = recent direction.
 */
export function SkillHeatmap({ heat }: { heat: SkillHeat[] }) {
  return (
    <div data-testid="skill-heatmap">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        {LEGEND.map(([t, l]) => <span key={t} className="flex items-center gap-1.5"><span className={cn('inline-block h-3 w-3 rounded border', TILE[t])} aria-hidden />{l}</span>)}
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded border border-dashed border-line" aria-hidden />dashed: low confidence</span>
        <span>± = 80% uncertainty of accuracy</span>
      </div>
      <div className="mt-3 space-y-4">
        {DOMAINS.map((d) => {
          const tiles = heat.filter((h) => SKILL[h.skill].domain === d.id);
          return (
            <section key={d.id} aria-label={d.name}>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-faint">{d.name} <span className="font-normal normal-case">· about {Math.round(d.weight * 100)}% of the section</span></h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {tiles.map((h) => {
                  const t = h.mastery === null ? null : tone(h.mastery);
                  const half = h.ci ? Math.round(((h.ci[1] - h.ci[0]) / 2) * 100) : null;
                  const label = `${SKILL[h.skill].name}: ${h.mastery === null ? 'not practiced yet' : `mastery ${h.mastery}%, ${h.correct} of ${h.n} right, ${CONFIDENCE_NAME[h.confidence!].toLowerCase()}${h.trend ? `, trend ${h.trend}` : ''}`}. Practice this skill.`;
                  return (
                    <li key={h.skill}>
                      <Link href={`/practice/session?mode=skill&skill=${h.skill}&n=6`} aria-label={label} data-testid={`heat-${h.skill}`} data-confidence={h.confidence ?? 'none'}
                        className={cn('block h-full rounded-xl border p-2.5 transition-transform hover:-translate-y-0.5', t ? TILE[t] : 'border-dashed border-line bg-raised/30', h.confidence === 'low' && 'border-dashed')}>
                        <div className="line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-tight">{SKILL[h.skill].short}</div>
                        <div className="mt-1 flex items-end justify-between gap-1">
                          <span className="font-display text-xl font-bold tabular-nums">{h.mastery === null ? '—' : `${h.mastery}%`}</span>
                          {h.trend === 'up' ? <TrendingUp size={16} className="text-ok" aria-hidden /> : h.trend === 'down' ? <TrendingDown size={16} className="text-bad" aria-hidden /> : h.trend === 'flat' ? <ArrowRight size={16} className="text-muted" aria-hidden /> : null}
                        </div>
                        <div className="text-[11px] text-muted">{h.n ? `n=${h.n}${half !== null ? ` · ±${half}%` : ''}` : 'no data yet'} · ~{Math.round(h.perTest * 10) / 10}/test</div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** The few skills where more accuracy would add the most points, and whether the estimate is really moving. */
export function PointsPanel({ ops, unmeasured, fc }: { ops: Opportunity[]; unmeasured: number; fc: Forecast | null }) {
  return (
    <div data-testid="points-panel">
      {ops.length ? (
        <ol className="space-y-2">
          {ops.slice(0, 5).map((o, i) => (
            <li key={o.skill} className="flex items-center gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">{i + 1}</span>
              <span className="min-w-0 flex-1"><Link href={`/learn/${o.skill}`} className="font-semibold hover:underline">{SKILL[o.skill].short}</Link><span className="block text-xs text-muted">accuracy {Math.round(o.from * 100)}% → {Math.round(o.to * 100)}% ≈ {Math.round(o.extraRight * 10) / 10} more right per test</span></span>
              <span className="rounded-full bg-ok/15 px-2 py-0.5 text-xs font-bold text-ok tabular-nums">≈ +{o.points} pts</span>
            </li>
          ))}
        </ol>
      ) : <p className="text-sm text-muted">Practice at least 4 questions in a skill to see what it is worth.</p>}
      {unmeasured > 0 && <p className="mt-2 text-xs text-warn">{unmeasured} skill{unmeasured === 1 ? ' has' : 's have'} fewer than 4 answers, so {unmeasured === 1 ? 'it is' : 'they are'} not ranked yet. <Link href="/practice/smart" className="font-semibold underline">Smart Practice</Link> covers them.</p>}
      <p className="mt-2 text-xs text-faint">Rough guide: questions of that skill on a full test (from the SAT blueprint) × the accuracy still to gain × the points one more right answer is worth near your current level.</p>
      <div className="mt-3 rounded-xl border border-line p-3 text-sm" data-testid="forecast">
        <div className="font-semibold">Is your estimate moving?</div>
        {!fc ? <p className="mt-0.5 text-muted">Too early to tell: a forecast needs estimates on at least 4 days spread over 2 weeks.</p>
          : !fc.clear ? <p className="mt-0.5 text-muted">No clear trend yet. Over {fc.days} days the change is about {fc.perWeek >= 0 ? '+' : ''}{fc.perWeek} points a week, but day-to-day noise is about ±{Math.round(fc.se * 2)} points a week, so it could be chance.</p>
          : <p className="mt-0.5"><span className={fc.perWeek >= 0 ? 'font-semibold text-ok' : 'font-semibold text-bad'}>{fc.perWeek >= 0 ? 'Rising' : 'Falling'} about {fc.perWeek >= 0 ? '+' : ''}{fc.perWeek} points a week</span> <span className="text-muted">(±{fc.se}) over {fc.days} days.</span>{fc.projection && <span className="mt-1 block text-muted">If that pace held until {new Date(`${fc.projection.date}T12:00:00`).toLocaleDateString()}, the estimate would be about <b className="text-ink">{fc.projection.low}–{fc.projection.high}</b>. Gains usually slow as scores rise, so read this as a best case, not a promise.</span>}{!fc.projection && <span className="mt-1 block text-xs text-faint">Add your test date in Settings to see where this pace would lead.</span>}</p>}
      </div>
    </div>
  );
}
