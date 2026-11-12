import type { AppState, Attempt, PracticeMode, Question } from '../types';
import { isCorrect } from '../answers';
import { clamp, dateKey, DAY, uid } from '../util';
import { ACHIEVEMENT, newAchievements } from './achievements';
import { computeSkillStats, MASTERY_LEVELS } from './mastery';
import { autoCategory, resolveProgress } from './mistakes';
import { schedule } from './srs';
import { attemptXp, coinsFor, levelFromXp, XP_REWARD } from './xp';

export interface AttemptInput {
  qid: string;
  answer: string | null;
  ms: number;
  hints: number;
  mode: PracticeMode;
  sessionId: string;
  abandoned?: boolean;
}

export type GameEvent =
  | { type: 'xp'; xp: number; coins: number; note?: string }
  | { type: 'level'; level: number; title: string }
  | { type: 'achievement'; id: string; title: string }
  | { type: 'mastery'; skill: string; level: number; label: string }
  | { type: 'mistake'; qid: string }
  | { type: 'ready'; qid: string };

/** Adds XP/coins, raises happiness, and reports level-ups. Pure. */
export function grant(s: AppState, xp: number, now: number, text?: string): { state: AppState; events: GameEvent[] } {
  if (xp <= 0) return { state: s, events: [] };
  const before = levelFromXp(s.pet.xp).level;
  const coins = coinsFor(xp);
  const k = dateKey(now);
  const day = s.activity[k] ?? { ms: 0, questions: 0, correct: 0, xp: 0, lessons: 0 };
  const pet = { ...s.pet, xp: s.pet.xp + xp, coins: s.pet.coins + coins, happiness: clamp(s.pet.happiness + Math.ceil(xp / 8), 0, 100) };
  const after = levelFromXp(pet.xp);
  const events: GameEvent[] = [{ type: 'xp', xp, coins, note: text }];
  if (after.level > before) {
    events.push({ type: 'level', level: after.level, title: after.tier.title });
    pet.lastEvent = { kind: 'level', at: now, text: `Reached level ${after.level}` };
  } else if (text) pet.lastEvent = { kind: 'xp', at: now, text };
  return { state: { ...s, pet, activity: { ...s.activity, [k]: { ...day, xp: day.xp + xp } } }, events };
}

export function unlockAchievements(s: AppState, getQ: (id: string) => Question | undefined, now: number): { state: AppState; events: GameEvent[] } {
  const ids = newAchievements(s, getQ, dateKey(now));
  if (!ids.length) return { state: s, events: [] };
  const achievements = { ...s.achievements };
  let coins = 0;
  const events: GameEvent[] = [];
  for (const id of ids) {
    achievements[id] = now;
    coins += ACHIEVEMENT[id].coins;
    events.push({ type: 'achievement', id, title: ACHIEVEMENT[id].title });
  }
  const last = ACHIEVEMENT[ids[ids.length - 1]];
  return {
    state: { ...s, achievements, pet: { ...s.pet, coins: s.pet.coins + coins, lastEvent: { kind: 'achievement', at: now, text: `Unlocked “${last.title}”` } } },
    events,
  };
}

/**
 * The single place where an answered question changes student state: attempts, daily activity,
 * mistake bucket, spaced repetition, XP/coins, mastery bonuses and achievements. Pure function.
 */
