import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bot, Brain, CalendarClock, CheckCircle2, Circle, ClipboardList, Flame, Languages, LineChart as LineIcon, Play, Sigma, BookOpen, Target, Trophy, Zap } from 'lucide-react';
import { useEffect, useMemo } from 'react';
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
import { DAY, clamp, dateKey, daysBetween } from '@/lib/util';
import { Habitat, Pet, type PetMood } from '@/components/Pet';
import { Badge, Card, Progress, Ring, Stat } from '@/components/ui';

export const chartTip = { contentStyle: { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12, color: 'rgb(var(--ink))' }, labelStyle: { color: 'rgb(var(--muted))' }, cursor: { fill: 'rgb(var(--raised))', opacity: 0.5 } };
export const axis = { tick: { fill: 'rgb(var(--muted))', fontSize: 11 }, axisLine: { stroke: 'rgb(var(--line))' }, tickLine: false as const };

const QUICK = [
  { href: '/practice/session?mode=smart&n=10', label: 'Continue Learning', icon: Play, desc: 'Your next smart set' },
  { href: '/learn/math', label: 'Math Practice', icon: Sigma, desc: 'Lessons and drills' },
  { href: '/learn/rw', label: 'Reading & Writing', icon: BookOpen, desc: 'Lessons and drills' },
  { href: '/practice/hard', label: 'Hardest Questions', icon: Zap, desc: 'Very hard tier' },
  { href: '/mistakes', label: 'Mistake Bucket', icon: Target, desc: 'Fix what you missed' },
  { href: '/mocks', label: 'Full-Length Mock', icon: ClipboardList, desc: '2 h 14 min, adaptive' },
  { href: '/tutor', label: 'AI Tutor', icon: Bot, desc: 'Ask anything' },
  { href: '/daily', label: 'Daily Challenge', icon: Flame, desc: 'One tough question' },
  { href: '/desmos', label: 'Desmos Academy', icon: LineIcon, desc: 'Graphing mastery' },
  { href: '/vocabulary', label: 'Vocabulary', icon: Languages, desc: 'Words in context' },
];

