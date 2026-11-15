import { del, get, set } from 'idb-keyval';
import { create } from 'zustand';
import type { PackItem } from '@/data/pack';
import { registerOfficial, unregisterImported } from '@/data/questions';

/**
 * Official College Board questions the student imports in the app. They are stored only in this
 * browser (IndexedDB), never in the file itself and never sent anywhere.
 */
const KEY = 'stellify-official-v1';
export const useOfficial = create<{ v: number; imported: number }>(() => ({ v: 0, imported: 0 }));
const bump = (imported: number) => useOfficial.setState((s) => ({ v: s.v + 1, imported }));

export async function loadImported() {
  try { const items = (await get<PackItem[]>(KEY)) ?? []; registerOfficial(items); bump(items.length); } catch { /* storage unavailable: nothing imported */ }
}
export async function saveImported(items: PackItem[]): Promise<{ added: number; total: number }> {
  const cur = ((await get<PackItem[]>(KEY).catch(() => undefined)) ?? []) as PackItem[];
  const have = new Set(cur.map((x) => x.id));
  const fresh = items.filter((x) => !have.has(x.id));
  const added = registerOfficial(fresh);
  const all = [...cur, ...fresh];
  try { await set(KEY, all); } catch { /* still usable for this visit */ }
  bump(all.length);
  return { added, total: all.length };
}
export async function clearImported() {
  const cur = ((await get<PackItem[]>(KEY).catch(() => undefined)) ?? []) as PackItem[];
  unregisterImported(cur.map((x) => x.id));
  try { await del(KEY); } catch { /* ignore */ }
  bump(0);
}
