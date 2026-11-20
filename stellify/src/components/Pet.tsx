'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode } from 'react';
import { EGG_PATTERNS, NOVA, mascotName, type Species } from '@/lib/engine/companions';
import { useStore } from '@/lib/store';
import type { PetSlot } from '@/lib/types';
import { cn } from './ui';

export type PetMood = 'idle' | 'happy' | 'celebrate' | 'think' | 'sleep' | 'study' | 'walk' | 'levelup';

const STAR = 'M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z';
const fb = { transformBox: 'fill-box' as const, transformOrigin: 'center' };
/** one outline colour for every creature: a crisp sticker look in both themes */
const OUT = '#2B2730';
const SW = 3.2;

const ANIM: Record<PetMood, Record<string, number[]>> = {
  idle: { y: [0, -5, 0] }, happy: { y: [0, -8, 0] }, think: { rotate: [-2, 2, -2] }, sleep: { scale: [1, 1.025, 1] },
  study: { rotate: [0, 1.5, 0] }, walk: { x: [-16, 16, -16], rotate: [-3, 3, -3] },
  celebrate: { y: [0, -24, 0, -12, 0] }, levelup: { y: [0, -28, 0, -14, 0], scale: [1, 1.08, 1] },
};
const DUR: Record<PetMood, number> = { idle: 3.6, happy: 1.4, think: 3, sleep: 4, study: 3, walk: 4, celebrate: 1, levelup: 1.1 };

/**
 * The student's companion, hatched from an egg (see lib/engine/companions). Drawn entirely in flat-colour
 * SVG so it scales, themes and animates without image assets. Until the first egg hatches, the egg is shown.
 * Accessories from the shop are layered on top and fit every creature.
 */
export function Pet({ mood = 'idle', level = 1, equipped = {}, size = 180, className, still, onClick, label, species }: {
  mood?: PetMood; level?: number; equipped?: Partial<Record<PetSlot, string>>; size?: number; className?: string; still?: boolean; onClick?: () => void; label?: string;
  /** draw this species instead of the student's active companion */
  species?: string;
}) {
  const pet = useStore((s) => s.pet);
  void species;
  const reduce = useReducedMotion() || still;
  const name = mascotName(pet);
  const svg = <Creature sp={NOVA} mood={mood} level={level} equipped={equipped} size={size} className={className} reduce={!!reduce} label={label ?? `${name}, ${mood}`} />;
  return onClick ? <button type="button" onClick={onClick} className="rounded-3xl outline-offset-4" aria-label={label ?? `Say hi to ${name}`}>{svg}</button> : svg;
}

