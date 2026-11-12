import type { AppState, PlanDay, PlanTask, Question, SkillId, StudyPlan } from '../types';
import { SKILL } from '../taxonomy';
import { addDays, dateKey, daysBetween, parseDateKey } from '../util';
import { rankSkills } from './adaptive';
import { dueIds } from './srs';

const lesson = (skill: SkillId, minutes: number): PlanTask => ({ id: '', kind: 'lesson', skill, section: SKILL[skill].section, minutes, title: `Lesson: ${SKILL[skill].short}`, detail: 'Read the lesson, then try the guided examples.', href: `/learn/${skill}` });
const practice = (skill: SkillId, minutes: number, hard = false): PlanTask => ({ id: '', kind: 'practice', skill, section: SKILL[skill].section, minutes, title: `${hard ? 'Hard practice' : 'Practice'}: ${SKILL[skill].short}`, detail: `${Math.max(4, Math.round(minutes / 1.6))} targeted questions`, href: `/practice/session?mode=skill&skill=${skill}&n=${Math.max(4, Math.round(minutes / 1.6))}${hard ? '&diff=hard,very-hard' : ''}` });
const T = {
  diagnostic: (): PlanTask => ({ id: '', kind: 'diagnostic', minutes: 40, title: 'Diagnostic', detail: '24 questions across every domain', href: '/diagnostic' }),
  mistakes: (m: number): PlanTask => ({ id: '', kind: 'mistakes', minutes: m, title: 'Mistake Bucket review', detail: 'Redo missed questions and related practice', href: '/practice/session?mode=mistakes&n=8' }),
  review: (m: number): PlanTask => ({ id: '', kind: 'review', minutes: m, title: 'Spaced review', detail: 'Questions scheduled to come back today', href: '/practice/session?mode=review&n=8' }),
  mixed: (m: number): PlanTask => ({ id: '', kind: 'mixed', minutes: m, title: 'Mixed challenge', detail: 'Smart practice across your weakest skills', href: `/practice/session?mode=smart&n=${Math.max(5, Math.round(m / 1.5))}` }),
  hard: (m: number, section: 'math' | 'rw'): PlanTask => ({ id: '', kind: 'practice', section, minutes: m, title: `Very hard ${section === 'math' ? 'Math' : 'Reading & Writing'}`, detail: 'The toughest questions in the bank', href: `/practice/session?mode=hard&section=${section}&n=${Math.max(5, Math.round(m / 2))}` }),
  timed: (section: 'math' | 'rw'): PlanTask => ({ id: '', kind: 'timed', section, minutes: section === 'math' ? 35 : 32, title: `Timed module: ${section === 'math' ? 'Math' : 'Reading & Writing'}`, detail: section === 'math' ? '22 questions in 35 minutes' : '27 questions in 32 minutes', href: `/practice/timed?section=${section}` }),
  mock: (): PlanTask => ({ id: '', kind: 'mock', minutes: 134, title: 'Full-length mock exam', detail: '2 h 14 min plus a 10-minute break', href: '/mocks' }),
  vocab: (m: number): PlanTask => ({ id: '', kind: 'vocab', minutes: m, title: 'Vocabulary session', detail: 'Words in context with spaced review', href: '/vocabulary' }),
  desmos: (m: number): PlanTask => ({ id: '', kind: 'desmos', minutes: m, title: 'Desmos technique', detail: 'One graphing skill and when to use it', href: '/desmos' }),
};

/** Trim or pad a list of tasks to the student's daily time budget (mock days are exempt). */
function fit(tasks: PlanTask[], budget: number): PlanTask[] {
  const out: PlanTask[] = [];
  let used = 0;
  for (const t of tasks) {
    if (t.kind === 'mock' || t.kind === 'diagnostic') { out.push(t); used += t.minutes; continue; }
    if (used + t.minutes <= budget + 5) { out.push(t); used += t.minutes; }
    else if (budget - used >= 10 && t.kind !== 'timed') { out.push({ ...t, minutes: budget - used }); used = budget; }
  }
  return out.length ? out : tasks.slice(0, 1);
}

