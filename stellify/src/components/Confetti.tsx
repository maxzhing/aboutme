'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';

const COLORS = ['#7C5CFF', '#2F8BFF', '#F5B83D', '#2FD08A', '#FF6B9A', '#38C6F4', '#FFFFFF'];
const STAR = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';

/**
 * A celebration burst: pieces shoot up from the middle of the screen, then drift down with gravity,
 * spinning as they fall. Ribbons, dots and little stars. Change `fire` to launch another burst.
 */
/** A thrown piece's path, sampled: it slows as it rises to its peak, then speeds up as it falls (gravity). */
function arc(b: { peakX: number; peakY: number; endX: number; endY: number }, axis: 'x' | 'y'): string[] {
  const pts: string[] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    if (axis === 'x') pts.push(`${(b.endX * (1 - (1 - t) ** 2)).toFixed(2)}vw`);
    else {
      // up to the peak in the first third (easing out), then down to the landing spot (easing in)
      const v = t <= 1 / 3 ? b.peakY * (1 - (1 - t * 3) ** 2) : b.peakY + (b.endY - b.peakY) * ((t - 1 / 3) * 1.5) ** 2;
      pts.push(`${v.toFixed(2)}vh`);
    }
  }
  return pts;
}

export function Confetti({ fire, count = 56 }: { fire: number; count?: number }) {
  const reduce = useReducedMotion();
  const off = useStore((s) => s.settings.reducedMotion);
  const [live, setLive] = useState(0);
  useEffect(() => { if (!fire) return; setLive(fire); const t = setTimeout(() => setLive(0), 2300); return () => clearTimeout(t); }, [fire]);
  const bits = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (-90 + (Math.random() - 0.5) * 140) * (Math.PI / 180);
    const power = 22 + Math.random() * 26;
    const shape = i % 5 === 0 ? 'star' : i % 3 === 0 ? 'dot' : 'ribbon';
    return {
      peakX: Math.cos(angle) * power, peakY: Math.sin(angle) * power,          // the top of the throw, in vw/vh
      endX: Math.cos(angle) * power * 1.5, endY: 55 + Math.random() * 30,      // where it lands
      spin: (Math.random() - 0.5) * 1080, d: Math.random() * 0.18, c: COLORS[i % COLORS.length], shape,
      w: shape === 'ribbon' ? 7 + Math.random() * 5 : shape === 'star' ? 11 + Math.random() * 5 : 6 + Math.random() * 4,
    };
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [live, count]);
  if (!live || reduce || off) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden data-testid="confetti">
      {bits.map((b, i) => (
        <motion.span key={`${live}-${i}`} className="absolute left-1/2 top-[42%] block"
          style={{ width: b.w, height: b.shape === 'ribbon' ? b.w * 0.45 : b.w, background: b.c, borderRadius: b.shape === 'dot' ? 9999 : 2, clipPath: b.shape === 'star' ? STAR : undefined, boxShadow: b.shape === 'star' ? `0 0 8px ${b.c}` : undefined }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: arc(b, 'x'), y: arc(b, 'y'), opacity: [1, 1, 1, 1, 1, 0.8, 0], rotate: [0, b.spin * 0.4, b.spin], scale: [0.4, 1, 0.9] }}
          transition={{ duration: 1.9, delay: b.d, ease: 'linear' }} />
      ))}
    </div>
  );
}
