import type { MasteryLevel } from '../engine/mastery';
import type { Lever } from '../engine/lever';
import type { AppState, Attempt, Question, Section, SkillId, SrsCard } from '../types';
import { DAY, dateKey, daysBetween } from '../util';
import { PATH, pathOf, type PathSkill } from './skills';
import { deriveStars, type StarStatus } from './stars';

/**
 * The next-step engine (pure and deterministic; tested in tests/path.test.ts).
 *
 * Priority, first match wins:
 *   1. due reviews (at most one 8-card review block a day, so reviews never swamp new learning)
 *   2. confident errors: answers the student was sure of that were wrong (at most 3)
 *   3. an unfinished chapter (some chapters of a skill passed, not all)
 *   4. the highest Score Lever skill whose prerequisites are met (recent mistakes and the test date adjust it)
 *   5. the next skill in curriculum order
 * The format follows the skill: worked examples after 2+ conceptual misses in 14 days; a Gauntlet when the skill
 * is at ★2 or more and due for its retrieval check; otherwise chapters for a new skill, then the practice set,
 * then the hard set. Every step carries a one-line reason in plain words.
 */
export type StepKind = 'review' | 'confident' | 'chapter' | 'worked' | 'practice' | 'hard' | 'check' | 'gauntlet';
export interface Step { kind: StepKind; skill?: SkillId; section?: Section; href: string; title: string; reason: string; minutes: number; priority: 1 | 2 | 3 | 4 | 5 }

export interface EngineInput {
  now: number;
  section?: Section;
  attempts: Attempt[];
  getQ: (id: string) => Question | undefined;
  srs: Record<string, SrsCard>;
  mistakes: AppState['mistakes'];
  chapters: AppState['chapters'];
  /** chapter ids of each skill, in order */
  chapterIds: Partial<Record<SkillId, string[]>>;
  path: NonNullable<AppState['path']>;
  /** worked-example family ids of each skill */
  workedFamilies: Partial<Record<SkillId, string[]>>;
  levels: Record<SkillId, MasteryLevel>;
  /** stars from each skill's 5-minute quick lesson */
  quickStars?: Partial<Record<SkillId, number>>;
  lever: Lever[];
  examDate?: string;
  /** the route's unsecured skills, in order (lib/path/input.ts) */
  priority?: SkillId[];
}

export const REVIEW_CAP = 8;
export const CONFIDENT_CAP = 3;

const inSection = (i: EngineInput, skill: SkillId) => !i.section || PATH[skill].section === i.section;
const today = (i: EngineInput) => dateKey(i.now);

export function skillStars(i: EngineInput, skill: SkillId): StarStatus {
  const ch = i.chapterIds[skill] ?? [];
  const fam = i.workedFamilies[skill] ?? [];
  return deriveStars({
    chaptersPassed: ch.filter((c) => i.chapters[c]?.passedAt).length,
    chaptersTotal: ch.length,
    workedDone: fam.length > 0 && fam.every((f) => i.path.worked[f]),
    quickStars: i.quickStars?.[skill],
    level: i.levels[skill],
    sets: i.path.sets.filter((s) => s.skill === skill),
    retainedAt: i.path.retained[skill],
  }, i.path.stars[skill]);
}

/** Questions of a skill that are due in spaced review. */
export function dueBySkill(i: EngineInput): Partial<Record<SkillId, number>> {
  const out: Partial<Record<SkillId, number>> = {};
  for (const [qid, c] of Object.entries(i.srs)) {
    if (c.due > i.now) continue;
    const q = i.getQ(qid);
    if (q) out[q.skill] = (out[q.skill] ?? 0) + 1;
  }
  return out;
}

