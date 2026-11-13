'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';

const COLORS = ['#6A4BF0', '#1F6FE5', '#F5B83D', '#22B573', '#F0577A', '#38C6F4'];

/** A short burst of confetti. Change `fire` to a new number to launch another burst. */
export function Confetti({ fire, count = 44 }: { fire: number; count?: number }) {
  const reduce = useReducedMotion();
  const off = useStore((s) => s.settings.reducedMotion);
  const [live, setLive] = useState(0);
  useEffect(() => { if (!fire) return; setLive(fire); const t = setTimeout(() => setLive(0), 1900); return () => clearTimeout(t); }, [fire]);
  const bits = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: (Math.random() - 0.5) * 90, y: 35 + Math.random() * 55, r: Math.random() * 720 - 360, d: Math.random() * 0.25, c: COLORS[i % COLORS.length], w: 6 + Math.random() * 6 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, count]);
  if (!live || reduce || off) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden data-testid="confetti">
      {bits.map((b, i) => (
        <motion.span key={`${live}-${i}`} className="absolute left-1/2 top-[30%] block rounded-sm" style={{ width: b.w, height: b.w * 0.6, background: b.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }} animate={{ x: `${b.x}vw`, y: `${b.y}vh`, opacity: [1, 1, 0], rotate: b.r, scale: 1 }} transition={{ duration: 1.5, delay: b.d, ease: [0.15, 0.6, 0.4, 1] }} />
      ))}
    </div>
  );
}