function Creature({ sp, mood, level, equipped, size, className, reduce, label }: { sp: Species; mood: PetMood; level: number; equipped: Partial<Record<PetSlot, string>>; size: number; className?: string; reduce: boolean; label: string }) {
  const c = sp.colors;
  const asleep = mood === 'sleep';
  const joyful = mood === 'celebrate' || mood === 'levelup' || mood === 'happy';
  const studying = mood === 'study';
  const face = equipped.face ?? (studying ? 'face-glasses' : undefined);
  const gold = level >= 50;
  const outline = gold ? '#B7791F' : OUT;
  const look = mood === 'think' ? { dx: 3, dy: -3 } : studying ? { dx: 0, dy: 3 } : { dx: 0, dy: 0 };
  const beak = sp.id === 'sunny' || sp.id === 'kumo';
  const s = { stroke: outline, strokeWidth: SW, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={cn('select-none overflow-visible', className)} role="img" aria-label={label}>
      <ellipse cx="100" cy="183" rx="46" ry="7" fill="#000" opacity="0.2" />
      {equipped.effect === 'effect-aura' && <g opacity="0.22" className={reduce ? undefined : 'animate-twinkle'}><circle cx="100" cy="112" r="88" fill="#FFE27A" /><circle cx="100" cy="112" r="70" fill="#FFE27A" /></g>}
      {mood === 'levelup' && !reduce && [0, 1].map((i) => (
        <motion.circle key={i} cx="100" cy="112" r="50" fill="none" stroke="#FFD23F" strokeWidth="3" initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.7 }} style={fb} />
      ))}

      <motion.g animate={reduce ? {} : ANIM[mood]} transition={{ duration: DUR[mood], repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '100px 170px' }}>
        {/* back layer: capes and wings from the shop, tails, frills */}
        {equipped.back === 'back-cape' && <path d="M58 100 C40 140 44 172 52 186 L148 186 C156 172 160 140 142 100 Z" fill="#E4572E" {...s} />}
        {equipped.back === 'back-wings' && <g fill="#FFFFFF" {...s}><path d="M48 104 C12 78 4 110 18 128 C8 132 22 150 50 134 Z" /><path d="M152 104 C188 78 196 110 182 128 C192 132 178 150 150 134 Z" /></g>}
        {equipped.back === 'back-pack' && <g {...s}><rect x="134" y="104" width="34" height="46" rx="10" fill="#B45309" /><rect x="140" y="118" width="22" height="14" rx="4" fill="#F59E0B" /></g>}
        {sp.id === 'nova' ? <NovaBody c={c} outline={outline} /> : (<>
        <Back sp={sp} s={s} />

        {/* feet and body */}
        <g fill={c.dark} {...s}><ellipse cx="80" cy="175" rx="14" ry="7.5" /><ellipse cx="120" cy="175" rx="14" ry="7.5" /></g>
        {sp.id === 'sunny' || sp.id === 'kumo' ? <g fill={c.accent} {...s}><ellipse cx="80" cy="175" rx="14" ry="7.5" /><ellipse cx="120" cy="175" rx="14" ry="7.5" /></g> : null}
        <path d="M100 54 C140 54 158 88 158 122 C158 158 132 176 100 176 C68 176 42 158 42 122 C42 88 60 54 100 54Z" fill={c.body} {...s} />
        <Belly sp={sp} />
        <path d="M64 84 C70 70 84 62 98 61" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />

        {/* arms */}
        <g fill={sp.id === 'bao' ? c.dark : sp.id === 'kumo' ? c.body : c.body} {...s}>
          <ellipse cx="45" cy="130" rx="9" ry="13" transform={joyful ? 'rotate(150 45 130) translate(0 -14)' : mood === 'think' ? 'rotate(-40 45 130)' : undefined} />
          <ellipse cx="155" cy="130" rx="9" ry="13" transform={joyful ? 'rotate(-150 155 130) translate(0 -14)' : undefined} />
        </g>

        <Front sp={sp} s={s} />

        </>)}
        {/* neck accessories (and a level-10 star pin when nothing is worn) */}
        {equipped.neck === 'neck-scarf' && <g {...s}><path d="M56 146 C80 160 120 160 144 146 L146 158 C122 172 78 172 54 158 Z" fill="#22D3EE" /><path d="M120 160 L132 186 L118 184 L112 164 Z" fill="#06B6D4" /></g>}
        {equipped.neck === 'neck-bowtie' && <g fill="#F43F5E" {...s}><path d="M100 154 L80 144 L80 164 Z" /><path d="M100 154 L120 144 L120 164 Z" /><circle cx="100" cy="154" r="4.5" fill="#BE123C" /></g>}
        {equipped.neck === 'neck-medal' && <g><path d="M84 142 L100 162 L116 142" fill="none" stroke="#EF4444" strokeWidth="5" /><circle cx="100" cy="166" r="9" fill="#FACC15" {...s} /><path d={STAR} transform="translate(100 166) scale(0.45)" fill="#CA8A04" /></g>}
        {!equipped.neck && level >= 10 && <path d={STAR} transform="translate(100 158) scale(0.55)" fill="#FFD23F" stroke={outline} strokeWidth={2} />}

        {sp.id === 'nova' ? <NovaFace c={c} asleep={asleep} joyful={joyful} think={mood === 'think'} look={look} level={level} /> : (<>
        {/* face */}
        {!(sp.id === 'bao') && <g fill={c.cheek} opacity="0.75"><ellipse cx="64" cy="124" rx="8" ry="5.5" /><ellipse cx="136" cy="124" rx="8" ry="5.5" /></g>}
        {level >= 5 && <g fill="#FFFFFF" opacity="0.9"><circle cx="60" cy="121" r="1.6" /><circle cx="132" cy="121" r="1.6" /></g>}
        <Eyes sp={sp} asleep={asleep} joyful={joyful} look={look} reduce={reduce} />
        <Mouth sp={sp} asleep={asleep} joyful={joyful} think={mood === 'think'} beak={beak} />

        </>)}
        {/* eyewear */}
        {face === 'face-glasses' && <g fill="none" stroke="#14121A" strokeWidth="3"><circle cx="80" cy="108" r="15" /><circle cx="120" cy="108" r="15" /><path d="M95 108 H105" /></g>}
        {face === 'face-shades' && <g fill="#14121A"><rect x="62" y="98" width="34" height="20" rx="8" /><rect x="104" y="98" width="34" height="20" rx="8" /><rect x="94" y="104" width="12" height="4" /></g>}
        {face === 'face-monocle' && <g fill="none" stroke="#EAB308" strokeWidth="3"><circle cx="120" cy="108" r="15" /><path d="M134 116 C142 132 138 148 132 156" strokeWidth="1.8" /></g>}

        {/* hats */}
        {equipped.hat === 'hat-cap' && <g {...s}><path d="M70 58 L100 70 L130 58 L130 66 C120 76 80 76 70 66 Z" fill="#111827" /><path d="M56 52 L100 34 L144 52 L100 68 Z" fill="#1F2937" /><path d="M140 53 V72" stroke="#FACC15" strokeWidth="2.5" /><circle cx="140" cy="74" r="3.5" fill="#FACC15" /></g>}
        {equipped.hat === 'hat-beanie' && <g {...s}><path d="M58 76 C58 44 142 44 142 76 Z" fill="#F97316" /><rect x="54" y="70" width="92" height="13" rx="6.5" fill="#EA580C" /><circle cx="100" cy="46" r="8" fill="#FED7AA" /></g>}
        {equipped.hat === 'hat-wizard' && <g {...s}><path d="M66 70 L104 4 L134 70 Z" fill="#1D4E89" /><ellipse cx="100" cy="70" rx="46" ry="9" fill="#235FA8" /><path d={STAR} transform="translate(100 42) scale(0.6)" fill="#FDE047" stroke="none" /><path d={STAR} transform="translate(112 60) scale(0.3)" fill="#FDE047" stroke="none" /></g>}
        {equipped.hat === 'hat-crown' && <g {...s}><path d="M68 66 L72 38 L86 54 L100 32 L114 54 L128 38 L132 66 Z" fill="#FACC15" /><circle cx="100" cy="54" r="4" fill="#EF4444" /></g>}
        {equipped.hat === 'hat-headphones' && <g><path d="M48 112 C44 52 156 52 152 112" fill="none" stroke="#14121A" strokeWidth="6" /><rect x="38" y="100" width="16" height="28" rx="7" fill="#22D3EE" {...s} /><rect x="146" y="100" width="16" height="28" rx="7" fill="#22D3EE" {...s} /></g>}
        {level >= 30 && !equipped.hat && <g fill="#FFD23F" stroke={outline} strokeWidth={1.5}>{[-22, -7, 8, 23].map((dx, i) => <path key={dx} d={STAR} transform={`translate(${100 + dx} ${44 - (i === 1 || i === 2 ? 5 : 0)}) scale(0.32)`} className={reduce ? undefined : 'animate-twinkle'} style={{ animationDelay: `${i * 0.3}s` }} />)}</g>}

        {studying && <g {...s}><path d="M62 168 L100 158 L138 168 L138 190 L100 180 L62 190 Z" fill="#FFFFFF" /><path d="M100 158 V180" /></g>}
      </motion.g>

      {/* overlays that do not move with the body */}
      {mood === 'think' && <g fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="2"><circle cx="160" cy="62" r="4" /><circle cx="170" cy="46" r="6" /><ellipse cx="180" cy="22" rx="18" ry="14" /><text x="180" y="28" textAnchor="middle" fontSize="18" fontWeight="700" fill="rgb(var(--accent))" stroke="none">?</text></g>}
      {asleep && <g fill="rgb(var(--accent))" fontWeight="700" fontFamily="inherit">{[0, 1, 2].map((i) => <text key={i} x={140 + i * 10} y={56 - i * 14} fontSize={12 + i * 4} className={reduce ? undefined : 'animate-zzz'} style={{ animationDelay: `${i * 0.7}s` }}>z</text>)}</g>}
      {(mood === 'celebrate' || mood === 'levelup' || equipped.effect === 'effect-sparkle') && <g fill="#FFD23F">{[[30, 60, 0.5], [172, 96, 0.4], [26, 128, 0.35], [166, 150, 0.45], [60, 26, 0.3]].map(([x, y, sc], i) => <path key={i} d={STAR} transform={`translate(${x} ${y}) scale(${sc})`} className={reduce ? undefined : 'animate-twinkle'} style={{ animationDelay: `${i * 0.35}s` }} />)}</g>}
      {equipped.effect === 'effect-orbit' && <g className={reduce ? undefined : 'pet-orbit'} style={{ transformOrigin: '100px 112px' }}>{[[100, 22, '#FFD23F'], [178, 150, '#67E8F9'], [22, 150, '#FF9EAF']].map(([x, y, col]) => <circle key={String(x) + y} cx={x as number} cy={y as number} r="6" fill={col as string} />)}</g>}
    </svg>
  );
}

