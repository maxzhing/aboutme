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
/** One flat colour per content domain, so every skill reads at a glance as part of its area. */
export const DOMAIN_COLOR: Record<DomainId, string> = {
  alg: 'bg-[#3B82F6]', adv: 'bg-[#6366F1]', psda: 'bg-[#14B8A6]', geo: 'bg-[#F59E0B]',
  ii: 'bg-[#8B5CF6]', cs: 'bg-[#EC4899]', eoi: 'bg-[#0EA5E9]', sec: 'bg-[#10B981]',
};

export function SkillIcon({ skill, size = 44, className, dim }: { skill: SkillId; size?: number; className?: string; dim?: boolean }) {
  const Icon = ICON[skill] ?? Inf;
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center rounded-[30%] text-white shadow-[0_6px_14px_-8px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-black/10', DOMAIN_COLOR[SKILL[skill].domain], dim && 'opacity-45 grayscale-[40%]', className)} style={{ width: size, height: size }} aria-hidden>
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} className="relative drop-shadow-sm" />
    </span>
  );
}
