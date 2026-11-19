import type { AppState, Question } from '../types';
import { FLAGS } from '../flags';
import { uid } from '../util';
import { cleanEvents, deriveEvents, deviceClass, type CleaningReport, type ItemEvent } from './events';

/** The anonymous item-data file a student (or teacher) can save and give to a maintainer. No names, no profile. */
export interface ItemExport { app: 'stellify-items'; schema: 1; exportedAt: string; person: string; events: ItemEvent[]; cleaning: CleaningReport }

export function itemExport(s: Pick<AppState, 'attempts' | 'mocks'>, getQ: (id: string) => Question | undefined, width?: number): ItemExport {
  // a fresh random id per file: files can be pooled, but they cannot be linked to each other or to a person
  const person = `p-${uid()}`;
  const { events, report } = cleanEvents(deriveEvents(s, getQ, { person, device: deviceClass(width) }));
  return { app: 'stellify-items', schema: 1, exportedAt: new Date().toISOString(), person, events, cleaning: report };
}

export function isItemExport(x: unknown): x is ItemExport {
  const o = x as ItemExport;
  return !!o && o.app === 'stellify-items' && o.schema === 1 && Array.isArray(o.events);
}

/**
 * Option A (anonymous submission) is designed but switched off: this never sends anything unless the build turns
 * FLAGS.collect on, configures an endpoint, AND the student has said yes in plain words. None of that is true here.
 */
export async function submitItemData(consent: boolean, data: ItemExport): Promise<{ sent: false; reason: string } | { sent: true }> {
  if (!FLAGS.collect) return { sent: false, reason: 'Collection is switched off in this version of Stellify.' };
  if (!FLAGS.collectEndpoint) return { sent: false, reason: 'No endpoint is configured.' };
  if (!consent) return { sent: false, reason: 'You have not agreed to share anonymous data.' };
  const r = await fetch(FLAGS.collectEndpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, person: undefined }) });
  return r.ok ? { sent: true } : { sent: false, reason: `The server said ${r.status}.` };
}
