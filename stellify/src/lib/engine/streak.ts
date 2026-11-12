import type { DayActivity } from '../types';
import { addDays, dateKey, parseDateKey } from '../util';

const active = (a?: DayActivity) => !!a && (a.questions > 0 || a.lessons > 0);

/**
 * Study streak. Planned rest days never break a streak, and a missed day is not framed as a
 * failure: the best streak is always kept and a new one can start any time.
 */
export function computeStreak(activity: Record<string, DayActivity>, restDays: number[], today = dateKey()) {
  const isRest = (k: string) => restDays.includes(new Date(parseDateKey(k)).getDay());
  let current = 0;
  let k = today;
  if (!active(activity[k])) k = addDays(k, -1); // today still in progress
  for (let guard = 0; guard < 3650; guard++) {
    if (active(activity[k])) current++;
    else if (!isRest(k)) break;
    k = addDays(k, -1);
  }
  const keys = Object.keys(activity).filter((d) => active(activity[d])).sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of keys) {
    if (prev === null) run = 1;
    else {
      let gapOk = true;
      for (let g = addDays(prev, 1); g < d; g = addDays(g, 1)) if (!isRest(g)) { gapOk = false; break; }
      run = gapOk ? run + 1 : 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), studiedToday: active(activity[today]) };
}
