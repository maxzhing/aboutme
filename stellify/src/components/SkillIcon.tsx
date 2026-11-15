import { ArrowRightLeft, Box, ChartColumn, ChartPie, ChartScatter, Circle, Compass, Crosshair, Diff, Dice5, FlaskConical, Handshake, Infinity as Inf, Landmark, Layers, Magnet, Parentheses, Percent, Puzzle, Rocket, Scale, Scissors, SearchCheck, Slash, Table, Target, Telescope, TrendingUp, Triangle, Type, Wrench, type LucideIcon } from 'lucide-react';
import type { DomainId, SkillId } from '@/lib/types';
import { SKILL } from '@/lib/taxonomy';
import { cn } from './ui';

const ICON: Record<SkillId, LucideIcon> = {
  lin1: Scale, linf: TrendingUp, lin2: Slash, sys: Crosshair, ineq: Diff,
  equiv: Puzzle, nleq: Parentheses, nlf: Rocket,
  ratio: ChartPie, pct: Percent, data1: ChartColumn, data2: ChartScatter, prob: Dice5, infer: Target, claims: FlaskConical,
  area: Box, lines: Triangle, trig: Compass, circ: Circle,
  cid: Telescope, coet: Magnet, coeq: Table, inf: SearchCheck,
  wic: Type, tsp: Landmark, ctc: Handshake,
  tra: ArrowRightLeft, syn: Layers,
  bnd: Scissors, fss: Wrench,
};
/** One gradient per content domain, so every skill reads at a glance as part of its area. */
export const DOMAIN_GRADIENT: Record<DomainId, string> = {
  alg: 'from-[#3B82F6] to-[#06B6D4]', adv: 'from-[#6366F1] to-[#A855F7]', psda: 'from-[#14B8A6] to-[#22C55E]', geo: 'from-[#F59E0B] to-[#F97316]',
  ii: 'from-[#8B5CF6] to-[#D946EF]', cs: 'from-[#EC4899] to-[#F43F5E]', eoi: 'from-[#0EA5E9] to-[#6366F1]', sec: 'from-[#10B981] to-[#0EA5E9]',
};

export function SkillIcon({ skill, size = 44, className, dim }: { skill: SkillId; size?: number; className?: string; dim?: boolean }) {
  const Icon = ICON[skill] ?? Inf;
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center rounded-[30%] bg-gradient-to-br text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/20', DOMAIN_GRADIENT[SKILL[skill].domain], dim && 'opacity-45 grayscale-[40%]', className)} style={{ width: size, height: size }} aria-hidden>
      <span className="absolute inset-0 rounded-[30%] bg-gradient-to-b from-white/25 to-transparent" />
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} className="relative drop-shadow-sm" />
    </span>
  );
}
