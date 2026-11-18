'use client';
import { useEffect, useMemo } from 'react';
import { haptic, sfx } from '@/lib/sfx';
import { useStore } from '@/lib/store';

const PRESSABLE = 'button, a[href], [role="tab"], [role="radio"], [role="checkbox"], summary, input[type="checkbox"], input[type="radio"]';
const RIPPLE = '.btn, .btn-primary, .btn-ghost, .btn-quiet, .chip, [data-choice], [data-ripple], [role="tab"]';

/**
 * Makes every press feel soft: a quiet "pop", a tiny vibration on phones, and a ripple that spreads
 * from the exact point you touched. One listener for the whole app, so every button gets it.
 */
export function SoftFeel() {
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = (e.target as Element | null)?.closest?.(PRESSABLE) as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
      if (!el.closest('[data-silent]')) { sfx('tap'); haptic(); }
      const host = (e.target as Element).closest(RIPPLE) as HTMLElement | null;
      if (!host || document.documentElement.classList.contains('reduce-motion')) return;
      const r = host.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 2.2;
      const dot = document.createElement('span');
      dot.className = 'ripple';
      dot.setAttribute('aria-hidden', 'true');
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      host.appendChild(dot);
      dot.addEventListener('animationend', () => dot.remove(), { once: true });
      setTimeout(() => dot.remove(), 900);
    };
    document.addEventListener('pointerdown', down, { capture: true, passive: true });
    return () => document.removeEventListener('pointerdown', down, { capture: true });
  }, []);
  return null;
}

/** The quiet backdrop behind the app: softly twinkling stars on a flat background. */
export function Backdrop() {
  const reduced = useStore((s) => s.settings.reducedMotion);
  // fixed, deterministic star positions (no layout shift between renders)
  const stars = useMemo(() => {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    return Array.from({ length: 64 }, () => ({ x: rnd() * 100, y: rnd() * 100, s: rnd() < 0.15 ? 2.4 : rnd() < 0.5 ? 1.6 : 1.1, d: rnd() * 6, t: 3 + rnd() * 5 }));
  }, []);
  return (
    <div className={`backdrop ${reduced ? 'backdrop-still' : ''}`} aria-hidden data-testid="backdrop">
      {stars.map((st, i) => <span key={i} className="star" style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, animationDelay: `${st.d}s`, animationDuration: `${st.t}s` }} />)}
    </div>
  );
}

/** A small burst of sparkles, for the moment an answer is right. */
export function Sparkles({ fire }: { fire: number }) {
  if (!fire) return null;
  return (
    <span className="sparkles" key={fire} aria-hidden>
      {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ ['--a' as string]: `${i * 36}deg`, ['--d' as string]: `${18 + (i % 3) * 8}px` }} />)}
    </span>
  );
}