export function DashboardPage() {
  const router = useRouter();
  const s = useStore();
  const ov = useOverview();
  const stats = useSkillStats();
  const streak = useStreak();
  const level = useLevel();
  const now = Date.now();
  const today = dateKey(now);

  useEffect(() => { if (!s.profile.onboardedAt && s.attempts.length === 0) router.replace('/onboarding'); }, [s.profile.onboardedAt, s.attempts.length, router]);

  const mission = useMemo(() => todaysMission(snapshot(), getQuestion, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.attempts.length, s.plan, s.planDone, today]);
  const weak = useMemo(() => findWeaknesses(snapshot(), getQuestion, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.attempts.length]);
  const blocks = useMemo(() => accuracyBlocks(snapshot(), 15),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.attempts.length]);

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
  const petMood: PetMood = s.pet.lastEvent && now - s.pet.lastEvent.at < 20000 ? 'celebrate' : hour >= 23 || hour < 6 ? 'sleep' : away >= 3 ? 'sleep' : streak.studiedToday ? 'happy' : 'idle';
  const levels = [0, 1, 2, 3, 4].map((l) => SKILLS.filter((k) => stats[k.id].level === l).length);
  const recent = Object.entries(s.achievements).sort((a, b) => b[1] - a[1])[0];
  const diffData = DIFFICULTIES.map((d) => ({ name: DIFFICULTY_NAME[d], accuracy: ov.byDifficulty[d].pct, n: ov.byDifficulty[d].n }));
  const greeting = `${away >= 3 ? 'Good to see you again' : 'Welcome back'}${s.profile.name ? `, ${s.profile.name}` : ''}!`;

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <section className="card overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1fr_300px]">
          <div className="p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand2">Homebase</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl" data-testid="greeting">{greeting} <span className="grad-text">Let&apos;s work toward {target}.</span></h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="brand">Estimated range: <b className="ml-1" data-testid="estimate">{est ? fmtRange(est) : 'not enough data yet'}</b></Badge>
              {daysLeft !== null && daysLeft >= 0 && <Badge><CalendarClock size={12} />{daysLeft === 0 ? 'Test day is today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} to your SAT`}</Badge>}
              <Badge><Flame size={12} className="text-warn" />{streak.current}-day streak{streak.best > streak.current ? ` · best ${streak.best}` : ''}</Badge>
            </div>
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-muted"><span>{base !== undefined ? `Start ${base}` : 'Start'}</span><span>{est ? `Now ~${est.mid}` : 'Take the diagnostic for an estimate'}</span><span>Target {target}</span></div>
              <Progress value={progress} label="Progress from starting score to target" />
              <p className="mt-2 text-xs text-faint">Estimates are Stellify&apos;s own unofficial model, not a College Board score. For an official-style score, take a <Link href="/resources" className="underline">Bluebook practice test</Link>.</p>
            </div>
            {!s.profile.diagnosticAt && <Link href="/diagnostic" className="btn-primary mt-4">Take the diagnostic<ArrowRight size={16} /></Link>}
          </div>
          <div className="flex items-center justify-center gap-4 border-t border-line bg-raised/40 p-6 lg:border-l lg:border-t-0">
            <Ring value={clamp((todayMin / goal) * 100, 0, 100)} size={104} stroke={9} label={`Daily goal: ${todayMin} of ${goal} minutes`}><div className="text-center leading-tight"><div className="font-display text-xl">{todayMin}</div><div className="text-[10px] font-medium text-muted">of {goal} min</div></div></Ring>
            <div className="text-sm"><div className="font-semibold">Daily goal</div><div className="text-muted">{todayMin >= goal ? 'Done for today. Nice.' : `${goal - todayMin} min to go`}</div><div className="mt-1 text-xs text-faint">{s.activity[today]?.questions ?? 0} questions today</div></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Today's mission */}
        <Card className="lg:col-span-2" data-testid="mission">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Today&apos;s mission</h2>
            <span className="text-xs text-muted">{mission.fromPlan ? 'From your 30-day plan' : 'Built from your current needs'} · <Link href="/calendar" className="text-brand2 hover:underline">Study calendar</Link></span>
          </div>
          <p className="mt-0.5 text-sm text-muted">{mission.rest ? 'Rest day. Recovery is part of the plan. Anything you do today is a bonus.' : `Focus: ${mission.focus}`}</p>
          <ul className="mt-3 divide-y divide-line">
            {(mission.rest ? [] : mission.tasks).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <button onClick={() => s.togglePlanTask(t.id)} aria-pressed={!!t.done} aria-label={`Mark "${t.title}" ${t.done ? 'not done' : 'done'}`} className="shrink-0">{t.done ? <CheckCircle2 className="text-ok" size={20} /> : <Circle className="text-faint" size={20} />}</button>
                <div className="min-w-0 flex-1"><div className={`truncate text-sm font-semibold ${t.done ? 'text-muted line-through' : ''}`}>{t.title}</div>{t.detail && <div className="truncate text-xs text-muted">{t.detail}</div>}</div>
                <span className="w-14 text-right text-xs tabular-nums text-muted">{t.minutes} min</span>
                <Link href={t.href} className="btn-ghost !px-3 !py-1.5">Start</Link>
              </li>
            ))}
            {mission.rest && <li className="py-3"><Link href="/practice/session?mode=smart&n=5" className="btn-ghost">Optional: 5 light questions</Link></li>}
          </ul>
        </Card>

        {/* Pet */}
        <Card className="!p-0 overflow-hidden" data-testid="pet-card">
          <Habitat id={s.pet.equipped.habitat} className="grid h-44 place-items-end justify-center !rounded-none">
            <div className="flex h-44 items-end justify-center pb-1"><Pet mood={petMood} level={level.level} equipped={s.pet.equipped} size={150} /></div>
          </Habitat>
          <div className="p-4">
            <div className="flex items-center justify-between"><h2 className="font-bold">{s.pet.name}</h2><Badge tone="brand">Lv {level.level} · {level.tier.title}</Badge></div>
            <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-muted"><span>XP</span><span>{level.into}/{level.span}</span></div><Progress value={level.progress * 100} label="XP to next level" /></div>
            <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-muted"><span>Happiness</span><span>{s.pet.happiness}%</span></div><Progress value={s.pet.happiness} tone="gold" label="Happiness" /></div>
            <p className="mt-2 text-xs text-muted">{away >= 3 ? `${s.pet.name} was napping while you were away and is glad you are back.` : s.pet.lastEvent ? `Latest: ${s.pet.lastEvent.text}.` : `${s.pet.name} is ready to study with you.`}</p>
            {recent && <p className="mt-1 flex items-center gap-1.5 text-xs text-muted"><Trophy size={13} className="text-gold" />Recent achievement: <b className="text-ink">{ACHIEVEMENT[recent[0]]?.title}</b></p>}
            <Link href="/pet" className="mt-3 inline-block text-sm font-semibold text-brand2 hover:underline">Visit {s.pet.name} →</Link>
          </div>
        </Card>
      </div>

      {/* Weakness detection */}
      {weak.length > 0 && (
        <section aria-label="Weakness detection" className="grid gap-3 md:grid-cols-3">
          {weak.map((w) => (
            <Card key={w.skill} className="!p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-warn"><Brain size={14} />Opportunity</div>
              <p className="mt-1.5 text-sm">{w.message}</p>
              <div className="mt-3 flex gap-2"><Link href={w.href} className="btn-primary !px-3 !py-1.5">Open lesson</Link><Link href={`/practice/session?mode=skill&skill=${w.skill}&n=6`} className="btn-ghost !px-3 !py-1.5">Practice</Link></div>
            </Card>
          ))}
        </section>
      )}

      {/* Quick access */}
      <section aria-label="Quick access" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {QUICK.map((q) => (
          <Link key={q.label} href={q.href} className="card group p-4 transition-colors hover:border-brand/60">
            <q.icon size={20} className="text-brand transition-transform group-hover:scale-110" aria-hidden />
            <div className="mt-2 text-sm font-semibold">{q.label}</div><div className="text-xs text-muted">{q.desc}</div>
          </Link>
        ))}
      </section>

      {/* Performance */}
      <section aria-label="Performance dashboard" className="space-y-3">
        <div className="flex items-end justify-between"><h2 className="text-lg font-bold">Performance</h2><Link href="/analytics" className="text-sm font-semibold text-brand2 hover:underline">Full analytics →</Link></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Questions" value={<span data-testid="stat-questions">{ov.total}</span>} sub={`${ov.unique} unique`} />
          <Stat label="Accuracy" value={ov.total ? `${ov.all.pct}%` : '—'} sub="overall" />
          <Stat label="Math" value={ov.bySection.math.n ? `${ov.bySection.math.pct}%` : '—'} sub={`est. ${fmtRange(ov.estimate.math)}`} />
          <Stat label="Reading & Writing" value={ov.bySection.rw.n ? `${ov.bySection.rw.pct}%` : '—'} sub={`est. ${fmtRange(ov.estimate.rw)}`} />
          <Stat label="This week" value={`${weekMinutes(snapshot())} min`} sub="study time" />
          <Stat label="Streak" value={`${streak.current} d`} sub={`best ${streak.best}`} />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <Card>
            <h3 className="text-sm font-semibold">Accuracy by difficulty</h3>
            {ov.total ? <div className="mt-2 h-44"><ResponsiveContainer><BarChart data={diffData}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis domain={[0, 100]} {...axis} width={30} /><Tooltip {...chartTip} formatter={(v, _n, p) => [`${v}% of ${(p.payload as { n: number }).n}`, 'Accuracy']} /><Bar dataKey="accuracy" fill="rgb(var(--brand))" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="mt-6 text-sm text-muted">Answer a few questions to see this chart.</p>}
          </Card>
          <Card>
            <h3 className="text-sm font-semibold">Improvement over time</h3>
            {blocks.length >= 2 ? <div className="mt-2 h-44"><ResponsiveContainer><LineChart data={blocks}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis domain={[0, 100]} {...axis} width={30} /><Tooltip {...chartTip} formatter={(v) => [`${v}%`, 'Accuracy']} labelFormatter={(l) => `Questions ${l}`} /><Line type="monotone" dataKey="accuracy" stroke="rgb(var(--brand2))" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div> : <p className="mt-6 text-sm text-muted">After 30 questions you will see your accuracy trend in blocks of 15.</p>}
          </Card>
          <Card>
            <h3 className="text-sm font-semibold">Skill mastery</h3>
            <ul className="mt-3 space-y-2">
              {[4, 3, 2, 1, 0].map((l) => (
                <li key={l} className="flex items-center gap-3 text-sm"><span className="w-24 text-muted">{MASTERY_LEVELS[l]}</span><Progress value={(levels[l] / SKILLS.length) * 100} tone={l >= 3 ? 'ok' : l === 2 ? 'brand' : l === 1 ? 'warn' : 'bad'} className="flex-1" label={`${MASTERY_LEVELS[l]} skills`} /><span className="w-6 text-right font-semibold tabular-nums">{levels[l]}</span></li>
              ))}
            </ul>
            <Link href="/learn" className="mt-3 inline-block text-sm font-semibold text-brand2 hover:underline">See all {SKILLS.length} skills →</Link>
          </Card>
        </div>
      </section>
      {now - (s.profile.onboardedAt ?? now) < DAY && s.attempts.length === 0 && <Card className="text-sm text-muted">New here? Everything is saved on this device only. No account, no ads, no tracking. Start with the diagnostic or jump into <Link href="/practice/smart" className="font-semibold text-brand2 hover:underline">Smart Practice</Link>.</Card>}
    </div>
  );
}