type Stroke = { stroke: string; strokeWidth: number; strokeLinejoin: 'round'; strokeLinecap: 'round' };

/** features behind the body: ears, tails, frills, wings */
function Back({ sp, s }: { sp: Species; s: Stroke }): ReactNode {
  const c = sp.colors;
  switch (sp.id) {
    case 'mochi': return <g {...s}><ellipse cx="76" cy="40" rx="13" ry="32" fill={c.body} transform="rotate(-14 76 40)" /><ellipse cx="124" cy="40" rx="13" ry="32" fill={c.body} transform="rotate(14 124 40)" /><ellipse cx="76" cy="42" rx="6" ry="21" fill={c.accent} stroke="none" transform="rotate(-14 76 42)" /><ellipse cx="124" cy="42" rx="6" ry="21" fill={c.accent} stroke="none" transform="rotate(14 124 42)" /></g>;
    case 'ember': return <g {...s}><path d="M150 150 C186 150 196 112 178 92 C176 120 160 128 146 128 Z" fill={c.body} /><path d="M178 92 C188 104 190 118 184 130 C178 122 176 108 178 92 Z" fill={c.belly} /><path d="M58 84 L60 34 L94 62 Z" fill={c.body} /><path d="M142 84 L140 34 L106 62 Z" fill={c.body} /><path d="M60 34 L66 50 L72 46 Z" fill={c.accent} /><path d="M140 34 L134 50 L128 46 Z" fill={c.accent} /></g>;
    case 'toffee': return <g {...s}><circle cx="64" cy="64" r="16" fill={c.body} /><circle cx="136" cy="64" r="16" fill={c.body} /><circle cx="64" cy="64" r="8" fill={c.belly} stroke="none" /><circle cx="136" cy="64" r="8" fill={c.belly} stroke="none" /></g>;
    case 'bao': return <g {...s}><circle cx="62" cy="64" r="17" fill={c.dark} /><circle cx="138" cy="64" r="17" fill={c.dark} /></g>;
    case 'coral': return <g {...s}>{[[-1, 0], [1, 0]].map(([side]) => [0, 1, 2].map((k) => { const x0 = side < 0 ? 52 : 148, y0 = 84 + k * 14; const x1 = x0 + side * 26, y1 = y0 - 14 + k * 8; return <g key={`${side}${k}`}><path d={`M${x0} ${y0} Q${(x0 + x1) / 2} ${y0 - 10} ${x1} ${y1}`} fill="none" stroke={c.dark} strokeWidth={7} strokeLinecap="round" /><circle cx={x1} cy={y1} r="5.5" fill={c.dark} stroke={s.stroke} strokeWidth={2} /></g>; }))}</g>;
    case 'skye': return <g {...s}><path d="M56 86 L58 40 L92 64 Z" fill={c.body} /><path d="M144 86 L142 40 L108 64 Z" fill={c.body} /><path d="M62 72 L63 52 L80 64 Z" fill={c.cheek} stroke="none" /><path d="M138 72 L137 52 L120 64 Z" fill={c.cheek} stroke="none" /><path d="M150 152 C176 156 188 132 176 114" fill="none" stroke={s.stroke} strokeWidth={12} strokeLinecap="round" /><path d="M150 152 C176 156 188 132 176 114" fill="none" stroke={c.body} strokeWidth={7} strokeLinecap="round" /></g>;
    case 'moss': return <g {...s}><path d="M46 104 C22 82 10 100 16 120 C24 112 32 114 40 126 Z" fill={c.accent} /><path d="M154 104 C178 82 190 100 184 120 C176 112 168 114 160 126 Z" fill={c.accent} /><path d="M148 156 C176 160 190 146 194 130 L182 138 L184 126 L170 140 C162 144 154 146 148 146 Z" fill={c.body} /></g>;
    case 'kumo': return null;
    case 'sunny': return <g {...s}><path d="M96 56 C92 42 96 34 104 32 C100 40 104 48 104 56 Z" fill={c.body} /><path d="M104 56 C108 44 116 40 122 42 C114 46 112 52 110 58 Z" fill={c.body} /></g>;
    default: return null;
  }
}

