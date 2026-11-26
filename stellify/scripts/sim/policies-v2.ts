/**
 * The redesigned app, for the simulator: start-up questions, the adaptive placement check, then the coach's plan.
 * Students answer the start-up questions from their own (imperfect) sense of themselves: see model.ts.
 */
import { QUESTIONS, getQuestion } from '../../src/data/questions';
import type { SkillId } from '../../src/lib/types';
import { SKILLS } from '../../src/lib/taxonomy';
import { buildCoach, coachPriority, markDone } from '../../src/lib/engine/coach';
import { estimateAbilities } from '../../src/lib/model/ability';
import { HARD_TOPICS, type Grade, type Intake } from '../../src/lib/model/intake';
import { PLACEMENT, nextPlacementQuestion } from '../../src/lib/model/placement';
import { applyAttempt } from '../../src/lib/engine/attempt';
import { addDays } from '../../src/lib/util';
import { know, TIER_B, type Student } from './model';
import type { Policy } from './run';
import { START, profileState } from './run';
import { answer, type World } from './app';

export function intakeFor(st: Student, now: number): Intake {
  const hard = HARD_TOPICS.filter((t) => t.skills.some((k) => st.saysHard.includes(k))).map((t) => t.id);
  return {
    v: 1, at: now, grade: `g${st.grade}` as Grade, mathClass: st.mathClass,
    taken: st.pastScore ? 'psat' : 'none', past: st.pastScore,
    testWhen: st.examIn ? 'date' : 'unsure',
    hard, flags: [...(st.ell ? ['ell' as const] : []), ...(st.pace > 1.25 ? ['time' as const] : [])],
  };
}

function placement(w: World) {
  const sessionId = `${PLACEMENT.sessionPrefix}${w.now}`;
  for (let guard = 0; guard < 20; guard++) {
    const q = nextPlacementQuestion({ bank: QUESTIONS, attempts: w.s.attempts, sessionId, intake: w.s.profile.intake, getQ: getQuestion, now: w.now });
    if (!q) break;
    // an honest "I have not learned this yet" when the topic is new to them
    const k = know(w.st.theta[q.skill], TIER_B[q.difficulty]);
    const neverTaught = w.st.theta[q.skill] < w.st.start[q.skill] + 0.01 && k < 0.12 && w.st.grade <= 10;
    if (neverTaught) {
      w.s = applyAttempt(w.s, { qid: q.id, answer: null, ms: 15000, hints: 0, mode: 'diagnostic', sessionId }, w.now, getQuestion).state;
      const i = w.s.profile.intake!;
      w.s = { ...w.s, profile: { ...w.s.profile, intake: { ...i, notTaught: [...new Set([...(i.notTaught ?? []), q.skill])] } } };
      w.now += 15000; w.used += 0.25;
    } else answer(w, [q.id], 'diagnostic', 0.3, sessionId);
  }
  w.s = { ...w.s, profile: { ...w.s.profile, diagnosticAt: w.now } };
}

export const POLICIES_V2: Policy[] = [{
  name: 'v2-coach', label: 'Redesigned app: start-up questions, adaptive placement, then the coach’s custom plan',
  setup(w) {
    w.s = profileState(w.st);
    w.s = { ...w.s, profile: { ...w.s.profile, examDate: w.st.examIn ? addDays(START, w.st.examIn) : undefined, intake: intakeFor(w.st, w.now) } };
    if (!w.quitSetup) placement(w);
  },
  today(w) {
    const plan = markDone(buildCoach(w.s, { now: w.now, getQ: getQuestion, days: 1, bank: QUESTIONS }), w.s, w.now, getQuestion);
    return (plan.days[0]?.tasks ?? []).filter((t) => !t.done && t.kind !== 'placement').map((t) => ({ href: t.href, minutes: t.minutes, skill: t.skill }));
  },
  firstSkills(w) { return coachPriority(buildCoach(w.s, { now: w.now, getQ: getQuestion, days: 1, bank: QUESTIONS })).slice(0, 3); },
  ranking(w) { const ab = estimateAbilities(w.s.attempts, getQuestion, w.now, w.s.profile.intake); return [...SKILLS].sort((a, b) => ab.skills[a.id].theta - ab.skills[b.id].theta).map((k) => k.id as SkillId); },
  setupQuit: (st) => 0.04 + (st.grade <= 9 ? 0.06 : 0) + (st.minutes <= 20 ? 0.04 : 0),
}];
