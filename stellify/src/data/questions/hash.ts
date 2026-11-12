import type { RawQuestion } from '@/lib/types';

/** Stable content hash; a question edited after validation no longer matches the manifest. */
export function contentHash(q: RawQuestion): string {
  const s = JSON.stringify([q.id, q.skill, q.sub, q.d, q.passage, q.notes, q.figure, q.stem, q.choices, q.answer, q.steps, q.why, q.concept, q.strategy, q.trap, q.remember, q.desmos, q.alt]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