/** belly and face patches drawn on the body */
function Belly({ sp }: { sp: Species }): ReactNode {
  const c = sp.colors;
  if (sp.id === 'kumo') return <path d="M100 82 C114 70 136 78 138 100 C142 128 132 166 100 168 C68 166 58 128 62 100 C64 78 86 70 100 82 Z" fill={c.belly} />;
  if (sp.id === 'bao') return <ellipse cx="100" cy="146" rx="32" ry="22" fill={c.belly} />;
  if (sp.id === 'moss') return <g><ellipse cx="100" cy="144" rx="30" ry="26" fill={c.belly} />{[132, 144, 156].map((y) => <path key={y} d={`M80 ${y} Q100 ${y + 6} 120 ${y}`} fill="none" stroke={c.dark} strokeWidth="2" strokeLinecap="round" opacity="0.5" />)}</g>;
  if (sp.id === 'skye') return <g fill={c.belly}><circle cx="70" cy="160" r="14" /><circle cx="90" cy="166" r="16" /><circle cx="112" cy="166" r="16" /><circle cx="132" cy="160" r="14" /></g>;
  if (sp.id === 'pip') return <g><ellipse cx="100" cy="146" rx="34" ry="26" fill={c.belly} /><g fill={c.dark} opacity="0.55"><circle cx="58" cy="102" r="4" /><circle cx="146" cy="96" r="3" /><circle cx="140" cy="146" r="3.5" /></g></g>;
  if (sp.id === 'coral') return <g><ellipse cx="100" cy="146" rx="32" ry="24" fill={c.belly} /><g fill={c.dark} opacity="0.4"><circle cx="66" cy="96" r="3" /><circle cx="136" cy="94" r="3.5" /></g></g>;
  return <ellipse cx="100" cy="144" rx="34" ry="28" fill={c.belly} opacity={sp.id === 'mochi' ? 0.9 : 1} />;
}

