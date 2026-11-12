import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bot, Brain, CheckCircle2, ChevronDown, Circle, ClipboardList, Flame, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getQuestion } from '@/data/questions';
import { snapshot, useStore } from '@/lib/store';
import { useLevel, useOverview, useSkillStats, useStreak } from '@/lib/hooks';
import { accuracyBlocks, weekMinutes } from '@/lib/engine/analytics';
import { findWeaknesses } from '@/lib/engine/adaptive';
import { todaysMission } from '@/lib/engine/plan';
import { fmtRange } from '@/lib/engine/scoring';
import { MASTERY_LEVELS } from '@/lib/engine/mastery';
import { ACHIEVEMENT } from '@/lib/engine/achievements';
import { DIFFICULTIES, DIFFICULTY_NAME, SKILLS } from '@/lib/taxonomy';
import { clamp, dateKey, daysBetween } from '@/lib/util';
import { Habitat, Pet, type PetMood } from '@/components/Pet';
import { Card, Progress, Ring } from '@/components/ui';

export const chartTip = { contentStyle: { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12, color: 'rgb(var(--ink))' }, labelStyle: { color: 'rgb(var(--muted))' }, cursor: { fill: 'rgb(var(--raised))', opacity: 0.5 } };
export const axis = { tick: { fill: 'rgb(var(--muted))', fontSize: 11 }, axisLine: { stroke: 'rgb(var(--line))' }, tickLine: false as const };

const SHORTCUTS = [
  { href: '/practice/session?mode=smart&n=10', label: 'Smart Practice', icon: Brain },
  { href: '/mistakes', label: 'Mistake Bucket', icon: Target },
  { href: '/mocks', label: 'Mock Exam', icon: ClipboardList },
  { href: '/tutor', label: 'Ask the Tutor', icon: Bot },
];

/**
 * Homebase. One clear next step first; everything else is a glance or a click away.
 * Detailed charts stay folded until asked for, and live in full on the Analytics page.
 */
