/**
 * A headless copy of what the app does when a student opens a task link: it builds the session with the app's own
 * code (buildSession, pickSet, diagnosticSet), records each answer with applyAttempt, scores Path sets and keeps
 * stars in sync, like the store does. The student's answers come from the model in ./model.ts.
 */
import { QUESTIONS, getQuestion } from '../../src/data/questions';
import type { AppState, PathSetKind, PracticeMode, Question, Section, SkillId } from '../../src/lib/types';
import { applyAttempt } from '../../src/lib/engine/attempt';
import { buildSession, diagnosticSet } from '../../src/lib/sessions';
import { pickSet } from '../../src/lib/path/sets';
import { emptyPath, keepStars, scoreSet } from '../../src/lib/path/stars';
import { skillStars } from '../../src/lib/path/next';
import { CHAPTER_IDS, engineInput } from '../../src/lib/path/input';
import { workedFamilyIds } from '../../src/data/worked';
import { SKILLS } from '../../src/lib/taxonomy';
import { rng, shuffle } from '../../src/lib/util';
import { TIER_B, lessonGain, pCorrect, practiceGain, type Student } from './model';

export interface Served { day: number; skill: SkillId; know: number; mode: string; tier: string }
export interface World {
  s: AppState; st: Student; now: number; day: number; rand: () => number;
  served: Served[];
  /** minutes spent per skill, by day */
  skillMin: { day: number; skill: SkillId; min: number }[];
  used: number;
  notes: string[];
  seen: Set<string>;
}

export function newWorld(st: Student, s: AppState, now: number): World {
  return { s, st, now, day: 0, rand: rng(`world-${st.id}`), served: [], skillMin: [], used: 0, notes: [], seen: new Set() };
}

/** Answers a list of questions; `weight` scales learning (no explanations until the end, a test, and so on). */
export function answer(w: World, qids: string[], mode: PracticeMode, weight = 1, sessionId = `${mode}-${w.now}`) {
  const rows: { qid: string; correct: boolean; hints: number }[] = [];
  for (const id of qids) {
    const q = getQuestion(id);
    if (!q) continue;
    const correct = w.rand() < pCorrect(w.st.theta[q.skill], q);
    const ans = q.type === 'mcq' ? String(correct ? q.answer : ((q.answer as number) + 1) % 4) : correct ? (q.answer as string[])[0] : '99999';
    const ms = q.time * 1000 * w.st.pace * (0.8 + 0.4 * w.rand());
    w.s = applyAttempt(w.s, { qid: id, answer: ans, ms, hints: 0, mode, sessionId }, w.now, getQuestion).state;
    // seeing the exact same question again teaches much less than a new one
    const again = w.seen.has(id); w.seen.add(id);
    const k = practiceGain(w.st, q.skill, TIER_B[q.difficulty] ?? 0.4, again ? weight * 0.3 : weight);
    w.served.push({ day: w.day, skill: q.skill, know: k, mode, tier: q.difficulty });
    w.skillMin.push({ day: w.day, skill: q.skill, min: ms / 60000 });
    w.used += ms / 60000;
    w.now += ms;
    rows.push({ qid: id, correct, hints: 0 });
  }
  return rows;
}

export function syncStars(w: World) {
  const input = engineInput(w.s, w.now);
  const path = w.s.path ?? emptyPath();
  const stars = { ...path.stars };
  for (const k of SKILLS) stars[k.id] = keepStars(stars[k.id], skillStars(input, k.id), w.now);
  w.s = { ...w.s, path: { ...path, stars } };
}

function lesson(w: World, skill: SkillId, minutes: number, chapter?: string, weight = 1) {
  lessonGain(w.st, skill, weight);
  w.skillMin.push({ day: w.day, skill, min: minutes });
  w.used += minutes;
  w.now += minutes * 60000;
  const ch = chapter ?? (CHAPTER_IDS[skill] ?? []).find((c) => !w.s.chapters[c]?.passedAt);
  if (ch) w.s = { ...w.s, chapters: { ...w.s.chapters, [ch]: { best: 1, total: 1, at: w.now, passedAt: w.now } }, lessonsDone: { ...w.s.lessonsDone, [skill]: w.now } };
  syncStars(w);
}

