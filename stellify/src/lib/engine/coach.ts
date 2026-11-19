import type { AppState, Question, Section, SkillId } from '../types';
import { SKILL, SKILLS } from '../taxonomy';
import { PER_TEST } from './insights';
import { PATH } from '../path/skills';
import { COURSES } from '@/data/courses';
import { workedFamilyIds } from '@/data/worked';
import { addDays, clamp, dateKey, daysBetween, parseDateKey } from '../util';
import { dueIds } from './srs';
import { estimateAbilities, sectionBand, testAccuracy, withinReach, type Abilities } from '../model/ability';
import { horizonDays, type Intake } from '../model/intake';

/**
 * The coach: one custom plan per student, from what we know about them.
 *
 * 1. Estimate every skill (lib/model/ability.ts) from the intake answers, the placement check and all practice.
 * 2. Decide the stage from the estimated score: foundations, building, sharpening or polishing. The stage sets the
 *    mix: how much teaching versus practice, how hard the questions are, and whether timed work and mocks belong.
 * 3. Share out the study minutes between now and the test, 30 minutes at a time, each time to the skill where the
 *    next half hour is expected to add the most points (how often it is tested × how much accuracy is still
 *    missing × how quickly it moves at this student's level), with skills clearly below the student's own level
 *    boosted, so the plan leads with what they are bad at. Weak prerequisites come first. Returns diminish, so
 *    time spreads over several skills instead of drilling one.
 * 4. Lay the next two weeks out day by day inside the student's own minutes and rest days, and say why each task
 *    is there in terms of their own results.
 *
 * Today's tasks are worked out from what was known at the start of the day (or right after the placement check),
 * so they stay put while the student works; tomorrow is re-planned from the new results. Missing a day loses
 * nothing: the plan moves forward.
 */
export type Stage = 'foundation' | 'building' | 'sharpening' | 'polishing';
export const STAGE_INFO: Record<Stage, { name: string; blurb: string }> = {
  foundation: { name: 'Foundations', blurb: 'Learn the core ideas and get the easier and medium questions right every time. These are most of the points available to you.' },
  building: { name: 'Building', blurb: 'Close the gaps in your weakest skills and make medium questions automatic, then start on hard ones.' },
  sharpening: { name: 'Sharpening', blurb: 'Hard questions, timing and fixing the mistakes you keep making.' },
  polishing: { name: 'Polishing', blurb: 'The hardest questions, pacing under test conditions and no careless points lost.' },
};
export type CoachKind = 'lesson' | 'worked' | 'practice' | 'review' | 'mistakes' | 'timed' | 'mock' | 'vocab' | 'calm' | 'placement' | 'testday';
export interface CoachTask { id: string; kind: CoachKind; skill?: SkillId; section?: Section; minutes: number; title: string; why: string; href: string; done?: boolean }
export interface CoachDay { date: string; rest: boolean; testDay?: boolean; focus: string; tasks: CoachTask[] }
export interface FocusSkill { skill: SkillId; minutes: number; points: number; why: string; theta: number }
export interface CoachPlan {
  stage: Stage;
  hasData: boolean;
  estimate: { rw: { low: number; mid: number; high: number }; math: { low: number; mid: number; high: number }; total: { low: number; mid: number; high: number } };
  target: number;
  horizon: { days: number; known: boolean };
  dailyMinutes: number;
  studyDaysPerWeek: number;
  focus: FocusSkill[];
  strengths: SkillId[];
  days: CoachDay[];
  projection: { low: number; high: number; minutesForGoal: number | null };
  basis: string[];
  notes: string[];
}

const CHUNK = 30;
const intakeOf = (s: AppState): Intake | undefined => s.profile.intake;
const startOfDay = (now: number) => parseDateKey(dateKey(now));

/**
 * Learning per half hour, in ability units: proportional to the accuracy still missing, so it is fast where a
 * student misses a lot and slow near mastery (a skill answered right every time has little left to give).
 */