/** features in front of the body: frog bumps, horns, muzzles, eye patches, whiskers */
function Front({ sp, s }: { sp: Species; s: Stroke }): ReactNode {
  const c = sp.colors;
  switch (sp.id) {
    case 'pip': return <g fill={c.body} {...s}><path d="M58 96 C56 72 76 64 90 74" /><path d="M110 74 C124 64 144 72 142 96" /></g>;
    case 'moss': return <g {...s}><path d="M74 62 L68 38 L86 56 Z" fill="#FFF3D6" /><path d="M126 62 L132 38 L114 56 Z" fill="#FFF3D6" /></g>;
    case 'ember': return <ellipse cx="100" cy="130" rx="24" ry="15" fill={c.belly} />;
    case 'toffee': return <ellipse cx="100" cy="128" rx="20" ry="14" fill={c.belly} />;
    case 'bao': return <g fill={c.dark}><ellipse cx="78" cy="110" rx="14" ry="17" transform="rotate(-22 78 110)" /><ellipse cx="122" cy="110" rx="14" ry="17" transform="rotate(22 122 110)" /></g>;
    case 'skye': return <g stroke={c.dark} strokeWidth="2" strokeLinecap="round"><path d="M50 122 L30 118" /><path d="M50 128 L30 130" /><path d="M150 122 L170 118" /><path d="M150 128 L170 130" /></g>;
    default: return null;
  }
}

function Eyes({ sp, asleep, joyful, look, reduce }: { sp: Species; asleep: boolean; joyful: boolean; look: { dx: number; dy: number }; reduce: boolean }) {
  const ink = sp.id === 'bao' ? '#FFFFFF' : OUT;
  if (asleep) return <g fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round"><path d="M70 108 Q80 115 90 108" /><path d="M110 108 Q120 115 130 108" /></g>;
  if (joyful) return <g fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round"><path d="M70 112 Q80 100 90 112" /><path d="M110 112 Q120 100 130 112" /></g>;
  if (sp.id === 'bao') return (
    <g className={reduce ? undefined : 'animate-blink'} style={fb}>
      {[80, 120].map((cx) => <g key={cx}><circle cx={cx + look.dx * 0.6} cy={109 + look.dy * 0.6} r="6.5" fill="#FFFFFF" /><circle cx={cx + look.dx * 0.6 + 1.5} cy={107 + look.dy * 0.6} r="2" fill={OUT} /></g>)}
    </g>
  );
  return (
    <g className={reduce ? undefined : 'animate-blink'} style={fb}>
      {[80, 120].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx + look.dx} cy={108 + look.dy} rx="9" ry="11" fill={OUT} />
          <circle cx={cx + look.dx + 3} cy={103.5 + look.dy} r="3.4" fill="#FFFFFF" />
          <circle cx={cx + look.dx - 3} cy={112.5 + look.dy} r="1.7" fill="#FFFFFF" />
        </g>
      ))}
    </g>
  );
}