function pathSet(w: World, kind: PathSetKind | 'confident', skill?: SkillId, section?: Section) {
  const qids = pickSet(kind, { skill, section, seed: `${w.st.id}-${w.now}` }, QUESTIONS, w.s.attempts, w.s.path ?? emptyPath(), w.s.srs, w.now);
  const rows = answer(w, qids, 'path');
  if (kind === 'confident') return;
  const path = w.s.path ?? emptyPath();
  const withSkill = rows.map((r) => ({ ...r, skill: getQuestion(r.qid)!.skill }));
  const result = scoreSet(kind, withSkill, { section: section ?? (skill ? SKILLS.find((k) => k.id === skill)!.section : 'math'), skill, at: w.now, previous: path.sets });
  w.s = { ...w.s, path: { ...path, sets: [...path.sets, result] } };
  syncStars(w);
}

export function runDiagnostic(w: World) {
  // feedback comes at the end: a little learning from reading the explanations afterwards
  answer(w, diagnosticSet(QUESTIONS), 'diagnostic', 0.3);
}

/** Opens a task link the way the app would and does it. Returns false if the link gave the student nothing to do. */
export function doTask(w: World, href: string, minutes: number): boolean {
  const [path, qs] = href.split('?');
  const p = Object.fromEntries(new URLSearchParams(qs ?? '')) as Record<string, string>;
  const before = w.used;
  let m: RegExpMatchArray | null;
  if (path === '/diagnostic') runDiagnostic(w);
  else if ((m = path.match(/^\/learn\/([a-z0-9]+)(?:\/([a-z0-9]+-\d+))?$/)) && SKILLS.some((k) => k.id === m![1])) lesson(w, m[1] as SkillId, minutes || 12, m[2]);
  else if ((m = path.match(/^\/worked\/([a-z0-9]+)$/))) {
    lesson(w, m[1] as SkillId, minutes || 12, undefined, 0.8);
    const fams = workedFamilyIds()[m[1] as SkillId] ?? [];
    const path0 = w.s.path ?? emptyPath();
    w.s = { ...w.s, path: { ...path0, worked: { ...path0.worked, ...Object.fromEntries(fams.map((f) => [f, w.now])) } } };
    syncStars(w);
  } else if (path === '/path/set') pathSet(w, p.kind as PathSetKind, p.skill as SkillId | undefined, p.section as Section | undefined);
  else if (path === '/practice/session') {
    const b = buildSession(p, w.s, QUESTIONS, getQuestion, w.now);
    answer(w, b.qids, b.mode);
  } else if (path === '/practice/timed') {
    const sec = (p.section ?? 'math') as Section;
    const qids = shuffle(QUESTIONS.filter((q) => q.section === sec), w.rand).slice(0, sec === 'math' ? 22 : 27).map((q) => q.id);
    answer(w, qids, 'timed', 0.5);
  } else if (path === '/mocks') {
    if (w.st.minutes < 45) { w.notes.push(`day ${w.day}: skipped a 2 h 14 min mock (studies ${w.st.minutes} min a day)`); return false; }
    const qids = [...shuffle(QUESTIONS.filter((q) => q.section === 'rw'), w.rand).slice(0, 54), ...shuffle(QUESTIONS.filter((q) => q.section === 'math'), w.rand).slice(0, 44)].map((q) => q.id);
    answer(w, qids, 'mock', 0.3);
  } else if (path === '/vocabulary') { lesson(w, 'wic', minutes, undefined, 0.15); }
  else if (path === '/desmos' || path === '/desmos/lab') { for (const k of ['nleq', 'nlf', 'sys'] as SkillId[]) lessonGain(w.st, k, 0.1); w.used += minutes; w.now += minutes * 60000; }
  else { w.notes.push(`day ${w.day}: no simulator action for ${href}`); return false; }
  return w.used > before;
}

export const questionOf = (id: string): Question | undefined => getQuestion(id);