const rateAt = (theta: number, notTaught: boolean, given: number) => (0.02 + 0.35 * (1 - testAccuracy(theta))) * (notTaught && given < 60 ? 0.7 : 1) / (1 + given / 240);
const pointsFor = (skill: SkillId, theta: number, d: number) => PER_TEST[skill] * (testAccuracy(theta + d) - testAccuracy(theta)) * 10;

export function stageOf(total: number): Stage { return total < 950 ? 'foundation' : total < 1200 ? 'building' : total < 1400 ? 'sharpening' : 'polishing'; }

/** Shares study minutes between skills, 30 minutes at a time, to the next most valuable half hour. */
export function allocate(ab: Abilities, minutes: number): FocusSkill[] {
  const th = Object.fromEntries(SKILLS.map((k) => [k.id, ab.skills[k.id].theta])) as Record<SkillId, number>;
  const given = Object.fromEntries(SKILLS.map((k) => [k.id, 0])) as Record<SkillId, number>;
  const pts = Object.fromEntries(SKILLS.map((k) => [k.id, 0])) as Record<SkillId, number>;
  for (let left = minutes; left >= CHUNK; left -= CHUNK) {
    let best: SkillId | null = null, bestV = 0, bestD = 0;
    for (const k of SKILLS) {
      const d = rateAt(th[k.id], ab.skills[k.id].notTaught, given[k.id]);
      // a skill whose prerequisite is clearly weaker waits for it: learning it first would not stick
      const blocked = PATH[k.id].prereqs.some((p) => th[p] < th[k.id] - 0.5 && given[p] < 60);
      // what the student is bad at comes first: a skill clearly below their own level in that section is boosted
      const below = Math.max(0, (ab.sections[k.section].theta - ab.skills[k.id].theta) / 0.5);
      const v = pointsFor(k.id, th[k.id], d) * (blocked ? 0.4 : 1) * (1 + 0.8 * Math.min(2, below));
      if (v > bestV) { best = k.id; bestV = v; bestD = d; }
    }
    if (!best) break;
    th[best] += bestD; given[best] += CHUNK; pts[best] += bestV;
  }
  return SKILLS.filter((k) => given[k.id] > 0).map((k) => ({ skill: k.id, minutes: given[k.id], points: pts[k.id], theta: ab.skills[k.id].theta, why: '' }))
    .sort((a, b) => b.points / b.minutes - a.points / a.minutes || b.minutes - a.minutes);
}

/** Puts a weak prerequisite ahead of the skill that builds on it, otherwise keeps value order. A prerequisite the student already handles well does not jump the queue. */
function orderFocus(f: FocusSkill[]): FocusSkill[] {
  const out: FocusSkill[] = [];
  const add = (x: FocusSkill, depth = 0) => {
    if (out.includes(x) || depth > 4) return;
    for (const p of PATH[x.skill].prereqs) { const px = f.find((y) => y.skill === p); if (px && px.theta < x.theta + 0.3) add(px, depth + 1); }
    if (!out.includes(x)) out.push(x);
  };
  for (const x of f) add(x);
  return out;
}

function chancePct(theta: number) { return Math.round(testAccuracy(theta) * 100); }
function focusWhy(ab: Abilities, x: FocusSkill): string {
  const a = ab.skills[x.skill];
  const often = PER_TEST[x.skill] >= 1.5 ? 'one of the most tested skills' : PER_TEST[x.skill] >= 1 ? 'tested about once per module' : 'tested less often, but quick to fix';
  const src = a.notTaught ? 'you have not learned it in class yet, so it starts from the beginning' : a.n ? `you got ${a.correct} of ${a.n} right so far` : a.saidHard ? 'you said it feels hard' : 'not measured yet';
  return `About ${chancePct(a.theta)}% expected on ${SKILL[x.skill].short} questions now (${src}); ${often}.`;
}

export interface CoachOpts { now: number; getQ: (id: string) => Question | undefined; days?: number; /** the question bank, to size practice to what is within reach */ bank?: Question[] }

