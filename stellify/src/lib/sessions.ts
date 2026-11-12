import type { AppState, Difficulty, DomainId, PracticeMode, Question, Section, SkillId } from './types';
import { SECTION_NAME, SKILL } from './taxonomy';
import { dateKey, rng, shuffle } from './util';
import { pickSmartSet } from './engine/adaptive';
import { dueIds } from './engine/srs';

export interface BuiltSession { qids: string[]; title: string; mode: PracticeMode; reasons?: Record<string, string>; empty?: string }
export type Params = Record<string, string | undefined>;

const DIFF_OK = new Set(['medium', 'hard', 'very-hard', 'elite']);
const parseDiff = (s?: string) => (s ? (s.split(',').filter((d) => DIFF_OK.has(d)) as Difficulty[]) : []);

export interface BankFilter { section?: Section; domain?: DomainId; skill?: SkillId; diff?: Difficulty[]; type?: 'mcq' | 'spr'; status?: 'unseen' | 'wrong' | 'correct' | 'saved'; text?: string }

export function filterBank(bank: Question[], f: BankFilter, s: Pick<AppState, 'attempts' | 'saved'>): Question[] {
  const last = new Map<string, boolean>();
  for (const a of s.attempts) if (!a.abandoned) last.set(a.qid, a.correct);
  const t = f.text?.trim().toLowerCase();
  return bank.filter((q) =>
    (!f.section || q.section === f.section) && (!f.domain || q.domain === f.domain) && (!f.skill || q.skill === f.skill) &&
    (!f.diff?.length || f.diff.includes(q.difficulty)) && (!f.type || q.type === f.type) &&
    (!f.status || (f.status === 'unseen' ? !last.has(q.id) : f.status === 'wrong' ? last.get(q.id) === false : f.status === 'correct' ? last.get(q.id) === true : s.saved.includes(q.id))) &&
    (!t || `${q.stem} ${q.passage ?? ''} ${q.sub} ${q.id}`.toLowerCase().includes(t)));
}

