import { uid } from '../util';
import { MAX_CHAIN } from './engine';
import { emptyRemix, type RemixChain, type RemixQuestion, type RemixState, type ReviewStatus } from './types';

/**
 * Pure updates to Remix Studio's saved state. Generated questions are kept while anything still points at
 * them (a saved chain, the student's saved questions, the Mistake Bucket, spaced review); unsaved chains
 * beyond the most recent KEEP_CHAINS are pruned so storage stays small.
 */
export const KEEP_CHAINS = 30;
export const MAX_ITEMS = 400;

export function newChain(st: RemixState, originId: string, now: number): { state: RemixState; id: string } {
  const id = `rc-${uid()}`;
  const chain: RemixChain = { id, originId, steps: [], createdAt: now, updatedAt: now };
  return { state: { ...st, chains: { ...st.chains, [id]: chain } }, id };
}
export function addItem(st: RemixState, q: RemixQuestion, now: number): { state: RemixState; ok: boolean; reason?: string } {
  const chain = st.chains[q.remix.chainId] ?? { id: q.remix.chainId, originId: q.remix.originId, steps: [], createdAt: now, updatedAt: now };
  if (chain.steps.length >= MAX_CHAIN) return { state: st, ok: false, reason: `A chain holds at most ${MAX_CHAIN} variations. Start a new chain from the original to keep going.` };
  const steps = chain.steps.includes(q.id) ? chain.steps : [...chain.steps, q.id];
  return { state: { ...st, items: { ...st.items, [q.id]: q }, chains: { ...st.chains, [chain.id]: { ...chain, steps, updatedAt: now } } }, ok: true };
}
export function review(st: RemixState, id: string, status: ReviewStatus, note: string, flags: string[], now: number): RemixState {
  const q = st.items[id];
  if (!q) return st;
  // a reviewer's decision is recorded next to the question; the question's content is never altered
  return { ...st, items: { ...st.items, [id]: { ...q, remix: { ...q.remix, status, review: { at: now, note, flags } } } } };
}
export const setChainSaved = (st: RemixState, id: string, saved: boolean): RemixState => (st.chains[id] ? { ...st, chains: { ...st.chains, [id]: { ...st.chains[id], saved } } } : st);
export function deleteChain(st: RemixState, id: string, referenced: Set<string>): RemixState {
  const chain = st.chains[id];
  if (!chain) return st;
  const chains = { ...st.chains };
  delete chains[id];
  const inOther = new Set(Object.values(chains).flatMap((c) => c.steps));
  const items = { ...st.items };
  for (const qid of chain.steps) if (!referenced.has(qid) && !inOther.has(qid)) delete items[qid];
  return { ...st, items, chains };
}
/** Drops old unsaved chains and any generated question nothing refers to any more. */
export function prune(st: RemixState, referenced: Set<string>): RemixState {
  const chains = Object.values(st.chains).sort((a, b) => b.updatedAt - a.updatedAt);
  const keepChains = chains.filter((c, i) => c.saved || i < KEEP_CHAINS || c.steps.some((q) => referenced.has(q)));
  const live = new Set([...keepChains.flatMap((c) => c.steps), ...[...referenced].filter((id) => id.startsWith('gx-'))]);
  let items = Object.values(st.items).filter((q) => live.has(q.id));
  if (items.length > MAX_ITEMS) {
    const must = (q: RemixQuestion) => referenced.has(q.id) || keepChains.some((c) => c.saved && c.steps.includes(q.id));
    items = [...items.filter(must), ...items.filter((q) => !must(q)).sort((a, b) => b.remix.createdAt - a.remix.createdAt)].slice(0, MAX_ITEMS);
  }
  const kept = new Set(items.map((q) => q.id));
  return { v: 1, items: Object.fromEntries(items.map((q) => [q.id, q])), chains: Object.fromEntries(keepChains.map((c) => [c.id, { ...c, steps: c.steps.filter((s) => kept.has(s)) }])) };
}

/** Accepts saved or imported Remix data only if it has the expected shape; anything malformed is dropped. */
export function sanitize(raw: unknown): RemixState {
  if (!raw || typeof raw !== 'object' || (raw as { v?: unknown }).v !== 1) return emptyRemix();
  const r = raw as { items?: Record<string, unknown>; chains?: Record<string, unknown> };
  const items: Record<string, RemixQuestion> = {};
  for (const [id, q] of Object.entries(r.items ?? {})) {
    const x = q as RemixQuestion;
    if (id.startsWith('gx-') && x && x.id === id && typeof x.stem === 'string' && Array.isArray(x.steps) && x.remix && typeof x.remix.originId === 'string' && x.remix.validation) items[id] = x;
  }
  const chains: Record<string, RemixChain> = {};
  for (const [id, c] of Object.entries(r.chains ?? {})) {
    const x = c as RemixChain;
    if (x && x.id === id && typeof x.originId === 'string' && Array.isArray(x.steps)) chains[id] = { ...x, steps: x.steps.filter((s) => !!items[s]).slice(0, MAX_CHAIN) };
  }
  return { v: 1, items, chains };
}
