import type { MockAttempt, PlanDay, PlanTask, Profile, Question, ScoreRange, Section, SkillId, StudyPlan } from '../types';
import { DOMAIN, SKILL } from '../taxonomy';
import { isCorrect } from '../answers';
import { addDays, dateKey, daysBetween, parseDateKey } from '../util';
import { pointsPerQuestion } from '../fullTest/score';
import { DISTRACTORS, TRAPS, type TrapCode } from '@/data/questions/distractors';

/**
 * A study plan built from one test. Every missed question is weighed by what it costs on the
 * score: the number of misses in a skill times the scaled points one more correct answer is worth
 * near your section score (read from the College Board conversion curve). The skills with the most
 * points at stake get the most days, each worked through lesson → official practice → redo of
 * your own missed questions, with timed work if time was the problem and a full test each week.
 */
export interface FocusSkill {
  skill: SkillId; section: Section; missed: number; total: number;
  /** estimated scaled points available if these questions were right */
  points: number;
  missedIds: string[];
  /** misses that took much longer than the test's pace */
  slow: number;
  blanks: number;
  /** most common trap among wrong answers with a known trap */
  trap?: { label: string; tip: string; count: number };
}
export interface SectionTiming { section: Section; msUsed: number; msAllowed: number; unanswered: number; note: string }
export interface TestReport {
  focus: FocusSkill[]; strengths: SkillId[]; timing: SectionTiming[];
  /** total points estimated to be at stake in the focus skills */
  gain: number;
  headline: string;
}

const PACE: Record<Section, number> = { rw: (32 * 60_000) / 27, math: (35 * 60_000) / 22 };

export function analyzeTest(mock: MockAttempt, getQ: (id: string) => Question | undefined, scores?: { rw: ScoreRange | null; math: ScoreRange | null }): TestReport {
  const bySkill = new Map<SkillId, FocusSkill & { traps: Map<TrapCode, number> }>();
  const timing: SectionTiming[] = [];
  for (const sec of ['rw', 'math'] as Section[]) {
    const mods = mock.modules.filter((m) => m.section === sec);
    if (!mods.length) continue;
    const pace = mods.reduce((s, m) => s + m.msAllowed, 0) / Math.max(1, mods.reduce((s, m) => s + m.qids.length, 0));
    const score = (sec === 'rw' ? scores?.rw : scores?.math)?.mid ?? 500;
    const ppq = pointsPerQuestion(sec, score);
    let unanswered = 0, used = 0, allowed = 0;
    for (const m of mods) {
      used += m.msUsed; allowed += m.msAllowed;
      for (const id of m.qids) {
        const q = getQ(id);
        if (!q) continue;
        const a = m.answers[id] ?? null;
        const blank = a === null || a === '';
        if (blank) unanswered++;
        const f = bySkill.get(q.skill) ?? { skill: q.skill, section: sec, missed: 0, total: 0, points: 0, missedIds: [] as string[], slow: 0, blanks: 0, traps: new Map<TrapCode, number>() };
        f.total++;
        if (!isCorrect(q, a)) {
          f.missed++; f.points += ppq; f.missedIds.push(id);
          if (blank) f.blanks++;
          if ((m.perQuestionMs[id] ?? 0) > pace * 1.6) f.slow++;
          const code = !blank && q.type === 'mcq' ? DISTRACTORS[id]?.[Number(a)] : null;
          if (code) f.traps.set(code, (f.traps.get(code) ?? 0) + 1);
        }
        bySkill.set(q.skill, f);
      }
    }
    const ranOut = used >= allowed * 0.97;
    const fast = used < allowed * 0.6 && [...bySkill.values()].some((f) => f.section === sec && f.missed);
    timing.push({
      section: sec, msUsed: used, msAllowed: allowed, unanswered,
      note: ranOut ? `Time ran short${unanswered ? `: ${unanswered} left blank` : ''}. There is no penalty for guessing, so answer every question, and practice timed modules to build pace (about ${Math.round(PACE[sec] / 1000)} seconds a question).`
        : unanswered ? `You left ${unanswered} question${unanswered === 1 ? '' : 's'} blank with time to spare. There is no penalty for guessing: answer every question, then use leftover time to check.`
        : fast ? 'You finished with lots of time left but missed questions: slow down, reread the question, and check each answer against the text or your work.'
        : 'Your pace was fine for this section.',
    });
  }
  const all = [...bySkill.values()];
  const focus = all.filter((f) => f.missed).sort((a, b) => b.points - a.points || b.missed / b.total - a.missed / a.total).slice(0, 5)
    .map(({ traps, ...f }) => { const top = [...traps].sort((a, b) => b[1] - a[1])[0]; return { ...f, trap: top ? { ...TRAPS[top[0]], count: top[1] } : undefined }; });
  const strengths = all.filter((f) => !f.missed && f.total >= 2).map((f) => f.skill);
  const gain = focus.reduce((s, f) => s + f.points, 0);
  const headline = focus.length
    ? `About ${gain} points are at stake in ${focus.length} skill${focus.length === 1 ? '' : 's'}: ${focus.slice(0, 3).map((f) => SKILL[f.skill].short).join(', ')}.`
    : 'No missed questions: keep your edge with full tests under real timing.';
  return { focus, strengths, timing, gain, headline };
}

