'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { useId } from 'react';
import type { PetSlot } from '@/lib/types';
import { cn } from './ui';

export type PetMood = 'idle' | 'happy' | 'celebrate' | 'think' | 'sleep' | 'study' | 'walk' | 'levelup';

const STAR = 'M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z';
const fb = { transformBox: 'fill-box' as const, transformOrigin: 'center' };

/**
 * Lumi — Stellify's original mascot: a small star sprite whose antenna-star glows when ideas
 * click. Drawn entirely in SVG so it scales, themes and animates without image assets.
 * Appearance evolves with level; accessories are layered from the student's equipped items.
 */
export function Pet({ mood = 'idle', level = 1, equipped = {}, size = 180, className, still, onClick, label }: {
  mood?: PetMood; level?: number; equipped?: Partial<Record<PetSlot, string>>; size?: number; className?: string; still?: boolean; onClick?: () => void; label?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion() || still;
  const asleep = mood === 'sleep';
  const joyful = mood === 'celebrate' || mood === 'levelup' || mood === 'happy';
  const studying = mood === 'study';
  const face = equipped.face ?? (studying ? 'face-glasses' : undefined);
  const gold = level >= 50;

  const ANIM: Record<PetMood, Record<string, number[]>> = {
    idle: { y: [0, -5, 0] }, happy: { y: [0, -8, 0] }, think: { rotate: [-2, 2, -2] }, sleep: { scale: [1, 1.025, 1] },
    study: { rotate: [0, 1.5, 0] }, walk: { x: [-16, 16, -16], rotate: [-3, 3, -3] },
    celebrate: { y: [0, -24, 0, -12, 0] }, levelup: { y: [0, -28, 0, -14, 0], scale: [1, 1.08, 1] },
  };
  const bodyAnim = reduce ? {} : ANIM[mood];
  const dur = { idle: 3.6, happy: 1.4, think: 3, sleep: 4, study: 3, walk: 4, celebrate: 1, levelup: 1.1 }[mood];
  const pupil = mood === 'think' ? { dx: 3, dy: -4 } : studying ? { dx: 0, dy: 4 } : { dx: 0, dy: 0 };

  const svg = (
    <svg viewBox="0 0 200 200" width={size} height={size} className={cn('select-none overflow-visible', className)} role="img" aria-label={label ?? `Lumi the star sprite, ${mood}`}>
      <defs>
        <linearGradient id={`b${uid}`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={gold ? '#FBBF24' : '#9B7BFF'} /><stop offset="0.55" stopColor="#6D4CFF" /><stop offset="1" stopColor="#2F8BFF" />
        </linearGradient>
        <radialGradient id={`g${uid}`}><stop offset="0" stopColor="#FFF7C2" stopOpacity="0.95" /><stop offset="1" stopColor="#FDE047" stopOpacity="0" /></radialGradient>
        <linearGradient id={`t${uid}`} x1="1" x2="0"><stop offset="0" stopColor="#7C5CFF" stopOpacity="0.9" /><stop offset="1" stopColor="#38BDF8" stopOpacity="0" /></linearGradient>
      </defs>

      <ellipse cx="100" cy="182" rx="46" ry="7" fill="#000" opacity="0.22" />

      {equipped.effect === 'effect-aura' && <circle cx="100" cy="112" r="86" fill={`url(#g${uid})`} opacity="0.35" className="animate-twinkle" />}
      {mood === 'levelup' && !reduce && [0, 1].map((i) => (
        <motion.circle key={i} cx="100" cy="112" r="50" fill="none" stroke="#FDE047" strokeWidth="3" initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.7 }} style={fb} />
      ))}

      <motion.g animate={bodyAnim} transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '100px 170px' }}>
        {/* back layer */}
        {level >= 10 && <path d="M52 140 C20 150 6 128 2 108 C16 128 34 126 50 116 Z" fill={`url(#t${uid})`} />}
        {equipped.back === 'back-cape' && <path d="M58 100 C40 140 44 172 52 186 L148 186 C156 172 160 140 142 100 Z" fill="#1E1B4B" stroke="#4338CA" strokeWidth="2" />}
        {equipped.back === 'back-wings' && <g fill="#E0E7FF" opacity="0.92" stroke="#A5B4FC" strokeWidth="1.5"><path d="M48 104 C12 78 4 110 18 128 C8 132 22 150 50 134 Z" /><path d="M152 104 C188 78 196 110 182 128 C192 132 178 150 150 134 Z" /></g>}
        {equipped.back === 'back-pack' && <g><rect x="134" y="104" width="34" height="46" rx="10" fill="#B45309" /><rect x="140" y="118" width="22" height="14" rx="4" fill="#F59E0B" /></g>}

        {/* ears, feet, body */}
        <path d="M58 78 C46 58 50 46 60 44 C66 52 72 62 76 70 Z" fill="#7C5CFF" /><path d="M142 78 C154 58 150 46 140 44 C134 52 128 62 124 70 Z" fill="#4F7BFF" />
        {level >= 20 && <g fill="#FDE047"><circle cx="58" cy="46" r="3.5" /><circle cx="142" cy="46" r="3.5" /></g>}
        <g fill="#3B2BB8"><ellipse cx="80" cy="176" rx="13" ry="6.5" className={mood === 'walk' && !reduce ? 'animate-floaty' : undefined} /><ellipse cx="120" cy="176" rx="13" ry="6.5" /></g>
        <path d="M100 54 C140 54 158 88 158 122 C158 158 132 176 100 176 C68 176 42 158 42 122 C42 88 60 54 100 54Z" fill={`url(#b${uid})`} />
        <ellipse cx="100" cy="136" rx="36" ry="29" fill="#fff" opacity="0.16" />
        <path d="M62 84 C70 68 86 60 100 60" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" />
        {level >= 5 && <g fill="#FDE68A" opacity="0.9"><circle cx="64" cy="140" r="2.2" /><circle cx="72" cy="150" r="1.6" /><circle cx="138" cy="144" r="2" /></g>}

        {/* arms */}
        <g fill="#5B43E6">
          <ellipse cx="44" cy="128" rx="8" ry="12" transform={joyful ? 'rotate(150 44 128) translate(0 -14)' : mood === 'think' ? 'rotate(-40 44 128)' : undefined} />
          <ellipse cx="156" cy="128" rx="8" ry="12" transform={joyful ? 'rotate(-150 156 128) translate(0 -14)' : undefined} />
        </g>

        {/* neck accessories */}
        {equipped.neck === 'neck-scarf' && <g><path d="M56 146 C80 160 120 160 144 146 L146 158 C122 172 78 172 54 158 Z" fill="#22D3EE" /><path d="M120 160 L132 186 L118 184 L112 164 Z" fill="#06B6D4" /></g>}
        {equipped.neck === 'neck-bowtie' && <g fill="#F43F5E"><path d="M100 154 L80 144 L80 164 Z" /><path d="M100 154 L120 144 L120 164 Z" /><circle cx="100" cy="154" r="4.5" fill="#BE123C" /></g>}
        {equipped.neck === 'neck-medal' && <g><path d="M84 142 L100 162 L116 142" fill="none" stroke="#EF4444" strokeWidth="5" /><circle cx="100" cy="166" r="9" fill="#FACC15" stroke="#CA8A04" strokeWidth="2" /><path d={STAR} transform="translate(100 166) scale(0.45)" fill="#CA8A04" /></g>}

        {/* face */}
        <g fill="#FB7185" opacity="0.5"><circle cx="64" cy="126" r="7" /><circle cx="136" cy="126" r="7" /></g>
        {asleep ? (
          <g fill="none" stroke="#1E1B4B" strokeWidth="3.5" strokeLinecap="round"><path d="M70 110 Q80 117 90 110" /><path d="M110 110 Q120 117 130 110" /></g>
        ) : (
          <g className={reduce ? undefined : 'animate-blink'} style={fb}>
            {[80, 120].map((cx) => (
              <g key={cx}>
                <ellipse cx={cx} cy="108" rx="11" ry={joyful ? 11 : 13} fill="#fff" />
                <circle cx={cx + pupil.dx} cy={110 + pupil.dy} r="6.5" fill="#1E1B4B" />
                <circle cx={cx + pupil.dx + 2.2} cy={107 + pupil.dy} r="2.2" fill="#fff" />
              </g>
            ))}
          </g>
        )}
        {asleep ? <path d="M94 132 H106" stroke="#1E1B4B" strokeWidth="3" strokeLinecap="round" />
          : joyful ? <g><path d="M86 126 Q100 146 114 126 Z" fill="#1E1B4B" /><path d="M94 135 Q100 141 106 135 Z" fill="#FB7185" /></g>
          : mood === 'think' ? <circle cx="104" cy="131" r="3.6" fill="#1E1B4B" />
          : <path d="M91 128 Q100 136 109 128" fill="none" stroke="#1E1B4B" strokeWidth="3.2" strokeLinecap="round" />}

        {/* eyewear */}
        {face === 'face-glasses' && <g fill="none" stroke="#0F172A" strokeWidth="3"><circle cx="80" cy="108" r="15" /><circle cx="120" cy="108" r="15" /><path d="M95 108 H105" /></g>}
        {face === 'face-shades' && <g fill="#0F172A"><rect x="62" y="98" width="34" height="20" rx="8" /><rect x="104" y="98" width="34" height="20" rx="8" /><rect x="94" y="104" width="12" height="4" /></g>}
        {face === 'face-monocle' && <g fill="none" stroke="#EAB308" strokeWidth="3"><circle cx="120" cy="108" r="15" /><path d="M134 116 C142 132 138 148 132 156" strokeWidth="1.8" /></g>}

        {/* hats */}
        {equipped.hat === 'hat-cap' && <g><path d="M70 58 L100 70 L130 58 L130 66 C120 76 80 76 70 66 Z" fill="#111827" /><path d="M56 52 L100 34 L144 52 L100 68 Z" fill="#1F2937" /><path d="M140 53 V72" stroke="#FACC15" strokeWidth="2.5" /><circle cx="140" cy="74" r="3.5" fill="#FACC15" /></g>}
        {equipped.hat === 'hat-beanie' && <g><path d="M58 76 C58 44 142 44 142 76 Z" fill="#F97316" /><rect x="54" y="70" width="92" height="13" rx="6.5" fill="#EA580C" /><circle cx="100" cy="46" r="8" fill="#FED7AA" /></g>}
        {equipped.hat === 'hat-wizard' && <g><path d="M66 70 L104 4 L134 70 Z" fill="#4C1D95" /><ellipse cx="100" cy="70" rx="46" ry="9" fill="#5B21B6" /><path d={STAR} transform="translate(100 42) scale(0.6)" fill="#FDE047" /><path d={STAR} transform="translate(112 60) scale(0.3)" fill="#FDE047" /></g>}
        {equipped.hat === 'hat-crown' && <g><path d="M68 66 L72 38 L86 54 L100 32 L114 54 L128 38 L132 66 Z" fill="#FACC15" stroke="#CA8A04" strokeWidth="2" /><circle cx="100" cy="54" r="4" fill="#EF4444" /></g>}
        {equipped.hat === 'hat-headphones' && <g><path d="M48 112 C44 52 156 52 152 112" fill="none" stroke="#0F172A" strokeWidth="6" /><rect x="38" y="100" width="16" height="28" rx="7" fill="#22D3EE" /><rect x="146" y="100" width="16" height="28" rx="7" fill="#22D3EE" /></g>}
        {level >= 30 && !equipped.hat && <g fill="#FDE047">{[-24, -8, 8, 24].map((dx, i) => <path key={dx} d={STAR} transform={`translate(${100 + dx} ${48 - (i === 1 || i === 2 ? 6 : 0)}) scale(0.32)`} className="animate-twinkle" style={{ animationDelay: `${i * 0.3}s` }} />)}</g>}

        {/* antenna + star */}
        <path d="M100 56 C96 38 108 26 120 24" fill="none" stroke="#C4B5FD" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="124" cy="22" r={joyful || mood === 'think' ? 20 : 15} fill={`url(#g${uid})`} className={reduce ? undefined : 'animate-twinkle'} />
        <path d={STAR} transform={`translate(124 22) scale(${level >= 20 ? 1.05 : 0.85})`} fill="#FDE047" stroke="#F59E0B" strokeWidth="1" />

        {studying && <g><path d="M62 168 L100 158 L138 168 L138 190 L100 180 L62 190 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" /><path d="M100 158 V180" stroke="#94A3B8" strokeWidth="2" /></g>}
      </motion.g>

      {/* overlays that do not move with the body */}
      {mood === 'think' && <g fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="2"><circle cx="160" cy="62" r="4" /><circle cx="170" cy="46" r="6" /><ellipse cx="180" cy="22" rx="18" ry="14" /><text x="180" y="28" textAnchor="middle" fontSize="18" fontWeight="700" fill="rgb(var(--brand))" stroke="none">?</text></g>}
      {asleep && <g fill="rgb(var(--brand2))" fontWeight="700" fontFamily="inherit">{[0, 1, 2].map((i) => <text key={i} x={140 + i * 10} y={56 - i * 14} fontSize={12 + i * 4} className={reduce ? undefined : 'animate-zzz'} style={{ animationDelay: `${i * 0.7}s` }}>z</text>)}</g>}
      {(mood === 'celebrate' || mood === 'levelup' || equipped.effect === 'effect-sparkle') && <g fill="#FDE047">{[[30, 60, 0.5], [172, 96, 0.4], [26, 128, 0.35], [166, 150, 0.45], [60, 26, 0.3]].map(([x, y, s], i) => <path key={i} d={STAR} transform={`translate(${x} ${y}) scale(${s})`} className={reduce ? undefined : 'animate-twinkle'} style={{ animationDelay: `${i * 0.35}s` }} />)}</g>}
      {equipped.effect === 'effect-orbit' && <g className={reduce ? undefined : 'pet-orbit'} style={{ transformOrigin: '100px 112px' }}>{[[100, 22, '#A5B4FC'], [178, 150, '#67E8F9'], [22, 150, '#FDE68A']].map(([x, y, c]) => <circle key={String(x) + y} cx={x as number} cy={y as number} r="6" fill={c as string} />)}</g>}
    </svg>
  );
  return onClick
    ? <button type="button" onClick={onClick} className="rounded-3xl outline-offset-4" aria-label={label ?? 'Pet Lumi'}>{svg}</button>
    : svg;
}