export function applyAttempt(
  s0: AppState, input: AttemptInput, now: number, getQ: (id: string) => Question | undefined,
): { state: AppState; events: GameEvent[]; correct: boolean } {
  const q = getQ(input.qid);
  if (!q) return { state: s0, events: [], correct: false };
  const correct = !input.abandoned && isCorrect(q, input.answer);
  const clean = correct && input.hints === 0;
  const events: GameEvent[] = [];
  const prior = s0.attempts.filter((a) => a.qid === q.id && !a.abandoned);
  const levelBefore = computeSkillStats(q.skill, s0.attempts, getQ).level;

  const attempt: Attempt = {
    id: uid(), qid: q.id, at: now, answer: input.answer, correct, ms: Math.max(0, Math.round(input.ms)),
    hints: input.hints, mode: input.mode, sessionId: input.sessionId, ...(input.abandoned ? { abandoned: true } : {}),
  };
  let s: AppState = { ...s0, attempts: [...s0.attempts, attempt] };

  // daily activity
  const k = dateKey(now);
  const day = s.activity[k] ?? { ms: 0, questions: 0, correct: 0, xp: 0, lessons: 0 };
  s = { ...s, activity: { ...s.activity, [k]: { ...day, ms: day.ms + Math.min(attempt.ms, 10 * 60_000), questions: day.questions + (input.abandoned ? 0 : 1), correct: day.correct + (correct ? 1 : 0) } } };

  // mistake bucket
  const mistakes = { ...s.mistakes };
  const existing = mistakes[q.id];
  let redemption = false;
  if (!input.abandoned && !correct) {
    mistakes[q.id] = existing
      ? { ...existing, lastAt: now, count: existing.count + 1, answers: [...existing.answers, input.answer], lastMs: attempt.ms, status: 'unresolved', resolvedAt: undefined, redoCorrect: false, relatedCorrect: [], category: existing.categoryBy === 'student' ? existing.category : autoCategory(q, attempt.ms, input.answer) }
      : { qid: q.id, firstAt: now, lastAt: now, count: 1, answers: [input.answer], lastMs: attempt.ms, category: autoCategory(q, attempt.ms, input.answer), categoryBy: 'auto', status: 'unresolved', redoCorrect: false, relatedCorrect: [] };
    events.push({ type: 'mistake', qid: q.id });
  } else if (clean) {
    if (existing && existing.status === 'unresolved' && !existing.redoCorrect) {
      mistakes[q.id] = { ...existing, redoCorrect: true };
      redemption = true;
      if (resolveProgress(mistakes[q.id]).ready) events.push({ type: 'ready', qid: q.id });
    }
    // a clean correct answer counts as "new related practice" for other open mistakes in the same skill
    for (const m of Object.values(mistakes)) {
      if (m.qid === q.id || m.status !== 'unresolved' || m.relatedCorrect.includes(q.id)) continue;
      const mq = getQ(m.qid);
      if (!mq || mq.skill !== q.skill || now <= m.lastAt) continue;
      const was = resolveProgress(m).ready;
      mistakes[m.qid] = { ...m, relatedCorrect: [...m.relatedCorrect, q.id] };
      if (!was && resolveProgress(mistakes[m.qid]).ready) events.push({ type: 'ready', qid: m.qid });
    }
  }
  s = { ...s, mistakes };

  // spaced repetition: anything missed or needing hints enters the review queue
  if (!input.abandoned && (s.srs[q.id] || !clean)) {
    s = { ...s, srs: { ...s.srs, [q.id]: schedule(s.srs[q.id], correct, clean, now) } };
  }

  // XP
  const recentRepeat = prior.some((a) => a.correct && now - a.at < 7 * DAY);
  const { xp, note } = attemptXp(q, { correct, ms: attempt.ms, hints: input.hints, recentRepeat, redemption, abandoned: input.abandoned });
  const g = grant(s, xp, now, correct ? (q.difficulty === 'very-hard' ? 'Solved a very hard question' : note) : note);
  s = g.state; events.push(...g.events.map((e) => (e.type === 'xp' ? { ...e, note } : e)));

  // mastery change
  const levelAfter = computeSkillStats(q.skill, s.attempts, getQ).level;
  if (levelAfter > levelBefore) {
    events.push({ type: 'mastery', skill: q.skill, level: levelAfter, label: MASTERY_LEVELS[levelAfter] });
    const bonus = grant(s, levelAfter === 4 ? XP_REWARD.mastered : levelAfter >= 2 ? XP_REWARD.masteryUp : 0, now, `Reached ${MASTERY_LEVELS[levelAfter]}`);
    s = bonus.state; events.push(...bonus.events);
  }

  const a = unlockAchievements(s, getQ, now);
  s = a.state; events.push(...a.events);
  return { state: s, events, correct };
}

/** Explicit resolution; allowed only once redo + related practice are complete. */
export function resolveMistake(s: AppState, qid: string, now: number, getQ: (id: string) => Question | undefined): { state: AppState; events: GameEvent[]; ok: boolean } {
  const m = s.mistakes[qid];
  if (!m || m.status === 'resolved' || !resolveProgress(m).ready) return { state: s, events: [], ok: false };
  let st: AppState = { ...s, mistakes: { ...s.mistakes, [qid]: { ...m, status: 'resolved', resolvedAt: now } } };
  const g = grant(st, XP_REWARD.mistakeResolved, now, 'Resolved a mistake');
  st = g.state;
  const a = unlockAchievements(st, getQ, now);
  return { state: a.state, events: [...g.events, ...a.events], ok: true };
}
