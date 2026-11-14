import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Brain, CheckCircle2, ChevronDown, Circle, Coins, Flame, Gift, Play, Star, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getQuestion } from '@/data/questions';
import { snapshot, useStore } from '@/lib/store';
import { useLevel, useOverview, useSkillStats, useStreak } from '@/lib/hooks';
import { accuracyBlocks, weekMinutes } from '@/lib/engine/analytics';
import { findWeaknesses } from '@/lib/engine/adaptive';
import { todaysMission } from '@/lib/engine/plan';
import { CHEST, dailyQuests } from '@/lib/engine/quests';
import { VISUAL_LESSONS } from '@/data/visual-lessons';
import { COURSES } from '@/data/courses';
import { sfx } from '@/lib/sfx';
import { Confetti } from '@/components/Confetti';
import { fmtRange } from '@/lib/engine/scoring';
import { MASTERY_LEVELS } from '@/lib/engine/mastery';
import { ACHIEVEMENT } from '@/lib/engine/achievements';
import { DIFFICULTIES, DIFFICULTY_NAME, SKILL, SKILLS } from '@/lib/taxonomy';
import { clamp, dateKey, daysBetween } from '@/lib/util';
import { Habitat, Pet, type PetMood } from '@/components/Pet';
import { Card, Progress, Ring } from '@/components/ui';

export const chartTip = { contentStyle: { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12, color: 'rgb(var(--ink))' }, labelStyle: { color: 'rgb(var(--muted))' }, cursor: { fill: 'rgb(var(--raised))', opacity: 0.5 } };
export const axis = { tick: { fill: 'rgb(var(--muted))', fontSize: 11 }, axisLine: { stroke: 'rgb(var(--line))' }, tickLine: false as const };

const MODES = [
  { href: '/practice/session?mode=smart&n=10', label: 'Smart Practice', icon: '🧠', sub: 'Picks what you need' },
  { href: '/practice/hard', label: 'Boss Rush', icon: '🔥', sub: 'Hard and beyond' },
  { href: '/speed', label: 'Speed Run', icon: '⚡', sub: 'Beat the clock' },
  { href: '/arena', label: 'Arena', icon: '🏟️', sub: 'Chase a high score' },
  { href: '/mistakes', label: 'Mistake Bucket', icon: '🧹', sub: 'Turn misses into wins' },
  { href: '/mocks', label: 'Mock Exam', icon: '📝', sub: 'Full adaptive test' },
];

