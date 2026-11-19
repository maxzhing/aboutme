'use client';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Circle, Layers, RotateCcw, Target } from 'lucide-react';
import type { Step } from '@/lib/path/next';
import { cn } from './ui';

const ICON: Record<Step['kind'], typeof BookOpen> = { review: RotateCcw, confident: Target, chapter: BookOpen, worked: Layers, practice: Target, hard: Target, check: Target, gauntlet: Layers };

/**
 * Today: about 15 minutes, as a plain ordered list (its own text equivalent). No streaks, no mascot, no guilt:
 * an item done today is ticked, nothing is lost for a day missed.
 */
export function TodayPanel({ items, weekDone, weekPlanned, className }: { items: (Step & { done: boolean })[]; weekDone: number; weekPlanned: number; className?: string }) {
  const minutes = items.filter((i) => !i.done).reduce((t, i) => t + i.minutes, 0);
  const next = items.find((i) => !i.done);
  return (
    <section className={cn('card p-0', className)} aria-labelledby="today-h" data-testid="today">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
        <h2 id="today-h" className="text-[22px]">Today</h2>
        <p className="text-[14px] text-muted"><span data-num>{minutes ? `about ${minutes} min left` : 'All done for today'}</span> · <span data-num>{weekDone} of {weekPlanned}</span> study days this week</p>
      </div>
      <ol className="divide-y divide-line">
        {items.map((it, n) => {
          const Icon = ICON[it.kind];
          return (
            <li key={it.kind + (it.skill ?? '') + n} className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-4 sm:flex-nowrap" data-testid="today-item" data-kind={it.kind} data-done={it.done || undefined}>
              <span className="mt-0.5 shrink-0" aria-hidden>{it.done ? <CheckCircle2 size={20} className="text-ok" /> : <Circle size={20} className="text-faint" />}</span>
              <span className="min-w-0 flex-1 basis-[calc(100%-2rem)] sm:basis-auto">
                <span className="flex items-start gap-2 font-medium"><span className="mt-[3px]"><Icon size={16} aria-hidden className="text-muted" /></span><span>{it.title}</span><span className="sr-only">{it.done ? ' (done)' : ''}</span></span>
                <span className="mt-0.5 block text-[14px] text-muted">{it.reason}</span>
              </span>
              <span className="flex w-full shrink-0 items-center justify-end gap-3 sm:w-auto">
                {!it.done && it.minutes > 0 && <span className="text-[13px] text-faint" data-num>{it.minutes} min</span>}
                {!it.done && <Link href={it.href} className={it === next ? 'btn-primary' : 'btn-ghost'} data-testid={it === next ? 'today-start' : undefined}>{it === next ? 'Start' : 'Open'}<ArrowRight size={16} aria-hidden /></Link>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