export const PHASES = [
  { week: 1, name: 'Foundation', goal: 'Find your weaknesses and rebuild the fundamentals.' },
  { week: 2, name: 'Advanced Mastery', goal: 'Nonlinear math, complex grammar, inference and synthesis.' },
  { week: 3, name: 'Hard Question Execution', goal: 'Very hard questions, mixed practice and timed modules.' },
  { week: 4, name: 'Exam Readiness', goal: 'Full-length mocks, error analysis and final review.' },
];

/**
 * Builds a 30-day plan (or shorter if the exam is sooner) from the student's weakest skills,
 * daily time budget, rest days and exam date. It never schedules more than the stated daily
 * minutes except on mock-exam days, which are placed on the student's longest free day pattern.
 */
export function generatePlan(s: AppState, getQ: (id: string) => Question | undefined, now: number): StudyPlan {
  const start = dateKey(now);
  const untilExam = s.profile.examDate ? daysBetween(start, s.profile.examDate) : 30;
  const length = Math.max(7, Math.min(30, untilExam > 0 ? untilExam : 30));
  const budget = Math.max(15, s.profile.dailyMinutes || 45);
  const rest = s.profile.restDays ?? [0];
  const rankM = rankSkills(s, getQ, now, 'math').map((r) => r.skill);
  const rankR = rankSkills(s, getQ, now, 'rw').map((r) => r.skill);
  const sec = (['bnd', 'fss'] as SkillId[]).sort((a, b) => rankR.indexOf(a) - rankR.indexOf(b));
  const alg = (['lin1', 'linf', 'lin2', 'sys', 'ineq'] as SkillId[]).sort((a, b) => rankM.indexOf(a) - rankM.indexOf(b));
  const adv = (['nleq', 'nlf', 'equiv'] as SkillId[]).sort((a, b) => rankM.indexOf(a) - rankM.indexOf(b));
  const read = (['inf', 'coet', 'cid', 'wic', 'tsp', 'ctc', 'coeq'] as SkillId[]).sort((a, b) => rankR.indexOf(a) - rankR.indexOf(b));
  const eoi = (['syn', 'tra'] as SkillId[]).sort((a, b) => rankR.indexOf(a) - rankR.indexOf(b));
  const other = rankM.filter((k) => !alg.includes(k) && !adv.includes(k));
  const cyc = <X,>(a: X[], i: number) => a[i % a.length];

  const days: PlanDay[] = [];
  let study = 0;
  for (let i = 0; i < length; i++) {
    const date = addDays(start, i);
    const frac = i / length;
    const week = frac < 0.25 ? 1 : frac < 0.5 ? 2 : frac < 0.75 ? 3 : 4;
    const phase = PHASES[week - 1].name;
    const dow = new Date(parseDateKey(date)).getDay();
    const lastDay = i === length - 1;
    if (rest.includes(dow) && !(i === 0 && !s.profile.diagnosticAt)) {
      days.push({ date, week, phase, rest: true, focus: 'Rest day', tasks: [] });
      continue;
    }
    const n = study++;
    let tasks: PlanTask[] = [];
    let focus = '';
    if (i === 0 && !s.profile.diagnosticAt) { tasks = [T.diagnostic()]; focus = 'Diagnostic'; }
    else if (lastDay && length >= 10) { tasks = [T.review(15), T.vocab(10)]; focus = 'Light review and rest before test day'; }
    else if (week === 1) {
      const k = n % 3;
      if (k === 0) { const g = cyc(sec, n / 3 | 0); tasks = [lesson(g, 15), practice(g, 15), T.mixed(15)]; focus = `Grammar fundamentals: ${SKILL[g].short}`; }
      else if (k === 1) { const a = cyc(alg, n / 3 | 0); tasks = [lesson(a, 15), practice(a, 20), T.vocab(10)]; focus = `Algebra review: ${SKILL[a].short}`; }
      else { const r = cyc(read, n / 3 | 0); tasks = [lesson(r, 15), practice(r, 20), T.mistakes(10)]; focus = `Core reading: ${SKILL[r].short}`; }
    } else if (week === 2) {
      const k = n % 4;
      if (k === 0) { const a = cyc(adv, n / 4 | 0); tasks = [lesson(a, 15), practice(a, 20, true), T.desmos(10)]; focus = `Nonlinear math: ${SKILL[a].short}`; }
      else if (k === 1) { const g = cyc(sec, n / 4 | 0); tasks = [practice(g, 20, true), practice(cyc(eoi, n), 15), T.mistakes(10)]; focus = 'Complex grammar and rhetorical synthesis'; }
      else if (k === 2) { const r = cyc(read, n / 4 | 0); tasks = [lesson('inf', 10), practice(r, 20, true), T.review(15)]; focus = 'Difficult inference and evidence'; }
      else { const o = cyc(other, n / 4 | 0); tasks = [lesson(o, 15), practice(o, 15), T.timed(n % 8 < 4 ? 'math' : 'rw')]; focus = `${SKILL[o].short} and a timed module`; }
    } else if (week === 3) {
      const k = n % 3;
      if (k === 0) { tasks = [T.hard(25, 'math'), T.mistakes(15), T.mixed(15)]; focus = 'Very hard Math and mistake review'; }
      else if (k === 1) { tasks = [T.hard(25, 'rw'), T.review(10), T.mixed(15)]; focus = 'Very hard Reading & Writing'; }
      else { tasks = [T.timed(n % 6 < 3 ? 'rw' : 'math'), T.mistakes(15)]; focus = 'Timed module: speed with accuracy'; }
    } else {
      const k = n % 4;
      if (k === 0) { tasks = [T.mock()]; focus = 'Full-length mock exam'; }
      else if (k === 1) { tasks = [T.mistakes(25), practice(rankM[0], 15), practice(rankR[0], 15)]; focus = 'Error analysis and weakness correction'; }
      else if (k === 2) { tasks = [T.timed('math'), T.review(10)]; focus = 'Time management: Math'; }
      else { tasks = [T.timed('rw'), T.mixed(15)]; focus = 'Time management: Reading & Writing'; }
    }
    tasks = fit(tasks, budget).map((t, j) => ({ ...t, id: `${date}-${j}` }));
    days.push({ date, week, phase, rest: false, focus, tasks });
  }
  const basis = `Built for ${budget} minutes a day${rest.length ? `, ${rest.length} rest day${rest.length === 1 ? '' : 's'} per week` : ''}, prioritizing ${SKILL[rankM[0]].short} and ${SKILL[rankR[0]].short}.`;
  return { createdAt: now, startDate: start, days, basis };
}