function dueIds(i: EngineInput) {
  return Object.entries(i.srs).filter(([qid, c]) => c.due <= i.now && (() => { const q = i.getQ(qid); return !!q && inSection(i, q.skill); })()).map(([qid]) => qid);
}
export function confidentErrors(i: EngineInput) {
  return Object.entries(i.srs).filter(([qid, c]) => c.misconception && (() => { const q = i.getQ(qid); return !!q && inSection(i, q.skill); })())
    .sort((a, b) => a[1].due - b[1].due).map(([qid]) => qid);
}

/** Conceptual misses on a skill in the last 14 days (from the mistake journal). */
export function conceptMisses(i: EngineInput, skill: SkillId) {
  return Object.values(i.mistakes).filter((m) => !m.resolvedAt && m.category === 'concept' && i.now - m.lastAt <= 14 * DAY && i.getQ(m.qid)?.skill === skill).length;
}
const recentMisses = (i: EngineInput, skill: SkillId) => {
  const rows = i.attempts.filter((a) => !a.abandoned && i.now - a.at <= 14 * DAY && i.getQ(a.qid)?.skill === skill);
  return { n: rows.length, wrong: rows.filter((a) => !a.correct).length };
};

export const prereqsMet = (i: EngineInput, s: PathSkill) => s.prereqs.every((p) => skillStars(i, p).count >= 1);

/** Picks the format for working on a skill, with the reason. */
export function formatFor(i: EngineInput, skill: SkillId): Pick<Step, 'kind' | 'href' | 'title' | 'minutes'> & { why?: string } {
  const st = skillStars(i, skill);
  const name = PATH[skill].title;
  const misses = conceptMisses(i, skill);
  const fams = i.workedFamilies[skill] ?? [];
  const ch = i.chapterIds[skill] ?? [];
  if (misses >= 2 && fams.length) return { kind: 'worked', href: `/worked/${skill}`, title: `Worked examples: ${name}`, minutes: 12, why: `${misses} conceptual misses in two weeks` };
  if (st.count >= 2) {
    if (!st.hardDone) return { kind: 'hard', href: `/path/set?kind=hard&skill=${skill}`, title: `Hard set: ${name}`, minutes: 8 };
    return { kind: 'gauntlet', href: `/path/set?kind=gauntlet&section=${PATH[skill].section}`, title: 'Gauntlet: mixed review', minutes: 12 };
  }
  const passedCh = ch.filter((c) => i.chapters[c]?.passedAt).length;
  if (st.count === 0 && passedCh < ch.length) {
    const nextCh = ch.find((c) => !i.chapters[c]?.passedAt);
    return { kind: 'chapter', href: `/learn/${skill}/${nextCh}`, title: `${name}: chapter ${ch.indexOf(nextCh!) + 1} of ${ch.length}`, minutes: 10 };
  }
  return { kind: 'practice', href: `/path/set?kind=practice&skill=${skill}`, title: `Practice set: ${name}`, minutes: 8 };
}