/** Habitat backdrop for the companion. */
export function Habitat({ id = 'habitat-nook', className, children }: { id?: string; className?: string; children?: React.ReactNode }) {
  const stars = [[40, 30], [90, 60], [150, 22], [210, 48], [280, 26], [330, 64], [370, 34], [250, 82], [120, 90], [20, 78]];
  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="h-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B1030" /><stop offset="1" stopColor="#1E1B4B" /></linearGradient>
          <linearGradient id="h-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#312E81" /><stop offset="0.6" stopColor="#9D4EDD" /><stop offset="1" stopColor="#FDBA74" /></linearGradient>
          <linearGradient id="h-warm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1E1B4B" /><stop offset="1" stopColor="#3B2A6B" /></linearGradient>
        </defs>
        {id === 'habitat-summit' ? <>
          <rect width="400" height="240" fill="url(#h-dawn)" /><circle cx="300" cy="150" r="34" fill="#FDE68A" opacity="0.85" />
          <path d="M0 240 L70 120 L130 190 L200 90 L270 180 L330 130 L400 210 L400 240 Z" fill="#1E1B4B" opacity="0.9" /><path d="M200 90 L218 116 L204 112 L196 122 L184 112 Z" fill="#E0E7FF" />
        </> : id === 'habitat-library' ? <>
          <rect width="400" height="240" fill="url(#h-warm)" />
          {[20, 78, 136].map((y) => <g key={y}><rect x="0" y={y + 44} width="400" height="6" fill="#78350F" />{Array.from({ length: 26 }, (_, i) => <rect key={i} x={6 + i * 15.2} y={y + 44 - (18 + ((i * 7 + y) % 22))} width="11" height={18 + ((i * 7 + y) % 22)} rx="1.5" fill={['#7C3AED', '#2563EB', '#DB2777', '#059669', '#D97706', '#475569'][(i + y) % 6]} opacity="0.85" />)}</g>)}
          <rect y="200" width="400" height="40" fill="#451A03" />
        </> : id === 'habitat-station' ? <>
          <rect width="400" height="240" fill="#050816" />{stars.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1 + (i % 3) * 0.6} fill="#fff" opacity="0.9" />)}
          <circle cx="200" cy="420" r="250" fill="#1D4ED8" /><path d="M60 250 C120 190 200 200 260 240 C200 220 130 230 60 250Z" fill="#22C55E" opacity="0.8" /><circle cx="200" cy="420" r="250" fill="none" stroke="#93C5FD" strokeWidth="6" opacity="0.5" />
          <rect x="6" y="6" width="388" height="228" rx="26" fill="none" stroke="#334155" strokeWidth="12" />
        </> : id === 'habitat-observatory' ? <>
          <rect width="400" height="240" fill="url(#h-night)" />{stars.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1 + (i % 3) * 0.7} fill="#FDE68A" className="animate-twinkle" style={{ animationDelay: `${i * 0.25}s` }} />)}
          <path d="M250 240 V190 A60 60 0 0 1 370 190 V240 Z" fill="#334155" /><path d="M300 150 L352 104 L362 116 L312 162 Z" fill="#94A3B8" /><rect y="218" width="400" height="22" fill="#0F172A" />
        </> : <>
          <rect width="400" height="240" fill="url(#h-warm)" />
          <rect x="250" y="30" width="110" height="90" rx="8" fill="#0B1030" stroke="#6D5BD0" strokeWidth="5" /><circle cx="330" cy="62" r="13" fill="#FDE68A" /><path d="M305 30 V120 M250 75 H360" stroke="#6D5BD0" strokeWidth="4" />
          <rect y="196" width="400" height="44" fill="#2E1F5E" /><rect x="34" y="150" width="8" height="46" fill="#A78BFA" /><path d="M20 150 H58 L50 124 H28 Z" fill="#FDE68A" /><circle cx="39" cy="196" r="34" fill="#FDE68A" opacity="0.12" />
          <g fill="#7C3AED"><rect x="80" y="184" width="46" height="8" rx="2" /><rect x="84" y="176" width="40" height="8" rx="2" fill="#2563EB" /></g>
        </>}
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