/** Turns URL parameters into a concrete list of questions. Pure, so it can be unit tested. */
export function buildSession(p: Params, s: AppState, bank: Question[], getQ: (id: string) => Question | undefined, now: number): BuiltSession {
  const n = Math.max(1, Math.min(40, Number(p.n) || 10));
  const section = p.section === 'math' || p.section === 'rw' ? p.section : undefined;
  const skill = p.skill && SKILL[p.skill as SkillId] ? (p.skill as SkillId) : undefined;
  const rand = rng(`${p.mode}-${now}`);
  const lastCorrect = new Map<string, boolean>();
  for (const a of s.attempts) if (!a.abandoned) lastCorrect.set(a.qid, a.correct);
  const unseenFirst = (qs: Question[]) => shuffle(qs, rand).sort((a, b) => Number(lastCorrect.has(a.id)) - Number(lastCorrect.has(b.id)) || Number(lastCorrect.get(a.id) ?? false) - Number(lastCorrect.get(b.id) ?? false));

  switch (p.mode) {
    case 'single': case 'custom': {
      const ids = (p.ids ?? '').split(',').filter((id) => getQ(id));
      return { qids: ids, mode: 'bank', title: ids.length === 1 ? 'Single question' : 'Custom set' };
    }
    case 'skill': case 'lesson': {
      if (!skill) break;
      const diff = parseDiff(p.diff);
      const pool = bank.filter((q) => q.skill === skill && (!diff.length || diff.includes(q.difficulty)));
      if (diff.length) return { qids: unseenFirst(pool).slice(0, n).map((q) => q.id), mode: p.mode === 'lesson' ? 'lesson' : 'bank', title: `${SKILL[skill].short}${diff.length === 1 ? ` · ${diff[0].replace('-', ' ')}` : ''}` };
      const picks = pickSmartSet(s, bank, getQ, n, now, { skill });
      return { qids: picks.map((x) => x.qid), mode: 'smart', title: SKILL[skill].short, reasons: Object.fromEntries(picks.map((x) => [x.qid, x.reason])) };
    }
    case 'hard': {
      const pool = bank.filter((q) => (q.difficulty === 'very-hard' || q.difficulty === 'elite') && (!section || q.section === section));
      return { qids: unseenFirst(pool).slice(0, n).map((q) => q.id), mode: 'hard', title: `Hardest questions${section ? ` · ${SECTION_NAME[section]}` : ''}` };
    }
    case 'mistakes': {
      const open = Object.values(s.mistakes).filter((m) => m.status === 'unresolved').sort((a, b) => b.count - a.count || a.lastAt - b.lastAt);
      const only = p.ids ? new Set(p.ids.split(',')) : null;
      const qids: string[] = [];
      const reasons: Record<string, string> = {};
      for (const m of open) {
        if (only && !only.has(m.qid)) continue;
        const mq = getQ(m.qid);
        if (!mq || qids.length >= n) continue;
        if (!m.redoCorrect && !qids.includes(m.qid)) { qids.push(m.qid); reasons[m.qid] = `You missed this ${m.count > 1 ? `${m.count} times` : 'before'}. Answer it correctly without hints to clear the redo step.`; }
        const need = Math.max(0, 2 - m.relatedCorrect.length);
        const related = unseenFirst(bank.filter((q) => q.skill === mq.skill && q.id !== m.qid && !m.relatedCorrect.includes(q.id) && !qids.includes(q.id) && !s.mistakes[q.id])).slice(0, need);
        for (const r of related) { if (qids.length < n + 2) { qids.push(r.id); reasons[r.id] = `New related practice for a ${SKILL[mq.skill].short} mistake.`; } }
      }
      return { qids, mode: 'mistakes', title: 'Mistake review', reasons, empty: 'No unresolved mistakes. Every miss you make is saved here automatically.' };
    }
    case 'review': {
      const due = dueIds(s.srs, now).filter((id) => getQ(id)).slice(0, n);
      return { qids: due, mode: 'review', title: 'Spaced review', reasons: Object.fromEntries(due.map((id) => [id, 'Scheduled review: this question is due to come back today.'])), empty: 'Nothing is due for review right now. Questions you miss come back here at growing intervals.' };
    }
    case 'saved':
      return { qids: s.saved.filter((id) => getQ(id)), mode: 'bank', title: 'Saved questions', empty: 'You have not saved any questions yet. Use the bookmark icon on a question.' };
    case 'bank': {
      const pool = filterBank(bank, { section, domain: p.domain as DomainId | undefined, skill, diff: parseDiff(p.diff), type: p.type as 'mcq' | 'spr' | undefined, status: p.status as BankFilter['status'] }, s);
      return { qids: unseenFirst(pool).slice(0, n).map((q) => q.id), mode: 'bank', title: 'Question bank set' };
    }
    default: break;
  }
  const picks = pickSmartSet(s, bank, getQ, n, now, { section, skill });
  return { qids: picks.map((x) => x.qid), mode: p.mode === 'mission' ? 'mission' : 'smart', title: `Smart practice${section ? ` · ${SECTION_NAME[section]}` : ''}`, reasons: Object.fromEntries(picks.map((x) => [x.qid, x.reason])) };
}

/** The same challenging question for everyone on a given calendar day. */
export function dailyQuestion(bank: Question[], day = dateKey()): Question {
  const pool = bank.filter((q) => q.difficulty === 'very-hard' || q.difficulty === 'elite');
  return pool[Math.floor(rng(`daily-${day}`)() * pool.length)];
}

/** Twelve math and twelve reading & writing questions covering every domain at mixed difficulty. */
export function diagnosticSet(bank: Question[]): string[] {
  const rand = rng('stellify-diagnostic-v1');
  const plan: [SkillId, Difficulty][] = [
    ['wic', 'medium'], ['wic', 'hard'], ['tsp', 'hard'], ['ctc', 'hard'], ['cid', 'medium'], ['coet', 'hard'], ['coeq', 'hard'], ['inf', 'very-hard'],
    ['bnd', 'medium'], ['bnd', 'hard'], ['fss', 'hard'], ['fss', 'very-hard'], ['tra', 'hard'], ['syn', 'hard'],
    ['lin1', 'medium'], ['linf', 'hard'], ['sys', 'hard'], ['ineq', 'hard'], ['equiv', 'hard'], ['nleq', 'hard'], ['nleq', 'very-hard'], ['nlf', 'hard'], ['nlf', 'very-hard'],
    ['pct', 'hard'], ['data1', 'hard'], ['prob', 'hard'], ['area', 'hard'], ['trig', 'hard'],
  ];
  const used = new Set<string>();
  const out: string[] = [];
  for (const [skill, d] of plan) {
    const q = shuffle(bank.filter((x) => x.skill === skill && x.difficulty === d && !used.has(x.id)), rand)[0] ?? shuffle(bank.filter((x) => x.skill === skill && !used.has(x.id)), rand)[0];
    if (q) { used.add(q.id); out.push(q.id); }
  }
  return out;
}
