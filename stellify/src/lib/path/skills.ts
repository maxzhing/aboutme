import type { DomainId, Section, SkillId } from '../types';
import { SKILL } from '../taxonomy';

/**
 * The Path's one schema for skills: prerequisites, hex position and route order.
 *
 * Hex positions are axial (q, r) on pointy-top hexagons, laid out like hexagonal-thinking tiles: each domain
 * is one touching cluster, every skill touches a prerequisite or the related skill it branches from, and a
 * skill never sits below the skill it attaches to, so the map grows upward from Linear equations / Central
 * ideas. The positions came from a search over those rules (DECISIONS.md #17); tests/path.test.ts checks them.
 */
export interface PathSkill {
  id: SkillId;
  section: Section;
  domain: DomainId;
  title: string;
  /** related skills this one branches out from on the map (a real relation, not a prerequisite) */
  branch: SkillId[];
  /** a short label for the hex, one or two lines split by "|" */
  label: string;
  prereqs: SkillId[];
  hex: { q: number; r: number };
  /** curriculum order within the section (the recommended route when nothing else applies) */
  order: number;
}

const LABEL: Record<SkillId, string> = {
  lin1: 'Linear|equations', lin2: 'Lines in two|variables', ineq: 'Linear|inequalities', equiv: 'Equivalent|expressions', ratio: 'Ratios|& rates',
  data1: 'One-variable|data', area: 'Area &|volume', linf: 'Linear|functions', sys: 'Linear|systems', lines: 'Lines &|angles', pct: 'Percentages',
  prob: 'Probability', nleq: 'Nonlinear|equations', nlf: 'Nonlinear|functions', data2: 'Two-variable|data', infer: 'Inference', claims: 'Statistical|claims',
  trig: 'Trigonometry', circ: 'Circles',
  cid: 'Central|ideas', wic: 'Words in|context', bnd: 'Boundaries', coet: 'Textual|evidence', coeq: 'Quantitative|evidence', tra: 'Transitions',
  tsp: 'Structure &|purpose', fss: 'Form &|structure', inf: 'Inferences', syn: 'Rhetorical|synthesis', ctc: 'Cross-text|connections',
};
/**
 * Branch anchors: where a cluster grows out from a related skill (owner request: the map is grouped like
 * hexagonal-thinking tiles, and anything that touches must relate). Ratios grow from linear equations and
 * functions (proportional reasoning), one-variable data from ratios and percentages, area from lines and
 * angles, probability from percentages, words in context from central ideas, boundaries from transitions
 * (punctuating "however" and friends).
 */
const BRANCH: Partial<Record<SkillId, SkillId[]>> = { ratio: ['lin1', 'linf'], data1: ['ratio', 'pct'], area: ['lines'], prob: ['pct'], wic: ['cid'], bnd: ['tra'] };
const P = (id: SkillId, q: number, r: number, prereqs: SkillId[]): Omit<PathSkill, 'order'> =>
  ({ id, section: SKILL[id].section, domain: SKILL[id].domain, title: SKILL[id].short, label: LABEL[id], prereqs, branch: BRANCH[id] ?? [], hex: { q, r } });

/* Ladder order (owner request: one clear line, climbed bottom-up): unit by unit in the SAT's own domain order,
   and within a unit by prerequisites. Every prerequisite still comes earlier (tests/path.test.ts). */
const MATH: Omit<PathSkill, 'order'>[] = [
  // Algebra
  P('lin1', 3, 0, []),
  P('lin2', 4, -1, ['lin1']),
  P('ineq', 4, 0, ['lin1']),
  P('linf', 5, -1, ['lin2']),
  P('sys', 3, -1, ['lin2']),
  // Advanced Math
  P('equiv', 2, 0, ['lin1']),
  P('nleq', 2, -1, ['equiv', 'sys']),
  P('nlf', 1, -1, ['linf', 'nleq']),
  // Problem-Solving and Data Analysis
  P('ratio', 6, -1, []),
  P('pct', 7, -2, ['ratio']),
  P('prob', 7, -1, ['ratio']),
  P('data1', 7, -3, []),
  P('data2', 6, -2, ['linf', 'data1']),
  P('infer', 8, -3, ['data1', 'pct']),
  P('claims', 8, -4, ['infer']),
  // Geometry and Trigonometry
  P('area', 5, -3, []),
  P('lines', 4, -2, ['lin2']),
  P('trig', 4, -3, ['lines']),
  P('circ', 5, -4, ['trig', 'equiv']),
];

const RW: Omit<PathSkill, 'order'>[] = [
  // Information and Ideas
  P('cid', 3, 0, []),
  P('coet', 3, -1, ['cid']),
  P('coeq', 4, -1, ['cid']),
  P('inf', 4, -2, ['coet']),
  // Craft and Structure
  P('wic', 4, 0, []),
  P('tsp', 5, 0, ['cid', 'wic']),
  P('ctc', 6, -1, ['tsp']),
  // Expression of Ideas
  P('tra', 2, 0, ['cid']),
  P('syn', 2, -1, ['tra', 'coet']),
  // Standard English Conventions
  P('bnd', 1, 0, []),
  P('fss', 0, 0, ['bnd']),
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
