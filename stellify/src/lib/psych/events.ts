import type { AppState, Question, SkillId } from '../types';
import { countsForStudent } from '@/data/itemLifecycle';

/**
 * One row per FIRST attempt at an item (the brief's event schema). Derived from saved attempts and mock modules,
 * never stored twice. `person` is a random id for pooling exports; it is not tied to a name or a device.
 */
export interface ItemEvent {
  item_id: string;
  person: string;
  session_id: string;
  chosen_option: string | null;
  correct: boolean;
  time_ms: number;
  position_in_session: number;
  context: 'practice' | 'module1' | 'module2';
  skill_id: SkillId;
  device_class: 'phone' | 'tablet' | 'desktop' | 'unknown';
  timestamp: number;
  hints: number;
  abandoned: boolean;
}

export const deviceClass = (width?: number): ItemEvent['device_class'] => (!width ? 'unknown' : width < 640 ? 'phone' : width < 1024 ? 'tablet' : 'desktop');

export function deriveEvents(s: Pick<AppState, 'attempts' | 'mocks'>, getQ: (id: string) => Question | undefined, o: { person: string; device: ItemEvent['device_class'] }): ItemEvent[] {
  const where = new Map<string, { context: ItemEvent['context']; position: number }>();
  for (const m of s.mocks) for (const mod of m.modules) mod.qids.forEach((qid, i) => where.set(`${m.id}|${qid}`, { context: mod.module === 1 ? 'module1' : 'module2', position: i + 1 }));
  const pos = new Map<string, number>();
  const seen = new Set<string>();
  const out: ItemEvent[] = [];
  for (const a of s.attempts) {
    const n = (pos.get(a.sessionId) ?? 0) + 1;
    pos.set(a.sessionId, n);
    if (seen.has(a.qid)) continue;
    seen.add(a.qid);
    const q = getQ(a.qid);
    if (!q || q.official || (q as Question & { remix?: unknown }).remix) continue; // only Stellify's own bank items are analysed
    const w = where.get(`${a.sessionId}|${a.qid}`);
    out.push({ item_id: a.qid, person: o.person, session_id: a.sessionId, chosen_option: a.answer, correct: a.correct, time_ms: a.ms, position_in_session: w?.position ?? n,
      context: w?.context ?? 'practice', skill_id: q.skill, device_class: o.device, timestamp: a.at, hints: a.hints, abandoned: !!a.abandoned });
  }
  return out;
}

export interface CleaningReport { kept: number; rapid: number; abandoned: number; hinted: number; notCounted: number }
/**
 * Cleaning rules (METHODOLOGY.md): drop rapid guesses (under 3 s, or under 10% of the item's median time when
 * the item has 10+ responses), abandoned attempts, answers that used hints (not independent), and items that
 * do not count (pretest, draft, retired). Repeats are already gone: events hold first attempts only.
 */
export function cleanEvents(events: ItemEvent[]): { events: ItemEvent[]; report: CleaningReport } {
  const times = new Map<string, number[]>();
  for (const e of events) times.set(e.item_id, [...(times.get(e.item_id) ?? []), e.time_ms]);
  const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const med = new Map([...times].filter(([, xs]) => xs.length >= 10).map(([k, xs]) => [k, median(xs)]));
  const report: CleaningReport = { kept: 0, rapid: 0, abandoned: 0, hinted: 0, notCounted: 0 };
  const kept = events.filter((e) => {
    if (e.abandoned) { report.abandoned++; return false; }
    if (!countsForStudent(e.item_id)) { report.notCounted++; return false; }
    if (e.time_ms < 3000 || (med.has(e.item_id) && e.time_ms < 0.1 * med.get(e.item_id)!)) { report.rapid++; return false; }
    if (e.hints > 0) { report.hinted++; return false; }
    return true;
  });
  report.kept = kept.length;
  return { events: kept, report };
}
