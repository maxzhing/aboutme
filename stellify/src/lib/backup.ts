import { del, get, keys, set } from 'idb-keyval';
import type { AppState } from './types';

/**
 * Automatic backups, kept on this device next to the live data (IndexedDB), so a bad import, an accidental
 * reset or a damaged save can be undone without a file:
 * - one snapshot per day (the latest 7 days are kept), refreshed as you work;
 * - a "safety" snapshot taken right before any import or reset (the latest 3 are kept).
 * They never leave the device and never include the AI key. Clearing the browser's site data removes them
 * too, so exporting a file is still the way to move or truly back up your data.
 */
const PREFIX = 'stellify-auto-backup:';
export interface BackupInfo { key: string; kind: 'daily' | 'safety'; at: number; label: string; attempts: number }
interface Saved { at: number; kind: 'daily' | 'safety'; label: string; state: AppState }

const strip = (s: AppState): AppState => ({ ...s, settings: { ...s.settings, geminiKey: undefined } });

async function prune() {
  const all = (await keys()).map(String).filter((k) => k.startsWith(PREFIX)).sort();
  const daily = all.filter((k) => k.includes(':daily:')), safety = all.filter((k) => k.includes(':safety:'));
  for (const k of [...daily.slice(0, Math.max(0, daily.length - 7)), ...safety.slice(0, Math.max(0, safety.length - 3))]) await del(k);
}

/** Saves today's daily snapshot (overwriting the earlier one from today). Skips an empty profile. */
export async function dailyBackup(state: AppState, now = Date.now()) {
  if (!state.attempts.length && !state.notes.length) return;
  try {
    const day = new Date(now).toISOString().slice(0, 10);
    await set(`${PREFIX}daily:${day}`, JSON.stringify({ at: now, kind: 'daily', label: `End of ${day}`, state: strip(state) } satisfies Saved));
    await prune();
  } catch { /* storage full or unavailable: the live data is unaffected */ }
}
/** Saves a snapshot right before a destructive action (import or reset). */
export async function safetyBackup(state: AppState, reason: string, now = Date.now()) {
  if (!state.attempts.length && !state.notes.length) return;
  try {
    await set(`${PREFIX}safety:${new Date(now).toISOString()}`, JSON.stringify({ at: now, kind: 'safety', label: `Before ${reason}`, state: strip(state) } satisfies Saved));
    await prune();
  } catch { /* ignore */ }
}
export async function listBackups(): Promise<BackupInfo[]> {
  try {
    const out: BackupInfo[] = [];
    for (const k of (await keys()).map(String).filter((x) => x.startsWith(PREFIX))) {
      const raw = await get<string>(k);
      if (!raw) continue;
      const b = JSON.parse(raw) as Saved;
      out.push({ key: k, kind: b.kind, at: b.at, label: b.label, attempts: b.state.attempts.length });
    }
    return out.sort((a, b) => b.at - a.at);
  } catch { return []; }
}
export async function readBackup(key: string): Promise<AppState | null> {
  try { const raw = await get<string>(key); return raw ? (JSON.parse(raw) as Saved).state : null; } catch { return null; }
}

/** Removes every automatic backup on this device: on sign-out, once the progress is safe in the account. */
export async function clearBackups() {
  try { for (const k of (await keys()).map(String).filter((k) => k.startsWith(PREFIX))) await del(k); } catch { /* storage blocked */ }
}
