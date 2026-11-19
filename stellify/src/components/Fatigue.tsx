'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { getQuestion } from '@/data/questions';
import { fatigueCurve, FATIGUE } from '@/lib/engine/fatigue';
import { useStore } from '@/lib/store';
import { SECTION_NAME } from '@/lib/taxonomy';
import type { Section } from '@/lib/types';
import { cn } from './ui';

export function useFatigue(section: Section) {
  const mocks = useStore((s) => s.mocks);
  const attempts = useStore((s) => s.attempts);
  return useMemo(() => fatigueCurve(mocks, attempts, getQuestion, section), [mocks, attempts, section]);
}

/** Fatigue and pacing (N6): accuracy against difficulty-adjusted expectation by thirds, and a time strip. */
export function FatigueCard({ section }: { section: Section }) {
  const f = useFatigue(section);
  const max = Math.max(f.target * 1.6, ...f.pace.map((p) => p.seconds));
  return (
    <section className="card p-5" aria-labelledby={`fat-${section}`} data-testid={`fatigue-${section}`}>
      <h2 id={`fat-${section}`} className="text-[20px]">Stamina and pacing · {SECTION_NAME[section]}</h2>
      {f.verdict === 'not-enough-data' ? (
        <p className="mt-1 text-[15px] text-muted" data-testid="fatigue-verdict">Needs at least {FATIGUE.MIN_MODULES} finished timed modules ({f.modules} so far) before it can say anything about stamina.</p>
      ) : (
        <>
          <p className="mt-1 text-[15px]" data-testid="fatigue-verdict">{f.verdict === 'possible-drop' ? `Possible late drop-off: in the last third of a module you do about ${Math.round((f.buckets[0].diff - f.buckets[2].diff) * 100)} points worse than expected for those questions’ difficulty, compared with the first third.` : 'No clear drop-off late in modules once question difficulty is taken into account.'} <span className="text-muted">Based on {f.modules} modules.</span></p>
          <table className="mt-3 w-full text-[14px]">
            <thead><tr><th className="py-1 text-left">Part of module</th><th className="text-right">Answers</th><th className="text-right">Right</th><th className="text-right">Expected</th></tr></thead>
            <tbody className="divide-y divide-line">{f.buckets.map((b) => <tr key={b.label}><td className="py-1.5">{b.label}</td><td className="text-right">{b.n}</td><td className="text-right">{Math.round(b.observed * 100)}%</td><td className="text-right">{Math.round(b.expected * 100)}%</td></tr>)}</tbody>
          </table>
          {f.verdict === 'possible-drop' && <p className="mt-3 text-[14px]">Try: a <Link href="/practice/timed" className="text-accent underline">timed module</Link> where you start with the last 9 questions, and a 10-second reset (sit back, breathe out, read the next stem twice) every third of the way through.</p>}
        </>
      )}
      {f.pace.length > 0 && (
        <div className="mt-4" aria-label={`Average seconds per question by position, against a target of ${f.target} seconds`}>
          <p className="text-[13px] text-muted">Seconds per question by position (average); the line is the {f.target}-second target.</p>
          <div className="relative mt-2 flex h-20 items-end gap-[2px]" role="img" aria-label={f.pace.map((p) => `question ${p.position}: ${p.seconds} seconds`).join(', ')}>
            <div className="absolute inset-x-0 border-t border-dashed border-ink/60" style={{ bottom: `${(f.target / max) * 100}%` }}><span className="absolute -top-4 right-0 text-[11px] text-muted">{f.target} s</span></div>
            {f.pace.map((p) => <div key={p.position} className={cn('flex-1 rounded-t-sm', p.seconds > f.target * 1.25 ? 'bg-warn' : 'bg-accent/70')} style={{ height: `${Math.max(4, (p.seconds / max) * 100)}%` }} title={`Q${p.position}: ${p.seconds} s`} />)}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-faint"><span>Q1</span><span>Q{f.pace[f.pace.length - 1].position}</span></div>
          <p className="mt-1 text-[12px] text-faint">Bars over 125% of the target are shaded amber.</p>
        </div>
      )}
    </section>
  );
}
