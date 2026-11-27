/**
 * Questions rewritten to the Stellify question standard (standard.ts), skill by skill. A rewritten question keeps
 * its id and replaces the earlier version in place, so the bank's order, practice tests and history are unchanged.
 */
import type { RawQuestion } from '@/lib/types';
import { SYS_PATCHES, SYS_STD } from './sys';
import { COET_RESEARCH } from './coet-research';
import { COET_LIT } from './coet-lit';

const strip = ({ tags: _t, ...q }: RawQuestion & { tags?: unknown }): RawQuestion => q;

const FULL: RawQuestion[] = [...SYS_STD, ...[...COET_RESEARCH, ...COET_LIT].map(strip)];
const PATCHES: (Partial<RawQuestion> & { id: string })[] = [...SYS_PATCHES];

const fullById = new Map(FULL.map((q) => [q.id, q]));
const patchById = new Map(PATCHES.map((p) => [p.id, p]));

/** The standard version of a question, if it has been rewritten or reviewed; otherwise the question itself. */
export function toStandard(q: RawQuestion): RawQuestion {
  const full = fullById.get(q.id);
  if (full) return full;
  const patch = patchById.get(q.id);
  return patch ? { ...q, ...patch, meta: { ...q.meta, ...patch.meta } } : q;
}
/** Every id the standard rewrites or reviews (for checks that each one exists in the bank). */
export const STANDARD_IDS = [...fullById.keys(), ...patchById.keys()];