function Mouth({ sp, asleep, joyful, think, beak }: { sp: Species; asleep: boolean; joyful: boolean; think: boolean; beak: boolean }) {
  const c = sp.colors;
  const nose = sp.id === 'mochi' ? <ellipse cx="100" cy="121" rx="4" ry="3" fill={c.accent} />
    : sp.id === 'ember' || sp.id === 'toffee' || sp.id === 'bao' ? <ellipse cx="100" cy="121" rx="5" ry="3.6" fill={OUT} />
    : sp.id === 'skye' ? <path d="M96 119 L104 119 L100 124 Z" fill={c.cheek} stroke={OUT} strokeWidth="1.5" strokeLinejoin="round" /> : null;
  if (beak) return joyful
    ? <g stroke={OUT} strokeWidth="2.5" strokeLinejoin="round"><path d="M88 120 L112 120 L100 130 Z" fill={c.accent} /><path d="M90 132 L110 132 L100 140 Z" fill={c.accent} /></g>
    : <path d="M88 122 L112 122 L100 134 Z" fill={c.accent} stroke={OUT} strokeWidth="2.5" strokeLinejoin="round" />;
  const wide = sp.id === 'pip' || sp.id === 'coral';
  const cat = sp.id === 'skye' || sp.id === 'ember' || sp.id === 'mochi';
  return (
    <g>
      {nose}
      {asleep ? <path d="M94 132 H106" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
        : joyful ? <g><path d={wide ? 'M80 126 Q100 152 120 126 Z' : 'M86 127 Q100 146 114 127 Z'} fill={OUT} /><path d={wide ? 'M92 138 Q100 145 108 138 Z' : 'M94 136 Q100 141 106 136 Z'} fill="#FF7A90" /></g>
        : think ? <circle cx="104" cy="131" r="3.6" fill={OUT} />
        : cat ? <path d="M90 127 Q95 133 100 128 Q105 133 110 127" fill="none" stroke={OUT} strokeWidth="3" strokeLinecap="round" />
        : wide ? <path d="M78 126 Q100 142 122 126" fill="none" stroke={OUT} strokeWidth="3.2" strokeLinecap="round" />
        : <path d="M91 128 Q100 136 109 128" fill="none" stroke={OUT} strokeWidth="3.2" strokeLinecap="round" />}
    </g>
  );
}

