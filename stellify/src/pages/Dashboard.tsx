import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Brain, CheckCircle2, ChevronDown, Circle, Coins, Flame, Gift, Play, Star, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getQuestion } from '@/data/questions';
import { snapshot, useStore } from '@/lib/store';
import { useLevel, useOverview, useSkillStats, useStreak, useWeekRhythm } from '@/lib/hooks';
import { accuracyBlocks, weekMinutes } from '@/lib/engine/analytics';
import { CHEST, dailyQuests } from '@/lib/engine/quests';
import { VISUAL_LESSONS } from '@/data/visual-lessons';
import { sfx } from '@/lib/sfx';
import { Confetti } from '@/components/Confetti';
import { fmtRange } from '@/lib/engine/scoring';
import { ConfidenceBadge, needLine } from '@/components/Estimate';
import { MASTERY_LEVELS } from '@/lib/engine/mastery';
import { ACHIEVEMENT } from '@/lib/engine/achievements';
import { DIFFICULTIES, DIFFICULTY_NAME, SKILL, SKILLS } from '@/lib/taxonomy';
import { clamp, dateKey, daysBetween } from '@/lib/util';
import { eggOf, petName } from '@/lib/engine/companions';
import { Habitat, Pet, type PetMood } from '@/components/Pet';
import { Card, Progress, Ring } from '@/components/ui';
import { Glyph } from '@/components/Glyph';
import { CoachToday, FocusList, StageLine, useCoach } from '@/components/Coach';

export const chartTip = { contentStyle: { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 14, fontSize: 12, color: 'rgb(var(--ink))', boxShadow: '0 12px 30px -14px rgb(var(--shadow) / .45)', padding: '8px 12px' }, labelStyle: { color: 'rgb(var(--muted))' }, cursor: { fill: 'rgb(var(--raised))', opacity: 0.5 } };
export const axis = { tick: { fill: 'rgb(var(--faint))', fontSize: 11 }, axisLine: { stroke: 'rgb(var(--line))' }, tickLine: false as const };

const MODES = [
  { href: '/practice/session?mode=smart&n=10', label: 'Smart Practice', icon: '🧠', sub: 'Picks what you need' },
  { href: '/practice/hard', label: 'Boss Rush', icon: '🔥', sub: 'Hard and beyond' },
  { href: '/speed', label: 'Speed Run', icon: '⚡', sub: 'Beat the clock' },
  { href: '/arena', label: 'Arena', icon: '🏟️', sub: 'Chase a high score' },
  { href: '/mistakes', label: 'Mistake Bucket', icon: '🧹', sub: 'Turn misses into wins' },
  { href: '/mocks', label: 'Mock Exam', icon: '📝', sub: 'Full adaptive test' },
];

/**
 * Home hub. The companion up top, one clear next step, three daily quests, and the next stop on the
 * lesson map. Game modes sit below; detailed charts stay folded until asked for.
 */
