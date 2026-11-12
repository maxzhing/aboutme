import type { AppState } from './types';
import { QUESTIONS } from '@/data/questions';
import { LESSONS } from '@/data/lessons';
import { GRAMMAR } from '@/data/grammar';
import { REFERENCE } from '@/data/reference';
import { VOCAB } from '@/data/vocabulary';
import { DESMOS_LESSONS } from '@/data/desmos';
import { RESOURCES } from '@/data/resources';
import { DIFFICULTY_NAME, SKILL, SKILLS } from './taxonomy';
import { plain } from './richtext';

export interface SearchHit { kind: 'Question' | 'Lesson' | 'Topic' | 'Grammar rule' | 'Formula' | 'Vocabulary' | 'Mistake' | 'Note' | 'Desmos' | 'Official resource'; title: string; snippet: string; href: string; score: number }

interface Doc { kind: SearchHit['kind']; title: string; body: string; href: string; boost?: number }
let STATIC: Doc[] | null = null;

function staticDocs(): Doc[] {
  if (STATIC) return STATIC;
  const d: Doc[] = [];
  for (const q of QUESTIONS) d.push({ kind: 'Question', title: `${SKILL[q.skill].short} · ${DIFFICULTY_NAME[q.difficulty]} · ${q.sub}`, body: plain(`${q.passage ?? ''} ${(q.notes ?? []).join(' ')} ${q.stem} ${q.concept}`), href: `/practice/session?mode=single&ids=${q.id}` });
  for (const l of LESSONS) d.push({ kind: 'Lesson', title: SKILL[l.skill].name, body: plain(`${l.intro} ${l.detail.join(' ')} ${l.rules.join(' ')}`), href: `/learn/${l.skill}`, boost: 2 });
  for (const s of SKILLS) for (const t of s.topics) d.push({ kind: 'Topic', title: t, body: `${s.name} ${t}`, href: `/learn/${s.id}`, boost: 1.5 });
  for (const g of GRAMMAR) d.push({ kind: 'Grammar rule', title: g.title, body: `${g.rule} ${g.why} ${g.trap} ${g.subs.join(' ')}`, href: `/grammar#${g.id}`, boost: 1.5 });
  for (const e of REFERENCE) d.push({ kind: 'Formula', title: e.title, body: plain(`${e.cat} ${e.body}`), href: `/reference#${e.id}`, boost: 1.5 });
  for (const v of VOCAB) d.push({ kind: 'Vocabulary', title: v.w, body: `${v.def} ${v.syn.join(' ')}`, href: `/vocabulary?word=${v.w}` });
  for (const l of DESMOS_LESSONS) d.push({ kind: 'Desmos', title: l.title, body: `${l.goal} ${l.teach.join(' ')}`, href: `/desmos#${l.id}` });
  for (const r of RESOURCES) d.push({ kind: 'Official resource', title: r.name, body: `${r.provider} ${r.domain ?? ''} ${r.opens}`, href: '/resources' });
  return (STATIC = d);
}

/** Smart search across questions, lessons, topics, rules, formulas, words, mistakes and notes. */
export function search(query: string, state: Pick<AppState, 'notes' | 'mistakes'>, limit = 40): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).map((t) => t.replace(/[^a-z0-9'-]/g, '')).filter((t) => t.length > 1);
  if (!terms.length) return [];
  const docs: Doc[] = [...staticDocs()];
  for (const n of state.notes) docs.push({ kind: 'Note', title: n.title, body: n.body, href: `/notes?id=${n.id}`, boost: 2 });
  const missed = new Set(Object.keys(state.mistakes));
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const t = doc.title.toLowerCase(), b = doc.body.toLowerCase();
    let score = 0, all = true;
    for (const term of terms) {
      const inT = t.includes(term), inB = b.includes(term);
      if (!inT && !inB) { all = false; break; }
      score += (inT ? 4 : 0) + (inB ? 1 : 0) + (t === term ? 6 : 0);
    }
    if (!all) continue;
    const isMistake = doc.kind === 'Question' && missed.has(doc.href.split('ids=')[1]);
    const at = b.indexOf(terms[0]);
    const snippet = at >= 0 ? `${at > 40 ? '…' : ''}${doc.body.slice(Math.max(0, at - 40), at + 110).trim()}…` : doc.body.slice(0, 140);
    hits.push({ kind: isMistake ? 'Mistake' : doc.kind, title: doc.title, snippet, href: doc.href, score: score * (doc.boost ?? 1) + (isMistake ? 2 : 0) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
