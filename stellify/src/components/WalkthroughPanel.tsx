import Link from 'next/link';
import { PlayCircle } from 'lucide-react';
import { approved, manifestOf, walkthroughFor } from '@/data/narrated';

/** On a skill's page: the hard-problem walkthrough, once it has passed review (or with ?preview=1 in the address). */
export function WalkthroughPanel({ skill }: { skill: string }) {
  const w = walkthroughFor(skill);
  const preview = typeof location !== 'undefined' && /[?&]preview=1/.test(location.hash + location.search);
  if (!w || !manifestOf(w.id) || !(approved(w.id) || preview)) return null;
  const m = manifestOf(w.id)!;
  return (
    <Link href={`/videos/w/${w.id}`} className="mb-6 flex items-center gap-4 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4 transition-colors hover:bg-brand/10" data-testid="walkthrough-panel">
      <PlayCircle size={40} className="shrink-0 text-brand" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-widest text-brand2">Watch the hard-problem walkthrough</span>
        <span className="block font-semibold">{w.title}</span>
        <span className="block text-xs text-muted">{Math.round(m.duration / 60)} min · narrated, with captions · built to be challenging</span>
      </span>
    </Link>
  );
}
