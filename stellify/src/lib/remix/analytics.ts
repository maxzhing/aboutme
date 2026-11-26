import type { Attempt, Question } from '../types';
import { pct } from '../util';
import { MODE_INFO, type RemixMode, type RemixQuestion } from './types';

/**
 * Remix Studio progress, kept apart from the bank's accuracy and score estimates (generated questions have
 * no calibrated difficulty). Every number here is a direct count of the student's own answers.
 */
export interface RemixSummary {
  /** generated questions answered (first try only) */
  n: number; correct: number; pct: number;
  originals: number;
  byMode: { mode: RemixMode; name: string; n: number; pct: number }[];
  /** originals the student got wrong, then answered a remix of afterward */
  afterMiss: { n: number; fixed: number };
}
export function remixSummary(attempts: Attempt[], getQ: (id: string) => Question | undefined, from = 0, to = Infinity): RemixSummary {
  const first = new Map<string, Attempt>();
  for (const a of attempts) if (!a.abandoned && a.qid.startsWith('gx-') && a.at >= from && a.at < to && !first.has(a.qid)) first.set(a.qid, a);
  const rows = [...first.values()].map((a) => ({ a, q: getQ(a.qid) as RemixQuestion | undefined })).filter((r): r is { a: Attempt; q: RemixQuestion } => !!r.q?.remix);
  const correct = rows.filter((r) => r.a.correct).length;
  const byMode = (Object.keys(MODE_INFO) as RemixMode[]).map((m) => { const x = rows.filter((r) => r.q.remix.mode === m); return { mode: m, name: MODE_INFO[m].name, n: x.length, pct: pct(x.filter((r) => r.a.correct).length, x.length) }; }).filter((m) => m.n);
  // for each original missed before its first remix was answered: did the student get that remix right?
  const missedAt = new Map<string, number>();
  for (const a of attempts) if (!a.abandoned && !a.qid.startsWith('gx-') && !a.correct && !missedAt.has(a.qid)) missedAt.set(a.qid, a.at);
  const firstRemix = new Map<string, Attempt>();
  for (const r of rows.sort((x, y) => x.a.at - y.a.at)) { const o = r.q.remix.originId; const m = missedAt.get(o); if (m !== undefined && r.a.at > m && !firstRemix.has(o)) firstRemix.set(o, r.a); }
  return {
    n: rows.length, correct, pct: pct(correct, rows.length), originals: new Set(rows.map((r) => r.q.remix.originId)).size, byMode,
    afterMiss: { n: firstRemix.size, fixed: [...firstRemix.values()].filter((a) => a.correct).length },
  };
}
