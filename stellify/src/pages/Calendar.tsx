import Link from 'next/link';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Moon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { useStreak } from '@/lib/hooks';
import { PHASES } from '@/lib/engine/plan';
import { addDays, dateKey, daysBetween, parseDateKey } from '@/lib/util';
import { Badge, Card, PageHeader, Progress, Stat, cn } from '@/components/ui';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const s = useStore();
  const streak = useStreak();
  const today = dateKey();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(today);
  const planByDate = useMemo(() => Object.fromEntries((s.plan?.days ?? []).map((d) => [d.date, d])), [s.plan]);
  const mockDates = useMemo(() => new Set(s.mocks.filter((m) => m.completedAt).map((m) => dateKey(m.completedAt!))), [s.mocks]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const cells: (string | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => dateKey(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  const weekStart = addDays(today, -new Date(parseDateKey(today)).getDay());
  const weekMin = Array.from({ length: 7 }, (_, i) => s.activity[addDays(weekStart, i)]?.ms ?? 0).reduce((a, b) => a + b, 0) / 60000;
  const weekGoal = (s.profile.dailyMinutes || 45) * (7 - s.profile.restDays.length);
  const day = planByDate[sel];
  const act = s.activity[sel];
  const daysLeft = s.profile.examDate ? daysBetween(today, s.profile.examDate) : null;
  const planDone = s.plan ? s.plan.days.flatMap((d) => d.tasks).filter((t) => s.planDone[t.id]).length : 0;
  const planTotal = s.plan ? s.plan.days.flatMap((d) => d.tasks).length : 0;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Performance" title="Study Calendar" subtitle="Your plan, your history and your exam date in one place. Missed a day? Nothing breaks. Pick up where you are."
        actions={<button className="btn-primary" data-testid="make-plan" onClick={() => { if (!s.plan || confirm('Build a new plan from today? Your current plan and its checkmarks will be replaced.')) s.makePlan(); }}>{s.plan ? 'Rebuild my plan' : 'Build my 30-day plan'}</button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Exam countdown" value={daysLeft === null ? 'No date set' : daysLeft < 0 ? 'Passed' : `${daysLeft} days`} sub={<Link href="/settings" className="text-brand2 hover:underline">{s.profile.examDate ? new Date(parseDateKey(s.profile.examDate)).toLocaleDateString() : 'Set a date'}</Link>} />
        <Stat label="This week" value={`${Math.round(weekMin)} min`} sub={<><span>goal {weekGoal} min</span><Progress value={(weekMin / weekGoal) * 100} className="mt-1.5" label="Weekly goal" /></>} />
        <Stat label="Streak" value={`${streak.current} days`} sub={`best ${streak.best} · rest days never break it`} />
        <Stat label="Plan progress" value={s.plan ? `${planDone}/${planTotal}` : '—'} sub={s.plan ? 'tasks completed' : 'no plan yet'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-1"><button className="btn-quiet !p-2" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button><button className="btn-ghost !px-3 !py-1.5" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSel(today); }}>Today</button><button className="btn-quiet !p-2" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button></div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-faint">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((k, i) => { if (!k) return <div key={i} />; const a = s.activity[k]; const p = planByDate[k]; const min = a ? Math.round(a.ms / 60000) : 0; const allDone = p && p.tasks.length > 0 && p.tasks.every((t) => s.planDone[t.id]); return (
              <button key={k} onClick={() => setSel(k)} aria-label={`${k}${min ? `, ${min} minutes studied` : ''}${p ? `, plan: ${p.focus}` : ''}`} aria-pressed={sel === k}
                className={cn('relative flex h-16 flex-col items-start rounded-lg border p-1.5 text-left text-xs transition-colors', sel === k ? 'border-brand ring-1 ring-brand' : 'border-line hover:border-brand/40', k === today && 'bg-brand/10')}
                style={min ? { backgroundColor: `rgb(var(--brand2) / ${Math.min(0.45, 0.08 + min / 200)})` } : undefined}>
                <span className={cn('font-semibold', k === today && 'text-brand')}>{Number(k.slice(8))}</span>
                {min > 0 && <span className="text-[10px] text-ink">{min}m</span>}
                <span className="absolute bottom-1 right-1 flex gap-0.5">
                  {k === s.profile.examDate && <span className="rounded bg-bad px-1 text-[9px] font-bold text-white">SAT</span>}
                  {mockDates.has(k) && <span className="rounded bg-gold px-1 text-[9px] font-bold text-black">M</span>}
                  {p?.rest && <Moon size={11} className="text-faint" />}
                  {p && !p.rest && (allDone ? <CheckCircle2 size={12} className="text-ok" /> : <span className="h-1.5 w-1.5 rounded-full bg-brand" />)}
                </span>
              </button>
            ); })}
          </div>
          <p className="mt-3 text-xs text-faint">Shading shows minutes studied. Dot: planned day · check: plan completed · moon: rest day · M: mock exam taken.</p>
        </Card>
        <Card>
          <h2 className="font-bold">{new Date(parseDateKey(sel)).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          {act && <p className="mt-1 text-sm text-muted">Studied {Math.round(act.ms / 60000)} min · {act.questions} questions ({act.correct} correct) · +{act.xp} XP</p>}
          {day ? (
            <div className="mt-3">
              <div className="flex flex-wrap gap-1.5"><Badge tone="brand">Week {day.week}: {day.phase}</Badge>{day.rest && <Badge>Rest day</Badge>}</div>
              <p className="mt-2 text-sm font-medium">{day.focus}</p>
              <ul className="mt-2 divide-y divide-line">
                {day.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2.5 py-2">
                    <button onClick={() => s.togglePlanTask(t.id)} aria-pressed={!!s.planDone[t.id]} aria-label={`Mark ${t.title} done`}>{s.planDone[t.id] ? <CheckCircle2 size={18} className="text-ok" /> : <Circle size={18} className="text-faint" />}</button>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm">{t.title}</div><div className="text-xs text-muted">{t.minutes} min{t.detail ? ` · ${t.detail}` : ''}</div></div>
                    <Link href={t.href} className="text-sm font-semibold text-brand2 hover:underline">Start</Link>
                  </li>
                ))}
              </ul>
              {day.rest && <p className="mt-2 text-sm text-muted">Nothing scheduled. Rest is when learning consolidates.</p>}
            </div>
          ) : <p className="mt-3 text-sm text-muted">{s.plan ? 'This day is outside your current plan.' : 'No plan yet. Build one and it will adapt to your weakest skills, your daily time and your rest days.'}</p>}
        </Card>
      </div>
      {s.plan && (
        <Card>
          <h2 className="font-bold">Your {s.plan.days.length}-day plan</h2>
          <p className="mt-1 text-sm text-muted">{s.plan.basis} It aims to maximize improvement; no plan can guarantee a particular score.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {PHASES.map((ph) => { const ds = s.plan!.days.filter((d) => d.week === ph.week); if (!ds.length) return null; return (
              <div key={ph.week} className="rounded-xl border border-line p-3">
                <div className="text-xs font-bold uppercase tracking-wide text-brand2">Week {ph.week}</div><div className="font-semibold">{ph.name}</div><p className="mt-0.5 text-xs text-muted">{ph.goal}</p>
                <ul className="mt-2 space-y-1 text-xs">{ds.map((d) => <li key={d.date}><button className={cn('flex w-full gap-2 rounded px-1 py-0.5 text-left hover:bg-raised', d.date === today && 'bg-brand/10')} onClick={() => { setSel(d.date); setMonth(new Date(parseDateKey(d.date))); window.scrollTo(0, 0); }}><span className="w-11 shrink-0 text-faint">{d.date.slice(5).replace('-', '/')}</span><span className={cn('truncate', d.rest && 'text-faint')}>{d.focus}</span></button></li>)}</ul>
              </div>
            ); })}
          </div>
        </Card>
      )}
    </div>
  );
}