export function buildCoach(s: AppState, o: CoachOpts): CoachPlan {
  const intake = intakeOf(s);
  const today = dateKey(o.now);
  // today is planned from what was known at the start of the day, or right after the placement check
  const cutoff = Math.max(startOfDay(o.now), s.profile.diagnosticAt && dateKey(s.profile.diagnosticAt) === today ? s.profile.diagnosticAt + 1 : 0);
  const known = s.attempts.filter((a) => a.at < cutoff);
  const ab = estimateAbilities(known, o.getQ, cutoff, intake);
  const rw = sectionBand(ab, 'rw'), math = sectionBand(ab, 'math');
  const total = { low: rw.low + math.low, mid: rw.mid + math.mid, high: rw.high + math.high };
  const stage = stageOf(total.mid);
  const target = Math.max(s.profile.targetScore || 0, 400);
  const daily = Math.max(10, s.profile.dailyMinutes || 30);
  const rest = s.profile.restDays ?? [];
  const perWeek = Math.max(1, 7 - rest.length);
  const horizon = horizonDays(s.profile.examDate, intake?.testWhen, (d) => daysBetween(today, d));
  const flags = new Set(intake?.flags ?? []);
  const hasData = known.length >= 6 || !!intake;
  const notes: string[] = [];

  // how the minutes split: learning versus review, timing and mocks, by stage
  const share = { foundation: { review: 0.12, timing: 0.03 }, building: { review: 0.14, timing: 0.08 }, sharpening: { review: 0.14, timing: 0.16 }, polishing: { review: 0.12, timing: 0.22 } }[stage];
  if (flags.has('time')) share.timing += 0.06;
  const planWindow = Math.min(horizon.days, 42);
  const studyMinutes = Math.round((planWindow * perWeek / 7) * daily);
  const focus = orderFocus(allocate(ab, Math.round(studyMinutes * (1 - share.review - share.timing)))).map((x) => ({ ...x, why: focusWhy(ab, x) }));
  const strengths = SKILLS.filter((k) => ab.skills[k.id].n >= 2 && testAccuracy(ab.skills[k.id].theta) >= 0.85).map((k) => k.id);

  // modelled gain over the whole horizon, and the daily minutes the goal would take
  const projOver = (min: number) => allocate(ab, min).reduce((t, x) => t + x.points, 0);
  const fullMinutes = Math.round((horizon.days * perWeek / 7) * daily * (1 - share.review - share.timing));
  const gain = projOver(fullMinutes);
  const gap = Math.max(0, target - total.mid);
  let minutesForGoal: number | null = null;
  if (gap > gain) {
    for (const m of [30, 45, 60, 90, 120, 180]) if (m > daily && projOver(Math.round((horizon.days * perWeek / 7) * m * (1 - share.review - share.timing))) >= gap) { minutesForGoal = m; break; }
    notes.push(minutesForGoal ? `Your goal of ${target} is about ${gap} points above your estimate. At ${daily} minutes a day that is a stretch; about ${minutesForGoal} minutes a day would give it a fair chance.` : `Your goal of ${target} is about ${gap} points above your estimate, more than ${horizon.known ? 'the time before your test' : 'a couple of months'} usually allows. The plan aims for the biggest gain you can get; a later test date would help.`);
  }

  // ── the next days ──
  const chIds = (k: SkillId) => (COURSES[k] ?? []).map((c) => c.id);
  const fams = workedFamilyIds();
  const passed = (k: SkillId) => chIds(k).filter((c) => (s.chapters[c]?.passedAt ?? Infinity) < cutoff).length;
  const remaining = Object.fromEntries(focus.map((x) => [x.skill, x.minutes])) as Record<string, number>;
  const lessonsLeft = Object.fromEntries(SKILLS.map((k) => [k.id, chIds(k.id).length - passed(k.id)])) as Record<SkillId, number>;
  // teach first when the topic is new, the skill is weak, or the student asked for it; strong students start with practice
  const needsTeaching = (k: SkillId) => lessonsLeft[k] > 0 && (ab.skills[k].notTaught || ab.skills[k].theta < -0.2 || flags.has('lost') || (stage === 'foundation' && passed(k) === 0));
  // everything below reads the state as of the cutoff too, so today's list does not shift while the student works
  const conceptMisses = (k: SkillId) => Object.values(s.mistakes).filter((m) => !m.resolvedAt && m.category === 'concept' && m.lastAt < cutoff && o.getQ(m.qid)?.skill === k).length;
  const openMistakes = Object.values(s.mistakes).filter((m) => m.status === 'unresolved' && m.lastAt < cutoff).length;
  const due = dueIds(s.srs, cutoff).length;
  const recentRight = new Set(known.filter((a) => a.correct && cutoff - a.at < 14 * 86_400_000).map((a) => a.qid));
  const nDays = Math.max(1, Math.min(o.days ?? 14, horizon.known ? horizon.days + 1 : 14));
  const timingFrom = flags.has('time') || stage === 'sharpening' || stage === 'polishing' ? 0.25 : 0.55;
  const days: CoachDay[] = [];
  let studyN = 0, lastMock = -99, sec: Section = focus[0] ? PATH[focus[0].skill].section : 'math';
  const pickSkill = (section: Section | null, not?: SkillId) => {
    const order = focus.filter((x) => remaining[x.skill] > 0 && x.skill !== not);
    return (section ? order.find((x) => PATH[x.skill].section === section) : undefined) ?? order[0];
  };
  const skillTask = (k: SkillId, minutes: number): CoachTask => {
    const name = SKILL[k].short;
    const f = focus.find((x) => x.skill === k);
    const why = f?.why ?? '';
    remaining[k] = (remaining[k] ?? 0) - minutes;
    if (conceptMisses(k) >= 2 && (fams[k] ?? []).length) return { id: '', kind: 'worked', skill: k, section: SKILL[k].section, minutes, title: `Worked examples: ${name}`, why: `You missed ${conceptMisses(k)} ${name} questions on the idea itself. Step-by-step examples fix that faster than more questions.`, href: `/worked/${k}` };
    if (needsTeaching(k)) {
      const next = chIds(k)[chIds(k).length - lessonsLeft[k]];
      lessonsLeft[k] -= 1;
      if (next) return { id: '', kind: 'lesson', skill: k, section: SKILL[k].section, minutes, title: `Learn: ${name}${chIds(k).length > 1 ? ` (chapter ${chIds(k).indexOf(next) + 1} of ${chIds(k).length})` : ''}`, why: `${why} Learn it before practising it.`, href: `/learn/${k}/${next}` };
    }
    // practice only what is within reach: if too little is, learn first
    const reach = o.bank ? o.bank.filter((q) => q.skill === k && !q.official && withinReach(ab, q) && !recentRight.has(q.id)).length : 99;
    if (reach < 3 && lessonsLeft[k] > 0) {
      const next = chIds(k)[chIds(k).length - lessonsLeft[k]];
      lessonsLeft[k] -= 1;
      if (next) return { id: '', kind: 'lesson', skill: k, section: SKILL[k].section, minutes, title: `Learn: ${name} (chapter ${chIds(k).indexOf(next) + 1} of ${chIds(k).length})`, why: `${why} The next step up comes from the lesson; the questions at your level are used up for now.`, href: `/learn/${k}/${next}` };
    }
    const n = Math.max(3, Math.min(Math.round(minutes / 1.6), reach));
    minutes = Math.min(minutes, Math.max(5, Math.round(n * 1.6)));
    return { id: '', kind: 'practice', skill: k, section: SKILL[k].section, minutes, title: `Practice: ${name}`, why: `${why} ${n} questions picked for your level.`, href: `/practice/session?mode=skill&skill=${k}&n=${n}` };
  };

  for (let i = 0; i < nDays; i++) {
    const date = addDays(today, i);
    const left = horizon.known ? horizon.days - i : 99;
    if (horizon.known && left === 0) { days.push({ date, rest: false, testDay: true, focus: 'Test day', tasks: [{ id: `${date}-0`, kind: 'testday', minutes: 0, title: 'Test day: your checklist', why: 'What to bring, when to arrive and how to pace yourself.', href: '/test-day' }] }); continue; }
    const dow = new Date(parseDateKey(date)).getDay();
    if (rest.includes(dow) && !(i === 0 && !hasData)) { days.push({ date, rest: true, focus: 'Rest day', tasks: [] }); continue; }
    const n = studyN++;
    const tasks: CoachTask[] = [];
    let budget = daily;
    const add = (t: CoachTask) => { if (t.minutes > 0) { tasks.push(t); budget -= t.minutes; } };
    if (!hasData && i === 0) {
      add({ id: '', kind: 'placement', minutes: Math.min(20, daily), title: 'Placement check', why: 'Sixteen questions that adapt to you. Your plan is built from them.', href: '/onboarding?step=placement' });
    } else if (horizon.known && left <= 2) {
      add({ id: '', kind: 'review', minutes: Math.min(15, budget), title: 'Light review', why: 'Two days out: keep it light. Nothing new now.', href: '/practice/session?mode=review&n=8' });
      add({ id: '', kind: 'testday', minutes: Math.min(10, budget), title: 'Test-day checklist and calm plan', why: 'Check your admission details, Bluebook and what to bring.', href: '/test-day' });
    } else {
      const mockOk = horizon.days >= 14 && daily >= 90 && n - lastMock >= 7 && i / Math.max(1, nDays) >= 0.3 && (!horizon.known || left >= 4);
      const timingDay = i >= Math.floor(nDays * timingFrom) && n % (stage === 'foundation' ? 7 : stage === 'building' ? 4 : 3) === 2;
      if (mockOk && (stage === 'sharpening' || stage === 'polishing' || horizon.known && left <= 21)) {
        lastMock = n;
        add({ id: '', kind: 'mock', minutes: 134, title: 'Full practice test', why: 'Your stamina and pacing over a whole test, then a report of what to fix. Take it at the time of day your test starts.', href: '/mocks' });
      } else {
        if ((i === 0 ? due >= 3 : n % 2 === 1) && budget >= 25) add({ id: '', kind: 'review', minutes: 8, title: 'Spaced review', why: i === 0 ? `${due} questions you missed are due today. Reviewing them now is how they stick.` : 'Questions you missed come back at growing gaps so they stick.', href: '/practice/session?mode=review&n=6' });
        if (timingDay && budget >= 35) {
          const ts: Section = n % 2 ? 'math' : 'rw';
          if (flags.has('anxiety')) add({ id: '', kind: 'calm', minutes: 3, title: 'Two-minute calm routine', why: 'You said tests make you nervous. Use the routine before every timed set.', href: '/test-day' });
          add({ id: '', kind: 'timed', section: ts, minutes: ts === 'math' ? 35 : 32, title: `Timed module: ${ts === 'math' ? 'Math' : 'Reading and Writing'}`, why: flags.has('accommodations') ? 'Pacing practice. Use your approved extended time instead of the standard clock.' : flags.has('time') ? 'You said you run out of time. Pacing is a skill: practise it on a real module length.' : 'Real test length and pacing, so test day feels familiar.', href: `/practice/timed?section=${ts}` });
        }
        // main block: the next focus skill, alternating sections day to day
        const main = pickSkill(sec);
        if (main && budget >= 10) {
          add({ ...skillTask(main.skill, Math.min(budget, needsTeaching(main.skill) ? 12 : Math.max(10, Math.min(25, budget)))) });
          sec = PATH[main.skill].section === 'math' ? 'rw' : 'math';
        }
        if (budget >= 12) {
          const second = pickSkill(sec, main?.skill);
          if (second) add(skillTask(second.skill, Math.min(budget, 20)));
        }
        if (budget >= 10 && (i === 0 ? openMistakes >= 3 : n % 3 === 0) && (openMistakes > 0 || i > 0)) add({ id: '', kind: 'mistakes', minutes: Math.min(12, budget), title: 'Redo your mistakes', why: flags.has('careless') ? 'You said you make careless mistakes: redoing them, and naming why, is how that stops.' : 'Getting a missed question right on a second try, then two like it, clears it for good.', href: '/practice/session?mode=mistakes&n=6' });
        if (flags.has('ell') && budget >= 8 && n % 2 === 0) add({ id: '', kind: 'vocab', minutes: Math.min(10, budget), title: 'Vocabulary in context', why: 'You said English is not your first language. Ten minutes of words in context, most days, adds up.', href: '/vocabulary' });
        // anything left: more of the main skill
        if (budget >= 8 && main) { const t = tasks.find((x) => x.skill === main.skill && x.kind === 'practice'); if (t) { t.minutes += budget; budget = 0; } }
      }
    }
    const fs = [...new Set(tasks.map((t) => t.skill).filter((k): k is SkillId => !!k))].map((k) => SKILL[k].short);
    days.push({ date, rest: false, focus: fs.length ? fs.join(' and ') : tasks[0]?.title ?? 'Study', tasks: tasks.map((t, j) => ({ ...t, id: `${date}-${j}` })) });
  }
  if (!horizon.known) notes.push('No test date yet, so the plan assumes about two months. Add your date for an exact countdown.');
  if (daily < 45 && horizon.days >= 14) notes.push('Full practice tests take over two hours. With your daily time, the plan uses timed modules instead; take one full official test in Bluebook on a free afternoon before test day.');

  return {
    stage, hasData, estimate: { rw, math, total }, target, horizon, dailyMinutes: daily, studyDaysPerWeek: perWeek,
    focus, strengths, days,
    projection: { low: Math.round(gain * 0.5 / 10) * 10, high: Math.round(gain * 1.3 / 10) * 10, minutesForGoal },
    basis: [...ab.basis, ...(known.length ? [`${new Set(known.map((a) => a.qid)).size} questions you have answered`] : [])],
    notes,
  };
}

