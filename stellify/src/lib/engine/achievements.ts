import type { AppState, Question, SkillId } from '../types';
import { SKILLS, skillsOfDomain } from '../taxonomy';
import { computeAllSkillStats } from './mastery';
import { sectionEstimate, totalRange } from './scoring';
import { computeStreak } from './streak';
import { levelFromXp } from './xp';

export interface Achievement { id: string; title: string; desc: string; icon: string; coins: number }

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-10', title: 'First 10 Questions', desc: 'Answer 10 questions.', icon: 'Sparkles', coins: 20 },
  { id: 'first-100', title: 'First 100 Questions', desc: 'Answer 100 questions.', icon: 'Flame', coins: 60 },
  { id: 'q-500', title: '500 Questions', desc: 'Answer 500 questions.', icon: 'Trophy', coins: 200 },
  { id: 'perfect-10', title: '100% Accuracy Challenge', desc: 'Answer 10 questions in a row correctly without hints.', icon: 'Target', coins: 60 },
  { id: 'hard-25', title: 'Hard Hitter', desc: 'Answer 25 very hard questions correctly.', icon: 'Zap', coins: 80 },
  { id: 'grammar-master', title: 'Grammar Master', desc: 'Reach Proficient or higher in both Standard English Conventions skills.', icon: 'PenLine', coins: 100 },
  { id: 'algebra-specialist', title: 'Algebra Specialist', desc: 'Reach Proficient or higher in every Algebra skill.', icon: 'Sigma', coins: 100 },
  { id: 'advanced-expert', title: 'Advanced Math Expert', desc: 'Reach Proficient or higher in every Advanced Math skill.', icon: 'FunctionSquare', coins: 120 },
  { id: 'reader', title: 'Close Reader', desc: 'Reach Proficient or higher in every Information and Ideas skill.', icon: 'BookOpen', coins: 100 },
  { id: 'streak-3', title: '3-Day Streak', desc: 'Study three days in a row.', icon: 'CalendarCheck', coins: 20 },
  { id: 'streak-10', title: '10-Day Streak', desc: 'Study ten days in a row (planned rest days do not break a streak).', icon: 'CalendarHeart', coins: 80 },
  { id: 'diagnostic', title: 'Starting Line', desc: 'Complete the diagnostic.', icon: 'Compass', coins: 40 },
  { id: 'mock-champion', title: 'Mock Exam Champion', desc: 'Complete a full-length mock exam.', icon: 'Medal', coins: 150 },
  { id: 'fix-1', title: 'First Fix', desc: 'Resolve a mistake through redo and related practice.', icon: 'Wrench', coins: 20 },
  { id: 'fix-25', title: 'Mistake Tamer', desc: 'Resolve 25 mistakes.', icon: 'ShieldCheck', coins: 120 },
  { id: 'daily-7', title: 'Daily Devotee', desc: 'Complete 7 daily challenges.', icon: 'Sun', coins: 60 },
  { id: 'lessons-10', title: 'Lesson Scholar', desc: 'Complete 10 lessons.', icon: 'GraduationCap', coins: 60 },
  { id: 'vocab-50', title: 'Word Collector', desc: 'Learn 50 vocabulary words.', icon: 'Languages', coins: 60 },
  { id: 'first-master', title: 'First Mastery', desc: 'Master any skill.', icon: 'Star', coins: 100 },
  { id: 'pet-10', title: 'Rising Star', desc: 'Raise your companion to level 10.', icon: 'Rocket', coins: 100 },
  { id: 'm-1500', title: '1500 Milestone', desc: 'Reach an estimated score of 1500 (practice estimate or mock exam).', icon: 'Mountain', coins: 250 },
  { id: 'm-1600', title: '1600 Mastery', desc: 'Master every skill in the curriculum.', icon: 'Crown', coins: 500 },
];
export const ACHIEVEMENT = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, Achievement>;

/** Returns ids of achievements that are satisfied but not yet recorded. */
export function newAchievements(s: AppState, getQ: (id: string) => Question | undefined, today?: string): string[] {
  const done = (id: string) => !!s.achievements[id];
  const scored = s.attempts.filter((a) => !a.abandoned);
  const out: string[] = [];
  const add = (id: string, cond: () => boolean) => { if (!done(id) && cond()) out.push(id); };

  add('first-10', () => scored.length >= 10);
  add('first-100', () => scored.length >= 100);
  add('q-500', () => scored.length >= 500);
  add('perfect-10', () => {
    let run = 0;
    for (const a of scored) { run = a.correct && a.hints === 0 ? run + 1 : 0; if (run >= 10) return true; }
    return false;
  });
  add('hard-25', () => scored.filter((a) => a.correct && getQ(a.qid)?.difficulty === 'very-hard').length >= 25);
  const needStats = ['grammar-master', 'algebra-specialist', 'advanced-expert', 'reader', 'first-master', 'm-1600'].some((id) => !done(id)) && scored.length >= 8;
  if (needStats) {
    const st = computeAllSkillStats(s.attempts, getQ);
    const allAt = (ids: SkillId[], lvl: number) => ids.every((id) => st[id].level >= lvl);
    add('grammar-master', () => allAt(skillsOfDomain('sec').map((k) => k.id), 3));
    add('algebra-specialist', () => allAt(skillsOfDomain('alg').map((k) => k.id), 3));
    add('advanced-expert', () => allAt(skillsOfDomain('adv').map((k) => k.id), 3));
    add('reader', () => allAt(skillsOfDomain('ii').map((k) => k.id), 3));
    add('first-master', () => SKILLS.some((k) => st[k.id].level === 4));
    add('m-1600', () => allAt(SKILLS.map((k) => k.id), 4));
  }
  const streak = computeStreak(s.activity, s.profile.restDays, today);
  add('streak-3', () => streak.best >= 3);
  add('streak-10', () => streak.best >= 10);
  add('diagnostic', () => !!s.profile.diagnosticAt);
  add('mock-champion', () => s.mocks.some((m) => m.kind === 'full' && m.completedAt));
  const resolved = Object.values(s.mistakes).filter((m) => m.status === 'resolved').length;
  add('fix-1', () => resolved >= 1);
  add('fix-25', () => resolved >= 25);
  add('daily-7', () => Object.keys(s.daily).length >= 7);
  add('lessons-10', () => Object.keys(s.lessonsDone).length >= 10);
  add('vocab-50', () => Object.values(s.vocabSrs).filter((c) => c.reps >= 2).length >= 50);
  add('pet-10', () => levelFromXp(s.pet.xp).level >= 10);
  add('m-1500', () => {
    if (s.mocks.some((m) => (m.scores?.total.mid ?? 0) >= 1500)) return true;
    if (scored.length < 60) return false;
    const t = totalRange(sectionEstimate('rw', s.attempts, getQ), sectionEstimate('math', s.attempts, getQ));
    return !!t && t.mid >= 1500;
  });
  return out;
}
