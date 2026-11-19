import type { DomainId, Section, SkillId } from '../types';
import { SKILL } from '../taxonomy';

/**
 * The Path's one schema for skills: prerequisites, hex position and route order.
 *
 * Hex positions are axial (q, r) on pointy-top hexagons. Math's 19 skills fill a radius-2 hexagon; the
 * placement came from an exhaustive search that requires every skill to touch at least one of its
 * prerequisites and every prerequisite to sit on the same ring or an inner one (DECISIONS.md #3).
 * Reading & Writing's 11 skills use the same rules around Central ideas.
 */
export interface PathSkill {
  id: SkillId;
  section: Section;
  domain: DomainId;
  title: string;
  /** a short label for the hex, one or two lines split by "|" */
  label: string;
  prereqs: SkillId[];
  hex: { q: number; r: number };
  /** curriculum order within the section (the recommended route when nothing else applies) */
  order: number;
}

const LABEL: Record<SkillId, string> = {
  lin1: 'Linear|equations', lin2: 'Lines in|two variables', ineq: 'Linear|inequalities', equiv: 'Equivalent|expressions', ratio: 'Ratios|& rates',
  data1: 'One-variable|data', area: 'Area &|volume', linf: 'Linear|functions', sys: 'Linear|systems', lines: 'Lines &|angles', pct: 'Percentages',
  prob: 'Probability', nleq: 'Nonlinear|equations', nlf: 'Nonlinear|functions', data2: 'Two-variable|data', infer: 'Inference', claims: 'Statistical|claims',
  trig: 'Trigonometry', circ: 'Circles',
  cid: 'Central|ideas', wic: 'Words in|context', bnd: 'Boundaries', coet: 'Textual|evidence', coeq: 'Quantitative|evidence', tra: 'Transitions',
  tsp: 'Structure &|purpose', fss: 'Form &|structure', inf: 'Inferences', syn: 'Rhetorical|synthesis', ctc: 'Cross-text|connections',
};
const P = (id: SkillId, q: number, r: number, prereqs: SkillId[]): Omit<PathSkill, 'order'> =>
  ({ id, section: SKILL[id].section, domain: SKILL[id].domain, title: SKILL[id].short, label: LABEL[id], prereqs, hex: { q, r } });

const MATH: Omit<PathSkill, 'order'>[] = [
  P('lin1', 0, 0, []),
  P('lin2', -1, 0, ['lin1']),
  P('ineq', -1, 1, ['lin1']),
  P('equiv', 0, 1, ['lin1']),
  P('ratio', 1, -1, []),
  P('data1', 1, 0, []),
  P('area', 0, -1, []),
  P('linf', -2, 1, ['lin2']),
  P('sys', -2, 0, ['lin2']),
  P('lines', -1, -1, ['lin2']),
  P('pct', 2, -2, ['ratio']),
  P('prob', 1, -2, ['ratio']),
  P('nleq', -1, 2, ['equiv', 'sys']),
  P('nlf', -2, 2, ['linf', 'nleq']),
  P('data2', 1, 1, ['linf', 'data1']),
  P('infer', 2, -1, ['data1', 'pct']),
  P('claims', 2, 0, ['infer']),
  P('trig', 0, -2, ['lines']),
  P('circ', 0, 2, ['trig', 'equiv']),
];

const RW: Omit<PathSkill, 'order'>[] = [
  P('cid', 0, 0, []),
  P('wic', 0, -1, []),
  P('bnd', 1, 0, []),
  P('coet', -1, 1, ['cid']),
  P('coeq', 1, -1, ['cid']),
  P('tra', 0, 1, ['cid']),
  P('tsp', -1, 0, ['cid', 'wic']),
  P('fss', 1, 1, ['bnd']),
  P('inf', -2, 1, ['coet']),
  P('syn', -1, 2, ['tra', 'coet']),
  P('ctc', -2, 0, ['tsp']),
];

export const PATH_SKILLS: PathSkill[] = [...MATH, ...RW].map((s, i, all) => ({ ...s, order: all.filter((x) => x.section === s.section).indexOf(s) }));
export const PATH: Record<SkillId, PathSkill> = Object.fromEntries(PATH_SKILLS.map((s) => [s.id, s])) as Record<SkillId, PathSkill>;
export const pathOf = (section: Section) => PATH_SKILLS.filter((s) => s.section === section);

export const hexDistance = (a: { q: number; r: number }, b: { q: number; r: number }) => {
  const dq = a.q - b.q, dr = a.r - b.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
};
export const ring = (h: { q: number; r: number }) => hexDistance(h, { q: 0, r: 0 });

/** The six axial directions, clockwise from east. */
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]] as const;

/**
 * The neighbouring skill an arrow key moves to. Left and right are exact; up and down try the
 * up-left/down-right hex first, then the other diagonal.
 */
export function neighbourFor(from: PathSkill, key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'): PathSkill | undefined {
  const tries: [number, number][] = key === 'ArrowRight' ? [[1, 0]] : key === 'ArrowLeft' ? [[-1, 0]] : key === 'ArrowUp' ? [[0, -1], [1, -1]] : [[0, 1], [-1, 1]];
  const pool = pathOf(from.section);
  for (const [dq, dr] of tries) {
    const hit = pool.find((s) => s.hex.q === from.hex.q + dq && s.hex.r === from.hex.r + dr);
    if (hit) return hit;
  }
  return undefined;
}

/** Pixel centre of a pointy-top hex of circumradius `size`. */
export const hexCenter = (h: { q: number; r: number }, size: number) => ({ x: size * Math.sqrt(3) * (h.q + h.r / 2), y: size * 1.5 * h.r });