export function nextStep(i: EngineInput, opts: { skipReview?: boolean; skipQueues?: boolean; exclude?: SkillId[] } = {}): Step {
  const ex = new Set(opts.exclude ?? []);
  const t = today(i);
  const reviewedToday = i.attempts.filter((a) => a.mode === 'review' && dateKey(a.at) === t).length;
  // 1. due reviews, capped at one block a day
  const due = dueIds(i);
  if (!opts.skipReview && !opts.skipQueues && due.length >= 3 && reviewedToday < REVIEW_CAP) {
    const n = Math.min(REVIEW_CAP, due.length);
    return { kind: 'review', section: i.section, href: `/practice/session?mode=review&n=${n}`, title: `Review ${n} question${n === 1 ? '' : 's'}`, minutes: Math.ceil(n * 1.3), priority: 1,
      reason: `${due.length} question${due.length === 1 ? ' is' : 's are'} due to come back today. Reviewing now is how they stick.` };
  }
  // 2. confident errors
  const ce = confidentErrors(i).slice(0, CONFIDENT_CAP);
  const fixedToday = i.attempts.filter((a) => a.mode === 'path' && dateKey(a.at) === t && ce.includes(a.qid)).length;
  if (!opts.skipQueues && ce.length && fixedToday === 0) {
    return { kind: 'confident', section: i.section, href: `/path/set?kind=confident${i.section ? `&section=${i.section}` : ''}`, title: `Fix ${ce.length} confident error${ce.length === 1 ? '' : 's'}`, minutes: ce.length * 2, priority: 2,
      reason: `You were sure of ${ce.length === 1 ? 'an answer' : `${ce.length} answers`} that ${ce.length === 1 ? 'was' : 'were'} wrong. That usually means a misconception, so it comes first.` };
  }
  const skills = (i.section ? pathOf(i.section) : [...pathOf('math'), ...pathOf('rw')]).filter((s) => !ex.has(s.id));
  // 3. an unfinished chapter
  for (const s of skills) {
    const ch = i.chapterIds[s.id] ?? [];
    const passed = ch.filter((c) => i.chapters[c]?.passedAt).length;
    if (passed > 0 && passed < ch.length && skillStars(i, s.id).count < 2) {
      const nextCh = ch.find((c) => !i.chapters[c]?.passedAt)!;
      return { kind: 'chapter', skill: s.id, section: s.section, href: `/learn/${s.id}/${nextCh}`, title: `${s.title}: chapter ${ch.indexOf(nextCh) + 1} of ${ch.length}`, minutes: 10, priority: 3,
        reason: `You have finished ${passed} of ${ch.length} chapters of ${s.title}. Finishing it earns ★1.` };
    }
  }
  // 4. the route, in order: the first skill along it the student has not secured (see lib/path/input.ts)
  if (i.priority?.length) {
    const pick = i.priority.map((k) => PATH[k]).find((p) => p && inSection(i, p.id) && !ex.has(p.id) && skillStars(i, p.id).count < 3);
    if (pick) {
      const f = formatFor(i, pick.id);
      return { ...f, skill: pick.id, section: pick.section, priority: 4,
        reason: f.why ? `Recommended because of ${f.why} on ${pick.title}.` : `Next on your route: ${pick.title}. The steps before it are secured${pick.prereqs.length ? `, and it builds on ${pick.prereqs.map((p) => PATH[p].title).join(' and ')}` : ''}.` };
    }
  }
  // 4b. the highest Score Lever skill with prerequisites met
  const daysLeft = i.examDate ? daysBetween(t, i.examDate) : null;
  const ranked = i.lever
    .filter((l) => !l.needsDiagnostic && l.perHour && l.perHour.mid > 0 && inSection(i, l.skill) && !ex.has(l.skill))
    .map((l) => {
      const s = PATH[l.skill];
      const st = skillStars(i, l.skill);
      // a skill with recent conceptual misses moves up; close to the test, practice beats new learning
      const boost = 1 + 0.15 * Math.min(3, conceptMisses(i, l.skill)) + (daysLeft !== null && daysLeft <= 14 && st.count === 0 ? -0.3 : 0);
      return { l, s, st, score: l.perHour!.mid * boost };
    })
    .filter((x) => x.st.count < 3 && prereqsMet(i, x.s))
    .sort((a, b) => b.score - a.score || a.s.order - b.s.order);
  if (ranked.length) {
    const { l, s } = ranked[0];
    const f = formatFor(i, s.id);
    const m = recentMisses(i, s.id);
    const reason = f.why ? `Recommended because of ${f.why} on ${s.title}.`
      : m.wrong >= 2 ? `Recommended because you missed ${m.wrong} of ${m.n} ${s.title.toLowerCase()} questions in the last two weeks.`
      : `Recommended because it is your biggest score lever: about ${l.perHour!.low}–${l.perHour!.high} points per hour of study (an estimate).`;
    return { ...f, skill: s.id, section: s.section, priority: 4, reason };
  }
  // 5. curriculum order
  const open = skills.filter((s) => skillStars(i, s.id).count < 3).sort((a, b) => Number(prereqsMet(i, b)) - Number(prereqsMet(i, a)) || a.order - b.order);
  const s = open[0] ?? skills[0];
  const f = formatFor(i, s.id);
  const st = skillStars(i, s.id);
  return { ...f, skill: s.id, section: s.section, priority: 5,
    reason: st.count === 0 ? `Next on the route: ${s.title}${s.prereqs.length ? `, which builds on ${s.prereqs.map((p) => PATH[p].title).join(' and ')}` : ''}.` : `Next on the route: ${s.title} has ${st.count} of 3 stars. ${st.next}` };
}