const task = (t: Omit<PlanTask, 'id'>): PlanTask => ({ ...t, id: '' });

/** Day-by-day plan from tomorrow to the exam (or four weeks), driven by the test's focus skills. */
export function planFromTest(report: TestReport, profile: Pick<Profile, 'examDate' | 'dailyMinutes' | 'restDays'>, official: Question[], solved: Set<string>, nextTest: { href: string; title: string }, testName: string, now: number): StudyPlan {
  const start = addDays(dateKey(now), 1);
  const untilExam = profile.examDate ? daysBetween(start, profile.examDate) : 28;
  const length = Math.max(7, Math.min(42, untilExam > 0 ? untilExam : 28));
  const budget = Math.max(20, profile.dailyMinutes || 45);
  const rest = profile.restDays ?? [0];
  const focus = report.focus.length ? report.focus : [];
  // more days for skills with more points at stake
  const rota: FocusSkill[] = focus.flatMap((f) => Array<FocusSkill>(Math.max(1, Math.round(f.points / Math.max(10, focus[focus.length - 1]?.points ?? 10)))).fill(f));
  const timedSecs = report.timing.filter((t) => /Time ran short/.test(t.note)).map((t) => t.section);
  const taught = new Set<SkillId>();
  const days: PlanDay[] = [];
  let study = 0;
  for (let i = 0; i < length; i++) {
    const date = addDays(start, i);
    const week = Math.floor(i / 7) + 1;
    const dow = new Date(parseDateKey(date)).getDay();
    if (rest.includes(dow)) { days.push({ date, week, phase: `Week ${week}`, rest: true, focus: 'Rest day', tasks: [] }); continue; }
    const n = study++;
    let tasks: PlanTask[] = [];
    let label = '';
    const last = i === length - 1;
    if (last && length >= 10) { tasks = [task({ kind: 'review', minutes: 20, title: 'Light review: your missed questions', detail: 'Reread the explanations; no new material', href: '/mistakes' })]; label = 'Light review before test day'; }
    else if (n > 0 && n % 6 === 5) {
      tasks = [task({ kind: 'mock', minutes: 134, title: nextTest.title, detail: 'Full test under real timing, then read the new report', href: nextTest.href })];
      label = 'Full test: measure your progress';
    } else if (!rota.length) {
      tasks = [task({ kind: 'practice', minutes: 30, title: 'Hardest questions', detail: 'Keep your edge on the toughest items', href: '/practice/hard' })];
      label = 'Challenge practice';
    } else {
      const f = rota[n % rota.length];
      const s = SKILL[f.skill];
      if (!taught.has(f.skill)) { tasks.push(task({ kind: 'lesson', skill: f.skill, section: f.section, minutes: 15, title: `Lesson: ${s.short}`, detail: 'Rebuild the method before practicing', href: `/learn/${f.skill}` })); taught.add(f.skill); }
      const off = official.filter((q) => q.skill === f.skill && !solved.has(q.id) && !f.missedIds.includes(q.id)).slice((n * 6) % 30, (n * 6) % 30 + 6).map((q) => q.id);
      tasks.push(off.length >= 3
        ? task({ kind: 'practice', skill: f.skill, section: f.section, minutes: 20, title: `Official practice: ${s.short}`, detail: `${off.length} College Board questions you have not solved yet`, href: `/practice/session?mode=custom&ids=${off.join(',')}&back=/calendar` })
        : task({ kind: 'practice', skill: f.skill, section: f.section, minutes: 20, title: `Hard practice: ${s.short}`, detail: '8 hard questions', href: `/practice/session?mode=skill&skill=${f.skill}&n=8&diff=hard,very-hard` }));
      tasks.push(task({ kind: 'mistakes', skill: f.skill, section: f.section, minutes: 10, title: `Redo your ${f.missed} missed ${s.short} question${f.missed === 1 ? '' : 's'}`, detail: f.trap ? `Watch for: ${f.trap.label}. ${f.trap.tip}` : 'Cover the explanation, solve again, then compare', href: `/practice/session?mode=custom&ids=${f.missedIds.join(',')}&back=/calendar` }));
      if (timedSecs.length && n % 3 === 2) { const sec = timedSecs[n % timedSecs.length]; tasks.push(task({ kind: 'timed', section: sec, minutes: sec === 'math' ? 35 : 32, title: `Timed module: ${sec === 'math' ? 'Math' : 'Reading & Writing'}`, detail: 'Pace practice: you ran short of time on the test', href: `/practice/timed?section=${sec}` })); }
      label = `${s.short} (${DOMAIN[s.domain].name})`;
    }
    // stay within the daily budget except on full-test days
    let used = 0;
    tasks = tasks.filter((t) => { if (t.kind === 'mock') return true; if (used + t.minutes <= budget + 5 || used === 0) { used += t.minutes; return true; } return false; }).map((t, j) => ({ ...t, id: `${date}-t${j}` }));
    days.push({ date, week, phase: `Week ${week}`, rest: false, focus: label, tasks });
  }
  return { createdAt: now, startDate: start, days, basis: `Built from your ${testName} results: ${report.headline}` };
}
