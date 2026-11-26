import { it } from 'vitest';
import { QUESTIONS } from '@/data/questions';
import { SKILL } from '@/lib/taxonomy';
it('rw', () => {
  const rw = QUESTIONS.filter((q) => q.section === 'rw');
  const genre = (q: (typeof rw)[number]) => {
    const t = `${q.passage ?? ''} ${(q.notes ?? []).join(' ')}`.toLowerCase();
    if (/text 1|text 2/.test(t)) return 'paired';
    if (q.notes?.length) return 'notes';
    if (q.figure || /table|graph|figure|percent|%/.test(t) && q.skill === 'coeq') return 'data';
    if (/poem|novel|story|play\b|character|narrator|"[^"]{20,}"|’s (?:novel|poem)|wrote in|\bstanza/.test(t)) return 'literature';
    if (/\b1[6-9]\d\d\b|histor|century|senator|president|colonial|war\b|empire|ancient/.test(t)) return 'history';
    if (/econom|sociolog|psycholog|survey|participants|political|anthropolog|voters|labor/.test(t)) return 'social';
    if (/research|scientist|biolog|chemist|physic|species|cells|ecolog|astronom|geolog|study|experiment|fossil|molecul/.test(t)) return 'science';
    return 'other';
  };
  const m = new Map<string, number>();
  for (const q of rw) { const k = `${SKILL[q.skill].domain}|${genre(q)}`; m.set(k, (m.get(k) ?? 0) + 1); }
  console.log('RW total', rw.length);
  const gs = ['science', 'social', 'history', 'literature', 'paired', 'data', 'notes', 'other'];
  for (const d of ['ii', 'cs', 'eoi', 'sec']) console.log(d, gs.map((g) => `${g}:${m.get(`${d}|${g}`) ?? 0}`).join(' '));
  const bySkill = new Map<string, number>(); for (const q of rw) bySkill.set(q.skill, (bySkill.get(q.skill) ?? 0) + 1);
  console.log([...bySkill].map(([k, v]) => `${k}:${v}`).join(' '));
  console.log('with figure', rw.filter((q) => q.figure).length, 'paired', rw.filter((q) => /Text 1/.test(q.passage ?? '')).length);
});