/** Marks today's tasks done from what the student actually did today (no honour-system ticking needed). */
export function markDone(plan: CoachPlan, s: AppState, now: number, getQ: (id: string) => Question | undefined): CoachPlan {
  const t = dateKey(now);
  const todayA = s.attempts.filter((a) => dateKey(a.at) === t);
  const days = plan.days.map((d) => d.date !== t ? d : {
    ...d, tasks: d.tasks.map((x) => {
      const by = (pred: (m: string, skill?: SkillId) => boolean) => todayA.filter((a) => pred(a.mode, getQ(a.qid)?.skill)).length;
      const done = !!s.planDone[x.id] || (
        x.kind === 'practice' ? by((m, k) => k === x.skill && m !== 'review' && m !== 'diagnostic') >= Math.min(5, Math.round(x.minutes / 2)) :
        x.kind === 'lesson' ? Object.entries(s.chapters).some(([id, c]) => c.passedAt && dateKey(c.passedAt) === t && (COURSES[x.skill!] ?? []).some((ch) => ch.id === id)) || dateKey(s.lessonsDone?.[x.skill!] ?? 0) === t :
        x.kind === 'worked' ? Object.values(s.path?.worked ?? {}).some((at) => dateKey(at) === t) :
        x.kind === 'review' ? by((m) => m === 'review') >= 3 :
        x.kind === 'mistakes' ? by((m) => m === 'mistakes') >= 3 :
        x.kind === 'timed' ? by((m) => m === 'timed') >= 10 :
        x.kind === 'mock' ? s.mocks.some((m) => dateKey(m.startedAt) === t) :
        x.kind === 'placement' ? !!s.profile.diagnosticAt :
        false);
      return { ...x, done };
    }),
  });
  return { ...plan, days };
}

/** The skills the coach wants worked on, best first: the Path highlights the first one. */
export const coachPriority = (p: CoachPlan): SkillId[] => p.focus.map((f) => f.skill);
