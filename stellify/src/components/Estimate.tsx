'use client';
import { Info } from 'lucide-react';
import type { Confidence, SectionStatus } from '@/lib/engine/scoring';
import { CONFIDENCE_NAME, MIN_RESPONSES, MODEL_SD, fmtRange } from '@/lib/engine/scoring';
import { useOverview } from '@/lib/hooks';
import { DIFFICULTY_NAME, SECTION_NAME } from '@/lib/taxonomy';
import type { Difficulty } from '@/lib/types';
import { Badge, Card } from './ui';

const TONE: Record<Confidence, 'warn' | 'brand' | 'ok'> = { low: 'warn', medium: 'brand', high: 'ok' };
export const ConfidenceBadge = ({ c }: { c: Confidence | null }) => (c ? <Badge tone={TONE[c]}>{CONFIDENCE_NAME[c]}</Badge> : null);
const needText = (st: SectionStatus) => `${st.need} more first-try ${SECTION_NAME[st.section]} answer${st.need === 1 ? '' : 's'}`;

/** One line saying what is still missing before an estimate can be shown. */
export function needLine(rw: SectionStatus, math: SectionStatus): string {
  const parts = [rw, math].filter((x) => !x.range).map(needText);
  return parts.length ? `Not enough data yet: ${parts.join(' and ')} needed.` : '';
}

function SectionCard({ st }: { st: SectionStatus }) {
  const diffs = (Object.entries(st.byDifficulty) as [Difficulty, { n: number; correct: number }][]).filter(([, v]) => v.n);
  return (
    <div className="rounded-xl border border-line p-3" data-testid={`estimate-${st.section}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{SECTION_NAME[st.section]}</span><ConfidenceBadge c={st.confidence} /></div>
      {st.range ? (
        <div className="mt-1 font-display text-2xl font-bold tabular-nums">{fmtRange(st.range)}</div>
      ) : (
        <div className="mt-1 text-sm text-warn" data-testid={`estimate-need-${st.section}`}>Needs {st.need} more first-try answer{st.need === 1 ? '' : 's'} ({st.n} of {MIN_RESPONSES})</div>
      )}
      <div className="mt-1 text-xs text-muted">{st.n} first-try answer{st.n === 1 ? '' : 's'} · {st.days} study day{st.days === 1 ? '' : 's'}</div>
      {diffs.length > 0 && <div className="mt-1 text-xs text-faint">Right without hints: {diffs.map(([d, v]) => `${DIFFICULTY_NAME[d]} ${v.correct}/${v.n}`).join(' · ')}</div>}
    </div>
  );
}

/** The score estimate, labelled for what it is: a Stellify estimate with a confidence level, never an SAT score. */
export function EstimatePanel() {
  const ov = useOverview();
  const { status, total, confidence } = ov.estimate;
  return (
    <Card data-testid="estimate-panel">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Stellify score estimate</h2>
        <Badge>Unofficial · not an SAT score</Badge>
        <ConfidenceBadge c={confidence} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-brand/40 bg-brand/10 p-3">
          <div className="text-sm font-semibold">Total (80% likely range)</div>
          {total ? <div className="mt-1 font-display text-3xl font-bold tabular-nums" data-testid="estimate-total">{fmtRange(total)}</div>
            : <p className="mt-1 text-sm text-warn" data-testid="estimate-insufficient">{needLine(status.rw, status.math)}</p>}
          <p className="mt-1 text-xs text-muted">{total ? `Most likely near ${total.mid}. A real test could land outside this range.` : 'No total is shown until both sections have enough data.'}</p>
        </div>
        <SectionCard st={status.rw} />
        <SectionCard st={status.math} />
      </div>
      <details className="mt-3 text-sm">
        <summary className="flex cursor-pointer items-center gap-1.5 text-brand2"><Info size={14} />How this estimate works, and what it is not</summary>
        <ul className="mt-2 space-y-1.5 text-muted">
          <li>• It weighs <b className="text-ink">harder questions more</b> (an item-response model), so 70% on very hard questions counts for more than 70% on medium ones.</li>
          <li>• Only your <b className="text-ink">first try</b> at each question counts, and only if you used <b className="text-ink">no hints</b>: retries after reading the explanation measure memory, and test day has no hints. It uses your latest 80 such answers per section.</li>
          <li>• Nothing is shown until a section has <b className="text-ink">{MIN_RESPONSES} first tries</b>. Confidence rises with more answers spread over more days (high: 60+ answers on 3+ days).</li>
          <li>• Ranges are <b className="text-ink">80% ranges</b>: the statistical uncertainty plus an extra ±{Math.round(MODEL_SD * 100)} points for the model itself, because its settings are hand-made and it has <b className="text-ink">never been checked against real SAT results</b>. Section ranges combine into the total as independent errors.</li>
          <li>• It is not the College Board&apos;s method and not an SAT score. For a score on the official scale, take an official practice test in Bluebook (or one of the College Board practice tests here, scored with its own conversion table).</li>
        </ul>
      </details>
    </Card>
  );
}
