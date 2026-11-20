import type { Question, RawQuestion } from '@/lib/types';

/** The College Board's four Reading & Writing passage subject areas. */
export type Genre = 'literature' | 'history-social' | 'humanities' | 'science';
export const GENRE_NAME: Record<Genre, string> = { literature: 'Literature', 'history-social': 'History / social studies', humanities: 'Humanities', science: 'Science' };
/** Passage formats tracked alongside the subject area. */
export type Format = 'single' | 'paired' | 'data' | 'notes';

/**
 * Passages a person tagged by hand (the keyword rules below could not place them, or placed them wrongly).
 * Everything else uses keyword rules; a random spot check of 24 found 3 wrong (about 85–90% right), so
 * coverage counts built on them are approximate.
 */
export const GENRE_TAGS: Record<string, Genre> = {
  'r-bnd-n47': 'history-social', 'r-bnd-n49': 'science',
  'r-fss-n44': 'history-social',
  'r-wic-n32': 'history-social', 'r-tra-n34': 'science', 'r-fss-n45': 'history-social',
  'r-wic-n29': 'history-social',
  'r-ctc-n27': 'science', 'r-bnd-n39': 'science', 'r-fss-n39': 'history-social',
  'r-tra-n31': 'science',
  'r-cid-n17': 'humanities', 'r-wic-n26': 'science', 'r-syn-n25': 'history-social', 'r-bnd-n35': 'literature',
  'r-tra-n28': 'humanities', 'r-tra-n29': 'history-social', 'r-bnd-n36': 'science', 'r-bnd-n37': 'history-social', 'r-fss-n36': 'science', 'r-fss-n37': 'history-social',
  'r-coeq-n16': 'history-social',
  'r-wic-n23': 'science', 'r-fss-n34': 'history-social',
  'r-bnd-n29': 'humanities',
  'r-wic-n22': 'science',
  'r-bnd-n28': 'humanities', 'r-fss-n28': 'science',
  'r-tsp-n15': 'humanities',
  'r-wic-n18': 'science', 'r-tra-n20': 'history-social', 'r-syn-n17': 'science', 'r-fss-n25': 'history-social',
  'r-wic-n16': 'history-social', 'r-tra-n18': 'science', 'r-bnd-n21': 'history-social',
  'r-bnd-n18': 'history-social',
  'r-cid-n11': 'humanities', 'r-wic-n13': 'science', 'r-tra-n17': 'science', 'r-syn-n13': 'science', 'r-bnd-n17': 'history-social', 'r-fss-n18': 'history-social',
  'r-syn-n11': 'history-social', 'r-syn-n12': 'science', 'r-bnd-n16': 'history-social', 'r-fss-n14': 'history-social',
  'r-wic-n3': 'history-social', 'r-wic-n5': 'science', 'r-bnd-n5': 'science', 'r-fss-n3': 'history-social',
  'r-bnd-n9': 'humanities', 'r-tra-n8': 'science', 'r-wic-n9': 'history-social', 'r-fss-n12': 'science',
  'r-coeq-n5': 'history-social', 'r-coeq-n6': 'science', 'r-wic-n7': 'science', 'r-syn-n6': 'science',
  'r-syn-n1': 'science', 'r-bnd-n2': 'history-social', 'r-bnd-n3': 'science', 'r-fss-n2': 'science',
  'r-coet-02': 'literature',
  'r-coeq-02': 'history-social',
  'r-inf-09': 'history-social',
  'r-wic-01': 'history-social',
  'r-wic-02': 'science',
  'r-wic-07': 'history-social',
  'r-wic-09': 'science',
  'r-wic-13': 'history-social',
  'r-wic-16': 'science',
  'r-tsp-08': 'science',
  'r-tra-05': 'history-social',
  'r-tra-06': 'science',
  'r-tra-08': 'science',
  'r-tra-11': 'history-social',
  'r-tra-13': 'science',
  'r-tra-15': 'history-social',
  'r-syn-02': 'humanities',
  'r-syn-05': 'humanities',
  'r-syn-09': 'science',
  'r-bnd-02': 'science',
  'r-bnd-13': 'humanities',
  'r-fss-02': 'science',
  'r-fss-03': 'science',
  'r-fss-09': 'history-social',
  'r-fss-11': 'science',
  'r-fss-20': 'history-social',
  'r-x-tra-01': 'science',
  'r-x-bnd-01': 'history-social',
  'r-cb-bnd-01': 'science',
  'r-cb-fss-02': 'science',
  'r-cb-fss-05': 'history-social',
  'r-cb-coet-04': 'humanities',
  'r-cb-inf-03': 'history-social',
  'r-cb-cid-01': 'humanities',
  'r-c-coeq-02': 'science',
  'r-c-tra-01': 'science',
  'r-s-wic-04': 'history-social',
  'r-s-syn-06': 'history-social',
  'r-s-tra-01': 'science',
  // corrected after a random spot check of 24 automatic tags (3 were wrong)
  'r-x-tra-02': 'literature',
  'r-cb-coet-02': 'history-social',
  'r-c-syn-01': 'science',
  // breadth set
  'r-br-tra-01': 'literature', 'r-br-tra-02': 'literature', 'r-br-tra-03': 'humanities', 'r-br-tra-04': 'history-social',
  'r-br-syn-01': 'literature', 'r-br-syn-02': 'humanities', 'r-br-bnd-01': 'literature', 'r-br-bnd-02': 'literature',
  'r-br-fss-01': 'literature', 'r-br-fss-02': 'history-social', 'r-br-coeq-01': 'humanities', 'r-br-coet-01': 'literature', 'r-br-ctc-01': 'literature',
};

