'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, CheckCircle2, Sparkles, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { SKILL } from '@/lib/taxonomy';
import type { SkillId } from '@/lib/types';
import { Pet } from './Pet';

/** Celebrations and feedback from the learning engine: XP, level-ups, mastery, achievements. */
export function Toasts() {
  const events = useStore((s) => s.events);
  const dismiss = useStore((s) => s.dismissEvent);
  const equipped = useStore((s) => s.pet.equipped);
  // inside lessons and practice the top of the screen holds the question, so pop-ups sit at the bottom
  const low = /^\/(learn\/|practice\/session|daily|speed|arena)/.test(usePathname());
  useEffect(() => {
    if (!events.length) return;
    const timers = events.map((e) => setTimeout(() => dismiss(e.key), e.type === 'xp' ? 2600 : 6000));
    return () => timers.forEach(clearTimeout);
  }, [events, dismiss]);
  return (
    <div className={`pointer-events-none fixed left-1/2 ${low ? 'bottom-4' : 'top-16'} z-[60] flex w-[min(92vw,340px)] -translate-x-1/2 flex-col gap-2`} role="status" aria-live="polite">
      <AnimatePresence>
        {events.slice(-2).map((e) => (
          <motion.div key={e.key} layout initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 30 }}
            className="card flex items-center gap-3 p-3 shadow-glow [&_a]:pointer-events-auto">
            {e.type === 'xp' && <><Sparkles className="shrink-0 text-gold" size={20} /><div className="text-sm"><b>+{e.xp} XP</b> <span className="text-muted">· +{e.coins} Stardust</span>{e.note && <div className="text-xs text-muted">{e.note}</div>}</div></>}
            {e.type === 'level' && <><Pet mood="levelup" level={e.level} equipped={equipped} size={64} /><div><div className="font-display font-bold">Level {e.level}!</div><div className="text-xs text-muted">Lumi is now {e.title}.</div></div></>}
            {e.type === 'achievement' && <><Award className="shrink-0 text-gold" size={26} /><div className="text-sm"><div className="font-semibold">Achievement unlocked</div><Link href="/achievements" className="text-brand2 underline-offset-2 hover:underline">{e.title}</Link></div></>}
            {e.type === 'mastery' && <><TrendingUp className="shrink-0 text-ok" size={24} /><div className="text-sm"><div className="font-semibold">{SKILL[e.skill as SkillId]?.short}</div><div className="text-muted">Now <b className="text-ink">{e.label}</b></div></div></>}
            {e.type === 'ready' && <><CheckCircle2 className="shrink-0 text-ok" size={24} /><div className="text-sm"><div className="font-semibold">A mistake is ready to resolve</div><Link href="/mistakes" className="text-brand2 hover:underline">Open the Mistake Bucket</Link></div></>}
            {e.type === 'mistake' && <Star size={18} />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
