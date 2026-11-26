import type { SkillId } from '@/lib/types';
import type { Video } from '@/data/videos/types';

/**
 * Hard-problem walkthroughs: content/lessons/<skill>/<id>/scene.json (narration + directives) with problem.json (the
 * machine-checked math). Scenes load only when a student opens the lesson (a separate file in the web build).
 */
export interface Walkthrough { id: string; skill: SkillId; title: string; load: () => Promise<Video> }
const scene = (j: { default: unknown }) => j.default as Video;
export const WALKTHROUGHS: Walkthrough[] = [
  { id: 'sys-w1', skill: 'sys', title: 'No solution: the constant that breaks a system', load: () => import('../../../content/lessons/sys/sys-w1/scene.json').then(scene) },
  { id: 'circ-w1', skill: 'circ', title: 'A tangent circle hidden in a scrambled equation', load: () => import('../../../content/lessons/circ/circ-w1/scene.json').then(scene) },
  { id: 'inf-w1', skill: 'inf', title: 'Inference: what the evidence allows, and no more', load: () => import('../../../content/lessons/inf/inf-w1/scene.json').then(scene) },
];
export const walkthroughFor = (skill: string) => WALKTHROUGHS.find((w) => w.skill === skill);