/**
 * Today: about 15 minutes. One review (due cards or confident errors), one lesson, one practice set.
 * Each item knows whether it is already done today.
 */
export function todayPlan(i: EngineInput): (Step & { done: boolean })[] {
  const t = today(i);
  const doneToday = (pred: (a: Attempt) => boolean) => i.attempts.some((a) => dateKey(a.at) === t && pred(a));
  const items: (Step & { done: boolean })[] = [];
  const first = nextStep(i);
  const reviewStep = first.kind === 'review' || first.kind === 'confident' ? first : null;
  if (reviewStep) items.push({ ...reviewStep, done: false });
  else if (doneToday((a) => a.mode === 'review')) items.push({ kind: 'review', href: '/practice/session?mode=review&n=8', title: 'Review', reason: 'Today’s review is done.', minutes: 0, priority: 1, done: true });
  // the learning step: what the engine picks once reviews are out of the way
  const learn = reviewStep ? nextStep({ ...i, srs: Object.fromEntries(Object.entries(i.srs).map(([k, c]) => [k, { ...c, due: Number.MAX_SAFE_INTEGER, misconception: false }])) }, { skipReview: true }) : first;
  items.push({ ...learn, done: false });
  // a practice set on the same skill, unless the learning step already is one
  if (learn.skill && !['practice', 'hard', 'gauntlet'].includes(learn.kind)) {
    const st = skillStars(i, learn.skill);
    const setKind = st.count >= 2 ? 'hard' : 'practice';
    const setDone = i.path.sets.some((s) => s.skill === learn.skill && dateKey(s.at) === t);
    items.push({ kind: setKind, skill: learn.skill, section: learn.section, href: `/path/set?kind=${setKind}&skill=${learn.skill}`, title: `${setKind === 'hard' ? 'Hard set' : 'Practice set'}: ${PATH[learn.skill].title}`, minutes: 8, priority: learn.priority,
      reason: 'Practice right after learning helps it stick.', done: setDone });
  }
  return items.slice(0, 3);
}

/** How a hex should look. */
export type HexState = 'not-started' | 'in-progress' | 'proficient' | 'mastered';
export function hexState(i: EngineInput, skill: SkillId): { state: HexState; stars: StarStatus; due: number; started: boolean } {
  const stars = skillStars(i, skill);
  const ch = i.chapterIds[skill] ?? [];
  const started = stars.count > 0 || ch.some((c) => i.chapters[c]?.passedAt) || i.attempts.some((a) => i.getQ(a.qid)?.skill === skill);
  const state: HexState = stars.count >= 3 ? 'mastered' : stars.count >= 2 ? 'proficient' : started ? 'in-progress' : 'not-started';
  return { state, stars, due: dueBySkill(i)[skill] ?? 0, started };
}

/** The skills the Path should raise: the recommended one first, then the next steps after it (for the map's heights). */
export function upcomingSkills(i: EngineInput, n = 3): SkillId[] {
  const out: SkillId[] = [];
  for (let k = 0; k < n; k++) {
    const s = nextStep(i, { skipQueues: true, exclude: out });
    if (!s.skill || out.includes(s.skill)) break;
    out.push(s.skill);
  }
  return out;
}