/** Today's mission: the plan's tasks if a plan covers today, otherwise built from current needs. */
export function todaysMission(s: AppState, getQ: (id: string) => Question | undefined, now: number): { tasks: PlanTask[]; rest: boolean; focus: string; fromPlan: boolean } {
  const today = dateKey(now);
  const day = s.plan?.days.find((d) => d.date === today);
  if (day) return { tasks: day.tasks.map((t) => ({ ...t, done: !!s.planDone[t.id] })), rest: day.rest, focus: day.focus, fromPlan: true };
  const budget = Math.max(15, s.profile.dailyMinutes || 45);
  if (!s.profile.diagnosticAt && s.attempts.length < 10) {
    return { tasks: [{ ...T.diagnostic(), id: `${today}-d` }], rest: false, focus: 'Start with the diagnostic', fromPlan: false };
  }
  const m = rankSkills(s, getQ, now, 'math')[0];
  const r = rankSkills(s, getQ, now, 'rw')[0];
  const open = Object.values(s.mistakes).filter((x) => x.status === 'unresolved').length;
  const due = dueIds(s.srs, now).length;
  const list: PlanTask[] = [
    { ...practice(m.skill, 20), title: `${SKILL[m.skill].domain === 'adv' ? 'Advanced Math' : 'Math'}: ${SKILL[m.skill].short}` },
    { ...practice(r.skill, 15), title: `${SKILL[r.skill].domain === 'sec' ? 'Grammar' : 'Reading'}: ${SKILL[r.skill].short}` },
    ...(open > 0 ? [T.mistakes(15)] : []),
    ...(due > 0 ? [T.review(10)] : []),
    T.hard(20, r.priority > m.priority ? 'rw' : 'math'),
    T.mixed(15),
  ];
  const tasks = fit(list, budget).map((t, j) => ({ ...t, id: `${today}-m${j}`, done: !!s.planDone[`${today}-m${j}`] }));
  return { tasks, rest: false, focus: `${SKILL[m.skill].short} and ${SKILL[r.skill].short}`, fromPlan: false };
}
