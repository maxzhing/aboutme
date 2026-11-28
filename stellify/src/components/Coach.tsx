'use client';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Circle, ClipboardList, Flag, Layers, Languages, RotateCcw, Sparkles, Target, Timer, Wind } from 'lucide-react';
import { useMemo } from 'react';
import { QUESTIONS, getQuestion } from '@/data/questions';
import { snapshot, useStore } from '@/lib/store';
import { buildCoach, markDone, STAGE_INFO, type CoachKind, type CoachPlan, type CoachTask } from '@/lib/engine/coach';
import { SKILL } from '@/lib/taxonomy';
import { dateKey } from '@/lib/util';
import { cn } from './ui';

/**
 * The coach's plan for this student (lib/engine/coach.ts), recomputed when their results change. Today stays put
 * for the day; the days after re-plan from the newest results.
 */
export function useCoach(days = 14): CoachPlan {
  const s = useStore();
  const today = dateKey();
  const key = `${s.attempts.length}|${Object.keys(s.chapters).length}|${JSON.stringify(s.profile)}|${Object.keys(s.planDone).length}|${s.mocks.length}|${Object.keys(s.path?.worked ?? {}).length}|${Object.keys(s.mistakes).length}|${today}|${days}`;
  return useMemo(() => {
    const now = Date.now();
    const st = snapshot();
    return markDone(buildCoach(st, { now, getQ: getQuestion, bank: QUESTIONS, days }), st, now, getQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

const ICON: Record<CoachKind, typeof BookOpen> = { lesson: BookOpen, worked: Layers, practice: Target, review: RotateCcw, mistakes: Target, timed: Timer, mock: ClipboardList, vocab: Languages, calm: Wind, placement: Sparkles, testday: Flag };

/** Today's tasks from the coach: the only "what to do now" list in the app. */
export function CoachToday({ plan, className, compact }: { plan: CoachPlan; className?: string; compact?: boolean }) {
  const togglePlanTask = useStore((s) => s.togglePlanTask);
  const day = plan.days.find((d) => d.date === dateKey()) ?? plan.days[0];
  const tasks: CoachTask[] = day?.rest ? [] : day?.tasks ?? [];
  const left = tasks.filter((t) => !t.done).reduce((t, x) => t + x.minutes, 0);
  const next = tasks.find((t) => !t.done);
  return (
    <section className={cn('card p-0', className)} aria-labelledby="today-h" data-testid="today">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
        <h2 id="today-h" className="text-[22px]">Today</h2>
        <p className="text-[14px] text-muted" data-num>{day?.rest ? 'Rest day' : left ? `${left} of today’s ${plan.dailyMinutes} minutes left` : 'All done for today'}</p>
      </div>
      {day?.rest ? (
        <div className="px-5 py-4 text-[15px]"><p>Rest is part of the plan. Nothing is lost by taking today off.</p><Link href="/practice/session?mode=review&n=5" className="btn-ghost mt-3">Optional: five review questions</Link></div>
      ) : (
        <ol className="divide-y divide-line">
          {tasks.map((t) => {
            const Icon = ICON[t.kind];
            return (
              <li key={t.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-4 sm:flex-nowrap" data-testid="today-item" data-kind={t.kind} data-done={t.done || undefined}>
                <button type="button" className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center" onClick={() => togglePlanTask(t.id)} aria-pressed={!!t.done} aria-label={`Mark “${t.title}” ${t.done ? 'not done' : 'done'}`}>{t.done ? <CheckCircle2 size={20} className="text-ok" /> : <Circle size={20} className="text-faint" />}</button>
                <span className="min-w-0 flex-1 basis-[calc(100%-2.25rem)] sm:basis-auto">
                  <span className="flex items-start gap-2 font-medium"><span className="mt-[3px]"><Icon size={16} aria-hidden className="text-muted" /></span><span className={t.done ? 'text-muted line-through' : ''}>{t.title}</span></span>
                  {!compact && <span className="mt-0.5 block text-[14px] text-muted">{t.why}</span>}
                </span>
                {!t.done && (
                  <span className="flex w-full shrink-0 items-center justify-end gap-3 sm:w-auto">
                    {t.minutes > 0 && <span className="text-[13px] text-faint" data-num>{t.minutes} min</span>}
                    <Link href={t.href} className={t === next ? 'btn-primary' : 'btn-ghost'} data-testid={t === next ? 'today-start' : undefined}>{t === next ? 'Start' : 'Open'}<ArrowRight size={16} aria-hidden /></Link>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="border-t border-line px-5 py-3 text-[13px] text-muted">{plan.basis.length ? `Built from ${plan.basis.join(', ')}` : 'A starting plan. Take the placement check and it adapts to you'}. Tasks tick themselves when you do them. <Link href="/calendar" className="text-accent underline">Why this plan</Link></p>
    </section>
  );
}

/** Where the student stands, in one line. */
export function StageLine({ plan }: { plan: CoachPlan }) {
  const st = STAGE_INFO[plan.stage];
  if (!plan.hasData) return <p className="text-[15px] text-muted">Answer a few questions and take the 15-minute placement check, and this becomes a plan made for you. <Link href="/onboarding" className="font-semibold text-accent underline">Start</Link></p>;
  return <p className="text-[15px] text-muted" data-testid="stage-line"><span className="font-semibold text-ink">{st.name}</span> stage · estimated {plan.estimate.total.low}–{plan.estimate.total.high} · goal {plan.target}{plan.horizon.known ? ` · ${plan.horizon.days} days to your test` : ''}</p>;
}

/** The skills the plan is working on, best first, each with its reason. */
export function FocusList({ plan, max = 4 }: { plan: CoachPlan; max?: number }) {
  if (!plan.focus.length) return null;
  return (
    <ol className="space-y-3" data-testid="focus-list">
      {plan.focus.slice(0, max).map((f, i) => (
        <li key={f.skill} className="flex gap-3">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-[13px] font-semibold text-accent" data-num>{i + 1}</span>
          <span className="min-w-0"><Link href={`/learn/${f.skill}`} className="font-medium hover:underline">{SKILL[f.skill].name}</Link><span className="block text-[14px] text-muted">{f.why} About {Math.round(f.minutes / 15) * 15} minutes over the coming weeks.</span></span>
        </li>
      ))}
    </ol>
  );
}