export function DashboardPage() {
  const router = useRouter();
  const s = useStore();
  const ov = useOverview();
  const stats = useSkillStats();
  const streak = useStreak();
  const level = useLevel();
  const [more, setMore] = useState(false);
  const [allTasks, setAllTasks] = useState(false);
  const now = Date.now();
  const today = dateKey(now);

  useEffect(() => { if (!s.profile.onboardedAt && s.attempts.length === 0) router.replace('/onboarding'); }, [s.profile.onboardedAt, s.attempts.length, router]);

  const mission = useMemo(() => todaysMission(snapshot(), getQuestion, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.attempts.length, s.plan, s.planDone, today]);
  const weak = useMemo(() => findWeaknesses(snapshot(), getQuestion, 1)[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.attempts.length]);
  const blocks = useMemo(() => (more ? accuracyBlocks(snapshot(), 15) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.attempts.length, more]);

  const est = ov.estimate.total;
  const target = s.profile.targetScore;
  const base = s.profile.currentScore ?? (est ? Math.min(est.mid, target - 10) : undefined);
  const progress = est && base !== undefined ? clamp(((est.mid - Math.min(base, est.mid)) / Math.max(10, target - Math.min(base, est.mid))) * 100, 0, 100) : 0;
  const daysLeft = s.profile.examDate ? daysBetween(today, s.profile.examDate) : null;
  const todayMin = Math.round((s.activity[today]?.ms ?? 0) / 60000);
  const goal = s.profile.dailyMinutes || 45;
  const lastDay = Object.keys(s.activity).sort().pop();
  const away = lastDay ? daysBetween(lastDay, today) : 0;
  const hour = new Date(now).getHours();
  const petMood: PetMood = s.pet.lastEvent && now - s.pet.lastEvent.at < 20000 ? 'celebrate' : hour >= 23 || hour < 6 || away >= 3 ? 'sleep' : streak.studiedToday ? 'happy' : 'idle';
  const recent = Object.entries(s.achievements).sort((a, b) => b[1] - a[1])[0];
  const tasks = mission.rest ? [] : mission.tasks;
  const nextTask = tasks.find((t) => !t.done);
  const others = tasks.filter((t) => t !== nextTask);
  const doneCount = tasks.filter((t) => t.done).length;
  const levels = [0, 1, 2, 3, 4].map((l) => SKILLS.filter((k) => stats[k.id].level === l).length);
  const diffData = DIFFICULTIES.map((d) => ({ name: DIFFICULTY_NAME[d], accuracy: ov.byDifficulty[d].pct, n: ov.byDifficulty[d].n }));
  const greeting = `${away >= 3 ? 'Good to see you again' : 'Welcome back'}${s.profile.name ? `, ${s.profile.name}` : ''}!`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl" data-testid="greeting">{greeting} <span className="grad-text">Let&apos;s work toward {target}.</span></h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1"><Flame size={14} className="text-warn" />{streak.current}-day streak</span>
          {daysLeft !== null && daysLeft >= 0 && <span>· {daysLeft === 0 ? 'Test day is today' : `${daysLeft} days to your SAT`}</span>}
          <span>· {todayMin >= goal ? 'Daily goal done' : `${todayMin} of ${goal} min today`}</span>
        </p>
      </header>

      {/* The one thing to do next */}
      <section className="card overflow-hidden p-0" data-testid="mission">
        <div className="grid sm:grid-cols-[1fr_auto]">
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand2">{mission.rest ? 'Rest day' : nextTask ? `Next up · ${doneCount} of ${tasks.length} done today` : 'Today is complete'}</p>
            {mission.rest ? (
              <><h2 className="mt-1.5 text-xl font-bold">Take the day off</h2><p className="mt-1 text-sm text-muted">Recovery is part of the plan. Anything you do today is a bonus.</p><Link href="/practice/session?mode=smart&n=5" className="btn-ghost mt-4">Optional: 5 light questions</Link></>
            ) : nextTask ? (
              <><h2 className="mt-1.5 text-xl font-bold">{nextTask.title}</h2><p className="mt-1 text-sm text-muted">{nextTask.detail ? `${nextTask.detail} · ` : ''}about {nextTask.minutes} min</p>
                <div className="mt-4 flex flex-wrap items-center gap-2"><Link href={nextTask.href} className="btn-primary !px-5 !py-3 text-base">Start<ArrowRight size={18} /></Link><button className="btn-quiet" onClick={() => s.togglePlanTask(nextTask.id)}>Mark as done</button></div></>
            ) : (
              <><h2 className="mt-1.5 text-xl font-bold">You finished today&apos;s mission</h2><p className="mt-1 text-sm text-muted">Stop here with a clear conscience, or keep the momentum going.</p><Link href="/practice/session?mode=smart&n=10" className="btn-primary mt-4">Keep practicing<ArrowRight size={16} /></Link></>
            )}
          </div>
          <div className="flex items-center justify-center border-t border-line bg-raised/40 px-8 py-5 sm:border-l sm:border-t-0">
            <Ring value={clamp((todayMin / goal) * 100, 0, 100)} size={96} stroke={8} label={`Daily goal: ${todayMin} of ${goal} minutes`}><div className="text-center leading-tight"><div className="font-display text-xl">{todayMin}</div><div className="text-[10px] font-medium text-muted">of {goal} min</div></div></Ring>
          </div>
        </div>
        {others.length > 0 && (
          <div className="border-t border-line">
            <button className="flex w-full items-center justify-between px-6 py-3 text-sm text-muted hover:text-ink" onClick={() => setAllTasks(!allTasks)} aria-expanded={allTasks}><span>{allTasks ? 'Hide' : 'See'} the rest of today ({others.length} more)</span><ChevronDown size={16} className={allTasks ? 'rotate-180' : ''} /></button>
            {allTasks && (
              <ul className="divide-y divide-line px-6 pb-2">
                {others.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <button onClick={() => s.togglePlanTask(t.id)} aria-pressed={!!t.done} aria-label={`Mark "${t.title}" ${t.done ? 'not done' : 'done'}`} className="shrink-0">{t.done ? <CheckCircle2 className="text-ok" size={19} /> : <Circle className="text-faint" size={19} />}</button>
                    <span className={`min-w-0 flex-1 truncate text-sm ${t.done ? 'text-muted line-through' : ''}`}>{t.title}</span>
                    <span className="text-xs tabular-nums text-muted">{t.minutes} min</span>
                    <Link href={t.href} className="text-sm font-semibold text-brand2 hover:underline">Start</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Where you stand, at a glance */}
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <Card>
          <div className="flex items-baseline justify-between"><h2 className="font-bold">Your progress</h2><Link href="/analytics" className="text-sm font-semibold text-brand2 hover:underline">Analytics →</Link></div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div><div className="font-display text-2xl font-bold" data-testid="estimate">{est ? fmtRange(est) : '—'}</div><div className="text-xs text-muted">estimated range</div></div>
            <div><div className="font-display text-2xl font-bold">{ov.total ? `${ov.all.pct}%` : '—'}</div><div className="text-xs text-muted">accuracy</div></div>
            <div><div className="font-display text-2xl font-bold" data-testid="stat-questions">{ov.total}</div><div className="text-xs text-muted">questions</div></div>
          </div>
          <div className="mt-5"><div className="mb-1.5 flex justify-between text-xs text-muted"><span>{base !== undefined ? `Start ${base}` : 'Start'}</span><span>Target {target}</span></div><Progress value={progress} label="Progress from starting score to target" /></div>
          <p className="mt-2 text-xs text-faint">{est ? 'An unofficial Stellify estimate, not a College Board score.' : 'Your estimate appears after the diagnostic or about 8 questions per section.'}{!s.profile.diagnosticAt && <> <Link href="/diagnostic" className="font-semibold text-brand2 hover:underline">Take the diagnostic</Link></>}</p>
        </Card>
        <Card className="!p-0 overflow-hidden" data-testid="pet-card">
          <Link href="/pet" aria-label={`Visit ${s.pet.name}`}>
            <Habitat id={s.pet.equipped.habitat} className="!rounded-none"><div className="flex h-32 items-end justify-center"><Pet mood={petMood} level={level.level} equipped={s.pet.equipped} size={116} /></div></Habitat>
            <div className="p-4">
              <div className="flex items-center justify-between text-sm"><span className="font-bold">{s.pet.name}</span><span className="text-muted">Level {level.level}</span></div>
              <Progress value={level.progress * 100} className="mt-2" label="XP to next level" />
              <p className="mt-2 line-clamp-2 text-xs text-muted">{recent ? `Latest: ${ACHIEVEMENT[recent[0]]?.title}` : away >= 3 ? 'Was napping while you were away.' : 'Ready to study with you.'}</p>
            </div>
          </Link>
        </Card>
      </div>

      {/* One insight, not a wall of them */}
      {weak && (
        <section aria-label="Biggest opportunity" className="flex flex-wrap items-center gap-4 rounded-2xl border border-warn/30 bg-warn/5 p-5">
          <Brain className="shrink-0 text-warn" size={22} />
          <p className="min-w-0 flex-1 text-sm">{weak.message}</p>
          <div className="flex gap-2"><Link href={weak.href} className="btn-primary !py-2">Open lesson</Link><Link href={`/practice/session?mode=skill&skill=${weak.skill}&n=6`} className="btn-ghost !py-2">Practice</Link></div>
        </section>
      )}

      <nav aria-label="Shortcuts" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SHORTCUTS.map((q) => <Link key={q.label} href={q.href} className="card flex items-center gap-2.5 p-4 text-sm font-semibold transition-colors hover:border-brand/60"><q.icon size={18} className="text-brand" aria-hidden />{q.label}</Link>)}
      </nav>

      {/* Details on request */}
      <section>
        <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-muted hover:text-ink" onClick={() => setMore(!more)} aria-expanded={more} data-testid="more-details">{more ? 'Hide details' : 'Show performance details'}<ChevronDown size={16} className={more ? 'rotate-180' : ''} /></button>
        {more && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
              {[['Math', ov.bySection.math.n ? `${ov.bySection.math.pct}%` : '—', `est. ${fmtRange(ov.estimate.math)}`], ['Reading & Writing', ov.bySection.rw.n ? `${ov.bySection.rw.pct}%` : '—', `est. ${fmtRange(ov.estimate.rw)}`], ['This week', `${weekMinutes(snapshot())} min`, 'study time'], ['Best streak', `${streak.best} d`, `current ${streak.current}`]].map(([l, v, sub]) => (
                <div key={l} className="card p-3"><div className="text-xs text-faint">{l}</div><div className="font-display text-xl font-bold">{v}</div><div className="text-xs text-muted">{sub}</div></div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Card><h3 className="text-sm font-semibold">Accuracy by difficulty</h3>{ov.total ? <div className="mt-2 h-40"><ResponsiveContainer><BarChart data={diffData}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis domain={[0, 100]} {...axis} width={28} /><Tooltip {...chartTip} formatter={(v, _n, p) => [`${v}% of ${(p.payload as { n: number }).n}`, 'Accuracy']} /><Bar dataKey="accuracy" fill="rgb(var(--brand))" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="mt-4 text-sm text-muted">Answer a few questions to see this.</p>}</Card>
              <Card><h3 className="text-sm font-semibold">Improvement over time</h3>{blocks.length >= 2 ? <div className="mt-2 h-40"><ResponsiveContainer><LineChart data={blocks}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis domain={[0, 100]} {...axis} width={28} /><Tooltip {...chartTip} formatter={(v) => [`${v}%`, 'Accuracy']} /><Line type="monotone" dataKey="accuracy" stroke="rgb(var(--brand2))" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div> : <p className="mt-4 text-sm text-muted">Appears after 30 questions.</p>}</Card>
              <Card><h3 className="text-sm font-semibold">Skill mastery</h3><ul className="mt-3 space-y-2">{[4, 3, 2, 1, 0].map((l) => <li key={l} className="flex items-center gap-2 text-xs"><span className="w-20 text-muted">{MASTERY_LEVELS[l]}</span><Progress value={(levels[l] / SKILLS.length) * 100} tone={l >= 3 ? 'ok' : l === 2 ? 'brand' : l === 1 ? 'warn' : 'bad'} className="flex-1" label={`${MASTERY_LEVELS[l]} skills`} /><span className="w-5 text-right font-semibold tabular-nums">{levels[l]}</span></li>)}</ul><Link href="/learn" className="mt-3 inline-block text-xs font-semibold text-brand2 hover:underline">All {SKILLS.length} skills →</Link></Card>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