export function DashboardPage() {
  const router = useRouter();
  const s = useStore();
  const ov = useOverview();
  const stats = useSkillStats();
  const streak = useStreak();
  const level = useLevel();
  const coach = useCoach(1);
  const week = useWeekRhythm();
  const [more, setMore] = useState(false);
  const [allTasks, setAllTasks] = useState(false);
  const [poked, setPoked] = useState(0);
  const [fire, setFire] = useState(0);
  const now = Date.now();
  const today = dateKey(now);

  useEffect(() => { if (!s.profile.onboardedAt && s.attempts.length === 0) router.replace('/onboarding'); }, [s.profile.onboardedAt, s.attempts.length, router]);

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

  const est = ov.estimate.total;
  const target = s.profile.targetScore;
  const base = s.profile.currentScore ?? (est ? Math.min(est.mid, target - 10) : undefined);
  const progress = est && base !== undefined ? clamp(((est.mid - Math.min(base, est.mid)) / Math.max(10, target - Math.min(base, est.mid))) * 100, 0, 100) : 0;
  const todayMin = Math.round((s.activity[today]?.ms ?? 0) / 60000);
  const goal = s.profile.dailyMinutes || 45;
  const lastDay = Object.keys(s.activity).sort().pop();
  const away = lastDay ? daysBetween(lastDay, today) : 0;
  const hour = new Date(now).getHours();
  const petMood: PetMood = now - poked < 1400 ? 'celebrate' : s.pet.lastEvent && now - s.pet.lastEvent.at < 20000 ? 'celebrate' : hour >= 23 || hour < 6 || away >= 3 ? 'sleep' : streak.studiedToday ? 'happy' : 'idle';
  const recent = Object.entries(s.achievements).sort((a, b) => b[1] - a[1])[0];
  const coachDay = coach.days[0];
  const restDay = !!coachDay?.rest;
  const nextTask = coachDay?.tasks.find((t) => !t.done);
  const levels = [0, 1, 2, 3, 4].map((l) => SKILLS.filter((k) => stats[k.id].level === l).length);
  const diffData = DIFFICULTIES.map((d) => ({ name: DIFFICULTY_NAME[d], accuracy: ov.byDifficulty[d].pct, n: ov.byDifficulty[d].n }));
  const greeting = `${away >= 3 ? 'Good to see you again' : 'Welcome back'}${s.profile.name ? `, ${s.profile.name}` : ''}.`;

  const questsLeft = quests.filter((q) => !q.done).length;
  const egg = s.pet.species ? null : eggOf(s);
  const say = egg ? (egg.ready ? 'Your egg is wiggling! Tap it to hatch your companion.' : `Your egg is ${Math.round(egg.pct * 100)}% warm. ${egg.lessons < egg.need.lessons ? 'Finish a lesson' : 'Answer a few questions'} to help it hatch!`)
    : away >= 3 ? 'I missed you! Let’s warm up with one quick lesson.'
    : chestReady ? 'All three quests done. Your chest is ready!'
    : restDay ? 'Rest day. I’ll be here if you want a bonus round.'
    : streak.studiedToday ? (questsLeft ? `Nice work today. ${questsLeft} quest${questsLeft === 1 ? '' : 's'} to go!` : 'Everything done today. You are on fire!')
    : nextTask ? `Ready? First up: ${nextTask.title}.` : 'Ready when you are!';
  const poke = () => { setPoked(Date.now()); sfx('tap'); s.carePet('pet'); };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Confetti fire={fire} />
      <header className="page-head">
        <h1 className="text-[32px] leading-tight sm:text-[40px]" data-testid="greeting">{greeting}</h1>
        <div className="mt-2"><StageLine plan={coach} /></div>
      </header>
      <CoachToday plan={coach} />
      <section className="card overflow-hidden p-0" data-testid="pet-card" aria-label="Your companion">
        <Habitat id={s.pet.equipped.habitat} className="!rounded-none">
          <div className="flex h-28 items-end gap-2 px-4 sm:px-8">
            {egg ? <Link href="/pet" className="shrink-0 transition-transform active:scale-95" aria-label={egg.ready ? 'Hatch your egg' : 'See your egg'} data-testid="dash-egg"><Pet size={96} /></Link>
              : <button type="button" onClick={poke} className="shrink-0 transition-transform active:scale-95" aria-label={`Pat ${petName(s.pet)}`} title={`Pat ${petName(s.pet)}`}><Pet mood={petMood} level={level.level} equipped={s.pet.equipped} size={96} /></button>}
            <p className="mb-8 max-w-xs rounded border border-line bg-surface px-3 py-2 text-[14px] text-ink" data-testid="lumi-says">{say}</p>
          </div>
        </Habitat>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="quests">
          <div className="flex items-baseline justify-between"><h2 className="font-bold">Daily quests</h2><span className="text-xs text-muted">new ones every day</span></div>
          <ul className="mt-3 space-y-3">
            {quests.map((q) => (
              <li key={q.id} className="flex items-center gap-3" data-testid={`quest-${q.id}`}>
                <span className="icon-tile h-9 w-9" aria-hidden><Glyph e={q.icon} size={18} /></span>
                <div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-sm font-semibold"><span className="truncate">{q.title}</span><span className="shrink-0 tabular-nums text-muted">{q.progress}/{q.goal}</span></div><Progress value={(q.progress / q.goal) * 100} tone={q.done ? 'ok' : 'brand'} className="mt-1.5" label={q.title} /></div>
                {q.claimed ? <CheckCircle2 className="shrink-0 text-ok" size={22} aria-label="Claimed" /> : q.done ? <button className="btn-primary shrink-0 !px-3 !py-1.5 text-sm" onClick={() => claim(q.id)}>+{q.xp} XP</button> : <Link href={q.href} className="btn-ghost shrink-0 !px-3 !py-1.5 text-sm">Go</Link>}
              </li>
            ))}
          </ul>
          <div className={`mt-4 flex items-center gap-3 rounded-xl border p-3 ${chestReady ? 'border-gold bg-gold/10' : 'border-line'}`}>
            <Gift size={22} className={chestOpen || chestReady ? 'text-gold' : 'text-faint'} aria-hidden />
            <span className="min-w-0 flex-1 text-sm">{chestOpen ? 'Daily chest opened. See you tomorrow!' : chestReady ? 'Daily chest ready to open' : 'Claim all three to open the daily chest.'}</span>
            {chestReady && <button className="btn-primary !px-3 !py-1.5 text-sm" onClick={() => claim(CHEST.id)} data-testid="chest">Open +{CHEST.xp} XP</button>}
          </div>
        </Card>
        <Card data-testid="focus">
          <div className="flex items-baseline justify-between"><h2 className="font-bold">What your plan is working on</h2><Link href="/calendar" className="text-sm font-semibold text-accent hover:underline">Why →</Link></div>
          <div className="mt-3">{coach.focus.length ? <FocusList plan={coach} max={3} /> : <p className="text-sm text-muted">Take the placement check and this fills in with the skills that matter most for you.</p>}</div>
        </Card>
      </div>

      <Card>
        <div className="flex items-baseline justify-between"><h2 className="font-bold">Your progress</h2><Link href="/analytics" className="text-sm font-semibold text-accent hover:underline">Analytics →</Link></div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div><div className="font-display text-2xl font-bold" data-testid="estimate">{est ? fmtRange(est) : '—'}</div><div className="text-xs text-muted">{est ? 'Stellify estimate' : 'estimate: needs data'}</div>{est && <div className="mt-1"><ConfidenceBadge c={ov.estimate.confidence} /></div>}</div>
          <div><div className="font-display text-2xl font-bold">{ov.total ? `${ov.all.pct}%` : '—'}</div><div className="text-xs text-muted">accuracy</div></div>
          <div><div className="font-display text-2xl font-bold" data-testid="stat-questions">{ov.total}</div><div className="text-xs text-muted">questions</div></div>
        </div>
        <div className="mt-5"><div className="mb-1.5 flex justify-between text-xs text-muted"><span>{base !== undefined ? `Start ${base}` : 'Start'}</span><span>Target {target}</span></div><Progress value={progress} label="Progress from starting score to target" /></div>
        <p className="mt-2 text-xs text-faint">{est ? 'An unofficial 80% range from your first tries, not an SAT score. See Analytics for how it works.' : needLine(ov.estimate.status.rw, ov.estimate.status.math)}{!s.profile.diagnosticAt && <> <Link href="/diagnostic" className="font-semibold text-accent hover:underline">Take the diagnostic</Link></>}</p>
      </Card>

      <nav aria-label="Game modes" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MODES.map((q) => <Link key={q.label} href={q.href} className="card flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50"><span className="icon-tile h-9 w-9" aria-hidden><Glyph e={q.icon} size={18} /></span><span className="min-w-0"><span className="block text-sm font-semibold">{q.label}</span><span className="block truncate text-xs text-muted">{q.sub}</span></span></Link>)}
      </nav>

      {/* Details on request */}
      <section>
        <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-muted hover:text-ink" onClick={() => setMore(!more)} aria-expanded={more} data-testid="more-details">{more ? 'Hide details' : 'Show performance details'}<ChevronDown size={16} className={more ? 'rotate-180' : ''} /></button>
        {more && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
              {[['Math', ov.bySection.math.n ? `${ov.bySection.math.pct}%` : '—', `est. ${fmtRange(ov.estimate.math)}`], ['Reading & Writing', ov.bySection.rw.n ? `${ov.bySection.rw.pct}%` : '—', `est. ${fmtRange(ov.estimate.rw)}`], ['This week', `${weekMinutes(snapshot())} min`, 'study time'], ['Best streak', `${streak.best} d`, `current ${streak.current}`]].map(([l, v, sub]) => (
                <div key={l} className="metric !p-3"><div className="text-xs text-faint">{l}</div><div className="font-display text-xl font-bold">{v}</div><div className="text-xs text-muted">{sub}</div></div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Card><h3 className="text-sm font-semibold">Accuracy by difficulty</h3>{ov.total ? <div className="mt-2 h-40"><ResponsiveContainer><BarChart data={diffData}><CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis domain={[0, 100]} {...axis} width={28} /><Tooltip {...chartTip} formatter={(v, _n, p) => [`${v}% of ${(p.payload as { n: number }).n}`, 'Accuracy']} /><Bar dataKey="accuracy" fill="rgb(var(--accent))" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="mt-4 text-sm text-muted">Answer a few questions to see this.</p>}</Card>
              <Card><h3 className="text-sm font-semibold">Improvement over time</h3>{blocks.length >= 2 ? <div className="mt-2 h-40"><ResponsiveContainer><LineChart data={blocks}><CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 4" vertical={false} /><XAxis dataKey="label" {...axis} /><YAxis domain={[0, 100]} {...axis} width={28} /><Tooltip {...chartTip} formatter={(v) => [`${v}%`, 'Accuracy']} /><Line type="monotone" dataKey="accuracy" stroke="rgb(var(--accent2))" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div> : <p className="mt-4 text-sm text-muted">Appears after 30 questions.</p>}</Card>
              <Card><h3 className="text-sm font-semibold">Skill mastery</h3><ul className="mt-3 space-y-2">{[4, 3, 2, 1, 0].map((l) => <li key={l} className="flex items-center gap-2 text-xs"><span className="w-20 text-muted">{MASTERY_LEVELS[l]}</span><Progress value={(levels[l] / SKILLS.length) * 100} tone={l >= 3 ? 'ok' : l === 2 ? 'brand' : l === 1 ? 'warn' : 'bad'} className="flex-1" label={`${MASTERY_LEVELS[l]} skills`} /><span className="w-5 text-right font-semibold tabular-nums">{levels[l]}</span></li>)}</ul><Link href="/learn" className="mt-3 inline-block text-xs font-semibold text-accent hover:underline">All {SKILLS.length} skills →</Link></Card>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