/** The companion egg: spots and a band, with cracks that grow as the student studies. */
export function EggArt({ pct, ready, pattern = 0, size = 180, still, className, label, cracking = false }: { pct: number; ready: boolean; pattern?: number; size?: number; still?: boolean; className?: string; label?: string; cracking?: boolean }) {
  const p = EGG_PATTERNS[pattern % EGG_PATTERNS.length];
  const anim = still ? {} : cracking ? { rotate: [0, -10, 10, -12, 12, -6, 6, 0] } : ready ? { rotate: [0, -6, 6, -4, 4, 0, 0, 0] } : { rotate: [0, -2, 2, 0] };
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={cn('select-none overflow-visible', className)} role="img" aria-label={label ?? 'Companion egg'}>
      <ellipse cx="100" cy="186" rx="44" ry="7" fill="#000" opacity="0.2" />
      {ready && <g opacity="0.25"><circle cx="100" cy="112" r="84" fill="#FFE27A" /></g>}
      <motion.g animate={anim} transition={{ duration: cracking ? 0.8 : ready ? 1.6 : 4, repeat: cracking ? 0 : Infinity, ease: 'easeInOut', repeatDelay: ready ? 0.6 : 0 }} style={{ transformOrigin: '100px 180px' }}>
        <path d="M100 28 C140 28 162 96 162 128 C162 166 136 184 100 184 C64 184 38 166 38 128 C38 96 60 28 100 28Z" fill={p.shell} stroke={OUT} strokeWidth={SW} />
        <path d="M40 120 L56 108 L72 122 L88 108 L104 122 L120 108 L136 122 L152 108 L161 116 L162 132 L152 124 L136 138 L120 124 L104 138 L88 124 L72 138 L56 124 L39 136 Z" fill={p.band} />
        <g fill={p.spot}><circle cx="80" cy="70" r="9" /><circle cx="122" cy="84" r="7" /><circle cx="70" cy="158" r="8" /><circle cx="128" cy="160" r="10" /><circle cx="104" cy="52" r="5" /></g>
        <path d="M66 62 C72 50 80 42 90 38" fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="5" strokeLinecap="round" />
        {pct >= 0.34 && <path d="M100 40 L94 54 L104 62 L96 76" fill="none" stroke={OUT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
        {pct >= 0.67 && <path d="M132 70 L124 80 L134 88 L126 98" fill="none" stroke={OUT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
        {ready && <path d="M60 92 L72 98 L66 108 L78 114" fill="none" stroke={OUT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
      </motion.g>
      {ready && !still && <g fill="#FFD23F">{[[40, 50, 0.45], [164, 64, 0.38], [30, 120, 0.3], [172, 140, 0.36]].map(([x, y, sc], i) => <path key={i} d={STAR} transform={`translate(${x} ${y}) scale(${sc})`} className="animate-twinkle" style={{ animationDelay: `${i * 0.4}s` }} />)}</g>}
    </svg>
  );
}

/** Habitat backdrop for the companion: flat-colour scenes, no gradients. */
export function Habitat({ id = 'habitat-nook', className, children }: { id?: string; className?: string; children?: React.ReactNode }) {
  const stars = [[40, 30], [90, 60], [150, 22], [210, 48], [280, 26], [330, 64], [370, 34], [250, 82], [120, 90], [20, 78]];
  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {id === 'habitat-summit' ? <>
          <rect width="400" height="240" fill="#FFD9B0" /><rect width="400" height="110" fill="#FFC48C" /><rect width="400" height="60" fill="#FFAE7A" />
          <circle cx="300" cy="140" r="34" fill="#FFF1C9" />
          <path d="M0 240 L70 120 L130 190 L200 90 L270 180 L330 130 L400 210 L400 240 Z" fill="#3D5A80" /><path d="M200 90 L218 116 L204 112 L196 122 L184 112 Z" fill="#FFFFFF" />
        </> : id === 'habitat-library' ? <>
          <rect width="400" height="240" fill="#3B2A22" />
          {[20, 78, 136].map((y) => <g key={y}><rect x="0" y={y + 44} width="400" height="6" fill="#78350F" />{Array.from({ length: 26 }, (_, i) => <rect key={i} x={6 + i * 15.2} y={y + 44 - (18 + ((i * 7 + y) % 22))} width="11" height={18 + ((i * 7 + y) % 22)} rx="1.5" fill={['#E4572E', '#2E86AB', '#F4A259', '#5BBA6F', '#F2C14E', '#8C9AA8'][(i + y) % 6]} />)}</g>)}
          <rect y="200" width="400" height="40" fill="#2A1C16" />
        </> : id === 'habitat-station' ? <>
          <rect width="400" height="240" fill="#0B1220" />{stars.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1 + (i % 3) * 0.6} fill="#fff" opacity="0.9" />)}
          <circle cx="200" cy="420" r="250" fill="#1D4ED8" /><path d="M60 250 C120 190 200 200 260 240 C200 220 130 230 60 250Z" fill="#22C55E" /><circle cx="200" cy="420" r="250" fill="none" stroke="#93C5FD" strokeWidth="6" opacity="0.5" />
          <rect x="6" y="6" width="388" height="228" rx="26" fill="none" stroke="#334155" strokeWidth="12" />
        </> : id === 'habitat-observatory' ? <>
          <rect width="400" height="240" fill="#101935" />{stars.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1 + (i % 3) * 0.7} fill="#FDE68A" className="animate-twinkle" style={{ animationDelay: `${i * 0.25}s` }} />)}
          <path d="M250 240 V190 A60 60 0 0 1 370 190 V240 Z" fill="#475569" /><path d="M300 150 L352 104 L362 116 L312 162 Z" fill="#94A3B8" /><rect y="218" width="400" height="22" fill="#1E293B" />
        </> : <>
          <rect width="400" height="240" fill="#26365A" />
          <rect x="214" y="26" width="104" height="86" rx="8" fill="#2F4C7C" stroke="#F2B880" strokeWidth="5" /><circle cx="292" cy="56" r="12" fill="#FFF3B0" />
          <g fill="#FFFFFF" opacity="0.8"><circle cx="236" cy="48" r="1.4" /><circle cx="258" cy="86" r="1.2" /><circle cx="300" cy="94" r="1.5" /></g>
          <path d="M266 26 V112 M214 69 H318" stroke="#F2B880" strokeWidth="4" />
          <rect y="196" width="400" height="44" fill="#1C2742" />
          <circle cx="371" cy="150" r="34" fill="#FFD166" opacity="0.12" /><rect x="367" y="150" width="8" height="46" fill="#C98A5B" /><path d="M352 150 H390 L382 124 H360 Z" fill="#FFD166" />
          <g><rect x="292" y="184" width="46" height="8" rx="2" fill="#2E86AB" /><rect x="296" y="176" width="40" height="8" rx="2" fill="#E4572E" /></g>
          <path d="M248 196 C248 172 262 162 280 168" fill="none" stroke="#5BBA6F" strokeWidth="5" strokeLinecap="round" /><circle cx="280" cy="166" r="9" fill="#5BBA6F" />
        </>}
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

/** A five-point star outline with rounded tips (drawn with a thick round-joined stroke). */
function starPath(cx: number, cy: number, R: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => { const a = (-90 + i * 36) * Math.PI / 180, d = i % 2 ? r : R; return `${i ? 'L' : 'M'}${(cx + d * Math.cos(a)).toFixed(1)} ${(cy + d * Math.sin(a)).toFixed(1)}`; }).join(' ') + ' Z';
}
const NOVA_STAR = starPath(100, 120, 62, 36);

/** Nova's body: a soft gold star. Its side points are its arms and its lower points its feet. */
function NovaBody({ c, outline }: { c: Species['colors']; outline: string }) {
  return (
    <g>
      <path d={NOVA_STAR} fill={outline} stroke={outline} strokeWidth={26 + 2 * SW} strokeLinejoin="round" />
      <path d={NOVA_STAR} fill={c.body} stroke={c.body} strokeWidth={26} strokeLinejoin="round" />
      {/* a lighter face patch and a shine on the top point: flat shapes, no gradients */}
      <ellipse cx="100" cy="122" rx="40" ry="31" fill={c.belly} opacity="0.55" />
      <path d="M62 98 C66 88 74 82 84 80" fill="none" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round" />
      <path d="M100 47 L102.6 53.4 L109 56 L102.6 58.6 L100 65 L97.4 58.6 L91 56 L97.4 53.4 Z" fill="#FFFFFF" opacity="0.9" />
    </g>
  );
}

/** Nova's face: big, calm eyes, rosy cheeks and a mouth that follows its mood. */
function NovaFace({ c, asleep, joyful, think, look, level }: { c: Species['colors']; asleep: boolean; joyful: boolean; think: boolean; look: { dx: number; dy: number }; level: number }) {
  const ink = '#2B2730';
  return (
    <g>
      <g fill={c.cheek} opacity="0.8"><ellipse cx="66" cy="128" rx="8" ry="5" /><ellipse cx="134" cy="128" rx="8" ry="5" /></g>
      {level >= 5 && <g fill="#FFFFFF" opacity="0.9"><circle cx="62" cy="126" r="1.6" /><circle cx="130" cy="126" r="1.6" /></g>}
      {asleep ? (
        <g fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round"><path d="M72 112 Q80 118 88 112" /><path d="M112 112 Q120 118 128 112" /></g>
      ) : joyful ? (
        <g fill="none" stroke={ink} strokeWidth="3.6" strokeLinecap="round"><path d="M72 114 Q80 104 88 114" /><path d="M112 114 Q120 104 128 114" /></g>
      ) : (
        <g>
          <ellipse cx={80 + look.dx} cy={110 + look.dy} rx="7" ry="9" fill={ink} />
          <ellipse cx={120 + look.dx} cy={110 + look.dy} rx="7" ry="9" fill={ink} />
          <circle cx={77.5 + look.dx} cy={106.5 + look.dy} r="2.4" fill="#FFFFFF" />
          <circle cx={117.5 + look.dx} cy={106.5 + look.dy} r="2.4" fill="#FFFFFF" />
        </g>
      )}
      {asleep ? <path d="M95 132 H105" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        : joyful ? <g><path d="M89 127 Q100 143 111 127 Z" fill="#7A2E2E" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" /><ellipse cx="100" cy="135.5" rx="5" ry="2.6" fill="#F0828A" /></g>
        : think ? <circle cx="104" cy="131" r="3.6" fill="#7A2E2E" stroke={ink} strokeWidth="2" />
        : <path d="M91 128 Q100 136 109 128" fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round" />}
    </g>
  );
}
