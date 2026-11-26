import { Zap } from 'lucide-react';
import type { Hack } from '@/data/hacks';
import { RichText } from './RichText';
import { cn } from './ui';

/** A single concept card: what it is, the quick test, an example. */
export function HackCard({ hack, compact, className }: { hack: Hack; compact?: boolean; className?: string }) {
  return (
    <article id={hack.id} className={cn('scroll-mt-20 rounded-2xl border border-brand/30 bg-brand/5 p-4', className)} data-testid="hack-card">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand"><Zap size={14} />Hack</div>
      <h3 className="mt-1 font-display text-lg font-bold">{hack.title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed"><RichText text={hack.what} /></p>
      <p className="mt-2.5 rounded-xl bg-surface p-3 text-[15px] leading-relaxed"><b className="text-brand2">The test. </b><RichText text={hack.test} /></p>
      {!compact && <p className="mt-2.5 text-sm text-muted"><b className="text-ink">Example. </b><RichText text={hack.example} /></p>}
    </article>
  );
}