/**
 * Home hub. Lumi up top, one clear next step, three daily quests, and the next stop on the
 * lesson map. Game modes sit below; detailed charts stay folded until asked for.
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
  const [poked, setPoked] = useState(0);
  const [fire, setFire] = useState(0);
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

  const quests = useMemo(() => dailyQuests(snapshot(), getQuestion, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.attempts.length, s.activity, s.quests, s.daily, s.mistakes, today]);
  const claimedToday = s.quests?.[today] ?? [];
  const chestReady = quests.every((q) => q.claimed) && !claimedToday.includes(CHEST.id);
  const chestOpen = claimedToday.includes(CHEST.id);
  const claim = (id: string) => { if (s.claimQuest(id)) { setFire(Date.now()); sfx(id === CHEST.id ? 'win' : 'combo'); } };
  const starMap = s.lessonStars ?? {};
  const totalStars = SKILLS.reduce((n, k) => n + (starMap[k.id] ?? 0), 0);

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
  const petMood: PetMood = now - poked < 1400 ? 'celebrate' : s.pet.lastEvent && now - s.pet.lastEvent.at < 20000 ? 'celebrate' : hour >= 23 || hour < 6 || away >= 3 ? 'sleep' : streak.studiedToday ? 'happy' : 'idle';
  const recent = Object.entries(s.achievements).sort((a, b) => b[1] - a[1])[0];
  const tasks = mission.rest ? [] : mission.tasks;
  const nextTask = tasks.find((t) => !t.done);
  const others = tasks.filter((t) => t !== nextTask);
  const doneCount = tasks.filter((t) => t.done).length;
  const levels = [0, 1, 2, 3, 4].map((l) => SKILLS.filter((k) => stats[k.id].level === l).length);
  const diffData = DIFFICULTIES.map((d) => ({ name: DIFFICULTY_NAME[d], accuracy: ov.byDifficulty[d].pct, n: ov.byDifficulty[d].n }));
  const greeting = `${away >= 3 ? 'Good to see you again' : 'Welcome back'}${s.profile.name ? `, ${s.profile.name}` : ''}!`;

  const pathSkills = (() => {
    const order = weak && !starMap[weak.skill] ? [SKILL[weak.skill], ...SKILLS.filter((k) => k.id !== weak.skill)] : SKILLS;
    const open = order.filter((k) => !starMap[k.id]);
    return (open.length ? open : order.filter((k) => (starMap[k.id] ?? 0) < 3)).slice(0, 3);
  })();
  const questsLeft = quests.filter((q) => !q.done).length;
  const say = away >= 3 ? 'I missed you! Let’s warm up with one quick lesson.'
    : chestReady ? 'All three quests done. Your chest is ready!'
    : mission.rest ? 'Rest day. I’ll be here if you want a bonus round.'
    : streak.studiedToday ? (questsLeft ? `Nice work today. ${questsLeft} quest${questsLeft === 1 ? '' : 's'} to go!` : 'Everything done today. You are on fire!')
    : nextTask ? `Ready? First up: ${nextTask.title}.` : 'Ready when you are!';
  const poke = () => { setPoked(Date.now()); sfx('tap'); s.carePet('pet'); };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Confetti fire={fire} />
      <section className="card overflow-hidden p-0" data-testid="pet-card">
        <Habitat id={s.pet.equipped.habitat} className="!rounded-none">
          <div className="flex h-40 items-end gap-2 px-4 sm:px-8">
            <button type="button" onClick={poke} className="shrink-0 transition-transform active:scale-95" aria-label={`Pat ${s.pet.name}`} title={`Pat ${s.pet.name}`}><Pet mood={petMood} level={level.level} equipped={s.pet.equipped} size={132} /></button>
            <p className="mb-14 max-w-xs rounded-2xl rounded-bl-sm bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-card" data-testid="lumi-says">{say}</p>
          </div>
        </Habitat>
        <div className="p-5">
          <h1 className="text-2xl font-bold sm:text-3xl" data-testid="greeting">{greeting} <span className="grad-text">Let&apos;s work toward {target}.</span></h1>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-line p-3"><div className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Flame size={14} className="text-warn" />Streak</div><div className="font-display text-xl font-bold">{streak.current} day{streak.current === 1 ? '' : 's'}</div></div>
            <Link href="/pet" className="rounded-xl border border-line p-3 hover:border-brand/60"><div className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Zap size={14} className="text-brand" />Level {level.level}</div><Progress value={level.progress * 100} className="mt-2.5" label="XP to next level" /></Link>
            <Link href="/rewards" className="rounded-xl border border-line p-3 hover:border-brand/60"><div className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Coins size={14} className="text-gold" />Stardust</div><div className="font-display text-xl font-bold">{s.pet.coins}</div></Link>
            <Link href="/learn" className="rounded-xl border border-line p-3 hover:border-brand/60"><div className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Star size={14} className="fill-gold text-gold" />Lesson stars</div><div className="font-display text-xl font-bold">{totalStars}<span className="text-sm text-muted"> / {SKILLS.length * 3}</span></div></Link>
          </div>
          <p className="mt-3 text-xs text-muted">{daysLeft !== null && daysLeft >= 0 ? `${daysLeft === 0 ? 'Test day is today' : `${daysLeft} days to your SAT`} · ` : ''}{todayMin >= goal ? 'Daily goal done' : `${todayMin} of ${goal} min today`}</p>
        </div>
      </section>

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="quests">
          <div className="flex items-baseline justify-between"><h2 className="font-bold">Daily quests</h2><span className="text-xs text-muted">new ones every day</span></div>
          <ul className="mt-3 space-y-3">
            {quests.map((q) => (
              <li key={q.id} className="flex items-center gap-3" data-testid={`quest-${q.id}`}>
                <span className="text-2xl" aria-hidden>{q.icon}</span>
                <div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-sm font-semibold"><span className="truncate">{q.title}</span><span className="shrink-0 tabular-nums text-muted">{q.progress}/{q.goal}</span></div><Progress value={(q.progress / q.goal) * 100} tone={q.done ? 'ok' : 'brand'} className="mt-1.5" label={q.title} /></div>
                {q.claimed ? <CheckCircle2 className="shrink-0 text-ok" size={22} aria-label="Claimed" /> : q.done ? <button className="btn-primary shrink-0 !px-3 !py-1.5 text-sm" onClick={() => claim(q.id)}>+{q.xp} XP</button> : <Link href={q.href} className="btn-ghost shrink-0 !px-3 !py-1.5 text-sm">Go</Link>}
              </li>
            ))}
          </ul>
          <div className={`mt-4 flex items-center gap-3 rounded-xl border p-3 ${chestReady ? 'border-gold bg-gold/10' : 'border-line'}`}>
            <Gift size={22} className={chestOpen || chestReady ? 'text-gold' : 'text-faint'} aria-hidden />
            <span className="min-w-0 flex-1 text-sm">{chestOpen ? 'Daily chest opened. See you tomorrow!' : chestReady ? 'Daily chest unlocked!' : 'Claim all three to open the daily chest.'}</span>
            {chestReady && <button className="btn-primary !px-3 !py-1.5 text-sm" onClick={() => claim(CHEST.id)} data-testid="chest">Open +{CHEST.xp} XP</button>}
          </div>
        </Card>
        <Card data-testid="path">
          <div className="flex items-baseline justify-between"><h2 className="font-bold">Your lesson path</h2><Link href="/learn" className="text-sm font-semibold text-brand2 hover:underline">Whole map →</Link></div>
          <ul className="mt-3 space-y-2">
            {pathSkills.map((k, i) => (
              <li key={k.id}>
                <Link href={`/learn/${k.id}`} className={`flex items-center gap-3 rounded-xl border p-2.5 transition-transform hover:-translate-y-0.5 ${i === 0 ? 'border-brand/50 bg-brand/10' : 'border-line'}`}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-raised text-2xl" aria-hidden>{VISUAL_LESSONS[k.id].icon}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{k.short}</span><span className="block truncate text-xs text-muted">{i === 0 && weak?.skill === k.id ? 'Your biggest opportunity right now' : `Full course · ${COURSES[k.id].filter((c) => s.chapters?.[c.id]?.passedAt).length}/${COURSES[k.id].length} chapters · ${MASTERY_LEVELS[stats[k.id].level]}`}</span></span>
                  {i === 0 ? <span className="btn-primary !px-3 !py-1.5 text-sm"><Play size={14} />Play</span> : <span className="flex gap-0.5" aria-hidden>{[1, 2, 3].map((x) => <Star key={x} size={13} className={x <= (starMap[k.id] ?? 0) ? 'fill-gold text-gold' : 'text-line'} />)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

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

      {/* One insight, not a wall of them */}
      {weak && (
        <section aria-label="Biggest opportunity" className="flex flex-wrap items-center gap-4 rounded-2xl border border-warn/30 bg-warn/5 p-5">
          <Brain className="shrink-0 text-warn" size={22} />
          <p className="min-w-0 flex-1 text-sm">{weak.message}</p>
          <div className="flex gap-2"><Link href={weak.href} className="btn-primary !py-2">Open lesson</Link><Link href={`/practice/session?mode=skill&skill=${weak.skill}&n=6`} className="btn-ghost !py-2">Practice</Link></div>
        </section>
      )}

      <nav aria-label="Game modes" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MODES.map((q) => <Link key={q.label} href={q.href} className="card flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-brand/60"><span className="text-2xl" aria-hidden>{q.icon}</span><span className="min-w-0"><span className="block text-sm font-semibold">{q.label}</span><span className="block truncate text-xs text-muted">{q.sub}</span></span></Link>)}
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
