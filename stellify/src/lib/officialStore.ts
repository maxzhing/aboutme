import { del, get, set } from 'idb-keyval';
import { create } from 'zustand';
import type { PackItem } from '@/data/pack';
import { registerOfficial, unregisterImported } from '@/data/questions';
import { FULL_TESTS, registerFullTests, unregisterFullTests, type FullTest } from './fullTest/registry';

/**
 * Official College Board questions and full practice tests the student imports in the app. They
 * are stored only in this browser (IndexedDB), never in the file itself and never sent anywhere.
 */
const KEY = 'stellify-official-v1';
const TESTS_KEY = 'stellify-fulltests-v1';
export const useOfficial = create<{ v: number; imported: number; tests: number }>(() => ({ v: 0, imported: 0, tests: FULL_TESTS.length }));
const bump = (imported: number) => useOfficial.setState((s) => ({ v: s.v + 1, imported, tests: FULL_TESTS.length }));

export async function loadImported() {
  try {
    const tests = (await get<FullTest[]>(TESTS_KEY)) ?? [];
    registerFullTests(tests);
    const items = (await get<PackItem[]>(KEY)) ?? [];
    registerOfficial(items);
    bump(items.length);
  } catch { /* storage unavailable: nothing imported */ }
}
export async function saveImported(items: PackItem[]): Promise<{ added: number; total: number }> {
  const cur = ((await get<PackItem[]>(KEY).catch(() => undefined)) ?? []) as PackItem[];
  const fresh = items.filter((x) => !cur.some((c) => c.id === x.id));
  const added = registerOfficial(fresh);
  const all = [...cur, ...fresh];
  try { await set(KEY, all); } catch { /* still usable for this visit */ }
  bump(all.length);
  return { added, total: all.length };
}
/** Saves a full practice test: its questions join the official library, its form becomes a test. */
export async function saveFullTest(test: FullTest, items: PackItem[]): Promise<{ added: number; total: number }> {
  const r = await saveImported(items);
  const cur = ((await get<FullTest[]>(TESTS_KEY).catch(() => undefined)) ?? []) as FullTest[];
  const all = [...cur.filter((t) => t.id !== test.id), test];
  registerFullTests([test]);
  try { await set(TESTS_KEY, all); } catch { /* still usable for this visit */ }
  bump(r.total);
  return r;
}
export async function clearImported() {
  const cur = ((await get<PackItem[]>(KEY).catch(() => undefined)) ?? []) as PackItem[];
  unregisterImported(cur.map((x) => x.id));
  const tests = ((await get<FullTest[]>(TESTS_KEY).catch(() => undefined)) ?? []) as FullTest[];
  unregisterFullTests(tests.map((t) => t.id));
  try { await del(KEY); await del(TESTS_KEY); } catch { /* ignore */ }
  bump(0);
}