const RULES: [Genre, RegExp][] = [
  ['literature', /\b(poem|poet|poetry|novel|novelist|short story|stanza|narrator|playwright|character|fiction|memoir|verse)\b/i],
  ['humanities', /\b(paint|painter|painting|artist|sculpt|museum|music|musician|composer|song|dance|film|architect|architecture|philosoph|language|linguist|dialect|theater|theatre|photograph|design|craft|art historian|literary)\w*/i],
  ['history-social', /\b(histor|century|centuries|ancient|empire|colonial|war|senator|president|congress|government|econom|sociolog|psycholog|survey|participants|voters|political|anthropolog|archaeolog|labor|market|policy|city|cities|urban|community|communities|students|consumers|households)\w*/i],
  ['science', /\b(scien|biolog|chemi|physic|species|cell|ecolog|astronom|geolog|fossil|molecul|bacteria|plant|animal|ocean|climate|genet|protein|neuro|planet|star|galax|mineral|insect|bird|fish|frog|bee|whale|forest|soil|experiment|researchers)\w*/i],
];

export function formatOf(q: Pick<RawQuestion, 'passage' | 'notes' | 'figure' | 'skill'>): Format {
  if (q.notes?.length) return 'notes';
  if (/\bText 1\b/.test(q.passage ?? '')) return 'paired';
  if (q.figure) return 'data';
  return 'single';
}
/** The subject area of a Reading & Writing passage: a hand tag if there is one, else the first matching keyword rule. */
export function genreOf(q: Pick<Question, 'id' | 'passage' | 'notes'> & { genre?: Genre }): Genre | null {
  if (q.genre) return q.genre;
  if (GENRE_TAGS[q.id]) return GENRE_TAGS[q.id];
  const t = `${q.passage ?? ''} ${(q.notes ?? []).join(' ')}`;
  // the area with the most keyword hits wins (ties go to the earlier rule), so one stray word cannot decide
  let best: Genre | null = null, most = 0;
  for (const [g, re] of RULES) { const n = (t.match(new RegExp(re.source, 'gi')) ?? []).length; if (n > most) { most = n; best = g; } }
  return best;
}
