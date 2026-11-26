import { ArrowRightLeft, Box, ChartColumn, ChartPie, ChartScatter, Circle, Compass, Crosshair, Diff, Dice5, FlaskConical, Handshake, Infinity as Inf, Landmark, Layers, Magnet, Parentheses, Percent, Puzzle, Rocket, Scale, Scissors, SearchCheck, Slash, Table, Target, Telescope, TrendingUp, Triangle, Type, Wrench, type LucideIcon } from 'lucide-react';
import type { DomainId, SkillId } from '@/lib/types';
import { SKILL } from '@/lib/taxonomy';
import { cn } from './ui';

export const SKILL_ICON: Record<SkillId, LucideIcon> = {
  lin1: Scale, linf: TrendingUp, lin2: Slash, sys: Crosshair, ineq: Diff,
  equiv: Puzzle, nleq: Parentheses, nlf: Rocket,
  ratio: ChartPie, pct: Percent, data1: ChartColumn, data2: ChartScatter, prob: Dice5, infer: Target, claims: FlaskConical,
  area: Box, lines: Triangle, trig: Compass, circ: Circle,
  cid: Telescope, coet: Magnet, coeq: Table, inf: SearchCheck,
  wic: Type, tsp: Landmark, ctc: Handshake,
  tra: ArrowRightLeft, syn: Layers,
  bnd: Scissors, fss: Wrench,
};
/** Domains are told apart by their names, never by colour alone (DESIGN.md). Kept for older imports. */
export const DOMAIN_COLOR: Record<DomainId, string> = { alg: '', adv: '', psda: '', geo: '', ii: '', cs: '', eoi: '', sec: '' };

export function SkillIcon({ skill, size = 44, className, dim }: { skill: SkillId; size?: number; className?: string; dim?: boolean }) {
  const Icon = SKILL_ICON[skill] ?? Inf;
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center rounded-[28%]', `dom-${SKILL[skill].domain}`, dim && 'opacity-50', className)} data-domain={SKILL[skill].domain} style={{ width: size, height: size, color: 'rgb(var(--dom))', background: 'rgb(var(--dom) / .14)' }} aria-hidden>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.75} />
    </span>
  );
}
