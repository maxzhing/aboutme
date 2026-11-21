import Link from 'next/link';
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Moon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { useWeekRhythm } from '@/lib/hooks';
import { STAGE_INFO } from '@/lib/engine/coach';
import { addDays, dateKey, daysBetween, parseDateKey } from '@/lib/util';
import { FocusList, useCoach } from '@/components/Coach';
import { Badge, Card, PageHeader, Progress, Stat, cn } from '@/components/ui';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/**
 * My plan: why the plan looks the way it does, the next two weeks, and the study history. The plan is never stale:
 * it is re-planned from the latest results every morning, so there is nothing to rebuild.
 */
export function CalendarPage() {
  const s = useStore();
  const plan = useCoach(14);
  const week = useWeekRhythm();
  const today = dateKey();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(today);
  const planByDate = useMemo(() => Object.fromEntries(plan.days.map((d) => [d.date, d])), [plan]);
  const mockDates = useMemo(() => new Set(s.mocks.filter((m) => m.completedAt).map((m) => dateKey(m.completedAt!))), [s.mocks]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const cells: (string | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => dateKey(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  const weekStart = addDays(today, -new Date(parseDateKey(today)).getDay());
  const weekMin = Array.from({ length: 7 }, (_, i) => s.activity[addDays(weekStart, i)]?.ms ?? 0).reduce((a, b) => a + b, 0) / 60000;
  const weekGoal = plan.dailyMinutes * plan.studyDaysPerWeek;
  const day = planByDate[sel];
  const act = s.activity[sel];
  const daysLeft = s.profile.examDate ? daysBetween(today, s.profile.examDate) : null;
  const st = STAGE_INFO[plan.stage];
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Your plan" title="My plan" subtitle="Made from your answers and results, and re-planned every morning from the newest ones. Missed a day? Nothing breaks: the plan moves forward."
        actions={<div className="flex flex-wrap gap-2"><Link href="/onboarding" className="btn-ghost">Change my answers</Link><Link href="/diagnostic" className="btn-ghost">Retake the placement check</Link></div>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Test" value={daysLeft === null ? 'No date set' : daysLeft < 0 ? 'Passed' : plural(daysLeft, 'day')} sub={<Link href="/settings" className="text-accent hover:underline">{s.profile.examDate ? new Date(parseDateKey(s.profile.examDate)).toLocaleDateString() : 'Set a date'}</Link>} />
        <Stat label="This week" value={`${Math.round(weekMin)} min`} sub={<><span>plan: {weekGoal} min</span><Progress value={(weekMin / Math.max(1, weekGoal)) * 100} className="mt-1.5" label="Weekly minutes" /></>} />
        <Stat label="Study days this week" value={`${week.done} of ${week.planned}`} sub="rest days never count against you" />
        <Stat label="Stage" value={plan.hasData ? st.name : '—'} sub={plan.hasData ? `estimated ${plan.estimate.total.low}–${plan.estimate.total.high}` : 'take the placement check'} />
      </div>
      <Card data-testid="why-plan">
        <h2 className="font-bold">Why this plan</h2>
        {plan.hasData ? <p className="mt-1 text-sm text-muted">{st.blurb} It is built from {plan.basis.join(', ')}, your {plan.dailyMinutes} minutes a day on {plural(plan.studyDaysPerWeek, 'day')} a week, and {plan.horizon.known ? `${plural(plan.horizon.days, 'day')} until your test` : 'about two months, since there is no test date yet'}.</p>
          : <p className="mt-1 text-sm text-muted">There is almost nothing to go on yet, so this is a generic start. <Link href="/onboarding" className="text-accent underline">Answer the start-up questions</Link> and the plan becomes yours.</p>}
        {plan.notes.map((x) => <p key={x} className="mt-2 rounded-xl border border-warn/30 bg-warn/5 px-4 py-2 text-sm">{x}</p>)}
        <h3 className="mt-4 font-semibold">Where the time goes, best first</h3>
        <div className="mt-2"><FocusList plan={plan} max={6} /></div>
        {plan.projection.high > 0 && <p className="mt-3 text-xs text-faint">Modelled gain if you keep to it: roughly +{plan.projection.low} to +{plan.projection.high} points. An estimate from a simple model, not a promise; see Methodology.</p>}
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-1"><button className="btn-quiet !p-2" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button><button className="btn-ghost !px-3 !py-1.5" onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSel(today); }}>Today</button><button className="btn-quiet !p-2" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button></div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-faint">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((k, i) => { if (!k) return <div key={i} />; const a = s.activity[k]; const p = planByDate[k]; const min = a ? Math.round(a.ms / 60000) : 0; const allDone = p && p.tasks.length > 0 && p.tasks.every((t) => t.done); return (
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
          <p className="mt-3 text-xs text-faint">Shading shows minutes studied. Dot: planned day · check: done · moon: rest day · M: practice test taken.</p>
        </Card>
        <Card>
          <h2 className="font-bold">{new Date(parseDateKey(sel)).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          {act && <p className="mt-1 text-sm text-muted">Studied {Math.round(act.ms / 60000)} min · {plural(act.questions, 'question')} ({act.correct} correct)</p>}
          {day ? (
            <div className="mt-3" data-testid="day-plan">
              {sel !== today && !day.rest && <Badge>Projected: re-planned on the morning from your newest results</Badge>}
              <p className="mt-2 text-sm font-medium">{day.focus}</p>
              <ul className="mt-2 divide-y divide-line">
                {day.tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5 py-2">
                    {sel === today ? <button type="button" className="grid h-6 w-6 place-items-center" onClick={() => s.togglePlanTask(t.id)} aria-pressed={!!t.done} aria-label={`Mark ${t.title} done`}>{t.done ? <CheckCircle2 size={18} className="text-ok" /> : <Circle size={18} className="text-faint" />}</button> : <Circle size={18} className="text-line" aria-hidden />}
                    <div className="min-w-0 flex-1"><div className="text-sm">{t.title}</div><div className="text-xs text-muted">{t.minutes ? `${t.minutes} min · ` : ''}{t.why}</div></div>
                    {sel === today && <Link href={t.href} className="text-sm font-semibold text-accent hover:underline">Start</Link>}
                  </li>
                ))}
              </ul>
              {day.rest && <p className="mt-2 text-sm text-muted">Nothing scheduled. Rest is when learning settles in.</p>}
            </div>
          ) : <p className="mt-3 text-sm text-muted">{sel < today ? 'A past day: the shading shows what you did.' : 'Further ahead than the plan shows. It is laid out two weeks at a time, so it can follow your results.'}</p>}
        </Card>
      </div>
    </div>
  );
}
